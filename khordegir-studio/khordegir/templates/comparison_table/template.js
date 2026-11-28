Stage.template({
  name: "comparison_table",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const col = A.th.colors || {};
    const isLight = col.isDark === false;
    const accent = A.color("accent");
    const okColor = "#16A34A";
    const danger = A.color("danger");
    const padX = asp.isPortrait ? 44 : A.area.x;
    const leftEdge = asp.isPortrait ? 44 : A.area.left;

    const h = Stage.T.header(A, s, { fieldTitle: true, fieldEyebrow: true, left: leftEdge });

    const cols = Array.isArray(s.columns)
      ? s.columns.map(String)
      : String(s.columns || "معیار, گزینه الف, گزینه ب").split(/[,،|]/).map((x) => x.trim()).filter(Boolean);
    const rawRows = Array.isArray(s.rows) ? s.rows : Stage.T.list(s.rows);
    const rows = rawRows.map((r) => {
      if (Array.isArray(r)) return r.map(String);
      return String(r).split("|").map((x) => x.trim());
    });

    const hlCol = Number(s.highlight_col || 0) - 1;
    const colTemplate = cols.length <= 2
      ? "1.3fr 1fr"
      : `1.35fr ${cols.slice(1).map(() => "1fr").join(" ")}`;

    const tableWrap = A.el("div", "card", A.root, {
      left: leftEdge, right: padX,
      top: h.bottom + 28, bottom: A.scam ? 110 : 88,
      overflow: "hidden",
      display: "flex", flexDirection: "column",
      borderColor: isLight ? "rgba(0,0,0,0.14)" : "rgba(255,255,255,0.14)",
    });
    A.field("rows", tableWrap);

    // Header row
    const headRow = A.el("div", "", tableWrap, {
      display: "grid", gridTemplateColumns: colTemplate,
      background: isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.06)",
      borderBottom: `2px solid ${isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)"}`,
    });
    A.field("columns", headRow);

    cols.forEach((cName, ci) => {
      const isWinner = ci === hlCol;
      const cell = A.el("div", "", headRow, {
        padding: asp.isPortrait ? "22px 18px" : "24px 28px",
        fontSize: asp.isPortrait ? "26px" : "30px",
        fontWeight: 900,
        textAlign: ci === 0 ? "right" : "center",
        color: isWinner ? accent : col.text,
        background: isWinner ? `${accent}16` : "transparent",
        borderBottom: isWinner ? `3px solid ${accent}` : "none",
      });
      cell.textContent = Stage.fa(cName);
    });
    A.enter(headRow, "eyebrow", 0, 0.08);

    // Body rows
    const bodyWrap = A.el("div", "", tableWrap, {
      flex: "1 1 auto", display: "flex", flexDirection: "column", justifyContent: "space-evenly",
    });
    const rowEls = [];
    rows.forEach((cells, ri) => {
      const rEl = A.el("div", "", bodyWrap, {
        display: "grid", gridTemplateColumns: colTemplate,
        alignItems: "center",
        borderBottom: ri < rows.length - 1 ? `1px solid ${isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}` : "none",
        flex: "1 1 0",
      });
      for (let ci = 0; ci < cols.length; ci++) {
        const val = String(cells[ci] ?? "—");
        const isWinner = ci === hlCol;
        const isCheck = val === "✓" || val.toLowerCase() === "yes" || val === "بله";
        const isCross = val === "✕" || val === "✗" || val.toLowerCase() === "no" || val === "خیر";
        const cell = A.el("div", "tnum", rEl, {
          padding: asp.isPortrait ? "18px 14px" : "20px 28px",
          height: "100%", display: "flex", alignItems: "center",
          justifyContent: ci === 0 ? "flex-start" : "center",
          textAlign: ci === 0 ? "right" : "center",
          fontSize: asp.isPortrait ? "26px" : (isCheck || isCross ? "38px" : "30px"),
          fontWeight: ci === 0 || isWinner || isCheck ? 800 : 600,
          color: isCheck ? okColor : (isCross ? danger : (isWinner ? col.text : (ci === 0 ? col.text : col.muted))),
          background: isWinner ? `${accent}10` : "transparent",
        });
        cell.textContent = Stage.fa(val);
      }
      rowEls.push(rEl);
    });

    A.enter(tableWrap, "card", 0, -0.04, { ease: "vox" });
    A.stagger(rowEls, "body", { from: "start", step: "editorial", extra: 0.14, over: { ease: "fluid" } });
  },
});
