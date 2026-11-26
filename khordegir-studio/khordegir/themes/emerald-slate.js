/* Emerald Slate — Modern Finance & Business Documentary */
(function () {
  const MT = Stage.MOTION || window.MOTION_TOKENS;
  const colors = {
    bg: "#091512", bg2: "#11241E",
    surface: "#10231D",
    text: "#ECFDF5", body: "#D1FAE5", muted: "#8DB8A8",
    accent: "#10B981",
    danger: "#F87171",
    dangerText: "#FCA5A5", dangerBadge: "rgba(248,113,113,.18)", accentBadge: "rgba(16,185,129,.18)",
    good: "#34D399",
    card: "#10231D", cardBorder: "#1E4237", grid: "#1A382E", axis: "#5E8B7B",
    bubbleIn: "#163028", bubbleOut: "#0F4C3A", bubbleRed: "#451A1A",
    glow: "#10B981",
    series: ["#10B981", "#F87171", "#94A3B8", "#38BDF8", "#FBBF24"],
    isDark: true
  };
  Stage.defineTheme({
    name: "emerald-slate",
    label: "زمردی تحلیلی (مالی)",
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
    glow: Object.assign({}, MT.atmosphere.glow, { opacity: [0.07, 0.14], move: 24, x: 0.84, y: 0.10, size: 1.2 }),
    fx: {
      variants: ["rise", "slide", "mask", "blur", "scale"],
      motions: { "breathe": 3, "zoom-out": 2, "pan-left": 1, "pan-right": 1, "depth": 2 },
      grain: true, dust: "random", leak: "random", accent: "random"
    },
    clip: Object.assign({}, MT.clip),
    layout: { margin: 80, top: 64, bottom: 64, radius: 18, badgeRadius: 10, cam: [24, 740, 584, 1055], scamLeft: 650 }
  });
})();
