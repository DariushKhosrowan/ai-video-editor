Stage.template({
  name: "compare",   // label, fields, example: see schema.json
  build(s, A) {
    const h = Stage.T.header(A, s, { fieldTitle: true });
    const top = h.bottom + 20, left = A.area.left, right = A.area.x;
    const box = A.box(A.root, left, top, A.W - left - right, (A.scam ? 520 : A.H - 120) - top);
    A.field("steps", box);
    const steps = Stage.T.data(s.steps).length ? (Array.isArray(s.steps) ? s.steps : Stage.T.data(s.steps)) : [s.before || {}, s.after || {}];
    Stage.chart(A, box, { type: "compare", steps, prefix: s.prefix, suffix: s.suffix, size: s.size }, Stage.MOTION.chart.compareStartOffset);
  }
});
