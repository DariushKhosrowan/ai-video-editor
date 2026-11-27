Stage.template({
  name: "vocabulary_card",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const col = A.th.colors || {};
    const isLight = col.isDark === false;
    const padX = asp.isPortrait ? 52 : A.area.x;
    const leftEdge = asp.isPortrait ? 52 : A.area.left;
    const topY = asp.isPortrait ? 110 : A.area.y + 12;

    const ey = A.text(A.root, s.eyebrow || "واژه‌نامه آموزشی", "eyebrow", "abs", {
      right: padX, top: topY, color: A.color("accent"), fontSize: "28px",
    });
    A.field("eyebrow", ey);
    A.enter(ey, "eyebrow");

    const card = A.el("div", "abs card", A.root, {
      left: leftEdge, right: padX, top: topY + 70, bottom: A.scam ? 110 : (asp.isPortrait ? 140 : 96),
      padding: asp.isPortrait ? "44px 36px" : "52px 58px",
      display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "26px",
      borderRight: `8px solid ${A.color("accent")}`,
    });
    A.enter(card, "card", 0, 0, { ease: "vox" });

    // Top row: Word + IPA + Part-of-Speech badge
    const topRow = A.el("div", "", card, {
      display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: "18px",
      borderBottom: `2px solid ${isLight ? "rgba(0,0,0,0.09)" : "rgba(255,255,255,0.10)"}`,
      paddingBottom: "24px",
    });

    const wordGroup = A.el("div", "", topRow, { display: "flex", flexDirection: "column", gap: "8px" });
    const wordEl = A.text(wordGroup, s.word || "Heuristic", "hero", "", {
      fontSize: asp.isPortrait ? "72px" : "88px", fontWeight: 900, lineHeight: 1.1,
      color: A.color("accent"), direction: /^[A-Za-z]/.test(String(s.word || "")) ? "ltr" : "rtl",
    });
    A.field("word", wordEl);
    A.kinetic(wordEl, { at: A.at("title"), mode: s.textMotion || s.text_motion || "letter-wave", role: "title" });

    const ipaEl = A.text(wordGroup, s.ipa || "/hjʊəˈrɪs.tɪk/", "body", "", {
      fontSize: asp.isPortrait ? "30px" : "34px", color: col.muted, direction: "ltr", fontFamily: "monospace",
    });
    A.field("ipa", ipaEl);
    A.enter(ipaEl, "body", 0, 0.12);

    const posEl = A.text(topRow, s.pos || "اسم · Noun", "caption", "", {
      padding: "10px 22px", borderRadius: "999px",
      background: isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.09)",
      color: col.text, fontWeight: 800, fontSize: "24px",
    });
    A.field("pos", posEl);
    A.enter(posEl, "badge", 0, 0.16);

    // Meaning
    const meanEl = A.text(card, s.meaning || "", "h1", "", {
      fontSize: asp.isPortrait ? "42px" : "48px", lineHeight: 1.5, color: col.text,
    });
    A.field("meaning", meanEl);
    A.enter(meanEl, "body", 1, 0.18, { ease: "fluid" });

    // Example callout box
    if (s.example_sentence) {
      const exBox = A.el("div", "", card, {
        padding: "24px 28px", borderRadius: "14px",
        background: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.05)",
        borderRight: `4px solid ${A.color("good")}`,
      });
      A.text(exBox, "مثال در جمله:", "caption", "", { color: A.color("good"), fontWeight: 800, fontSize: "24px", marginBottom: "8px" });
      const exTxt = A.text(exBox, s.example_sentence, "body", "", { fontSize: asp.isPortrait ? "30px" : "34px", lineHeight: 1.6 });
      A.field("example_sentence", exTxt);
      A.enter(exBox, "card", 1, 0.3);
    }
  },
});
