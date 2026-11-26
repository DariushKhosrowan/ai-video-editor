/**
 * Visual Curve Studio for Khordegir Editor (/editor/curve-studio.js)
 * Dual visual curve editing:
 *  1) Interactive Chart Curve Studio (line_chart / chart / bar_chart)
 *  2) Interactive Animation Easing Curve Studio (Cubic-Bezier P1/P2 + presets + live test dot)
 */
import {
  EASING_PRESETS,
  clampBezierPoints,
  sampleBezierCurve,
  parseSeriesInput,
  buildChartCurveSamples,
  samplesToSvgPath,
} from "/shared/curveMath.js";

const FA = "۰۱۲۳۴۵۶۷۸۹";
const fa = (v) => String(v ?? "").replace(/[0-9]/g, (d) => FA[+d]);
const SVG_NS = "http://www.w3.org/2000/svg";

const SERIES_PALETTE = [
  { key: "accent", hex: "#f5b700" },
  { key: "danger", hex: "#ef4444" },
  { key: "#38bdf8", hex: "#38bdf8" },
  { key: "#10b981", hex: "#10b981" },
  { key: "muted", hex: "#94a3b8" },
];

function resolveSeriesColor(color) {
  if (!color || color === "accent") return "#f5b700";
  if (color === "danger") return "#ef4444";
  if (color === "muted") return "#94a3b8";
  if (color === "good") return "#10b981";
  return color;
}

function serializeSeriesList(seriesList) {
  return seriesList
    .map((s) => {
      const name = String(s.name || "سری").replace(/:/g, " ");
      const pts = (s.points || [])
        .slice()
        .sort((a, b) => a[0] - b[0])
        .map((p) => `${Number(p[0].toFixed(2))};${Number(p[1].toFixed(2))}`)
        .join(", ");
      return `${name}: ${pts}`;
    })
    .join("\n");
}

function svgEl(tag, attrs = {}, parent = null) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, String(v));
  }
  if (parent) parent.appendChild(el);
  return el;
}

export function renderCurvesTab({ container, slide, projectData, onChange, onApplyProjectCurve }) {
  container.innerHTML = "";
  if (!slide) {
    container.innerHTML = '<div class="empty-state">اسلایدی انتخاب نشده است.</div>';
    return;
  }

  const tpl = String(slide.template || "title_card").replace(/-/g, "_");
  const isLine = tpl === "line_chart" || (tpl === "chart" && slide.chart && slide.chart.type === "line");
  const isBar = tpl === "bar_chart" || (tpl === "chart" && (!slide.chart || slide.chart.type !== "line"));

  /* ================================================================
     SECTION 1: Chart Curve Visual Editor
     ================================================================ */
  const chartSec = document.createElement("div");
  chartSec.className = "inspector-section";
  chartSec.innerHTML = `
    <div class="section-title">
      <span>ویرایشگر بصری منحنی نمودار (Chart Curve)</span>
      <span class="bilingual-sub">Drag & Edit Points</span>
    </div>
  `;

  if (isLine) {
    renderLineChartCurveEditor(chartSec, slide, tpl, onChange);
  } else if (isBar && Array.isArray(slide.data)) {
    renderBarCurveQuickEditor(chartSec, slide, onChange);
  } else {
    const note = document.createElement("div");
    note.className = "curve-empty-note";
    note.innerHTML = `
      <p>این اسلاید از نوع <strong>${tpl}</strong> است. برای رسم منحنی داده و ویرایش نقاط، می‌توانید این اسلاید را به «نمودار خطی» تبدیل کنید یا در پایین منحنی سرعت انیمیشن را تنظیم کنید.</p>
    `;
    chartSec.appendChild(note);
  }
  container.appendChild(chartSec);

  /* ================================================================
     SECTION 2: Animation Easing Curve Studio (Cubic-Bezier)
     ================================================================ */
  const easeSec = document.createElement("div");
  easeSec.className = "inspector-section";
  easeSec.innerHTML = `
    <div class="section-title">
      <span>منحنی نرمی و سرعت انیمیشن (Cubic-Bezier)</span>
      <span class="bilingual-sub">Motion Easing</span>
    </div>
  `;
  renderEasingCurveEditor(easeSec, slide, projectData, onChange, onApplyProjectCurve);
  container.appendChild(easeSec);
}

function renderLineChartCurveEditor(sec, slide, tpl, onChange) {
  const targetObj = tpl === "chart" ? (slide.chart = slide.chart || { type: "line" }) : slide;
  let seriesList = parseSeriesInput(targetObj.series);
  if (!seriesList.length) {
    seriesList = [
      {
        name: "روند اصلی",
        points: [[1, 18], [2, 34], [3, 28], [4, 56], [5, 78]],
        color: "accent",
      },
    ];
  }

  let activeSeriesIdx = 0;
  let selectedPtIdx = seriesList[0].points.length - 1;

  if (!slide.chartCurve || typeof slide.chartCurve !== "object") {
    slide.chartCurve = {
      mode: targetObj.curveMode || (targetObj.smooth === false ? "linear" : "monotone"),
      tension: targetObj.tension ?? 0.5,
      markers: Boolean(targetObj.markers),
    };
  }
  const cc = slide.chartCurve;

  // Controls row: curve mode + tension + markers
  const modeRow = document.createElement("div");
  modeRow.className = "curve-mode-row";
  const modes = [
    ["monotone", "منحنی یکنواخت"],
    ["smooth", "نرم (Catmull-Rom)"],
    ["linear", "خطی (Linear)"],
    ["step", "پله‌ای (Step)"],
  ];
  modes.forEach(([mKey, mLabel]) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pill-tab" + ((cc.mode || "monotone") === mKey ? " active" : "");
    btn.textContent = mLabel;
    btn.addEventListener("click", () => {
      cc.mode = mKey;
      targetObj.curveMode = mKey;
      targetObj.smooth = mKey !== "linear";
      modeRow.querySelectorAll(".pill-tab").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      tensionWrap.classList.toggle("hidden", mKey !== "smooth");
      redraw();
      onChange({ reload: true, autoPlay: false });
    });
    modeRow.appendChild(btn);
  });
  sec.appendChild(modeRow);

  const tensionWrap = document.createElement("label");
  tensionWrap.className = "slider-row" + ((cc.mode || "monotone") === "smooth" ? "" : " hidden");
  tensionWrap.innerHTML = `<span>میزان انحنا (Tension): <strong class="mono-num">${Number(cc.tension ?? 0.5).toFixed(2)}</strong></span>`;
  const tensionInp = document.createElement("input");
  tensionInp.type = "range";
  tensionInp.min = "0.05";
  tensionInp.max = "0.95";
  tensionInp.step = "0.05";
  tensionInp.value = String(cc.tension ?? 0.5);
  tensionInp.addEventListener("input", () => {
    const v = parseFloat(tensionInp.value);
    cc.tension = v;
    targetObj.tension = v;
    tensionWrap.querySelector("strong").textContent = v.toFixed(2);
    redraw();
    onChange({ reload: false, autoPlay: false, debouncedReload: true });
  });
  tensionWrap.appendChild(tensionInp);
  sec.appendChild(tensionWrap);

  const optsRow = document.createElement("div");
  optsRow.className = "curve-opts-row";
  const mkLabel = document.createElement("label");
  mkLabel.className = "toggle-chip";
  const mkChk = document.createElement("input");
  mkChk.type = "checkbox";
  mkChk.checked = Boolean(cc.markers || targetObj.markers);
  mkChk.addEventListener("change", () => {
    cc.markers = mkChk.checked;
    targetObj.markers = mkChk.checked;
    onChange({ reload: true, autoPlay: false });
  });
  mkLabel.append(mkChk, document.createTextNode("نمایش دایره‌های داده (Markers)"));
  optsRow.appendChild(mkLabel);
  sec.appendChild(optsRow);

  // Series tabs
  const serTabs = document.createElement("div");
  serTabs.className = "series-tabs-bar";
  sec.appendChild(serTabs);

  const renderSeriesTabs = () => {
    serTabs.innerHTML = "";
    seriesList.forEach((s, idx) => {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = "series-tab" + (idx === activeSeriesIdx ? " active" : "");
      const swatch = `<span class="series-dot" style="background:${resolveSeriesColor(s.color)}"></span>`;
      tab.innerHTML = `${swatch}<span>${s.name || `سری ${fa(idx + 1)}`}</span>`;
      tab.addEventListener("click", () => {
        activeSeriesIdx = idx;
        selectedPtIdx = Math.max(0, (seriesList[idx].points || []).length - 1);
        renderSeriesTabs();
        redraw();
      });
      serTabs.appendChild(tab);
    });

    const addSerBtn = document.createElement("button");
    addSerBtn.type = "button";
    addSerBtn.className = "icon-btn";
    addSerBtn.textContent = "+ سری";
    addSerBtn.addEventListener("click", () => {
      const basePts = (seriesList[0] && seriesList[0].points) || [[1, 10], [2, 20], [3, 30]];
      const pal = SERIES_PALETTE[seriesList.length % SERIES_PALETTE.length];
      seriesList.push({
        name: `سری ${seriesList.length + 1}`,
        points: basePts.map((p) => [p[0], +(p[1] * 0.72).toFixed(1)]),
        color: pal.key,
      });
      activeSeriesIdx = seriesList.length - 1;
      selectedPtIdx = seriesList[activeSeriesIdx].points.length - 1;
      commitSeries(true);
      renderSeriesTabs();
      redraw();
    });
    serTabs.appendChild(addSerBtn);
  };

  // Interactive SVG Chart Graph
  const svgBox = document.createElement("div");
  svgBox.className = "curve-svg-card";
  const svg = svgEl("svg", { viewBox: "0 0 360 220", class: "curve-svg" }, svgBox);
  sec.appendChild(svgBox);

  const readoutBar = document.createElement("div");
  readoutBar.className = "curve-readout-row";
  sec.appendChild(readoutBar);

  // Vlines editor
  const vlinesWrap = document.createElement("div");
  vlinesWrap.className = "vlines-mini-box";
  sec.appendChild(vlinesWrap);

  const PAD = { l: 34, r: 16, t: 18, b: 28 };
  const GW = 360 - PAD.l - PAD.r;
  const GH = 220 - PAD.t - PAD.b;

  function computeBounds() {
    const allPts = seriesList.flatMap((s) => s.points || []);
    const xs = allPts.map((p) => p[0]);
    const ys = allPts.map((p) => p[1]);
    const xmin = xs.length ? Math.min(...xs) : 0;
    const xmax = xs.length ? Math.max(...xs) : 10;
    const ymin = Math.min(0, ...(ys.length ? ys : [0]));
    const ymaxRaw = ys.length ? Math.max(...ys) : 100;
    const ymax = ymaxRaw <= ymin ? ymin + 100 : Math.ceil((ymaxRaw * 1.12) / 5) * 5;
    return {
      xmin,
      xmax: xmax === xmin ? xmin + 1 : xmax,
      ymin,
      ymax,
    };
  }

  function commitSeries(reload = false) {
    if (Array.isArray(targetObj.series)) {
      targetObj.series = seriesList.map((s) => ({
        name: s.name,
        points: s.points.slice().sort((a, b) => a[0] - b[0]).map((p) => [+p[0].toFixed(2), +p[1].toFixed(2)]),
        color: s.color,
        end_value: s.end_value,
      }));
    } else {
      targetObj.series = serializeSeriesList(seriesList);
    }
    onChange({ reload, autoPlay: false, debouncedReload: !reload });
  }

  function renderVlines() {
    const vlines = Array.isArray(slide.vlines) ? slide.vlines : [];
    vlinesWrap.innerHTML = `<div class="field-label-row"><strong>خطوط رویداد عمودی (Event Markers)</strong></div>`;
    const listRow = document.createElement("div");
    listRow.className = "vlines-list";
    vlines.forEach((vl, i) => {
      const chip = document.createElement("span");
      chip.className = "vline-chip mono-num";
      chip.innerHTML = `<span>X=${vl.x}: ${vl.label || ""}</span>`;
      const del = document.createElement("button");
      del.type = "button";
      del.textContent = "×";
      del.addEventListener("click", () => {
        vlines.splice(i, 1);
        slide.vlines = vlines;
        renderVlines();
        redraw();
        onChange({ reload: true, autoPlay: false });
      });
      chip.appendChild(del);
      listRow.appendChild(chip);
    });
    vlinesWrap.appendChild(listRow);

    const addRow = document.createElement("div");
    addRow.className = "vline-add-row";
    const xInp = document.createElement("input");
    xInp.type = "number";
    xInp.dir = "ltr";
    xInp.className = "text-input compact";
    xInp.placeholder = "X";
    xInp.style.width = "64px";
    const lblInp = document.createElement("input");
    lblInp.type = "text";
    lblInp.className = "text-input compact";
    lblInp.placeholder = "برچسب رویداد (مثلاً اوج رشد)";
    lblInp.style.flex = "1";
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "btn btn-sm btn-ghost";
    addBtn.textContent = "+ علامت";
    addBtn.addEventListener("click", () => {
      if (!lblInp.value.trim() && xInp.value === "") return;
      if (!Array.isArray(slide.vlines)) slide.vlines = [];
      slide.vlines.push({
        x: Number(xInp.value) || 1,
        label: lblInp.value.trim() || "رویداد",
        color: "accent",
      });
      renderVlines();
      redraw();
      onChange({ reload: true, autoPlay: false });
    });
    addRow.append(xInp, lblInp, addBtn);
    vlinesWrap.appendChild(addRow);
  }

  let dragState = null;

  function redraw() {
    svg.innerHTML = "";
    const bounds = computeBounds();
    const toPxX = (x) => PAD.l + ((x - bounds.xmin) / (bounds.xmax - bounds.xmin)) * GW;
    const toPxY = (y) => PAD.t + GH - ((y - bounds.ymin) / (bounds.ymax - bounds.ymin)) * GH;
    const fromPxX = (px) => bounds.xmin + ((px - PAD.l) / GW) * (bounds.xmax - bounds.xmin);
    const fromPxY = (py) => bounds.ymin + ((PAD.t + GH - py) / GH) * (bounds.ymax - bounds.ymin);

    // Grid
    for (let i = 0; i <= 4; i += 1) {
      const y = PAD.t + (GH * i) / 4;
      svgEl("line", { x1: PAD.l, y1: y, x2: PAD.l + GW, y2: y, stroke: "rgba(255,255,255,0.08)", "stroke-dasharray": "3 3" }, svg);
      const val = bounds.ymax - ((bounds.ymax - bounds.ymin) * i) / 4;
      const t = svgEl("text", { x: PAD.l - 5, y: y + 3, fill: "#64748b", "font-size": "9", "text-anchor": "end" }, svg);
      t.textContent = String(Math.round(val));
    }

    // Vlines
    if (Array.isArray(slide.vlines)) {
      slide.vlines.forEach((vl) => {
        const vx = toPxX(Number(vl.x) || 0);
        if (vx >= PAD.l - 5 && vx <= PAD.l + GW + 5) {
          svgEl("line", { x1: vx, y1: PAD.t, x2: vx, y2: PAD.t + GH, stroke: "#f5b700", "stroke-width": "1.5", "stroke-dasharray": "4 3", opacity: "0.65" }, svg);
        }
      });
    }

    // Series curves
    seriesList.forEach((s, sIdx) => {
      const sorted = (s.points || []).slice().sort((a, b) => a[0] - b[0]);
      if (!sorted.length) return;
      const pxPts = sorted.map((p) => [toPxX(p[0]), toPxY(p[1])]);
      const samples = buildChartCurveSamples(pxPts, cc.mode || "monotone", cc.tension ?? 0.5);
      const d = samplesToSvgPath(samples);
      const color = resolveSeriesColor(s.color);
      const isAct = sIdx === activeSeriesIdx;

      if (isAct && samples.length > 1) {
        const areaD = `${d} L${samples[samples.length - 1][0].toFixed(1)},${(PAD.t + GH).toFixed(1)} L${samples[0][0].toFixed(1)},${(PAD.t + GH).toFixed(1)} Z`;
        svgEl("path", { d: areaD, fill: color, opacity: "0.12" }, svg);
      }

      svgEl("path", {
        d,
        fill: "none",
        stroke: color,
        "stroke-width": isAct ? "3" : "1.8",
        "stroke-linecap": "round",
        opacity: isAct ? "1" : "0.45",
      }, svg);

      if (isAct) {
        sorted.forEach((pt, ptIdx) => {
          const cx = toPxX(pt[0]);
          const cy = toPxY(pt[1]);
          const isSel = ptIdx === selectedPtIdx;
          const handle = svgEl("circle", {
            cx,
            cy,
            r: isSel ? 7.5 : 5.5,
            fill: isSel ? "#ffffff" : color,
            stroke: isSel ? color : "#0b0e14",
            "stroke-width": isSel ? 3 : 2,
            class: "curve-pt-handle",
          }, svg);
          handle.addEventListener("pointerdown", (ev) => {
            ev.stopPropagation();
            selectedPtIdx = ptIdx;
            dragState = { sIdx, ptIdx, bounds, toPxX, toPxY, fromPxX, fromPxY };
            handle.setPointerCapture(ev.pointerId);
            updateReadout();
            redraw();
          });
          handle.addEventListener("pointermove", (ev) => {
            if (!dragState || dragState.ptIdx !== ptIdx || dragState.sIdx !== sIdx) return;
            const rect = svg.getBoundingClientRect();
            const sx = ((ev.clientX - rect.left) / rect.width) * 360;
            const sy = ((ev.clientY - rect.top) / rect.height) * 220;
            const clampedX = Math.max(PAD.l, Math.min(PAD.l + GW, sx));
            const clampedY = Math.max(PAD.t, Math.min(PAD.t + GH, sy));
            const nextX = +dragState.fromPxX(clampedX).toFixed(2);
            const nextY = +dragState.fromPxY(clampedY).toFixed(1);
            pt[0] = nextX;
            pt[1] = nextY;
            updateReadout();
            redraw();
            commitSeries(false);
          });
          handle.addEventListener("pointerup", () => {
            if (dragState) {
              seriesList[sIdx].points.sort((a, b) => a[0] - b[0]);
              dragState = null;
              commitSeries(true);
              redraw();
            }
          });
        });
      }
    });

    svg.onclick = (ev) => {
      if (ev.target.classList.contains("curve-pt-handle")) return;
      const rect = svg.getBoundingClientRect();
      const sx = ((ev.clientX - rect.left) / rect.width) * 360;
      const sy = ((ev.clientY - rect.top) / rect.height) * 220;
      if (sx < PAD.l || sx > PAD.l + GW || sy < PAD.t || sy > PAD.t + GH) return;
      const newX = +fromPxX(sx).toFixed(2);
      const newY = +fromPxY(sy).toFixed(1);
      const target = seriesList[activeSeriesIdx];
      target.points.push([newX, newY]);
      target.points.sort((a, b) => a[0] - b[0]);
      selectedPtIdx = target.points.findIndex((p) => p[0] === newX && p[1] === newY);
      commitSeries(true);
      redraw();
      updateReadout();
    };

    updateReadout();
  }

  function updateReadout() {
    const ser = seriesList[activeSeriesIdx];
    const pts = (ser && ser.points) || [];
    const pt = pts[selectedPtIdx] || pts[0];
    readoutBar.innerHTML = "";

    const info = document.createElement("span");
    info.className = "mono-num curve-pt-readout";
    info.dir = "ltr";
    info.textContent = pt ? `X: ${pt[0]} · Y: ${pt[1]}` : "نقطه‌ای انتخاب نشده";
    readoutBar.appendChild(info);

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "5px";

    const delPtBtn = document.createElement("button");
    delPtBtn.type = "button";
    delPtBtn.className = "icon-btn danger";
    delPtBtn.textContent = "حذف نقطه";
    delPtBtn.disabled = pts.length <= 2;
    delPtBtn.addEventListener("click", () => {
      if (pts.length <= 2) return;
      pts.splice(Math.max(0, selectedPtIdx), 1);
      selectedPtIdx = Math.max(0, selectedPtIdx - 1);
      commitSeries(true);
      redraw();
    });
    actions.appendChild(delPtBtn);

    if (seriesList.length > 1) {
      const delSerBtn = document.createElement("button");
      delSerBtn.type = "button";
      delSerBtn.className = "icon-btn danger";
      delSerBtn.textContent = "حذف سری";
      delSerBtn.addEventListener("click", () => {
        seriesList.splice(activeSeriesIdx, 1);
        activeSeriesIdx = Math.max(0, activeSeriesIdx - 1);
        selectedPtIdx = 0;
        commitSeries(true);
        renderSeriesTabs();
        redraw();
      });
      actions.appendChild(delSerBtn);
    }

    readoutBar.appendChild(actions);
  }

  renderSeriesTabs();
  renderVlines();
  redraw();
}

function renderBarCurveQuickEditor(sec, slide, onChange) {
  const rows = Array.isArray(slide.data) ? slide.data : [];
  if (!rows.length) return;
  const maxVal = Math.max(10, ...rows.map((r) => Math.abs(parseFloat(r.value) || 0)));

  const wrap = document.createElement("div");
  wrap.className = "bar-curve-sliders";
  rows.forEach((row) => {
    const item = document.createElement("label");
    item.className = "slider-row";
    const cur = parseFloat(row.value) || 0;
    item.innerHTML = `<span>${row.label || "ستون"}: <strong class="mono-num">${cur}</strong></span>`;
    const inp = document.createElement("input");
    inp.type = "range";
    inp.min = "0";
    inp.max = String(Math.ceil(maxVal * 1.4));
    inp.step = "1";
    inp.value = String(cur);
    inp.addEventListener("input", () => {
      row.value = Number(inp.value);
      item.querySelector("strong").textContent = String(row.value);
      onChange({ reload: false, autoPlay: false, debouncedReload: true });
    });
    item.appendChild(inp);
    wrap.appendChild(item);
  });
  sec.appendChild(wrap);
}

function renderEasingCurveEditor(sec, slide, projectData, onChange, onApplyProjectCurve) {
  if (!slide.motionCurve || typeof slide.motionCurve !== "object") {
    const projMc = projectData && projectData.motionCurve;
    slide.motionCurve = projMc
      ? JSON.parse(JSON.stringify(projMc))
      : { preset: "youtube-snappy", points: [...EASING_PRESETS["youtube-snappy"].points], durationScale: 0.9, staggerScale: 0.85 };
  }
  const mc = slide.motionCurve;
  mc.points = clampBezierPoints(mc.points);

  // Preset chips
  const presetGrid = document.createElement("div");
  presetGrid.className = "preset-chips-grid";
  Object.entries(EASING_PRESETS).forEach(([key, spec]) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "pill-tab" + (mc.preset === key ? " active" : "");
    chip.textContent = spec.label.split("(")[0].trim();
    chip.title = spec.label;
    chip.addEventListener("click", () => {
      mc.preset = key;
      mc.points = [...spec.points];
      mc.durationScale = spec.durationScale;
      mc.staggerScale = spec.staggerScale;
      durSlider.value = String(mc.durationScale);
      stgSlider.value = String(mc.staggerScale);
      durValEl.textContent = `${mc.durationScale.toFixed(2)}x`;
      stgValEl.textContent = `${mc.staggerScale.toFixed(2)}x`;
      presetGrid.querySelectorAll(".pill-tab").forEach((b) => b.classList.remove("active"));
      chip.classList.add("active");
      drawBezier();
      playPreviewDot();
      onChange({ reload: true, autoPlay: true });
    });
    presetGrid.appendChild(chip);
  });
  sec.appendChild(presetGrid);

  // Interactive SVG Bezier box
  const bezWrap = document.createElement("div");
  bezWrap.className = "curve-svg-card";
  const svg = svgEl("svg", { viewBox: "0 0 240 220", class: "curve-svg bezier-svg" }, bezWrap);
  sec.appendChild(bezWrap);

  // Preview animation bar
  const previewWrap = document.createElement("div");
  previewWrap.className = "bezier-preview-bar";
  previewWrap.innerHTML = `
    <button type="button" class="btn btn-sm btn-ghost">▶ تست نرمی حرکت</button>
    <div class="bezier-track"><span class="bezier-dot"></span></div>
    <span class="mono-num bezier-coords" dir="ltr"></span>
  `;
  sec.appendChild(previewWrap);
  const testBtn = previewWrap.querySelector("button");
  const dot = previewWrap.querySelector(".bezier-dot");
  const coordsEl = previewWrap.querySelector(".bezier-coords");

  let animRaf = 0;
  function playPreviewDot() {
    cancelAnimationFrame(animRaf);
    const pts = clampBezierPoints(mc.points);
    const durMs = 700 * (Number(mc.durationScale) || 1);
    const t0 = performance.now();
    // Solve bezier inline using sample table for smooth RAF
    const samples = sampleBezierCurve(pts, 40);
    const evalY = (u) => {
      const idx = Math.min(samples.length - 1, Math.max(0, Math.round(u * (samples.length - 1))));
      return samples[idx][1];
    };
    const tick = () => {
      const p = Math.min(1, (performance.now() - t0) / durMs);
      const val = evalY(p);
      dot.style.left = `${(8 + val * 84).toFixed(1)}%`;
      if (p < 1) animRaf = requestAnimationFrame(tick);
    };
    animRaf = requestAnimationFrame(tick);
  }
  testBtn.addEventListener("click", playPreviewDot);

  // Speed & stagger sliders
  const durRow = document.createElement("label");
  durRow.className = "slider-row";
  durRow.innerHTML = `<span class="field-label-row"><span>سرعت کلی <span class="bilingual-sub" dir="ltr">(Duration Scale)</span></span><strong class="mono-num" dir="ltr">${Number(mc.durationScale || 1).toFixed(2)}x</strong></span>`;
  const durValEl = durRow.querySelector("strong");
  const durSlider = document.createElement("input");
  durSlider.type = "range";
  durSlider.min = "0.4";
  durSlider.max = "2.0";
  durSlider.step = "0.05";
  durSlider.value = String(mc.durationScale || 1);
  durSlider.addEventListener("input", () => {
    mc.durationScale = parseFloat(durSlider.value);
    durValEl.textContent = `${mc.durationScale.toFixed(2)}x`;
    onChange({ reload: false, autoPlay: false, debouncedReload: true });
  });
  durRow.appendChild(durSlider);
  sec.appendChild(durRow);

  const stgRow = document.createElement("label");
  stgRow.className = "slider-row";
  stgRow.innerHTML = `<span class="field-label-row"><span>فاصلهٔ آبشاری المان‌ها <span class="bilingual-sub" dir="ltr">(Stagger)</span></span><strong class="mono-num" dir="ltr">${Number(mc.staggerScale || 1).toFixed(2)}x</strong></span>`;
  const stgValEl = stgRow.querySelector("strong");
  const stgSlider = document.createElement("input");
  stgSlider.type = "range";
  stgSlider.min = "0.35";
  stgSlider.max = "2.0";
  stgSlider.step = "0.05";
  stgSlider.value = String(mc.staggerScale || 1);
  stgSlider.addEventListener("input", () => {
    mc.staggerScale = parseFloat(stgSlider.value);
    stgValEl.textContent = `${mc.staggerScale.toFixed(2)}x`;
    onChange({ reload: false, autoPlay: false, debouncedReload: true });
  });
  stgRow.appendChild(stgSlider);
  sec.appendChild(stgRow);

  // Apply to entire project button
  const footerRow = document.createElement("div");
  footerRow.className = "btn-row-wrap";
  const applyAllBtn = document.createElement("button");
  applyAllBtn.type = "button";
  applyAllBtn.className = "btn btn-sm btn-amber";
  applyAllBtn.textContent = "اعمال روی تمام اسلایدهای پروژه";
  applyAllBtn.addEventListener("click", () => {
    if (onApplyProjectCurve) onApplyProjectCurve(JSON.parse(JSON.stringify(mc)));
  });
  footerRow.appendChild(applyAllBtn);
  sec.appendChild(footerRow);

  // Coordinate mapper for SVG Bezier Box: unit [0..1] in X=[40..200], Y=[165..45] (allows overshoot!)
  const BX0 = 40, BX1 = 200, BY0 = 170, BY1 = 50;
  const mapX = (u) => BX0 + u * (BX1 - BX0);
  const mapY = (v) => BY0 - v * (BY0 - BY1);
  const unmapX = (px) => Math.max(0, Math.min(1, (px - BX0) / (BX1 - BX0)));
  const unmapY = (py) => Math.max(-0.45, Math.min(1.65, (BY0 - py) / (BY0 - BY1)));

  let dragHandle = null;

  function drawBezier() {
    svg.innerHTML = "";
    const [x1, y1, x2, y2] = clampBezierPoints(mc.points);
    coordsEl.textContent = `(${x1.toFixed(2)}, ${y1.toFixed(2)}, ${x2.toFixed(2)}, ${y2.toFixed(2)})`;

    // Unit square + diagonal
    svgEl("rect", {
      x: BX0, y: BY1, width: BX1 - BX0, height: BY0 - BY1,
      fill: "rgba(255,255,255,0.02)", stroke: "rgba(255,255,255,0.14)", rx: 4,
    }, svg);
    svgEl("line", {
      x1: BX0, y1: BY0, x2: BX1, y2: BY1,
      stroke: "rgba(255,255,255,0.1)", "stroke-dasharray": "4 4",
    }, svg);

    // Tangent lines
    const p1x = mapX(x1), p1y = mapY(y1);
    const p2x = mapX(x2), p2y = mapY(y2);
    svgEl("line", { x1: BX0, y1: BY0, x2: p1x, y2: p1y, stroke: "#f5b700", "stroke-width": 1.6, opacity: 0.7 }, svg);
    svgEl("line", { x1: BX1, y1: BY1, x2: p2x, y2: p2y, stroke: "#38bdf8", "stroke-width": 1.6, opacity: 0.7 }, svg);

    // Sampled curve
    const samples = sampleBezierCurve([x1, y1, x2, y2], 48);
    const d = samples.map((p, idx) => `${idx === 0 ? "M" : "L"}${mapX(p[0]).toFixed(1)},${mapY(p[1]).toFixed(1)}`).join(" ");
    svgEl("path", { d, fill: "none", stroke: "#f8fafc", "stroke-width": 3, "stroke-linecap": "round" }, svg);

    // Endpoints
    svgEl("circle", { cx: BX0, cy: BY0, r: 4, fill: "#64748b" }, svg);
    svgEl("circle", { cx: BX1, cy: BY1, r: 4, fill: "#64748b" }, svg);

    const makeHandle = (cx, cy, color, index) => {
      const h = svgEl("circle", { cx, cy, r: 8, fill: color, stroke: "#0b0e14", "stroke-width": 2.5, class: "curve-pt-handle" }, svg);
      h.addEventListener("pointerdown", (ev) => {
        ev.stopPropagation();
        dragHandle = index;
        h.setPointerCapture(ev.pointerId);
      });
      h.addEventListener("pointermove", (ev) => {
        if (dragHandle !== index) return;
        const rect = svg.getBoundingClientRect();
        const sx = ((ev.clientX - rect.left) / rect.width) * 240;
        const sy = ((ev.clientY - rect.top) / rect.height) * 220;
        const nx = +unmapX(sx).toFixed(2);
        const ny = +unmapY(sy).toFixed(2);
        if (index === 1) {
          mc.points[0] = nx;
          mc.points[1] = ny;
        } else {
          mc.points[2] = nx;
          mc.points[3] = ny;
        }
        mc.preset = "custom";
        presetGrid.querySelectorAll(".pill-tab").forEach((b) => b.classList.remove("active"));
        drawBezier();
      });
      h.addEventListener("pointerup", () => {
        if (dragHandle === index) {
          dragHandle = null;
          playPreviewDot();
          onChange({ reload: true, autoPlay: true });
        }
      });
    };

    makeHandle(p1x, p1y, "#f5b700", 1);
    makeHandle(p2x, p2y, "#38bdf8", 2);
  }

  drawBezier();
}
