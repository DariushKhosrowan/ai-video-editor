Stage.template({
  name: "title_card",   // label, fields, example: see schema.json
  build(s, A) {
    const th = A.th;
    if (s.image) {
      const wrap = A.el("div", "abs fullbleed", A.root, { inset: 0 });
      const f = A.image(wrap, s.image, 0, 0, A.W, A.H, { radius: 0, shadow: false, motion: s.motion || "breathe", dim: s.dim ?? 0.55, enter: false });
      A.el("div", "abs", wrap, { inset: 0, background: "linear-gradient(to top, rgba(18,18,18,.96) 0%, rgba(18,18,18,.55) 45%, rgba(18,18,18,0) 75%)" });
      Stage.tl.from(wrap, { opacity: 0, duration: 0.8, ease: Stage.ease("power4"), immediateRender: true }, 0);
    }
    const center = s.align === "center" || !s.image;
    const left = A.area.left;
    const col = A.el("div", "col", A.root, { right: A.area.x, left, top: center ? A.area.y : A.H * 0.42, bottom: A.scam ? 200 : A.L.bottom + 40,
      justifyContent: center ? "center" : "flex-end", alignItems: center && !A.scam ? "center" : "flex-start", textAlign: center && !A.scam ? "center" : "start", gap: "14px" });
    if (s.eyebrow) A.enter(A.text(col, s.eyebrow, "eyebrow"), "eyebrow");
    const t = A.text(col, s.title, "hero", "", { fontSize: (s.size || 92) + "px", maxWidth: "1500px" });
    A.enter(t, "title");
    if (s.subtitle) A.enter(A.text(col, s.subtitle, "body", "", { color: th.colors.muted, maxWidth: "1300px", fontSize: "38px" }), "body");
    if (!s.image) { const r = A.el("div", "rule", col); r.style.transformOrigin = center && !A.scam ? "50% 50%" : A.originStart; Stage.tl.from(r, { scaleX: 0, duration: 0.6, ease: Stage.ease("power4"), immediateRender: true }, A.at("body", 1)); }
    A.fit(col, 0.5);
  }
});
