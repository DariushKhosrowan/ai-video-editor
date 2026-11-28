Stage.template({
  name: "big_number",   // label, fields, example: see schema.json
  build(s, A) {
    const L = A.L, hasImg = !!s.image;
    let colBox;
    if (hasImg) {
      if (A.scam) { A.image(A.root, s.image, 1300, 110, 540, 820, { motion: s.motion }); colBox = { left: A.area.left, right: A.W - 1300 + 60 }; }
      else { A.image(A.root, s.image, L.margin, 110, 760, 860, { motion: s.motion }); colBox = { left: L.margin + 760 + 80, right: L.margin }; }
    } else colBox = { left: A.area.left, right: L.margin };
    const centered = !hasImg;
    const col = A.el("div", "col", A.root, { left: colBox.left, right: colBox.right, top: A.area.y, bottom: A.scam ? 120 : 110,
      alignItems: centered ? "center" : "flex-start", textAlign: centered ? "center" : "start", gap: "6px" });
    if (s.eyebrow) A.enter(A.text(col, s.eyebrow, "eyebrow"), "eyebrow");
    const n = A.el("div", "t-number", col, { color: A.color(s.color || "accent"), fontSize: (s.size || (hasImg ? 190 : 230)) + "px" });
    A.count(n, { to: s.number, from: s.from, prefix: s.prefix, suffix: s.suffix, decimals: s.decimals });
    if (s.caption) A.enter(A.text(col, s.caption, "h1", "", { maxWidth: "1100px" }), "title", 0, 0.25);
    if (s.detail) A.enter(A.text(col, s.detail, "body", "", { color: A.th.colors.muted, maxWidth: "1000px" }), "body", 1, 0.25);
    A.fit(col, 0.55);
  }
});
