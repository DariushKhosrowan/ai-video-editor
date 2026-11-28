/* Magnates Noir — Deep cinema obsidian + antique gold + moody crimson */
(function () {
  const colors = {
    bg: "#0A0B0F", bg2: "#14161F",
    surface: "#171A24",
    text: "#F8F5EE", body: "#D9D4C8", muted: "#8C887D",
    accent: "#E5B85B",
    danger: "#D9383A",
    dangerText: "#F87171", dangerBadge: "rgba(217,56,58,.18)", accentBadge: "rgba(229,184,91,.16)",
    good: "#34D399",
    card: "#151822", cardBorder: "#2A2E3D", grid: "#242736", axis: "#6B7280",
    bubbleIn: "#1E2230", bubbleOut: "#15322A", bubbleRed: "#36181C",
    glow: "#E5B85B",
    series: ["#E5B85B", "#D9383A", "#94A3B8", "#38BDF8", "#34D399"],
    isDark: true
  };
  Stage.defineTheme({
    name: "magnates-noir",
    label: "نوآر سینمایی طلایی (Magnates Noir)",
    motionPersonality: "documentary-calm",
    tokens: colors,
    colors,
    type: {
      number:  { size: 204, weight: 900, lh: 1.05 },
      hero:    { size: 78,  weight: 900, lh: 1.26 },
      h1:      { size: 52,  weight: 800, lh: 1.32 },
      h2:      { size: 42,  weight: 700, lh: 1.35 },
      body:    { size: 34,  weight: 400, lh: 1.68 },
      quote:   { size: 44,  weight: 700, lh: 1.52 },
      eyebrow: { size: 28,  weight: 700, lh: 1.30 },
      caption: { size: 24,  weight: 400, lh: 1.40 },
      value:   { size: 64,  weight: 900, lh: 1.10 },
      label:   { size: 32,  weight: 700, lh: 1.35 },
      axis:    { size: 26,  weight: 400, lh: 1.20 }
    },
    ease: {
      power4: [0.16, 1, 0.3, 1], power3: [0.22, 1, 0.36, 1], back: "back.out(1.12)",
      editorial: [0.22, 1, 0.36, 1], snappy: [0.16, 1, 0.3, 1], spring: "back.out(1.25)", expo: [0.19, 1, 0.22, 1]
    },
    motion: {
      eyebrow: { delay: 0.08, dur: 0.45, y: 12, ease: "cinematic" },
      title:   { delay: 0.16, dur: 0.68, y: 24, ease: "cinematic" },
      body:    { delay: 0.28, dur: 0.58, x: 18, stagger: 0.14, ease: "silk" },
      card:    { delay: 0.28, dur: 0.64, y: 26, scale: 0.98, stagger: 0.16, ease: "cinematic" },
      bubble:  { delay: 0.30, dur: 0.48, y: 14, scale: 0.92, stagger: 0.26, ease: "fluid" },
      badge:   { delay: 0.34, dur: 0.44, scale: 0.88, ease: "vox" },
      image:   { delay: 0.08, dur: 0.78, scale: 0.985, ease: "cinematic" },
      number:  { delay: 0.24, dur: 1.40, scale: 0.93, ease: "power3" },
      note:    { delay: 0.68, dur: 0.50, y: 10, ease: "silk" },
      axes:    { delay: 0.00, dur: 0.38, ease: "power3" },
      bar:     { delay: 0.30, dur: 0.80, stagger: 0.12, ease: "power3" },
      line:    { delay: 0.36, dur: 1.40, stagger: 0.18, ease: "power3" }
    },
    kenburns: { period: 28, scale: 0.042, x: -10 },
    glow: { opacity: [0.06, 0.12], move: 22, period: 16, x: 0.84, y: 0.08, size: 1.3 },
    fx: { variants: ["blur", "rise", "mask"], motions: { "breathe": 3, "zoom-out": 2, "depth": 2 }, grain: true, dust: true, leak: true, accent: "glow" },
    clip: { fade: 0.40, hold: 2.8, min: 6.5 },
    layout: { margin: 80, top: 64, bottom: 64, radius: 14, badgeRadius: 8, cam: [24, 740, 584, 1055], scamLeft: 650 }
  });
})();
