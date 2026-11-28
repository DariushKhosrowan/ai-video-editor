Stage.template({
  name: "funnel_diagram",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const col = A.th.colors || {};
    const isLight = col.isDark === false;
    const padX = asp.isPortrait ? 48 : A.area.x;
    const leftEdge = asp.isPortrait ? 48 : A.area.left;
    const topY = asp.isPortrait ? 96 : A.area.y;

    const ey = A.text(A.root, s.eyebrow || "قیف تحلیل", "eyebrow", "abs", {
      right: padX, top: topY, color: A.color("accent"), fontSize: "26px",
    });
    A.field("eyebrow", ey);
    A.enter(ey, "eyebrow");

    const title = A.text(A.root, s.title || "مراحل قیف", "h1", "abs", {
      right: padX, left: leftEdge, top: topY + 48,
      fontSize: asp.isPortrait ? "44px" : "52px",
    });
    A.field("title", title);
    A.enter(title, "title");

    const raw = Array.isArray(s.stages) ? s.stages : String(s.stages || "").split("\n").filter(Boolean);
    const stages = (raw.length ? raw : [
      "ورودی کل | ۱۰۰٪ | تمام مخاطبان اولیه",
      "علاقه‌مندان | ۵۸٪ | عبور از مرحله معرفی",
      "تصمیم‌گیری | ۲۷٪ | بررسی جزئیات و مقایسه",
      "نتیجه نهایی | ۱۲٪ | اقدام و تثبیت",
    ]).slice(0, 5).map((line, i) => {
      if (line && typeof line === "object") {
        return { label: line.label || `لایه ${i + 1}`, value: line.value || "", note: line.note || "" };
      }
      const p = String(line).split("|");
      return { label: (p[0] || "").trim(), value: (p[1] || "").trim(), note: (p[2] || "").trim() };
    });

    const wrap = A.el("div", "abs", A.root, {
      left: leftEdge, right: padX,
      top: topY + (asp.isPortrait ? 190 : 155),
      bottom: A.scam ? 96 : 86,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "18px",
    });
    A.field("stages", wrap);

    const series = col.series || [A.color("accent"), "#38BDF8", "#34D399", "#F59E0B", "#FB7185"];
    const rows = [];

    stages.forEach((st, i) => {
      const pctWidth = Math.round(100 - i * (44 / Math.max(1, stages.length - 1)));
      const barColor = series[i % series.length] || A.color("accent");
      const row = A.el("div", "", wrap, {
        width: `${pctWidth}%`,
        minWidth: asp.isPortrait ? "64%" : "42%",
        padding: asp.isPortrait ? "22px 26px" : "22px 34px",
        borderRadius: "16px",
        background: isLight ? (col.card || "#FFFFFF") : (col.card || "#1D1D1D"),
        border: `2px solid ${barColor}`,
        borderRight: `10px solid ${barColor}`,
        boxShadow: isLight ? "0 10px 26px rgba(0,0,0,0.07)" : "0 14px 36px rgba(0,0,0,0.34)",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: "20px",
      });

      const txt = A.el("div", "", row, { display: "flex", flexDirection: "column", gap: "4px" });
      A.text(txt, st.label, "h2", "", { fontSize: asp.isPortrait ? "28px" : "30px", fontWeight: 800, color: col.text });
      if (st.note) {
        A.text(txt, st.note, "body", "", { fontSize: "22px", color: col.muted, lineHeight: 1.4 });
      }

      if (st.value) {
        A.text(row, st.value, "value", "", {
          fontSize: asp.isPortrait ? "38px" : "44px", fontWeight: 900, color: barColor, flexShrink: "0",
        });
      }
      rows.push(row);
    });

    A.stepReveal(rows, { role: "card", at: A.at("card", 0, 0.25), minGap: 0.75, sfx: "bar" });
  },
});
