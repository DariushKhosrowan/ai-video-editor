Stage.template({
  name: "quote",   // label, fields, example: see schema.json
  build(s, A) {
    const left = A.area.left, right = A.area.x;
    const preset = (Stage.fx && Stage.fx.cur && Stage.fx.cur.preset) || "classic";
    const lively = preset !== "classic";

    const isGlass = lively && preset === "glass-panel";
    const col = A.el("div", "col" + (isGlass ? " card acc-b" : ""), A.root, {
      left, right, top: A.area.y, bottom: A.scam ? 120 : 100, gap: "18px", alignItems: "flex-start",
      padding: isGlass ? "46px 56px" : (lively && preset === "accent-brace" ? "16px 38px 16px 0" : undefined),
      borderRight: (lively && preset === "accent-brace") ? `6px solid ${A.color("accent")}` : undefined,
      borderRadius: isGlass ? "24px" : undefined,
    });
    if (isGlass) A.enter(col, "card", 0, -0.05, { ease: "vox" });

    if (lively && preset === "editorial-mark") {
      const mark = A.el("div", "abs", A.root, {
        right: Math.max(20, right - 18), top: Math.max(20, A.area.y - 46),
        fontSize: "210px", fontWeight: 900, lineHeight: 0.8,
        color: A.color("accent"), opacity: 0.14, pointerEvents: "none",
      });
      mark.textContent = "«";
      Stage.tl.from(mark, { opacity: 0, y: 18, scale: 0.88, duration: A.dur("expressive"), ease: Stage.ease("vox"), immediateRender: true }, A.at("eyebrow"));
    }

    const r = A.el("div", "rule", col, { transformOrigin: "100% 50%" });
    Stage.tl.from(r, { scaleX: 0, duration: A.dur("base"), ease: Stage.ease("vox"), immediateRender: true }, A.at("eyebrow"));

    const textEl = A.text(col, s.text, "hero", "", { fontSize: (s.size || (Stage.plain(s.text).length > 60 ? 64 : 84)) + "px", maxWidth: "1250px" });
    A.field("text", textEl);
    const explicitTextMotion = s.textMotion || s.text_motion || null;
    if (explicitTextMotion) {
      A.kinetic(textEl, { at: A.at("title"), mode: explicitTextMotion, role: "title" });
    } else if (lively && preset === "kinetic-words") {
      A.kinetic(textEl, { at: A.at("title"), mode: "rise-mask", role: "title", stagger: 0.042, ease: "vox" });
    } else if (lively && (preset === "spotlight-serif" || preset === "bold-contrast")) {
      A.kinetic(textEl, { at: A.at("title"), mode: "editorial-blur", role: "title", stagger: 0.038, ease: "fluid" });
    } else {
      A.enter(textEl, "title", 0, 0, lively ? { ease: "vox" } : {});
    }

    if (s.highlight) {
      const hlEl = A.text(col, s.highlight, "hero", "", { color: A.color(s.highlight_color || "accent"), fontSize: (s.highlight_size || 120) + "px" });
      A.field("highlight", hlEl);
      A.enter(hlEl, "title", 0, 0.12, lively ? { ease: "vox" } : {});
    }
    if (s.caption) {
      const capEl = A.text(col, s.caption, "body", "", { color: A.th.colors.muted, maxWidth: "1150px", fontSize: "36px" });
      A.field("caption", capEl);
      A.enter(capEl, "body", 0, 0, lively ? { ease: "fluid" } : {});
    }
    if (s.author) {
      const authEl = A.text(col, "— " + s.author, "eyebrow");
      A.field("author", authEl);
      A.enter(authEl, "body", 1, 0, lively ? { ease: "vox" } : {});
    }
    A.fit(col, 0.5);
  },
});
