Stage.template({
  name: "pull_quote",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const col = A.th.colors || {};
    const padX = asp.isPortrait ? 56 : A.area.x + 60;
    const leftEdge = asp.isPortrait ? 56 : A.area.left + 60;
    const topY = asp.isPortrait ? 140 : A.area.y + 40;

    const wrap = A.el("div", "abs", A.root, {
      left: leftEdge, right: padX, top: topY, bottom: A.scam ? 120 : 96,
      display: "flex", flexDirection: "column", justifyContent: "center", gap: "30px",
    });

    if (s.eyebrow) {
      const ey = A.text(wrap, s.eyebrow, "eyebrow", "", { color: A.color("accent"), fontSize: "28px" });
      A.field("eyebrow", ey);
      A.enter(ey, "eyebrow");
    }

    const mark = A.el("div", "", wrap, {
      fontSize: asp.isPortrait ? "120px" : "150px",
      lineHeight: "0.65", fontWeight: 900, color: A.color("accent"), opacity: 0.35,
      userSelect: "none", marginBottom: "-20px",
    });
    mark.textContent = "«";
    A.enter(mark, "badge", 0, 0.08);

    const qEl = A.text(wrap, s.quote || "", "hero", "", {
      fontSize: asp.isPortrait ? "50px" : "60px", lineHeight: 1.46, fontWeight: 800, color: col.text,
    });
    A.field("quote", qEl);
    const qEnd = A.kinetic(qEl, {
      at: A.at("title", 0, 0.14),
      mode: s.textMotion || s.text_motion || "rise-mask",
      role: "title",
    });

    A.sweepLine(wrap, { at: qEnd + 0.1, width: 180, height: 6, origin: "100% 50%" });

    const meta = A.el("div", "", wrap, { display: "flex", flexDirection: "column", gap: "6px" });
    if (s.speaker) {
      const sp = A.text(meta, s.speaker, "h2", "", { fontSize: "34px", fontWeight: 900, color: A.color("accent") });
      A.field("speaker", sp);
    }
    if (s.role) {
      const rl = A.text(meta, s.role, "caption", "", { fontSize: "26px", color: col.muted });
      A.field("role", rl);
    }
    A.enter(meta, "note", 0, 0, { at: qEnd + 0.25 });
  },
});
