/* Variants, presets, transitions, animated logo & atmosphere for every template (zero-config, 100% deterministic).
   - Seeded randomness: mulberry32 PRNG keyed on video + project seed + slide number + slide.seed -> reproducible rebuilds.
   - Backwards-compatible defaults: omitting `preset` keeps "classic" behavior; omitting `transition` keeps "soft-fade" (.fadein).
   - Setting "random" / "تصادفی" deterministically picks from rich motion presets, 32 transitions, and 7 animated logo modes.
   - All motion strictly driven via real GSAP 3 paused timelines (`Stage.tl` / `Stage.amb`) — 100% seeded and deterministic. */
(function () {
  "use strict";
  const S = window.Stage;
  const MT = window.StageMotionTokens || {};
  const FX = S.fx = {};

  /* ---------------------------------------------------------- seeded RNG (FNV/Murmur hash + mulberry32) */
  function hash(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  FX.hash = hash;
  FX.mulberry32 = mulberry32;
  FX.rngFor = (key) => mulberry32(hash(String(key)));
  const pick = (r, list) => list[Math.floor(r() * list.length) % list.length];
  const wpick = (r, obj) => {
    const keys = Object.keys(obj);
    const tot = Object.values(obj).reduce((a, b) => a + b, 0);
    let x = r() * (tot || 1);
    for (const k of keys) {
      x -= obj[k];
      if (x <= 0) return k;
    }
    return keys[0];
  };

  /* ---------------------------------------------------------- catalog of variants, presets, transitions, logo modes */
  FX.VARIANTS = ["rise", "slide", "mask", "blur", "scale"];
  FX.MOTIONS = { breathe: 3, "gentle-drift": 2, "zoom-out": 2, "pan-left": 1, "pan-right": 1, depth: 2 };

  const PRESETS = {
    title_card: ["kinetic-hero", "spotlight", "curtain-editorial", "split-contrast", "minimal-type", "glitch-pop"],
    big_number: ["slam-count", "halo-pulse", "bar-meter", "dual-split", "kinetic-stat", "minimal-count"],
    image_text: ["editorial-split", "kenburns-drift", "card-float", "frame-mask", "accent-bar", "cinema-wide"],
    bullet_list: ["stagger-cards", "cascade-rows", "timeline-rail", "pill-grid", "spotlight-focus", "minimal-clean"],
    quote: ["editorial-mark", "kinetic-words", "accent-brace", "glass-panel", "spotlight-serif", "bold-contrast"],
    section_break: ["chapter-banner", "curtain-drop", "numeral-watermark", "axis-sweep", "split-headline", "minimal-divider"],
    bar_chart: ["surge-bars", "editorial-bars", "pulse-highlight", "elastic-rise", "cascade-grid", "minimal-bars"],
    line_chart: ["sweep-trace", "editorial-curve", "marker-pop", "glow-path", "split-axis", "minimal-trace"],
    compare: ["versus-clash", "editorial-delta", "sweep-compare", "pop-badges", "mirror-flip", "minimal-compare"],
    counter_grid: ["stagger-counters", "pulse-tiles", "editorial-grid", "spring-cards", "sweep-row", "minimal-grid"],
    chart: ["sweep-chart", "editorial-spec", "elastic-spec", "spotlight-spec", "cascade-spec", "minimal-spec"],
    chat: ["pop-bubbles", "rapid-thread", "editorial-dialog", "slide-thread", "focus-alert", "minimal-chat"],
    image_full: ["cinema-zoom", "curtain-reveal", "radar-dots", "parallax-caption", "noir-vignette", "minimal-frame"],
    three_cards: ["trio-cascade", "elastic-fan", "spotlight-cards", "floating-trio", "sweep-grid", "minimal-cards"],
    timeline: ["track-sweep", "milestone-pop", "editorial-arc", "elastic-nodes", "stagger-eras", "minimal-rail"],
    layers: ["layered-depth", "kinetic-stage", "sweep-compose", "elastic-nodes", "cinematic-pass", "minimal-layers"],
    cam: ["cam-clean", "cam-soft", "cam-pulse", "cam-editorial", "cam-focus", "cam-minimal"],
    guest_intro: ["editorial-split", "card-float", "spotlight", "minimal-clean"],
    podcast_question: ["kinetic-words", "spotlight", "glitch-pop", "editorial-mark"],
    podcast_end: ["spotlight", "kinetic-hero", "curtain-editorial", "minimal-type"],
    article_zoom: ["cinematic-push", "tilt-glide", "marker-sweep", "split-paper"],
    mascot_talk: ["editorial-host", "debate-card", "reaction-pop", "podcast-desk"],
    breaking_news: ["urgent-flash", "ticker-crawl", "desk-split", "minimal-news"],
    fact_check: ["verdict-stamp", "evidence-split", "editorial-audit", "minimal-check"],
    two_source_compare: ["headline-clash", "editorial-mirror", "bias-delta", "minimal-sources"],
    definition_card: ["lexicon-reveal", "editorial-entry", "etymology-focus", "minimal-term"],
    quiz_poll: ["option-cascade", "countdown-reveal", "studio-quiz", "minimal-poll"],
    mistake_vs_correct: ["cross-to-check", "split-fix", "coach-callout", "minimal-fix"],
    step_by_step: ["rail-progress", "card-ladder", "editorial-steps", "minimal-steps"],
    hook_title: ["punch-hook", "split-slam", "vertical-viral", "minimal-hook"],
    before_after: ["curtain-wipe", "split-delta", "slider-sweep", "minimal-compare"],
    audiogram: ["studio-wave", "podcast-quote", "caption-pulse", "minimal-audio"],
    comparison_table: ["matrix-sweep", "winner-glow", "editorial-grid", "minimal-table"],
    newspaper_clip: ["press-zoom", "marker-clip", "archival-paper", "minimal-clip"],
    by_the_numbers: ["tier-counters", "editorial-grid", "slam-count", "minimal-count"],
    vocabulary_card: ["lexicon-reveal", "editorial-entry", "minimal-term"],
    flashcard_flip: ["card-flip-3d", "studio-quiz", "minimal-clean"],
    list_countdown: ["countdown-pop", "stagger-cards", "vertical-viral", "minimal-clean"],
    comment_reply: ["social-card", "pop-bubbles", "minimal-clean"],
    guest_card: ["editorial-split", "spotlight", "minimal-clean"],
    chapter_card: ["chapter-banner", "axis-sweep", "minimal-divider"],
    bar_race: ["race-live", "editorial-bars", "minimal-bars"],
    donut_chart: ["ring-draw", "editorial-spec", "minimal-spec"],
    map_choropleth: ["geo-pulse", "editorial-spec", "minimal-spec"],
    polaroid_wall: ["gallery-drop", "card-float", "minimal-frame"],
    mascot_pip: ["pip-host", "editorial-host", "podcast-desk"],
  };

  const PRESET_LABELS = {
    classic: "کلاسیک (پیش‌فرض پیشین)",
    "kinetic-hero": "تایپ کینتیک سینمایی",
    spotlight: "نورپردازی متمرکز",
    "curtain-editorial": "پرده سردبیری",
    "split-contrast": "کنتراست دوگانه",
    "minimal-type": "تایپوگرافی مینیمال",
    "glitch-pop": "پرش مدرن",
    "slam-count": "شمارش کوبنده",
    "halo-pulse": "هالهٔ نور و شمارش",
    "bar-meter": "نوار سنجش پویا",
    "dual-split": "چیدمان دوتایی",
    "kinetic-stat": "آمار کینتیک",
    "minimal-count": "شمارش تمیز",
    "editorial-split": "قاب دو تکه سردبیری",
    "kenburns-drift": "حرکت سینمایی تصویر",
    "card-float": "کارت شناور",
    "frame-mask": "پردهٔ ماسک تصویر",
    "accent-bar": "خط تأکید پویا",
    "cinema-wide": "کادر عریض سینمایی",
    "stagger-cards": "ورود پلکانی کارت‌ها",
    "cascade-rows": "آبشاری از راست",
    "timeline-rail": "خط راهنمای عمودی",
    "pill-grid": "شبکه مدرن",
    "spotlight-focus": "تأکید نوری روی مورد",
    "minimal-clean": "ورود نرم و تمیز",
    "editorial-mark": "نشان نقل‌قول تحریریه",
    "kinetic-words": "کلمه‌به‌کلمه زنده",
    "accent-brace": "کروشهٔ تأکید",
    "glass-panel": "پنل شیشه‌ای",
    "spotlight-serif": "کلاسیک برجسته",
    "bold-contrast": "کنتراست پررنگ",
    "chapter-banner": "بنر فصل سینمایی",
    "curtain-drop": "فرود پردهٔ فصل",
    "numeral-watermark": "واترمارک عدد بزرگ",
    "axis-sweep": "خط محور کشیده",
    "split-headline": "تیتر دوپاره",
    "minimal-divider": "جداکنندهٔ مینیمال",
    "surge-bars": "جهش میله‌ها",
    "editorial-bars": "میله‌های تحریریه",
    "pulse-highlight": "درخشش میلهٔ برجسته",
    "elastic-rise": "رشد فنری",
    "cascade-grid": "آبشاری شبکه",
    "minimal-bars": "میله‌های تمیز",
    "sweep-trace": "کشش پیوسته خط",
    "editorial-curve": "منحنی تحریریه",
    "marker-pop": "پرش نقطه‌ها",
    "glow-path": "خط نورانی",
    "split-axis": "محورهای پویا",
    "minimal-trace": "رسم مینیمال",
    "versus-clash": "مقایسه کوبنده",
    "editorial-delta": "تفاوت تحریریه",
    "sweep-compare": "فلش کشیده",
    "pop-badges": "پرش نشان‌ها",
    "mirror-flip": "چرخش متقارن",
    "minimal-compare": "مقایسه تمیز",
    "stagger-counters": "شمارش پلکانی",
    "pulse-tiles": "کارت‌های نبض‌دار",
    "editorial-grid": "شبکه تحریریه",
    "spring-cards": "کارت‌های فنری",
    "sweep-row": "ردیف کشیده",
    "minimal-grid": "شبکه مینیمال",
    "sweep-chart": "ورود پویا",
    "editorial-spec": "نمودار تحریریه",
    "elastic-spec": "نمودار فنری",
    "spotlight-spec": "تمرکز داده‌ها",
    "cascade-spec": "رسم آبشاری",
    "minimal-spec": "نمودار مینیمال",
    "pop-bubbles": "پرش حباب‌ها",
    "rapid-thread": "رشته گفتگوی سریع",
    "editorial-dialog": "گفتگوی تحریریه",
    "slide-thread": "ورود از طرفین",
    "focus-alert": "تأکید پیام مهم",
    "minimal-chat": "گفتگوی آرام",
    "cinema-zoom": "زوم سینمایی",
    "curtain-reveal": "پرده تصویر",
    "radar-dots": "نقاط راداری",
    "parallax-caption": "زیرنویس پارالاکس",
    "noir-vignette": "کنتراست تیره",
    "minimal-frame": "قاب مینیمال",
    "trio-cascade": "سه‌تایی آبشاری",
    "elastic-fan": "بادبزن فنری",
    "spotlight-cards": "کارت‌های درخشان",
    "floating-trio": "کارت‌های شناور",
    "sweep-grid": "ورود شبکه‌ای",
    "minimal-cards": "کارت‌های ساده",
    "track-sweep": "کشش خط زمان",
    "milestone-pop": "پرش رویدادها",
    "editorial-arc": "قوس تحریریه",
    "elastic-nodes": "نقاط فنری",
    "stagger-eras": "دوره‌های پلکانی",
    "minimal-rail": "ریل مینیمال",
    "layered-depth": "عمق چندلایه",
    "kinetic-stage": "صحنه کینتیک",
    "sweep-compose": "ترکیب کشیده",
    "cinematic-pass": "گذر سینمایی",
    "minimal-layers": "لایه‌های مینیمال",
    "cam-clean": "دوربین تمیز",
    "cam-soft": "دوربین نرم",
    "cam-pulse": "دوربین نبض‌دار",
    "cam-editorial": "دوربین تحریریه",
    "cam-focus": "تمرکز دوربین",
    "cam-minimal": "دوربین ساده",
    "cinematic-push": "زوم سینمایی روی جمله",
    "tilt-glide": "نمای سه‌بعدی مورب و زوم",
    "marker-sweep": "ماژیک هایلایت زنده + زوم نزدیک",
    "split-paper": "برگهٔ مقاله + توضیح کناری",
    "editorial-host": "مجری تحریریه و کارت گفتگو",
    "debate-card": "کارت مناظره و استدلال",
    "reaction-pop": "واکنش سریع و پویا",
    "podcast-desk": "میز پادکست تمام‌قاب",
    "urgent-flash": "تیتر فوری خبری",
    "ticker-crawl": "نوار زیرنویس زنده",
    "desk-split": "میز خبر دو ستونه",
    "minimal-news": "خبر مینیمال",
    "verdict-stamp": "مهر حکم راستی‌آزمایی",
    "evidence-split": "ادعا در برابر سند",
    "editorial-audit": "بررسی تحریریه",
    "minimal-check": "راستی‌آزمایی تمیز",
    "headline-clash": "تقابل دو تیتر",
    "editorial-mirror": "آینه دو رسانه",
    "bias-delta": "تحلیل زاویه دید",
    "minimal-sources": "مقایسه ساده منابع",
    "lexicon-reveal": "واژه‌نامه تحریریه",
    "editorial-entry": "مدخل خوانا",
    "etymology-focus": "ریشه و کاربرد",
    "minimal-term": "تعریف مینیمال",
    "option-cascade": "ورود پلکانی گزینه‌ها",
    "countdown-reveal": "تایمر و پاسخ درست",
    "studio-quiz": "کوییز استودیویی",
    "minimal-poll": "نظرسنجی ساده",
    "cross-to-check": "خط زدن غلط و تأکید درست",
    "split-fix": "اصلاح دو ستونه",
    "coach-callout": "نکته مربی",
    "minimal-fix": "اصلاح مینیمال",
    "rail-progress": "خط پیشرفت مرحله‌ای",
    "card-ladder": "نردبان کارت‌ها",
    "editorial-steps": "مراحل تحریریه",
    "minimal-steps": "گام‌های تمیز",
    "punch-hook": "قلاب ۳ ثانیه پرضربه",
    "split-slam": "تیتر دو تکه کوبنده",
    "vertical-viral": "ریتم شورتس و ریلز",
    "minimal-hook": "قلاب مینیمال",
    "curtain-wipe": "پرده مقایسه قبل و بعد",
    "split-delta": "تغییر دو نیمه",
    "slider-sweep": "اسلایدر زنده",
    "studio-wave": "موج صوتی استودیو",
    "podcast-quote": "نقل‌قول پادکست",
    "caption-pulse": "نبض زیرنویس",
    "minimal-audio": "آدیوگرام مینیمال",
    "matrix-sweep": "جدول مقایسه‌ای زنده",
    "winner-glow": "تأکید برنده",
    "minimal-table": "جدول ساده",
    "press-zoom": "زوم روزنامه آرشیوی",
    "marker-clip": "بریده با هایلایت ماژیک",
    "archival-paper": "بافت کاغذ تاریخی",
    "minimal-clip": "بریده روزنامه تمیز",
  };

  const TRANSITION_LIB = MT.TRANSITION_LIBRARY || {
    "soft-fade": { cat: "classic", label: "محو نرم (Soft Fade)", labelEn: "Soft Fade", dur: 0.36, ease: "fluid" },
    "curtain-rtl": { cat: "classic", label: "پرده از راست به چپ", labelEn: "Curtain RTL", dur: 0.54, ease: "vox" },
    "accent-slash": { cat: "wipe", label: "نوار تأکید مورب", labelEn: "Accent Slash", dur: 0.52, ease: "power3" },
    "iris-rise": { cat: "optical", label: "باز شدن دایره‌ای", labelEn: "Iris Rise", dur: 0.52, ease: "vox" },
    "split-curtain": { cat: "classic", label: "پرده دوقسمتی", labelEn: "Split Curtain", dur: 0.52, ease: "vox" },
    "diagonal-wipe": { cat: "wipe", label: "پاک‌شدن مورب", labelEn: "Diagonal Wipe", dur: 0.52, ease: "vox" },
    "zoom-iris": { cat: "optical", label: "گشایش زوم نرم", labelEn: "Zoom Iris", dur: 0.50, ease: "vox" },
    "shutter-bars": { cat: "wipe", label: "کرکره ستونی", labelEn: "Shutter Bars", dur: 0.56, ease: "vox" },
    "editorial-push": { cat: "classic", label: "پوش تحریریه", labelEn: "Editorial Push", dur: 0.58, ease: "vox" },
    "cinema-bars": { cat: "classic", label: "کادر سینمایی", labelEn: "Cinema Bars", dur: 0.58, ease: "fluid" },
  };
  const TRANSITIONS = Object.keys(TRANSITION_LIB);
  const TRANSITION_LABELS = {};
  const TRANSITION_CATEGORIES = {
    classic:  { label: "کلاسیک و تحریریه", labelEn: "Classic & Editorial" },
    push:     { label: "هل‌دادن و لغزش",   labelEn: "Push & Slide" },
    optical:  { label: "زوم و دایره‌ای",    labelEn: "Zoom & Iris" },
    wipe:     { label: "پاک‌شدن و هندسی",   labelEn: "Wipes & Geometry" },
    whip:     { label: "چرخش سریع",        labelEn: "Whip Pan" },
    creative: { label: "خلاقانه و فیلم",    labelEn: "Creative & Film FX" },
  };
  TRANSITIONS.forEach((k) => { TRANSITION_LABELS[k] = TRANSITION_LIB[k].label; });

  const LOGO_MOTIONS = [
    "pop-spin",
    "slide-rtl",
    "orbit-pulse",
    "flip-reveal",
    "stamp-drop",
    "glitch-snap",
    "float-fade",
  ];
  const LOGO_MOTION_LABELS = {
    "pop-spin": "پرش و چرخش نرم",
    "slide-rtl": "ورود کشیده از راست",
    "orbit-pulse": "نبض نورانی ملایم",
    "flip-reveal": "چرخش سه‌بعدی",
    "stamp-drop": "کوبش مهر برند",
    "glitch-snap": "لرزش سریع دیجیتال",
    "float-fade": "ظهور و شناوری آرام",
  };

  FX.CATALOG = {
    presets: PRESETS,
    presetLabels: PRESET_LABELS,
    transitions: TRANSITIONS,
    transitionLabels: TRANSITION_LABELS,
    transitionLibrary: TRANSITION_LIB,
    transitionCategories: TRANSITION_CATEGORIES,
    motionPersonalities: MT.MOTION_PERSONALITIES || {},
    textAnimations: MT.TEXT_ANIMATION_PRESETS || {},
    shapeWipes: MT.SHAPE_WIPE_PRESETS || {},
    cameraPresets: MT.CAMERA_PRESETS || {},
    ambiencePresets: MT.AMBIENCE_PRESETS || {},
    easingFamilies: Object.keys(MT.EASING_FAMILIES || { vox: 1, fluid: 1, snappy: 1, silk: 1, sharp: 1, spring: 1 }),
    logoMotions: LOGO_MOTIONS,
    logoMotionLabels: LOGO_MOTION_LABELS,
    logoPositions: ["top-left", "top-right", "bottom-right", "bottom-left"],
    imageMotions: ["breathe", "gentle-drift", "zoom-out", "pan-left", "pan-right", "depth", "none"],
    floatStyles: ["silk-glide", "optical-breathe"],
  };

  const isRand = (v) => v === "random" || v === "تصادفی";
  const isUnset = (v) => v == null || v === "" || v === "auto";

  /* ---------------------------------------------------------- per-slide seeded setup */
  FX.setup = function (slide) {
    const tname = String(slide.template || "title_card").replace(/-/g, "_");
    const key = slide._seed || `${tname}:${slide.title || slide.text || ""}`;
    const r = FX.rngFor(key + ":" + (slide.seed ?? ""));
    const want = (v) => v == null || v === "" || isRand(v);
    const fxIn = slide.fx || {};
    const th = S.theme || {};
    const dflt = th.fx || {};

    const tplPresets = PRESETS[tname] || PRESETS.title_card;
    let preset;
    if (isRand(slide.preset)) preset = pick(r, tplPresets);
    else if (isUnset(slide.preset)) preset = "classic";
    else preset = slide.preset;

    let transition;
    if (isRand(slide.transition)) transition = pick(r, TRANSITIONS);
    else if (isUnset(slide.transition)) transition = "soft-fade";
    else transition = slide.transition;

    let logoMotion;
    if (isRand(slide.logo_motion)) logoMotion = pick(r, LOGO_MOTIONS);
    else if (isUnset(slide.logo_motion)) logoMotion = "pop-spin";
    else logoMotion = slide.logo_motion;

    const c = FX.cur = {
      variant: want(slide.variant) ? pick(r, dflt.variants || FX.VARIANTS) : slide.variant,
      preset,
      transition,
      logoMotion,
      motion: want(slide.motion) ? wpick(r, dflt.motions || FX.MOTIONS) : slide.motion,
      glowPos: pick(r, [[0.86, 0.06], [0.14, 0.08], [0.78, 0.92], [0.5, -0.05]]),
      leak: fxIn.leak ?? (dflt.leak === "random" ? r() < 0.45 : !!dflt.leak),
      dust: fxIn.dust ?? (dflt.dust === "random" ? r() < 0.6 : !!dflt.dust),
      grain: fxIn.grain ?? (dflt.grain !== false),
      accentFx: fxIn.accent ?? (dflt.accent === "random" ? pick(r, ["none", "underline", "none"]) : (dflt.accent || "none")),
      r,
    };
    S.cues = [];
    return c;
  };

  /* ---------------------------------------------------------- entrance from-vars */
  FX.from = function (role, m) {
    const v = (FX.cur && FX.cur.variant) || "rise";
    const from = { opacity: 0 };
    const textish = ["title", "eyebrow", "body", "note"].includes(role);
    const cardish = ["card"].includes(role);
    if (["bubble", "badge", "number"].includes(role) || v === "rise") {
      if (m.x) from.x = m.x; if (m.y) from.y = m.y; if (m.scale) from.scale = m.scale;
      return from;
    }
    if (v === "slide") {
      if (textish) from.x = role === "title" ? 36 : 22;
      else if (cardish) { from.x = 28; from.scale = 0.985; }
      else if (role === "image") from.x = -32;
    } else if (v === "mask") {
      if (textish) { from.clipPath = "inset(-18% -4% 100% -4%)"; from.y = 12; }
      else if (cardish) { from.clipPath = "inset(0% 0% 0% 100%)"; }
      else if (role === "image") { from.clipPath = "inset(0% 0% 0% 100% round 16px)"; }
    } else if (v === "blur") {
      from.filter = "blur(10px)";
      if (textish) from.y = 8; if (cardish) from.scale = 0.982; if (role === "image") from.scale = 1.028;
    } else if (v === "scale") {
      from.scale = textish ? 0.968 : role === "image" ? 1.032 : 0.96;
    }
    return from;
  };

  FX.to = function (from) {
    const to = {};
    if (from.clipPath) to.clipPath = from.clipPath.includes("round") ? "inset(0% 0% 0% 0% round 16px)" : "inset(-25% -6% -25% -6%)";
    if (from.filter) to.filter = "blur(0px)";
    return to;
  };

  FX.imageMotion = function (requested, index = 0) {
    if (requested && !isRand(requested) && requested !== "auto") return requested;
    if (index <= 1 && FX.cur) return FX.cur.motion;
    if (FX.cur && FX.cur.r) return wpick(FX.cur.r, FX.MOTIONS);
    return "breathe";
  };

  FX.cue = function (t, type, label, opts = {}) {
    if (S.cues) S.cues.push({ t: +t.toFixed(3), type, label: label || "", opts: opts || {} });
  };

  /* ---------------------------------------------------------- atmosphere (ambient, behind content) */
  let grainURL = null;
  function grainTile() {
    if (grainURL) return grainURL;
    try {
      const c = document.createElement("canvas");
      if (c && typeof c.getContext === "function") {
        c.width = c.height = 256;
        const g = c.getContext("2d");
        if (g) {
          const img = g.createImageData(256, 256), r = mulberry32(1234);
          for (let i = 0; i < img.data.length; i += 4) {
            const v = 110 + r() * 145;
            img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
            img.data[i + 3] = 255;
          }
          g.putImageData(img, 0, 0);
          grainURL = c.toDataURL("image/png");
          return grainURL;
        }
      }
    } catch (_) { /* Node VM fallback below */ }
    grainURL = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><rect width='120' height='120' fill='%23808080' opacity='0.15'/></svg>";
    return grainURL;
  }

  FX.atmosphere = function (stage, slide) {
    const th = S.theme || {}, col = th.colors || {}, c = FX.cur || {};
    const W = S.W, H = S.H, r = FX.rngFor((slide._seed || "") + ":atm");
    const isLight = col.isDark === false;

    if (c.leak && !isLight) {
      const lk = document.createElement("div");
      lk.className = "leak";
      stage.appendChild(lk);
      const fromLeft = r() < 0.5;
      Object.assign(lk.style, {
        width: "1300px", height: "900px", top: (-300 + r() * 500) + "px", left: fromLeft ? "-700px" : "1300px",
        background: `radial-gradient(ellipse at center, rgba(255,170,60,.55) 0%, rgba(255,120,40,.18) 35%, transparent 70%)`,
      });
      S.amb.fromTo(lk, { opacity: 0.0, x: 0 }, { opacity: 0.11, x: fromLeft ? 260 : -260, duration: 9, ease: "sine.inOut", yoyo: true, repeat: 9 }, 0);
    }

    if (c.dust && (!slide.livingStage || slide.livingStage.intensity === "off")) {
      const box = document.createElement("div");
      box.className = "dust";
      stage.appendChild(box);
      const n = 14;
      for (let i = 0; i < n; i++) {
        const d = document.createElement("i");
        const s = 3.5 + r() * 4.5;
        Object.assign(d.style, {
          left: (r() * W) + "px",
          top: (r() * H) + "px",
          width: s + "px",
          height: s + "px",
          background: isLight ? (col.muted || "#666") : "#fff8dc",
          opacity: (isLight ? (0.04 + r() * 0.08) : (0.06 + r() * 0.14)).toFixed(2),
          filter: "blur(1.5px)",
        });
        box.appendChild(d);
        S.amb.to(d, { x: (r() - 0.5) * 110, y: -30 - r() * 90, duration: 22 + r() * 10, ease: "sine.inOut", yoyo: true, repeat: 99 }, 0);
      }
    }

    // Extra subtle architectural sweep on lively presets (never changes classic baseline)
    if (c.preset && c.preset !== "classic") {
      const sw = document.createElement("div");
      sw.className = "light-sweep";
      stage.appendChild(sw);
      S.amb.fromTo(sw, { x: 600, opacity: 0 }, { x: -1600, opacity: isLight ? 0.14 : 0.2, duration: 12, ease: "sine.inOut", yoyo: true, repeat: 99 }, 0);
    }
  };

  FX.grain = function (stage) {
    // Keep film texture completely static and ultra-subtle (no 24fps position jumping that looks like noise on text/shapes)
    if (!FX.cur || !FX.cur.grain || !(S.slide && S.slide.fx && S.slide.fx.grain === true)) return;
    const gr = document.createElement("div");
    gr.className = "grain";
    stage.appendChild(gr);
    gr.style.opacity = "0.018";
    gr.style.backgroundImage = `url(${grainTile()})`;
  };

  /* "depth" idle variant: a big blurred copy of the image behind everything drifts smoothly in continuous yoyo */
  FX.depth = function (src) {
    const stage = document.getElementById("stage");
    if (!stage || stage.querySelector(".depth")) return;
    const d = document.createElement("div"); d.className = "depth";
    const im = document.createElement("img"); im.src = src; d.appendChild(im);
    stage.insertBefore(d, stage.querySelector(".content"));
    S._imgs.push(im);
    S.amb.fromTo(im, { scale: 1.11, x: -8, y: 0 }, {
      scale: 1.15, x: 18, y: -6, duration: 28, ease: "sine.inOut", yoyo: true, repeat: 99, force3D: true,
    }, 0);
  };

  /* ---------------------------------------------------------- A4: Transition Library 2.0 (32 deterministic broadcast transitions) */
  FX.transitionIn = function (stage, slide, th) {
    const mode = (FX.cur && FX.cur.transition) || "soft-fade";
    const clip = th.clip || { fade: 0.3 };
    const col = th.colors || {};
    const content = stage.querySelector(".content");
    const W = S.W || 1920;
    const H = S.H || 1080;
    const rawTiming = slide.transitionTiming || slide.transition_timing || null;
    const timing = MT.resolveTransitionTiming
      ? MT.resolveTransitionTiming(mode, rawTiming)
      : { duration: 0.52, delay: 0, ease: "vox", intensity: 1, accentColor: null };
    const dur = timing.duration;
    const t0 = timing.delay;
    const ez = S.ease(timing.ease || "vox");
    const k = timing.intensity || 1.0;
    const accent = timing.accentColor || col.accent || "#FFD600";
    const bgMain = col.bg || "#121212";
    const bgAlt = col.bg2 || col.surface || "#16161a";
    const cap = (z) => (S.capZoom ? S.capZoom(z, 1) : Math.min(1.06, Math.max(0.5, z)));
    const rng = FX.rngFor(`${slide._seed || "tr"}:${mode}`);

    const makeOverlay = (cls, styles) => {
      const el = document.createElement("div");
      el.className = "transition-overlay " + cls;
      Object.assign(el.style, { position: "absolute", pointerEvents: "none", zIndex: 90 }, styles || {});
      stage.appendChild(el);
      return el;
    };

    /* 1. soft-fade (classic default) */
    if (mode === "soft-fade") {
      const fade = document.createElement("div");
      fade.className = "fadein";
      stage.appendChild(fade);
      const fd = rawTiming && rawTiming.duration != null ? dur : (clip.fade > 0 ? clip.fade : 0);
      if (fd > 0) S.tl.fromTo(fade, { opacity: 1 }, { opacity: 0, duration: fd, ease: "power1.out", immediateRender: true }, t0);
      else fade.remove();
      return;
    }

    /* 2. curtain-rtl */
    if (mode === "curtain-rtl") {
      const panel = makeOverlay("transition-curtain-rtl", {
        inset: "0", background: bgAlt, borderLeft: `10px solid ${accent}`,
      });
      S.tl.fromTo(panel, { x: 0, opacity: 1 }, { x: -(W + 80), opacity: 0, duration: dur, ease: ez, immediateRender: true }, t0);
      if (content) S.tl.fromTo(content, { x: Math.round(28 * k), scale: cap(1 + 0.015 * k) }, { x: 0, scale: 1, duration: dur * 1.04, ease: S.ease("fluid"), immediateRender: true }, t0 + 0.04);
      return;
    }

    /* 3. curtain-ltr */
    if (mode === "curtain-ltr") {
      const panel = makeOverlay("transition-curtain-ltr", {
        inset: "0", background: bgAlt, borderRight: `10px solid ${accent}`,
      });
      S.tl.fromTo(panel, { x: 0, opacity: 1 }, { x: W + 80, opacity: 0, duration: dur, ease: ez, immediateRender: true }, t0);
      if (content) S.tl.fromTo(content, { x: -Math.round(28 * k), scale: cap(1 + 0.015 * k) }, { x: 0, scale: 1, duration: dur * 1.04, ease: S.ease("fluid"), immediateRender: true }, t0 + 0.04);
      return;
    }

    /* 4. editorial-push */
    if (mode === "editorial-push") {
      const veil = makeOverlay("transition-editorial-push", {
        inset: "0", background: bgMain, borderLeft: `6px solid ${accent}`,
      });
      S.tl.fromTo(veil, { x: 0, opacity: 1 }, { x: -(W + 40), opacity: 0.15, duration: dur, ease: ez, immediateRender: true }, t0);
      if (content) S.tl.fromTo(content, { x: Math.round(72 * k), opacity: 0.35, scale: 0.985 }, { x: 0, opacity: 1, scale: 1, duration: dur * 1.08, ease: ez, immediateRender: true }, t0 + 0.02);
      return;
    }

    /* 5. split-curtain */
    if (mode === "split-curtain") {
      const halfH = Math.ceil(H / 2);
      const top = makeOverlay("transition-split-top", {
        left: "0", right: "0", top: "0", height: halfH + "px",
        background: bgAlt, borderBottom: `4px solid ${accent}`,
      });
      const bot = makeOverlay("transition-split-bot", {
        left: "0", right: "0", bottom: "0", height: halfH + "px",
        background: bgAlt, borderTop: `4px solid ${accent}`,
      });
      S.tl.fromTo(top, { y: 0, opacity: 1 }, { y: -(halfH + 24), opacity: 0, duration: dur, ease: ez, immediateRender: true }, t0);
      S.tl.fromTo(bot, { y: 0, opacity: 1 }, { y: halfH + 24, opacity: 0, duration: dur, ease: ez, immediateRender: true }, t0);
      if (content) S.tl.fromTo(content, { scale: cap(1 + 0.02 * k) }, { scale: 1, duration: dur, ease: S.ease("fluid"), immediateRender: true }, t0 + 0.03);
      return;
    }

    /* 6. cinema-bars */
    if (mode === "cinema-bars") {
      const halfH = Math.ceil(H / 2);
      const topBar = makeOverlay("transition-cinema-top", { left: "0", right: "0", top: "0", height: halfH + "px", background: bgMain });
      const botBar = makeOverlay("transition-cinema-bot", { left: "0", right: "0", bottom: "0", height: halfH + "px", background: bgMain });
      S.tl.fromTo(topBar, { y: 0 }, { y: -(halfH + 24), duration: dur, ease: ez, immediateRender: true }, t0);
      S.tl.fromTo(botBar, { y: 0 }, { y: halfH + 24, duration: dur, ease: ez, immediateRender: true }, t0);
      if (content) S.tl.fromTo(content, { scale: cap(1 + 0.03 * k) }, { scale: 1, duration: dur * 1.1, ease: S.ease("vox"), immediateRender: true }, t0 + 0.04);
      return;
    }

    /* 7–10. push-left / push-right / push-up / push-down */
    if (mode === "push-left" || mode === "push-right" || mode === "push-up" || mode === "push-down") {
      const dx = mode === "push-left" ? -W : (mode === "push-right" ? W : 0);
      const dy = mode === "push-up" ? -H : (mode === "push-down" ? H : 0);
      const veil = makeOverlay("transition-" + mode, {
        inset: "0", background: bgAlt,
        boxShadow: `0 0 48px rgba(0,0,0,0.45)`,
      });
      S.tl.fromTo(veil, { x: 0, y: 0, opacity: 1 }, { x: dx, y: dy, opacity: 0.4, duration: dur, ease: ez, immediateRender: true }, t0);
      if (content) {
        S.tl.fromTo(content,
          { x: Math.round(-dx * 0.14 * k), y: Math.round(-dy * 0.14 * k), opacity: 0.4 },
          { x: 0, y: 0, opacity: 1, duration: dur * 1.05, ease: ez, immediateRender: true },
          t0
        );
      }
      return;
    }

    /* 11–12. slide-over-rtl / slide-over-up */
    if (mode === "slide-over-rtl" || mode === "slide-over-up") {
      const isUp = mode === "slide-over-up";
      const shade = makeOverlay("transition-" + mode, { inset: "0", background: bgMain, opacity: 0.85, zIndex: 88 });
      S.tl.fromTo(shade, { opacity: 0.85 }, { opacity: 0, duration: dur * 0.85, ease: "power2.out", immediateRender: true }, t0);
      if (content) {
        S.tl.fromTo(content,
          { x: isUp ? 0 : Math.round(W * 0.18 * k), y: isUp ? Math.round(H * 0.16 * k) : 0, opacity: 0.1 },
          { x: 0, y: 0, opacity: 1, duration: dur, ease: ez, immediateRender: true },
          t0
        );
      }
      return;
    }

    /* 13. zoom-iris */
    if (mode === "zoom-iris") {
      const fade = makeOverlay("transition-zoom-iris", { inset: "0", background: bgMain });
      S.tl.fromTo(fade, { opacity: 0.92 }, { opacity: 0, duration: Math.max(0.24, dur * 0.72), ease: "power2.out", immediateRender: true }, t0);
      if (content) S.tl.fromTo(content, { scale: cap(1 + 0.04 * k) }, { scale: 1, duration: dur, ease: ez, immediateRender: true }, t0);
      return;
    }

    /* 14–15. zoom-through-in / zoom-through-out (strictly within STAGE_ZOOM_CAP 1.06) */
    if (mode === "zoom-through-in" || mode === "zoom-through-out") {
      const isIn = mode === "zoom-through-in";
      const ring = makeOverlay("transition-" + mode, {
        inset: "0", background: bgMain,
        border: `16px solid ${accent}`,
      });
      S.tl.fromTo(ring, { opacity: 0.96, scale: isIn ? 0.92 : 1.06 }, { opacity: 0, scale: isIn ? 1.18 : 0.86, duration: dur * 0.88, ease: ez, immediateRender: true }, t0);
      if (content) {
        const startScale = isIn ? Math.max(0.92, 1 - 0.055 * k) : cap(1 + 0.055 * k);
        S.tl.fromTo(content, { scale: startScale, opacity: 0.15 }, { scale: 1, opacity: 1, duration: dur, ease: ez, immediateRender: true }, t0);
      }
      return;
    }

    /* 16. iris-rise */
    if (mode === "iris-rise") {
      const veil = makeOverlay("transition-iris-rise", {
        inset: "0", background: bgMain, clipPath: "circle(110% at 50% 50%)",
      });
      S.tl.fromTo(veil, { scale: 1, opacity: 1 }, { scale: 1.48, opacity: 0, duration: dur, ease: ez, immediateRender: true }, t0);
      if (content) S.tl.fromTo(content, { scale: 0.98 }, { scale: 1, duration: dur, ease: S.ease("fluid"), immediateRender: true }, t0 + 0.02);
      return;
    }

    /* 17. diagonal-wipe */
    if (mode === "diagonal-wipe") {
      const wipe = makeOverlay("transition-diagonal-wipe", {
        top: "-20%", bottom: "-20%", left: "-25%", right: "-25%",
        background: `linear-gradient(120deg, ${bgAlt} 70%, ${accent} 100%)`,
      });
      S.tl.fromTo(wipe, { x: 0, y: 0, opacity: 1 }, { x: -(W * 1.35), y: Math.round(H * 0.24), opacity: 0, duration: dur, ease: ez, immediateRender: true }, t0);
      if (content) S.tl.fromTo(content, { x: Math.round(18 * k), scale: cap(1 + 0.018 * k) }, { x: 0, scale: 1, duration: dur, ease: S.ease("fluid"), immediateRender: true }, t0 + 0.04);
      return;
    }

    /* 18. accent-slash */
    if (mode === "accent-slash") {
      const veil = makeOverlay("transition-accent-slash", { inset: "0", background: bgMain, zIndex: 89 });
      const slash = makeOverlay("transition-slash-bar", {
        top: "-15%", bottom: "-15%", right: "-20%", width: Math.round(W * 0.14) + "px",
        background: accent, transform: "skewX(-14deg)", zIndex: 91,
      });
      S.tl.fromTo(veil, { opacity: 1 }, { opacity: 0, duration: dur * 0.72, ease: "power2.out", immediateRender: true }, t0 + 0.08);
      S.tl.fromTo(slash, { x: Math.round(W * 0.12), opacity: 1 }, { x: -(W * 1.35), opacity: 0.9, duration: dur, ease: "power3.inOut", immediateRender: true }, t0);
      if (content) S.tl.fromTo(content, { scale: cap(1 + 0.022 * k) }, { scale: 1, duration: dur, ease: S.ease("vox"), immediateRender: true }, t0 + 0.05);
      return;
    }

    /* 19. shutter-bars */
    if (mode === "shutter-bars") {
      const cols = 4;
      const bw = Math.ceil(W / cols);
      for (let i = 0; i < cols; i++) {
        const bar = makeOverlay("transition-shutter-bar", {
          top: "0", bottom: "0", left: (i * bw) + "px", width: (bw + 4) + "px",
          background: i % 2 === 0 ? bgMain : bgAlt, transformOrigin: "50% 0%",
        });
        S.tl.fromTo(bar, { scaleY: 1, opacity: 1 }, { scaleY: 0, opacity: 0, duration: dur * 0.82, ease: ez, immediateRender: true }, t0 + i * 0.045);
      }
      return;
    }

    /* 20. venetian-blinds */
    if (mode === "venetian-blinds") {
      const rows = 6;
      const rh = Math.ceil(H / rows);
      for (let i = 0; i < rows; i++) {
        const slat = makeOverlay("transition-venetian-slat", {
          left: "0", right: "0", top: (i * rh) + "px", height: (rh + 3) + "px",
          background: i % 2 === 0 ? bgMain : bgAlt,
          borderBottom: `1px solid rgba(255,255,255,0.06)`,
          transformOrigin: "50% 0%",
        });
        S.tl.fromTo(slat, { scaleY: 1, opacity: 1 }, { scaleY: 0, opacity: 0, duration: dur * 0.78, ease: ez, immediateRender: true }, t0 + i * 0.038);
      }
      return;
    }

    /* 21. clock-wipe (deterministic conic-mask / SVG wedge proxy driven by S.tl) */
    if (mode === "clock-wipe") {
      const overlay = makeOverlay("transition-clock-wipe", {
        inset: "0", background: `conic-gradient(from 0deg, transparent 0deg, ${bgMain} 0deg)`,
      });
      const proxy = { deg: 0 };
      const paint = () => {
        const d = Math.max(0, Math.min(360, proxy.deg));
        overlay.style.background = `conic-gradient(from 0deg, transparent ${d.toFixed(1)}deg, ${bgMain} ${d.toFixed(1)}deg)`;
        overlay.style.opacity = d >= 359 ? "0" : "1";
      };
      paint();
      S.tl.to(proxy, { deg: 360, duration: dur, ease: ez, onUpdate: paint }, t0);
      if (content) S.tl.fromTo(content, { scale: cap(1 + 0.02 * k) }, { scale: 1, duration: dur, ease: S.ease("fluid"), immediateRender: true }, t0);
      return;
    }

    /* 22. diamond-iris */
    if (mode === "diamond-iris") {
      const veil = makeOverlay("transition-diamond-iris", { inset: "0", background: bgMain });
      const diamond = makeOverlay("transition-diamond-frame", {
        left: "50%", top: "50%", width: Math.round(Math.max(W, H) * 0.72) + "px", height: Math.round(Math.max(W, H) * 0.72) + "px",
        marginLeft: -Math.round(Math.max(W, H) * 0.36) + "px", marginTop: -Math.round(Math.max(W, H) * 0.36) + "px",
        border: `6px solid ${accent}`, transform: "rotate(45deg)", zIndex: 91,
      });
      S.tl.fromTo(veil, { opacity: 1 }, { opacity: 0, duration: dur * 0.75, ease: "power2.out", immediateRender: true }, t0 + dur * 0.14);
      S.tl.fromTo(diamond, { scale: 0.08, opacity: 1, rotation: 45 }, { scale: 2.2, opacity: 0, rotation: 45, duration: dur, ease: ez, immediateRender: true }, t0);
      if (content) S.tl.fromTo(content, { scale: 0.965, opacity: 0.2 }, { scale: 1, opacity: 1, duration: dur, ease: ez, immediateRender: true }, t0);
      return;
    }

    /* 23–25. whip-pan-rtl / whip-pan-ltr / whip-pan-up */
    if (mode === "whip-pan-rtl" || mode === "whip-pan-ltr" || mode === "whip-pan-up") {
      const isUp = mode === "whip-pan-up";
      const dir = mode === "whip-pan-ltr" ? -1 : 1;
      const streak = makeOverlay("transition-" + mode, {
        inset: "-10%",
        background: isUp
          ? `linear-gradient(180deg, transparent 0%, ${bgAlt} 28%, ${accent} 50%, ${bgMain} 72%, transparent 100%)`
          : `linear-gradient(90deg, transparent 0%, ${bgAlt} 28%, ${accent} 50%, ${bgMain} 72%, transparent 100%)`,
        filter: "blur(18px)", zIndex: 92,
      });
      S.tl.fromTo(streak,
        { x: isUp ? 0 : dir * W * 0.95, y: isUp ? H * 0.95 : 0, opacity: 0.95 },
        { x: isUp ? 0 : -dir * W * 1.1, y: isUp ? -H * 1.1 : 0, opacity: 0, duration: dur, ease: ez, immediateRender: true },
        t0
      );
      if (content) {
        S.tl.fromTo(content,
          { x: isUp ? 0 : Math.round(dir * 120 * k), y: isUp ? Math.round(120 * k) : 0, filter: "blur(6px)", opacity: 0.3 },
          { x: 0, y: 0, filter: "blur(0px)", opacity: 1, duration: dur * 1.06, ease: ez, immediateRender: true },
          t0
        );
      }
      return;
    }

    /* 26. ink-splash (seeded organic SVG ink blobs clearing from stage) */
    if (mode === "ink-splash") {
      const wrap = makeOverlay("transition-ink-splash", { inset: "0", overflow: "hidden" });
      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      Object.assign(svg.style, { width: "100%", height: "100%", display: "block" });
      const blobs = [];
      for (let i = 0; i < 9; i++) {
        const c = document.createElementNS(svgNS, "circle");
        const cx = (0.12 + rng() * 0.76) * W;
        const cy = (0.12 + rng() * 0.76) * H;
        const rad = Math.max(W, H) * (0.24 + rng() * 0.22);
        c.setAttribute("cx", cx.toFixed(1));
        c.setAttribute("cy", cy.toFixed(1));
        c.setAttribute("r", rad.toFixed(1));
        c.setAttribute("fill", i % 4 === 0 ? accent : bgMain);
        svg.appendChild(c);
        blobs.push(c);
      }
      wrap.appendChild(svg);
      blobs.forEach((b, idx) => {
        S.tl.fromTo(b,
          { scale: 1.45, opacity: 1, transformOrigin: "50% 50%" },
          { scale: 0, opacity: 0, duration: dur * 0.85, ease: ez, immediateRender: true },
          t0 + idx * 0.025
        );
      });
      if (content) S.tl.fromTo(content, { scale: cap(1 + 0.024 * k), opacity: 0.25 }, { scale: 1, opacity: 1, duration: dur, ease: S.ease("fluid"), immediateRender: true }, t0 + 0.04);
      return;
    }

    /* 27. paper-tear (seeded jagged editorial paper halves parting cleanly) */
    if (mode === "paper-tear") {
      const svgNS = "http://www.w3.org/2000/svg";
      const midX = W * 0.5;
      const pts = [];
      const steps = 14;
      for (let i = 0; i <= steps; i++) {
        const y = (i / steps) * H;
        const jitter = (rng() - 0.5) * Math.min(72, W * 0.055);
        pts.push([midX + jitter, y]);
      }
      const leftPts = `0,0 ${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")} 0,${H}`;
      const rightPts = `${W},0 ${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")} ${W},${H}`;
      const mkHalf = (polyPts, cls) => {
        const hEl = makeOverlay(cls, { inset: "0", filter: "drop-shadow(0 8px 22px rgba(0,0,0,0.45))" });
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
        Object.assign(svg.style, { width: "100%", height: "100%", display: "block" });
        const poly = document.createElementNS(svgNS, "polygon");
        poly.setAttribute("points", polyPts);
        poly.setAttribute("fill", col.isDark === false ? "#F4F1EA" : bgAlt);
        poly.setAttribute("stroke", accent);
        poly.setAttribute("stroke-width", "3");
        svg.appendChild(poly);
        hEl.appendChild(svg);
        return hEl;
      };
      const leftHalf = mkHalf(leftPts, "transition-paper-left");
      const rightHalf = mkHalf(rightPts, "transition-paper-right");
      S.tl.fromTo(leftHalf, { x: 0, rotation: 0, opacity: 1 }, { x: -(W * 0.62), rotation: -4 * k, opacity: 0, duration: dur, ease: ez, immediateRender: true }, t0);
      S.tl.fromTo(rightHalf, { x: 0, rotation: 0, opacity: 1 }, { x: W * 0.62, rotation: 4 * k, opacity: 0, duration: dur, ease: ez, immediateRender: true }, t0);
      if (content) S.tl.fromTo(content, { scale: 0.98 }, { scale: 1, duration: dur, ease: S.ease("fluid"), immediateRender: true }, t0 + 0.04);
      return;
    }

    /* 28. glitch-lite (seeded crisp digital scan slices snapping out cleanly) */
    if (mode === "glitch-lite") {
      const slices = 6;
      const sh = Math.ceil(H / slices);
      for (let i = 0; i < slices; i++) {
        const dir = rng() < 0.5 ? -1 : 1;
        const bar = makeOverlay("transition-glitch-slice", {
          left: "0", right: "0", top: (i * sh) + "px", height: (sh + 2) + "px",
          background: i % 3 === 0 ? accent : (i % 2 === 0 ? bgMain : "#00E5FF"),
          opacity: i % 3 === 0 ? 0.55 : 0.85,
        });
        S.tl.fromTo(bar, { x: dir * 24 * k, opacity: 0.88 }, { x: -dir * (W * 0.45), opacity: 0, duration: dur * 0.65, ease: ez, immediateRender: true }, t0 + i * 0.025);
      }
      if (content) {
        S.tl.fromTo(content, { x: Math.round(-16 * k), skewX: 3 * k, opacity: 0.45 }, { x: 0, skewX: 0, opacity: 1, duration: dur * 0.85, ease: ez, immediateRender: true }, t0);
      }
      return;
    }

    /* 29. light-leak (warm optical anamorphic flare sweeping across stage) */
    if (mode === "light-leak") {
      const leak = makeOverlay("transition-light-leak", {
        inset: "-15%",
        background: `radial-gradient(ellipse 65% 75% at 50% 50%, rgba(255,205,95,0.92) 0%, ${accent} 38%, rgba(239,68,68,0.42) 64%, transparent 82%)`,
        mixBlendMode: col.isDark === false ? "normal" : "screen",
        zIndex: 92,
      });
      S.tl.fromTo(leak, { x: W * 0.55, opacity: 0.95, scale: 1.05 }, { x: -W * 0.65, opacity: 0, scale: 1.25, duration: dur, ease: ez, immediateRender: true }, t0);
      if (content) S.tl.fromTo(content, { opacity: 0.35, scale: cap(1 + 0.02 * k) }, { opacity: 1, scale: 1, duration: dur * 0.85, ease: S.ease("fluid"), immediateRender: true }, t0);
      return;
    }

    /* 30. film-flash (clean cinema overexposure flash) */
    if (mode === "film-flash") {
      const flash = makeOverlay("transition-film-flash", {
        inset: "0", background: "#FFF9E8", zIndex: 93,
      });
      S.tl.fromTo(flash, { opacity: 0.96 }, { opacity: 0, duration: dur, ease: ez, immediateRender: true }, t0);
      if (content) S.tl.fromTo(content, { scale: cap(1 + 0.03 * k), opacity: 0.5 }, { scale: 1, opacity: 1, duration: dur * 0.95, ease: S.ease("vox"), immediateRender: true }, t0);
      return;
    }

    /* 31. rgb-split (chromatic cyan/red fringe convergence) */
    if (mode === "rgb-split") {
      const rLayer = makeOverlay("transition-rgb-r", {
        inset: "0", background: "rgba(255,48,72,0.34)", mixBlendMode: "screen", zIndex: 91,
      });
      const cLayer = makeOverlay("transition-rgb-c", {
        inset: "0", background: "rgba(0,229,255,0.34)", mixBlendMode: "screen", zIndex: 91,
      });
      const shift = Math.round(46 * k);
      S.tl.fromTo(rLayer, { x: -shift, opacity: 0.85 }, { x: 0, opacity: 0, duration: dur, ease: ez, immediateRender: true }, t0);
      S.tl.fromTo(cLayer, { x: shift, opacity: 0.85 }, { x: 0, opacity: 0, duration: dur, ease: ez, immediateRender: true }, t0);
      if (content) S.tl.fromTo(content, { x: Math.round(14 * k), opacity: 0.35 }, { x: 0, opacity: 1, duration: dur, ease: ez, immediateRender: true }, t0);
      return;
    }

    /* 32. page-turn (editorial book sheet folding off right spine) */
    if (mode === "page-turn") {
      const sheet = makeOverlay("transition-page-turn", {
        inset: "0",
        background: `linear-gradient(90deg, ${bgAlt} 0%, ${bgMain} 86%, rgba(0,0,0,0.65) 100%)`,
        borderLeft: `4px solid ${accent}`,
        transformOrigin: "100% 50%",
        boxShadow: "-24px 0 60px rgba(0,0,0,0.5)",
        zIndex: 92,
      });
      S.tl.fromTo(sheet,
        { scaleX: 1, skewY: 0, opacity: 1 },
        { scaleX: 0, skewY: -3.5 * k, opacity: 0, duration: dur, ease: ez, immediateRender: true },
        t0
      );
      if (content) S.tl.fromTo(content, { x: Math.round(24 * k), opacity: 0.4 }, { x: 0, opacity: 1, duration: dur * 0.95, ease: S.ease("fluid"), immediateRender: true }, t0 + 0.04);
      return;
    }

    // Fallback to clean soft-fade for any unknown transition string
    const fallback = document.createElement("div");
    fallback.className = "fadein";
    stage.appendChild(fallback);
    S.tl.fromTo(fallback, { opacity: 1 }, { opacity: 0, duration: Math.max(0.24, dur), ease: "power1.out", immediateRender: true }, t0);
  };

  /* ---------------------------------------------------------- 7 animated logo modes (SCAM-safe + A.field) */
  FX.logo = function (content, slide, A) {
    const rawLogo = slide.logo;
    if (rawLogo === false) return null;
    const rawText = slide.logo_text || (rawLogo && typeof rawLogo === "object" ? rawLogo.text : "");
    const rawImg = typeof rawLogo === "string" ? rawLogo : (rawLogo && typeof rawLogo === "object" ? rawLogo.image : "");
    if (!rawImg && !rawText) return null;

    const th = A.th || {}, col = th.colors || {}, L = A.L || { margin: 80, top: 64, bottom: 64 };
    const isLight = col.isDark === false;
    let pos = String(slide.logo_position || (rawLogo && typeof rawLogo === "object" ? rawLogo.position : "") || "top-left");
    if (A.scam && pos === "bottom-left") pos = "top-left"; // Protect SCAM webcam box [24, 740, 584, 1055]

    const badge = document.createElement("div");
    badge.className = "stage-logo stage-logo-" + ((FX.cur && FX.cur.logoMotion) || "pop-spin");
    const posStyle = {
      position: "absolute", display: "inline-flex", alignItems: "center", gap: "12px",
      padding: "10px 18px", borderRadius: "14px", zIndex: 35, pointerEvents: "none",
      background: isLight ? "rgba(255, 255, 255, 0.88)" : "rgba(18, 18, 22, 0.72)",
      border: `1.5px solid ${isLight ? (col.cardBorder || "rgba(0,0,0,0.12)") : "rgba(255,255,255,0.14)"}`,
      boxShadow: isLight ? "0 8px 24px rgba(0,0,0,0.08)" : "0 10px 28px rgba(0,0,0,0.45)",
      color: col.text || "#FFFFFF",
    };
    const mx = Math.max(36, (L.margin || 80) * 0.65);
    const my = Math.max(34, (L.top || 64) * 0.65);
    if (pos.includes("top")) posStyle.top = my + "px";
    else posStyle.bottom = (L.bottom || 64) + "px";
    if (pos.includes("left")) posStyle.left = mx + "px";
    else posStyle.right = (L.margin || 80) + "px";

    Object.assign(badge.style, posStyle);

    if (rawImg) {
      const im = document.createElement("img");
      im.src = rawImg;
      im.alt = rawText || "logo";
      Object.assign(im.style, { width: "44px", height: "44px", objectFit: "contain", borderRadius: "8px", display: "block" });
      im.onerror = () => im.remove();
      badge.appendChild(im);
      S._imgs.push(im);
    }
    if (rawText) {
      const txt = document.createElement("span");
      txt.textContent = String(rawText);
      Object.assign(txt.style, { fontSize: "26px", fontWeight: 800, lineHeight: 1.2, whiteSpace: "nowrap", color: col.text || "#FFFFFF" });
      badge.appendChild(txt);
    }

    content.appendChild(badge);
    A.field("logo", badge);

    const mode = (FX.cur && FX.cur.logoMotion) || "pop-spin";
    const t0 = 0.08;
    if (mode === "pop-spin") {
      S.tl.fromTo(badge, { opacity: 0, scale: 0.45, rotation: -18 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.58, ease: "back.out(1.5)", immediateRender: true }, t0);
    } else if (mode === "slide-rtl") {
      S.tl.fromTo(badge, { opacity: 0, x: 56 }, { opacity: 1, x: 0, duration: 0.52, ease: S.ease("power4"), immediateRender: true }, t0);
    } else if (mode === "orbit-pulse") {
      S.tl.fromTo(badge, { opacity: 0, scale: 0.72, y: -14 }, { opacity: 1, scale: 1, y: 0, duration: 0.52, ease: S.ease("power3"), immediateRender: true }, t0);
    } else if (mode === "flip-reveal") {
      S.tl.fromTo(badge, { opacity: 0, scaleX: 0.15, scaleY: 0.9 }, { opacity: 1, scaleX: 1, scaleY: 1, duration: 0.55, ease: "back.out(1.3)", immediateRender: true }, t0);
    } else if (mode === "stamp-drop") {
      S.tl.fromTo(badge, { opacity: 0, scale: 1.7, y: -22 }, { opacity: 1, scale: 1, y: 0, duration: 0.44, ease: "power4.out", immediateRender: true }, t0);
    } else if (mode === "glitch-snap") {
      S.tl.fromTo(badge, { opacity: 0, x: -24, skewX: 16 }, { opacity: 1, x: 6, skewX: -6, duration: 0.2, ease: "power2.out", immediateRender: true }, t0);
      S.tl.to(badge, { x: 0, skewX: 0, duration: 0.24, ease: "power3.out" }, t0 + 0.2);
    } else {
      // float-fade
      S.tl.fromTo(badge, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.65, ease: S.ease("power3"), immediateRender: true }, t0);
    }
    FX.cue(t0, "logo", mode);
    return badge;
  };

  /* ---------------------------------------------------------- key-word effects after build */
  FX.post = function (content) {
    const c = FX.cur || {};
    const timeOf = (el) => {
      let p = el;
      while (p && p !== content) {
        if (p.dataset && p.dataset.end) return +p.dataset.end;
        p = p.parentElement;
      }
      return 0.9;
    };
    content.querySelectorAll(".hl").forEach((el) => {
      const t = timeOf(el) + 0.05;
      S.tl.fromTo(el, { backgroundSize: "0% 42%" }, { backgroundSize: "100% 42%", duration: 0.55, ease: S.ease("power3"), immediateRender: true }, t);
      FX.cue(t, "swish", el.textContent);
    });
    const uls = [...content.querySelectorAll(".ul")];
    if (c.accentFx === "underline") uls.push(...content.querySelectorAll(".t-hero .acc, .t-h1 .acc, .t-quote .acc"));
    uls.forEach((el) => {
      el.classList.add("ul-on");
      const t = timeOf(el) + 0.08;
      S.tl.fromTo(el, { backgroundSize: "0% 6px" }, { backgroundSize: "100% 6px", duration: 0.5, ease: S.ease("power3"), immediateRender: true }, t);
    });
    content.querySelectorAll(".strike").forEach((el) => {
      const t = timeOf(el) + 0.1;
      S.tl.fromTo(el, { backgroundSize: "0% 5px" }, { backgroundSize: "100% 5px", duration: 0.46, ease: S.ease("sharp"), immediateRender: true }, t);
      FX.cue(t, "strike", el.textContent);
    });
  };

  /* ---------------------------------------------------------- Always-On Living Background Engine */
  FX.livingStage = function (stage, slide) {
    const ls = Object.assign(
      { bgStyle: "studio-mix", intensity: "podcast", microMotion: true },
      (slide && slide.livingStage) || {}
    );
    if (ls.intensity === "off") return;

    const th = S.theme || {}, col = th.colors || {};
    const isLight = col.isDark === false;
    const accent = col.accent || "#F5B700";
    const danger = col.danger || "#EF4444";
    const style = ls.bgStyle || "studio-mix";
    const mult = ls.intensity === "dynamic" ? 1.45 : ls.intensity === "subtle" ? 0.65 : 1.0;

    const layer = document.createElement("div");
    layer.className = "living-stage";
    stage.appendChild(layer);

    // 0. Editorial Blurred Backdrop (only when explicitly requested with a dedicated background image)
    if (style === "editorial-blur" || (style === "dreamy-bokeh" && ls.bgImage)) {
      const blurSrc = (ls && ls.bgImage) || (slide && slide.bg_image) || (style === "editorial-blur" ? "/assets/podcast-studio-mic.jpg" : "");
      if (blurSrc) {
        const bWrap = document.createElement("div");
        bWrap.className = "living-editorial-blur";
        const bImg = document.createElement("img");
        bImg.src = blurSrc;
        bImg.alt = "";
        bImg.onerror = () => bWrap.remove();
        bWrap.appendChild(bImg);
        layer.appendChild(bWrap);
        S._imgs.push(bImg);
        const scrim = document.createElement("div");
        scrim.className = "living-velvet-scrim";
        layer.appendChild(scrim);
      }
    }

    // 1. Aurora / Studio-Mix / Dreamy-Bokeh drifting luminous orbs (gradient-feathered, zero heavy CSS blur filter)
    if (style === "aurora" || style === "studio-mix" || style === "dreamy-bokeh" || style === "editorial-blur") {
      const aurora = document.createElement("div");
      aurora.className = "living-aurora";
      layer.appendChild(aurora);

      const orb1 = document.createElement("div");
      orb1.className = "living-aurora-orb";
      Object.assign(orb1.style, {
        width: "1120px", height: "1120px", left: "54%", top: "-22%",
        background: `radial-gradient(circle, ${accent} 0%, transparent 64%)`,
        opacity: (isLight ? 0.14 : (style === "dreamy-bokeh" ? 0.2 : 0.16) * mult).toFixed(2),
      });
      const orb2 = document.createElement("div");
      orb2.className = "living-aurora-orb";
      Object.assign(orb2.style, {
        width: "920px", height: "920px", left: "-14%", top: "42%",
        background: `radial-gradient(circle, ${style === "dreamy-bokeh" ? "#38bdf8" : danger} 0%, transparent 66%)`,
        opacity: (isLight ? 0.09 : (style === "dreamy-bokeh" ? 0.14 : 0.11) * mult).toFixed(2),
      });
      aurora.append(orb1, orb2);

      S.amb.fromTo(orb1, { x: -38 * mult, y: -22 * mult, scale: 0.95 }, {
        x: 48 * mult, y: 32 * mult, scale: 1.06, duration: 19, ease: "sine.inOut", yoyo: true, repeat: 99, force3D: true,
      }, 0);
      S.amb.fromTo(orb2, { x: 34 * mult, y: 26 * mult, scale: 1.03 }, {
        x: -44 * mult, y: -30 * mult, scale: 0.93, duration: 23, ease: "sine.inOut", yoyo: true, repeat: 99, force3D: true,
      }, 0);
    }

    // 1b. Creamy Out-of-Focus Bokeh Discs for YouTuber Dreamy-Bokeh mode
    if (style === "dreamy-bokeh") {
      const bokehWash = document.createElement("div");
      bokehWash.className = "living-bokeh-wash";
      layer.appendChild(bokehWash);
      const br = FX.rngFor((slide._seed || "live") + ":dreamy-bokeh");
      const bokehColors = [accent, "#60a5fa", "#fff4d6", danger];
      const bCount = Math.round(9 * Math.min(1.25, mult));
      for (let i = 0; i < bCount; i += 1) {
        const disc = document.createElement("div");
        disc.className = "living-bokeh-disc";
        const sz = 110 + br() * 190;
        const cPick = bokehColors[i % bokehColors.length];
        Object.assign(disc.style, {
          left: (br() * (S.W - 80)).toFixed(1) + "px",
          top: (br() * (S.H - 80)).toFixed(1) + "px",
          width: sz.toFixed(0) + "px",
          height: sz.toFixed(0) + "px",
          background: `radial-gradient(circle, ${cPick} 0%, transparent 68%)`,
          opacity: ((isLight ? 0.05 : 0.085) * (0.6 + br() * 0.6)).toFixed(2),
        });
        bokehWash.appendChild(disc);
        S.amb.fromTo(disc, { x: 0, y: 0, scale: 0.94 }, {
          x: (br() - 0.5) * 110 * mult,
          y: (br() - 0.5) * 75 * mult,
          scale: 1.08,
          duration: 23 + br() * 14,
          ease: "sine.inOut",
          yoyo: true,
          repeat: 99,
          force3D: true,
        }, 0);
      }
    }

    // 2. Subtle Perspective Grid + Sweep
    if (style === "grid") {
      const grid = document.createElement("div");
      grid.className = "living-grid";
      layer.appendChild(grid);
      S.amb.fromTo(grid, { backgroundPosition: "0px 0px" }, {
        backgroundPosition: "96px 48px", duration: 14, ease: "none", repeat: 99,
      }, 0);
    }

    // 3. Soft Bokeh Particles (larger blurred circles, slow organic drift — no 1px pixel flicker)
    if (style === "particles" || style === "studio-mix") {
      const dustBox = document.createElement("div");
      dustBox.className = "dust";
      layer.appendChild(dustBox);
      const r = FX.rngFor((slide._seed || "live") + ":living-dust");
      const count = Math.round(14 * Math.min(1.3, mult));
      for (let i = 0; i < count; i += 1) {
        const dot = document.createElement("i");
        const sz = 4.5 + r() * 6.5;
        Object.assign(dot.style, {
          left: (r() * S.W).toFixed(1) + "px",
          top: (r() * S.H).toFixed(1) + "px",
          width: sz.toFixed(1) + "px",
          height: sz.toFixed(1) + "px",
          background: i % 4 === 0 ? accent : (isLight ? (col.muted || "#666") : "#fff8dc"),
          opacity: ((isLight ? 0.05 : 0.11) * Math.min(1.25, mult) * (0.5 + r() * 0.6)).toFixed(2),
          filter: "blur(1.8px)",
        });
        dustBox.appendChild(dot);
        S.amb.fromTo(dot, { x: 0, y: 0 }, {
          x: (r() - 0.5) * 90 * mult,
          y: (-35 - r() * 75) * mult,
          duration: 15 + r() * 11,
          ease: "sine.inOut",
          yoyo: true,
          repeat: 99,
          force3D: true,
        }, 0);
      }
    }

    // 4. Podcast Ambient Audio Wave Horizon (wave or studio-mix)
    if (style === "wave" || style === "studio-mix") {
      const waveWrap = document.createElement("div");
      waveWrap.className = "living-wave";
      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("viewBox", "0 0 1920 210");
      svg.setAttribute("preserveAspectRatio", "none");

      const makeWavePath = (amp, phase, stroke, opacity, sw) => {
        const path = document.createElementNS(svgNS, "path");
        let d = "";
        for (let x = 0; x <= 1920; x += 48) {
          const y = 138 + Math.sin((x / 1920) * Math.PI * 4 + phase) * amp;
          d += `${x === 0 ? "M" : " L"}${x},${y.toFixed(1)}`;
        }
        path.setAttribute("d", d);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", stroke);
        path.setAttribute("stroke-opacity", String(opacity));
        path.setAttribute("stroke-width", String(sw));
        svg.appendChild(path);
        return path;
      };

      const p1 = makeWavePath(16 * mult, 0, accent, 0.22, 3);
      const p2 = makeWavePath(11 * mult, 1.8, col.muted || "#94a3b8", 0.14, 2);
      waveWrap.appendChild(svg);
      layer.appendChild(waveWrap);

      S.amb.fromTo(p1, { y: -7 * mult }, { y: 8 * mult, duration: 4.8, ease: "sine.inOut", yoyo: true, repeat: 99, force3D: true }, 0);
      S.amb.fromTo(p2, { y: 8 * mult }, { y: -8 * mult, duration: 5.9, ease: "sine.inOut", yoyo: true, repeat: 99, force3D: true }, 0);
    }
  };

  /* ---------------------------------------------------------- Imperceptible Silk-Glide Motion (Foreground Images Only by Default) */
  FX.applyMicroMotion = function (content, slide) {
    const ls = Object.assign({
      intensity: "podcast",
      microMotion: true,
      floatMode: "images-only",
      floatStyle: "silk-glide",
      floatAmplitude: 2,
      floatSpeed: 0.45,
      floatRatio: 0.75,
      floatSeed: 0,
    }, (slide && slide.livingStage) || {});

    S._floats = [];
    const disabled = ls.intensity === "off" || ls.microMotion === false || ls.floatMode === "off" || Number(ls.floatAmplitude) === 0;
    const intensityMult = ls.intensity === "dynamic" ? 1.18 : ls.intensity === "subtle" ? 0.72 : 1.0;
    const baseAmp = Math.max(0, Math.min(8, Number(ls.floatAmplitude ?? 2))) * intensityMult;
    const speed = Math.max(0.15, Math.min(1.6, Number(ls.floatSpeed ?? 0.45)));
    const ratio = Math.max(0.15, Math.min(1, Number(ls.floatRatio ?? 0.75)));
    const mode = ls.floatMode || "images-only";
    const floatStyle = ls.floatStyle || "silk-glide";

    S._floatCfg = {
      enabled: !disabled && baseAmp > 0,
      mode,
      floatStyle,
      baseAmp,
      speed,
      ratio,
    };

    if (disabled) return;

    // Foreground visuals on top of background ONLY (.frame, [data-float="true"]) in default images-only mode.
    // NEVER move plain text, bullet lists, cards, chat bubbles, or chart axes unless explicitly switched to selective/all-items.
    const frames = [
      ...content.querySelectorAll(".frame"),
      ...content.querySelectorAll('[data-float="true"]'),
    ].filter((fr, idx, arr) => !fr.closest(".fullbleed") && arr.indexOf(fr) === idx);
    const items = mode === "images-only"
      ? []
      : [...content.querySelectorAll(".card, .bubble, .stage-callout-box")];

    const r = FX.rngFor(`${slide._seed || "live"}:silk-glide:${ls.floatSeed || 0}`);
    const chosen = [];

    frames.forEach((el, idx) => {
      if (mode !== "selective" || frames.length <= 1 || r() < Math.max(0.8, ratio) || idx === 0) {
        chosen.push({ el, kind: "image" });
      }
    });

    items.forEach((el) => {
      if (mode === "all-items") {
        chosen.push({ el, kind: "item" });
      } else if (mode === "selective") {
        if (items.length === 1 && !frames.length) {
          chosen.push({ el, kind: "item" });
        } else if (r() < ratio) {
          chosen.push({ el, kind: "item" });
        }
      }
    });

    if (!chosen.length && (frames.length || items.length)) {
      const pool = frames.length ? frames : items;
      chosen.push({ el: pool[Math.floor(r() * pool.length) % pool.length], kind: frames.length ? "image" : "item" });
    }

    chosen.forEach(({ el, kind }, idx) => {
      const ir = FX.rngFor(`${slide._seed || "live"}:silk-item:${ls.floatSeed || 0}:${idx}`);
      const endAt = parseFloat(el.dataset && el.dataset.end) || 0.95;
      el.style.willChange = "translate, transform";
      el.style.transformOrigin = "50% 50%";

      const isImage = kind === "image";
      const capAmp = isImage ? baseAmp : Math.min(2.2, baseAmp * 0.55);
      const ampX = (0.72 + ir() * 0.28) * capAmp;
      const ampY = (0.45 + ir() * 0.25) * capAmp;
      const ampScale = (floatStyle === "optical-breathe" && isImage) ? 0.0022 : 0;

      S._floats.push({
        el,
        kind,
        startAt: Math.max(0.85, endAt + 0.3),
        ampX,
        ampY,
        ampScale,
        ampRot: 0,
        w1: 0.14 + ir() * 0.07,
        w2: 0.09 + ir() * 0.06,
        w3: 0.11 + ir() * 0.05,
        p1: ir() * Math.PI * 2,
        p2: ir() * Math.PI * 2,
        p3: ir() * Math.PI * 2,
      });
    });

    // Ultra-subtle specular light sweep on cards (never touches text)
    content.querySelectorAll(".card").forEach((card, idx) => {
      if (idx > 3) return;
      const sheen = document.createElement("div");
      sheen.className = "card-sheen";
      card.appendChild(sheen);
      S.amb.fromTo(sheen, { x: 240, opacity: 0 }, {
        x: -2200,
        opacity: 0.25,
        duration: 11,
        ease: "sine.inOut",
        repeat: 99,
        repeatDelay: 8,
      }, 1.8 + idx * 1.1);
    });
  };

  /* ---------------------------------------------------------- Viral YouTuber Annotations & Callouts */
  FX.annotations = function (content, slide, A) {
    const list = Array.isArray(slide && slide.annotations) ? slide.annotations : [];
    if (!list.length) return;

    const layer = document.createElement("div");
    layer.className = "stage-annotations";
    content.appendChild(layer);

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = A.svg(layer, 0, 0, A.W, A.H, `0 0 ${A.W} ${A.H}`);
    const defs = document.createElementNS(svgNS, "defs");
    svg.appendChild(defs);

    list.forEach((ann, idx) => {
      if (!ann || typeof ann !== "object") return;
      const type = ann.type || "arrow-curved";
      const color = S.color(ann.color || "accent");
      const at = Number.isFinite(+ann.at) ? +ann.at : 0.75 + idx * 0.25;
      const x1 = Number(ann.x1 ?? 1200);
      const y1 = Number(ann.y1 ?? 420);
      const x2 = Number(ann.x2 ?? 820);
      const y2 = Number(ann.y2 ?? 280);
      const sw = Number(ann.strokeWidth || 7);

      if (type === "spotlight") {
        const sp = document.createElement("div");
        sp.className = "stage-spotlight-mask";
        const r = Number(ann.radius || 260);
        sp.style.background = `radial-gradient(circle ${r}px at ${x1}px ${y1}px, transparent 0%, transparent 72%, rgba(0,0,0,0.62) 100%)`;
        layer.appendChild(sp);
        S.tl.fromTo(sp, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: S.ease("power3"), immediateRender: true }, at);
        return;
      }

      if (type === "callout-box") {
        const box = document.createElement("div");
        box.className = "stage-callout-box";
        Object.assign(box.style, {
          left: x1 + "px",
          top: y1 + "px",
          background: "rgba(16, 21, 33, 0.88)",
          border: `2.5px solid ${color}`,
          color: "#FFFFFF",
          transform: "translate(-50%, -50%)",
        });
        box.innerHTML = `<span style="color:${color}">✦</span><span>${S.rich(ann.label || "نکتهٔ مهم")}</span>`;
        layer.appendChild(box);
        S.tl.fromTo(box, { opacity: 0, scale: 0.75, y: 16 }, { opacity: 1, scale: 1, y: 0, duration: 0.48, ease: S.ease("back"), immediateRender: true }, at);
        box.dataset.end = (at + 0.48).toFixed(3);
        FX.cue(at, "pop", ann.label || "");
        return;
      }

      if (type === "highlight-ring") {
        const rx = Number(ann.rx || 140);
        const ry = Number(ann.ry || 72);
        const el = A.svgEl(svg, "ellipse", {
          cx: x1, cy: y1, rx, ry,
          fill: "none", stroke: color, "stroke-width": sw, "stroke-linecap": "round",
        });
        A.draw(el, at, 0.75, "power3");
        FX.cue(at, "swish", ann.label || "");
        return;
      }

      // arrow-curved | arrow-straight
      S._annSeq = (S._annSeq || 0) + 1;
      const markerId = `ann-arr-${idx}-${S._annSeq}`;
      const marker = document.createElementNS(svgNS, "marker");
      marker.setAttribute("id", markerId);
      marker.setAttribute("markerWidth", "8");
      marker.setAttribute("markerHeight", "8");
      marker.setAttribute("refX", "6");
      marker.setAttribute("refY", "4");
      marker.setAttribute("orient", "auto");
      const poly = document.createElementNS(svgNS, "path");
      poly.setAttribute("d", "M 0 0.8 L 7 4 L 0 7.2 z");
      poly.setAttribute("fill", color);
      marker.appendChild(poly);
      defs.appendChild(marker);

      const cx = ann.cx != null ? Number(ann.cx) : (x1 + x2) / 2;
      const cy = ann.cy != null ? Number(ann.cy) : Math.min(y1, y2) - 110;
      const d = type === "arrow-straight"
        ? `M ${x1} ${y1} L ${x2} ${y2}`
        : `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;

      const path = A.svgEl(svg, "path", {
        d,
        fill: "none",
        stroke: color,
        "stroke-width": sw,
        "stroke-linecap": "round",
        "marker-end": `url(#${markerId})`,
      });
      A.draw(path, at, 0.7, "power3");
      FX.cue(at, "swish", ann.label || "");

      if (ann.label) {
        const lbl = document.createElement("div");
        lbl.className = "stage-callout-box";
        Object.assign(lbl.style, {
          left: (cx || (x1 + x2) / 2) + "px",
          top: ((cy || (y1 + y2) / 2) - 34) + "px",
          background: "rgba(16, 21, 33, 0.85)",
          border: `2px solid ${color}`,
          padding: "8px 18px",
          fontSize: "24px",
          color: "#fff",
          transform: "translate(-50%, -50%)",
        });
        lbl.innerHTML = S.rich(ann.label);
        layer.appendChild(lbl);
        S.tl.fromTo(lbl, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.4, ease: S.ease("back"), immediateRender: true }, at + 0.2);
      }
    });
  };

  /* ---------------------------------------------------------- A5: Deterministic Virtual Camera (Dolly, Parallax, Focus Pull, Shake) */
  FX.camera = function (stage, content, slide, A) {
    const rawCam = slide && (slide.camera || slide.cameraConfig || slide.camera_preset);
    if (!rawCam || rawCam === "none") return;
    const isMapTemplate = slide.template === "map_choropleth" || slide.allowMapCamera === true;
    const cfg = MT.resolveCameraConfig
      ? MT.resolveCameraConfig(rawCam, { allowMapCamera: isMapTemplate })
      : { preset: "none", dolly: 0, panX: 0, panY: 0, parallax: 0, focusBlur: 0, shakeAmp: 0, shakeDecay: 0, maxZoom: 1.06 };
    if (cfg.preset === "none" && !cfg.dolly && !cfg.panX && !cfg.panY && !cfg.focusBlur && !cfg.shakeAmp) return;

    const camSeed = FX.hash(`${slide._seed || "cam"}:${cfg.preset}`);
    const p1 = ((camSeed & 0xff) / 255) * Math.PI * 2;
    const p2 = (((camSeed >> 8) & 0xff) / 255) * Math.PI * 2;
    const depthNodes = content ? [...content.querySelectorAll("[data-depth]")] : [];
    const bgNode = stage ? stage.querySelector(".bgimg") : null;
    const durSpan = Math.max(4, Number(slide.duration) || 6);

    const applyCamAt = (t) => {
      const u = Math.max(0, Math.min(1, t / durSpan));
      // Smooth quintic ease across clip so dolly/pan feels like a real motorized slider
      const easeU = u * u * u * (10 - u * (15 - 6 * u));
      let sc = 1 + cfg.dolly * easeU;
      sc = Math.max(0.94, Math.min(cfg.maxZoom, sc));

      let tx = cfg.panX * easeU;
      let ty = cfg.panY * easeU;
      let rot = 0;

      if (cfg.shakeAmp > 0) {
        const decay = cfg.shakeDecay > 0 ? Math.exp(-t * cfg.shakeDecay) : 1;
        const env = cfg.shakeDecay > 0 ? decay : Math.min(1, t / 0.35);
        tx += cfg.shakeAmp * env * (0.65 * Math.sin(t * 7.4 + p1) + 0.35 * Math.sin(t * 13.8 + p2));
        ty += cfg.shakeAmp * env * 0.72 * (0.6 * Math.cos(t * 6.2 + p2) + 0.4 * Math.sin(t * 11.4 + p1));
        rot = cfg.shakeAmp * env * 0.09 * Math.sin(t * 5.2 + p1);
      }

      if (content) {
        content.style.transformOrigin = "50% 50%";
        content.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${sc.toFixed(5)}) rotate(${rot.toFixed(3)}deg)`;
        content.dataset.cameraScale = sc.toFixed(5);
      }

      // Deterministic Parallax on [data-depth] nodes (-1 background, +1 foreground)
      if (cfg.parallax > 0 && depthNodes.length) {
        const pxShift = (easeU - 0.5) * cfg.parallax;
        for (let i = 0; i < depthNodes.length; i += 1) {
          const dn = depthNodes[i];
          const dVal = Number(dn.dataset.depth) || 0;
          dn.style.translate = `${(pxShift * dVal).toFixed(2)}px ${(pxShift * dVal * 0.35).toFixed(2)}px 0px`;
        }
      }

      // Deterministic Focus Pull (soft depth blur rack into razor-sharp focus over first 1.15s)
      if (cfg.focusBlur > 0) {
        const fProg = Math.max(0, Math.min(1, t / 1.15));
        const fEase = 1 - Math.pow(1 - fProg, 3);
        const contentBlur = cfg.focusBlur * (1 - fEase);
        if (content) content.style.filter = contentBlur > 0.05 ? `blur(${contentBlur.toFixed(2)}px)` : "";
        if (bgNode) {
          const bgBlur = cfg.focusBlur * 0.45 * fEase;
          bgNode.style.filter = bgBlur > 0.05 ? `blur(${bgBlur.toFixed(2)}px)` : "";
        }
      }
    };

    applyCamAt(0);
    S.onSeek(applyCamAt);
  };

  /* ---------------------------------------------------------- A6: Deterministic Seeded Particles & Weather Ambience */
  FX.ambience = function (stage, slide, A) {
    const rawAmb = slide && (slide.ambience || slide.particles || slide.weather);
    if (!rawAmb || rawAmb === "none") return;
    const cfg = MT.resolveAmbienceConfig
      ? MT.resolveAmbienceConfig(rawAmb)
      : { preset: "none", count: 0, speed: 1, opacity: 0.4, color: null };
    if (cfg.preset === "none" || cfg.count <= 0) return;

    const W = (A && A.W) || S.W || 1920;
    const H = (A && A.H) || S.H || 1080;
    const col = (S.theme && S.theme.colors) || {};
    const accent = cfg.color || col.accent || "#FFD600";
    const confettiPalette = [accent, col.danger || "#E53935", "#38BDF8", "#22C55E", "#F472B6", "#FFFFFF"];

    const layer = document.createElement("div");
    layer.className = `ambience-layer ambience-${cfg.preset}`;
    Object.assign(layer.style, {
      position: "absolute", inset: "0", pointerEvents: "none", overflow: "hidden",
      zIndex: cfg.preset === "celebration-confetti" || cfg.preset === "soft-rain" || cfg.preset === "gentle-snow" ? 65 : 15,
    });
    stage.appendChild(layer);

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    Object.assign(svg.style, { position: "absolute", left: "0", top: "0", width: "100%", height: "100%" });
    layer.appendChild(svg);

    const rng = FX.rngFor(`${slide._seed || "amb"}:${cfg.preset}`);
    const particles = [];
    for (let i = 0; i < cfg.count; i += 1) {
      const p = {
        x0: rng() * W,
        y0: rng() * H,
        size: 3 + rng() * 11,
        vx: (rng() - 0.5) * 44,
        vy: 30 + rng() * 90,
        phase: rng() * Math.PI * 2,
        freq: 0.6 + rng() * 1.6,
        spin: (rng() - 0.5) * 240,
        op: (0.45 + rng() * 0.55) * cfg.opacity,
        color: confettiPalette[Math.floor(rng() * confettiPalette.length)],
      };
      let node;
      if (cfg.preset === "soft-rain") {
        node = document.createElementNS(svgNS, "line");
        node.setAttribute("stroke", cfg.color || "#CBE8FF");
        node.setAttribute("stroke-width", (1.2 + rng() * 1.4).toFixed(1));
        node.setAttribute("stroke-linecap", "round");
        p.len = 22 + rng() * 28;
      } else if (cfg.preset === "celebration-confetti") {
        node = document.createElementNS(svgNS, "rect");
        node.setAttribute("width", (8 + rng() * 10).toFixed(1));
        node.setAttribute("height", (5 + rng() * 6).toFixed(1));
        node.setAttribute("rx", "2");
        node.setAttribute("fill", p.color);
      } else if (cfg.preset === "news-grid-pulse") {
        node = document.createElementNS(svgNS, "rect");
        const sq = (10 + rng() * 14).toFixed(1);
        node.setAttribute("width", sq);
        node.setAttribute("height", sq);
        node.setAttribute("fill", "none");
        node.setAttribute("stroke", accent);
        node.setAttribute("stroke-width", "2");
      } else {
        node = document.createElementNS(svgNS, "circle");
        const rad = cfg.preset === "gold-bokeh" ? (18 + rng() * 44) : (cfg.preset === "gentle-snow" ? (3 + rng() * 7) : (2.2 + rng() * 5.2));
        node.setAttribute("r", rad.toFixed(1));
        node.setAttribute("fill", cfg.preset === "warm-sparks" ? accent : (cfg.preset === "gentle-snow" ? "#FFFFFF" : (cfg.preset === "gold-bokeh" ? accent : (col.text || "#FFFFFF"))));
      }
      node.setAttribute("opacity", p.op.toFixed(3));
      svg.appendChild(node);
      p.node = node;
      particles.push(p);
    }

    const wrapMod = (val, max) => ((val % max) + max) % max;

    const evalParticlesAt = (t) => {
      const ts = t * cfg.speed;
      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        if (cfg.preset === "soft-rain") {
          const x = wrapMod(p.x0 - ts * 55, W);
          const y = wrapMod(p.y0 + ts * (p.vy * 4.2 + 260), H);
          p.node.setAttribute("x1", x.toFixed(1));
          p.node.setAttribute("y1", y.toFixed(1));
          p.node.setAttribute("x2", (x - 8).toFixed(1));
          p.node.setAttribute("y2", (y + p.len).toFixed(1));
        } else if (cfg.preset === "gentle-snow") {
          const x = wrapMod(p.x0 + Math.sin(ts * p.freq + p.phase) * 32 + ts * p.vx * 0.35, W);
          const y = wrapMod(p.y0 + ts * (p.vy * 0.9 + 28), H);
          p.node.setAttribute("cx", x.toFixed(1));
          p.node.setAttribute("cy", y.toFixed(1));
        } else if (cfg.preset === "warm-sparks") {
          const x = wrapMod(p.x0 + Math.sin(ts * p.freq * 1.4 + p.phase) * 26 + ts * p.vx * 0.4, W);
          const y = wrapMod(p.y0 - ts * (p.vy * 1.5 + 40), H);
          const pulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(ts * 4.2 + p.phase));
          p.node.setAttribute("cx", x.toFixed(1));
          p.node.setAttribute("cy", y.toFixed(1));
          p.node.setAttribute("opacity", (p.op * pulse).toFixed(3));
        } else if (cfg.preset === "celebration-confetti") {
          const x = wrapMod(p.x0 + Math.sin(ts * p.freq * 1.6 + p.phase) * 44 + ts * p.vx * 0.5, W);
          const y = wrapMod(p.y0 + ts * (p.vy * 1.6 + 64), H);
          const rot = (ts * p.spin + p.phase * 57.3) % 360;
          p.node.setAttribute("x", x.toFixed(1));
          p.node.setAttribute("y", y.toFixed(1));
          p.node.setAttribute("transform", `rotate(${rot.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})`);
        } else if (cfg.preset === "news-grid-pulse") {
          const gx = Math.round(p.x0 / 96) * 96;
          const gy = Math.round(p.y0 / 96) * 96;
          const pulse = 0.2 + 0.8 * Math.pow(0.5 + 0.5 * Math.sin(ts * p.freq * 2.0 + p.phase), 2);
          p.node.setAttribute("x", gx.toFixed(1));
          p.node.setAttribute("y", gy.toFixed(1));
          p.node.setAttribute("opacity", (p.op * pulse).toFixed(3));
        } else {
          // studio-dust & gold-bokeh: gentle closed-form Lissajous drift
          const x = wrapMod(p.x0 + Math.sin(ts * 0.45 * p.freq + p.phase) * 38 + ts * p.vx * 0.22, W);
          const y = wrapMod(p.y0 + Math.cos(ts * 0.38 * p.freq + p.phase) * 28 - ts * 14, H);
          const breathe = 0.55 + 0.45 * Math.sin(ts * 0.9 * p.freq + p.phase);
          p.node.setAttribute("cx", x.toFixed(1));
          p.node.setAttribute("cy", y.toFixed(1));
          p.node.setAttribute("opacity", (p.op * breathe).toFixed(3));
        }
      }
    };

    evalParticlesAt(0);
    S.onSeek(evalParticlesAt);
  };
})();

