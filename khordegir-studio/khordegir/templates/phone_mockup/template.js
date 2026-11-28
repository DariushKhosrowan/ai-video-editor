Stage.template({
  name: "phone_mockup",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const col = A.th.colors || {};
    const padX = asp.isPortrait ? 44 : A.area.x;
    const leftEdge = asp.isPortrait ? 44 : A.area.left;
    const topY = asp.isPortrait ? 86 : A.area.y;

    const ey = A.text(A.root, s.eyebrow || "نمایش موبایل", "eyebrow", "abs", {
      right: padX, top: topY, color: A.color("accent"), fontSize: "26px",
    });
    A.field("eyebrow", ey);
    A.enter(ey, "eyebrow");

    const title = A.text(A.root, s.title || "معرفی رابط کاربری", "h1", "abs", {
      right: padX, left: leftEdge, top: topY + 46,
      fontSize: asp.isPortrait ? "42px" : "48px",
    });
    A.field("title", title);
    A.enter(title, "title");

    const boxTop = topY + (asp.isPortrait ? 180 : 146);
    const boxW = A.W - leftEdge - padX;
    const boxH = A.H - boxTop - (A.scam ? 96 : 68);
    const stacked = asp.isPortrait || A.scam;

    const layout = A.el("div", "abs", A.root, {
      left: leftEdge, top: boxTop, width: boxW, height: boxH,
      display: "flex", flexDirection: stacked ? "column" : "row",
      alignItems: "center", justifyContent: "space-between", gap: "36px",
    });

    // Phone bezel
    const phoneH = stacked ? Math.round(boxH * 0.50) : Math.min(boxH - 12, 740);
    const phoneW = Math.round(phoneH * 0.50);
    const phone = A.el("div", "", layout, {
      width: phoneW + "px", height: phoneH + "px", flexShrink: "0",
      borderRadius: "42px", padding: "14px",
      background: "#121318", border: "4px solid #3A3F52",
      boxShadow: "0 28px 68px rgba(0,0,0,0.52)",
      display: "flex", flexDirection: "column", position: "relative", overflow: "hidden",
    });
    // Top notch
    A.el("div", "", phone, {
      width: "92px", height: "18px", borderRadius: "999px", background: "#050608",
      margin: "2px auto 10px", flexShrink: "0",
    });
    if (s.screen_label) {
      const sl = A.text(phone, s.screen_label, "caption", "", {
        fontSize: "20px", fontWeight: 800, color: "#FFFFFF", textAlign: "center", marginBottom: "8px",
      });
      A.field("screen_label", sl);
    }
    const screenH = Math.max(120, phoneH - 76);
    const screen = A.el("div", "", phone, {
      position: "relative", flex: "1", width: "100%", borderRadius: "28px", overflow: "hidden",
    });
    A.image(screen, s.image || "", 0, 0, phoneW - 28, screenH, { enter: false, radius: 26, shadow: false, motion: "gentle-drift", name: "image" });
    A.field("image", phone);
    A.enter(phone, "image", 0, 0.12);

    // Feature list
    const raw = Array.isArray(s.features) ? s.features : String(s.features || "").split("\n").filter(Boolean);
    const feats = (raw.length ? raw : [
      "ویژگی اول | توضیح ساده و شفاف",
      "ویژگی دوم | طراحی واکنش‌گرا و خوانا",
      "ویژگی سوم | سرعت و پایداری کامل",
    ]).slice(0, 4).map((line, i) => {
      if (line && typeof line === "object") return { title: line.title || `ویژگی ${i + 1}`, note: line.note || "" };
      const p = String(line).split("|");
      return { title: (p[0] || "").trim(), note: (p[1] || "").trim() };
    });

    const listWrap = A.el("div", "", layout, {
      flex: "1", width: stacked ? "100%" : "auto",
      display: "flex", flexDirection: "column", justifyContent: "center", gap: "18px",
    });
    A.field("features", listWrap);

    const cards = [];
    feats.forEach((ft, i) => {
      const c = A.el("div", "card", listWrap, {
        padding: "22px 26px", borderRight: `6px solid ${A.color("accent")}`,
        display: "flex", alignItems: "center", gap: "18px",
      });
      const num = A.el("span", "", c, {
        width: "44px", height: "44px", borderRadius: "12px",
        background: A.color("accent"), color: "#111", fontWeight: 900, fontSize: "24px",
        display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: "0",
      });
      num.textContent = Stage.fa(String(i + 1));
      const tx = A.el("div", "", c, { display: "flex", flexDirection: "column", gap: "4px" });
      A.text(tx, ft.title, "h2", "", { fontSize: "28px", fontWeight: 800, color: col.text });
      if (ft.note) A.text(tx, ft.note, "body", "", { fontSize: "23px", color: col.muted, lineHeight: 1.45 });
      cards.push(c);
    });

    A.stepReveal(cards, { role: "card", at: A.at("card", 0, 0.32), minGap: 0.82, sfx: "pop" });
  },
});
