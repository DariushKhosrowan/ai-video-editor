/* Vox Documentary — Editorial newspaper parchment + signature yellow accent */
(function () {
  const colors = {
    bg: "#F5F1E6", bg2: "#EAE2D0",
    surface: "#FFFDF7",
    text: "#141414", body: "#262626", muted: "#5B574F",
    accent: "#E0A800",
    danger: "#D62828",
    dangerText: "#B91C1C", dangerBadge: "rgba(214,40,40,.13)", accentBadge: "rgba(255,212,0,.32)",
    good: "#1F7A54",
    card: "#FFFDF7", cardBorder: "#D8CEB8", grid: "#DDD4C0", axis: "#6B6559",
    bubbleIn: "#EBE4D5", bubbleOut: "#DCFCE7", bubbleRed: "#FEE2E2",
    glow: "#FFD400",
    series: ["#E0A800", "#141414", "#D62828", "#2563EB", "#1F7A54"],
    isDark: false
  };
  Stage.defineTheme({
    name: "vox-documentary",
    label: "مستند تحریریه (Vox Documentary)",
    motionPersonality: "documentary-calm",
    tokens: colors,
    colors,
    type: {
      number:  { size: 196, weight: 900, lh: 1.05 },
      hero:    { size: 76,  weight: 900, lh: 1.24 },
      h1:      { size: 52,  weight: 800, lh: 1.30 },
      h2:      { size: 42,  weight: 700, lh: 1.35 },
      body:    { size: 34,  weight: 500, lh: 1.66 },
      quote:   { size: 44,  weight: 700, lh: 1.50 },
      eyebrow: { size: 28,  weight: 800, lh: 1.30 },
      caption: { size: 24,  weight: 500, lh: 1.40 },
      value:   { size: 64,  weight: 900, lh: 1.10 },
      label:   { size: 32,  weight: 700, lh: 1.35 },
      axis:    { size: 26,  weight: 500, lh: 1.20 }
    },
    ease: {
      power4: [0.16, 1, 0.3, 1], power3: [0.22, 1, 0.36, 1], back: "back.out(1.15)",
      editorial: [0.22, 1, 0.36, 1], snappy: [0.16, 1, 0.3, 1], spring: "back.out(1.3)", expo: [0.19, 1, 0.22, 1]
    },
    motion: {
      eyebrow: { delay: 0.08, dur: 0.45, y: 12, ease: "vox" },
      title:   { delay: 0.16, dur: 0.65, y: 22, ease: "vox" },
      body:    { delay: 0.28, dur: 0.56, x: 20, stagger: 0.14, ease: "fluid" },
      card:    { delay: 0.28, dur: 0.62, y: 26, scale: 0.975, stagger: 0.16, ease: "vox" },
      bubble:  { delay: 0.30, dur: 0.48, y: 14, scale: 0.92, stagger: 0.26, ease: "fluid" },
      badge:   { delay: 0.34, dur: 0.44, scale: 0.88, ease: "vox" },
      image:   { delay: 0.08, dur: 0.72, scale: 0.985, ease: "power4" },
      number:  { delay: 0.24, dur: 1.35, scale: 0.94, ease: "power3" },
      note:    { delay: 0.65, dur: 0.50, y: 10, ease: "silk" },
      axes:    { delay: 0.00, dur: 0.38, ease: "power3" },
      bar:     { delay: 0.30, dur: 0.78, stagger: 0.12, ease: "power3" },
      line:    { delay: 0.34, dur: 1.35, stagger: 0.18, ease: "power3" }
    },
    kenburns: { period: 26, scale: 0.04, x: -10 },
    glow: { opacity: [0.05, 0.09], move: 18, period: 16, x: 0.85, y: 0.1, size: 1.1 },
    fx: { variants: ["rise", "mask", "slide"], motions: { "breathe": 3, "gentle-drift": 2, "zoom-out": 1 }, grain: true, dust: false, leak: false, accent: "line" },
    clip: { fade: 0.36, hold: 2.8, min: 6.5 },
    layout: { margin: 80, top: 64, bottom: 64, radius: 12, badgeRadius: 6, cam: [24, 740, 584, 1055], scamLeft: 650 }
  });
})();
