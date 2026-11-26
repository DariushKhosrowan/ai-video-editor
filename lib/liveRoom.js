/**
 * Server-authoritative live broadcast room state for OBS Browser Source (/obs-stage/)
 * and Presenter Console (/obs/) + Studio Editor (/editor/).
 * Pure state logic: tested independently via node:test.
 */

export const VALID_LIVE_LAYOUTS = new Set(["SLIDE", "SCAM", "CAM", "OVERLAY"]);

export function createLiveRoom(projectName) {
  return {
    projectName: String(projectName || ""),
    seq: 1,
    sfxSeq: 0,
    updatedAt: Date.now(),
    currentStepIndex: 0,
    currentSlideIndex: 0,
    layout: "SCAM",
    theme: null,
    activeSlide: null,
    livingStage: {
      bgStyle: "dreamy-bokeh",
      intensity: "podcast",
      microMotion: true,
      micReactive: false,
      floatMode: "images-only",
      floatStyle: "silk-glide",
      floatAmplitude: 2,
      floatSpeed: 0.45,
      floatRatio: 0.65,
      floatSeed: 0,
    },
    lowerThird: {
      visible: false,
      title: "",
      subtitle: "",
      role: "میزبان",
      badge: "LIVE",
      style: "glass-amber",
      side: "right",
    },
    chapter: {
      visible: false,
      index: 1,
      total: 1,
      title: "",
    },
    overlay: {
      transparentBg: false,
      showLogo: true,
      showChapterBar: true,
      showLiveBadge: false,
      sfxEnabled: true,
      micReactive: false,
    },
    lastSfx: null,
  };
}

function sanitizeString(v, max = 300) {
  return String(v ?? "").slice(0, max);
}

export function applyLiveCommand(room, msg) {
  if (!room || !msg || typeof msg !== "object") {
    return { ok: false, error: "Invalid command object", broadcastType: null };
  }
  const type = String(msg.type || "");
  const p = msg.payload && typeof msg.payload === "object" ? msg.payload : msg;

  if (type === "stage:sync" || type === "slide:show") {
    if (p.currentStepIndex !== undefined) {
      room.currentStepIndex = Math.max(0, Number.parseInt(p.currentStepIndex, 10) || 0);
    }
    if (p.currentSlideIndex !== undefined) {
      room.currentSlideIndex = Math.max(0, Number.parseInt(p.currentSlideIndex, 10) || 0);
    }
    if (p.layout && VALID_LIVE_LAYOUTS.has(String(p.layout).toUpperCase())) {
      room.layout = String(p.layout).toUpperCase();
    }
    if (p.theme !== undefined) {
      room.theme = p.theme ? sanitizeString(p.theme, 80) : null;
    }
    if (p.activeSlide && typeof p.activeSlide === "object") {
      room.activeSlide = JSON.parse(JSON.stringify(p.activeSlide));
    } else if (p.activeSlide === null) {
      room.activeSlide = null;
    }
    if (p.livingStage && typeof p.livingStage === "object") {
      room.livingStage = {
        ...room.livingStage,
        ...p.livingStage,
      };
    }
    room.seq += 1;
    room.updatedAt = Date.now();
    return { ok: true, broadcastType: "room:state" };
  }

  if (type === "layout:set") {
    const nextLayout = String(p.layout || "").toUpperCase();
    if (!VALID_LIVE_LAYOUTS.has(nextLayout)) {
      return { ok: false, error: "Unsupported layout", broadcastType: null };
    }
    room.layout = nextLayout;
    room.seq += 1;
    room.updatedAt = Date.now();
    return { ok: true, broadcastType: "room:state" };
  }

  if (type === "lower_third:set") {
    const prev = room.lowerThird;
    room.lowerThird = {
      visible: p.visible !== undefined ? Boolean(p.visible) : prev.visible,
      title: p.title !== undefined ? sanitizeString(p.title, 120) : prev.title,
      subtitle: p.subtitle !== undefined ? sanitizeString(p.subtitle, 160) : prev.subtitle,
      role: p.role !== undefined ? sanitizeString(p.role, 60) : prev.role,
      badge: p.badge !== undefined ? sanitizeString(p.badge, 40) : prev.badge,
      style: p.style !== undefined ? sanitizeString(p.style, 40) : prev.style,
      side: p.side === "left" ? "left" : p.side === "right" ? "right" : prev.side,
    };
    room.seq += 1;
    room.updatedAt = Date.now();
    return { ok: true, broadcastType: "room:lower_third", delta: room.lowerThird };
  }

  if (type === "chapter:set") {
    const prev = room.chapter;
    room.chapter = {
      visible: p.visible !== undefined ? Boolean(p.visible) : prev.visible,
      index: p.index !== undefined ? Math.max(1, Number.parseInt(p.index, 10) || 1) : prev.index,
      total: p.total !== undefined ? Math.max(1, Number.parseInt(p.total, 10) || 1) : prev.total,
      title: p.title !== undefined ? sanitizeString(p.title, 140) : prev.title,
    };
    room.seq += 1;
    room.updatedAt = Date.now();
    return { ok: true, broadcastType: "room:chapter", delta: room.chapter };
  }

  if (type === "overlay:set") {
    const prev = room.overlay;
    room.overlay = {
      transparentBg: p.transparentBg !== undefined ? Boolean(p.transparentBg) : prev.transparentBg,
      showLogo: p.showLogo !== undefined ? Boolean(p.showLogo) : prev.showLogo,
      showChapterBar: p.showChapterBar !== undefined ? Boolean(p.showChapterBar) : prev.showChapterBar,
      showLiveBadge: p.showLiveBadge !== undefined ? Boolean(p.showLiveBadge) : prev.showLiveBadge,
      sfxEnabled: p.sfxEnabled !== undefined ? Boolean(p.sfxEnabled) : prev.sfxEnabled,
      micReactive: p.micReactive !== undefined ? Boolean(p.micReactive) : prev.micReactive,
    };
    if (p.livingStage && typeof p.livingStage === "object") {
      room.livingStage = { ...room.livingStage, ...p.livingStage };
    }
    room.seq += 1;
    room.updatedAt = Date.now();
    return { ok: true, broadcastType: "room:overlay", delta: { overlay: room.overlay, livingStage: room.livingStage } };
  }

  if (type === "sfx:trigger") {
    const sound = sanitizeString(p.sound || "whoosh", 60);
    const volume = Math.max(0, Math.min(1, Number.isFinite(+p.volume) ? +p.volume : 0.75));
    room.sfxSeq += 1;
    const evt = {
      id: p.id ? sanitizeString(p.id, 60) : `sfx_${room.sfxSeq}`,
      sound,
      volume,
      ts: Date.now(),
    };
    room.lastSfx = evt;
    room.updatedAt = evt.ts;
    return { ok: true, broadcastType: "room:sfx", delta: evt };
  }

  return { ok: false, error: `Unknown command: ${type}`, broadcastType: null };
}

export function getPublicRoomState(room, viewerCount = 0, controllerCount = 0) {
  return {
    projectName: room.projectName,
    seq: room.seq,
    sfxSeq: room.sfxSeq,
    updatedAt: room.updatedAt,
    currentStepIndex: room.currentStepIndex,
    currentSlideIndex: room.currentSlideIndex,
    layout: room.layout,
    theme: room.theme,
    activeSlide: room.activeSlide,
    livingStage: room.livingStage,
    lowerThird: room.lowerThird,
    chapter: room.chapter,
    overlay: room.overlay,
    viewerCount,
    controllerCount,
  };
}
