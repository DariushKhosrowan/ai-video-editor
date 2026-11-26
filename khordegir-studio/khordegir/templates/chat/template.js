Stage.template({
  name: "chat",   // label, fields, example: see schema.json
  build(s, A) {
    const preset = (Stage.fx && Stage.fx.cur && Stage.fx.cur.preset) || "classic";
    const lively = preset !== "classic";
    const h = Stage.T.header(A, s, { fieldTitle: true });
    const msgs = Array.isArray(s.messages) ? s.messages : Stage.T.list(s.messages).map((l) => { const m = l.match(/^(او|من|them|me)\s*[:：]\s*(.*)$/); return m ? { from: m[1], text: m[2] } : { from: "او", text: l }; });
    const left = A.area.left, right = A.area.x;
    const panel = A.el("div", "card", A.root, { left, right, top: h.bottom + 20, bottom: A.scam ? 90 : 80, padding: "36px 40px", display: "flex", flexDirection: "column", justifyContent: "center", gap: "22px", overflow: "hidden" });
    A.field("messages", panel);
    A.enter(panel, "card", 0, -0.1, lively ? { ease: "vox" } : {});
    msgs.forEach((m, i) => {
      const me = /من|me/.test(m.from || "");
      const tone = Stage.T.tone(m.tone);
      const isLight = A.th.colors.isDark === false;
      const isAlert = lively && preset === "focus-alert" && (tone === "danger" || tone === "accent");
      const b = A.el("div", "bubble", panel, {
        alignSelf: me ? "flex-end" : "flex-start", maxWidth: "72%", padding: "18px 28px", borderRadius: "22px",
        background: tone === "danger" ? A.th.colors.bubbleRed : me ? A.th.colors.bubbleOut : A.th.colors.bubbleIn,
        border: tone === "danger" ? `2px solid ${A.th.colors.danger}` : tone === "accent" ? `2px solid ${A.th.colors.accent}` : "2px solid transparent",
        boxShadow: isAlert ? `0 12px 30px ${A.color(tone)}28` : undefined,
        [me ? "borderBottomLeftRadius" : "borderBottomRightRadius"]: "6px", transformOrigin: me ? "0% 100%" : "100% 100%",
      });
      if (m.tag) A.text(b, m.tag, "caption", "", { color: A.color(tone || "accent"), fontWeight: 700, fontSize: "26px", marginBottom: "4px" });
      const textColor = isLight ? (me ? "#fff" : A.th.colors.text) : "#fff";
      A.text(b, m.text, "body", "", { color: textColor, fontSize: "36px", fontWeight: tone === "danger" ? 700 : 400, lineHeight: 1.5 });
      const bubbleDelay = (lively && preset === "rapid-thread") ? -i * 0.14 : 0;
      const bubbleOpts = !lively ? {} : (preset === "slide-thread"
        ? { ease: "vox", x: me ? -34 : 34, y: 0, scale: 0.98 }
        : preset === "minimal-chat"
          ? { ease: "fluid", y: 12, scale: 0.99 }
          : preset === "pop-bubbles"
            ? { ease: "spring", scale: 0.9, y: 18 }
            : { ease: "vox" });
      A.enter(b, "bubble", i, bubbleDelay, bubbleOpts);
    });
    A.fit(panel, 0.5);
  }
});
