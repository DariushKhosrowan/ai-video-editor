Stage.template({
  name: "timeline",   // label, fields, example: see schema.json
  build(s, A) {
    const preset = (Stage.fx && Stage.fx.cur && Stage.fx.cur.preset) || "classic";
    const lively = preset !== "classic";
    const h = Stage.T.header(A, s, { fieldTitle: true });
    const ev = Array.isArray(s.events) ? s.events : Stage.T.pairs(s.events).map((p) => ({ date: p[0], text: p[1] }));
    const left = A.area.left + 40, right = A.area.x + 40, W = A.W - left - right;
    const y = Math.max(h.bottom + 160, A.H * (A.scam ? 0.38 : 0.5));
    const line = A.el("div", "abs", A.root, { left, width: W, top: y - 3, height: 6, borderRadius: "3px", background: A.th.colors.axis, transformOrigin: A.originStart });
    A.field("events", line);
    Stage.tl.from(line, { scaleX: 0, duration: lively ? 0.95 : 0.9, ease: Stage.ease(lively ? "vox" : "power3"), immediateRender: true }, A.at("body"));
    const n = ev.length, step = W / n;
    const stagger = (lively && preset === "stagger-eras") ? 0.28 : 0.22;
    ev.forEach((e, i) => {
      const cx = A.ltr ? left + step * (i + 0.5) : A.W - right - step * (i + 0.5);
      const tone = Stage.T.tone(e.tone);
      const dot = A.el("div", "abs", A.root, {
        left: cx - 18, top: y - 18, width: 36, height: 36, borderRadius: "50%",
        background: A.color(tone || "accent"), border: `6px solid ${A.th.colors.bg}`,
        boxShadow: lively ? `0 0 0 6px ${A.color(tone || "accent")}22` : undefined,
      });
      const at = A.at("body") + 0.22 + i * stagger;
      A.enter(dot, "badge", 0, 0, {
        at,
        ease: (lively && (preset === "milestone-pop" || preset === "elastic-nodes")) ? "spring" : (lively ? "vox" : undefined),
      });
      const d = A.text(A.root, e.date, "value", "abs", { left: cx - step / 2, width: step, textAlign: "center", top: y - 120, color: A.color(tone || "accent"), fontSize: "60px" });
      const t = A.text(A.root, e.text, "body", "abs", { left: cx - step / 2 + 14, width: step - 28, textAlign: "center", top: y + 40, fontSize: "32px" });
      if (lively && preset === "stagger-eras") {
        A.kinetic(d, { at, mode: "rise-mask", role: "title", stagger: 0.04, ease: "vox" });
      } else {
        A.enter(d, "title", 0, 0, { at, ease: lively ? "vox" : undefined });
      }
      A.enter(t, "body", 0, 0, { at: at + 0.08, x: 0, y: 12, ease: lively ? "fluid" : undefined });
    });
  }
});
