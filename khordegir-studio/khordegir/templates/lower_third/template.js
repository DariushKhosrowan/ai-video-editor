Stage.template({
  name: "lower_third",
  build(s, A) {
    const pos = s.position || "auto";
    const margin = A.L.margin;
    const cam = A.L.cam || [24, 740, 584, 1055];
    const safeCamTop = Math.min(A.area.camTop || (cam[1] - 20), cam[1] - 20);

    let slotStyle;
    if (A.scam) {
      if (pos === "top") {
        // Above camera box: element bottom <= 720
        slotStyle = { left: cam[0] + 16, right: margin, bottom: A.H - safeCamTop, display: "flex", justifyContent: "flex-start" };
      } else {
        // Beside camera box: strictly right of x=650
        slotStyle = { left: A.area.left, right: margin, bottom: A.L.bottom, display: "flex", justifyContent: "flex-start" };
      }
    } else {
      slotStyle = pos === "top"
        ? { left: margin, right: margin, top: A.L.top, display: "flex", justifyContent: "flex-start" }
        : { left: margin, right: margin, bottom: A.L.bottom, display: "flex", justifyContent: "flex-start" };
    }

    const slot = A.el("div", "abs", A.root, slotStyle);
    const strip = A.el("div", "card", slot, {
      display: "inline-flex", alignItems: "stretch", maxWidth: "100%",
      padding: "0px", overflow: "hidden", position: "relative"
    });

    const bar = A.el("div", "", strip, {
      width: "10px", flexShrink: 0,
      background: A.color("accent"),
      transformOrigin: "bottom center"
    });

    const body = A.el("div", "", strip, {
      display: "flex", alignItems: "center", gap: "22px",
      padding: "18px 30px", minWidth: "0px"
    });

    const textCol = A.el("div", "", body, {
      display: "flex", flexDirection: "column", gap: "4px",
      maxWidth: (A.scam && pos !== "top") ? "900px" : "1080px",
      height: "140px", justifyContent: "center"
    });

    const nameEl = A.text(textCol, s.name || "", "h1", "", { fontSize: "44px", lineHeight: 1.15, textAlign: "start" });
    let roleEl = null;
    if (s.role) {
      roleEl = A.text(textCol, s.role, "body", "", { fontSize: "26px", color: A.color("muted"), lineHeight: 1.3, textAlign: "start" });
    }
    A.fit(textCol, 0.55);
    textCol.style.height = "auto";

    const tagText = s.tag || s.logo;
    let tagWrap = null;
    if (tagText) {
      A.el("div", "", body, { width: "1px", height: "46px", background: "var(--c-cardBorder)", flexShrink: 0 });
      tagWrap = A.el("div", "badge acc", body, {
        padding: "8px 16px", borderRadius: (A.L.badgeRadius || 8) + "px",
        flexShrink: 0, whiteSpace: "nowrap"
      });
      A.text(tagWrap, String(tagText).toUpperCase(), "eyebrow", "", {
        fontSize: "20px", color: A.color("accent"),
        letterSpacing: A.ltr ? "0.14em" : "0"
      });
    }

    const clipStart = A.ltr ? "inset(0 100% 0 0)" : "inset(0 0 0 100%)";
    Stage.tl.fromTo(strip, { opacity: 0 }, { opacity: 1, duration: 0.22, ease: Stage.ease("power3"), immediateRender: true }, 0.05);
    Stage.tl.fromTo(bar, { scaleY: 0 }, { scaleY: 1, duration: 0.36, ease: Stage.ease("expo"), immediateRender: true }, 0.08);
    Stage.tl.fromTo(body, { clipPath: clipStart }, { clipPath: "inset(0 0% 0 0%)", duration: 0.46, ease: Stage.ease("power4"), immediateRender: true }, 0.18);
    Stage.tl.fromTo(nameEl, { opacity: 0, x: A.sign * 20 }, { opacity: 1, x: 0, duration: 0.40, ease: Stage.ease("power4"), immediateRender: true }, 0.24);
    if (roleEl) {
      Stage.tl.fromTo(roleEl, { opacity: 0, x: A.sign * 16 }, { opacity: 1, x: 0, duration: 0.38, ease: Stage.ease("power4"), immediateRender: true }, 0.34);
    }
    if (tagWrap) A.enter(tagWrap, "badge", 0);
  }
});
