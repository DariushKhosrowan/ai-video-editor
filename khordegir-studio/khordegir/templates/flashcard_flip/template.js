Stage.template({
  name: "flashcard_flip",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const col = A.th.colors || {};
    const padX = asp.isPortrait ? 52 : A.area.x;
    const leftEdge = asp.isPortrait ? 52 : A.area.left;
    const topY = asp.isPortrait ? 115 : A.area.y + 10;
    const flipAt = Math.max(1.0, Number(s.flip_at) || 2.4);
    const flipDur = A.dur("expressive");

    const ey = A.text(A.root, s.eyebrow || "فلش‌کارت آموزشی", "eyebrow", "abs", {
      right: padX, top: topY, color: A.color("accent"), fontSize: "28px",
    });
    A.field("eyebrow", ey);
    A.enter(ey, "eyebrow");

    // Countdown progress bar until flip
    const barTrack = A.el("div", "abs", A.root, {
      left: leftEdge, right: padX, top: topY + 58, height: "8px",
      borderRadius: "999px", background: "rgba(255,255,255,0.12)", overflow: "hidden",
    });
    const barFill = A.el("div", "", barTrack, {
      width: "100%", height: "100%", background: A.color("accent"), transformOrigin: "100% 50%",
    });
    Stage.tl.fromTo(barFill, { scaleX: 1 }, { scaleX: 0, duration: flipAt, ease: "none", immediateRender: true }, 0.15);

    const cardBox = A.el("div", "abs", A.root, {
      left: leftEdge, right: padX, top: topY + 96, bottom: A.scam ? 110 : (asp.isPortrait ? 150 : 96),
      perspective: "1400px",
    });

    // Front Face (Question)
    const frontFace = A.el("div", "abs card", cardBox, {
      inset: 0, padding: asp.isPortrait ? "44px 36px" : "56px 64px",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: "24px",
      borderTop: `8px solid ${A.color("accent")}`,
    });
    A.text(frontFace, "پرسش · QUESTION", "caption", "", {
      color: A.color("accent"), fontWeight: 900, fontSize: "24px", letterSpacing: "0.08em",
    });
    const frontTxt = A.text(frontFace, s.front || "", "h1", "", {
      fontSize: asp.isPortrait ? "50px" : "60px", lineHeight: 1.4, maxWidth: "92%",
    });
    A.field("front", frontTxt);
    A.kinetic(frontTxt, { at: A.at("title"), mode: s.textMotion || s.text_motion || "rise-mask", role: "title" });

    // Back Face (Answer)
    const backFace = A.el("div", "abs card", cardBox, {
      inset: 0, padding: asp.isPortrait ? "44px 36px" : "56px 64px",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: "24px",
      borderTop: `8px solid ${A.color("good")}`, opacity: 0,
    });
    A.text(backFace, "پاسخ صحیح · ANSWER", "caption", "", {
      color: A.color("good"), fontWeight: 900, fontSize: "24px", letterSpacing: "0.08em",
    });
    const backTxt = A.text(backFace, s.back || "", "h1", "", {
      fontSize: asp.isPortrait ? "46px" : "54px", lineHeight: 1.48, maxWidth: "92%",
    });
    A.field("back", backTxt);

    if (s.hint) {
      const hintEl = A.text(backFace, s.hint, "caption", "", { color: col.muted, fontSize: "26px", marginTop: "8px" });
      A.field("hint", hintEl);
    }

    // Deterministic seek-driven flip transition (zero flicker, works identically in headless & browser)
    const applyFlipAt = (t) => {
      const u = Math.max(0, Math.min(1, (t - flipAt) / Math.max(0.25, flipDur)));
      const smooth = u * u * (3 - 2 * u);
      if (smooth < 0.5) {
        const k = 1 - smooth * 2;
        frontFace.style.opacity = "1";
        frontFace.style.transform = `scaleX(${Math.max(0.02, k).toFixed(3)})`;
        backFace.style.opacity = "0";
        backFace.style.transform = "scaleX(0.02)";
      } else {
        const k = (smooth - 0.5) * 2;
        frontFace.style.opacity = "0";
        frontFace.style.transform = "scaleX(0.02)";
        backFace.style.opacity = "1";
        backFace.style.transform = `scaleX(${Math.max(0.02, k).toFixed(3)})`;
      }
    };
    applyFlipAt(0);
    Stage.onSeek(applyFlipAt);
    Stage.tl.to({ _f: 0 }, { _f: 1, duration: flipDur, ease: "none" }, flipAt);
    if (Stage.fx) Stage.fx.cue(flipAt, "whoosh", "flip");
  },
});
