Stage.template({
  name: "chart",   // label, fields, example: see schema.json
  build(s, A) {
    const spec = Object.assign({}, s.chart || {});
    const meta = { title: s.title || spec.title, subtitle: s.subtitle || spec.subtitle, eyebrow: s.eyebrow || spec.eyebrow };
    const h = Stage.T.header(A, meta, { fieldTitle: true });
    if (spec.badge) {
      const badgeEl = A.text(A.root, spec.badge, "caption", "badge acc abs", { left: A.area.x, top: A.area.y + 10 });
      A.enter(badgeEl, "badge");
    }
    const top = h.bottom + 30, left = A.area.left + (A.scam || A.stack ? 0 : 40), right = A.area.x;
    const box = A.box(A.root, left, top, A.W - right - left, A.H - top - A.gapB((s.note || spec.note) ? 120 : (A.scam ? 420 : 90), (s.note || spec.note) ? 60 : 0));
    A.field("chart", box);
    if (spec.type === "line" && typeof spec.series === "string") Object.assign(spec, Stage.T.lineSpec(spec));
    Stage.chart(A, box, spec, Stage.MOTION.chart.startOffset);
  }
});
