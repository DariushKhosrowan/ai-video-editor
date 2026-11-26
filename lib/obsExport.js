import fs from "node:fs";
import path from "node:path";

export const VALID_OS = new Set(["linux", "windows", "macos"]);

const LAY_FA = {
  SLIDE: "اسلاید تمام‌صفحه",
  SCAM: "اسلاید + من",
  CAM: "فقط من",
};

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
export function faDigits(value) {
  return String(value ?? "").replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

export function escapeLuaString(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r\n/g, "\\n")
    .replace(/\r/g, "\\n")
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t")
    .replace(/\x00/g, "\\000");
}

export function stepsForObs(project) {
  const rawSteps = project.steps();
  const motionBySlide = new Map();
  for (const s of project.slides || []) {
    const sNum = Number(s._num || 0);
    const fx = s.fx && typeof s.fx === "object" ? s.fx : {};
    const motion = s.motion || fx.motion;
    if (sNum && typeof motion === "string" && motion.trim()) {
      motionBySlide.set(sNum, motion.trim());
    }
  }

  return rawSteps.map((st) => {
    const layoutKey = String(st.layout || "SCAM").toUpperCase();
    const slideNum = Number(st.slide || 0);
    let cleanZoom = null;
    if (st.zoom && typeof st.zoom === "object") {
      const z = {};
      for (const k of ["s", "x", "y"]) {
        if (st.zoom[k] !== undefined && st.zoom[k] !== null) {
          z[k] = Number(st.zoom[k]);
        }
      }
      if (Object.keys(z).length > 0) cleanZoom = z;
    }
    const motion = st.motion || (slideNum ? motionBySlide.get(slideNum) : null);
    return {
      n: Number(st.n),
      act: Number(st.act),
      layout: layoutKey,
      layoutKey,
      lay: LAY_FA[layoutKey] || layoutKey,
      slide: slideNum,
      time: String(st.time || ""),
      text: String(st.text || "").trim(),
      motion: typeof motion === "string" && motion.trim() ? motion.trim() : null,
      zoom: cleanZoom,
    };
  });
}

export function generateStepsDataLua(steps) {
  const lines = [
    "-- Step list. layout = SLIDE | SCAM | CAM ; slide = slide number (0 = none)",
    "-- ساخته‌شده خودکار از video.yaml با Khordegir Studio — دستی ویرایش نکن.",
    "return {",
  ];
  for (const st of steps) {
    const layoutKey = String(st.layoutKey || st.layout || "SCAM").toUpperCase();
    const fields = [
      `act=${Number(st.act)}`,
      `layout="${escapeLuaString(layoutKey)}"`,
      `slide=${Number(st.slide || 0)}`,
      `text="${escapeLuaString(st.text || "")}"`,
    ];
    if (st.motion && st.motion !== "auto") {
      fields.push(`motion="${escapeLuaString(st.motion)}"`);
    }
    if (st.zoom && typeof st.zoom === "object") {
      const zParts = ["s", "x", "y"]
        .filter((k) => k in st.zoom)
        .map((k) => `${k}=${Number(st.zoom[k])}`);
      if (zParts.length) fields.push(`zoom={${zParts.join(", ")}}`);
    }
    const timeComment = st.time ? ` ${st.time}` : "";
    lines.push(`  {${fields.join(", ")}},  -- step ${Number(st.n)}${timeComment}`);
  }
  lines.push("}");
  return `${lines.join("\n")}\n`;
}

export function generatePrompterTxt(steps) {
  const chunks = [];
  for (const st of steps) {
    const lay = st.lay || LAY_FA[st.layout] || st.layout;
    const slideNum = Number(st.slide || 0);
    const head = `── مرحله ${st.n} · پرده ${st.act} · ${lay}${slideNum ? ` · اسلاید ${slideNum}` : ""}`;
    chunks.push(head, String(st.text || ""), "");
  }
  return chunks.join("\n");
}

function serializePrompterSteps(steps) {
  return JSON.stringify(
    steps.map((s) => ({
      n: Number(s.n),
      act: Number(s.act),
      lay: s.lay || LAY_FA[s.layout] || s.layout,
      slide: Number(s.slide || 0),
      time: String(s.time || ""),
      text: String(s.text || ""),
    }))
  ).replace(/<\//g, "<\\/");
}

function estimateTotalHint(steps) {
  const words = steps.reduce(
    (sum, s) => sum + String(s.text || "").trim().split(/\s+/).filter(Boolean).length,
    0
  );
  const mins = words / 140.0;
  const mm = String(Math.floor(mins)).padStart(2, "0");
  const ss = String(Math.floor((mins % 1) * 60)).padStart(2, "0");
  return faDigits(`${mm}:${ss}`);
}

export function generatePrompterHtml(steps, pkgRoot) {
  const tplPath = path.join(pkgRoot, "obs", "prompter_template.html");
  const tpl = fs.readFileSync(tplPath, "utf-8");
  const hint = estimateTotalHint(steps);
  const serialized = serializePrompterSteps(steps);
  return tpl
    .replace("__STEPS__", serialized)
    .replace("<script>", `<script>window.TOTAL_HINT=${JSON.stringify(hint)};`);
}

export function generatePrompterDockHtml(steps, { wsUrl = "ws://127.0.0.1:4455", wsPassword = "" } = {}) {
  const serialized = serializePrompterSteps(steps);
  const safeWsUrl = JSON.stringify(wsUrl);
  const safeWsPass = JSON.stringify(wsPassword);
  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Khordegir Studio — OBS Teleprompter Dock</title>
<style>
@font-face{font-family:V;src:url("fonts/Vazirmatn-Bold.ttf")}
:root{--bg:#0b0d11;--panel:#13161d;--line:rgba(255,255,255,.1);--gold:#f59e0b;--txt:#f8fafc;--muted:#94a3b8;--fs:46px}
*{box-sizing:border-box}
html,body{margin:0;height:100%;background:var(--bg);color:var(--txt);font-family:V,Vazirmatn,Tahoma,sans-serif;overflow:hidden}
body{display:flex;flex-direction:column}
#top{background:var(--panel);border-bottom:1px solid var(--line);padding:8px 12px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;font-size:14px}
#where{color:var(--gold);font-weight:700}
#next{color:var(--muted);font-size:13px}
#wrap{position:relative;flex:1;overflow-y:auto;padding:24px 6% 48px;cursor:pointer}
#guide{position:sticky;top:24%;height:2px;background:rgba(245,158,11,.35);pointer-events:none;margin-bottom:12px}
#txt{font-size:var(--fs);line-height:1.72;text-align:right;transition:transform .08s linear}
body.mirror #wrap{transform:scaleX(-1)}
#controls{background:var(--panel);border-top:1px solid var(--line);padding:10px 12px;display:flex;gap:8px;align-items:center}
#btnNext{flex:2;min-height:48px;background:var(--gold);color:#0b0d11;border:none;border-radius:8px;font-family:inherit;font-size:17px;font-weight:700;cursor:pointer;padding:10px 14px}
.btn{min-height:48px;background:#1e293b;color:#f1f5f9;border:1px solid var(--line);border-radius:8px;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;padding:8px 12px}
</style>
</head>
<body>
<div id="top"><div><div id="where"></div><div id="next"></div></div><div id="wsStatus">حالت مستقل (بدون OBS)</div></div>
<div id="wrap"><div id="guide"></div><div id="txt"></div></div>
<div id="controls">
  <button id="btnNext" type="button">مرحله بعد ◀</button>
  <button id="btnPrev" class="btn" type="button">▶ قبلی</button>
</div>
<script>
const S=${serialized};
const WS_URL=${safeWsUrl};
const WS_PASS=${safeWsPass};
let i=0,fs=46;
const fa=n=>String(n).replace(/\\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
function show(){
  if(!S.length)return;
  const s=S[i],nx=S[i+1];
  document.getElementById('where').textContent='پرده '+fa(s.act)+' · مرحله '+fa(s.n)+' از '+fa(S.length)+' · '+s.lay;
  document.getElementById('next').textContent=nx?('بعدی: '+nx.lay):'پایان اسکریپت';
  const t=document.getElementById('txt');t.textContent=s.text;t.style.setProperty('--fs',fs+'px');
}
document.getElementById('btnNext').onclick=()=>{if(i<S.length-1){i++;show()}};
document.getElementById('btnPrev').onclick=()=>{if(i>0){i--;show()}};
document.getElementById('wrap').onclick=()=>{if(i<S.length-1){i++;show()}};
show();
</script>
</body>
</html>
`;
}

export function generateLuaV8(steps, { osTarget = "linux", autoStudioPreviewSync = true } = {}) {
  const textSourceId = osTarget === "windows" ? "text_gdiplus_v2" : "text_ft2_source_v2";
  const previewFlag = autoStudioPreviewSync ? "true" : "false";
  return `-- Hark Studio v8 OBS Lua Script (${steps.length} steps, target: ${osTarget})
obs = obslua
local DIR = script_path()
local STEPS = {}
local idx = 1
local AUTO_STUDIO_PREVIEW = ${previewFlag}
local TEXT_SOURCE_ID = "${textSourceId}"

local function load_steps()
  local ok, data = pcall(dofile, DIR .. "steps_data.lua")
  if ok and type(data) == "table" then STEPS = data end
  if idx > #STEPS then idx = 1 end
end

function script_description()
  return "Hark Studio v8 (${steps.length} steps)"
end

function script_load(settings)
  load_steps()
end
`;
}

export function exportObsPackage(
  project,
  pkgRoot,
  {
    outDir = null,
    osTarget = "linux",
    wsUrl = "ws://127.0.0.1:4455",
    wsPassword = "",
    autoStudioPreviewSync = true,
  } = {}
) {
  if (!VALID_OS.has(osTarget)) {
    throw new Error(`Unsupported OS target '${osTarget}'`);
  }
  const dest = outDir ? path.resolve(outDir) : path.resolve(project.out, "obs");
  fs.mkdirSync(dest, { recursive: true });

  const steps = stepsForObs(project);
  const warnings = [...(project.warnings || [])];

  fs.writeFileSync(path.join(dest, "steps_data.lua"), generateStepsDataLua(steps), "utf-8");

  const stepsJson = steps.map((s) => ({
    n: s.n,
    act: s.act,
    layout: s.layout,
    lay: s.lay,
    slide: s.slide,
    time: s.time,
    text: s.text,
    ...(s.motion ? { motion: s.motion } : {}),
    ...(s.zoom ? { zoom: s.zoom } : {}),
  }));
  fs.writeFileSync(path.join(dest, "steps.json"), JSON.stringify(stepsJson, null, 1), "utf-8");
  fs.writeFileSync(path.join(dest, "prompter.txt"), generatePrompterTxt(steps), "utf-8");
  fs.writeFileSync(
    path.join(dest, "hark_studio_v8.lua"),
    generateLuaV8(steps, { osTarget, autoStudioPreviewSync }),
    "utf-8"
  );
  fs.writeFileSync(path.join(dest, "prompter.html"), generatePrompterHtml(steps, pkgRoot), "utf-8");
  fs.writeFileSync(
    path.join(dest, "prompter_dock.html"),
    generatePrompterDockHtml(steps, { wsUrl, wsPassword }),
    "utf-8"
  );

  const installerName = osTarget === "windows" ? "replace_hark_v8.bat" : "replace_hark_v8.sh";
  const installerBody =
    osTarget === "windows"
      ? `@echo off\r\necho Hark Studio v8 package ready in %CD%\r\n`
      : `#!/usr/bin/env bash\necho "Hark Studio v8 package ready in $(pwd)"\n`;
  const installerPath = path.join(dest, installerName);
  fs.writeFileSync(installerPath, installerBody, "utf-8");
  if (installerName.endsWith(".sh")) {
    try {
      fs.chmodSync(installerPath, 0o755);
    } catch {
      // Ignore chmod failures
    }
  }

  return {
    ok: true,
    out_dir: dest,
    os: osTarget,
    steps_count: steps.length,
    files: [
      "steps_data.lua",
      "steps.json",
      "prompter.txt",
      "hark_studio_v8.lua",
      "prompter.html",
      "prompter_dock.html",
      installerName,
    ],
    prompter_pngs: [],
    warnings,
  };
}
