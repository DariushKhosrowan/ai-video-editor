Stage.template({
  name: "fact_check",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const col = A.th.colors || {};
    const isLight = col.isDark === false;
    const padX = asp.isPortrait ? 56 : A.area.x;
    const leftEdge = asp.isPortrait ? 56 : A.area.left;
    const topY = asp.isPortrait ? 92 : A.area.y;

    const VERDICTS = {
      false:      { text: "نادرست",      en: "FALSE",      color: "#E53935", bg: "rgba(229,57,53,0.14)" },
      true:       { text: "درست",        en: "TRUE",       color: "#16A34A", bg: "rgba(22,163,74,0.14)" },
      misleading: { text: "گمراه‌کننده", en: "MISLEADING", color: "#D97706", bg: "rgba(217,119,6,0.15)" },
      mixed:      { text: "نیمه‌درست",   en: "MIXED",      color: "#CA8A04", bg: "rgba(202,138,4,0.15)" },
      unverified: { text: "اثبات‌نشده",  en: "UNVERIFIED", color: "#64748B", bg: "rgba(100,116,139,0.18)" },
    };
    const vKey = String(s.verdict || "false").toLowerCase();
    const vSpec = VERDICTS[vKey] || VERDICTS.false;

    // Header eyebrow
    const ey = A.text(A.root, s.eyebrow || "راستی‌آزمایی", "eyebrow", "abs", {
      right: padX, top: topY, color: A.color("accent"), fontSize: "30px",
    });
    A.field("eyebrow", ey);
    A.enter(ey, "eyebrow");

    const gridTop = topY + 72;
    const gridBot = A.scam ? 104 : (asp.isPortrait ? 110 : 88);
    const grid = A.el("div", "abs", A.root, {
      left: leftEdge, right: padX, top: gridTop, bottom: gridBot,
      display: "grid",
      gridTemplateColumns: asp.isPortrait ? "1fr" : "1.12fr 0.88fr",
      gridTemplateRows: asp.isPortrait ? "auto 1fr" : "1fr",
      gap: asp.isPortrait ? "28px" : "36px",
      alignItems: "stretch",
    });

    // Claim card
    const claimCard = A.el("div", "card", grid, {
      position: "relative", padding: asp.isPortrait ? "36px 34px" : "44px 48px",
      display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "24px",
      borderColor: isLight ? "rgba(0,0,0,0.14)" : "rgba(255,255,255,0.14)",
    });
    const claimHead = A.el("div", "", claimCard, {
      display: "flex", alignItems: "center", justifyContent: "space-between",
      borderBottom: `1px solid ${isLight ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.10)"}`,
      paddingBottom: "14px",
    });
    A.text(claimHead, "ادعای مطرح‌شده", "caption", "", { color: col.muted, fontWeight: 700, fontSize: "26px" });

    const claimText = A.text(claimCard, s.claim || "", "h1", "", {
      fontSize: asp.isPortrait ? "48px" : "54px", lineHeight: 1.42,
    });
    A.field("claim", claimText);
    const textMode = s.textMotion || s.text_motion || "rise-mask";
    A.kinetic(claimText, { at: A.at("title"), mode: textMode, role: "title" });

    // Stamp Verdict Box (slams deterministically after claim lands)
    const stampWrap = A.el("div", "", claimCard, {
      alignSelf: "flex-start",
      border: `4px solid ${vSpec.color}`,
      background: vSpec.bg,
      color: vSpec.color,
      padding: "14px 32px",
      borderRadius: "10px",
      display: "inline-flex", alignItems: "baseline", gap: "16px",
      transform: "rotate(-3deg)",
    });
    const stampFa = A.el("span", "", stampWrap, { fontSize: asp.isPortrait ? "46px" : "52px", fontWeight: 900 });
    stampFa.textContent = s.verdict_label || vSpec.text;
    A.field("verdict_label", stampFa);
    const stampEn = A.el("span", "", stampWrap, { fontSize: "22px", fontWeight: 800, opacity: 0.8, letterSpacing: "0.08em", direction: "ltr" });
    stampEn.textContent = vSpec.en;
    A.field("verdict", stampWrap);

    A.enter(claimCard, "card", 0, 0, { ease: "vox" });
    const stampAt = A.at("title") + 0.52;
    Stage.tl.fromTo(stampWrap,
      { opacity: 0, scale: 1.45, rotation: -12 },
      { opacity: 1, scale: 1, rotation: -3, duration: A.dur("snappy"), ease: Stage.ease("pop"), immediateRender: true },
      stampAt
    );
    if (Stage.fx) Stage.fx.cue(stampAt, "stamp", vSpec.text);

    // Evidence card
    const evCard = A.el("div", "card", grid, {
      position: "relative", padding: asp.isPortrait ? "34px" : "44px 46px",
      display: "flex", flexDirection: "column", justifyContent: "center", gap: "20px",
      borderColor: vSpec.color,
    });
    const evTag = A.text(evCard, "سند و شواهد تحریریه", "eyebrow", "", { color: vSpec.color, fontSize: "28px" });
    A.enter(evTag, "eyebrow", 0, 0.35);

    const rule = A.el("div", "rule", evCard, { width: "110px", height: "5px", background: vSpec.color, transformOrigin: "100% 50%" });
    Stage.tl.from(rule, { scaleX: 0, duration: A.dur("base"), ease: Stage.ease("vox"), immediateRender: true }, A.at("body") + 0.2);

    const evBody = A.text(evCard, s.evidence || "", "body", "", {
      fontSize: asp.isPortrait ? "34px" : "36px", lineHeight: 1.62,
    });
    A.field("evidence", evBody);
    A.enter(evBody, "body", 0, 0.3, { ease: "fluid" });
    A.enter(evCard, "card", 1, 0.14, { ease: "vox" });
  },
});
