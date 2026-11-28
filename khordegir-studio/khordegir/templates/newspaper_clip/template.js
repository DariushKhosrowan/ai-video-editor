Stage.template({
  name: "newspaper_clip",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const padX = asp.isPortrait ? 48 : Math.max(120, A.area.x + 40);
    const leftEdge = asp.isPortrait ? 48 : Math.max(120, A.area.left + 40);
    const topY = asp.isPortrait ? 130 : Math.max(82, A.area.y + 8);
    const botY = s.caption ? (A.scam ? 176 : 158) : (A.scam ? 110 : 90);

    // Authentic warm archival newsprint sheet
    const paper = A.el("div", "abs paper-grain", A.root, {
      left: leftEdge, right: padX, top: topY, bottom: botY,
      background: "#F3EFE4", color: "#171717",
      borderRadius: "6px",
      padding: asp.isPortrait ? "42px 38px" : "52px 66px",
      boxShadow: "0 34px 90px rgba(0,0,0,0.58), 0 6px 20px rgba(0,0,0,0.35)",
      border: "1px solid rgba(23,23,23,0.18)",
      display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "24px",
      overflow: "hidden",
    });

    // Newspaper masthead
    const mast = A.el("div", "", paper, {
      display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "18px",
      borderTop: "4px solid #171717",
      borderBottom: "2px solid #171717",
      padding: "14px 0",
    });
    const pub = A.el("div", "", mast, {
      fontSize: asp.isPortrait ? "30px" : "34px", fontWeight: 900, color: "#171717",
    });
    pub.textContent = s.publication || "روزنامه تحلیلی";
    A.field("publication", pub);

    if (s.date) {
      const dt = A.el("div", "tnum", mast, {
        fontSize: asp.isPortrait ? "22px" : "24px", fontWeight: 700, color: "#525252",
      });
      dt.textContent = Stage.fa(s.date);
      A.field("date", dt);
    }

    // Headline
    const hl = A.text(paper, s.headline || "", "hero", "", {
      color: "#111111", fontSize: asp.isPortrait ? "52px" : "62px",
      lineHeight: 1.28, fontWeight: 900,
    });
    A.field("headline", hl);

    // Subtle column rule
    A.el("div", "", paper, { width: "100%", height: "1px", background: "rgba(23,23,23,0.22)" });

    // Excerpt paragraph (supports ==highlighted== marker sweep via FX.post)
    const ex = A.text(paper, s.excerpt || "", "body", "", {
      color: "#262626", fontSize: asp.isPortrait ? "34px" : "38px", lineHeight: 1.72, fontWeight: 500,
    });
    A.field("excerpt", ex);

    // Subtle editorial camera settle within 1.06 zoom cap
    Stage.tl.fromTo(paper,
      { opacity: 0, y: 36, rotation: -1.6, scale: 0.96 },
      { opacity: 1, y: 0, rotation: -0.6, scale: 1, duration: A.dur("expressive"), ease: Stage.ease("vox"), immediateRender: true },
      A.at("card", 0)
    );
    const textMode = s.textMotion || s.text_motion || "rise-mask";
    A.kinetic(hl, { at: A.at("title") + 0.1, mode: textMode, role: "title" });
    A.enter(ex, "body", 0, 0.25, { ease: "fluid" });
    // Gently push zoom up to 1.035 (strictly <= STAGE_ZOOM_CAP 1.06) on ambient timeline
    if (Stage.amb) {
      Stage.amb.fromTo(paper, { scale: 1.0 }, { scale: Stage.capZoom(1.035), duration: 16, ease: "sine.inOut", yoyo: true, repeat: 99 }, 0);
    }

    if (s.caption) {
      const capWrap = A.el("div", "abs", A.root, {
        left: leftEdge, right: padX, bottom: A.scam ? 58 : 44,
        textAlign: "center",
      });
      const capEl = A.text(capWrap, s.caption, "body", "", {
        fontSize: asp.isPortrait ? "30px" : "32px", color: A.th.colors.muted,
      });
      A.field("caption", capEl);
      A.enter(capWrap, "body", 1, 0.35, { ease: "fluid" });
    }
  },
});
