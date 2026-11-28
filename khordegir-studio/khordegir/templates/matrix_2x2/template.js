Stage.template({
  name: "matrix_2x2",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const col = A.th.colors || {};
    const padX = asp.isPortrait ? 44 : A.area.x;
    const leftEdge = asp.isPortrait ? 44 : A.area.left;
    const topY = asp.isPortrait ? 86 : A.area.y;

    const ey = A.text(A.root, s.eyebrow || "ماتریس تحلیلی", "eyebrow", "abs", {
      right: padX, top: topY, color: A.color("accent"), fontSize: "26px",
    });
    A.field("eyebrow", ey);
    A.enter(ey, "eyebrow");

    const title = A.text(A.root, s.title || "ماتریس ۲×۲", "h1", "abs", {
      right: padX, left: leftEdge, top: topY + 46,
      fontSize: asp.isPortrait ? "42px" : "48px",
    });
    A.field("title", title);
    A.enter(title, "title");

    const parseQ = (raw, fallback) => {
      const p = String(raw || fallback || "").split("|");
      return { title: (p[0] || "").trim(), note: (p[1] || "").trim() };
    };
    const quads = [
      { key: "q1", data: parseQ(s.q1, "ربع اول | اولویت بالا"), color: A.color("good") },
      { key: "q2", data: parseQ(s.q2, "ربع دوم | برنامه‌ریزی"), color: A.color("accent") },
      { key: "q3", data: parseQ(s.q3, "ربع سوم | واگذاری"), color: "#38BDF8" },
      { key: "q4", data: parseQ(s.q4, "ربع چهارم | حذف"), color: A.color("danger") },
    ];

    const gridTop = topY + (asp.isPortrait ? 186 : 150);
    const grid = A.el("div", "abs", A.root, {
      left: leftEdge + 12, right: padX + 12, top: gridTop, bottom: A.scam ? 116 : 96,
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gridTemplateRows: "1fr 1fr",
      gap: "20px",
    });

    const cards = [];
    quads.forEach((q, i) => {
      const c = A.el("div", "card", grid, {
        padding: asp.isPortrait ? "24px 20px" : "30px 32px",
        borderTop: `7px solid ${q.color}`,
        display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "12px",
      });
      const num = A.el("span", "", c, {
        alignSelf: "flex-start", padding: "4px 14px", borderRadius: "999px",
        background: q.color, color: "#111", fontWeight: 900, fontSize: "20px",
      });
      num.textContent = Stage.fa(String(i + 1));
      const h = A.text(c, q.data.title, "h2", "", { fontSize: asp.isPortrait ? "28px" : "34px", fontWeight: 900, color: col.text });
      A.field(q.key, h);
      if (q.data.note) {
        A.text(c, q.data.note, "body", "", { fontSize: asp.isPortrait ? "22px" : "25px", color: col.muted, lineHeight: 1.5 });
      }
      cards.push(c);
    });

    if (s.x_axis) {
      const xl = A.text(A.root, s.x_axis, "caption", "abs", {
        left: leftEdge, right: padX, bottom: A.scam ? 52 : 42,
        textAlign: "center", fontSize: "24px", fontWeight: 800, color: A.color("accent"),
      });
      A.field("x_axis", xl);
      A.enter(xl, "note", 0, 0.1);
    }
    if (s.y_axis) {
      const yl = A.text(A.root, s.y_axis, "caption", "abs", {
        right: padX, top: gridTop - 36,
        fontSize: "22px", fontWeight: 800, color: col.muted,
      });
      A.field("y_axis", yl);
      A.enter(yl, "note", 0, 0.1);
    }

    A.stepReveal(cards, { role: "card", at: A.at("card", 0, 0.25), minGap: 0.85, sfx: "card" });
  },
});
