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
      emotion,
      emotionIntensity,
      autoEmotion,
      keyframes,
      sentences,
      gestures,
      gaze,
      accessories,
      accessoryTimeline,
      voice,
      calibration,
      live,
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
