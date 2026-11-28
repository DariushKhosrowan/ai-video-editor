Stage.template({
  name: "quote",   // label, fields, example: see schema.json
  build(s, A) {
    const left = A.area.left, right = A.area.x;
    const col = A.el("div", "col", A.root, { left, right, top: A.area.y, bottom: A.scam ? 120 : 100, gap: "18px", alignItems: "flex-start" });
    const r = A.el("div", "rule", col, { transformOrigin: A.originStart });
    Stage.tl.from(r, { scaleX: 0, duration: 0.5, ease: Stage.ease("power4"), immediateRender: true }, A.at("eyebrow"));
    A.enter(A.text(col, s.text, "hero", "", { fontSize: (s.size || (Stage.plain(s.text).length > 60 ? 64 : 84)) + "px", maxWidth: "1250px" }), "title");
    if (s.highlight) A.enter(A.text(col, s.highlight, "hero", "", { color: A.color(s.highlight_color || "accent"), fontSize: (s.highlight_size || 120) + "px" }), "title", 0, 0.12);
    if (s.caption) A.enter(A.text(col, s.caption, "body", "", { color: A.th.colors.muted, maxWidth: "1150px", fontSize: "36px" }), "body");
    if (s.author) A.enter(A.text(col, "— " + s.author, "eyebrow"), "body", 1);
    A.fit(col, 0.5);
  }
});
