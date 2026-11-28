Stage.template({
  name: "doc_highlight",
  build(s, A) {
    const tone = s.tone === "good" || s.tone === "info" ? s.tone : (Stage.T.tone(s.tone) || "accent");
    const col = A.color(tone);
    const alpha = (c, a) => {
      const m = /^#([0-9a-f]{6})$/i.exec(String(c || "").trim());
      if (!m) return `color-mix(in srgb, ${c} ${Math.round(a * 100)}%, transparent)`;
      const n = parseInt(m[1], 16);
      return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
    };
    const hlTint = alpha(col, 0.30);
    const hlEdge = alpha(col, 0.72);

    const outer = A.el("div", "col", A.root, {
      left: A.area.left, right: A.L.margin, top: A.area.y + 8, bottom: A.scam ? 104 : 96,
      justifyContent: "center", gap: "16px"
    });

    const card = A.el("div", "card", outer, {
      width: "100%", padding: A.scam ? "34px 40px" : "44px 52px",
      display: "flex", flexDirection: "column", gap: "18px", position: "relative"
    });

    if (s.journal || s.year) {
      const topMeta = A.el("div", "", card, {
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "14px"
      });
      if (s.journal) {
        const jRow = A.el("div", "", topMeta, { display: "flex", alignItems: "center", gap: "10px" });
        A.el("div", "", jRow, { width: "10px", height: "10px", borderRadius: "2px", background: col, flexShrink: 0 });
        A.text(jRow, s.journal, "eyebrow", "", { fontSize: "22px", color: col, letterSpacing: A.ltr ? "0.12em" : "0" });
      } else {
        A.el("div", "", topMeta);
      }
      if (s.year) {
        const yr = A.el("div", "", topMeta, {
          padding: "5px 14px", borderRadius: (A.L.badgeRadius || 8) + "px",
          background: "var(--c-bg2)", border: "1px solid var(--c-cardBorder)"
        });
        A.text(yr, String(s.year), "caption", "", { fontSize: "22px", fontWeight: 700, color: A.color("muted") });
      }
      A.enter(topMeta, "eyebrow", 0);
    }

    const titleBox = A.el("div", "", card, { width: "100%", height: "86px", display: "flex", alignItems: "center" });
    A.text(titleBox, s.title || "", "h1", "", { fontSize: A.scam ? "34px" : "38px", lineHeight: 1.25, textAlign: "start" });
    A.fit(titleBox, 0.55);
    titleBox.style.height = "auto";
    A.enter(titleBox, "title", 0);

    const rule = A.el("div", "rule", card, { width: "100%", height: "1px", background: "var(--c-cardBorder)", transformOrigin: A.originStart });
    Stage.tl.fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: 0.45, ease: Stage.ease("power3"), immediateRender: true }, A.at("card", 0) + 0.10);

    const exMaxH = A.scam ? 340 : 420;
    const exBox = A.el("div", "", card, { width: "100%", height: exMaxH + "px", display: "flex", alignItems: "center" });
    const exEl = A.text(exBox, s.excerpt || "", "body", "", {
      width: "100%", fontSize: A.scam ? "34px" : "38px",
      lineHeight: 1.56, textAlign: "start", color: A.color("body")
    });
    A.fit(exBox, 0.52);
    exBox.style.height = "auto";
    A.enter(exBox, "body", 0, 0.06);

    const marks = Array.from(exEl.querySelectorAll(".hl"));
    const markStep = Math.min(0.45, 1.35 / Math.max(1, marks.length));
    marks.forEach((m, idx) => {
      Object.assign(m.style, {
        backgroundColor: "transparent",
        backgroundImage: `linear-gradient(90deg, ${hlTint}, ${hlTint})`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: A.ltr ? "0% 55%" : "100% 55%",
        borderBottom: "2px solid " + hlEdge,
        padding: "0.02em 0.16em",
        borderRadius: "4px",
        color: A.color("text"),
        fontWeight: 700,
        webkitBoxDecorationBreak: "clone",
        boxDecorationBreak: "clone"
      });
      Stage.tl.fromTo(
        m,
        { backgroundSize: "0% 92%" },
        { backgroundSize: "100% 92%", duration: 0.52, ease: Stage.ease("power3"), immediateRender: true },
        A.at("body", 0) + 0.34 + idx * markStep
      );
    });

    const linkStr = s.link || s.url || s.doi;
    if (linkStr) {
      const linkBox = A.el("div", "", outer, { width: "100%", height: "38px", display: "flex", alignItems: "center", gap: "10px", paddingInlineStart: "6px" });
      A.el("div", "", linkBox, { width: "8px", height: "8px", borderRadius: "2px", background: col, flexShrink: 0 });
      A.text(linkBox, linkStr, "caption", "", { fontSize: "22px", color: A.color("muted"), textAlign: "start", unicodeBidi: "plaintext" });
      A.fit(linkBox, 0.6);
      linkBox.style.height = "auto";
      A.enter(linkBox, "note", 0);
    }

    A.enter(card, "card", 0);
    A.fit(outer, 0.55);
  }
});
