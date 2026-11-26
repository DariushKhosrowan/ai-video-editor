/* Royal Indigo — Deep Studio Indigo + Electric Violet Gold */
(function () {
  const MT = Stage.MOTION || window.MOTION_TOKENS;
  const colors = {
    bg: "#0D0B1D", bg2: "#171433",
    surface: "#161330",
    text: "#F5F3FF", body: "#E4E0FA", muted: "#9D97C8",
    accent: "#A78BFA",
    danger: "#FB7185",
    dangerText: "#FDA4AF", dangerBadge: "rgba(251,113,133,.18)", accentBadge: "rgba(167,139,250,.18)",
    good: "#34D399",
    card: "#161330", cardBorder: "#2E295E", grid: "#26214D", axis: "#716B9E",
    bubbleIn: "#211D47", bubbleOut: "#15403E", bubbleRed: "#4A1829",
    glow: "#A78BFA",
    series: ["#A78BFA", "#FBBF24", "#FB7185", "#38BDF8", "#34D399"],
    isDark: true
  };
  Stage.defineTheme({
    name: "royal-indigo",
    label: "نیلی سلطنتی (بنفش)",
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
    glow: Object.assign({}, MT.atmosphere.glow, { opacity: [0.08, 0.16], move: 26, x: 0.84, y: 0.10, size: 1.2 }),
    fx: {
      variants: ["rise", "slide", "mask", "blur", "scale"],
      motions: { "breathe": 3, "zoom-out": 2, "pan-left": 1, "pan-right": 1, "depth": 2 },
      grain: true, dust: "random", leak: "random", accent: "random"
    },
    clip: Object.assign({}, MT.clip),
    layout: { margin: 80, top: 64, bottom: 64, radius: 18, badgeRadius: 10, cam: [24, 740, 584, 1055], scamLeft: 650 }
  });
})();
