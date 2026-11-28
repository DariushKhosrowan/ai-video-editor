Stage.template({
  name: "image_gallery",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const col = A.th.colors || {};
    const padX = asp.isPortrait ? 44 : A.area.x;
    const leftEdge = asp.isPortrait ? 44 : A.area.left;
    const topY = asp.isPortrait ? 88 : A.area.y;

    const ey = A.text(A.root, s.eyebrow || "گالری تصاویر", "eyebrow", "abs", {
      right: padX, top: topY, color: A.color("accent"), fontSize: "26px",
    });
    A.field("eyebrow", ey);
    A.enter(ey, "eyebrow");

    const title = A.text(A.root, s.title || "مستندات تصویری", "h1", "abs", {
      right: padX, left: leftEdge, top: topY + 46,
      fontSize: asp.isPortrait ? "42px" : "48px",
    });
    A.field("title", title);
    A.enter(title, "title");

    const slots = [];
    for (let i = 1; i <= 4; i += 1) {
      const p = s[`photo${i}`];
      const c = s[`caption${i}`];
      if (p || c || i <= 2) {
        slots.push({ i, src: p || "", cap: c || `تصویر ${Stage.fa(String(i))}` });
      }
    }

    const boxTop = topY + (asp.isPortrait ? 180 : 144);
    const boxW = A.W - leftEdge - padX;
    const boxH = A.H - boxTop - (A.scam ? 105 : 74);
    const cols = asp.isPortrait ? (slots.length >= 4 ? 2 : 1) : (slots.length === 4 ? 2 : slots.length);
    const rows = Math.ceil(slots.length / cols);
    const gap = 22;
    const cellW = Math.floor((boxW - gap * (cols - 1)) / cols);
    const cellH = Math.floor((boxH - gap * (rows - 1)) / rows);

    const cards = [];
    slots.forEach((sl, idx) => {
      const r = Math.floor(idx / cols);
      const c = idx % cols;
      // Place RTL right-to-left across columns
      const x = leftEdge + (cols - 1 - c) * (cellW + gap);
      const y = boxTop + r * (cellH + gap);

      const card = A.el("div", "abs card", A.root, {
        left: x, top: y, width: cellW, height: cellH,
        overflow: "hidden", padding: "0", display: "flex", flexDirection: "column",
      });

      const imgH = Math.max(120, cellH - 76);
      const imgWrap = A.el("div", "", card, { position: "relative", width: "100%", height: imgH + "px", overflow: "hidden" });
      A.image(imgWrap, sl.src, 0, 0, cellW, imgH, { enter: false, radius: 0, shadow: false, motion: "gentle-drift", name: `photo${sl.i}` });
      A.field(`photo${sl.i}`, imgWrap);

      const capRow = A.el("div", "", card, {
        padding: "16px 22px", flex: "1", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
      });
      const capEl = A.text(capRow, sl.cap, "label", "", { fontSize: "25px", fontWeight: 700, color: col.text });
      A.field(`caption${sl.i}`, capEl);
      cards.push(card);
    });

    A.stepReveal(cards, { role: "card", at: A.at("image", 0, 0.25), minGap: 0.85, sfx: "shutter" });
  },
});
