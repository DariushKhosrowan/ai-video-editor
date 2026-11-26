/* Khordegir Studio — Deterministic Slide Transition System
   Supports 8 classic + 6 viral slide transitions:
   Classic: soft-fade, curtain-rtl, accent-slash, iris-rise, split-curtain, diagonal-wipe, zoom-iris, shutter-bars
   Viral:   whip-pan, zoom-punch, glitch-slice, push, mask-wipe, light-leak-fade

   Design & Engineering Contracts:
   - Offline, 100% deterministic (seeded Mulberry32 via Stage.fx.rngFor, zero unseeded RNG, zero rAF).
   - Driven strictly by the paused GSAP 3 master timeline (`Stage.tl`) with `immediateRender: true`.
   - Uses true e^(-x) exponential easing from `stage/motion-tokens.js` via `Stage.ease(...)`.
   - Stage zoom cap <= 1.06 enforced via `MOTION_TOKENS.clampScale(...)`.
   - Format-proportional using `Stage.W` / `Stage.H` across landscape (1920x1080), portrait (1080x1920), square (1080x1080).
   - RTL (`fa`) & LTR (`en`) direction-aware, plus dark & light theme safe.
   - Licensing: Clean-room self-authored CSS/GSAP transition patterns (MIT-compatible), powered by GSAP 3
     (GSAP Standard "No Charge" License — vendor/gsap.min.js unmodified). */
(function () {
  "use strict";
  const S = window.Stage;
  const MT = window.MOTION_TOKENS || (S && S.MOTION);

  function resolveColor(raw, col, fallback) {
    if (!raw || raw === "auto") return fallback;
    if (raw === "accent") return col.accent || "#FFD600";
    if (raw === "danger") return col.danger || "#FF5252";
    if (raw === "bg") return col.bg || "#121212";
    if (raw === "bg2" || raw === "surface") return col.bg2 || col.surface || "#18181d";
    if (typeof S.color === "function") return S.color(raw) || fallback;
    return raw;
  }

  function resolveEase(opts, defaultEase) {
    const raw = opts && opts.ease;
    return S.ease(raw || defaultEase);
  }

  function resolveDur(opts, defaultDur, scale = 1) {
    if (opts && Number.isFinite(opts.dur) && opts.dur > 0) {
      return Math.max(0.08, opts.dur * scale);
    }
    return defaultDur;
  }

  function resolveHorizontalAxis(dirOpt, isEn) {
    if (dirOpt === "left") return { dx: -1, dy: 0, edge: "left" };
    if (dirOpt === "right") return { dx: 1, dy: 0, edge: "right" };
    if (dirOpt === "up") return { dx: 0, dy: -1, edge: "up" };
    if (dirOpt === "down") return { dx: 0, dy: 1, edge: "down" };
    // Auto follows reading direction (RTL enters from right/moves left; LTR enters from left/moves right)
    return isEn ? { dx: -1, dy: 0, edge: "left" } : { dx: 1, dy: 0, edge: "right" };
  }

  function apply(stage, slide, th, fxCur) {
    const cur = fxCur || (S.fx && S.fx.cur) || {};
    const mode = cur.transition || "soft-fade";
    const opts = cur.transitionOpts || {};
    const T = MT.transitions;
    const clip = (th && th.clip) || MT.clip;
    const col = (th && th.colors) || {};
    const W = S.W || 1920;
    const H = S.H || 1080;
    const isEn = S._lang === "en";
    const dir = isEn ? -1 : 1;
    const isLight = col.isDark === false;
    const intensity = Number.isFinite(opts.intensity) ? opts.intensity : 1;
    const content = stage.querySelector(".content");

    /* ------------------------------------------------------------ 1. soft-fade (default) */
    if (mode === "soft-fade") {
      const fade = document.createElement("div");
      fade.className = "fadein";
      if (opts.color) fade.style.background = resolveColor(opts.color, col, "#000");
      stage.appendChild(fade);
      const baseDur = opts.dur != null ? opts.dur : (clip.fade > 0 ? clip.fade : 0);
      if (baseDur > 0) {
        S.tl.fromTo(
          fade,
          { opacity: 1 },
          { opacity: 0, duration: baseDur, ease: resolveEase(opts, T.softFade.ease), immediateRender: true },
          0
        );
      } else {
        fade.remove();
      }
      return mode;
    }

    /* ------------------------------------------------------------ 2. whip-pan (Viral) */
    if (mode === "whip-pan") {
      const WP = T.whipPan;
      const dur = resolveDur(opts, WP.dur);
      const veilDur = resolveDur(opts, WP.veilDur, WP.veilDur / WP.dur);
      const ease = resolveEase(opts, WP.ease);
      const veilEase = S.ease(WP.veilEase);
      const axis = resolveHorizontalAxis(opts.dir, isEn);
      const accentCol = resolveColor(opts.color, col, col.accent || "#FFD600");
      const travelX = axis.dx * Math.round(W * WP.travelFrac * intensity);
      const travelY = axis.dy * Math.round(H * WP.travelFrac * intensity);
      const skewX = axis.dx !== 0 ? axis.dx * WP.skewDeg * intensity : 0;
      const skewY = axis.dy !== 0 ? axis.dy * WP.skewDeg * 0.65 * intensity : 0;
      const blurPx = Math.round(WP.blurPx * intensity);

      const veil = document.createElement("div");
      veil.className = "transition-overlay transition-whip-veil";
      Object.assign(veil.style, {
        position: "absolute",
        inset: "0",
        background: col.bg2 || col.bg || "#121212",
        pointerEvents: "none",
        zIndex: 89,
      });
      stage.appendChild(veil);
      S.tl.fromTo(
        veil,
        { opacity: 0.92 },
        { opacity: 0, duration: veilDur, ease: veilEase, immediateRender: true },
        0
      );

      if (content) {
        S.tl.fromTo(
          content,
          {
            x: travelX,
            y: travelY,
            skewX,
            skewY,
            scale: MT.clampScale(1.03),
            filter: `blur(${blurPx}px)`,
            opacity: 0.78,
          },
          {
            x: 0,
            y: 0,
            skewX: 0,
            skewY: 0,
            scale: 1,
            filter: "blur(0px)",
            opacity: 1,
            duration: dur,
            ease,
            immediateRender: true,
          },
          0
        );
      }

      const count = WP.streakCount || 3;
      const horiz = axis.dx !== 0;
      for (let i = 0; i < count; i++) {
        const streak = document.createElement("div");
        streak.className = "transition-overlay transition-streak";
        const frac = (i + 1) / (count + 1);
        const thickness = Math.max(24, Math.round((horiz ? H : W) * (0.045 + i * 0.018)));
        const span = Math.round((horiz ? W : H) * (0.55 + i * 0.14));
        if (horiz) {
          Object.assign(streak.style, {
            top: Math.round(H * frac - thickness / 2) + "px",
            left: "0",
            width: span + "px",
            height: thickness + "px",
            background: `linear-gradient(90deg, transparent 0%, ${accentCol} 45%, rgba(255,255,255,0.85) 60%, transparent 100%)`,
          });
          stage.appendChild(streak);
          const fromX = axis.dx > 0 ? W * 0.85 : -span * 0.85;
          const toX = axis.dx > 0 ? -span * 1.15 : W * 1.15;
          S.tl.fromTo(
            streak,
            { x: fromX, opacity: 0.85 },
            { x: toX, opacity: 0, duration: dur * 0.78, ease, immediateRender: true },
            i * 0.025
          );
        } else {
          Object.assign(streak.style, {
            left: Math.round(W * frac - thickness / 2) + "px",
            top: "0",
            width: thickness + "px",
            height: span + "px",
            background: `linear-gradient(180deg, transparent 0%, ${accentCol} 45%, rgba(255,255,255,0.85) 60%, transparent 100%)`,
          });
          stage.appendChild(streak);
          const fromY = axis.dy > 0 ? H * 0.85 : -span * 0.85;
          const toY = axis.dy > 0 ? -span * 1.15 : H * 1.15;
          S.tl.fromTo(
            streak,
            { y: fromY, opacity: 0.85 },
            { y: toY, opacity: 0, duration: dur * 0.78, ease, immediateRender: true },
            i * 0.025
          );
        }
      }
      return mode;
    }

    /* ------------------------------------------------------------ 3. zoom-punch (Viral) */
    if (mode === "zoom-punch") {
      const ZP = T.zoomPunch;
      const dur = resolveDur(opts, ZP.dur);
      const punchDur = dur * (ZP.punchDur / ZP.dur);
      const settleDur = dur * (ZP.settleDur / ZP.dur);
      const flashDur = dur * (ZP.flashDur / ZP.dur);
      const easeIn = resolveEase(opts, ZP.ease);
      const easeSettle = S.ease(ZP.settleEase);
      const accentCol = resolveColor(opts.color, col, col.accent || "#FFD600");
      const startScale = Math.max(0.76, Math.min(0.96, 1 - (1 - ZP.startScale) * intensity));
      const peakScale = MT.clampScale(ZP.peakScale); // Strictly <= 1.06
      const blurPx = Math.round(ZP.blurPx * intensity);
      const punchOut = opts.dir === "out";

      const flash = document.createElement("div");
      flash.className = "transition-overlay transition-zoom-flash";
      Object.assign(flash.style, {
        position: "absolute",
        inset: "0",
        background: col.bg || "#121212",
        pointerEvents: "none",
        zIndex: 89,
      });
      stage.appendChild(flash);
      S.tl.fromTo(
        flash,
        { opacity: 0.78 },
        { opacity: 0, duration: flashDur, ease: easeIn, immediateRender: true },
        0
      );

      const ring = document.createElement("div");
      ring.className = "transition-overlay transition-zoom-ring";
      const ringSize = Math.round(Math.min(W, H) * 0.72);
      Object.assign(ring.style, {
        position: "absolute",
        left: Math.round((W - ringSize) / 2) + "px",
        top: Math.round((H - ringSize) / 2) + "px",
        width: ringSize + "px",
        height: ringSize + "px",
        borderRadius: "50%",
        border: `4px solid ${accentCol}`,
        pointerEvents: "none",
        zIndex: 91,
      });
      stage.appendChild(ring);
      S.tl.fromTo(
        ring,
        { scale: 0.45, opacity: 0.85 },
        { scale: peakScale, opacity: 0, duration: dur * 0.85, ease: easeSettle, immediateRender: true },
        0
      );

      if (content) {
        if (punchOut) {
          S.tl.fromTo(
            content,
            { scale: peakScale, filter: `blur(${blurPx}px)`, opacity: 0.45 },
            { scale: 1, filter: "blur(0px)", opacity: 1, duration: dur, ease: easeIn, immediateRender: true },
            0
          );
        } else {
          S.tl.fromTo(
            content,
            { scale: startScale, filter: `blur(${blurPx}px)`, opacity: 0.35 },
            { scale: peakScale, filter: "blur(0px)", opacity: 1, duration: punchDur, ease: easeIn, immediateRender: true },
            0
          );
          S.tl.to(
            content,
            { scale: 1, duration: settleDur, ease: easeSettle },
            punchDur
          );
        }
      }
      return mode;
    }

    /* ------------------------------------------------------------ 4. glitch-slice (Viral, Seeded) */
    if (mode === "glitch-slice") {
      const GS = T.glitchSlice;
      const dur = resolveDur(opts, GS.dur);
      const snapDur = dur * (GS.snapDur / GS.dur);
      const settleDur = dur * (GS.settleDur / GS.dur);
      const ease = resolveEase(opts, GS.ease);
      const veilEase = S.ease(GS.veilEase);
      const rng = S.fx && S.fx.rngFor
        ? S.fx.rngFor((slide._seed || "") + ":glitch:" + (slide.seed ?? ""))
        : (() => 0.5);
      const accentCol = resolveColor(opts.color, col, col.accent || "#FFD600");
      const dangerCol = col.danger || "#FF5252";
      const surfaceCol = col.bg2 || col.surface || "#1b1b22";

      const veil = document.createElement("div");
      veil.className = "transition-overlay transition-glitch-veil";
      Object.assign(veil.style, {
        position: "absolute",
        inset: "0",
        background: col.bg || "#121212",
        pointerEvents: "none",
        zIndex: 89,
      });
      stage.appendChild(veil);
      S.tl.fromTo(
        veil,
        { opacity: 0.85 },
        { opacity: 0, duration: dur * 0.48, ease: veilEase, immediateRender: true },
        0
      );

      const bandCount = GS.bandCount || 5;
      const bandPalette = [accentCol, dangerCol, surfaceCol, accentCol, surfaceCol];
      let firstShift = (rng() > 0.5 ? 1 : -1) * Math.round(GS.offsetPx * intensity);
      if (opts.dir === "left") firstShift = -Math.abs(firstShift);
      else if (opts.dir === "right") firstShift = Math.abs(firstShift);

      for (let i = 0; i < bandCount; i++) {
        const band = document.createElement("div");
        band.className = "transition-overlay transition-glitch-band";
        const bandTop = Math.round((i / bandCount) * H + (rng() - 0.5) * (H * 0.04));
        const bandH = Math.max(36, Math.round((H / bandCount) * (0.38 + rng() * 0.42)));
        const bandW = Math.round(W * (0.45 + rng() * 0.55));
        const startLeft = Math.round(rng() * Math.max(40, W - bandW));
        const travel = (rng() > 0.5 ? 1 : -1) * Math.round(GS.bandTravelPx * (0.6 + rng() * 0.7) * intensity);

        Object.assign(band.style, {
          top: Math.max(0, Math.min(H - bandH, bandTop)) + "px",
          left: startLeft + "px",
          width: bandW + "px",
          height: bandH + "px",
          background: bandPalette[i % bandPalette.length],
          opacity: 0.88,
          transformOrigin: "50% 50%",
        });
        stage.appendChild(band);
        S.tl.fromTo(
          band,
          { x: travel, scaleY: 1, opacity: 0.9 },
          { x: -travel * 0.35, scaleY: 0, opacity: 0, duration: dur * 0.68, ease, immediateRender: true },
          i * 0.022
        );
      }

      if (content) {
        const skew = GS.skewDeg * intensity * (firstShift >= 0 ? 1 : -1);
        S.tl.fromTo(
          content,
          { x: firstShift, skewX: skew, opacity: 0.72 },
          { x: Math.round(-firstShift * 0.45), skewX: -skew * 0.5, opacity: 1, duration: snapDur, ease, immediateRender: true },
          0
        );
        S.tl.to(
          content,
          { x: 0, skewX: 0, duration: settleDur, ease },
          snapDur
        );
      }
      return mode;
    }

    /* ------------------------------------------------------------ 5. push (Viral) */
    if (mode === "push") {
      const PU = T.push;
      const dur = resolveDur(opts, PU.dur);
      const ease = resolveEase(opts, PU.ease);
      const axis = resolveHorizontalAxis(opts.dir, isEn);
      const accentCol = resolveColor(opts.color, col, col.accent || "#FFD600");
      const panelBg = col.bg2 || col.surface || "#16161a";
      const horiz = axis.dx !== 0;

      const cover = document.createElement("div");
      cover.className = "transition-overlay transition-push-cover";
      const borderProp = horiz
        ? (axis.dx > 0 ? "borderLeft" : "borderRight")
        : (axis.dy > 0 ? "borderTop" : "borderBottom");
      Object.assign(cover.style, {
        position: "absolute",
        inset: "0",
        background: panelBg,
        [borderProp]: `${PU.seamPx}px solid ${accentCol}`,
        pointerEvents: "none",
        zIndex: 90,
      });
      stage.appendChild(cover);

      const coverToX = horiz ? -axis.dx * W : 0;
      const coverToY = horiz ? 0 : -axis.dy * H;
      S.tl.fromTo(
        cover,
        { x: 0, y: 0, opacity: 1 },
        { x: coverToX, y: coverToY, opacity: 1, duration: dur, ease, immediateRender: true },
        0
      );

      if (content) {
        const contentFromX = horiz ? axis.dx * W : 0;
        const contentFromY = horiz ? 0 : axis.dy * H;
        const fromScale = Math.max(0.9, Math.min(1.0, 1 - (1 - PU.fromScale) * intensity));
        S.tl.fromTo(
          content,
          { x: contentFromX, y: contentFromY, scale: fromScale, opacity: 0.94 },
          { x: 0, y: 0, scale: 1, opacity: 1, duration: dur, ease, immediateRender: true },
          0
        );
      }
      return mode;
    }

    /* ------------------------------------------------------------ 6. mask-wipe (Viral) */
    if (mode === "mask-wipe") {
      const MW = T.maskWipe;
      const dur = resolveDur(opts, MW.dur);
      const veilDur = resolveDur(opts, MW.veilDur, MW.veilDur / MW.dur);
      const ease = resolveEase(opts, MW.ease);
      const veilEase = S.ease(MW.veilEase);
      const axis = resolveHorizontalAxis(opts.dir, isEn);
      const accentCol = resolveColor(opts.color, col, col.accent || "#FFD600");
      const settledClip = "inset(-4% -4% -4% -4%)";

      let startClip = "inset(-4% -4% -4% 100%)";
      let bladeStyle = {};
      let bladeFrom = {};
      let bladeTo = {};

      if (axis.dx > 0) {
        // Right-to-left reveal
        startClip = "inset(-4% -4% -4% 100%)";
        bladeStyle = { top: "-4%", bottom: "-4%", left: "0", width: MW.bladeWidth + "px" };
        bladeFrom = { x: W, opacity: 1 };
        bladeTo = { x: -MW.bladeWidth * 2, opacity: 0 };
      } else if (axis.dx < 0) {
        // Left-to-right reveal
        startClip = "inset(-4% 100% -4% -4%)";
        bladeStyle = { top: "-4%", bottom: "-4%", left: "0", width: MW.bladeWidth + "px" };
        bladeFrom = { x: 0, opacity: 1 };
        bladeTo = { x: W + MW.bladeWidth * 2, opacity: 0 };
      } else if (axis.dy > 0) {
        // Bottom-to-top reveal
        startClip = "inset(100% -4% -4% -4%)";
        bladeStyle = { left: "-4%", right: "-4%", top: "0", height: MW.bladeWidth + "px" };
        bladeFrom = { y: H, opacity: 1 };
        bladeTo = { y: -MW.bladeWidth * 2, opacity: 0 };
      } else {
        // Top-to-bottom reveal
        startClip = "inset(-4% -4% 100% -4%)";
        bladeStyle = { left: "-4%", right: "-4%", top: "0", height: MW.bladeWidth + "px" };
        bladeFrom = { y: 0, opacity: 1 };
        bladeTo = { y: H + MW.bladeWidth * 2, opacity: 0 };
      }

      const veil = document.createElement("div");
      veil.className = "transition-overlay transition-mask-veil";
      Object.assign(veil.style, {
        position: "absolute",
        inset: "0",
        background: col.bg || "#121212",
        pointerEvents: "none",
        zIndex: 88,
      });
      stage.appendChild(veil);
      S.tl.fromTo(
        veil,
        { opacity: 0.78 },
        { opacity: 0, duration: veilDur, ease: veilEase, immediateRender: true },
        0
      );

      if (content) {
        S.tl.fromTo(
          content,
          { clipPath: startClip },
          { clipPath: settledClip, duration: dur, ease, immediateRender: true },
          0
        );
      }

      const blade = document.createElement("div");
      blade.className = "transition-overlay transition-mask-blade";
      Object.assign(blade.style, {
        position: "absolute",
        background: accentCol,
        boxShadow: `0 0 ${Math.round(24 * intensity)}px ${accentCol}`,
        pointerEvents: "none",
        zIndex: 92,
      }, bladeStyle);
      stage.appendChild(blade);
      S.tl.fromTo(
        blade,
        bladeFrom,
        Object.assign({ duration: dur, ease, immediateRender: true }, bladeTo),
        0
      );
      return mode;
    }

    /* ------------------------------------------------------------ 7. light-leak-fade (Viral) */
    if (mode === "light-leak-fade") {
      const LL = T.lightLeakFade;
      const dur = resolveDur(opts, LL.dur);
      const veilDur = resolveDur(opts, LL.veilDur, LL.veilDur / LL.dur);
      const contentDur = resolveDur(opts, LL.contentDur, LL.contentDur / LL.dur);
      const ease = resolveEase(opts, LL.ease);
      const veilEase = S.ease(LL.veilEase);
      const warmMain = resolveColor(opts.color, col, col.accent || "#FFB84D");
      const warmEdge = isLight ? "rgba(255, 195, 110, 0.35)" : "rgba(255, 125, 50, 0.42)";
      const axis = resolveHorizontalAxis(opts.dir, isEn);

      const veil = document.createElement("div");
      veil.className = "transition-overlay transition-leak-veil";
      Object.assign(veil.style, {
        position: "absolute",
        inset: "0",
        background: col.bg || "#121212",
        pointerEvents: "none",
        zIndex: 89,
      });
      stage.appendChild(veil);
      S.tl.fromTo(
        veil,
        { opacity: 0.86 },
        { opacity: 0, duration: veilDur, ease: veilEase, immediateRender: true },
        0
      );

      const wash = document.createElement("div");
      wash.className = "transition-overlay transition-leak-wash";
      Object.assign(wash.style, {
        position: "absolute",
        inset: "-12%",
        background: `radial-gradient(ellipse 68% 72% at 32% 45%, ${warmMain} 0%, ${warmEdge} 38%, transparent 74%)`,
        pointerEvents: "none",
        zIndex: 91,
      });
      stage.appendChild(wash);

      const sweepX = axis.dx * Math.round(W * 0.16 * intensity);
      const sweepY = axis.dy * Math.round(H * 0.14 * intensity);
      const peakOp = Math.min(0.95, LL.maxOpacity * intensity);
      const peakT = dur * 0.36;
      S.tl.fromTo(
        wash,
        { x: -sweepX, y: -sweepY, scale: 1, opacity: 0.18 },
        { x: 0, y: 0, scale: MT.clampScale(LL.leakScale), opacity: peakOp, duration: peakT, ease, immediateRender: true },
        0
      );
      S.tl.to(
        wash,
        { x: sweepX, y: sweepY, scale: 1, opacity: 0, duration: dur - peakT, ease: veilEase },
        peakT
      );

      if (content) {
        S.tl.fromTo(
          content,
          { scale: MT.clampScale(LL.startScale), opacity: 0.62 },
          { scale: 1, opacity: 1, duration: contentDur, ease, immediateRender: true },
          0
        );
      }
      return mode;
    }

    /* ------------------------------------------------------------ 8-14. Classic Transitions (format-proportional) */
    if (mode === "curtain-rtl") {
      const dur = resolveDur(opts, T.curtainRtl.dur);
      const ease = resolveEase(opts, T.curtainRtl.ease);
      const panel = document.createElement("div");
      panel.className = "transition-overlay transition-curtain-rtl";
      const borderProp = isEn ? "borderRight" : "borderLeft";
      Object.assign(panel.style, {
        position: "absolute",
        inset: "0",
        background: col.bg2 || col.surface || "#16161a",
        [borderProp]: `10px solid ${resolveColor(opts.color, col, col.accent || "#FFD600")}`,
        pointerEvents: "none",
        zIndex: 90,
      });
      stage.appendChild(panel);
      S.tl.fromTo(
        panel,
        { x: 0, opacity: 1 },
        { x: -(W + 80) * dir, opacity: 0, duration: dur, ease, immediateRender: true },
        0
      );
      return mode;
    }

    if (mode === "accent-slash") {
      const A2 = T.accentSlash;
      const durScale = opts.dur != null ? (opts.dur / A2.barDur) : 1;
      const veil = document.createElement("div");
      veil.className = "transition-overlay transition-accent-slash";
      Object.assign(veil.style, {
        position: "absolute",
        inset: "0",
        background: col.bg || "#121212",
        pointerEvents: "none",
        zIndex: 89,
      });
      const slash = document.createElement("div");
      slash.className = "transition-overlay transition-slash-bar";
      const slashW = Math.round(W * 0.14);
      Object.assign(slash.style, {
        position: "absolute",
        top: "-15%",
        bottom: "-15%",
        [isEn ? "left" : "right"]: "-20%",
        width: slashW + "px",
        background: resolveColor(opts.color, col, col.accent || "#FFD600"),
        transform: `skewX(${isEn ? "14deg" : "-14deg"})`,
        pointerEvents: "none",
        zIndex: 91,
      });
      stage.appendChild(veil);
      stage.appendChild(slash);
      S.tl.fromTo(
        veil,
        { opacity: 1 },
        { opacity: 0, duration: A2.veilDur * durScale, ease: S.ease(A2.veilEase), immediateRender: true },
        A2.veilDelay * durScale
      );
      S.tl.fromTo(
        slash,
        { x: Math.round(W * 0.11) * dir, opacity: 1 },
        { x: -Math.round(W * 1.24) * dir, opacity: 0.9, duration: A2.barDur * durScale, ease: resolveEase(opts, A2.barEase), immediateRender: true },
        0
      );
      return mode;
    }

    if (mode === "iris-rise") {
      const dur = resolveDur(opts, T.irisRise.dur);
      const ease = resolveEase(opts, T.irisRise.ease);
      const veil = document.createElement("div");
      veil.className = "transition-overlay transition-iris-rise";
      Object.assign(veil.style, {
        position: "absolute",
        inset: "0",
        background: resolveColor(opts.color, col, col.bg || "#121212"),
        clipPath: "circle(110% at 50% 50%)",
        pointerEvents: "none",
        zIndex: 90,
      });
      stage.appendChild(veil);
      S.tl.fromTo(
        veil,
        { scale: 1, opacity: 1 },
        { scale: MT.clampScale(T.irisRise.scale), opacity: 0, duration: dur, ease, immediateRender: true },
        0
      );
      return mode;
    }

    if (mode === "split-curtain") {
      const SC = T.splitCurtain;
      const dur = resolveDur(opts, SC.dur);
      const ease = resolveEase(opts, SC.ease);
      const accentCol = resolveColor(opts.color, col, col.accent || "#FFD600");
      const halfH = Math.ceil(H / 2);
      const top = document.createElement("div");
      const bot = document.createElement("div");
      top.className = "transition-overlay transition-split-top";
      bot.className = "transition-overlay transition-split-bot";
      Object.assign(top.style, {
        position: "absolute",
        left: "0",
        right: "0",
        top: "0",
        height: halfH + "px",
        background: col.bg2 || col.bg || "#121212",
        borderBottom: `4px solid ${accentCol}`,
        pointerEvents: "none",
        zIndex: 90,
      });
      Object.assign(bot.style, {
        position: "absolute",
        left: "0",
        right: "0",
        bottom: "0",
        height: halfH + "px",
        background: col.bg2 || col.bg || "#121212",
        borderTop: `4px solid ${accentCol}`,
        pointerEvents: "none",
        zIndex: 90,
      });
      stage.appendChild(top);
      stage.appendChild(bot);
      S.tl.fromTo(top, { y: 0, opacity: 1 }, { y: -(halfH + 24), opacity: 0, duration: dur, ease, immediateRender: true }, 0);
      S.tl.fromTo(bot, { y: 0, opacity: 1 }, { y: halfH + 24, opacity: 0, duration: dur, ease, immediateRender: true }, 0);
      return mode;
    }

    if (mode === "diagonal-wipe") {
      const dur = resolveDur(opts, T.diagonalWipe.dur);
      const ease = resolveEase(opts, T.diagonalWipe.ease);
      const wipe = document.createElement("div");
      wipe.className = "transition-overlay transition-diagonal-wipe";
      Object.assign(wipe.style, {
        position: "absolute",
        top: "-20%",
        bottom: "-20%",
        left: "-25%",
        right: "-25%",
        background: `linear-gradient(120deg, ${col.bg2 || col.bg || "#121212"} 70%, ${resolveColor(opts.color, col, col.accent || "#FFD600")} 100%)`,
        pointerEvents: "none",
        zIndex: 90,
      });
      stage.appendChild(wipe);
      S.tl.fromTo(
        wipe,
        { x: 0, y: 0, opacity: 1 },
        { x: -Math.round(W * 1.25) * dir, y: Math.round(H * 0.24), opacity: 0, duration: dur, ease, immediateRender: true },
        0
      );
      return mode;
    }

    if (mode === "zoom-iris") {
      const ZI = T.zoomIris;
      const durScale = opts.dur != null ? (opts.dur / ZI.contentDur) : 1;
      const fadeDur = clip.fade > 0 ? clip.fade : T.softFade.dur;
      const fade = document.createElement("div");
      fade.className = "transition-overlay transition-zoom-iris";
      Object.assign(fade.style, {
        position: "absolute",
        inset: "0",
        background: resolveColor(opts.color, col, col.bg || "#121212"),
        pointerEvents: "none",
        zIndex: 90,
      });
      stage.appendChild(fade);
      S.tl.fromTo(
        fade,
        { opacity: 0.92 },
        { opacity: 0, duration: Math.max(ZI.fadeDur, fadeDur) * durScale, ease: S.ease(ZI.fadeEase), immediateRender: true },
        0
      );
      if (content) {
        S.tl.fromTo(
          content,
          { scale: MT.clampScale(ZI.fromScale) },
          { scale: 1, duration: ZI.contentDur * durScale, ease: resolveEase(opts, ZI.contentEase), immediateRender: true },
          0
        );
      }
      return mode;
    }

    if (mode === "shutter-bars") {
      const SB = T.shutterBars;
      const dur = resolveDur(opts, SB.dur);
      const ease = resolveEase(opts, SB.ease);
      const barW = Math.ceil(W / 4);
      for (let i = 0; i < 4; i++) {
        const bar = document.createElement("div");
        bar.className = "transition-overlay transition-shutter-bar";
        Object.assign(bar.style, {
          position: "absolute",
          top: "0",
          bottom: "0",
          left: (i * barW) + "px",
          width: (barW + 4) + "px",
          background: i % 2 === 0 ? (col.bg || "#121212") : (col.bg2 || col.surface || "#1a1a1f"),
          transformOrigin: "50% 0%",
          pointerEvents: "none",
          zIndex: 90,
        });
        stage.appendChild(bar);
        S.tl.fromTo(
          bar,
          { scaleY: 1, opacity: 1 },
          { scaleY: 0, opacity: 0, duration: dur, ease, immediateRender: true },
          i * SB.stagger
        );
      }
      return mode;
    }

    return mode;
  }

  S.transitions = {
    apply,
    resolveHorizontalAxis,
  };
})();
