Stage.template({
  name: "by_the_numbers",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const col = A.th.colors || {};
    const padX = asp.isPortrait ? 52 : A.area.x;
    const leftEdge = asp.isPortrait ? 52 : A.area.left;
    const topY = asp.isPortrait ? 92 : A.area.y;

    const ey = A.text(A.root, s.eyebrow || "به زبان آمار", "eyebrow", "abs", {
      right: padX, top: topY, color: A.color("accent"), fontSize: "28px",
    });
    A.field("eyebrow", ey);
    A.enter(ey, "eyebrow");

    const title = A.text(A.root, s.title || "", "h1", "abs", {
      right: padX, left: leftEdge, top: topY + 54,
      fontSize: asp.isPortrait ? "54px" : "60px", lineHeight: 1.28,
    });
    A.field("title", title);
    A.kinetic(title, { at: A.at("title"), mode: s.textMotion || s.text_motion || "rise-mask", role: "title" });

    // Animated SVG line-art divider (A3)
    const divY = topY + (asp.isPortrait ? 210 : 185);
    const divW = Math.max(240, A.W - padX - leftEdge);
    const divSvg = A.svg(A.root, leftEdge, divY, divW, 14, `0 0 ${divW} 14`);
    A.svgEl(divSvg, "line", { x1: divW, y1: 7, x2: 0, y2: 7, stroke: A.color("accent"), "stroke-width": 3, opacity: 0.7 });
    A.svgEl(divSvg, "circle", { cx: divW - 8, cy: 7, r: 5, fill: A.color("accent") });
    A.lineArtReveal(divSvg, { at: A.at("title") + 0.12, dur: "snappy" });

    const list = Array.isArray(s.items) && s.items.length ? s.items.slice(0, 4) : [
      { value: 74, suffix: "٪", label: "شاخص اول", color: "accent" },
      { value: 3.4, suffix: "x", label: "شاخص دوم", color: "good" },
      { value: 18, suffix: "s", label: "شاخص سوم", color: "danger" },
    ];

    const gridTop = divY + 34;
    const gridBot = s.summary ? (asp.isPortrait ? 250 : 185) : (A.scam ? 105 : 88);
    const grid = A.el("div", "abs", A.root, {
      left: leftEdge, right: padX, top: gridTop, bottom: gridBot,
      display: "grid",
      gridTemplateColumns: asp.isPortrait ? "1fr" : `repeat(${list.length}, minmax(0, 1fr))`,
      gap: asp.isPortrait ? "20px" : "26px",
      alignItems: "stretch",
    });

    const cards = [];
    list.forEach((it, idx) => {
      const accentCol = A.color(it.color || (idx === 0 ? "accent" : idx === 1 ? "good" : "danger"));
      const card = A.el("div", "card", grid, {
        padding: asp.isPortrait ? "28px 30px" : "36px 32px",
        display: "flex", flexDirection: asp.isPortrait ? "row" : "column",
        alignItems: asp.isPortrait ? "center" : "flex-start",
        justifyContent: "space-between", gap: "18px",
        borderTop: `5px solid ${accentCol}`,
      });
      card.dataset.depth = String(idx % 2 === 0 ? 1 : -0.6);

      const numBox = A.el("div", "tnum", card, {
        fontSize: asp.isPortrait ? "68px" : "86px", fontWeight: 900, color: accentCol, lineHeight: 1.05, flexShrink: 0,
      });
      A.count(numBox, {
        to: it.value, prefix: it.prefix || "", suffix: it.suffix || "",
        decimals: Stage.decOf(it.value), at: A.at("number") + idx * A.staggerStep("editorial"), dur: A.dur("dramatic"),
      });

      const lbl = A.text(card, it.label || "", "body", "", {
        fontSize: asp.isPortrait ? "30px" : "32px", lineHeight: 1.48, color: col.text,
      });
      A.enter(lbl, "body", idx, 0.22);
      cards.push(card);
    });
    A.stagger(cards, "card", { from: "start", step: "grid" });

    if (s.summary) {
      const sum = A.text(A.root, s.summary, "body", "abs", {
        left: leftEdge, right: padX, bottom: A.scam ? 110 : 76,
        fontSize: asp.isPortrait ? "30px" : "30px", color: col.muted, lineHeight: 1.5,
      });
      A.field("summary", sum);
      A.enter(sum, "note", 0, 0.35);
    }
  },
});
