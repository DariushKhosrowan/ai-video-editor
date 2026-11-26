(function () {
/* portrait (and square with many events): a vertical line on the reading side, events top to bottom */
function buildVertical(s, A, h, ev) {
  const tlTok = Stage.MOTION.chart.timeline;
  const en = Stage._lang === "en";
  const top = h.bottom + 40, bottom = A.gapB(100, s.note ? 60 : 0);
  const Hh = A.H - top - bottom, n = Math.max(1, ev.length), step = Hh / n;
  const lineX = en ? A.area.x + 18 : A.W - A.area.x - 18;
  const line = A.el("div", "abs", A.root, { left: lineX - 3, top, width: 6, height: Hh, borderRadius: "3px", background: A.th.colors.axis, transformOrigin: "50% 0%" });
  A.field("events", line);
  Stage.tl.from(line, { scaleY: 0, duration: tlTok.lineDur, ease: Stage.ease(tlTok.ease), immediateRender: true }, A.at("body"));
  const textL = en ? lineX + 44 : A.area.left, textW = A.W - A.area.x - A.area.left - 62;
  ev.forEach((e, i) => {
    const cy = top + step * (i + 0.5);
    const tone = Stage.T.tone(e.tone);
    const dot = A.el("div", "abs", A.root, { left: lineX - 18, top: cy - 18, width: 36, height: 36, borderRadius: "50%", background: A.color(tone || "accent"), border: `6px solid ${A.th.colors.bg}` });
    const at = A.at("body") + tlTok.stepDelay + i * tlTok.stepStagger;
    A.enter(dot, "badge", 0, 0, { at });
    const col = A.el("div", "col", A.root, { left: textL, width: textW, top: cy - step / 2 + 6, height: step - 12, gap: "4px", justifyContent: "center" });
    const d = A.text(col, e.date, "value", "", { color: A.color(tone || "accent"), fontSize: "60px" });
    const t = A.text(col, e.text, "body", "", { fontSize: "32px" });
    A.enter(d, "title", 0, 0, { at }); A.enter(t, "body", 0, 0, { at: at + tlTok.textDelay, x: 0, y: Stage.MOTION.text.note.y });
    A.fit(col, 0.5);
  });
}
Stage.template({
  name: "timeline",   // label, fields, example: see schema.json
  build(s, A) {
    const h = Stage.T.header(A, s, { fieldTitle: true });
    const ev = Array.isArray(s.events) ? s.events : Stage.T.pairs(s.events).map((p) => ({ date: p[0], text: p[1] }));
    const vertical = s.vertical ?? (A.portrait || (A.square && ev.length > 4));
    if (vertical) return buildVertical(s, A, h, ev);
    const left = A.area.left + 40, right = A.area.x + 40, W = A.W - left - right;
    const y = Math.max(h.bottom + 160, A.H * (A.scam ? 0.38 : 0.5));
    const line = A.el("div", "abs", A.root, { left, width: W, top: y - 3, height: 6, borderRadius: "3px", background: A.th.colors.axis, transformOrigin: "100% 50%" });
    A.field("events", line);
    const tlTok = Stage.MOTION.chart.timeline;
    Stage.tl.from(line, { scaleX: 0, duration: tlTok.lineDur, ease: Stage.ease(tlTok.ease), immediateRender: true }, A.at("body"));
    const n = ev.length, step = W / n;
    ev.forEach((e, i) => {
      const cx = A.W - right - step * (i + 0.5);
      const tone = Stage.T.tone(e.tone);
      const dot = A.el("div", "abs", A.root, { left: cx - 18, top: y - 18, width: 36, height: 36, borderRadius: "50%", background: A.color(tone || "accent"), border: `6px solid ${A.th.colors.bg}` });
      const at = A.at("body") + tlTok.stepDelay + i * tlTok.stepStagger;
      A.enter(dot, "badge", 0, 0, { at });
      const d = A.text(A.root, e.date, "value", "abs", { left: cx - step / 2, width: step, textAlign: "center", top: y - 120, color: A.color(tone || "accent"), fontSize: "60px" });
      const t = A.text(A.root, e.text, "body", "abs", { left: cx - step / 2 + 14, width: step - 28, textAlign: "center", top: y + 40, fontSize: "32px" });
      A.enter(d, "title", 0, 0, { at }); A.enter(t, "body", 0, 0, { at: at + tlTok.textDelay, x: 0, y: Stage.MOTION.text.note.y });
    });
  }
});
})();
