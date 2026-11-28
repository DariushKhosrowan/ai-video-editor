Stage.template({
  name: "mascot_talk",
  build(s, A) {
    const MT = window.StageMotionTokens || {};
    const W = A.W;
    const H = A.H;
    const M = A.area.x;
    const isVertical = H > W * 1.1;
    const isSquare = !isVertical && Math.abs(W - H) < 160;
    const preset = (Stage.fx && Stage.fx.cur && Stage.fx.cur.preset) || "editorial-host";
    const side = String(s.side || "left").toLowerCase() === "right" ? "right" : "left";
    const scaleBase = Number(s.scale ?? 1.0) || 1.0;

    // Phase 5 Items 15–16: Resolve Shot, Parallax Background & Lighting Config (single source of truth)
    const rawScene = Object.assign(
      {},
      (s.puppet && s.puppet.scene) || {},
      (s.scene && typeof s.scene === "object") ? s.scene : {},
      s.shot ? { shot: s.shot } : {},
      s.pushIn != null ? { pushIn: s.pushIn } : {},
      s.shotTimeline ? { shotTimeline: s.shotTimeline } : {},
      typeof s.background === "string" ? { background: s.background } : {},
      s.lighting ? { lighting: s.lighting } : {},
    );
    const sceneCfg = MT.resolveSceneConfig
      ? MT.resolveSceneConfig(rawScene)
      : { shot: "medium", pushIn: 0.025, shotTimeline: [], background: "none", parallax: 0, lighting: "studio", lightingIntensity: 0 };

    if (sceneCfg.background === "transparent" && Stage.setTransparent) {
      Stage.setTransparent(true);
    }

    // Phase 5 Item 16: Multi-layer Deterministic Parallax Scene Backdrop
    const parallaxLayers = [];
    if (sceneCfg.background && sceneCfg.background !== "none" && sceneCfg.background !== "transparent") {
      const bgRoot = A.el("div", `mt-scene-backdrop mt-bg-${sceneCfg.background}`, A.root, {
        position: "absolute",
        inset: "0",
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: "1",
      });
      bgRoot.setAttribute("data-scene-bg", sceneCfg.background);

      if (sceneCfg.background === "chroma-green") {
        bgRoot.style.background = "#00B140";
      } else {
        const addLayer = (cls, depth, html) => {
          const el = A.el("div", `mt-parallax-layer ${cls}`, bgRoot, {
            position: "absolute",
            inset: "-48px",
            willChange: "transform",
          });
          el.setAttribute("data-parallax-depth", String(depth));
          el.innerHTML = html;
          parallaxLayers.push({ el, depth });
          return el;
        };

        if (sceneCfg.background === "studio-desk") {
          addLayer("mt-bg-far", 0.25,
            `<svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
              <defs><linearGradient id="mtSdWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#111827"/><stop offset="100%" stop-color="#1E293B"/></linearGradient></defs>
              <rect width="1920" height="1080" fill="url(#mtSdWall)"/>
              <g opacity="0.16" stroke="#94A3B8" stroke-width="2">
                <rect x="120" y="90" width="240" height="240" rx="18" fill="#0F172A"/>
                <rect x="400" y="90" width="240" height="240" rx="18" fill="#0F172A"/>
                <rect x="680" y="90" width="240" height="240" rx="18" fill="#0F172A"/>
                <rect x="960" y="90" width="240" height="240" rx="18" fill="#0F172A"/>
                <rect x="1240" y="90" width="240" height="240" rx="18" fill="#0F172A"/>
                <rect x="1520" y="90" width="240" height="240" rx="18" fill="#0F172A"/>
              </g>
              <circle cx="340" cy="210" r="190" fill="#F5B700" opacity="0.10"/>
              <circle cx="1580" cy="240" r="220" fill="#38BDF8" opacity="0.10"/>
            </svg>`);
          addLayer("mt-bg-mid", 0.55,
            `<svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
              <rect x="110" y="540" width="1700" height="12" rx="6" fill="#F5B700" opacity="0.42"/>
              <rect x="1480" y="340" width="320" height="190" rx="18" fill="#0F172A" stroke="#F5B700" stroke-opacity="0.45" stroke-width="3"/>
              <text x="1640" y="452" text-anchor="middle" fill="#F5B700" opacity="0.72" font-size="38" font-weight="800" font-family="sans-serif">ON AIR</text>
            </svg>`);
          addLayer("mt-bg-fg", 0.95,
            `<svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
              <path d="M 0,880 L 1920,880 L 1920,1080 L 0,1080 Z" fill="#0B1120" stroke="#334155" stroke-width="4"/>
              <rect x="0" y="876" width="1920" height="8" fill="#F5B700" opacity="0.65"/>
            </svg>`);
        } else if (sceneCfg.background === "news-desk") {
          addLayer("mt-bg-far", 0.25,
            `<svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
              <defs><linearGradient id="mtNdBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0A1628"/><stop offset="100%" stop-color="#172554"/></linearGradient></defs>
              <rect width="1920" height="1080" fill="url(#mtNdBg)"/>
              <g stroke="#38BDF8" stroke-opacity="0.16" stroke-width="1.5" fill="none">
                <circle cx="960" cy="480" r="340"/><circle cx="960" cy="480" r="460"/><ellipse cx="960" cy="480" rx="560" ry="180"/>
              </g>
            </svg>`);
          addLayer("mt-bg-mid", 0.55,
            `<svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
              <rect x="0" y="760" width="1920" height="10" fill="#DC2626" opacity="0.75"/>
              <rect x="0" y="772" width="1920" height="4" fill="#F8FAFC" opacity="0.35"/>
            </svg>`);
          addLayer("mt-bg-fg", 0.95,
            `<svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
              <path d="M 0,900 L 1920,900 L 1920,1080 L 0,1080 Z" fill="#0F172A"/>
              <path d="M 140,900 L 1780,900 L 1720,948 L 200,948 Z" fill="#1E3A8A" opacity="0.78"/>
            </svg>`);
        } else if (sceneCfg.background === "night-city") {
          addLayer("mt-bg-far", 0.25,
            `<svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
              <defs><linearGradient id="mtNcSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#050816"/><stop offset="100%" stop-color="#1E1B4B"/></linearGradient></defs>
              <rect width="1920" height="1080" fill="url(#mtNcSky)"/>
              <circle cx="1480" cy="210" r="88" fill="#FEF3C7" opacity="0.22"/>
            </svg>`);
          addLayer("mt-bg-mid", 0.6,
            `<svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
              <g fill="#0F172A">
                <rect x="60" y="420" width="180" height="660"/><rect x="270" y="340" width="210" height="740"/>
                <rect x="520" y="480" width="190" height="600"/><rect x="760" y="300" width="240" height="780"/>
                <rect x="1060" y="410" width="220" height="670"/><rect x="1340" y="350" width="230" height="730"/>
                <rect x="1620" y="450" width="240" height="630"/>
              </g>
              <g fill="#FBBF24" opacity="0.5">
                <rect x="310" y="400" width="22" height="32"/><rect x="360" y="400" width="22" height="32"/>
                <rect x="810" y="360" width="26" height="36"/><rect x="880" y="420" width="26" height="36"/>
                <rect x="1390" y="410" width="24" height="34"/><rect x="1460" y="470" width="24" height="34"/>
              </g>
            </svg>`);
          addLayer("mt-bg-fg", 0.95,
            `<svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
              <rect x="0" y="885" width="1920" height="195" fill="#090D18"/>
              <rect x="0" y="882" width="1920" height="5" fill="#38BDF8" opacity="0.45"/>
            </svg>`);
        } else if (sceneCfg.background === "warm-library") {
          addLayer("mt-bg-far", 0.25,
            `<svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
              <defs><radialGradient id="mtWlGlow" cx="50%" cy="35%" r="70%"><stop offset="0%" stop-color="#3B2314"/><stop offset="100%" stop-color="#170E09"/></radialGradient></defs>
              <rect width="1920" height="1080" fill="url(#mtWlGlow)"/>
            </svg>`);
          addLayer("mt-bg-mid", 0.55,
            `<svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
              <g fill="#451A03" opacity="0.72">
                <rect x="80" y="240" width="1760" height="18"/><rect x="80" y="460" width="1760" height="18"/><rect x="80" y="680" width="1760" height="18"/>
              </g>
              <g opacity="0.55">
                <rect x="140" y="130" width="38" height="110" fill="#B45309"/><rect x="188" y="148" width="32" height="92" fill="#991B1B"/>
                <rect x="230" y="120" width="44" height="120" fill="#1E3A8A"/><rect x="1560" y="340" width="40" height="120" fill="#92400E"/>
                <rect x="1612" y="356" width="34" height="104" fill="#065F46"/><rect x="1658" y="330" width="46" height="130" fill="#7C2D12"/>
              </g>
            </svg>`);
          addLayer("mt-bg-fg", 0.9,
            `<svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
              <rect x="0" y="885" width="1920" height="195" fill="#27140B"/>
              <rect x="0" y="882" width="1920" height="6" fill="#D97706" opacity="0.55"/>
            </svg>`);
        } else {
          // gradient-cyclorama
          addLayer("mt-bg-far", 0.35,
            `<svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
              <defs><radialGradient id="mtCyc" cx="50%" cy="42%" r="72%"><stop offset="0%" stop-color="#1E293B"/><stop offset="65%" stop-color="#0F172A"/><stop offset="100%" stop-color="#020617"/></radialGradient></defs>
              <rect width="1920" height="1080" fill="url(#mtCyc)"/>
              <ellipse cx="960" cy="960" rx="880" ry="180" fill="#38BDF8" opacity="0.08"/>
            </svg>`);
        }
      }
    }

    // Phase 5 Item 16: Subtle Stage Lighting Wash matching sceneCfg.lighting
    if (sceneCfg.lighting && sceneCfg.lighting !== "studio" && sceneCfg.lightingIntensity > 0.01) {
      const lSpec = (MT.LIGHTING_PRESETS && MT.LIGHTING_PRESETS[sceneCfg.lighting]) || {};
      const wash = A.el("div", `mt-lighting-wash mt-light-${sceneCfg.lighting}`, A.root, {
        position: "absolute",
        inset: "0",
        pointerEvents: "none",
        zIndex: "45",
      });
      wash.setAttribute("data-lighting-preset", sceneCfg.lighting);
      const alpha = Math.min(0.45, Math.max(0.05, (lSpec.tintAlpha || 0.14) * sceneCfg.lightingIntensity));
      const rim = lSpec.rimColor || "#F5B700";
      if (sceneCfg.lighting === "rim-light") {
        wash.style.background = `radial-gradient(ellipse 75% 80% at ${side === "left" ? "18%" : "82%"} 56%, ${rim}33 0%, transparent 55%)`;
      } else if (sceneCfg.lighting === "dramatic-noir") {
        wash.style.background = `radial-gradient(ellipse 68% 72% at 50% 48%, transparent 32%, rgba(0,0,0,${(0.42 * sceneCfg.lightingIntensity).toFixed(2)}) 100%)`;
      } else {
        wash.style.background = `linear-gradient(135deg, ${lSpec.tintColor || rim} 0%, transparent 62%)`;
        wash.style.opacity = alpha.toFixed(3);
      }
    }

    // Phase 5 Item 15: Shot Framing Rig Wrapper (strictly obeys STAGE_ZOOM_CAP = 1.06)
    const shotRig = A.el("div", "mt-shot-rig", A.root, {
      position: "absolute",
      inset: "0",
      transformOrigin: "50% 62%",
      willChange: "transform",
      zIndex: "20",
    });
    shotRig.setAttribute("data-shot-preset", sceneCfg.shot);

    const bindSceneCamera = (durSec) => {
      Stage.onSeek((t) => {
        const shotState = MT.evaluateShotAt
          ? MT.evaluateShotAt(sceneCfg, t, durSec)
          : { shot: sceneCfg.shot, zoom: 1.0, offsetX: 0, offsetY: 0, progress: 0 };
        const clampedZoom = Math.min(MT.STAGE_ZOOM_CAP || 1.06, Math.max(0.75, Number(shotState.zoom) || 1));
        const ox = Number(shotState.offsetX || 0);
        const oy = Number(shotState.offsetY || 0);
        shotRig.style.transform = `translate(${ox.toFixed(2)}px, ${oy.toFixed(2)}px) scale(${clampedZoom.toFixed(5)})`;
        shotRig.setAttribute("data-active-shot", shotState.shot);
        Stage._shotState = Object.assign({}, shotState, { zoom: clampedZoom, background: sceneCfg.background, lighting: sceneCfg.lighting });

        // Deterministic multi-layer parallax driven purely from t & sceneCfg.parallax
        if (parallaxLayers.length && sceneCfg.parallax > 0) {
          const driftX = (Math.sin(t * 0.42) * 18 + (shotState.progress - 0.5) * 16) * sceneCfg.parallax;
          const driftY = (Math.cos(t * 0.31) * 7 + oy * 0.14) * sceneCfg.parallax;
          for (let i = 0; i < parallaxLayers.length; i += 1) {
            const pl = parallaxLayers[i];
            const px = driftX * pl.depth;
            const py = driftY * pl.depth;
            pl.el.style.transform = `translate3d(${px.toFixed(2)}px, ${py.toFixed(2)}px, 0px)`;
          }
        }
      });
    };

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

    // Phase 4 Item 12 & Phase 5 Item 15: Multi-character Dialogue Mode (two-shot framing across 16:9, 9:16, 1:1)
    const dialogue = (s.dialogue && typeof s.dialogue === "object" && Array.isArray(s.dialogue.characters) && s.dialogue.characters.length >= 2)
      ? s.dialogue
      : null;

    if (dialogue && window.StageMascot) {
      if (!rawScene.shot) sceneCfg.shot = "two-shot";
      const dlgCardH = isVertical ? 360 : isSquare ? 240 : 230;
      const dlgCard = A.el("div", "card mt-card mt-dialogue-card", shotRig, {
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
          { scene: sceneCfg },
        );
        const inst = window.StageMascot.createMascotInstance(shotRig, {
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
        if (Stage.registerMascot) Stage.registerMascot(inst);
        if (idx === 0) A.field("mascot", inst.container);
        dlgInstances.push(inst);
      });
      Stage._dialogueMascots = dlgInstances;
      bindSceneCamera(dur);
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

    const card = A.el("div", "card mt-card " + (isVertical ? "" : (side === "left" ? "mt-card-tail-left" : "mt-card-tail-right")), shotRig, Object.assign({
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
        { scene: sceneCfg },
      );

      const inst = window.StageMascot.createMascotInstance(shotRig, {
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
      bindSceneCamera(dur);
      Stage.onSeek((t) => { if (!Stage._liveVoiceActive) inst.seek(t); });
    }
  },
});
