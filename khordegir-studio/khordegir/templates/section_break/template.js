Stage.template({
  name: "section_break",   // label, fields, example: see schema.json
  build(s, A) {
    const left = A.area.left, right = A.area.x;
    const preset = (Stage.fx && Stage.fx.cur && Stage.fx.cur.preset) || "classic";
    const lively = preset !== "classic";

    if (lively && preset === "numeral-watermark") {
      const match = String(s.eyebrow || s.title || "").match(/[\d۰-۹]+/);
      const wm = A.el("div", "abs", A.root, {
        left: A.scam ? left : "50%", top: A.scam ? "34%" : "48%",
        transform: A.scam ? "translateY(-50%)" : "translate(-50%, -50%)",
        fontSize: "340px", fontWeight: 900, lineHeight: 1,
        color: A.color("accent"), opacity: 0.055, pointerEvents: "none",
      });
      wm.textContent = match ? match[0] : "✦";
      Stage.tl.from(wm, { opacity: 0, scale: 0.88, duration: 0.9, ease: Stage.ease("fluid"), immediateRender: true }, 0.06);
    }

    const col = A.el("div", "col", A.root, {
      left, right, top: A.area.y, bottom: A.scam ? 380 : 100, gap: "16px",
      alignItems: A.scam ? "flex-start" : "center", textAlign: A.scam ? "start" : "center",
    });

    if (s.eyebrow) {
      const eyClass = (lively && preset === "chapter-banner") ? "badge acc" : "";
      const eyEl = A.text(col, s.eyebrow, "eyebrow", eyClass);
      A.field("eyebrow", eyEl);
      A.enter(eyEl, "eyebrow", 0, 0, lively ? { ease: "vox" } : {});
    }

    const tEl = A.text(col, s.title, "hero", "", { fontSize: "88px" });
    A.field("title", tEl);
    if (lively && preset === "split-headline") {
      A.kinetic(tEl, { at: A.at("title"), mode: "cascade-3d", role: "title", stagger: 0.048, ease: "vox" });
    } else if (lively && (preset === "curtain-drop" || preset === "chapter-banner")) {
      A.kinetic(tEl, { at: A.at("title"), mode: "rise-mask", role: "title", stagger: 0.048, ease: "vox" });
    } else if (lively && preset === "axis-sweep") {
      A.kinetic(tEl, { at: A.at("title"), mode: "glide", role: "title", stagger: 0.042, ease: "vox" });
    } else if (lively && preset === "minimal-divider") {
      A.kinetic(tEl, { at: A.at("title"), mode: "editorial-blur", role: "title", stagger: 0.036, ease: "fluid" });
    } else {
      A.enter(tEl, "title", 0, 0, lively ? { ease: "vox" } : {});
    }

    const ruleW = lively ? (preset === "axis-sweep" ? "360px" : preset === "curtain-drop" ? "240px" : "180px") : "160px";
    const r = A.el("div", "rule", col, { width: ruleW, transformOrigin: A.scam ? A.originStart : "50% 50%" });
    Stage.tl.from(r, { scaleX: 0, duration: 0.62, ease: Stage.ease("vox"), immediateRender: true }, A.at("body"));

    if (s.subtitle) {
      const subEl = A.text(col, s.subtitle, "body", "", { color: A.th.colors.muted });
      A.field("subtitle", subEl);
      A.enter(subEl, "body", 1, 0, lively ? { ease: "fluid" } : {});
    }
    A.fit(col, 0.5);
  },
});
