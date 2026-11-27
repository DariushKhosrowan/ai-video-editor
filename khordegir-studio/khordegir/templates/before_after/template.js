Stage.template({
  name: "before_after",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const col = A.th.colors || {};
    const isLight = col.isDark === false;
    const accent = A.color("accent");
    const padX = asp.isPortrait ? 52 : A.area.x;
    const leftEdge = asp.isPortrait ? 52 : A.area.left;

    const h = Stage.T.header(A, s, { fieldTitle: true, fieldEyebrow: true, left: leftEdge });
    const boxTop = h.bottom + 30;
    const boxBot = A.scam ? 110 : 88;
    const boxW = A.W - leftEdge - padX;
    const boxH = Math.max(360, A.H - boxTop - boxBot);

    const hasBothImages = !!(s.before_image && s.after_image);

    if (hasBothImages) {
      // Interactive-style deterministic curtain slider reveal over two images
      const stageBox = A.el("div", "abs", A.root, {
        left: leftEdge, top: boxTop, width: boxW, height: boxH,
        borderRadius: "20px", overflow: "hidden",
        border: `1.5px solid ${isLight ? "rgba(0,0,0,0.14)" : "rgba(255,255,255,0.14)"}`,
        boxShadow: "0 24px 60px rgba(0,0,0,0.42)",
      });
      const imgB = A.image(stageBox, s.before_image, 0, 0, boxW, boxH, { radius: 0, shadow: false, enter: false, motion: "none" });
      A.field("before_image", imgB);

      const afterWrap = A.el("div", "abs", stageBox, { inset: 0, overflow: "hidden", zIndex: 2 });
      const imgA = A.image(afterWrap, s.after_image, 0, 0, boxW, boxH, { radius: 0, shadow: false, enter: false, motion: "none" });
      A.field("after_image", imgA);

      const divider = A.el("div", "abs", stageBox, {
        top: 0, bottom: 0, left: "50%", width: "4px", marginLeft: "-2px",
        background: accent, zIndex: 5, boxShadow: "0 0 24px rgba(0,0,0,0.6)",
      });
      const knob = A.el("div", "abs", divider, {
        top: "50%", left: "50%", width: "56px", height: "56px",
        transform: "translate(-50%, -50%)", borderRadius: "50%",
        background: accent, color: "#111", fontWeight: 900, fontSize: "24px",
        display: "flex", alignItems: "center", justifyContent: "center",
      });
      knob.textContent = "⇆";

      const tagB = A.el("div", "abs", stageBox, {
        right: "24px", top: "24px", padding: "10px 22px", borderRadius: "8px",
        background: "rgba(12,14,18,0.82)", color: "#FFFFFF", fontWeight: 800, fontSize: "28px", zIndex: 6,
      });
      tagB.textContent = s.before_label || "قبل";
      A.field("before_label", tagB);

      const tagA = A.el("div", "abs", stageBox, {
        left: "24px", top: "24px", padding: "10px 22px", borderRadius: "8px",
        background: accent, color: "#111111", fontWeight: 900, fontSize: "28px", zIndex: 6,
      });
      tagA.textContent = s.after_label || "بعد";
      A.field("after_label", tagA);

      // Sweep slider deterministically from 12% -> 88% -> 50% on S.tl
      const proxy = { pct: 12 };
      const applySplit = () => {
        const p = Math.max(0, Math.min(100, proxy.pct));
        afterWrap.style.clipPath = `inset(0 ${(100 - p).toFixed(1)}% 0 0)`;
        divider.style.left = p.toFixed(1) + "%";
      };
      applySplit();
      A.enter(stageBox, "card", 0, 0, { ease: "vox" });
      Stage.tl.to(proxy, { pct: 86, duration: A.dur("dramatic"), ease: Stage.ease("cinematic"), onUpdate: applySplit }, A.at("card", 0) + 0.35);
      Stage.tl.to(proxy, { pct: 50, duration: A.dur("expressive"), ease: Stage.ease("vox"), onUpdate: applySplit }, A.at("card", 0) + 1.45);
      return;
    }

    // Editorial split card comparison when text-first (or single image)
    const grid = A.el("div", "abs", A.root, {
      left: leftEdge, right: padX, top: boxTop, bottom: boxBot,
      display: "grid",
      gridTemplateColumns: asp.isPortrait ? "1fr" : "1fr 1fr",
      gap: asp.isPortrait ? "24px" : "36px",
      alignItems: "stretch",
    });

    const mkSide = (label, text, isAfter, idx) => {
      const card = A.el("div", "card" + (isAfter ? " acc-b" : ""), grid, {
        position: "relative", padding: asp.isPortrait ? "34px" : "44px 48px",
        display: "flex", flexDirection: "column", justifyContent: "center", gap: "20px",
        borderColor: isAfter ? accent : (isLight ? "rgba(0,0,0,0.14)" : "rgba(255,255,255,0.14)"),
      });
      const lbl = A.el("div", "", card, {
        display: "inline-block", alignSelf: "flex-start",
        padding: "8px 20px", borderRadius: "8px",
        background: isAfter ? accent : (isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"),
        color: isAfter ? "#111111" : col.muted,
        fontWeight: 900, fontSize: "28px",
      });
      lbl.textContent = label;
      A.field(isAfter ? "after_label" : "before_label", lbl);

      const body = A.text(card, text || "", "h1", "", {
        fontSize: asp.isPortrait ? "36px" : "42px", lineHeight: 1.52,
        color: isAfter ? col.text : (col.muted || col.body),
      });
      A.field(isAfter ? "after_text" : "before_text", body);

      A.enter(card, "card", idx, isAfter ? 0.18 : 0, { x: isAfter ? -36 : 36, y: 0, ease: "vox" });
    };

    mkSide(s.before_label || "قبل", s.before_text || "", false, 0);
    mkSide(s.after_label || "بعد", s.after_text || "", true, 1);
  },
});
