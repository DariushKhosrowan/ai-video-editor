Stage.template({
  name: "cycle_diagram",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const col = A.th.colors || {};
    const isLight = col.isDark === false;
    const padX = asp.isPortrait ? 44 : A.area.x;
    const leftEdge = asp.isPortrait ? 44 : A.area.left;
    const topY = asp.isPortrait ? 90 : A.area.y;

    const ey = A.text(A.root, s.eyebrow || "حلقه بازخورد", "eyebrow", "abs", {
      right: padX, top: topY, color: A.color("accent"), fontSize: "26px",
    });
    A.field("eyebrow", ey);
    A.enter(ey, "eyebrow");

    const title = A.text(A.root, s.title || "چرخه پیوسته", "h1", "abs", {
      right: padX, left: leftEdge, top: topY + 46,
      fontSize: asp.isPortrait ? "44px" : "50px",
    });
    A.field("title", title);
    A.enter(title, "title");

    const raw = Array.isArray(s.steps) ? s.steps : String(s.steps || "").split("\n").filter(Boolean);
    const steps = (raw.length ? raw : [
      "گام اول | شروع چرخه",
      "گام دوم | اجرا و حرکت",
      "گام سوم | سنجش نتیجه",
      "گام چهارم | اصلاح و تکرار",
    ]).slice(0, 6).map((item, i) => {
      if (item && typeof item === "object") return { title: item.title || `گام ${i + 1}`, note: item.note || "" };
      const p = String(item).split("|");
      return { title: (p[0] || "").trim(), note: (p[1] || "").trim() };
    });

    const boxW = A.W - leftEdge - padX;
    const boxTop = topY + (asp.isPortrait ? 185 : 148);
    const boxH = A.H - boxTop - (A.scam ? 105 : 78);
    const area = A.el("div", "abs", A.root, { left: leftEdge, top: boxTop, width: boxW, height: boxH });
    A.field("steps", area);

    const cx = boxW * 0.5;
    const cy = boxH * 0.5;
    const orbitR = Math.min(boxW * 0.30, boxH * 0.34);

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${boxW} ${boxH}`);
    Object.assign(svg.style, { position: "absolute", inset: "0", width: "100%", height: "100%", pointerEvents: "none" });
    area.appendChild(svg);

    const ring = document.createElementNS(svgNS, "circle");
    ring.setAttribute("cx", cx.toFixed(1));
    ring.setAttribute("cy", cy.toFixed(1));
    ring.setAttribute("r", orbitR.toFixed(1));
    ring.setAttribute("fill", "none");
    ring.setAttribute("stroke", isLight ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.20)");
    ring.setAttribute("stroke-width", "4");
    ring.setAttribute("stroke-dasharray", "10 10");
    svg.appendChild(ring);
    A.drawPath(ring, { at: A.at("body", 0, 0.1), dur: 0.9, ease: "fluid" });

    if (s.center_label) {
      const center = A.el("div", "abs", area, {
        left: Math.round(cx - 110), top: Math.round(cy - 44), width: "220px",
        padding: "16px 18px", borderRadius: "999px", textAlign: "center",
        background: isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)",
        border: `2px solid ${A.color("accent")}`,
      });
      const cl = A.text(center, s.center_label, "label", "", { fontSize: "26px", fontWeight: 900, color: A.color("accent") });
      A.field("center_label", cl);
      A.enter(center, "badge", 0, 0.15);
    }

    const series = col.series || [A.color("accent"), "#38BDF8", "#34D399", "#F59E0B", "#FB7185", "#A78BFA"];
    const cardW = Math.min(340, Math.round(boxW * (asp.isPortrait ? 0.44 : 0.28)));
    const cardH = 118;
    const cards = [];

    steps.forEach((st, i) => {
      const ang = (-Math.PI / 2) + (i / steps.length) * Math.PI * 2;
      const nx = Math.max(cardW / 2 + 8, Math.min(boxW - cardW / 2 - 8, cx + Math.cos(ang) * (orbitR + (asp.isPortrait ? 18 : 42))));
      const ny = Math.max(cardH / 2 + 8, Math.min(boxH - cardH / 2 - 8, cy + Math.sin(ang) * (orbitR + 12)));
      const clr = series[i % series.length] || A.color("accent");

      const card = A.el("div", "abs card", area, {
        left: Math.round(nx - cardW / 2), top: Math.round(ny - cardH / 2),
        width: cardW, minHeight: cardH, padding: "16px 20px",
        borderTop: `5px solid ${clr}`, zIndex: 4,
        display: "flex", flexDirection: "column", justifyContent: "center", gap: "6px",
      });
      const headRow = A.el("div", "", card, { display: "flex", alignItems: "center", gap: "10px" });
      const num = A.el("span", "", headRow, {
        width: "32px", height: "32px", borderRadius: "50%", background: clr, color: "#111",
        display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "20px", flexShrink: "0",
      });
      num.textContent = Stage.fa(String(i + 1));
      A.text(headRow, st.title, "h2", "", { fontSize: "25px", fontWeight: 800, color: col.text });
      if (st.note) {
        A.text(card, st.note, "caption", "", { fontSize: "20px", color: col.muted, lineHeight: 1.4 });
      }
      cards.push(card);
    });

    A.stepReveal(cards, { role: "card", at: A.at("card", 0, 0.35), minGap: 0.78, sfx: "tick" });
  },
});
