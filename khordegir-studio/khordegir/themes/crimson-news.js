/* Crimson News — Bold Documentary / Breaking Report */
(function () {
  const colors = {
    bg: "#120B0E", bg2: "#1F1218",
    surface: "#1E1419",
    text: "#FFF5F7", body: "#F3DDE2", muted: "#BCA3AA",
    accent: "#F43F5E",
    danger: "#FB7185",
    dangerText: "#FDA4AF", dangerBadge: "rgba(251,113,133,.18)", accentBadge: "rgba(244,63,94,.18)",
    good: "#34D399",
    card: "#1E1419", cardBorder: "#3A222B", grid: "#331D25", axis: "#8A6D76",
    bubbleIn: "#291820", bubbleOut: "#183B33", bubbleRed: "#4B1622",
    glow: "#F43F5E",
    series: ["#F43F5E", "#FBBF24", "#94A3B8", "#38BDF8", "#34D399"],
    isDark: true
  };
  Stage.defineTheme({
    name: "crimson-news",
    label: "خبری زرشکی (پرانرژی)",
    tokens: colors,
    colors,
    type: {
      number:  { size: 200, weight: 900, lh: 1.05 },
      hero:    { size: 78,  weight: 900, lh: 1.26 },
      h1:      { size: 54,  weight: 800, lh: 1.32 },
      h2:      { size: 42,  weight: 700, lh: 1.35 },
      body:    { size: 34,  weight: 400, lh: 1.65 },
      quote:   { size: 44,  weight: 700, lh: 1.5 },
      eyebrow: { size: 30,  weight: 700, lh: 1.3 },
      caption: { size: 24,  weight: 400, lh: 1.4 },
      value:   { size: 64,  weight: 900, lh: 1.1 },
      label:   { size: 32,  weight: 700, lh: 1.35 },
      axis:    { size: 26,  weight: 400, lh: 1.2 }
    },
    ease: {
      power4: [0.16, 1, 0.3, 1],
      power3: [0.22, 1, 0.36, 1],
      back: "back.out(1.3)",
      editorial: [0.22, 1, 0.36, 1],
      snappy: [0.16, 1, 0.3, 1],
      spring: "back.out(1.5)",
      expo: [0.19, 1, 0.22, 1]
    },
    motion: {
      eyebrow: { delay: 0.04, dur: 0.34, y: 12, ease: "power4" },
      title:   { delay: 0.10, dur: 0.52, y: 24, ease: "power4" },
      body:    { delay: 0.20, dur: 0.44, x: 22, stagger: 0.08, ease: "power4" },
      card:    { delay: 0.20, dur: 0.48, y: 28, scale: 0.96, stagger: 0.09, ease: "power4" },
      bubble:  { delay: 0.24, dur: 0.38, y: 14, scale: 0.88, stagger: 0.18, ease: "back" },
      badge:   { delay: 0.28, dur: 0.36, scale: 0.82, ease: "back" },
      image:   { delay: 0.05, dur: 0.60, scale: 0.97, ease: "power4" },
      number:  { delay: 0.18, dur: 1.10, scale: 0.92, ease: "power3" },
      note:    { delay: 0.52, dur: 0.42, y: 10, ease: "power4" },
      axes:    { delay: 0.00, dur: 0.28, ease: "power3" },
      bar:     { delay: 0.22, dur: 0.62, stagger: 0.08, ease: "power3" },
      line:    { delay: 0.26, dur: 1.15, stagger: 0.15, ease: "power3" }
    },
    kenburns: { period: 17, scale: 0.06, x: -16 },
    glow: { opacity: [0.08, 0.15], move: 26, period: 10, x: 0.84, y: 0.10, size: 1.2 },
    fx: {
      variants: ["rise", "slide", "mask", "blur", "scale"],
      motions: { "breathe": 3, "zoom-out": 2, "pan-left": 1, "pan-right": 1, "depth": 2 },
      grain: true, dust: "random", leak: "random", accent: "random"
    },
    clip: { fade: 0.28, hold: 2.5, min: 6 },
    layout: { margin: 80, top: 64, bottom: 64, radius: 16, badgeRadius: 8, cam: [24, 740, 584, 1055], scamLeft: 650 }
  });
})();
