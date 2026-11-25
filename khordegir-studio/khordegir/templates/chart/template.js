Stage.template({
  name: "chart",   // label, fields, example: see schema.json
  build(s, A) {
    const spec = Object.assign({}, s.chart || {});
    const meta = { title: s.title || spec.title, subtitle: s.subtitle || spec.subtitle, eyebrow: s.eyebrow || spec.eyebrow };
    const h = Stage.T.header(A, meta);
    if (spec.badge) A.enter(A.text(A.root, spec.badge, "caption", "badge acc abs", { left: A.area.x, top: A.area.y + 10 }), "badge");
    const top = h.bottom + 30, left = A.area.left + (A.scam ? 0 : 40), right = A.area.x;
    const box = A.box(A.root, left, top, A.W - right - left, A.H - top - ((s.note || spec.note) ? 120 : 90));
    if (spec.type === "line" && typeof spec.series === "string") Object.assign(spec, Stage.T.lineSpec(spec));
    Stage.chart(A, box, spec, 0.25);
  }
});
