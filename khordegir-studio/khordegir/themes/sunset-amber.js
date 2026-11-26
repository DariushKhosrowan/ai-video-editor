/* Sunset Amber — Warm Documentary Espresso + Amber Gold */
(function () {
  const MT = Stage.MOTION || window.MOTION_TOKENS;
  const colors = {
    bg: "#160E0A", bg2: "#231610",
    surface: "#211510",
    text: "#FFF8F0", body: "#F3E2D0", muted: "#C4A48A",
    accent: "#F59E0B",
    danger: "#F43F5E",
    dangerText: "#FDA4AF", dangerBadge: "rgba(244,63,94,.18)", accentBadge: "rgba(245,158,11,.18)",
    good: "#34D399",
    card: "#211510", cardBorder: "#3D271D", grid: "#332018", axis: "#8C6D58",
    bubbleIn: "#2B1B14", bubbleOut: "#173D35", bubbleRed: "#481821",
    glow: "#F59E0B",
    series: ["#F59E0B", "#F43F5E", "#94A3B8", "#38BDF8", "#34D399"],
    isDark: true
  };
  Stage.defineTheme({
    name: "sunset-amber",
    label: "غروب کهربایی (گرم)",
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
    glow: Object.assign({}, MT.atmosphere.glow, { opacity: [0.08, 0.16], move: 26, x: 0.84, y: 0.10, size: 1.22 }),
    fx: {
      variants: ["rise", "slide", "mask", "blur", "scale"],
      motions: { "breathe": 3, "zoom-out": 2, "pan-left": 1, "pan-right": 1, "depth": 2 },
      grain: true, dust: "random", leak: "random", accent: "random"
    },
    clip: Object.assign({}, MT.clip),
    layout: { margin: 80, top: 64, bottom: 64, radius: 18, badgeRadius: 10, cam: [24, 740, 584, 1055], scamLeft: 650 }
  });
})();
