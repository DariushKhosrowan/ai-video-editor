/* Khordegir Studio — Offline RTL Editor Controller
   Single source of truth: reads & writes video.yaml via /api/projects/<name>.
   Preview == output: renders through /stage/stage.html iframe via postMessage. */
(function () {
  "use strict";

  const FA = "۰۱۲۳۴۵۶۷۸۹";
  const fa = (v) => String(v ?? "").replace(/[0-9]/g, (d) => FA[+d]);
  const FX_CAT = (window.Stage && window.Stage.fx && window.Stage.fx.CATALOG) || {
    presets: {},
    presetLabels: {},
    transitions: ["curtain-rtl", "accent-slash", "iris-rise", "soft-fade", "split-curtain", "diagonal-wipe", "zoom-iris", "shutter-bars"],
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
    activeIndex: 0,
    dirty: false,
    playing: false,
    duration: 6,
    currentTime: 0,
    fx: {},
    camOverlap: [],
    playTimer: null,
    playStartedAt: 0,
    playFrom: 0,
    loadDebounce: null,
    stageScale: 1,
    fieldBoxes: [],
    selectedField: null,
    dragSlideIndex: null,
    scriptMode: "new",
    scriptResult: null,
    presetCategory: "all",
    aiMode: "new",
    aiValidation: null,
    aiValidateTimer: null,
    projZoomDraft: null,
  };

  const els = {
    statusText: document.getElementById("statusText"),
    projectSelect: document.getElementById("projectSelect"),
    themeSelect: document.getElementById("themeSelect"),
    btnNewProject: document.getElementById("btnNewProject"),
    btnPresets: document.getElementById("btnPresets"),
    btnImportScript: document.getElementById("btnImportScript"),
    btnAiWriter: document.getElementById("btnAiWriter"),
    btnProjectStyle: document.getElementById("btnProjectStyle"),
    btnRandomAll: document.getElementById("btnRandomAll"),
    btnSave: document.getElementById("btnSave"),
    dirtyBadge: document.getElementById("dirtyBadge"),
    linkObs: document.getElementById("linkObs"),
    slidesCount: document.getElementById("slidesCount"),
    addTemplateSelect: document.getElementById("addTemplateSelect"),
    btnAddSlide: document.getElementById("btnAddSlide"),
    slidesList: document.getElementById("slidesList"),
    stageViewport: document.getElementById("stageViewport"),
    stageFrameBox: document.getElementById("stageFrameBox"),
    stageFrame: document.getElementById("stageFrame"),
    canvasOverlay: document.getElementById("canvasOverlay"),
    camOnlyOverlay: document.getElementById("camOnlyOverlay"),
    chkCanvasEdit: document.getElementById("chkCanvasEdit"),
    chkCamGuide: document.getElementById("chkCamGuide"),
    camStatusChip: document.getElementById("camStatusChip"),
    btnReroll: document.getElementById("btnReroll"),
    btnPlayPause: document.getElementById("btnPlayPause"),
    btnReplay: document.getElementById("btnReplay"),
    timeScrubber: document.getElementById("timeScrubber"),
    timeReadout: document.getElementById("timeReadout"),
    presetChip: document.getElementById("presetChip"),
    transitionChip: document.getElementById("transitionChip"),
    logoChip: document.getElementById("logoChip"),
    sayDurChip: document.getElementById("sayDurChip"),
    activeSlideBadge: document.getElementById("activeSlideBadge"),
    inspectorBody: document.getElementById("inspectorBody"),
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
    projSceneSelect: document.getElementById("projSceneSelect"),
    projLogoPosSelect: document.getElementById("projLogoPosSelect"),
    projSeedInput: document.getElementById("projSeedInput"),
    projLangSelect: document.getElementById("projLangSelect"),
    projLogoImageSelect: document.getElementById("projLogoImageSelect"),
    projLogoTextInput: document.getElementById("projLogoTextInput"),
    projLogoUpload: document.getElementById("projLogoUpload"),
    projCountSelect: document.getElementById("projCountSelect"),
    projCountStyleSelect: document.getElementById("projCountStyleSelect"),
    projCountFromSelect: document.getElementById("projCountFromSelect"),
    projMicroFxSelect: document.getElementById("projMicroFxSelect"),
    btnStyleModalReroll: document.getElementById("btnStyleModalReroll"),
    btnApplyStyleModal: document.getElementById("btnApplyStyleModal"),
    projZoomAdvanced: document.getElementById("projZoomAdvanced"),
    projZoomCountChip: document.getElementById("projZoomCountChip"),
    chkProjZoomPointsEnable: document.getElementById("chkProjZoomPointsEnable"),
    projZoomPointsList: document.getElementById("projZoomPointsList"),
    scriptModal: document.getElementById("scriptModal"),
    btnCloseScriptModal: document.getElementById("btnCloseScriptModal"),
    scriptProjectRow: document.getElementById("scriptProjectRow"),
    scriptProjectName: document.getElementById("scriptProjectName"),
    scriptTitleInput: document.getElementById("scriptTitleInput"),
    scriptInput: document.getElementById("scriptInput"),
    btnScriptSample: document.getElementById("btnScriptSample"),
    btnAnalyzeScript: document.getElementById("btnAnalyzeScript"),
    scriptPreviewWrap: document.getElementById("scriptPreviewWrap"),
    scriptStatsBar: document.getElementById("scriptStatsBar"),
    scriptPreviewList: document.getElementById("scriptPreviewList"),
    scriptImportErr: document.getElementById("scriptImportErr"),
    btnApplyScript: document.getElementById("btnApplyScript"),
    presetsModal: document.getElementById("presetsModal"),
    btnClosePresetsModal: document.getElementById("btnClosePresetsModal"),
    presetCustomTitle: document.getElementById("presetCustomTitle"),
    presetProjectName: document.getElementById("presetProjectName"),
    presetsGrid: document.getElementById("presetsGrid"),
    presetsErr: document.getElementById("presetsErr"),
    aiWriterModal: document.getElementById("aiWriterModal"),
    btnCloseAiModal: document.getElementById("btnCloseAiModal"),
    aiRegistryStats: document.getElementById("aiRegistryStats"),
    aiTopicInput: document.getElementById("aiTopicInput"),
    btnCopyAiGuide: document.getElementById("btnCopyAiGuide"),
    aiCopyStatus: document.getElementById("aiCopyStatus"),
    aiGuideDetails: document.getElementById("aiGuideDetails"),
    aiGuidePreview: document.getElementById("aiGuidePreview"),
    aiProjectRow: document.getElementById("aiProjectRow"),
    aiProjectName: document.getElementById("aiProjectName"),
    aiYamlInput: document.getElementById("aiYamlInput"),
    aiDiagnosticsWrap: document.getElementById("aiDiagnosticsWrap"),
    aiAutoFixBox: document.getElementById("aiAutoFixBox"),
    aiErrorsBox: document.getElementById("aiErrorsBox"),
    aiWarningsBox: document.getElementById("aiWarningsBox"),
    aiPreviewStats: document.getElementById("aiPreviewStats"),
    aiPreviewList: document.getElementById("aiPreviewList"),
    btnValidateAiYaml: document.getElementById("btnValidateAiYaml"),
    btnApplyAiYaml: document.getElementById("btnApplyAiYaml"),
  };

  /* ---------------------------------------------------------------- helpers */
  function setStatus(msg) {
    els.statusText.textContent = msg;
  }

  function setDirty(flag) {
    state.dirty = !!flag;
    els.btnSave.disabled = !state.dirty || !state.projectName;
    els.dirtyBadge.classList.toggle("hidden", !state.dirty);
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
    const s = String(val);
    if (/^(https?:|file:|data:|blob:|\/projects\/)/.test(s)) return s;
    const clean = s.replace(/^img\//, "");
    if (state.projectName) {
      return `/projects/${encodeURIComponent(state.projectName)}/img/${encodeURIComponent(clean)}`;
    }
    return s;
  }

  /* ---------------------------------------------------------------- frame format (landscape / portrait / square) */
  const FORMATS = { landscape: [1920, 1080], portrait: [1080, 1920], square: [1080, 1080] };
  const FORMAT_LABELS = { landscape: "افقی ۱۶:۹", portrait: "عمودی ۹:۱۶", square: "مربع ۱:۱" };
  const FORMAT_ALIASES = {
    horizontal: "landscape", wide: "landscape", "16:9": "landscape", "افقی": "landscape",
    vertical: "portrait", tall: "portrait", "9:16": "portrait", "عمودی": "portrait",
    "1:1": "square", "مربع": "square", "مربعی": "square",
  };
  function normFormat(v) {
    const k = String(v == null ? "" : v).trim().toLowerCase();
    if (FORMATS[k]) return k;
    return FORMAT_ALIASES[k] || "landscape";
  }
  function projectFormat() {
    return normFormat(state.data && state.data.format);
  }
  function effectiveFormat(slide) {
    return normFormat((slide && slide.format) || (state.data && state.data.format));
  }
  function stageDims() {
    return FORMATS[effectiveFormat(activeSlide())];
  }

  function buildStagePayload(slide, idx) {
    const copy = JSON.parse(JSON.stringify(slide || {}));
    const projSeed = (state.data && Number(state.data.seed)) || 0;
    copy._seed = `${state.projectName || "demo"}:${projSeed}:${idx + 1}`;
    copy._num = idx + 1;

    // Inherit project-level defaults unless slide overrides them
    if (state.data) {
      [
        "preset",
        "transition",
        "logo",
        "logo_motion",
        "logo_position",
        "logo_text",
        "lang",
        "count",
        "count_style",
        "count_from",
        "micro_fx",
        "format",
        "zoom_points",
        "scene",
      ].forEach((k) => {
        if (state.data[k] !== undefined && copy[k] === undefined) {
          copy[k] = JSON.parse(JSON.stringify(state.data[k]));
        }
      });
    }

    if (copy.image) copy.image = resolveImageUrl(copy.image);
    if (copy.src) copy.src = resolveImageUrl(copy.src);
    if (copy.bg_image) copy.bg_image = resolveImageUrl(copy.bg_image);
    if (typeof copy.logo === "string") copy.logo = resolveImageUrl(copy.logo);
    else if (copy.logo && typeof copy.logo === "object" && copy.logo.image) {
      copy.logo.image = resolveImageUrl(copy.logo.image);
    }
    return copy;
  }

  /* ---------------------------------------------------------------- stage viewport scaling & bridge */
  function resizeStage() {
    const vp = els.stageViewport;
    const vw = Math.max(240, vp.clientWidth - 32);
    const vh = Math.max(160, vp.clientHeight - 32);
    const [SW, SH] = stageDims();
    const scale = Math.min(vw / SW, vh / SH);
    state.stageScale = scale;
    state.stageW = SW; state.stageH = SH;
    const w = Math.floor(SW * scale);
    const h = Math.floor(SH * scale);
    els.stageFrame.style.width = SW + "px";
    els.stageFrame.style.height = SH + "px";
    els.stageFrameBox.style.width = w + "px";
    els.stageFrameBox.style.height = h + "px";
    els.stageFrame.style.transform = `scale(${scale})`;
  }

  function stopClock() {
    state.playing = false;
    clearInterval(state.playTimer);
    state.playTimer = null;
    els.btnPlayPause.textContent = "▶ پخش";
  }

  function startClock(fromSec) {
    stopClock();
    state.playing = true;
    state.playFrom = fromSec ?? state.currentTime;
    if (state.playFrom >= state.duration - 0.03) state.playFrom = 0;
    state.playStartedAt = performance.now();
    els.btnPlayPause.textContent = "⏸ توقف";

    postSeek(state.playFrom);
    state.playTimer = setInterval(() => {
      const elapsed = (performance.now() - state.playStartedAt) / 1000;
      const t = Math.min(state.duration, state.playFrom + elapsed);
      state.currentTime = t;
      updateTimeUI();
      postSeek(t);
      if (t >= state.duration) stopClock();
    }, 33);
  }

  function postSeek(t) {
    if (!els.stageFrame.contentWindow) return;
    els.stageFrame.contentWindow.postMessage({ cmd: "seek", t }, "*");
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
    els.camOnlyOverlay.classList.toggle("hidden", layout !== "CAM");

    document.querySelectorAll(".seg-btn[data-layout]").forEach((b) => {
      b.classList.toggle("active", b.dataset.layout === layout);
    });
    const fmt = effectiveFormat(slide);
    document.querySelectorAll(".seg-btn[data-format]").forEach((b) => {
      b.classList.toggle("active", b.dataset.format === fmt);
      b.classList.toggle("slide-own", b.dataset.format === fmt && !!slide.format && normFormat(slide.format) !== projectFormat());
    });
    resizeStage();

    const sayEst = estimateSay(slide);
    els.sayDurChip.textContent = sayEst ? `گفتار: ${fa(sayEst)} ثانیه` : "گفتار: ثبت نشده";

    if (layout === "CAM" || !els.stageFrame.contentWindow) return;
    const payload = buildStagePayload(slide, state.activeIndex);
    els.stageFrame.contentWindow.postMessage({
      cmd: "load",
      slide: payload,
      theme: resolvedThemeName(),
      camGuide: els.chkCamGuide.checked,
      at: autoPlay ? null : (atSec ?? state.currentTime),
    }, "*");
  }

  function scheduleReload(autoPlay = false) {
    clearTimeout(state.loadDebounce);
    state.loadDebounce = setTimeout(() => {
      reloadStage(autoPlay, autoPlay ? 0 : state.currentTime);
    }, 110);
  }

  function updateCamStatusUI(camList) {
    state.camOverlap = Array.isArray(camList) ? camList : [];
    if (state.camOverlap.length) {
      els.camStatusChip.textContent = `هشدار تداخل دوربین (${fa(state.camOverlap.length)})`;
      els.camStatusChip.className = "status-chip warn";
    } else {
      els.camStatusChip.textContent = "ناحیه دوربین آزاد";
      els.camStatusChip.className = "status-chip ok";
    }
  }

  function fieldLabelForKey(key) {
    const slide = activeSlide();
    if (!slide) return key;
    if (key === "logo") return "لوگو";
    const tpl = String(slide.template || "quote").replace(/-/g, "_");
    const schema = schemas[tpl];
    const f = schema && Array.isArray(schema.fields) && schema.fields.find((x) => x.key === key);
    return (f && f.label) || key;
  }

  function syncOverrideInputs(key, val) {
    document.querySelectorAll(`[data-ov-key="${key}"]`).forEach((inp) => {
      const prop = inp.dataset.ovProp;
      if (prop && val[prop] !== undefined) inp.value = String(val[prop]);
    });
  }

  function renderCanvasOverlay() {
    const ov = els.canvasOverlay;
    if (!ov) return;
    const slide = activeSlide();
    const layout = slide ? String(slide.layout || "SLIDE").toUpperCase() : "SLIDE";
    const enabled = Boolean(els.chkCanvasEdit && els.chkCanvasEdit.checked && slide && layout !== "CAM");
    ov.classList.toggle("active", enabled);
    ov.innerHTML = "";
    if (!enabled) return;

    if (layout === "SCAM" && els.chkCamGuide.checked) {
      const camBox = document.createElement("div");
      camBox.className = "canvas-cam-box";
      const SW = state.stageW || 1920, SH = state.stageH || 1080;
      const c = state.camRect || [24, 740, 584, 1055];
      camBox.style.left = `${(c[0] / SW) * 100}%`;
      camBox.style.top = `${(c[1] / SH) * 100}%`;
      camBox.style.width = `${((c[2] - c[0]) / SW) * 100}%`;
      camBox.style.height = `${((c[3] - c[1]) / SH) * 100}%`;
      camBox.textContent = "ناحیه امن دوربین (SCAM)";
      ov.appendChild(camBox);
    }

    (state.fieldBoxes || []).forEach((box) => {
      const r = box.rect;
      if (!r || r.w <= 0 || r.h <= 0) return;
      const el = document.createElement("div");
      el.className = "canvas-field" + (state.selectedField === box.key ? " selected" : "");
      el.dataset.fieldKey = box.key;
      const SW = state.stageW || 1920, SH = state.stageH || 1080;
      el.style.left = `${(r.x / SW) * 100}%`;
      el.style.top = `${(r.y / SH) * 100}%`;
      el.style.width = `${(r.w / SW) * 100}%`;
      el.style.height = `${(r.h / SH) * 100}%`;

      const lbl = document.createElement("div");
      lbl.className = "canvas-field-label";
      const cur = readOverride(slide, box.key);
      lbl.textContent = `${fieldLabelForKey(box.key)} (${fa(cur.x)}, ${fa(cur.y)} · ×${cur.scale})`;
      el.appendChild(lbl);

      const handle = document.createElement("div");
      handle.className = "canvas-resize-handle";
      handle.title = "کشیدن برای تغییر اندازه (Scale)";
      el.appendChild(handle);

      const startPointer = (e, mode) => {
        e.preventDefault();
        e.stopPropagation();
        state.selectedField = box.key;
        document.querySelectorAll(".canvas-field").forEach((n) => n.classList.toggle("selected", n === el));
        document.querySelectorAll(".override-card").forEach((c) => c.classList.toggle("selected", c.dataset.ovCard === box.key));

        const startX = e.clientX;
        const startY = e.clientY;
        const orig = readOverride(slide, box.key);
        const startLeftPct = parseFloat(el.style.left);
        const startTopPct = parseFloat(el.style.top);
        const startWPct = parseFloat(el.style.width);
        const startHPct = parseFloat(el.style.height);
        let moved = false;

        const onMove = (mv) => {
          const sc = state.stageScale || 0.5;
          const dxStage = (mv.clientX - startX) / sc;
          const dyStage = (mv.clientY - startY) / sc;
          if (Math.abs(dxStage) > 2 || Math.abs(dyStage) > 2) moved = true;

          let next;
          if (mode === "resize") {
            const delta = (-dxStage + dyStage) / 360;
            const nextScale = Math.max(0.4, Math.min(2.2, +(orig.scale + delta).toFixed(2)));
            next = { x: orig.x, y: orig.y, scale: nextScale };
            const ratio = nextScale / (orig.scale || 1);
            el.style.width = `${startWPct * ratio}%`;
            el.style.height = `${startHPct * ratio}%`;
          } else {
            next = {
              x: Math.max(-900, Math.min(900, Math.round(orig.x + dxStage))),
              y: Math.max(-540, Math.min(540, Math.round(orig.y + dyStage))),
              scale: orig.scale,
            };
            el.style.left = `${startLeftPct + ((next.x - orig.x) / (state.stageW || 1920)) * 100}%`;
            el.style.top = `${startTopPct + ((next.y - orig.y) / (state.stageH || 1080)) * 100}%`;
          }

          writeOverride(slide, box.key, next);
          lbl.textContent = `${fieldLabelForKey(box.key)} (${fa(next.x)}, ${fa(next.y)} · ×${next.scale})`;
          syncOverrideInputs(box.key, next);
          if (els.stageFrame.contentWindow) {
            els.stageFrame.contentWindow.postMessage({
              cmd: "setOverride",
              key: box.key,
              x: next.x,
              y: next.y,
              scale: next.scale,
            }, "*");
          }
        };

        const onUp = () => {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
          if (moved) {
            setDirty(true);
            if (els.stageFrame.contentWindow) {
              els.stageFrame.contentWindow.postMessage({ cmd: "getFields" }, "*");
            }
          }
        };

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
      };

      handle.addEventListener("pointerdown", (e) => startPointer(e, "resize"));
      el.addEventListener("pointerdown", (e) => {
        if (e.target === handle) return;
        startPointer(e, "move");
      });

      ov.appendChild(el);
    });
  }

  window.addEventListener("message", (ev) => {
    const d = ev.data || {};
    if (d.cmd === "loaded" && d.info) {
      state.duration = Number(d.info.duration || 6);
      state.fx = d.info.fx || {};
      state.fieldBoxes = Array.isArray(d.fields) ? d.fields : [];
      if (Array.isArray(d.camRect)) state.camRect = d.camRect;
      updateCamStatusUI(d.cam);
      const pLbl = FX_CAT.presetLabels[state.fx.preset] || state.fx.preset || "خودکار";
      const tLbl = FX_CAT.transitionLabels[state.fx.transition] || state.fx.transition || "خودکار";
      const lLbl = FX_CAT.logoMotionLabels[state.fx.logoMotion] || state.fx.logoMotion || "خودکار";
      els.presetChip.textContent = `سبک: ${pLbl} (${fa((activeSlide() && activeSlide().seed) || 0)})`;
      els.transitionChip.textContent = `ترنزیشن: ${tLbl}`;
      const hasLogo = (activeSlide() && activeSlide().logo && activeSlide().logo !== false) ||
        (activeSlide() && activeSlide().logo_text) ||
        (state.data && (state.data.logo || state.data.logo_text));
      els.logoChip.textContent = hasLogo && (!activeSlide() || activeSlide().logo !== false) ? `لوگو: ${lLbl}` : "لوگو: خاموش";

      renderCanvasOverlay();

      if (!state.playing) {
        state.currentTime = Math.min(state.currentTime, state.duration);
        updateTimeUI();
      } else {
        startClock(0);
      }
    } else if (d.cmd === "fields") {
      if (Array.isArray(d.fields)) state.fieldBoxes = d.fields;
      if (d.cam !== undefined) updateCamStatusUI(d.cam);
    }
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

    // Global preset options (random + union of all presets)
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

    // Global transitions
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

    // Global logo motions
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

  function renderSlidesList() {
    const slides = (state.data && state.data.slides) || [];
    els.slidesCount.textContent = fa(slides.length);
    els.slidesList.innerHTML = "";

    slides.forEach((s, idx) => {
      const tpl = String(s.template || "quote").replace(/-/g, "_");
      const schema = schemas[tpl] || {};
      const card = document.createElement("div");
      card.className = "slide-card" + (idx === state.activeIndex ? " active" : "");
      card.draggable = true;
      card.dataset.index = String(idx);

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

      card.addEventListener("dragstart", (e) => {
        state.dragSlideIndex = idx;
        card.classList.add("dragging");
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", String(idx));
        }
      });

      card.addEventListener("dragover", (e) => {
        if (state.dragSlideIndex === null || state.dragSlideIndex === idx) return;
        e.preventDefault();
        card.classList.add("drag-over");
      });

      card.addEventListener("dragleave", () => {
        card.classList.remove("drag-over");
      });

      card.addEventListener("drop", (e) => {
        e.preventDefault();
        card.classList.remove("drag-over");
        const from = state.dragSlideIndex;
        state.dragSlideIndex = null;
        if (from === null || from === idx || !state.data || !Array.isArray(state.data.slides)) return;
        const activeObj = state.data.slides[state.activeIndex];
        const [moved] = state.data.slides.splice(from, 1);
        state.data.slides.splice(idx, 0, moved);
        state.activeIndex = Math.max(0, state.data.slides.indexOf(activeObj));
        setDirty(true);
        renderSlidesList();
        renderInspector();
        reloadStage(true);
      });

      card.addEventListener("dragend", () => {
        state.dragSlideIndex = null;
        document.querySelectorAll(".slide-card").forEach((n) => n.classList.remove("dragging", "drag-over"));
      });

      card.addEventListener("click", (e) => {
        const actBtn = e.target.closest("[data-act]");
        if (actBtn) {
          e.stopPropagation();
          handleSlideAction(idx, actBtn.dataset.act);
          return;
        }
        state.activeIndex = idx;
        state.currentTime = 0;
        state.selectedField = null;
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

  /* drag/resize overrides: landscape uses slide.overrides (as before); portrait/square use
     slide.overrides[format] so moving a title in one frame never shifts it in another */
  function overrideScope(slide, create) {
    const fmt = effectiveFormat(slide);
    if (fmt === "landscape") {
      if (create && (!slide.overrides || typeof slide.overrides !== "object")) slide.overrides = {};
      return slide.overrides;
    }
    if (create) {
      if (!slide.overrides || typeof slide.overrides !== "object") slide.overrides = {};
      if (!slide.overrides[fmt] || typeof slide.overrides[fmt] !== "object") slide.overrides[fmt] = {};
    }
    return slide.overrides && slide.overrides[fmt];
  }

  function readOverride(slide, key) {
    const layoutKey = String(slide.layout || "SLIDE").toUpperCase() === "SCAM" ? "SCAM" : "SLIDE";
    const ovs = overrideScope(slide, false);
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
    const fmt = effectiveFormat(slide);
    const ovs = overrideScope(slide, true);
    const isIdentity = nextVal.x === 0 && nextVal.y === 0 && nextVal.scale === 1;
    if (isIdentity) {
      delete ovs[key];
      if (ovs.SCAM) delete ovs.SCAM[key];
      if (ovs.SLIDE) delete ovs.SLIDE[key];
      if (fmt !== "landscape" && !Object.keys(ovs).length) delete slide.overrides[fmt];
      if (!Object.keys(slide.overrides).length) delete slide.overrides;
    } else {
      ovs[key] = { x: nextVal.x, y: nextVal.y, scale: nextVal.scale };
    }
  }

  function renderInspector() {
    const slide = activeSlide();
    if (!slide) {
      els.activeSlideBadge.textContent = "—";
      els.inspectorBody.innerHTML = '<div class="empty-state">اسلایدی برای ویرایش وجود ندارد.</div>';
      return;
    }

    const tpl = String(slide.template || "quote").replace(/-/g, "_");
    const schema = schemas[tpl] || { label: tpl, fields: [] };
    els.activeSlideBadge.textContent = `اسلاید ${fa(state.activeIndex + 1)}`;
    els.inspectorBody.innerHTML = "";

    // 1. Template & language switch
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

    const langGroup = document.createElement("label");
    langGroup.className = "field-group";
    langGroup.innerHTML = `<div class="field-label-row"><strong>جهت و زبان اسلاید</strong></div>`;
    const langSel = document.createElement("select");
    langSel.className = "select-ctrl";
    [
      { value: "", label: "ارث‌بری از پروژه" },
      { value: "fa", label: "فارسی — راست‌به‌چپ (RTL)" },
      { value: "en", label: "English — Left-to-Right (LTR)" },
    ].forEach((opt) => {
      const o = document.createElement("option");
      o.value = opt.value;
      o.textContent = opt.label;
      langSel.appendChild(o);
    });
    langSel.value = slide.lang || "";
    langSel.addEventListener("change", () => {
      if (!langSel.value) delete slide.lang;
      else slide.lang = langSel.value;
      setDirty(true);
      reloadStage(true);
    });
    langGroup.appendChild(langSel);
    secMeta.appendChild(langGroup);
    els.inspectorBody.appendChild(secMeta);

    const attachRichToolbar = (groupEl, inputEl, onApply) => {
      const bar = document.createElement("div");
      bar.className = "rich-toolbar";
      [
        { open: "*", close: "*", label: "*زرد*", cls: "acc", title: "رنگ تاکیدی (*...*)" },
        { open: "~", close: "~", label: "~قرمز~", cls: "dng", title: "رنگ هشدار (~...~)" },
        { open: "_", close: "_", label: "_کمرنگ_", cls: "", title: "متن کمرنگ (_..._)" },
        { open: "==", close: "==", label: "==هایلایت==", cls: "hl", title: "هایلایت (==...==)" },
        { open: "__", close: "__", label: "__زیرخط__", cls: "ul", title: "زیرخط (__...__)" },
      ].forEach((fmt) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "rich-btn " + fmt.cls;
        b.textContent = fmt.label;
        b.title = fmt.title;
        b.addEventListener("click", () => {
          const val = inputEl.value || "";
          const start = inputEl.selectionStart ?? val.length;
          const end = inputEl.selectionEnd ?? val.length;
          const selected = val.slice(start, end) || "متن";
          const wrapped = `${fmt.open}${selected}${fmt.close}`;
          inputEl.value = val.slice(0, start) + wrapped + val.slice(end);
          inputEl.focus();
          const curStart = start + fmt.open.length;
          inputEl.setSelectionRange(curStart, curStart + selected.length);
          onApply(inputEl.value);
        });
        bar.appendChild(b);
      });
      groupEl.appendChild(bar);
    };

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
        const updateTa = (nextVal) => {
          slide[f.key] = nextVal;
          setDirty(true);
          renderSlidesList();
          scheduleReload(false);
        };
        ta.addEventListener("input", () => updateTa(ta.value));
        group.appendChild(ta);
        attachRichToolbar(group, ta, updateTa);
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
        const isSeries = f.type === "series";
        if (isSeries) {
          const ta = document.createElement("textarea");
          ta.className = "textarea-input";
          ta.value = String(slide[f.key] ?? "");
          ta.addEventListener("input", () => {
            slide[f.key] = ta.value;
            setDirty(true);
            scheduleReload(false);
          });
          group.appendChild(ta);
        } else {
          const rows = Array.isArray(slide[f.key]) ? slide[f.key] : [];
          const cols = f.columns || [];
          const container = document.createElement("div");
          container.className = "table-editor-wrap";
          const renderRows = () => {
            container.innerHTML = "";
            rows.forEach((rowObj, rIdx) => {
              const rowBox = document.createElement("div");
              rowBox.className = "table-row-box";
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
              container.appendChild(rowBox);
            });
            const addBtn = document.createElement("button");
            addBtn.type = "button";
            addBtn.className = "btn btn-sm btn-secondary";
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
            container.appendChild(addBtn);
          };
          renderRows();
          group.appendChild(container);
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
        chk.appendChild(inp);
        chk.appendChild(document.createTextNode(f.label || f.key));
        group.appendChild(chk);
      } else if (f.type === "image") {
        const imgSel = document.createElement("select");
        imgSel.className = "select-ctrl";
        const noneOpt = document.createElement("option");
        noneOpt.value = "";
        noneOpt.textContent = "— بدون تصویر —";
        imgSel.appendChild(noneOpt);
        state.images.forEach((imgName) => {
          const o = document.createElement("option");
          o.value = imgName;
          o.textContent = imgName;
          imgSel.appendChild(o);
        });
        const curImg = String(slide[f.key] || "").replace(/^img\//, "");
        if (curImg && !state.images.includes(curImg)) {
          const custom = document.createElement("option");
          custom.value = slide[f.key];
          custom.textContent = slide[f.key];
          imgSel.appendChild(custom);
        }
        imgSel.value = state.images.includes(curImg) ? curImg : (slide[f.key] || "");
        imgSel.addEventListener("change", () => {
          if (!imgSel.value) delete slide[f.key];
          else slide[f.key] = imgSel.value;
          setDirty(true);
          scheduleReload(false);
        });
        group.appendChild(imgSel);

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
        inp.value = slide[f.key] ?? 0;
        inp.addEventListener("change", () => {
          slide[f.key] = Number(inp.value) || 0;
          setDirty(true);
          reloadStage(true);
        });
        group.appendChild(inp);
      } else {
        const inp = document.createElement("input");
        inp.type = "text";
        inp.className = "text-input";
        inp.value = slide[f.key] ?? "";
        const updateInp = (nextVal) => {
          slide[f.key] = nextVal;
          setDirty(true);
          renderSlidesList();
          scheduleReload(false);
        };
        inp.addEventListener("input", () => updateInp(inp.value));
        group.appendChild(inp);
        attachRichToolbar(group, inp, updateInp);
      }

      secFields.appendChild(group);
    });
    els.inspectorBody.appendChild(secFields);

    // 3. Narration (`say`), Transition & Animated Logo for this slide
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

    const trGroup = document.createElement("div");
    trGroup.className = "field-group";
    trGroup.innerHTML = `<div class="field-label-row"><strong>ترنزیشن ورود اسلاید</strong></div>`;
    const trSel = document.createElement("select");
    trSel.className = "select-ctrl";
    [
      { value: "", label: "ارث‌بری از سبک پروژه" },
      { value: "random", label: "🎲 تصادفی (با بذر قطعی)" },
      ...(FX_CAT.transitions || []).map((v) => ({ value: v, label: FX_CAT.transitionLabels[v] || v })),
    ].forEach((tr) => {
      const o = document.createElement("option");
      o.value = tr.value;
      o.textContent = tr.label;
      trSel.appendChild(o);
    });
    trSel.value = slide.transition || "";
    trSel.addEventListener("change", () => {
      if (!trSel.value) delete slide.transition;
      else slide.transition = trSel.value;
      setDirty(true);
      reloadStage(true);
    });
    trGroup.appendChild(trSel);
    secNar.appendChild(trGroup);

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

    els.inspectorBody.appendChild(secNar);

    // 4. Per-field WYSIWYG Position/Scale Overrides (editable: true fields + logo)
    const ovFields = [...editableFields];
    const hasLogo = (slide.logo && slide.logo !== false) || slide.logo_text || (state.data && (state.data.logo || state.data.logo_text));
    if (hasLogo && slide.logo !== false) ovFields.push({ key: "logo", label: "لوگو" });

    if (ovFields.length) {
      const secOv = document.createElement("div");
      secOv.className = "inspector-section";
      secOv.innerHTML = `<div class="section-title"><span>تنظیم موقعیت و اندازه (Overrides)</span></div>`;

      ovFields.forEach((f) => {
        const cur = readOverride(slide, f.key);
        const card = document.createElement("div");
        card.className = "override-card" + (state.selectedField === f.key ? " selected" : "");
        card.dataset.ovCard = f.key;

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
          inp.dataset.ovKey = f.key;
          inp.dataset.ovProp = prop;
          inp.addEventListener("input", () => {
            const next = readOverride(slide, f.key);
            next[prop] = Number(inp.value) || (prop === "scale" ? 1 : 0);
            writeOverride(slide, f.key, next);
            setDirty(true);
            if (els.stageFrame.contentWindow) {
              els.stageFrame.contentWindow.postMessage({
                cmd: "setOverride",
                key: f.key,
                x: next.x,
                y: next.y,
                scale: next.scale,
              }, "*");
            } else {
              scheduleReload(false);
            }
          });
          wrap.appendChild(inp);
          return wrap;
        };

        grid.appendChild(mkNum("افقی (X)", "x", 10, -900, 900));
        grid.appendChild(mkNum("عمودی (Y)", "y", 10, -540, 540));
        grid.appendChild(mkNum("مقیاس", "scale", 0.05, 0.4, 2.2));
        card.appendChild(grid);
        secOv.appendChild(card);
      });

      els.inspectorBody.appendChild(secOv);
    }

    // 5. Collapsible Advanced Counter & Micro-Details Controls
    const advDetails = document.createElement("details");
    advDetails.className = "advanced-details";
    if (
      slide.count !== undefined ||
      slide.count_style !== undefined ||
      slide.count_from !== undefined ||
      slide.micro_fx !== undefined
    ) {
      advDetails.open = true;
    }

    const advSummary = document.createElement("summary");
    advSummary.innerHTML = `<span>تنظیمات پیشرفتهٔ شمارنده و جزئیات حرکت (Advanced)</span><span style="font-size:11px;color:var(--muted)">▾</span>`;
    advDetails.appendChild(advSummary);

    const advBody = document.createElement("div");
    advBody.className = "advanced-details-body";

    const mkAdvSelect = (labelText, options, currentValue, onChange) => {
      const grp = document.createElement("div");
      grp.className = "field-group";
      const lbl = document.createElement("div");
      lbl.className = "field-label-row";
      lbl.innerHTML = `<strong>${labelText}</strong>`;
      grp.appendChild(lbl);
      const sel = document.createElement("select");
      sel.className = "select-ctrl";
      options.forEach((opt) => {
        const o = document.createElement("option");
        o.value = opt.value;
        o.textContent = opt.label;
        sel.appendChild(o);
      });
      sel.value = currentValue;
      sel.addEventListener("change", () => {
        onChange(sel.value);
        setDirty(true);
        reloadStage(true);
      });
      grp.appendChild(sel);
      return grp;
    };

    advBody.appendChild(
      mkAdvSelect(
        "شمارش خودکار اعداد در این اسلاید",
        [
          { value: "", label: "ارث‌بری از تنظیمات پروژه" },
          { value: "true", label: "روشن (شمارش یوتیوبی)" },
          { value: "false", label: "خاموش (count: false)" },
        ],
        slide.count === false ? "false" : slide.count === true ? "true" : "",
        (v) => {
          if (v === "false") slide.count = false;
          else if (v === "true") slide.count = true;
          else delete slide.count;
        }
      )
    );

    advBody.appendChild(
      mkAdvSelect(
        "سبک شمارش اعداد",
        [
          { value: "", label: "ارث‌بری از تنظیمات پروژه" },
          { value: "pop", label: "پاپ یوتیوبی (پیش‌فرض)" },
          { value: "smooth", label: "نرم و کلاسیک" },
          { value: "slam", label: "کوبنده و پرانرژی" },
          { value: "subtle", label: "سریع و ظریف" },
        ],
        slide.count_style || "",
        (v) => {
          if (!v) delete slide.count_style;
          else slide.count_style = v;
        }
      )
    );

    advBody.appendChild(
      mkAdvSelect(
        "نقطهٔ شروع شمارش",
        [
          { value: "", label: "ارث‌بری از تنظیمات پروژه" },
          { value: "auto", label: "هوشمند (سال‌ها از نزدیک، بقیه از صفر)" },
          { value: "zero", label: "همیشه از صفر" },
          { value: "near", label: "شروع از حدود ۷۰٪" },
        ],
        slide.count_from || "",
        (v) => {
          if (!v) delete slide.count_from;
          else slide.count_from = v;
        }
      )
    );

    advBody.appendChild(
      mkAdvSelect(
        "ریزجزئیات حرکتی (تاکید، هایلایت، ایموجی)",
        [
          { value: "", label: "ارث‌بری از تنظیمات پروژه" },
          { value: "true", label: "روشن" },
          { value: "false", label: "خاموش (micro_fx: false)" },
        ],
        slide.micro_fx === false ? "false" : slide.micro_fx === true ? "true" : "",
        (v) => {
          if (v === "false") slide.micro_fx = false;
          else if (v === "true") slide.micro_fx = true;
          else delete slide.micro_fx;
        }
      )
    );

    /* ---- frame format: per-slide override + hard per-format field overrides ---- */
    const curFmt = effectiveFormat(slide);
    const fmtHead = document.createElement("div");
    fmtHead.className = "field-label-row";
    fmtHead.innerHTML = `<strong>قاب (Format) — فقط برای این اسلاید</strong>`;
    advBody.appendChild(fmtHead);
    advBody.appendChild(
      mkAdvSelect(
        "قاب این اسلاید",
        [
          { value: "", label: `ارث‌بری از پروژه (${FORMAT_LABELS[projectFormat()]})` },
          { value: "landscape", label: FORMAT_LABELS.landscape + " — 1920×1080" },
          { value: "portrait", label: FORMAT_LABELS.portrait + " — 1080×1920" },
          { value: "square", label: FORMAT_LABELS.square + " — 1080×1080" },
        ],
        slide.format ? normFormat(slide.format) : "",
        (v) => {
          if (!v) delete slide.format;
          else slide.format = v;
          resizeStage();
          renderInspector();
        }
      )
    );
    const foGrp = document.createElement("div");
    foGrp.className = "field-group";
    const foLbl = document.createElement("div");
    foLbl.className = "field-label-row";
    foLbl.innerHTML = `<strong>مقدارهای اجباری فقط در قاب «${FORMAT_LABELS[curFmt]}»</strong>`;
    foGrp.appendChild(foLbl);
    const foHint = document.createElement("div");
    foHint.style.cssText = "font-size:11px;color:var(--muted);margin-bottom:4px";
    foHint.textContent = "هر خط: کلید: مقدار — مثلاً  size: 70  یا  columns: 1 . فقط وقتی این قاب فعال است جای مقدار اصلی می‌نشیند (format_overrides در video.yaml).";
    foGrp.appendChild(foHint);
    const foArea = document.createElement("textarea");
    foArea.className = "text-input";
    foArea.dir = "ltr";
    foArea.rows = 4;
    const curFo = (slide.format_overrides && slide.format_overrides[curFmt]) || {};
    foArea.value = Object.entries(curFo).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`).join("\n");
    foArea.addEventListener("change", () => {
      const obj = {};
      foArea.value.split("\n").forEach((line) => {
        const i = line.indexOf(":");
        if (i <= 0) return;
        const k = line.slice(0, i).trim(), raw = line.slice(i + 1).trim();
        if (!k || k === "format" || k === "format_overrides") return;
        let v = raw;
        if (/^-?\d+(\.\d+)?$/.test(raw)) v = Number(raw);
        else if (raw === "true" || raw === "false") v = raw === "true";
        else if (/^[\[{]/.test(raw)) { try { v = JSON.parse(raw); } catch (_) { v = raw; } }
        obj[k] = v;
      });
      if (!slide.format_overrides || typeof slide.format_overrides !== "object") slide.format_overrides = {};
      if (Object.keys(obj).length) slide.format_overrides[curFmt] = obj;
      else delete slide.format_overrides[curFmt];
      if (!Object.keys(slide.format_overrides).length) delete slide.format_overrides;
      setDirty(true);
      reloadStage(false);
    });
    foGrp.appendChild(foArea);
    advBody.appendChild(foGrp);
    if (slide.format || slide.format_overrides) advDetails.open = true;

    advDetails.appendChild(advBody);
    els.inspectorBody.appendChild(advDetails);

    // 6. Advanced Camera Zoom Points disclosure (collapsed by default, beginner default: OFF)
    const ZOOM_CAP = getZoomCap();
    const zoomUtils = window.KhordegirZoomEditor;

    const zoomDetails = document.createElement("details");
    zoomDetails.className = "zoom-advanced-disclosure advanced-details";

    const zoomSummary = document.createElement("summary");
    const zoomTitleSpan = document.createElement("span");
    zoomTitleSpan.textContent = "🎥 تنظیمات پیشرفتهٔ دوربین و نقاط زوم (Advanced)";
    const zoomCountChip = document.createElement("span");
    zoomCountChip.className = "count-chip";
    zoomSummary.appendChild(zoomTitleSpan);
    zoomSummary.appendChild(zoomCountChip);
    zoomDetails.appendChild(zoomSummary);

    const zoomBody = document.createElement("div");
    zoomBody.className = "advanced-details-body";

    const enableLbl = document.createElement("label");
    enableLbl.className = "toggle-chip";
    const enableChk = document.createElement("input");
    enableChk.type = "checkbox";
    enableChk.id = "chkZoomPointsEnable";
    enableLbl.appendChild(enableChk);
    enableLbl.appendChild(document.createTextNode(`فعال‌سازی نقاط زوم دوربین (سقف بزرگ‌نمایی ${ZOOM_CAP}x)`));
    zoomBody.appendChild(enableLbl);

    const zoomListWrap = document.createElement("div");
    zoomListWrap.className = "zoom-points-list";

    const projHasZoom = !!(state.data && Array.isArray(state.data.zoom_points) && state.data.zoom_points.length > 0);

    const commitSlideZoomPoints = (pts, explicitDisable = false) => {
      if (!pts || !pts.length) {
        if (explicitDisable && projHasZoom) {
          slide.zoom_points = [];
        } else {
          delete slide.zoom_points;
        }
      } else {
        slide.zoom_points = zoomUtils.sortZoomPoints(pts.map(zoomUtils.sanitizeZoomPoint));
      }
      setDirty(true);
      scheduleReload(false);
    };

    renderZoomPointsEditor({
      container: zoomListWrap,
      checkbox: enableChk,
      summaryChip: zoomCountChip,
      getPoints: () => (Array.isArray(slide.zoom_points) ? slide.zoom_points : []),
      isExplicitlyDisabled: () => Array.isArray(slide.zoom_points) && slide.zoom_points.length === 0,
      hasProjectInheritance: projHasZoom,
      onChange: (nextPts, explicitDisable = false) => {
        commitSlideZoomPoints(nextPts, explicitDisable);
      },
    });

    zoomBody.appendChild(zoomListWrap);
    zoomDetails.appendChild(zoomBody);
    els.inspectorBody.appendChild(zoomDetails);
  }

  /* ---------------------------------------------------------------- Zoom Points Editor Helpers (matches zoompoints.py) */
  const ZOOM_EASE_RE = /^(?:exp(?:Out|In|InOut)\((\d+(?:\.\d+)?)\)|(?:power[1-4]|expo|sine|circ|quad|cubic|quart|quint)(?:\.(?:in|out|inOut))?|back(?:\.(?:in|out|inOut)(?:\(\d+(?:\.\d+)?\))?)?|power[1-4]|editorial|snappy|expo|back|spring|linear|none)$/;
  const ZOOM_EASE_PRESETS = [
    "expOut(5)",
    "expOut(3)",
    "expOut(6)",
    "power3.out",
    "power3.inOut",
    "power4.out",
    "expo.out",
    "sine.inOut",
    "back.out(1.2)",
    "editorial",
    "snappy",
    "linear",
  ];

  function getZoomCap() {
    const cap = window.MOTION_TOKENS && Number(window.MOTION_TOKENS.STAGE_ZOOM_CAP);
    return (Number.isFinite(cap) && cap >= 1) ? cap : 1.06;
  }

  function isValidZoomEase(easeStr) {
    if (typeof easeStr !== "string") return false;
    const s = easeStr.trim();
    if (!s) return false;
    const expMatch = /^exp(?:Out|In|InOut)\((\d+(?:\.\d+)?)\)$/.exec(s);
    if (expMatch) return parseFloat(expMatch[1]) > 0;
    return ZOOM_EASE_RE.test(s);
  }

  function sanitizeZoomPoint(raw) {
    const cap = getZoomCap();
    const obj = (raw && typeof raw === "object") ? raw : {};
    const clampNum = (v, min, max, defVal) => {
      if (typeof v === "boolean") return defVal;
      const n = Number(v);
      if (v === undefined || v === null || v === "" || !Number.isFinite(n)) return defVal;
      return +Math.max(min, Math.min(max, n)).toFixed(6);
    };
    const at = clampNum(obj.at, 0, 3600, 0.0);
    const durRaw = (typeof obj.dur !== "boolean" && obj.dur !== undefined && obj.dur !== null && obj.dur !== "") ? Number(obj.dur) : 0.9;
    const dur = (Number.isFinite(durRaw) && durRaw > 0) ? +Math.min(120, durRaw).toFixed(6) : 0.9;
    const ease = isValidZoomEase(obj.ease) ? obj.ease.trim() : "expOut(5)";
    return {
      at,
      x: clampNum(obj.x, 0, 1, 0.5),
      y: clampNum(obj.y, 0, 1, 0.5),
      scale: clampNum(obj.scale, 1.0, cap, Math.min(1.04, cap)),
      dur,
      ease,
    };
  }

  function sortZoomPoints(pts) {
    return (Array.isArray(pts) ? pts : [])
      .map((pt, idx) => ({ pt: sanitizeZoomPoint(pt), idx }))
      .sort((a, b) => (a.pt.at - b.pt.at) || (a.idx - b.idx))
      .map((entry) => entry.pt);
  }

  function addZoomPoint(pts) {
    const sorted = sortZoomPoints(pts);
    const last = sorted[sorted.length - 1];
    const nextAt = last ? +((last.at || 0) + (last.dur || 0.9) + 0.6).toFixed(2) : 0.8;
    const nextPt = sanitizeZoomPoint({ at: nextAt, x: 0.5, y: 0.5, scale: 1.04, dur: 0.9, ease: "expOut(5)" });
    return sortZoomPoints([...sorted, nextPt]);
  }

  function reorderZoomPoints(pts, index, direction) {
    const list = (Array.isArray(pts) ? pts : []).map(sanitizeZoomPoint);
    const target = index + direction;
    if (index < 0 || index >= list.length || target < 0 || target >= list.length) {
      return list;
    }
    const a = Object.assign({}, list[index]);
    const b = Object.assign({}, list[target]);
    // Swap chronological timestamps when reordering so ordered video.yaml persists the new order
    const tmpAt = a.at;
    a.at = b.at;
    b.at = tmpAt;
    list[index] = b;
    list[target] = a;
    return sortZoomPoints(list);
  }

  function deleteZoomPoint(pts, index) {
    const list = (Array.isArray(pts) ? pts : []).map(sanitizeZoomPoint);
    if (index < 0 || index >= list.length) return list;
    list.splice(index, 1);
    return list;
  }

  window.KhordegirZoomEditor = {
    getZoomCap,
    isValidZoomEase,
    sanitizeZoomPoint,
    sortZoomPoints,
    addZoomPoint,
    reorderZoomPoints,
    deleteZoomPoint,
  };

  function renderZoomPointsEditor(opts) {
    const {
      container,
      checkbox,
      summaryChip,
      getPoints,
      isExplicitlyDisabled,
      hasProjectInheritance,
      onChange,
    } = opts;
    const cap = getZoomCap();

    const updateUI = () => {
      const pts = sortZoomPoints(getPoints());
      const explicitlyOff = typeof isExplicitlyDisabled === "function" && isExplicitlyDisabled();

      if (checkbox) {
        checkbox.checked = pts.length > 0;
      }
      if (summaryChip) {
        if (pts.length > 0) {
          summaryChip.textContent = `${fa(pts.length)} نقطه`;
        } else if (hasProjectInheritance && !explicitlyOff) {
          summaryChip.textContent = "ارث‌بری از پروژه";
        } else {
          summaryChip.textContent = "خاموش";
        }
      }

      container.innerHTML = "";
      if (!pts.length) {
        const hint = document.createElement("div");
        hint.className = "zoom-empty-hint";
        if (hasProjectInheritance && !explicitlyOff) {
          hint.textContent = "نقاط زوم از تنظیمات کل پروژه ارث‌بری می‌شوند. برای تغییر یا خاموش‌کردن در این اسلاید فعال کنید.";
        } else {
          hint.textContent = "حالت پیش‌فرض مبتدی: خاموش (دوربین ثابت است و کلید zoom_points در video.yaml نوشته نمی‌شود).";
        }
        container.appendChild(hint);
        return;
      }

      pts.forEach((pt, pIdx) => {
        const card = document.createElement("div");
        card.className = "override-card zoom-point-card";

        const head = document.createElement("div");
        head.className = "override-head";

        const headTitle = document.createElement("span");
        headTitle.textContent = `نقطه ${fa(pIdx + 1)} • ثانیه ${fa(pt.at.toFixed(1))}`;
        head.appendChild(headTitle);

        const actions = document.createElement("div");
        actions.className = "zoom-point-actions";

        const upBtn = document.createElement("button");
        upBtn.type = "button";
        upBtn.className = "icon-btn";
        upBtn.dataset.zoomAct = "up";
        upBtn.disabled = pIdx === 0;
        upBtn.title = "جابجایی به بالا";
        upBtn.textContent = "▲";
        upBtn.addEventListener("click", () => {
          const next = reorderZoomPoints(sortZoomPoints(getPoints()), pIdx, -1);
          onChange(next, false);
          updateUI();
        });

        const downBtn = document.createElement("button");
        downBtn.type = "button";
        downBtn.className = "icon-btn";
        downBtn.dataset.zoomAct = "down";
        downBtn.disabled = pIdx === pts.length - 1;
        downBtn.title = "جابجایی به پایین";
        downBtn.textContent = "▼";
        downBtn.addEventListener("click", () => {
          const next = reorderZoomPoints(sortZoomPoints(getPoints()), pIdx, 1);
          onChange(next, false);
          updateUI();
        });

        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "icon-btn danger";
        delBtn.dataset.zoomAct = "del";
        delBtn.title = "حذف نقطه زوم";
        delBtn.textContent = "حذف";
        delBtn.addEventListener("click", () => {
          const next = deleteZoomPoint(sortZoomPoints(getPoints()), pIdx);
          onChange(next, next.length === 0);
          updateUI();
        });

        actions.appendChild(upBtn);
        actions.appendChild(downBtn);
        actions.appendChild(delBtn);
        head.appendChild(actions);
        card.appendChild(head);

        const grid = document.createElement("div");
        grid.className = "override-grid";

        const mkField = (lbl, key, step, min, max, defVal) => {
          const w = document.createElement("label");
          w.textContent = lbl;
          const inp = document.createElement("input");
          inp.type = "number";
          inp.dir = "ltr";
          inp.dataset.zoomField = key;
          inp.step = String(step);
          inp.min = String(min);
          inp.max = String(max);
          inp.value = String(pt[key] != null ? pt[key] : defVal);
          inp.addEventListener("change", () => {
            let v = parseFloat(inp.value);
            if (!Number.isFinite(v)) v = defVal;
            v = Math.max(min, Math.min(max, v));
            inp.value = String(v);
            const cur = sortZoomPoints(getPoints());
            const updated = cur.map((item, idx) => (idx === pIdx ? Object.assign({}, item, { [key]: v }) : item));
            const normalized = sortZoomPoints(updated);
            onChange(normalized, false);
            updateUI();
          });
          w.appendChild(inp);
          return w;
        };

        grid.appendChild(mkField("شروع (at / s)", "at", 0.1, 0, 3600, 0.8));
        grid.appendChild(mkField("محور X (۰..۱)", "x", 0.05, 0, 1, 0.5));
        grid.appendChild(mkField("محور Y (۰..۱)", "y", 0.05, 0, 1, 0.5));
        grid.appendChild(mkField(`مقیاس (۱..${cap})`, "scale", 0.01, 1.0, cap, 1.04));
        grid.appendChild(mkField("مدت (dur / s)", "dur", 0.1, 0.1, 120, 0.9));

        const easeWrap = document.createElement("label");
        easeWrap.textContent = "نرمی (Ease)";
        const easeSel = document.createElement("select");
        easeSel.className = "select-ctrl";
        easeSel.dataset.zoomField = "ease";
        const curEase = isValidZoomEase(pt.ease) ? pt.ease.trim() : "expOut(5)";
        const options = ZOOM_EASE_PRESETS.includes(curEase) ? ZOOM_EASE_PRESETS : [curEase, ...ZOOM_EASE_PRESETS];
        options.forEach((ez) => {
          const o = document.createElement("option");
          o.value = ez;
          o.textContent = ez;
          easeSel.appendChild(o);
        });
        easeSel.value = curEase;
        easeSel.addEventListener("change", () => {
          const nextEase = isValidZoomEase(easeSel.value) ? easeSel.value : "expOut(5)";
          const cur = sortZoomPoints(getPoints());
          const updated = cur.map((item, idx) => (idx === pIdx ? Object.assign({}, item, { ease: nextEase }) : item));
          onChange(sortZoomPoints(updated), false);
          updateUI();
        });
        easeWrap.appendChild(easeSel);
        grid.appendChild(easeWrap);

        card.appendChild(grid);
        container.appendChild(card);
      });

      const addPtBtn = document.createElement("button");
      addPtBtn.type = "button";
      addPtBtn.className = "btn btn-sm btn-ghost";
      addPtBtn.dataset.zoomAct = "add";
      addPtBtn.textContent = "+ افزودن نقطه زوم";
      addPtBtn.addEventListener("click", () => {
        const next = addZoomPoint(sortZoomPoints(getPoints()));
        onChange(next, false);
        updateUI();
      });
      container.appendChild(addPtBtn);
    };

    if (checkbox) {
      checkbox.onchange = () => {
        if (checkbox.checked) {
          const current = getPoints();
          const next = current.length ? sortZoomPoints(current) : addZoomPoint([]);
          onChange(next, false);
        } else {
          onChange([], true);
        }
        updateUI();
      };
    }

    updateUI();
    return updateUI;
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
    if (els.projSceneSelect) els.projSceneSelect.value = state.data.scene || "none";
    els.projSeedInput.value = String(Number(state.data.seed) || 0);
    if (els.projLangSelect) els.projLangSelect.value = state.data.lang || "fa";
    els.projLogoTextInput.value = state.data.logo_text || "";
    if (els.projCountSelect) els.projCountSelect.value = state.data.count === false ? "off" : "on";
    if (els.projCountStyleSelect) els.projCountStyleSelect.value = state.data.count_style || "pop";
    if (els.projCountFromSelect) els.projCountFromSelect.value = state.data.count_from || "auto";
    if (els.projMicroFxSelect) els.projMicroFxSelect.value = state.data.micro_fx === false ? "off" : "on";

    state.projZoomDraft = Array.isArray(state.data.zoom_points) && state.data.zoom_points.length
      ? sortZoomPoints(state.data.zoom_points)
      : [];
    if (els.projZoomAdvanced) {
      els.projZoomAdvanced.open = false;
    }
    if (els.projZoomPointsList) {
      renderZoomPointsEditor({
        container: els.projZoomPointsList,
        checkbox: els.chkProjZoomPointsEnable,
        summaryChip: els.projZoomCountChip,
        getPoints: () => state.projZoomDraft || [],
        isExplicitlyDisabled: () => false,
        hasProjectInheritance: false,
        onChange: (nextPts) => {
          state.projZoomDraft = nextPts;
        },
      });
    }

    els.styleModal.classList.remove("hidden");
  }

  function applyStyleModal() {
    if (!state.data) return;
    state.data.theme = els.projThemeSelect.value;
    state.data.preset = els.projPresetSelect.value;
    state.data.transition = els.projTransitionSelect.value;
    state.data.logo_motion = els.projLogoMotionSelect.value;
    state.data.logo_position = els.projLogoPosSelect.value;
    if (els.projSceneSelect) {
      const scVal = String(els.projSceneSelect.value || "none").trim().toLowerCase();
      if (scVal && scVal !== "none") state.data.scene = scVal;
      else delete state.data.scene;
    }
    state.data.seed = Number(els.projSeedInput.value) || 0;
    if (els.projLangSelect) {
      if (els.projLangSelect.value === "en") state.data.lang = "en";
      else delete state.data.lang;
    }

    if (els.projCountSelect) {
      if (els.projCountSelect.value === "off") state.data.count = false;
      else delete state.data.count;
    }
    if (els.projCountStyleSelect) {
      if (els.projCountStyleSelect.value && els.projCountStyleSelect.value !== "pop") {
        state.data.count_style = els.projCountStyleSelect.value;
      } else {
        delete state.data.count_style;
      }
    }
    if (els.projCountFromSelect) {
      if (els.projCountFromSelect.value && els.projCountFromSelect.value !== "auto") {
        state.data.count_from = els.projCountFromSelect.value;
      } else {
        delete state.data.count_from;
      }
    }
    if (els.projMicroFxSelect) {
      if (els.projMicroFxSelect.value === "off") state.data.micro_fx = false;
      else delete state.data.micro_fx;
    }

    if (Array.isArray(state.projZoomDraft) && state.projZoomDraft.length > 0) {
      state.data.zoom_points = sortZoomPoints(state.projZoomDraft);
    } else {
      delete state.data.zoom_points;
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
    if (!els.styleModal.classList.contains("hidden")) {
      els.projThemeSelect.value = "random";
      els.projPresetSelect.value = "random";
      els.projTransitionSelect.value = "random";
      els.projLogoMotionSelect.value = "random";
      els.projSeedInput.value = String(state.data.seed);
    }
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

    els.themeSelect.value = state.data.theme || "khordegir-dark";
    els.linkObs.href = `/obs/?project=${encodeURIComponent(name)}`;
    setDirty(false);
    renderSlidesList();
    renderInspector();
    reloadStage(true);
    setStatus(`پروژه «${state.data.title || name}» آماده است`);
  }

  async function saveProject() {
    if (!state.projectName || !state.data) return;
    setStatus("در حال ذخیره...");
    const resp = await fetch(`/api/projects/${encodeURIComponent(state.projectName)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(state.data),
    });
    const json = await resp.json();
    if (!resp.ok) {
      setStatus("خطا در ذخیره: " + (json.error || resp.status));
      return;
    }
    setDirty(false);
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

  /* ---------------------------------------------------------------- Script Import Modal */
  const SAMPLE_SCRIPT = `# چرا هوش مصنوعی بدون دادهٔ تمیز شکست می‌خورد؟

بیشتر تیم‌ها تصور می‌کنند *مدل* همه چیز است، اما ۷۳٪ پروژه‌های هوش مصنوعی به خاطر کیفیت پایین داده‌ها متوقف می‌شوند.

## سه مشکل پنهان در داده‌های خام
- تکرار و داده‌های ناقص در جدول‌های قدیمی
- برچسب‌گذاری سلیقه‌ای بدون دستورالعمل واحد
- نبود نسخهٔ آزمایشی مستقل برای ارزیابی واقعی

قبل از پاک‌سازی دقت ۶۲٪ بود، اما بعد از استانداردسازی به ۹۱٪ رسید.

«مدل بهتر بدون دادهٔ تمیز، فقط سریع‌تر اشتباه می‌کند.»

او: الان مدل آمادهٔ انتشاره؟
من: نه هنوز، اول باید خطای داده‌ها را صفر کنیم.`;

  function setScriptMode(mode) {
    state.scriptMode = mode;
    document.querySelectorAll(".script-mode-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.mode === mode);
    });
    els.scriptProjectRow.classList.toggle("hidden", mode !== "new");
    els.btnApplyScript.textContent =
      mode === "new"
        ? "ساخت و باز کردن پروژه"
        : mode === "replace"
          ? "جایگزینی اسلایدهای پروژه فعلی"
          : "افزودن به انتهای پروژه فعلی";
  }

  function openScriptModal() {
    els.scriptImportErr.classList.add("hidden");
    if (!els.scriptProjectName.value) {
      els.scriptProjectName.value = `script-${Math.floor(Date.now() / 1000) % 10000}`;
    }
    setScriptMode(state.projectName ? state.scriptMode : "new");
    els.scriptModal.classList.remove("hidden");
    els.scriptInput.focus();
  }

  async function analyzeScript() {
    els.scriptImportErr.classList.add("hidden");
    const script = els.scriptInput.value.trim();
    if (!script) {
      els.scriptImportErr.textContent = "لطفاً ابتدا متن اسکریپت را وارد کنید.";
      els.scriptImportErr.classList.remove("hidden");
      return null;
    }
    try {
      const resp = await fetch("/api/import-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script,
          title: els.scriptTitleInput.value.trim(),
          theme: (state.data && state.data.theme) || els.themeSelect.value || "khordegir-dark",
        }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || "خطا در تحلیل اسکریپت");
      state.scriptResult = json;

      const st = json.stats || {};
      const mins = Math.floor((st.estSeconds || 0) / 60);
      const secs = (st.estSeconds || 0) % 60;
      const durText = mins > 0 ? `${fa(mins)} دقیقه و ${fa(secs)} ثانیه` : `${fa(secs)} ثانیه`;
      els.scriptStatsBar.innerHTML =
        `<span class="count-chip">اسلاید: ${fa(st.slides || json.slides.length)}</span>` +
        `<span class="count-chip">کلمات گفتار: ${fa(st.words || 0)}</span>` +
        `<span class="count-chip">زمان تخمینی: ${durText}</span>` +
        `<span class="count-chip">حالت: ${st.mode === "markers" ? "نشانگرها" : "تشخیص خودکار"}</span>`;

      els.scriptPreviewList.innerHTML = "";
      (json.slides || []).forEach((s, i) => {
        const tpl = String(s.template || "quote").replace(/-/g, "_");
        const schema = schemas[tpl] || {};
        const titleTxt = String(s.title || s.text || s.caption || s.number || s.say || "اسلاید").replace(/[*~=_]/g, "");
        const card = document.createElement("div");
        card.className = "script-preview-card";
        card.innerHTML = `
          <div class="script-preview-card-head">
            <span>${fa(i + 1)}. ${schema.label || tpl}</span>
            <span>${String(s.layout || "SCAM")}</span>
          </div>
          <div class="script-preview-card-title">${titleTxt}</div>
          <div class="script-preview-card-say">${String(s.say || "")}</div>
        `;
        els.scriptPreviewList.appendChild(card);
      });

      els.scriptPreviewWrap.classList.remove("hidden");
      els.btnApplyScript.disabled = !(json.slides && json.slides.length);
      return json;
    } catch (err) {
      els.scriptImportErr.textContent = err.message;
      els.scriptImportErr.classList.remove("hidden");
      return null;
    }
  }

  async function applyScript() {
    els.scriptImportErr.classList.add("hidden");
    const parsed = state.scriptResult || (await analyzeScript());
    if (!parsed || !Array.isArray(parsed.slides) || !parsed.slides.length) return;

    if (state.scriptMode === "new") {
      const folderName = (els.scriptProjectName.value || "").trim() || `script-${Date.now()}`;
      const resp = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: folderName,
          title: els.scriptTitleInput.value.trim() || parsed.title || folderName,
          theme: els.themeSelect.value || parsed.theme || "khordegir-dark",
          slides: parsed.slides,
        }),
      });
      const json = await resp.json();
      if (!resp.ok) {
        els.scriptImportErr.textContent = json.error || "خطا در ساخت پروژه از اسکریپت";
        els.scriptImportErr.classList.remove("hidden");
        return;
      }
      els.scriptModal.classList.add("hidden");
      state.scriptResult = null;
      await loadProjectsList(json.name);
      setStatus(`پروژه «${json.data.title || json.name}» با ${fa(parsed.slides.length)} اسلاید ساخته شد`);
      return;
    }

    if (!state.data) {
      els.scriptImportErr.textContent = "ابتدا یک پروژه باز کنید یا حالت «ساخت پروژه تازه» را بزنید.";
      els.scriptImportErr.classList.remove("hidden");
      return;
    }

    if (state.scriptMode === "replace") {
      state.data.slides = JSON.parse(JSON.stringify(parsed.slides));
      state.activeIndex = 0;
    } else {
      state.data.slides.push(...JSON.parse(JSON.stringify(parsed.slides)));
      state.activeIndex = Math.max(0, state.data.slides.length - parsed.slides.length);
    }

    els.scriptModal.classList.add("hidden");
    state.scriptResult = null;
    setDirty(true);
    renderSlidesList();
    renderInspector();
    reloadStage(true);
    setStatus(`${fa(parsed.slides.length)} اسلاید از اسکریپت اضافه شد (ذخیره فراموش نشود)`);
  }

  /* ---------------------------------------------------------------- Beginner Presets Gallery */
  function buildSlidesFromPreset(preset) {
    const slides = JSON.parse(JSON.stringify(preset.slides || []));
    const customTitle = (els.presetCustomTitle && els.presetCustomTitle.value || "").trim();
    if (customTitle && slides.length) {
      if (typeof slides[0].title === "string") slides[0].title = customTitle;
      else if (typeof slides[0].text === "string") slides[0].text = customTitle;
    }
    return {
      slides,
      projectTitle: customTitle || preset.title,
    };
  }

  async function createProjectFromPreset(preset) {
    els.presetsErr.classList.add("hidden");
    const rawFolder = (els.presetProjectName && els.presetProjectName.value || "").trim();
    const folderName = rawFolder || `${preset.id.replace(/_/g, "-")}-${Date.now().toString(36).slice(-4)}`;
    const { slides, projectTitle } = buildSlidesFromPreset(preset);

    try {
      const resp = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: folderName,
          title: projectTitle,
          theme: preset.theme || "khordegir-dark",
          preset: preset.preset || "random",
          transition: preset.transition || "random",
          count_style: preset.count_style || "pop",
          slides,
        }),
      });
      const json = await resp.json();
      if (!resp.ok) {
        els.presetsErr.textContent = json.error || "خطا در ساخت پروژه از الگو";
        els.presetsErr.classList.remove("hidden");
        return;
      }
      els.presetsModal.classList.add("hidden");
      await loadProjectsList(json.name);
      setStatus(`پروژه «${json.data.title || json.name}» از الگوی آماده ساخته شد — حالا فقط متن‌ها را ویرایش کنید`);
    } catch (err) {
      els.presetsErr.textContent = err.message || "خطای ارتباط با سرور";
      els.presetsErr.classList.remove("hidden");
    }
  }

  function applyPresetToCurrent(preset) {
    els.presetsErr.classList.add("hidden");
    if (!state.data) {
      els.presetsErr.textContent = "پروژهٔ فعالی باز نیست؛ از دکمهٔ «ساخت پروژه از الگو» استفاده کنید.";
      els.presetsErr.classList.remove("hidden");
      return;
    }
    const { slides, projectTitle } = buildSlidesFromPreset(preset);
    if ((els.presetCustomTitle && els.presetCustomTitle.value || "").trim()) {
      state.data.title = projectTitle;
    }
    state.data.theme = preset.theme || state.data.theme || "khordegir-dark";
    state.data.preset = preset.preset || "random";
    state.data.transition = preset.transition || "random";
    state.data.count_style = preset.count_style || "pop";
    state.data.slides = slides;
    state.activeIndex = 0;
    state.selectedField = null;
    els.themeSelect.value = state.data.theme;
    els.presetsModal.classList.add("hidden");
    setDirty(true);
    renderSlidesList();
    renderInspector();
    reloadStage(true);
    setStatus(`الگوی «${preset.title}» روی پروژهٔ فعلی نشست (ذخیره فراموش نشود)`);
  }

  function renderPresetsGrid(category) {
    if (!els.presetsGrid) return;
    const list = Array.isArray(window.BEGINNER_PRESETS) ? window.BEGINNER_PRESETS : [];
    const cat = category || state.presetCategory || "all";
    const filtered = cat === "all" ? list : list.filter((p) => p.category === cat);
    els.presetsGrid.innerHTML = "";

    const tplLabel = (tpl) => {
      const s = schemas[tpl];
      return (s && (s.title || s.name)) || tpl;
    };

    filtered.forEach((preset) => {
      const card = document.createElement("div");
      card.className = "preset-card";

      const top = document.createElement("div");
      const h4 = document.createElement("h4");
      h4.className = "preset-card-title";
      h4.textContent = preset.title;
      top.appendChild(h4);

      const meta = document.createElement("div");
      meta.className = "preset-card-meta";
      const themeObj = (window.Stage && window.Stage.themes && window.Stage.themes[preset.theme]) || null;
      const themeLabel = (themeObj && (themeObj.label || themeObj.name)) || preset.theme;
      meta.textContent = `${fa(preset.slides.length)} اسلاید · حدود ${fa(preset.estSec || 45)} ثانیه · تم ${themeLabel}`;
      top.appendChild(meta);

      const desc = document.createElement("p");
      desc.className = "preset-card-desc";
      desc.textContent = preset.desc;

      const flow = document.createElement("div");
      flow.className = "preset-card-flow";
      flow.textContent = "ساختار: " + preset.slides.map((s) => tplLabel(s.template)).join(" ← ");

      const actions = document.createElement("div");
      actions.className = "preset-card-actions";

      const btnNew = document.createElement("button");
      btnNew.type = "button";
      btnNew.className = "btn btn-sm btn-primary";
      btnNew.textContent = "ساخت پروژهٔ جدید از این الگو";
      btnNew.addEventListener("click", () => createProjectFromPreset(preset));
      actions.appendChild(btnNew);

      if (state.data) {
        const btnHere = document.createElement("button");
        btnHere.type = "button";
        btnHere.className = "btn btn-sm btn-ghost";
        btnHere.textContent = "اعمال روی پروژهٔ فعلی";
        btnHere.addEventListener("click", () => applyPresetToCurrent(preset));
        actions.appendChild(btnHere);
      }

      card.appendChild(top);
      card.appendChild(desc);
      card.appendChild(flow);
      card.appendChild(actions);
      els.presetsGrid.appendChild(card);
    });
  }

  function openPresetsModal() {
    if (!els.presetsModal) return;
    els.presetsErr.classList.add("hidden");
    state.presetCategory = "all";
    document.querySelectorAll(".preset-cat-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.cat === "all");
    });
    renderPresetsGrid("all");
    els.presetsModal.classList.remove("hidden");
  }

  /* ---------------------------------------------------------------- Offline AI Slide Writer */
  function setAiMode(mode) {
    state.aiMode = mode || "new";
    document.querySelectorAll(".ai-mode-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.mode === state.aiMode);
    });
    if (els.aiProjectRow) {
      els.aiProjectRow.classList.toggle("hidden", state.aiMode !== "new");
    }
    if (els.btnApplyAiYaml) {
      if (state.aiMode === "new") els.btnApplyAiYaml.textContent = "✨ ساخت و باز کردن پروژه";
      else if (state.aiMode === "replace") els.btnApplyAiYaml.textContent = "🔄 جایگزینی در پروژهٔ فعلی";
      else els.btnApplyAiYaml.textContent = "➕ افزودن به انتهای پروژه";
    }
  }

  async function fetchAiGuideText() {
    const topic = (els.aiTopicInput && els.aiTopicInput.value || "").trim();
    const qs = topic ? `?topic=${encodeURIComponent(topic)}` : "";
    const resp = await fetch(`/api/ai-guide${qs}`);
    const json = await resp.json();
    if (!resp.ok) throw new Error(json.error || "خطا در تولید راهنمای هوش مصنوعی");
    if (els.aiGuidePreview) els.aiGuidePreview.value = json.guide || "";
    if (els.aiRegistryStats && json.stats) {
      els.aiRegistryStats.textContent = `به‌روز از رجیستری زنده: ${fa(json.stats.templates)} قالب · ${fa(json.stats.themes)} تم · ${fa(json.stats.transitions)} ترنزیشن`;
    }
    return json.guide || "";
  }

  async function copyAiGuideToClipboard() {
    if (els.aiCopyStatus) els.aiCopyStatus.textContent = "در حال آماده‌سازی...";
    try {
      const guideText = await fetchAiGuideText();
      let copied = false;
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        try {
          await navigator.clipboard.writeText(guideText);
          copied = true;
        } catch {
          copied = false;
        }
      }
      if (!copied && els.aiGuidePreview) {
        if (els.aiGuideDetails) els.aiGuideDetails.open = true;
        els.aiGuidePreview.focus();
        els.aiGuidePreview.select();
        try {
          copied = document.execCommand("copy");
        } catch {
          copied = false;
        }
      }
      if (els.aiCopyStatus) {
        els.aiCopyStatus.textContent = copied
          ? "✓ راهنما کپی شد! در ChatGPT / Gemini / Claude بچسبانید."
          : "متن راهنما در کادر زیر انتخاب شد — با Ctrl+C کپی کنید.";
      }
    } catch (err) {
      if (els.aiCopyStatus) els.aiCopyStatus.textContent = "خطا: " + err.message;
    }
  }

  function renderBulletBox(boxEl, heading, items) {
    if (!boxEl) return;
    if (!items || !items.length) {
      boxEl.classList.add("hidden");
      boxEl.innerHTML = "";
      return;
    }
    boxEl.classList.remove("hidden");
    boxEl.innerHTML = "";
    const strong = document.createElement("strong");
    strong.textContent = heading;
    boxEl.appendChild(strong);
    const ul = document.createElement("ul");
    ul.className = "ai-diag-list";
    items.forEach((msg) => {
      const li = document.createElement("li");
      li.textContent = msg;
      ul.appendChild(li);
    });
    boxEl.appendChild(ul);
  }

  async function validateAiYamlInput() {
    const markup = (els.aiYamlInput && els.aiYamlInput.value) || "";
    if (!markup.trim()) {
      state.aiValidation = null;
      if (els.aiDiagnosticsWrap) els.aiDiagnosticsWrap.classList.add("hidden");
      if (els.btnApplyAiYaml) els.btnApplyAiYaml.disabled = true;
      return null;
    }
    try {
      const resp = await fetch("/api/ai-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markup, preview: true }),
      });
      const json = await resp.json();
      state.aiValidation = json;
      if (els.aiDiagnosticsWrap) els.aiDiagnosticsWrap.classList.remove("hidden");

      renderBulletBox(els.aiAutoFixBox, "اصلاحات خودکار انجام‌شده:", json.autoFixes || []);
      renderBulletBox(els.aiErrorsBox, "خطاهای نیازمند اصلاح (با شماره خط):", json.errors || []);
      renderBulletBox(els.aiWarningsBox, "هشدارها:", json.warnings || []);

      if (els.aiPreviewStats && els.aiPreviewList) {
        els.aiPreviewList.innerHTML = "";
        if (json.ok && json.data && Array.isArray(json.data.slides)) {
          const slides = json.data.slides;
          els.aiPreviewStats.textContent = `معتبر ✓ · عنوان: ${json.data.title || "—"} · تم: ${json.data.theme || "—"} · ${fa(slides.length)} اسلاید آمادهٔ ساخت`;
          slides.forEach((sl, idx) => {
            const card = document.createElement("div");
            card.className = "script-preview-card";
            const head = document.createElement("div");
            head.className = "script-preview-card-head";
            const sObj = schemas[sl.template];
            const tLabel = (sObj && (sObj.label || sObj.title || sObj.name)) || sl.template;
            head.textContent = `${fa(idx + 1)}. ${tLabel} · ${sl.layout || "SCAM"}`;
            const ttl = document.createElement("div");
            ttl.className = "script-preview-card-title";
            ttl.textContent = stripRich(sl.title || sl.text || sl.caption || (sl.number != null ? String(sl.number) : "") || "(بدون متن)");
            const say = document.createElement("div");
            say.className = "script-preview-card-say";
            say.textContent = sl.say || "—";
            card.appendChild(head);
            card.appendChild(ttl);
            card.appendChild(say);
            els.aiPreviewList.appendChild(card);
          });
        } else {
          els.aiPreviewStats.textContent = "";
        }
      }

      if (els.btnApplyAiYaml) {
        els.btnApplyAiYaml.disabled = !json.ok;
      }
      return json;
    } catch (err) {
      renderBulletBox(els.aiErrorsBox, "خطا در بررسی:", [err.message || "خطای ارتباط با سرور"]);
      if (els.aiDiagnosticsWrap) els.aiDiagnosticsWrap.classList.remove("hidden");
      if (els.btnApplyAiYaml) els.btnApplyAiYaml.disabled = true;
      return null;
    }
  }

  async function applyAiYamlImport() {
    const validated = state.aiValidation && state.aiValidation.ok
      ? state.aiValidation
      : await validateAiYamlInput();
    if (!validated || !validated.ok || !validated.data) return;

    if (state.aiMode === "new") {
      const folderName = (els.aiProjectName && els.aiProjectName.value || "").trim() || `ai-${Date.now().toString(36)}`;
      try {
        const resp = await fetch("/api/ai-import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            markup: validated.yamlText || els.aiYamlInput.value,
            mode: "new",
            name: folderName,
          }),
        });
        const json = await resp.json();
        if (!resp.ok) {
          renderBulletBox(els.aiErrorsBox, "خطا در ساخت پروژه:", json.errors || [json.error || "خطا"]);
          return;
        }
        els.aiWriterModal.classList.add("hidden");
        await loadProjectsList(json.name);
        setStatus(`پروژهٔ «${json.data.title || json.name}» با ${fa(json.data.slides.length)} اسلاید از خروجی AI ساخته شد`);
      } catch (err) {
        renderBulletBox(els.aiErrorsBox, "خطا در ساخت پروژه:", [err.message || "خطای سرور"]);
      }
      return;
    }

    if (!state.data) {
      renderBulletBox(els.aiErrorsBox, "خطا:", ["ابتدا یک پروژه باز کنید یا حالت «ساخت پروژهٔ جدید» را انتخاب کنید."]);
      return;
    }

    const incoming = JSON.parse(JSON.stringify(validated.data));
    if (state.aiMode === "replace") {
      [
        "title",
        "theme",
        "lang",
        "preset",
        "transition",
        "variant",
        "count",
        "count_style",
        "count_from",
        "micro_fx",
        "music",
        "mood",
        "sfx",
        "duration",
      ].forEach((k) => {
        if (incoming[k] !== undefined) state.data[k] = incoming[k];
      });
      state.data.slides = incoming.slides;
      state.activeIndex = 0;
      if (state.data.theme && els.themeSelect) els.themeSelect.value = state.data.theme;
    } else {
      state.data.slides.push(...incoming.slides);
      state.activeIndex = Math.max(0, state.data.slides.length - incoming.slides.length);
    }

    els.aiWriterModal.classList.add("hidden");
    state.selectedField = null;
    setDirty(true);
    renderSlidesList();
    renderInspector();
    reloadStage(true);
    setStatus(`${fa(incoming.slides.length)} اسلاید از خروجی AI وارد شد (ذخیره فراموش نشود)`);
  }

  function openAiWriterModal() {
    if (!els.aiWriterModal) return;
    if (els.aiCopyStatus) els.aiCopyStatus.textContent = "";
    if (!state.data && state.aiMode !== "new") setAiMode("new");
    else setAiMode(state.aiMode || "new");
    els.aiWriterModal.classList.remove("hidden");
    fetchAiGuideText().catch((err) => {
      if (els.aiRegistryStats) els.aiRegistryStats.textContent = "خطا در بارگذاری راهنما: " + err.message;
    });
  }

  /* ---------------------------------------------------------------- event wiring */
  els.projectSelect.addEventListener("change", () => openProject(els.projectSelect.value));
  els.themeSelect.addEventListener("change", () => {
    if (!state.data) return;
    state.data.theme = els.themeSelect.value;
    setDirty(true);
    reloadStage(true);
  });

  els.btnProjectStyle.addEventListener("click", openStyleModal);
  els.btnCloseStyleModal.addEventListener("click", () => els.styleModal.classList.add("hidden"));
  els.btnApplyStyleModal.addEventListener("click", applyStyleModal);
  els.btnStyleModalReroll.addEventListener("click", rerollAllRandom);
  els.btnRandomAll.addEventListener("click", rerollAllRandom);

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
    }
  });

  els.btnAddSlide.addEventListener("click", () => {
    if (!state.data) return;
    const tpl = els.addTemplateSelect.value || "title_card";
    const schema = schemas[tpl] || {};
    const example = JSON.parse(JSON.stringify(schema.example || {}));
    const newSlide = Object.assign({ template: tpl }, example);
    state.data.slides.splice(state.activeIndex + 1, 0, newSlide);
    state.activeIndex += 1;
    state.selectedField = null;
    setDirty(true);
    renderSlidesList();
    renderInspector();
    reloadStage(true);
  });

  /* simple format switcher = the whole video's frame (video.yaml `format:`); live preview reflows */
  document.querySelectorAll(".seg-btn[data-format]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!state.data) return;
      const f = normFormat(btn.dataset.format);
      if (f === "landscape") delete state.data.format;   // default; keeps old video.yaml files unchanged
      else state.data.format = f;
      setDirty(true);
      resizeStage();
      renderSlidesList();
      renderInspector();
      reloadStage(true);
    });
  });

  document.querySelectorAll(".seg-btn[data-layout]").forEach((btn) => {
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

  if (els.chkCanvasEdit) {
    els.chkCanvasEdit.addEventListener("change", () => {
      renderCanvasOverlay();
      if (els.chkCanvasEdit.checked && els.stageFrame.contentWindow) {
        els.stageFrame.contentWindow.postMessage({ cmd: "getFields" }, "*");
      }
    });
  }

  els.chkCamGuide.addEventListener("change", () => reloadStage(false, state.currentTime));

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

  els.btnImportScript.addEventListener("click", openScriptModal);
  els.btnCloseScriptModal.addEventListener("click", () => els.scriptModal.classList.add("hidden"));
  document.querySelectorAll(".script-mode-btn").forEach((b) => {
    b.addEventListener("click", () => setScriptMode(b.dataset.mode));
  });
  els.btnScriptSample.addEventListener("click", () => {
    els.scriptInput.value = SAMPLE_SCRIPT;
    state.scriptResult = null;
    analyzeScript();
  });
  els.scriptInput.addEventListener("input", () => {
    state.scriptResult = null;
    els.btnApplyScript.disabled = !els.scriptInput.value.trim();
  });
  els.btnAnalyzeScript.addEventListener("click", analyzeScript);
  els.btnApplyScript.addEventListener("click", applyScript);

  if (els.btnPresets) els.btnPresets.addEventListener("click", openPresetsModal);
  if (els.btnClosePresetsModal) {
    els.btnClosePresetsModal.addEventListener("click", () => els.presetsModal.classList.add("hidden"));
  }
  document.querySelectorAll(".preset-cat-btn").forEach((b) => {
    b.addEventListener("click", () => {
      state.presetCategory = b.dataset.cat || "all";
      document.querySelectorAll(".preset-cat-btn").forEach((x) => {
        x.classList.toggle("active", x === b);
      });
      renderPresetsGrid(state.presetCategory);
    });
  });

  if (els.btnAiWriter) els.btnAiWriter.addEventListener("click", openAiWriterModal);
  if (els.btnCloseAiModal) {
    els.btnCloseAiModal.addEventListener("click", () => els.aiWriterModal.classList.add("hidden"));
  }
  document.querySelectorAll(".ai-mode-btn").forEach((b) => {
    b.addEventListener("click", () => setAiMode(b.dataset.mode));
  });
  if (els.btnCopyAiGuide) els.btnCopyAiGuide.addEventListener("click", copyAiGuideToClipboard);
  if (els.aiTopicInput) {
    els.aiTopicInput.addEventListener("input", () => {
      if (els.aiGuideDetails && els.aiGuideDetails.open) {
        fetchAiGuideText().catch(() => {});
      }
    });
  }
  if (els.btnValidateAiYaml) els.btnValidateAiYaml.addEventListener("click", validateAiYamlInput);
  if (els.btnApplyAiYaml) els.btnApplyAiYaml.addEventListener("click", applyAiYamlImport);
  if (els.aiYamlInput) {
    els.aiYamlInput.addEventListener("input", () => {
      state.aiValidation = null;
      if (els.btnApplyAiYaml) els.btnApplyAiYaml.disabled = true;
      clearTimeout(state.aiValidateTimer);
      state.aiValidateTimer = setTimeout(() => {
        if (els.aiYamlInput.value.trim()) validateAiYamlInput();
      }, 450);
    });
  }

  els.stageFrame.addEventListener("load", () => {
    if (activeSlide()) reloadStage(true);
  });

  window.addEventListener("resize", resizeStage);
  if (typeof ResizeObserver === "function") {
    new ResizeObserver(resizeStage).observe(els.stageViewport);
  }

  initSelectors();
  resizeStage();
  loadProjectsList().catch((err) => setStatus("خطا در ارتباط با سرور محلی: " + err.message));
})();
