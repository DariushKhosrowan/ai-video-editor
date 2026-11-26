/* Crimson News — Bold Documentary / Breaking Report */
(function () {
  const MT = Stage.MOTION || window.MOTION_TOKENS;
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
    ease: MT.themeEases(),
    motion: MT.themeMotion(),
    kenburns: Object.assign({}, MT.camera.kenburns.breathe),
    glow: Object.assign({}, MT.atmosphere.glow, { opacity: [0.08, 0.15], move: 26, x: 0.84, y: 0.10, size: 1.2 }),
    fx: {
      variants: ["rise", "slide", "mask", "blur", "scale"],
      motions: { "breathe": 3, "zoom-out": 2, "pan-left": 1, "pan-right": 1, "depth": 2 },
      grain: true, dust: "random", leak: "random", accent: "random"
    },
    clip: Object.assign({}, MT.clip),
    layout: { margin: 80, top: 64, bottom: 64, radius: 16, badgeRadius: 8, cam: [24, 740, 584, 1055], scamLeft: 650 }
  });
})();
