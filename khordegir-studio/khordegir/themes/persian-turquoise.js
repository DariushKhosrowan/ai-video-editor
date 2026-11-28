/* Persian Turquoise — Deep lapis night + Nishapur turquoise & saffron gold */
(function () {
  const colors = {
    bg: "#091821", bg2: "#102735",
    surface: "#132E3E",
    text: "#F7FAFC", body: "#D7E6EE", muted: "#88A7B8",
    accent: "#1FC7C0",
    danger: "#E85D56",
    dangerText: "#FCA5A5", dangerBadge: "rgba(232,93,86,.18)", accentBadge: "rgba(31,199,192,.16)",
    good: "#34D399",
    card: "#112938", cardBorder: "#23495E", grid: "#1C3B4D", axis: "#7195A8",
    bubbleIn: "#18374A", bubbleOut: "#113D3A", bubbleRed: "#3E1E24",
    glow: "#1FC7C0",
    series: ["#1FC7C0", "#F4B942", "#E85D56", "#60A5FA", "#34D399"],
    isDark: true
  };
  Stage.defineTheme({
    name: "persian-turquoise",
    label: "فیروزه نیشابور و زعفران (Persian Turquoise)",
    motionPersonality: "podcast-story",
    tokens: colors,
    colors,
    type: {
      number:  { size: 198, weight: 900, lh: 1.05 },
      hero:    { size: 76,  weight: 900, lh: 1.28 },
      h1:      { size: 52,  weight: 800, lh: 1.32 },
      h2:      { size: 42,  weight: 700, lh: 1.35 },
      body:    { size: 34,  weight: 400, lh: 1.68 },
      quote:   { size: 44,  weight: 700, lh: 1.52 },
      eyebrow: { size: 30,  weight: 700, lh: 1.30 },
      caption: { size: 24,  weight: 400, lh: 1.40 },
      value:   { size: 64,  weight: 900, lh: 1.10 },
      label:   { size: 32,  weight: 700, lh: 1.35 },
      axis:    { size: 26,  weight: 400, lh: 1.20 }
    },
    ease: {
      power4: [0.16, 1, 0.3, 1], power3: [0.22, 1, 0.36, 1], back: "back.out(1.16)",
      editorial: [0.22, 1, 0.36, 1], snappy: [0.16, 1, 0.3, 1], spring: "back.out(1.28)", expo: [0.19, 1, 0.22, 1]
    },
    motion: {
      eyebrow: { delay: 0.08, dur: 0.48, y: 12, ease: "silk" },
      title:   { delay: 0.16, dur: 0.68, y: 22, ease: "fluid" },
      body:    { delay: 0.28, dur: 0.60, x: 18, stagger: 0.15, ease: "silk" },
      card:    { delay: 0.28, dur: 0.64, y: 26, scale: 0.98, stagger: 0.17, ease: "fluid" },
      bubble:  { delay: 0.30, dur: 0.48, y: 14, scale: 0.92, stagger: 0.26, ease: "fluid" },
      badge:   { delay: 0.34, dur: 0.44, scale: 0.88, ease: "vox" },
      image:   { delay: 0.08, dur: 0.74, scale: 0.985, ease: "silk" },
      number:  { delay: 0.24, dur: 1.38, scale: 0.93, ease: "power3" },
      note:    { delay: 0.65, dur: 0.50, y: 10, ease: "silk" },
      axes:    { delay: 0.00, dur: 0.38, ease: "power3" },
      bar:     { delay: 0.30, dur: 0.80, stagger: 0.12, ease: "power3" },
      line:    { delay: 0.36, dur: 1.38, stagger: 0.18, ease: "power3" }
    },
    kenburns: { period: 28, scale: 0.04, x: -9 },
    glow: { opacity: [0.06, 0.12], move: 22, period: 16, x: 0.84, y: 0.10, size: 1.25 },
    fx: { variants: ["rise", "blur", "mask"], motions: { "breathe": 3, "gentle-drift": 2, "depth": 2 }, grain: true, dust: true, leak: false, accent: "glow" },
    clip: { fade: 0.38, hold: 2.8, min: 6.5 },
    layout: { margin: 80, top: 64, bottom: 64, radius: 18, badgeRadius: 10, cam: [24, 740, 584, 1055], scamLeft: 650 }
  });
})();
