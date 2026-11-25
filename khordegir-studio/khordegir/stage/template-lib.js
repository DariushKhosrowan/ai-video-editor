/* Shared helpers for templates (loaded first). */
(function () {
  const S = window.Stage;
  S.T = {
    /* eyebrow + title + subtitle block anchored top-right. returns {el, bottom} */
    header(A, s, o = {}) {
      if (!s.title && !s.eyebrow && !s.kicker && !s.subtitle) return { bottom: A.area.y };
      const left = o.left ?? A.area.x, right = A.area.x;
      const h = A.el("div", "col", A.root, { right, left: left, top: A.area.y, gap: "8px", justifyContent: "flex-start", height: o.maxH || 260 });
      const ey = s.eyebrow || s.kicker;
      if (ey) A.enter(A.text(h, ey, "eyebrow"), "eyebrow");
      if (s.title) A.enter(A.text(h, s.title, o.titleRole || "h1"), "title");
      if (s.subtitle) A.enter(A.text(h, s.subtitle, "body", "", { color: S.theme.colors.muted }), "body");
      A.fit(h, 0.6);
      h.style.height = "auto";
      return { el: h, bottom: A.area.y + h.offsetHeight };
    },
    /* parse table-ish data: [{label,value}] | {label:value} | "a: 1, b: 2" */
    data(d) {
      if (!d) return [];
      if (typeof d === "string") return d.split(/[,،\n]/).map((x) => x.trim()).filter(Boolean).map((x) => {
        const m = x.match(/^(.*?)[\s:]+([-+]?[\d۰-۹.,٫٬]+)\s*$/); return m ? { label: m[1].trim(), value: m[2] } : { label: x, value: 0 };
      });
      if (!Array.isArray(d)) return Object.entries(d).map(([label, value]) => ({ label, value }));
      return d;
    },
    list(v) { if (!v) return []; if (typeof v === "string") return v.split("\n").map((x) => x.trim()).filter(Boolean); return v; },
    tone(t) { return { bad: "danger", red: "danger", danger: "danger", good: "accent", accent: "accent", yellow: "accent" }[t] || null; },
  };
})();
(function () {
  const S = window.Stage;
  /* "label=text, label=text" -> [[x,label]] */
  S.T.pairs = function (v) {
    if (!v) return [];
    if (Array.isArray(v)) return v.map((p) => Array.isArray(p) ? p : [p.x, p.label, p.color]);
    return String(v).split(/[,،\n]/).map((x) => x.trim()).filter(Boolean).map((x) => { const i = x.indexOf("="); return i < 0 ? [x, x] : [x.slice(0, i).trim(), x.slice(i + 1).trim()]; });
  };
  /* series text: "name: 1, 2, 3" per line  OR  list of {name, values|points, color, dashed} */
  S.T.series = function (v) {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    const cols = ["accent", "danger", "muted", "#4FC3F7", "#81C784"];
    return String(v).split("\n").map((l) => l.trim()).filter(Boolean).map((l, i) => {
      const k = l.lastIndexOf(":"); const name = k > 0 ? l.slice(0, k).trim() : ""; const nums = (k > 0 ? l.slice(k + 1) : l).split(/[,،\s]+/).filter(Boolean);
      return { name, values: nums.map(S.toNum), color: cols[i % cols.length] };
    });
  };
  S.T.lineSpec = function (s) {
    const spec = { type: "line", series: S.T.series(s.series), suffix: s.suffix, smooth: s.smooth !== false, markers: !!s.markers, marks: s.marks, grid: s.grid };
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
