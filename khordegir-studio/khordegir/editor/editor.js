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
  };

  const els = {
    statusText: document.getElementById("statusText"),
    projectSelect: document.getElementById("projectSelect"),
    themeSelect: document.getElementById("themeSelect"),
    btnNewProject: document.getElementById("btnNewProject"),
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
    camOnlyOverlay: document.getElementById("camOnlyOverlay"),
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
    projLogoPosSelect: document.getElementById("projLogoPosSelect"),
    projSeedInput: document.getElementById("projSeedInput"),
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

  function buildStagePayload(slide, idx) {
    const copy = JSON.parse(JSON.stringify(slide || {}));
    const projSeed = (state.data && Number(state.data.seed)) || 0;
    copy._seed = `${state.projectName || "demo"}:${projSeed}:${idx + 1}`;
    copy._num = idx + 1;

    // Inherit project-level defaults unless slide overrides them
    if (state.data) {
      ["preset", "transition", "logo", "logo_motion", "logo_position", "logo_text"].forEach((k) => {
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
    const scale = Math.min(vw / 1920, vh / 1080);
    const w = Math.floor(1920 * scale);
    const h = Math.floor(1080 * scale);
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

    document.querySelectorAll(".seg-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.layout === layout);
    });

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

  window.addEventListener("message", (ev) => {
    const d = ev.data || {};
    if (d.cmd === "loaded" && d.info) {
      state.duration = Number(d.info.duration || 6);
      state.fx = d.info.fx || {};
      state.camOverlap = Array.isArray(d.cam) ? d.cam : [];
      const pLbl = FX_CAT.presetLabels[state.fx.preset] || state.fx.preset || "خودکار";
      const tLbl = FX_CAT.transitionLabels[state.fx.transition] || state.fx.transition || "خودکار";
      const lLbl = FX_CAT.logoMotionLabels[state.fx.logoMotion] || state.fx.logoMotion || "خودکار";
      els.presetChip.textContent = `سبک: ${pLbl} (${fa((activeSlide() && activeSlide().seed) || 0)})`;
      els.transitionChip.textContent = `ترنزیشن: ${tLbl}`;
      const hasLogo = (activeSlide() && activeSlide().logo && activeSlide().logo !== false) ||
        (activeSlide() && activeSlide().logo_text) ||
        (state.data && (state.data.logo || state.data.logo_text));
      els.logoChip.textContent = hasLogo && (!activeSlide() || activeSlide().logo !== false) ? `لوگو: ${lLbl}` : "لوگو: خاموش";

      if (state.camOverlap.length) {
        els.camStatusChip.textContent = `هشدار تداخل دوربین (${fa(state.camOverlap.length)})`;
        els.camStatusChip.className = "status-chip warn";
      } else {
        els.camStatusChip.textContent = "ناحیه دوربین آزاد";
        els.camStatusChip.className = "status-chip ok";
      }

      if (!state.playing) {
        state.currentTime = Math.min(state.currentTime, state.duration);
        updateTimeUI();
      } else {
        startClock(0);
      }
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

    // 1. Template switch
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
    els.inspectorBody.appendChild(secMeta);

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

        grid.appendChild(mkNum("افقی (X)", "x", 10, -800, 800));
        grid.appendChild(mkNum("عمودی (Y)", "y", 10, -500, 500));
        grid.appendChild(mkNum("مقیاس", "scale", 0.05, 0.4, 2.2));
        card.appendChild(grid);
        secOv.appendChild(card);
      });

      els.inspectorBody.appendChild(secOv);
    }
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
    setDirty(true);
    renderSlidesList();
    renderInspector();
    reloadStage(true);
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
