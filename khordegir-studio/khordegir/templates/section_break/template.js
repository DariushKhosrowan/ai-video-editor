Stage.template({
  name: "section_break",   // label, fields, example: see schema.json
  build(s, A) {
    const left = A.area.left, right = A.area.x;
    const preset = (Stage.fx && Stage.fx.cur && Stage.fx.cur.preset) || "classic";
    const lively = preset !== "classic";

    const col = A.el("div", "col", A.root, {
      left, right, top: A.area.y, bottom: A.scam ? 380 : 100, gap: "16px",
      alignItems: A.scam ? "flex-start" : "center", textAlign: A.scam ? "right" : "center",
    });

    if (s.eyebrow) {
      const eyEl = A.text(col, s.eyebrow, "eyebrow");
      A.field("eyebrow", eyEl);
      A.enter(eyEl, "eyebrow");
    }

    const tEl = A.text(col, s.title, "hero", "", { fontSize: "88px" });
    A.field("title", tEl);
    if (lively && preset === "split-headline") {
      A.kinetic(tEl, { at: A.at("title"), role: "title", stagger: 0.05 });
    } else {
      A.enter(tEl, "title");
    }

    const r = A.el("div", "rule", col, { width: "160px", transformOrigin: A.scam ? "100% 50%" : "50% 50%" });
    Stage.tl.from(r, { scaleX: 0, duration: 0.55, ease: Stage.ease("power4"), immediateRender: true }, A.at("body"));

    if (s.subtitle) {
      const subEl = A.text(col, s.subtitle, "body", "", { color: A.th.colors.muted });
      A.field("subtitle", subEl);
      A.enter(subEl, "body", 1);
    }
    A.fit(col, 0.5);
  },
});
