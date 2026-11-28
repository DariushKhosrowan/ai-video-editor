Stage.template({
  name: "corkboard",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const col = A.th.colors || {};
    const isLight = col.isDark === false;
    const padX = asp.isPortrait ? 44 : A.area.x;
    const leftEdge = asp.isPortrait ? 44 : A.area.left;
    const topY = asp.isPortrait ? 88 : A.area.y;

    const ey = A.text(A.root, s.eyebrow || "پرونده تحقیق", "eyebrow", "abs", {
      right: padX, top: topY, color: A.color("danger"), fontSize: "26px",
    });
    A.field("eyebrow", ey);
    A.enter(ey, "eyebrow");

    const title = A.text(A.root, s.title || "تخته شواهد", "h1", "abs", {
      right: padX, left: leftEdge, top: topY + 46,
      fontSize: asp.isPortrait ? "42px" : "48px",
    });
    A.field("title", title);
    A.enter(title, "title");

    const raw = Array.isArray(s.clues) ? s.clues : String(s.clues || "").split("\n").filter(Boolean);
    const clues = (raw.length ? raw : [
      "سرنخ ۱ | اولین نشانه ماجرا",
      "سرنخ ۲ | ارتباط پنهان بین داده‌ها",
      "سرنخ ۳ | نقطه عطف اصلی",
      "سرنخ ۴ | جمع‌بندی نهایی پرونده",
    ]).slice(0, 4).map((line, i) => {
      if (line && typeof line === "object") return { title: line.title || `سرنخ ${i + 1}`, note: line.note || "" };
      const p = String(line).split("|");
      return { title: (p[0] || "").trim(), note: (p[1] || "").trim() };
    });

    const boardTop = topY + (asp.isPortrait ? 180 : 146);
    const boardW = A.W - leftEdge - padX;
    const boardH = A.H - boardTop - (A.scam ? 102 : 74);

    const board = A.el("div", "abs", A.root, {
      left: leftEdge, top: boardTop, width: boardW, height: boardH,
      borderRadius: "20px",
      background: isLight ? "#D9C3A3" : "#221C16",
      border: `6px solid ${isLight ? "#8C6D46" : "#4A3A2B"}`,
      boxShadow: "inset 0 0 60px rgba(0,0,0,0.28)",
      overflow: "hidden",
    });
    A.enter(board, "card", 0, 0.08);
    A.field("clues", board);

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${boardW} ${boardH}`);
    Object.assign(svg.style, { position: "absolute", inset: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: 5 });
    board.appendChild(svg);

    const cardW = asp.isPortrait ? Math.round(boardW * 0.78) : Math.round(boardW * 0.40);
    const cardH = asp.isPortrait ? Math.round((boardH - 120) / Math.max(2, clues.length)) : Math.round(boardH * 0.36);

    const coords = clues.map((_, i) => {
      if (asp.isPortrait) {
        const x = Math.round((boardW - cardW) / 2 + (i % 2 === 0 ? 18 : -18));
        const y = Math.round(34 + i * (cardH + 22));
        return { x, y, rot: i % 2 === 0 ? -1.4 : 1.4 };
      }
      // 2x2 staggered detective board layout (RTL: top-right -> top-left -> bottom-right -> bottom-left)
      const colIdx = i % 2;
      const rowIdx = Math.floor(i / 2);
      const x = colIdx === 0 ? Math.round(boardW - cardW - 44) : 44;
      const y = rowIdx === 0 ? 38 : Math.round(boardH - cardH - 38);
      return { x, y, rot: (i === 0 || i === 3) ? -1.8 : 1.8 };
    });

    const cards = [];
    const yarns = [];
    const pinPts = [];

    clues.forEach((cl, i) => {
      const pos = coords[i];
      pinPts.push({ px: pos.x + cardW * 0.5, py: pos.y + 18 });
      const note = A.el("div", "abs", board, {
        left: pos.x, top: pos.y, width: cardW, minHeight: cardH,
        padding: "28px 24px 20px", borderRadius: "6px",
        background: "#FAF5E6", color: "#1A1815",
        boxShadow: "0 14px 32px rgba(0,0,0,0.42)",
        transform: `rotate(${pos.rot}deg)`, zIndex: 3,
        display: "flex", flexDirection: "column", gap: "8px",
      });
      // Red pushpin
      A.el("div", "abs", note, {
        left: "50%", top: "10px", transform: "translateX(-50%)",
        width: "18px", height: "18px", borderRadius: "50%",
        background: "#DC2626", border: "3px solid #7F1D1D",
        boxShadow: "0 4px 8px rgba(0,0,0,0.45)",
      });
      A.text(note, cl.title, "h2", "", { fontSize: "26px", fontWeight: 900, color: "#141414", marginTop: "6px" });
      if (cl.note) {
        A.text(note, cl.note, "body", "", { fontSize: "22px", lineHeight: 1.48, color: "#3A352D" });
      }
      cards.push(note);

      if (i > 0) {
        const prev = pinPts[i - 1];
        const cur = pinPts[i];
        const line = document.createElementNS(svgNS, "path");
        const mx = (prev.px + cur.px) * 0.5;
        const my = (prev.py + cur.py) * 0.5 + 26;
        line.setAttribute("d", `M ${prev.px.toFixed(1)} ${prev.py.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${cur.px.toFixed(1)} ${cur.py.toFixed(1)}`);
        line.setAttribute("fill", "none");
        line.setAttribute("stroke", "#DC2626");
        line.setAttribute("stroke-width", "4.5");
        line.setAttribute("stroke-linecap", "round");
        svg.appendChild(line);
        yarns.push(line);
      }
    });

    A.stepReveal(cards, {
      role: "card",
      at: A.at("card", 0, 0.3),
      minGap: 0.88,
      sfx: "stamp",
      onStep(_el, idx, stepAt) {
        if (idx > 0 && yarns[idx - 1]) {
          A.drawPath(yarns[idx - 1], { at: Math.max(0.15, stepAt - 0.16), dur: 0.45, ease: "vox" });
        }
      },
    });
  },
});
