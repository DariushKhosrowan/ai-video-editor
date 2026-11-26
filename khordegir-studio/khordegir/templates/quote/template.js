Stage.template({
  name: "quote",   // label, fields, example: see schema.json
  build(s, A) {
    const left = A.area.left, right = A.area.x;
    const preset = (Stage.fx && Stage.fx.cur && Stage.fx.cur.preset) || "classic";
    const lively = preset !== "classic";

    const col = A.el("div", "col", A.root, { left, right, top: A.area.y, bottom: A.gapB(A.scam ? 120 : 100, s.note ? 60 : 0), gap: "18px", alignItems: "flex-start" });
    const r = A.el("div", "rule", col, { transformOrigin: "100% 50%" });
    const sl = Stage.MOTION.ui.sweepLine;
    Stage.tl.from(r, { scaleX: 0, duration: sl.dur, ease: Stage.ease(sl.ease), immediateRender: true }, A.at("eyebrow"));

    const textEl = A.text(col, s.text, "hero", "", { fontSize: (s.size || (Stage.plain(s.text).length > 60 ? 64 : 84)) + "px", maxWidth: "1250px" });
    A.field("text", textEl);
    if (lively && preset === "kinetic-words") {
      A.kinetic(textEl, { at: A.at("title"), role: "title" });
    } else {
      A.enter(textEl, "title");
    }

    if (s.highlight) {
      const hlEl = A.text(col, s.highlight, "hero", "", { color: A.color(s.highlight_color || "accent"), fontSize: (s.highlight_size || 120) + "px" });
      A.field("highlight", hlEl);
      A.enter(hlEl, "title", 0, Stage.MOTION.ui.quoteHighlightExtra);
    }
    if (s.caption) {
      const capEl = A.text(col, s.caption, "body", "", { color: A.th.colors.muted, maxWidth: "1150px", fontSize: "36px" });
      A.field("caption", capEl);
      A.enter(capEl, "body");
    }
    if (s.author) {
      const authEl = A.text(col, "— " + s.author, "eyebrow");
      A.field("author", authEl);
      A.enter(authEl, "body", 1);
    }
    A.fit(col, 0.5);
  },
});
