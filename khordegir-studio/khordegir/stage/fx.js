/* Variants, presets, transitions, animated logo & atmosphere for every template (zero-config, 100% deterministic).
   - Seeded randomness: mulberry32 PRNG keyed on video + project seed + slide number + slide.seed -> reproducible rebuilds.
   - Backwards-compatible defaults: omitting `preset` keeps "classic" behavior; omitting `transition` keeps "soft-fade" (.fadein).
   - Setting "random" / "تصادفی" deterministically picks from rich motion presets, 8 transitions, and 7 animated logo modes.
   - All motion strictly driven via real GSAP 3 paused timelines (`Stage.tl` / `Stage.amb`) — no unseeded Math.random(). */
(function () {
  "use strict";
  const S = window.Stage;
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
  };

  /* transition catalog + auto rules: drafted by AI Studio Build (Gemini 4 Hydrogen, 2026-11-28), merged here */
  const TRANSITIONS = [
    "soft-fade", "whip", "zoom-through", "mask-wipe", "glitch-flash", "match-cut", "push",
    "curtain", "curtain-rtl", "slash", "accent-slash", "diagonal-wipe",
    "push-editorial", "editorial-push", "split-curtain", "iris-rise", "zoom-iris",
    "shutter-bars", "cinema-bars",
  ];
  const RANDOM_TRANSITIONS = [
    "soft-fade", "whip", "zoom-through", "mask-wipe", "glitch-flash", "push",
    "curtain", "slash", "diagonal-wipe", "push-editorial", "split-curtain",
    "iris-rise", "zoom-iris", "shutter-bars", "cinema-bars",
  ];
  const TRANSITION_LABELS = {
    "soft-fade": "محو نرم (Soft Fade)",
    "whip": "شلاق سریع (Whip)",
    "zoom-through": "زوم کوبشی (Zoom Through)",
    "mask-wipe": "پاک‌شدن رنگی (Mask Wipe)",
    "glitch-flash": "گلیچ و فلش (Glitch Flash)",
    "match-cut": "برش سخت (Match Cut)",
    "push": "هل دادن صحنه (Push)",
    "curtain": "پرده در جهت خوانش (Curtain)",
    "curtain-rtl": "پرده از راست به چپ",
    "slash": "خط تأکید مورب (Slash)",
    "accent-slash": "نوار تأکید مورب",
    "diagonal-wipe": "پاک‌شدن مورب (Diagonal Wipe)",
    "push-editorial": "پوش ادیتوریال (Push Editorial)",
    "editorial-push": "ورود ادیتوریال",
    "split-curtain": "پرده دوقسمتی",
    "iris-rise": "باز شدن دایره‌ای",
    "zoom-iris": "گشایش زوم",
    "shutter-bars": "کرکره ستونی",
    "cinema-bars": "نوار سینمایی",
  };
  const TRANSITION_ALIASES = { curtain: "curtain-rtl", slash: "accent-slash", "push-editorial": "editorial-push" };
  const AUTO_TRANSITIONS = {
    chapter_card: "mask-wipe", section_break: "mask-wipe",
    title_card: "zoom-through", big_number: "zoom-through", punch_in: "zoom-through",
    study_card: "push", doc_highlight: "push", quote_card: "push",
    kinetic_text: "whip",
    bar_chart: "push", stat_bars: "push", line_chart: "push", compare: "push", chart: "push", counter_grid: "push",
  };
  FX.TRANSITIONS = TRANSITIONS;
  FX.AUTO_TRANSITIONS = AUTO_TRANSITIONS;
  function resolveTransition(slide, th, r) {
    const raw = slide && slide.transition;
    if (raw == null || raw === "" || raw === "auto" || raw === "خودکار") {
      if (!(th && th.fx && th.fx.autoTransition)) return "soft-fade";
      const tpl = String((slide && slide.template) || "layers").replace(/-/g, "_");
      const prev = slide && slide._prevTemplate ? String(slide._prevTemplate).replace(/-/g, "_") : "";
      if (prev && prev === tpl) return "match-cut";
      return AUTO_TRANSITIONS[tpl] || "soft-fade";
    }
    if (raw === "random" || raw === "تصادفی") return pick(r, RANDOM_TRANSITIONS);
    return String(raw);
  }

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

    const transition = resolveTransition(slide, th, r);
    const bgStyle = slide.bg_style || (slide.background && typeof slide.background === "object" && slide.background.style) || (th.background && th.background.style) || "studio-mix";

    let logoMotion;
    if (isRand(slide.logo_motion)) logoMotion = pick(r, LOGO_MOTIONS);
    else if (isUnset(slide.logo_motion)) logoMotion = "pop-spin";
    else logoMotion = slide.logo_motion;

    const c = FX.cur = {
      variant: want(slide.variant) ? pick(r, dflt.variants || FX.VARIANTS) : slide.variant,
      preset,
      transition,
      bgStyle,
      _trDone: false, _bgDone: false, _calmBg: false,
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
    const stageEl = document.getElementById("stage"), safe = th.layout && th.layout.safe;
    if (stageEl) {
      if (safe && safe.x != null) stageEl.style.setProperty("--safe-x", safe.x + "px"); else stageEl.style.removeProperty("--safe-x");
      if (safe && safe.y != null) stageEl.style.setProperty("--safe-y", safe.y + "px"); else stageEl.style.removeProperty("--safe-y");
    }
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
      const sg = S.isLTR && S.isLTR() ? -1 : 1;                    // enter from the reading start (right in RTL, left in LTR)
      if (textish) from.x = sg * (role === "title" ? 44 : 26);
      else if (cardish) { from.x = sg * 34; from.scale = 0.985; }
      else if (role === "image") from.x = -sg * 36;
    } else if (v === "mask") {
      if (textish) { from.clipPath = "inset(-25% -6% 100% -6%)"; from.y = 14; }
      else if (cardish) { from.clipPath = S.isLTR && S.isLTR() ? "inset(0% 100% 0% 0%)" : "inset(0% 0% 0% 100%)"; }
      else if (role === "image") { from.clipPath = S.isLTR && S.isLTR() ? "inset(0% 100% 0% 0% round 16px)" : "inset(0% 0% 0% 100% round 16px)"; }
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
    if (FX.cur && FX.cur._calmBg) return;
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

  /* slide transitions (first ~0.6 s of each clip) — direction-aware rewrite drafted by AI Studio Build, reviewed + merged */
  /* ---------------------------------------------------------- incoming slide transitions (t = 0..0.6s) */
  FX.transitionIn = function (stage, content, slide) {
    if (!stage || !content || (FX.cur && FX.cur._trDone)) return;
    if (FX.cur) FX.cur._trDone = true;
    stage.classList.add("has-tr");

    const th = S.theme || { colors: { bg: "#121212", accent: "#FFD600" }, clip: { fade: 0.3 } };
    const W = S.W || 1920, H = S.H || 1080;
    const ltr = !!(S.isLTR && S.isLTR());
    const sg = ltr ? -1 : 1;                                       // +1 RTL (reading start = right), -1 LTR (reading start = left)
    const r = (FX.cur && FX.cur.r) || FX.rngFor((slide && slide._seed) || "tr");
    const name = (FX.cur && FX.cur.transition) || resolveTransition(slide || {}, th, r);
    const mode = TRANSITION_ALIASES[name] || name;

    const layer = document.createElement("div");
    layer.className = "tr-layer";
    stage.appendChild(layer);
    const make = (cls, style) => {
      const e = document.createElement("div");
      e.className = cls;
      if (style) Object.assign(e.style, style);
      layer.appendChild(e);
      return e;
    };
    let cueType = "swish";

    if (mode === "match-cut") {
      cueType = "pop";
      if (slide && slide.flash === true) {
        const fl = make("tr-flash", { background: "#fff" });
        S.tl.fromTo(fl, { opacity: 0.45 }, { opacity: 0, duration: 1 / 30, ease: "steps(1)", immediateRender: true }, 0);
      }
    } else if (mode === "whip") {
      cueType = "whoosh";
      S.tl.fromTo(content,
        { x: sg * 680, skewX: sg * 14, filter: "blur(18px)", opacity: 0.35 },
        { x: 0, skewX: 0, filter: "blur(0px)", opacity: 1, duration: 0.32, ease: "power4.out", immediateRender: true }, 0);
      const streak = make("tr-streak", {
        background: `linear-gradient(${ltr ? "90deg" : "270deg"}, transparent 0%, ${th.colors.accent}22 45%, #ffffff1c 65%, transparent 100%)`,
      });
      S.tl.fromTo(streak, { x: sg * W * 0.65, opacity: 0.9 }, { x: -sg * W * 0.75, opacity: 0, duration: 0.32, ease: "power3.out", immediateRender: true }, 0);
    } else if (mode === "zoom-through") {
      cueType = "pop";
      S.tl.fromTo(content,
        { scale: 1.22, filter: "blur(10px)", opacity: 0 },
        { scale: 1, filter: "blur(0px)", opacity: 1, duration: 0.42, ease: "power4.out", immediateRender: true }, 0);
      const fl = make("tr-flash", { background: "#fff" });
      S.tl.fromTo(fl, { opacity: 0.08 }, { opacity: 0, duration: 0.24, ease: "power2.out", immediateRender: true }, 0);
    } else if (mode === "mask-wipe") {
      cueType = "swish";
      const panel = make("tr-panel", { background: th.colors.accent });
      S.tl.fromTo(panel, { x: sg * W }, { x: 0, duration: 0.25, ease: "power3.inOut", immediateRender: true }, 0);
      S.tl.to(panel, { x: -sg * W, duration: 0.30, ease: "power4.out" }, 0.25);
      S.tl.fromTo(content,
        { opacity: 0, clipPath: ltr ? "inset(0% 100% 0% 0%)" : "inset(0% 0% 0% 100%)" },
        { opacity: 1, clipPath: "inset(0% 0% 0% 0%)", duration: 0.30, ease: "power4.out", immediateRender: true }, 0.25);
    } else if (mode === "glitch-flash") {
      cueType = "glitch";
      const cloneReady = (tint) => {
        const cp = content.cloneNode(true);
        cp.className = "tr-glitch-copy";
        cp.setAttribute("aria-hidden", "true");
        cp.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
        cp.querySelectorAll("*").forEach((n) => {
          if (n.style && n.style.opacity === "0") {
            n.style.opacity = "1";
            n.style.transform = "none";
            n.style.clipPath = "none";
            n.style.filter = "none";
          }
        });
        cp.style.filter = tint;
        layer.appendChild(cp);
        return cp;
      };
      const cR = cloneReady("drop-shadow(0 0 2px rgba(255,40,80,.9)) hue-rotate(-24deg) saturate(2.2)");
      const cB = cloneReady("drop-shadow(0 0 2px rgba(0,230,255,.9)) hue-rotate(155deg) saturate(2.2)");
      const f = 1 / 30;
      S.tl.fromTo(cR, { x: sg * 26, y: -4, opacity: 0.72 }, { x: -sg * 18, y: 3, opacity: 0.55, duration: f, ease: "steps(1)", immediateRender: true }, 0)
          .to(cR, { x: sg * 10, y: -2, opacity: 0.35, duration: f, ease: "steps(1)" }, f)
          .to(cR, { x: 0, y: 0, opacity: 0, duration: f, ease: "steps(1)" }, f * 2);
      S.tl.fromTo(cB, { x: -sg * 26, y: 4, opacity: 0.72 }, { x: sg * 18, y: -3, opacity: 0.55, duration: f, ease: "steps(1)", immediateRender: true }, 0)
          .to(cB, { x: -sg * 10, y: 2, opacity: 0.35, duration: f, ease: "steps(1)" }, f)
          .to(cB, { x: 0, y: 0, opacity: 0, duration: f, ease: "steps(1)" }, f * 2);
      S.tl.fromTo(content, { x: sg * 8, opacity: 0.85 }, { x: -sg * 5, opacity: 0.95, duration: f, ease: "steps(1)", immediateRender: true }, 0)
          .to(content, { x: 0, opacity: 1, duration: 0.14, ease: "power2.out" }, f);
      const fl = make("tr-flash", { background: "#fff" });
      S.tl.fromTo(fl, { opacity: 0.35 }, { opacity: 0, duration: 0.2, ease: "power2.out", immediateRender: true }, 0);
    } else if (mode === "push") {
      cueType = "whoosh";
      const ghost = make("tr-panel", { background: th.colors.bg });
      S.tl.fromTo(ghost, { x: 0, opacity: 1 }, { x: -sg * W, opacity: 0, duration: 0.44, ease: "power4.inOut", immediateRender: true }, 0);
      S.tl.fromTo(content, { x: sg * 90, opacity: 0.15 }, { x: 0, opacity: 1, duration: 0.44, ease: "power4.out", immediateRender: true }, 0);
    } else if (mode === "curtain-rtl") {
      cueType = "whoosh";
      const curtain = make("tr-panel", { background: th.colors.bg });
      const edge = document.createElement("div");
      Object.assign(edge.style, { position: "absolute", top: 0, bottom: 0, width: "6px", background: th.colors.accent, [ltr ? "left" : "right"]: 0 });
      curtain.appendChild(edge);
      S.tl.fromTo(curtain, { x: 0 }, { x: -sg * (W + 40), duration: 0.52, ease: "power4.inOut", immediateRender: true }, 0);
      S.tl.fromTo(content, { x: sg * 48, opacity: 0.2 }, { x: 0, opacity: 1, duration: 0.48, ease: "power4.out", immediateRender: true }, 0.04);
    } else if (mode === "accent-slash") {
      cueType = "swish";
      const sl = make("tr-panel", { left: "0px", top: "-60px", width: "460px", height: (H + 120) + "px", background: th.colors.accent, transform: `skewX(${sg * -16}deg)` });
      S.tl.fromTo(sl, { x: 730 + sg * 1450 }, { x: 730 - sg * 1450, duration: 0.50, ease: "power3.inOut", immediateRender: true }, 0);
      S.tl.fromTo(content,
        { x: sg * 32, opacity: 0.25, clipPath: ltr ? "inset(0% 100% 0% 0%)" : "inset(0% 0% 0% 100%)" },
        { x: 0, opacity: 1, clipPath: "inset(0% 0% 0% 0%)", duration: 0.46, ease: "power3.out", immediateRender: true }, 0.04);
    } else if (mode === "diagonal-wipe") {
      cueType = "swish";
      const fromPoly = ltr ? "polygon(0% 0%, 0% 0%, -18% 100%, -18% 100%)" : "polygon(100% 0%, 100% 0%, 118% 100%, 118% 100%)";
      const toPoly = ltr ? "polygon(0% 0%, 118% 0%, 100% 100%, 0% 100%)" : "polygon(-18% 0%, 100% 0%, 100% 100%, 0% 100%)";
      S.tl.fromTo(content,
        { x: sg * 24, opacity: 0.35, clipPath: fromPoly },
        { x: 0, opacity: 1, clipPath: toPoly, duration: 0.48, ease: "power3.out", immediateRender: true }, 0);
    } else if (mode === "editorial-push") {
      cueType = "whoosh";
      const bar = make("tr-panel", { top: 0, bottom: 0, width: "6px", left: (W / 2 - 3) + "px", background: th.colors.accent });
      S.tl.fromTo(bar, { x: sg * (W * 0.45), opacity: 0.95 }, { x: -sg * (W * 0.55), opacity: 0, duration: 0.48, ease: "power4.out", immediateRender: true }, 0);
      S.tl.fromTo(content, { x: sg * 120, opacity: 0 }, { x: 0, opacity: 1, duration: 0.48, ease: "power4.out", immediateRender: true }, 0);
    } else if (mode === "split-curtain") {
      cueType = "whoosh";
      const a = make("tr-panel", { top: 0, left: 0, width: "50%", height: "100%", background: th.colors.bg });
      const b = make("tr-panel", { top: 0, left: "50%", width: "50%", height: "100%", background: th.colors.bg });
      S.tl.fromTo(a, { x: 0 }, { x: -W * 0.52, duration: 0.5, ease: "power4.inOut", immediateRender: true }, 0);
      S.tl.fromTo(b, { x: 0 }, { x: W * 0.52, duration: 0.5, ease: "power4.inOut", immediateRender: true }, 0);
      S.tl.fromTo(content, { scale: 0.97, opacity: 0.3 }, { scale: 1, opacity: 1, duration: 0.48, ease: "power4.out", immediateRender: true }, 0.04);
    } else if (mode === "iris-rise") {
      cueType = "pop";
      S.tl.fromTo(content,
        { clipPath: "circle(0% at 50% 55%)", y: 24, opacity: 0.3 },
        { clipPath: "circle(85% at 50% 50%)", y: 0, opacity: 1, duration: 0.52, ease: "power3.out", immediateRender: true }, 0);
    } else if (mode === "zoom-iris") {
      cueType = "pop";
      S.tl.fromTo(content,
        { clipPath: "circle(4% at 50% 50%)", scale: 1.08, opacity: 0.3 },
        { clipPath: "circle(85% at 50% 50%)", scale: 1, opacity: 1, duration: 0.48, ease: "power4.out", immediateRender: true }, 0);
    } else if (mode === "shutter-bars") {
      cueType = "swish";
      const n = 6, bw = Math.ceil(W / n) + 2;
      for (let i = 0; i < n; i++) {
        const slat = make("tr-shutter", {
          left: (i * (W / n)) + "px", top: 0, width: bw + "px", height: H + "px",
          background: th.colors.bg, transformOrigin: ltr ? "100% 50%" : "0% 50%",
        });
        const k = ltr ? i : n - 1 - i;
        S.tl.fromTo(slat, { scaleX: 1 }, { scaleX: 0, duration: 0.38, ease: "power3.inOut", immediateRender: true }, k * 0.03);
      }
      S.tl.fromTo(content, { x: sg * 24, opacity: 0.5 }, { x: 0, opacity: 1, duration: 0.45, ease: "power3.out", immediateRender: true }, 0.04);
    } else if (mode === "cinema-bars") {
      cueType = "whoosh";
      const top = make("tr-cinema", { left: 0, top: 0, width: "100%", height: "540px", background: "#000", transformOrigin: "50% 0%" });
      const bot = make("tr-cinema", { left: 0, top: "540px", width: "100%", height: "540px", background: "#000", transformOrigin: "50% 100%" });
      S.tl.fromTo([top, bot], { scaleY: 1 }, { scaleY: 0, duration: 0.50, ease: "power4.inOut", immediateRender: true }, 0);
      S.tl.fromTo(content, { scale: 1.04, opacity: 0.4 }, { scale: 1, opacity: 1, duration: 0.50, ease: "power4.out", immediateRender: true }, 0.04);
    } else {
      // soft-fade (classic default): the original .fadein veil in the theme background colour
      cueType = "swish";
      stage.classList.remove("has-tr");
      const fade = document.createElement("div"); fade.className = "fadein"; stage.appendChild(fade);
      if (th.clip && th.clip.fade > 0) S.tl.fromTo(fade, { opacity: 1 }, { opacity: 0, duration: th.clip.fade, ease: "power1.out", immediateRender: true }, 0);
      else fade.remove();
    }

    FX.cue(0, cueType, name);
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
  /* ---------------------------------------------------------- key-word effects & post-build polish */
  function drawSvgAnn(content, kind, el, rect, cr, sx, sy, t, r, ltr) {
    const ns = "http://www.w3.org/2000/svg";
    /* anchor the SVG inside the word itself, sized from layout boxes (offsetWidth/Height ignore entrance
       transforms), so it stays glued to the word in RTL and LTR whatever the word's entrance does */
    const x = 0, y = 0;
    const w = el.offsetWidth || rect.width / sx, h = el.offsetHeight || rect.height / sy;
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    if (!w || !h) return;
    const j = (amp = 2.5) => (r() - 0.5) * 2 * amp;
    const f = (n) => n.toFixed(1);
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", "ann-svg");
    const path = document.createElementNS(ns, "path");
    let bx = x, by = y, bw = w, bh = h, d = "", dur = 0.48;

    if (kind === "circle") {
      const px = Math.max(14, w * 0.10), py = Math.max(8, h * 0.10);
      bx = x - px; by = y + h * 0.08 - py; bw = w + 2 * px; bh = h * 0.86 + 2 * py;
      const cx = bw / 2, cy = bh / 2, rx = bw / 2 - 4, ry = bh / 2 - 4, k = 0.5523;
      const sx0 = cx + (ltr ? -rx * 0.18 : rx * 0.18) + j(2), sy0 = 4 + j(2);
      const ex = sx0 + (ltr ? 6 : -6) + j(2), ey = sy0 + 4 + j(2);
      d = `M${f(sx0)},${f(sy0)} C${f(cx + rx * k + j(2))},${f(4 + j(2))} ${f(bw - 4 + j(2))},${f(cy - ry * k + j(2))} ${f(bw - 4 + j(2))},${f(cy + j(2))} `
        + `C${f(bw - 4 + j(2))},${f(cy + ry * k + j(2))} ${f(cx + rx * k + j(2))},${f(bh - 4 + j(2))} ${f(cx + j(2))},${f(bh - 4 + j(2))} `
        + `C${f(cx - rx * k + j(2))},${f(bh - 4 + j(2))} ${f(4 + j(2))},${f(cy + ry * k + j(2))} ${f(4 + j(2))},${f(cy + j(2))} `
        + `C${f(4 + j(2))},${f(cy - ry * k + j(2))} ${f(cx - rx * k + j(2))},${f(4 + j(2))} ${f(ex)},${f(ey)}`;
    } else if (kind === "box") {
      /* the inline box includes line leading: hug the glyphs (top ~14% of the box is leading) */
      const px = Math.max(6, h * 0.05), py = Math.max(6, h * 0.06);
      bx = x - px; by = y + h * 0.12 - py; bw = w + 2 * px; bh = h * 0.84 + 2 * py;
      const p0 = [4 + j(2), 4 + j(2)], p1 = [bw - 4 + j(2), 4 + j(2)];
      const p2 = [bw - 4 + j(2), bh - 4 + j(2)], p3 = [4 + j(2), bh - 4 + j(2)];
      const seg = (a, b) => `Q${f((a[0] + b[0]) / 2 + j(2))},${f((a[1] + b[1]) / 2 + j(2))} ${f(b[0])},${f(b[1])}`;
      d = ltr
        ? `M${f(p0[0] - 2)},${f(p0[1])} ${seg(p0, p1)} ${seg(p1, p2)} ${seg(p2, p3)} ${seg(p3, [p0[0], p0[1] - 3])}`
        : `M${f(p1[0] + 2)},${f(p1[1])} ${seg(p1, p0)} ${seg(p0, p3)} ${seg(p3, p2)} ${seg(p2, [p1[0], p1[1] - 3])}`;
    } else {
      // Slightly wavy hand-drawn underline starting in reading direction
      dur = 0.42;
      bx = x - 4; by = y + h - 4; bw = w + 8; bh = 18;
      const x0 = ltr ? 2 : bw - 2, x1 = ltr ? bw - 2 : 2, span = x1 - x0;
      const yBase = 8 + j(1.2);
      d = `M${f(x0)},${f(yBase)} Q${f(x0 + span * 0.25)},${f(yBase - 2.6 + j(1.4))} ${f(x0 + span * 0.5)},${f(yBase + j(1.2))} `
        + `T${f(x1)},${f(yBase + j(1.8))}`;
    }

    svg.setAttribute("width", Math.ceil(bw));
    svg.setAttribute("height", Math.ceil(bh));
    svg.setAttribute("viewBox", `0 0 ${f(bw)} ${f(bh)}`);
    svg.style.top = f(by) + "px"; svg.style[ltr ? "left" : "right"] = (ltr ? f(bx) : f(x + w - (bx + bw))) + "px";   // anchor at the reading start of the word
    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", (S.theme && S.theme.colors && S.theme.colors.accent) || "#FFD600");
    path.setAttribute("stroke-width", "5");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    svg.appendChild(path);
    el.appendChild(svg);

    const len = path.getTotalLength ? path.getTotalLength() : Math.max(bw, bh) * 3;
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len;
    S.tl.fromTo(path, { strokeDashoffset: len }, { strokeDashoffset: 0, duration: dur, ease: S.ease("power3"), immediateRender: true }, t);
    FX.cue(t, "swish", kind);
  }

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
    /* hand-drawn annotations ([[circle]], {{box}}, wavy __underline__), emphasis pop and drift:
       drafted by AI Studio Build (Gemini 4 Hydrogen, 2026-11-28), reviewed + merged */
    const th = S.theme || {}, dflt = th.fx || {}, ltr = !!(S.isLTR && S.isLTR());
    const handDrawn = dflt.handDrawn != null ? dflt.handDrawn !== false : ltr;   // hand-drawn by default in LTR themes; Persian keeps the flat sweep unless theme.fx.handDrawn
    const circles = [...content.querySelectorAll(".ann-circle")];
    const boxes = [...content.querySelectorAll(".ann-box")];
    const wantPop = (S.slide && S.slide.pop !== undefined) ? !!S.slide.pop : !!dflt.emphasisPop;
    const popEls = wantPop ? [...content.querySelectorAll(".t-hero .acc, .t-h1 .acc, .t-h2 .acc, .t-quote .acc")] : [];

    // Measure settled rects with entrance transforms temporarily suppressed (RTL/LTR + multi-line safe)
    const firstRect = (el) => {
      const list = el.getClientRects ? el.getClientRects() : null;
      if (list && list.length) {
        for (let i = 0; i < list.length; i++) if (list[i].width > 0 && list[i].height > 0) return list[i];
      }
      return el.getBoundingClientRect();
    };
    let cr, sx = 1, sy = 1;
    const annJobs = [];
    document.body.classList.add("measuring");
    try {
      cr = content.getBoundingClientRect();
      sx = content.offsetWidth ? cr.width / content.offsetWidth : 1;
      sy = content.offsetHeight ? cr.height / content.offsetHeight : 1;
      circles.forEach((el) => annJobs.push({ kind: "circle", el, rect: firstRect(el), t: timeOf(el) + 0.1 }));
      boxes.forEach((el) => annJobs.push({ kind: "box", el, rect: firstRect(el), t: timeOf(el) + 0.1 }));
      if (handDrawn) {
        uls.forEach((el) => {
          el.classList.add("ul-svg");
          annJobs.push({ kind: "underline", el, rect: firstRect(el), t: timeOf(el) + 0.1 });
        });
      }
      popEls.forEach((el) => {
        if (!el.getClientRects || el.getClientRects().length <= 1) el.style.display = "inline-block";
      });
    } finally {
      document.body.classList.remove("measuring");
    }

    if (!handDrawn) {
      uls.forEach((el) => {
        el.classList.add("ul-on");
        const t = timeOf(el) + 0.08;
        S.tl.fromTo(el, { backgroundSize: "0% 6px" }, { backgroundSize: "100% 6px", duration: 0.5, ease: S.ease("power3"), immediateRender: true }, t);
      });
    }

    annJobs.forEach((job, idx) => {
      const rAnn = FX.rngFor(`${(S.slide && S.slide._seed) || ""}:ann:${job.kind}:${idx}:${job.el.textContent}`);
      drawSvgAnn(content, job.kind, job.el, job.rect, cr, sx, sy, job.t, rAnn, ltr);
    });

    // (a) Title .acc emphasis pop: scale 1 -> 1.07 -> 1 over 0.36 s right after entrance
    popEls.forEach((el) => {
      const t = timeOf(el) + 0.04;
      S.tl.to(el, { scale: 1.07, duration: 0.14, ease: "power2.out", immediateRender: false }, t)
          .to(el, { scale: 1, duration: 0.22, ease: "power3.out", immediateRender: false }, t + 0.14);
      FX.cue(t, "pop", el.textContent.slice(0, 30));
    });
    const stage = document.getElementById("stage") || content.parentElement;
    // (c) Optional whole-content subtle camera drift on a wrapper so it never collides with entrance tweens
    const wantDrift = (S.slide && S.slide.drift !== undefined) ? !!S.slide.drift : !!dflt.drift;
    if (wantDrift && stage && content.parentElement === stage) {
      const wrap = document.createElement("div");
      wrap.className = "drift-wrap";
      stage.insertBefore(wrap, content);
      wrap.appendChild(content);
      const rD = c ? c.r : FX.rngFor((S.slide && S.slide._seed) || "drift");
      const dx = (rD() < 0.5 ? 1 : -1) * 4.5, dy = (rD() < 0.5 ? 1 : -1) * 3.5;
      S.amb.fromTo(wrap, { x: 0, y: 0, scale: 1 },
        { x: dx, y: dy, scale: 1.006, duration: 18, ease: "sine.inOut", yoyo: true, repeat: 99 }, 0);
    }
  };

  function resolveBgStyle(slide) {
    const th = S.theme || {};
    return (slide && (slide.bg_style || (slide.background && typeof slide.background === "object" && slide.background.style)))
      || (FX.cur && FX.cur.bgStyle) || (th.background && th.background.style) || "studio-mix";
  }

  /* ---------------------------------------------------------- calm backgrounds (behind content) */
  FX.background = function (stage, slide) {
    if (!stage) return false;
    if (FX.cur && FX.cur._bgDone) return !!FX.cur._calmBg;
    if (FX.cur) FX.cur._bgDone = true;

    const th = S.theme || {}, colors = th.colors || {};
    const style = resolveBgStyle(slide);
    if (!style || style === "studio-mix") {
      stage.classList.remove("bg-calm");
      if (FX.cur) FX.cur._calmBg = false;
      return false;
    }

    if (FX.cur) FX.cur._calmBg = true;
    stage.classList.add("bg-calm");
    // Remove busy default glow unless explicitly requested on this slide
    if (!slide || slide.glow !== true) {
      stage.querySelectorAll(".glow").forEach((el) => el.remove());
    }

    const tokens = new Set(String(style).toLowerCase().split(/[+,\s]+/).filter(Boolean));
    const isExplainer = tokens.has("explainer");
    const wantMesh = isExplainer || tokens.has("mesh");
    const wantVig = isExplainer || tokens.has("vignette");
    const wantGrain = isExplainer || tokens.has("grain");
    const wantShapes = tokens.has("shapes");

    const seedKey = (slide && slide._seed) || `${(slide && slide.template) || "s"}:${(slide && (slide.title || slide.text)) || ""}`;
    const r = FX.rngFor(seedKey + ":bg");
    const cam = (th.layout && th.layout.cam) || [24, 740, 584, 1055];
    const hitsCam = (x0, y0, x1, y1, pad = 28) => x0 < cam[2] + pad && x1 > cam[0] - pad && y0 < cam[3] + pad && y1 > cam[1] - pad;
    const accent = colors.accent || "#F2333B";
    const bg2 = colors.bg2 || colors.card || "#141923";

    // Corner/edge soft radial blobs drifting slowly on Stage.amb (24-30 s period)
    if (wantMesh) {
      const box = document.createElement("div"); box.className = "bg-mesh"; stage.appendChild(box);
      const anchors = [
        [1680 + r() * 220, -20 + r() * 160],
        [40 + r() * 200, -30 + r() * 150],
        [1640 + r() * 240, 920 + r() * 160],
        [1820 + r() * 140, 380 + r() * 220],
      ];
      for (let i = anchors.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [anchors[i], anchors[j]] = [anchors[j], anchors[i]];
      }
      const count = r() < 0.45 ? 2 : 3;
      const palette = [accent, bg2, accent];
      for (let i = 0; i < count; i++) {
        const [cx, cy] = anchors[i];
        const sz = Math.round(780 + r() * 240);
        const col = palette[i % palette.length];
        const op = +(0.06 + r() * 0.05).toFixed(3);
        const blob = document.createElement("div"); blob.className = "bg-blob";
        Object.assign(blob.style, {
          left: Math.round(cx - sz / 2) + "px", top: Math.round(cy - sz / 2) + "px",
          width: sz + "px", height: sz + "px", opacity: String(op),
          background: `radial-gradient(circle, ${col} 0%, transparent 68%)`,
        });
        box.appendChild(blob);
        const dx = (r() < 0.5 ? 1 : -1) * (18 + r() * 16);
        const dy = (r() < 0.5 ? 1 : -1) * (14 + r() * 14);
        const half = (24 + r() * 6) / 2;
        S.amb.fromTo(blob, { x: -dx, y: -dy, scale: 0.97 },
          { x: dx, y: dy, scale: 1.04, duration: half, ease: "sine.inOut", yoyo: true, repeat: 99 }, 0);
      }
    }

    // 4-6 large faint outline rings / rounded squares / lines at edges, clear of SCAM camera box
    if (wantShapes) {
      const box = document.createElement("div"); box.className = "bg-shapes"; stage.appendChild(box);
      const ns = "http://www.w3.org/2000/svg";
      const slots = [
        [70, 50, 210, 170],
        [480, -10, 740, 100],
        [1670, 50, 1850, 190],
        [1730, 410, 1870, 610],
        [1630, 790, 1830, 960],
        [740, 910, 1100, 1010],
        [60, 350, 190, 500],
      ];
      for (let i = slots.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [slots[i], slots[j]] = [slots[j], slots[i]];
      }
      const kinds = ["ring", "square", "line"];
      const target = 4 + Math.floor(r() * 3);
      let placed = 0;
      for (let i = 0; i < slots.length && placed < target; i++) {
        const [x0, y0, x1, y1] = slots[i];
        const kind = kinds[(placed + Math.floor(r() * 3)) % kinds.length];
        const cx = x0 + r() * (x1 - x0), cy = y0 + r() * (y1 - y0);
        const bw = kind === "line" ? Math.round(210 + r() * 120) : Math.round(150 + r() * 110);
        const bh = kind === "line" ? Math.round(60 + r() * 80) : bw;
        const left = Math.round(cx - bw / 2), top = Math.round(cy - bh / 2);
        if (hitsCam(left, top, left + bw, top + bh, 32)) continue;
        placed++;
        const svg = document.createElementNS(ns, "svg");
        svg.setAttribute("class", "bg-shape");
        svg.setAttribute("width", String(bw));
        svg.setAttribute("height", String(bh));
        svg.setAttribute("viewBox", `0 0 ${bw} ${bh}`);
        const op = (0.04 + r() * 0.02).toFixed(3);
        Object.assign(svg.style, { left: left + "px", top: top + "px", opacity: op });
        const sh = document.createElementNS(ns, kind === "ring" ? "circle" : kind === "square" ? "rect" : "line");
        if (kind === "ring") {
          sh.setAttribute("cx", String(bw / 2)); sh.setAttribute("cy", String(bh / 2));
          sh.setAttribute("r", String(Math.round(bw / 2 - 6)));
        } else if (kind === "square") {
          sh.setAttribute("x", "6"); sh.setAttribute("y", "6");
          sh.setAttribute("width", String(bw - 12)); sh.setAttribute("height", String(bh - 12));
          sh.setAttribute("rx", "26");
        } else {
          const flip = r() < 0.5;
          sh.setAttribute("x1", "8"); sh.setAttribute("y1", String(flip ? 8 : bh - 8));
          sh.setAttribute("x2", String(bw - 8)); sh.setAttribute("y2", String(flip ? bh - 8 : 8));
          sh.setAttribute("stroke-linecap", "round");
        }
        sh.setAttribute("fill", "none");
        sh.setAttribute("stroke", accent);
        sh.setAttribute("stroke-width", "2");
        svg.appendChild(sh);
        box.appendChild(svg);
        const dx = (r() < 0.5 ? 1 : -1) * (10 + r() * 12);
        const dy = (r() < 0.5 ? 1 : -1) * (8 + r() * 10);
        const rot = (r() - 0.5) * 8;
        const half = (26 + r() * 8) / 2;
        S.amb.fromTo(svg, { x: -dx, y: -dy, rotation: -rot },
          { x: dx, y: dy, rotation: rot, duration: half, ease: "sine.inOut", yoyo: true, repeat: 99 }, 0);
      }
    }

    if (wantVig) {
      const vig = document.createElement("div"); vig.className = "bg-vignette"; stage.appendChild(vig);
    }
    if (wantGrain) {
      const gr = document.createElement("div"); gr.className = "bg-grain-static"; stage.appendChild(gr);
      const url = grainTile();
      if (url) gr.style.backgroundImage = `url(${url})`;
    }
    return true;
  };

  /* ---------------------------------------------------------- Always-On Living Background Engine */
  FX.livingStage = function (stage, slide) {
    if (FX.background(stage, slide)) return;   // calm theme background (mesh/vignette/grain/shapes) replaces the living stage
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
})();
