Stage.template({
  name: "definition_card",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const col = A.th.colors || {};
    const isLight = col.isDark === false;
    const accent = A.color("accent");
    const padX = asp.isPortrait ? 54 : A.area.x;
    const leftEdge = asp.isPortrait ? 54 : A.area.left;

    const card = A.el("div", "card", A.root, {
      left: leftEdge, right: padX,
      top: asp.isPortrait ? 130 : Math.max(88, A.area.y + 10),
      bottom: A.scam ? 104 : (asp.isPortrait ? 140 : 96),
      padding: asp.isPortrait ? "48px 42px" : "60px 68px",
      display: "flex", flexDirection: "column", justifyContent: "center", gap: "26px",
      borderColor: isLight ? "rgba(0,0,0,0.14)" : "rgba(255,255,255,0.14)",
    });

    if (s.eyebrow) {
      const ey = A.text(card, s.eyebrow, "eyebrow", "", { color: accent, fontSize: "28px" });
      A.field("eyebrow", ey);
      A.enter(ey, "eyebrow");
    }

    const headRow = A.el("div", "", card, {
      display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "20px",
    });
    const termEl = A.text(headRow, s.term || "", "hero", "", {
      fontSize: asp.isPortrait ? "72px" : "86px", lineHeight: 1.15,
    });
    A.field("term", termEl);
    const textMode = s.textMotion || s.text_motion || "rise-mask";
    A.kinetic(termEl, { at: A.at("title"), mode: textMode, role: "title" });

    if (s.phonetic) {
      const ph = A.el("span", "lat", headRow, {
        fontSize: asp.isPortrait ? "34px" : "38px", fontWeight: 600,
        color: col.muted, direction: "ltr",
      });
      ph.textContent = s.phonetic;
      A.field("phonetic", ph);
      A.enter(ph, "eyebrow", 0, 0.16);
    }

    if (s.part_of_speech) {
      const pos = A.el("div", "", card, {
        fontSize: "26px", fontWeight: 700, color: accent, opacity: 0.9,
      });
      pos.textContent = s.part_of_speech;
      A.field("part_of_speech", pos);
      A.enter(pos, "eyebrow", 0, 0.22);
    }

    const divider = A.el("div", "", card, {
      width: "100%", height: "2px",
      background: `linear-gradient(270deg, ${accent} 0%, ${isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)"} 100%)`,
      transformOrigin: "100% 50%",
    });
    Stage.tl.from(divider, { scaleX: 0, duration: A.dur("expressive"), ease: Stage.ease("vox"), immediateRender: true }, A.at("title") + 0.18);

    const defEl = A.text(card, s.definition || "", "h1", "", {
      fontSize: asp.isPortrait ? "40px" : "44px", fontWeight: 700, lineHeight: 1.56,
    });
    A.field("definition", defEl);
    A.enter(defEl, "body", 0, 0.14, { ease: "fluid" });

    if (s.example) {
      const exBox = A.el("div", "", card, {
        padding: "24px 28px", borderRadius: "14px",
        background: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${isLight ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.10)"}`,
      });
      A.text(exBox, "مثال کاربردی", "caption", "", { color: accent, fontWeight: 800, fontSize: "24px", marginBottom: "8px" });
      const exText = A.text(exBox, s.example, "body", "", {
        fontSize: asp.isPortrait ? "30px" : "32px", lineHeight: 1.58, color: col.body || col.text,
      });
      A.field("example", exText);
      A.enter(exBox, "body", 1, 0.22, { ease: "fluid" });
    }

    A.enter(card, "card", 0, -0.05, { ease: "vox" });
    A.fit(card, 0.55);
  },
});
