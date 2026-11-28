Stage.template({
  name: "pyramid_hierarchy",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const col = A.th.colors || {};
    const isLight = col.isDark === false;
    const padX = asp.isPortrait ? 48 : A.area.x;
    const leftEdge = asp.isPortrait ? 48 : A.area.left;
    const topY = asp.isPortrait ? 92 : A.area.y;

    const ey = A.text(A.root, s.eyebrow || "هرم سطوح", "eyebrow", "abs", {
      right: padX, top: topY, color: A.color("accent"), fontSize: "26px",
    });
    A.field("eyebrow", ey);
    A.enter(ey, "eyebrow");

    const title = A.text(A.root, s.title || "ساختار هرمی", "h1", "abs", {
      right: padX, left: leftEdge, top: topY + 46,
      fontSize: asp.isPortrait ? "44px" : "50px",
    });
    A.field("title", title);
    A.enter(title, "title");

    const raw = Array.isArray(s.tiers) ? s.tiers : String(s.tiers || "").split("\n").filter(Boolean);
    const tiers = (raw.length ? raw : [
      "قله هدف | نتیجه کلیدی",
      "راهبرد | مسیر اجرایی",
      "مهارت‌ها | ابزارهای لازم",
      "پایه و اساس | اصول بنیادین",
    ]).slice(0, 5).map((line, i) => {
      if (line && typeof line === "object") return { title: line.title || `سطح ${i + 1}`, note: line.note || "" };
      const p = String(line).split("|");
      return { title: (p[0] || "").trim(), note: (p[1] || "").trim() };
    });

    const wrap = A.el("div", "abs", A.root, {
      left: leftEdge, right: padX,
      top: topY + (asp.isPortrait ? 185 : 152),
      bottom: A.scam ? 96 : 82,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px",
    });
    A.field("tiers", wrap);

    const series = col.series || [A.color("accent"), "#38BDF8", "#34D399", "#F59E0B", "#A78BFA"];
    const tierEls = [];

    tiers.forEach((tr, i) => {
      const pct = Math.round(38 + (i / Math.max(1, tiers.length - 1)) * 62);
      const clr = series[i % series.length] || A.color("accent");
      const box = A.el("div", "", wrap, {
        width: `${pct}%`,
        minWidth: asp.isPortrait ? "56%" : "34%",
        padding: asp.isPortrait ? "20px 24px" : "20px 30px",
        borderRadius: "14px",
        background: isLight ? (col.card || "#FFFFFF") : (col.card || "#1D1D1D"),
        border: `2px solid ${clr}`,
        borderRight: `10px solid ${clr}`,
        boxShadow: isLight ? "0 8px 24px rgba(0,0,0,0.07)" : "0 14px 36px rgba(0,0,0,0.34)",
        display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "4px",
      });
      A.text(box, tr.title, "h2", "", { fontSize: asp.isPortrait ? "28px" : "30px", fontWeight: 900, color: clr });
      if (tr.note) {
        A.text(box, tr.note, "body", "", { fontSize: "22px", color: col.text, lineHeight: 1.4 });
      }
      tierEls.push(box);
    });

    // Build pyramid bottom-to-top like a real foundation!
    const bottomToTop = tierEls.slice().reverse();
    A.stepReveal(bottomToTop, { role: "card", at: A.at("card", 0, 0.25), minGap: 0.78, sfx: "card" });
  },
});
