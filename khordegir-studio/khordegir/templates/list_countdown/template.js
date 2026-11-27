Stage.template({
  name: "list_countdown",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const col = A.th.colors || {};
    const padX = asp.isPortrait ? 52 : A.area.x;
    const leftEdge = asp.isPortrait ? 52 : A.area.left;
    const topY = asp.isPortrait ? 110 : A.area.y;

    const ey = A.text(A.root, s.eyebrow || "شمارش معکوس", "eyebrow", "abs", {
      right: padX, top: topY, color: A.color("accent"), fontSize: "28px",
    });
    A.field("eyebrow", ey);
    A.enter(ey, "eyebrow");

    const title = A.text(A.root, s.title || "", "h1", "abs", {
      right: padX, left: leftEdge, top: topY + 52,
      fontSize: asp.isPortrait ? "56px" : "60px", lineHeight: 1.28,
    });
    A.field("title", title);
    A.kinetic(title, { at: A.at("title"), mode: s.textMotion || s.text_motion || "punch-scale", role: "title" });

    const items = A.list(s.items);
    const rows = items.length ? items.slice(0, 5) : ["نکته سوم", "نکته دوم", "نکته اول"];
    const total = rows.length;
    const listTop = topY + (asp.isPortrait ? 240 : 196);
    const listBot = s.cta ? (asp.isPortrait ? 180 : 136) : (A.scam ? 105 : 84);

    const stack = A.el("div", "abs", A.root, {
      left: leftEdge, right: padX, top: listTop, bottom: listBot,
      display: "flex", flexDirection: "column", justifyContent: "center", gap: asp.isPortrait ? "24px" : "20px",
    });

    const cards = [];
    rows.forEach((txt, idx) => {
      const rank = total - idx;
      const isWinner = rank === 1;
      const badgeColor = isWinner ? A.color("accent") : A.color("muted");
      const row = A.el("div", "card", stack, {
        display: "flex", alignItems: "center", gap: "24px",
        padding: asp.isPortrait ? "26px 28px" : "22px 30px",
        borderRight: `6px solid ${isWinner ? A.color("accent") : "rgba(255,255,255,0.16)"}`,
      });
      const rankBadge = A.el("div", "tnum", row, {
        width: asp.isPortrait ? "72px" : "66px", height: asp.isPortrait ? "72px" : "66px",
        borderRadius: "16px", background: isWinner ? A.color("accent") : "rgba(255,255,255,0.10)",
        color: isWinner ? "#111111" : col.text,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "38px", fontWeight: 900, flexShrink: 0,
      });
      rankBadge.textContent = Stage.fa(String(rank));
      A.text(row, txt, "body", "", {
        fontSize: asp.isPortrait ? "34px" : "34px", fontWeight: isWinner ? 800 : 600,
        color: isWinner ? col.text : col.text, lineHeight: 1.45,
      });
      cards.push(row);
      A.enter(rankBadge, "badge", idx, 0.14);
    });
    A.stagger(cards, "card", { from: "start", step: "list" });

    if (s.cta) {
      const ctaEl = A.text(A.root, s.cta, "caption", "abs", {
        left: leftEdge, right: padX, bottom: A.scam ? 96 : 64,
        textAlign: "center", fontSize: "28px", fontWeight: 800, color: A.color("accent"),
      });
      A.field("cta", ctaEl);
      A.enter(ctaEl, "badge", 0, 0.45);
    }
  },
});
