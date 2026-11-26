import express from "express";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import {
  IMAGE_EXTS,
  Project,
  findProjectYaml,
} from "./lib/project.js";
import {
  VALID_OS,
  exportObsPackage,
  stepsForObs,
} from "./lib/obsExport.js";
import { attachLiveHub } from "./lib/liveHub.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const PKG_ROOT = path.resolve(process.env.PKG_ROOT || path.join(__dirname, "khordegir-studio", "khordegir"));
const VIDEOS_ROOT = path.resolve(process.env.VIDEOS_ROOT || path.join(__dirname, "khordegir-studio", "videos"));

const STATIC_DIRS = ["editor", "stage", "templates", "themes", "vendor", "fonts"];
const STATIC_ALIASES = { obs: "obs_console", "obs-stage": "obs_stage" };
const MAX_IMAGE_BYTES = 50 * 1024 * 1024;

function hasTraversalSyntax(rawPath) {
  if (!rawPath || rawPath.includes("\x00") || rawPath.includes("\\")) return true;
  return rawPath.split("/").some((part) => part === "." || part === "..");
}

function safeResolveInside(baseDir, relParts) {
  const baseResolved = path.resolve(baseDir);
  const candidate = path.resolve(baseResolved, ...relParts);
  if (candidate !== baseResolved && !candidate.startsWith(baseResolved + path.sep)) {
    return null;
  }
  return candidate;
}

function validateProjectName(name) {
  if (typeof name !== "string") {
    return { valid: null, status: 400, error: "Project name must be a string" };
  }
  const cleaned = name.trim();
  if (!cleaned || cleaned.length > 120) {
    return { valid: null, status: 400, error: "Invalid project name" };
  }
  if (cleaned === "." || cleaned === ".." || cleaned.startsWith(".")) {
    return {
      valid: null,
      status: cleaned === "." || cleaned === ".." ? 403 : 400,
      error: "Invalid project name",
    };
  }
  if (cleaned.includes("/") || cleaned.includes("\\") || cleaned.includes("\x00") || cleaned.includes("..")) {
    return { valid: null, status: 403, error: "Invalid characters in project name" };
  }
  for (let i = 0; i < cleaned.length; i += 1) {
    const code = cleaned.charCodeAt(i);
    if (code < 32 || code === 127) {
      return { valid: null, status: 400, error: "Invalid control characters in project name" };
    }
  }
  return { valid: cleaned, status: 200, error: "" };
}

function sanitiseImageFilename(rawName) {
  if (!rawName || rawName.includes("\x00") || rawName.includes("/") || rawName.includes("\\") || rawName.includes("..")) {
    return null;
  }
  const trimmed = rawName.trim();
  const ext = path.extname(trimmed).toLowerCase();
  if (!IMAGE_EXTS.has(ext)) return null;
  let stem = path.basename(trimmed, path.extname(trimmed));
  stem = stem.replace(/[^\p{L}\p{N}_.-]/gu, "_").replace(/^[._\-\s]+|[._\-\s]+$/g, "");
  if (!stem) stem = "image";
  stem = stem.slice(0, 80);
  return `${stem}${ext}`;
}

function atomicWriteText(target, content) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const tmp = path.join(path.dirname(target), `.video.${process.pid}.${Date.now()}.tmp`);
  try {
    fs.writeFileSync(tmp, content, "utf-8");
    fs.renameSync(tmp, target);
  } catch (err) {
    try {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    } catch {
      // ignore
    }
    throw err;
  }
}

function atomicWriteBytes(target, buffer) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const tmp = path.join(path.dirname(target), `.img.${process.pid}.${Date.now()}.tmp`);
  try {
    fs.writeFileSync(tmp, buffer);
    fs.renameSync(tmp, target);
  } catch (err) {
    try {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    } catch {
      // ignore
    }
    throw err;
  }
}

function resolveProjectDir(rawName, res) {
  const { valid, status, error } = validateProjectName(rawName);
  if (!valid) {
    res.status(status).json({ error });
    return null;
  }
  const projDir = safeResolveInside(VIDEOS_ROOT, [valid]);
  if (!projDir || path.dirname(projDir) !== VIDEOS_ROOT) {
    res.status(403).json({ error: "Invalid project path" });
    return null;
  }
  return projDir;
}

const app = express();
const httpServer = http.createServer(app);
const liveHub = attachLiveHub(httpServer, { videosRoot: VIDEOS_ROOT, pkgRoot: PKG_ROOT });
app.disable("x-powered-by");

// Traversal guard
app.use((req, res, next) => {
  let decodedPath = req.path;
  try {
    decodedPath = decodeURIComponent(req.path);
  } catch {
    return res.status(400).json({ error: "Malformed URL" });
  }
  if (hasTraversalSyntax(req.path) || hasTraversalSyntax(decodedPath)) {
    return res.status(403).json({ error: "Path traversal blocked" });
  }
  next();
});

// Root redirect
app.get("/", (req, res) => {
  res.redirect(302, "/editor/");
});

// Health
app.get("/api/health", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({ ok: true });
});

// List projects
app.get("/api/projects", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const items = [];
  if (fs.existsSync(VIDEOS_ROOT) && fs.statSync(VIDEOS_ROOT).isDirectory()) {
    const entries = fs
      .readdirSync(VIDEOS_ROOT, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const entryDir = path.join(VIDEOS_ROOT, entry.name);
      const yamlPath = findProjectYaml(entryDir);
      if (!yamlPath) continue;

      let title = entry.name;
      let theme = null;
      let slidesCount = 0;
      try {
        const raw = fs.readFileSync(yamlPath, "utf-8");
        const data = (yamlPath.endsWith(".json") ? JSON.parse(raw) : yaml.load(raw)) || {};
        if (data && typeof data === "object") {
          title = data.title || entry.name;
          theme = data.theme ?? null;
          if (Array.isArray(data.slides)) {
            slidesCount = data.slides.length;
          }
        }
      } catch {
        // Keep defaults on malformed project YAML
      }
      const stat = fs.statSync(yamlPath);
      items.push({
        name: entry.name,
        title,
        theme,
        slides_count: slidesCount,
        updated_at: stat.mtimeMs / 1000,
      });
    }
  }
  res.json({ projects: items });
});

// Create project
app.post("/api/projects", express.json({ limit: "1mb" }), (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const payload = req.body;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return res.status(400).json({ error: "JSON body must be an object" });
  }
  const { valid, status, error } = validateProjectName(payload.name);
  if (!valid) {
    return res.status(status).json({ error });
  }

  fs.mkdirSync(VIDEOS_ROOT, { recursive: true });
  const projDir = safeResolveInside(VIDEOS_ROOT, [valid]);
  if (!projDir || path.dirname(projDir) !== VIDEOS_ROOT) {
    return res.status(403).json({ error: "Invalid project path" });
  }
  if (findProjectYaml(projDir) || fs.existsSync(path.join(projDir, "video.yaml"))) {
    return res.status(409).json({ error: "Project already exists" });
  }

  const starterYaml = path.join(PKG_ROOT, "starter", "video.yaml");
  if (!fs.existsSync(starterYaml)) {
    return res.status(500).json({ error: "Starter video.yaml missing" });
  }

  fs.mkdirSync(path.join(projDir, "img"), { recursive: true });
  const dstYaml = path.join(projDir, "video.yaml");
  fs.copyFileSync(starterYaml, dstYaml);
  const yamlText = fs.readFileSync(dstYaml, "utf-8");
  const data = yaml.load(yamlText) || {};
  res.status(201).json({
    ok: true,
    name: valid,
    yaml: yamlText,
    data,
  });
});

// Get project
app.get("/api/projects/:name", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const projDir = resolveProjectDir(req.params.name, res);
  if (!projDir) return;
  const yamlPath = findProjectYaml(projDir);
  if (!yamlPath) {
    return res.status(404).json({ error: "Project not found" });
  }

  const yamlText = fs.readFileSync(yamlPath, "utf-8");
  let data = null;
  let yamlError = null;
  try {
    data = (yamlPath.endsWith(".json") ? JSON.parse(yamlText) : yaml.load(yamlText)) || {};
  } catch (err) {
    yamlError = err.message;
  }

  const imgDir = path.join(projDir, "img");
  const images = [];
  if (fs.existsSync(imgDir) && fs.statSync(imgDir).isDirectory()) {
    for (const file of fs.readdirSync(imgDir).sort()) {
      if (file.startsWith(".")) continue;
      const full = path.join(imgDir, file);
      if (fs.statSync(full).isFile() && IMAGE_EXTS.has(path.extname(file).toLowerCase())) {
        images.push(file);
      }
    }
  }

  const resp = {
    name: path.basename(projDir),
    yaml: yamlText,
    data,
    images,
  };
  if (yamlError !== null) resp.yaml_error = yamlError;
  res.json(resp);
});

// Update project
app.put(
  "/api/projects/:name",
  express.text({ type: "*/*", limit: "5mb" }),
  (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const projDir = resolveProjectDir(req.params.name, res);
    if (!projDir) return;
    const yamlPath = findProjectYaml(projDir);
    if (!yamlPath) {
      return res.status(404).json({ error: "Project not found" });
    }

    const contentType = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
    const rawBody = typeof req.body === "string" ? req.body : "";
    let rawYaml = "";

    if (contentType === "application/json") {
      let obj;
      try {
        obj = JSON.parse(rawBody);
      } catch {
        return res.status(400).json({ error: "Invalid JSON body" });
      }
      if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
        return res.status(400).json({ error: "JSON body must be an object" });
      }
      if ("yaml" in obj) {
        if (typeof obj.yaml !== "string") {
          return res.status(400).json({ error: "'yaml' must be a string" });
        }
        rawYaml = obj.yaml;
      } else if ("slides" in obj) {
        if (!Array.isArray(obj.slides)) {
          return res.status(400).json({ error: "'slides' must be a list" });
        }
        rawYaml = yaml.dump(obj, { lineWidth: 120, noRefs: true });
      } else {
        return res.status(400).json({ error: "JSON body must contain 'yaml' or 'slides'" });
      }
    } else {
      rawYaml = rawBody;
    }

    let parsed;
    try {
      parsed = yaml.load(rawYaml);
    } catch (err) {
      return res.status(400).json({ error: `Invalid YAML: ${err.message}` });
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return res.status(400).json({ error: "YAML root must be a mapping" });
    }
    if (!Array.isArray(parsed.slides)) {
      return res.status(400).json({ error: "YAML must contain a 'slides' list" });
    }

    const targetYaml = yamlPath.endsWith(".json") ? path.join(projDir, "video.yaml") : yamlPath;
    atomicWriteText(targetYaml, rawYaml);
    res.json({
      ok: true,
      name: path.basename(projDir),
      yaml: rawYaml,
      data: parsed,
    });
  }
);

// Shared pure curve math for browser ESM imports
app.get("/shared/curveMath.js", (req, res) => {
  res.sendFile(path.join(__dirname, "lib", "curveMath.js"));
});

// Live broadcast room state & command endpoints
app.get("/api/live/:name", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const { valid, status, error } = validateProjectName(req.params.name);
  if (!valid) return res.status(status).json({ error });
  res.json({ ok: true, state: liveHub.getState(valid) });
});

app.post("/api/live/:name/command", express.json({ limit: "2mb" }), (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const { valid, status, error } = validateProjectName(req.params.name);
  if (!valid) return res.status(status).json({ error });
  const result = liveHub.executeCommand(valid, req.body);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json(result);
});

// Get project steps for OBS console (includes resolved slides & podcast defaults for live stage sync)
app.get("/api/projects/:name/steps", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const projDir = resolveProjectDir(req.params.name, res);
  if (!projDir) return;
  if (!findProjectYaml(projDir)) {
    return res.status(404).json({ error: "Project not found" });
  }
  try {
    const pr = new Project(projDir, PKG_ROOT);
    const steps = stepsForObs(pr);
    res.json({
      ok: true,
      name: path.basename(projDir),
      title: pr.title,
      theme: pr.theme || "khordegir-dark",
      livingStage: pr.livingStage || null,
      podcast: pr.podcast || null,
      slides: pr.slides || [],
      steps,
      warnings: pr.warnings,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Export OBS package
app.post("/api/projects/:name/obs-export", express.json({ limit: "1mb" }), (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const projDir = resolveProjectDir(req.params.name, res);
  if (!projDir) return;
  if (!findProjectYaml(projDir)) {
    return res.status(404).json({ error: "Project not found" });
  }

  const opts = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
  const osTarget = String(opts.os || "linux").toLowerCase();
  if (!VALID_OS.has(osTarget)) {
    return res.status(400).json({ error: `Unsupported OS target: ${osTarget}` });
  }

  let outDir = null;
  if (opts.out_dir) {
    const rel = String(opts.out_dir);
    if (hasTraversalSyntax(rel) || path.isAbsolute(rel)) {
      return res.status(403).json({ error: "Invalid out_dir" });
    }
    outDir = safeResolveInside(projDir, rel.split("/").filter(Boolean));
    if (!outDir) {
      return res.status(403).json({ error: "Invalid out_dir" });
    }
  }

  try {
    const pr = new Project(projDir, PKG_ROOT);
    const result = exportObsPackage(pr, PKG_ROOT, {
      outDir,
      osTarget,
      wsUrl: String(opts.ws_url || "ws://127.0.0.1:4455"),
      wsPassword: String(opts.ws_password || ""),
      autoStudioPreviewSync: opts.auto_studio_preview_sync !== false,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Upload image
app.post(
  "/api/projects/:name/images",
  express.raw({ type: "*/*", limit: MAX_IMAGE_BYTES }),
  (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const projDir = resolveProjectDir(req.params.name, res);
    if (!projDir) return;
    if (!fs.existsSync(projDir) || !fs.statSync(projDir).isDirectory()) {
      return res.status(404).json({ error: "Project not found" });
    }

    const rawFilename = req.query.filename ? String(req.query.filename) : "";
    if (!rawFilename) {
      return res.status(400).json({ error: "Missing filename query parameter" });
    }
    if (
      rawFilename.includes("\x00") ||
      rawFilename.includes("/") ||
      rawFilename.includes("\\") ||
      rawFilename.includes("..")
    ) {
      return res.status(403).json({ error: "Invalid filename" });
    }
    const safeName = sanitiseImageFilename(rawFilename);
    if (!safeName) {
      return res.status(400).json({ error: "Unsupported or invalid image filename" });
    }

    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (body.length === 0) {
      return res.status(400).json({ error: "Empty image body" });
    }

    const imgDir = path.resolve(projDir, "img");
    fs.mkdirSync(imgDir, { recursive: true });
    const target = safeResolveInside(imgDir, [safeName]);
    if (!target || path.dirname(target) !== imgDir) {
      return res.status(403).json({ error: "Invalid image path" });
    }

    atomicWriteBytes(target, body);
    res.status(201).json({
      ok: true,
      filename: safeName,
      url: `/projects/${encodeURIComponent(path.basename(projDir))}/img/${encodeURIComponent(safeName)}`,
      size: body.length,
    });
  }
);

// Serve project image assets
app.get("/projects/:name/img/*", (req, res) => {
  const projDir = resolveProjectDir(req.params.name, res);
  if (!projDir) return;
  const imgDir = path.resolve(projDir, "img");
  if (!fs.existsSync(imgDir) || !fs.statSync(imgDir).isDirectory()) {
    return res.status(404).json({ error: "Image not found" });
  }
  const relParts = String(req.params[0] || "").split("/").filter(Boolean);
  const target = safeResolveInside(imgDir, relParts);
  if (!target) {
    return res.status(403).json({ error: "Path traversal blocked" });
  }
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    return res.status(404).json({ error: "Image not found" });
  }
  res.sendFile(target);
});

// Static mounts with trailing-slash normalization
for (const dir of STATIC_DIRS) {
  app.use(`/${dir}`, (req, res, next) => {
    if (req.originalUrl === `/${dir}`) {
      return res.redirect(302, `/${dir}/`);
    }
    next();
  });
  app.use(`/${dir}`, express.static(path.join(PKG_ROOT, dir), { fallthrough: false }));
}

for (const [alias, targetDir] of Object.entries(STATIC_ALIASES)) {
  app.use(`/${alias}`, (req, res, next) => {
    if (req.originalUrl === `/${alias}`) {
      return res.redirect(302, `/${alias}/`);
    }
    next();
  });
  app.use(`/${alias}`, express.static(path.join(PKG_ROOT, targetDir), { fallthrough: false }));
}

// Fallback 404 JSON
app.use((err, req, res, next) => {
  if (err && err.status === 404) {
    return res.status(404).json({ error: "Not found" });
  }
  if (err && err.type === "entity.too.large") {
    return res.status(413).json({ error: "Payload too large" });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

httpServer.listen(PORT, HOST, () => {
  console.log(`Khordegir Studio server listening on http://${HOST}:${PORT}/editor/`);
});
