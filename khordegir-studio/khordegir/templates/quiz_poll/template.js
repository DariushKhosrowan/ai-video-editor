Stage.template({
  name: "quiz_poll",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const col = A.th.colors || {};
    const isLight = col.isDark === false;
    const accent = A.color("accent");
    const okColor = "#16A34A";
    const padX = asp.isPortrait ? 52 : A.area.x;
    const leftEdge = asp.isPortrait ? 52 : A.area.left;

    const h = Stage.T.header(A, { eyebrow: s.eyebrow, title: s.question || s.title }, {
      fieldTitle: true, fieldEyebrow: true, left: leftEdge, titleRole: "h1",
    });
    if (h.el) {
      const tNode = h.el.querySelector(".t-h1");
      if (tNode) A.field("question", tNode);
    }

    // Parse options (array of strings/objects or newline text)
    const rawOpts = Array.isArray(s.options) ? s.options : Stage.T.list(s.options);
    const options = (rawOpts.length ? rawOpts : ["گزینه اول", "گزینه دوم", "گزینه سوم"]).map((item, idx) => {
      if (typeof item === "object" && item) {
        return { text: String(item.text || item.label || ""), percent: item.percent != null ? Number(item.percent) : null };
      }
      return { text: String(item).replace(/^[۰-۹\d]+[.)\-:\s]+/, "").trim() || String(item), percent: null };
    });

    const correctIdx = Number(s.correct_index || 0) - 1;
    const revealAt = Math.max(1.2, Number(s.reveal_at ?? 2.4));

    // Deterministic countdown progress track
    const timerY = h.bottom + 24;
    const timerTrack = A.el("div", "abs", A.root, {
      left: leftEdge, right: padX, top: timerY, height: "8px",
      borderRadius: "6px", overflow: "hidden",
      background: isLight ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.10)",
    });
    const timerFill = A.el("div", "", timerTrack, {
      width: "100%", height: "100%", background: accent, transformOrigin: "100% 50%",
    });
    Stage.tl.fromTo(timerFill, { scaleX: 1 }, { scaleX: 0, duration: Math.max(0.6, revealAt - 0.5), ease: "none", immediateRender: true }, 0.5);

    const gridTop = timerY + 34;
    const botSpace = s.explanation ? (A.scam ? 176 : 156) : (A.scam ? 104 : 84);
    const useTwoCols = !asp.isPortrait && options.length >= 4;

    const listEl = A.el("div", "abs", A.root, {
      left: leftEdge, right: padX, top: gridTop, bottom: botSpace,
      display: "grid",
      gridTemplateColumns: useTwoCols ? "1fr 1fr" : "1fr",
      gap: "20px",
      alignContent: "center",
    });
    A.field("options", listEl);

    const letters = ["الف", "ب", "ج", "د", "هـ", "و"];
    options.forEach((opt, i) => {
      const isCorrect = correctIdx >= 0 && i === correctIdx;
      const card = A.el("div", "card", listEl, {
        position: "relative", overflow: "hidden",
        padding: asp.isPortrait ? "24px 28px" : "26px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: "20px",
        borderColor: isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)",
      });

      // Optional poll fill bar or correct highlight sweep
      const fill = A.el("div", "abs", card, {
        inset: 0, pointerEvents: "none", transformOrigin: "100% 50%",
        background: isCorrect ? "rgba(22,163,74,0.18)" : `${accent}18`,
        zIndex: 0,
      });
      Stage.tl.set(fill, { scaleX: 0 }, 0);

      const leftGrp = A.el("div", "", card, {
        display: "flex", alignItems: "center", gap: "20px", position: "relative", zIndex: 1,
      });
      const idxTag = A.el("div", "tnum", leftGrp, {
        width: "52px", height: "52px", borderRadius: "10px",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)",
        color: accent, fontWeight: 900, fontSize: "28px", flex: "0 0 auto",
      });
      idxTag.textContent = letters[i] || Stage.fa(String(i + 1));

      A.text(leftGrp, opt.text, "h1", "", { fontSize: asp.isPortrait ? "34px" : "36px", fontWeight: 700 });

      if (opt.percent != null) {
        const pctEl = A.el("div", "tnum", card, {
          position: "relative", zIndex: 1, fontSize: "34px", fontWeight: 900, color: accent,
        });
        pctEl.textContent = Stage.fa(opt.percent + "٪");
        Stage.tl.to(fill, { scaleX: Math.max(0.02, Math.min(1, opt.percent / 100)), duration: A.dur("expressive"), ease: Stage.ease("vox") }, revealAt);
      } else if (correctIdx >= 0) {
        if (isCorrect) {
          Stage.tl.to(fill, { scaleX: 1, duration: A.dur("base"), ease: Stage.ease("vox") }, revealAt);
          Stage.tl.to(card, { borderColor: okColor, scale: 1.02, duration: A.dur("snappy"), ease: Stage.ease("spring") }, revealAt);
          Stage.tl.to(idxTag, { backgroundColor: okColor, color: "#FFFFFF", duration: A.dur("snappy") }, revealAt);
        } else {
          Stage.tl.to(card, { opacity: 0.45, duration: A.dur("base"), ease: Stage.ease("fluid") }, revealAt);
        }
      }

      A.enter(card, "card", i, 0, { ease: "vox" });
    });

    if (s.explanation) {
      const exp = A.el("div", "abs", A.root, {
        left: leftEdge, right: padX, bottom: A.scam ? 60 : 44,
        padding: "16px 26px", borderRadius: "12px",
        background: isLight ? "rgba(22,163,74,0.10)" : "rgba(22,163,74,0.14)",
        border: `1px solid ${okColor}`,
      });
      const exTxt = A.text(exp, s.explanation, "body", "", { fontSize: "28px", color: col.text });
      A.field("explanation", exTxt);
      A.enter(exp, "body", 0, 0, { at: revealAt + 0.15, ease: "fluid" });
    }
  },
});
