/* Kurzgesagt Cosmos — Deep twilight indigo + luminous educational science palette */
(function () {
  const colors = {
    bg: "#0B1026", bg2: "#141D3D",
    surface: "#182247",
    text: "#F8FAFC", body: "#DCE5F9", muted: "#93A4CC",
    accent: "#38BDF8",
    danger: "#FB7185",
    dangerText: "#FDA4AF", dangerBadge: "rgba(251,113,133,.18)", accentBadge: "rgba(56,189,248,.18)",
    good: "#34D399",
    card: "#162042", cardBorder: "#2A3A6E", grid: "#22305C", axis: "#7C8FB8",
    bubbleIn: "#1E2B57", bubbleOut: "#133B3A", bubbleRed: "#451A2B",
    glow: "#38BDF8",
    series: ["#38BDF8", "#FBBF24", "#FB7185", "#34D399", "#A78BFA"],
    isDark: true
  };
  Stage.defineTheme({
    name: "kurzgesagt-cosmos",
    label: "کیهان علمی (Cosmos Explainer)",
    motionPersonality: "explainer-slow",
    tokens: colors,
    colors,
    type: {
      number:  { size: 196, weight: 900, lh: 1.05 },
      hero:    { size: 76,  weight: 900, lh: 1.26 },
      h1:      { size: 52,  weight: 800, lh: 1.32 },
      h2:      { size: 42,  weight: 700, lh: 1.35 },
      body:    { size: 34,  weight: 400, lh: 1.66 },
      quote:   { size: 42,  weight: 700, lh: 1.50 },
      eyebrow: { size: 30,  weight: 800, lh: 1.30 },
      caption: { size: 24,  weight: 500, lh: 1.40 },
      value:   { size: 64,  weight: 900, lh: 1.10 },
      label:   { size: 32,  weight: 700, lh: 1.35 },
      axis:    { size: 26,  weight: 500, lh: 1.20 }
    },
    ease: {
      power4: [0.16, 1, 0.3, 1], power3: [0.22, 1, 0.36, 1], back: "back.out(1.22)",
      editorial: [0.22, 1, 0.36, 1], snappy: [0.16, 1, 0.3, 1], spring: "back.out(1.36)", expo: [0.19, 1, 0.22, 1]
    },
    motion: {
      eyebrow: { delay: 0.06, dur: 0.42, y: 14, ease: "vox" },
      title:   { delay: 0.14, dur: 0.58, y: 24, ease: "vox" },
      body:    { delay: 0.24, dur: 0.50, x: 20, stagger: 0.11, ease: "fluid" },
      card:    { delay: 0.24, dur: 0.56, y: 28, scale: 0.96, stagger: 0.13, ease: "vox" },
      bubble:  { delay: 0.28, dur: 0.42, y: 14, scale: 0.90, stagger: 0.24, ease: "back" },
      badge:   { delay: 0.30, dur: 0.40, scale: 0.86, ease: "spring" },
      image:   { delay: 0.06, dur: 0.65, scale: 0.98, ease: "power4" },
      number:  { delay: 0.22, dur: 1.25, scale: 0.92, ease: "power3" },
      note:    { delay: 0.60, dur: 0.45, y: 10, ease: "silk" },
      axes:    { delay: 0.00, dur: 0.32, ease: "power3" },
      bar:     { delay: 0.26, dur: 0.70, stagger: 0.10, ease: "power3" },
      line:    { delay: 0.32, dur: 1.25, stagger: 0.16, ease: "power3" }
    },
    kenburns: { period: 24, scale: 0.04, x: -10 },
    glow: { opacity: [0.07, 0.13], move: 24, period: 14, x: 0.82, y: 0.14, size: 1.25 },
    fx: { variants: ["rise", "scale", "mask"], motions: { "breathe": 3, "gentle-drift": 2, "zoom-out": 2 }, grain: false, dust: true, leak: false, accent: "glow" },
    clip: { fade: 0.32, hold: 2.6, min: 6.2 },
    layout: { margin: 80, top: 64, bottom: 64, radius: 22, badgeRadius: 12, cam: [24, 740, 584, 1055], scamLeft: 650 }
  });
})();
