Stage.template({
  name: "bar_chart",   // label, fields, example: see schema.json
  build(s, A) {
    const h = Stage.T.header(A, s, { fieldTitle: true });
    const top = h.bottom + 40;
    const left = A.area.left + (A.scam ? 0 : 60), right = A.area.x + 40;
    const bottom = s.note ? 120 : (A.scam ? 420 : 90);
    const box = A.box(A.root, left, top, A.W - right - left, A.H - top - bottom);
    A.field("data", box);
    const spec = Object.assign({}, s, { type: "bar", data: Stage.T.data(s.data), axis: String(s.axis) !== "false" });
    Stage.chart(A, box, spec, Stage.MOTION.chart.startOffset);
  }
});
