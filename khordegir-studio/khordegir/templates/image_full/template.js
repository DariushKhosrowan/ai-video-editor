Stage.template({
  name: "image_full",   // label, fields, example: see schema.json
  build(s, A) {
    const preset = (Stage.fx && Stage.fx.cur && Stage.fx.cur.preset) || "classic";
    const lively = preset !== "classic";
    const top = s.title_position === "top";
    let box;
    if (A.scam) box = [A.area.left, A.area.y, A.W - A.L.margin - A.area.left, top ? 860 : 640];
    else box = [0, 0, A.W, A.H];
    const motion = s.motion || (lively && preset === "cinema-zoom" ? "zoom-out" : lively ? "gentle-drift" : undefined);
    const reveal = (lively && preset === "curtain-reveal" && A.scam) ? "curtain" : undefined;
    const f = A.image(A.root, s.image, box[0], box[1], box[2], box[3], {
      radius: A.scam ? undefined : 0, shadow: A.scam, motion, dim: s.dim ?? 0.25, enter: A.scam, reveal,
    });
    A.field("image", f);
    if (!A.scam) f.classList.add("fullbleed");
    if (!A.scam) {
      if (lively && preset === "curtain-reveal") {
        Stage.tl.fromTo(f, { clipPath: "inset(0% 0% 0% 100%)", opacity: 0.4 }, { clipPath: "inset(0% 0% 0% 0%)", opacity: 1, duration: A.dur("dramatic"), ease: Stage.ease("vox"), immediateRender: true }, 0);
      } else {
        Stage.tl.from(f, { opacity: 0, duration: A.dur("expressive"), ease: Stage.ease("fluid"), immediateRender: true }, 0);
      }
    }
    if (lively && preset === "noir-vignette" && !A.scam) {
      A.el("div", "abs", A.root, {
        inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 74% 70% at 50% 48%, transparent 38%, rgba(8,10,14,0.68) 100%)",
      });
    }
    const dots = Stage.T.list(s.dots);
    dots.forEach((d, i) => {
      const p = String(d).split(/[,،\s]+/); const x = box[0] + box[2] * Stage.toNum(p[0]) / 100, y = box[1] + box[3] * Stage.toNum(p[1]) / 100;
      const bad = /danger|red|قرمز/.test(p[2] || ""); const r = bad ? 13 : 10;
      const dotCol = A.color(bad ? "danger" : "accent");
      const dot = A.el("div", "abs", A.root, {
        left: x - r, top: y - r, width: 2 * r, height: 2 * r, borderRadius: "50%",
        background: dotCol, boxShadow: `0 0 0 6px ${bad ? "rgba(229,57,53,.25)" : "rgba(255,214,0,.2)"}`,
      });
      A.enter(dot, "badge", 0, 0.25 + i * 0.05);
      if (lively && preset === "radar-dots" && Stage.amb) {
        const ring = A.el("div", "abs", A.root, {
          left: x - r, top: y - r, width: 2 * r, height: 2 * r, borderRadius: "50%",
          border: `2px solid ${dotCol}`, pointerEvents: "none",
        });
        Stage.amb.fromTo(ring, { scale: 1, opacity: 0.45 }, {
          scale: 2.35, opacity: 0, duration: 2.8, ease: "power1.out", repeat: 99,
        }, 0.5 + i * 0.25);
      }
    });
    if (s.title || s.text) {
      const shade = !A.scam;
      const isLight = A.th.colors.isDark === false;
      if (shade) A.el("div", "abs", A.root, { left: 0, right: 0, [top ? "top" : "bottom"]: 0, height: 420, background: `linear-gradient(to ${top ? "bottom" : "top"}, ${isLight ? "rgba(247,244,238,.92)" : "rgba(18,18,18,.92)"}, rgba(18,18,18,0))` });
      const col = A.el("div", "col", A.root, { left: A.area.left, right: A.area.x, gap: "10px", justifyContent: top ? "flex-start" : "flex-end",
        top: A.scam ? (top ? A.area.y + 880 : box[1] + box[3] + 30) : (top ? A.area.y : 600), bottom: A.scam ? 110 : 110 });
      A.field("title", col);
      if (s.title) {
        const tEl = A.text(col, s.title, "hero", "", { fontSize: "68px" });
        const explicitTextMotion = s.textMotion || s.text_motion || null;
        if (explicitTextMotion) {
          A.kinetic(tEl, { at: A.at("title") + 0.16, mode: explicitTextMotion, role: "title" });
        } else if (lively && preset === "parallax-caption") {
          A.kinetic(tEl, { at: A.at("title") + 0.16, mode: "rise-mask", role: "title", stagger: 0.045, ease: "vox" });
        } else {
          A.enter(tEl, "title", 0, 0.2, lively ? { ease: "vox" } : {});
        }
      }
      if (s.text) A.enter(A.text(col, s.text, "body", "", { color: isLight ? A.th.colors.text : "#d0d0d0" }), "body", 0, 0.2, lively ? { ease: "fluid" } : {});
      A.fit(col, 0.5);
    }
  }
});
