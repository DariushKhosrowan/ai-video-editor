Stage.template({
  name: "flowchart",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const col = A.th.colors || {};
    const isLight = col.isDark === false;
    const padX = asp.isPortrait ? 48 : A.area.x;
    const leftEdge = asp.isPortrait ? 48 : A.area.left;
    const topY = asp.isPortrait ? 96 : A.area.y;

    const ey = A.text(A.root, s.eyebrow || "دیاگرام فرآیند", "eyebrow", "abs", {
      right: padX, top: topY, color: A.color("accent"), fontSize: "26px",
    });
    A.field("eyebrow", ey);
    A.enter(ey, "eyebrow");

    const title = A.text(A.root, s.title || "مراحل کلیدی فرآیند", "h1", "abs", {
      right: padX, left: leftEdge, top: topY + 48,
      fontSize: asp.isPortrait ? "44px" : "50px",
    });
    A.field("title", title);
    A.enter(title, "title");

    const rawNodes = Array.isArray(s.nodes) ? s.nodes : String(s.nodes || "").split("\n").filter(Boolean);
    const nodes = (rawNodes.length ? rawNodes : [
      "ورودی و مسئله | تعریف دقیق هدف",
      "تحلیل ساختار | بررسی داده‌ها و روابط",
      "اجرا و آزمایش | پیاده‌سازی مرحله‌به‌مرحله",
      "بازخورد و بهبود | اصلاح و تثبیت نتیجه",
    ]).slice(0, 5).map((item, idx) => {
      if (item && typeof item === "object") {
        return { label: item.label || item.title || `مرحله ${idx + 1}`, desc: item.desc || item.text || "" };
      }
      const parts = String(item).split("|");
      return { label: (parts[0] || "").trim(), desc: (parts[1] || "").trim() };
    });

    const isVert = asp.isPortrait || A.scam || nodes.length >= 5;
    const flowTop = topY + (asp.isPortrait ? 190 : 155);
    const flowBot = A.scam ? 110 : (s.conclusion ? 150 : 90);
    const wrap = A.el("div", "abs", A.root, {
      left: leftEdge, right: padX, top: flowTop, bottom: flowBot,
      display: "flex",
      flexDirection: isVert ? "column" : "row",
      alignItems: "stretch",
      justifyContent: "space-between",
      gap: isVert ? "14px" : "18px",
    });
    A.field("nodes", wrap);

    const cardEls = [];
    const arrowPaths = [];
    const series = col.series || [A.color("accent"), "#38BDF8", "#34D399", "#F59E0B", "#A78BFA"];
    const svgNS = "http://www.w3.org/2000/svg";

    nodes.forEach((nd, i) => {
      const accentC = series[i % series.length] || A.color("accent");
      const card = A.el("div", "card", wrap, {
        flex: "1",
        display: "flex",
        flexDirection: isVert ? "row" : "column",
        alignItems: isVert ? "center" : "stretch",
        justifyContent: isVert ? "flex-start" : "space-between",
        gap: "14px",
        padding: isVert ? "20px 26px" : "28px 24px",
        borderTop: isVert ? undefined : `6px solid ${accentC}`,
        borderRight: isVert ? `6px solid ${accentC}` : undefined,
      });

      const badge = A.el("div", "", card, {
        width: "48px", height: "48px", borderRadius: "50%", flexShrink: "0",
        background: accentC, color: "#111", fontWeight: 900, fontSize: "24px",
        display: "flex", alignItems: "center", justifyContent: "center",
      });
      badge.textContent = Stage.fa(String(i + 1));

      const body = A.el("div", "", card, { display: "flex", flexDirection: "column", gap: "8px", flex: "1" });
      A.text(body, nd.label, "h2", "", {
        fontSize: isVert ? "30px" : "30px", fontWeight: 800, color: col.text,
      });
      if (nd.desc) {
        A.text(body, nd.desc, "body", "", {
          fontSize: isVert ? "24px" : "23px", lineHeight: 1.5, color: col.muted,
        });
      }
      cardEls.push(card);

      if (i < nodes.length - 1) {
        const arrowBox = A.el("div", "", wrap, {
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: "0",
          width: isVert ? "100%" : "44px",
          height: isVert ? "28px" : "auto",
        });
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("viewBox", isVert ? "0 0 40 28" : "0 0 44 40");
        svg.style.width = isVert ? "40px" : "44px";
        svg.style.height = isVert ? "28px" : "40px";
        const path = document.createElementNS(svgNS, "path");
        // RTL horizontal flows right-to-left!
        path.setAttribute("d", isVert ? "M 20 2 L 20 22 M 12 15 L 20 24 L 28 15" : "M 40 20 L 6 20 M 15 11 L 5 20 L 15 29");
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", isLight ? "rgba(0,0,0,0.45)" : accentC);
        path.setAttribute("stroke-width", "4");
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("stroke-linejoin", "round");
        svg.appendChild(path);
        arrowBox.appendChild(svg);
        arrowPaths.push(path);
      }
    });

    const endAt = A.stepReveal(cardEls, {
      role: "card",
      at: A.at("card", 0, 0.25),
      minGap: 0.72,
      sfx: "card",
      onStep(_el, idx, stepAt) {
        if (idx > 0 && arrowPaths[idx - 1]) {
          A.drawPath(arrowPaths[idx - 1], { at: Math.max(0.1, stepAt - 0.22), dur: 0.34, ease: "vox" });
        }
      },
    });

    if (s.conclusion) {
      const foot = A.el("div", "abs", A.root, {
        left: leftEdge, right: padX, bottom: A.scam ? 42 : 48,
        padding: "16px 26px", borderRadius: "14px",
        background: isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.07)",
        borderRight: `5px solid ${A.color("good")}`,
        display: "flex", alignItems: "center", gap: "14px",
      });
      const ft = A.text(foot, s.conclusion, "body", "", { fontSize: "26px", fontWeight: 700, color: col.text });
      A.field("conclusion", ft);
      A.enter(foot, "note", 0, 0, { at: endAt + 0.25 });
    }
  },
});
