Stage.template({
  name: "quote_card",
  build(s, A) {
    const hasImg = !!s.image;
    const toneRole = s.tone === "info" ? "info" : (Stage.T.tone(s.tone) || "accent");
    const toneCol = A.color(toneRole);

    const leftBound = A.area.left;
    const rightBound = A.L.margin;
    const topBound = A.area.y + 16;
    const bottomBound = A.scam ? 104 : 96;

    let cardLeft = leftBound;
    let cardRight = rightBound;

    if (hasImg) {
      const imgW = A.scam ? 350 : 460;
      const imgH = A.scam ? 520 : 640;
      const imgY = Math.round((topBound + (A.H - bottomBound) - imgH) / 2);
      const gap = 44;

      // End side: right in LTR, left in RTL (still >= A.area.left = 650 in SCAM)
      const imgX = A.ltr ? (A.W - rightBound - imgW) : leftBound;
      if (A.ltr) cardRight = rightBound + imgW + gap;
      else cardLeft = leftBound + imgW + gap;

      A.image(A.root, s.image, imgX, imgY, imgW, imgH, {
        motion: s.motion || "breathe",
        fit: "cover",
        border: true,
        radius: A.L.radius
      });
    }

    const stageWrap = A.el("div", "abs", A.root, {
      left: cardLeft,
      right: cardRight,
      top: topBound,
      bottom: bottomBound,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    });

    const cardCls = "card" + (toneRole === "danger" ? " dng-b" : toneRole === "accent" ? " acc-b" : "");
    const card = A.el("div", cardCls, stageWrap, {
      width: "100%",
      maxHeight: "100%",
      padding: A.scam ? "42px 48px" : "56px 64px",
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      gap: "24px",
      position: "relative",
      overflow: "hidden"
    });

    // Edge accent stripe along reading start
    const stripe = A.el("div", "", card, {
      position: "absolute",
      top: "0px",
      bottom: "0px",
      [A.start]: "0px",
      width: "6px",
      background: toneCol,
      transformOrigin: "top center"
    });

    // Top row: oversized quote SVG + optional eyebrow
    const headRow = A.el("div", "", card, {
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "20px"
    });

    const qFlip = A.el("div", "", headRow, {
      position: "relative",
      width: "68px",
      height: "52px",
      flexShrink: 0,
      transform: A.ltr ? "none" : "scaleX(-1)"
    });
    const qMarkWrap = A.el("div", "", qFlip, {
      position: "relative",
      width: "68px",
      height: "52px",
      transformOrigin: "50% 60%"
    });
    const qSvg = A.svg(qMarkWrap, 0, 0, 68, 52, "0 0 68 52");
    A.svgEl(qSvg, "path", {
      d: "M12 50 C4 50 0 43 0 33 C0 18 11 6 27 2 L30 9 C20 13 15 20 14 27 C16 26 19 26 21 27 C27 29 30 34 30 40 C30 46 24 50 12 50 Z M50 50 C42 50 38 43 38 33 C38 18 49 6 65 2 L68 9 C58 13 53 20 52 27 C54 26 57 26 59 27 C65 29 68 34 68 40 C68 46 62 50 50 50 Z",
      fill: toneCol
    });

    if (s.eyebrow) {
      const eyEl = A.text(headRow, s.eyebrow, "eyebrow", "", {
        color: toneCol,
        letterSpacing: A.ltr ? "0.14em" : "0",
        textAlign: "end"
      });
      A.enter(eyEl, "eyebrow", 0);
    }

    // Quote text with box-constrained A.fit
    const quoteStr = String(s.quote || "");
    const qLen = quoteStr.length;
    const initFont = qLen <= 85 ? (A.scam ? 50 : 58) : qLen <= 170 ? (A.scam ? 42 : 48) : (A.scam ? 35 : 40);
    const maxQuoteH = Math.max(180, (A.H - topBound - bottomBound) - 310);

    const quoteBox = A.el("div", "", card, {
      width: "100%",
      height: maxQuoteH + "px",
      display: "flex",
      alignItems: "center"
    });
    A.text(quoteBox, quoteStr, "quote", "", {
      width: "100%",
      fontSize: initFont + "px",
      lineHeight: 1.32,
      textAlign: "start"
    });
    A.fit(quoteBox, 0.5);
    quoteBox.style.height = "auto";

    // Animated drawing rule
    const ruleHost = A.el("div", "", card, {
      position: "relative",
      width: "180px",
      height: "6px",
      flexShrink: 0
    });
    const ruleSvg = A.svg(ruleHost, 0, 0, 180, 6, "0 0 180 6");
    const rulePath = A.svgEl(ruleSvg, "path", {
      d: A.ltr ? "M 2 3 L 178 3" : "M 178 3 L 2 3",
      stroke: toneCol,
      "stroke-width": 4,
      "stroke-linecap": "round",
      fill: "none"
    });

    // Author + Source/Role block
    const metaBox = A.el("div", "", card, {
      width: "100%",
      height: "110px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-start",
      gap: "6px"
    });
    A.text(metaBox, s.author || "", "label", "", {
      fontSize: "34px",
      color: A.color("text"),
      textAlign: "start"
    });
    const metaSub = s.role || s.attribution || s.publication || s.detail;
    if (metaSub) {
      A.text(metaBox, metaSub, "body", "", {
        fontSize: "25px",
        color: A.color("muted"),
        lineHeight: 1.3,
        textAlign: "start"
      });
    }
    A.fit(metaBox, 0.55);
    metaBox.style.height = "auto";

    // Entrances (never move after)
    A.enter(card, "card", 0);
    Stage.tl.fromTo(
      stripe,
      { scaleY: 0 },
      { scaleY: 1, duration: 0.52, ease: Stage.ease("power4"), immediateRender: true },
      A.at("card", 0) + 0.08
    );
    Stage.tl.fromTo(
      qMarkWrap,
      { opacity: 0, scale: 0.45, y: 14 },
      { opacity: 0.95, scale: 1, y: 0, duration: 0.52, ease: Stage.ease("back"), immediateRender: true },
      A.at("eyebrow", 0) + 0.04
    );
    A.enter(quoteBox, "title", 0, 0.08);
    A.draw(rulePath, A.at("body", 0), 0.52);
    A.enter(metaBox, "body", 1, 0.14);
  }
});
