Stage.template({
  name: "three_cards",   // label, fields, example: see schema.json
  build(s, A) {
    const preset = (Stage.fx && Stage.fx.cur && Stage.fx.cur.preset) || "classic";
    const lively = preset !== "classic";
    const h = Stage.T.header(A, s, { fieldTitle: true });
    const cards = Array.isArray(s.cards) ? s.cards : Stage.T.list(s.cards).map((x) => ({ label: x }));
    const left = A.area.left, right = A.area.x;
    let top = h.bottom + 30;
    if (s.image) {
      const im = A.image(A.root, s.image, left, top, A.W - left - right, A.scam ? 400 : 520, { motion: s.motion, reveal: lively ? "wipe" : undefined });
      A.field("image", im);
      top += (A.scam ? 400 : 520) + 36;
    }
    const grid = A.el("div", "abs", A.root, { left, right, top, bottom: A.scam ? 110 : 100, display: "grid", gap: "32px", gridTemplateColumns: `repeat(${cards.length}, 1fr)`, alignItems: "stretch" });
    A.field("cards", grid);
    cards.forEach((c, i) => {
      const isHighlight = lively && preset === "spotlight-cards" && i === Math.floor(cards.length / 2);
      const card = A.el("div", "card acc-b", grid, {
        position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: "14px", padding: "26px", textAlign: "center", overflow: "hidden",
        boxShadow: isHighlight ? `0 16px 40px ${A.color("accent")}26` : undefined,
      });
      if (lively && preset === "floating-trio") card.dataset.float = "true";
      if (c.image) {
        const ih = s.image ? 0 : 300;
        if (ih) {
          const cf = A.image(card, c.image, 0, 0, 10, 10, { enter: false, shadow: false, motion: s.motion || "gentle-drift" });
          cf.setAttribute("style", `position:relative;width:100%;height:${ih}px;border-radius:12px`);
        }
      } else if (c.icon) {
        A.el("div", "", card, { fontSize: s.image ? "56px" : "110px", lineHeight: 1 }).textContent = c.icon;
      }
      A.text(card, c.label, "h1", "", { fontSize: s.image ? "40px" : "48px" });
      if (c.text) A.text(card, c.text, "body", "", { color: A.th.colors.muted, fontSize: "30px" });

      const enterDelay = s.image ? 0.2 : 0;
      if (lively && preset === "elastic-fan") {
        A.enter(card, "card", i, enterDelay, { ease: "spring", rotation: (i - (cards.length - 1) / 2) * -1.8, scale: 0.94, y: 26 });
      } else if (lively && preset === "sweep-grid") {
        A.enter(card, "card", i, enterDelay, {
          ease: "vox",
          clipPath: "inset(0% 0% 0% 100% round 16px)",
          toClipPath: "inset(0% 0% 0% 0% round 16px)",
        });
      } else if (lively && preset === "minimal-cards") {
        A.enter(card, "card", i, enterDelay, { ease: "fluid", y: 14 });
      } else {
        A.enter(card, "card", i, enterDelay, lively ? { ease: "vox" } : {});
      }
    });
    A.fit(grid, 0.5);
  }
});
