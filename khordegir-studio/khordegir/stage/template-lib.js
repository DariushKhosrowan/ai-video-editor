/* Shared helpers for templates (loaded after core.js). */
(function () {
  "use strict";
  const S = window.Stage;
  S.T = {
    /* Responsive aspect helper for 16:9, 9:16, and 1:1 multi-format layouts */
    aspect(A) {
      const isPortrait = A.H > A.W + 40;
      const isSquare = !isPortrait && Math.abs(A.W - A.H) <= 40;
      const isWide = A.W > A.H + 40;
      const padX = isPortrait ? 64 : (isSquare ? 68 : A.L.margin);
      const padTop = isPortrait ? 96 : (isSquare ? 64 : A.area.y);
      const padBot = A.scam ? 110 : (isPortrait ? 120 : 84);
      return { isPortrait, isSquare, isWide, padX, padTop, padBot };
    },
    /* eyebrow + title + subtitle block anchored top-right. returns {el, bottom} */
    header(A, s, o = {}) {
      if (!s.title && !s.eyebrow && !s.kicker && !s.subtitle) return { bottom: A.area.y };
      const left = o.left ?? A.area.x, right = A.area.x;
      const h = A.el("div", "col", A.root, { right, left, top: A.area.y, gap: "8px", justifyContent: "flex-start", height: o.maxH || 260 });
      const ey = s.eyebrow || s.kicker;
      const lively = !!(S.fx && S.fx.cur && S.fx.cur.preset && S.fx.cur.preset !== "classic");
      const explicitTextMotion = s.textMotion || s.text_motion || null;
      if (ey) {
        const elEy = A.text(h, ey, "eyebrow");
        if (o.fieldEyebrow) A.field("eyebrow", elEy);
        A.enter(elEy, "eyebrow");
      }
      if (s.title) {
        const elT = A.text(h, s.title, o.titleRole || "h1");
        if (o.fieldTitle) A.field("title", elT);
        if (explicitTextMotion) A.kinetic(elT, { at: A.at("title"), role: "title", mode: explicitTextMotion });
        else if (lively && o.kineticTitle) A.kinetic(elT, { at: A.at("title"), role: "title" });
        else A.enter(elT, "title");
      }
      if (s.subtitle) {
        const elS = A.text(h, s.subtitle, "body", "", { color: S.theme.colors.muted });
        if (o.fieldSubtitle) A.field("subtitle", elS);
        A.enter(elS, "body");
      }
      A.fit(h, 0.6);
      h.style.height = "auto";
      return { el: h, bottom: A.area.y + h.offsetHeight };
    },
    /* parse table-ish data: [{label,value}] | {label:value} | "a: 1, b: 2" */
    data(d) {
      if (!d) return [];
      if (typeof d === "string") {
        return d.split(/[,،\n]/).map((x) => x.trim()).filter(Boolean).map((x) => {
          const m = x.match(/^(.*?)[\s:]+([-+]?[\d۰-۹.,٫٬]+)\s*$/);
          return m ? { label: m[1].trim(), value: m[2] } : { label: x, value: 0 };
        });
      }
      if (!Array.isArray(d)) return Object.entries(d).map(([label, value]) => ({ label, value }));
      return d;
    },
    list(v) {
      if (!v) return [];
      if (typeof v === "string") return v.split("\n").map((x) => x.trim()).filter(Boolean);
      return v;
    },
    tone(t) {
      return { bad: "danger", red: "danger", danger: "danger", good: "accent", accent: "accent", yellow: "accent" }[t] || null;
    },
  };
})();
(function () {
  "use strict";
  const S = window.Stage;
  /* "label=text, label=text" -> [[x,label]] */
  S.T.pairs = function (v) {
    if (!v) return [];
    if (Array.isArray(v)) return v.map((p) => Array.isArray(p) ? p : [p.x, p.label, p.color]);
    return String(v).split(/[,،\n]/).map((x) => x.trim()).filter(Boolean).map((x) => {
      const i = x.indexOf("=");
      return i < 0 ? [x, x] : [x.slice(0, i).trim(), x.slice(i + 1).trim()];
    });
  };
  /* series text: "name: 1, 2, 3" per line OR list of {name, values|points, color, dashed} */
  S.T.series = function (v) {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    const cols = ["accent", "danger", "muted", "#4FC3F7", "#81C784"];
    return String(v).split("\n").map((l) => l.trim()).filter(Boolean).map((l, i) => {
      const k = l.lastIndexOf(":");
      const name = k > 0 ? l.slice(0, k).trim() : "";
      const toks = (k > 0 ? l.slice(k + 1) : l).split(/[,،\s]+/).filter(Boolean);
      const hasPairs = toks.some((tok) => tok.includes(";"));
      if (hasPairs) {
        const points = toks.map((tok, j) => {
          const [px, py] = tok.split(";");
          return [py != null ? S.toNum(px) : j + 1, py != null ? S.toNum(py) : S.toNum(px)];
        });
        return { name, points, color: cols[i % cols.length] };
      }
      return { name, values: toks.map(S.toNum), color: cols[i % cols.length] };
    });
  };
  S.T.lineSpec = function (s) {
    const cc = s.chartCurve || {};
    const spec = {
      type: "line",
      series: S.T.series(s.series),
      suffix: s.suffix,
      smooth: s.smooth !== false,
      curveMode: s.curveMode || cc.mode || (s.smooth === false ? "linear" : "monotone"),
      tension: s.tension ?? cc.tension ?? 0.5,
      markers: !!(s.markers || cc.markers),
      marks: s.marks,
      grid: s.grid,
    };
    spec.x = Object.assign({}, s.x || {});
    if (s.x_labels) spec.x.ticks = S.T.pairs(s.x_labels).map((p) => [S.toNum(p[0]), p[1]]);
    if (s.x_title) spec.x.title = s.x_title;
    spec.y = Object.assign({}, s.y || {});
    if (s.ymax != null && s.ymax !== "") spec.y.max = S.toNum(s.ymax);
    if (s.ymin != null && s.ymin !== "") spec.y.min = S.toNum(s.ymin);
    if (s.y_labels) spec.y.ticks = S.T.pairs(s.y_labels).map((p) => [S.toNum(p[0]), p[1]]);
    if (s.suffix) spec.y.suffix = s.suffix;
    spec.vlines = Array.isArray(s.vlines) ? s.vlines : S.T.pairs(s.vlines).map((p, i) => ({ x: S.toNum(p[0]), label: p[1], color: i === 0 ? "accent" : "muted" }));
    spec.series.forEach((x) => { if (x.end_value == null) x.end_value = !!s.end_values; });
    return spec;
  };
})();
