import path from "node:path";
import { WebSocketServer } from "ws";
import { Project, findProjectYaml } from "./project.js";
import { createLiveRoom, applyLiveCommand, getPublicRoomState } from "./liveRoom.js";

function resolveSlideAssetsForClient(slide, projectName) {
  if (!slide || typeof slide !== "object") return slide;
  const copy = JSON.parse(JSON.stringify(slide));
  const fixUrl = (val) => {
    if (!val || typeof val !== "string") return val;
    const s = val.trim();
    if (/^(https?:|file:|data:|blob:|\/projects\/|\/assets\/)/.test(s)) return s;
    if (/^assets\//.test(s)) return "/" + s;
    const clean = s.replace(/^img\//, "");
    return `/projects/${encodeURIComponent(projectName)}/img/${encodeURIComponent(clean)}`;
  };
  if (copy.image) copy.image = fixUrl(copy.image);
  if (copy.src) copy.src = fixUrl(copy.src);
  if (copy.bg_image) copy.bg_image = fixUrl(copy.bg_image);
  if (copy.livingStage && typeof copy.livingStage === "object" && copy.livingStage.bgImage) {
    copy.livingStage.bgImage = fixUrl(copy.livingStage.bgImage);
  }
  if (typeof copy.logo === "string") copy.logo = fixUrl(copy.logo);
  else if (copy.logo && typeof copy.logo === "object" && copy.logo.image) {
    copy.logo.image = fixUrl(copy.logo.image);
  }
  return copy;
}

export function attachLiveHub(httpServer, { videosRoot, pkgRoot }) {
  const rooms = new Map();
  const clientsByRoom = new Map();

  function hydrateRoomFromDisk(room, projectName) {
    try {
      const projDir = path.join(videosRoot, projectName);
      if (!findProjectYaml(projDir)) return;
      const pr = new Project(projDir, pkgRoot);
      room.theme = pr.theme || "khordegir-dark";
      if (pr.livingStage && typeof pr.livingStage === "object") {
        room.livingStage = { ...room.livingStage, ...pr.livingStage };
      }
      if (pr.slides && pr.slides.length > 0) {
        const firstSlide = resolveSlideAssetsForClient(pr.slides[0], projectName);
        room.activeSlide = firstSlide;
        room.layout = String(firstSlide.layout || "SCAM").toUpperCase();
        room.currentSlideIndex = 0;
        room.currentStepIndex = 0;
      }
      if (pr.podcast && pr.podcast.host) {
        room.lowerThird.title = room.lowerThird.title || pr.podcast.host;
        room.lowerThird.subtitle = room.lowerThird.subtitle || pr.podcast.showTitle || pr.title || "";
      } else if (!room.lowerThird.title) {
        room.lowerThird.title = pr.title || projectName;
      }
      if (!room.chapter.title && pr.slides && pr.slides.length > 0) {
        const firstTitle = pr.slides[0].title || pr.title || projectName;
        room.chapter.title = String(firstTitle).replace(/[*~=_]/g, "").slice(0, 80);
        room.chapter.total = Math.max(1, new Set(pr.slides.map((s) => s.act || 1)).size);
      }
    } catch {
      // Keep blank defaults if project yaml is malformed
    }
  }

  function ensureRoom(projectName) {
    const clean = String(projectName || "").trim() || "default";
    if (!rooms.has(clean)) {
      const room = createLiveRoom(clean);
      hydrateRoomFromDisk(room, clean);
      rooms.set(clean, room);
      clientsByRoom.set(clean, new Set());
    }
    return rooms.get(clean);
  }

  function countRoles(projectName) {
    const set = clientsByRoom.get(projectName);
    if (!set) return { viewerCount: 0, controllerCount: 0 };
    let viewerCount = 0;
    let controllerCount = 0;
    for (const c of set) {
      if (c.readyState !== 1) continue;
      if (c._role === "viewer") viewerCount += 1;
      else controllerCount += 1;
    }
    return { viewerCount, controllerCount };
  }

  function broadcastRoom(projectName, payload) {
    const set = clientsByRoom.get(projectName);
    if (!set) return;
    const raw = JSON.stringify(payload);
    for (const ws of set) {
      if (ws.readyState === 1) {
        ws.send(raw);
      }
    }
  }

  function executeCommand(projectName, msg) {
    const room = ensureRoom(projectName);
    const enriched = JSON.parse(JSON.stringify(msg || {}));
    if (enriched.payload && enriched.payload.activeSlide) {
      enriched.payload.activeSlide = resolveSlideAssetsForClient(enriched.payload.activeSlide, projectName);
    }
    const res = applyLiveCommand(room, enriched);
    if (!res.ok) return res;
    const { viewerCount, controllerCount } = countRoles(room.projectName);
    const state = getPublicRoomState(room, viewerCount, controllerCount);
    broadcastRoom(room.projectName, {
      type: res.broadcastType,
      state,
      delta: res.delta || null,
    });
    return { ok: true, state };
  }

  const wss = new WebSocketServer({ server: httpServer, path: "/ws/live" });

  wss.on("connection", (ws, req) => {
    let projectName = "default";
    let role = "controller";
    try {
      const url = new URL(req.url || "/ws/live", "http://127.0.0.1");
      projectName = (url.searchParams.get("project") || "default").trim() || "default";
      role = url.searchParams.get("role") === "viewer" ? "viewer" : "controller";
    } catch {
      // default values
    }

    ws._project = projectName;
    ws._role = role;
    const room = ensureRoom(projectName);
    const set = clientsByRoom.get(room.projectName);
    set.add(ws);

    const emitPresence = () => {
      const counts = countRoles(room.projectName);
      broadcastRoom(room.projectName, {
        type: "room:presence",
        state: getPublicRoomState(room, counts.viewerCount, counts.controllerCount),
      });
    };

    const counts = countRoles(room.projectName);
    ws.send(JSON.stringify({
      type: "room:init",
      state: getPublicRoomState(room, counts.viewerCount, counts.controllerCount),
    }));
    emitPresence();

    ws.on("message", (buf) => {
      let msg;
      try {
        msg = JSON.parse(String(buf));
      } catch {
        return;
      }
      if (msg && msg.type === "ping") {
        ws.send(JSON.stringify({ type: "pong", ts: Date.now() }));
        return;
      }
      if (msg && msg.type === "state:request") {
        const c = countRoles(room.projectName);
        ws.send(JSON.stringify({
          type: "room:init",
          state: getPublicRoomState(room, c.viewerCount, c.controllerCount),
        }));
        return;
      }
      const result = executeCommand(room.projectName, msg);
      if (!result.ok) {
        ws.send(JSON.stringify({ type: "room:error", error: result.error }));
      }
    });

    ws.on("close", () => {
      set.delete(ws);
      emitPresence();
    });
  });

  return {
    getState(projectName) {
      const room = ensureRoom(projectName);
      const { viewerCount, controllerCount } = countRoles(room.projectName);
      return getPublicRoomState(room, viewerCount, controllerCount);
    },
    executeCommand,
    close() {
      wss.close();
    },
  };
}
