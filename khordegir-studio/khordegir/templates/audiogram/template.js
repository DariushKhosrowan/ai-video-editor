Stage.template({
  name: "audiogram",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const col = A.th.colors || {};
    const isLight = col.isDark === false;
    const accent = A.color("accent");
    const padX = asp.isPortrait ? 52 : A.area.x;
    const leftEdge = asp.isPortrait ? 52 : A.area.left;

    const card = A.el("div", "card", A.root, {
      left: leftEdge, right: padX,
      top: asp.isPortrait ? 120 : Math.max(76, A.area.y),
      bottom: A.scam ? 104 : (asp.isPortrait ? 140 : 88),
      padding: asp.isPortrait ? "44px 38px" : "52px 60px",
      display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "26px",
      borderColor: isLight ? "rgba(0,0,0,0.14)" : "rgba(255,255,255,0.14)",
    });

    // Top row: avatar + speaker meta + episode badge
    const topRow = A.el("div", "", card, {
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: "24px",
      flexWrap: asp.isPortrait ? "wrap" : "nowrap",
      borderBottom: `1px solid ${isLight ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.10)"}`,
      paddingBottom: "22px",
    });

    const idGroup = A.el("div", "", topRow, { display: "flex", alignItems: "center", gap: "22px" });
    if (s.avatar) {
      const avWrap = A.el("div", "", idGroup, {
        position: "relative", width: "108px", height: "108px", borderRadius: "20px",
        overflow: "hidden", flex: "0 0 auto", border: `2px solid ${accent}`,
      });
      const im = A.el("img", "", avWrap, { width: "100%", height: "100%", objectFit: "cover", display: "block" });
      im.src = s.avatar;
      im.alt = s.speaker || "";
      Stage._imgs.push(im);
      A.field("avatar", avWrap);
    } else {
      const mono = A.el("div", "", idGroup, {
        width: "92px", height: "92px", borderRadius: "18px", flex: "0 0 auto",
        background: `${accent}22`, border: `2px solid ${accent}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "40px", fontWeight: 900, color: accent,
      });
      mono.textContent = (s.speaker || "پ").trim().slice(0, 1);
    }

    const metaCol = A.el("div", "", idGroup, { display: "flex", flexDirection: "column", gap: "4px" });
    if (s.show) {
      const sh = A.text(metaCol, s.show, "eyebrow", "", { fontSize: "24px", color: accent });
      A.field("show", sh);
    }
    const spk = A.text(metaCol, s.speaker || "", "h1", "", { fontSize: asp.isPortrait ? "38px" : "42px" });
    A.field("speaker", spk);
    if (s.role) {
      const rl = A.text(metaCol, s.role, "caption", "", { fontSize: "24px", color: col.muted });
      A.field("role", rl);
    }

    if (s.episode) {
      const ep = A.el("div", "tnum", topRow, {
        fontSize: "24px", fontWeight: 700, color: col.muted, whiteSpace: "nowrap",
      });
      ep.textContent = Stage.fa(s.episode);
      A.field("episode", ep);
    }

    // Center: Kinetic podcast quote
    const quoteEl = A.text(card, s.quote || "", "hero", "", {
      fontSize: asp.isPortrait ? "52px" : "60px", lineHeight: 1.44, maxWidth: "100%",
    });
    A.field("quote", quoteEl);
    const textMode = s.textMotion || s.text_motion || "rise-mask";
    A.kinetic(quoteEl, { at: A.at("title"), mode: textMode, role: "title" });

    // Bottom: Deterministic 32-bar animated waveform driven by Stage._seekHooks (prosodyTrack aware!)
    const waveWrap = A.el("div", "", card, {
      display: "flex", flexDirection: "column", gap: "14px",
    });
    const barCount = asp.isPortrait ? 24 : 36;
    const barBox = A.el("div", "", waveWrap, {
      height: asp.isPortrait ? "104px" : "92px",
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px",
    });

    const rng = Stage.fx ? Stage.fx.rngFor((s._seed || "aud") + ":wave") : (() => 0.5);
    const bars = [];
    for (let i = 0; i < barCount; i++) {
      const b = A.el("div", "", barBox, {
        flex: "1 1 0", height: "100%", borderRadius: "6px",
        background: i % 5 === 0 ? accent : (isLight ? "rgba(0,0,0,0.22)" : "rgba(255,255,255,0.28)"),
        transformOrigin: "50% 50%",
      });
      bars.push({
        el: b,
        freq: 2.2 + rng() * 3.8,
        phase: rng() * Math.PI * 2,
        env: 0.45 + 0.55 * Math.sin(((i + 0.5) / barCount) * Math.PI),
      });
    }

    const progTrack = A.el("div", "", waveWrap, {
      width: "100%", height: "6px", borderRadius: "4px", overflow: "hidden",
      background: isLight ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.12)",
    });
    const progFill = A.el("div", "", progTrack, {
      width: "100%", height: "100%", background: accent, transformOrigin: "100% 50%",
    });

    const prosody = s.prosodyTrack || null;
    const totalDur = Math.max(4, Number(s.duration || 8));

    const updateWave = (t) => {
      let energy = 0.72;
      if (prosody && Array.isArray(prosody.frames) && prosody.frames.length) {
        const fps = Number(prosody.fps || 30);
        const idx = Math.max(0, Math.min(prosody.frames.length - 1, Math.floor(t * fps)));
        const fr = prosody.frames[idx];
        const rms = Number((fr && (fr.rms_norm ?? fr.rms)) ?? 0.35);
        energy = 0.18 + Math.min(1, rms * 1.35) * 0.82;
      }
      for (let i = 0; i < bars.length; i++) {
        const b = bars[i];
        const wave = 0.5 + 0.5 * Math.sin(t * b.freq * Math.PI + b.phase);
        const hScale = Math.max(0.14, Math.min(1, (0.18 + 0.82 * wave) * b.env * energy));
        b.el.style.transform = `scaleY(${hScale.toFixed(3)})`;
      }
      const p = Math.max(0, Math.min(1, t / totalDur));
      progFill.style.transform = `scaleX(${p.toFixed(4)})`;
    };
    updateWave(0);
    if (Array.isArray(Stage._seekHooks)) Stage._seekHooks.push(updateWave);

    A.enter(card, "card", 0, -0.04, { ease: "vox" });
  },
});
