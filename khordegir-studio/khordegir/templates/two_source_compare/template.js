Stage.template({
  name: "two_source_compare",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const col = A.th.colors || {};
    const isLight = col.isDark === false;
    const padX = asp.isPortrait ? 52 : A.area.x;
    const leftEdge = asp.isPortrait ? 52 : A.area.left;

    const h = Stage.T.header(A, s, { fieldTitle: true, fieldEyebrow: true, left: leftEdge });
    const topY = h.bottom + 28;
    const botY = s.takeaway ? (A.scam ? 176 : 156) : (A.scam ? 104 : 84);

    const grid = A.el("div", "abs", A.root, {
      left: leftEdge, right: padX, top: topY, bottom: botY,
      display: "grid",
      gridTemplateColumns: asp.isPortrait ? "1fr" : "1fr 1fr",
      gap: asp.isPortrait ? "24px" : "36px",
      alignItems: "stretch",
    });

    const buildPanel = (srcName, headline, angle, tone, idx, fieldPrefix) => {
      const accentColor = A.color(tone);
      const card = A.el("div", "card", grid, {
        position: "relative",
        padding: asp.isPortrait ? "30px 32px" : "40px 42px",
        display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "20px",
        borderTop: `4px solid ${accentColor}`,
      });
      const topRow = A.el("div", "", card, {
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: `1px solid ${isLight ? "rgba(0,0,0,0.09)" : "rgba(255,255,255,0.10)"}`,
        paddingBottom: "14px",
      });
      const srcEl = A.text(topRow, srcName || "", "eyebrow", "", { color: accentColor, fontSize: "28px" });
      A.field(fieldPrefix + "_source", srcEl);

      const hlEl = A.text(card, headline || "", "h1", "", {
        fontSize: asp.isPortrait ? "40px" : "44px", lineHeight: 1.44,
      });
      A.field(fieldPrefix + "_headline", hlEl);

      if (angle) {
        const angEl = A.text(card, angle, "caption", "", {
          color: col.muted, fontSize: "26px",
          paddingTop: "12px", borderTop: `1px dashed ${isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)"}`,
        });
        A.field(fieldPrefix + "_angle", angEl);
      }

      A.enter(card, "card", idx, 0, { x: idx === 0 ? 34 : -34, y: 0, ease: "vox" });
    };

    buildPanel(s.left_source, s.left_headline, s.left_angle, "accent", 0, "left");
    buildPanel(s.right_source, s.right_headline, s.right_angle, "danger", 1, "right");

    if (s.takeaway) {
      const bar = A.el("div", "abs", A.root, {
        left: leftEdge, right: padX, bottom: A.scam ? 64 : 46,
        padding: "18px 28px", borderRadius: "14px",
        background: isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)",
        border: `1px solid ${isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)"}`,
      });
      const tk = A.text(bar, s.takeaway, "body", "", { fontSize: asp.isPortrait ? "28px" : "30px", color: col.text });
      A.field("takeaway", tk);
      A.enter(bar, "body", 0, 0.25, { ease: "fluid" });
    }
  },
});
