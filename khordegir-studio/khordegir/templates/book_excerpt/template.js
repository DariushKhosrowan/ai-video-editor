Stage.template({
  name: "book_excerpt",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const col = A.th.colors || {};
    const isLight = col.isDark === false;
    const padX = asp.isPortrait ? 44 : A.area.x;
    const leftEdge = asp.isPortrait ? 44 : A.area.left;
    const topY = asp.isPortrait ? 92 : A.area.y + 8;

    const page = A.el("div", "abs", A.root, {
      left: leftEdge, right: padX, top: topY, bottom: A.scam ? 96 : 74,
      borderRadius: "20px",
      background: isLight ? "#FFFDF7" : "#1A1916",
      border: `2px solid ${isLight ? "#DFD6C3" : "#35312A"}`,
      boxShadow: "0 28px 72px rgba(0,0,0,0.38)",
      padding: asp.isPortrait ? "38px 32px" : "46px 60px",
      display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "22px",
    });
    A.enter(page, "card", 0, 0.05);

    // Book running header
    const head = A.el("div", "", page, {
      display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px",
      borderBottom: `2px solid ${isLight ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.10)"}`,
      paddingBottom: "16px",
    });
    const bt = A.text(head, s.book_title || "عنوان کتاب", "eyebrow", "", { fontSize: "26px", color: A.color("accent") });
    A.field("book_title", bt);
    const ch = A.text(head, s.chapter || "فصل ۱", "caption", "", { fontSize: "23px", color: col.muted });
    A.field("chapter", ch);

    // Body excerpt
    const ex = A.text(page, s.excerpt || "", "body", "", {
      fontSize: asp.isPortrait ? "32px" : "35px", lineHeight: 1.75, color: isLight ? "#222" : "#EAE4D8",
    });
    A.field("excerpt", ex);

    // Highlighted key sentence
    let keyWrap = null;
    let keySpan = null;
    if (s.key_line) {
      keyWrap = A.el("div", "", page, {
        padding: "20px 26px", borderRadius: "12px",
        background: isLight ? "rgba(224,168,0,0.13)" : "rgba(255,214,0,0.10)",
        borderRight: `6px solid ${A.color("accent")}`,
      });
      keySpan = A.text(keyWrap, s.key_line, "h2", "", {
        fontSize: asp.isPortrait ? "32px" : "36px", lineHeight: 1.6, fontWeight: 800, color: isLight ? "#141414" : "#FFFDF5",
      });
      A.field("key_line", keySpan);
    }

    // Footer: author + commentary
    const foot = A.el("div", "", page, {
      display: "flex", flexDirection: "column", gap: "10px",
      borderTop: `1px solid ${isLight ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.10)"}`,
      paddingTop: "16px",
    });
    if (s.author) {
      const au = A.text(foot, "— " + s.author, "label", "", { fontSize: "26px", color: col.muted, fontWeight: 700 });
      A.field("author", au);
    }
    let comEl = null;
    if (s.commentary) {
      comEl = A.text(foot, s.commentary, "body", "", { fontSize: "26px", color: A.color("good"), fontWeight: 700, lineHeight: 1.5 });
      A.field("commentary", comEl);
    }

    const seq = [head, ex];
    if (keyWrap) seq.push(keyWrap);
    if (comEl) seq.push(comEl);
    A.stepReveal(seq, {
      role: "body",
      at: A.at("body", 0, 0.25),
      minGap: 0.95,
      sfx: "paper-rustle",
      onStep(el, _i, stepAt) {
        if (el === keyWrap && keySpan) {
          A.sweepUnderline(keySpan, { at: stepAt + 0.25, dur: 0.7 });
        }
      },
    });
  },
});
