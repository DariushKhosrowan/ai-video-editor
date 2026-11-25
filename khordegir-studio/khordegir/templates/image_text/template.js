Stage.template({
  name: "image_text",   // label, fields, example: see schema.json
  build(s, A) {
    const L = A.L, M = L.margin;
    let img, col;
    if (s.shape === "landscape") {
      img = A.scam ? [A.area.left, A.area.y, A.W - M - A.area.left, 500] : [M, A.area.y, A.W - 2 * M, 560];
      col = { left: A.area.left, right: M, top: img[1] + img[3] + 40, bottom: A.scam ? 110 : 100 };
    } else if (A.scam) {
      img = [M, A.area.y + 16, 500, 600];               // above the camera
      col = { left: M + 500 + 70, right: M, top: A.area.y, bottom: 110 };
    } else {
      img = [M, A.area.y + 40, 780, 860];
      col = { left: M + 780 + 80, right: M, top: A.area.y, bottom: 100 };
    }
    A.image(A.root, s.image, img[0], img[1], img[2], img[3], { motion: s.motion, fit: s.fit, border: s.border });
    const c = A.el("div", "col", A.root, Object.assign({ gap: "18px" }, col));
    if (s.eyebrow) A.enter(A.text(c, s.eyebrow, "eyebrow", "", { fontSize: "36px" }), "eyebrow");
    if (s.title) A.enter(A.text(c, s.title, "hero", "", { fontSize: (s.title.length > 28 ? 60 : 76) + "px" }), "title");
    if (s.text) A.enter(A.text(c, s.text, "body", "", { fontSize: "38px" }), "body");
    Stage.T.list(s.points).forEach((p, i) => {
      const o = typeof p === "string" ? { text: p } : p;
      const tone = Stage.T.tone(o.tone);
      const card = A.el("div", "card" + (tone === "danger" ? " dng-b" : tone === "accent" ? " acc-b" : ""), c, { position: "relative", padding: "18px 26px" });
      A.text(card, o.text, "label", "", { fontSize: "34px" });
      A.enter(card, "card", i, 0.12);
    });
    A.fit(c, 0.5);
  }
});
