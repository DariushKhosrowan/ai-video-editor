/* Khordegir Studio — Canonical Motion Tokens, Puppet Schema v2 & Acting Specs (100% offline, deterministic).
   MUST be loaded before stage/core.js.
   Enforces STAGE_ZOOM_CAP = 1.06 across stage camera/zoom, defines 18-part tree, 10 presets,
   15 emotions, 9 gestures, spring physics (stiffness/damping/mass), and script tag parsing. */
(function () {
  "use strict";

  const STAGE_ZOOM_CAP = 1.06;
  const PUPPET_SCHEMA_VERSION = 2;

  const FORMATS = {
    "16:9": { width: 1920, height: 1080, label: "افقی یوتیوب (16:9)" },
    "9:16": { width: 1080, height: 1920, label: "عمودی ریلز / شورتس (9:16)" },
    "1:1":  { width: 1080, height: 1080, label: "مربعی پست (1:1)" },
  };

  /* Locked Red Eagle character brand palette from reference sheet (protected when paletteLock === true) */
  const MASCOT_PALETTE = {
    redPrimary: "#EB1818",
    redHighlight: "#F72A2A",
    redShadow: "#A30E12",
    chestBlack: "#141418",
    chestHighlight: "#26262E",
    beakGold: "#F5A614",
    beakHighlight: "#F9BD32",
    beakShadow: "#C97808",
    mouthInterior: "#5A1014",
    tonguePink: "#E06C65",
    teethWhite: "#FFFFFF",
    scleraWhite: "#FFFFFF",
    pupilBlack: "#09090B",
    outline: "#09090B",
    sparkGold: "#F7AE1B",
    sweatWhite: "#F8FAFC",
  };

  /* Phase 4 Item 12: Multi-Character Cast (5 characters on the exact 18-part rig tree) */
  const CHARACTERS = {
    red_eagle: {
      label: "عقاب قرمز", labelEn: "Red Eagle", species: "eagle", defaultPreset: "lively",
      defaultVoice: { medianF0Hz: 165, pitchSpanSemitones: 6.0, preset: "lively" },
      palette: Object.assign({}, MASCOT_PALETTE),
    },
    vesper_owl: {
      label: "جغد وسپر", labelEn: "Vesper Owl", species: "owl", defaultPreset: "calm",
      defaultVoice: { medianF0Hz: 145, pitchSpanSemitones: 5.5, preset: "calm" },
      palette: Object.assign({}, MASCOT_PALETTE, {
        redPrimary: "#47467B", redHighlight: "#6362A3", redShadow: "#2B2A52",
        chestBlack: "#D9CFC1", chestHighlight: "#EFE8DD",
        beakGold: "#E8A42A", beakHighlight: "#F8C354", beakShadow: "#B87814",
      }),
    },
    pip_pigeon: {
      label: "کبوتر پیپ", labelEn: "Pip Pigeon", species: "pigeon", defaultPreset: "comedian",
      defaultVoice: { medianF0Hz: 198, pitchSpanSemitones: 7.0, preset: "comedian" },
      palette: Object.assign({}, MASCOT_PALETTE, {
        redPrimary: "#627D98", redHighlight: "#829AB1", redShadow: "#3E546B",
        chestBlack: "#2E7D6B", chestHighlight: "#48B29A",
        beakGold: "#E09A7B", beakHighlight: "#F2BCA3", beakShadow: "#B56F52",
      }),
    },
    midge_hummingbird: {
      label: "مرغ مگس‌خوار میج", labelEn: "Midge Hummingbird", species: "hummingbird", defaultPreset: "excited",
      defaultVoice: { medianF0Hz: 248, pitchSpanSemitones: 7.5, preset: "excited" },
      palette: Object.assign({}, MASCOT_PALETTE, {
        redPrimary: "#12A876", redHighlight: "#2BD49B", redShadow: "#0A6F4D",
        chestBlack: "#C81E56", chestHighlight: "#F0477E",
        beakGold: "#E5B429", beakHighlight: "#F7D25C", beakShadow: "#A87E0F",
      }),
    },
    barnaby_tortoise: {
      label: "لاک‌پشت بارنابی", labelEn: "Barnaby Tortoise", species: "tortoise", defaultPreset: "sleepy",
      defaultVoice: { medianF0Hz: 116, pitchSpanSemitones: 4.8, preset: "sleepy" },
      palette: Object.assign({}, MASCOT_PALETTE, {
        redPrimary: "#5C8A4D", redHighlight: "#7BAE6A", redShadow: "#3B5E30",
        chestBlack: "#A36B33", chestHighlight: "#C98F50",
        beakGold: "#D4B675", beakHighlight: "#E8CE96", beakShadow: "#9D8045",
      }),
    },
  };

  /* Phase 4 Item 13: 13 Costume & Accessory Slots across 4 Categories */
  const ACCESSORIES = {
    top_hat:    { slot: "hat",     label: "کلاه سیلندر",  labelEn: "Top Hat" },
    crown:      { slot: "hat",     label: "تاج طلایی",    labelEn: "Crown" },
    cap:        { slot: "hat",     label: "کلاه کپ",      labelEn: "Cap" },
    beanie:     { slot: "hat",     label: "کلاه بافتنی",  labelEn: "Beanie" },
    glasses:    { slot: "eyewear", label: "عینک",         labelEn: "Glasses" },
    sunglasses: { slot: "eyewear", label: "عینک آفتابی",  labelEn: "Sunglasses" },
    monocle:    { slot: "eyewear", label: "تک‌عینک",       labelEn: "Monocle" },
    bowtie:     { slot: "neck",    label: "پاپیون",       labelEn: "Bowtie" },
    necktie:    { slot: "neck",    label: "کراوات",       labelEn: "Necktie" },
    scarf:      { slot: "neck",    label: "شال‌گردن",      labelEn: "Scarf" },
    headphones: { slot: "prop",    label: "هدفون",        labelEn: "Headphones" },
    mic:        { slot: "prop",    label: "میکروفون",     labelEn: "Mic" },
    coffee_mug: { slot: "prop",    label: "لیوان قهوه",   labelEn: "Coffee Mug" },
  };

  /* Phase 4 Item 14: 6 One-Click Outfits */
  const OUTFITS = {
    default: { label: "پیش‌فرض",     labelEn: "Default",      accessories: [] },
    formal:  { label: "رسمی",        labelEn: "Formal",       accessories: ["top_hat", "bowtie", "monocle"] },
    podcast: { label: "میز پادکست",  labelEn: "Podcast Host", accessories: ["headphones", "mic"] },
    royal:   { label: "سلطنتی",      labelEn: "Royal",        accessories: ["crown", "bowtie"] },
    street:  { label: "خیابانی",     labelEn: "Street",       accessories: ["cap", "sunglasses"] },
    cozy:    { label: "دنج زمستانی", labelEn: "Cozy",         accessories: ["beanie", "scarf", "coffee_mug"] },
  };

  /* Phase 4 Item 14: 7 Seasonal & Studio Skins */
  const SKINS = {
    classic:     { label: "کلاسیک",       labelEn: "Classic",     paletteOverrides: {} },
    nowruz:      { label: "نوروز",        labelEn: "Nowruz",      paletteOverrides: { chestBlack: "#0F5E59", chestHighlight: "#1D8F87", sparkGold: "#38D9A9" } },
    yalda:       { label: "شب یلدا",      labelEn: "Yalda",       paletteOverrides: { redPrimary: "#B8142C", redHighlight: "#E02442", chestBlack: "#114B32", chestHighlight: "#1E7850" } },
    winter:      { label: "زمستانی",      labelEn: "Winter",      paletteOverrides: { redPrimary: "#2B6CB0", redHighlight: "#63B3ED", redShadow: "#1A365D", chestBlack: "#E2E8F0", chestHighlight: "#FFFFFF" } },
    autumn:      { label: "پاییزی",       labelEn: "Autumn",      paletteOverrides: { redPrimary: "#C85A17", redHighlight: "#EA7B2E", redShadow: "#7C3209", chestBlack: "#3B2417", chestHighlight: "#5E3A24" } },
    neon_studio: { label: "نئون استودیو", labelEn: "Neon Studio", paletteOverrides: { redPrimary: "#EC187A", redHighlight: "#FF4DA6", redShadow: "#990B4D", chestBlack: "#121029", chestHighlight: "#22D3EE", beakGold: "#00E5FF", beakHighlight: "#6BF2FF" } },
    noir:        { label: "فیلم نوآر",    labelEn: "Noir",        paletteOverrides: { redPrimary: "#94A3B8", redHighlight: "#CBD5E1", redShadow: "#475569", chestBlack: "#0F172A", chestHighlight: "#334155", beakGold: "#E2C044" } },
  };

  const LISTENER_REACTIONS = ["listening", "nodding", "interested", "skeptical", "surprised", "laughing", "thoughtful"];

  function resolveCharacterPalette(character, skin) {
    const cKey = CHARACTERS[character] ? character : "red_eagle";
    const sKey = SKINS[skin] ? skin : "classic";
    return Object.assign({}, CHARACTERS[cKey].palette, SKINS[sKey].paletteOverrides);
  }

  /* Puppet Schema v2 — Complete 18-Part Tree (body, head, beaks, eyes, pupils, lids, brows, crest, wings, tail, legs, accessories) */
  const PUPPET_PARTS = {
    body:        { label: "بدن و سینه",      labelEn: "Body",        parent: "root", pivotX: 320, pivotY: 540, zOrder: 4,  outlineWidth: 1.0, visible: true },
    head:        { label: "سر",              labelEn: "Head",        parent: "body", pivotX: 320, pivotY: 312, zOrder: 6,  outlineWidth: 1.0, visible: true },
    beak_upper:  { label: "منقار بالا",      labelEn: "Upper Beak",  parent: "beak", pivotX: 320, pivotY: 240, zOrder: 3,  outlineWidth: 1.0, visible: true },
    beak_lower:  { label: "منقار پایین",     labelEn: "Lower Beak",  parent: "beak", pivotX: 320, pivotY: 260, zOrder: 2,  outlineWidth: 1.0, visible: true },
    eye_l:       { label: "چشم چپ",          labelEn: "Left Eye",    parent: "eyes", pivotX: 272, pivotY: 186, zOrder: 1,  outlineWidth: 1.0, visible: true },
    eye_r:       { label: "چشم راست",        labelEn: "Right Eye",   parent: "eyes", pivotX: 368, pivotY: 186, zOrder: 2,  outlineWidth: 1.0, visible: true },
    pupil_l:     { label: "مردمک چپ",        labelEn: "Left Pupil",  parent: "eye_l", pivotX: 272, pivotY: 188, zOrder: 1, outlineWidth: 1.0, visible: true },
    pupil_r:     { label: "مردمک راست",      labelEn: "Right Pupil", parent: "eye_r", pivotX: 368, pivotY: 188, zOrder: 1, outlineWidth: 1.0, visible: true },
    lid_l:       { label: "پلک چپ",          labelEn: "Left Lid",    parent: "eye_l", pivotX: 272, pivotY: 186, zOrder: 2, outlineWidth: 1.0, visible: true },
    lid_r:       { label: "پلک راست",        labelEn: "Right Lid",   parent: "eye_r", pivotX: 368, pivotY: 186, zOrder: 2, outlineWidth: 1.0, visible: true },
    brow_l:      { label: "ابروی چپ",        labelEn: "Left Brow",   parent: "head", pivotX: 262, pivotY: 150, zOrder: 7,  outlineWidth: 1.0, visible: true },
    brow_r:      { label: "ابروی راست",      labelEn: "Right Brow",  parent: "head", pivotX: 378, pivotY: 150, zOrder: 8,  outlineWidth: 1.0, visible: true },
    crest:       { label: "تاج و بال سه‌خط",  labelEn: "Crest",       parent: "root", pivotX: 404, pivotY: 390, zOrder: 2,  outlineWidth: 1.0, visible: true },
    wing_l:      { label: "بال چپ",          labelEn: "Left Wing",   parent: "body", pivotX: 206, pivotY: 372, zOrder: 5,  outlineWidth: 1.0, visible: true },
    wing_r:      { label: "بال راست",        labelEn: "Right Wing",  parent: "body", pivotX: 434, pivotY: 372, zOrder: 5,  outlineWidth: 1.0, visible: true },
    tail:        { label: "دم",              labelEn: "Tail",        parent: "root", pivotX: 320, pivotY: 510, zOrder: 1,  outlineWidth: 1.0, visible: true },
    legs:        { label: "پاها و چنگال",    labelEn: "Legs",        parent: "root", pivotX: 320, pivotY: 614, zOrder: 3,  outlineWidth: 1.0, visible: true },
    accessories: { label: "اکسسوری‌ها",       labelEn: "Accessories", parent: "head", pivotX: 320, pivotY: 200, zOrder: 10, outlineWidth: 1.0, visible: true },
  };

  /* 8 Mouth Shapes / Visemes */
  const VISEMES = {
    closed:  { jawOpen: 0.00, upperLift: 0.00, widthScale: 1.00, teeth: 0.00, tongue: 0.00, lipTuck: 0.00 },
    rest:    { jawOpen: 0.03, upperLift: 0.00, widthScale: 1.00, teeth: 0.00, tongue: 0.00, lipTuck: 0.00 },
    small:   { jawOpen: 0.24, upperLift: 0.08, widthScale: 0.96, teeth: 0.08, tongue: 0.20, lipTuck: 0.00 },
    open:    { jawOpen: 0.56, upperLift: 0.20, widthScale: 1.02, teeth: 0.14, tongue: 0.68, lipTuck: 0.00 },
    wide:    { jawOpen: 0.88, upperLift: 0.34, widthScale: 1.12, teeth: 0.20, tongue: 0.95, lipTuck: 0.00 },
    round_o: { jawOpen: 0.52, upperLift: 0.16, widthScale: 0.72, teeth: 0.00, tongue: 0.45, lipTuck: 0.00 },
    e_teeth: { jawOpen: 0.28, upperLift: 0.14, widthScale: 1.16, teeth: 0.96, tongue: 0.10, lipTuck: 0.00 },
    f_v:     { jawOpen: 0.14, upperLift: 0.05, widthScale: 1.02, teeth: 0.65, tongue: 0.00, lipTuck: 0.85 },
  };

  /* 15 Emotions (Phase 2 Item 5 — backward compatible with all 7 v1 expressions + 8 new emotions)
     Blends brows, eyes, lids, beak, crestTilt, wings, and emotion-specific blinkMult (Phase 2 Item 7). */
  const EXPRESSIONS = {
    neutral: {
      label: "عادی / متمرکز", labelEn: "Neutral",
      browLRot: 12, browRRot: -12, browLY: 0, browRY: 0,
      eyeScaleX: 1.0, eyeScaleY: 1.0, upperLid: 0.04, lowerLid: 0.02,
      smugArc: 0, beakSmile: 0.0, headTilt: 0, headPitch: 0, crestTilt: 0,
      wingPose: "crossed", accent: "none", blinkMult: 1.0,
    },
    happy: {
      label: "خوشحال / پرانرژی", labelEn: "Happy",
      browLRot: -8, browRRot: 8, browLY: -8, browRY: -8,
      eyeScaleX: 1.04, eyeScaleY: 1.06, upperLid: 0.0, lowerLid: 0.18,
      smugArc: 0.18, beakSmile: 0.88, headTilt: -3, headPitch: -3, crestTilt: 5,
      wingPose: "open", accent: "sparkle", blinkMult: 1.1,
    },
    sad: {
      label: "غمگین / دلسرد", labelEn: "Sad",
      browLRot: -18, browRRot: 18, browLY: -4, browRY: -4,
      eyeScaleX: 0.96, eyeScaleY: 0.88, upperLid: 0.26, lowerLid: 0.18,
      smugArc: 0, beakSmile: -0.68, headTilt: 5, headPitch: 8, crestTilt: -9,
      wingPose: "tucked", accent: "none", blinkMult: 0.72,
    },
    angry: {
      label: "عصبانی / تند", labelEn: "Angry",
      browLRot: 28, browRRot: -28, browLY: 10, browRY: 10,
      eyeScaleX: 1.02, eyeScaleY: 0.78, upperLid: 0.34, lowerLid: 0.22,
      smugArc: 0, beakSmile: -0.65, headTilt: -3, headPitch: 6, crestTilt: 11,
      wingPose: "alert", accent: "shock", blinkMult: 0.78,
    },
    surprised: {
      label: "غافلگیر / متعجب", labelEn: "Surprised",
      browLRot: -16, browRRot: 16, browLY: -15, browRY: -15,
      eyeScaleX: 1.10, eyeScaleY: 1.14, upperLid: 0.0, lowerLid: 0.0,
      smugArc: 0, beakSmile: 0.05, headTilt: -3, headPitch: -5, crestTilt: 9,
      wingPose: "open", accent: "shock", blinkMult: 0.55,
    },
    shocked: {
      label: "شوکه / بهت‌زده", labelEn: "Shocked",
      browLRot: -20, browRRot: 20, browLY: -17, browRY: -17,
      eyeScaleX: 1.14, eyeScaleY: 1.18, upperLid: 0.0, lowerLid: 0.0,
      smugArc: 0, beakSmile: -0.25, headTilt: -5, headPitch: -7, crestTilt: 12,
      wingPose: "alert", accent: "shock", blinkMult: 0.45,
    },
    smug: {
      label: "مغرور / مطمئن", labelEn: "Smug",
      browLRot: 10, browRRot: -16, browLY: -3, browRY: 2,
      eyeScaleX: 1.0, eyeScaleY: 0.82, upperLid: 0.42, lowerLid: 0.24,
      smugArc: 0.88, beakSmile: 0.75, headTilt: 5, headPitch: -5, crestTilt: 6,
      wingPose: "crossed", accent: "sparkle", blinkMult: 0.85,
    },
    confused: {
      label: "گیج / سردرگم", labelEn: "Confused",
      browLRot: -15, browRRot: 18, browLY: -12, browRY: 6,
      eyeScaleX: 1.04, eyeScaleY: 0.96, upperLid: 0.08, lowerLid: 0.12,
      smugArc: 0, beakSmile: -0.22, headTilt: -9, headPitch: 2, crestTilt: -4,
      wingPose: "thinking", accent: "question", blinkMult: 1.28,
    },
    scared: {
      label: "ترسیده / مضطرب", labelEn: "Scared",
      browLRot: -22, browRRot: 22, browLY: -14, browRY: -14,
      eyeScaleX: 1.12, eyeScaleY: 1.15, upperLid: 0.0, lowerLid: 0.14,
      smugArc: 0, beakSmile: -0.55, headTilt: 4, headPitch: 5, crestTilt: -10,
      wingPose: "tucked", accent: "sweat", blinkMult: 1.45,
    },
    proud: {
      label: "سربلند / افتخار", labelEn: "Proud",
      browLRot: -6, browRRot: 6, browLY: -7, browRY: -7,
      eyeScaleX: 1.0, eyeScaleY: 0.90, upperLid: 0.22, lowerLid: 0.20,
      smugArc: 0.45, beakSmile: 0.70, headTilt: 4, headPitch: -8, crestTilt: 10,
      wingPose: "crossed", accent: "sparkle", blinkMult: 0.88,
    },
    bored: {
      label: "حوصله‌سربر / بی‌حوصله", labelEn: "Bored",
      browLRot: 4, browRRot: -4, browLY: 5, browRY: 5,
      eyeScaleX: 1.0, eyeScaleY: 0.72, upperLid: 0.56, lowerLid: 0.12,
      smugArc: 0, beakSmile: -0.30, headTilt: 7, headPitch: 6, crestTilt: -8,
      wingPose: "crossed", accent: "none", blinkMult: 0.62,
    },
    embarrassed: {
      label: "معذب / خجالت‌زده", labelEn: "Embarrassed",
      browLRot: -14, browRRot: 14, browLY: -9, browRY: -9,
      eyeScaleX: 0.98, eyeScaleY: 0.94, upperLid: 0.08, lowerLid: 0.12,
      smugArc: 0, beakSmile: 0.55, headTilt: 6, headPitch: 5, crestTilt: -5,
      wingPose: "tucked", accent: "sweat", blinkMult: 1.38,
    },
    thinking: {
      label: "در حال فکر", labelEn: "Thinking",
      browLRot: -10, browRRot: 15, browLY: -11, browRY: 4,
      eyeScaleX: 1.02, eyeScaleY: 1.02, upperLid: 0.10, lowerLid: 0.08,
      smugArc: 0, beakSmile: -0.1, headTilt: -7, headPitch: -3, crestTilt: 2,
      wingPose: "thinking", accent: "question", blinkMult: 0.92,
    },
    sarcastic: {
      label: "کنایه‌آمیز / طعنه", labelEn: "Sarcastic",
      browLRot: -12, browRRot: 18, browLY: -10, browRY: 6,
      eyeScaleX: 1.0, eyeScaleY: 0.80, upperLid: 0.44, lowerLid: 0.16,
      smugArc: 0.35, beakSmile: 0.52, headTilt: 6, headPitch: -2, crestTilt: 3,
      wingPose: "crossed", accent: "none", blinkMult: 0.95,
    },
    annoyed: {
      label: "کلافه / جدی", labelEn: "Annoyed",
      browLRot: 22, browRRot: -22, browLY: 7, browRY: 7,
      eyeScaleX: 1.0, eyeScaleY: 0.76, upperLid: 0.32, lowerLid: 0.14,
      smugArc: 0, beakSmile: -0.45, headTilt: 2, headPitch: 4, crestTilt: 4,
      wingPose: "crossed", accent: "none", blinkMult: 0.90,
    },
  };

  /* 9 Expressive Gestures (Phase 2 Item 6) */
  const GESTURES = {
    point:          { label: "اشاره کردن",       labelEn: "Point",        defaultDur: 1.15, pose: "point" },
    shrug:          { label: "شانه بالا انداختن", labelEn: "Shrug",        defaultDur: 1.10, pose: "shrug" },
    facepalm:       { label: "دست روی صورت",     labelEn: "Facepalm",     defaultDur: 1.35, pose: "facepalm" },
    "wing-cross":   { label: "دست‌به‌سینه",        labelEn: "Wing Cross",   defaultDur: 1.20, pose: "crossed" },
    "thumbs-up":    { label: "شست بالا (پر)",    labelEn: "Thumbs Up",    defaultDur: 1.15, pose: "thumbs-up" },
    clap:           { label: "دست زدن",          labelEn: "Clap",         defaultDur: 1.25, pose: "clap" },
    salute:         { label: "احترام نظامی",     labelEn: "Salute",       defaultDur: 1.20, pose: "salute" },
    "chin-scratch": { label: "خاراندن چانه",     labelEn: "Chin Scratch", defaultDur: 1.30, pose: "thinking" },
    "double-take":  { label: "نگاهِ دوباره",     labelEn: "Double Take",  defaultDur: 0.95, pose: "double-take" },
  };

  const ACTING = {
    blinkDuration: 0.15,
    doubleBlinkGap: 0.17,
    minBlinkInterval: 2.3,
    maxBlinkInterval: 4.9,
    breathePeriod: 3.6,
    breatheAmpY: 4.5,
    breatheScale: 0.014,
    squashMax: 0.055,
    headBobMaxY: 8.5,
    headTiltMaxDeg: 5.5,
    gestureMinPhraseSec: 1.35,
    enterDur: 0.55,
    exitDur: 0.42,
    emphasisPeakThreshold: 0.62,
  };

  /* 10 Built-In Beginner One-Click Presets (Phase 1 Item 3) */
  const TONE_PRESETS = {
    calm: {
      label: "آرام (Calm)", labelEn: "Calm",
      mouthGain: 0.68, browGain: 0.55, headGain: 0.50, chestGain: 0.45, wingGain: 0.45, blinkRate: 0.90, idleSway: 0.75, springFreq: 11,
      spring: { stiffness: 121, damping: 22, mass: 1.0 },
      emotion: "neutral", emotionIntensity: 0.85,
    },
    lively: {
      label: "زنده (Lively)", labelEn: "Lively",
      mouthGain: 1.00, browGain: 1.00, headGain: 1.00, chestGain: 1.00, wingGain: 1.00, blinkRate: 1.00, idleSway: 1.00, springFreq: 14,
      spring: { stiffness: 196, damping: 28, mass: 1.0 },
      emotion: "neutral", emotionIntensity: 1.0,
    },
    dramatic: {
      label: "نمایشی (Dramatic)", labelEn: "Dramatic",
      mouthGain: 1.38, browGain: 1.48, headGain: 1.50, chestGain: 1.42, wingGain: 1.45, blinkRate: 1.15, idleSway: 1.20, springFreq: 18,
      spring: { stiffness: 324, damping: 30, mass: 1.0 },
      emotion: "proud", emotionIntensity: 1.25,
    },
    newsreader: {
      label: "گوینده خبر (Newsreader)", labelEn: "Newsreader",
      mouthGain: 0.92, browGain: 0.62, headGain: 0.55, chestGain: 0.35, wingGain: 0.25, blinkRate: 0.85, idleSway: 0.45, springFreq: 15,
      spring: { stiffness: 225, damping: 30, mass: 1.0 },
      emotion: "neutral", emotionIntensity: 0.75,
    },
    comedian: {
      label: "کمدین (Comedian)", labelEn: "Comedian",
      mouthGain: 1.28, browGain: 1.55, headGain: 1.45, chestGain: 1.35, wingGain: 1.50, blinkRate: 1.25, idleSway: 1.25, springFreq: 16.5,
      spring: { stiffness: 272, damping: 23, mass: 0.9 },
      emotion: "happy", emotionIntensity: 1.2,
    },
    whisper: {
      label: "نجوا (Whisper)", labelEn: "Whisper",
      mouthGain: 0.52, browGain: 0.72, headGain: 0.48, chestGain: 0.30, wingGain: 0.30, blinkRate: 0.75, idleSway: 0.60, springFreq: 9.5,
      spring: { stiffness: 90, damping: 20, mass: 1.05 },
      emotion: "thinking", emotionIntensity: 0.85,
    },
    shouting: {
      label: "پرخروش (Shouting)", labelEn: "Shouting",
      mouthGain: 1.55, browGain: 1.60, headGain: 1.60, chestGain: 1.55, wingGain: 1.60, blinkRate: 1.10, idleSway: 1.10, springFreq: 21,
      spring: { stiffness: 420, damping: 33, mass: 0.92 },
      emotion: "angry", emotionIntensity: 1.3,
    },
    sleepy: {
      label: "خواب‌آلود (Sleepy)", labelEn: "Sleepy",
      mouthGain: 0.58, browGain: 0.42, headGain: 0.55, chestGain: 0.40, wingGain: 0.25, blinkRate: 0.55, idleSway: 1.35, springFreq: 7.5,
      spring: { stiffness: 64, damping: 18, mass: 1.25 },
      emotion: "bored", emotionIntensity: 1.05,
    },
    angry: {
      label: "عصبانی (Angry)", labelEn: "Angry",
      mouthGain: 1.32, browGain: 1.45, headGain: 1.38, chestGain: 1.30, wingGain: 1.28, blinkRate: 0.85, idleSway: 0.65, springFreq: 19.5,
      spring: { stiffness: 380, damping: 34, mass: 0.95 },
      emotion: "angry", emotionIntensity: 1.25,
    },
    excited: {
      label: "هیجان‌زده (Excited)", labelEn: "Excited",
      mouthGain: 1.35, browGain: 1.42, headGain: 1.45, chestGain: 1.50, wingGain: 1.55, blinkRate: 1.30, idleSway: 1.30, springFreq: 19,
      spring: { stiffness: 340, damping: 26, mass: 0.88 },
      emotion: "happy", emotionIntensity: 1.3,
    },
  };

  /* Hard anatomical limits (customizable inside safety bounds in Puppet Schema v2) */
  const TONE_LIMITS = {
    mouthMin: 0.0,
    mouthMax: 1.0,
    browYMin: -18,
    browYMax: 12,
    browRotMin: -14,
    browRotMax: 14,
    headTiltMin: -13,
    headTiltMax: 13,
    headNodMin: -15,
    headNodMax: 15,
    chestBounceMin: -10,
    chestBounceMax: 10,
    chestSquashMax: 0.072,
    wingAngleMin: -25,
    wingAngleMax: 25,
    idleSwayDegMax: 2.8,
  };

  const SECONDARY_DEFAULTS = {
    featherJiggle: 0.55,
    crestOverlap: 0.65,
    wingFollowThrough: 0.60,
    squashPreserveVolume: true,
  };

  function numClamp(v, fallback, lo, hi) {
    if (v === undefined || v === null || v === "") return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fallback;
  }

  function validHex(v) {
    if (typeof v !== "string") return null;
    const s = v.trim();
    return /^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/.test(s) ? s.toUpperCase() : null;
  }

  function resolveToneConfig(rawTone) {
    const src = (rawTone && typeof rawTone === "object") ? rawTone : (typeof rawTone === "string" ? { preset: rawTone } : {});
    const pKeyRaw = String(src.preset || "lively").toLowerCase();
    const presetKey = TONE_PRESETS[pKeyRaw] ? pKeyRaw : "lively";
    const base = TONE_PRESETS[presetKey];
    return {
      preset: presetKey,
      mouthGain: numClamp(src.mouthGain, base.mouthGain, 0, 2.0),
      browGain: numClamp(src.browGain, base.browGain, 0, 2.0),
      headGain: numClamp(src.headGain, base.headGain, 0, 2.0),
      chestGain: numClamp(src.chestGain, base.chestGain, 0, 2.0),
      wingGain: numClamp(src.wingGain, base.wingGain, 0, 2.0),
      blinkRate: numClamp(src.blinkRate, base.blinkRate, 0.3, 2.0),
      idleSway: numClamp(src.idleSway, base.idleSway, 0, 2.0),
      springFreq: numClamp(src.springFreq, base.springFreq, 5, 28),
    };
  }

  function resolvePuppetConfig(rawPuppet, legacyTone) {
    const src = (rawPuppet && typeof rawPuppet === "object") ? rawPuppet : {};
    const mergedToneSrc = Object.assign(
      {},
      (legacyTone && typeof legacyTone === "object") ? legacyTone : (typeof legacyTone === "string" ? { preset: legacyTone } : {}),
      (src.tone && typeof src.tone === "object") ? src.tone : {},
      src.preset ? { preset: src.preset } : {},
    );
    const tone = resolveToneConfig(mergedToneSrc);
    const presetSpec = TONE_PRESETS[tone.preset] || TONE_PRESETS.lively;

    // Spring physics (stiffness, damping, mass)
    const rawSp = (src.spring && typeof src.spring === "object") ? src.spring : {};
    // If legacy springFreq was customized without explicit stiffness, derive stiffness = w^2 * m
    const defaultStiff = (mergedToneSrc.springFreq != null && rawSp.stiffness == null)
      ? Math.round(tone.springFreq * tone.springFreq)
      : presetSpec.spring.stiffness;
    const defaultDamp = (mergedToneSrc.springFreq != null && rawSp.damping == null)
      ? Math.round(2 * tone.springFreq)
      : presetSpec.spring.damping;
    const spring = {
      stiffness: numClamp(rawSp.stiffness, defaultStiff, 40, 600),
      damping: numClamp(rawSp.damping, defaultDamp, 4, 65),
      mass: numClamp(rawSp.mass, presetSpec.spring.mass, 0.25, 4.0),
    };

    // Limits
    const rawLim = (src.limits && typeof src.limits === "object") ? src.limits : {};
    const limits = {
      mouthMin: numClamp(rawLim.mouthMin, TONE_LIMITS.mouthMin, 0, 0.3),
      mouthMax: numClamp(rawLim.mouthMax, TONE_LIMITS.mouthMax, 0.2, 1.0),
      browYMin: numClamp(rawLim.browYMin, TONE_LIMITS.browYMin, -28, 0),
      browYMax: numClamp(rawLim.browYMax, TONE_LIMITS.browYMax, 0, 16),
      browRotMin: numClamp(rawLim.browRotMin, TONE_LIMITS.browRotMin, -24, 0),
      browRotMax: numClamp(rawLim.browRotMax, TONE_LIMITS.browRotMax, 0, 24),
      headTiltMin: numClamp(rawLim.headTiltMin, TONE_LIMITS.headTiltMin, -20, 0),
      headTiltMax: numClamp(rawLim.headTiltMax, TONE_LIMITS.headTiltMax, 0, 20),
      headNodMin: numClamp(rawLim.headNodMin, TONE_LIMITS.headNodMin, -22, 0),
      headNodMax: numClamp(rawLim.headNodMax, TONE_LIMITS.headNodMax, 0, 22),
      chestBounceMin: numClamp(rawLim.chestBounceMin, TONE_LIMITS.chestBounceMin, -16, 0),
      chestBounceMax: numClamp(rawLim.chestBounceMax, TONE_LIMITS.chestBounceMax, 0, 16),
      chestSquashMax: numClamp(rawLim.chestSquashMax, TONE_LIMITS.chestSquashMax, 0, 0.12),
      wingAngleMin: numClamp(rawLim.wingAngleMin, TONE_LIMITS.wingAngleMin, -36, 0),
      wingAngleMax: numClamp(rawLim.wingAngleMax, TONE_LIMITS.wingAngleMax, 0, 36),
      idleSwayDegMax: numClamp(rawLim.idleSwayDegMax, TONE_LIMITS.idleSwayDegMax, 0, 5.0),
    };

    // Phase 4: Character, Outfit & Seasonal Skin
    const rawChar = String(src.character || "red_eagle").trim().toLowerCase();
    const character = CHARACTERS[rawChar] ? rawChar : "red_eagle";
    const charSpec = CHARACTERS[character];
    const rawOutfit = String(src.outfit || "default").trim().toLowerCase();
    const outfit = OUTFITS[rawOutfit] ? rawOutfit : "default";
    const rawSkin = String(src.skin || "classic").trim().toLowerCase();
    const skin = SKINS[rawSkin] ? rawSkin : "classic";

    // Palette & Brand/Character Palette Lock
    const paletteLock = src.paletteLock !== false;
    const palette = resolveCharacterPalette(character, skin);
    if (!paletteLock && src.palette && typeof src.palette === "object") {
      Object.keys(MASCOT_PALETTE).forEach((k) => {
        const hv = validHex(src.palette[k]);
        if (hv) palette[k] = hv;
      });
    }

    // Parts tree (18 parts)
    const rawParts = (src.parts && typeof src.parts === "object") ? src.parts : {};
    const parts = {};
    Object.keys(PUPPET_PARTS).forEach((pk) => {
      const def = PUPPET_PARTS[pk];
      const rp = (rawParts[pk] && typeof rawParts[pk] === "object") ? rawParts[pk] : {};
      parts[pk] = {
        x: numClamp(rp.x, 0, -240, 240),
        y: numClamp(rp.y, 0, -240, 240),
        rotation: numClamp(rp.rotation, 0, -90, 90),
        scaleX: numClamp(rp.scaleX, 1, 0.25, 2.5),
        scaleY: numClamp(rp.scaleY, 1, 0.25, 2.5),
        pivotX: numClamp(rp.pivotX, def.pivotX, 0, 640),
        pivotY: numClamp(rp.pivotY, def.pivotY, 0, 720),
        zOrder: Math.round(numClamp(rp.zOrder, def.zOrder, -20, 40)),
        color: paletteLock ? null : validHex(rp.color),
        outlineWidth: numClamp(rp.outlineWidth, def.outlineWidth, 0, 3.0),
        visible: rp.visible !== false,
      };
    });

    // Secondary motion
    const rawSec = (src.secondary && typeof src.secondary === "object") ? src.secondary : {};
    const secondary = {
      featherJiggle: numClamp(rawSec.featherJiggle, SECONDARY_DEFAULTS.featherJiggle, 0, 2.0),
      crestOverlap: numClamp(rawSec.crestOverlap, SECONDARY_DEFAULTS.crestOverlap, 0, 2.0),
      wingFollowThrough: numClamp(rawSec.wingFollowThrough, SECONDARY_DEFAULTS.wingFollowThrough, 0, 2.0),
      squashPreserveVolume: rawSec.squashPreserveVolume !== false,
    };

    const rawEmo = String(src.emotion || "").toLowerCase();
    const emotion = EXPRESSIONS[rawEmo] ? rawEmo : null;
    const emotionIntensity = numClamp(src.emotionIntensity, presetSpec.emotionIntensity ?? 1.0, 0, 1.5);
    const autoEmotion = Boolean(src.autoEmotion);

    const keyframes = Array.isArray(src.keyframes)
      ? src.keyframes
          .filter((kf) => kf && typeof kf === "object" && kf.gain)
          .map((kf) => ({
            t: Math.max(0, Number(kf.t) || 0),
            gain: String(kf.gain),
            value: Number(kf.value) || 0,
            ease: String(kf.ease || "smooth").toLowerCase(),
          }))
          .sort((a, b) => (a.gain < b.gain ? -1 : a.gain > b.gain ? 1 : a.t - b.t))
      : [];

    const sentences = Array.isArray(src.sentences)
      ? src.sentences
          .filter((s) => s && typeof s === "object")
          .map((s) => Object.assign({}, s, {
            start: Math.max(0, Number(s.start) || 0),
            end: Math.max((Number(s.start) || 0) + 0.05, Number(s.end) || ((Number(s.start) || 0) + 1.5)),
          }))
          .sort((a, b) => a.start - b.start)
      : [];

    const gestures = Array.isArray(src.gestures)
      ? src.gestures
          .filter((g) => g && typeof g === "object" && GESTURES[String(g.gesture || g.name || "").toLowerCase()])
          .map((g) => {
            const name = String(g.gesture || g.name).toLowerCase();
            return {
              t: Math.max(0, Number(g.t) || 0),
              gesture: name,
              duration: numClamp(g.duration, GESTURES[name].defaultDur, 0.25, 4.0),
              offset: numClamp(g.offset, 0, -1.0, 1.0),
              intensity: numClamp(g.intensity, 1.0, 0.1, 1.5),
            };
          })
          .sort((a, b) => a.t - b.t)
      : [];

    const rawGaze = (src.gaze && typeof src.gaze === "object") ? src.gaze : {};
    const gaze = {
      target: rawGaze.target ?? "auto",
      smoothPursuit: numClamp(rawGaze.smoothPursuit, 10, 2, 30),
      saccadeScale: numClamp(rawGaze.saccadeScale, 1.0, 0, 2.0),
      timeline: Array.isArray(rawGaze.timeline) ? rawGaze.timeline.slice() : [],
    };

    const accessories = Array.isArray(src.accessories)
      ? src.accessories.map((a) => String(a).trim().toLowerCase()).filter((a) => Boolean(ACCESSORIES[a]))
      : OUTFITS[outfit].accessories.slice();

    const rawAccTl = Array.isArray(src.accessoryTimeline)
      ? src.accessoryTimeline
      : (Array.isArray(src.accessory_timeline) ? src.accessory_timeline : []);
    const accessoryTimeline = rawAccTl
      .filter((c) => c && typeof c === "object")
      .map((c) => {
        const entry = { t: Math.max(0, Number(c.t) || 0) };
        if (Array.isArray(c.accessories)) entry.accessories = c.accessories.map((a) => String(a).trim().toLowerCase()).filter((a) => Boolean(ACCESSORIES[a]));
        if (Array.isArray(c.add)) entry.add = c.add.map((a) => String(a).trim().toLowerCase()).filter((a) => Boolean(ACCESSORIES[a]));
        if (Array.isArray(c.remove)) entry.remove = c.remove.map((a) => String(a).trim().toLowerCase()).filter((a) => Boolean(ACCESSORIES[a]));
        if (c.outfit && OUTFITS[String(c.outfit).trim().toLowerCase()]) entry.outfit = String(c.outfit).trim().toLowerCase();
        return entry;
      })
      .sort((a, b) => a.t - b.t);

    // Per-character voice mapping (Phase 4 Item 12)
    const rawVoice = (src.voice && typeof src.voice === "object") ? src.voice : {};
    const defVoice = charSpec.defaultVoice;
    const vPresetRaw = String(rawVoice.preset || defVoice.preset).trim().toLowerCase();
    const voice = {
      speakerId: String(rawVoice.speakerId || rawVoice.speaker_id || character),
      medianF0Hz: numClamp(rawVoice.medianF0Hz, defVoice.medianF0Hz, 65, 500),
      pitchSpanSemitones: numClamp(rawVoice.pitchSpanSemitones, defVoice.pitchSpanSemitones, 3.5, 10.0),
      preset: TONE_PRESETS[vPresetRaw] ? vPresetRaw : defVoice.preset,
      audio: String(rawVoice.audio || ""),
    };

    // Speaker Calibration profile (Phase 3 Item 10)
    const rawCal = (src.calibration && typeof src.calibration === "object") ? src.calibration : {};
    const calibration = {
      medianF0Hz: numClamp(rawCal.medianF0Hz, voice.medianF0Hz, 65, 500),
      f0MinHz: numClamp(rawCal.f0MinHz, Math.max(60, voice.medianF0Hz * 0.7), 60, 450),
      f0MaxHz: numClamp(rawCal.f0MaxHz, Math.min(550, voice.medianF0Hz * 1.45), 80, 550),
      pitchSpanSemitones: numClamp(rawCal.pitchSpanSemitones, voice.pitchSpanSemitones, 3.5, 10.0),
      noiseFloorDb: numClamp(rawCal.noiseFloorDb, -56, -80, -18),
      noiseGateDb: numClamp(rawCal.noiseGateDb, -46, -68, -22),
      loudnessMinDb: numClamp(rawCal.loudnessMinDb, -42, -70, -6),
      loudnessMaxDb: numClamp(rawCal.loudnessMaxDb, -12, -40, 0),
      p95Rms: numClamp(rawCal.p95Rms, 0.16, 0.01, 1.0),
      calibrated: Boolean(rawCal.calibrated || (rawCal.medianF0Hz != null && rawCal.noiseGateDb != null)),
    };

    // Live OBS settings (Phase 3 Item 11)
    const rawLive = (src.live && typeof src.live === "object") ? src.live : {};
    const live = {
      noiseSuppression: rawLive.noiseSuppression !== false,
      pushToTalk: Boolean(rawLive.pushToTalk),
      pttKey: String(rawLive.pttKey || "Space"),
      showHud: Boolean(rawLive.showHud),
    };

    // Phase 5 Items 15–16: Shot, Parallax Background & Lighting Presets
    const scene = resolveSceneConfig(src.scene || {
      shot: src.shot,
      pushIn: src.pushIn ?? src.push_in,
      shotTimeline: src.shotTimeline ?? src.shot_timeline,
      background: src.background,
      parallax: src.parallax,
      lighting: src.lighting,
      lightingIntensity: src.lightingIntensity,
    });

    // Phase 6 Item 19 & Phase 5 Item 18: Debug Overlay & Performance
    const rawDebug = (src.debug && typeof src.debug === "object") ? src.debug : {};
    const debug = {
      enabled: Boolean(rawDebug.enabled),
      showPivots: rawDebug.showPivots !== false,
      showGraphs: rawDebug.showGraphs !== false,
    };

    const rawPerf = (src.performance && typeof src.performance === "object") ? src.performance : {};
    const performance = {
      fps: Number(rawPerf.fps) >= 50 ? 60 : 30,
      frameCache: rawPerf.frameCache !== false,
    };

    // Phase 6 Item 22: Declarative Custom Emotions & Gestures Plugins
    const rawPlugins = (src.plugins && typeof src.plugins === "object") ? src.plugins : {};
    const pluginEmotions = {};
    if (rawPlugins.emotions && typeof rawPlugins.emotions === "object") {
      Object.keys(rawPlugins.emotions).forEach((ek) => {
        const key = String(ek || "").trim().toLowerCase().replace(/[^a-z0-9_\-]/g, "");
        const es = rawPlugins.emotions[ek];
        if (!key || !es || typeof es !== "object") return;
        pluginEmotions[key] = {
          label: String(es.label || key),
          labelEn: String(es.labelEn || key),
          browLRot: numClamp(es.browLRot, 0, -32, 32),
          browRRot: numClamp(es.browRRot, 0, -32, 32),
          browLY: numClamp(es.browLY, 0, -24, 16),
          browRY: numClamp(es.browRY, 0, -24, 16),
          eyeScaleX: numClamp(es.eyeScaleX, 1.0, 0.7, 1.3),
          eyeScaleY: numClamp(es.eyeScaleY, 1.0, 0.65, 1.35),
          upperLid: numClamp(es.upperLid, 0.05, 0, 0.9),
          lowerLid: numClamp(es.lowerLid, 0.02, 0, 0.6),
          smugArc: numClamp(es.smugArc, 0, 0, 1),
          beakSmile: numClamp(es.beakSmile, 0, -1, 1),
          headTilt: numClamp(es.headTilt, 0, -18, 18),
          headPitch: numClamp(es.headPitch, 0, -14, 14),
          crestTilt: numClamp(es.crestTilt, 0, -18, 18),
          wingPose: String(es.wingPose || "crossed"),
          accent: String(es.accent || "none"),
          blinkMult: numClamp(es.blinkMult, 1.0, 0.35, 2.2),
        };
      });
    }
    const pluginGestures = {};
    if (rawPlugins.gestures && typeof rawPlugins.gestures === "object") {
      Object.keys(rawPlugins.gestures).forEach((gk) => {
        const key = String(gk || "").trim().toLowerCase().replace(/[^a-z0-9_\-]/g, "");
        const gs = rawPlugins.gestures[gk];
        if (!key || !gs || typeof gs !== "object") return;
        pluginGestures[key] = {
          label: String(gs.label || key),
          labelEn: String(gs.labelEn || key),
          defaultDur: numClamp(gs.defaultDur, 1.1, 0.25, 4.0),
          pose: String(gs.pose || "custom"),
          headTilt: numClamp(gs.headTilt, 0, -24, 24),
          headNod: numClamp(gs.headNod, 0, -20, 20),
          wingAngle: numClamp(gs.wingAngle, 0, -35, 35),
          wingLRot: numClamp(gs.wingLRot, 0, -45, 45),
          wingRRot: numClamp(gs.wingRRot, 0, -45, 45),
          browLift: numClamp(gs.browLift, 0, -18, 18),
          bodyBounce: numClamp(gs.bodyBounce, 0, -16, 16),
          crestTilt: numClamp(gs.crestTilt, 0, -20, 20),
        };
      });
    }
    const plugins = { emotions: pluginEmotions, gestures: pluginGestures };

    // Preserve plugin emotion / gesture references if declared in src.plugins
    let resolvedEmotion = emotion;
    if (!resolvedEmotion && src.emotion) {
      const k = String(src.emotion).trim().toLowerCase();
      if (pluginEmotions[k]) resolvedEmotion = k;
    }
    const extraPluginGestures = Array.isArray(src.gestures)
      ? src.gestures
          .filter((g) => {
            if (!g || typeof g !== "object") return false;
            const k = String(g.gesture || g.name || "").trim().toLowerCase();
            return Boolean(pluginGestures[k] && !GESTURES[k]);
          })
          .map((g) => {
            const k = String(g.gesture || g.name).trim().toLowerCase();
            return {
              t: Math.max(0, Number(g.t) || 0),
              gesture: k,
              duration: numClamp(g.duration, pluginGestures[k].defaultDur, 0.25, 4.0),
              offset: numClamp(g.offset, 0, -1.0, 1.0),
              intensity: numClamp(g.intensity, 1.0, 0.1, 1.5),
            };
          })
      : [];
    const allGestures = extraPluginGestures.length ? gestures.concat(extraPluginGestures).sort((a, b) => a.t - b.t) : gestures;

    return {
      version: PUPPET_SCHEMA_VERSION,
      character,
      outfit,
      skin,
      preset: tone.preset,
      paletteLock,
      palette,
      tone,
      spring,
      limits,
      parts,
      secondary,
      emotion: resolvedEmotion,
      emotionIntensity,
      autoEmotion,
      keyframes,
      sentences,
      gestures: allGestures,
      gaze,
      accessories,
      accessoryTimeline,
      voice,
      calibration,
      live,
      scene,
      debug,
      performance,
      plugins,
    };
  }

  /* Phase 3 Item 10: Deterministic Speaker Calibration calculator from sampled mic/WAV frames
     Each frame: { rms, db, f0Hz, pitchConf? }. Mirrors Python calibrate_speaker_samples(). */
  function computeSpeakerCalibration(frames, durationSec = 10) {
    const list = Array.isArray(frames) ? frames : [];
    if (!list.length) {
      return {
        version: 1,
        duration: 0,
        noiseFloorDb: -56,
        noiseGateDb: -46,
        medianF0Hz: 165,
        f0MinHz: 115,
        f0MaxHz: 240,
        pitchSpanSemitones: 6.0,
        loudnessMinDb: -42,
        loudnessMaxDb: -12,
        p95Rms: 0.16,
        voicedRatio: 0,
        recommendedPreset: "lively",
        calibrated: false,
      };
    }

    const dbs = list.map((f) => numClamp(f.db, -80, -80, 0)).sort((a, b) => a - b);
    const rmss = list.map((f) => Math.max(0, Number(f.rms) || 0)).sort((a, b) => a - b);
    const pct = (arr, q) => arr[Math.min(arr.length - 1, Math.max(0, Math.floor(q * arr.length)))];
    const p15Db = pct(dbs, 0.15);
    const p95Db = pct(dbs, 0.95);
    const p95Rms = Math.max(0.01, pct(rmss, 0.95));

    const noiseGateDb = (p95Db - p15Db < 10)
      ? numClamp(p95Db - 14, -46, -60, -26)
      : numClamp(Math.min(p15Db + 7.5, p95Db - 12), -46, -62, -26);

    const voicedF0 = [];
    const speechDbs = [];
    for (let i = 0; i < list.length; i += 1) {
      const f = list[i];
      const db = numClamp(f.db, -80, -80, 0);
      if (db >= noiseGateDb) {
        speechDbs.push(db);
        const f0 = Number(f.f0Hz || f.f0_hz || 0);
        const conf = f.pitchConf != null ? Number(f.pitchConf) : 0.8;
        if (f0 >= 65 && f0 <= 500 && conf >= 0.4) voicedF0.push(f0);
      }
    }

    let medianF0Hz = 165;
    let f0MinHz = 115;
    let f0MaxHz = 240;
    let pitchSpanSemitones = 6.0;
    if (voicedF0.length) {
      voicedF0.sort((a, b) => a - b);
      medianF0Hz = voicedF0[voicedF0.length >> 1];
      f0MinHz = pct(voicedF0, 0.10);
      f0MaxHz = pct(voicedF0, 0.90);
      const span = 12 * Math.log2(Math.max(f0MaxHz, medianF0Hz + 1) / Math.max(60, Math.min(f0MinHz, medianF0Hz)));
      pitchSpanSemitones = numClamp(span * 0.65, 6.0, 3.5, 10.0);
    }

    speechDbs.sort((a, b) => a - b);
    const loudnessMinDb = speechDbs.length ? pct(speechDbs, 0.10) : noiseGateDb;
    const loudnessMaxDb = speechDbs.length ? pct(speechDbs, 0.95) : Math.max(noiseGateDb + 6, p95Db);
    const dynRange = loudnessMaxDb - loudnessMinDb;
    const recommendedPreset = dynRange >= 22 ? "dramatic" : (dynRange <= 10 ? "calm" : "lively");

    return {
      version: 1,
      duration: +Math.max(0, Number(durationSec) || 0).toFixed(2),
      noiseFloorDb: +p15Db.toFixed(2),
      noiseGateDb: +noiseGateDb.toFixed(2),
      medianF0Hz: +medianF0Hz.toFixed(2),
      f0MinHz: +f0MinHz.toFixed(2),
      f0MaxHz: +f0MaxHz.toFixed(2),
      pitchSpanSemitones: +pitchSpanSemitones.toFixed(2),
      loudnessMinDb: +loudnessMinDb.toFixed(2),
      loudnessMaxDb: +loudnessMaxDb.toFixed(2),
      p95Rms: +p95Rms.toFixed(5),
      voicedRatio: +(voicedF0.length / Math.max(1, list.length)).toFixed(3),
      recommendedPreset,
      calibrated: true,
    };
  }

  /* Phase 3 Item 11: Default Live OBS Hotkeys & MIDI/Stream-Deck Mapping */
  const DEFAULT_LIVE_HOTKEYS = {
    emotions: {
      Digit1: "neutral",
      Digit2: "happy",
      Digit3: "angry",
      Digit4: "smug",
      Digit5: "shocked",
      Digit6: "thinking",
      Digit7: "sad",
      Digit8: "sarcastic",
      Digit9: "proud",
      Digit0: "confused",
    },
    gestures: {
      KeyQ: "point",
      KeyW: "shrug",
      KeyE: "facepalm",
      KeyR: "wing-cross",
      KeyT: "thumbs-up",
      KeyY: "clap",
      KeyU: "salute",
      KeyI: "chin-scratch",
      KeyO: "double-take",
    },
    pttKey: "Space",
    hudKey: "KeyH",
  };

  const DEFAULT_MIDI_MAP = {
    notes: {
      36: { type: "emotion", value: "neutral" },
      37: { type: "emotion", value: "happy" },
      38: { type: "emotion", value: "angry" },
      39: { type: "emotion", value: "smug" },
      40: { type: "emotion", value: "shocked" },
      41: { type: "emotion", value: "thinking" },
      42: { type: "emotion", value: "sad" },
      43: { type: "emotion", value: "sarcastic" },
      44: { type: "emotion", value: "proud" },
      45: { type: "emotion", value: "confused" },
      48: { type: "gesture", value: "point" },
      49: { type: "gesture", value: "shrug" },
      50: { type: "gesture", value: "facepalm" },
      51: { type: "gesture", value: "wing-cross" },
      52: { type: "gesture", value: "thumbs-up" },
      53: { type: "gesture", value: "clap" },
      54: { type: "gesture", value: "salute" },
      55: { type: "gesture", value: "chin-scratch" },
      56: { type: "gesture", value: "double-take" },
    },
    cc: {
      64: { type: "ptt" },
      1:  { type: "emotionIntensity" },
    },
  };

  /* Deterministic script tag parser: [smug], [angry:1.3], [point], [double-take+0.2], [look:camera], [acc:top_hat,monocle], [outfit:formal] */
  function parseScriptTags(sayText, duration = 6) {
    const text = String(sayText || "");
    if (!text.trim()) return { cleanText: "", emotions: [], gestures: [], gaze: [], accessories: [] };
    const re = /\[([a-zA-Z0-9_\-:+,.\s]+)\]/g;
    const found = [];
    let clean = "";
    let last = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      clean += text.slice(last, m.index);
      found.push({ pos: clean.length, token: m[1].trim().toLowerCase() });
      last = m.index + m[0].length;
    }
    clean += text.slice(last);
    const totalChars = Math.max(1, clean.length);
    const span = Math.max(0.5, (Number(duration) || 6) - 0.3);

    const emotions = [];
    const gestures = [];
    const gaze = [];
    const accessories = [];

    for (let i = 0; i < found.length; i += 1) {
      const { pos, token } = found[i];
      const tVal = +(0.15 + (pos / totalChars) * span).toFixed(3);
      if (token.startsWith("look:")) {
        gaze.push({ t: tVal, target: token.slice(5).trim() });
        continue;
      }
      if (token.startsWith("acc:")) {
        const items = token.slice(4).split(",").map((x) => x.trim()).filter((x) => Boolean(ACCESSORIES[x]));
        accessories.push({ t: tVal, accessories: items });
        continue;
      }
      if (token.startsWith("outfit:")) {
        const okey = token.slice(7).trim();
        if (OUTFITS[okey]) accessories.push({ t: tVal, outfit: okey });
        continue;
      }
      let base = token;
      let offset = 0;
      let intensity = 1.0;
      if (base.includes("+")) {
        const parts = base.split("+");
        base = parts[0];
        offset = numClamp(parts[1], 0, -1, 1);
      }
      if (base.includes(":")) {
        const parts = base.split(":");
        base = parts[0];
        intensity = numClamp(parts[1], 1.0, 0.1, 1.5);
      }
      if (EXPRESSIONS[base]) {
        emotions.push({ t: tVal, expression: base, intensity, blend: 0.32 });
      } else if (GESTURES[base]) {
        gestures.push({
          t: Math.max(0, +(tVal + offset).toFixed(3)),
          gesture: base,
          duration: GESTURES[base].defaultDur,
          offset,
          intensity,
        });
      }
    }
    return {
      cleanText: clean.replace(/\s+/g, " ").trim(),
      emotions,
      gestures,
      gaze,
      accessories,
    };
  }

  /* Phase 4 Item 13: Offline SVG Rig Importer (JS mirror of khordegir/rig_importer.py — works in Browser & Node) */
  const SVG_PART_ALIASES = {
    body:        ["body", "torso", "chest", "m-body", "بدن", "سینه", "تنه"],
    head:        ["head", "face", "skull", "m-head", "سر", "صورت"],
    beak_upper:  ["beak_upper", "beak-upper", "upper_beak", "upper-beak", "upperbeak", "mouth_top", "m-upper-beak", "منقار-بالا", "منقار_بالا"],
    beak_lower:  ["beak_lower", "beak-lower", "lower_beak", "lower-beak", "lowerbeak", "jaw", "mouth_bottom", "m-lower-beak", "منقار-پایین", "منقار_پایین", "فک"],
    eye_l:       ["eye_l", "eye-l", "left_eye", "left-eye", "eyeleft", "m-eye-l", "چشم-چپ", "چشم_چپ"],
    eye_r:       ["eye_r", "eye-r", "right_eye", "right-eye", "eyeright", "m-eye-r", "چشم-راست", "چشم_راست"],
    pupil_l:     ["pupil_l", "pupil-l", "left_pupil", "left-pupil", "m-pupil-l", "مردمک-چپ", "مردمک_چپ"],
    pupil_r:     ["pupil_r", "pupil-r", "right_pupil", "right-pupil", "m-pupil-r", "مردمک-راست", "مردمک_راست"],
    lid_l:       ["lid_l", "lid-l", "left_lid", "left-lid", "eyelid_l", "m-lid-l", "پلک-چپ", "پلک_چپ"],
    lid_r:       ["lid_r", "lid-r", "right_lid", "right-lid", "eyelid_r", "m-lid-r", "پلک-راست", "پلک_راست"],
    brow_l:      ["brow_l", "brow-l", "left_brow", "left-brow", "eyebrow_l", "m-brow-l", "ابرو-چپ", "ابروی-چپ"],
    brow_r:      ["brow_r", "brow-r", "right_brow", "right-brow", "eyebrow_r", "m-brow-r", "ابرو-راست", "ابروی-راست"],
    crest:       ["crest", "plume", "tuft", "comb", "hair", "shell", "m-crest-wing", "تاج", "کاکل", "لاک"],
    wing_l:      ["wing_l", "wing-l", "left_wing", "left-wing", "arm_l", "left_arm", "m-wing-l", "بال-چپ", "بال_چپ"],
    wing_r:      ["wing_r", "wing-r", "right_wing", "right-wing", "arm_r", "right_arm", "m-wing-r", "بال-راست", "بال_راست"],
    tail:        ["tail", "tail_feathers", "m-tail", "دم"],
    legs:        ["legs", "feet", "talons", "claws", "m-legs", "پا", "پاها", "چنگال"],
    accessories: ["accessories", "accessory", "props", "hat", "glasses", "costume", "m-accessories", "اکسسوری", "اکسسوری‌ها"],
  };

  const SVG_PIVOT_ANCHORS = {
    body: [0.5, 0.9], head: [0.5, 0.88], beak_upper: [0.5, 0.45], beak_lower: [0.5, 0.15],
    eye_l: [0.5, 0.5], eye_r: [0.5, 0.5], pupil_l: [0.5, 0.5], pupil_r: [0.5, 0.5],
    lid_l: [0.5, 0.5], lid_r: [0.5, 0.5], brow_l: [0.5, 0.55], brow_r: [0.5, 0.55],
    crest: [0.2, 0.78], wing_l: [0.85, 0.18], wing_r: [0.15, 0.18], tail: [0.5, 0.15], legs: [0.5, 0.12], accessories: [0.5, 0.5],
  };

  function matchSvgLayerPart(candidates) {
    const tokens = [];
    for (let i = 0; i < candidates.length; i += 1) {
      const s = String(candidates[i] || "").trim().toLowerCase();
      if (!s) continue;
      tokens.push(s);
      s.split(/[\s,]+/).forEach((p) => { if (p) tokens.push(p); });
    }
    const partKeys = Object.keys(SVG_PART_ALIASES);
    for (let i = 0; i < tokens.length; i += 1) {
      const tok = tokens[i];
      const norm = tok.replace(/\s+/g, "_");
      for (let j = 0; j < partKeys.length; j += 1) {
        const pk = partKeys[j];
        if (SVG_PART_ALIASES[pk].includes(tok) || SVG_PART_ALIASES[pk].includes(norm)) return pk;
      }
    }
    for (let i = 0; i < tokens.length; i += 1) {
      const tok = tokens[i];
      for (let j = 0; j < partKeys.length; j += 1) {
        const pk = partKeys[j];
        if (SVG_PART_ALIASES[pk].some((al) => al.length >= 3 && tok.includes(al))) return pk;
      }
    }
    return null;
  }

  function parseSvgToPuppetRig(svgText, character = "red_eagle") {
    const src = String(svgText || "");
    if (!src.includes("<svg")) throw new Error("Invalid SVG text");

    // Extract viewBox
    let vx = 0, vy = 0, vw = 640, vh = 720;
    const vbMatch = src.match(/viewBox\s*=\s*["']([^"']+)["']/i);
    if (vbMatch) {
      const nums = vbMatch[1].match(/[-+]?(?:\d+\.\d+|\d+|\.\d+)/g);
      if (nums && nums.length >= 4 && Number(nums[2]) > 0 && Number(nums[3]) > 0) {
        vx = Number(nums[0]); vy = Number(nums[1]); vw = Number(nums[2]); vh = Number(nums[3]);
      }
    }
    const sx = 640 / Math.max(1, vw);
    const sy = 720 / Math.max(1, vh);

    // Lightweight stack-based <g> block extractor (offline, deterministic, no innerHTML)
    const tagRe = /<(\/?)g\b([^>]*)>/gi;
    const openStack = [];
    const groups = [];
    let m;
    while ((m = tagRe.exec(src)) !== null) {
      const isClose = m[1] === "/";
      const attrsStr = m[2] || "";
      const selfClose = /\/\s*$/.test(attrsStr);
      if (!isClose) {
        const entry = { attrsStr, start: m.index + m[0].length, end: m.index + m[0].length, z: groups.length + 1 };
        if (selfClose) groups.push(entry);
        else openStack.push(entry);
      } else if (openStack.length) {
        const entry = openStack.pop();
        entry.end = m.index;
        groups.push(entry);
      }
    }
    groups.sort((a, b) => a.z - b.z);

    const getAttr = (str, name) => {
      const r = new RegExp(`(?:^|\\s)${name}\\s*=\\s*["']([^"']*)["']`, "i");
      const mm = str.match(r);
      return mm ? mm[1] : "";
    };

    const matchedParts = {};
    const layers = [];
    const unmatchedLayers = [];

    for (let i = 0; i < groups.length; i += 1) {
      const g = groups[i];
      const rawDataPart = getAttr(g.attrsStr, "data-part");
      const rawId = getAttr(g.attrsStr, "id");
      const rawInk = getAttr(g.attrsStr, "inkscape:label");
      const rawName = getAttr(g.attrsStr, "data-name");
      const rawCls = getAttr(g.attrsStr, "class");
      const display = rawDataPart || rawId || rawInk || rawName || rawCls;
      if (!display) continue;

      const partKey = matchSvgLayerPart([rawDataPart, rawId, rawInk, rawName, rawCls]);
      if (!partKey) {
        unmatchedLayers.push(display);
        continue;
      }

      const inner = src.slice(g.start, g.end);
      const xs = [];
      const ys = [];
      const addPt = (x, y) => { if (Number.isFinite(x) && Number.isFinite(y)) { xs.push(x); ys.push(y); } };

      // Extract rough bbox from rect/circle/ellipse/path/polygon coordinates
      const rectRe = /<rect\b([^>]*)/gi;
      let rm;
      while ((rm = rectRe.exec(inner)) !== null) {
        const rx = Number(getAttr(rm[1], "x")) || 0;
        const ry = Number(getAttr(rm[1], "y")) || 0;
        const rw = Number(getAttr(rm[1], "width")) || 0;
        const rh = Number(getAttr(rm[1], "height")) || 0;
        if (rw > 0 || rh > 0) { addPt(rx, ry); addPt(rx + rw, ry + rh); }
      }
      const circRe = /<circle\b([^>]*)/gi;
      let cm;
      while ((cm = circRe.exec(inner)) !== null) {
        const cx = Number(getAttr(cm[1], "cx")) || 0;
        const cy = Number(getAttr(cm[1], "cy")) || 0;
        const r = Number(getAttr(cm[1], "r")) || 0;
        addPt(cx - r, cy - r); addPt(cx + r, cy + r);
      }
      const ellRe = /<ellipse\b([^>]*)/gi;
      let em;
      while ((em = ellRe.exec(inner)) !== null) {
        const cx = Number(getAttr(em[1], "cx")) || 0;
        const cy = Number(getAttr(em[1], "cy")) || 0;
        const rx = Number(getAttr(em[1], "rx")) || 0;
        const ry = Number(getAttr(em[1], "ry")) || 0;
        addPt(cx - rx, cy - ry); addPt(cx + rx, cy + ry);
      }
      const pathRe = /\bd\s*=\s*["']([^"']+)["']/gi;
      let pm;
      while ((pm = pathRe.exec(inner)) !== null) {
        const nums = (pm[1].match(/[-+]?(?:\d+\.\d+|\d+|\.\d+)/g) || []).map(Number);
        for (let k = 0; k < nums.length - 1; k += 2) addPt(nums[k], nums[k + 1]);
      }

      const defPart = PUPPET_PARTS[partKey];
      let pivotX = defPart.pivotX;
      let pivotY = defPart.pivotY;
      let bbox = null;
      if (xs.length && ys.length) {
        const nx0 = (Math.min(...xs) - vx) * sx;
        const ny0 = (Math.min(...ys) - vy) * sy;
        const nx1 = (Math.max(...xs) - vx) * sx;
        const ny1 = (Math.max(...ys) - vy) * sy;
        const anc = SVG_PIVOT_ANCHORS[partKey] || [0.5, 0.5];
        pivotX = +numClamp(nx0 + (nx1 - nx0) * anc[0], defPart.pivotX, 0, 640).toFixed(1);
        pivotY = +numClamp(ny0 + (ny1 - ny0) * anc[1], defPart.pivotY, 0, 720).toFixed(1);
        bbox = [+nx0.toFixed(1), +ny0.toFixed(1), +nx1.toFixed(1), +ny1.toFixed(1)];
      }

      const fillMatch = inner.match(/fill\s*=\s*["'](#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?)["']/i);
      const fillHex = fillMatch ? fillMatch[1].toUpperCase() : null;
      const visible = getAttr(g.attrsStr, "display").toLowerCase() !== "none";

      if (!matchedParts[partKey] || rawDataPart) {
        matchedParts[partKey] = {
          x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1,
          pivotX, pivotY, zOrder: g.z, color: fillHex, outlineWidth: 1, visible,
        };
        layers.push({
          layer: display, part: partKey, label: defPart.label, labelEn: defPart.labelEn,
          pivotX, pivotY, zOrder: g.z, bbox, color: fillHex,
        });
      }
    }

    const missingParts = Object.keys(PUPPET_PARTS).filter((pk) => !matchedParts[pk]);
    const hasCustomColor = Object.values(matchedParts).some((p) => Boolean(p.color));
    const puppet = resolvePuppetConfig({
      character,
      paletteLock: !hasCustomColor,
      parts: matchedParts,
    });

    return {
      schema: "khordegir-svg-rig-import",
      version: 1,
      viewBox: [vx, vy, vw, vh],
      matchedCount: Object.keys(matchedParts).length,
      totalCanonicalParts: Object.keys(PUPPET_PARTS).length,
      layers,
      missingParts,
      unmatchedLayers,
      parts: puppet.parts,
      puppet,
    };
  }

  /* ============================================================================
     STUDIO MOTION DESIGN SYSTEM v2 (A1 Motion Audit · A2 Text Suite · A4 Transitions 2.0)
     Consistent semantic duration & stagger tokens, easing families, role-based overshoot
     & anticipation rules, 5 brand motion personalities, 14 RTL-safe kinetic text presets,
     and 32 deterministic broadcast transitions (all strictly respecting STAGE_ZOOM_CAP 1.06).
     ============================================================================ */

  const DURATION_TOKENS = {
    instant:    0.10,
    micro:      0.18,
    snappy:     0.32,
    base:       0.50,
    expressive: 0.68,
    dramatic:   0.92,
    slow:       1.25,
  };

  const STAGGER_TOKENS = {
    tight:     0.028,
    normal:    0.048,
    editorial: 0.072,
    list:      0.085,
    grid:      0.064,
    dramatic:  0.115,
  };

  const EASING_FAMILIES = {
    // Editorial & Broadcast (crisp deceleration, zero tacky bounce)
    editorial:   [0.22, 1.00, 0.36, 1.00],
    vox:         [0.19, 1.00, 0.22, 1.00],
    silk:        [0.33, 1.00, 0.68, 1.00],
    fluid:       [0.25, 1.00, 0.35, 1.00],
    // Snappy & High-Energy
    snappy:      [0.16, 1.00, 0.30, 1.00],
    power4:      [0.16, 1.00, 0.30, 1.00],
    power3:      [0.22, 1.00, 0.36, 1.00],
    expo:        [0.19, 1.00, 0.22, 1.00],
    // Mechanical / Newsroom
    sharp:       [0.40, 0.00, 0.20, 1.00],
    snap:        [0.08, 0.92, 0.18, 1.00],
    // Cinematic
    cinematic:   [0.45, 0.00, 0.15, 1.00],
    dramatic:    [0.12, 0.96, 0.24, 1.00],
    // Overshoot & Spring (GSAP named curves for crisp follow-through)
    back:        "back.out(1.18)",
    spring:      "back.out(1.36)",
    pop:         "back.out(1.65)",
    overshoot:   "back.out(1.45)",
    elasticSoft: "elastic.out(1, 0.68)",
  };

  /* Role-based overshoot & anticipation discipline:
     - Body prose, notes & photographs NEVER bounce or overshoot (keeps editorial authority).
     - Badges, bubbles, cards, numbers & headlines may use calibrated anticipation + follow-through. */
  const OVERSHOOT_RULES = {
    eyebrow: { maxScale: 1.00, allowOvershoot: false, anticipationPx: 0,  followThrough: 0.00, durToken: "snappy",     defaultEase: "vox" },
    title:   { maxScale: 1.02, allowOvershoot: false, anticipationPx: 4,  followThrough: 0.06, durToken: "base",       defaultEase: "vox" },
    body:    { maxScale: 1.00, allowOvershoot: false, anticipationPx: 0,  followThrough: 0.00, durToken: "base",       defaultEase: "fluid" },
    card:    { maxScale: 1.025, allowOvershoot: true, anticipationPx: 6,  followThrough: 0.08, durToken: "expressive", defaultEase: "vox" },
    badge:   { maxScale: 1.055, allowOvershoot: true, anticipationPx: 5,  followThrough: 0.10, durToken: "snappy",     defaultEase: "spring" },
    bubble:  { maxScale: 1.05, allowOvershoot: true,  anticipationPx: 5,  followThrough: 0.09, durToken: "snappy",     defaultEase: "back" },
    number:  { maxScale: 1.04, allowOvershoot: true,  anticipationPx: 4,  followThrough: 0.08, durToken: "dramatic",   defaultEase: "power4" },
    bar:     { maxScale: 1.015, allowOvershoot: false, anticipationPx: 0, followThrough: 0.05, durToken: "expressive", defaultEase: "vox" },
    image:   { maxScale: 1.00, allowOvershoot: false, anticipationPx: 0,  followThrough: 0.00, durToken: "expressive", defaultEase: "power4" },
    note:    { maxScale: 1.00, allowOvershoot: false, anticipationPx: 0,  followThrough: 0.00, durToken: "base",       defaultEase: "silk" },
  };

  /* 5 Beginner One-Click Motion Personalities (A1 & A8) */
  const MOTION_PERSONALITIES = {
    editorial: {
      label: "تحریریه و مستند (Editorial)", labelEn: "Editorial",
      durScale: 1.00, staggerScale: 1.00, ease: "vox", bodyEase: "fluid",
      overshootMult: 0.4, anticipation: false, textPreset: "rise-mask",
    },
    calm: {
      label: "آرام و سینمایی (Calm)", labelEn: "Calm",
      durScale: 1.28, staggerScale: 1.25, ease: "silk", bodyEase: "silk",
      overshootMult: 0.0, anticipation: false, textPreset: "editorial-blur",
    },
    punchy: {
      label: "پرانرژی و شورتس (Punchy)", labelEn: "Punchy",
      durScale: 0.78, staggerScale: 0.76, ease: "snappy", bodyEase: "power4",
      overshootMult: 1.0, anticipation: true, textPreset: "punch-scale",
    },
    playful: {
      label: "بازیگوش و پویا (Playful)", labelEn: "Playful",
      durScale: 0.88, staggerScale: 0.85, ease: "spring", bodyEase: "back",
      overshootMult: 1.35, anticipation: true, textPreset: "pop-clean",
    },
    news: {
      label: "خبری و فوری (Newsroom)", labelEn: "Newsroom",
      durScale: 0.72, staggerScale: 0.68, ease: "sharp", bodyEase: "snappy",
      overshootMult: 0.2, anticipation: false, textPreset: "glide-rtl",
    },
  };

  /* A2: 14 RTL-Safe Persian + English Kinetic Typography Presets */
  const TEXT_ANIMATION_PRESETS = {
    "rise-mask":       { label: "صعود از ماسک (Rise Mask)",           labelEn: "Rise Mask",       unit: "word", dur: "base",       stagger: "normal",    ease: "vox" },
    "glide-rtl":       { label: "ورود کشیده از راست (Glide RTL)",      labelEn: "Glide RTL",       unit: "word", dur: "base",       stagger: "normal",    ease: "expo" },
    "editorial-blur":  { label: "وضوح تحریریه (Editorial Blur)",       labelEn: "Editorial Blur",  unit: "word", dur: "expressive", stagger: "tight",     ease: "fluid" },
    "pop-clean":       { label: "پرش تمیز (Pop Clean)",                labelEn: "Pop Clean",       unit: "word", dur: "snappy",     stagger: "tight",     ease: "spring" },
    "cascade-3d":      { label: "آبشار سه‌بعدی (Cascade 3D)",           labelEn: "Cascade 3D",      unit: "word", dur: "expressive", stagger: "normal",    ease: "power4" },
    "line-curtain":    { label: "پرده خط‌به‌خط (Line Curtain)",          labelEn: "Line Curtain",    unit: "line", dur: "expressive", stagger: "editorial", ease: "vox" },
    "letter-wave":     { label: "موج حروف ایمن (RTL-Safe Letter Wave)", labelEn: "Letter Wave",     unit: "auto", dur: "snappy",     stagger: "tight",     ease: "spring" },
    "typewriter":      { label: "تایپ‌رایتر با مکان‌نما (Typewriter)",   labelEn: "Typewriter",      unit: "type", dur: "dramatic",   stagger: "tight",     ease: "none" },
    "highlight-sweep": { label: "ماژیک هایلایت (Highlight Sweep)",      labelEn: "Highlight Sweep", unit: "word", dur: "base",       stagger: "tight",     ease: "vox" },
    "underline-draw":  { label: "خط‌کشی زیر متن (Underline Draw)",      labelEn: "Underline Draw",  unit: "word", dur: "base",       stagger: "tight",     ease: "expo" },
    "strike-through":  { label: "خط زدن نمایشی (Strike Through)",       labelEn: "Strike Through",  unit: "word", dur: "base",       stagger: "tight",     ease: "sharp" },
    "split-reveal":    { label: "شکاف مرکزی (Split Reveal)",            labelEn: "Split Reveal",    unit: "line", dur: "expressive", stagger: "normal",    ease: "cinematic" },
    "punch-scale":     { label: "ضربه تیتر با پیش‌حرکت (Punch Scale)",   labelEn: "Punch Scale",     unit: "word", dur: "snappy",     stagger: "tight",     ease: "overshoot" },
    "counting-text":   { label: "شمارش اعداد در متن (Counting Text)",   labelEn: "Counting Text",   unit: "count", dur: "dramatic",  stagger: "normal",    ease: "power3" },
  };

  /* A4: Transition Library 2.0 — 32 Deterministic Broadcast Transitions */
  const TRANSITION_LIBRARY = {
    // Classic & Editorial (6)
    "soft-fade":        { cat: "classic",   label: "محو نرم (Soft Fade)",                 labelEn: "Soft Fade",        dur: 0.36, ease: "fluid" },
    "curtain-rtl":      { cat: "classic",   label: "پرده از راست به چپ (Curtain RTL)",    labelEn: "Curtain RTL",      dur: 0.54, ease: "vox" },
    "curtain-ltr":      { cat: "classic",   label: "پرده از چپ به راست (Curtain LTR)",    labelEn: "Curtain LTR",      dur: 0.54, ease: "vox" },
    "editorial-push":   { cat: "classic",   label: "پوش تحریریه (Editorial Push)",         labelEn: "Editorial Push",   dur: 0.58, ease: "vox" },
    "split-curtain":    { cat: "classic",   label: "پرده دوقسمتی بالا/پایین (Split)",      labelEn: "Split Curtain",    dur: 0.52, ease: "vox" },
    "cinema-bars":      { cat: "classic",   label: "کادر سینمایی (Cinema Bars)",          labelEn: "Cinema Bars",      dur: 0.58, ease: "fluid" },
    // Push & Slide (6)
    "push-left":        { cat: "push",      label: "هل دادن به چپ (Push Left)",           labelEn: "Push Left",        dur: 0.48, ease: "snappy" },
    "push-right":       { cat: "push",      label: "هل دادن به راست (Push Right)",        labelEn: "Push Right",       dur: 0.48, ease: "snappy" },
    "push-up":          { cat: "push",      label: "هل دادن به بالا (Push Up)",           labelEn: "Push Up",          dur: 0.50, ease: "snappy" },
    "push-down":        { cat: "push",      label: "هل دادن به پایین (Push Down)",        labelEn: "Push Down",        dur: 0.50, ease: "snappy" },
    "slide-over-rtl":   { cat: "push",      label: "لغزش روی صفحه از راست (Slide RTL)",   labelEn: "Slide Over RTL",   dur: 0.52, ease: "expo" },
    "slide-over-up":    { cat: "push",      label: "لغزش روی صفحه از پایین (Slide Up)",   labelEn: "Slide Over Up",    dur: 0.52, ease: "expo" },
    // Zoom & Optical (within 1.06 cap) (4)
    "zoom-iris":        { cat: "optical",   label: "گشایش زوم نرم (Zoom Iris)",           labelEn: "Zoom Iris",        dur: 0.50, ease: "vox" },
    "zoom-through-in":  { cat: "optical",   label: "عبور زوم به داخل (Zoom Through In)",  labelEn: "Zoom Through In",  dur: 0.52, ease: "dramatic" },
    "zoom-through-out": { cat: "optical",   label: "عبور زوم به بیرون (Zoom Through Out)",labelEn: "Zoom Through Out", dur: 0.52, ease: "dramatic" },
    "iris-rise":        { cat: "optical",   label: "باز شدن دایره‌ای (Iris Rise)",        labelEn: "Iris Rise",        dur: 0.52, ease: "vox" },
    // Wipes & Geometry (6)
    "diagonal-wipe":    { cat: "wipe",      label: "پاک‌شدن مورب (Diagonal Wipe)",         labelEn: "Diagonal Wipe",    dur: 0.52, ease: "vox" },
    "accent-slash":     { cat: "wipe",      label: "نوار تأکید مورب (Accent Slash)",       labelEn: "Accent Slash",     dur: 0.52, ease: "power3" },
    "shutter-bars":     { cat: "wipe",      label: "کرکره ستونی (Shutter Bars)",          labelEn: "Shutter Bars",     dur: 0.56, ease: "vox" },
    "venetian-blinds":  { cat: "wipe",      label: "پرده کرکره‌ای افقی (Venetian Blinds)", labelEn: "Venetian Blinds",  dur: 0.58, ease: "snappy" },
    "clock-wipe":       { cat: "wipe",      label: "پاک‌شدن ساعتی (Clock Wipe)",           labelEn: "Clock Wipe",       dur: 0.60, ease: "cinematic" },
    "diamond-iris":     { cat: "wipe",      label: "گشایش لوزی (Diamond Iris)",           labelEn: "Diamond Iris",     dur: 0.54, ease: "vox" },
    // Whip & Motion Blur (3)
    "whip-pan-rtl":     { cat: "whip",      label: "چرخش سریع به چپ (Whip Pan RTL)",      labelEn: "Whip Pan RTL",     dur: 0.38, ease: "snap" },
    "whip-pan-ltr":     { cat: "whip",      label: "چرخش سریع به راست (Whip Pan LTR)",    labelEn: "Whip Pan LTR",     dur: 0.38, ease: "snap" },
    "whip-pan-up":      { cat: "whip",      label: "چرخش سریع عمودی (Whip Pan Up)",       labelEn: "Whip Pan Up",      dur: 0.38, ease: "snap" },
    // Creative, Organic & Editorial FX (7)
    "ink-splash":       { cat: "creative",  label: "پخش جوهر ارگانیک (Ink Splash)",       labelEn: "Ink Splash",       dur: 0.64, ease: "cinematic" },
    "paper-tear":       { cat: "creative",  label: "پاره‌شدن کاغذ تحریریه (Paper Tear)",   labelEn: "Paper Tear",       dur: 0.58, ease: "vox" },
    "glitch-lite":      { cat: "creative",  label: "گلیچ سبک دیجیتال (Glitch Lite)",      labelEn: "Glitch Lite",      dur: 0.42, ease: "sharp" },
    "light-leak":       { cat: "creative",  label: "نشت نور سینمایی (Light Leak)",       labelEn: "Light Leak",       dur: 0.66, ease: "fluid" },
    "film-flash":       { cat: "creative",  label: "فلش نگاتیو فیلم (Film Flash)",        labelEn: "Film Flash",       dur: 0.44, ease: "power4" },
    "rgb-split":        { cat: "creative",  label: "شکاف رنگی RGB (RGB Split)",           labelEn: "RGB Split",        dur: 0.44, ease: "snap" },
    "page-turn":        { cat: "creative",  label: "ورق زدن صفحه (Page Turn)",            labelEn: "Page Turn",        dur: 0.62, ease: "cinematic" },
  };

  function resolveMotionPersonality(name) {
    const k = String(name || "editorial").trim().toLowerCase();
    return Object.assign({ name: MOTION_PERSONALITIES[k] ? k : "editorial" }, MOTION_PERSONALITIES[k] || MOTION_PERSONALITIES.editorial);
  }

  function resolveTransitionTiming(mode, rawTiming) {
    const spec = TRANSITION_LIBRARY[mode] || TRANSITION_LIBRARY["soft-fade"];
    const t = (rawTiming && typeof rawTiming === "object") ? rawTiming : {};
    return {
      duration: numClamp(t.duration, spec.dur, 0.14, 1.80),
      delay: numClamp(t.delay, 0.0, 0.0, 1.0),
      ease: (typeof t.ease === "string" && t.ease.trim()) ? t.ease.trim() : spec.ease,
      intensity: numClamp(t.intensity, 1.0, 0.25, 1.6),
      accentColor: (typeof t.accentColor === "string" && t.accentColor.trim()) ? t.accentColor.trim() : null,
    };
  }

  /* A3: Licence-Safe Shape & Mask Wipe Presets */
  const SHAPE_WIPE_PRESETS = {
    "wipe-rtl":      { label: "پاک‌شدن از راست (Wipe RTL)",      labelEn: "Wipe RTL" },
    "wipe-ltr":      { label: "پاک‌شدن از چپ (Wipe LTR)",        labelEn: "Wipe LTR" },
    "wipe-up":       { label: "پاک‌شدن به بالا (Wipe Up)",        labelEn: "Wipe Up" },
    "wipe-down":     { label: "پاک‌شدن به پایین (Wipe Down)",     labelEn: "Wipe Down" },
    "circle-reveal": { label: "گشایش دایره‌ای (Circle Reveal)",   labelEn: "Circle Reveal" },
    "blob-organic":  { label: "پرده ارگانیک مایع (Blob Reveal)",  labelEn: "Organic Blob" },
    "diagonal-cut":  { label: "برش مورب (Diagonal Cut)",          labelEn: "Diagonal Cut" },
  };

  /* A5: Deterministic Virtual Camera Presets (strictly obeys STAGE_ZOOM_CAP = 1.06 except allowMapCamera) */
  const CAMERA_PRESETS = {
    "none":            { label: "ثابت (بدون دوربین)",                   labelEn: "Static",          dolly: 0,     panX: 0,  panY: 0,  parallax: 0,   focusBlur: 0,   shakeAmp: 0 },
    "gentle-dolly-in": { label: "دالی نرم به داخل (Gentle Dolly In)",   labelEn: "Gentle Dolly In", dolly: 0.045, panX: -8, panY: -4, parallax: 14,  focusBlur: 0,   shakeAmp: 0 },
    "gentle-dolly-out":{ label: "دالی نرم به بیرون (Gentle Dolly Out)", labelEn: "Gentle Dolly Out",dolly: -0.045,panX: 8,  panY: 4,  parallax: 14,  focusBlur: 0,   shakeAmp: 0 },
    "parallax-drift":  { label: "عمق پارالاکس (Parallax Drift)",        labelEn: "Parallax Drift",  dolly: 0.025, panX: 18, panY: -6, parallax: 26,  focusBlur: 0,   shakeAmp: 0 },
    "focus-pull":      { label: "تغییر فوکوس سینمایی (Focus Pull)",     labelEn: "Focus Pull",      dolly: 0.03,  panX: -6, panY: 0,  parallax: 12,  focusBlur: 6.5, shakeAmp: 0 },
    "handheld-subtle": { label: "دوربین دستی ظریف (Subtle Handheld)",   labelEn: "Subtle Handheld", dolly: 0.02,  panX: 6,  panY: 4,  parallax: 10,  focusBlur: 0,   shakeAmp: 2.8 },
    "impact-shake":    { label: "ضربه کوتاه خبری (Impact Shake)",       labelEn: "Impact Shake",    dolly: 0.035, panX: 0,  panY: 0,  parallax: 8,   focusBlur: 0,   shakeAmp: 6.0, shakeDecay: 2.8 },
    "editorial-pan":   { label: "پن تحریریه آرام (Editorial Pan)",       labelEn: "Editorial Pan",   dolly: 0.02,  panX: -24,panY: -3, parallax: 18,  focusBlur: 0,   shakeAmp: 0 },
  };

  /* A6: Deterministic Seeded Particles & Weather Ambience Presets */
  const AMBIENCE_PRESETS = {
    "none":                 { label: "بدون ذرات (Off)",                     labelEn: "None",        count: 0,  speed: 0,    opacity: 0 },
    "studio-dust":          { label: "غبار نوری استودیو (Studio Dust)",     labelEn: "Studio Dust", count: 28, speed: 1.0,  opacity: 0.42 },
    "gold-bokeh":           { label: "بوکه طلایی سینمایی (Gold Bokeh)",     labelEn: "Gold Bokeh",  count: 16, speed: 0.65, opacity: 0.34 },
    "celebration-confetti": { label: "کاغذرنگی جشن (Confetti)",             labelEn: "Confetti",    count: 34, speed: 1.25, opacity: 0.82 },
    "warm-sparks":          { label: "جرقه‌های گرم صعودی (Warm Sparks)",    labelEn: "Warm Sparks", count: 24, speed: 1.35, opacity: 0.68 },
    "soft-rain":            { label: "باران ملایم (Soft Rain)",             labelEn: "Soft Rain",   count: 36, speed: 1.8,  opacity: 0.38 },
    "gentle-snow":          { label: "برف آرام (Gentle Snow)",              labelEn: "Gentle Snow", count: 32, speed: 0.85, opacity: 0.56 },
    "news-grid-pulse":      { label: "پالس شبکه خبری (News Grid Pulse)",    labelEn: "News Grid",   count: 18, speed: 0.9,  opacity: 0.28 },
  };

  function resolveCameraConfig(rawCam, opts = {}) {
    const isStr = typeof rawCam === "string";
    const obj = (rawCam && typeof rawCam === "object") ? rawCam : {};
    const presetKey = String(isStr ? rawCam : (obj.preset || "none")).trim().toLowerCase();
    const spec = CAMERA_PRESETS[presetKey] || CAMERA_PRESETS.none;
    const allowMap = Boolean(opts.allowMapCamera || obj.allowMapCamera);
    const maxZoom = allowMap ? 1.45 : STAGE_ZOOM_CAP;
    const intensity = numClamp(obj.intensity, 1.0, 0.2, 1.5);
    const dollyRaw = (obj.dolly != null ? Number(obj.dolly) : spec.dolly) * intensity;
    const maxDelta = maxZoom - 1.0;
    return {
      preset: CAMERA_PRESETS[presetKey] ? presetKey : "none",
      intensity,
      dolly: Math.max(-maxDelta, Math.min(maxDelta, Number.isFinite(dollyRaw) ? dollyRaw : 0)),
      panX: numClamp(obj.panX != null ? obj.panX : spec.panX * intensity, 0, -48, 48),
      panY: numClamp(obj.panY != null ? obj.panY : spec.panY * intensity, 0, -32, 32),
      parallax: numClamp(obj.parallax != null ? obj.parallax : spec.parallax * intensity, 0, 0, 42),
      focusBlur: numClamp(obj.focusBlur != null ? obj.focusBlur : spec.focusBlur * intensity, 0, 0, 12),
      shakeAmp: numClamp(obj.shakeAmp != null ? obj.shakeAmp : spec.shakeAmp * intensity, 0, 0, 10),
      shakeDecay: numClamp(obj.shakeDecay != null ? obj.shakeDecay : (spec.shakeDecay || 0), 0, 0, 8),
      allowMapCamera: allowMap,
      maxZoom,
    };
  }

  function resolveAmbienceConfig(rawAmb) {
    const isStr = typeof rawAmb === "string";
    const obj = (rawAmb && typeof rawAmb === "object") ? rawAmb : {};
    const presetKey = String(isStr ? rawAmb : (obj.preset || "none")).trim().toLowerCase();
    const spec = AMBIENCE_PRESETS[presetKey] || AMBIENCE_PRESETS.none;
    const density = numClamp(obj.density, 1.0, 0.35, 1.8);
    return {
      preset: AMBIENCE_PRESETS[presetKey] ? presetKey : "none",
      count: spec.count > 0 ? Math.max(6, Math.min(64, Math.round(spec.count * density))) : 0,
      speed: numClamp(obj.speed != null ? obj.speed : spec.speed, spec.speed, 0.2, 2.5),
      opacity: numClamp(obj.opacity != null ? obj.opacity : spec.opacity, spec.opacity, 0.05, 1.0),
      color: (typeof obj.color === "string" && obj.color.trim()) ? obj.color.trim() : null,
    };
  }

  /* Phase 5 Items 15–16: Puppet Shot System, Parallax Backgrounds & Lighting Presets */
  const SHOT_PRESETS = {
    "medium":   { label: "نمای متوسط (Medium)",       labelEn: "Medium Shot", zoom: 1.00, offsetX: 0, offsetY: 0,   pushIn: 0.025 },
    "close-up": { label: "نمای نزدیک (Close-Up)",     labelEn: "Close-Up",    zoom: 1.06, offsetX: 0, offsetY: 44,  pushIn: 0.00 },
    "wide":     { label: "نمای باز (Wide)",           labelEn: "Wide Shot",   zoom: 0.88, offsetX: 0, offsetY: -18, pushIn: 0.04 },
    "two-shot": { label: "دونفره گفتگو (Two-Shot)",    labelEn: "Two-Shot",    zoom: 0.96, offsetX: 0, offsetY: -8,  pushIn: 0.03 },
  };

  const PUPPET_BACKGROUNDS = {
    "none":               { label: "پیش‌فرض تم (Theme Default)",       labelEn: "Theme Default",    parallax: 0.0 },
    "studio-desk":        { label: "میز استودیو پادکست (Studio Desk)",  labelEn: "Studio Desk",      parallax: 1.0 },
    "news-desk":          { label: "استودیو خبر (News Desk)",           labelEn: "News Desk",        parallax: 1.0 },
    "night-city":         { label: "شهر شبانه پارالاکس (Night City)",   labelEn: "Night City",       parallax: 1.25 },
    "warm-library":       { label: "کتابخانه گرم (Warm Library)",       labelEn: "Warm Library",     parallax: 0.95 },
    "gradient-cyclorama": { label: "سیکلوراما استودیو (Cyclorama)",     labelEn: "Studio Cyclorama", parallax: 0.7 },
    "chroma-green":       { label: "پرده سبز کروماکی (Chroma Green)",   labelEn: "Chroma Green",     parallax: 0.0 },
    "transparent":        { label: "پس‌زمینه شفاف (Transparent Alpha)", labelEn: "Transparent",      parallax: 0.0 },
  };

  const LIGHTING_PRESETS = {
    "studio":        { label: "نور استاندارد استودیو (Studio)",    labelEn: "Studio Neutral", intensity: 0.0,  rimColor: "#FFFFFF", tintColor: "transparent", tintAlpha: 0,    rimAlpha: 0 },
    "rim-light":     { label: "نور لبه‌ای سینمایی (Rim Light)",     labelEn: "Rim Light",      intensity: 0.85, rimColor: "#F5B700", tintColor: "#0EA5E9",     tintAlpha: 0.06, rimAlpha: 0.75 },
    "warm":          { label: "نور گرم طلایی (Warm Key)",          labelEn: "Warm Key",       intensity: 0.75, rimColor: "#FBBF24", tintColor: "#F59E0B",     tintAlpha: 0.14, rimAlpha: 0.45 },
    "cool":          { label: "نور سرد تحریریه (Cool Blue)",        labelEn: "Cool Editorial", intensity: 0.75, rimColor: "#38BDF8", tintColor: "#0EA5E9",     tintAlpha: 0.14, rimAlpha: 0.48 },
    "dramatic-noir": { label: "نور دراماتیک نوآر (Dramatic Noir)", labelEn: "Dramatic Noir",  intensity: 0.90, rimColor: "#E2E8F0", tintColor: "#09090B",     tintAlpha: 0.24, rimAlpha: 0.70 },
    "sunset-gold":   { label: "نور غروب طلایی (Sunset Gold)",      labelEn: "Sunset Gold",    intensity: 0.80, rimColor: "#FB923C", tintColor: "#F97316",     tintAlpha: 0.16, rimAlpha: 0.62 },
  };

  function resolveSceneConfig(rawScene) {
    const src = (rawScene && typeof rawScene === "object") ? rawScene : {};
    const shotKey = SHOT_PRESETS[String(src.shot || "medium").trim().toLowerCase()]
      ? String(src.shot || "medium").trim().toLowerCase()
      : "medium";
    const shotSpec = SHOT_PRESETS[shotKey];
    const maxPush = Math.max(0, +(STAGE_ZOOM_CAP - shotSpec.zoom).toFixed(4));
    const rawPush = src.pushIn ?? src.push_in;
    const pushIn = numClamp(rawPush, Math.min(shotSpec.pushIn, maxPush), 0, maxPush);

    const rawTimeline = Array.isArray(src.shotTimeline) ? src.shotTimeline : (Array.isArray(src.shot_timeline) ? src.shot_timeline : []);
    const shotTimeline = rawTimeline
      .filter((c) => c && typeof c === "object")
      .map((c) => {
        const sk = SHOT_PRESETS[String(c.shot || "medium").trim().toLowerCase()]
          ? String(c.shot || "medium").trim().toLowerCase()
          : "medium";
        const sp = SHOT_PRESETS[sk];
        const spMax = Math.max(0, +(STAGE_ZOOM_CAP - sp.zoom).toFixed(4));
        return {
          t: Math.max(0, Number(c.t) || 0),
          shot: sk,
          pushIn: numClamp(c.pushIn ?? c.push_in, Math.min(sp.pushIn, spMax), 0, spMax),
          blend: numClamp(c.blend, 0.55, 0.1, 2.5),
        };
      })
      .sort((a, b) => a.t - b.t);

    const bgRaw = String(src.background || "none").trim().toLowerCase();
    const background = PUPPET_BACKGROUNDS[bgRaw] ? bgRaw : "none";
    const lightRaw = String(src.lighting || "studio").trim().toLowerCase();
    const lighting = LIGHTING_PRESETS[lightRaw] ? lightRaw : "studio";

    return {
      shot: shotKey,
      pushIn,
      shotTimeline,
      background,
      parallax: numClamp(src.parallax, PUPPET_BACKGROUNDS[background].parallax, 0, 2.0),
      lighting,
      lightingIntensity: numClamp(src.lightingIntensity, LIGHTING_PRESETS[lighting].intensity, 0, 1.5),
    };
  }

  /* Deterministic Shot Evaluator at time t (strictly obeys STAGE_ZOOM_CAP = 1.06) */
  function evaluateShotAt(sceneCfg, tSec, durationSec = 6) {
    const sc = resolveSceneConfig(sceneCfg);
    const t = Math.max(0, Number(tSec) || 0);
    const dur = Math.max(0.5, Number(durationSec) || 6);
    const smooth = (u) => {
      const x = Math.max(0, Math.min(1, u));
      return x * x * (3 - 2 * x);
    };

    const cues = sc.shotTimeline.length
      ? sc.shotTimeline
      : [{ t: 0, shot: sc.shot, pushIn: sc.pushIn, blend: 0.55 }];

    let cur = cues[0];
    let prev = cur;
    let nextT = dur;
    for (let i = 0; i < cues.length; i += 1) {
      if (cues[i].t <= t) {
        prev = i > 0 ? cues[i - 1] : cues[0];
        cur = cues[i];
        nextT = (i + 1 < cues.length) ? cues[i + 1].t : dur;
      }
    }

    const curSpec = SHOT_PRESETS[cur.shot] || SHOT_PRESETS.medium;
    const prevSpec = SHOT_PRESETS[prev.shot] || curSpec;
    const span = Math.max(0.25, nextT - cur.t);
    const localProgress = Math.max(0, Math.min(1, (t - cur.t) / span));
    const curZoom = Math.min(STAGE_ZOOM_CAP, curSpec.zoom + (cur.pushIn || 0) * smooth(localProgress));
    const prevZoom = Math.min(STAGE_ZOOM_CAP, prevSpec.zoom + (prev.pushIn || 0));

    let blend = 1;
    if (cur !== prev && cur.blend > 0 && t >= cur.t && t < cur.t + cur.blend) {
      blend = smooth((t - cur.t) / cur.blend);
    }

    const zoom = Math.min(STAGE_ZOOM_CAP, Math.max(0.75, prevZoom + (curZoom - prevZoom) * blend));
    const offsetX = prevSpec.offsetX + (curSpec.offsetX - prevSpec.offsetX) * blend;
    const offsetY = prevSpec.offsetY + (curSpec.offsetY - prevSpec.offsetY) * blend;

    return {
      shot: cur.shot,
      zoom: +zoom.toFixed(5),
      offsetX: +offsetX.toFixed(2),
      offsetY: +offsetY.toFixed(2),
      progress: +localProgress.toFixed(4),
    };
  }

  /* Phase 5 Item 17: Deterministic offline SRT parser (mirrors khordegir/srt.py) */
  function parseSrt(rawSrt) {
    const text = String(rawSrt || "").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
    const blocks = text.trim().split(/\n{2,}/);
    const re = /^\s*(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})/;
    const rtlRe = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
    const toSec = (h, m, s, ms) => +(Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(String(ms).padEnd(3, "0").slice(0, 3)) / 1000).toFixed(3);
    const cues = [];
    for (let i = 0; i < blocks.length; i += 1) {
      const lines = blocks[i].split("\n").map((l) => l.trim()).filter(Boolean);
      if (!lines.length) continue;
      let ti = -1;
      let mm = null;
      for (let j = 0; j < Math.min(2, lines.length); j += 1) {
        const hit = lines[j].match(re);
        if (hit) { ti = j; mm = hit; break; }
      }
      if (!mm) continue;
      let start = toSec(mm[1], mm[2], mm[3], mm[4]);
      let end = toSec(mm[5], mm[6], mm[7], mm[8]);
      if (end < start) { const tmp = start; start = end; end = tmp; }
      const cueText = lines.slice(ti + 1).join("\n").trim();
      if (!cueText) continue;
      cues.push({
        index: cues.length + 1,
        start,
        end,
        text: cueText,
        dir: rtlRe.test(cueText) ? "rtl" : "ltr",
      });
    }
    cues.sort((a, b) => a.start - b.start || a.end - b.end);
    cues.forEach((c, idx) => { c.index = idx + 1; });
    return cues;
  }

  function activeCaptionAt(cues, tSec) {
    if (!Array.isArray(cues) || !cues.length) return null;
    const t = Math.max(0, Number(tSec) || 0);
    for (let i = 0; i < cues.length; i += 1) {
      const c = cues[i];
      if (t >= Number(c.start || 0) && t < Number(c.end || 0)) return c;
    }
    return null;
  }

  /* Phase 6 Item 21: Bilingual Persian (RTL) + English (LTR) Studio UI Dictionary */
  const EDITOR_I18N = {
    fa: {
      dir: "rtl",
      lang: "fa",
      appTitle: "خرده‌گیر استودیو",
      ready: "آماده برای ویرایش",
      project: "پروژه:",
      newProject: "+ پروژه جدید",
      theme: "تم:",
      projectStyle: "🎨 سبک، لوگو و پادکست",
      importer: "📄 متن به اسلاید",
      randomAll: "🎲 تصادفی",
      unsaved: "تغییرات ذخیره نشده",
      saveYaml: "ذخیره video.yaml",
      sendLive: "📡 ارسال زنده OBS",
      obsConsole: "کنسول OBS و پرامپتر",
      slides: "اسلایدها",
      gallery: "+ گالری قالب‌ها",
      add: "+ افزودن",
      layoutSlide: "تمام‌صفحه",
      layoutScam: "اسلاید + من (SCAM)",
      layoutCam: "فقط دوربین",
      livingLoop: "حالت زنده (Living)",
      camGuide: "قاب دوربین",
      debugOverlay: "دیباگ عروسک",
      camFree: "ناحیه دوربین آزاد",
      reroll: "🎲 انیمیشن دیگر",
      play: "▶ پخش",
      pause: "⏸ مکث",
      replay: "↺ از اول",
      sfx: "🔊 صدا",
      slideSettings: "تنظیمات اسلاید",
      tabContent: "محتوا",
      tabPuppet: "عروسک",
      tabCurves: "منحنی و حرکت",
      tabCallouts: "فلش و نکته",
      tabLiving: "زنده و صدا",
      langSwitch: "EN / LTR",
      fpsLabel: "فریم:",
    },
    en: {
      dir: "ltr",
      lang: "en",
      appTitle: "Khordegir Studio",
      ready: "Ready to edit",
      project: "Project:",
      newProject: "+ New Project",
      theme: "Theme:",
      projectStyle: "🎨 Style, Logo & Podcast",
      importer: "📄 Script to Slides",
      randomAll: "🎲 Randomize",
      unsaved: "Unsaved changes",
      saveYaml: "Save video.yaml",
      sendLive: "📡 Send Live OBS",
      obsConsole: "OBS Console & Prompter",
      slides: "Slides",
      gallery: "+ Template Gallery",
      add: "+ Add",
      layoutSlide: "Full Slide",
      layoutScam: "Slide + Cam (SCAM)",
      layoutCam: "Camera Only",
      livingLoop: "Living Loop",
      camGuide: "Cam Guide",
      debugOverlay: "Puppet Debug",
      camFree: "Camera Zone Clear",
      reroll: "🎲 Reroll Motion",
      play: "▶ Play",
      pause: "⏸ Pause",
      replay: "↺ Replay",
      sfx: "🔊 SFX",
      slideSettings: "Slide Settings",
      tabContent: "Content",
      tabPuppet: "Puppet",
      tabCurves: "Motion & Curves",
      tabCallouts: "Callouts",
      tabLiving: "Living & Audio",
      langSwitch: "فا / RTL",
      fpsLabel: "FPS:",
    },
  };

  function clampZoom(val, fallback = 1) {
    const n = Number(val);
    if (!Number.isFinite(n)) return Math.min(STAGE_ZOOM_CAP, Math.max(0.5, Number(fallback) || 1));
    return Math.min(STAGE_ZOOM_CAP, Math.max(0.5, n));
  }

  function resolveFormat(fmt) {
    const key = String(fmt || "16:9").trim();
    return FORMATS[key] || FORMATS["16:9"];
  }

  window.StageMotionTokens = {
    STAGE_ZOOM_CAP,
    PUPPET_SCHEMA_VERSION,
    FORMATS,
    DURATION_TOKENS,
    STAGGER_TOKENS,
    EASING_FAMILIES,
    OVERSHOOT_RULES,
    MOTION_PERSONALITIES,
    TEXT_ANIMATION_PRESETS,
    TRANSITION_LIBRARY,
    SHAPE_WIPE_PRESETS,
    CAMERA_PRESETS,
    AMBIENCE_PRESETS,
    SHOT_PRESETS,
    PUPPET_BACKGROUNDS,
    LIGHTING_PRESETS,
    EDITOR_I18N,
    MASCOT_PALETTE,
    CHARACTERS,
    ACCESSORIES,
    OUTFITS,
    SKINS,
    LISTENER_REACTIONS,
    PUPPET_PARTS,
    VISEMES,
    EXPRESSIONS,
    GESTURES,
    ACTING,
    TONE_PRESETS,
    TONE_LIMITS,
    SECONDARY_DEFAULTS,
    DEFAULT_LIVE_HOTKEYS,
    DEFAULT_MIDI_MAP,
    resolveMotionPersonality,
    resolveTransitionTiming,
    resolveCameraConfig,
    resolveAmbienceConfig,
    resolveSceneConfig,
    evaluateShotAt,
    parseSrt,
    activeCaptionAt,
    resolveCharacterPalette,
    resolveToneConfig,
    resolvePuppetConfig,
    computeSpeakerCalibration,
    parseScriptTags,
    parseSvgToPuppetRig,
    clampZoom,
    resolveFormat,
  };
})();


