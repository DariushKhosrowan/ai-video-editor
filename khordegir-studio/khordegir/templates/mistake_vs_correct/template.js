Stage.template({
  name: "mistake_vs_correct",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const col = A.th.colors || {};
    const isLight = col.isDark === false;
    const danger = A.color("danger");
    const okColor = "#16A34A";
    const padX = asp.isPortrait ? 52 : A.area.x;
    const leftEdge = asp.isPortrait ? 52 : A.area.left;

    const h = Stage.T.header(A, s, { fieldTitle: true, fieldEyebrow: true, left: leftEdge });
    const gridTop = h.bottom + 30;
    const gridBot = s.tip ? (A.scam ? 176 : 156) : (A.scam ? 104 : 84);

    const grid = A.el("div", "abs", A.root, {
      left: leftEdge, right: padX, top: gridTop, bottom: gridBot,
      display: "grid",
      gridTemplateColumns: asp.isPortrait ? "1fr" : "1fr 1fr",
      gap: asp.isPortrait ? "24px" : "36px",
      alignItems: "stretch",
    });

    // Wrong card (with animated strike sweep)
    const wrongCard = A.el("div", "card", grid, {
      position: "relative", padding: asp.isPortrait ? "32px" : "42px 44px",
      display: "flex", flexDirection: "column", justifyContent: "center", gap: "20px",
      borderColor: danger, background: isLight ? "rgba(229,57,53,0.06)" : "rgba(229,57,53,0.09)",
    });
    const wrongHead = A.el("div", "", wrongCard, { display: "flex", alignItems: "center", gap: "14px" });
    const xMark = A.el("span", "", wrongHead, {
      width: "44px", height: "44px", borderRadius: "10px", background: danger, color: "#FFFFFF",
      display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: 900,
    });
    xMark.textContent = "✕";
    const wl = A.text(wrongHead, s.wrong_label || "اشتباه رایج", "eyebrow", "", { color: danger, fontSize: "30px" });
    A.field("wrong_label", wl);

    const wt = A.text(wrongCard, s.wrong_text || "", "h1", "", {
      fontSize: asp.isPortrait ? "36px" : "40px", lineHeight: 1.52,
    });
    A.field("wrong_text", wt);
    A.enter(wrongCard, "card", 0, 0, { ease: "vox" });
    A.sweepStrike(wt, { at: A.at("card", 0) + 0.55 });

    // Correct card
    const rightCard = A.el("div", "card", grid, {
      position: "relative", padding: asp.isPortrait ? "32px" : "42px 44px",
      display: "flex", flexDirection: "column", justifyContent: "center", gap: "20px",
      borderColor: okColor, background: isLight ? "rgba(22,163,74,0.06)" : "rgba(22,163,74,0.10)",
    });
    const rightHead = A.el("div", "", rightCard, { display: "flex", alignItems: "center", gap: "14px" });
    const cMark = A.el("span", "", rightHead, {
      width: "44px", height: "44px", borderRadius: "10px", background: okColor, color: "#FFFFFF",
      display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: 900,
    });
    cMark.textContent = "✓";
    const rl = A.text(rightHead, s.right_label || "روش درست", "eyebrow", "", { color: okColor, fontSize: "30px" });
    A.field("right_label", rl);

    const rt = A.text(rightCard, s.right_text || "", "h1", "", {
      fontSize: asp.isPortrait ? "36px" : "40px", lineHeight: 1.52,
    });
    A.field("right_text", rt);
    A.enter(rightCard, "card", 1, 0.24, { ease: "vox" });

    if (s.tip) {
      const tipBox = A.el("div", "abs", A.root, {
        left: leftEdge, right: padX, bottom: A.scam ? 60 : 44,
        padding: "16px 28px", borderRadius: "12px",
        background: isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)",
        border: `1px solid ${isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)"}`,
      });
      const tipEl = A.text(tipBox, s.tip, "body", "", { fontSize: "28px", color: col.text });
      A.field("tip", tipEl);
      A.enter(tipBox, "body", 0, 0.45, { ease: "fluid" });
    }
  },
});
