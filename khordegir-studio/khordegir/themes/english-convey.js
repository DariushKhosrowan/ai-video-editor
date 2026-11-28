/* English Convey — LTR (English) theme.
   Brand: red eagle on near-black (assets/brand/logo.jpg in english-convey-playbook: bg ~#0B0B0D, red ~#ED1C24).
   dir:"ltr" switches the whole stage to left-to-right: latin digits ("1,234.5"), text starts on the left,
   "slide"/"mask" entrances come from the left. Fonts: Montserrat (headings/numbers) + Inter (body), SIL OFL 1.1.
   Colour roles: accent = brand red (key word / key number), danger = amber (warning / the "bad" side of a comparison),
   good = green, info = blue. Copy this file to make another LTR theme and add it to themes (index runs automatically). */
Stage.defineTheme({
  name: "english-convey",
  label: "English Convey — dark (LTR)",
  dir: "ltr",
  lang: "en",
  digits: "latin",
  font: {
    family: "Montserrat",
    body: "Inter",
    faces: [
      { family: "Montserrat", file: "Montserrat-400.woff2", weight: "100 500" },
      { family: "Montserrat", file: "Montserrat-600.woff2", weight: "600 700" },
      { family: "Montserrat", file: "Montserrat-800.woff2", weight: "800 850" },
      { family: "Montserrat", file: "Montserrat-900.woff2", weight: "860 1000" },
      { family: "Inter", file: "Inter-400.woff2", weight: "100 500" },
      { family: "Inter", file: "Inter-600.woff2", weight: "600 1000" }
    ]
  },
  colors: {
    bg: "#0B0E14", bg2: "#141923",
    text: "#FFFFFF", body: "#E6E9EF", muted: "#98A2B3",
    accent: "#F2333B",
    danger: "#F5A524",
    dangerText: "#FFB547", dangerBadge: "rgba(245,165,36,.16)", accentBadge: "rgba(242,51,59,.16)",
    good: "#34D399", info: "#60A5FA",
    card: "#141922", cardBorder: "#252C39", grid: "#222936", axis: "#5B6475",
    bubbleIn: "#1C2230", bubbleOut: "#3A1518", bubbleRed: "#33240E",
    glow: "#F2333B",
    series: ["#F2333B", "#FFFFFF", "#98A2B3", "#F5A524", "#60A5FA"]
  },
  type: {
    number:  { size: 190, weight: 900, lh: 1.0 },
    hero:    { size: 84,  weight: 900, lh: 1.08 },
    h1:      { size: 56,  weight: 800, lh: 1.15 },
    body:    { size: 36,  weight: 400, lh: 1.45 },
    quote:   { size: 50,  weight: 700, lh: 1.25 },
    eyebrow: { size: 26,  weight: 800, lh: 1.3 },
    caption: { size: 24,  weight: 400, lh: 1.4 },
    value:   { size: 64,  weight: 900, lh: 1.05 },
    label:   { size: 32,  weight: 700, lh: 1.25 },
    axis:    { size: 24,  weight: 400, lh: 1.2 }
  },
  ease: { power4: [0.16, 1, 0.3, 1], power3: [0.22, 1, 0.36, 1], back: "back.out(1.4)", expo: [0.19, 1, 0.22, 1] },
  motion: {
    eyebrow: { delay: 0.05, dur: 0.35, y: 12, ease: "power4" },
    title:   { delay: 0.12, dur: 0.55, y: 26, ease: "power4" },
    body:    { delay: 0.24, dur: 0.45, x: -20, stagger: 0.09, ease: "power4" },
    card:    { delay: 0.22, dur: 0.50, y: 30, scale: 0.97, stagger: 0.11, ease: "power4" },
    bubble:  { delay: 0.25, dur: 0.38, y: 14, scale: 0.9, stagger: 0.22, ease: "back" },
    badge:   { delay: 0.30, dur: 0.38, scale: 0.85, ease: "back" },
    image:   { delay: 0.05, dur: 0.60, scale: 0.985, ease: "power4" },
    number:  { delay: 0.20, dur: 1.15, scale: 0.92, ease: "power3" },
    note:    { delay: 0.60, dur: 0.45, y: 10, ease: "power4" },
    axes:    { delay: 0.00, dur: 0.30, ease: "power3" },
    bar:     { delay: 0.25, dur: 0.65, stagger: 0.08, ease: "power3" },
    line:    { delay: 0.30, dur: 1.20, stagger: 0.15, ease: "power3" },
    word:    { delay: 0.10, dur: 0.42, y: 34, stagger: 0.075, ease: "expo" }
  },
  kenburns: { period: 20, scale: 0.055, x: 14 },
  glow: { opacity: [0.05, 0.10], move: 24, period: 12, x: 0.14, y: 0.06, size: 1.25 },
  fx: {
    variants: ["rise", "slide", "mask", "blur", "scale"],
    motions: { "breathe": 3, "zoom-out": 2, "pan-left": 1, "pan-right": 1, "depth": 2 },
    grain: true, dust: "random", leak: "random", accent: "random", autoTransition: true, emphasisPop: true, handDrawn: true
  },
  background: { style: "explainer" },
  clip: { fade: 0.3, hold: 2.5, min: 6 },
  layout: {
    margin: 80, top: 64, bottom: 64, radius: 18, badgeRadius: 8,
    safe: { x: 96, y: 72 },
    cam: [24, 740, 584, 1055],
    scamLeft: 650
  }
});
