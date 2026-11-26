Stage.template({
  name: "three_cards",   // label, fields, example: see schema.json
  build(s, A) {
    const h = Stage.T.header(A, s, { fieldTitle: true });
    const cards = Array.isArray(s.cards) ? s.cards : Stage.T.list(s.cards).map((x) => ({ label: x }));
    const left = A.area.left, right = A.area.x;
    let top = h.bottom + 30;
    const bottom = A.gapB(A.scam ? 110 : 100, s.note ? 60 : 0);
    const cols = A.columns(cards.length), rowCards = A.stack && cols === 1;   // stacked: one card per row
    if (s.image) {
      const ih = A.landscape ? (A.scam ? 400 : 520) : Math.round((A.H - bottom - top) * A.pick(0.4, 0.34, 0.3));
      const im = A.image(A.root, s.image, left, top, A.W - left - right, ih, { motion: s.motion });
      A.field("image", im);
      top += ih + 36;
    }
    const grid = A.el("div", "abs", A.root, { left, right, top, bottom, display: "grid", gap: A.stack ? "24px" : "32px", gridTemplateColumns: `repeat(${cols}, 1fr)`, gridAutoRows: A.stack ? "1fr" : undefined, alignItems: "stretch" });
    A.field("cards", grid);
    if (A.stack) { grid.style.height = "100%"; grid.style.alignContent = "center"; grid.style.gridAutoRows = rowCards ? "minmax(0, 260px)" : "1fr"; }
    cards.forEach((c, i) => {
      const card = A.el("div", "card acc-b", grid, rowCards
        ? { position: "relative", display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "flex-start", gap: "28px", padding: "22px 32px", textAlign: "start", overflow: "hidden" }
        : { position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "14px", padding: "26px", textAlign: "center", overflow: "hidden" });
      const tcol = rowCards ? A.el("div", "", null, { display: "flex", flexDirection: "column", gap: "6px", flex: "1 1 auto" }) : card;
      if (c.image) { const ih = s.image ? 0 : (rowCards ? 0 : 300); if (ih) A.image(card, c.image, 0, 0, 10, 10, { enter: false, shadow: false }).setAttribute("style", `position:relative;width:100%;height:${ih}px;border-radius:12px`); }
      else if (c.icon) A.el("div", "", card, { fontSize: s.image || rowCards ? "56px" : "110px", lineHeight: 1 }).textContent = c.icon;
      if (rowCards) card.appendChild(tcol);
      A.text(tcol, c.label, "h1", "", { fontSize: s.image ? "40px" : "48px" });
      if (c.text) A.text(tcol, c.text, "body", "", { color: A.th.colors.muted, fontSize: "30px" });
      A.enter(card, "card", i, s.image ? Stage.MOTION.ui.cardGridExtra : 0);
    });
    A.fit(grid, 0.5);
  }
});
