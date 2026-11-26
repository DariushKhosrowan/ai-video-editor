Stage.template({
  name: "image_text",   // label, fields, example: see schema.json
  build(s, A) {
    const L = A.L, M = L.margin;
    const preset = (Stage.fx && Stage.fx.cur && Stage.fx.cur.preset) || "classic";
    const lively = preset !== "classic";

    let img, col;
    if (s.shape === "landscape" || (lively && preset === "cinema-wide" && !s.shape)) {
      img = A.scam ? [A.area.left, A.area.y, A.W - M - A.area.left, 500] : [M, A.area.y, A.W - 2 * M, 560];
      col = { left: A.area.left, right: M, top: img[1] + img[3] + 40, bottom: A.scam ? 110 : 100 };
    } else if (A.scam) {
      img = [M, A.area.y + 16, 500, 600];               // above the camera
      col = { left: M + 500 + 70, right: M, top: A.area.y, bottom: 110 };
    } else {
      img = [M, A.area.y + 40, 780, 860];
      col = { left: M + 780 + 80, right: M, top: A.area.y, bottom: 100 };
    }

    const frame = A.image(A.root, s.image, img[0], img[1], img[2], img[3], {
      motion: s.motion,
      fit: s.fit,
      border: s.border || (lively && preset === "editorial-split" ? "accent" : undefined),
    });
    A.field("image", frame);
    if (lively && preset === "card-float") {
      const dr = Stage.MOTION.atmosphere.drift;
      A.drift(frame, { x: dr.cardX, y: dr.cardY, dur: dr.dur });
    }

    const c = A.el("div", "col", A.root, Object.assign({ gap: "18px" }, col));
    if (s.eyebrow) {
      const eyEl = A.text(c, s.eyebrow, "eyebrow", "", { fontSize: "36px" });
      A.field("eyebrow", eyEl);
      A.enter(eyEl, "eyebrow");
    }
    if (s.title) {
      const tEl = A.text(c, s.title, "hero", "", { fontSize: (String(s.title).length > 28 ? 60 : 76) + "px" });
      A.field("title", tEl);
      if (lively && (preset === "editorial-split" || preset === "frame-mask")) {
        A.kinetic(tEl, { at: A.at("title"), role: "title" });
      } else {
        A.enter(tEl, "title");
      }
    }
    if (lively && preset === "accent-bar") {
      A.sweepLine(c, { width: 150, height: 6, origin: "100% 50%", at: A.at("body") });
    }
    const bodyText = s.text ?? s.body;
    if (bodyText) {
      const txtEl = A.text(c, bodyText, "body", "", { fontSize: "38px" });
      A.field("text", txtEl);
      A.enter(txtEl, "body");
    }

    const pts = Stage.T.list(s.points);
    if (pts.length) {
      const ptsWrap = A.el("div", "", c, { display: "flex", flexDirection: "column", gap: "12px" });
      A.field("points", ptsWrap);
      pts.forEach((p, i) => {
        const o = typeof p === "string" ? { text: p } : p;
        const tone = Stage.T.tone(o.tone);
        const card = A.el("div", "card" + (tone === "danger" ? " dng-b" : tone === "accent" ? " acc-b" : ""), ptsWrap, { position: "relative", padding: "18px 26px" });
        A.text(card, o.text, "label", "", { fontSize: "34px" });
        A.enter(card, "card", i, Stage.MOTION.ui.imageTextPointExtra);
      });
    }
    A.fit(c, 0.5);
  },
});
