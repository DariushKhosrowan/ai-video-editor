Stage.template({
  name: "hook_title",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const col = A.th.colors || {};
    const accent = A.color("accent");
    const padX = asp.isPortrait ? 56 : A.area.x;
    const leftEdge = asp.isPortrait ? 56 : A.area.left;

    // Optional oversized watermark stat behind text
    if (s.stat) {
      const wm = A.el("div", "abs tnum", A.root, {
        left: "50%", top: asp.isPortrait ? "30%" : "48%",
        transform: "translate(-50%, -50%)",
        fontSize: asp.isPortrait ? "340px" : "380px", fontWeight: 900, lineHeight: 1,
        color: accent, opacity: 0.08, pointerEvents: "none", whiteSpace: "nowrap",
      });
      wm.textContent = Stage.fa(String(s.stat));
      A.field("stat", wm);
      Stage.tl.fromTo(wm, { opacity: 0, scale: 0.88 }, { opacity: 0.09, scale: 1, duration: A.dur("expressive"), ease: Stage.ease("vox"), immediateRender: true }, 0.04);
    }

    const colBox = A.el("div", "col", A.root, {
      left: leftEdge, right: padX,
      top: asp.isPortrait ? 140 : A.area.y,
      bottom: A.scam ? 120 : (asp.isPortrait ? 180 : 100),
      alignItems: A.scam ? "flex-start" : "center",
      textAlign: A.scam ? "right" : "center",
      justifyContent: "center",
      gap: asp.isPortrait ? "26px" : "20px",
    });

    if (s.kicker) {
      const kick = A.text(colBox, s.kicker, "eyebrow", "", {
        fontSize: asp.isPortrait ? "36px" : "34px", color: accent, letterSpacing: "0.02em",
      });
      A.field("kicker", kick);
      A.enter(kick, "eyebrow", 0, 0, { ease: "snappy" });
    }

    const tSize = asp.isPortrait ? 86 : (asp.isSquare ? 78 : 96);
    const titleEl = A.text(colBox, s.title || "", "hero", "", {
      fontSize: tSize + "px", lineHeight: 1.18, maxWidth: "100%",
    });
    A.field("title", titleEl);
    const textMode = s.textMotion || s.text_motion || "punch-scale";
    const tEnd = A.kinetic(titleEl, { at: A.at("title"), mode: textMode, role: "title" });

    if (s.accent_line) {
      const accEl = A.text(colBox, s.accent_line, "hero", "", {
        fontSize: Math.round(tSize * 1.12) + "px", lineHeight: 1.12,
        color: accent, maxWidth: "100%",
      });
      A.field("accent_line", accEl);
      A.kinetic(accEl, { at: Math.max(A.at("title") + 0.18, tEnd - 0.12), mode: "pop-clean", role: "title" });
    }

    const bar = A.el("div", "rule", colBox, {
      width: asp.isPortrait ? "220px" : "260px", height: "7px",
      background: accent, transformOrigin: A.scam ? "100% 50%" : "50% 50%",
    });
    Stage.tl.from(bar, { scaleX: 0, duration: A.dur("snappy"), ease: Stage.ease("snappy"), immediateRender: true }, A.at("body"));

    if (s.subtext) {
      const sub = A.text(colBox, s.subtext, "body", "", {
        fontSize: asp.isPortrait ? "38px" : "36px", color: col.muted, maxWidth: "1100px",
      });
      A.field("subtext", sub);
      A.enter(sub, "body", 0, 0.08, { ease: "fluid" });
    }

    A.fit(colBox, 0.52);
  },
});
