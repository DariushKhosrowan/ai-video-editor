Stage.template({
  name: "line_chart",   // label, fields, example: see schema.json
  build(s, A) {
    const h = Stage.T.header(A, s);
    if (s.badge) { const b = A.text(A.root, s.badge, "caption", "badge acc abs", { left: A.area.x, top: A.area.y + 10 }); A.enter(b, "badge"); }
    const top = h.bottom + 30, left = A.area.left + (A.scam ? 0 : 40), right = A.area.x;
    const box = A.box(A.root, left, top, A.W - right - left, A.H - top - (s.note ? 120 : 90));
    Stage.chart(A, box, Stage.T.lineSpec(s), 0.25);
  }
});
