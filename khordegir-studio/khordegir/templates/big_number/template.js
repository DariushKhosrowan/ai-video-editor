Stage.template({
  name: "big_number",   // label, fields, example: see schema.json
  build(s, A) {
    const L = A.L, hasImg = !!s.image;
    const preset = (Stage.fx && Stage.fx.cur && Stage.fx.cur.preset) || "classic";
    const lively = preset !== "classic";
    let colBox;

    if (hasImg) {
      let imgFrame;
      if (A.scam) {
        imgFrame = A.image(A.root, s.image, 1300, 110, 540, 820, { motion: s.motion });
        colBox = { left: A.area.left, right: A.W - 1300 + 60 };
      } else {
        imgFrame = A.image(A.root, s.image, L.margin, 110, 760, 860, { motion: s.motion });
        colBox = { left: L.margin + 760 + 80, right: L.margin };
      }
      A.field("image", imgFrame);
    } else {
      colBox = { left: A.area.left, right: L.margin };
    }

    const centered = !hasImg;
    const col = A.el("div", "col", A.root, {
      left: colBox.left, right: colBox.right, top: A.area.y, bottom: A.scam ? 120 : 110,
      alignItems: centered ? "center" : "flex-start",
      textAlign: centered ? "center" : "start",
      gap: "6px",
    });

    if (s.eyebrow) {
      const ey = A.text(col, s.eyebrow, "eyebrow");
      A.field("eyebrow", ey);
      A.enter(ey, "eyebrow");
    }

    if (lively && preset === "halo-pulse") {
      const aura = A.el("div", "abs", A.root, {
        left: centered ? "50%" : (A.scam ? "38%" : "68%"), top: "42%",
        width: "560px", height: "340px", transform: "translate(-50%, -50%)",
        borderRadius: "999px", pointerEvents: "none",
        background: `radial-gradient(circle, ${A.color(s.color || "accent")}24 0%, transparent 70%)`,
      });
      Stage.tl.fromTo(aura, { opacity: 0, scale: 0.72 }, { opacity: 1, scale: 1, duration: 0.85, ease: Stage.ease("fluid"), immediateRender: true }, 0.1);
    }

    const n = A.el("div", "t-number", col, {
      color: A.color(s.color || "accent"),
      fontSize: (s.size || (hasImg ? 190 : 230)) + "px",
    });
    A.field("number", n);
    A.count(n, {
      to: s.number,
      from: s.from,
      prefix: s.prefix,
      suffix: s.suffix ?? s.unit,
      decimals: s.decimals,
      enterEase: preset === "slam-count" ? "vox" : preset === "halo-pulse" ? "fluid" : undefined,
      scale: preset === "slam-count" ? 0.86 : (lively ? 0.94 : undefined),
    });

    if (lively && preset === "bar-meter") {
      A.sweepLine(col, {
        width: hasImg ? 320 : 420,
        height: 8,
        origin: centered ? "50% 50%" : A.originStart,
        style: { marginTop: "8px", marginBottom: "8px", background: A.color(s.color || "accent") },
        at: A.at("number") + 0.25,
      });
    }

    const capText = s.caption ?? s.label;
    if (capText) {
      const capEl = A.text(col, capText, "h1", "", { maxWidth: "1100px" });
      A.field("caption", capEl);
      if (lively && preset === "kinetic-stat") {
        A.kinetic(capEl, { at: A.at("title") + 0.22, mode: "rise-mask", role: "title", stagger: 0.045, ease: "vox" });
      } else if (lively && preset === "dual-split") {
        A.kinetic(capEl, { at: A.at("title") + 0.22, mode: "glide", role: "title", stagger: 0.04, ease: "vox" });
      } else {
        A.enter(capEl, "title", 0, 0.25, lively ? { ease: "vox" } : {});
      }
    }

    const detText = s.detail ?? s.subtitle;
    if (detText) {
      const detEl = A.text(col, detText, "body", "", { color: A.th.colors.muted, maxWidth: "1000px" });
      A.field("detail", detEl);
      A.enter(detEl, "body", 1, 0.25, lively ? { ease: "fluid" } : {});
    }

    A.fit(col, 0.55);
  },
});
