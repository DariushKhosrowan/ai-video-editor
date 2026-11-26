/* Nordic Frost — Crisp daylight ice-slate light theme */
(function () {
  const MT = Stage.MOTION || window.MOTION_TOKENS;
  const colors = {
    bg: "#EFF5FB", bg2: "#E2ECF7",
    surface: "#FFFFFF",
    text: "#0F172A", body: "#1E293B", muted: "#475569",
    accent: "#0284C7",
    danger: "#DC2626",
    dangerText: "#B91C1C", dangerBadge: "rgba(220,38,38,.12)", accentBadge: "rgba(2,132,199,.12)",
    good: "#059669",
    card: "#FFFFFF", cardBorder: "#CBD5E1", grid: "#CBD5E1", axis: "#64748B",
    bubbleIn: "#E2E8F0", bubbleOut: "#D1FAE5", bubbleRed: "#FEE2E2",
    glow: "#0284C7",
    series: ["#0284C7", "#DC2626", "#475569", "#7C3AED", "#059669"],
    isDark: false
  };
  Stage.defineTheme({
    name: "nordic-frost",
    label: "آبی نوردیک (روشن)",
    tokens: colors,
    colors,
    type: {
      number:  { size: 196, weight: 900, lh: 1.05 },
      hero:    { size: 76,  weight: 900, lh: 1.26 },
      h1:      { size: 52,  weight: 800, lh: 1.32 },
      h2:      { size: 42,  weight: 700, lh: 1.35 },
      body:    { size: 34,  weight: 500, lh: 1.65 },
      quote:   { size: 42,  weight: 700, lh: 1.5 },
      eyebrow: { size: 30,  weight: 700, lh: 1.3 },
      caption: { size: 24,  weight: 500, lh: 1.4 },
      value:   { size: 64,  weight: 900, lh: 1.1 },
      label:   { size: 32,  weight: 700, lh: 1.35 },
      axis:    { size: 26,  weight: 500, lh: 1.2 }
    },
    ease: MT.themeEases(),
    motion: MT.themeMotion(),
    kenburns: Object.assign({}, MT.camera.kenburns.breathe),
    glow: Object.assign({}, MT.atmosphere.glow, { opacity: [0.05, 0.10], move: 22, x: 0.80, y: 0.12, size: 1.15 }),
    fx: {
      variants: ["rise", "slide", "mask", "blur", "scale"],
      motions: { "breathe": 3, "zoom-out": 2, "pan-left": 1, "pan-right": 1, "depth": 2 },
      grain: true, dust: false, leak: false, accent: "random"
    },
    clip: Object.assign({}, MT.clip),
    layout: { margin: 80, top: 64, bottom: 64, radius: 18, badgeRadius: 10, cam: [24, 740, 584, 1055], scamLeft: 650 }
  });
})();
