Stage.template({
  name: "counter_grid",   // label, fields, example: see schema.json
  build(s, A) {
    const h = Stage.T.header(A, s, { fieldTitle: true });
    const cards = Array.isArray(s.cards) ? s.cards : Stage.T.data(s.cards);
    const top = h.bottom + 40, left = A.area.left, right = A.area.x, bottom = A.gapB(A.scam ? 420 : 110, s.note ? 60 : 0);
    const grid = A.el("div", "abs", A.root, { left, right, top, bottom, display: "grid", gap: "36px", gridTemplateColumns: `repeat(${A.columns(s.columns || cards.length, { max: 4 })}, 1fr)`, gridAutoRows: A.stack ? "1fr" : undefined });
    A.field("cards", grid);
    if (A.stack) grid.style.height = "100%";
    cards.forEach((c, i) => {
      const tone = c.color || (i === 0 ? "accent" : "danger");
      const card = A.el("div", "card " + (tone === "danger" ? "dng-b" : tone === "accent" ? "acc-b" : ""), grid,
        { position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: A.stack ? "8px" : "16px", padding: A.stack ? "24px 32px" : "40px 36px" });
      const n = A.el("div", "t-number", card, { color: A.color(tone), fontSize: (cards.length > 2 ? 130 : 160) + "px", lineHeight: A.stack ? 1 : undefined });
      A.count(n, { to: c.value, prefix: c.prefix, suffix: c.suffix, decimals: c.decimals, at: A.at("card", i) + Stage.MOTION.chart.number.delay });
      if (c.label) A.text(card, c.label, "h1", "", { fontSize: "40px" });
      if (c.sub) A.text(card, c.sub, "caption", "", { color: A.th.colors.muted, fontSize: "28px" });
      A.enter(card, "card", i);
    });
    A.fit(grid, 0.5);
  }
});
