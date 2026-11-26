/* Khordegir Studio — Shared GSAP 3 Motion Tokens (single source of truth).
   Offline, deterministic, RTL-safe, stage zoom cap <= 1.06.
   Loaded before core.js, fx.js, charts.js, themes, and templates.
   All motion is mathematically based on the true exponential easing family: e^(-x).
   Licensed under MIT / Apache-2.0 compatible terms. */
(function () {
  "use strict";

  const ZOOM_CAP = 1.06;
  const clampScale = (s) => {
    const n = Number(s);
    if (!Number.isFinite(n)) return 1;
    return Math.min(ZOOM_CAP, Math.max(0.1, n));
  };

  /* True exponential easing family:
     - expOut(k)(t) = (1 - e^(-k t)) / (1 - e^(-k))  (entrances: fast start, speed decays exponentially)
     - expIn(k)(t) = (e^(k t) - 1) / (e^k - 1)        (exits: mirror of expOut)
     - expInOut(k)(t) = t<0.5 ? expIn(k)(2t)/2 : 0.5 + expOut(k)(2t-1)/2
     Deterministic, monotonic, returning exactly 0 at t=0 and 1 at t=1. */

  function expOut(k) {
    const K = k == null ? 5 : Number(k);
    if (Math.abs(K) < 1e-6) {
      const fn = function (t) { return t <= 0 ? 0 : t >= 1 ? 1 : t; };
      if (arguments.length > 1) return fn(arguments[1]);
      return fn;
    }
    const denom = 1 - Math.exp(-K);
    const fn = function (t) {
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      return (1 - Math.exp(-K * t)) / denom;
    };
    if (arguments.length > 1) return fn(arguments[1]);
    return fn;
  }

  function expIn(k) {
    const K = k == null ? 5 : Number(k);
    if (Math.abs(K) < 1e-6) {
      const fn = function (t) { return t <= 0 ? 0 : t >= 1 ? 1 : t; };
      if (arguments.length > 1) return fn(arguments[1]);
      return fn;
    }
    const denom = Math.exp(K) - 1;
    const fn = function (t) {
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      return (Math.exp(K * t) - 1) / denom;
    };
    if (arguments.length > 1) return fn(arguments[1]);
    return fn;
  }

  function expInOut(k) {
    const K = k == null ? 5 : Number(k);
    const fIn = expIn(K);
    const fOut = expOut(K);
    const fn = function (t) {
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      return t < 0.5 ? fIn(2 * t) / 2 : 0.5 + fOut(2 * t - 1) / 2;
    };
    if (arguments.length > 1) return fn(arguments[1]);
    return fn;
  }

  function linear(t) {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return t;
  }

  const EASES = Object.freeze({
    // Semantic motion grammar eases (Exponential easing family)
    // out for in/entrance tokens, in for exit tokens, inOut for camera/zoom/ambient
    // choosing k by role: subtle 3, normal 5, strong 6
    textIn: expOut(5),
    textOut: expIn(5),
    wordStagger: expOut(5),
    zoomIn: expInOut(3),
    zoomOut: expInOut(5),
    cameraPan: expInOut(3),
    zoomPoint: expInOut(3),
    zoomPointTravel: expInOut(4),
    zoomPointReturn: expInOut(5),
    chartReveal: expOut(6),
    // inverse-exponential growth: fast start, speed decays exponentially as e^(-k t), lands at 1 (k = 5)
    chartGrow: function (t) {
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      const k = 5;
      return (1 - Math.exp(-k * t)) / (1 - Math.exp(-k));
    },
    chartSnap: expOut(6),
    chartGentle: expOut(4),
    transition: expOut(6),
    transitionSoft: expOut(3),
    transitionSlash: expInOut(5),
    ambient: expInOut(3),
    linear: linear,
    none: linear,

    // Named aliases used by themes, templates, and Stage.ease()
    power4: expOut(6),
    power3: expOut(5),
    power2: expOut(4),
    power2In: expIn(4),
    power2InOut: expInOut(4),
    power3InOut: expInOut(5),
    editorial: expOut(5),
    snappy: expOut(6),
    expo: expOut(6),
    back: expOut(5),
    spring: expOut(5),

    // String compatibility aliases for themes, templates, and GSAP ease names
    "power4.out": expOut(6),
    "power3.out": expOut(5),
    "power2.out": expOut(4),
    "power2.in": expIn(4),
    "power2.inout": expInOut(4),
    "power2.inOut": expInOut(4),
    "power3.inout": expInOut(5),
    "power3.inOut": expInOut(5),
    "power1.out": expOut(3),
    "power1.in": expIn(3),
    "power1.inout": expInOut(3),
    "power1.inOut": expInOut(3),
    "expo.out": expOut(6),
    "expo.in": expIn(6),
    "expo.inout": expInOut(6),
    "expo.inOut": expInOut(6),
    "sine.inout": expInOut(3),
    "sine.inOut": expInOut(3),
    "back.out(1.2)": expOut(5),
    "back.out(1.4)": expOut(5),

    // Explicit e^(-x) exponential curve keys for video.yaml transition_ease & advanced controls
    "expOut(3)": expOut(3),
    "expOut(4)": expOut(4),
    "expOut(5)": expOut(5),
    "expOut(6)": expOut(6),
    "expIn(3)": expIn(3),
    "expIn(4)": expIn(4),
    "expIn(5)": expIn(5),
    "expIn(6)": expIn(6),
    "expInOut(3)": expInOut(3),
    "expInOut(4)": expInOut(4),
    "expInOut(5)": expInOut(5),
    "expInOut(6)": expInOut(6),
  });

  const MOTION_TOKENS = {
    version: 1,
    ZOOM_CAP,
    clampScale,
    eases: EASES,
    expOut,
    expIn,
    expInOut,
    linear,

    // Asymmetric text choreography: smooth decelerating entrance, snappy accelerating exit
    text: {
      in:      { dur: 0.50, y: 24, scale: 0.98, ease: EASES.textIn },
      out:     { dur: 0.28, y: -16, scale: 0.96, ease: EASES.textOut },
      outFast: { dur: 0.25, y: -12, scale: 0.96, ease: EASES.textOut },
      outSlow: { dur: 0.35, y: -18, scale: 0.95, ease: EASES.textOut },

      eyebrow: { delay: 0.05, dur: 0.45, y: 12, ease: EASES.textIn },
      title:   { delay: 0.12, dur: 0.56, y: 24, scale: 0.98, ease: EASES.textIn },
      body:    { delay: 0.22, dur: 0.48, x: 20, stagger: 0.08, ease: EASES.textIn },
      note:    { delay: 0.55, dur: 0.45, y: 10, ease: EASES.textIn },
      subtitleOverlap: 0.15,
    },

    // RTL-safe kinetic typography (whole Persian words/lines only, never split connected glyphs)
    wordStagger: {
      default: { dur: 0.48, stagger: 0.045, y: 24, x: 10, scale: 0.96, ease: EASES.wordStagger, mode: "word" },
      hero:    { dur: 0.54, stagger: 0.050, y: 26, x: 8,  scale: 0.96, ease: EASES.wordStagger, mode: "word" },
      snappy:  { dur: 0.45, stagger: 0.035, y: 14, x: -16, scale: 0.94, ease: EASES.wordStagger, mode: "word" },
      line:    { dur: 0.54, stagger: 0.090, y: 22, x: 0,  scale: 0.98, ease: EASES.wordStagger, mode: "line" },
      out:     { dur: 0.28, stagger: 0.025, y: -14, x: 0, scale: 0.96, ease: EASES.textOut, mode: "word" },
    },

    // Camera & Ken Burns (slow smooth zoom-in, shorter distinct-curve zoom-out, power2.inOut pan, <= 1.06 cap)
    camera: {
      zoomCap: ZOOM_CAP,
      zoomIn:  { dur: 0.85, scale: 1.055, ease: EASES.zoomIn },
      zoomOut: { dur: 0.45, fromScale: 1.055, toScale: 1.0, ease: EASES.zoomOut },
      pan:     { dur: 0.80, ease: EASES.cameraPan },
      zoomPoints: { cap: ZOOM_CAP, defaultDur: 0.85, defaultHold: 1.5, defaultScale: 1.055, returnDur: 0.65, ease: EASES.zoomPoint, travelEase: EASES.zoomPointTravel, returnEase: EASES.zoomPointReturn },
      kenburns: {
        breathe: { period: 20, scale: 0.055, x: -14, ease: EASES.ambient },
        zoomOut: { period: 14, fromScale: 1.058, toScale: 1.0, x: 0, ease: EASES.zoomIn },
        pan:     { period: 18, scale: 1.055, dx: 28, ease: EASES.cameraPan },
        bg:      { period: 20, scale: 1.03, ease: EASES.ambient },
      },
    },

    // Data & chart reveals (all expOut e^(-x) curves: fast start, slow landing)
    chart: {
      reveal: { dur: 0.72, stagger: 0.08, delay: 0.25, ease: EASES.chartReveal },
      axes:   { delay: 0.00, dur: 0.35, ease: EASES.textIn },
      bar:    { delay: 0.22, dur: 1.85, stagger: 0.14, ease: "chartGrow" },
      hbar:   { delay: 0.20, dur: 1.75, stagger: 0.14, ease: "chartGrow" },
      line:   { delay: 0.25, dur: 2.00, stagger: 0.14, ease: "chartGrow" },
      vline:  { delay: 0.15, stagger: 0.10, dur: 0.50, ease: EASES.chartReveal, labelDelay: 0.12 },
      marker: { dur: 0.32, ease: EASES.spring, span: 0.85 },
      value:  { delay: 0.05, dur: 0.35, y: 10, ease: EASES.chartReveal },
      number: { delay: 0.18, dur: 1.10, scale: 0.92, enterDur: 0.45, ease: EASES.chartReveal },
      compare: {
        delay: 0.20, stagger: 0.50, countDur: 0.85, labelDelay: 0.15,
        arrowDelay: 0.40, arrowDur: 0.45, ease: EASES.chartReveal,
      },
      counterGrid: {
        delay: 0.20, cardStagger: 0.16, countDur: 0.90, ease: EASES.chartReveal,
      },
      timeline: {
        lineDur: 0.90, ease: EASES.chartReveal,
        stepDelay: 0.25, stepStagger: 0.22, textDelay: 0.08,
      },
      map: {
        frameDur: 0.45,
        overviewHold: 0.20,
        flightDur: 1.05,
        flightEase: expInOut(4),
        routeEase: EASES.chartReveal,
        pinDropDur: 0.48,
        pinDropEase: expOut(5),
        pinDropY: -38,
        rippleDur: 0.65,
        rippleEase: expOut(4),
        calloutDelay: 0.14,
        calloutDur: 0.40,
        calloutEase: EASES.textIn,
        stopHold: 0.48,
      },
      startOffset: 0.25,
      compareStartOffset: 0.20,
      counterCaptionExtra: 0.25,
      markDelayFrac: 0.88,
      markStagger: 0.10,
      endLabelFrac: 0.88,
      barCueFrac: 0.90,
      countEndCueFrac: 0.85,
    },

    // Beginner one-click animation presets for charts and counters
    chartPresets: {
      bar: {
        "surge-bars":      { dur: 1.50, stagger: 0.12, ease: "expOut(6)", delay: 0.18 },
        "editorial-bars":  { dur: 2.00, stagger: 0.16, ease: "expOut(5)", delay: 0.25 },
        "pulse-highlight": { dur: 1.80, stagger: 0.15, ease: "expOut(5)", delay: 0.22, pulse: true },
        "elastic-rise":    { dur: 1.75, stagger: 0.14, ease: "expOut(5)", delay: 0.20 },
        "cascade-grid":    { dur: 1.80, stagger: 0.18, ease: "expOut(5)", delay: 0.32, axDur: 0.45 },
        "minimal-bars":    { dur: 1.40, stagger: 0.10, ease: "expOut(5)", delay: 0.15 },
        "classic":         { dur: 1.85, stagger: 0.14, ease: "chartGrow", delay: 0.22 },
        "auto":            { dur: 1.85, stagger: 0.14, ease: "chartGrow", delay: 0.22 },
      },
      line: {
        "sweep-trace":     { dur: 1.80, stagger: 0.14, ease: "expOut(6)", delay: 0.25 },
        "editorial-curve": { dur: 2.20, stagger: 0.16, ease: "expOut(5)", delay: 0.28 },
        "marker-pop":      { dur: 1.90, stagger: 0.14, ease: "expOut(5)", delay: 0.24, popMarkers: true },
        "glow-path":       { dur: 1.90, stagger: 0.14, ease: "expOut(5)", delay: 0.25, glow: true },
        "split-axis":      { dur: 1.80, stagger: 0.14, ease: "expOut(5)", delay: 0.35, axDur: 0.45 },
        "minimal-trace":   { dur: 1.50, stagger: 0.12, ease: "expOut(5)", delay: 0.20 },
        "classic":         { dur: 2.00, stagger: 0.14, ease: "chartGrow", delay: 0.25 },
        "auto":            { dur: 2.00, stagger: 0.14, ease: "chartGrow", delay: 0.25 },
      },
      counter: {
        "slam-count":      { dur: 0.85, ease: "expOut(6)", scale: 0.80 },
        "halo-pulse":      { dur: 1.10, ease: "expOut(5)", halo: true },
        "bar-meter":       { dur: 1.15, ease: "expOut(5)", meter: true },
        "dual-split":      { dur: 1.10, ease: "expOut(5)" },
        "kinetic-stat":    { dur: 1.15, ease: "expOut(5)", kinetic: true },
        "minimal-count":   { dur: 0.85, ease: "expOut(6)" },
        "classic":         { dur: 1.10, ease: "expOut(5)" },
        "auto":            { dur: 1.10, ease: "expOut(5)" },
      },
      compare: {
        "versus-clash":    { countDur: 0.80, stagger: 0.45, arrowDur: 0.42, arrowDelay: 0.38, ease: "expOut(6)" },
        "editorial-delta": { countDur: 0.95, stagger: 0.55, arrowDur: 0.48, arrowDelay: 0.42, ease: "expOut(5)" },
        "sweep-compare":   { countDur: 0.85, stagger: 0.50, arrowDur: 0.50, arrowDelay: 0.40, ease: "expOut(5)" },
        "pop-badges":      { countDur: 0.85, stagger: 0.45, arrowDur: 0.45, arrowDelay: 0.38, ease: "expOut(5)" },
        "mirror-flip":     { countDur: 0.90, stagger: 0.50, arrowDur: 0.45, arrowDelay: 0.40, ease: "expOut(5)" },
        "minimal-compare": { countDur: 0.75, stagger: 0.40, arrowDur: 0.40, arrowDelay: 0.35, ease: "expOut(6)" },
        "classic":         { countDur: 0.85, stagger: 0.50, arrowDur: 0.45, arrowDelay: 0.40, ease: "expOut(6)" },
        "auto":            { countDur: 0.85, stagger: 0.50, arrowDur: 0.45, arrowDelay: 0.40, ease: "expOut(6)" },
      },
      counterGrid: {
        "stagger-counters":{ countDur: 0.90, stagger: 0.16, ease: "expOut(6)" },
        "pulse-tiles":     { countDur: 1.05, stagger: 0.18, ease: "expOut(5)", pulse: true },
        "editorial-grid":  { countDur: 1.10, stagger: 0.20, ease: "expOut(5)" },
        "spring-cards":    { countDur: 0.95, stagger: 0.16, ease: "expOut(5)" },
        "sweep-row":       { countDur: 0.90, stagger: 0.14, ease: "expOut(5)" },
        "minimal-grid":    { countDur: 0.80, stagger: 0.12, ease: "expOut(6)" },
        "classic":         { countDur: 0.95, stagger: 0.16, ease: "expOut(5)" },
        "auto":            { countDur: 0.95, stagger: 0.16, ease: "expOut(5)" },
      },
    },

    // UI elements & layout helpers
    ui: {
      baseDelay: 0.10,
      card:      { delay: 0.22, dur: 0.52, y: 28, scale: 0.97, stagger: 0.10, ease: EASES.textIn },
      bubble:    { delay: 0.25, dur: 0.42, y: 14, scale: 0.90, stagger: 0.20, ease: EASES.back },
      badge:     { delay: 0.30, dur: 0.40, scale: 0.85, ease: EASES.back },
      image:     { delay: 0.05, dur: 0.60, scale: 0.985, ease: EASES.textIn },
      imageFull: { delay: 0.00, dur: 0.60, ease: EASES.textIn },
      sweepLine: { dur: 0.55, ease: EASES.chartReveal },
      draw:      { dur: 0.90, ease: EASES.chartReveal },
      dotBaseDelay: 0.25,
      dotStagger: 0.05,
      layerDotBaseDelay: 0.40,
      layerArrowDelay: 0.25,
      layerArrowDur: 0.60,
      cardGridExtra: 0.20,
      imageTextPointExtra: 0.12,
      imageFullTextExtra: 0.20,
      quoteHighlightExtra: 0.12,
      chatPanelExtra: -0.10,
      bigNumExtra: 0.25,
    },

    // Entrance variants (fx.js)
    variants: {
      slideTitleX: 44,
      slideBodyX: 26,
      slideCardX: 34,
      slideCardScale: 0.985,
      slideImageX: -36,
      maskTextY: 14,
      blurPx: 14,
      blurTextY: 8,
      blurCardScale: 0.98,
      blurImageScale: 1.03,
      scaleText: 0.96,
      scaleCard: 0.95,
      scaleImage: 1.04,
    },

    // 14 slide entrance transitions (8 classic + 6 viral; default softFade keeps existing output unchanged)
    transitions: {
      softFade:      { dur: 0.32, ease: EASES.transitionSoft },
      curtainRtl:    { dur: 0.52, ease: EASES.transition },
      accentSlash:   { veilDelay: 0.08, veilDur: 0.36, veilEase: EASES.transitionSoft, barDur: 0.52, barEase: EASES.transitionSlash },
      irisRise:      { dur: 0.48, ease: EASES.textIn, scale: 1.06 },
      splitCurtain:  { dur: 0.48, ease: EASES.transition },
      diagonalWipe:  { dur: 0.50, ease: EASES.transition },
      zoomIris:      { fadeDur: 0.32, fadeEase: EASES.transitionSoft, contentDur: 0.48, contentEase: EASES.textIn, fromScale: 1.04 },
      shutterBars:   { dur: 0.42, stagger: 0.055, ease: EASES.transition },

      // Viral high-craft transitions (all e^(-x) curves, <= 1.06 stage zoom cap, format-proportional)
      whipPan:       { dur: 0.44, veilDur: 0.22, travelFrac: 0.46, blurPx: 18, skewDeg: 4.5, streakCount: 3, ease: expOut(6), veilEase: expOut(5) },
      zoomPunch:     { dur: 0.44, punchDur: 0.16, settleDur: 0.28, startScale: 0.88, peakScale: 1.06, blurPx: 8, flashDur: 0.26, ease: expOut(6), settleEase: expOut(5) },
      glitchSlice:   { dur: 0.38, snapDur: 0.10, settleDur: 0.28, bandCount: 5, offsetPx: 26, bandTravelPx: 150, skewDeg: 3, ease: expOut(6), veilEase: expOut(5) },
      push:          { dur: 0.48, fromScale: 0.97, seamPx: 8, ease: expOut(5) },
      maskWipe:      { dur: 0.50, veilDur: 0.28, bladeWidth: 8, ease: expOut(5), veilEase: expOut(3) },
      lightLeakFade: { dur: 0.58, veilDur: 0.42, contentDur: 0.36, startScale: 1.02, leakScale: 1.04, maxOpacity: 0.78, ease: expOut(4), veilEase: expOut(3) },
      bounds:        { minDur: 0.15, maxDur: 1.5, minIntensity: 0.4, maxIntensity: 1.5 },
    },

    // 7 animated logo modes
    logo: {
      t0: 0.08,
      popSpin:    { dur: 0.55, ease: EASES.spring, fromScale: 0.45, fromRot: -18 },
      slideRtl:   { dur: 0.52, ease: EASES.transition, fromX: 56 },
      orbitPulse: { dur: 0.50, ease: EASES.textIn, fromScale: 0.72, fromY: -14, ambScale: 1.05, ambDur: 2.2, ambDelay: 0.6, ambRepeat: 8 },
      flipReveal: { dur: 0.55, ease: EASES.spring, fromScaleX: 0.15, fromScaleY: 0.9 },
      stampDrop:  { dur: 0.45, ease: EASES.transition, fromScale: 1.06, fromY: -26 },
      glitchSnap: { inDur: 0.20, inEase: EASES.transitionSoft, settleDur: 0.24, settleEase: EASES.textIn, fromX: -24, midX: 6 },
      floatFade:  { dur: 0.58, ease: EASES.textIn, fromY: 18, ambY: -6, ambDur: 3.4, ambDelay: 0.7, ambRepeat: 6 },
    },

    // Post-build keyword highlight / underline sweeps
    post: {
      fallbackTime: 0.90,
      highlight: { delayOffset: 0.05, dur: 0.52, ease: EASES.textIn },
      underline: { delayOffset: 0.08, dur: 0.48, ease: EASES.textIn },
    },

    // Inline auto number count-up presets (YouTube-style tabular counter)
    autoCount: {
      pop:    { dur: 0.80, ease: EASES.textIn,  popScale: 1.12, popDur: 0.14, delayOffset: -0.18 },
      smooth: { dur: 0.90, ease: EASES.textIn,  popScale: 1.03, popDur: 0.12, delayOffset: -0.15 },
      slam:   { dur: 0.68, ease: EASES.chartReveal, popScale: 1.18, popDur: 0.16, delayOffset: -0.12 },
      subtle: { dur: 0.52, ease: EASES.power2,  popScale: 1.04, popDur: 0.10, delayOffset: -0.12 },
    },

    // Tasteful micro-details (accent bounce, emoji pop, badge settle)
    micro: {
      accentScale: 1.045,
      accentDur: 0.14,
      emojiFromScale: 0.58,
      emojiPopScale: 1.12,
      emojiDur: 0.34,
      emojiRot: -8,
      badgeScale: 1.04,
      badgeDur: 0.14,
    },

    // Ambient atmosphere (deterministic timelines)
    atmosphere: {
      glow:       { opacity: [0.06, 0.12], move: 24, period: 12, x: 0.86, y: 0.06, size: 1.25, ease: EASES.ambient, repeat: 99 },
      leak:       { dur: 9, ease: EASES.ambient, maxOpacity: 0.11, repeat: 9 },
      dust:       { baseDur: 18, spanDur: 10, ease: EASES.linear },
      lightSweep: { dur: 10, ease: EASES.ambient, repeat: 4 },
      grain:      { dur: 60, ease: EASES.linear, steps: 24 },
      drift:      { x: 8, y: -10, cardX: 4, cardY: -8, dur: 6, ease: EASES.ambient, repeat: 8 },
      depth:      { fromScale: 1.02, toScale: 1.06, fromX: -10, toX: 26, dur: 20, ease: EASES.linear },
    },

    clip: { fade: 0.32, hold: 2.5, min: 6 },

    // Helpers for themes so every theme inherits the exact shared token set
    themeEases() {
      return Object.assign({}, EASES);
    },
    themeMotion() {
      return {
        eyebrow: Object.assign({}, this.text.eyebrow),
        title:   Object.assign({}, this.text.title),
        body:    Object.assign({}, this.text.body),
        note:    Object.assign({}, this.text.note),
        card:    Object.assign({}, this.ui.card),
        bubble:  Object.assign({}, this.ui.bubble),
        badge:   Object.assign({}, this.ui.badge),
        image:   Object.assign({}, this.ui.image),
        number:  Object.assign({}, this.chart.number),
        axes:    Object.assign({}, this.chart.axes),
        bar:     Object.assign({}, this.chart.bar),
        line:    Object.assign({}, this.chart.line),
      };
    },
  };

  const root = typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : {};
  root.KhordegirMotion = Object.assign(root.KhordegirMotion || {}, {
    expOut,
    expIn,
    expInOut,
    linear,
  });
  root.MOTION_TOKENS = MOTION_TOKENS;
  if (!root.Stage) {
    root.Stage = { themes: {}, defineTheme(t) { this.themes[t.name] = t; } };
  }
  root.Stage.KhordegirMotion = root.KhordegirMotion;
  root.Stage.expOut = expOut;
  root.Stage.expIn = expIn;
  root.Stage.expInOut = expInOut;
  root.Stage.MOTION = MOTION_TOKENS;
  root.Stage.motionTokens = MOTION_TOKENS;
})();
