Stage.template({
  name: "step_by_step",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const col = A.th.colors || {};
    const isLight = col.isDark === false;
    const accent = A.color("accent");
    const padX = asp.isPortrait ? 52 : A.area.x;
    const leftEdge = asp.isPortrait ? 52 : A.area.left;

    const h = Stage.T.header(A, s, { fieldTitle: true, fieldEyebrow: true, left: leftEdge });
    const raw = Array.isArray(s.steps) ? s.steps : Stage.T.list(s.steps);
    const steps = (raw.length ? raw : ["گام اول: شروع", "گام دوم: اجرا", "گام سوم: بررسی"]).slice(0, 5).map((item, i) => {
      if (typeof item === "object" && item) {
        return { num: item.n || i + 1, title: String(item.title || item.label || ""), detail: String(item.detail || item.text || "") };
      }
      const str = String(item);
      const idx = str.indexOf(":");
      return idx > 0
        ? { num: i + 1, title: str.slice(0, idx).trim(), detail: str.slice(idx + 1).trim() }
        : { num: i + 1, title: str.trim(), detail: "" };
    });

    const active = Number(s.active_step || 0);
    const isVertical = asp.isPortrait || asp.isSquare || steps.length > 4;
    const topY = h.bottom + 36;
    const botY = A.scam ? 110 : 88;

    const wrap = A.el("div", "abs", A.root, {
      left: leftEdge, right: padX, top: topY, bottom: botY,
      display: "grid",
      gridTemplateColumns: isVertical ? "1fr" : `repeat(${steps.length}, 1fr)`,
      gap: isVertical ? "20px" : "26px",
      alignContent: "center",
    });
    A.field("steps", wrap);

    // Connecting progress rail (top horizontal on 16:9, right vertical on 9:16/1:1)
    if (!isVertical) {
      const rail = A.el("div", "abs", A.root, {
        left: leftEdge + 40, right: padX + 40, top: topY + 26, height: "4px",
        background: isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.14)",
        borderRadius: "4px", overflow: "hidden",
      });
      const fill = A.el("div", "", rail, {
        width: "100%", height: "100%", background: accent, transformOrigin: "100% 50%",
      });
      Stage.tl.from(fill, { scaleX: 0, duration: A.dur("dramatic"), ease: Stage.ease("vox"), immediateRender: true }, A.at("card", 0));
    }

    const cards = [];
    steps.forEach((st, i) => {
      const isFocus = active > 0 && (i + 1) === active;
      const dimmed = active > 0 && (i + 1) !== active;
      const card = A.el("div", "card" + (isFocus ? " acc-b" : ""), wrap, {
        position: "relative",
        padding: isVertical ? "24px 30px" : "36px 28px",
        display: "flex",
        flexDirection: isVertical ? "row" : "column",
        alignItems: isVertical ? "center" : "flex-start",
        gap: isVertical ? "24px" : "16px",
        opacity: dimmed ? 0.55 : 1,
        borderColor: isFocus ? accent : undefined,
      });

      const badge = A.el("div", "tnum", card, {
        width: "56px", height: "56px", borderRadius: "12px", flex: "0 0 auto",
        background: isFocus ? accent : (isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.08)"),
        color: isFocus ? "#111111" : accent,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "30px", fontWeight: 900,
      });
      badge.textContent = Stage.fa(String(st.num));

      const txtCol = A.el("div", "", card, { display: "flex", flexDirection: "column", gap: "8px" });
      A.text(txtCol, st.title, "h1", "", { fontSize: isVertical ? "34px" : "36px", lineHeight: 1.3 });
      if (st.detail) {
        A.text(txtCol, st.detail, "body", "", { fontSize: isVertical ? "26px" : "28px", color: col.muted, lineHeight: 1.5 });
      }
      cards.push(card);
    });

    A.stagger(cards, "card", { from: "start", step: "list", extra: 0.06, over: { ease: "vox" } });
  },
});
