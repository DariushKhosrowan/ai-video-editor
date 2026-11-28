Stage.template({
  name: "guest_card",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const col = A.th.colors || {};
    const isLight = col.isDark === false;
    const padX = asp.isPortrait ? 52 : A.area.x;
    const leftEdge = asp.isPortrait ? 52 : A.area.left;
    const topY = asp.isPortrait ? 110 : A.area.y + 18;

    const card = A.el("div", "abs card", A.root, {
      left: leftEdge, right: padX, top: topY, bottom: A.scam ? 115 : (asp.isPortrait ? 140 : 100),
      padding: asp.isPortrait ? "42px 34px" : "52px 58px",
      display: "grid",
      gridTemplateColumns: asp.isPortrait ? "1fr" : "340px 1fr",
      gap: asp.isPortrait ? "28px" : "52px",
      alignItems: "center",
      borderTop: `6px solid ${A.color("accent")}`,
    });
    A.enter(card, "card", 0, 0, { ease: "vox" });

    // Avatar / Portrait column
    const avWrap = A.el("div", "", card, {
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "18px",
    });
    const avSize = asp.isPortrait ? 240 : 300;
    const avBox = A.el("div", "", avWrap, {
      position: "relative", width: avSize + "px", height: avSize + "px",
      borderRadius: "28px", overflow: "hidden",
      border: `4px solid ${A.color("accent")}`,
      background: isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)",
      display: "flex", alignItems: "center", justifyContent: "center",
    });
    const imgSrc = s._avatar_path || s.avatar || s.image;
    if (imgSrc) {
      A.image(avBox, imgSrc, 0, 0, avSize, avSize, { radius: 24, shadow: false, reveal: "wipe" });
    } else {
      const mono = A.el("div", "", avBox, { fontSize: "96px", fontWeight: 900, color: A.color("accent") });
      mono.textContent = String(s.name || "م").replace(/[*~_]/g, "").trim().slice(0, 1);
      A.maskWipe(avBox, "circle-reveal", { at: A.at("image"), dur: "base" });
    }

    // Bio & Credentials column
    const info = A.el("div", "", card, { display: "flex", flexDirection: "column", gap: "18px" });
    const ey = A.text(info, s.eyebrow || "مهمان ویژه", "eyebrow", "", { color: A.color("accent"), fontSize: "26px" });
    A.field("eyebrow", ey);
    A.enter(ey, "eyebrow");

    const nameEl = A.text(info, s.name || "", "hero", "", {
      fontSize: asp.isPortrait ? "56px" : "68px", lineHeight: 1.18,
    });
    A.field("name", nameEl);
    A.kinetic(nameEl, { at: A.at("title"), mode: s.textMotion || s.text_motion || "rise-mask", role: "title" });

    const roleEl = A.text(info, s.role || "", "h1", "", {
      fontSize: asp.isPortrait ? "32px" : "34px", color: A.color("accent"), fontWeight: 700,
    });
    A.field("role", roleEl);
    A.enter(roleEl, "body", 0, 0.14);

    if (s.bio) {
      const bioEl = A.text(info, s.bio, "body", "", {
        fontSize: asp.isPortrait ? "28px" : "30px", color: col.muted, lineHeight: 1.55,
      });
      A.field("bio", bioEl);
      A.enter(bioEl, "body", 1, 0.22);
    }

    const creds = A.list(s.credentials);
    if (creds.length) {
      const ul = A.el("div", "", info, { display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px" });
      const items = [];
      creds.slice(0, 4).forEach((c) => {
        const li = A.el("div", "", ul, { display: "flex", alignItems: "center", gap: "12px" });
        A.el("div", "", li, { width: "10px", height: "10px", borderRadius: "999px", background: A.color("accent"), flexShrink: 0 });
        A.text(li, c, "body", "", { fontSize: "26px", color: col.text });
        items.push(li);
      });
      A.stagger(items, "body", { from: "start", step: "normal", extra: 0.3 });
    }
  },
});
