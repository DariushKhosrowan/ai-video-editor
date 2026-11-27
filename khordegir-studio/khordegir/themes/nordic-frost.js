/* Nordic Frost — Crisp daylight ice-slate light theme */
(function () {
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
    ease: {
      power4: [0.16, 1, 0.3, 1],
      power3: [0.22, 1, 0.36, 1],
      back: "back.out(1.25)",
      editorial: [0.22, 1, 0.36, 1],
      snappy: [0.16, 1, 0.3, 1],
      spring: "back.out(1.4)",
      expo: [0.19, 1, 0.22, 1]
    },
    motion: {
      eyebrow: { delay: 0.05, dur: 0.38, y: 12, ease: "power4" },
      title:   { delay: 0.12, dur: 0.58, y: 24, ease: "power4" },
      body:    { delay: 0.22, dur: 0.48, x: 22, stagger: 0.09, ease: "power4" },
      card:    { delay: 0.22, dur: 0.52, y: 28, scale: 0.96, stagger: 0.10, ease: "power4" },
      bubble:  { delay: 0.25, dur: 0.40, y: 14, scale: 0.88, stagger: 0.20, ease: "back" },
      badge:   { delay: 0.30, dur: 0.40, scale: 0.82, ease: "back" },
      image:   { delay: 0.05, dur: 0.65, scale: 0.97, ease: "power4" },
      number:  { delay: 0.20, dur: 1.15, scale: 0.92, ease: "power3" },
      note:    { delay: 0.55, dur: 0.45, y: 10, ease: "power4" },
      axes:    { delay: 0.00, dur: 0.30, ease: "power3" },
      bar:     { delay: 0.25, dur: 0.65, stagger: 0.08, ease: "power3" },
      line:    { delay: 0.30, dur: 1.20, stagger: 0.15, ease: "power3" }
    },
    kenburns: { period: 18, scale: 0.055, x: -14 },
    glow: { opacity: [0.05, 0.10], move: 22, period: 12, x: 0.80, y: 0.12, size: 1.15 },
    fx: {
      variants: ["rise", "slide", "mask", "blur", "scale"],
      motions: { "breathe": 3, "zoom-out": 2, "pan-left": 1, "pan-right": 1, "depth": 2 },
      grain: true, dust: false, leak: false, accent: "random"
    },
    clip: { fade: 0.3, hold: 2.5, min: 6 },
    layout: { margin: 80, top: 64, bottom: 64, radius: 18, badgeRadius: 10, cam: [24, 740, 584, 1055], scamLeft: 650 }
  });
})();
