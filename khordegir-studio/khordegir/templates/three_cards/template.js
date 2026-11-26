Stage.template({
  name: "three_cards",   // label, fields, example: see schema.json
  build(s, A) {
    const h = Stage.T.header(A, s, { fieldTitle: true });
    const cards = Array.isArray(s.cards) ? s.cards : Stage.T.list(s.cards).map((x) => ({ label: x }));
    const left = A.area.left, right = A.area.x;
    let top = h.bottom + 30;
    if (s.image) {
      const im = A.image(A.root, s.image, left, top, A.W - left - right, A.scam ? 400 : 520, { motion: s.motion });
      A.field("image", im);
      top += (A.scam ? 400 : 520) + 36;
    }
    const grid = A.el("div", "abs", A.root, { left, right, top, bottom: A.scam ? 110 : 100, display: "grid", gap: "32px", gridTemplateColumns: `repeat(${cards.length}, 1fr)`, alignItems: "stretch" });
    A.field("cards", grid);
    cards.forEach((c, i) => {
      const card = A.el("div", "card acc-b", grid, { position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "14px", padding: "26px", textAlign: "center", overflow: "hidden" });
      if (c.image) { const ih = s.image ? 0 : 300; if (ih) A.image(card, c.image, 0, 0, 10, 10, { enter: false, shadow: false }).setAttribute("style", `position:relative;width:100%;height:${ih}px;border-radius:12px`); }
      else if (c.icon) A.el("div", "", card, { fontSize: s.image ? "56px" : "110px", lineHeight: 1 }).textContent = c.icon;
      A.text(card, c.label, "h1", "", { fontSize: s.image ? "40px" : "48px" });
      if (c.text) A.text(card, c.text, "body", "", { color: A.th.colors.muted, fontSize: "30px" });
      A.enter(card, "card", i, s.image ? Stage.MOTION.ui.cardGridExtra : 0);
    });
    A.fit(grid, 0.5);
  }
});
