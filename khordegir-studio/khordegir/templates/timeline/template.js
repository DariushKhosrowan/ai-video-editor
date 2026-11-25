Stage.template({
  name: "timeline",   // label, fields, example: see schema.json
  build(s, A) {
    const h = Stage.T.header(A, s);
    const ev = Array.isArray(s.events) ? s.events : Stage.T.pairs(s.events).map((p) => ({ date: p[0], text: p[1] }));
    const left = A.area.left + 40, right = A.area.x + 40, W = A.W - left - right;
    const y = Math.max(h.bottom + 200, A.H * 0.5);
    const line = A.el("div", "abs", A.root, { left, width: W, top: y - 3, height: 6, borderRadius: "3px", background: A.th.colors.axis, transformOrigin: "100% 50%" });
    Stage.tl.from(line, { scaleX: 0, duration: 0.9, ease: Stage.ease("power3"), immediateRender: true }, A.at("body"));
    const n = ev.length, step = W / n;
    ev.forEach((e, i) => {
      const cx = A.W - right - step * (i + 0.5);
      const tone = Stage.T.tone(e.tone);
      const dot = A.el("div", "abs", A.root, { left: cx - 18, top: y - 18, width: 36, height: 36, borderRadius: "50%", background: A.color(tone || "accent"), border: `6px solid ${A.th.colors.bg}` });
      const at = A.at("body") + 0.25 + i * 0.22;
      A.enter(dot, "badge", 0, 0, { at });
      const d = A.text(A.root, e.date, "value", "abs", { left: cx - step / 2, width: step, textAlign: "center", top: y - 120, color: A.color(tone || "accent"), fontSize: "60px" });
      const t = A.text(A.root, e.text, "body", "abs", { left: cx - step / 2 + 14, width: step - 28, textAlign: "center", top: y + 40, fontSize: "32px" });
      A.enter(d, "title", 0, 0, { at }); A.enter(t, "body", 0, 0, { at: at + 0.08, x: 0, y: 12 });
    });
  }
});
