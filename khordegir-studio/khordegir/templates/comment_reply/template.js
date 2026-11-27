Stage.template({
  name: "comment_reply",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const col = A.th.colors || {};
    const isLight = col.isDark === false;
    const padX = asp.isPortrait ? 56 : A.area.x + 60;
    const leftEdge = asp.isPortrait ? 56 : Math.max(A.area.left, A.area.x + 60);

    const wrap = A.el("div", "abs", A.root, {
      left: leftEdge, right: padX, top: asp.isPortrait ? 180 : 120, bottom: A.scam ? 120 : 110,
      display: "flex", flexDirection: "column", justifyContent: "center", gap: "34px",
    });

    // Viewer Comment Card
    const cCard = A.el("div", "card", wrap, {
      padding: asp.isPortrait ? "36px 34px" : "40px 46px",
      borderRadius: "24px",
      background: isLight ? "#FFFFFF" : "rgba(255,255,255,0.06)",
      border: `2px solid ${isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.14)"}`,
      display: "flex", flexDirection: "column", gap: "18px",
    });
    const cHead = A.el("div", "", cCard, { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "14px" });
    const uRow = A.el("div", "", cHead, { display: "flex", alignItems: "center", gap: "14px" });
    const av = A.el("div", "", uRow, {
      width: "54px", height: "54px", borderRadius: "999px",
      background: A.color("accent"), color: "#111", fontWeight: 900, fontSize: "26px",
      display: "flex", alignItems: "center", justifyContent: "center",
    });
    av.textContent = String(s.username || "U").replace(/^@/, "").slice(0, 1).toUpperCase();
    const uEl = A.text(uRow, s.username || "@viewer", "body", "", { fontWeight: 800, fontSize: "28px", direction: "ltr", color: col.text });
    A.field("username", uEl);

    const likeBadge = A.el("div", "tnum", cHead, {
      padding: "6px 16px", borderRadius: "999px",
      background: isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)",
      fontSize: "22px", fontWeight: 800, color: A.color("danger"),
    });
    A.count(likeBadge, { to: Number(s.likes) || 420, prefix: "♥ ", at: A.at("card") + 0.2, dur: 0.8 });

    const cBody = A.text(cCard, s.comment || "", "h1", "", {
      fontSize: asp.isPortrait ? "42px" : "46px", lineHeight: 1.48, color: col.text,
    });
    A.field("comment", cBody);
    A.enter(cCard, "bubble", 0, 0);
    A.kinetic(cBody, { at: A.at("title"), mode: s.textMotion || s.text_motion || "rise-mask", role: "title" });

    // Creator Reply Card (indented with accent border)
    const rCard = A.el("div", "card", wrap, {
      padding: asp.isPortrait ? "34px 34px" : "38px 44px",
      marginRight: asp.isPortrait ? "18px" : "64px",
      borderRadius: "24px",
      borderRight: `8px solid ${A.color("accent")}`,
      background: isLight ? "rgba(255,214,0,0.09)" : "rgba(255,214,0,0.07)",
      display: "flex", flexDirection: "column", gap: "16px",
    });
    const rHead = A.el("div", "", rCard, { display: "flex", alignItems: "center", gap: "12px" });
    A.text(rHead, "پاسخ کانال ✓", "caption", "", {
      padding: "5px 14px", borderRadius: "8px", background: A.color("accent"), color: "#111", fontWeight: 900, fontSize: "20px",
    });
    const rAuth = A.text(rHead, s.reply_author || "خرده‌گیر استودیو", "body", "", { fontWeight: 800, fontSize: "26px", color: A.color("accent") });
    A.field("reply_author", rAuth);

    const rBody = A.text(rCard, s.reply || "", "body", "", {
      fontSize: asp.isPortrait ? "36px" : "38px", lineHeight: 1.56, color: col.text,
    });
    A.field("reply", rBody);
    A.enter(rCard, "bubble", 1, 0.32);
  },
});
