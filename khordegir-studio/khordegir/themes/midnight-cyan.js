/* Midnight Cyan — Deep Navy Tech Studio */
(function () {
  const MT = Stage.MOTION || window.MOTION_TOKENS;
  const colors = {
    bg: "#071324", bg2: "#0E1E36",
    surface: "#0F223D",
    text: "#F0F9FF", body: "#DCEEFF", muted: "#88A8CC",
    accent: "#22D3EE",
    danger: "#FB7185",
    dangerText: "#FDA4AF", dangerBadge: "rgba(251,113,133,.18)", accentBadge: "rgba(34,211,238,.16)",
    good: "#34D399",
    card: "#0F223D", cardBorder: "#1E3A5F", grid: "#1A3352", axis: "#6082A8",
    bubbleIn: "#152C4E", bubbleOut: "#134E4A", bubbleRed: "#4C1D2B",
    glow: "#22D3EE",
    series: ["#22D3EE", "#FB7185", "#94A3B8", "#FBBF24", "#34D399"],
    isDark: true
  };
  Stage.defineTheme({
    name: "midnight-cyan",
    label: "سرمه‌ای شب (فیروزه‌ای)",
    tokens: colors,
    colors,
    type: {
      number:  { size: 200, weight: 900, lh: 1.05 },
      hero:    { size: 78,  weight: 900, lh: 1.26 },
      h1:      { size: 54,  weight: 700, lh: 1.32 },
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
    layout: { margin: 80, top: 64, bottom: 64, radius: 18, badgeRadius: 10, cam: [24, 740, 584, 1055], scamLeft: 650 }
  });
})();
