/* Chart plug-ins for the stage. Each chart: Stage.charts.<type>(A, parentBox, spec, t0) draws inside parentBox
   (a positioned div with fixed width/height). Add a new chart type by adding a function here.
   Rule: bars and lines never move after they have entered. */
(function () {
  const S = window.Stage;
  const C = S.charts = {};

  function niceStep(span, n = 4) {
    if (span <= 0) return 1;
    const raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    for (const m of [1, 2, 2.5, 5, 10]) if (raw <= m * mag) return m * mag;
    return 10 * mag;
  }
  function niceMax(v) { if (v <= 0) return 1; const st = niceStep(v * 1.08); return Math.ceil(v * 1.08 / st) * st; }

  function items(spec) {
    let d = spec.data || spec.series || [];
    if (!Array.isArray(d)) d = Object.entries(d).map(([label, value]) => ({ label, value }));
    d = d.map((x) => Array.isArray(x) ? { label: x[0], value: x[1] } : Object.assign({}, x));
    const ser = S.theme.colors.series;
    d.forEach((x, i) => {
      x.v = S.toNum(x.value); x.dec = x.decimals ?? S.decOf(x.value);
      if (!x.color) {
        if (spec.highlight != null && spec.highlight !== "") x.color = (spec.highlight == i || String(spec.highlight) === String(x.label)) ? "accent" : "#5A5A5A";
        else if (spec.colors) x.color = spec.colors[i % spec.colors.length];
        else x.color = ser[i % ser.length];
      }
    });
    return d;
  }

  /* ------------------------------------------------------------ bar (vertical) */
  C.bar = function (A, box, spec, t0 = 0) {
    if ((spec.orientation || "").startsWith("h")) return C.hbar(A, box, spec, t0);
    const M = S.theme.motion, its = items(spec), n = its.length || 1;
    const W = box.clientWidth, H = box.clientHeight;
    const pre = spec.prefix || "", suf = spec.suffix || "";
    const axis = spec.axis !== false;
    const vsize = spec.value_size || S.theme.type.value.size;
    const vmin = Math.min(0, ...its.map((d) => d.v));
    const vmax = spec.ymax != null ? S.toNum(spec.ymax) : niceMax(Math.max(...its.map((d) => d.v), 1e-9));
    const step = spec.ystep ? S.toNum(spec.ystep) : niceStep(vmax - vmin);
    // category labels first (to know their height)
    const axW = axis ? 110 : 0;
    const slot = (W - axW) / n;
    const order = spec.order === "rtl" ? its.map((_, i) => n - 1 - i) : its.map((_, i) => i);
    const labs = order.map((i) => {
      const l = A.text(box, its[i].label, "label", "abs", { width: slot * 0.92, textAlign: "center", color: S.color(its[i].label_color || "text") });
      return l;
    });
    const labH = Math.max(0, ...labs.map((l) => l.offsetHeight)) + 24;
    const valH = vsize * 1.3 + 8;
    const py0 = valH, py1 = H - labH, px0 = axW, px1 = W;
    const Y = (v) => py0 + (vmax - v) / ((vmax - vmin) || 1) * (py1 - py0);
    const grid = A.el("div", "abs", box, { left: 0, top: 0, width: W, height: H });
    if (axis) {
      for (let v = vmin; v <= vmax + 1e-9; v += step) {
        const y = Y(v);
        if (Math.abs(v) > 1e-9) A.el("div", "abs", grid, { left: px0, top: y, width: px1 - px0, height: 0, borderTop: `2px dashed ${S.theme.colors.grid}` });
        A.text(grid, S.fmt(v, S.decOf(step)) + suf, "axis", "abs", { right: W - px0 + 18, top: y - 18, color: S.theme.colors.muted, whiteSpace: "nowrap" });
      }
    }
    A.el("div", "abs", grid, { left: px0, top: Y(0) - 1.5, width: px1 - px0, height: 3, background: S.theme.colors.axis });
    S.tl.from(grid, { opacity: 0, duration: M.axes.dur, ease: S.ease(M.axes.ease), immediateRender: true }, t0 + M.axes.delay);
    const bw = Math.min(spec.bar_width || 250, slot * 0.56);
    order.forEach((i, k) => {
      const d = its[i];
      const cx = px0 + slot * (k + 0.5);
      const t = t0 + M.bar.delay + k * M.bar.stagger;
      const neg = d.v < 0;
      const top = Y(Math.max(d.v, 0)), bot = Y(Math.min(d.v, 0));
      const bar = A.el("div", "abs bar", box, { left: cx - bw / 2, top, width: bw, height: Math.max(3, bot - top), background: S.color(d.color),
        borderRadius: neg ? "0 0 8px 8px" : "8px 8px 0 0", transformOrigin: neg ? "50% 0%" : "50% 100%" });
      S.tl.from(bar, { scaleY: 0, duration: M.bar.dur, ease: S.ease(M.bar.ease), immediateRender: true }, t);
      if (S.fx) S.fx.cue(t + M.bar.dur * 0.9, "bar", String(d.label));
      const vc = d.value_color || (d.color === "#5A5A5A" ? "muted" : d.color);
      if (spec.show_values !== false) {
        const v = A.el("div", "abs t-value", box, { left: cx - slot / 2, width: slot, textAlign: "center", color: S.color(vc), fontSize: vsize });
        if (d.display != null) { v.innerHTML = S.rich(d.display); v.style.fontSize = (spec.display_size || 40) + "px"; }
        else A.count(v, { to: d.v, decimals: d.dec, prefix: d.prefix ?? pre, suffix: d.suffix ?? suf, at: t, enter: false });
        const h = v.offsetHeight;
        v.style.top = (neg ? (d.display != null ? Y(0) - h - 8 : bot + 8) : top - h - 6) + "px";
        v.style.display = "flex"; v.style.justifyContent = "center";
        S.tl.from(v, { opacity: 0, y: 10, duration: 0.4, ease: S.ease("power4"), immediateRender: true }, t + 0.05);
      }
      const l = labs[k];
      l.style.left = (cx - slot * 0.46) + "px";
      l.style.top = (H - labH + 16) + "px";
      A.enter(l, "body", 0, 0, { at: t + 0.08, x: 0, y: 10 });
    });
  };

  /* ------------------------------------------------------------ bar (horizontal, RTL) */
  C.hbar = function (A, box, spec, t0 = 0) {
    const M = S.theme.motion, its = items(spec), n = its.length || 1;
    const W = box.clientWidth, H = box.clientHeight;
    const pre = spec.prefix || "", suf = spec.suffix || "";
    const labs = its.map((d) => A.text(box, d.label, "label", "abs", { whiteSpace: "nowrap" }));
    const labW = Math.min(W * 0.36, Math.max(...labs.map((l) => l.offsetWidth)) + 30);
    const vsize = spec.value_size || 52;
    const px1 = W - labW, px0 = vsize * 3.4;
    const vmax = spec.ymax != null ? S.toNum(spec.ymax) : Math.max(...its.map((d) => d.v));
    const row = H / n, bh = Math.min(spec.bar_width || 90, row * 0.58);
    const ax = A.el("div", "abs", box, { left: px1, top: 0, width: 3, height: H, background: S.theme.colors.axis });
    S.tl.from(ax, { opacity: 0, duration: M.axes.dur, immediateRender: true }, t0);
    its.forEach((d, i) => {
      const cy = row * (i + 0.5), t = t0 + M.bar.delay + i * M.bar.stagger;
      const bw = Math.max(3, d.v / (vmax || 1) * (px1 - px0));
      const bar = A.el("div", "abs bar", box, { left: px1 - bw, top: cy - bh / 2, width: bw, height: bh, background: S.color(d.color), borderRadius: "8px 0 0 8px", transformOrigin: "100% 50%" });
      S.tl.from(bar, { scaleX: 0, duration: M.bar.dur, ease: S.ease(M.bar.ease), immediateRender: true }, t);
      const v = A.el("div", "abs t-value", box, { fontSize: vsize, color: S.color(d.color === "#5A5A5A" ? "muted" : d.color) });
      A.count(v, { to: d.v, decimals: d.dec, prefix: d.prefix ?? pre, suffix: d.suffix ?? suf, at: t, enter: false });
      v.style.right = (W - (px1 - bw) + 16) + "px"; v.style.top = (cy - v.offsetHeight / 2) + "px";
      S.tl.from(v, { opacity: 0, duration: 0.4, immediateRender: true }, t + 0.05);
      const l = labs[i]; l.style.right = "0px"; l.style.top = (cy - l.offsetHeight / 2) + "px";
      A.enter(l, "body", 0, 0, { at: t });
    });
  };

  /* ------------------------------------------------------------ line */
  function monotone(xs, ys, samples = 20) {
    const n = xs.length; if (n < 3) return xs.map((x, i) => [x, ys[i]]);
    const d = []; for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / ((xs[i + 1] - xs[i]) || 1e-9));
    const m = [d[0]]; for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] > 0 ? (d[i - 1] + d[i]) / 2 : 0); m.push(d[n - 2]);
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
      const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
      if (s > 9) { const tau = 3 / Math.sqrt(s); m[i] = tau * a * d[i]; m[i + 1] = tau * b * d[i]; }
    }
    const out = [];
    for (let i = 0; i < n - 1; i++) {
      const h = xs[i + 1] - xs[i];
      for (let k = 0; k < samples; k++) {
        const t = k / samples, h00 = 2 * t ** 3 - 3 * t ** 2 + 1, h10 = t ** 3 - 2 * t ** 2 + t, h01 = -2 * t ** 3 + 3 * t ** 2, h11 = t ** 3 - t ** 2;
        out.push([xs[i] + t * h, h00 * ys[i] + h10 * h * m[i] + h01 * ys[i + 1] + h11 * h * m[i + 1]]);
      }
    }
    out.push([xs[n - 1], ys[n - 1]]);
    return out;
  }

  C.line = function (A, box, spec, t0 = 0) {
    const M = S.theme.motion, col = S.theme.colors;
    const W = box.clientWidth, H = box.clientHeight;
    const ser = (spec.series || []).map((s, i) => {
      s = Object.assign({}, s);
      s.pts = s.points ? s.points.map((p) => [S.toNum(p[0]), S.toNum(p[1])]) : (s.values || []).map((v, j) => [j + 1, S.toNum(v)]);
      s.color = s.color || col.series[i % col.series.length];
      return s;
    });
    const X = spec.x || {}, Yc = spec.y || {};
    const allx = ser.flatMap((s) => s.pts.map((p) => p[0])), ally = ser.flatMap((s) => s.pts.map((p) => p[1]));
    const xmin = X.min != null ? S.toNum(X.min) : Math.min(...allx), xmax = X.max != null ? S.toNum(X.max) : Math.max(...allx);
    const ymin = Yc.min != null ? S.toNum(Yc.min) : Math.min(0, ...ally);
    const ymax = Yc.max != null ? S.toNum(Yc.max) : niceMax(Math.max(...ally));
    const ysuf = Yc.suffix || spec.suffix || "";
    let yt = Yc.ticks;
    if (!yt) { yt = []; const st = niceStep(ymax - ymin); for (let v = ymin; v <= ymax + 1e-9; v += st) yt.push(v); }
    yt = yt.map((t) => Array.isArray(t) ? [S.toNum(t[0]), t[1]] : [S.toNum(t), S.fmt(S.toNum(t), S.decOf(t)) + ysuf]);
    // measure y labels and end labels
    const ylabs = yt.map(([v, l]) => A.text(box, l, "axis", "abs", { color: col.muted, whiteSpace: "nowrap" }));
    const axW = Math.max(10, ...ylabs.map((e) => e.offsetWidth)) + 24;
    const ends = ser.map((s) => {
      let lab = s.name || "";
      if (s.end_value) lab += (lab ? "  " : "") + S.fmt(s.pts[s.pts.length - 1][1], s.decimals || 0) + (s.suffix ?? ysuf);
      if (!lab) return null;
      return A.text(box, lab, "label", "abs", { color: S.color(s.color), whiteSpace: "nowrap", fontSize: s.label_size ? s.label_size + "px" : null });
    });
    const endW = Math.min(W * 0.32, Math.max(0, ...ends.filter(Boolean).map((e) => e.offsetWidth)) + 28);
    const topPad = (spec.vlines && spec.vlines.length) ? 56 : 18, xlH = 50 + (X.title ? 40 : 0);
    const px0 = axW, px1 = W - endW, py0 = topPad, py1 = H - xlH;
    const PX = (v) => px0 + (v - xmin) / ((xmax - xmin) || 1) * (px1 - px0);
    const PY = (v) => py1 - (v - ymin) / ((ymax - ymin) || 1) * (py1 - py0);
    const grid = A.el("div", "abs", box, { left: 0, top: 0, width: W, height: H });
    yt.forEach(([v], i) => {
      const y = PY(v), l = ylabs[i];
      grid.appendChild(l); l.style.right = (W - px0 + 14) + "px"; l.style.top = (y - l.offsetHeight / 2) + "px";
      if (spec.grid !== false && Math.abs(v - ymin) > 1e-9) A.el("div", "abs", grid, { left: px0, top: y, width: px1 - px0, borderTop: `2px dashed ${col.grid}` });
    });
    A.el("div", "abs", grid, { left: px0, top: py1 - 1.5, width: px1 - px0, height: 3, background: col.axis });
    A.el("div", "abs", grid, { left: px0 - 1.5, top: py0 - 10, width: 3, height: py1 - py0 + 10, background: col.axis });
    const xt = X.ticks || [...new Set(allx)].sort((a, b) => a - b).map((v) => [v, S.fmt(v)]);
    xt.forEach((t) => {
      const [v, lab] = Array.isArray(t) ? [S.toNum(t[0]), t[1]] : [S.toNum(t), S.fmt(S.toNum(t))];
      const e = A.text(grid, lab, "axis", "abs", { color: X.bright ? col.text : col.muted, whiteSpace: "nowrap" });
      e.style.left = (PX(v) - e.offsetWidth / 2) + "px"; e.style.top = (py1 + 10) + "px";
    });
    if (X.title) { const e = A.text(grid, X.title, "axis", "abs", { color: col.muted }); e.style.left = ((px0 + px1) / 2 - e.offsetWidth / 2) + "px"; e.style.top = (py1 + 50) + "px"; }
    S.tl.from(grid, { opacity: 0, duration: M.axes.dur, immediateRender: true }, t0);
    (spec.vlines || []).forEach((vl, j) => {
      const x = PX(S.toNum(vl.x)), t = t0 + 0.15 + j * 0.1;
      const ln = A.el("div", "abs", box, { left: x - 1.5, top: py0 - 4, width: 0, height: py1 - py0 + 4, borderLeft: `3px dashed ${S.color(vl.color || "muted")}`, transformOrigin: "50% 0%" });
      S.tl.from(ln, { scaleY: 0, duration: 0.5, ease: S.ease("power3"), immediateRender: true }, t);
      if (vl.label) {
        const e = A.text(box, vl.label, "label", "abs", { color: S.color(vl.color || "muted"), whiteSpace: "nowrap", fontSize: (vl.size || 28) + "px" });
        e.style.left = (x - e.offsetWidth / 2) + "px"; e.style.top = (py0 - 16 - e.offsetHeight) + "px";
        A.enter(e, "body", 0, 0, { at: t + 0.12, x: 0, y: 8 });
      }
    });
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", W); svg.setAttribute("height", H); svg.style.position = "absolute"; svg.style.left = 0; svg.style.top = 0; svg.style.overflow = "visible";
    box.appendChild(svg);
    const defs = document.createElementNS(svgNS, "defs"); svg.appendChild(defs);
    ser.forEach((s, i) => {
      if (!s.pts.length) return;
      const xs = s.pts.map((p) => PX(p[0])), ys = s.pts.map((p) => PY(p[1]));
      const path = (spec.smooth !== false && s.smooth !== false) ? monotone(xs, ys) : xs.map((x, k) => [x, ys[k]]);
      const id = "clip" + i + Math.random().toString(36).slice(2, 7);
      const cp = document.createElementNS(svgNS, "clipPath"); cp.id = id;
      const r = document.createElementNS(svgNS, "rect");
      r.setAttribute("x", Math.min(...xs) - 20); r.setAttribute("y", -50); r.setAttribute("height", H + 100); r.setAttribute("width", Math.max(...xs) - Math.min(...xs) + 40);
      cp.appendChild(r); defs.appendChild(cp);
      const g = document.createElementNS(svgNS, "g"); g.setAttribute("clip-path", `url(#${id})`); svg.appendChild(g);
      const p = document.createElementNS(svgNS, "path");
      p.setAttribute("d", "M" + path.map((q) => q[0].toFixed(1) + " " + q[1].toFixed(1)).join(" L"));
      p.setAttribute("fill", "none"); p.setAttribute("stroke", S.color(s.color)); p.setAttribute("stroke-width", s.width || 7);
      p.setAttribute("stroke-linecap", "round"); p.setAttribute("stroke-linejoin", "round");
      if (s.dashed) p.setAttribute("stroke-dasharray", `${(s.width || 7) * 2.6} ${(s.width || 7) * 2.2}`);
      g.appendChild(p);
      if (spec.markers || s.markers) xs.forEach((x, k) => {
        const c = document.createElementNS(svgNS, "circle"); c.setAttribute("cx", x); c.setAttribute("cy", ys[k]); c.setAttribute("r", (s.width || 7) * 1.3);
        c.setAttribute("fill", S.color(s.marker_color || "accent")); c.setAttribute("stroke", col.bg); c.setAttribute("stroke-width", 4); g.appendChild(c);
      });
      const t = t0 + M.line.delay + i * M.line.stagger;
      const full = Math.max(...xs) - Math.min(...xs) + 40;
      S.tl.fromTo(r, { attr: { width: 0 } }, { attr: { width: full }, duration: M.line.dur, ease: S.ease(M.line.ease), immediateRender: true }, t);
      if (S.fx) S.fx.cue(t, "draw", s.name || "");
      const e = ends[i];
      if (e) { e.style.left = (xs[xs.length - 1] + 18) + "px"; e.style.top = (ys[ys.length - 1] - e.offsetHeight / 2 + (s.label_dy || 0)) + "px";
               A.enter(e, "body", 0, 0, { at: t + M.line.dur * 0.8 }); }
    });
    (spec.marks || []).forEach((mk, j) => {
      const e = A.text(box, mk.text, "value", "abs", { color: S.color(mk.color || "accent"), whiteSpace: "nowrap", fontSize: (mk.size || 44) + "px" });
      e.style.left = (PX(S.toNum(mk.x)) - e.offsetWidth / 2 + (mk.dx || 0)) + "px";
      e.style.top = (PY(S.toNum(mk.y)) - e.offsetHeight - 14 + (mk.dy || 0)) + "px";
      A.enter(e, "badge", 0, 0, { at: t0 + M.line.delay + M.line.dur * 0.9 + j * 0.1 });
    });
  };

  /* ------------------------------------------------------------ counter (one big number + caption) */
  C.counter = function (A, box, spec, t0 = 0) {
    const col = A.el("div", "col", box, { inset: 0, alignItems: spec.align === "right" ? "flex-start" : "center", textAlign: spec.align === "right" ? "right" : "center", gap: "10px" });
    const n = A.el("div", "t-number", col, { color: S.color(spec.color || "accent"), fontSize: (spec.size || S.theme.type.number.size) + "px" });
    A.count(n, { to: spec.value ?? spec.to, from: spec.from, prefix: spec.prefix, suffix: spec.suffix, decimals: spec.decimals, at: t0 + S.theme.motion.number.delay });
    if (spec.caption) A.enter(A.text(col, spec.caption, "h1"), "title", 0, 0.25);
  };

  /* ------------------------------------------------------------ compare: before -> after (RTL: first on the right, arrow points left) */
  C.compare = function (A, box, spec, t0 = 0) {
    const steps = spec.steps || [spec.before || {}, spec.after || {}];
    const n = steps.length, W = box.clientWidth, H = box.clientHeight;
    const size = spec.size || (n === 2 ? 190 : 150);
    const arrowW = Math.min(200, W * 0.13), colW = (W - arrowW * (n - 1)) / n;
    const defs = n === 3 ? ["muted", "accent", "danger"] : ["muted", "accent"];
    steps.forEach((s, i) => {
      const right = i * (colW + arrowW);
      const c = A.el("div", "col", box, { right, width: colW, top: 0, height: H, alignItems: "center", textAlign: "center", gap: "6px" });
      const num = A.el("div", "t-number", c, { color: S.color(s.color || defs[i % defs.length]), fontSize: size + "px" });
      const t = t0 + 0.2 + i * 0.55;
      A.count(num, { to: s.value, prefix: s.prefix ?? spec.prefix, suffix: s.suffix ?? spec.suffix, decimals: s.decimals, at: t, dur: 0.9 });
      if (s.label) A.enter(A.text(c, s.label, "label", "", { maxWidth: colW * 0.95 + "px" }), "body", 0, 0, { at: t + 0.15 });
      if (i < n - 1) {
        const ar = A.el("div", "abs", box, { right: right + colW + 14, width: arrowW - 28, top: H / 2 - 40, height: 40 });
        ar.innerHTML = `<svg viewBox="0 0 100 40" width="100%" height="40" preserveAspectRatio="none"><path d="M100 20 H12" stroke="${S.color(spec.arrow_color || "muted")}" stroke-width="7" stroke-linecap="round"/><path d="M26 4 L6 20 L26 36" fill="none" stroke="${S.color(spec.arrow_color || "muted")}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        ar.style.transformOrigin = "100% 50%";
        S.tl.from(ar, { scaleX: 0, opacity: 0, duration: 0.45, ease: S.ease("power3"), immediateRender: true }, t + 0.45);
      }
    });
  };

  S.chart = function (A, box, spec, t0 = 0) {
    const f = C[spec.type || "bar"];
    if (!f) { A.text(box, "نمودار ناشناخته: " + spec.type, "body"); return; }
    f(A, box, spec, t0);
  };
})();
