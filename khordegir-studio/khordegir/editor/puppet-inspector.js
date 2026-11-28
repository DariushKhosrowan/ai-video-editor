/* Khordegir Studio — Puppet Inspector UI (Phases 1–6: Items 1–22).
   100% offline, fully deterministic, bilingual Persian + English labels.
   Beginner one-click 10-preset library, 5 characters, 6 outfits, 7 skins, Shot/Background/Lighting presets at top;
   everything else organized cleanly in collapsible Advanced <details> sections. */

const TOKENS = (typeof window !== "undefined" && window.StageMotionTokens) || {};
const PUPPET_PARTS = TOKENS.PUPPET_PARTS || {};
const TONE_PRESETS = TOKENS.TONE_PRESETS || {};
const EXPRESSIONS = TOKENS.EXPRESSIONS || {};
const GESTURES = TOKENS.GESTURES || {};
const CHARACTERS = TOKENS.CHARACTERS || {};
const OUTFITS = TOKENS.OUTFITS || {};
const SKINS = TOKENS.SKINS || {};
const ACCESSORIES = TOKENS.ACCESSORIES || {};
const SHOT_PRESETS = TOKENS.SHOT_PRESETS || {};
const PUPPET_BACKGROUNDS = TOKENS.PUPPET_BACKGROUNDS || {};
const LIGHTING_PRESETS = TOKENS.LIGHTING_PRESETS || {};
const STAGE_ZOOM_CAP = TOKENS.STAGE_ZOOM_CAP || 1.06;
const MASCOT_PALETTE = TOKENS.MASCOT_PALETTE || {};
const resolvePuppet = TOKENS.resolvePuppetConfig || ((p) => p || {});
const resolveCharPalette = TOKENS.resolveCharacterPalette || (() => Object.assign({}, MASCOT_PALETTE));
const parseSvgRig = TOKENS.parseSvgToPuppetRig || null;
const computeSpeakerCal = TOKENS.computeSpeakerCalibration || null;
const DEFAULT_LIVE_HOTKEYS = TOKENS.DEFAULT_LIVE_HOTKEYS || { emotions: {}, gestures: {}, pttKey: "Space", hudKey: "KeyH" };
const DEFAULT_MIDI_MAP = TOKENS.DEFAULT_MIDI_MAP || { notes: {}, cc: {} };

const USER_PRESETS_KEY = "khordegir_puppet_user_presets_v2";
const CALIBRATION_STORAGE_KEY = "khordegir_speaker_calibration_v1";
let clipboardPuppet = null;
let compareSlots = { A: null, B: null, active: "A" };
let activeSelectedPart = "head";
let activePuppetMeterEls = null;
let calRecordingCancel = null;
let editorMicSession = null;
let editorMicChannel = null;
let editorLiveVoiceSink = null;
let editorMicUiListeners = new Set();

function notifyMicUiListeners(st) {
  editorMicUiListeners.forEach((fn) => {
    try { fn(st); } catch (_) {}
  });
}

export function setEditorLiveVoiceSink(fn) {
  editorLiveVoiceSink = typeof fn === "function" ? fn : null;
}

export function isEditorLiveMicRunning() {
  return Boolean(editorMicSession && editorMicSession.isRunning && editorMicSession.isRunning());
}

export function stopEditorLiveMic() {
  if (editorMicSession) {
    editorMicSession.stop();
  }
  if (editorLiveVoiceSink) {
    editorLiveVoiceSink({ active: false, loudness: 0, db: -80, f0Hz: 0, pitchNorm: 0, emphasis: 0, isSpeaking: false, viseme: "rest" }, 1 / 60);
  }
}

export async function toggleEditorLiveMic(overrideCfg = null) {
  const LM = window.StageLiveMic;
  if (!LM || typeof LM.createLiveMicSession !== "function") {
    return { ok: false, error: { fa: "موتور میکروفن زنده بارگذاری نشده است.", en: "StageLiveMic not loaded." } };
  }
  if (editorMicSession && editorMicSession.isRunning()) {
    stopEditorLiveMic();
    return { ok: true, running: false };
  }
  if (!editorMicChannel && typeof BroadcastChannel === "function") {
    try { editorMicChannel = new BroadcastChannel("khordegir-obs-puppet"); } catch (_) {}
  }
  if (!editorMicSession) {
    editorMicSession = LM.createLiveMicSession({
      onFrame(frame, dt) {
        updatePuppetMeter(frame);
        if (editorLiveVoiceSink) editorLiveVoiceSink(frame, dt);
        if (editorMicChannel) {
          try { editorMicChannel.postMessage({ type: "puppet:live_voice", sample: frame, dt }); } catch (_) {}
        }
      },
      onStateChange(st) {
        notifyMicUiListeners(st);
      },
    });
  }
  return editorMicSession.start(overrideCfg);
}

export function updateEditorLiveMicConfig(patch) {
  if (editorMicSession) editorMicSession.setConfig(patch);
  else if (window.StageLiveMic && window.StageLiveMic.saveMicPrefs) window.StageLiveMic.saveMicPrefs(patch);
}

function detectPitchYINEditor(buf, sampleRate, fMin = 65, fMax = 500, threshold = 0.16) {
  const n = buf.length;
  const half = n >> 1;
  if (half < 32 || !sampleRate) return 0;
  const tauMin = Math.max(2, Math.floor(sampleRate / fMax));
  const tauMax = Math.min(half - 2, Math.ceil(sampleRate / fMin));
  if (tauMax <= tauMin) return 0;
  let sumSq = 0;
  for (let i = 0; i < n; i += 1) sumSq += buf[i] * buf[i];
  if (Math.sqrt(sumSq / n) < 0.0025) return 0;

  const cmndf = new Float32Array(tauMax + 2);
  cmndf[0] = 1;
  let running = 0;
  let bestTau = -1;
  let bestVal = 1;
  for (let tau = 1; tau <= tauMax; tau += 1) {
    let diff = 0;
    for (let j = 0; j < half; j += 1) {
      const d = buf[j] - buf[j + tau];
      diff += d * d;
    }
    running += diff;
    const val = running > 1e-12 ? (diff * tau) / running : 1;
    cmndf[tau] = val;
    if (tau >= tauMin && val < bestVal) {
      bestVal = val;
      bestTau = tau;
    }
  }
  let chosen = -1;
  for (let tau = tauMin; tau <= tauMax; tau += 1) {
    if (cmndf[tau] < threshold) {
      while (tau + 1 <= tauMax && cmndf[tau + 1] <= cmndf[tau]) tau += 1;
      chosen = tau;
      break;
    }
  }
  if (chosen < 0) chosen = (bestTau >= tauMin && bestVal < 0.34) ? bestTau : -1;
  if (chosen <= 0) return 0;
  const f0 = sampleRate / chosen;
  return (f0 >= fMin && f0 <= fMax) ? f0 : 0;
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function computeDampingRatio(sp) {
  const k = clamp(Number(sp && sp.stiffness) || 196, 20, 900);
  const c = clamp(Number(sp && sp.damping) || 28, 2, 120);
  const m = clamp(Number(sp && sp.mass) || 1.0, 0.2, 5.0);
  return c / (2 * Math.sqrt(k * m));
}

function loadUserPresets() {
  try {
    const raw = localStorage.getItem(USER_PRESETS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === "object") ? parsed : {};
  } catch (_) {
    return {};
  }
}

function saveUserPresets(map) {
  try {
    localStorage.setItem(USER_PRESETS_KEY, JSON.stringify(map || {}));
  } catch (_) {
    /* ignore storage quota errors */
  }
}

export function exportPuppetPresetPayload(name, puppetCfg) {
  return {
    schema: "khordegir-puppet-preset",
    version: 2,
    name: String(name || "custom").trim() || "custom",
    puppet: resolvePuppet(puppetCfg),
  };
}

export function importPuppetPresetPayload(rawTextOrObj) {
  const data = typeof rawTextOrObj === "string" ? JSON.parse(rawTextOrObj) : rawTextOrObj;
  if (!data || typeof data !== "object") throw new Error("فایل پریست معتبر نیست");
  const inner = (data.puppet && typeof data.puppet === "object") ? data.puppet : data;
  return {
    name: String(data.name || inner.preset || "imported").trim() || "imported",
    puppet: resolvePuppet(inner),
  };
}

export function updatePuppetMeter(telemetry) {
  if (!activePuppetMeterEls || !telemetry) return;
  const { loudFill, loudVal, pitchMarker, pitchVal, empBadge, emoChip, gestChip, physChip } = activePuppetMeterEls;
  const loudPct = Math.round(clamp(Number(telemetry.loudness) || 0, 0, 1) * 100);
  const dbVal = Number.isFinite(telemetry.db) ? telemetry.db : -80;
  if (loudFill) loudFill.style.width = `${loudPct}%`;
  if (loudVal) loudVal.textContent = `${loudPct}% (${dbVal.toFixed(0)} dB)`;

  const pNorm = clamp(Number(telemetry.pitchNorm) || 0, -1, 1);
  if (pitchMarker) {
    pitchMarker.style.left = `${(50 + pNorm * 46).toFixed(1)}%`;
    pitchMarker.classList.toggle("is-high", pNorm > 0.12);
    pitchMarker.classList.toggle("is-low", pNorm < -0.12);
  }
  if (pitchVal) {
    const hz = Number(telemetry.f0Hz) || 0;
    pitchVal.textContent = hz > 0 ? `${Math.round(hz)} Hz (${pNorm >= 0 ? "+" : ""}${pNorm.toFixed(2)})` : "سکوت";
  }

  const emp = clamp(Number(telemetry.emphasis) || 0, 0, 1);
  if (empBadge) {
    empBadge.classList.toggle("is-hot", emp >= 0.45);
    empBadge.textContent = emp >= 0.45 ? `تاکید ${Math.round(emp * 100)}%` : (telemetry.isSpeaking ? "در حال صحبت" : "سکوت");
  }
  if (emoChip) {
    const emoSpec = EXPRESSIONS[telemetry.emotion];
    emoChip.textContent = `احساس: ${emoSpec ? emoSpec.labelEn : (telemetry.emotion || "Neutral")}`;
  }
  if (gestChip) {
    const gSpec = telemetry.gesture && GESTURES[telemetry.gesture];
    gestChip.textContent = `ژست: ${gSpec ? gSpec.labelEn : "—"}`;
  }
  if (physChip) {
    const z = Number(telemetry.dampingRatio ?? 1).toFixed(2);
    const v = Number(telemetry.volumeProduct ?? 1).toFixed(3);
    physChip.textContent = `ζ=${z} · vol=${v}`;
  }
}

function readSlidePuppet(slide, projectData) {
  const baseProj = (projectData && projectData.puppet && typeof projectData.puppet === "object") ? projectData.puppet : null;
  const rawSlide = (slide.puppet && typeof slide.puppet === "object")
    ? slide.puppet
    : (slide.mascot && slide.mascot.puppet && typeof slide.mascot.puppet === "object")
      ? slide.mascot.puppet
      : null;
  const merged = Object.assign({}, baseProj || {}, rawSlide || {});
  const legTone = (slide.mascot && slide.mascot.tone) || slide.tone || null;
  return resolvePuppet(merged, legTone);
}

function writeSlidePuppet(slide, nextPuppet) {
  const clean = resolvePuppet(nextPuppet);
  slide.puppet = clean;
  if (!slide.mascot || typeof slide.mascot !== "object") {
    const tpl = String(slide.template || "").replace(/-/g, "_");
    if (tpl !== "mascot_talk") {
      slide.mascot = { enabled: true, side: "left", scale: 0.85 };
    }
  }
  if (slide.mascot && typeof slide.mascot === "object") {
    slide.mascot.tone = deepClone(clean.tone);
  }
  return clean;
}

function mkSliderRow({ label, min, max, step, value, fmt, onChange }) {
  const row = document.createElement("label");
  row.className = "tone-slider-row";
  const head = document.createElement("div");
  head.className = "tone-slider-head";
  const lbl = document.createElement("span");
  lbl.textContent = label;
  const valEl = document.createElement("strong");
  valEl.className = "mono-num";
  valEl.dir = "ltr";
  valEl.textContent = fmt(Number(value));
  head.append(lbl, valEl);

  const inp = document.createElement("input");
  inp.type = "range";
  inp.min = String(min);
  inp.max = String(max);
  inp.step = String(step);
  inp.value = String(value);
  inp.addEventListener("input", () => {
    const num = parseFloat(inp.value);
    valEl.textContent = fmt(num);
    onChange(num);
  });

  row.append(head, inp);
  return { row, inp, valEl };
}

function renderKeyframeSvg(keyframes, channel, duration) {
  const dur = Math.max(1, Number(duration) || 6);
  const pts = (keyframes || []).filter((k) => k.gain === channel).sort((a, b) => a.t - b.t);
  const w = 260;
  const h = 62;
  const pad = 6;
  const mapX = (t) => pad + clamp(t / dur, 0, 1) * (w - pad * 2);
  const mapY = (v) => (h - pad) - clamp(v / 2.0, 0, 1) * (h - pad * 2);

  let d = "";
  if (pts.length) {
    d = `M ${mapX(0).toFixed(1)},${mapY(pts[0].value).toFixed(1)}`;
    for (let i = 0; i < pts.length; i += 1) {
      d += ` L ${mapX(pts[i].t).toFixed(1)},${mapY(pts[i].value).toFixed(1)}`;
    }
    d += ` L ${mapX(dur).toFixed(1)},${mapY(pts[pts.length - 1].value).toFixed(1)}`;
  } else {
    d = `M ${pad},${mapY(1.0).toFixed(1)} L ${w - pad},${mapY(1.0).toFixed(1)}`;
  }

  const dots = pts.map((p) => (
    `<circle cx="${mapX(p.t).toFixed(1)}" cy="${mapY(p.value).toFixed(1)}" r="3.4" fill="#f5b700" stroke="#090d14" stroke-width="1.2"/>`
  )).join("");

  return `
    <svg class="puppet-kf-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <line x1="${pad}" y1="${mapY(1).toFixed(1)}" x2="${w - pad}" y2="${mapY(1).toFixed(1)}" stroke="rgba(255,255,255,0.12)" stroke-dasharray="3,3"/>
      <path d="${d}" fill="none" stroke="#f5b700" stroke-width="2" stroke-linejoin="round"/>
      ${dots}
    </svg>
  `;
}

export function renderPuppetInspector({
  container,
  slide,
  projectData,
  duration,
  currentTime,
  onPuppetChange,
  onDirtyReload,
  onApplyProjectDefault,
  setStatus,
}) {
  activePuppetMeterEls = null;
  editorMicUiListeners.clear();
  container.innerHTML = "";

  const tpl = String(slide.template || "").replace(/-/g, "_");
  const isMascotTpl = tpl === "mascot_talk";
  const hasMascot = isMascotTpl || Boolean(slide.mascot && slide.mascot.enabled !== false);

  const rootSec = document.createElement("div");
  rootSec.className = "inspector-section";
  rootSec.innerHTML = `
    <div class="section-title">
      <span>بازرس عروسک عقاب قرمز</span>
      <span class="bilingual-sub">Puppet Inspector v2</span>
    </div>
  `;

  if (!hasMascot) {
    const enableBox = document.createElement("div");
    enableBox.className = "float-divider-group";
    enableBox.innerHTML = `<p class="panel-hint">این اسلاید هنوز عروسک عقاب ندارد. با یک کلیک لایه عروسک را فعال کنید تا همه تنظیمات زنده فعال شوند.</p>`;
    const enBtn = document.createElement("button");
    enBtn.type = "button";
    enBtn.className = "btn btn-sm btn-primary";
    enBtn.textContent = "+ فعال‌سازی عروسک روی این اسلاید (Enable Puppet)";
    enBtn.addEventListener("click", () => {
      slide.mascot = Object.assign({
        enabled: true,
        side: "left",
        scale: 0.85,
        expression: "neutral",
        look_at: "slide",
        enter: "slide-in",
        accents: true,
      }, slide.mascot || {});
      slide.puppet = readSlidePuppet(slide, projectData);
      onDirtyReload(true, true);
      setStatus("عروسک عقاب قرمز روی این اسلاید فعال شد ✓");
    });
    enableBox.appendChild(enBtn);
    rootSec.appendChild(enableBox);
    container.appendChild(rootSec);
    return;
  }

  let cur = readSlidePuppet(slide, projectData);

  const commit = (nextObj, reRender = false) => {
    cur = writeSlidePuppet(slide, nextObj);
    if (typeof onPuppetChange === "function") {
      onPuppetChange(cur, true);
    } else {
      onDirtyReload(false, false);
    }
    if (reRender) {
      renderPuppetInspector({
        container, slide, projectData, duration, currentTime,
        onPuppetChange, onDirtyReload, onApplyProjectDefault, setStatus,
      });
    }
  };

  /* ---------------- 1. Beginner One-Click 10-Preset Library (Phase 1 Item 3) */
  const presetBox = document.createElement("div");
  presetBox.className = "float-divider-group";
  presetBox.innerHTML = `
    <div class="override-head">
      <span>کتابخانه ۱۰ پریست آماده</span>
      <span class="bilingual-sub">10 Presets</span>
    </div>
  `;

  const presetGrid = document.createElement("div");
  presetGrid.className = "puppet-preset-grid";
  Object.keys(TONE_PRESETS).forEach((key) => {
    const spec = TONE_PRESETS[key];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tone-preset-btn" + (cur.preset === key ? " active" : "");
    btn.dataset.puppetPreset = key;
    btn.textContent = spec.label || key;
    btn.addEventListener("click", () => {
      const next = resolvePuppet(Object.assign({}, cur, {
        preset: key,
        tone: { preset: key },
        spring: deepClone(spec.spring),
        emotion: spec.emotion || cur.emotion,
        emotionIntensity: spec.emotionIntensity ?? 1.0,
      }));
      commit(next, true);
      setStatus(`پریست «${spec.label || key}» اعمال شد ✓`);
    });
    presetGrid.appendChild(btn);
  });
  presetBox.appendChild(presetGrid);

  // User Presets + Export/Import JSON
  const userPresets = loadUserPresets();
  const userBar = document.createElement("div");
  userBar.className = "puppet-user-presets";

  const userSel = document.createElement("select");
  userSel.className = "select-ctrl compact";
  const defOpt = document.createElement("option");
  defOpt.value = "";
  defOpt.textContent = `پریست‌های کاربر (${Object.keys(userPresets).length})`;
  userSel.appendChild(defOpt);
  Object.keys(userPresets).forEach((name) => {
    const o = document.createElement("option");
    o.value = name;
    o.textContent = name;
    userSel.appendChild(o);
  });
  userSel.addEventListener("change", () => {
    const name = userSel.value;
    if (!name || !userPresets[name]) return;
    commit(userPresets[name], true);
    setStatus(`پریست کاربری «${name}» بارگذاری شد ✓`);
  });

  const saveNameInp = document.createElement("input");
  saveNameInp.type = "text";
  saveNameInp.className = "text-input compact";
  saveNameInp.placeholder = "نام پریست جدید...";

  const btnSavePreset = document.createElement("button");
  btnSavePreset.type = "button";
  btnSavePreset.className = "btn btn-sm btn-ghost";
  btnSavePreset.textContent = "ذخیره (Save)";
  btnSavePreset.addEventListener("click", () => {
    const name = (saveNameInp.value || "").trim() || `custom-${Object.keys(userPresets).length + 1}`;
    const map = loadUserPresets();
    map[name] = deepClone(cur);
    saveUserPresets(map);
    setStatus(`پریست «${name}» ذخیره شد ✓`);
    commit(cur, true);
  });

  const btnExportJson = document.createElement("button");
  btnExportJson.type = "button";
  btnExportJson.className = "btn btn-sm btn-ghost";
  btnExportJson.textContent = "خروجی JSON";
  btnExportJson.addEventListener("click", () => {
    const payload = exportPuppetPresetPayload(saveNameInp.value || cur.preset, cur);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `puppet-${payload.name}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus(`فایل پریست puppet-${payload.name}.json دانلود شد ✓`);
  });

  const importInp = document.createElement("input");
  importInp.type = "file";
  importInp.accept = ".json,application/json";
  importInp.className = "hidden";
  importInp.addEventListener("change", async () => {
    const f = importInp.files && importInp.files[0];
    if (!f) return;
    try {
      const imported = importPuppetPresetPayload(await f.text());
      const map = loadUserPresets();
      map[imported.name] = imported.puppet;
      saveUserPresets(map);
      commit(imported.puppet, true);
      setStatus(`پریست «${imported.name}» از JSON وارد شد ✓`);
    } catch (err) {
      setStatus("خطا در خواندن JSON پریست: " + err.message);
    }
  });

  const btnImportJson = document.createElement("button");
  btnImportJson.type = "button";
  btnImportJson.className = "btn btn-sm btn-ghost";
  btnImportJson.textContent = "ورودی JSON";
  btnImportJson.addEventListener("click", () => importInp.click());

  const userRowTop = document.createElement("div");
  userRowTop.className = "puppet-inline-row";
  userRowTop.append(userSel, saveNameInp);
  const userRowBtns = document.createElement("div");
  userRowBtns.className = "btn-row-wrap";
  userRowBtns.append(btnSavePreset, btnExportJson, btnImportJson, importInp);
  userBar.append(userRowTop, userRowBtns);
  presetBox.appendChild(userBar);
  rootSec.appendChild(presetBox);

  /* ---------------- 1b. Beginner Cast, Outfits & Seasonal Skins (Phase 4 Items 12 & 14) */
  const styleBox = document.createElement("div");
  styleBox.className = "float-divider-group";
  styleBox.innerHTML = `
    <div class="override-head">
      <span>شخصیت، لباس و پوسته فصلی</span>
      <span class="bilingual-sub">Character · Outfit · Skin</span>
    </div>
  `;

  // 5 Characters
  const charRow = document.createElement("div");
  charRow.className = "btn-row-wrap";
  Object.keys(CHARACTERS).forEach((ck) => {
    const cSpec = CHARACTERS[ck];
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tone-preset-btn" + ((cur.character || "red_eagle") === ck ? " active" : "");
    b.dataset.puppetCharacter = ck;
    b.textContent = cSpec.label || ck;
    b.addEventListener("click", () => {
      const nextSkin = cur.skin || "classic";
      const nextVoice = Object.assign({}, cur.voice || {}, cSpec.defaultVoice || {});
      const nextPal = cur.paletteLock !== false
        ? resolveCharPalette(ck, nextSkin)
        : cur.palette;
      const next = resolvePuppet(Object.assign({}, cur, {
        character: ck,
        voice: nextVoice,
        palette: nextPal,
      }));
      commit(next, true);
      setStatus(`شخصیت «${cSpec.label || ck}» انتخاب شد ✓`);
    });
    charRow.appendChild(b);
  });
  styleBox.appendChild(charRow);

  // 6 Outfits & 7 Skins side-by-side selects for clean beginner ergonomics
  const outfitSkinRow = document.createElement("div");
  outfitSkinRow.className = "puppet-inline-row";

  const outfitSel = document.createElement("select");
  outfitSel.className = "select-ctrl compact";
  outfitSel.dataset.puppetOutfit = "1";
  Object.keys(OUTFITS).forEach((ok) => {
    const oSpec = OUTFITS[ok];
    const opt = document.createElement("option");
    opt.value = ok;
    opt.textContent = `لباس: ${oSpec.label || ok}`;
    outfitSel.appendChild(opt);
  });
  outfitSel.value = cur.outfit || "default";
  outfitSel.addEventListener("change", () => {
    const ok = outfitSel.value;
    const oSpec = OUTFITS[ok] || OUTFITS.default || { accessories: [] };
    const next = resolvePuppet(Object.assign({}, cur, {
      outfit: ok,
      accessories: Array.isArray(oSpec.accessories) ? oSpec.accessories.slice() : [],
    }));
    commit(next, true);
    setStatus(`لباس «${oSpec.label || ok}» اعمال شد ✓`);
  });

  const skinSel = document.createElement("select");
  skinSel.className = "select-ctrl compact";
  skinSel.dataset.puppetSkin = "1";
  Object.keys(SKINS).forEach((sk) => {
    const sSpec = SKINS[sk];
    const opt = document.createElement("option");
    opt.value = sk;
    opt.textContent = `پوسته: ${sSpec.label || sk}`;
    skinSel.appendChild(opt);
  });
  skinSel.value = cur.skin || "classic";
  skinSel.addEventListener("change", () => {
    const sk = skinSel.value;
    const sSpec = SKINS[sk] || SKINS.classic || {};
    const nextPal = cur.paletteLock !== false
      ? resolveCharPalette(cur.character || "red_eagle", sk)
      : cur.palette;
    const next = resolvePuppet(Object.assign({}, cur, {
      skin: sk,
      palette: nextPal,
    }));
    commit(next, true);
    setStatus(`پوسته «${sSpec.label || sk}» اعمال شد ✓`);
  });

  outfitSkinRow.append(outfitSel, skinSel);
  styleBox.appendChild(outfitSkinRow);
  rootSec.appendChild(styleBox);

  /* ---------------- 1c. Beginner Camera Shot, Scene Background & Lighting (Phase 5 Items 15 & 16) */
  const sceneBox = document.createElement("div");
  sceneBox.className = "float-divider-group";
  sceneBox.innerHTML = `
    <div class="override-head">
      <span>نما، صحنه پارالاکس و نورپردازی</span>
      <span class="bilingual-sub">Shot · Scene · Lighting</span>
    </div>
  `;
  const curScene = Object.assign({
    shot: "medium", pushIn: 0.025, shotTimeline: [], background: "none",
    parallax: 0, lighting: "studio", lightingIntensity: 0,
  }, cur.scene || {});

  const shotBtnRow = document.createElement("div");
  shotBtnRow.className = "btn-row-wrap";
  Object.keys(SHOT_PRESETS).forEach((sk) => {
    const sp = SHOT_PRESETS[sk];
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tone-preset-btn" + (curScene.shot === sk ? " active" : "");
    b.dataset.puppetShot = sk;
    b.textContent = sp.label || sk;
    b.addEventListener("click", () => {
      const nextScene = Object.assign({}, curScene, { shot: sk, pushIn: sp.pushIn });
      slide.shot = sk;
      commit(Object.assign({}, cur, { scene: nextScene }), true);
      onDirtyReload(false, false);
      setStatus(`نمای دوربین روی «${sp.label || sk}» تنظیم شد ✓`);
    });
    shotBtnRow.appendChild(b);
  });
  sceneBox.appendChild(shotBtnRow);

  const bgLightRow = document.createElement("div");
  bgLightRow.className = "puppet-inline-row";

  const bgSel = document.createElement("select");
  bgSel.className = "select-ctrl compact";
  bgSel.dataset.puppetBg = "1";
  Object.keys(PUPPET_BACKGROUNDS).forEach((bk) => {
    const o = document.createElement("option");
    o.value = bk;
    o.textContent = `صحنه: ${PUPPET_BACKGROUNDS[bk].label || bk}`;
    bgSel.appendChild(o);
  });
  bgSel.value = curScene.background || "none";
  bgSel.addEventListener("change", () => {
    const bk = bgSel.value;
    const bSpec = PUPPET_BACKGROUNDS[bk] || PUPPET_BACKGROUNDS.none;
    const nextScene = Object.assign({}, curScene, { background: bk, parallax: bSpec.parallax });
    if (bk !== "none") slide.background = bk;
    else if (PUPPET_BACKGROUNDS[String(slide.background || "").toLowerCase()]) delete slide.background;
    commit(Object.assign({}, cur, { scene: nextScene }), true);
    onDirtyReload(false, false);
    setStatus(`پس‌زمینه صحنه روی «${bSpec.label || bk}» تنظیم شد ✓`);
  });

  const lightSel = document.createElement("select");
  lightSel.className = "select-ctrl compact";
  lightSel.dataset.puppetLight = "1";
  Object.keys(LIGHTING_PRESETS).forEach((lk) => {
    const o = document.createElement("option");
    o.value = lk;
    o.textContent = `نور: ${LIGHTING_PRESETS[lk].label || lk}`;
    lightSel.appendChild(o);
  });
  lightSel.value = curScene.lighting || "studio";
  lightSel.addEventListener("change", () => {
    const lk = lightSel.value;
    const lSpec = LIGHTING_PRESETS[lk] || LIGHTING_PRESETS.studio;
    const nextScene = Object.assign({}, curScene, { lighting: lk, lightingIntensity: lSpec.intensity });
    slide.lighting = lk;
    commit(Object.assign({}, cur, { scene: nextScene }), true);
    onDirtyReload(false, false);
    setStatus(`نورپردازی روی «${lSpec.label || lk}» تنظیم شد ✓`);
  });

  bgLightRow.append(bgSel, lightSel);
  sceneBox.appendChild(bgLightRow);
  rootSec.appendChild(sceneBox);

  /* ---------------- 2. Workflow Bar: Copy/Paste, Reset, A/B Compare, Project Default */
  const toolBar = document.createElement("div");
  toolBar.className = "puppet-ab-bar";

  const mkMiniBtn = (txt, cls, fn) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `btn btn-sm ${cls}`;
    b.textContent = txt;
    b.addEventListener("click", fn);
    return b;
  };

  toolBar.append(
    mkMiniBtn("بازنشانی پریست (Reset)", "btn-ghost", () => {
      const spec = TONE_PRESETS[cur.preset] || TONE_PRESETS.lively;
      commit(resolvePuppet({ preset: cur.preset, tone: { preset: cur.preset }, spring: spec.spring }), true);
      setStatus("تنظیمات به پیش‌فرض پریست بازنشانی شد ✓");
    }),
    mkMiniBtn("کپی (Copy)", "btn-ghost", () => {
      clipboardPuppet = deepClone(cur);
      setStatus("تنظیمات عروسک کپی شد ✓");
    }),
    mkMiniBtn("چسباندن (Paste)", "btn-ghost", () => {
      if (!clipboardPuppet) { setStatus("تنظیماتی کپی نشده است"); return; }
      commit(deepClone(clipboardPuppet), true);
      setStatus("تنظیمات عروسک جای‌گذاری شد ✓");
    }),
    mkMiniBtn("ذخیره A", compareSlots.A ? "btn-amber" : "btn-ghost", () => {
      compareSlots.A = deepClone(cur);
      compareSlots.active = "A";
      commit(cur, true);
      setStatus("تنظیمات فعلی در اسلات A ذخیره شد ✓");
    }),
    mkMiniBtn("ذخیره B", compareSlots.B ? "btn-amber" : "btn-ghost", () => {
      compareSlots.B = deepClone(cur);
      compareSlots.active = "B";
      commit(cur, true);
      setStatus("تنظیمات فعلی در اسلات B ذخیره شد ✓");
    }),
    mkMiniBtn(`مقایسه A⇄B (${compareSlots.active})`, "btn-primary", () => {
      if (!compareSlots.A) compareSlots.A = deepClone(cur);
      if (!compareSlots.B) compareSlots.B = deepClone(cur);
      compareSlots.active = compareSlots.active === "A" ? "B" : "A";
      commit(deepClone(compareSlots[compareSlots.active]), true);
      setStatus(`نمایش مقایسه اسلات ${compareSlots.active} فعال شد ✓`);
    }),
  );
  if (typeof onApplyProjectDefault === "function") {
    toolBar.append(mkMiniBtn("اعمال به کل پروژه (All Slides)", "btn-ghost", () => {
      onApplyProjectDefault(deepClone(cur));
    }));
  }
  rootSec.appendChild(toolBar);

  /* ---------------- 3. Live Telemetry Meter + Direct Live Microphone Test */
  const LM = window.StageLiveMic || null;
  const savedMic = (LM && LM.loadMicPrefs) ? LM.loadMicPrefs() : {};
  const initGain = clamp(Number(savedMic.inputGain ?? 1.8), 0.5, 6.0);
  const initGate = clamp(Number(savedMic.noiseGateDb ?? -56), -72, -20);
  const initAgc = savedMic.autoGainControl !== false;

  const meterCard = document.createElement("div");
  meterCard.className = "tone-meter-card";
  meterCard.innerHTML = `
    <div class="live-mic-bar">
      <div class="live-mic-head">
        <button type="button" class="btn-mic-live" data-p="micToggleBtn">🎙️ روشن کردن میکروفن زنده (Live Mic)</button>
        <span class="live-mic-status" data-p="micStatusBadge">خاموش</span>
      </div>
      <div class="live-mic-controls">
        <select class="select-ctrl compact" data-p="micDeviceSel" aria-label="انتخاب دستگاه میکروفن / Microphone Device">
          <option value="">میکروفن پیش‌فرض سیستم (Default Mic)</option>
        </select>
        <div class="live-mic-sliders">
          <label class="live-mic-mini-slider">
            <span>تقویت (Gain): <strong class="mono-num" dir="ltr" data-p="micGainOut">${initGain.toFixed(1)}×</strong></span>
            <input type="range" min="0.5" max="6" step="0.1" value="${initGain}" data-p="micGainInp" aria-label="تقویت میکروفن">
          </label>
          <label class="live-mic-mini-slider">
            <span>نویز گیت: <strong class="mono-num" dir="ltr" data-p="micGateOut">${initGate} dB</strong></span>
            <input type="range" min="-72" max="-20" step="1" value="${initGate}" data-p="micGateInp" aria-label="نویز گیت میکروفن">
          </label>
        </div>
        <label class="toggle-chip" style="font-size:11px">
          <input type="checkbox" data-p="micAgcChk" ${initAgc ? "checked" : ""}>
          <span>تنظیم خودکار بلندی میکروفن (Auto Gain · AGC)</span>
        </label>
      </div>
      <div class="live-mic-notice hidden" data-p="micNotice" role="status"></div>
    </div>
    <div class="tone-meter-row">
      <span class="tone-meter-label">بلندی صدا (Loudness)</span>
      <span class="tone-meter-val mono-num" dir="ltr" data-p="loudVal">0% (-80 dB)</span>
    </div>
    <div class="tone-meter-bar"><div class="tone-meter-fill" data-p="loudFill" style="width:0%"></div></div>
    <div class="tone-meter-row" style="margin-top:5px">
      <span class="tone-meter-label">زیر و بمی (Pitch)</span>
      <span class="tone-meter-val mono-num" dir="ltr" data-p="pitchVal">سکوت</span>
    </div>
    <div class="tone-pitch-track">
      <div class="tone-pitch-center"></div>
      <div class="tone-pitch-marker" data-p="pitchMarker" style="left:50%"></div>
    </div>
    <div class="tone-telemetry-chips">
      <span class="tone-emp-badge" data-p="empBadge">سکوت</span>
      <span class="tone-chip" data-p="emoChip">احساس: Neutral</span>
      <span class="tone-chip" data-p="gestChip">ژست: —</span>
      <span class="tone-chip mono-num" dir="ltr" data-p="physChip">ζ=${computeDampingRatio(cur.spring).toFixed(2)} · vol=1.000</span>
    </div>
  `;
  rootSec.appendChild(meterCard);
  activePuppetMeterEls = {
    loudFill: meterCard.querySelector('[data-p="loudFill"]'),
    loudVal: meterCard.querySelector('[data-p="loudVal"]'),
    pitchMarker: meterCard.querySelector('[data-p="pitchMarker"]'),
    pitchVal: meterCard.querySelector('[data-p="pitchVal"]'),
    empBadge: meterCard.querySelector('[data-p="empBadge"]'),
    emoChip: meterCard.querySelector('[data-p="emoChip"]'),
    gestChip: meterCard.querySelector('[data-p="gestChip"]'),
    physChip: meterCard.querySelector('[data-p="physChip"]'),
  };

  const micToggleBtn = meterCard.querySelector('[data-p="micToggleBtn"]');
  const micStatusBadge = meterCard.querySelector('[data-p="micStatusBadge"]');
  const micDeviceSel = meterCard.querySelector('[data-p="micDeviceSel"]');
  const micGainInp = meterCard.querySelector('[data-p="micGainInp"]');
  const micGainOut = meterCard.querySelector('[data-p="micGainOut"]');
  const micGateInp = meterCard.querySelector('[data-p="micGateInp"]');
  const micGateOut = meterCard.querySelector('[data-p="micGateOut"]');
  const micAgcChk = meterCard.querySelector('[data-p="micAgcChk"]');
  const micNotice = meterCard.querySelector('[data-p="micNotice"]');

  const populateMicDevices = async () => {
    if (!LM || !LM.listAudioInputDevices || !micDeviceSel) return;
    const list = await LM.listAudioInputDevices();
    const prev = micDeviceSel.value || savedMic.deviceId || "";
    micDeviceSel.innerHTML = `<option value="">میکروفن پیش‌فرض سیستم (Default Mic)</option>`;
    list.forEach((d) => {
      const o = document.createElement("option");
      o.value = d.deviceId;
      o.textContent = d.label;
      micDeviceSel.appendChild(o);
    });
    if (prev && list.some((d) => d.deviceId === prev)) micDeviceSel.value = prev;
  };
  void populateMicDevices();

  const syncMicBarUi = (st = {}) => {
    const running = st.running !== undefined ? Boolean(st.running) : isEditorLiveMicRunning();
    if (micToggleBtn) {
      micToggleBtn.classList.toggle("is-live", running);
      micToggleBtn.textContent = running ? "⏹ توقف میکروفن زنده ●" : "🎙️ روشن کردن میکروفن زنده (Live Mic)";
    }
    if (micStatusBadge) {
      micStatusBadge.classList.toggle("is-live", running && !st.error);
      micStatusBadge.classList.toggle("is-err", Boolean(st.error));
      micStatusBadge.textContent = st.error ? "خطا" : (running ? "● زنده" : "خاموش");
    }
    if (micNotice) {
      if (st.error) {
        micNotice.classList.remove("hidden", "is-warn");
        micNotice.textContent = st.error.fa || st.error.en || "خطا در میکروفن";
      } else if (st.suspended) {
        micNotice.classList.remove("hidden");
        micNotice.classList.add("is-warn");
        micNotice.textContent = "صدای مرورگر معلق است — یک‌بار روی صفحه کلیک کنید تا میکروفن فعال شود.";
      } else if (st.silentWarning) {
        micNotice.classList.remove("hidden");
        micNotice.classList.add("is-warn");
        micNotice.textContent = "صدایی از میکروفن انتخاب‌شده دریافت نمی‌شود — میکروفن دیگری انتخاب کنید یا تقویت (Gain) را بیشتر کنید.";
      } else {
        micNotice.classList.add("hidden");
        micNotice.textContent = "";
      }
    }
  };
  editorMicUiListeners.add(syncMicBarUi);
  syncMicBarUi({ running: isEditorLiveMicRunning() });

  if (micToggleBtn) {
    micToggleBtn.addEventListener("click", async () => {
      const res = await toggleEditorLiveMic({
        deviceId: micDeviceSel ? micDeviceSel.value : "",
        inputGain: parseFloat(micGainInp.value) || 1.8,
        noiseGateDb: parseFloat(micGateInp.value) || -56,
        autoGainControl: Boolean(micAgcChk && micAgcChk.checked),
      });
      await populateMicDevices();
      if (res && !res.ok && res.error) {
        syncMicBarUi({ running: false, error: res.error });
        setStatus(res.error.fa || "خطا در میکروفن");
      } else if (isEditorLiveMicRunning()) {
        setStatus("میکروفن زنده فعال شد — صحبت کنید تا بلندی صدا و عروسک حرکت کنند 🎙️");
      } else {
        setStatus("میکروفن زنده متوقف شد");
      }
    });
  }
  if (micGainInp) {
    micGainInp.addEventListener("input", () => {
      const g = clamp(parseFloat(micGainInp.value) || 1.8, 0.5, 6.0);
      if (micGainOut) micGainOut.textContent = `${g.toFixed(1)}×`;
      updateEditorLiveMicConfig({ inputGain: g });
    });
  }
  if (micGateInp) {
    micGateInp.addEventListener("input", () => {
      const db = clamp(parseFloat(micGateInp.value) || -56, -72, -20);
      if (micGateOut) micGateOut.textContent = `${db} dB`;
      updateEditorLiveMicConfig({ noiseGateDb: db });
    });
  }
  if (micAgcChk) {
    micAgcChk.addEventListener("change", async () => {
      updateEditorLiveMicConfig({ autoGainControl: micAgcChk.checked });
      if (isEditorLiveMicRunning()) {
        stopEditorLiveMic();
        await toggleEditorLiveMic({ autoGainControl: micAgcChk.checked });
      }
    });
  }
  if (micDeviceSel) {
    micDeviceSel.addEventListener("change", async () => {
      updateEditorLiveMicConfig({ deviceId: micDeviceSel.value });
      if (isEditorLiveMicRunning()) {
        stopEditorLiveMic();
        await toggleEditorLiveMic({ deviceId: micDeviceSel.value });
      }
    });
  }

  /* ---------------- 4. Quick Emotion (15) & Gesture (9) Controls (Phase 2 Items 5–6) */
  const actBox = document.createElement("div");
  actBox.className = "float-divider-group";
  actBox.innerHTML = `
    <div class="override-head">
      <span>احساس و ژست سریع</span>
      <span class="bilingual-sub">15 Emotions · 9 Gestures</span>
    </div>
  `;

  const emoRow = document.createElement("div");
  emoRow.className = "puppet-inline-row";
  const emoSel = document.createElement("select");
  emoSel.className = "select-ctrl compact";
  Object.keys(EXPRESSIONS).forEach((ek) => {
    const o = document.createElement("option");
    o.value = ek;
    o.textContent = `${EXPRESSIONS[ek].label} (${EXPRESSIONS[ek].labelEn || ek})`;
    emoSel.appendChild(o);
  });
  emoSel.value = cur.emotion || slide.expression || "neutral";
  emoSel.addEventListener("change", () => {
    cur.emotion = emoSel.value;
    slide.expression = emoSel.value;
    commit(cur, false);
  });

  const autoEmoLbl = document.createElement("label");
  autoEmoLbl.className = "toggle-chip";
  const autoEmoChk = document.createElement("input");
  autoEmoChk.type = "checkbox";
  autoEmoChk.checked = Boolean(cur.autoEmotion);
  autoEmoChk.addEventListener("change", () => {
    cur.autoEmotion = autoEmoChk.checked;
    commit(cur, false);
  });
  autoEmoLbl.append(autoEmoChk, document.createTextNode("احساس خودکار از صدا (Auto)"));
  emoRow.append(emoSel, autoEmoLbl);
  actBox.appendChild(emoRow);

  actBox.appendChild(mkSliderRow({
    label: "شدت احساس (Emotion Intensity)",
    min: 0, max: 1.5, step: 0.05,
    value: cur.emotionIntensity ?? 1.0,
    fmt: (v) => `${Math.round(v * 100)}%`,
    onChange: (v) => { cur.emotionIntensity = v; commit(cur, false); },
  }).row);

  const gestChips = document.createElement("div");
  gestChips.className = "btn-row-wrap";
  Object.keys(GESTURES).forEach((gk) => {
    const gBtn = document.createElement("button");
    gBtn.type = "button";
    gBtn.className = "icon-btn";
    gBtn.title = `افزودن ژست ${GESTURES[gk].labelEn} در زمان فعلی`;
    gBtn.textContent = `+ ${GESTURES[gk].label}`;
    gBtn.addEventListener("click", () => {
      const tNow = +Math.max(0, Number(currentTime) || 0.4).toFixed(2);
      cur.gestures = (cur.gestures || []).concat([{
        t: tNow,
        gesture: gk,
        duration: GESTURES[gk].defaultDur,
        offset: 0,
        intensity: 1.0,
      }]);
      commit(cur, true);
      setStatus(`ژست «${GESTURES[gk].label}» در ثانیه ${tNow} اضافه شد ✓`);
    });
    gestChips.appendChild(gBtn);
  });
  actBox.appendChild(gestChips);
  rootSec.appendChild(actBox);

  /* ---------------- ADVANCED 1: 18-Part Tree & Accessories (Phase 1 Item 1 & 2) */
  const partsDet = document.createElement("details");
  partsDet.className = "tone-advanced";
  partsDet.innerHTML = `<summary>درخت ۱۸ بخش عروسک و اکسسوری‌ها (Advanced · Parts Tree)</summary>`;
  const partsBody = document.createElement("div");
  partsBody.className = "tone-advanced-body";

  const partSel = document.createElement("select");
  partSel.className = "select-ctrl compact";
  Object.keys(PUPPET_PARTS).forEach((pk) => {
    const o = document.createElement("option");
    o.value = pk;
    const visMark = cur.parts[pk] && cur.parts[pk].visible === false ? " [مخفی]" : "";
    o.textContent = `${PUPPET_PARTS[pk].label} (${PUPPET_PARTS[pk].labelEn})${visMark}`;
    partSel.appendChild(o);
  });
  if (!PUPPET_PARTS[activeSelectedPart]) activeSelectedPart = "head";
  partSel.value = activeSelectedPart;
  partsBody.appendChild(partSel);

  const partCtrlBox = document.createElement("div");
  partCtrlBox.className = "tone-advanced-body";
  const renderPartFields = () => {
    partCtrlBox.innerHTML = "";
    const pk = activeSelectedPart;
    const p = cur.parts[pk];
    const def = PUPPET_PARTS[pk] || {};
    if (!p) return;

    const topRow = document.createElement("div");
    topRow.className = "puppet-inline-row";

    const visLbl = document.createElement("label");
    visLbl.className = "toggle-chip";
    const visChk = document.createElement("input");
    visChk.type = "checkbox";
    visChk.checked = p.visible !== false;
    visChk.addEventListener("change", () => {
      p.visible = visChk.checked;
      commit(cur, false);
    });
    visLbl.append(visChk, document.createTextNode("نمایش بخش (Visible)"));

    const colLbl = document.createElement("label");
    colLbl.className = "puppet-color-chip";
    colLbl.textContent = cur.paletteLock ? "رنگ (قفل برند)" : "رنگ سفارشی";
    const colInp = document.createElement("input");
    colInp.type = "color";
    colInp.value = p.color || cur.palette.redPrimary || "#EB1818";
    colInp.disabled = Boolean(cur.paletteLock);
    colInp.addEventListener("input", () => {
      p.color = colInp.value.toUpperCase();
      commit(cur, false);
    });
    colLbl.appendChild(colInp);
    topRow.append(visLbl, colLbl);
    partCtrlBox.appendChild(topRow);

    const sliders = [
      { key: "x", label: "جابه‌جایی افقی X", min: -120, max: 120, step: 1, fmt: (v) => `${v}px` },
      { key: "y", label: "جابه‌جایی عمودی Y", min: -120, max: 120, step: 1, fmt: (v) => `${v}px` },
      { key: "rotation", label: "چرخش (Rotation)", min: -60, max: 60, step: 1, fmt: (v) => `${v}°` },
      { key: "scaleX", label: "مقیاس افقی (Scale X)", min: 0.4, max: 2.0, step: 0.02, fmt: (v) => `${v.toFixed(2)}×` },
      { key: "scaleY", label: "مقیاس عمودی (Scale Y)", min: 0.4, max: 2.0, step: 0.02, fmt: (v) => `${v.toFixed(2)}×` },
      { key: "pivotX", label: "مرکز چرخش X (Pivot X)", min: 0, max: 640, step: 2, fmt: (v) => `${v}` },
      { key: "pivotY", label: "مرکز چرخش Y (Pivot Y)", min: 0, max: 720, step: 2, fmt: (v) => `${v}` },
      { key: "zOrder", label: "ترتیب لایه (Z-Order)", min: -5, max: 20, step: 1, fmt: (v) => `${Math.round(v)}` },
      { key: "outlineWidth", label: "ضخامت خط دور (Outline)", min: 0, max: 2.5, step: 0.1, fmt: (v) => `${v.toFixed(1)}×` },
    ];
    sliders.forEach((s) => {
      partCtrlBox.appendChild(mkSliderRow({
        label: s.label, min: s.min, max: s.max, step: s.step, value: p[s.key], fmt: s.fmt,
        onChange: (v) => { p[s.key] = v; commit(cur, false); },
      }).row);
    });

    const resetPartBtn = document.createElement("button");
    resetPartBtn.type = "button";
    resetPartBtn.className = "btn btn-sm btn-ghost";
    resetPartBtn.textContent = "بازنشانی این بخش (Reset Part)";
    resetPartBtn.addEventListener("click", () => {
      cur.parts[pk] = {
        x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1,
        pivotX: def.pivotX ?? 320, pivotY: def.pivotY ?? 360,
        zOrder: def.zOrder ?? 1, color: null, outlineWidth: 1.0, visible: true,
      };
      commit(cur, true);
    });
    partCtrlBox.appendChild(resetPartBtn);
  };
  partSel.addEventListener("change", () => {
    activeSelectedPart = partSel.value;
    renderPartFields();
  });
  renderPartFields();
  partsBody.appendChild(partCtrlBox);

  // Accessories toggles (Phase 4 Item 13 — all 13 costume & prop slots)
  const accHead = document.createElement("div");
  accHead.className = "override-head";
  accHead.innerHTML = `<span>اکسسوری‌ها و وسایل صحنه (۱۳ مورد)</span><span class="bilingual-sub">Accessories</span>`;
  partsBody.appendChild(accHead);

  const accRow = document.createElement("div");
  accRow.className = "btn-row-wrap";
  const accKeys = Object.keys(ACCESSORIES).length
    ? Object.keys(ACCESSORIES)
    : ["top_hat", "crown", "cap", "beanie", "glasses", "sunglasses", "monocle", "bowtie", "necktie", "scarf", "headphones", "mic", "coffee_mug"];
  accKeys.forEach((ak) => {
    const aSpec = ACCESSORIES[ak];
    const albl = (aSpec && aSpec.label) ? aSpec.label : ak;
    const l = document.createElement("label");
    l.className = "toggle-chip";
    const c = document.createElement("input");
    c.type = "checkbox";
    c.dataset.puppetAccessory = ak;
    c.checked = (cur.accessories || []).includes(ak);
    c.addEventListener("change", () => {
      const set = new Set(cur.accessories || []);
      if (c.checked) set.add(ak); else set.delete(ak);
      cur.accessories = Array.from(set);
      commit(cur, false);
    });
    l.append(c, document.createTextNode(albl));
    accRow.appendChild(l);
  });
  partsBody.appendChild(accRow);
  partsDet.appendChild(partsBody);
  rootSec.appendChild(partsDet);

  /* ---------------- ADVANCED 2: Brand Palette & Palette Lock (Phase 1 Item 2 & Phase 4 Item 14) */
  const palDet = document.createElement("details");
  palDet.className = "tone-advanced";
  palDet.innerHTML = `<summary>پالت رنگ و قفل برند (Advanced · Palette & Lock)</summary>`;
  const palBody = document.createElement("div");
  palBody.className = "tone-advanced-body";

  const lockLbl = document.createElement("label");
  lockLbl.className = "toggle-chip";
  const lockChk = document.createElement("input");
  lockChk.type = "checkbox";
  lockChk.checked = cur.paletteLock !== false;
  lockChk.addEventListener("change", () => {
    cur.paletteLock = lockChk.checked;
    if (cur.paletteLock) {
      cur.palette = resolveCharPalette(cur.character || "red_eagle", cur.skin || "classic");
    }
    commit(cur, true);
  });
  lockLbl.append(lockChk, document.createTextNode("قفل پالت رسمی شخصیت/پوسته (Brand Palette Lock)"));
  palBody.appendChild(lockLbl);

  const palGrid = document.createElement("div");
  palGrid.className = "puppet-palette-grid";
  [
    ["redPrimary", "رنگ اصلی (Primary)"],
    ["chestBlack", "سینه (Chest)"],
    ["beakGold", "منقار/پوزه (Beak)"],
    ["outline", "خط دور (Outline)"],
    ["scleraWhite", "سفیدی چشم (Eye)"],
    ["tonguePink", "زبان (Tongue)"],
    ["sparkGold", "جرقه (Accent)"],
  ].forEach(([k, lbl]) => {
    const item = document.createElement("label");
    item.className = "puppet-color-chip";
    item.textContent = lbl;
    const inp = document.createElement("input");
    inp.type = "color";
    inp.value = cur.palette[k] || MASCOT_PALETTE[k] || "#EB1818";
    inp.disabled = Boolean(cur.paletteLock);
    inp.addEventListener("input", () => {
      cur.palette[k] = inp.value.toUpperCase();
      commit(cur, false);
    });
    item.appendChild(inp);
    palGrid.appendChild(item);
  });
  palBody.appendChild(palGrid);

  const resetPalBtn = document.createElement("button");
  resetPalBtn.type = "button";
  resetPalBtn.className = "btn btn-sm btn-ghost";
  resetPalBtn.textContent = "بازگردانی رنگ‌های رسمی (Reset Palette)";
  resetPalBtn.addEventListener("click", () => {
    cur.palette = resolveCharPalette(cur.character || "red_eagle", cur.skin || "classic");
    cur.paletteLock = true;
    commit(cur, true);
  });
  palBody.appendChild(resetPalBtn);
  palDet.appendChild(palBody);
  rootSec.appendChild(palDet);

  /* ---------------- ADVANCED 3: Gains, Spring Physics, Secondary Motion & Limits (Phase 1 Item 2 & Phase 2 Item 8) */
  const physDet = document.createElement("details");
  physDet.className = "tone-advanced";
  physDet.innerHTML = `<summary>گِین‌ها، فنر (Stiffness/Damping/Mass)، حرکت ثانویه و محدودیت‌ها (Advanced)</summary>`;
  const physBody = document.createElement("div");
  physBody.className = "tone-advanced-body";

  // 8 Tone Gains
  [
    ["mouthGain", "گِین دهان (Mouth Gain)", 0, 2, 0.05, (v) => `${v.toFixed(2)}×`],
    ["browGain", "گِین ابرو (Brow Gain)", 0, 2, 0.05, (v) => `${v.toFixed(2)}×`],
    ["headGain", "گِین سر (Head Gain)", 0, 2, 0.05, (v) => `${v.toFixed(2)}×`],
    ["chestGain", "گِین سینه (Chest Gain)", 0, 2, 0.05, (v) => `${v.toFixed(2)}×`],
    ["wingGain", "گِین بال (Wing Gain)", 0, 2, 0.05, (v) => `${v.toFixed(2)}×`],
    ["blinkRate", "نرخ پلک‌زدن (Blink Rate)", 0.3, 2, 0.05, (v) => `${v.toFixed(2)}×`],
    ["idleSway", "نوسان سکوت (Idle Sway)", 0, 2, 0.05, (v) => `${v.toFixed(2)}×`],
  ].forEach(([k, l, mn, mx, st, fm]) => {
    physBody.appendChild(mkSliderRow({
      label: l, min: mn, max: mx, step: st, value: cur.tone[k], fmt: fm,
      onChange: (v) => { cur.tone[k] = v; commit(cur, false); },
    }).row);
  });

  // Spring Physics: stiffness, damping, mass + live zeta badge
  const zBadge = document.createElement("div");
  zBadge.className = "panel-hint mono-num";
  const updateZBadge = () => {
    const z = computeDampingRatio(cur.spring);
    const kind = z < 0.92 ? "جهشی (Underdamped)" : z > 1.08 ? "سنگین (Overdamped)" : "میراشدگی بحرانی (Critical)";
    zBadge.textContent = `نسبت میرایی فنر ζ = ${z.toFixed(2)} — ${kind}`;
  };
  updateZBadge();
  physBody.appendChild(zBadge);

  [
    ["stiffness", "سختی فنر (Stiffness k)", 40, 600, 5, (v) => `${Math.round(v)}`],
    ["damping", "میرایی فنر (Damping c)", 4, 65, 1, (v) => `${Math.round(v)}`],
    ["mass", "جرم فنر (Mass m)", 0.25, 4.0, 0.05, (v) => `${v.toFixed(2)} kg`],
  ].forEach(([k, l, mn, mx, st, fm]) => {
    physBody.appendChild(mkSliderRow({
      label: l, min: mn, max: mx, step: st, value: cur.spring[k], fmt: fm,
      onChange: (v) => { cur.spring[k] = v; updateZBadge(); commit(cur, false); },
    }).row);
  });

  // Secondary Motion (Phase 2 Item 8)
  [
    ["featherJiggle", "لرزش پرها (Feather Jiggle)", 0, 2.0, 0.05, (v) => `${v.toFixed(2)}×`],
    ["crestOverlap", "دنباله‌روی تاج بال (Crest Overlap)", 0, 2.0, 0.05, (v) => `${v.toFixed(2)}×`],
    ["wingFollowThrough", "تداوم حرکت بال (Wing Follow)", 0, 2.0, 0.05, (v) => `${v.toFixed(2)}×`],
  ].forEach(([k, l, mn, mx, st, fm]) => {
    physBody.appendChild(mkSliderRow({
      label: l, min: mn, max: mx, step: st, value: cur.secondary[k], fmt: fm,
      onChange: (v) => { cur.secondary[k] = v; commit(cur, false); },
    }).row);
  });

  const volLbl = document.createElement("label");
  volLbl.className = "toggle-chip";
  const volChk = document.createElement("input");
  volChk.type = "checkbox";
  volChk.checked = cur.secondary.squashPreserveVolume !== false;
  volChk.addEventListener("change", () => {
    cur.secondary.squashPreserveVolume = volChk.checked;
    commit(cur, false);
  });
  volLbl.append(volChk, document.createTextNode("حفظ حجم در کشش و فشردگی (Volume-Preserving Squash)"));
  physBody.appendChild(volLbl);

  // Anatomical Limits
  [
    ["mouthMax", "حداکثر بازشدن دهان (Mouth Max)", 0.2, 1.0, 0.05, (v) => `${Math.round(v * 100)}%`],
    ["browYMin", "حد بالا رفتن ابرو (Brow Rise Max)", -28, -4, 1, (v) => `${v}px`],
    ["headTiltMax", "حد کج شدن سر (Head Tilt Max)", 3, 20, 1, (v) => `${v}°`],
    ["headNodMax", "حد تکان سر (Head Nod Max)", 3, 22, 1, (v) => `${v}px`],
    ["chestBounceMax", "حد جهش سینه (Chest Bounce Max)", 2, 16, 1, (v) => `${v}px`],
    ["wingAngleMax", "حد چرخش بال (Wing Angle Max)", 5, 36, 1, (v) => `${v}°`],
  ].forEach(([k, l, mn, mx, st, fm]) => {
    physBody.appendChild(mkSliderRow({
      label: l, min: mn, max: mx, step: st, value: cur.limits[k], fmt: fm,
      onChange: (v) => {
        cur.limits[k] = v;
        if (k === "headTiltMax") cur.limits.headTiltMin = -v;
        if (k === "headNodMax") cur.limits.headNodMin = -v;
        if (k === "chestBounceMax") cur.limits.chestBounceMin = -v;
        if (k === "wingAngleMax") cur.limits.wingAngleMin = -v;
        commit(cur, false);
      },
    }).row);
  });

  physDet.appendChild(physBody);
  rootSec.appendChild(physDet);

  /* ---------------- ADVANCED 4: Keyframes, Per-Sentence Overrides, Gaze & Gesture Timeline (Phase 1 Item 4 + Phase 2 Items 6–7) */
  const tlDet = document.createElement("details");
  tlDet.className = "tone-advanced";
  tlDet.innerHTML = `<summary>کی‌فریم لحن، تنظیمات جمله‌ای، نگاه و خط زمان ژست‌ها (Advanced · Timeline)</summary>`;
  const tlBody = document.createElement("div");
  tlBody.className = "tone-advanced-body";

  // Gaze controls (Phase 2 Item 7)
  const gazeSel = document.createElement("select");
  gazeSel.className = "select-ctrl compact";
  [
    ["auto", "نگاه خودکار (Auto)"],
    ["camera", "دوربین (Camera)"],
    ["slide", "کارت اسلاید (Slide)"],
    ["other", "شخصیت مقابل (Other)"],
    ["left", "چپ (Left)"],
    ["right", "راست (Right)"],
    ["up", "بالا (Up)"],
    ["down", "پایین (Down)"],
  ].forEach(([v, l]) => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = l;
    gazeSel.appendChild(o);
  });
  gazeSel.value = typeof cur.gaze.target === "string" ? cur.gaze.target : "auto";
  gazeSel.addEventListener("change", () => {
    cur.gaze.target = gazeSel.value;
    commit(cur, false);
  });
  tlBody.appendChild(gazeSel);

  tlBody.appendChild(mkSliderRow({
    label: "تعقیب نرم چشم (Smooth Pursuit)", min: 2, max: 30, step: 1,
    value: cur.gaze.smoothPursuit ?? 10, fmt: (v) => `${Math.round(v)} Hz`,
    onChange: (v) => { cur.gaze.smoothPursuit = v; commit(cur, false); },
  }).row);
  tlBody.appendChild(mkSliderRow({
    label: "مقیاس ساکاد چشم (Saccades)", min: 0, max: 2, step: 0.05,
    value: cur.gaze.saccadeScale ?? 1.0, fmt: (v) => `${v.toFixed(2)}×`,
    onChange: (v) => { cur.gaze.saccadeScale = v; commit(cur, false); },
  }).row);

  // Keyframed Tone Curves (Phase 1 Item 4)
  const kfTitle = document.createElement("div");
  kfTitle.className = "override-head";
  kfTitle.innerHTML = `<span>منحنی کی‌فریم گِین‌ها (Keyframed Tone Curves)</span>`;
  tlBody.appendChild(kfTitle);

  const previewChannel = (cur.keyframes && cur.keyframes.length) ? cur.keyframes[0].gain : "mouthGain";
  const kfGraphWrap = document.createElement("div");
  kfGraphWrap.innerHTML = renderKeyframeSvg(cur.keyframes, previewChannel, duration);
  tlBody.appendChild(kfGraphWrap);

  (cur.keyframes || []).forEach((kf, idx) => {
    const row = document.createElement("div");
    row.className = "puppet-kf-row";
    const tIn = document.createElement("input");
    tIn.type = "number"; tIn.step = "0.1"; tIn.min = "0"; tIn.dir = "ltr";
    tIn.className = "text-input compact"; tIn.value = String(kf.t);
    tIn.addEventListener("change", () => { kf.t = Math.max(0, Number(tIn.value) || 0); commit(cur, true); });

    const gSel = document.createElement("select");
    gSel.className = "select-ctrl compact";
    ["mouthGain", "browGain", "headGain", "chestGain", "wingGain", "emotionIntensity", "stiffness"].forEach((gn) => {
      const o = document.createElement("option"); o.value = gn; o.textContent = gn; gSel.appendChild(o);
    });
    gSel.value = kf.gain;
    gSel.addEventListener("change", () => { kf.gain = gSel.value; commit(cur, true); });

    const vIn = document.createElement("input");
    vIn.type = "number"; vIn.step = "0.1"; vIn.dir = "ltr";
    vIn.className = "text-input compact"; vIn.value = String(kf.value);
    vIn.addEventListener("change", () => { kf.value = Number(vIn.value) || 0; commit(cur, true); });

    const dBtn = document.createElement("button");
    dBtn.type = "button"; dBtn.className = "icon-btn danger"; dBtn.textContent = "✕";
    dBtn.addEventListener("click", () => { cur.keyframes.splice(idx, 1); commit(cur, true); });

    row.append(tIn, gSel, vIn, dBtn);
    tlBody.appendChild(row);
  });

  const addKfBtn = document.createElement("button");
  addKfBtn.type = "button";
  addKfBtn.className = "btn btn-sm btn-ghost";
  addKfBtn.textContent = "+ افزودن کی‌فریم در زمان فعلی (Add Keyframe)";
  addKfBtn.addEventListener("click", () => {
    const tNow = +Math.max(0, Number(currentTime) || 1.0).toFixed(2);
    cur.keyframes = (cur.keyframes || []).concat([{ t: tNow, gain: "mouthGain", value: 1.4, ease: "smooth" }]);
    commit(cur, true);
  });
  tlBody.appendChild(addKfBtn);

  // Per-Sentence Overrides (Phase 1 Item 4)
  const sentTitle = document.createElement("div");
  sentTitle.className = "override-head";
  sentTitle.style.marginTop = "6px";
  sentTitle.innerHTML = `<span>تنظیمات هر جمله (Per-Sentence Overrides)</span>`;
  tlBody.appendChild(sentTitle);

  const splitBtn = document.createElement("button");
  splitBtn.type = "button";
  splitBtn.className = "btn btn-sm btn-ghost";
  splitBtn.textContent = "✂️ تقسیم خودکار گفتار (Auto-Split Say)";
  splitBtn.addEventListener("click", () => {
    const txt = String(slide.say || slide.text || "").trim();
    const parts = txt ? txt.split(/(?<=[.!؟؛\n])\s+/).filter(Boolean) : ["جمله ۱", "جمله ۲"];
    const dur = Math.max(2, Number(duration) || 6);
    const step = dur / Math.max(1, parts.length);
    cur.sentences = parts.map((text, idx) => ({
      start: +(idx * step).toFixed(2),
      end: +((idx + 1) * step).toFixed(2),
      preset: cur.preset,
      emotion: cur.emotion || "neutral",
      text: text.slice(0, 60),
    }));
    commit(cur, true);
    setStatus(`${parts.length} بازهٔ جمله‌ای ساخته شد ✓`);
  });
  tlBody.appendChild(splitBtn);

  (cur.sentences || []).forEach((sent, idx) => {
    const card = document.createElement("div");
    card.className = "puppet-sentence-card";
    const row1 = document.createElement("div");
    row1.className = "puppet-kf-row";

    const stIn = document.createElement("input");
    stIn.type = "number"; stIn.step = "0.1"; stIn.dir = "ltr"; stIn.className = "text-input compact";
    stIn.value = String(sent.start);
    stIn.addEventListener("change", () => { sent.start = Math.max(0, Number(stIn.value) || 0); commit(cur, false); });

    const enIn = document.createElement("input");
    enIn.type = "number"; enIn.step = "0.1"; enIn.dir = "ltr"; enIn.className = "text-input compact";
    enIn.value = String(sent.end);
    enIn.addEventListener("change", () => { sent.end = Math.max(sent.start + 0.1, Number(enIn.value) || 1); commit(cur, false); });

    const pSel = document.createElement("select");
    pSel.className = "select-ctrl compact";
    Object.keys(TONE_PRESETS).forEach((pk) => {
      const o = document.createElement("option"); o.value = pk; o.textContent = pk; pSel.appendChild(o);
    });
    pSel.value = sent.preset || cur.preset;
    pSel.addEventListener("change", () => { sent.preset = pSel.value; commit(cur, false); });

    const delS = document.createElement("button");
    delS.type = "button"; delS.className = "icon-btn danger"; delS.textContent = "✕";
    delS.addEventListener("click", () => { cur.sentences.splice(idx, 1); commit(cur, true); });

    row1.append(stIn, enIn, pSel, delS);

    const row2 = document.createElement("div");
    row2.className = "puppet-inline-row";
    const eSel = document.createElement("select");
    eSel.className = "select-ctrl compact";
    Object.keys(EXPRESSIONS).forEach((ek) => {
      const o = document.createElement("option"); o.value = ek; o.textContent = EXPRESSIONS[ek].labelEn || ek; eSel.appendChild(o);
    });
    eSel.value = sent.emotion || "neutral";
    eSel.addEventListener("change", () => { sent.emotion = eSel.value; commit(cur, false); });

    const gSel = document.createElement("select");
    gSel.className = "select-ctrl compact";
    const noG = document.createElement("option"); noG.value = ""; noG.textContent = "بدون ژست"; gSel.appendChild(noG);
    Object.keys(GESTURES).forEach((gk) => {
      const o = document.createElement("option"); o.value = gk; o.textContent = GESTURES[gk].labelEn || gk; gSel.appendChild(o);
    });
    gSel.value = sent.gesture || "";
    gSel.addEventListener("change", () => {
      if (gSel.value) sent.gesture = gSel.value; else delete sent.gesture;
      commit(cur, false);
    });

    row2.append(eSel, gSel);
    card.append(row1, row2);
    tlBody.appendChild(card);
  });

  // Gesture timeline list
  if (cur.gestures && cur.gestures.length) {
    const gHead = document.createElement("div");
    gHead.className = "override-head";
    gHead.style.marginTop = "6px";
    gHead.innerHTML = `<span>خط زمان ژست‌ها (Gesture Timeline)</span>`;
    tlBody.appendChild(gHead);

    cur.gestures.forEach((g, idx) => {
      const row = document.createElement("div");
      row.className = "puppet-kf-row";
      const tIn = document.createElement("input");
      tIn.type = "number"; tIn.step = "0.1"; tIn.dir = "ltr"; tIn.className = "text-input compact";
      tIn.value = String(g.t);
      tIn.addEventListener("change", () => { g.t = Math.max(0, Number(tIn.value) || 0); commit(cur, false); });

      const nSel = document.createElement("select");
      nSel.className = "select-ctrl compact";
      Object.keys(GESTURES).forEach((gk) => {
        const o = document.createElement("option"); o.value = gk; o.textContent = GESTURES[gk].label; nSel.appendChild(o);
      });
      nSel.value = g.gesture;
      nSel.addEventListener("change", () => { g.gesture = nSel.value; commit(cur, false); });

      const offIn = document.createElement("input");
      offIn.type = "number"; offIn.step = "0.05"; offIn.dir = "ltr"; offIn.className = "text-input compact";
      offIn.value = String(g.offset ?? 0);
      offIn.title = "آفست زمانی (ثانیه)";
      offIn.addEventListener("change", () => { g.offset = clamp(Number(offIn.value) || 0, -1, 1); commit(cur, false); });

      const delG = document.createElement("button");
      delG.type = "button"; delG.className = "icon-btn danger"; delG.textContent = "✕";
      delG.addEventListener("click", () => { cur.gestures.splice(idx, 1); commit(cur, true); });

      row.append(tIn, nSel, offIn, delG);
      tlBody.appendChild(row);
    });
  }

  tlDet.appendChild(tlBody);
  rootSec.appendChild(tlDet);

  /* ---------------- ADVANCED 5: 10-Second Speaker Calibration Wizard (Phase 3 Item 10) */
  const calDet = document.createElement("details");
  calDet.className = "tone-advanced";
  calDet.innerHTML = `<summary>کالیبراسیون صدای گوینده — ۱۰ ثانیه (Advanced · Speaker Calibration)</summary>`;
  const calBody = document.createElement("div");
  calBody.className = "tone-advanced-body";

  const calPrompt = document.createElement("div");
  calPrompt.className = "muted-hint";
  calPrompt.textContent = "۱۰ ثانیه با صدای عادی صحبت کنید (یک جمله آرام، یک جمله پرانرژی، و ۲ ثانیه سکوت) تا زیر و بمی پایه، بازهٔ بلندی و نویز گیت به‌صورت خودکار تنظیم شوند.";
  calBody.appendChild(calPrompt);

  const calReadout = document.createElement("div");
  calReadout.className = "tone-meter-card";
  const calObj = cur.calibration || {};
  const renderCalReadout = (c) => {
    calReadout.innerHTML = `
      <div class="tone-meter-row">
        <span class="tone-meter-label">زیر و بمی پایه (Median F0)</span>
        <span class="tone-meter-val mono-num" dir="ltr">${Math.round(c.medianF0Hz || 165)} Hz (${Math.round(c.f0MinHz || 115)}–${Math.round(c.f0MaxHz || 240)})</span>
      </div>
      <div class="tone-meter-row">
        <span class="tone-meter-label">نویز گیت (Noise Gate / Floor)</span>
        <span class="tone-meter-val mono-num" dir="ltr">${Number(c.noiseGateDb ?? -46).toFixed(1)} dB / ${Number(c.noiseFloorDb ?? -56).toFixed(1)} dB</span>
      </div>
      <div class="tone-meter-row">
        <span class="tone-meter-label">بازهٔ بلندی (Loudness Range)</span>
        <span class="tone-meter-val mono-num" dir="ltr">${Number(c.loudnessMinDb ?? -42).toFixed(0)} → ${Number(c.loudnessMaxDb ?? -12).toFixed(0)} dB</span>
      </div>
    `;
  };
  renderCalReadout(calObj);
  calBody.appendChild(calReadout);

  const calProgWrap = document.createElement("div");
  calProgWrap.className = "tone-meter-bar";
  const calProgFill = document.createElement("div");
  calProgFill.className = "tone-meter-fill";
  calProgFill.style.width = "0%";
  calProgWrap.appendChild(calProgFill);
  calBody.appendChild(calProgWrap);

  const calBtns = document.createElement("div");
  calBtns.className = "btn-row-wrap";

  const applyCalibrationResult = (res) => {
    cur.calibration = Object.assign({}, cur.calibration || {}, res, { calibrated: true });
    try {
      localStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(cur.calibration));
    } catch (_) {}
    if (typeof BroadcastChannel === "function") {
      try {
        const bc = new BroadcastChannel("khordegir-obs-puppet");
        bc.postMessage({ type: "puppet:calibration", calibration: cur.calibration });
        bc.close();
      } catch (_) {}
    }
    renderCalReadout(cur.calibration);
    commit(cur, false);
    setStatus(`کالیبراسیون اعمال شد: F0=${Math.round(cur.calibration.medianF0Hz)}Hz · Gate=${cur.calibration.noiseGateDb}dB ✓`);
  };

  const btnRec10 = document.createElement("button");
  btnRec10.type = "button";
  btnRec10.className = "btn btn-sm btn-primary";
  btnRec10.textContent = "🎙️ شروع ضبط ۱۰ ثانیه‌ای (Record 10s)";
  btnRec10.addEventListener("click", async () => {
    if (calRecordingCancel) {
      calRecordingCancel();
      calRecordingCancel = null;
      btnRec10.textContent = "🎙️ شروع ضبط ۱۰ ثانیه‌ای (Record 10s)";
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus("میکروفن در این مرورگر در دسترس نیست؛ از فایل WAV استفاده کنید.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      const AC = window.AudioContext || window.webkitAudioContext;
      const ac = new AC();
      if (ac.state === "suspended") {
        try { await ac.resume(); } catch (_) {}
      }
      const src = ac.createMediaStreamSource(stream);
      const analyser = ac.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0;
      const silentGain = ac.createGain();
      silentGain.gain.value = 0;
      src.connect(analyser);
      analyser.connect(silentGain);
      silentGain.connect(ac.destination);

      const buf = new Float32Array(analyser.fftSize);
      const sampled = [];
      const startedAt = performance.now();
      const durationMs = 10000;
      let stopped = false;

      const finish = (apply) => {
        if (stopped) return;
        stopped = true;
        calRecordingCancel = null;
        try { stream.getTracks().forEach((tr) => tr.stop()); } catch (_) {}
        try { ac.close(); } catch (_) {}
        btnRec10.textContent = "🎙️ شروع ضبط ۱۰ ثانیه‌ای (Record 10s)";
        if (apply && computeSpeakerCal && sampled.length) {
          const elapsed = (performance.now() - startedAt) / 1000;
          const res = computeSpeakerCal(sampled, elapsed);
          applyCalibrationResult(res);
        }
      };

      calRecordingCancel = () => finish(false);
      btnRec10.textContent = "⏹ توقف ضبط (Stop)";

      const step = () => {
        if (stopped) return;
        const elapsed = performance.now() - startedAt;
        const pct = clamp((elapsed / durationMs) * 100, 0, 100);
        calProgFill.style.width = `${pct.toFixed(1)}%`;
        analyser.getFloatTimeDomainData(buf);
        let sq = 0;
        for (let i = 0; i < buf.length; i += 1) sq += buf[i] * buf[i];
        const rms = Math.sqrt(sq / buf.length);
        const db = rms > 1e-6 ? clamp(20 * Math.log10(rms), -80, 0) : -80;
        const f0Hz = db > -56 ? detectPitchYINEditor(buf, ac.sampleRate || 48000) : 0;
        sampled.push({ rms, db, f0Hz, pitchConf: f0Hz > 0 ? 0.85 : 0 });
        btnRec10.textContent = `⏹ در حال ضبط (${Math.ceil((durationMs - elapsed) / 1000)}s · ${db.toFixed(0)} dB)`;
        updatePuppetMeter({
          loudness: clamp((db + 62) / 52, 0, 1),
          db,
          f0Hz,
          pitchNorm: 0,
          emphasis: 0,
          isSpeaking: db > -52,
        });

        if (elapsed >= durationMs) {
          calProgFill.style.width = "100%";
          finish(true);
        } else {
          setTimeout(step, 33);
        }
      };
      step();
    } catch (err) {
      setStatus("خطا در دسترسی به میکروفن: " + err.message);
    }
  });

  const wavCalInput = document.createElement("input");
  wavCalInput.type = "file";
  wavCalInput.accept = "audio/*,.wav,.mp3,.ogg,.m4a";
  wavCalInput.className = "hidden";
  wavCalInput.addEventListener("change", async () => {
    const f = wavCalInput.files && wavCalInput.files[0];
    if (!f || !computeSpeakerCal) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      const ac = new AC();
      const arr = await f.arrayBuffer();
      const audioBuf = await ac.decodeAudioData(arr);
      const ch = audioBuf.getChannelData(0);
      const sr = audioBuf.sampleRate;
      const hop = Math.max(1, Math.round(sr / 30));
      const winSize = 1024;
      const frames = [];
      for (let pos = 0; pos + winSize <= ch.length; pos += hop) {
        const slice = ch.subarray(pos, pos + winSize);
        let sq = 0;
        for (let i = 0; i < winSize; i += 1) sq += slice[i] * slice[i];
        const rms = Math.sqrt(sq / winSize);
        const db = rms > 1e-6 ? clamp(20 * Math.log10(rms), -80, 0) : -80;
        const f0Hz = db > -52 ? detectPitchYINEditor(slice, sr) : 0;
        frames.push({ rms, db, f0Hz, pitchConf: f0Hz > 0 ? 0.85 : 0 });
      }
      try { ac.close(); } catch (_) {}
      calProgFill.style.width = "100%";
      applyCalibrationResult(computeSpeakerCal(frames, audioBuf.duration));
    } catch (err) {
      setStatus("خطا در تحلیل فایل کالیبراسیون: " + err.message);
    }
  });

  const btnCalWav = document.createElement("button");
  btnCalWav.type = "button";
  btnCalWav.className = "btn btn-sm btn-ghost";
  btnCalWav.textContent = "📁 کالیبراسیون از فایل WAV";
  btnCalWav.addEventListener("click", () => wavCalInput.click());

  calBtns.append(btnRec10, btnCalWav, wavCalInput);
  calBody.appendChild(calBtns);

  calBody.appendChild(mkSliderRow({
    label: "زیر و بمی پایه دستی (Median F0 Hz)",
    min: 75, max: 420, step: 1,
    value: cur.calibration ? cur.calibration.medianF0Hz : 165,
    fmt: (v) => `${Math.round(v)} Hz`,
    onChange: (v) => {
      cur.calibration = Object.assign({}, cur.calibration || {}, { medianF0Hz: v, calibrated: true });
      renderCalReadout(cur.calibration);
      commit(cur, false);
    },
  }).row);

  calBody.appendChild(mkSliderRow({
    label: "آستانه حذف نویز (Noise Gate dB)",
    min: -64, max: -24, step: 0.5,
    value: cur.calibration ? cur.calibration.noiseGateDb : -46,
    fmt: (v) => `${v.toFixed(1)} dB`,
    onChange: (v) => {
      cur.calibration = Object.assign({}, cur.calibration || {}, { noiseGateDb: v, calibrated: true });
      renderCalReadout(cur.calibration);
      commit(cur, false);
    },
  }).row);

  calDet.appendChild(calBody);
  rootSec.appendChild(calDet);

  /* ---------------- ADVANCED 6: Live OBS Mode & MIDI / Stream Deck (Phase 3 Item 11) */
  const liveDet = document.createElement("details");
  liveDet.className = "tone-advanced";
  liveDet.innerHTML = `<summary>حالت زنده OBS، کلیدهای میانبر و MIDI (Advanced · Live OBS)</summary>`;
  const liveBody = document.createElement("div");
  liveBody.className = "tone-advanced-body";

  const liveCfg = cur.live || { noiseSuppression: true, pushToTalk: false, pttKey: "Space", showHud: false };
  cur.live = liveCfg;

  const mkLiveToggle = (txt, checked, onToggle) => {
    const lbl = document.createElement("label");
    lbl.className = "toggle-chip";
    const inp = document.createElement("input");
    inp.type = "checkbox";
    inp.checked = Boolean(checked);
    inp.addEventListener("change", () => onToggle(inp.checked));
    lbl.append(inp, document.createTextNode(txt));
    return lbl;
  };

  const liveToggles = document.createElement("div");
  liveToggles.className = "btn-row-wrap";
  liveToggles.append(
    mkLiveToggle("حذف نویز نرم‌افزاری (Noise Suppression)", liveCfg.noiseSuppression !== false, (v) => {
      cur.live.noiseSuppression = v;
      commit(cur, false);
    }),
    mkLiveToggle("فشار برای صحبت (Push-to-Talk: Space)", Boolean(liveCfg.pushToTalk), (v) => {
      cur.live.pushToTalk = v;
      commit(cur, false);
    }),
  );
  liveBody.appendChild(liveToggles);

  const hotkeyHint = document.createElement("div");
  hotkeyHint.className = "muted-hint";
  hotkeyHint.textContent = "کلیدهای OBS زنده: 1–0 احساس‌ها · Q–O ژست‌ها · Space برای PTT · H نمایش HUD و تاخیر (Latency). پشتیبانی آفلاین از Web MIDI (نت‌های 36–56، پدال CC64) و Stream Deck.";
  liveBody.appendChild(hotkeyHint);

  const btnExpLive = document.createElement("button");
  btnExpLive.type = "button";
  btnExpLive.className = "btn btn-sm btn-ghost";
  btnExpLive.textContent = "⬇️ دانلود پروفایل MIDI / Stream Deck (JSON)";
  btnExpLive.addEventListener("click", () => {
    const payload = {
      schema: "khordegir-obs-live-mapping",
      version: 1,
      hotkeys: DEFAULT_LIVE_HOTKEYS,
      midiMap: DEFAULT_MIDI_MAP,
      calibration: cur.calibration || null,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "khordegir-obs-midi-streamdeck.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus("پروفایل MIDI / Stream Deck دانلود شد ✓");
  });
  liveBody.appendChild(btnExpLive);

  liveDet.appendChild(liveBody);
  rootSec.appendChild(liveDet);

  /* ---------------- ADVANCED 7: Offline SVG Rig Importer & Timed Accessory Swaps (Phase 4 Item 13) */
  const rigDet = document.createElement("details");
  rigDet.className = "tone-advanced";
  rigDet.innerHTML = `<summary>ورود ریگ SVG و زمان‌بندی اکسسوری (Advanced · SVG Rig Importer & Swaps)</summary>`;
  const rigBody = document.createElement("div");
  rigBody.className = "tone-advanced-body";

  const rigHint = document.createElement("div");
  rigHint.className = "muted-hint";
  rigHint.textContent = "فایل SVG با لایه‌های نام‌گذاری‌شده (<g id=\"head\">، <g id=\"wing_l\"> یا نام فارسی مثل «سر»، «منقار_پایین») را وارد کنید تا پیوت‌ها خودکار محاسبه و روی درخت ۱۸ بخشی نگاشت شوند.";
  rigBody.appendChild(rigHint);

  const rigSummaryBox = document.createElement("div");
  rigSummaryBox.className = "panel-hint mono-num";
  rigSummaryBox.textContent = "هنوز فایل SVG بارگذاری نشده است.";
  rigBody.appendChild(rigSummaryBox);

  let lastParsedRig = null;
  const svgFileInp = document.createElement("input");
  svgFileInp.type = "file";
  svgFileInp.accept = ".svg,image/svg+xml";
  svgFileInp.className = "hidden";

  const btnApplyRig = document.createElement("button");
  btnApplyRig.type = "button";
  btnApplyRig.className = "btn btn-sm btn-primary";
  btnApplyRig.textContent = "اعمال به بخش‌های عروسک (Apply Rig)";
  btnApplyRig.disabled = true;
  btnApplyRig.addEventListener("click", () => {
    if (!lastParsedRig || !lastParsedRig.puppet || !lastParsedRig.puppet.parts) return;
    const nextParts = deepClone(cur.parts || {});
    Object.keys(lastParsedRig.puppet.parts).forEach((pk) => {
      nextParts[pk] = Object.assign({}, nextParts[pk] || {}, lastParsedRig.puppet.parts[pk]);
    });
    commit(Object.assign({}, cur, { parts: nextParts }), true);
    setStatus(`ریگ SVG با ${Number(lastParsedRig.matchedCount) || 0} لایه اعمال شد ✓`);
  });

  svgFileInp.addEventListener("change", async () => {
    const f = svgFileInp.files && svgFileInp.files[0];
    if (!f || !parseSvgRig) return;
    try {
      const txt = await f.text();
      const parsed = parseSvgRig(txt, cur.character || "red_eagle");
      lastParsedRig = parsed;
      const mCount = Number(parsed.matchedCount) || 0;
      const uCount = (parsed.unmatchedLayers || []).length;
      rigSummaryBox.textContent = `${f.name}: ${mCount}/18 لایه منطبق · ${uCount} لایه ناشناس · viewBox=${(parsed.viewBox || []).join("×")}`;
      btnApplyRig.disabled = mCount === 0;
      setStatus(`SVG تحلیل شد: ${mCount} بخش منطبق با پیوت خودکار ✓`);
    } catch (err) {
      rigSummaryBox.textContent = "خطا در تحلیل SVG: " + err.message;
      btnApplyRig.disabled = true;
    }
  });

  const btnImportSvg = document.createElement("button");
  btnImportSvg.type = "button";
  btnImportSvg.className = "btn btn-sm btn-ghost";
  btnImportSvg.textContent = "📐 انتخاب فایل SVG (Import SVG Rig)";
  btnImportSvg.addEventListener("click", () => svgFileInp.click());

  const rigBtnRow = document.createElement("div");
  rigBtnRow.className = "btn-row-wrap";
  rigBtnRow.append(btnImportSvg, btnApplyRig, svgFileInp);
  rigBody.appendChild(rigBtnRow);

  // Timed Accessory / Outfit Swap Cues
  const swapHead = document.createElement("div");
  swapHead.className = "override-head";
  swapHead.innerHTML = `<span>تعویض زمان‌بندی‌شده اکسسوری و لباس</span><span class="bilingual-sub">Accessory Timeline</span>`;
  rigBody.appendChild(swapHead);

  const swapHint = document.createElement("div");
  swapHint.className = "muted-hint";
  swapHint.textContent = "همچنین می‌توانید داخل متن گفتار (say) از تگ‌های [acc:top_hat,monocle] یا [outfit:formal] استفاده کنید.";
  rigBody.appendChild(swapHint);

  if (!Array.isArray(cur.accessoryTimeline)) cur.accessoryTimeline = [];
  cur.accessoryTimeline.forEach((cue, idx) => {
    const row = document.createElement("div");
    row.className = "puppet-kf-row";

    const tIn = document.createElement("input");
    tIn.type = "number"; tIn.step = "0.1"; tIn.min = "0"; tIn.dir = "ltr";
    tIn.className = "text-input compact"; tIn.value = String(cue.t ?? 0);
    tIn.addEventListener("change", () => { cue.t = Math.max(0, Number(tIn.value) || 0); commit(cur, true); });

    const outSel = document.createElement("select");
    outSel.className = "select-ctrl compact";
    const noneOpt = document.createElement("option");
    noneOpt.value = ""; noneOpt.textContent = "— لباس —";
    outSel.appendChild(noneOpt);
    Object.keys(OUTFITS).forEach((ok) => {
      const o = document.createElement("option");
      o.value = ok; o.textContent = OUTFITS[ok].labelEn || ok;
      outSel.appendChild(o);
    });
    outSel.value = cue.outfit || "";
    outSel.addEventListener("change", () => {
      cue.outfit = outSel.value || "";
      commit(cur, false);
    });

    const addInp = document.createElement("input");
    addInp.type = "text"; addInp.dir = "ltr";
    addInp.className = "text-input compact";
    addInp.placeholder = "+acc (e.g. glasses,mic)";
    addInp.value = Array.isArray(cue.add) ? cue.add.join(",") : "";
    addInp.addEventListener("change", () => {
      cue.add = addInp.value.split(",").map((s) => s.trim()).filter(Boolean);
      commit(cur, false);
    });

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn btn-sm btn-ghost";
    delBtn.textContent = "×";
    delBtn.addEventListener("click", () => {
      cur.accessoryTimeline.splice(idx, 1);
      commit(cur, true);
    });

    row.append(tIn, outSel, addInp, delBtn);
    rigBody.appendChild(row);
  });

  const btnAddSwap = document.createElement("button");
  btnAddSwap.type = "button";
  btnAddSwap.className = "btn btn-sm btn-ghost";
  btnAddSwap.textContent = `+ افزودن تعویض در t=${Number(currentTime || 0).toFixed(1)}s`;
  btnAddSwap.addEventListener("click", () => {
    cur.accessoryTimeline.push({
      t: Number((Number(currentTime) || 0).toFixed(2)),
      outfit: "",
      add: ["glasses"],
      remove: [],
    });
    cur.accessoryTimeline.sort((a, b) => a.t - b.t);
    commit(cur, true);
  });
  rigBody.appendChild(btnAddSwap);

  rigDet.appendChild(rigBody);
  rootSec.appendChild(rigDet);

  /* ---------------- ADVANCED 8: Shot Timeline, Parallax, 60fps & Debug Overlay (Phases 5–6 Items 15–19) */
  const camDet = document.createElement("details");
  camDet.className = "tone-advanced";
  camDet.innerHTML = `<summary>دوربین، پارالاکس، ۶۰ فریم و دیباگ (Advanced · Shot, 60fps & Debug)</summary>`;
  const camBody = document.createElement("div");
  camBody.className = "tone-advanced-body";

  const shotSpecNow = SHOT_PRESETS[curScene.shot] || SHOT_PRESETS.medium || { zoom: 1.0 };
  const maxPushAllowed = Math.max(0, +(STAGE_ZOOM_CAP - shotSpecNow.zoom).toFixed(3));
  camBody.appendChild(mkSliderRow({
    label: `پوش‌این نرم (Push-in · سقف ${STAGE_ZOOM_CAP}×)`,
    min: 0,
    max: Math.max(0.005, maxPushAllowed),
    step: 0.005,
    value: Math.min(maxPushAllowed, Number(curScene.pushIn) || 0),
    fmt: (v) => `+${v.toFixed(3)}×`,
    onChange: (v) => {
      cur.scene = Object.assign({}, curScene, { pushIn: Math.min(maxPushAllowed, v) });
      commit(cur, false);
    },
  }).row);

  camBody.appendChild(mkSliderRow({
    label: "شدت پارالاکس پس‌زمینه (Parallax Depth)",
    min: 0, max: 2.0, step: 0.05,
    value: Number(curScene.parallax ?? 1),
    fmt: (v) => `${v.toFixed(2)}×`,
    onChange: (v) => {
      cur.scene = Object.assign({}, curScene, { parallax: v });
      commit(cur, false);
    },
  }).row);

  camBody.appendChild(mkSliderRow({
    label: "شدت نورپردازی (Lighting Intensity)",
    min: 0, max: 1.5, step: 0.05,
    value: Number(curScene.lightingIntensity ?? 0.75),
    fmt: (v) => `${Math.round(v * 100)}%`,
    onChange: (v) => {
      cur.scene = Object.assign({}, curScene, { lightingIntensity: v });
      commit(cur, false);
    },
  }).row);

  // Shot Timeline Cues
  const shotTlHead = document.createElement("div");
  shotTlHead.className = "override-head";
  shotTlHead.innerHTML = `<span>زمان‌بندی نماها</span><span class="bilingual-sub">Shot Timeline</span>`;
  camBody.appendChild(shotTlHead);

  if (!Array.isArray(curScene.shotTimeline)) curScene.shotTimeline = [];
  curScene.shotTimeline.forEach((cue, idx) => {
    const row = document.createElement("div");
    row.className = "puppet-kf-row";
    const tIn = document.createElement("input");
    tIn.type = "number"; tIn.step = "0.1"; tIn.min = "0"; tIn.dir = "ltr";
    tIn.className = "text-input compact"; tIn.value = String(cue.t ?? 0);
    tIn.addEventListener("change", () => {
      cue.t = Math.max(0, Number(tIn.value) || 0);
      cur.scene = curScene;
      commit(cur, true);
    });

    const shSel = document.createElement("select");
    shSel.className = "select-ctrl compact";
    Object.keys(SHOT_PRESETS).forEach((sk) => {
      const o = document.createElement("option");
      o.value = sk; o.textContent = SHOT_PRESETS[sk].labelEn || sk;
      shSel.appendChild(o);
    });
    shSel.value = cue.shot || "medium";
    shSel.addEventListener("change", () => {
      cue.shot = shSel.value;
      cur.scene = curScene;
      commit(cur, false);
    });

    const delBtn = document.createElement("button");
    delBtn.type = "button"; delBtn.className = "btn btn-sm btn-ghost"; delBtn.textContent = "×";
    delBtn.addEventListener("click", () => {
      curScene.shotTimeline.splice(idx, 1);
      cur.scene = curScene;
      commit(cur, true);
    });

    row.append(tIn, shSel, delBtn);
    camBody.appendChild(row);
  });

  const btnAddShotCue = document.createElement("button");
  btnAddShotCue.type = "button";
  btnAddShotCue.className = "btn btn-sm btn-ghost";
  btnAddShotCue.textContent = `+ افزودن تغییر نما در t=${Number(currentTime || 0).toFixed(1)}s`;
  btnAddShotCue.addEventListener("click", () => {
    curScene.shotTimeline.push({
      t: Number((Number(currentTime) || 0).toFixed(2)),
      shot: curScene.shot === "close-up" ? "wide" : "close-up",
      pushIn: 0.02,
      blend: 0.55,
    });
    curScene.shotTimeline.sort((a, b) => a.t - b.t);
    cur.scene = curScene;
    commit(cur, true);
  });
  camBody.appendChild(btnAddShotCue);

  // Performance (60fps + Frame Cache) & Debug Overlay Flags
  const perf = Object.assign({ fps: 30, frameCache: true }, cur.performance || {});
  const dbg = Object.assign({ enabled: false, showPivots: true, showGraphs: true }, cur.debug || {});

  const perfRow = document.createElement("div");
  perfRow.className = "btn-row-wrap";

  const mkToggleChip = (txt, checked, onToggle) => {
    const lbl = document.createElement("label");
    lbl.className = "toggle-chip";
    const inp = document.createElement("input");
    inp.type = "checkbox";
    inp.checked = Boolean(checked);
    inp.addEventListener("change", () => onToggle(inp.checked));
    const sp = document.createElement("span");
    sp.textContent = txt;
    lbl.append(inp, sp);
    return lbl;
  };

  perfRow.append(
    mkToggleChip("پیش‌نمایش ۶۰ فریم (60 fps)", perf.fps === 60, (on) => {
      cur.performance = Object.assign({}, perf, { fps: on ? 60 : 30 });
      commit(cur, false);
      onDirtyReload(false, false);
    }),
    mkToggleChip("کش فریم قطعی (Frame Cache)", perf.frameCache !== false, (on) => {
      cur.performance = Object.assign({}, perf, { frameCache: on });
      commit(cur, false);
    }),
    mkToggleChip("لایه دیباگ (Debug HUD)", dbg.enabled, (on) => {
      cur.debug = Object.assign({}, dbg, { enabled: on });
      commit(cur, false);
    }),
    mkToggleChip("نقاط پیوت ۱۸گانه (Pivots)", dbg.showPivots !== false, (on) => {
      cur.debug = Object.assign({}, dbg, { showPivots: on });
      commit(cur, false);
    }),
    mkToggleChip("نمودار فنر و لحن (Graphs)", dbg.showGraphs !== false, (on) => {
      cur.debug = Object.assign({}, dbg, { showGraphs: on });
      commit(cur, false);
    })
  );
  camBody.appendChild(perfRow);

  camDet.appendChild(camBody);
  rootSec.appendChild(camDet);

  /* ---------------- ADVANCED 9: Custom Emotion & Gesture Plugin Studio (Phase 6 Item 22) */
  const plugDet = document.createElement("details");
  plugDet.className = "tone-advanced";
  plugDet.innerHTML = `<summary>پلاگین احساس و ژست سفارشی (Advanced · Plugin API)</summary>`;
  const plugBody = document.createElement("div");
  plugBody.className = "tone-advanced-body";

  const plugHint = document.createElement("div");
  plugHint.className = "muted-hint";
  plugHint.textContent = "احساس یا ژست اختصاصی بسازید تا مستقیماً در video.yaml (بخش puppet.plugins) ذخیره و با StageMascot.registerEmotion / registerGesture اجرا شود.";
  plugBody.appendChild(plugHint);

  const curPlugins = {
    emotions: Object.assign({}, (cur.plugins && cur.plugins.emotions) || {}),
    gestures: Object.assign({}, (cur.plugins && cur.plugins.gestures) || {}),
  };

  // List active custom emotions
  const customEmoKeys = Object.keys(curPlugins.emotions);
  const emoListRow = document.createElement("div");
  emoListRow.className = "btn-row-wrap";
  customEmoKeys.forEach((ek) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tone-preset-btn" + (cur.emotion === ek ? " active" : "");
    b.textContent = `★ ${curPlugins.emotions[ek].labelEn || ek}`;
    b.addEventListener("click", () => {
      commit(Object.assign({}, cur, { emotion: ek, plugins: curPlugins }), true);
      setStatus(`احساس پلاگین «${ek}» فعال شد ✓`);
    });
    emoListRow.appendChild(b);
  });
  if (customEmoKeys.length) plugBody.appendChild(emoListRow);

  const newEmoName = document.createElement("input");
  newEmoName.type = "text"; newEmoName.dir = "ltr";
  newEmoName.className = "text-input compact";
  newEmoName.placeholder = "emotion id (e.g. eureka)";

  const newEmoBrow = document.createElement("input");
  newEmoBrow.type = "number"; newEmoBrow.dir = "ltr"; newEmoBrow.step = "1";
  newEmoBrow.className = "text-input compact";
  newEmoBrow.value = "-12"; newEmoBrow.title = "browY (-18..14)";

  const btnAddPluginEmo = document.createElement("button");
  btnAddPluginEmo.type = "button";
  btnAddPluginEmo.className = "btn btn-sm btn-primary";
  btnAddPluginEmo.textContent = "+ ثبت احساس پلاگین";
  btnAddPluginEmo.addEventListener("click", () => {
    const id = String(newEmoName.value || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!id) {
      setStatus("لطفاً شناسه انگلیسی احساس (مثل eureka) وارد کنید.");
      return;
    }
    curPlugins.emotions[id] = {
      label: id,
      labelEn: id,
      browL: -10,
      browR: 10,
      browY: clamp(Number(newEmoBrow.value) || -10, -18, 14),
      upperLid: 0.0,
      lowerLid: 0.16,
      pupilScale: 1.12,
      headTilt: 5,
      accent: "sparkle",
    };
    commit(Object.assign({}, cur, { emotion: id, plugins: curPlugins }), true);
    setStatus(`پلاگین احساس «${id}» در video.yaml ثبت شد ✓`);
  });

  const plugEmoRow = document.createElement("div");
  plugEmoRow.className = "puppet-inline-row";
  plugEmoRow.append(newEmoName, newEmoBrow, btnAddPluginEmo);
  plugBody.appendChild(plugEmoRow);

  // Add custom gesture plugin
  const newGestName = document.createElement("input");
  newGestName.type = "text"; newGestName.dir = "ltr";
  newGestName.className = "text-input compact";
  newGestName.placeholder = "gesture id (e.g. victory-flap)";

  const btnAddPluginGest = document.createElement("button");
  btnAddPluginGest.type = "button";
  btnAddPluginGest.className = "btn btn-sm btn-ghost";
  btnAddPluginGest.textContent = "+ ثبت ژست پلاگین";
  btnAddPluginGest.addEventListener("click", () => {
    const id = String(newGestName.value || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!id) {
      setStatus("لطفاً شناسه انگلیسی ژست (مثل victory-flap) وارد کنید.");
      return;
    }
    curPlugins.gestures[id] = {
      label: id,
      labelEn: id,
      defaultDuration: 1.1,
      wingLRot: -26,
      wingRRot: 26,
      headNod: -5,
      bodyY: -12,
      accent: "sparkle",
    };
    const nextGests = (cur.gestures || []).concat([{ t: Number((Number(currentTime) || 0).toFixed(2)), type: id, duration: 1.1, intensity: 1.0 }]);
    commit(Object.assign({}, cur, { plugins: curPlugins, gestures: nextGests }), true);
    setStatus(`پلاگین ژست «${id}» ثبت و به خط زمان اضافه شد ✓`);
  });

  const plugGestRow = document.createElement("div");
  plugGestRow.className = "puppet-inline-row";
  plugGestRow.append(newGestName, btnAddPluginGest);
  plugBody.appendChild(plugGestRow);

  plugDet.appendChild(plugBody);
  rootSec.appendChild(plugDet);

  container.appendChild(rootSec);
}
