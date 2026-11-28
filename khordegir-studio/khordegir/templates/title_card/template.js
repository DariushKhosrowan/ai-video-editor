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

    if (lively && preset === "spotlight") {
      const glow = A.el("div", "abs", A.root, {
        left: center && !A.scam ? "50%" : "68%", top: "48%",
        width: "860px", height: "420px", transform: "translate(-50%, -50%)",
        borderRadius: "999px", pointerEvents: "none",
        background: `radial-gradient(circle, ${colColors.accent || "#F5B700"}22 0%, transparent 70%)`,
      });
      Stage.tl.fromTo(glow, { opacity: 0, scale: 0.78 }, { opacity: 1, scale: 1, duration: 0.95, ease: Stage.ease("fluid"), immediateRender: true }, 0.1);
    }

    const t = A.text(col, s.title || "", "hero", "", { fontSize: (s.size || 92) + "px", maxWidth: "1500px" });
    A.field("title", t);

    let titleEnd = A.at("title");
    const explicitTextMotion = s.textMotion || s.text_motion || null;
    if (explicitTextMotion) {
      titleEnd = A.kinetic(t, { at: A.at("title"), mode: explicitTextMotion, role: "title" });
    } else if (!lively) {
      titleEnd = A.enter(t, "title");
    } else if (preset === "curtain-editorial") {
      titleEnd = A.kinetic(t, { at: A.at("title"), mode: "rise-mask", role: "title", stagger: 0.048, y: 24, ease: "vox" });
      A.sweepLine(col, { width: 220, height: 6, origin: center && !A.scam ? "50% 50%" : "100% 50%", at: A.at("title") + 0.08 });
    } else if (preset === "split-contrast") {
      titleEnd = A.kinetic(t, { at: A.at("title"), mode: "glide-rtl", role: "title", stagger: 0.045, ease: "vox" });
    } else if (preset === "minimal-type") {
      titleEnd = A.kinetic(t, { at: A.at("title"), mode: "editorial-blur", role: "title", stagger: 0.038, ease: "fluid" });
    } else if (preset === "glitch-pop") {
      titleEnd = A.kinetic(t, { at: A.at("title"), mode: "pop-clean", role: "title", stagger: 0.036, ease: "spring" });
    } else if (preset === "spotlight") {
      titleEnd = A.kinetic(t, { at: A.at("title"), mode: "editorial-blur", role: "title", stagger: 0.042, ease: "vox" });
    } else {
      // kinetic-hero
      titleEnd = A.kinetic(t, { at: A.at("title"), mode: "rise-mask", role: "title", stagger: 0.05, y: 26, ease: "vox" });
    }

    if (s.subtitle) {
      const subEl = A.text(col, s.subtitle, "body", "", { color: colColors.muted, maxWidth: "1300px", fontSize: "38px" });
      A.field("subtitle", subEl);
      A.enter(subEl, "body", 0, lively ? Math.max(0, titleEnd - A.at("body") - 0.16) : 0, lively ? { ease: "fluid", y: 12 } : {});
    }

    if (!s.image && (!lively || preset !== "curtain-editorial")) {
      const r = A.el("div", "rule", col);
      r.style.transformOrigin = center && !A.scam ? "50% 50%" : "100% 50%";
      if (lively) r.style.width = preset === "spotlight" ? "260px" : "190px";
      Stage.tl.from(r, { scaleX: 0, duration: A.dur("expressive"), ease: Stage.ease("vox"), immediateRender: true }, A.at("body", 1));
    }

    A.fit(col, 0.5);
  },
});
