Stage.template({
  name: "title_card",   // label, fields, example: see schema.json
  build(s, A) {
    const th = A.th, colColors = th.colors || {};
    const preset = (Stage.fx && Stage.fx.cur && Stage.fx.cur.preset) || "classic";
    const lively = preset !== "classic";
    const isLight = colColors.isDark === false;

    if (s.image) {
      const wrap = A.el("div", "abs fullbleed", A.root, { inset: 0 });
      A.image(wrap, s.image, 0, 0, A.W, A.H, { radius: 0, shadow: false, motion: s.motion || "breathe", dim: s.dim ?? 0.35, enter: false });
      const bgStop = isLight ? "rgba(247,244,238,.88)" : "rgba(14,14,18,.82)";
      const midStop = isLight ? "rgba(247,244,238,.42)" : "rgba(14,14,18,.45)";
      const clearStop = isLight ? "rgba(247,244,238,0)" : "rgba(14,14,18,0)";
      A.el("div", "abs", wrap, { inset: 0, background: `linear-gradient(to top, ${bgStop} 0%, ${midStop} 42%, ${clearStop} 78%)` });
      A.field("image", wrap);
      Stage.tl.from(wrap, { opacity: 0, duration: 0.8, ease: Stage.ease("power4"), immediateRender: true }, 0);
    }

    const center = s.align === "center" || !s.image;
    const left = A.area.left;
    const topY = center ? A.area.y : (A.H * 0.28);
    const col = A.el("div", "col", A.root, {
      right: A.area.x, left, top: topY, bottom: A.scam ? 200 : A.L.bottom + 30,
      justifyContent: "center",
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
      titleEnd = A.kinetic(t, { at: A.at("title"), role: "title", stagger: 0.055, y: 28, ease: "back" });
    } else if (preset === "glitch-pop") {
      A.kinetic(t, { at: A.at("title"), role: "title", stagger: 0.035, x: -20, y: 12, scale: 0.9, ease: "snappy" });
      titleEnd = A.at("title") + 0.55;
    } else {
      titleEnd = A.enter(t, "title", 0, 0, { ease: preset === "spotlight" ? "spring" : "editorial", y: 28, scale: 0.96 });
    }

    if (s.subtitle) {
      const subEl = A.text(col, s.subtitle, "body", "", { color: colColors.muted, maxWidth: "1300px", fontSize: "38px" });
      A.field("subtitle", subEl);
      A.enter(subEl, "body", 0, lively ? Math.max(0, titleEnd - A.at("body") - 0.15) : 0);
    }

    if (!s.image) {
      const r = A.el("div", "rule", col);
      r.style.transformOrigin = center && !A.scam ? "50% 50%" : "100% 50%";
      if (lively) r.style.width = preset === "spotlight" ? "240px" : "180px";
      Stage.tl.from(r, { scaleX: 0, duration: 0.6, ease: Stage.ease("power4"), immediateRender: true }, A.at("body", 1));
    }

    A.fit(col, 0.5);
  },
});
