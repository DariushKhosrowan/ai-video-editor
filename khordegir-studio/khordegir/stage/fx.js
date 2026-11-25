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
  FX.MOTIONS = { breathe: 3, "zoom-out": 2, "pan-left": 1, "pan-right": 1, depth: 2 };

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
  };

  const TRANSITIONS = [
    "curtain-rtl",
    "accent-slash",
    "iris-rise",
    "soft-fade",
    "split-curtain",
    "diagonal-wipe",
    "zoom-iris",
    "shutter-bars",
  ];
  const TRANSITION_LABELS = {
    "curtain-rtl": "پرده از راست به چپ",
    "accent-slash": "نوار تأکید مورب",
    "iris-rise": "باز شدن دایره‌ای (Iris)",
    "soft-fade": "محو نرم از سیاهی (کلاسیک)",
    "split-curtain": "پردهٔ دوقسمتی بالا و پایین",
    "diagonal-wipe": "پاک‌شدن مورب سینمایی",
    "zoom-iris": "گشایش زوم سریع",
    "shutter-bars": "کرکرهٔ ستونی",
  };

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
    imageMotions: ["breathe", "zoom-out", "pan-left", "pan-right", "depth", "none"],
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
      if (textish) from.x = role === "title" ? 44 : 26;
      else if (cardish) { from.x = 34; from.scale = 0.985; }
      else if (role === "image") from.x = -36;
    } else if (v === "mask") {
      if (textish) { from.clipPath = "inset(-25% -6% 100% -6%)"; from.y = 14; }
      else if (cardish) { from.clipPath = "inset(0% 0% 0% 100%)"; }
      else if (role === "image") { from.clipPath = "inset(0% 0% 0% 100% round 16px)"; }
    } else if (v === "blur") {
      from.filter = "blur(14px)";
      if (textish) from.y = 8; if (cardish) from.scale = 0.98; if (role === "image") from.scale = 1.03;
    } else if (v === "scale") {
      from.scale = textish ? 0.96 : role === "image" ? 1.04 : 0.95;
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

  FX.cue = function (t, type, label) {
    if (S.cues) S.cues.push({ t: +t.toFixed(3), type, label: label || "" });
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

    if (c.dust) {
      const box = document.createElement("div");
      box.className = "dust";
      stage.appendChild(box);
      const n = 34;
      for (let i = 0; i < n; i++) {
        const d = document.createElement("i");
        const s = 1.5 + r() * 3.5;
        Object.assign(d.style, {
          left: (r() * W) + "px",
          top: (r() * H) + "px",
          width: s + "px",
          height: s + "px",
          background: isLight ? (col.muted || "#666") : "#fff8dc",
          opacity: (isLight ? (0.04 + r() * 0.12) : (0.08 + r() * 0.22)).toFixed(2),
          filter: s > 4 ? "blur(1.5px)" : "none",
        });
        box.appendChild(d);
        S.amb.to(d, { x: (r() - 0.5) * 160, y: -40 - r() * 140, duration: 18 + r() * 10, ease: "none" }, 0);
      }
    }

    // Extra subtle architectural sweep on lively presets (never changes classic baseline)
    if (c.preset && c.preset !== "classic") {
      const sw = document.createElement("div");
      sw.className = "light-sweep";
      stage.appendChild(sw);
      S.amb.fromTo(sw, { x: 600, opacity: 0 }, { x: -1600, opacity: isLight ? 0.16 : 0.24, duration: 10, ease: "sine.inOut", yoyo: true, repeat: 4 }, 0);
    }
  };

  FX.grain = function (stage) {
    if (!FX.cur || !FX.cur.grain) return;
    const gr = document.createElement("div");
    gr.className = "grain";
    stage.appendChild(gr);
    gr.style.backgroundImage = `url(${grainTile()})`;
    const proxy = { t: 0 }, r = mulberry32(99);
    const offs = Array.from({ length: 24 }, () => [Math.floor(r() * 256), Math.floor(r() * 256)]);
    S.amb.to(proxy, {
      t: 60, duration: 60, ease: "none",
      onUpdate: () => {
        const k = Math.floor(proxy.t * 24) % 24;
        gr.style.backgroundPosition = `${offs[k][0]}px ${offs[k][1]}px`;
      },
    }, 0);
  };

  /* "depth" idle variant: a big blurred copy of the image behind everything drifts the other way */
  FX.depth = function (src) {
    const stage = document.getElementById("stage");
    if (!stage || stage.querySelector(".depth")) return;
    const d = document.createElement("div"); d.className = "depth";
    const im = document.createElement("img"); im.src = src; d.appendChild(im);
    stage.insertBefore(d, stage.querySelector(".content"));
    S._imgs.push(im);
    S.amb.fromTo(im, { scale: 1.12, x: -10 }, { scale: 1.16, x: 26, duration: 20, ease: "none" }, 0);
  };

  /* ---------------------------------------------------------- 8 slide transitions */
  FX.transitionIn = function (stage, slide, th) {
    const mode = (FX.cur && FX.cur.transition) || "soft-fade";
    const clip = th.clip || { fade: 0.3 };
    const col = th.colors || {};
    const fadeDur = clip.fade > 0 ? clip.fade : 0.35;

    if (mode === "soft-fade") {
      const fade = document.createElement("div");
      fade.className = "fadein";
      stage.appendChild(fade);
      if (clip.fade > 0) S.tl.fromTo(fade, { opacity: 1 }, { opacity: 0, duration: clip.fade, ease: "power1.out", immediateRender: true }, 0);
      else fade.remove();
      return;
    }

    if (mode === "curtain-rtl") {
      const panel = document.createElement("div");
      panel.className = "transition-overlay transition-curtain-rtl";
      Object.assign(panel.style, {
        position: "absolute", inset: "0", background: col.bg2 || col.surface || "#16161a",
        borderLeft: `10px solid ${col.accent || "#FFD600"}`, pointerEvents: "none", zIndex: 90,
      });
      stage.appendChild(panel);
      S.tl.fromTo(panel, { x: 0, opacity: 1 }, { x: -2000, opacity: 0, duration: 0.52, ease: "power4.out", immediateRender: true }, 0);
      return;
    }

    if (mode === "accent-slash") {
      const veil = document.createElement("div");
      veil.className = "transition-overlay transition-accent-slash";
      Object.assign(veil.style, {
        position: "absolute", inset: "0", background: col.bg || "#121212", pointerEvents: "none", zIndex: 89,
      });
      const slash = document.createElement("div");
      slash.className = "transition-overlay transition-slash-bar";
      Object.assign(slash.style, {
        position: "absolute", top: "-15%", bottom: "-15%", right: "-20%", width: "260px",
        background: col.accent || "#FFD600", transform: "skewX(-14deg)", pointerEvents: "none", zIndex: 91,
      });
      stage.appendChild(veil);
      stage.appendChild(slash);
      S.tl.fromTo(veil, { opacity: 1 }, { opacity: 0, duration: 0.36, ease: "power2.out", immediateRender: true }, 0.08);
      S.tl.fromTo(slash, { x: 200, opacity: 1 }, { x: -2350, opacity: 0.9, duration: 0.52, ease: "power3.inOut", immediateRender: true }, 0);
      return;
    }

    if (mode === "iris-rise") {
      const veil = document.createElement("div");
      veil.className = "transition-overlay transition-iris-rise";
      Object.assign(veil.style, {
        position: "absolute", inset: "0", background: col.bg || "#121212",
        clipPath: "circle(110% at 50% 50%)", pointerEvents: "none", zIndex: 90,
      });
      stage.appendChild(veil);
      S.tl.fromTo(veil, { scale: 1, opacity: 1 }, { scale: 1.45, opacity: 0, duration: 0.48, ease: "power3.out", immediateRender: true }, 0);
      return;
    }

    if (mode === "split-curtain") {
      const top = document.createElement("div");
      const bot = document.createElement("div");
      top.className = "transition-overlay transition-split-top";
      bot.className = "transition-overlay transition-split-bot";
      Object.assign(top.style, {
        position: "absolute", left: "0", right: "0", top: "0", height: "540px",
        background: col.bg2 || col.bg || "#121212", borderBottom: `4px solid ${col.accent || "#FFD600"}`,
        pointerEvents: "none", zIndex: 90,
      });
      Object.assign(bot.style, {
        position: "absolute", left: "0", right: "0", bottom: "0", height: "540px",
        background: col.bg2 || col.bg || "#121212", borderTop: `4px solid ${col.accent || "#FFD600"}`,
        pointerEvents: "none", zIndex: 90,
      });
      stage.appendChild(top); stage.appendChild(bot);
      S.tl.fromTo(top, { y: 0, opacity: 1 }, { y: -560, opacity: 0, duration: 0.48, ease: "power4.out", immediateRender: true }, 0);
      S.tl.fromTo(bot, { y: 0, opacity: 1 }, { y: 560, opacity: 0, duration: 0.48, ease: "power4.out", immediateRender: true }, 0);
      return;
    }

    if (mode === "diagonal-wipe") {
      const wipe = document.createElement("div");
      wipe.className = "transition-overlay transition-diagonal-wipe";
      Object.assign(wipe.style, {
        position: "absolute", top: "-20%", bottom: "-20%", left: "-25%", right: "-25%",
        background: `linear-gradient(120deg, ${col.bg2 || col.bg || "#121212"} 70%, ${col.accent || "#FFD600"} 100%)`,
        pointerEvents: "none", zIndex: 90,
      });
      stage.appendChild(wipe);
      S.tl.fromTo(wipe, { x: 0, y: 0, opacity: 1 }, { x: -2400, y: 260, opacity: 0, duration: 0.5, ease: "power4.out", immediateRender: true }, 0);
      return;
    }

    if (mode === "zoom-iris") {
      const content = stage.querySelector(".content");
      const fade = document.createElement("div");
      fade.className = "transition-overlay transition-zoom-iris";
      Object.assign(fade.style, { position: "absolute", inset: "0", background: col.bg || "#121212", pointerEvents: "none", zIndex: 90 });
      stage.appendChild(fade);
      S.tl.fromTo(fade, { opacity: 0.92 }, { opacity: 0, duration: Math.max(0.28, fadeDur), ease: "power2.out", immediateRender: true }, 0);
      if (content) S.tl.fromTo(content, { scale: 1.04 }, { scale: 1, duration: 0.46, ease: "power3.out", immediateRender: true }, 0);
      return;
    }

    if (mode === "shutter-bars") {
      for (let i = 0; i < 4; i++) {
        const bar = document.createElement("div");
        bar.className = "transition-overlay transition-shutter-bar";
        Object.assign(bar.style, {
          position: "absolute", top: "0", bottom: "0", left: (i * 480) + "px", width: "484px",
          background: i % 2 === 0 ? (col.bg || "#121212") : (col.bg2 || col.surface || "#1a1a1f"),
          transformOrigin: "50% 0%", pointerEvents: "none", zIndex: 90,
        });
        stage.appendChild(bar);
        S.tl.fromTo(bar, { scaleY: 1, opacity: 1 }, { scaleY: 0, opacity: 0, duration: 0.42, ease: "power4.out", immediateRender: true }, i * 0.055);
      }
    }
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
      S.amb.fromTo(badge, { scale: 1 }, { scale: 1.05, duration: 2.2, ease: "sine.inOut", yoyo: true, repeat: 8 }, 0.6);
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
      S.amb.fromTo(badge, { y: 0 }, { y: -6, duration: 3.4, ease: "sine.inOut", yoyo: true, repeat: 6 }, 0.7);
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
  };
})();
