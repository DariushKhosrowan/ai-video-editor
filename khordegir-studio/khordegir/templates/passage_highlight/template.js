Stage.template({
  name: "passage_highlight",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const col = A.th.colors || {};
    const isLight = col.isDark === false;
    const padX = asp.isPortrait ? 48 : A.area.x;
    const leftEdge = asp.isPortrait ? 48 : A.area.left;
    const topY = asp.isPortrait ? 96 : A.area.y + 8;

    const ey = A.text(A.root, s.eyebrow || "تحلیل متن", "eyebrow", "abs", {
      right: padX, top: topY, color: A.color("accent"), fontSize: "26px",
    });
    A.field("eyebrow", ey);
    A.enter(ey, "eyebrow");

    const title = A.text(A.root, s.title || "بررسی متن کلیدی", "h1", "abs", {
      right: padX, left: leftEdge, top: topY + 46,
      fontSize: asp.isPortrait ? "42px" : "48px",
    });
    A.field("title", title);
    A.enter(title, "title");

    const raw = Array.isArray(s.sentences) ? s.sentences : String(s.sentences || s.passage || "").split("\n").filter(Boolean);
    const lines = (raw.length ? raw : [
      "جمله اول زمینه بحث را به‌آرامی معرفی می‌کند.",
      "!این جمله کلیدی به‌صورت گام‌به‌گام با ماژیک هایلایت برجسته می‌شود.",
      "جمله پایانی جمع‌بندی و نتیجه نهایی را تثبیت می‌کند.",
    ]).slice(0, 6);

    const grid = A.el("div", "abs", A.root, {
      left: leftEdge, right: padX,
      top: topY + (asp.isPortrait ? 185 : 152),
      bottom: A.scam ? 105 : 88,
      display: "flex",
      flexDirection: asp.isPortrait || A.scam ? "column" : "row",
      gap: "28px",
      alignItems: "stretch",
    });

    const paper = A.el("div", "card", grid, {
      flex: "1.65", padding: asp.isPortrait ? "34px 30px" : "44px 48px",
      borderRight: `8px solid ${A.color("accent")}`,
      display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "20px",
    });
    A.enter(paper, "card", 0, 0.12);

    const bodyWrap = A.el("div", "", paper, { display: "flex", flexDirection: "column", gap: "22px" });
    A.field("sentences", bodyWrap);

    const lineEls = [];
    const hlSpans = [];
    lines.forEach((rawLine) => {
      const str = String(rawLine || "").trim();
      const isKey = str.startsWith("!");
      const clean = isKey ? str.slice(1).trim() : str;
      const p = A.el("p", "t-body", bodyWrap, {
        margin: "0", fontSize: asp.isPortrait ? "32px" : "35px", lineHeight: 1.72, color: col.text,
      });
      if (isKey) {
        const sp = A.el("span", "hl", p, {
          padding: "2px 8px", borderRadius: "6px",
          backgroundImage: `linear-gradient(${A.color("accent")}55, ${A.color("accent")}55)`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "100% 85%",
          backgroundSize: "0% 46%",
        });
        sp.innerHTML = Stage.rich(clean);
        hlSpans.push({ idx: lineEls.length, el: sp });
      } else {
        p.innerHTML = Stage.rich(clean);
      }
      lineEls.push(p);
    });

    if (s.citation) {
      const cit = A.text(paper, s.citation, "caption", "", {
        fontSize: "23px", color: col.muted, borderTop: `1px solid ${isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)"}`,
        paddingTop: "14px",
      });
      A.field("citation", cit);
    }

    const endAt = A.stepReveal(lineEls, {
      role: "body",
      at: A.at("body", 0, 0.3),
      minGap: 0.92,
      sfx: "tick",
      onStep(_el, idx, stepAt) {
        const match = hlSpans.find((h) => h.idx === idx);
        if (match) {
          A.sweepHighlight(match.el, { at: stepAt + 0.25, dur: 0.65 });
        }
      },
    });

    if (s.takeaway) {
      const noteCard = A.el("div", "card", grid, {
        flex: "0.85", padding: "30px 28px",
        background: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.05)",
        borderTop: `6px solid ${A.color("good")}`,
        display: "flex", flexDirection: "column", justifyContent: "center", gap: "14px",
      });
      A.text(noteCard, "یادداشت تحلیلی", "caption", "", { color: A.color("good"), fontWeight: 800, fontSize: "24px" });
      const tw = A.text(noteCard, s.takeaway, "body", "", { fontSize: asp.isPortrait ? "28px" : "30px", lineHeight: 1.65, color: col.text });
      A.field("takeaway", tw);
      A.enter(noteCard, "card", 0, 0, { at: endAt + 0.28 });
    }
  },
});
