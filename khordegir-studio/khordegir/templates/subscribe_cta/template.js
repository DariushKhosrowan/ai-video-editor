Stage.template({
  name: "subscribe_cta",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const col = A.th.colors || {};
    const isLight = col.isDark === false;
    const padX = asp.isPortrait ? 48 : A.area.x + 80;
    const leftEdge = asp.isPortrait ? 48 : A.area.left + 80;
    const topY = asp.isPortrait ? 130 : A.area.y + 32;

    const card = A.el("div", "abs card", A.root, {
      left: leftEdge, right: padX, top: topY, bottom: A.scam ? 115 : 88,
      padding: asp.isPortrait ? "44px 34px" : "56px 64px",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      textAlign: "center", gap: "26px",
      borderTop: `8px solid ${A.color("danger")}`,
    });
    A.enter(card, "card", 0, 0.08);

    const ey = A.text(card, s.eyebrow || "پایان این قسمت", "eyebrow", "", { color: A.color("accent"), fontSize: "28px" });
    A.field("eyebrow", ey);
    A.enter(ey, "eyebrow", 0, 0.14);

    const ch = A.text(card, s.channel || "نام کانال شما", "hero", "", {
      fontSize: asp.isPortrait ? "56px" : "70px", fontWeight: 900, color: col.text, lineHeight: 1.2,
    });
    A.field("channel", ch);
    A.enter(ch, "title", 0, 0.22);

    if (s.handle) {
      const hd = A.text(card, s.handle, "body", "", {
        fontSize: "28px", fontFamily: "monospace", color: col.muted, direction: "ltr",
      });
      A.field("handle", hd);
      A.enter(hd, "body", 0, 0.28);
    }

    if (s.cta_text) {
      const ct = A.text(card, s.cta_text, "body", "", {
        fontSize: asp.isPortrait ? "30px" : "34px", lineHeight: 1.6, maxWidth: "900px", color: col.body || col.text,
      });
      A.field("cta_text", ct);
      A.enter(ct, "body", 0, 0.38);
    }

    // Subscribe button + animated bell
    const ctaRow = A.el("div", "", card, {
      display: "flex", alignItems: "center", justifyContent: "center", gap: "18px", flexWrap: "wrap",
    });

    const btn = A.el("div", "", ctaRow, {
      padding: "20px 44px", borderRadius: "999px",
      background: "#E52D27", color: "#FFFFFF", fontWeight: 900, fontSize: "30px",
      boxShadow: "0 16px 40px rgba(229,45,39,0.42)",
    });
    const btnTxt = A.text(btn, s.button_label || "عضویت در کانال · Subscribe", "label", "", {
      color: "#FFFFFF", fontSize: "28px", fontWeight: 900,
    });
    A.field("button_label", btnTxt);

    const bell = A.el("div", "", ctaRow, {
      width: "68px", height: "68px", borderRadius: "50%",
      background: A.color("accent"), color: "#111111",
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 12px 30px rgba(0,0,0,0.34)",
    });
    bell.innerHTML = `<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="#111" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;

    const btnAt = A.at("badge", 0, 0.65);
    A.enter(ctaRow, "badge", 0, 0, { at: btnAt });
    // Crisp deterministic subscribe press + bell ring wiggle
    Stage.tl.to(btn, { scale: 0.93, duration: 0.12, yoyo: true, repeat: 1, ease: "power2.inOut" }, btnAt + 0.55);
    Stage.tl.to(bell, { rotation: 18, duration: 0.10, yoyo: true, repeat: 3, ease: "sine.inOut" }, btnAt + 0.80);
    if (Stage.fx) {
      Stage.fx.cue(btnAt + 0.55, "click", "subscribe-press");
      Stage.fx.cue(btnAt + 0.80, "subscribe-bell", "bell-ring");
    }

    if (s.next_video) {
      const nextBox = A.el("div", "", card, {
        marginTop: "10px", padding: "18px 28px", borderRadius: "14px",
        background: isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.06)",
        borderRight: `5px solid ${A.color("accent")}`,
        maxWidth: "920px",
      });
      const nv = A.text(nextBox, s.next_video, "body", "", { fontSize: "25px", fontWeight: 700, color: col.text });
      A.field("next_video", nv);
      A.enter(nextBox, "note", 0, 0, { at: btnAt + 1.15 });
    }
  },
});
