Stage.template({
  name: "chapter_card",
  build(s, A) {
    const tone = s.tone === "good" || s.tone === "info" ? s.tone : (Stage.T.tone(s.tone) || "accent");
    const col = A.color(tone);
    const alpha = (c, a) => {
      const m = /^#([0-9a-f]{6})$/i.exec(String(c || "").trim());
      if (!m) return `color-mix(in srgb, ${c} ${Math.round(a * 100)}%, transparent)`;
      const n = parseInt(m[1], 16);
      return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
    };

    const cam = A.L.cam || [24, 740, 584, 1055];
    const safeCamTop = Math.min(A.area.camTop || (cam[1] - 20), cam[1] - 20);
    // In SCAM, keep entire full-width band strictly above the bottom-left camera box
    const bandH = A.scam ? Math.min(480, safeCamTop - 130) : 520;
    const bandTop = A.scam ? Math.round((safeCamTop - bandH) / 2) + 20 : Math.round((A.H - bandH) / 2);

    const band = A.el("div", "abs", A.root, {
      left: "0px", right: "0px", top: bandTop, height: bandH,
      background: alpha(col, 0.14),
      transformOrigin: A.originStart
    });
    const topLine = A.el("div", "abs", A.root, { left: "0px", right: "0px", top: bandTop, height: "5px", background: col, transformOrigin: A.originStart });
    const botLine = A.el("div", "abs", A.root, { left: "0px", right: "0px", top: bandTop + bandH - 5, height: "5px", background: col, transformOrigin: A.originStart });

    const inner = A.el("div", "abs", A.root, {
      left: A.L.margin, right: A.L.margin, top: bandTop + 36, height: bandH - 72,
      display: "flex", alignItems: "center", gap: "44px"
    });

    const numRaw = String(s.number ?? "").trim();
    const latNum = numRaw.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
    const isNumeric = /^\d+$/.test(latNum);

    if (numRaw || s.prefix) {
      const numWrap = A.el("div", "", inner, {
        flexShrink: 0, display: "flex", alignItems: "center",
        maxWidth: "460px", height: "100%"
      });
      if (isNumeric) {
        const numEl = A.el("div", "t-number", numWrap, {
          fontSize: (A.scam ? 116 : 136) + "px", color: col,
          lineHeight: 1.0, whiteSpace: "nowrap"
        });
        A.count(numEl, { to: +latNum, from: 0, prefix: s.prefix || "", decimals: 0, at: 0.24, dur: 0.85 });
      } else {
        A.text(numWrap, (s.prefix || "") + numRaw, "number", "", {
          fontSize: (A.scam ? 84 : 98) + "px", color: col,
          lineHeight: 1.05, whiteSpace: "nowrap"
        });
      }
      A.fit(numWrap, 0.55);
      Stage.tl.fromTo(numWrap, { opacity: 0, x: A.sign * 36 }, { opacity: 1, x: 0, duration: 0.48, ease: Stage.ease("power4"), immediateRender: true }, 0.20);

      const sep = A.el("div", "", inner, { width: "2px", height: "62%", background: alpha(col, 0.42), flexShrink: 0, transformOrigin: "top center" });
      Stage.tl.fromTo(sep, { scaleY: 0 }, { scaleY: 1, duration: 0.42, ease: Stage.ease("power3"), immediateRender: true }, 0.28);
    }

    const textCol = A.el("div", "", inner, {
      flex: 1, minWidth: "0px", height: "100%",
      display: "flex", flexDirection: "column", justifyContent: "center", gap: "14px"
    });
    A.enter(A.text(textCol, s.title || "", "hero", "", { fontSize: A.scam ? "64px" : "76px", lineHeight: 1.12, textAlign: "start" }), "title", 0, 0.12);
    if (s.subtitle) {
      A.enter(A.text(textCol, s.subtitle, "body", "", { fontSize: A.scam ? "30px" : "34px", color: A.color("muted"), lineHeight: 1.38, textAlign: "start" }), "body", 0, 0.16);
    }
    A.fit(textCol, 0.5);

    Stage.tl.fromTo(band, { scaleX: 0 }, { scaleX: 1, duration: 0.52, ease: Stage.ease("expo"), immediateRender: true }, 0.04);
    Stage.tl.fromTo([topLine, botLine], { scaleX: 0 }, { scaleX: 1, duration: 0.58, ease: Stage.ease("power4"), immediateRender: true }, 0.08);
  }
});
