/* تم «خرده‌گیر — تیره» (پیش‌فرض). برای ساختن تم جدید: این فایل را کپی کن، اسمش را عوض کن
   (مثلاً my-theme.js)، رنگ‌ها را تغییر بده و python3 -m khordegir index را بزن. */
(function () {
  const MT = Stage.MOTION || window.MOTION_TOKENS;
  const colors = {
    bg: "#121212", bg2: "#1C1C1C",
    surface: "#1D1D1D",
    text: "#FFFFFF", body: "#E6E6E6", muted: "#9E9E9E",
    accent: "#FFD600",                 // فقط برای داده‌ی کلیدی/مثبت
    danger: "#E53935",                 // فقط برای عدد بد/منفی
    dangerText: "#FF5252", dangerBadge: "rgba(229,57,53,.16)", accentBadge: "rgba(255,214,0,.14)",
    good: "#43A047",
    card: "#1D1D1D", cardBorder: "#2E2E2E", grid: "#2A2A2A", axis: "#6E6E6E",
    bubbleIn: "#262626", bubbleOut: "#1B3A2B", bubbleRed: "#3A1B1B",
    glow: "#FFD600",
    series: ["#FFD600", "#E53935", "#9E9E9E", "#4FC3F7", "#81C784"],
    isDark: true
  };
  Stage.defineTheme({
    name: "khordegir-dark",
    label: "خرده‌گیر — تیره (پیش‌فرض)",
    tokens: colors,
    colors,
    type: {
      number:  { size: 200, weight: 900, lh: 1.05 },
      hero:    { size: 76,  weight: 900, lh: 1.28 },
      h1:      { size: 52,  weight: 700, lh: 1.32 },
      h2:      { size: 42,  weight: 700, lh: 1.35 },
      body:    { size: 34,  weight: 400, lh: 1.65 },
      quote:   { size: 42,  weight: 700, lh: 1.5 },
      eyebrow: { size: 30,  weight: 700, lh: 1.3 },
      caption: { size: 24,  weight: 400, lh: 1.4 },
      value:   { size: 64,  weight: 900, lh: 1.1 },
      label:   { size: 32,  weight: 700, lh: 1.35 },
      axis:    { size: 26,  weight: 400, lh: 1.2 }
    },
    ease: MT.themeEases(),
    motion: MT.themeMotion(),
    kenburns: Object.assign({}, MT.camera.kenburns.breathe),
    glow: Object.assign({}, MT.atmosphere.glow, { opacity: [0.06, 0.11], move: 24, x: 0.86, y: 0.06, size: 1.25 }),
    fx: {
      variants: ["rise", "slide", "mask", "blur", "scale"],
      motions: { "breathe": 3, "zoom-out": 2, "pan-left": 1, "pan-right": 1, "depth": 2 },
      grain: true, dust: "random", leak: "random", accent: "random"
    },
    clip: Object.assign({}, MT.clip),
    layout: {
      margin: 80, top: 64, bottom: 64, radius: 16, badgeRadius: 8,
      cam: [24, 740, 584, 1055],
      scamLeft: 650
    }
  });
})();
