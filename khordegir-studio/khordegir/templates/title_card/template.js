Stage.template({
  name: "title_card",   // label, fields, example: see schema.json
  build(s, A) {
    const th = A.th, colColors = th.colors || {};
    const preset = (Stage.fx && Stage.fx.cur && Stage.fx.cur.preset) || "classic";
    const lively = preset !== "classic";
    const isLight = colColors.isDark === false;

    if (s.image) {
      const wrap = A.el("div", "abs fullbleed", A.root, { inset: 0 });
      A.image(wrap, s.image, 0, 0, A.W, A.H, { radius: 0, shadow: false, motion: s.motion || "breathe", dim: s.dim ?? 0.55, enter: false });
      const bgStop = isLight ? "rgba(247,244,238,.92)" : "rgba(18,18,18,.96)";
      const midStop = isLight ? "rgba(247,244,238,.52)" : "rgba(18,18,18,.55)";
      const clearStop = isLight ? "rgba(247,244,238,0)" : "rgba(18,18,18,0)";
      A.el("div", "abs", wrap, { inset: 0, background: `linear-gradient(to top, ${bgStop} 0%, ${midStop} 45%, ${clearStop} 75%)` });
      A.field("image", wrap);
      const imgTok = Stage.MOTION.ui.imageFull;
      Stage.tl.from(wrap, { opacity: 0, duration: imgTok.dur, ease: Stage.ease(imgTok.ease), immediateRender: true }, imgTok.delay);
    }

    const center = s.align === "center" || !s.image;
    const left = A.area.left;
    const col = A.el("div", "col", A.root, {
      right: A.area.x, left, top: center ? A.area.y : A.H * 0.42, bottom: A.scam ? 200 : A.L.bottom + 40,
      justifyContent: center ? "center" : "flex-end",
      alignItems: center && !A.scam ? "center" : "flex-start",
      textAlign: center && !A.scam ? "center" : "right",
      gap: "14px",
    });

    if (s.badge && lively) {
      const bd = A.text(col, s.badge, "caption", "badge acc");
      A.enter(bd, "badge");
    }

    if (s.eyebrow) {
      const eyEl = A.text(col, s.eyebrow, "eyebrow");
      A.field("eyebrow", eyEl);
      A.enter(eyEl, "eyebrow");
    }

    const t = A.text(col, s.title || "", "hero", "", { fontSize: (s.size || 92) + "px", maxWidth: "1500px" });
    A.field("title", t);

    let titleEnd = A.at("title");
    if (!lively) {
      titleEnd = A.enter(t, "title");
    } else if (preset === "kinetic-hero" || preset === "curtain-editorial" || preset === "split-contrast") {
      const wsHero = Stage.MOTION.wordStagger.hero;
      titleEnd = A.kinetic(t, { at: A.at("title"), role: "title", preset: "hero", ease: preset === "kinetic-hero" ? "back" : wsHero.ease });
    } else if (preset === "glitch-pop") {
      titleEnd = A.kinetic(t, { at: A.at("title"), role: "title", preset: "snappy", ease: "snappy" });
    } else {
      titleEnd = A.enter(t, "title", 0, 0, { ease: preset === "spotlight" ? "spring" : Stage.MOTION.text.title.ease });
    }

    if (s.subtitle) {
      const subEl = A.text(col, s.subtitle, "body", "", { color: colColors.muted, maxWidth: "1300px", fontSize: "38px" });
      A.field("subtitle", subEl);
      A.enter(subEl, "body", 0, lively ? Math.max(0, titleEnd - A.at("body") - Stage.MOTION.text.subtitleOverlap) : 0);
    }

    if (!s.image) {
      const r = A.el("div", "rule", col);
      r.style.transformOrigin = center && !A.scam ? "50% 50%" : "100% 50%";
      if (lively) r.style.width = preset === "spotlight" ? "240px" : "180px";
      const sl = Stage.MOTION.ui.sweepLine;
      Stage.tl.from(r, { scaleX: 0, duration: sl.dur, ease: Stage.ease(sl.ease), immediateRender: true }, A.at("body", 1));
    }

    A.fit(col, 0.5);
  },
});
