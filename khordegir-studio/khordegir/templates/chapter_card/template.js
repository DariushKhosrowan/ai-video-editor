Stage.template({
  name: "chapter_card",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const col = A.th.colors || {};
    const padX = asp.isPortrait ? 56 : A.area.x + 24;
    const leftEdge = asp.isPortrait ? 56 : A.area.left;

    // Large architectural watermark numeral with parallax depth
    const wm = A.el("div", "abs tnum", A.root, {
      left: asp.isPortrait ? "50%" : (leftEdge + 24) + "px",
      top: asp.isPortrait ? "18%" : "50%",
      transform: asp.isPortrait ? "translate(-50%, 0)" : "translate(0, -52%)",
      fontSize: asp.isPortrait ? "260px" : "360px",
      fontWeight: 900, lineHeight: 1,
      color: A.color("accent"), opacity: 0.14, pointerEvents: "none",
    });
    wm.dataset.depth = "-1";
    wm.textContent = Stage.fa(String(s.number || "۰۱"));
    Stage.tl.fromTo(wm, { opacity: 0, scale: 0.92 }, { opacity: 0.14, scale: 1, duration: A.dur("dramatic"), ease: Stage.ease("cinematic"), immediateRender: true }, 0.08);

    // Center editorial content block
    const box = A.el("div", "abs", A.root, {
      left: leftEdge, right: padX, top: "50%", transform: "translateY(-50%)",
      display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "24px",
    });

    const headRow = A.el("div", "", box, { display: "flex", alignItems: "center", gap: "18px", flexWrap: "wrap" });
    const numPill = A.text(headRow, `فصل ${Stage.fa(String(s.number || "۰۱"))}`, "caption", "", {
      padding: "8px 22px", borderRadius: "10px",
      background: A.color("accent"), color: "#111111", fontWeight: 900, fontSize: "26px",
    });
    A.field("number", numPill);
    A.enter(numPill, "badge", 0, 0);

    if (s.timestamp) {
      const tsEl = A.text(headRow, s.timestamp, "caption", "tnum", {
        fontSize: "26px", fontWeight: 700, color: col.muted,
      });
      A.field("timestamp", tsEl);
      A.enter(tsEl, "eyebrow", 0, 0.08);
    }

    const title = A.text(box, s.title || "", "hero", "", {
      fontSize: asp.isPortrait ? "64px" : "80px", lineHeight: 1.24, maxWidth: "96%",
    });
    A.field("title", title);
    A.kinetic(title, { at: A.at("title"), mode: s.textMotion || s.text_motion || "line-curtain", role: "title" });

    // A3 Geometric SVG line-art divider
    const lineW = asp.isPortrait ? 460 : 620;
    const svg = A.svg(box, 0, 0, lineW, 18, `0 0 ${lineW} 18`);
    svg.style.position = "relative";
    A.svgEl(svg, "line", { x1: lineW, y1: 9, x2: 48, y2: 9, stroke: A.color("accent"), "stroke-width": 4, "stroke-linecap": "round" });
    A.svgEl(svg, "polygon", { points: "24,2 34,9 24,16 14,9", fill: "none", stroke: A.color("accent"), "stroke-width": 3 });
    A.lineArtReveal(svg, { at: A.at("title") + 0.16, dur: "base" });

    if (s.subtitle) {
      const sub = A.text(box, s.subtitle, "body", "", {
        fontSize: asp.isPortrait ? "34px" : "36px", color: col.muted, lineHeight: 1.55, maxWidth: "88%",
      });
      A.field("subtitle", sub);
      A.enter(sub, "body", 0, 0.25);
    }
  },
});
