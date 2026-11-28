/* Viral Shorts — High-contrast midnight charcoal + electric lime & coral */
(function () {
  const colors = {
    bg: "#0D0E12", bg2: "#161821",
    surface: "#1B1E2A",
    text: "#FFFFFF", body: "#ECEEF4", muted: "#98A2B3",
    accent: "#C6FF00",
    danger: "#FF3B5C",
    dangerText: "#FF6B84", dangerBadge: "rgba(255,59,92,.20)", accentBadge: "rgba(198,255,0,.16)",
    good: "#00E5A0",
    card: "#171A24", cardBorder: "#2D3244", grid: "#252A3A", axis: "#7A8499",
    bubbleIn: "#212636", bubbleOut: "#11362B", bubbleRed: "#3E1722",
    glow: "#C6FF00",
    series: ["#C6FF00", "#FF3B5C", "#00E5FF", "#FFB800", "#A855F7"],
    isDark: true
  };
  Stage.defineTheme({
    name: "viral-shorts",
    label: "شورتس پرانرژی (Viral Shorts)",
    motionPersonality: "punchy",
    tokens: colors,
    colors,
    type: {
      number:  { size: 210, weight: 900, lh: 1.02 },
      hero:    { size: 80,  weight: 900, lh: 1.22 },
      h1:      { size: 54,  weight: 800, lh: 1.30 },
      h2:      { size: 44,  weight: 700, lh: 1.32 },
      body:    { size: 35,  weight: 500, lh: 1.60 },
      quote:   { size: 44,  weight: 800, lh: 1.46 },
      eyebrow: { size: 30,  weight: 800, lh: 1.28 },
      caption: { size: 24,  weight: 500, lh: 1.38 },
      value:   { size: 68,  weight: 900, lh: 1.08 },
      label:   { size: 32,  weight: 800, lh: 1.32 },
      axis:    { size: 26,  weight: 500, lh: 1.20 }
    },
    ease: {
      power4: [0.16, 1, 0.3, 1], power3: [0.22, 1, 0.36, 1], back: "back.out(1.32)",
      editorial: [0.16, 1, 0.3, 1], snappy: [0.14, 1, 0.28, 1], spring: "back.out(1.48)", expo: [0.19, 1, 0.22, 1]
    },
    motion: {
      eyebrow: { delay: 0.04, dur: 0.30, y: 12, ease: "snappy" },
      title:   { delay: 0.08, dur: 0.44, y: 24, ease: "snappy" },
      body:    { delay: 0.16, dur: 0.38, x: 20, stagger: 0.08, ease: "power4" },
      card:    { delay: 0.18, dur: 0.44, y: 28, scale: 0.95, stagger: 0.09, ease: "spring" },
      bubble:  { delay: 0.20, dur: 0.34, y: 16, scale: 0.86, stagger: 0.18, ease: "spring" },
      badge:   { delay: 0.22, dur: 0.34, scale: 0.80, ease: "pop" },
      image:   { delay: 0.04, dur: 0.50, scale: 0.98, ease: "power4" },
      number:  { delay: 0.16, dur: 0.95, scale: 0.90, ease: "power3" },
      note:    { delay: 0.48, dur: 0.38, y: 10, ease: "power4" },
      axes:    { delay: 0.00, dur: 0.26, ease: "power3" },
      bar:     { delay: 0.20, dur: 0.55, stagger: 0.07, ease: "power3" },
      line:    { delay: 0.24, dur: 0.98, stagger: 0.12, ease: "power3" }
    },
    kenburns: { period: 18, scale: 0.042, x: -12 },
    glow: { opacity: [0.07, 0.14], move: 26, period: 10, x: 0.84, y: 0.10, size: 1.25 },
    fx: { variants: ["scale", "slide", "rise"], motions: { "breathe": 2, "zoom-out": 3, "pan-left": 1 }, grain: false, dust: false, leak: true, accent: "glow" },
    clip: { fade: 0.24, hold: 2.2, min: 5.5 },
    layout: { margin: 76, top: 60, bottom: 60, radius: 18, badgeRadius: 10, cam: [24, 740, 584, 1055], scamLeft: 650 }
  });
})();
