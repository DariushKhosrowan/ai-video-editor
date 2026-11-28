Stage.template({
  name: "punch_in",
  build(s, A) {
    const raw = String(s.text || "").trim();
    if (!raw) return;
    const tone = s.tone === "good" ? "good" : (Stage.T.tone(s.tone) || (s.tone === "text" ? "accent" : "accent"));
    const flashCol = A.color(tone);
    const plainLen = raw.replace(/[*~_=]/g, "").length;
    const fs = plainLen <= 8 ? (A.scam ? 156 : 196) : plainLen <= 16 ? (A.scam ? 116 : 146) : (A.scam ? 86 : 108);

    const wrap = A.el("div", "col", A.root, {
      left: A.area.left, right: A.L.margin, top: A.area.y, bottom: A.scam ? 110 : 100,
      alignItems: "center", justifyContent: "center", textAlign: "center", gap: "20px", padding: "24px"
    });

    if (s.eyebrow) A.enter(A.text(wrap, s.eyebrow, "eyebrow", "", { letterSpacing: A.ltr ? "0.14em" : "0" }), "eyebrow", 0);

    const stage = A.el("div", "", wrap, {
      position: "relative", width: "100%", display: "flex",
      alignItems: "center", justifyContent: "center", padding: "20px 10px"
    });

    // Two-layer flash (single tween per element -> seek-safe burst that cools to a still ambient glow)
    const flashOuter = A.el("div", "", stage, {
      position: "absolute", width: A.scam ? "760px" : "980px", height: "320px",
      pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center"
    });
    const flashInner = A.el("div", "", flashOuter, {
      width: "100%", height: "100%", borderRadius: "999px",
      background: `radial-gradient(ellipse at center, ${flashCol} 0%, transparent 70%)`
    });

    const wordBox = A.el("div", "", stage, {
      position: "relative", width: "100%", height: (fs * 1.4) + "px",
      display: "flex", alignItems: "center", justifyContent: "center"
    });
    const wordOpacity = A.el("div", "", wordBox, { width: "100%" });
    const wordEl = A.text(wordOpacity, raw, "hero", "", {
      fontSize: fs + "px", lineHeight: 1.08, fontWeight: 900, textAlign: "center",
      color: s.tone === "text" ? A.color("text") : undefined
    });
    wordEl.style.transformOrigin = "50% 50%";

    A.fit(wordBox, 0.45);
    wordBox.style.height = "auto";

    let capEl = null;
    if (s.caption) {
      const capBox = A.el("div", "", wrap, { width: "100%", maxWidth: "880px", height: "86px", display: "flex", alignItems: "center", justifyContent: "center" });
      capEl = A.text(capBox, s.caption, "body", "", { fontSize: "32px", color: A.color("muted"), textAlign: "center" });
      A.fit(capBox, 0.55);
      capBox.style.height = "auto";
    }
    A.fit(wrap, 0.55);

    const t = A.at("title", 0);
    Stage.tl.fromTo(flashInner, { opacity: 0, scale: 0.45 }, { opacity: 1, scale: 1, duration: 0.14, ease: Stage.ease("expo"), immediateRender: true }, t + 0.02);
    Stage.tl.fromTo(flashOuter, { opacity: 0.9, scale: 1.22 }, { opacity: 0.22, scale: 1, duration: 0.46, ease: Stage.ease("power3"), immediateRender: true }, t + 0.14);
    Stage.tl.fromTo(wordOpacity, { opacity: 0 }, { opacity: 1, duration: 0.14, ease: Stage.ease("power4"), immediateRender: true }, t);
    Stage.tl.fromTo(wordEl, { scale: 1.25, filter: "blur(10px)" }, { scale: 1, filter: "blur(0px)", duration: 0.40, ease: Stage.ease("expo"), immediateRender: true }, t);
    if (capEl) A.enter(capEl, "body", 0, 0.16);
  }
});
