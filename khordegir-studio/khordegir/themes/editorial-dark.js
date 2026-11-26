/* Editorial Dark — Obsidian Slate + Warm Gold Amber */
(function () {
  const MT = Stage.MOTION || window.MOTION_TOKENS;
  const colors = {
    bg: "#0B0E14", bg2: "#141923",
    surface: "#141923",
    text: "#F8FAFC", body: "#E2E8F0", muted: "#94A3B8",
    accent: "#F5B700",
    danger: "#EF4444",
    dangerText: "#F87171", dangerBadge: "rgba(239,68,68,.18)", accentBadge: "rgba(245,183,0,.16)",
    good: "#10B981",
    card: "#141923", cardBorder: "#263145", grid: "#222B3B", axis: "#64748B",
    bubbleIn: "#1E293B", bubbleOut: "#134E4A", bubbleRed: "#451A1A",
    glow: "#F5B700",
    series: ["#F5B700", "#EF4444", "#94A3B8", "#38BDF8", "#34D399"],
    isDark: true
  };
  Stage.defineTheme({
    name: "editorial-dark",
    label: "تحریریه تیره (طلایی)",
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
