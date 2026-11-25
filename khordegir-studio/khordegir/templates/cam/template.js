Stage.template({
  name: "cam",   // label, fields, example: see schema.json
  build(s, A) { A.text(A.root, "🎥 فقط دوربین", "hero", "abs center-all", { color: A.th.colors.muted }); }
});
