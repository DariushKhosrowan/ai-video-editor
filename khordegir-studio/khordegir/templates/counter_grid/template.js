Stage.template({
  name: "counter_grid",   // label, fields, example: see schema.json
  build(s, A) {
    const h = Stage.T.header(A, s, { fieldTitle: true });
    const cards = Array.isArray(s.cards) ? s.cards : Stage.T.data(s.cards);
    const top = h.bottom + 40, left = A.area.left, right = A.area.x, bottom = A.scam ? 420 : 110;
    const grid = A.el("div", "abs", A.root, { left, right, top, bottom, display: "grid", gap: "36px", gridTemplateColumns: `repeat(${Math.min(cards.length, 4)}, 1fr)` });
    A.field("cards", grid);
    cards.forEach((c, i) => {
      const tone = c.color || (i === 0 ? "accent" : "danger");
      const card = A.el("div", "card " + (tone === "danger" ? "dng-b" : tone === "accent" ? "acc-b" : ""), grid,
        { position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: "16px", padding: "40px 36px" });
      const n = A.el("div", "t-number", card, { color: A.color(tone), fontSize: (cards.length > 2 ? 130 : 160) + "px" });
      A.count(n, { to: c.value, prefix: c.prefix, suffix: c.suffix, decimals: c.decimals, at: A.at("card", i) + Stage.MOTION.chart.number.delay });
      if (c.label) A.text(card, c.label, "h1", "", { fontSize: "40px" });
      if (c.sub) A.text(card, c.sub, "caption", "", { color: A.th.colors.muted, fontSize: "28px" });
      A.enter(card, "card", i);
    });
    A.fit(grid, 0.5);
  }
});
