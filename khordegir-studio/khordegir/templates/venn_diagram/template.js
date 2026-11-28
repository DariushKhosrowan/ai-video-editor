Stage.template({
  name: "venn_diagram",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const col = A.th.colors || {};
    const isLight = col.isDark === false;
    const padX = asp.isPortrait ? 44 : A.area.x;
    const leftEdge = asp.isPortrait ? 44 : A.area.left;
    const topY = asp.isPortrait ? 92 : A.area.y;

    const ey = A.text(A.root, s.eyebrow || "نقطه اشتراک", "eyebrow", "abs", {
      right: padX, top: topY, color: A.color("accent"), fontSize: "26px",
    });
    A.field("eyebrow", ey);
    A.enter(ey, "eyebrow");

    const title = A.text(A.root, s.title || "دیاگرام ون", "h1", "abs", {
      right: padX, left: leftEdge, top: topY + 46,
      fontSize: asp.isPortrait ? "44px" : "50px",
    });
    A.field("title", title);
    A.enter(title, "title");

    const parseCircle = (raw, fallback) => {
      const p = String(raw || fallback || "").split("|");
      return { title: (p[0] || "").trim(), note: (p[1] || "").trim() };
    };
    const circles = [
      { key: "circle_a", data: parseCircle(s.circle_a, "مفهوم اول | ویژگی اول") },
      { key: "circle_b", data: parseCircle(s.circle_b, "مفهوم دوم | ویژگی دوم") },
    ];
    if (s.circle_c && String(s.circle_c).trim()) {
      circles.push({ key: "circle_c", data: parseCircle(s.circle_c, "") });
    }

    const boxW = A.W - leftEdge - padX;
    const boxTop = topY + (asp.isPortrait ? 180 : 145);
    const boxH = A.H - boxTop - (A.scam ? 110 : 80);
    const stageBox = A.el("div", "abs", A.root, { left: leftEdge, top: boxTop, width: boxW, height: boxH });

    const r = Math.min(boxW * (circles.length === 3 ? 0.24 : 0.27), boxH * (circles.length === 3 ? 0.30 : 0.40));
    const cx = boxW * 0.5;
    const cy = boxH * (circles.length === 3 ? 0.54 : 0.50);
    const dx = r * 0.62;
    const dy = r * 0.48;
    const positions = circles.length === 3
      ? [
          { x: cx + dx, y: cy - dy * 0.55 },
          { x: cx - dx, y: cy - dy * 0.55 },
          { x: cx, y: cy + dy * 0.92 },
        ]
      : [
          { x: cx + dx, y: cy },
          { x: cx - dx, y: cy },
        ];

    const series = col.series || [A.color("accent"), "#38BDF8", "#34D399"];
    const ringEls = [];

    circles.forEach((c, i) => {
      const pos = positions[i];
      const clr = series[i % series.length] || A.color("accent");
      const ring = A.el("div", "abs", stageBox, {
        left: Math.round(pos.x - r), top: Math.round(pos.y - r),
        width: Math.round(r * 2), height: Math.round(r * 2),
        borderRadius: "50%",
        background: isLight ? `${clr}22` : `${clr}26`,
        border: `4px solid ${clr}`,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        textAlign: "center", padding: "36px",
        mixBlendMode: isLight ? "multiply" : "screen",
      });
      const labelWrap = A.el("div", "", ring, {
        transform: circles.length === 3
          ? (i === 0 ? "translate(24px, -24px)" : (i === 1 ? "translate(-24px, -24px)" : "translate(0px, 42px)"))
          : (i === 0 ? "translateX(36px)" : "translateX(-36px)"),
      });
      const tEl = A.text(labelWrap, c.data.title, "h2", "", {
        fontSize: asp.isPortrait ? "28px" : "30px", fontWeight: 900, color: col.text,
      });
      A.field(c.key, tEl);
      if (c.data.note) {
        A.text(labelWrap, c.data.note, "caption", "", { fontSize: "21px", color: col.muted, marginTop: "6px" });
      }
      ringEls.push(ring);
    });

    const endAt = A.stepReveal(ringEls, { role: "card", at: A.at("card", 0, 0.25), minGap: 0.82, sfx: "whoosh-subtle" });

    if (s.overlap) {
      const badge = A.el("div", "abs", stageBox, {
        left: Math.round(cx - 120), top: Math.round(cy - 38),
        width: "240px", padding: "14px 20px", borderRadius: "999px",
        background: A.color("accent"), color: "#111111", textAlign: "center",
        fontWeight: 900, fontSize: "26px", boxShadow: "0 14px 36px rgba(0,0,0,0.42)", zIndex: 8,
      });
      const ovTxt = A.text(badge, s.overlap, "label", "", { fontSize: "26px", fontWeight: 900, color: "#111111" });
      A.field("overlap", ovTxt);
      A.enter(badge, "badge", 0, 0, { at: endAt + 0.18 });
    }
  },
});
