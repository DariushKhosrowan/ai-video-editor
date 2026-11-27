Stage.template({
  name: "mascot_talk",
  build(s, A) {
    const W = A.W;
    const H = A.H;
    const M = A.area.x;
    const isVertical = H > W * 1.1;
    const isSquare = !isVertical && Math.abs(W - H) < 160;
    const preset = (Stage.fx && Stage.fx.cur && Stage.fx.cur.preset) || "editorial-host";
    const side = String(s.side || "left").toLowerCase() === "right" ? "right" : "left";
    const scaleBase = Number(s.scale ?? 1.0) || 1.0;

    // Responsive mascot scale & coordinates across 16:9, 9:16, 1:1
    const effScale = isVertical
      ? scaleBase * 1.18
      : isSquare
        ? scaleBase * 0.88
        : scaleBase * 1.06;

    const rigBoxW = 460 * effScale;
    const rigBoxH = 518 * effScale;

    let defaultX;
    let defaultY;
    if (isVertical) {
      defaultX = side === "right" ? W - rigBoxW - 64 : (W - rigBoxW) / 2;
      defaultY = H - rigBoxH - 48;
    } else if (isSquare) {
      defaultX = side === "right" ? W - rigBoxW - 36 : 36;
      defaultY = H - rigBoxH - 36;
    } else {
      defaultX = side === "right" ? W - rigBoxW - 58 : 58;
      defaultY = H - rigBoxH - 28;
    }

    const posX = (s.position_x != null && s.position_x !== "") ? Number(s.position_x) : defaultX;
    const posY = (s.position_y != null && s.position_y !== "") ? Number(s.position_y) : defaultY;

    // Phase 4 Item 12: Multi-character Dialogue Mode (two-shot framing across 16:9, 9:16, 1:1)
    const dialogue = (s.dialogue && typeof s.dialogue === "object" && Array.isArray(s.dialogue.characters) && s.dialogue.characters.length >= 2)
      ? s.dialogue
      : null;

    if (dialogue && window.StageMascot) {
      // Compact top header card in dialogue mode so both characters have generous clean breathing room
      const dlgCardH = isVertical ? 360 : isSquare ? 240 : 230;
      const dlgCard = A.el("div", "card mt-card mt-dialogue-card", A.root, {
        position: "absolute",
        left: M + "px",
        right: M + "px",
        top: (A.area.y + 8) + "px",
        height: dlgCardH + "px",
      });
      A.field("card", dlgCard);
      A.el("div", "mt-card-accent-bar", dlgCard);
      A.enter(dlgCard, "card", 0, 0, { ease: "vox" });
      if (s.eyebrow) {
        const ey = A.text(dlgCard, s.eyebrow, "eyebrow", "", { fontSize: "28px" });
        A.field("eyebrow", ey);
      }
      if (s.title) {
        const tEl = A.text(dlgCard, s.title, "hero", "", { fontSize: (isVertical ? 48 : 54) + "px" });
        A.field("title", tEl);
      }
      if (s.text || s.body) {
        const bEl = A.text(dlgCard, s.text || s.body, "body", "", { fontSize: (isVertical ? 28 : 30) + "px" });
        A.field("text", bEl);
      }
      A.fit(dlgCard, 0.55);

      const dur = +s.duration || Math.max(A.th.clip.min || 5, Number(dialogue.duration) || 6);
      const dlgInstances = [];
      const chars = dialogue.characters.slice(0, 3);
      chars.forEach((ch, idx) => {
        const chSide = ch.side === "right" ? "right" : (ch.side === "left" ? "left" : (idx % 2 === 0 ? "left" : "right"));
        const chScale = (Number(ch.scale) || 0.86) * (isVertical ? 0.84 : isSquare ? 0.78 : 0.94);
        const bw = 460 * chScale;
        const bh = 518 * chScale;
        let cx;
        let cy = H - bh - (isVertical ? 54 : 24);
        if (chars.length === 2) {
          cx = chSide === "left"
            ? Math.max(24, Math.round(W * 0.24 - bw * 0.5))
            : Math.min(W - bw - 24, Math.round(W * 0.76 - bw * 0.5));
        } else {
          const step = (W - bw - 60) / Math.max(1, chars.length - 1);
          cx = Math.round(30 + idx * step);
        }

        const chPuppet = Object.assign(
          {},
          ch.puppet || {},
          ch.character ? { character: ch.character } : {},
          ch.outfit ? { outfit: ch.outfit } : {},
          ch.skin ? { skin: ch.skin } : {},
        );
        const inst = window.StageMascot.createMascotInstance(A.root, {
          side: chSide,
          scale: chScale,
          x: cx,
          y: cy,
          expression: ch.expression || "neutral",
          look_at: "other",
          enter: s.enter || "slide-in",
          exit: s.exit || "none",
          accents: s.accents !== false,
          visemeTrack: ch.visemeTrack || null,
          prosodyTrack: ch.prosodyTrack || null,
          puppet: chPuppet,
          dialogue,
          speakerId: ch.id,
          duration: dur,
          fps: Stage.fps || 30,
          seed: `${s._seed || "mt"}:dlg:${ch.id}`,
          stageW: W,
          stageH: H,
          zIndex: 28 + idx,
        });
        if (idx === 0 && Stage.registerMascot) Stage.registerMascot(inst);
        if (idx === 0) A.field("mascot", inst.container);
        dlgInstances.push(inst);
      });
      Stage._dialogueMascots = dlgInstances;
      Stage.onSeek((t) => {
        if (!Stage._liveVoiceActive) {
          for (let i = 0; i < dlgInstances.length; i += 1) dlgInstances[i].seek(t);
        }
      });
      return;
    }

    // Card area cleanly avoids overlapping the mascot across all aspect ratios
    let cardBox;
    if (isVertical) {
      cardBox = {
        left: M,
        right: M,
        top: A.area.y + 10,
        height: Math.max(460, Math.round(H * 0.46)),
      };
    } else if (isSquare) {
      const mReserve = Math.round(rigBoxW + 56);
      cardBox = {
        left: side === "left" ? mReserve : M,
        right: side === "right" ? mReserve : M,
        top: A.area.y + 12,
        height: Math.round(H * 0.62),
      };
    } else {
      const mReserve = Math.max(540, Math.round(rigBoxW + 96));
      cardBox = {
        left: side === "left" ? mReserve : M,
        right: side === "right" ? mReserve : M,
        top: A.area.y + 30,
        bottom: 92,
      };
    }

    const card = A.el("div", "card mt-card " + (isVertical ? "" : (side === "left" ? "mt-card-tail-left" : "mt-card-tail-right")), A.root, Object.assign({
      position: "absolute",
    }, cardBox));
    A.field("card", card);

    if (preset !== "podcast-desk") {
      A.el("div", "mt-card-accent-bar", card);
    }

    A.enter(card, "card", 0, 0, { ease: "vox" });

    if (s.eyebrow) {
      const ey = A.text(card, s.eyebrow, "eyebrow", "", { fontSize: isVertical ? "32px" : "34px" });
      A.field("eyebrow", ey);
      A.enter(ey, "eyebrow", 0, 0.05, { ease: "vox" });
    }

    if (s.title) {
      const len = String(s.title).length;
      const fs = isVertical ? (len > 36 ? 50 : 62) : isSquare ? (len > 32 ? 46 : 56) : (len > 36 ? 56 : 70);
      const tEl = A.text(card, s.title, "hero", "", { fontSize: fs + "px" });
      A.field("title", tEl);
      if (preset === "debate-card") {
        A.kinetic(tEl, { at: A.at("title"), mode: "glide-rtl", role: "title", stagger: 0.04, ease: "vox" });
      } else {
        A.kinetic(tEl, { at: A.at("title"), mode: "rise-mask", role: "title", stagger: 0.036, ease: "power4" });
      }
    }

    if (preset === "editorial-host" || preset === "debate-card") {
      A.sweepLine(card, { width: 140, height: 6, origin: "100% 50%", at: A.at("body") });
    }

    const bodyText = s.text ?? s.body;
    if (bodyText) {
      const bEl = A.text(card, bodyText, "body", "", { fontSize: isVertical ? "32px" : isSquare ? "28px" : "36px" });
      A.field("text", bEl);
      A.enter(bEl, "body", 0, 0.05, { ease: "fluid" });
    }

    if (s.image) {
      const slotH = isVertical ? 260 : isSquare ? 210 : 300;
      const slotW = isVertical ? (W - 2 * M - 104) : isSquare ? 460 : 620;
      const slot = A.el("div", "mt-media-slot", card, { width: slotW + "px", height: slotH + "px" });
      const fr = A.image(slot, s.image, 0, 0, slotW, slotH, {
        motion: s.motion || "breathe",
        fit: s.fit || "cover",
        reveal: "wipe",
        delay: 0.14,
      });
      A.field("image", fr);
    }

    A.fit(card, 0.52);

    // Mount Mascot SVG Rig synced frame-accurately via Stage.onSeek
    if (window.StageMascot) {
      const sayDur = Stage.estimateSayDuration ? Stage.estimateSayDuration(s) : null;
      const vt = s.visemeTrack || (typeof s.viseme_track === "object" ? s.viseme_track : null);
      const pt = s.prosodyTrack || (typeof s.prosody_track === "object" ? s.prosody_track : null);
      const trackDur = Math.max(
        vt && Number(vt.duration) ? Number(vt.duration) : 0,
        pt && Number(pt.duration) ? Number(pt.duration) : 0,
      );
      const dur = +s.duration || Math.max(A.th.clip.min || 5, sayDur || 0, trackDur || 0);
      const soloPuppet = Object.assign(
        {},
        s.puppet || (s.mascot && s.mascot.puppet) || {},
        s.character ? { character: s.character } : {},
        s.outfit ? { outfit: s.outfit } : {},
        s.skin ? { skin: s.skin } : {},
      );

      const inst = window.StageMascot.createMascotInstance(A.root, {
        side,
        scale: effScale,
        x: posX,
        y: posY,
        expression: s.expression || "neutral",
        expression_timeline: s.expression_timeline || s.expressions || [],
        look_at: s.look_at || "auto",
        enter: s.enter || "slide-in",
        exit: s.exit || "none",
        accents: s.accents !== false,
        say: s.say || s.text || s.title || "",
        visemeTrack: vt,
        prosodyTrack: pt,
        tone: (s.mascot && s.mascot.tone) || s.tone || null,
        puppet: soloPuppet,
        duration: dur,
        fps: Stage.fps || 30,
        seed: `${s._seed || "mt"}:${s.seed || 0}`,
        stageW: W,
        stageH: H,
      });
      if (Stage.registerMascot) Stage.registerMascot(inst);
      A.field("mascot", inst.container);
      Stage.onSeek((t) => { if (!Stage._liveVoiceActive) inst.seek(t); });
    }
  },
});
