Stage.template({
  name: "bullet_list",   // label, fields, example: see schema.json
  build(s, A) {
    const h = Stage.T.header(A, s, { titleRole: "h1", fieldTitle: true, fieldEyebrow: true });
    const items = Stage.T.list(s.items);
    const cols = +(s.columns || 1), numbered = String(s.numbered) !== "false";
    const preset = (Stage.fx && Stage.fx.cur && Stage.fx.cur.preset) || "classic";
    const lively = preset !== "classic";

    const left = A.area.left, right = A.area.x;
    const top = h.bottom + 36, bottom = A.scam ? 110 : 100;
    const grid = A.el("div", "abs", A.root, {
      left, right, top, bottom,
      display: "grid", gap: "22px",
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      alignContent: "center",
    });
    A.field("items", grid);

    items.forEach((it, i) => {
      const o = typeof it === "string" ? { text: it } : it;
      const tone = Stage.T.tone(o.tone);
      const card = A.el("div", "card" + (tone === "danger" ? " dng-b" : tone === "accent" ? " acc-b" : ""), grid, {
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: "26px",
        padding: cols > 1 ? "30px 34px" : "24px 34px",
        minHeight: cols > 1 ? "190px" : "auto",
      });
      if (numbered) {
        const numEl = A.text(card, String(o.n || i + 1), "value", "", {
          color: A.color(tone || "accent"),
          fontSize: "60px",
          minWidth: "56px",
          textAlign: "center",
        });
      }
      const tc = A.el("div", "", card, { display: "flex", flexDirection: "column", gap: "4px" });
      if (o.kicker) A.text(tc, o.kicker, "eyebrow", "", { fontSize: "26px", color: A.color(tone || "accent") });
      const itemTextEl = A.text(tc, o.text, "h1", "", { fontSize: (cols > 1 ? 44 : 46) + "px" });
      if (lively && preset === "cascade-rows") {
        A.kinetic(itemTextEl, { at: A.at("card", i), role: "body", stagger: 0.035, x: 20 });
      }
      A.enter(card, "card", i);
    });
    A.fit(grid, 0.5);
  },
});
