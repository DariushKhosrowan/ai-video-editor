Stage.template({
  name: "podcast_question",
  build(s, A) {
    const th = A.th, colColors = th.colors || {};
    const preset = (Stage.fx && Stage.fx.cur && Stage.fx.cur.preset) || "classic";
    const lively = preset !== "classic";
    const left = A.area.left;
    const right = A.area.x;

    const card = A.el("div", "col card acc-b podcast-card-surface", A.root, {
      right,
      left,
      top: A.area.y + 20,
      bottom: A.scam ? 140 : 120,
      padding: "52px 58px",
      gap: "24px",
      alignItems: "flex-start",
      justifyContent: "center",
      boxShadow: (lively && preset === "spotlight") ? `0 20px 52px ${colColors.accent || "#F5B700"}22` : undefined,
    });

    if (lively && preset === "editorial-mark") {
      const mark = A.el("div", "abs", card, {
        left: "44px", top: "24px", fontSize: "160px", fontWeight: 900, lineHeight: 0.8,
        color: colColors.accent || "#F5B700", opacity: 0.12, pointerEvents: "none",
      });
      mark.textContent = "؟";
      Stage.tl.from(mark, { opacity: 0, scale: 0.85, duration: 0.7, ease: Stage.ease("vox"), immediateRender: true }, 0.14);
    }

    const topRow = A.el("div", "", card, {
      display: "flex",
      alignItems: "center",
      gap: "16px",
      flexWrap: "wrap",
    });

    if (s.badge) {
      const bd = A.text(topRow, s.badge, "caption", "badge acc");
      A.enter(bd, "badge", 0, 0, lively ? { ease: "vox" } : {});
    }
    if (s.author) {
      const au = A.text(topRow, s.author, "caption", "mut");
      A.field("author", au);
      A.enter(au, "eyebrow", 0, 0, lively ? { ease: "fluid" } : {});
    }

    const qEl = A.text(card, s.title || s.text || "", "hero", "", {
      fontSize: (s.size || 68) + "px",
      maxWidth: "1360px",
    });
    A.field("title", qEl);
    const kinMode = preset === "glitch-pop" ? "pop-clean" : preset === "spotlight" ? "editorial-blur" : "rise-mask";
    if (lively) {
      A.kinetic(qEl, { at: A.at("title"), mode: kinMode, role: "title", stagger: 0.044, ease: preset === "glitch-pop" ? "spring" : "vox" });
    } else {
      A.enter(qEl, "title");
    }

    const pts = A.list(s.items);
    if (pts.length) {
      const listWrap = A.el("div", "", card, {
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        marginTop: "8px",
        width: "100%",
      });
      A.field("items", listWrap);
      pts.forEach((pt, idx) => {
        const row = A.el("div", "", listWrap, {
          display: "flex",
          alignItems: "center",
          gap: "14px",
          padding: "14px 20px",
          borderRadius: "12px",
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${colColors.cardBorder || "rgba(255,255,255,0.12)"}`,
        });
        A.text(row, "◀", "body", "acc", { fontSize: "24px" });
        A.text(row, pt, "body", "", { fontSize: "30px" });
        A.enter(row, "card", idx, 0.25, lively ? { ease: "vox" } : {});
      });
    }

    A.enter(card, "card", 0, 0, lively ? { ease: "vox" } : {});
    A.fit(card, 0.55);
  },
});
