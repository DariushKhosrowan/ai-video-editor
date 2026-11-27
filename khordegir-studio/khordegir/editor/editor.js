/* Khordegir Studio — Offline RTL Editor Controller (ES Module)
   Single source of truth: reads & writes video.yaml via /api/projects/<name>.
   Preview == output: renders through /stage/stage.html iframe via postMessage.
   Includes: Dual Curve Studio, Annotations Callouts, Living Stage Controls,
   Template Gallery, Script Importer, Undo/Redo, SFX Mute, and Send Live to OBS. */
import { renderCurvesTab } from "./curve-studio.js";
import { renderAnnotationsTab } from "./annotations-ui.js";
import { analyzeAudioWithProsodyOffline, renderMascotControls, updateVoiceToneMeter } from "./mascot-ui.js";
import { renderPuppetInspector, updatePuppetMeter } from "./puppet-inspector.js";

const FORMAT_DIMS = {
  "16:9": { w: 1920, h: 1080 },
  "9:16": { w: 1080, h: 1920 },
  "1:1":  { w: 1080, h: 1080 },
};

const FA = "۰۱۲۳۴۵۶۷۸۹";
const fa = (v) => String(v ?? "").replace(/[0-9]/g, (d) => FA[+d]);
const FX_CAT = (window.Stage && window.Stage.fx && window.Stage.fx.CATALOG) || {
  presets: {},
  presetLabels: {},
  transitions: ["curtain-rtl", "accent-slash", "iris-rise", "soft-fade", "split-curtain", "diagonal-wipe", "zoom-iris", "shutter-bars", "editorial-push", "cinema-bars"],
  transitionLabels: {},
  logoMotions: ["pop-spin", "slide-rtl", "orbit-pulse", "flip-reveal", "stamp-drop", "glitch-snap", "float-fade"],
  logoMotionLabels: {},
  logoPositions: ["top-left", "top-right", "bottom-right", "bottom-left"],
};

const schemas = {};
(window.TEMPLATE_INDEX || []).forEach((item) => {
  schemas[item.name] = item.schema || { name: item.name, fields: [] };
});
const themes = Object.values((window.Stage && window.Stage.themes) || {});

const state = {
  projects: [],
  projectName: null,
  data: null,
  images: [],
  starterAssets: [],
  activeIndex: 0,
  activeTab: "content",
  format: "16:9",
  dirty: false,
  playing: false,
  livingLoop: true,
  sfxMuted: false,
  sfxVolume: 0.72,
  duration: 6,
  currentTime: 0,
  fx: {},
  camOverlap: [],
  playTimer: null,
  playStartedAt: 0,
  playFrom: 0,
  loadDebounce: null,
  undoStack: [],
  redoStack: [],
  lastSnapshot: null,
  pickCallback: null,
  galleryCategory: "همه",
  previewAudio: typeof Audio !== "undefined" ? new Audio() : null,
  slideAudioMap: new WeakMap(),
};

const els = {
  statusText: document.getElementById("statusText"),
  projectSelect: document.getElementById("projectSelect"),
  themeSelect: document.getElementById("themeSelect"),
  btnNewProject: document.getElementById("btnNewProject"),
  btnProjectStyle: document.getElementById("btnProjectStyle"),
  btnOpenImporter: document.getElementById("btnOpenImporter"),
  btnRandomAll: document.getElementById("btnRandomAll"),
  btnUndo: document.getElementById("btnUndo"),
  btnRedo: document.getElementById("btnRedo"),
  btnSave: document.getElementById("btnSave"),
  btnSendLive: document.getElementById("btnSendLive"),
  dirtyBadge: document.getElementById("dirtyBadge"),
  linkObs: document.getElementById("linkObs"),
  slidesCount: document.getElementById("slidesCount"),
  btnOpenGallery: document.getElementById("btnOpenGallery"),
  addTemplateSelect: document.getElementById("addTemplateSelect"),
  btnAddSlide: document.getElementById("btnAddSlide"),
  slidesList: document.getElementById("slidesList"),
  stageViewport: document.getElementById("stageViewport"),
  stageFrameBox: document.getElementById("stageFrameBox"),
  stageFrame: document.getElementById("stageFrame"),
  stageCanvasPicker: document.getElementById("stageCanvasPicker"),
  camOnlyOverlay: document.getElementById("camOnlyOverlay"),
  chkLivingLoop: document.getElementById("chkLivingLoop"),
  chkCamGuide: document.getElementById("chkCamGuide"),
  camStatusChip: document.getElementById("camStatusChip"),
  btnReroll: document.getElementById("btnReroll"),
  btnPlayPause: document.getElementById("btnPlayPause"),
  btnReplay: document.getElementById("btnReplay"),
  btnSfxMute: document.getElementById("btnSfxMute"),
  timeScrubber: document.getElementById("timeScrubber"),
  timeReadout: document.getElementById("timeReadout"),
  presetChip: document.getElementById("presetChip"),
  transitionChip: document.getElementById("transitionChip"),
  sayDurChip: document.getElementById("sayDurChip"),
  activeSlideBadge: document.getElementById("activeSlideBadge"),
  inspectorBody: document.getElementById("inspectorBody"),
  galleryModal: document.getElementById("galleryModal"),
  btnCloseGallery: document.getElementById("btnCloseGallery"),
  gallerySearch: document.getElementById("gallerySearch"),
  galleryCats: document.getElementById("galleryCats"),
  galleryGrid: document.getElementById("galleryGrid"),
  importerModal: document.getElementById("importerModal"),
  btnCloseImporter: document.getElementById("btnCloseImporter"),
  importerText: document.getElementById("importerText"),
  btnStarterPodcastDeck: document.getElementById("btnStarterPodcastDeck"),
  btnAppendImported: document.getElementById("btnAppendImported"),
  btnReplaceImported: document.getElementById("btnReplaceImported"),
  newProjectModal: document.getElementById("newProjectModal"),
  newProjectName: document.getElementById("newProjectName"),
  newProjectErr: document.getElementById("newProjectErr"),
  btnCloseNewModal: document.getElementById("btnCloseNewModal"),
  btnCreateProject: document.getElementById("btnCreateProject"),
  styleModal: document.getElementById("styleModal"),
  btnCloseStyleModal: document.getElementById("btnCloseStyleModal"),
  projThemeSelect: document.getElementById("projThemeSelect"),
  projPresetSelect: document.getElementById("projPresetSelect"),
  projTransitionSelect: document.getElementById("projTransitionSelect"),
  projLogoMotionSelect: document.getElementById("projLogoMotionSelect"),
  projLogoPosSelect: document.getElementById("projLogoPosSelect"),
  projSeedInput: document.getElementById("projSeedInput"),
  projLivingBgSelect: document.getElementById("projLivingBgSelect"),
  projLivingIntensitySelect: document.getElementById("projLivingIntensitySelect"),
  projPodcastHost: document.getElementById("projPodcastHost"),
  projPodcastShow: document.getElementById("projPodcastShow"),
  projLogoImageSelect: document.getElementById("projLogoImageSelect"),
  projLogoTextInput: document.getElementById("projLogoTextInput"),
  projLogoUpload: document.getElementById("projLogoUpload"),
  btnStyleModalReroll: document.getElementById("btnStyleModalReroll"),
  btnApplyStyleModal: document.getElementById("btnApplyStyleModal"),
};

/* ---------------------------------------------------------------- helpers */
function setStatus(msg) {
  els.statusText.textContent = msg;
}

function updateUndoButtons() {
  els.btnUndo.disabled = state.undoStack.length === 0;
  els.btnRedo.disabled = state.redoStack.length === 0;
}

function commitSnapshot() {
  if (!state.data) return;
  const serialized = JSON.stringify({ data: state.data, activeIndex: state.activeIndex });
  if (state.lastSnapshot && state.lastSnapshot !== serialized) {
    state.undoStack.push(state.lastSnapshot);
    if (state.undoStack.length > 40) state.undoStack.shift();
    state.redoStack = [];
  }
  state.lastSnapshot = serialized;
  updateUndoButtons();
}

function applySerializedSnapshot(raw) {
  const parsed = JSON.parse(raw);
  state.data = parsed.data;
  state.activeIndex = Math.max(0, Math.min((state.data.slides || []).length - 1, parsed.activeIndex || 0));
  state.lastSnapshot = raw;
  setDirty(true, false);
  els.themeSelect.value = state.data.theme || "khordegir-dark";
  renderSlidesList();
  renderInspector();
  reloadStage(true);
  updateUndoButtons();
}

function undo() {
  if (!state.undoStack.length) return;
  if (state.lastSnapshot) state.redoStack.push(state.lastSnapshot);
  const prev = state.undoStack.pop();
  applySerializedSnapshot(prev);
  setStatus("تغییر قبلی بازگردانی شد (Undo)");
}

function redo() {
  if (!state.redoStack.length) return;
  if (state.lastSnapshot) state.undoStack.push(state.lastSnapshot);
  const next = state.redoStack.pop();
  applySerializedSnapshot(next);
  setStatus("تغییر مجدد اعمال شد (Redo)");
}

function setDirty(flag, recordHistory = true) {
  state.dirty = !!flag;
  els.btnSave.disabled = !state.dirty || !state.projectName;
  els.dirtyBadge.classList.toggle("hidden", !state.dirty);
  if (flag && recordHistory) {
    commitSnapshot();
  }
}

function activeSlide() {
  if (!state.data || !Array.isArray(state.data.slides)) return null;
  return state.data.slides[state.activeIndex] || null;
}

function fnv1aHash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function resolvedThemeName() {
  const raw = (state.data && state.data.theme) || "khordegir-dark";
  if (raw === "random" || raw === "تصادفی") {
    if (!themes.length) return "khordegir-dark";
    const seed = (state.data && state.data.seed) || 0;
    const title = (state.data && state.data.title) || "";
    const key = `${state.projectName || "demo"}:${seed}:${title}`;
    const sorted = [...themes].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    return sorted[fnv1aHash(key) % sorted.length].name;
  }
  return raw;
}

function estimateSay(slide) {
  if (!slide) return null;
  const parts = [];
  if (typeof slide.say === "string" && slide.say.trim()) parts.push(slide.say.trim());
  if (Array.isArray(slide.steps)) {
    slide.steps.forEach((st) => {
      if (typeof st === "string" && st.trim()) parts.push(st.trim());
      else if (st && typeof st.say === "string" && st.say.trim()) parts.push(st.say.trim());
    });
  }
  const text = parts.join(" ").trim();
  if (!text) return null;
  const words = text.split(/\s+/).filter(Boolean).length;
  return +(Math.max(4.5, Math.min(26, words / 2.25 + 1.15))).toFixed(2);
}

function resolveImageUrl(val) {
  if (!val) return "";
  const s = String(val).trim();
  if (/^(https?:|file:|data:|blob:|\/projects\/|\/assets\/)/.test(s)) return s;
  if (/^assets\//.test(s)) return "/" + s;
  const clean = s.replace(/^img\//, "");
  if (state.projectName) {
    return `/projects/${encodeURIComponent(state.projectName)}/img/${encodeURIComponent(clean)}`;
  }
  return s;
}

function buildStagePayload(slide, idx) {
  const copy = JSON.parse(JSON.stringify(slide || {}));
  const projSeed = (state.data && Number(state.data.seed)) || 0;
  copy._seed = `${state.projectName || "demo"}:${projSeed}:${idx + 1}`;
  copy._num = idx + 1;

  if (state.data) {
    [
      "preset", "transition", "transitionTiming", "transition_timing",
      "motionPersonality", "motion_personality", "textMotion", "text_motion",
      "camera", "cameraConfig", "ambience", "particles", "weather",
      "logo", "logo_motion", "logo_position", "logo_text", "livingStage", "motionCurve", "puppet",
    ].forEach((k) => {
      if (state.data[k] !== undefined && copy[k] === undefined) {
        copy[k] = JSON.parse(JSON.stringify(state.data[k]));
      }
    });
  }

  ["image", "src", "bg_image", "before_image", "after_image", "avatar", "photo1", "photo2", "photo3"].forEach((ik) => {
    if (copy[ik]) copy[ik] = resolveImageUrl(copy[ik]);
  });
  if (copy.livingStage && typeof copy.livingStage === "object" && copy.livingStage.bgImage) {
    copy.livingStage.bgImage = resolveImageUrl(copy.livingStage.bgImage);
  }
  if (typeof copy.logo === "string") copy.logo = resolveImageUrl(copy.logo);
  else if (copy.logo && typeof copy.logo === "object" && copy.logo.image) {
    copy.logo.image = resolveImageUrl(copy.logo.image);
  }
  const audInfo = state.slideAudioMap.get(slide);
  if (audInfo && audInfo.track) {
    copy.visemeTrack = audInfo.track;
    if (copy.mascot && typeof copy.mascot === "object") copy.mascot.visemeTrack = audInfo.track;
  }
  if (audInfo && audInfo.prosody) {
    copy.prosodyTrack = audInfo.prosody;
    if (copy.mascot && typeof copy.mascot === "object") copy.mascot.prosodyTrack = audInfo.prosody;
  }
  return copy;
}

function activeFormat() {
  const slide = activeSlide();
  const cand = (slide && slide.format && FORMAT_DIMS[slide.format])
    ? slide.format
    : (state.format && FORMAT_DIMS[state.format])
      ? state.format
      : (state.data && state.data.format && FORMAT_DIMS[state.data.format]) || "16:9";
  return cand;
}

/* ---------------------------------------------------------------- stage viewport scaling & bridge */
function resizeStage() {
  const fmt = activeFormat();
  const dims = FORMAT_DIMS[fmt] || FORMAT_DIMS["16:9"];
  const vp = els.stageViewport;
  const vw = Math.max(240, vp.clientWidth - 32);
  const vh = Math.max(160, vp.clientHeight - 32);
  const scale = Math.min(vw / dims.w, vh / dims.h);
  const w = Math.floor(dims.w * scale);
  const h = Math.floor(dims.h * scale);
  els.stageFrameBox.style.width = w + "px";
  els.stageFrameBox.style.height = h + "px";
  els.stageFrame.style.width = dims.w + "px";
  els.stageFrame.style.height = dims.h + "px";
  els.stageFrame.style.transform = `scale(${scale})`;
}

function stopClock() {
  state.playing = false;
  clearInterval(state.playTimer);
  state.playTimer = null;
  if (state.previewAudio) {
    try { state.previewAudio.pause(); } catch (_) {}
  }
  els.btnPlayPause.textContent = "▶ پخش";
  if (els.stageFrame.contentWindow) {
    els.stageFrame.contentWindow.postMessage({ cmd: "seek", t: state.currentTime, fireSfx: false }, "*");
  }
}

function startClock(fromSec, syncFrame = true) {
  clearInterval(state.playTimer);
  state.playing = true;
  state.playFrom = fromSec ?? state.currentTime;
  if (!state.livingLoop && state.playFrom >= state.duration - 0.03) state.playFrom = 0;
  state.playStartedAt = performance.now();
  els.btnPlayPause.textContent = "⏸ توقف";

  const slide = activeSlide();
  const audInfo = slide ? state.slideAudioMap.get(slide) : null;
  const hasAudio = Boolean(audInfo && audInfo.url && state.previewAudio);

  if (hasAudio) {
    if (state.previewAudio.src !== audInfo.url) state.previewAudio.src = audInfo.url;
    state.previewAudio.currentTime = Math.min(state.playFrom, Math.max(0, state.previewAudio.duration || state.duration));
    state.previewAudio.muted = Boolean(state.sfxMuted);
    state.previewAudio.play().catch(() => {});
  } else if (state.previewAudio) {
    try { state.previewAudio.pause(); } catch (_) {}
  }

  if (!hasAudio && syncFrame && els.stageFrame.contentWindow) {
    els.stageFrame.contentWindow.postMessage({ cmd: "play", from: state.playFrom, liveLoop: state.livingLoop }, "*");
  }

  state.playTimer = setInterval(() => {
    const rawT = (hasAudio && !state.previewAudio.paused)
      ? state.previewAudio.currentTime
      : (state.playFrom + (performance.now() - state.playStartedAt) / 1000);

    if (hasAudio && els.stageFrame.contentWindow) {
      // Lock stage frame strictly to audio playback clock for dead-on lip-sync
      els.stageFrame.contentWindow.postMessage({ cmd: "seek", t: rawT, fireSfx: false }, "*");
    }

    if (!state.livingLoop && rawT >= state.duration) {
      state.currentTime = state.duration;
      updateTimeUI();
      stopClock();
      return;
    }
    if (hasAudio && state.previewAudio.ended) {
      state.currentTime = Math.min(state.duration, rawT);
      updateTimeUI();
      if (!state.livingLoop) stopClock();
      return;
    }
    state.currentTime = Math.min(state.duration, rawT);
    updateTimeUI();
  }, hasAudio ? 30 : 60);
}

function postSeek(t) {
  if (state.previewAudio && state.previewAudio.src) {
    try { state.previewAudio.currentTime = Math.max(0, t); } catch (_) {}
  }
  if (!els.stageFrame.contentWindow) return;
  els.stageFrame.contentWindow.postMessage({ cmd: "seek", t, fireSfx: false }, "*");
}

function updateTimeUI() {
  els.timeScrubber.max = String(state.duration.toFixed(2));
  els.timeScrubber.value = String(Math.min(state.duration, state.currentTime).toFixed(2));
  els.timeReadout.textContent = `${state.currentTime.toFixed(2)}s / ${state.duration.toFixed(2)}s`;
}

function reloadStage(autoPlay = true, atSec = null) {
  const slide = activeSlide();
  if (!slide) return;
  const layout = String(slide.layout || "SLIDE").toUpperCase();
  const fmt = activeFormat();
  state.format = fmt;
  resizeStage();

  els.camOnlyOverlay.classList.toggle("hidden", layout !== "CAM");

  document.querySelectorAll(".seg-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.layout === layout);
  });
  document.querySelectorAll(".fmt-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.format === fmt);
  });

  const sayEst = estimateSay(slide);
  els.sayDurChip.textContent = sayEst ? `گفتار: ${fa(sayEst)}ث` : "گفتار: —";

  if (layout === "CAM" || !els.stageFrame.contentWindow) {
    state.pendingAutoPlay = false;
    return;
  }
  state.pendingAutoPlay = Boolean(autoPlay);
  const payload = buildStagePayload(slide, state.activeIndex);
  els.stageFrame.contentWindow.postMessage({
    cmd: "load",
    slide: payload,
    theme: resolvedThemeName(),
    format: fmt,
    camGuide: els.chkCamGuide.checked,
    liveLoop: state.livingLoop,
    sfxMuted: state.sfxMuted,
    sfxVolume: state.sfxVolume,
    at: autoPlay ? null : (atSec ?? state.currentTime),
  }, "*");
}

function scheduleReload(autoPlay = false) {
  clearTimeout(state.loadDebounce);
  state.loadDebounce = setTimeout(() => {
    reloadStage(autoPlay, autoPlay ? 0 : state.currentTime);
  }, 110);
}

window.addEventListener("message", (ev) => {
  const d = ev.data || {};
  if (d.cmd === "loaded" && d.info) {
    state.duration = Number(d.info.duration || 6);
    state.fx = d.info.fx || {};
    state.camOverlap = Array.isArray(d.cam) ? d.cam : [];
    const pLbl = FX_CAT.presetLabels[state.fx.preset] || state.fx.preset || "خودکار";
    const tLbl = FX_CAT.transitionLabels[state.fx.transition] || state.fx.transition || "خودکار";
    els.presetChip.textContent = `سبک: ${pLbl}`;
    els.transitionChip.textContent = `ترنزیشن: ${tLbl}`;

    if (state.camOverlap.length) {
      els.camStatusChip.textContent = `هشدار تداخل دوربین (${fa(state.camOverlap.length)})`;
      els.camStatusChip.className = "status-chip warn";
    } else {
      els.camStatusChip.textContent = "ناحیه دوربین آزاد";
      els.camStatusChip.className = "status-chip ok";
    }

    if (state.playing || state.pendingAutoPlay) {
      state.pendingAutoPlay = false;
      startClock(0, false);
    } else {
      state.currentTime = Math.min(state.currentTime, state.duration);
      updateTimeUI();
    }
  } else if (d.cmd === "mascotTelemetry" && d.state) {
    updateVoiceToneMeter(d.state);
    updatePuppetMeter(d.state);
  }
});

/* ---------------------------------------------------------------- Send Live to OBS */
async function sendActiveSlideToLiveObs() {
  const slide = activeSlide();
  if (!state.projectName || !slide) return;
  const payload = buildStagePayload(slide, state.activeIndex);
  try {
    const resp = await fetch(`/api/live/${encodeURIComponent(state.projectName)}/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "stage:sync",
        payload: {
          currentSlideIndex: state.activeIndex,
          layout: String(slide.layout || "SCAM").toUpperCase(),
          theme: resolvedThemeName(),
          activeSlide: payload,
          livingStage: slide.livingStage || state.data?.livingStage || undefined,
        },
      }),
    });
    const json = await resp.json();
    if (!resp.ok || !json.ok) throw new Error(json.error || "خطا");
    setStatus(`اسلاید ${fa(state.activeIndex + 1)} روی OBS زنده ارسال شد ✓`);
  } catch (err) {
    setStatus("خطا در ارسال زنده به OBS: " + err.message);
  }
}

/* ---------------------------------------------------------------- Canvas Coordinate Picker */
function startPickTarget(cb) {
  state.pickCallback = cb;
  els.stageCanvasPicker.classList.remove("hidden");
  setStatus("روی نقطهٔ دلخواه بوم کلیک کنید...");
}

function stopPickTarget() {
  state.pickCallback = null;
  els.stageCanvasPicker.classList.add("hidden");
}

els.stageCanvasPicker.addEventListener("click", (ev) => {
  if (!state.pickCallback) return;
  const dims = FORMAT_DIMS[activeFormat()] || FORMAT_DIMS["16:9"];
  const rect = els.stageCanvasPicker.getBoundingClientRect();
  const x = Math.round(((ev.clientX - rect.left) / rect.width) * dims.w);
  const y = Math.round(((ev.clientY - rect.top) / rect.height) * dims.h);
  const fn = state.pickCallback;
  stopPickTarget();
  fn(Math.max(0, Math.min(dims.w, x)), Math.max(0, Math.min(dims.h, y)));
  setDirty(true);
});

/* ---------------------------------------------------------------- rendering UI */
function fillThemeSelect(sel) {
  sel.innerHTML = "";
  const randOpt = document.createElement("option");
  randOpt.value = "random";
  randOpt.textContent = "🎲 تصادفی (با بذر قطعی)";
  sel.appendChild(randOpt);
  themes.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t.name;
    opt.textContent = t.label || t.name;
    sel.appendChild(opt);
  });
}

function initSelectors() {
  fillThemeSelect(els.themeSelect);
  fillThemeSelect(els.projThemeSelect);

  els.projPresetSelect.innerHTML = "";
  const pRand = document.createElement("option");
  pRand.value = "random";
  pRand.textContent = "🎲 تصادفی (با بذر هر اسلاید)";
  els.projPresetSelect.appendChild(pRand);
  const seenPresets = new Set();
  Object.values(FX_CAT.presets || {}).forEach((arr) => {
    arr.forEach((p) => {
      if (seenPresets.has(p)) return;
      seenPresets.add(p);
      const o = document.createElement("option");
      o.value = p;
      o.textContent = FX_CAT.presetLabels[p] ? `${FX_CAT.presetLabels[p]} (${p})` : p;
      els.projPresetSelect.appendChild(o);
    });
  });

  els.projTransitionSelect.innerHTML = "";
  const tRand = document.createElement("option");
  tRand.value = "random";
  tRand.textContent = "🎲 تصادفی (با بذر قطعی)";
  els.projTransitionSelect.appendChild(tRand);
  (FX_CAT.transitions || []).forEach((tr) => {
    const o = document.createElement("option");
    o.value = tr;
    o.textContent = FX_CAT.transitionLabels[tr] || tr;
    els.projTransitionSelect.appendChild(o);
  });

  els.projLogoMotionSelect.innerHTML = "";
  const lRand = document.createElement("option");
  lRand.value = "random";
  lRand.textContent = "🎲 تصادفی (با بذر قطعی)";
  els.projLogoMotionSelect.appendChild(lRand);
  (FX_CAT.logoMotions || []).forEach((lm) => {
    const o = document.createElement("option");
    o.value = lm;
    o.textContent = FX_CAT.logoMotionLabels[lm] || lm;
    els.projLogoMotionSelect.appendChild(o);
  });

  els.addTemplateSelect.innerHTML = "";
  (window.TEMPLATE_INDEX || []).forEach((item) => {
    const s = item.schema || {};
    const opt = document.createElement("option");
    opt.value = item.name;
    opt.textContent = s.label || item.name;
    els.addTemplateSelect.appendChild(opt);
  });
}

function insertTemplateSlide(tpl) {
  if (!state.data) return;
  const schema = schemas[tpl] || {};
  const example = JSON.parse(JSON.stringify(schema.example || {}));
  const newSlide = Object.assign({ template: tpl }, example);
  state.data.slides.splice(state.activeIndex + 1, 0, newSlide);
  state.activeIndex += 1;
  setDirty(true);
  renderSlidesList();
  renderInspector();
  reloadStage(true);
}

function renderSlidesList() {
  const slides = (state.data && state.data.slides) || [];
  els.slidesCount.textContent = fa(slides.length);
  els.slidesList.innerHTML = "";

  slides.forEach((s, idx) => {
    const tpl = String(s.template || "quote").replace(/-/g, "_");
    const schema = schemas[tpl] || {};
    const card = document.createElement("div");
    card.className = "slide-card" + (idx === state.activeIndex ? " active" : "");

    const titleStr = s.title || s.text || s.label || s.number || s.say || "اسلاید بدون عنوان";
    const cleanTitle = String(titleStr).replace(/[*~=_]/g, "").slice(0, 48);

    card.innerHTML = `
      <div class="slide-card-top">
        <div class="slide-meta">
          <span class="slide-num">${fa(idx + 1)}</span>
          <span class="slide-tpl-badge">${schema.label || tpl}</span>
        </div>
        <span class="slide-layout-pill">${String(s.layout || "SLIDE").toUpperCase()}</span>
      </div>
      <div class="slide-title-preview">${cleanTitle}</div>
      <div class="slide-actions">
        <button type="button" class="icon-btn" data-act="up" ${idx === 0 ? "disabled" : ""} title="بالا">▲</button>
        <button type="button" class="icon-btn" data-act="down" ${idx === slides.length - 1 ? "disabled" : ""} title="پایین">▼</button>
        <button type="button" class="icon-btn" data-act="dup" title="تکثیر">کپی</button>
        <button type="button" class="icon-btn danger" data-act="del" ${slides.length <= 1 ? "disabled" : ""} title="حذف">حذف</button>
      </div>
    `;

    card.addEventListener("click", (e) => {
      const actBtn = e.target.closest("[data-act]");
      if (actBtn) {
        e.stopPropagation();
        handleSlideAction(idx, actBtn.dataset.act);
        return;
      }
      state.activeIndex = idx;
      state.currentTime = 0;
      renderSlidesList();
      renderInspector();
      reloadStage(true);
    });

    els.slidesList.appendChild(card);
  });
}

function handleSlideAction(idx, act) {
  const slides = state.data && state.data.slides;
  if (!slides) return;
  if (act === "up" && idx > 0) {
    [slides[idx - 1], slides[idx]] = [slides[idx], slides[idx - 1]];
    state.activeIndex = idx - 1;
  } else if (act === "down" && idx < slides.length - 1) {
    [slides[idx + 1], slides[idx]] = [slides[idx], slides[idx + 1]];
    state.activeIndex = idx + 1;
  } else if (act === "dup") {
    const clone = JSON.parse(JSON.stringify(slides[idx]));
    slides.splice(idx + 1, 0, clone);
    state.activeIndex = idx + 1;
  } else if (act === "del" && slides.length > 1) {
    slides.splice(idx, 1);
    if (state.activeIndex >= slides.length) state.activeIndex = slides.length - 1;
  } else {
    return;
  }
  setDirty(true);
  renderSlidesList();
  renderInspector();
  reloadStage(true);
}

function readOverride(slide, key) {
  const layoutKey = String(slide.layout || "SLIDE").toUpperCase() === "SCAM" ? "SCAM" : "SLIDE";
  const ovs = slide.overrides;
  if (!ovs || typeof ovs !== "object") return { x: 0, y: 0, scale: 1 };
  let entry = null;
  if (ovs[layoutKey] && ovs[layoutKey][key]) entry = ovs[layoutKey][key];
  else if (ovs[key]) entry = ovs[key];
  return {
    x: entry && Number.isFinite(+entry.x) ? +entry.x : 0,
    y: entry && Number.isFinite(+entry.y) ? +entry.y : 0,
    scale: entry && Number.isFinite(+entry.scale) ? +entry.scale : 1,
  };
}

function writeOverride(slide, key, nextVal) {
  if (!slide.overrides || typeof slide.overrides !== "object") slide.overrides = {};
  const isIdentity = nextVal.x === 0 && nextVal.y === 0 && nextVal.scale === 1;
  if (isIdentity) {
    delete slide.overrides[key];
    if (slide.overrides.SCAM) delete slide.overrides.SCAM[key];
    if (slide.overrides.SLIDE) delete slide.overrides.SLIDE[key];
    if (!Object.keys(slide.overrides).length) delete slide.overrides;
  } else {
    slide.overrides[key] = { x: nextVal.x, y: nextVal.y, scale: nextVal.scale };
  }
}

/* ---------------------------------------------------------------- Inspector Tabs */
function handleSubModuleChange(opts = {}) {
  setDirty(true);
  renderSlidesList();
  if (opts.reload) reloadStage(Boolean(opts.autoPlay), opts.autoPlay ? 0 : state.currentTime);
  else if (opts.debouncedReload) scheduleReload(Boolean(opts.autoPlay));
}

function renderLivingAndAudioTab(container, slide) {
  container.innerHTML = "";
  if (!slide) return;
  const projLs = (state.data && state.data.livingStage) || {};
  const ls = Object.assign({
    bgStyle: projLs.bgStyle || "studio-mix",
    intensity: projLs.intensity || "podcast",
    microMotion: projLs.microMotion !== false,
    floatMode: projLs.floatMode || "images-only",
    floatStyle: projLs.floatStyle || "silk-glide",
    floatAmplitude: projLs.floatAmplitude ?? 2,
    floatSpeed: projLs.floatSpeed ?? 0.45,
    floatRatio: projLs.floatRatio ?? 0.75,
    floatSeed: projLs.floatSeed ?? 0,
  }, slide.livingStage || {});

  const syncFloatLive = (patch) => {
    Object.assign(ls, patch);
    ls.microMotion = ls.floatMode !== "off" && Number(ls.floatAmplitude) > 0;
    slide.livingStage = Object.assign({}, ls);
    setDirty(true);
    if (els.stageFrame && els.stageFrame.contentWindow) {
      els.stageFrame.contentWindow.postMessage({ cmd: "livingConfig", livingStage: slide.livingStage }, "*");
    }
  };

  const secLive = document.createElement("div");
  secLive.className = "inspector-section";
  secLive.innerHTML = `
    <div class="section-title">
      <span>پس‌زمینهٔ زنده (Living Stage)</span>
      <span class="bilingual-sub">Always-On Ambient</span>
    </div>
    <p class="panel-hint">نور و موج ملایم در پس‌زمینه تا تصویر بدون لرزش متون همیشه زنده و عمیق بماند.</p>
  `;

  const bgGrp = document.createElement("label");
  bgGrp.className = "field-group";
  bgGrp.innerHTML = `<span>نوع پس‌زمینهٔ زنده این اسلاید</span>`;
  const bgSel = document.createElement("select");
  bgSel.className = "select-ctrl";
  [
    ["dreamy-bokeh", "بوکهٔ محو و رویایی یوتیوبری (پیشنهادی)"],
    ["editorial-blur", "پس‌زمینهٔ محو عمیق سافت (Editorial Blur)"],
    ["studio-mix", "ترکیبی استودیو (شفق + ذرات + موج)"],
    ["aurora", "شفق نوری ملایم (Aurora)"],
    ["particles", "ذرات نوری شناور (Particles)"],
    ["grid", "شبکه تحلیلی متحرک (Grid)"],
    ["wave", "موج صوتی پادکست (Wave)"],
  ].forEach(([v, l]) => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = l;
    bgSel.appendChild(o);
  });
  bgSel.value = ls.bgStyle || "dreamy-bokeh";
  bgSel.addEventListener("change", () => {
    Object.assign(ls, { bgStyle: bgSel.value });
    slide.livingStage = Object.assign({}, ls);
    setDirty(true);
    renderLivingAndAudioTab(container, slide);
    reloadStage(true);
  });
  bgGrp.appendChild(bgSel);
  secLive.appendChild(bgGrp);

  if (ls.bgStyle === "dreamy-bokeh" || ls.bgStyle === "editorial-blur") {
    const blurBgGrp = document.createElement("label");
    blurBgGrp.className = "field-group";
    blurBgGrp.innerHTML = `<span>تصویر پایه برای پس‌زمینهٔ محو (اختیاری)</span>`;
    const blurBgSel = document.createElement("select");
    blurBgSel.className = "select-ctrl";
    [
      { value: "", label: "خودکار (استفاده از عکس اسلاید یا استودیو)" },
      ...(state.starterAssets || []).map((a) => ({ value: a.url, label: `✨ ${a.label}` })),
      ...(state.images || []).map((im) => ({ value: im, label: `📁 ${im}` })),
    ].forEach((optItem) => {
      const o = document.createElement("option");
      o.value = optItem.value;
      o.textContent = optItem.label;
      blurBgSel.appendChild(o);
    });
    blurBgSel.value = ls.bgImage || "";
    blurBgSel.addEventListener("change", () => {
      if (blurBgSel.value) ls.bgImage = blurBgSel.value;
      else delete ls.bgImage;
      slide.livingStage = Object.assign({}, ls);
      setDirty(true);
      reloadStage(true);
    });
    blurBgGrp.appendChild(blurBgSel);
    secLive.appendChild(blurBgGrp);
  }

  const intGrp = document.createElement("label");
  intGrp.className = "field-group";
  intGrp.innerHTML = `<span>شدت پس‌زمینهٔ زنده</span>`;
  const intSel = document.createElement("select");
  intSel.className = "select-ctrl";
  [
    ["podcast", "پادکست استاندارد (متعادل و آرام)"],
    ["subtle", "ملایم (Subtle)"],
    ["dynamic", "پرانرژی (Dynamic)"],
    ["off", "خاموش (فقط برای این اسلاید)"],
  ].forEach(([v, l]) => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = l;
    intSel.appendChild(o);
  });
  intSel.value = ls.intensity || "podcast";
  intSel.addEventListener("change", () => {
    Object.assign(ls, { intensity: intSel.value });
    slide.livingStage = Object.assign({}, ls);
    setDirty(true);
    reloadStage(true);
  });
  intGrp.appendChild(intSel);
  secLive.appendChild(intGrp);

  // Imperceptible Silk-Glide subsection (foreground images & visual items on top of background ONLY)
  const floatSub = document.createElement("div");
  floatSub.className = "float-divider-group";
  floatSub.innerHTML = `
    <div class="override-head">
      <span>لغزش ابریشمی اجزای روی پس‌زمینه</span>
      <span class="bilingual-sub">Silk Glide</span>
    </div>
    <p class="panel-hint">لغزش بسیار نرم و تقریباً ثابت (نامحسوس) فقط برای عکس‌ها و قاب‌های روی پس‌زمینه — متن‌ها، کارت‌ها و نمودارها کاملاً ثابت می‌مانند.</p>
  `;

  const modeGrp = document.createElement("label");
  modeGrp.className = "field-group";
  modeGrp.innerHTML = `<span>محدودهٔ لغزش نرم</span>`;
  const modeSel = document.createElement("select");
  modeSel.className = "select-ctrl";
  modeSel.id = "livingFloatModeSelect";
  [
    ["images-only", "فقط عکس‌ها و اجزای روی پس‌زمینه (پیشنهادی · بسیار نرم)"],
    ["selective", "بعضی کارت‌ها و عکس‌ها (انتخابی)"],
    ["all-items", "همهٔ کارت‌ها و عکس‌ها"],
    ["off", "خاموش (کاملاً ثابت)"],
  ].forEach(([v, l]) => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = l;
    modeSel.appendChild(o);
  });
  modeSel.value = ls.microMotion === false ? "off" : (ls.floatMode || "images-only");
  modeGrp.appendChild(modeSel);
  floatSub.appendChild(modeGrp);

  const styleGrp = document.createElement("label");
  styleGrp.className = "field-group";
  styleGrp.innerHTML = `<span>سبک لغزش</span>`;
  const styleSel = document.createElement("select");
  styleSel.className = "select-ctrl";
  styleSel.id = "livingFloatStyleSelect";
  [
    ["silk-glide", "لغزش ابریشمی نامحسوس (تقریباً ثابت)"],
    ["optical-breathe", "تنفس اپتیکی بسیار ملایم"],
  ].forEach(([v, l]) => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = l;
    styleSel.appendChild(o);
  });
  styleSel.value = ls.floatStyle || "silk-glide";
  styleGrp.appendChild(styleSel);
  floatSub.appendChild(styleGrp);

  const ampRow = document.createElement("label");
  ampRow.className = "slider-row";
  const ampVal = Number(ls.floatAmplitude ?? 2);
  ampRow.innerHTML = `<span>دامنهٔ لغزش (بسیار ظریف): <strong class="mono-num">${ampVal} px</strong></span>`;
  const ampInp = document.createElement("input");
  ampInp.type = "range";
  ampInp.id = "livingFloatAmpSlider";
  ampInp.min = "0";
  ampInp.max = "8";
  ampInp.step = "0.25";
  ampInp.value = String(ampVal);
  ampRow.appendChild(ampInp);
  floatSub.appendChild(ampRow);

  const spdRow = document.createElement("label");
  spdRow.className = "slider-row";
  const spdVal = Number(ls.floatSpeed ?? 0.45);
  spdRow.innerHTML = `<span>نرمی و کندی حرکت: <strong class="mono-num">${spdVal.toFixed(2)}x</strong></span>`;
  const spdInp = document.createElement("input");
  spdInp.type = "range";
  spdInp.id = "livingFloatSpeedSlider";
  spdInp.min = "0.2";
  spdInp.max = "1.5";
  spdInp.step = "0.05";
  spdInp.value = String(spdVal);
  spdRow.appendChild(spdInp);
  floatSub.appendChild(spdRow);

  const ratioRow = document.createElement("label");
  ratioRow.className = "slider-row";
  const ratioVal = Number(ls.floatRatio ?? 0.75);
  ratioRow.innerHTML = `<span>سهم آیتم‌های لغزان: <strong class="mono-num">${Math.round(ratioVal * 100)}%</strong></span>`;
  const ratioInp = document.createElement("input");
  ratioInp.type = "range";
  ratioInp.id = "livingFloatRatioSlider";
  ratioInp.min = "0.25";
  ratioInp.max = "1";
  ratioInp.step = "0.05";
  ratioInp.value = String(ratioVal);
  ratioRow.appendChild(ratioInp);
  floatSub.appendChild(ratioRow);

  const seedRow = document.createElement("div");
  seedRow.className = "btn-row-wrap";
  const rerollFloatBtn = document.createElement("button");
  rerollFloatBtn.type = "button";
  rerollFloatBtn.id = "btnRerollFloatSeed";
  rerollFloatBtn.className = "btn btn-sm btn-ghost";
  rerollFloatBtn.textContent = "🎲 الگوی تصادفی جدید برای این اسلاید";
  seedRow.appendChild(rerollFloatBtn);
  floatSub.appendChild(seedRow);

  const updateFloatControlsState = () => {
    const isOff = modeSel.value === "off";
    const isSel = modeSel.value === "selective";
    styleSel.disabled = isOff;
    ampInp.disabled = isOff;
    spdInp.disabled = isOff;
    ratioInp.disabled = isOff || !isSel;
    ratioRow.style.display = isSel ? "" : "none";
    rerollFloatBtn.disabled = isOff || !isSel;
    rerollFloatBtn.style.display = isSel ? "" : "none";
  };
  updateFloatControlsState();

  modeSel.addEventListener("change", () => {
    updateFloatControlsState();
    syncFloatLive({ floatMode: modeSel.value });
  });
  styleSel.addEventListener("change", () => {
    syncFloatLive({ floatStyle: styleSel.value });
  });
  ampInp.addEventListener("input", () => {
    const v = parseFloat(ampInp.value);
    ampRow.querySelector("strong").textContent = `${v} px`;
    syncFloatLive({ floatAmplitude: v });
  });
  spdInp.addEventListener("input", () => {
    const v = parseFloat(spdInp.value);
    spdRow.querySelector("strong").textContent = `${v.toFixed(2)}x`;
    syncFloatLive({ floatSpeed: v });
  });
  ratioInp.addEventListener("input", () => {
    const v = parseFloat(ratioInp.value);
    ratioRow.querySelector("strong").textContent = `${Math.round(v * 100)}%`;
    syncFloatLive({ floatRatio: v });
  });
  rerollFloatBtn.addEventListener("click", () => {
    const nextSeed = (Number(ls.floatSeed) || 0) + 1;
    syncFloatLive({ floatSeed: nextSeed });
    setStatus("الگوی لغزش نرم تغییر کرد ✓");
  });

  secLive.appendChild(floatSub);

  const applyAllBtn = document.createElement("button");
  applyAllBtn.type = "button";
  applyAllBtn.className = "btn btn-sm btn-amber";
  applyAllBtn.textContent = "تنظیم به‌عنوان پیش‌فرض کل پروژه";
  applyAllBtn.addEventListener("click", () => {
    if (!state.data) return;
    state.data.livingStage = {
      bgStyle: bgSel.value,
      intensity: intSel.value,
      microMotion: modeSel.value !== "off" && parseFloat(ampInp.value) > 0,
      floatMode: modeSel.value,
      floatStyle: styleSel.value,
      floatAmplitude: parseFloat(ampInp.value),
      floatSpeed: parseFloat(spdInp.value),
      floatRatio: parseFloat(ratioInp.value),
      floatSeed: Number(ls.floatSeed) || 0,
    };
    (state.data.slides || []).forEach((s) => { delete s.livingStage; });
    setDirty(true);
    reloadStage(true);
    setStatus("تنظیمات پس‌زمینهٔ زنده و لغزش ابریشمی روی کل پروژه اعمال شد ✓");
  });
  secLive.appendChild(applyAllBtn);
  container.appendChild(secLive);

  // Audio & SFX Section
  const secSfx = document.createElement("div");
  secSfx.className = "inspector-section";
  secSfx.innerHTML = `
    <div class="section-title">
      <span>افکت‌های صوتی داخلی (Sound FX)</span>
      <span class="bilingual-sub">Web Audio Synth</span>
    </div>
    <p class="panel-hint">در زمان پخش انیمیشن و همچنین از طریق کنسول OBS می‌توانید افکت‌های صوتی زیر را پخش کنید.</p>
  `;

  const volRow = document.createElement("label");
  volRow.className = "slider-row";
  volRow.innerHTML = `<span>بلندی صدای افکت‌ها: <strong class="mono-num">${Math.round(state.sfxVolume * 100)}%</strong></span>`;
  const volInp = document.createElement("input");
  volInp.type = "range";
  volInp.min = "0";
  volInp.max = "1";
  volInp.step = "0.05";
  volInp.value = String(state.sfxVolume);
  volInp.addEventListener("input", () => {
    state.sfxVolume = parseFloat(volInp.value);
    volRow.querySelector("strong").textContent = `${Math.round(state.sfxVolume * 100)}%`;
    if (window.StageSFX) window.StageSFX.setVolume(state.sfxVolume);
    if (els.stageFrame.contentWindow) {
      els.stageFrame.contentWindow.postMessage({ cmd: "sfxConfig", volume: state.sfxVolume, muted: state.sfxMuted }, "*");
    }
  });
  volRow.appendChild(volInp);
  secSfx.appendChild(volRow);

  const sfxGrid = document.createElement("div");
  sfxGrid.className = "btn-row-wrap";
  ((window.StageSFX && window.StageSFX.CATALOG) || []).forEach((item) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn btn-sm btn-ghost";
    b.textContent = `${item.icon} ${item.label}`;
    b.addEventListener("click", () => {
      if (window.StageSFX) {
        window.StageSFX.setMuted(false);
        window.StageSFX.setVolume(state.sfxVolume);
        window.StageSFX.play(item.id, state.sfxVolume);
      }
    });
    sfxGrid.appendChild(b);
  });
  secSfx.appendChild(sfxGrid);
  container.appendChild(secSfx);
}

function renderContentTab(container, slide) {
  const tpl = String(slide.template || "quote").replace(/-/g, "_");
  const schema = schemas[tpl] || { label: tpl, fields: [] };

  // 1. Template switch + rich syntax tip
  const secMeta = document.createElement("div");
  secMeta.className = "inspector-section";
  secMeta.innerHTML = `<div class="section-title"><span>ساختار اسلاید</span></div>`;

  const tplGroup = document.createElement("label");
  tplGroup.className = "field-group";
  tplGroup.innerHTML = `<div class="field-label-row"><strong>نوع قالب</strong></div>`;
  const tplSel = document.createElement("select");
  tplSel.className = "select-ctrl";
  (window.TEMPLATE_INDEX || []).forEach((it) => {
    const o = document.createElement("option");
    o.value = it.name;
    o.textContent = (it.schema && it.schema.label) || it.name;
    tplSel.appendChild(o);
  });
  tplSel.value = schemas[tpl] ? tpl : "title_card";
  tplSel.addEventListener("change", () => {
    slide.template = tplSel.value;
    setDirty(true);
    renderSlidesList();
    renderInspector();
    reloadStage(true);
  });
  tplGroup.appendChild(tplSel);
  secMeta.appendChild(tplGroup);

  const tip = document.createElement("div");
  tip.className = "rich-syntax-tip";
  tip.innerHTML = `فرمت کلمات زنده: <code>*رنگ تاکیدی*</code> · <code>==هایلایت زرد==</code> · <code>__زیرخط انیمیشنی__</code>`;
  secMeta.appendChild(tip);
  container.appendChild(secMeta);

  // 2. Schema-driven fields
  const secFields = document.createElement("div");
  secFields.className = "inspector-section";
  secFields.innerHTML = `<div class="section-title"><span>محتوای اسلاید</span><span>${schema.label || tpl}</span></div>`;

  const editableFields = [];
  (schema.fields || []).forEach((f) => {
    if (f.editable) editableFields.push(f);
    const group = document.createElement("div");
    group.className = "field-group";

    const labelRow = document.createElement("div");
    labelRow.className = "field-label-row";
    labelRow.innerHTML = `<strong>${f.label || f.key}</strong>` + (f.editable ? '<span class="editable-tag">قابل تنظیم روی بوم</span>' : "");
    group.appendChild(labelRow);

    if (f.type === "textarea") {
      const ta = document.createElement("textarea");
      ta.className = "textarea-input";
      ta.value = slide[f.key] ?? "";
      ta.addEventListener("input", () => {
        slide[f.key] = ta.value;
        setDirty(true);
        renderSlidesList();
        scheduleReload(false);
      });
      group.appendChild(ta);
    } else if (f.type === "list") {
      const ta = document.createElement("textarea");
      ta.className = "textarea-input";
      ta.value = Array.isArray(slide[f.key]) ? slide[f.key].join("\n") : (slide[f.key] || "");
      ta.addEventListener("input", () => {
        slide[f.key] = ta.value.split("\n").map((x) => x.trim()).filter(Boolean);
        setDirty(true);
        scheduleReload(false);
      });
      group.appendChild(ta);
    } else if (f.type === "select") {
      const sel = document.createElement("select");
      sel.className = "select-ctrl";
      (f.options || []).forEach((optItem) => {
        const val = Array.isArray(optItem) ? optItem[0] : optItem;
        const lbl = Array.isArray(optItem) ? optItem[1] : optItem;
        const opt = document.createElement("option");
        opt.value = val === "auto" ? "" : val;
        if (val === "auto") opt.textContent = "ارث‌بری / خودکار";
        else if (val === "random") opt.textContent = "🎲 تصادفی (با بذر قطعی)";
        else opt.textContent = (FX_CAT.presetLabels && FX_CAT.presetLabels[val]) || lbl || val;
        sel.appendChild(opt);
      });
      sel.value = slide[f.key] || "";
      sel.addEventListener("change", () => {
        if (!sel.value) delete slide[f.key];
        else slide[f.key] = sel.value;
        setDirty(true);
        reloadStage(true);
      });
      group.appendChild(sel);
    } else if (f.type === "table" || f.type === "series") {
      if (f.type === "series") {
        const ta = document.createElement("textarea");
        ta.className = "textarea-input";
        ta.value = Array.isArray(slide[f.key]) ? JSON.stringify(slide[f.key], null, 2) : String(slide[f.key] ?? "");
        ta.addEventListener("input", () => {
          slide[f.key] = ta.value;
          setDirty(true);
          scheduleReload(false);
        });
        group.appendChild(ta);
      } else {
        const rows = Array.isArray(slide[f.key]) ? slide[f.key] : [];
        const cols = f.columns || [];
        const tableBox = document.createElement("div");
        const renderRows = () => {
          tableBox.innerHTML = "";
          rows.forEach((rowObj, rIdx) => {
            const rowBox = document.createElement("div");
            Object.assign(rowBox.style, { display: "flex", gap: "6px", alignItems: "center", marginBottom: "8px" });
            cols.forEach(([cKey, cLbl]) => {
              const inp = document.createElement("input");
              inp.type = "text";
              inp.className = "text-input";
              inp.placeholder = cLbl;
              inp.value = (rowObj && rowObj[cKey]) ?? "";
              inp.style.flex = "1";
              inp.addEventListener("input", () => {
                if (!rows[rIdx] || typeof rows[rIdx] !== "object") rows[rIdx] = {};
                rows[rIdx][cKey] = inp.value;
                slide[f.key] = rows;
                setDirty(true);
                scheduleReload(false);
              });
              rowBox.appendChild(inp);
            });
            const delBtn = document.createElement("button");
            delBtn.type = "button";
            delBtn.className = "icon-btn danger";
            delBtn.textContent = "✕";
            delBtn.addEventListener("click", () => {
              rows.splice(rIdx, 1);
              slide[f.key] = rows;
              setDirty(true);
              renderRows();
              reloadStage(true);
            });
            rowBox.appendChild(delBtn);
            tableBox.appendChild(rowBox);
          });
          const addBtn = document.createElement("button");
          addBtn.type = "button";
          addBtn.className = "btn btn-sm btn-ghost";
          addBtn.textContent = "+ افزودن سطر";
          addBtn.addEventListener("click", () => {
            const newRow = {};
            cols.forEach(([cKey]) => { newRow[cKey] = ""; });
            rows.push(newRow);
            slide[f.key] = rows;
            setDirty(true);
            renderRows();
            reloadStage(true);
          });
          tableBox.appendChild(addBtn);
        };
        renderRows();
        group.appendChild(tableBox);
      }
    } else if (f.type === "boolean") {
      const chk = document.createElement("label");
      chk.className = "toggle-chip";
      const inp = document.createElement("input");
      inp.type = "checkbox";
      inp.checked = slide[f.key] !== false;
      inp.addEventListener("change", () => {
        slide[f.key] = inp.checked;
        setDirty(true);
        scheduleReload(false);
      });
      chk.append(inp, document.createTextNode(f.label || f.key));
      group.appendChild(chk);
    } else if (f.type === "image") {
      const imgSel = document.createElement("select");
      imgSel.className = "select-ctrl";
      const noneOpt = document.createElement("option");
      noneOpt.value = "";
      noneOpt.textContent = "— بدون تصویر —";
      imgSel.appendChild(noneOpt);

      if (state.images.length) {
        const projGrp = document.createElement("optgroup");
        projGrp.label = "تصاویر آپلودشده در پروژه";
        state.images.forEach((imgName) => {
          const o = document.createElement("option");
          o.value = imgName;
          o.textContent = imgName;
          projGrp.appendChild(o);
        });
        imgSel.appendChild(projGrp);
      }

      if (state.starterAssets.length) {
        const libGrp = document.createElement("optgroup");
        libGrp.label = "بانک تصاویر آماده (نقشه، مقاله، آزمایشگاه، استودیو)";
        state.starterAssets.forEach((asset) => {
          const o = document.createElement("option");
          o.value = asset.url;
          o.textContent = `${asset.category}: ${asset.label}`;
          libGrp.appendChild(o);
        });
        imgSel.appendChild(libGrp);
      }

      const rawImg = String(slide[f.key] || "");
      const curImg = rawImg.replace(/^img\//, "");
      const inProj = state.images.includes(curImg);
      const inStarter = state.starterAssets.some((a) => a.url === rawImg);
      if (rawImg && !inProj && !inStarter) {
        const custom = document.createElement("option");
        custom.value = rawImg;
        custom.textContent = rawImg;
        imgSel.appendChild(custom);
      }
      imgSel.value = inProj ? curImg : rawImg;

      const thumbButtons = [];
      const syncActiveThumb = (val) => {
        thumbButtons.forEach(({ btn, url }) => {
          btn.classList.toggle("active", Boolean(val) && (val === url || resolveImageUrl(val) === url));
        });
      };

      imgSel.addEventListener("change", () => {
        if (!imgSel.value) delete slide[f.key];
        else slide[f.key] = imgSel.value;
        syncActiveThumb(slide[f.key] || "");
        setDirty(true);
        scheduleReload(false);
      });
      group.appendChild(imgSel);

      if (state.starterAssets.length) {
        const pickerBox = document.createElement("div");
        pickerBox.className = "asset-picker-box";
        const pickerHead = document.createElement("div");
        pickerHead.className = "asset-picker-head";
        pickerHead.innerHTML = `<span>انتخاب سریع از بانک تصاویر آماده:</span>`;
        if (slide[f.key]) {
          const clrBtn = document.createElement("button");
          clrBtn.type = "button";
          clrBtn.className = "icon-btn";
          clrBtn.textContent = "حذف تصویر";
          clrBtn.addEventListener("click", () => {
            delete slide[f.key];
            imgSel.value = "";
            syncActiveThumb("");
            setDirty(true);
            reloadStage(false);
          });
          pickerHead.appendChild(clrBtn);
        }
        pickerBox.appendChild(pickerHead);

        const grid = document.createElement("div");
        grid.className = "asset-thumb-grid";
        state.starterAssets.forEach((asset) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "asset-thumb-btn" + (slide[f.key] === asset.url ? " active" : "");
          btn.title = `${asset.label} (${asset.category})`;
          btn.innerHTML = `<img src="${asset.url}" alt="${asset.label}" decoding="async"><span>${asset.label}</span>`;
          btn.addEventListener("click", () => {
            slide[f.key] = asset.url;
            imgSel.value = asset.url;
            syncActiveThumb(asset.url);
            setDirty(true);
            reloadStage(false);
            setStatus(`تصویر «${asset.label}» روی اسلاید قرار گرفت ✓`);
          });
          thumbButtons.push({ btn, url: asset.url });
          grid.appendChild(btn);
        });
        pickerBox.appendChild(grid);
        group.appendChild(pickerBox);
      }

      const upRow = document.createElement("div");
      upRow.className = "upload-row";
      const fileInp = document.createElement("input");
      fileInp.type = "file";
      fileInp.accept = "image/*";
      fileInp.style.fontSize = "11px";
      fileInp.addEventListener("change", async () => {
        const file = fileInp.files && fileInp.files[0];
        if (!file || !state.projectName) return;
        setStatus("در حال آپلود تصویر...");
        try {
          const resp = await fetch(`/api/projects/${encodeURIComponent(state.projectName)}/images?filename=${encodeURIComponent(file.name)}`, {
            method: "POST",
            body: file,
          });
          const res = await resp.json();
          if (!resp.ok) throw new Error(res.error || "خطا در آپلود");
          if (!state.images.includes(res.filename)) state.images.push(res.filename);
          slide[f.key] = res.filename;
          setDirty(true);
          renderInspector();
          reloadStage(false);
          setStatus("تصویر آپلود شد");
        } catch (err) {
          setStatus("خطا در آپلود تصویر: " + err.message);
        }
      });
      upRow.appendChild(fileInp);
      group.appendChild(upRow);
    } else if (f.type === "number") {
      const inp = document.createElement("input");
      inp.type = "number";
      inp.className = "text-input";
      inp.dir = "ltr";
      inp.step = (f.key === "zoom_scale" || f.key === "scale") ? "0.05" : "1";
      inp.value = slide[f.key] ?? f.default ?? "";
      inp.addEventListener("change", () => {
        if (inp.value === "" && f.default === undefined) {
          delete slide[f.key];
        } else {
          slide[f.key] = Number(inp.value) || 0;
        }
        setDirty(true);
        reloadStage(true);
      });
      group.appendChild(inp);

      if (tpl === "article_zoom" && f.key === "zoom_y") {
        const pickZoomBtn = document.createElement("button");
        pickZoomBtn.type = "button";
        pickZoomBtn.className = "btn btn-sm btn-amber";
        pickZoomBtn.textContent = "🎯 انتخاب نقطهٔ زوم روی بوم (برای حالت تصویر)";
        pickZoomBtn.addEventListener("click", () => {
          startPickTarget((px, py) => {
            const dims = FORMAT_DIMS[activeFormat()] || FORMAT_DIMS["16:9"];
            slide.zoom_mode = "image";
            slide.zoom_x = Math.max(8, Math.min(92, Math.round((px / dims.w) * 100)));
            slide.zoom_y = Math.max(8, Math.min(92, Math.round((py / dims.h) * 100)));
            renderInspector();
            reloadStage(true);
            setStatus(`نقطهٔ زوم تصویر روی (${fa(slide.zoom_x)}٪، ${fa(slide.zoom_y)}٪) تنظیم شد ✓`);
          });
        });
        group.appendChild(pickZoomBtn);
      }
    } else {
      const inp = document.createElement("input");
      inp.type = "text";
      inp.className = "text-input";
      inp.value = slide[f.key] ?? "";
      inp.addEventListener("input", () => {
        slide[f.key] = inp.value;
        setDirty(true);
        renderSlidesList();
        scheduleReload(false);
      });
      group.appendChild(inp);
    }

    secFields.appendChild(group);
  });
  container.appendChild(secFields);

  // 3. Narration (`say`), Transition & Logo
  const secNar = document.createElement("div");
  secNar.className = "inspector-section";
  secNar.innerHTML = `<div class="section-title"><span>گفتار، ترنزیشن و لوگو</span></div>`;

  const sayGroup = document.createElement("div");
  sayGroup.className = "field-group";
  sayGroup.innerHTML = `<div class="field-label-row"><strong>متن گفتار (say)</strong></div>`;
  const sayTa = document.createElement("textarea");
  sayTa.className = "textarea-input";
  sayTa.placeholder = "متنی که روی تله‌پرامپتر می‌خوانید...";
  sayTa.value = slide.say || "";
  sayTa.addEventListener("input", () => {
    slide.say = sayTa.value;
    setDirty(true);
    scheduleReload(false);
  });
  sayGroup.appendChild(sayTa);
  secNar.appendChild(sayGroup);

  // Beginner one-click Motion Personality (5 presets, A1)
  const mpGroup = document.createElement("div");
  mpGroup.className = "field-group";
  mpGroup.innerHTML = `<div class="field-label-row"><strong>شخصیت حرکتی (Motion Personality)</strong></div>`;
  const mpSel = document.createElement("select");
  mpSel.className = "select-ctrl";
  const mpMap = FX_CAT.motionPersonalities || {};
  [
    { value: "", label: "ارث‌بری از پروژه (پیش‌فرض تحریریه)" },
    ...Object.keys(mpMap).map((k) => ({ value: k, label: mpMap[k].label || k })),
  ].forEach((opt) => {
    const o = document.createElement("option");
    o.value = opt.value;
    o.textContent = opt.label;
    mpSel.appendChild(o);
  });
  mpSel.value = slide.motionPersonality || slide.motion_personality || "";
  mpSel.addEventListener("change", () => {
    delete slide.motion_personality;
    if (!mpSel.value) delete slide.motionPersonality;
    else slide.motionPersonality = mpSel.value;
    setDirty(true);
    reloadStage(true);
  });
  mpGroup.appendChild(mpSel);
  secNar.appendChild(mpGroup);

  // Beginner one-click Text Animation Suite (14 RTL-safe presets, A2)
  const tmGroup = document.createElement("div");
  tmGroup.className = "field-group";
  tmGroup.innerHTML = `<div class="field-label-row"><strong>انیمیشن متن (Text Animation)</strong></div>`;
  const tmSel = document.createElement("select");
  tmSel.className = "select-ctrl";
  const tmMap = FX_CAT.textAnimations || {};
  [
    { value: "", label: "خودکار بر اساس قالب (Auto)" },
    ...Object.keys(tmMap).map((k) => ({ value: k, label: tmMap[k].label || k })),
  ].forEach((opt) => {
    const o = document.createElement("option");
    o.value = opt.value;
    o.textContent = opt.label;
    tmSel.appendChild(o);
  });
  tmSel.value = slide.textMotion || slide.text_motion || "";
  tmSel.addEventListener("change", () => {
    delete slide.text_motion;
    if (!tmSel.value) delete slide.textMotion;
    else slide.textMotion = tmSel.value;
    setDirty(true);
    reloadStage(true);
  });
  tmGroup.appendChild(tmSel);
  secNar.appendChild(tmGroup);

  // Transition Library 2.0 (32 categorized broadcast transitions, A4)
  const trGroup = document.createElement("div");
  trGroup.className = "field-group";
  trGroup.innerHTML = `<div class="field-label-row"><strong>ترنزیشن ورود اسلاید (Transition · 32)</strong></div>`;
  const trSel = document.createElement("select");
  trSel.className = "select-ctrl";
  [
    { value: "", label: "ارث‌بری از سبک پروژه (Inherit)" },
    { value: "random", label: "🎲 تصادفی (با بذر قطعی)" },
  ].forEach((tr) => {
    const o = document.createElement("option");
    o.value = tr.value;
    o.textContent = tr.label;
    trSel.appendChild(o);
  });
  const trLib = FX_CAT.transitionLibrary || {};
  const trCats = FX_CAT.transitionCategories || {};
  const catOrder = Object.keys(trCats);
  if (catOrder.length && Object.keys(trLib).length) {
    catOrder.forEach((ck) => {
      const members = (FX_CAT.transitions || []).filter((k) => trLib[k] && trLib[k].cat === ck);
      if (!members.length) return;
      const og = document.createElement("optgroup");
      og.label = `${trCats[ck].label} (${trCats[ck].labelEn})`;
      members.forEach((v) => {
        const o = document.createElement("option");
        o.value = v;
        o.textContent = FX_CAT.transitionLabels[v] || v;
        og.appendChild(o);
      });
      trSel.appendChild(og);
    });
  } else {
    (FX_CAT.transitions || []).forEach((v) => {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = FX_CAT.transitionLabels[v] || v;
      trSel.appendChild(o);
    });
  }
  trSel.value = slide.transition || "";
  trSel.addEventListener("change", () => {
    if (!trSel.value) delete slide.transition;
    else slide.transition = trSel.value;
    setDirty(true);
    reloadStage(true);
  });
  trGroup.appendChild(trSel);

  // Collapsible Advanced Transition Timing (duration, delay, ease, intensity)
  const trAdv = document.createElement("details");
  trAdv.className = "advanced-block";
  trAdv.style.marginTop = "8px";
  const trAdvSum = document.createElement("summary");
  trAdvSum.textContent = "پیشرفته: زمان‌بندی ترنزیشن (Advanced Timing)";
  trAdvSum.style.cursor = "pointer";
  trAdvSum.style.fontSize = "12px";
  trAdvSum.style.opacity = "0.85";
  trAdv.appendChild(trAdvSum);

  const curTT = slide.transitionTiming || slide.transition_timing || {};
  const ensureTT = () => {
    if (!slide.transitionTiming || typeof slide.transitionTiming !== "object") {
      slide.transitionTiming = Object.assign({}, slide.transition_timing || {});
      delete slide.transition_timing;
    }
    return slide.transitionTiming;
  };
  const ttGrid = document.createElement("div");
  ttGrid.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;";

  const mkNumCtrl = (labelFa, key, placeholder, min, max, step) => {
    const wrap = document.createElement("label");
    wrap.style.cssText = "display:flex;flex-direction:column;gap:4px;font-size:11px;";
    const sp = document.createElement("span");
    sp.textContent = labelFa;
    const inp = document.createElement("input");
    inp.type = "number";
    inp.className = "text-input";
    inp.min = String(min);
    inp.max = String(max);
    inp.step = String(step);
    inp.placeholder = placeholder;
    if (curTT[key] != null) inp.value = String(curTT[key]);
    inp.addEventListener("change", () => {
      const tt = ensureTT();
      if (inp.value === "") delete tt[key];
      else tt[key] = Number(inp.value);
      if (!Object.keys(tt).length) delete slide.transitionTiming;
      setDirty(true);
      reloadStage(true);
    });
    wrap.append(sp, inp);
    return wrap;
  };

  ttGrid.appendChild(mkNumCtrl("مدت (Duration s)", "duration", "0.52", 0.14, 1.8, 0.04));
  ttGrid.appendChild(mkNumCtrl("تأخیر (Delay s)", "delay", "0.0", 0, 1.0, 0.05));
  ttGrid.appendChild(mkNumCtrl("شدت (Intensity)", "intensity", "1.0", 0.25, 1.6, 0.1));

  const easeWrap = document.createElement("label");
  easeWrap.style.cssText = "display:flex;flex-direction:column;gap:4px;font-size:11px;";
  const easeLbl = document.createElement("span");
  easeLbl.textContent = "منحنی شتاب (Ease)";
  const easeSel = document.createElement("select");
  easeSel.className = "select-ctrl";
  [
    { value: "", label: "پیش‌فرض (Auto)" },
    ...(FX_CAT.easingFamilies || ["vox", "fluid", "snappy", "silk", "sharp", "cinematic", "spring"]).map((k) => ({ value: k, label: k })),
  ].forEach((opt) => {
    const o = document.createElement("option");
    o.value = opt.value;
    o.textContent = opt.label;
    easeSel.appendChild(o);
  });
  easeSel.value = curTT.ease || "";
  easeSel.addEventListener("change", () => {
    const tt = ensureTT();
    if (!easeSel.value) delete tt.ease;
    else tt.ease = easeSel.value;
    if (!Object.keys(tt).length) delete slide.transitionTiming;
    setDirty(true);
    reloadStage(true);
  });
  easeWrap.append(easeLbl, easeSel);
  ttGrid.appendChild(easeWrap);

  trAdv.appendChild(ttGrid);
  trGroup.appendChild(trAdv);
  secNar.appendChild(trGroup);

  // Beginner one-click Virtual Camera (8 presets, A5) + Collapsible Advanced
  const camGroup = document.createElement("div");
  camGroup.className = "field-group";
  camGroup.innerHTML = `<div class="field-label-row"><strong>دوربین مجازی (Virtual Camera · A5)</strong></div>`;
  const camSel = document.createElement("select");
  camSel.className = "select-ctrl";
  const camMap = FX_CAT.cameraPresets || {};
  const curCamObj = (slide.camera && typeof slide.camera === "object") ? slide.camera : null;
  const curCamPreset = typeof slide.camera === "string" ? slide.camera : (curCamObj ? (curCamObj.preset || "none") : "");
  [
    { value: "", label: "ارث‌بری / ثابت (Inherit · Static)" },
    ...Object.keys(camMap).map((k) => ({ value: k, label: camMap[k].label || k })),
  ].forEach((opt) => {
    const o = document.createElement("option");
    o.value = opt.value;
    o.textContent = opt.label;
    camSel.appendChild(o);
  });
  camSel.value = curCamPreset;
  camSel.addEventListener("change", () => {
    if (!camSel.value || camSel.value === "none") delete slide.camera;
    else if (curCamObj) slide.camera = Object.assign({}, curCamObj, { preset: camSel.value });
    else slide.camera = camSel.value;
    setDirty(true);
    reloadStage(true);
  });
  camGroup.appendChild(camSel);

  const camAdv = document.createElement("details");
  camAdv.className = "advanced-block";
  camAdv.style.marginTop = "6px";
  const camAdvSum = document.createElement("summary");
  camAdvSum.textContent = "پیشرفته: شدت، پارالاکس و فوکوس دوربین (Advanced Camera)";
  camAdvSum.style.cssText = "cursor:pointer;font-size:12px;opacity:0.85;";
  camAdv.appendChild(camAdvSum);
  const camGrid = document.createElement("div");
  camGrid.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;";
  const ensureCamObj = () => {
    if (!slide.camera || typeof slide.camera !== "object") {
      slide.camera = { preset: typeof slide.camera === "string" ? slide.camera : "gentle-dolly-in" };
    }
    return slide.camera;
  };
  const mkCamNum = (lbl, key, ph, min, max, step) => {
    const w = document.createElement("label");
    w.style.cssText = "display:flex;flex-direction:column;gap:4px;font-size:11px;";
    const sp = document.createElement("span");
    sp.textContent = lbl;
    const inp = document.createElement("input");
    inp.type = "number";
    inp.className = "text-input";
    inp.min = String(min); inp.max = String(max); inp.step = String(step); inp.placeholder = ph;
    if (curCamObj && curCamObj[key] != null) inp.value = String(curCamObj[key]);
    inp.addEventListener("change", () => {
      const c = ensureCamObj();
      if (inp.value === "") delete c[key];
      else c[key] = Number(inp.value);
      setDirty(true);
      reloadStage(true);
    });
    w.append(sp, inp);
    return w;
  };
  camGrid.appendChild(mkCamNum("شدت (Intensity)", "intensity", "1.0", 0.2, 1.5, 0.1));
  camGrid.appendChild(mkCamNum("پارالاکس (Parallax px)", "parallax", "14", 0, 42, 2));
  camGrid.appendChild(mkCamNum("فوکوس (Focus Blur)", "focusBlur", "0", 0, 12, 0.5));
  camGrid.appendChild(mkCamNum("لرزش ظریف (Shake)", "shakeAmp", "0", 0, 10, 0.5));
  camAdv.appendChild(camGrid);
  camGroup.appendChild(camAdv);
  secNar.appendChild(camGroup);

  // Beginner one-click Particles & Weather Ambience (8 presets, A6) + Collapsible Advanced
  const ambGroup = document.createElement("div");
  ambGroup.className = "field-group";
  ambGroup.innerHTML = `<div class="field-label-row"><strong>ذرات و اتمسفر قطعی (Particles & Weather · A6)</strong></div>`;
  const ambSel = document.createElement("select");
  ambSel.className = "select-ctrl";
  const ambMap = FX_CAT.ambiencePresets || {};
  const curAmbObj = (slide.ambience && typeof slide.ambience === "object") ? slide.ambience : null;
  const curAmbPreset = typeof slide.ambience === "string" ? slide.ambience : (curAmbObj ? (curAmbObj.preset || "none") : "");
  [
    { value: "", label: "ارث‌بری / خاموش (Inherit · Off)" },
    ...Object.keys(ambMap).map((k) => ({ value: k, label: ambMap[k].label || k })),
  ].forEach((opt) => {
    const o = document.createElement("option");
    o.value = opt.value;
    o.textContent = opt.label;
    ambSel.appendChild(o);
  });
  ambSel.value = curAmbPreset;
  ambSel.addEventListener("change", () => {
    if (!ambSel.value || ambSel.value === "none") delete slide.ambience;
    else if (curAmbObj) slide.ambience = Object.assign({}, curAmbObj, { preset: ambSel.value });
    else slide.ambience = ambSel.value;
    setDirty(true);
    reloadStage(true);
  });
  ambGroup.appendChild(ambSel);

  const ambAdv = document.createElement("details");
  ambAdv.className = "advanced-block";
  ambAdv.style.marginTop = "6px";
  const ambAdvSum = document.createElement("summary");
  ambAdvSum.textContent = "پیشرفته: تراکم، سرعت و شفافیت ذرات (Advanced Particles)";
  ambAdvSum.style.cssText = "cursor:pointer;font-size:12px;opacity:0.85;";
  ambAdv.appendChild(ambAdvSum);
  const ambGrid = document.createElement("div");
  ambGrid.style.cssText = "display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:8px;";
  const ensureAmbObj = () => {
    if (!slide.ambience || typeof slide.ambience !== "object") {
      slide.ambience = { preset: typeof slide.ambience === "string" ? slide.ambience : "studio-dust" };
    }
    return slide.ambience;
  };
  const mkAmbNum = (lbl, key, ph, min, max, step) => {
    const w = document.createElement("label");
    w.style.cssText = "display:flex;flex-direction:column;gap:4px;font-size:11px;";
    const sp = document.createElement("span");
    sp.textContent = lbl;
    const inp = document.createElement("input");
    inp.type = "number";
    inp.className = "text-input";
    inp.min = String(min); inp.max = String(max); inp.step = String(step); inp.placeholder = ph;
    if (curAmbObj && curAmbObj[key] != null) inp.value = String(curAmbObj[key]);
    inp.addEventListener("change", () => {
      const a = ensureAmbObj();
      if (inp.value === "") delete a[key];
      else a[key] = Number(inp.value);
      setDirty(true);
      reloadStage(true);
    });
    w.append(sp, inp);
    return w;
  };
  ambGrid.appendChild(mkAmbNum("تراکم (Density)", "density", "1.0", 0.35, 1.8, 0.1));
  ambGrid.appendChild(mkAmbNum("سرعت (Speed)", "speed", "1.0", 0.2, 2.5, 0.1));
  ambGrid.appendChild(mkAmbNum("شفافیت (Opacity)", "opacity", "0.45", 0.05, 1.0, 0.05));
  ambAdv.appendChild(ambGrid);
  ambGroup.appendChild(ambAdv);
  secNar.appendChild(ambGroup);

  const lmGroup = document.createElement("div");
  lmGroup.className = "field-group";
  lmGroup.innerHTML = `<div class="field-label-row"><strong>حالت انیمیشن لوگو در این اسلاید</strong></div>`;
  const lmSel = document.createElement("select");
  lmSel.className = "select-ctrl";
  [
    { value: "", label: "ارث‌بری از سبک پروژه" },
    { value: "random", label: "🎲 تصادفی (با بذر قطعی)" },
    { value: "__off__", label: "مخفی در این اسلاید" },
    ...(FX_CAT.logoMotions || []).map((v) => ({ value: v, label: FX_CAT.logoMotionLabels[v] || v })),
  ].forEach((lm) => {
    const o = document.createElement("option");
    o.value = lm.value;
    o.textContent = lm.label;
    lmSel.appendChild(o);
  });
  lmSel.value = slide.logo === false ? "__off__" : (slide.logo_motion || "");
  lmSel.addEventListener("change", () => {
    if (lmSel.value === "__off__") {
      slide.logo = false;
      delete slide.logo_motion;
    } else {
      if (slide.logo === false) delete slide.logo;
      if (!lmSel.value) delete slide.logo_motion;
      else slide.logo_motion = lmSel.value;
    }
    setDirty(true);
    reloadStage(true);
  });
  lmGroup.appendChild(lmSel);
  secNar.appendChild(lmGroup);
  container.appendChild(secNar);

  // 3b. Mascot Character & Offline Audio Lip-Sync Controls
  const audInfo = state.slideAudioMap.get(slide) || null;
  renderMascotControls({
    container,
    slide,
    audioState: audInfo,
    setStatus,
    onDirtyReload: (reRenderInsp, autoPlay) => {
      setDirty(true);
      if (reRenderInsp) renderInspector();
      reloadStage(autoPlay);
    },
    onToneChange: (toneCfg, markDirty) => {
      if (markDirty) setDirty(true, false);
      if (els.stageFrame && els.stageFrame.contentWindow) {
        els.stageFrame.contentWindow.postMessage({ cmd: "mascotTone", tone: toneCfg }, "*");
      }
    },
    onLoadAudioFile: async (file) => {
      setStatus(`در حال تحلیل صدای «${file.name}» برای لیپ‌سینک و لحن صدا...`);
      try {
        const { visemes, prosody } = await analyzeAudioWithProsodyOffline(file, 30);
        const url = URL.createObjectURL(file);
        state.slideAudioMap.set(slide, { url, fileName: file.name, track: visemes, prosody });
        slide.audio = file.name;
        setDirty(true);
        renderInspector();
        reloadStage(true);
        setStatus(`صدا، ${visemes.frames.length} فریم لیپ‌سینک و پروزودی (F0≈${Math.round(prosody.median_f0_hz || 0)}Hz) آماده شد ✓`);
      } catch (err) {
        setStatus("خطا در تحلیل فایل صوتی: " + err.message);
      }
    },
    onClearAudio: () => {
      const prev = state.slideAudioMap.get(slide);
      if (prev && prev.url) {
        try { URL.revokeObjectURL(prev.url); } catch (_) {}
      }
      state.slideAudioMap.delete(slide);
      if (state.previewAudio) {
        try { state.previewAudio.pause(); state.previewAudio.removeAttribute("src"); } catch (_) {}
      }
      delete slide.visemeTrack;
      delete slide.prosodyTrack;
      if (slide.mascot && typeof slide.mascot === "object") {
        delete slide.mascot.visemeTrack;
        delete slide.mascot.prosodyTrack;
      }
      setDirty(true);
      renderInspector();
      reloadStage(true);
      setStatus("فایل صدای پیش‌نمایش حذف شد");
    },
  });

  // 4. Position/Scale Overrides
  const ovFields = [...editableFields];
  if (tpl === "mascot_talk" || (slide.mascot && slide.mascot.enabled !== false)) {
    ovFields.push({ key: "mascot", label: "شخصیت عقاب (Mascot)" });
  }
  const hasLogo = (slide.logo && slide.logo !== false) || slide.logo_text || (state.data && (state.data.logo || state.data.logo_text));
  if (hasLogo && slide.logo !== false) ovFields.push({ key: "logo", label: "لوگو" });

  if (ovFields.length) {
    const secOv = document.createElement("div");
    secOv.className = "inspector-section";
    secOv.innerHTML = `<div class="section-title"><span>تنظیم موقعیت و اندازه (Overrides)</span></div>`;

    ovFields.forEach((f) => {
      const cur = readOverride(slide, f.key);
      const card = document.createElement("div");
      card.className = "override-card";
      const head = document.createElement("div");
      head.className = "override-head";
      head.innerHTML = `<span>${f.label || f.key}</span>`;
      const resetBtn = document.createElement("button");
      resetBtn.type = "button";
      resetBtn.className = "icon-btn";
      resetBtn.textContent = "بازنشانی";
      resetBtn.addEventListener("click", () => {
        writeOverride(slide, f.key, { x: 0, y: 0, scale: 1 });
        setDirty(true);
        renderInspector();
        scheduleReload(false);
      });
      head.appendChild(resetBtn);
      card.appendChild(head);

      const grid = document.createElement("div");
      grid.className = "override-grid";
      const mkNum = (lbl, prop, step, min, max) => {
        const wrap = document.createElement("label");
        wrap.textContent = lbl;
        const inp = document.createElement("input");
        inp.type = "number";
        inp.dir = "ltr";
        inp.step = String(step);
        inp.min = String(min);
        inp.max = String(max);
        inp.value = String(cur[prop]);
        inp.addEventListener("input", () => {
          const next = readOverride(slide, f.key);
          next[prop] = Number(inp.value) || (prop === "scale" ? 1 : 0);
          writeOverride(slide, f.key, next);
          setDirty(true);
          scheduleReload(false);
        });
        wrap.appendChild(inp);
        return wrap;
      };
      grid.append(mkNum("افقی (X)", "x", 10, -800, 800), mkNum("عمودی (Y)", "y", 10, -500, 500), mkNum("مقیاس", "scale", 0.05, 0.4, 2.2));
      card.appendChild(grid);
      secOv.appendChild(card);
    });
    container.appendChild(secOv);
  }
}

function renderInspector() {
  const slide = activeSlide();
  document.querySelectorAll(".insp-tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.tab === state.activeTab);
  });

  if (!slide) {
    els.activeSlideBadge.textContent = "—";
    els.inspectorBody.innerHTML = '<div class="empty-state">اسلایدی برای ویرایش وجود ندارد.</div>';
    return;
  }

  els.activeSlideBadge.textContent = `اسلاید ${fa(state.activeIndex + 1)}`;
  els.inspectorBody.innerHTML = "";

  if (state.activeTab === "curves") {
    renderCurvesTab({
      container: els.inspectorBody,
      slide,
      projectData: state.data,
      onChange: handleSubModuleChange,
      onApplyProjectCurve: (mc) => {
        if (!state.data) return;
        state.data.motionCurve = mc;
        (state.data.slides || []).forEach((s) => { delete s.motionCurve; });
        setDirty(true);
        reloadStage(true);
        setStatus("منحنی نرمی حرکت روی تمام اسلایدها اعمال شد ✓");
      },
    });
  } else if (state.activeTab === "callouts") {
    renderAnnotationsTab({
      container: els.inspectorBody,
      slide,
      onChange: handleSubModuleChange,
      startPickTarget,
    });
  } else if (state.activeTab === "puppet") {
    renderPuppetInspector({
      container: els.inspectorBody,
      slide,
      projectData: state.data,
      duration: state.duration,
      currentTime: state.currentTime,
      onPuppetChange: (nextPuppet, markDirty) => {
        if (markDirty) setDirty(true);
        if (els.stageFrame.contentWindow) {
          els.stageFrame.contentWindow.postMessage({ cmd: "puppetConfig", puppet: nextPuppet }, "*");
        }
      },
      onDirtyReload: (rerenderInsp, autoPlay) => {
        setDirty(true);
        if (rerenderInsp) renderInspector();
        reloadStage(Boolean(autoPlay), autoPlay ? 0 : state.currentTime);
      },
      onApplyProjectDefault: (puppetCfg) => {
        if (!state.data) return;
        state.data.puppet = puppetCfg;
        (state.data.slides || []).forEach((s) => { delete s.puppet; });
        setDirty(true);
        reloadStage(false, state.currentTime);
        setStatus("تنظیمات عروسک روی کل پروژه اعمال شد ✓");
      },
      setStatus,
    });
  } else if (state.activeTab === "living") {
    renderLivingAndAudioTab(els.inspectorBody, slide);
  } else {
    renderContentTab(els.inspectorBody, slide);
  }
}

/* ---------------------------------------------------------------- Gallery & Script Importer Modals */
function renderGalleryModal() {
  const items = window.TEMPLATE_INDEX || [];
  const cats = ["همه", ...new Set(items.map((it) => (it.schema && it.schema.category) || "عمومی"))];
  els.galleryCats.innerHTML = "";
  cats.forEach((cat) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "pill-tab" + (state.galleryCategory === cat ? " active" : "");
    b.textContent = cat;
    b.addEventListener("click", () => {
      state.galleryCategory = cat;
      renderGalleryModal();
    });
    els.galleryCats.appendChild(b);
  });

  const q = (els.gallerySearch.value || "").trim().toLowerCase();
  els.galleryGrid.innerHTML = "";
  items.forEach((it) => {
    const s = it.schema || {};
    const cat = s.category || "عمومی";
    if (state.galleryCategory !== "همه" && cat !== state.galleryCategory) return;
    const hay = `${it.name} ${s.label || ""} ${s.description || ""} ${cat}`.toLowerCase();
    if (q && !hay.includes(q)) return;

    const card = document.createElement("button");
    card.type = "button";
    card.className = "gallery-card";
    card.innerHTML = `
      <div class="gallery-card-head">
        <span class="gallery-cat-badge">${cat}</span>
        <span class="bilingual-sub" dir="ltr">${it.name}</span>
      </div>
      <strong>${s.label || it.name}</strong>
      <p>${s.description || ""}</p>
    `;
    card.addEventListener("click", () => {
      insertTemplateSlide(it.name);
      els.galleryModal.classList.add("hidden");
      setStatus(`قالب «${s.label || it.name}» اضافه شد`);
    });
    els.galleryGrid.appendChild(card);
  });
}

function buildStarterPodcastSlides() {
  return [
    {
      template: "title_card",
      layout: "SLIDE",
      eyebrow: "اپیزود ویژهٔ پادکست",
      title: "چرا بعضی گفتگوها ==میلیونی== دیده می‌شوند؟",
      subtitle: "تحلیل ساختار ریتم، تصویرسازی زنده و نگه‌داشتن توجه مخاطب",
      image: "/assets/podcast-studio-mic.jpg",
      say: "سلام به همهٔ همراهان! در این قسمت قرار است راز ریتم زنده در پادکست‌های ویدیویی را بررسی کنیم.",
    },
    {
      template: "article_zoom",
      layout: "SCAM",
      eyebrow: "اسناد و پژوهش",
      publication: "Journal of Behavioral Economics · 2024",
      article_title: "چرا ==پاداش غیرقابل‌پیش‌بینی== توجه مغز را قفل می‌کند؟",
      author: "تیم پژوهشی دانشگاه زوریخ · صفحهٔ ۱۴",
      article_body: "بررسی ویدیوهای بلند در یوتیوب نشان می‌دهد تغییر ناگهانی صحنه بدون پیوستگی باعث خستگی چشم می‌شود.\nاما پس‌زمینهٔ محو همراه با حرکت نرم و تمرکز ناگهانی روی یک جملهٔ سندی بیشترین درگیری ذهنی را می‌سازد.",
      focus_text: "زوم سینمایی روی جملهٔ کلیدی مقاله و هایلایت ماژیکی، نرخ ماندگاری مخاطب را تا ۲.۴ برابر بالا می‌برد.",
      image: "/assets/archive-newspaper.jpg",
      paper_theme: "warm-paper",
      zoom_scale: 1.38,
      say: "این پژوهش دانشگاه زوریخ دقیقاً روی همین نکته دست می‌گذارد: وقتی سند یا مقاله را جلوی مخاطب زوم و هایلایت می‌کنید، تمرکز او تا دو و نیم برابر بیشتر می‌شود.",
    },
    {
      template: "image_full",
      layout: "SLIDE",
      title: "*پراکندگی جغرافیایی* الگوی تعامل مخاطبان",
      text: "نقاط داغ در اروپا و خاورمیانه بیشترین نرخ اشتراک‌گذاری پادکست‌های تحلیلی را دارند.",
      image: "/assets/world-map-dark.jpg",
      dots: ["28,40", "48,32,danger", "54,36", "61,42,danger", "75,44"],
      say: "روی نقشه می‌بینید که شهرهای اصلی مخاطبان پادکست‌های تحلیلی کجا متمرکز شده‌اند.",
    },
    {
      template: "line_chart",
      layout: "SCAM",
      title: "نرخ ماندگاری مخاطب در طول ۶۰ دقیقه",
      series: "پادکست با استیج زنده: 1;100, 15;89, 30;82, 45;76, 60;72\nپادکست ایستا بدون گرافیک: 1;100, 15;68, 30;51, 45;38, 60;29",
      suffix: "٪",
      chartCurve: { mode: "smooth", tension: 0.55, markers: true },
      vlines: [{ x: 30, label: "نقطهٔ افت تصویر ایستا", color: "danger" }],
      say: "این منحنی به وضوح نشان می‌دهد که استیج زنده تا پایان ساعت اول بیش از دو برابر مخاطب را نگه می‌دارد.",
    },
    {
      template: "podcast_end",
      layout: "SLIDE",
      eyebrow: "ممنون از همراهی شما",
      title: "اگر این گفتگو برایتان جذاب بود، *سابسکرایب* یادتان نرود",
      subtitle: "اپیزود بعدی هر پنج‌شنبه ساعت ۲۰",
      cta: "عضویت در کانال + زنگوله 🔔",
      image: "/assets/podcast-studio-mic.jpg",
      say: "ممنون که تا اینجا کنار ما بودید. نظرتان را در کامنت بنویسید و تا قسمت بعدی خدانگهدار!",
    },
  ];
}

/* ---------------------------------------------------------------- Style & Logo Modal */
function refreshLogoImageOptions() {
  els.projLogoImageSelect.innerHTML = "";
  const none = document.createElement("option");
  none.value = "";
  none.textContent = "— بدون تصویر لوگو —";
  els.projLogoImageSelect.appendChild(none);
  state.images.forEach((imgName) => {
    const o = document.createElement("option");
    o.value = imgName;
    o.textContent = imgName;
    els.projLogoImageSelect.appendChild(o);
  });
  const rawLogo = state.data && state.data.logo;
  const clean = typeof rawLogo === "string" ? rawLogo.replace(/^img\//, "") : "";
  if (clean && !state.images.includes(clean)) {
    const extra = document.createElement("option");
    extra.value = rawLogo;
    extra.textContent = rawLogo;
    els.projLogoImageSelect.appendChild(extra);
  }
  els.projLogoImageSelect.value = state.images.includes(clean) ? clean : (typeof rawLogo === "string" ? rawLogo : "");
}

function openStyleModal() {
  if (!state.data) return;
  refreshLogoImageOptions();
  els.projThemeSelect.value = state.data.theme || "khordegir-dark";
  els.projPresetSelect.value = state.data.preset || "random";
  els.projTransitionSelect.value = state.data.transition || "random";
  els.projLogoMotionSelect.value = state.data.logo_motion || "random";
  els.projLogoPosSelect.value = state.data.logo_position || "top-left";
  els.projSeedInput.value = String(Number(state.data.seed) || 0);
  const ls = state.data.livingStage || {};
  els.projLivingBgSelect.value = ls.bgStyle || "dreamy-bokeh";
  els.projLivingIntensitySelect.value = ls.intensity || "podcast";
  const pod = state.data.podcast || {};
  els.projPodcastHost.value = pod.host || "";
  els.projPodcastShow.value = pod.showTitle || "";
  els.projLogoTextInput.value = state.data.logo_text || "";
  els.styleModal.classList.remove("hidden");
}

function applyStyleModal() {
  if (!state.data) return;
  state.data.theme = els.projThemeSelect.value;
  state.data.preset = els.projPresetSelect.value;
  state.data.transition = els.projTransitionSelect.value;
  state.data.logo_motion = els.projLogoMotionSelect.value;
  state.data.logo_position = els.projLogoPosSelect.value;
  state.data.seed = Number(els.projSeedInput.value) || 0;
  const prevLs = state.data.livingStage || {};
  state.data.livingStage = Object.assign({}, prevLs, {
    bgStyle: els.projLivingBgSelect.value,
    intensity: els.projLivingIntensitySelect.value,
    microMotion: prevLs.microMotion !== false,
  });
  const host = els.projPodcastHost.value.trim();
  const showTitle = els.projPodcastShow.value.trim();
  if (host || showTitle) {
    state.data.podcast = { host, showTitle };
  }

  const imgVal = els.projLogoImageSelect.value;
  if (imgVal) state.data.logo = imgVal;
  else delete state.data.logo;

  const txtVal = els.projLogoTextInput.value.trim();
  if (txtVal) state.data.logo_text = txtVal;
  else delete state.data.logo_text;

  els.themeSelect.value = state.data.theme;
  els.styleModal.classList.add("hidden");
  setDirty(true);
  renderInspector();
  reloadStage(true);
}

function rerollAllRandom() {
  if (!state.data) return;
  state.data.theme = "random";
  state.data.preset = "random";
  state.data.transition = "random";
  state.data.logo_motion = "random";
  state.data.seed = (Number(state.data.seed) || 0) + 1;

  const slide = activeSlide();
  if (slide) {
    delete slide.preset;
    delete slide.transition;
    delete slide.logo_motion;
    slide.seed = (Number(slide.seed) || 0) + 1;
  }
  els.themeSelect.value = "random";
  setDirty(true);
  renderInspector();
  reloadStage(true);
  setStatus(`ترکیب تصادفی جدید با بذر ${fa(state.data.seed)} اعمال شد`);
}

/* ---------------------------------------------------------------- API calls */
async function loadProjectsList(selectName = null) {
  const resp = await fetch("/api/projects");
  const json = await resp.json();
  state.projects = json.projects || [];
  els.projectSelect.innerHTML = "";

  if (!state.projects.length) {
    const o = document.createElement("option");
    o.value = "";
    o.textContent = "پروژه‌ای نیست";
    els.projectSelect.appendChild(o);
    state.projectName = null;
    state.data = null;
    renderInspector();
    return;
  }

  state.projects.forEach((p) => {
    const o = document.createElement("option");
    o.value = p.name;
    o.textContent = p.title && p.title !== p.name ? `${p.title} (${p.name})` : p.name;
    els.projectSelect.appendChild(o);
  });

  const target = selectName && state.projects.some((p) => p.name === selectName)
    ? selectName
    : state.projects[0].name;
  els.projectSelect.value = target;
  await openProject(target);
}

async function openProject(name) {
  if (!name) return;
  stopClock();
  setStatus(`در حال بارگذاری ${name}...`);
  const resp = await fetch(`/api/projects/${encodeURIComponent(name)}`);
  const json = await resp.json();
  if (!resp.ok) {
    setStatus("خطا در خواندن پروژه");
    return;
  }
  state.projectName = name;
  state.data = json.data || { title: name, theme: "khordegir-dark", slides: [] };
  if (!Array.isArray(state.data.slides)) state.data.slides = [];
  state.images = json.images || [];
  state.activeIndex = 0;
  state.currentTime = 0;
  state.undoStack = [];
  state.redoStack = [];
  state.lastSnapshot = JSON.stringify({ data: state.data, activeIndex: 0 });
  updateUndoButtons();

  els.themeSelect.value = state.data.theme || "khordegir-dark";
  els.linkObs.href = `/obs/?project=${encodeURIComponent(name)}`;
  setDirty(false, false);
  renderSlidesList();
  renderInspector();
  reloadStage(true);
  setStatus(`پروژه «${state.data.title || name}» آماده است`);
}

async function saveProject() {
  if (!state.projectName || !state.data) return;
  setStatus("در حال ذخیره...");
  // Keep video.yaml clean by stripping transient runtime-only cached tracks before PUT
  const cleanPayload = JSON.parse(JSON.stringify(state.data));
  (cleanPayload.slides || []).forEach((sl) => {
    if (sl && typeof sl === "object") {
      delete sl.visemeTrack;
      delete sl.prosodyTrack;
      if (sl.mascot && typeof sl.mascot === "object") {
        delete sl.mascot.visemeTrack;
        delete sl.mascot.prosodyTrack;
      }
    }
  });
  const resp = await fetch(`/api/projects/${encodeURIComponent(state.projectName)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(cleanPayload),
  });
  const json = await resp.json();
  if (!resp.ok) {
    setStatus("خطا در ذخیره: " + (json.error || resp.status));
    return;
  }
  setDirty(false, false);
  setStatus("در video.yaml ذخیره شد ✓");
}

async function createNewProject() {
  const raw = els.newProjectName.value.trim();
  els.newProjectErr.classList.add("hidden");
  if (!raw) {
    els.newProjectErr.textContent = "لطفاً یک نام معتبر وارد کنید.";
    els.newProjectErr.classList.remove("hidden");
    return;
  }
  const resp = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: raw }),
  });
  const json = await resp.json();
  if (!resp.ok) {
    els.newProjectErr.textContent = json.error || "خطا در ساخت پروژه";
    els.newProjectErr.classList.remove("hidden");
    return;
  }
  els.newProjectModal.classList.add("hidden");
  els.newProjectName.value = "";
  await loadProjectsList(json.name);
}

/* ---------------------------------------------------------------- event wiring */
els.projectSelect.addEventListener("change", () => openProject(els.projectSelect.value));
els.themeSelect.addEventListener("change", () => {
  if (!state.data) return;
  state.data.theme = els.themeSelect.value;
  setDirty(true);
  reloadStage(true);
});

els.btnUndo.addEventListener("click", undo);
els.btnRedo.addEventListener("click", redo);
els.btnSendLive.addEventListener("click", sendActiveSlideToLiveObs);

els.btnProjectStyle.addEventListener("click", openStyleModal);
els.btnCloseStyleModal.addEventListener("click", () => els.styleModal.classList.add("hidden"));
els.btnApplyStyleModal.addEventListener("click", applyStyleModal);
els.btnStyleModalReroll.addEventListener("click", rerollAllRandom);
els.btnRandomAll.addEventListener("click", rerollAllRandom);

els.btnOpenGallery.addEventListener("click", () => {
  renderGalleryModal();
  els.galleryModal.classList.remove("hidden");
});
els.btnCloseGallery.addEventListener("click", () => els.galleryModal.classList.add("hidden"));
els.gallerySearch.addEventListener("input", renderGalleryModal);

els.btnOpenImporter.addEventListener("click", () => els.importerModal.classList.remove("hidden"));
els.btnCloseImporter.addEventListener("click", () => els.importerModal.classList.add("hidden"));

els.btnStarterPodcastDeck.addEventListener("click", () => {
  if (!state.data) return;
  state.data.slides = buildStarterPodcastSlides();
  state.activeIndex = 0;
  els.importerModal.classList.add("hidden");
  setDirty(true);
  renderSlidesList();
  renderInspector();
  reloadStage(true);
  setStatus("بستهٔ آمادهٔ پادکست یوتیوب ساخته شد ✓");
});

const applyImportedSlides = (replace) => {
  if (!state.data || typeof window.importScript !== "function") return;
  const imported = window.importScript(els.importerText.value || "");
  if (!imported.length) {
    setStatus("متنی برای تبدیل به اسلاید پیدا نشد");
    return;
  }
  if (replace) {
    state.data.slides = imported;
    state.activeIndex = 0;
  } else {
    state.data.slides.push(...imported);
    state.activeIndex = state.data.slides.length - imported.length;
  }
  els.importerModal.classList.add("hidden");
  setDirty(true);
  renderSlidesList();
  renderInspector();
  reloadStage(true);
  setStatus(`${fa(imported.length)} اسلاید از متن ساخته شد ✓`);
};
els.btnAppendImported.addEventListener("click", () => applyImportedSlides(false));
els.btnReplaceImported.addEventListener("click", () => applyImportedSlides(true));

document.querySelectorAll(".insp-tab").forEach((tabBtn) => {
  tabBtn.addEventListener("click", () => {
    state.activeTab = tabBtn.dataset.tab;
    renderInspector();
  });
});

els.projLogoUpload.addEventListener("change", async () => {
  const file = els.projLogoUpload.files && els.projLogoUpload.files[0];
  if (!file || !state.projectName) return;
  try {
    const resp = await fetch(`/api/projects/${encodeURIComponent(state.projectName)}/images?filename=${encodeURIComponent(file.name)}`, {
      method: "POST",
      body: file,
    });
    const res = await resp.json();
    if (!resp.ok) throw new Error(res.error || "خطا در آپلود");
    if (!state.images.includes(res.filename)) state.images.push(res.filename);
    if (state.data) state.data.logo = res.filename;
    refreshLogoImageOptions();
    els.projLogoImageSelect.value = res.filename;
    setDirty(true);
    setStatus("تصویر لوگو آپلود شد");
  } catch (err) {
    setStatus("خطا در آپلود لوگو: " + err.message);
  }
});

els.btnSave.addEventListener("click", saveProject);
window.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
    e.preventDefault();
    if (!els.btnSave.disabled) saveProject();
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    e.preventDefault();
    if (e.shiftKey) redo();
    else undo();
  } else if (e.key === "Escape") {
    stopPickTarget();
  }
});

els.btnAddSlide.addEventListener("click", () => {
  insertTemplateSlide(els.addTemplateSelect.value || "title_card");
});

document.querySelectorAll(".seg-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const slide = activeSlide();
    if (!slide) return;
    slide.layout = btn.dataset.layout;
    setDirty(true);
    renderSlidesList();
    renderInspector();
    reloadStage(true);
  });
});

document.querySelectorAll(".fmt-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const fmt = btn.dataset.format || "16:9";
    state.format = fmt;
    const slide = activeSlide();
    if (slide) {
      slide.format = fmt;
      setDirty(true);
      renderInspector();
    }
    reloadStage(true);
  });
});

els.chkCamGuide.addEventListener("change", () => reloadStage(false, state.currentTime));
els.chkLivingLoop.addEventListener("change", () => {
  state.livingLoop = els.chkLivingLoop.checked;
  reloadStage(true);
});

els.btnSfxMute.addEventListener("click", () => {
  state.sfxMuted = !state.sfxMuted;
  els.btnSfxMute.textContent = state.sfxMuted ? "🔇 بی‌صدا" : "🔊 صدا";
  if (window.StageSFX) window.StageSFX.setMuted(state.sfxMuted);
  if (els.stageFrame.contentWindow) {
    els.stageFrame.contentWindow.postMessage({ cmd: "sfxConfig", muted: state.sfxMuted, volume: state.sfxVolume }, "*");
  }
});

els.btnReroll.addEventListener("click", () => {
  const slide = activeSlide();
  if (!slide) return;
  slide.seed = (Number(slide.seed) || 0) + 1;
  setDirty(true);
  renderInspector();
  reloadStage(true);
});

els.btnPlayPause.addEventListener("click", () => {
  if (state.playing) stopClock();
  else startClock(state.currentTime);
});

els.btnReplay.addEventListener("click", () => {
  state.currentTime = 0;
  startClock(0);
});

els.timeScrubber.addEventListener("input", () => {
  stopClock();
  state.currentTime = parseFloat(els.timeScrubber.value) || 0;
  updateTimeUI();
  postSeek(state.currentTime);
});

els.btnNewProject.addEventListener("click", () => {
  els.newProjectErr.classList.add("hidden");
  els.newProjectModal.classList.remove("hidden");
  els.newProjectName.focus();
});
els.btnCloseNewModal.addEventListener("click", () => els.newProjectModal.classList.add("hidden"));
els.btnCreateProject.addEventListener("click", createNewProject);
els.newProjectName.addEventListener("keydown", (e) => {
  if (e.key === "Enter") createNewProject();
});

els.stageFrame.addEventListener("load", () => {
  if (activeSlide()) reloadStage(true);
});

window.addEventListener("resize", resizeStage);
if (typeof ResizeObserver === "function") {
  new ResizeObserver(resizeStage).observe(els.stageViewport);
}

async function loadStarterAssets() {
  try {
    const resp = await fetch("/api/assets");
    const json = await resp.json();
    if (json && json.ok && Array.isArray(json.assets)) {
      state.starterAssets = json.assets;
    }
  } catch {
    state.starterAssets = [];
  }
}

initSelectors();
resizeStage();
const initialProject = new URLSearchParams(window.location.search).get("project");
Promise.all([loadStarterAssets(), loadProjectsList(initialProject)])
  .then(() => {
    if (activeSlide()) renderInspector();
  })
  .catch((err) => setStatus("خطا در ارتباط با سرور محلی: " + err.message));
