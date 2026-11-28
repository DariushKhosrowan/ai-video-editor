Stage.template({
  name: "checklist_progressive",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const col = A.th.colors || {};
    const isLight = col.isDark === false;
    const padX = asp.isPortrait ? 44 : A.area.x;
    const leftEdge = asp.isPortrait ? 44 : A.area.left;
    const topY = asp.isPortrait ? 86 : A.area.y;

    const ey = A.text(A.root, s.eyebrow || "چک‌لیست اجرایی", "eyebrow", "abs", {
      right: padX, top: topY, color: A.color("accent"), fontSize: "26px",
    });
    A.field("eyebrow", ey);
    A.enter(ey, "eyebrow");

    const title = A.text(A.root, s.title || "چک‌لیست گام‌به‌گام", "h1", "abs", {
      right: padX, left: leftEdge, top: topY + 46,
      fontSize: asp.isPortrait ? "42px" : "48px",
    });
    A.field("title", title);
    A.enter(title, "title");

    const raw = Array.isArray(s.items) ? s.items : String(s.items || "").split("\n").filter(Boolean);
    const items = (raw.length ? raw : [
      "مورد اول | توضیح کوتاه مرحله اول",
      "مورد دوم | توضیح کوتاه مرحله دوم",
      "مورد سوم | توضیح کوتاه مرحله سوم",
      "مورد چهارم | توضیح کوتاه مرحله چهارم",
    ]).slice(0, 6).map((line, i) => {
      if (line && typeof line === "object") return { title: line.title || `مورد ${i + 1}`, note: line.note || "" };
      const p = String(line).split("|");
      return { title: (p[0] || "").trim(), note: (p[1] || "").trim() };
    });

    const listWrap = A.el("div", "abs", A.root, {
      left: leftEdge, right: padX,
      top: topY + (asp.isPortrait ? 182 : 148),
      bottom: A.scam ? 110 : (s.summary ? 138 : 74),
      display: "flex", flexDirection: "column", justifyContent: "center", gap: "15px",
    });
    A.field("items", listWrap);

    const svgNS = "http://www.w3.org/2000/svg";
    const rows = [];
    const checkPaths = [];
    const boxEls = [];

    items.forEach((it) => {
      const row = A.el("div", "card", listWrap, {
        padding: asp.isPortrait ? "18px 22px" : "18px 28px",
        display: "flex", alignItems: "center", gap: "20px",
        borderRight: `6px solid ${A.color("good")}`,
      });
      const box = A.el("div", "", row, {
        width: "46px", height: "46px", borderRadius: "12px", flexShrink: "0",
        border: `3px solid ${A.color("good")}`,
        background: isLight ? "rgba(5,150,105,0.08)" : "rgba(52,211,153,0.10)",
        display: "flex", alignItems: "center", justifyContent: "center",
      });
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("viewBox", "0 0 32 32");
      svg.style.width = "30px";
      svg.style.height = "30px";
      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", "M 6 16.5 L 13 23.5 L 26 9");
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", A.color("good"));
      path.setAttribute("stroke-width", "4.2");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      svg.appendChild(path);
      box.appendChild(svg);

      const tx = A.el("div", "", row, { display: "flex", flexDirection: "column", gap: "3px" });
      A.text(tx, it.title, "h2", "", { fontSize: asp.isPortrait ? "28px" : "30px", fontWeight: 800, color: col.text });
      if (it.note) A.text(tx, it.note, "body", "", { fontSize: "22px", color: col.muted, lineHeight: 1.4 });

      rows.push(row);
      checkPaths.push(path);
      boxEls.push(box);
    });

    const endAt = A.stepReveal(rows, {
      role: "card",
      at: A.at("card", 0, 0.25),
      minGap: 0.85,
      sfx: "tick",
      onStep(_el, idx, stepAt) {
        if (checkPaths[idx]) {
          A.drawPath(checkPaths[idx], { at: stepAt + 0.22, dur: 0.34, ease: "snappy" });
        }
        if (boxEls[idx]) {
          Stage.tl.to(boxEls[idx], { scale: 1.08, duration: 0.14, yoyo: true, repeat: 1, ease: "power2.out" }, stepAt + 0.36);
        }
        if (Stage.fx) Stage.fx.cue(stepAt + 0.34, "pop", `check-${idx + 1}`, { index: idx, pitch: idx });
      },
    });

    if (s.summary) {
      const sum = A.el("div", "abs", A.root, {
        left: leftEdge, right: padX, bottom: A.scam ? 42 : 46,
        padding: "16px 26px", borderRadius: "14px",
        background: isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.07)",
        borderRight: `6px solid ${A.color("accent")}`,
      });
      const st = A.text(sum, s.summary, "body", "", { fontSize: "25px", fontWeight: 800, color: col.text });
      A.field("summary", st);
      A.enter(sum, "note", 0, 0, { at: endAt + 0.28 });
    }
  },
});
