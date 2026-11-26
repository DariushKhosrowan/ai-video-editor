Stage.template({
  name: "podcast_question",
  build(s, A) {
    const th = A.th, colColors = th.colors || {};
    const left = A.area.left;
    const right = A.area.x;

    const card = A.el("div", "col card acc-b podcast-card-surface", A.root, {
      right,
      left,
      top: A.area.y + 20,
      bottom: A.scam ? 140 : 120,
      padding: "52px 58px",
      gap: "24px",
      alignItems: "flex-start",
      justifyContent: "center",
    });

    const topRow = A.el("div", "", card, {
      display: "flex",
      alignItems: "center",
      gap: "16px",
      flexWrap: "wrap",
    });

    if (s.badge) {
      const bd = A.text(topRow, s.badge, "caption", "badge acc");
      A.enter(bd, "badge");
    }
    if (s.author) {
      const au = A.text(topRow, s.author, "caption", "mut");
      A.field("author", au);
      A.enter(au, "eyebrow");
    }

    const qEl = A.text(card, s.title || s.text || "", "hero", "", {
      fontSize: (s.size || 68) + "px",
      maxWidth: "1360px",
    });
    A.field("title", qEl);
    A.kinetic(qEl, { at: A.at("title"), role: "title", stagger: 0.048 });

    const pts = A.list(s.items);
    if (pts.length) {
      const listWrap = A.el("div", "", card, {
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        marginTop: "8px",
        width: "100%",
      });
      A.field("items", listWrap);
      pts.forEach((pt, idx) => {
        const row = A.el("div", "", listWrap, {
          display: "flex",
          alignItems: "center",
          gap: "14px",
          padding: "14px 20px",
          borderRadius: "12px",
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${colColors.cardBorder || "rgba(255,255,255,0.12)"}`,
        });
        A.text(row, "◀", "body", "acc", { fontSize: "24px" });
        A.text(row, pt, "body", "", { fontSize: "30px" });
        A.enter(row, "card", idx, 0.25);
      });
    }

    A.enter(card, "card");
    A.fit(card, 0.55);
  },
});
