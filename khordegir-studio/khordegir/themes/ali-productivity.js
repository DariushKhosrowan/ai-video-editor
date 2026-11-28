/* Clean Study Desk — Warm ivory productivity & slow step-by-step teaching theme */
(function () {
  const colors = {
    bg: "#FAF7F2", bg2: "#F0EAE0",
    surface: "#FFFFFF",
    text: "#182230", body: "#344054", muted: "#667085",
    accent: "#2563EB",
    danger: "#E11D48",
    dangerText: "#BE123C", dangerBadge: "rgba(225,29,72,.12)", accentBadge: "rgba(37,99,235,.12)",
    good: "#059669",
    card: "#FFFFFF", cardBorder: "#E4DDD0", grid: "#E4DDD0", axis: "#667085",
    bubbleIn: "#EEF2F6", bubbleOut: "#DCFCE7", bubbleRed: "#FFE4E6",
    glow: "#2563EB",
    series: ["#2563EB", "#059669", "#D97706", "#E11D48", "#7C3AED"],
    isDark: false
  };
  Stage.defineTheme({
    name: "ali-productivity",
    label: "میز آموزش مینیمال (Clean Study Desk)",
    motionPersonality: "explainer-slow",
    tokens: colors,
    colors,
    type: {
      number:  { size: 192, weight: 900, lh: 1.05 },
      hero:    { size: 74,  weight: 900, lh: 1.28 },
      h1:      { size: 50,  weight: 800, lh: 1.32 },
      h2:      { size: 40,  weight: 700, lh: 1.35 },
      body:    { size: 34,  weight: 500, lh: 1.68 },
      quote:   { size: 42,  weight: 700, lh: 1.52 },
      eyebrow: { size: 28,  weight: 800, lh: 1.30 },
      caption: { size: 24,  weight: 500, lh: 1.40 },
      value:   { size: 62,  weight: 900, lh: 1.10 },
      label:   { size: 32,  weight: 700, lh: 1.35 },
      axis:    { size: 26,  weight: 500, lh: 1.20 }
    },
    ease: {
      power4: [0.16, 1, 0.3, 1], power3: [0.22, 1, 0.36, 1], back: "back.out(1.16)",
      editorial: [0.22, 1, 0.36, 1], snappy: [0.16, 1, 0.3, 1], spring: "back.out(1.28)", expo: [0.19, 1, 0.22, 1]
    },
    motion: {
      eyebrow: { delay: 0.08, dur: 0.45, y: 12, ease: "fluid" },
      title:   { delay: 0.16, dur: 0.62, y: 20, ease: "fluid" },
      body:    { delay: 0.28, dur: 0.56, x: 18, stagger: 0.14, ease: "silk" },
      card:    { delay: 0.28, dur: 0.60, y: 24, scale: 0.98, stagger: 0.15, ease: "fluid" },
      bubble:  { delay: 0.30, dur: 0.45, y: 14, scale: 0.92, stagger: 0.25, ease: "fluid" },
      badge:   { delay: 0.34, dur: 0.42, scale: 0.88, ease: "vox" },
      image:   { delay: 0.08, dur: 0.70, scale: 0.985, ease: "fluid" },
      number:  { delay: 0.24, dur: 1.30, scale: 0.94, ease: "power3" },
      note:    { delay: 0.62, dur: 0.48, y: 10, ease: "silk" },
      axes:    { delay: 0.00, dur: 0.36, ease: "power3" },
      bar:     { delay: 0.28, dur: 0.76, stagger: 0.12, ease: "power3" },
      line:    { delay: 0.34, dur: 1.30, stagger: 0.18, ease: "power3" }
    },
    kenburns: { period: 26, scale: 0.036, x: -8 },
    glow: { opacity: [0.04, 0.08], move: 18, period: 16, x: 0.84, y: 0.10, size: 1.1 },
    fx: { variants: ["rise", "slide", "mask"], motions: { "breathe": 3, "gentle-drift": 2 }, grain: false, dust: false, leak: false, accent: "line" },
    clip: { fade: 0.34, hold: 2.8, min: 6.5 },
    layout: { margin: 80, top: 64, bottom: 64, radius: 20, badgeRadius: 10, cam: [24, 740, 584, 1055], scamLeft: 650 }
  });
})();
