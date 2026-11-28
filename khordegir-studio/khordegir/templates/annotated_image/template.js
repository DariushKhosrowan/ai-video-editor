Stage.template({
  name: "annotated_image",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const col = A.th.colors || {};
    const padX = asp.isPortrait ? 44 : A.area.x;
    const leftEdge = asp.isPortrait ? 44 : A.area.left;
    const topY = asp.isPortrait ? 88 : A.area.y;

    const ey = A.text(A.root, s.eyebrow || "کالبدشکافی تصویر", "eyebrow", "abs", {
      right: padX, top: topY, color: A.color("accent"), fontSize: "26px",
    });
    A.field("eyebrow", ey);
    A.enter(ey, "eyebrow");

    const title = A.text(A.root, s.title || "نقاط کلیدی تصویر", "h1", "abs", {
      right: padX, left: leftEdge, top: topY + 46,
      fontSize: asp.isPortrait ? "42px" : "48px",
    });
    A.field("title", title);
    A.enter(title, "title");

    const raw = Array.isArray(s.callouts) ? s.callouts : String(s.callouts || "").split("\n").filter(Boolean);
    const callouts = (raw.length ? raw : [
      "32 ; 34 ; نقطه اول ; توضیح جزء اول تصویر",
      "66 ; 54 ; نقطه دوم ; توضیح جزء دوم تصویر",
      "48 ; 74 ; نقطه سوم ; توضیح جزء سوم تصویر",
    ]).slice(0, 4).map((line, i) => {
      if (line && typeof line === "object") {
        return { x: Number(line.x) || 50, y: Number(line.y) || 50, title: line.title || `نقطه ${i + 1}`, note: line.note || "" };
      }
      const p = String(line).split(";");
      return {
        x: Math.max(8, Math.min(92, Number(p[0]) || (28 + i * 20))),
        y: Math.max(10, Math.min(90, Number(p[1]) || (30 + i * 20))),
        title: (p[2] || `نقطه ${i + 1}`).trim(),
        note: (p[3] || "").trim(),
      };
    });

    const boxTop = topY + (asp.isPortrait ? 175 : 144);
    const boxW = A.W - leftEdge - padX;
    const boxH = A.H - boxTop - (A.scam ? 100 : 72);
    const stacked = asp.isPortrait || A.scam;
    const imgW = stacked ? boxW : Math.round(boxW * 0.60);
    const imgH = stacked ? Math.round(boxH * 0.54) : boxH;
    const imgX = leftEdge;
    const imgY = boxTop;

    const frame = A.image(A.root, s.image || "", imgX, imgY, imgW, imgH, { motion: "breathe", name: "image" });
    A.field("image", frame);

    // Pin overlay on image
    const pinOverlay = A.el("div", "abs", A.root, {
      left: imgX, top: imgY, width: imgW, height: imgH, pointerEvents: "none", zIndex: 12,
    });

    // Side/bottom explanation cards
    const listX = stacked ? leftEdge : imgX + imgW + 26;
    const listY = stacked ? imgY + imgH + 22 : boxTop;
    const listW = stacked ? boxW : (boxW - imgW - 26);
    const listH = stacked ? (boxH - imgH - 22) : boxH;
    const listWrap = A.el("div", "abs", A.root, {
      left: listX, top: listY, width: listW, height: listH,
      display: "flex", flexDirection: "column", justifyContent: "center", gap: "16px",
    });
    A.field("callouts", listWrap);

    const series = col.series || [A.color("accent"), "#38BDF8", "#34D399", "#FB7185"];
    const pins = [];
    const cards = [];

    callouts.forEach((co, i) => {
      const clr = series[i % series.length] || A.color("accent");
      const pin = A.el("div", "abs", pinOverlay, {
        left: `${co.x}%`, top: `${co.y}%`, transform: "translate(-50%, -50%)",
        width: "52px", height: "52px", borderRadius: "50%",
        background: clr, color: "#111", fontWeight: 900, fontSize: "26px",
        display: "flex", alignItems: "center", justifyContent: "center",
        border: "4px solid #FFFFFF", boxShadow: "0 10px 26px rgba(0,0,0,0.55)",
      });
      pin.textContent = Stage.fa(String(i + 1));
      pins.push(pin);

      const card = A.el("div", "card", listWrap, {
        padding: "18px 22px", borderRight: `6px solid ${clr}`,
        display: "flex", alignItems: "flex-start", gap: "14px",
      });
      const badge = A.el("span", "", card, {
        width: "36px", height: "36px", borderRadius: "50%", background: clr, color: "#111",
        display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "21px", flexShrink: "0",
      });
      badge.textContent = Stage.fa(String(i + 1));
      const tx = A.el("div", "", card, { display: "flex", flexDirection: "column", gap: "4px" });
      A.text(tx, co.title, "h2", "", { fontSize: "26px", fontWeight: 800, color: col.text });
      if (co.note) A.text(tx, co.note, "body", "", { fontSize: "22px", color: col.muted, lineHeight: 1.45 });
      cards.push(card);
    });

    A.stepReveal(cards, {
      role: "card",
      at: A.at("card", 0, 0.32),
      minGap: 0.85,
      sfx: "pop",
      onStep(_el, idx, stepAt) {
        if (pins[idx]) {
          A.enter(pins[idx], "badge", idx, 0, { at: Math.max(0.1, stepAt - 0.14) });
        }
      },
    });
  },
});
