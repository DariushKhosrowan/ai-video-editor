/* Khordegir Studio — Shared GSAP 3 Motion Tokens (single source of truth).
   Offline, deterministic, RTL-safe, stage zoom cap <= 1.06.
   Loaded before core.js, fx.js, charts.js, themes, and templates. */
(function () {
  "use strict";

  const ZOOM_CAP = 1.06;
  const clampScale = (s) => {
    const n = Number(s);
    if (!Number.isFinite(n)) return 1;
    return Math.min(ZOOM_CAP, Math.max(0.1, n));
  };

  const EASES = Object.freeze({
    // Semantic motion grammar eases (GSAP 3 ease strings)
    textIn: "power3.out",
    textOut: "power2.in",
    wordStagger: "power3.out",
    zoomIn: "power2.out",
    zoomOut: "power3.inOut",
    cameraPan: "power2.inOut",
    chartReveal: "power4.out",
    transition: "power4.out",
    transitionSoft: "power2.out",
    transitionSlash: "power3.inOut",
    ambient: "sine.inOut",
    linear: "none",

    // Named aliases used by themes, templates, and Stage.ease()
    power4: "power4.out",
    power3: "power3.out",
    power2: "power2.out",
    power2In: "power2.in",
    power2InOut: "power2.inOut",
    power3InOut: "power3.inOut",
    editorial: "power3.out",
    snappy: "power4.out",
    expo: "expo.out",
    back: "back.out(1.2)",
    spring: "back.out(1.4)",
  });

  const MOTION_TOKENS = {
    version: 1,
    ZOOM_CAP,
    clampScale,
    eases: EASES,

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
      kenburns: {
        breathe: { period: 20, scale: 0.055, x: -14, ease: EASES.ambient },
        zoomOut: { period: 14, fromScale: 1.058, toScale: 1.0, x: 0, ease: EASES.zoomIn },
        pan:     { period: 18, scale: 1.055, dx: 28, ease: EASES.cameraPan },
        bg:      { period: 20, scale: 1.03, ease: EASES.ambient },
      },
    },

    // Data & chart reveals (power4.out)
    chart: {
      reveal: { dur: 0.72, stagger: 0.08, delay: 0.25, ease: EASES.chartReveal },
      axes:   { delay: 0.00, dur: 0.35, ease: EASES.textIn },
      bar:    { delay: 0.25, dur: 0.72, stagger: 0.08, ease: EASES.chartReveal },
      line:   { delay: 0.30, dur: 1.15, stagger: 0.14, ease: EASES.chartReveal },
      vline:  { delay: 0.15, stagger: 0.10, dur: 0.50, ease: EASES.chartReveal, labelDelay: 0.12 },
      marker: { dur: 0.30, ease: EASES.textIn, span: 0.85 },
      value:  { delay: 0.05, dur: 0.45, y: 10, ease: EASES.chartReveal },
      number: { delay: 0.20, dur: 1.10, scale: 0.92, enterDur: 0.50, ease: EASES.chartReveal },
      compare: {
        delay: 0.20, stagger: 0.55, countDur: 0.90, labelDelay: 0.15,
        arrowDelay: 0.45, arrowDur: 0.50, ease: EASES.chartReveal,
      },
      timeline: {
        lineDur: 0.90, ease: EASES.chartReveal,
        stepDelay: 0.25, stepStagger: 0.22, textDelay: 0.08,
      },
      startOffset: 0.25,
      compareStartOffset: 0.20,
      counterCaptionExtra: 0.25,
      markDelayFrac: 0.90,
      markStagger: 0.10,
      endLabelFrac: 0.80,
      barCueFrac: 0.90,
      countEndCueFrac: 0.85,
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

    // 8 slide entrance transitions
    transitions: {
      softFade:      { dur: 0.32, ease: EASES.transitionSoft },
      curtainRtl:    { dur: 0.52, ease: EASES.transition },
      accentSlash:   { veilDelay: 0.08, veilDur: 0.36, veilEase: EASES.transitionSoft, barDur: 0.52, barEase: EASES.transitionSlash },
      irisRise:      { dur: 0.48, ease: EASES.textIn, scale: 1.06 },
      splitCurtain:  { dur: 0.48, ease: EASES.transition },
      diagonalWipe:  { dur: 0.50, ease: EASES.transition },
      zoomIris:      { fadeDur: 0.32, fadeEase: EASES.transitionSoft, contentDur: 0.48, contentEase: EASES.textIn, fromScale: 1.04 },
      shutterBars:   { dur: 0.42, stagger: 0.055, ease: EASES.transition },
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

  window.MOTION_TOKENS = MOTION_TOKENS;
  if (!window.Stage) {
    window.Stage = { themes: {}, defineTheme(t) { this.themes[t.name] = t; } };
  }
  window.Stage.MOTION = MOTION_TOKENS;
  window.Stage.motionTokens = MOTION_TOKENS;
})();
