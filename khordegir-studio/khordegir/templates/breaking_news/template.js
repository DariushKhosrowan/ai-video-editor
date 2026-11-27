Stage.template({
  name: "breaking_news",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const col = A.th.colors || {};
    const isLight = col.isDark === false;
    const preset = (Stage.fx && Stage.fx.cur && Stage.fx.cur.preset) || "urgent-flash";
    const danger = A.color("danger");
    const accent = A.color("accent");
    const padX = asp.isPortrait ? 56 : A.area.x;
    const leftEdge = asp.isPortrait ? 56 : A.area.left;
    const topY = asp.isPortrait ? 92 : Math.max(54, A.area.y);
    const tickerH = s.ticker ? (asp.isPortrait ? 84 : 74) : 0;
    const botLimit = A.scam ? 96 : (tickerH ? tickerH + 26 : 64);

    // Top broadcast masthead bar
    const headerBar = A.el("div", "abs", A.root, {
      left: leftEdge, right: padX, top: topY, height: "68px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      borderBottom: `2px solid ${isLight ? "rgba(0,0,0,0.14)" : "rgba(255,255,255,0.14)"}`,
      paddingBottom: "14px",
    });

    const badgeWrap = A.el("div", "", headerBar, {
      display: "inline-flex", alignItems: "center", gap: "14px",
    });
    const urgentTag = A.el("div", "", badgeWrap, {
      background: danger, color: "#FFFFFF", fontWeight: 900,
      fontSize: asp.isPortrait ? "30px" : "28px", padding: "8px 22px",
      borderRadius: "6px", letterSpacing: "0.02em",
    });
    urgentTag.textContent = s.badge || "خبر فوری";
    A.field("badge", urgentTag);
    A.enter(urgentTag, "badge", 0, 0, { ease: "sharp" });

    if (s.timestamp) {
      const ts = A.el("div", "tnum", headerBar, {
        fontSize: asp.isPortrait ? "28px" : "26px", fontWeight: 700,
        color: col.muted || "#94a3b8",
      });
      ts.textContent = Stage.fa(s.timestamp);
      A.field("timestamp", ts);
      A.enter(ts, "eyebrow", 0, 0.05);
    }

    // Content area (split when image is present)
    const contentTop = topY + 96;
    const contentH = A.H - contentTop - botLimit;
    const hasImg = !!s.image;

    let textBox = { left: leftEdge, right: padX, top: contentTop, height: contentH };
    if (hasImg) {
      if (asp.isPortrait) {
        const imgH = Math.round(contentH * 0.44);
        const imgW = A.W - leftEdge - padX;
        const fr = A.image(A.root, s.image, leftEdge, contentTop, imgW, imgH, { reveal: "wipe", motion: "gentle-drift" });
        A.field("image", fr);
        textBox = { left: leftEdge, right: padX, top: contentTop + imgH + 34, height: contentH - imgH - 34 };
      } else {
        const usableW = A.W - leftEdge - padX;
        const imgW = Math.round(usableW * 0.42);
        const fr = A.image(A.root, s.image, leftEdge, contentTop + 10, imgW, Math.max(300, contentH - 20), { reveal: "wipe", motion: "gentle-drift" });
        A.field("image", fr);
        textBox = { left: leftEdge + imgW + 48, right: padX, top: contentTop, height: contentH };
      }
    }

    const bodyCol = A.el("div", "col", A.root, {
      left: textBox.left, right: textBox.right, top: textBox.top, height: textBox.height,
      justifyContent: "center", alignItems: "flex-start", gap: "22px",
    });

    const accentRule = A.el("div", "rule", bodyCol, {
      width: "140px", height: "6px", background: danger, transformOrigin: "100% 50%",
    });
    Stage.tl.from(accentRule, { scaleX: 0, duration: A.dur("snappy"), ease: Stage.ease("sharp"), immediateRender: true }, A.at("eyebrow") + 0.06);

    const headlineSize = asp.isPortrait ? 66 : (hasImg ? 64 : 78);
    const titleEl = A.text(bodyCol, s.title || "", "hero", "", {
      fontSize: headlineSize + "px", lineHeight: 1.24, maxWidth: "100%",
    });
    A.field("title", titleEl);
    const textMode = s.textMotion || s.text_motion || (preset === "minimal-news" ? "editorial-blur" : "glide-rtl");
    A.kinetic(titleEl, { at: A.at("title"), mode: textMode, role: "title", ease: "sharp" });

    if (s.summary) {
      const sumEl = A.text(bodyCol, s.summary, "body", "", {
        fontSize: asp.isPortrait ? "34px" : "36px", lineHeight: 1.55,
        color: col.body || col.text, maxWidth: "100%",
      });
      A.field("summary", sumEl);
      A.enter(sumEl, "body", 0, 0.12, { ease: "fluid" });
    }
    A.fit(bodyCol, 0.55);

    // Bottom broadcast ticker bar (SCAM-safe positioning)
    if (s.ticker) {
      const tickLeft = A.scam ? A.area.left : 0;
      const tickerWrap = A.el("div", "abs", A.root, {
        left: tickLeft, right: 0, bottom: 0, height: tickerH + "px",
        background: isLight ? "#14161B" : (col.bg2 || "#0D0F14"),
        borderTop: `3px solid ${danger}`,
        display: "flex", alignItems: "center", overflow: "hidden", zIndex: 25,
      });
      const tag = A.el("div", "", tickerWrap, {
        flex: "0 0 auto", height: "100%", padding: "0 28px",
        display: "flex", alignItems: "center", background: accent, color: "#111111",
        fontWeight: 900, fontSize: "26px", zIndex: 2,
      });
      tag.textContent = "تیترها";
      const track = A.el("div", "", tickerWrap, {
        flex: "1 1 auto", overflow: "hidden", whiteSpace: "nowrap",
        padding: "0 28px", fontSize: "28px", fontWeight: 700, color: "#F8FAFC",
      });
      const inner = A.el("span", "", track, { display: "inline-block", whiteSpace: "nowrap" });
      inner.textContent = Stage.fa(s.ticker + "   ◆   " + s.ticker);
      A.field("ticker", tickerWrap);
      Stage.tl.from(tickerWrap, { y: tickerH, opacity: 0, duration: A.dur("snappy"), ease: Stage.ease("sharp"), immediateRender: true }, A.at("body"));
      if (Stage.amb) {
        Stage.amb.fromTo(inner, { x: 0 }, { x: 420, duration: 18, ease: "none", repeat: 99 }, 0);
      }
    }
  },
});
