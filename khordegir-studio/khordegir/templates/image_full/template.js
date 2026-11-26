Stage.template({
  name: "image_full",   // label, fields, example: see schema.json
  build(s, A) {
    const top = s.title_position === "top";
    let box;
    if (A.scam) box = [A.area.left, A.area.y, A.W - A.L.margin - A.area.left, top ? 860 : 640];
    else box = [0, 0, A.W, A.H];
    const f = A.image(A.root, s.image, box[0], box[1], box[2], box[3], { radius: A.scam ? undefined : 0, shadow: A.scam, motion: s.motion, dim: s.dim ?? 0.25, enter: A.scam });
    A.field("image", f);
    const UI = Stage.MOTION.ui;
    if (!A.scam) f.classList.add("fullbleed");
    if (!A.scam) Stage.tl.from(f, { opacity: 0, duration: UI.imageFull.dur, ease: Stage.ease(UI.imageFull.ease), immediateRender: true }, UI.imageFull.delay);
    const dots = Stage.T.list(s.dots);
    dots.forEach((d, i) => {
      const p = String(d).split(/[,،\s]+/); const x = box[0] + box[2] * Stage.toNum(p[0]) / 100, y = box[1] + box[3] * Stage.toNum(p[1]) / 100;
      const bad = /danger|red|قرمز/.test(p[2] || ""); const r = bad ? 13 : 10;
      const dot = A.el("div", "abs", A.root, { left: x - r, top: y - r, width: 2 * r, height: 2 * r, borderRadius: "50%", background: A.color(bad ? "danger" : "accent"), boxShadow: `0 0 0 6px ${bad ? "rgba(229,57,53,.25)" : "rgba(255,214,0,.2)"}` });
      A.enter(dot, "badge", 0, UI.dotBaseDelay + i * UI.dotStagger);
    });
    if (s.title || s.text) {
      const shade = !A.scam;
      const isLight = A.th.colors.isDark === false;
      if (shade) A.el("div", "abs", A.root, { left: 0, right: 0, [top ? "top" : "bottom"]: 0, height: 420, background: `linear-gradient(to ${top ? "bottom" : "top"}, ${isLight ? "rgba(247,244,238,.92)" : "rgba(18,18,18,.92)"}, rgba(18,18,18,0))` });
      const col = A.el("div", "col", A.root, { left: A.area.left, right: A.area.x, gap: "10px", justifyContent: top ? "flex-start" : "flex-end",
        top: A.scam ? (top ? A.area.y + 880 : box[1] + box[3] + 30) : (top ? A.area.y : 600), bottom: A.scam ? 110 : 110 });
      A.field("title", col);
      if (s.title) A.enter(A.text(col, s.title, "hero", "", { fontSize: "68px" }), "title", 0, UI.imageFullTextExtra);
      if (s.text) A.enter(A.text(col, s.text, "body", "", { color: isLight ? A.th.colors.text : "#d0d0d0" }), "body", 0, UI.imageFullTextExtra);
      A.fit(col, 0.5);
    }
  }
});
