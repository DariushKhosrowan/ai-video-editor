Stage.template({
  name: "line_chart",   // label, fields, example: see schema.json
  build(s, A) {
    const h = Stage.T.header(A, s, { fieldTitle: true });
    if (s.badge) { const b = A.text(A.root, s.badge, "caption", "badge acc abs", { left: A.area.x, top: A.area.y + 10 }); A.enter(b, "badge"); }
    const top = h.bottom + 30, left = A.area.left + (A.scam || A.stack ? 0 : 40), right = A.area.x;
    const box = A.box(A.root, left, top, A.W - right - left, A.H - top - A.gapB(s.note ? 120 : (A.scam ? 420 : 90), s.note ? 60 : 0));
    A.field("series", box);
    Stage.chart(A, box, Stage.T.lineSpec(s), Stage.MOTION.chart.startOffset);
  }
});
