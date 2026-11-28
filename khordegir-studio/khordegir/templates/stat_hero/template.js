Stage.template({
  name: "stat_hero",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const col = A.th.colors || {};
    const isLight = col.isDark === false;
    const padX = asp.isPortrait ? 48 : A.area.x;
    const leftEdge = asp.isPortrait ? 48 : A.area.left;
    const topY = asp.isPortrait ? 96 : A.area.y + 12;

    const ey = A.text(A.root, s.eyebrow || "آمار کلیدی", "eyebrow", "abs", {
      right: padX, top: topY, color: A.color("accent"), fontSize: "26px",
    });
    A.field("eyebrow", ey);
    A.enter(ey, "eyebrow");

    const card = A.el("div", "abs card", A.root, {
      left: leftEdge, right: padX, top: topY + 56, bottom: A.scam ? 105 : 74,
      padding: asp.isPortrait ? "36px 32px" : "46px 56px",
      borderRight: `10px solid ${A.color("accent")}`,
      display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "24px",
    });
    A.enter(card, "card", 0, 0.08);

    const topBlock = A.el("div", "", card, {
      display: "flex", flexDirection: asp.isPortrait ? "column" : "row",
      alignItems: asp.isPortrait ? "flex-start" : "center",
      justifyContent: "space-between", gap: "24px",
    });

    const numCol = A.el("div", "", topBlock, { display: "flex", flexDirection: "column", gap: "12px" });
    const numEl = A.el("div", "t-number", numCol, {
      fontSize: asp.isPortrait ? "132px" : "164px", fontWeight: 900, lineHeight: 1.0,
      color: A.color("accent"),
    });
    A.field("value", numEl);
    const rawNum = parseFloat(String(s.value || "74").replace(/[^\d.-]/g, "")) || 0;
    const numEnd = A.count(numEl, { to: rawNum, suffix: s.suffix || "", dur: A.dur("dramatic") });

    if (s.delta) {
      const isNeg = /^-|کاهش|افت/.test(String(s.delta).trim());
      const badge = A.text(numCol, s.delta, "caption", "", {
        alignSelf: "flex-start", padding: "10px 22px", borderRadius: "999px",
        background: isNeg ? (col.dangerBadge || "rgba(229,57,53,0.18)") : (col.accentBadge || "rgba(67,160,71,0.18)"),
        color: isNeg ? A.color("danger") : A.color("good"),
        fontWeight: 800, fontSize: "26px",
      });
      A.field("delta", badge);
      A.enter(badge, "badge", 0, 0, { at: numEnd * 0.65 });
    }

    // SVG Sparkline
    const sparkVals = String(s.spark || "20, 34, 42, 55, 68, 74")
      .split(/[,،;\s]+/).map((v) => parseFloat(v)).filter((v) => Number.isFinite(v));
    if (sparkVals.length >= 2) {
      const sw = asp.isPortrait ? 520 : 480;
      const sh = 180;
      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("viewBox", `0 0 ${sw} ${sh}`);
      Object.assign(svg.style, { width: asp.isPortrait ? "100%" : "440px", height: "170px", flexShrink: "0" });
      const minV = Math.min(...sparkVals);
      const maxV = Math.max(...sparkVals);
      const span = Math.max(1e-3, maxV - minV);
      const pts = sparkVals.map((v, i) => {
        const x = 16 + (i / (sparkVals.length - 1)) * (sw - 32);
        const y = sh - 20 - ((v - minV) / span) * (sh - 40);
        return [x, y];
      });
      const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", d);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", A.color("accent"));
      path.setAttribute("stroke-width", "6");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      svg.appendChild(path);

      const lastPt = pts[pts.length - 1];
      const dot = document.createElementNS(svgNS, "circle");
      dot.setAttribute("cx", lastPt[0].toFixed(1));
      dot.setAttribute("cy", lastPt[1].toFixed(1));
      dot.setAttribute("r", "10");
      dot.setAttribute("fill", A.color("accent"));
      svg.appendChild(dot);

      topBlock.appendChild(svg);
      const spEnd = A.drawPath(path, { at: A.at("body", 0, 0.2), dur: A.dur("dramatic"), ease: "vox" });
      A.enter(dot, "badge", 0, 0, { at: spEnd - 0.1 });
    }

    if (s.headline) {
      const hl = A.text(card, s.headline, "h1", "", {
        fontSize: asp.isPortrait ? "38px" : "44px", lineHeight: 1.45, color: col.text,
      });
      A.field("headline", hl);
      A.enter(hl, "title", 0, 0.25);
    }

    const rawPts = Array.isArray(s.points) ? s.points : String(s.points || "").split("\n").filter(Boolean);
    if (rawPts.length) {
      const pWrap = A.el("div", "", card, {
        display: "flex", flexDirection: "column", gap: "12px",
        borderTop: `2px solid ${isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}`,
        paddingTop: "18px",
      });
      A.field("points", pWrap);
      const pEls = rawPts.slice(0, 4).map((txt) => {
        const row = A.el("div", "", pWrap, { display: "flex", alignItems: "center", gap: "12px" });
        A.el("span", "", row, { width: "12px", height: "12px", borderRadius: "50%", background: A.color("good"), flexShrink: "0" });
        A.text(row, String(txt), "body", "", { fontSize: "27px", color: col.body || col.text });
        return row;
      });
      A.stepReveal(pEls, { role: "body", at: numEnd + 0.15, minGap: 0.78, sfx: "tick" });
    }
  },
});
