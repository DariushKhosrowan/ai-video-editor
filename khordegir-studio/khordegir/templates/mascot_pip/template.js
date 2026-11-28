Stage.template({
  name: "mascot_pip",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const col = A.th.colors || {};
    const corner = String(s.pip_corner || "bottom-left");
    const isLeftCorner = corner.includes("left");
    const padX = asp.isPortrait ? 48 : A.area.x;
    const topY = asp.isPortrait ? 86 : A.area.y;

    // Main content slide area leaves clean room for PiP frame (never overlaps!)
    const pipW = asp.isPortrait ? 330 : (asp.isSquare ? 310 : 380);
    const pipH = asp.isPortrait ? 350 : (asp.isSquare ? 330 : 400);
    const contentLeft = (!asp.isPortrait && isLeftCorner) ? (padX + pipW + 44) : padX;
    const contentRight = (!asp.isPortrait && !isLeftCorner) ? (padX + pipW + 44) : padX;
    const contentBot = asp.isPortrait ? (pipH + 92) : 92;

    const mainBox = A.el("div", "abs", A.root, {
      left: contentLeft, right: contentRight, top: topY, bottom: contentBot,
      display: "flex", flexDirection: "column", justifyContent: "center", gap: "24px",
    });

    const ey = A.text(mainBox, s.eyebrow || "نکتهٔ تحلیلی", "eyebrow", "", {
      color: A.color("accent"), fontSize: "28px",
    });
    A.field("eyebrow", ey);
    A.enter(ey, "eyebrow");

    const title = A.text(mainBox, s.title || "", "h1", "", {
      fontSize: asp.isPortrait ? "52px" : "60px", lineHeight: 1.28,
    });
    A.field("title", title);
    A.kinetic(title, { at: A.at("title"), mode: s.textMotion || s.text_motion || "rise-mask", role: "title" });

    if (s.body) {
      const bodyEl = A.text(mainBox, s.body, "body", "", {
        fontSize: asp.isPortrait ? "32px" : "34px", color: col.muted, lineHeight: 1.58,
      });
      A.field("body", bodyEl);
      A.enter(bodyEl, "body", 0, 0.14);
    }

    const bullets = A.list(s.bullets);
    if (bullets.length) {
      const listWrap = A.el("div", "", mainBox, { display: "flex", flexDirection: "column", gap: "14px", marginTop: "6px" });
      const rows = [];
      bullets.slice(0, 4).forEach((b) => {
        const row = A.el("div", "card", listWrap, {
          padding: "16px 22px", display: "flex", alignItems: "center", gap: "14px",
          borderRight: `4px solid ${A.color("accent")}`,
        });
        A.text(row, b, "body", "", { fontSize: asp.isPortrait ? "28px" : "30px" });
        rows.push(row);
      });
      A.stagger(rows, "card", { from: "start", step: "normal", extra: 0.24 });
    }

    // Picture-in-Picture Puppet Corner Frame
    const pipStyle = {
      width: pipW + "px", height: pipH + "px",
      borderRadius: "28px", overflow: "hidden",
      border: `4px solid ${A.color("accent")}`,
      background: "radial-gradient(circle at 50% 42%, rgba(255,214,0,0.16) 0%, rgba(16,18,26,0.94) 72%)",
      boxShadow: "0 20px 52px rgba(0,0,0,0.5)",
      zIndex: 25,
    };
    if (corner.includes("top")) pipStyle.top = (topY + 8) + "px";
    else pipStyle.bottom = "46px";
    if (isLeftCorner) pipStyle.left = padX + "px";
    else pipStyle.right = padX + "px";

    const pipFrame = A.el("div", "abs", A.root, pipStyle);
    A.enter(pipFrame, "card", 0, 0.12, { ease: "spring" });

    // Mount Red Eagle / Puppet Cast inside PiP frame if StageMascot is available
    if (window.StageMascot && typeof window.StageMascot.createMascotInstance === "function") {
      const mCfg = {
        side: isLeftCorner ? "left" : "right",
        scale: 0.72,
        expression: s.expression || "happy",
        look_at: isLeftCorner ? "right" : "left",
        say: s.say || "",
        visemeTrack: s.visemeTrack || null,
        prosodyTrack: s.prosodyTrack || null,
        tone: s.tone || (s.mascot && s.mascot.tone) || null,
        puppet: s.puppet || (s.mascot && s.mascot.puppet) || null,
        duration: +s.duration || 6,
        seed: s._seed || s.seed || "mascot-pip",
        stageW: pipW,
        stageH: pipH,
        x: pipW * 0.5,
        y: pipH * 0.56,
      };
      const inst = window.StageMascot.createMascotInstance(pipFrame, mCfg);
      Stage.registerMascot(inst);
      Stage.onSeek((t) => { if (!Stage._liveVoiceActive) inst.seek(t); });
    } else {
      const fallback = A.text(pipFrame, "مجری عروسکی (PiP)", "caption", "abs", {
        inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: A.color("accent"), fontWeight: 800,
      });
      A.field("say", fallback);
    }

    // Caption tag under/on PiP frame wired to say for WYSIWYG clarity
    const pipBadge = A.text(pipFrame, "LIVE · مجری", "caption", "abs", {
      right: "14px", top: "12px", padding: "4px 12px", borderRadius: "999px",
      background: A.color("accent"), color: "#111", fontWeight: 900, fontSize: "16px",
    });
    A.field("say", pipBadge);
  },
});
