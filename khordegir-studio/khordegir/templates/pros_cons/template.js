Stage.template({
  name: "pros_cons",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const col = A.th.colors || {};
    const isLight = col.isDark === false;
    const padX = asp.isPortrait ? 44 : A.area.x;
    const leftEdge = asp.isPortrait ? 44 : A.area.left;
    const topY = asp.isPortrait ? 86 : A.area.y;

    const ey = A.text(A.root, s.eyebrow || "مقایسه دوطرفه", "eyebrow", "abs", {
      right: padX, top: topY, color: A.color("accent"), fontSize: "26px",
    });
    A.field("eyebrow", ey);
    A.enter(ey, "eyebrow");

    const title = A.text(A.root, s.title || "مزایا و معایب", "h1", "abs", {
      right: padX, left: leftEdge, top: topY + 46,
      fontSize: asp.isPortrait ? "42px" : "48px",
    });
    A.field("title", title);
    A.enter(title, "title");

    const pros = (Array.isArray(s.pros) ? s.pros : String(s.pros || "").split("\n").filter(Boolean)).slice(0, 5);
    const cons = (Array.isArray(s.cons) ? s.cons : String(s.cons || "").split("\n").filter(Boolean)).slice(0, 5);
    const pList = pros.length ? pros : ["مزیت اول", "مزیت دوم", "مزیت سوم"];
    const cList = cons.length ? cons : ["محدودیت اول", "محدودیت دوم", "محدودیت سوم"];

    const colsWrap = A.el("div", "abs", A.root, {
      left: leftEdge, right: padX,
      top: topY + (asp.isPortrait ? 176 : 144),
      bottom: A.scam ? 110 : (s.verdict ? 142 : 76),
      display: "grid",
      gridTemplateColumns: asp.isPortrait ? "1fr" : "1fr 1fr",
      gap: "24px",
    });

    const mkCol = (titleTxt, titleKey, listKey, items, accentClr, symbol) => {
      const box = A.el("div", "card", colsWrap, {
        padding: "26px 28px", borderTop: `7px solid ${accentClr}`,
        display: "flex", flexDirection: "column", gap: "16px",
      });
      A.enter(box, "card", 0, 0.12);
      const h = A.text(box, titleTxt, "h2", "", { fontSize: "30px", fontWeight: 900, color: accentClr });
      A.field(titleKey, h);
      const ul = A.el("div", "", box, { display: "flex", flexDirection: "column", gap: "14px" });
      A.field(listKey, ul);
      const rows = items.map((txt) => {
        const row = A.el("div", "", ul, {
          display: "flex", alignItems: "flex-start", gap: "14px",
          padding: "14px 18px", borderRadius: "12px",
          background: isLight ? "rgba(0,0,0,0.035)" : "rgba(255,255,255,0.045)",
        });
        const ic = A.el("span", "", row, {
          width: "34px", height: "34px", borderRadius: "50%", background: accentClr, color: "#FFFFFF",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontWeight: 900, fontSize: "20px", flexShrink: "0", marginTop: "2px",
        });
        ic.textContent = symbol;
        A.text(row, String(txt), "body", "", { fontSize: asp.isPortrait ? "25px" : "27px", lineHeight: 1.5, color: col.text });
        return row;
      });
      return rows;
    };

    const pRows = mkCol(s.pros_title || "مزایا و نقاط قوت", "pros_title", "pros", pList, A.color("good"), "✓");
    const cRows = mkCol(s.cons_title || "معایب و چالش‌ها", "cons_title", "cons", cList, A.color("danger"), "✕");

    // Reveal all pros one by one, then all cons one by one (ideal for clear narration!)
    const seq = [...pRows, ...cRows];
    const endAt = A.stepReveal(seq, { role: "body", at: A.at("body", 0, 0.3), minGap: 0.78, sfx: "tick" });

    if (s.verdict) {
      const vb = A.el("div", "abs", A.root, {
        left: leftEdge, right: padX, bottom: A.scam ? 42 : 48,
        padding: "16px 26px", borderRadius: "14px",
        background: isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.07)",
        borderRight: `6px solid ${A.color("accent")}`,
      });
      const vt = A.text(vb, s.verdict, "body", "", { fontSize: "26px", fontWeight: 800, color: col.text });
      A.field("verdict", vt);
      A.enter(vb, "note", 0, 0, { at: endAt + 0.28 });
    }
  },
});
