Stage.template({
  name: "mind_map",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const col = A.th.colors || {};
    const isLight = col.isDark === false;
    const padX = asp.isPortrait ? 44 : A.area.x;
    const leftEdge = asp.isPortrait ? 44 : A.area.left;
    const topY = asp.isPortrait ? 90 : A.area.y;

    const ey = A.text(A.root, s.eyebrow || "نقشه ذهنی", "eyebrow", "abs", {
      right: padX, top: topY, color: A.color("accent"), fontSize: "26px",
    });
    A.field("eyebrow", ey);
    A.enter(ey, "eyebrow");

    const rawBranches = Array.isArray(s.branches) ? s.branches : String(s.branches || "").split("\n").filter(Boolean);
    const branches = (rawBranches.length ? rawBranches : [
      "شاخه اول | توضیح کوتاه اول",
      "شاخه دوم | توضیح کوتاه دوم",
      "شاخه سوم | توضیح کوتاه سوم",
      "شاخه چهارم | توضیح کوتاه چهارم",
    ]).slice(0, 6).map((b, i) => {
      if (b && typeof b === "object") return { title: b.title || `شاخه ${i + 1}`, note: b.note || "" };
      const p = String(b).split("|");
      return { title: (p[0] || "").trim(), note: (p[1] || "").trim() };
    });

    const boxL = leftEdge;
    const boxR = padX;
    const boxW = A.W - boxL - boxR;
    const boxTop = topY + 64;
    const boxH = A.H - boxTop - (A.scam ? 110 : 84);

    const canvas = A.el("div", "abs", A.root, {
      left: boxL, top: boxTop, width: boxW, height: boxH,
    });
    A.field("branches", canvas);

    const cx = boxW * 0.5;
    const cy = boxH * 0.5;
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${boxW} ${boxH}`);
    Object.assign(svg.style, { position: "absolute", inset: "0", width: "100%", height: "100%", pointerEvents: "none" });
    canvas.appendChild(svg);

    const series = col.series || [A.color("accent"), "#38BDF8", "#34D399", "#F59E0B", "#FB7185", "#A78BFA"];

    // Center hub
    const hubW = Math.min(340, Math.round(boxW * (asp.isPortrait ? 0.52 : 0.28)));
    const hub = A.el("div", "abs", canvas, {
      left: Math.round(cx - hubW / 2), top: Math.round(cy - 68),
      width: hubW, minHeight: "136px", padding: "22px 24px", borderRadius: "24px",
      background: A.color("accent"), color: "#111111",
      display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center",
      boxShadow: "0 20px 54px rgba(0,0,0,0.38)", zIndex: 4,
    });
    const hubTxt = A.text(hub, s.center || "مفهوم اصلی", "h1", "", {
      fontSize: asp.isPortrait ? "34px" : "36px", fontWeight: 900, color: "#111111", lineHeight: 1.3,
    });
    A.field("center", hubTxt);
    A.enter(hub, "title", 0, 0.1);

    const nodeW = Math.min(340, Math.round(boxW * (asp.isPortrait ? 0.42 : 0.28)));
    const nodeH = 114;
    const rx = Math.max(hubW * 0.65, boxW * (asp.isPortrait ? 0.27 : 0.34));
    const ry = Math.max(150, boxH * (asp.isPortrait ? 0.34 : 0.32));

    const branchCards = [];
    const branchPaths = [];

    branches.forEach((br, i) => {
      const ang = (-Math.PI / 2) + (i / branches.length) * Math.PI * 2 + (branches.length === 4 ? Math.PI / 4 : 0);
      const nx = Math.max(nodeW / 2 + 8, Math.min(boxW - nodeW / 2 - 8, cx + Math.cos(ang) * rx));
      const ny = Math.max(nodeH / 2 + 8, Math.min(boxH - nodeH / 2 - 8, cy + Math.sin(ang) * ry));
      const bCol = series[i % series.length] || A.color("accent");

      const path = document.createElementNS(svgNS, "path");
      const mx = (cx + nx) * 0.5;
      path.setAttribute("d", `M ${cx.toFixed(1)} ${cy.toFixed(1)} Q ${mx.toFixed(1)} ${cy.toFixed(1)} ${nx.toFixed(1)} ${ny.toFixed(1)}`);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", bCol);
      path.setAttribute("stroke-width", "4");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("opacity", isLight ? "0.85" : "0.78");
      svg.appendChild(path);
      branchPaths.push(path);

      const card = A.el("div", "abs card", canvas, {
        left: Math.round(nx - nodeW / 2), top: Math.round(ny - nodeH / 2),
        width: nodeW, minHeight: nodeH, padding: "18px 20px",
        borderRight: `6px solid ${bCol}`, zIndex: 3,
        display: "flex", flexDirection: "column", justifyContent: "center", gap: "6px",
      });
      A.text(card, br.title, "h2", "", { fontSize: "26px", fontWeight: 800, color: col.text, lineHeight: 1.3 });
      if (br.note) {
        A.text(card, br.note, "caption", "", { fontSize: "21px", color: col.muted, lineHeight: 1.4 });
      }
      branchCards.push(card);
    });

    A.stepReveal(branchCards, {
      role: "card",
      at: A.at("card", 0, 0.35),
      minGap: 0.72,
      sfx: "pop",
      onStep(_el, idx, stepAt) {
        if (branchPaths[idx]) {
          A.drawPath(branchPaths[idx], { at: Math.max(0.15, stepAt - 0.18), dur: 0.42, ease: "vox" });
        }
      },
    });
  },
});
