/* Khordegir Studio — stage runtime.
   One shared stage for: the offline editor preview (iframe) and the MP4 renderer (Playwright).
   Everything is driven by two paused GSAP 3 timelines that are *seeked*, never played by the clock:
     Stage.tl  : entrances, kinetic typography, transitions, animated logo
     Stage.amb : ambient motion (Ken Burns inside image frames, background glow/drift, dust, light sweep)
   so frame i of the video is strictly deterministic: Stage.seek(i / fps).                        */
(function () {
  "use strict";
  const MT = window.StageMotionTokens || { STAGE_ZOOM_CAP: 1.06, resolveFormat: () => ({ width: 1920, height: 1080 }), clampZoom: (z) => Math.min(1.06, Math.max(0.5, Number(z) || 1)) };
  let W = 1920, H = 1080;
  const S = window.Stage = {
    W, H, fps: 30, format: "16:9", ZOOM_CAP: MT.STAGE_ZOOM_CAP || 1.06,
    themes: {}, templates: {}, theme: null, tl: null, amb: null, slide: null,
    ready: false, _dur: 6, _base: "", _clipSeq: 0, _seekHooks: [], _mascots: [], _liveVoiceActive: false,
    capZoom: (z) => MT.clampZoom ? MT.clampZoom(z) : Math.min(1.06, Math.max(0.5, Number(z) || 1)),
    onSeek(fn) { if (typeof fn === "function") S._seekHooks.push(fn); },
    registerMascot(inst) { if (inst) S._mascots.push(inst); },
    getMascotState() { return S._mascots.length && S._mascots[0].getState ? S._mascots[0].getState() : null; },
    setMascotTone(toneCfg) {
      S._mascots.forEach((m) => { if (m && m.setTone) m.setTone(toneCfg); });
      return S.getMascotState();
    },
    setPuppetConfig(puppetCfg) {
      S._mascots.forEach((m) => { if (m && m.setPuppetConfig) m.setPuppetConfig(puppetCfg); });
      return S.getMascotState();
    },
    setLiveEmotion(name, intensity) {
      S._mascots.forEach((m) => { if (m && m.setLiveEmotion) m.setLiveEmotion(name, intensity); });
      return S.getMascotState();
    },
    triggerLiveGesture(name, opts) {
      S._mascots.forEach((m) => { if (m && m.triggerLiveGesture) m.triggerLiveGesture(name, opts); });
      return S.getMascotState();
    },
    setLiveVoice(sample, dt = 1 / 60) {
      S._liveVoiceActive = Boolean(sample && sample.active !== false);
      if (!S._liveVoiceActive) return null;
      if (sample && sample.loudness != null && S.setMicLevel) S.setMicLevel(sample.loudness);
      let st = null;
      for (let i = 0; i < S._mascots.length; i += 1) {
        if (S._mascots[i] && S._mascots[i].applyLiveVoice) {
          st = S._mascots[i].applyLiveVoice(sample, dt);
        }
      }
      return st;
    },
    setFps(nextFps) {
      const clamped = Math.max(12, Math.min(120, Math.round(Number(nextFps) || 30)));
      S.fps = clamped;
      S._mascots.forEach((m) => { if (m && m.setFps) m.setFps(clamped); });
      return S.fps;
    },
    setPuppetDebug(opts) {
      S._puppetDebug = (typeof opts === "boolean")
        ? { enabled: opts, showPivots: true, showGraphs: true }
        : Object.assign({ enabled: false, showPivots: true, showGraphs: true }, opts || {});
      S._mascots.forEach((m) => { if (m && m.setDebugOverlay) m.setDebugOverlay(S._puppetDebug); });
      return S._puppetDebug;
    },
    setFormat(fmt) {
      const spec = MT.resolveFormat ? MT.resolveFormat(fmt) : { width: 1920, height: 1080 };
      W = S.W = spec.width;
      H = S.H = spec.height;
      S.format = fmt || "16:9";
      const st = document.getElementById("stage");
      if (st) {
        st.style.width = W + "px";
        st.style.height = H + "px";
        st.setAttribute("data-format", S.format);
      }
      if (document.body && !document.body.classList.contains("obs-body")) {
        document.body.style.width = W + "px";
        document.body.style.height = H + "px";
      }
      return { width: W, height: H, format: S.format };
    },
  };

  /* ---------------------------------------------------------------- utils */
  const FA = "۰۱۲۳۴۵۶۷۸۹";
  const fa = S.fa = (s) => String(s).replace(/[0-9]/g, (d) => FA[+d]);
  const toNum = S.toNum = (v) => {
    if (typeof v === "number") return v;
    let s = String(v ?? "").replace(/[۰-۹]/g, (d) => FA.indexOf(d)).replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
    s = s.replace(/٫/g, ".").replace(/[٬,]/g, "").replace(/[^0-9.\-]/g, "");
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  };
  const decOf = S.decOf = (v) => {
    const s = String(v ?? "").replace(/[۰-۹]/g, "0").replace("٫", ".");
    const m = s.match(/\.(\d+)/);
    return m ? m[1].length : 0;
  };
  S.fmt = function (v, dec = 0, thousands = true) {
    const neg = v < 0; v = Math.abs(v);
    const s = v.toFixed(dec);
    let [i, f] = s.split(".");
    if (thousands && i.length > 3) i = i.replace(/\B(?=(\d{3})+(?!\d))/g, "٬");
    return (neg ? "-" : "") + fa(i + (f ? "٫" + f : ""));
  };
  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const hasFa = S.hasFa = (s) => /[\u0620-\u064A\u0671-\u06D3\u06FA-\u06FF]/.test(String(s ?? ""));

  /* Rich text: *accent*  ~danger~  _muted_  ==highlight==  __underline__  newline -> <br>;
     Latin runs isolated LTR (keep latin digits); other digits become Persian. */
  S.rich = function (s) {
    s = String(s ?? "");
    if (!hasFa(s) && /[A-Za-z]/.test(s)) return `<bdi dir="ltr" class="lat">${esc(s)}</bdi>`;
    let h = esc(s);
    const lat = [];
    h = h.replace(/\(?[A-Za-z][A-Za-z0-9.,&;:'’\-\/() ]*[A-Za-z0-9.)]|[A-Za-z]/g, (m) => {
      lat.push(m);
      return String.fromCharCode(0xE000 + lat.length - 1);
    });
    h = fa(h);
    h = h.replace(/==([^=]+)==/g, '<span class="hl">$1</span>')
         .replace(/__([^_]+)__/g, '<span class="ul">$1</span>')
         .replace(/~~([^~]+)~~/g, '<span class="strike">$1</span>')
         .replace(/\*([^*]+)\*/g, '<span class="acc">$1</span>')
         .replace(/~([^~]+)~/g, '<span class="dng">$1</span>')
         .replace(/(^|[\s(«])_([^_]+)_/g, '$1<span class="mut">$2</span>')
         .replace(/\n/g, "<br>")
         .replace(/([≈+−±])\s?([۰-۹][۰-۹٫٬]*\s?[٪%]?)/g, '<bdi dir="ltr">$1$2</bdi>');
    h = h.replace(/[\uE000-\uE0FF]/g, (m) => `<bdi dir="ltr" class="lat">${lat[m.charCodeAt(0) - 0xE000]}</bdi>`);
    return h;
  };
  S.plain = (s) => String(s ?? "").replace(/[*~=]/g, "");

  /* Deterministic say-duration estimation (Persian speech ~2.25 words/sec + pause weight) */
  const estimateSayDuration = S.estimateSayDuration = function (slide) {
    if (!slide || slide.sync_say === false) return null;
    const parts = [];
    if (typeof slide.say === "string" && slide.say.trim()) parts.push(slide.say.trim());
    if (Array.isArray(slide.steps)) {
      slide.steps.forEach((st) => {
        if (typeof st === "string" && st.trim()) parts.push(st.trim());
        else if (st && typeof st.say === "string" && st.say.trim()) parts.push(st.say.trim());
      });
    }
    const txt = parts.join(" ").trim();
    if (!txt) return null;
    const words = txt.split(/\s+/).filter(Boolean).length;
    const pauses = (txt.match(/[.!؟؛\n]/g) || []).length * 0.25;
    return +(Math.max(4.5, Math.min(26, words / 2.25 + 1.15 + pauses))).toFixed(2);
  };

  /* cubic-bezier ease function compatible with real GSAP 3 ease callbacks */
  function bezier(x1, y1, x2, y2) {
    const bx = (t) => 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t * t * (1 - t) + t ** 3;
    const by = (t) => 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t * t * (1 - t) + t ** 3;
    return (x) => {
      if (x <= 0) return 0; if (x >= 1) return 1;
      let lo = 0, hi = 1, t = x;
      for (let i = 0; i < 30; i++) {
        const v = bx(t);
        if (Math.abs(v - x) < 1e-5) break;
        if (v < x) lo = t; else hi = t;
        t = (lo + hi) / 2;
      }
      return by(t);
    };
  }
  S.bezier = bezier;
  const DEFAULT_EASES = Object.assign({
    power4: [0.16, 1, 0.3, 1],
    power3: [0.22, 1, 0.36, 1],
    editorial: [0.22, 1, 0.36, 1],
    vox: [0.19, 1, 0.22, 1],
    fluid: [0.25, 1, 0.35, 1],
    silk: [0.33, 1, 0.68, 1],
    snappy: [0.16, 1, 0.3, 1],
    expo: [0.19, 1, 0.22, 1],
    sharp: [0.4, 0, 0.2, 1],
    snap: [0.08, 0.92, 0.18, 1],
    cinematic: [0.45, 0, 0.15, 1],
    dramatic: [0.12, 0.96, 0.24, 1],
    back: "back.out(1.18)",
    spring: "back.out(1.36)",
    pop: "back.out(1.65)",
    overshoot: "back.out(1.45)",
    elasticSoft: "elastic.out(1, 0.68)",
  }, MT.EASING_FAMILIES || {});
  S.ease = function (name) {
    if (name === "none") return "none";
    const mc = S.slide && S.slide.motionCurve;
    if (mc && Array.isArray(mc.points) && mc.points.length === 4 && mc.type !== "none") {
      return bezier(
        Number(mc.points[0]) || 0,
        Number(mc.points[1]) || 0,
        Number(mc.points[2]) || 1,
        Number(mc.points[3]) || 1
      );
    }
    const e = ((S.theme && S.theme.ease) || {})[name] ?? DEFAULT_EASES[name] ?? name;
    if (Array.isArray(e)) return bezier(...e);
    return e || "power3.out";
  };

  /* ---------------------------------------------------------------- themes */
  S.defineTheme = function (t) {
    S.themes[t.name] = t;
    if (!S.theme || t.name === "khordegir-dark") S.useTheme(t.name);
  };
  S.useTheme = function (name) {
    const t = S.themes[name] || S.themes["khordegir-dark"] || Object.values(S.themes)[0];
    if (!t) return;
    S.theme = t;
    const c = t.colors || t.tokens || {}, ty = t.type || {}, lay = t.layout || { radius: 16, badgeRadius: 8 };
    let css = `:root{`;
    for (const k in c) if (typeof c[k] === "string") css += `--c-${k}:${c[k]};`;
    css += `--radius:${lay.radius}px;--badge-radius:${lay.badgeRadius}px;}`;
    for (const k in ty) css += `.t-${k}{font-size:${ty[k].size}px;font-weight:${ty[k].weight};line-height:${ty[k].lh};}`;
    let st = document.getElementById("theme-vars");
    if (!st) { st = document.createElement("style"); st.id = "theme-vars"; document.head.appendChild(st); }
    st.textContent = css;
    const stageEl = document.getElementById("stage");
    if (stageEl) stageEl.setAttribute("data-theme-mode", c.isDark === false ? "light" : "dark");
  };

  /* ---------------------------------------------------------------- templates */
  S.template = function (t) {
    const e = (window.TEMPLATE_INDEX || []).find((x) => x.name === t.name);
    const full = Object.assign({}, e ? e.schema : {}, t);
    S.templates[full.name] = full;
    (full.aliases || []).forEach((a) => (S.templates[a] = full));
  };
  S.templateList = () => Object.values(S.templates).filter((t, i, a) => a.indexOf(t) === i);
  S.writeIncludes = function (prefix = "") {
    (window.THEME_FILES || []).forEach((f) => document.write(`<script src="${prefix}../themes/${f}"><\/script>`));
    (window.TEMPLATE_INDEX || []).forEach((t) => {
      if (t.css) document.write(`<link rel="stylesheet" href="${t.css}">`);
      document.write(`<script src="${t.js}"><\/script>`);
    });
  };

  /* ---------------------------------------------------------------- build API given to templates */
  const RTL_CURSIVE_RE = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;

  function splitGraphemes(str) {
    if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
      try {
        const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
        return Array.from(seg.segment(str), (x) => x.segment);
      } catch (_) { /* fallback below */ }
    }
    return Array.from(String(str || ""));
  }

  function wrapHtmlWords(html, unit = "word") {
    const lines = String(html || "").split(/<br\s*\/?>/i);
    return lines.map((line) => {
      if (unit === "line") {
        return `<span class="k-line-mask"><span class="k-line k-unit">${line}</span></span>`;
      }
      const tokens = line.match(/(<[^>]+>|\s+|[^\s<]+)/g) || [];
      const out = [];
      for (const tok of tokens) {
        if (tok.startsWith("<")) {
          out.push(tok);
        } else if (/^\s+$/.test(tok)) {
          out.push(" ");
        } else if ((unit === "char" || unit === "auto") && !RTL_CURSIVE_RE.test(tok) && /[A-Za-z0-9]/.test(tok)) {
          // Latin/English runs can safely split per grapheme cluster without breaking Persian/Arabic cursive shaping
          const chars = splitGraphemes(tok).map((ch) => `<span class="k-word k-char k-unit">${ch}</span>`).join("");
          out.push(`<span class="k-word-group">${chars}</span>`);
        } else {
          // Persian/Arabic words ALWAYS stay intact (preserves cursive ligatures & ZWNJ)
          out.push(`<span class="k-word k-unit">${tok}</span>`);
        }
      }
      return `<span class="k-line">${out.join("")}</span>`;
    }).join("<br>");
  }

  function makeAPI(slide, root) {
    const th = S.theme, L = th.layout, M = th.motion;
    const scam = (slide.layout || "SLIDE").toUpperCase() === "SCAM";
    const base = 0.1;
    const personality = MT.resolveMotionPersonality
      ? MT.resolveMotionPersonality(slide.motionPersonality || slide.motion_personality || (th && th.motionPersonality) || "editorial")
      : { name: "editorial", durScale: 1, staggerScale: 1, ease: "vox", bodyEase: "fluid", overshootMult: 0.4, anticipation: false, textPreset: "rise-mask" };
    const durTokens = MT.DURATION_TOKENS || { instant: 0.1, micro: 0.18, snappy: 0.32, base: 0.5, expressive: 0.68, dramatic: 0.92, slow: 1.25 };
    const staggerTokens = MT.STAGGER_TOKENS || { tight: 0.028, normal: 0.048, editorial: 0.072, list: 0.085, grid: 0.064, dramatic: 0.115 };
    const overshootRules = MT.OVERSHOOT_RULES || {};
    const marginX = Math.min(L.margin, Math.round(W * 0.05));
    const marginY = Math.min(L.top, Math.round(H * 0.055));
    const A = {
      slide, root, th, scam, W, H, L, format: S.format, personality,
      dur(tokenOrSec = "base") {
        const raw = typeof tokenOrSec === "number" ? tokenOrSec : (durTokens[tokenOrSec] ?? durTokens.base);
        const mc = S.slide && S.slide.motionCurve;
        const mcScale = mc && Number.isFinite(+mc.durationScale) ? Math.max(0.3, Math.min(2.5, +mc.durationScale)) : 1;
        return +(raw * personality.durScale * mcScale).toFixed(3);
      },
      staggerStep(tokenOrSec = "normal") {
        const raw = typeof tokenOrSec === "number" ? tokenOrSec : (staggerTokens[tokenOrSec] ?? staggerTokens.normal);
        const mc = S.slide && S.slide.motionCurve;
        const mcScale = mc && Number.isFinite(+mc.staggerScale) ? Math.max(0.25, Math.min(2.5, +mc.staggerScale)) : 1;
        return +(raw * personality.staggerScale * mcScale).toFixed(4);
      },
      area: {
        x: marginX, y: marginY, w: W - 2 * marginX, h: H - marginY - Math.min(L.bottom, Math.round(H * 0.055)),
        right: W - marginX, bottom: H - Math.min(L.bottom, Math.round(H * 0.055)),
        left: scam ? Math.min(L.scamLeft, Math.round(W * 0.34)) : marginX,
        camTop: (L.cam ? L.cam[1] : H * 0.68) - 40,
      },
      el(tag, cls, parent, style) {
        const e = document.createElement(tag || "div");
        if (cls) e.className = cls;
        if (style) A.css(e, style);
        (parent || root).appendChild(e);
        return e;
      },
      css(e, st) {
        for (const k in st) {
          const v = st[k];
          e.style[k] = (typeof v === "number" && !/opacity|zIndex|fontWeight|lineHeight|flex/.test(k)) ? v + "px" : v;
        }
        return e;
      },
      box(parent, x, y, w, h, cls) {
        return A.el("div", "abs " + (cls || ""), parent, { left: x, top: y, width: w, height: h });
      },
      text(parent, str, role, cls, style) {
        const e = A.el("div", `t-${role || "body"} ${cls || ""}`, parent, style);
        e.innerHTML = S.rich(str);
        if (!hasFa(str) && /[A-Za-z]/.test(String(str))) e.setAttribute("dir", "ltr");
        return e;
      },
      /* Wrap an editable element in an outer [data-field-wrap=key] container that holds user
         overrides (x, y, scale) from slide.overrides[key], while GSAP entrance animations act on
         the inner node so user transforms and animation transforms never collide. */
      field(key, el) {
        if (!el) return el;
        if (el.parentElement && el.parentElement.dataset && el.parentElement.dataset.fieldWrap === String(key)) {
          return el.parentElement;
        }
        const wrap = document.createElement("div");
        wrap.dataset.fieldWrap = String(key);
        el.dataset.field = String(key);

        const parent = el.parentNode;
        if (parent) parent.insertBefore(wrap, el);
        wrap.appendChild(el);

        const st = el.style;
        const hasInlinePos = !!(st.left || st.top || st.right || st.bottom);
        const isAbs = st.position === "absolute" ||
          (el.classList && (el.classList.contains("abs") || el.classList.contains("frame") || el.classList.contains("col"))) ||
          (typeof getComputedStyle === "function" && el.isConnected && getComputedStyle(el).position === "absolute");

        if (isAbs || hasInlinePos) {
          wrap.style.position = "absolute";
          for (const p of ["left", "top", "right", "bottom", "zIndex"]) {
            if (st[p]) {
              wrap.style[p] = st[p];
              st[p] = "";
            }
          }
          if (st.width) wrap.style.width = st.width;
          if (st.height) wrap.style.height = st.height;
          if (!wrap.style.width && !wrap.style.height && !hasInlinePos) {
            wrap.style.inset = "0";
          }
          el.style.position = "relative";
        } else if (!isAbs) {
          for (const p of ["flex", "flexGrow", "flexShrink", "flexBasis", "alignSelf", "order", "gridArea", "gridColumn", "gridRow", "marginTop", "marginRight", "marginBottom", "marginLeft"]) {
            if (st[p]) {
              wrap.style[p] = st[p];
              st[p] = "";
            }
          }
          if (st.width && (/%$/.test(st.width) || wrap.style.marginLeft === "auto" || wrap.style.marginRight === "auto")) {
            wrap.style.width = st.width;
            st.width = "100%";
          }
        }

        const allOv = slide && slide.overrides;
        const layoutKey = scam ? "SCAM" : "SLIDE";
        let ov = null;
        if (allOv && typeof allOv === "object") {
          if (allOv[layoutKey] && typeof allOv[layoutKey] === "object" && allOv[layoutKey][key] != null) {
            ov = allOv[layoutKey][key];
          } else if (allOv[key] != null) {
            const raw = allOv[key];
            if (raw && typeof raw === "object" && (raw[layoutKey] != null || raw.SLIDE != null || raw.SCAM != null)) {
              ov = raw[layoutKey] || null;
            } else {
              ov = raw;
            }
          }
        }
        if (ov && typeof ov === "object") {
          const x = (ov.x != null && ov.x !== "" && Number.isFinite(+ov.x)) ? +ov.x : 0;
          const y = (ov.y != null && ov.y !== "" && Number.isFinite(+ov.y)) ? +ov.y : 0;
          const sc = (ov.scale != null && ov.scale !== "" && Number.isFinite(+ov.scale)) ? +ov.scale : 1;
          if (x !== 0 || y !== 0 || sc !== 1) {
            wrap.style.transform = `translate(${x}px, ${y}px) scale(${sc})`;
          }
        }

        return wrap;
      },
      /* shrink every text inside box until nothing overflows */
      fit(box, min = 0.55) {
        const kids = [...box.querySelectorAll("[class*='t-']")].concat(box.className.includes("t-") ? [box] : []);
        kids.forEach((k) => (k.dataset.fs = parseFloat(getComputedStyle(k).fontSize)));
        let k = 1;
        document.body.classList.add("measuring");
        const done = () => document.body.classList.remove("measuring");
        const over = () => {
          const kids2 = [...box.children]; if (!kids2.length) return false;
          const st = getComputedStyle(box);
          const pb = parseFloat(st.paddingBottom) || 0, pr = parseFloat(st.paddingRight) || 0, pl = parseFloat(st.paddingLeft) || 0, pt = parseFloat(st.paddingTop) || 0;
          let top = Infinity, bot = -Infinity, wide = 0;
          kids2.forEach((k2) => { top = Math.min(top, k2.offsetTop); bot = Math.max(bot, k2.offsetTop + k2.offsetHeight); wide = Math.max(wide, k2.scrollWidth); });
          return (bot - Math.min(top, pt)) > box.clientHeight - pb + 2 || top < pt - 2 || wide > box.clientWidth - pl - pr + 2;
        };
        while (over() && k > min) {
          k -= 0.04;
          kids.forEach((e) => (e.style.fontSize = (e.dataset.fs * k).toFixed(1) + "px"));
        }
        done();
        return k;
      },
      at(role, i = 0, extra = 0) {
        const m = M[role] || M.body || { delay: 0.2, stagger: 0.08 };
        const mc = S.slide && S.slide.motionCurve;
        const stScale = (mc && Number.isFinite(+mc.staggerScale) ? Math.max(0.25, Math.min(2.5, +mc.staggerScale)) : 1) * personality.staggerScale;
        return base + (m.delay || 0) * Math.min(1.25, personality.durScale) + i * (m.stagger || 0) * stScale + extra;
      },
      /* entrance by role: eyebrow | title | body | card | bubble | badge | image | note
         A1 Motion Audit: token-driven durations, role-aware overshoot rules, and deterministic anticipation/follow-through */
      enter(e, role, i = 0, extra = 0, over) {
        if (!e) return 0;
        if (e.dataset && e.dataset.fieldWrap && e.firstElementChild) e = e.firstElementChild;
        const rule = overshootRules[role] || overshootRules.body || { allowOvershoot: false, maxScale: 1, anticipationPx: 0, followThrough: 0, durToken: "base", defaultEase: "vox" };
        const m = Object.assign({}, M[role] || M.body, over || {});
        const mc = S.slide && S.slide.motionCurve;
        const durScale = (mc && Number.isFinite(+mc.durationScale) ? Math.max(0.3, Math.min(2.5, +mc.durationScale)) : 1) * personality.durScale;
        const baseDur = m.dur != null ? (typeof m.dur === "string" ? (durTokens[m.dur] ?? 0.5) : m.dur) : (durTokens[rule.durToken] ?? 0.55);
        const dur = baseDur * durScale;
        const explicit = over && (over.x != null || over.y != null || over.scale != null || over.clipPath != null || over.filter != null || over.rotation != null);
        let from;
        if (explicit || !S.fx) {
          from = { opacity: 0 };
          if (m.x) from.x = m.x;
          if (m.y) from.y = m.y;
          if (m.scale) from.scale = m.scale;
          if (m.clipPath) from.clipPath = m.clipPath;
          if (m.filter) from.filter = m.filter;
          if (m.rotation) from.rotation = m.rotation;
        } else {
          from = S.fx.from(role, m);
        }
        const t = (over && over.at != null) ? over.at : A.at(role, i, extra);
        const to = Object.assign({ opacity: 1, x: 0, y: 0, scale: 1, rotation: 0 }, S.fx ? S.fx.to(from) : {});
        Object.keys(to).forEach((k) => { if (!(k in from)) delete to[k]; });
        if (over && over.toClipPath) to.clipPath = over.toClipPath;

        // Resolve ease respecting role overshoot rules & active motion personality
        let chosenEase = m.ease || (role === "body" || role === "note" ? personality.bodyEase : personality.ease) || rule.defaultEase;
        if (rule.allowOvershoot && !m.ease && personality.overshootMult >= 0.95) {
          chosenEase = personality.overshootMult >= 1.25 ? "pop" : "spring";
        }
        // Protect non-overshoot roles (body, image, note) from accidental bounce
        if (!rule.allowOvershoot && /^(back|spring|pop|overshoot|elastic)/.test(String(chosenEase || ""))) {
          chosenEase = role === "body" || role === "note" ? "fluid" : "vox";
        }

        // Optional deterministic Anticipation & Follow-Through (never applied to body/image/note)
        const wantAnticipation = Boolean((over && over.anticipation) || (personality.anticipation && rule.anticipationPx > 0));
        const motionKeys = Object.keys(from).filter((k) => k !== "opacity");
        if (wantAnticipation && motionKeys.length > 0 && !from.clipPath) {
          const antDur = Math.max(0.06, Math.min(0.11, dur * 0.18));
          const driveDur = Math.max(0.18, dur - antDur);
          const antPose = {};
          motionKeys.forEach((k) => {
            if (k === "y") antPose.y = from.y + Math.sign(from.y || 1) * rule.anticipationPx;
            else if (k === "x") antPose.x = from.x + Math.sign(from.x || 1) * rule.anticipationPx;
            else if (k === "scale") antPose.scale = Math.max(0.76, from.scale * 0.96);
            else antPose[k] = from[k];
          });
          S.tl.fromTo(e, { opacity: from.opacity ?? 0 }, { opacity: to.opacity ?? 1, duration: Math.max(0.16, dur * 0.52), ease: "power2.out", immediateRender: true }, t);
          const mFrom = {};
          const mTo = {};
          motionKeys.forEach((k) => { mFrom[k] = from[k]; mTo[k] = to[k]; });
          S.tl.fromTo(e, mFrom, Object.assign({}, antPose, { duration: antDur, ease: "power1.in", immediateRender: true }), t);
          S.tl.to(e, Object.assign(mTo, { duration: driveDur, ease: S.ease(chosenEase) }), t + antDur);
        } else if ("opacity" in from && motionKeys.length > 0) {
          // Decouple opacity settle (~54% of duration) from motion settle for crisp, non-ghostly entrances
          const opDur = Math.max(0.18, Math.min(dur * 0.65, dur * 0.54));
          S.tl.fromTo(e, { opacity: from.opacity }, { opacity: to.opacity ?? 1, duration: opDur, ease: "power2.out", immediateRender: true }, t);
          const mFrom = {};
          const mTo = {};
          motionKeys.forEach((k) => { mFrom[k] = from[k]; mTo[k] = to[k]; });
          S.tl.fromTo(e, mFrom, Object.assign(mTo, { duration: dur, ease: S.ease(chosenEase), immediateRender: true }), t);
        } else {
          S.tl.fromTo(e, from, Object.assign(to, { duration: dur, ease: S.ease(chosenEase), immediateRender: true }), t);
        }

        e.dataset.end = (t + dur).toFixed(3);
        if (S.fx) {
          if (role === "title") S.fx.cue(t, "whoosh", e.textContent.slice(0, 30));
          else if (role === "bubble") S.fx.cue(t, "bubble", e.textContent.slice(0, 30), { index: i, pitch: i });
          else if (role === "badge") S.fx.cue(t, "ding", e.textContent.slice(0, 30), { index: i, pitch: i });
          else if (role === "card") S.fx.cue(t, "card", e.textContent.slice(0, 30), { index: i, pitch: i });
          else if (role === "eyebrow") S.fx.cue(t, "tick", e.textContent.slice(0, 30));
          else if (role === "image") S.fx.cue(t, "shutter", e.textContent.slice(0, 30));
          else if (role === "bar") S.fx.cue(t, "bar", e.textContent.slice(0, 30), { index: i, pitch: i });
          else if (role === "note") S.fx.cue(t, "whoosh-subtle", e.textContent.slice(0, 30));
        }
        return t + dur;
      },

      /* A2: Dedicated deterministic RTL/LTR Typewriter with animated cursor (preserves Persian cursive ligatures) */
      typewriter(e, opts = {}) {
        if (!e) return 0;
        if (e.dataset && e.dataset.fieldWrap && e.firstElementChild) e = e.firstElementChild;
        const fullText = String(opts.text ?? e.textContent ?? "");
        const graphemes = splitGraphemes(fullText);
        const at = opts.at ?? A.at(opts.role || "title", 0, opts.extra || 0);
        const dur = opts.dur != null ? A.dur(opts.dur) : Math.max(0.45, Math.min(2.4, graphemes.length * 0.036 * personality.durScale));
        e.textContent = "";
        const txtSpan = document.createElement("span");
        txtSpan.className = "k-type-text";
        const cursor = document.createElement("span");
        cursor.className = "k-cursor";
        cursor.textContent = opts.cursorChar || "▍";
        e.appendChild(txtSpan);
        if (opts.cursor !== false) e.appendChild(cursor);

        const proxy = { n: 0 };
        const renderN = (val) => {
          const count = Math.max(0, Math.min(graphemes.length, Math.round(val)));
          txtSpan.textContent = graphemes.slice(0, count).join("");
        };
        renderN(0);
        S.tl.fromTo(e, { opacity: 0.99 }, { opacity: 1, duration: 0.01, immediateRender: true }, at);
        S.tl.to(proxy, {
          n: graphemes.length,
          duration: dur,
          ease: "none",
          onUpdate: () => renderN(proxy.n),
        }, at);
        if (opts.cursor !== false) {
          S.tl.fromTo(cursor, { opacity: 1 }, { opacity: 0, duration: 0.25, repeat: Math.max(2, Math.round(dur * 2.2)), yoyo: true, ease: "steps(1)" }, at);
          S.tl.to(cursor, { opacity: 0, duration: 0.16 }, at + dur + 0.35);
        }
        const end = at + dur;
        e.dataset.end = end.toFixed(3);
        if (S.fx) S.fx.cue(at, "tick", fullText.slice(0, 28));
        return end;
      },

      /* A2: Explicit RTL-safe Highlight, Underline, and Strikethrough text sweeps */
      sweepHighlight(e, opts = {}) {
        if (!e) return 0;
        if (e.dataset && e.dataset.fieldWrap && e.firstElementChild) e = e.firstElementChild;
        e.classList.add("hl");
        if (opts.color) e.style.backgroundImage = `linear-gradient(${S.color(opts.color)}, ${S.color(opts.color)})`;
        const at = opts.at ?? A.at("body", 0, 0.06);
        const dur = opts.dur != null ? A.dur(opts.dur) : A.dur("base");
        S.tl.fromTo(e, { backgroundSize: "0% 44%" }, { backgroundSize: "100% 44%", duration: dur, ease: S.ease(opts.ease || "vox"), immediateRender: true }, at);
        if (S.fx) S.fx.cue(at, "swish", "highlight");
        return at + dur;
      },
      sweepUnderline(e, opts = {}) {
        if (!e) return 0;
        if (e.dataset && e.dataset.fieldWrap && e.firstElementChild) e = e.firstElementChild;
        e.classList.add("ul-on");
        const c = S.color(opts.color || "accent");
        e.style.backgroundImage = `linear-gradient(${c}, ${c})`;
        const at = opts.at ?? A.at("body", 0, 0.08);
        const dur = opts.dur != null ? A.dur(opts.dur) : A.dur("base");
        S.tl.fromTo(e, { backgroundSize: "0% 6px" }, { backgroundSize: "100% 6px", duration: dur, ease: S.ease(opts.ease || "expo"), immediateRender: true }, at);
        return at + dur;
      },
      sweepStrike(e, opts = {}) {
        if (!e) return 0;
        if (e.dataset && e.dataset.fieldWrap && e.firstElementChild) e = e.firstElementChild;
        e.classList.add("strike");
        const c = S.color(opts.color || "danger");
        e.style.backgroundImage = `linear-gradient(${c}, ${c})`;
        const at = opts.at ?? A.at("body", 0, 0.12);
        const dur = opts.dur != null ? A.dur(opts.dur) : A.dur("snappy");
        S.tl.fromTo(e, { backgroundSize: "0% 5px" }, { backgroundSize: "100% 5px", duration: dur, ease: S.ease(opts.ease || "sharp"), immediateRender: true }, at);
        if (S.fx) S.fx.cue(at, "whoosh-subtle", "strike");
        return at + dur;
      },

      /* A2: Counting inline numbers embedded inside Persian/English prose deterministically */
      countText(e, opts = {}) {
        if (!e) return 0;
        if (e.dataset && e.dataset.fieldWrap && e.firstElementChild) e = e.firstElementChild;
        const at = opts.at ?? A.at(opts.role || "title", 0, opts.extra || 0);
        const dur = opts.dur != null ? A.dur(opts.dur) : A.dur("dramatic");
        const html = String(e.innerHTML || "");
        const numSpecs = [];
        const replaced = html.replace(/(<[^>]+>)|([۰-۹0-9][۰-۹0-9٬,٫.]*)/g, (m, tag, numStr) => {
          if (tag) return tag;
          const target = toNum(numStr);
          if (!Number.isFinite(target)) return m;
          const dec = decOf(numStr);
          const useFa = /[۰-۹]/.test(numStr) || hasFa(e.textContent || "");
          const idx = numSpecs.length;
          numSpecs.push({ target, dec, useFa, thousands: /[٬,]/.test(numStr) || Math.abs(target) >= 1000 });
          return `<span class="k-count-num" data-kc="${idx}">${numStr}</span>`;
        });
        if (!numSpecs.length) return A.enter(e, opts.role || "title", 0, opts.extra || 0);
        e.innerHTML = replaced;
        const nodes = [...e.querySelectorAll(".k-count-num")];
        const proxy = { p: 0 };
        const update = () => {
          for (let i = 0; i < numSpecs.length; i += 1) {
            const sp = numSpecs[i];
            const val = sp.target * proxy.p;
            const formatted = sp.useFa ? S.fmt(val, sp.dec, sp.thousands) : val.toFixed(sp.dec);
            if (nodes[i]) nodes[i].textContent = formatted;
          }
        };
        update();
        A.enter(e, opts.role || "title", 0, 0, { at, dur: Math.min(0.45, dur) });
        S.tl.to(proxy, { p: 1, duration: dur, ease: S.ease(opts.ease || "power3"), onUpdate: update }, at);
        const end = at + dur;
        e.dataset.end = end.toFixed(3);
        return end;
      },

      /* A2: Kinetic RTL-safe Persian & English Typography Suite (14 Presets)
         NEVER splits Persian/Arabic cursive words into individual letters (preserves shaping & ZWNJ). */
      kinetic(e, opts = {}) {
        if (!e) return 0;
        if (e.dataset && e.dataset.fieldWrap && e.firstElementChild) e = e.firstElementChild;
        const slideTextMotion = (S.slide && (S.slide.textMotion || S.slide.text_motion)) || "";
        const presetTable = MT.TEXT_ANIMATION_PRESETS || {};
        let mode = opts.mode || (slideTextMotion && slideTextMotion !== "auto" ? slideTextMotion : "") || personality.textPreset || "rise-mask";
        if (!presetTable[mode] && !["rise-mask", "glide-rtl", "editorial-blur", "pop-clean", "cascade-3d"].includes(mode)) {
          mode = "rise-mask";
        }
        const presetSpec = presetTable[mode] || {};
        const at = opts.at ?? A.at(opts.role || "title", 0, opts.extra || 0);

        if (mode === "typewriter") {
          return A.typewriter(e, Object.assign({}, opts, { at }));
        }
        if (mode === "counting-text") {
          return A.countText(e, Object.assign({}, opts, { at }));
        }

        const dur = opts.dur != null ? A.dur(opts.dur) : A.dur(presetSpec.dur || "base");
        const stagger = opts.stagger != null
          ? A.staggerStep(opts.stagger)
          : A.staggerStep(presetSpec.stagger || (mode === "glide-rtl" ? "normal" : "tight"));
        const unit = opts.unit || presetSpec.unit || "word";

        let fromBase;
        let easeName = opts.ease || presetSpec.ease;
        if (mode === "editorial-blur") {
          fromBase = { y: opts.y ?? 14, x: opts.x ?? 0, scale: opts.scale ?? 0.985, filter: "blur(8px)" };
          easeName = easeName || "expo";
        } else if (mode === "glide-rtl") {
          fromBase = { x: opts.x ?? 26, y: opts.y ?? 0, scale: opts.scale ?? 1 };
          easeName = easeName || "expo";
        } else if (mode === "pop-clean") {
          fromBase = { y: opts.y ?? 16, x: opts.x ?? 0, scale: opts.scale ?? 0.88 };
          easeName = easeName || "spring";
        } else if (mode === "cascade-3d") {
          fromBase = { y: opts.y ?? 18, x: opts.x ?? 0, scale: opts.scale ?? 0.97, rotationX: -24 };
          easeName = easeName || "power4";
        } else if (mode === "line-curtain") {
          fromBase = { y: opts.y ?? 38, x: 0, clipPath: "inset(0% 0% 100% 0%)" };
          easeName = easeName || "vox";
        } else if (mode === "letter-wave") {
          fromBase = { y: opts.y ?? 22, x: 0, scale: opts.scale ?? 0.92, rotation: -4 };
          easeName = easeName || "spring";
        } else if (mode === "split-reveal") {
          fromBase = { clipPath: "inset(0% 50% 0% 50%)", scale: 0.98 };
          easeName = easeName || "cinematic";
        } else if (mode === "punch-scale") {
          fromBase = { y: opts.y ?? 12, scale: opts.scale ?? 0.82 };
          easeName = easeName || "overshoot";
        } else {
          // rise-mask / highlight-sweep / underline-draw / strike-through
          fromBase = { y: opts.y ?? 20, x: opts.x ?? 0, scale: opts.scale ?? 0.98 };
          easeName = easeName || "power4";
        }
        const ease = S.ease(easeName);

        e.innerHTML = wrapHtmlWords(e.innerHTML, unit);
        const units = [...e.querySelectorAll(".k-unit")];
        if (!units.length) return A.enter(e, opts.role || "title", 0, opts.extra || 0);

        if (mode === "cascade-3d") e.style.perspective = "900px";
        const opDur = Math.max(0.15, dur * 0.5);
        const effStagger = unit === "auto" && units.length > 14 ? Math.min(stagger, 0.022) : stagger;

        units.forEach((w, idx) => {
          const wt = at + idx * effStagger;
          if (mode === "cascade-3d") w.style.transformOrigin = "50% 100%";
          S.tl.fromTo(w, { opacity: 0 }, { opacity: 1, duration: opDur, ease: "power2.out", immediateRender: true }, wt);
          const toVars = { y: 0, x: 0, scale: 1, rotation: 0, duration: dur, ease, immediateRender: true };
          if ("filter" in fromBase) toVars.filter = "blur(0px)";
          if ("rotationX" in fromBase) toVars.rotationX = 0;
          if ("clipPath" in fromBase) toVars.clipPath = "inset(0% 0% 0% 0%)";
          S.tl.fromTo(w, fromBase, toVars, wt);
        });
        let end = at + Math.max(0, units.length - 1) * effStagger + dur;

        if (mode === "highlight-sweep") {
          end = Math.max(end, A.sweepHighlight(e, { at: end - dur * 0.35, color: opts.highlightColor }));
        } else if (mode === "underline-draw") {
          end = Math.max(end, A.sweepUnderline(e, { at: end - dur * 0.35, color: opts.underlineColor }));
        } else if (mode === "strike-through") {
          end = Math.max(end, A.sweepStrike(e, { at: end - dur * 0.25, color: opts.strikeColor }));
        }

        e.dataset.end = end.toFixed(3);
        if (S.fx) S.fx.cue(at, "whoosh", e.textContent.slice(0, 30));
        return end;
      },
      /* Animated accent rule / sweep line */
      sweepLine(parent, opts = {}) {
        const cls = "rule " + (opts.cls || "");
        const r = A.el("div", cls.trim(), parent, Object.assign({
          width: (opts.width || 160) + "px",
          height: (opts.height || 6) + "px",
          transformOrigin: opts.origin || (A.scam ? "100% 50%" : "50% 50%"),
        }, opts.style || {}));
        const at = opts.at ?? A.at("body", 1);
        S.tl.fromTo(r, { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, duration: opts.dur ? A.dur(opts.dur) : A.dur("base"), ease: S.ease(opts.ease || "expo"), immediateRender: true }, at);
        if (S.fx) S.fx.cue(at, "whoosh-subtle", "line");
        return r;
      },
      /* Imperceptible secondary ambient optical glide (never jittery) */
      drift(el, opts = {}) {
        if (!el) return;
        const dx = opts.x ?? 2.0, dy = opts.y ?? 1.2, dur = opts.dur ?? 18;
        S.amb.fromTo(el, { x: -dx, y: -dy }, { x: dx, y: dy, duration: dur, ease: "sine.inOut", yoyo: true, repeat: 99, force3D: true }, 0);
      },
      /* A1: Enhanced Stagger System (supports start | end | center | edges & ease curves, backward-compatible with extra number) */
      stagger(list, role, extraOrOpts = 0) {
        if (!Array.isArray(list) || !list.length) return 0;
        const opts = (typeof extraOrOpts === "object" && extraOrOpts !== null) ? extraOrOpts : { extra: Number(extraOrOpts) || 0 };
        const n = list.length;
        const fromMode = opts.from || "start";
        const baseStep = opts.step != null ? A.staggerStep(opts.step) : A.staggerStep("list");
        const baseAt = opts.at != null ? opts.at : A.at(role, 0, opts.extra || 0);
        let maxEnd = baseAt;
        for (let i = 0; i < n; i += 1) {
          let orderIdx = i;
          if (fromMode === "end") orderIdx = (n - 1) - i;
          else if (fromMode === "center") orderIdx = Math.abs(i - (n - 1) / 2);
          else if (fromMode === "edges") orderIdx = Math.min(i, (n - 1) - i);
          const frac = n > 1 ? orderIdx / (n - 1) : 0;
          const curved = opts.curve === "ease-out" ? Math.sqrt(frac) * (n - 1) : orderIdx;
          const itemAt = baseAt + curved * baseStep;
          const end = A.enter(list[i], role, i, 0, Object.assign({}, opts.over || {}, { at: itemAt }));
          if (end > maxEnd) maxEnd = end;
        }
        return maxEnd;
      },
      /* number counting up; tabular Persian digits; scale .92 -> 1 */
      count(e, o) {
        if (e && e.dataset && e.dataset.fieldWrap && e.firstElementChild) e = e.firstElementChild;
        const m = M.number || { delay: 0.2, dur: 1.15, scale: 0.92, ease: "power3" };
        const to = toNum(o.to), from = toNum(o.from ?? 0), dec = o.decimals ?? decOf(o.to), th1 = o.thousands !== false;
        const pre = o.prefix ?? "", suf = o.suffix ?? "";
        const html = (v) => {
          const n = `<bdi dir="ltr" class="num-core">${esc(fa(hasFa(pre) ? "" : pre))}${S.fmt(v, dec, th1)}${esc(fa(hasFa(suf) ? "" : suf))}</bdi>`;
          return (hasFa(pre) ? `<span class="num-word">${esc(pre)}</span> ` : "") + n + (hasFa(suf) ? ` <span class="num-word">${esc(suf)}</span>` : "");
        };
        e.classList.add("num");
        e.innerHTML = html(to);
        const core = e.querySelector(".num-core");
        if (core) core.style.minWidth = (core.getBoundingClientRect().width || 120) + "px";
        const obj = { v: from };
        const t = o.at ?? A.at("number");
        const dur = o.dur ?? m.dur;
        S.tl.to(obj, {
          v: to, duration: dur, ease: S.ease(o.ease || m.ease),
          onUpdate: () => {
            const c = e.querySelector(".num-core");
            if (c) c.innerHTML = esc(fa(hasFa(pre) ? "" : pre)) + S.fmt(obj.v, dec, th1) + esc(fa(hasFa(suf) ? "" : suf));
          },
        }, t);
        if (core) core.innerHTML = esc(fa(hasFa(pre) ? "" : pre)) + S.fmt(from, dec, th1) + esc(fa(hasFa(suf) ? "" : suf));
        if (o.enter !== false) {
          S.tl.from(e, { opacity: 0, scale: o.scale ?? m.scale ?? 1, duration: Math.min(0.55, dur), ease: S.ease(o.enterEase || m.ease), immediateRender: true }, t);
        }
        e.dataset.end = (t + dur).toFixed(3);
        if (S.fx) { S.fx.cue(t, "count-start", String(o.to)); S.fx.cue(t + dur * 0.85, "count-end", String(o.to)); }
        return t + dur;
      },
      /* image in a rounded frame + counter-scale reveal + continuous silky Ken Burns inside the frame */
      image(parent, src, x, y, w, h, o = {}) {
        const rad = o.radius ?? L.radius;
        const f = A.el("div", "frame" + (o.shadow === false ? "" : " shadow") + (o.border ? " bordered" : ""), parent,
          { left: x, top: y, width: w, height: h, borderRadius: rad + "px" });
        if (o.border) f.style.setProperty("--frame-border", S.color(o.border));
        const inner = A.el("div", "frame-inner", f);
        const cam = A.el("div", "frame-cam", inner);
        if (src) {
          const im = A.el("img", "", cam);
          im.src = src; im.alt = "";
          im.style.objectFit = o.fit || "cover";
          if (o.focus) im.style.objectPosition = o.focus;
          im.onerror = () => { im.remove(); A.placeholder(cam, src); };
          S._imgs.push(im);
          A._imgIndex = (A._imgIndex || 0) + 1;
          let mo = S.fx ? S.fx.imageMotion(o.motion, A._imgIndex) : o.motion;
          if (mo === "depth") { if (o.depth !== false && w * h > 200000 && S.fx) S.fx.depth(src); mo = "breathe"; }
          A.kenburns(im, mo);
        } else A.placeholder(cam, o.name || "");
        if (o.dim) A.el("div", "dim", inner, { opacity: o.dim });
        if (o.enter !== false) {
          const entAt = o.at ?? A.at("image", 0, o.delay || 0);
          let enterOver = o.enterOver || null;
          if (o.reveal === "wipe") {
            enterOver = Object.assign({
              clipPath: `inset(0% 0% 0% 100% round ${rad}px)`,
              toClipPath: `inset(0% 0% 0% 0% round ${rad}px)`,
              dur: 0.72,
              ease: "expo",
              at: entAt,
            }, enterOver || {});
          } else if (o.reveal === "curtain") {
            enterOver = Object.assign({
              clipPath: `inset(7% 7% 7% 7% round ${rad}px)`,
              toClipPath: `inset(0% 0% 0% 0% round ${rad}px)`,
              dur: 0.75,
              ease: "power4",
              at: entAt,
            }, enterOver || {});
          } else if (o.delay) {
            enterOver = Object.assign({ at: entAt }, enterOver || {});
          }
          A.enter(f, "image", 0, o.delay || 0, enterOver);
          // Smooth inner optical counter-scale settle (separate .frame-cam node avoids GSAP conflict with .frame & <img>)
          S.tl.fromTo(cam, { scale: S.capZoom(o.counterScale || 1.06) }, { scale: 1, duration: 0.92, ease: S.ease("power4"), immediateRender: true }, entAt);
        }
        return f;
      },
      placeholder(parent, name) {
        const p = A.el("div", "ph", parent);
        p.innerHTML = `<svg viewBox="0 0 64 48" width="22%"><rect x="2" y="2" width="60" height="44" rx="6" fill="none" stroke="#5a5a5a" stroke-width="3"/><path d="M8 40 L24 22 L34 32 L42 25 L56 40 Z" fill="#4a4a4a"/><circle cx="46" cy="14" r="5" fill="#7a6d2a"/></svg>` +
          (name ? `<div class="ph-name">${esc(String(name).split("/").pop())}</div>` : "");
        return p;
      },
      kenburns(im, motion) {
        const kb = th.kenburns || { period: 28, scale: 0.036, x: -9 }; motion = motion || "breathe";
        if (motion === "none") return;
        const period = Math.max(24, Number(kb.period) || 28);
        const sc = Math.min(S.ZOOM_CAP - 1, Math.min(0.042, Number(kb.scale) || 0.034));
        let a = { scale: 1.0, x: 0, y: 0 }, b = { scale: S.capZoom(1 + sc), x: -7, y: -3 };
        if (motion === "zoom-out") { a = { scale: S.capZoom(1 + sc + 0.006), x: 4, y: 2 }; b = { scale: 1.004, x: -4, y: -2 }; }
        else if (motion === "pan-left") { a = { scale: S.capZoom(1.04), x: 16, y: 0 }; b = { scale: S.capZoom(1.04), x: -16, y: -2 }; }
        else if (motion === "pan-right") { a = { scale: S.capZoom(1.04), x: -16, y: 0 }; b = { scale: S.capZoom(1.04), x: 16, y: 2 }; }
        else if (motion === "gentle-drift") { a = { scale: S.capZoom(1.016), x: -9, y: 4 }; b = { scale: S.capZoom(1.036), x: 9, y: -4 }; }
        S.amb.fromTo(im, a, Object.assign(b, { duration: period, ease: "sine.inOut", yoyo: true, repeat: 99, force3D: true }), 0);
      },
      color: (c) => S.color(c),
      svg(parent, x, y, w, h, viewBox) {
        const ns = "http://www.w3.org/2000/svg", e = document.createElementNS(ns, "svg");
        e.setAttribute("width", w); e.setAttribute("height", h); e.setAttribute("viewBox", viewBox || `0 0 ${w} ${h}`);
        Object.assign(e.style, { position: "absolute", left: x + "px", top: y + "px", overflow: "visible" });
        (parent || root).appendChild(e); return e;
      },
      svgEl(svg, tag, attrs) {
        const e = document.createElementNS("http://www.w3.org/2000/svg", tag);
        for (const k in attrs || {}) e.setAttribute(k, attrs[k]);
        svg.appendChild(e); return e;
      },
      draw(el, at, dur = 0.9, ease = "power3") {
        return A.drawPath(el, { at, dur, ease });
      },
      /* A3: Deterministic SVG Path Draw-On (works in browser & headless Node via analytical length estimation) */
      drawPath(el, opts = {}) {
        if (!el) return 0;
        const at = opts.at ?? A.at("body");
        const dur = typeof opts.dur === "string" ? A.dur(opts.dur) : (opts.dur ?? A.dur("expressive"));
        const ease = opts.ease || "vox";
        let L1 = Number(opts.length) || 0;
        if (!L1 && typeof el.getTotalLength === "function") {
          try { L1 = el.getTotalLength(); } catch (_) { L1 = 0; }
        }
        if (!L1) L1 = S.shape.estimateLength(el);
        el.style.strokeDasharray = String(L1);
        el.style.strokeDashoffset = String(L1);
        S.tl.fromTo(el, { strokeDashoffset: L1 }, { strokeDashoffset: 0, duration: dur, ease: S.ease(ease), immediateRender: true }, at);
        if (S.fx && opts.cue !== false) S.fx.cue(at, "swish", "draw");
        return at + dur;
      },
      /* A3: Licence-safe deterministic SVG Path Morph (equal-vertex point interpolation driven by Stage.onSeek) */
      morphPath(pathEl, fromD, toD, opts = {}) {
        if (!pathEl) return 0;
        const at = opts.at ?? A.at("body");
        const dur = typeof opts.dur === "string" ? A.dur(opts.dur) : (opts.dur ?? A.dur("expressive"));
        const samples = Math.max(8, Math.min(96, Number(opts.samples) || 24));
        const closed = opts.closed !== undefined ? Boolean(opts.closed) : /Z\s*$/i.test(String(toD || fromD || ""));
        const ptsA = S.shape.samplePath(fromD, samples);
        const ptsB = S.shape.samplePath(toD, samples);
        const easeFn = S.shape.easeProgress(opts.ease || "vox");
        const applyAt = (t) => {
          const u = dur > 0 ? Math.max(0, Math.min(1, (t - at) / dur)) : (t >= at ? 1 : 0);
          const p = easeFn(u);
          pathEl.setAttribute("d", S.shape.interpPointsToPath(ptsA, ptsB, p, closed));
        };
        applyAt(0);
        S.onSeek(applyAt);
        // Register span on timeline so slide duration includes morph completion
        S.tl.to({ _m: 0 }, { _m: 1, duration: dur, ease: "none" }, at);
        return at + dur;
      },
      /* A3: Deterministic Mask Wipe & Liquid Blob Reveal */
      maskWipe(el, direction = "wipe-rtl", opts = {}) {
        if (!el) return 0;
        if (el.dataset && el.dataset.fieldWrap && el.firstElementChild) el = el.firstElementChild;
        const at = opts.at ?? A.at("image");
        const dur = typeof opts.dur === "string" ? A.dur(opts.dur) : (opts.dur ?? A.dur("expressive"));
        const ease = opts.ease || "vox";
        const rad = opts.radius != null ? ` round ${opts.radius}px` : "";
        let fromClip = `inset(0% 0% 0% 100%${rad})`;
        let toClip = `inset(0% 0% 0% 0%${rad})`;
        if (direction === "wipe-ltr" || direction === "ltr") {
          fromClip = `inset(0% 100% 0% 0%${rad})`;
        } else if (direction === "wipe-up" || direction === "up") {
          fromClip = `inset(100% 0% 0% 0%${rad})`;
        } else if (direction === "wipe-down" || direction === "down") {
          fromClip = `inset(0% 0% 100% 0%${rad})`;
        } else if (direction === "circle-reveal" || direction === "circle") {
          fromClip = "circle(0% at 50% 50%)";
          toClip = "circle(78% at 50% 50%)";
        } else if (direction === "diagonal-cut" || direction === "diagonal") {
          fromClip = "polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)";
          toClip = "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)";
        } else if (direction === "blob-organic" || direction === "blob") {
          return A.blobReveal(el, opts);
        }
        S.tl.fromTo(el, { clipPath: fromClip, opacity: 0.96 }, { clipPath: toClip, opacity: 1, duration: dur, ease: S.ease(ease), immediateRender: true }, at);
        return at + dur;
      },
      /* A3: Organic liquid/blob clip-path reveal driven deterministically by Stage.onSeek */
      blobReveal(el, opts = {}) {
        if (!el) return 0;
        if (el.dataset && el.dataset.fieldWrap && el.firstElementChild) el = el.firstElementChild;
        const at = opts.at ?? A.at("image");
        const dur = typeof opts.dur === "string" ? A.dur(opts.dur) : (opts.dur ?? A.dur("dramatic"));
        const seedNum = Number(opts.seed) || 17;
        const lobes = Math.max(5, Math.min(12, Number(opts.lobes) || 7));
        const easeFn = S.shape.easeProgress(opts.ease || "cinematic");
        const applyAt = (t) => {
          const u = dur > 0 ? Math.max(0, Math.min(1, (t - at) / dur)) : (t >= at ? 1 : 0);
          const p = easeFn(u);
          if (p <= 0.001) {
            el.style.clipPath = "circle(0% at 50% 50%)";
            return;
          }
          if (p >= 0.999) {
            el.style.clipPath = "circle(82% at 50% 50%)";
            return;
          }
          const pts = [];
          const steps = 20;
          const baseR = p * 78;
          const wobble = Math.sin(p * Math.PI) * 11;
          for (let i = 0; i < steps; i += 1) {
            const ang = (i / steps) * Math.PI * 2;
            const r = Math.max(0, baseR + wobble * Math.sin(ang * lobes + seedNum * 1.7 + p * 3.1));
            const px = (50 + Math.cos(ang) * r).toFixed(1);
            const py = (50 + Math.sin(ang) * r).toFixed(1);
            pts.push(`${px}% ${py}%`);
          }
          el.style.clipPath = `polygon(${pts.join(", ")})`;
        };
        applyAt(0);
        S.onSeek(applyAt);
        S.tl.to({ _b: 0 }, { _b: 1, duration: dur, ease: "none" }, at);
        return at + dur;
      },
      /* A3: Line-Art SVG Cascade Reveal across all drawable primitives inside an SVG */
      lineArtReveal(svgEl, opts = {}) {
        if (!svgEl) return 0;
        const nodes = [...svgEl.querySelectorAll("path,line,polyline,polygon,circle,ellipse,rect")];
        const at0 = opts.at ?? A.at("body");
        const step = typeof opts.stagger === "string" ? A.staggerStep(opts.stagger) : (opts.stagger ?? A.staggerStep("editorial"));
        const dur = typeof opts.dur === "string" ? A.dur(opts.dur) : (opts.dur ?? A.dur("base"));
        let endMax = at0;
        nodes.forEach((node, idx) => {
          const tEnd = A.drawPath(node, { at: at0 + idx * step, dur, ease: opts.ease || "vox", cue: idx === 0 });
          if (tEnd > endMax) endMax = tEnd;
        });
        return endMax;
      },
      pop(el, at, i = 0) { return A.enter(el, "badge", i, 0, at != null ? { at } : null); },
      list: (v) => (S.T ? S.T.list(v) : (Array.isArray(v) ? v : [])),
      data: (v) => (S.T ? S.T.data(v) : (Array.isArray(v) ? v : [])),
      tone: (v) => (S.T ? S.T.tone(v) : null),
    };
    return A;
  }

  /* A3: Pure-math licence-safe SVG geometry helpers */
  S.shape = {
    estimateLength(el) {
      if (!el) return 400;
      const tag = String(el.tagName || "").toLowerCase();
      const attr = (k) => Number(el.getAttribute ? el.getAttribute(k) : 0) || 0;
      if (tag === "circle") return Math.max(10, 2 * Math.PI * (attr("r") || 40));
      if (tag === "ellipse") {
        const a = attr("rx") || 60, b = attr("ry") || 40;
        return Math.max(10, Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b))));
      }
      if (tag === "rect") return Math.max(10, 2 * ((attr("width") || 100) + (attr("height") || 60)));
      if (tag === "line") return Math.max(10, Math.hypot(attr("x2") - attr("x1"), attr("y2") - attr("y1")));
      const d = (el.getAttribute && (el.getAttribute("d") || el.getAttribute("points"))) || "";
      const pts = S.shape.extractPathPoints(d);
      if (pts.length < 2) return 480;
      let total = 0;
      for (let i = 1; i < pts.length; i += 1) {
        total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      }
      return Math.max(20, Math.round(total));
    },
    extractPathPoints(d) {
      const nums = (String(d || "").match(/[-+]?(?:\d+\.\d+|\d+|\.\d+)/g) || []).map(Number);
      const pts = [];
      for (let i = 0; i < nums.length - 1; i += 2) {
        if (Number.isFinite(nums[i]) && Number.isFinite(nums[i + 1])) pts.push([nums[i], nums[i + 1]]);
      }
      return pts;
    },
    samplePath(d, count = 24) {
      const pts = S.shape.extractPathPoints(d);
      if (!pts.length) return Array.from({ length: count }, () => [0, 0]);
      if (pts.length === 1) return Array.from({ length: count }, () => [pts[0][0], pts[0][1]]);
      const cum = [0];
      for (let i = 1; i < pts.length; i += 1) {
        cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      }
      const total = cum[cum.length - 1] || 1;
      const out = [];
      for (let k = 0; k < count; k += 1) {
        const target = (k / Math.max(1, count - 1)) * total;
        let seg = 0;
        while (seg < cum.length - 2 && cum[seg + 1] < target) seg += 1;
        const span = (cum[seg + 1] - cum[seg]) || 1;
        const f = Math.max(0, Math.min(1, (target - cum[seg]) / span));
        out.push([
          pts[seg][0] + (pts[seg + 1][0] - pts[seg][0]) * f,
          pts[seg][1] + (pts[seg + 1][1] - pts[seg][1]) * f,
        ]);
      }
      return out;
    },
    interpPointsToPath(ptsA, ptsB, p, closed = false) {
      const n = Math.min(ptsA.length, ptsB.length);
      if (!n) return "";
      const parts = [];
      for (let i = 0; i < n; i += 1) {
        const x = ptsA[i][0] + (ptsB[i][0] - ptsA[i][0]) * p;
        const y = ptsA[i][1] + (ptsB[i][1] - ptsA[i][1]) * p;
        parts.push((i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1));
      }
      if (closed) parts.push("Z");
      return parts.join(" ");
    },
    easeProgress(name) {
      const e = S.ease(name || "vox");
      if (typeof e === "function") return e;
      return (u) => 1 - Math.pow(1 - Math.max(0, Math.min(1, u)), 3);
    },
  };

  S.color = function (c) {
    const C = S.theme.colors;
    const alias = { yellow: "accent", red: "danger", white: "text", gray: "muted", grey: "muted", green: "good", "زرد": "accent", "قرمز": "danger", "سفید": "text", "خاکستری": "muted", "سبز": "good" };
    if (!c) return C.text;
    if (alias[c]) c = alias[c];
    return C[c] || c;
  };

  /* ---------------------------------------------------------------- load / seek */
  S._imgs = [];
  S.load = async function (slide, opts = {}) {
    if (opts.theme) S.useTheme(opts.theme);
    const th = S.theme;
    S.slide = slide = Object.assign({}, slide || {});
    if (S.tl) S.tl.kill(); if (S.amb) S.amb.kill();
    S.tl = gsap.timeline({ paused: true }); S.amb = gsap.timeline({ paused: true });
    S._imgs = [];
    S._seekHooks = [];
    S._mascots = [];
    S._liveVoiceActive = false;
    S._clipSeq = 0;

    S.setFormat(opts.format || slide.format || S.format || "16:9");
    const reqFps = opts.fps || slide.fps || (slide.puppet && slide.puppet.performance && slide.puppet.performance.fps);
    if (reqFps) S.fps = Math.max(12, Math.min(120, Math.round(Number(reqFps) || 30)));
    const stage = document.getElementById("stage");
    stage.innerHTML = "";
    const sceneBgPreset = (slide.puppet && slide.puppet.scene && slide.puppet.scene.background) || (typeof slide.background === "string" ? slide.background : "");
    const isTrans = !!(opts.transparent || slide.transparent || S._transparent || sceneBgPreset === "transparent");
    stage.classList.toggle("stage-transparent", isTrans);
    document.body.classList.toggle("stage-transparent", isTrans);
    document.documentElement.classList.toggle("stage-transparent", isTrans);

    const layout = (slide.layout || "SLIDE").toUpperCase();
    stage.className = "layout-" + layout.toLowerCase() + (isTrans ? " stage-transparent" : "");
    stage.setAttribute("data-theme-mode", (th.colors && th.colors.isDark === false) ? "light" : "dark");

    // background
    const bg = document.createElement("div"); bg.className = "bg"; stage.appendChild(bg);
    const bgs = slide.background || {};
    const isNamedPuppetBg = typeof bgs === "string" && Boolean(MT.PUPPET_BACKGROUNDS && MT.PUPPET_BACKGROUNDS[bgs.trim().toLowerCase()]);
    const bgimg = isNamedPuppetBg ? null : (typeof bgs === "string" ? bgs : (bgs.image || slide.bg_image));
    if (bgs && typeof bgs === "object" && bgs.color) bg.style.background = S.color(bgs.color);
    if (bgimg) {
      const wrap = document.createElement("div"); wrap.className = "bgimg"; stage.appendChild(wrap);
      const im = document.createElement("img"); im.src = bgimg; wrap.appendChild(im); S._imgs.push(im);
      im.onerror = () => wrap.remove();
      const d = document.createElement("div"); d.className = "dim"; d.style.opacity = bgs.dim ?? slide.bg_dim ?? 0.55; wrap.appendChild(d);
      S.amb.fromTo(im, { scale: 1 }, { scale: 1.028, duration: Math.max(24, th.kenburns.period || 26), ease: "sine.inOut", yoyo: true, repeat: 99, force3D: true }, 0);
    }
    const FXC = S.fx ? S.fx.setup(slide) : null;
    const g = th.glow ? Object.assign({}, th.glow, FXC ? { x: FXC.glowPos[0], y: FXC.glowPos[1] } : {}) : null;
    if (g && slide.glow !== false) {
      const gl = document.createElement("div"); gl.className = "glow"; stage.appendChild(gl);
      const sz = Math.min(W, H) * g.size;
      Object.assign(gl.style, {
        width: sz + "px", height: sz + "px", left: (W * g.x - sz / 2) + "px", top: (H * g.y - sz / 2) + "px",
        background: `radial-gradient(circle, ${th.colors.glow} 0%, transparent 68%)`,
      });
      const half = g.period / 2;
      S.amb.fromTo(gl, { opacity: g.opacity[0], x: -g.move, y: -g.move * 0.6 },
        { opacity: g.opacity[1], x: g.move, y: g.move * 0.6, duration: half, ease: "sine.inOut", yoyo: true, repeat: 99 }, 0);
    }
    if (S.fx) {
      if (S.fx.livingStage) S.fx.livingStage(stage, slide);
      S.fx.atmosphere(stage, slide);
    }
    // Resolve viseme_track (inline object, JSON string, or relative/local URL) once per load
    if (!slide.visemeTrack && slide.viseme_track) {
      if (typeof slide.viseme_track === "object") {
        slide.visemeTrack = slide.viseme_track;
      } else if (typeof slide.viseme_track === "string") {
        const vtRaw = slide.viseme_track.trim();
        if (vtRaw.startsWith("{")) {
          try { slide.visemeTrack = JSON.parse(vtRaw); } catch (_) { /* ignore malformed inline json */ }
        } else if (typeof fetch === "function" && vtRaw) {
          const url = /^(https?:|file:|\/|data:|blob:)/.test(vtRaw) ? vtRaw : `/${vtRaw.replace(/^\.?\//, "")}`;
          try {
            const resp = await fetch(url);
            if (resp && resp.ok) slide.visemeTrack = await resp.json();
          } catch (_) { /* offline or not served; template falls back to say-track deterministically */ }
        }
      }
    }
    // Resolve prosody_track (inline object, JSON string, URL, or sibling *.prosody.json)
    if (!slide.prosodyTrack) {
      let ptRaw = slide.prosody_track || (slide.mascot && slide.mascot.prosody_track);
      if (!ptRaw && typeof slide.viseme_track === "string" && /\.visemes\.json$/i.test(slide.viseme_track.trim())) {
        ptRaw = slide.viseme_track.trim().replace(/\.visemes\.json$/i, ".prosody.json");
      }
      if (ptRaw && typeof ptRaw === "object") {
        slide.prosodyTrack = ptRaw;
      } else if (typeof ptRaw === "string" && ptRaw.trim()) {
        const cleanPt = ptRaw.trim();
        if (cleanPt.startsWith("{")) {
          try { slide.prosodyTrack = JSON.parse(cleanPt); } catch (_) { /* ignore malformed inline json */ }
        } else if (typeof fetch === "function") {
          const url = /^(https?:|file:|\/|data:|blob:)/.test(cleanPt) ? cleanPt : `/${cleanPt.replace(/^\.?\//, "")}`;
          try {
            const resp = await fetch(url);
            if (resp && resp.ok) slide.prosodyTrack = await resp.json();
          } catch (_) { /* fallback to deterministic synthesis from visemes */ }
        }
      }
    }
    if (slide.mascot && typeof slide.mascot === "object" && !slide.mascot.visemeTrack && slide.mascot.viseme_track && typeof slide.mascot.viseme_track === "object") {
      slide.mascot.visemeTrack = slide.mascot.viseme_track;
    }
    if (slide.mascot && typeof slide.mascot === "object" && !slide.mascot.prosodyTrack && slide.prosodyTrack) {
      slide.mascot.prosodyTrack = slide.prosodyTrack;
    }

    const content = document.createElement("div"); content.className = "content"; stage.appendChild(content);
    const A = makeAPI(slide, content);
    const tname = (slide.template || "layers").replace(/-/g, "_");
    const tpl = S.templates[tname];
    await document.fonts.ready;
    if (!tpl) {
      A.text(content, `قالب «${slide.template}» پیدا نشد`, "h1", "abs center-all");
    } else {
      try { tpl.build(slide, A); }
      catch (err) { console.error(err); A.text(content, "خطا در قالب " + tname + ": " + err.message, "body", "abs err"); }
    }
    if (S.fx) {
      if (S.fx.logo) S.fx.logo(content, slide, A);
      if (S.fx.annotations) S.fx.annotations(content, slide, A);
      S.fx.post(content);
      if (S.fx.applyMicroMotion) S.fx.applyMicroMotion(content, slide);
      if (S.fx.camera) S.fx.camera(stage, content, slide, A);
      if (S.fx.ambience) S.fx.ambience(stage, slide, A);
      S.fx.grain(stage);
    }
    // Optional mascot overlay layer on any slide (in addition to mascot_talk template)
    if (slide.mascot && slide.mascot.enabled !== false && tname !== "mascot_talk" && window.StageMascot) {
      const mCfg = Object.assign({}, slide.mascot, {
        say: slide.mascot.say || slide.say || "",
        visemeTrack: slide.mascot.visemeTrack || slide.visemeTrack || null,
        prosodyTrack: slide.mascot.prosodyTrack || slide.prosodyTrack || null,
        tone: slide.mascot.tone || slide.tone || null,
        puppet: slide.puppet || slide.mascot.puppet || null,
        duration: +slide.duration || estimateSayDuration(slide) || (slide.visemeTrack && Number(slide.visemeTrack.duration)) || th.clip.min,
        seed: slide._seed || slide.seed || "mascot-layer",
        stageW: W,
        stageH: H,
      });
      const mInst = window.StageMascot.createMascotInstance(content, mCfg);
      S.registerMascot(mInst);
      A.field("mascot", mInst.container);
      S.onSeek((t) => { if (!S._liveVoiceActive) mInst.seek(t); });
    }
    // Apply persisted stage-level puppet debug overlay flag if enabled
    if (S._puppetDebug && S._puppetDebug.enabled) {
      S._mascots.forEach((m) => { if (m && m.setDebugOverlay) m.setDebugOverlay(S._puppetDebug); });
    }

    // Phase 5 Item 17: Deterministic RTL/LTR SRT Captions Overlay
    let captionCues = null;
    if (Array.isArray(slide.captions) && slide.captions.length) {
      captionCues = slide.captions;
    } else if (typeof slide.captions === "string" && slide.captions.trim() && MT.parseSrt) {
      captionCues = MT.parseSrt(slide.captions);
    } else if (typeof slide.srtText === "string" && slide.srtText.trim() && MT.parseSrt) {
      captionCues = MT.parseSrt(slide.srtText);
    }
    if (captionCues && captionCues.length) {
      const capWrap = document.createElement("div");
      capWrap.className = "stage-caption-bar";
      capWrap.setAttribute("role", "status");
      capWrap.setAttribute("aria-live", "polite");
      capWrap.style.opacity = "0";
      const capInner = document.createElement("span");
      capInner.className = "stage-caption-text";
      capWrap.appendChild(capInner);
      stage.appendChild(capWrap);
      S._captionEl = capWrap;
      S.onSeek((t) => {
        const cue = MT.activeCaptionAt ? MT.activeCaptionAt(captionCues, t) : null;
        if (cue && cue.text) {
          capWrap.setAttribute("dir", cue.dir || (hasFa(cue.text) ? "rtl" : "ltr"));
          capInner.textContent = cue.text;
          capWrap.style.opacity = "1";
          capWrap.setAttribute("data-active-caption", String(cue.index || 1));
        } else {
          capInner.textContent = "";
          capWrap.style.opacity = "0";
          capWrap.setAttribute("data-active-caption", "");
        }
      });
    } else {
      S._captionEl = null;
    }

    // common extras: source credit + note
    if (slide.source) { const s = A.text(content, slide.source, "caption", "source"); A.enter(s, "note"); }
    if (slide.note) { const n = A.text(content, slide.note, "caption", "note " + (A.scam ? "note-scam" : "")); A.enter(n, "note"); }
    if (opts.camGuide || S._camGuide) {
      const c = th.layout.cam; const cg = document.createElement("div"); cg.className = "camguide";
      Object.assign(cg.style, {
        left: c[0] + "px", top: c[1] + "px", width: (c[2] - c[0]) + "px", height: (c[3] - c[1]) + "px",
        display: layout === "SCAM" ? "flex" : "none",
      });
      cg.textContent = "جای دوربین"; stage.appendChild(cg);
    }
    // Transition in (default "soft-fade" matches classic .fadein)
    if (!isTrans) {
      if (S.fx && S.fx.transitionIn) {
        S.fx.transitionIn(stage, slide, th);
      } else {
        const fade = document.createElement("div"); fade.className = "fadein"; stage.appendChild(fade);
        if (th.clip.fade > 0) S.tl.fromTo(fade, { opacity: 1 }, { opacity: 0, duration: th.clip.fade, ease: "power1.out", immediateRender: true }, 0);
        else fade.remove();
      }
    }

    await Promise.all(S._imgs.map((im) => im.decode().catch(() => {})));
    const ent = S.tl.duration();
    S._entrances = ent;
    const sayDur = estimateSayDuration(slide);
    const trackDur = (slide.visemeTrack && Number(slide.visemeTrack.duration)) || (slide.mascot && slide.mascot.visemeTrack && Number(slide.mascot.visemeTrack.duration)) || 0;
    const baseMin = +slide.duration ? +slide.duration : Math.max(th.clip.min, sayDur || 0, trackDur || 0);
    S._dur = Math.max(baseMin, ent + th.clip.hold);
    S._lastCueIdx = -1;
    S._liveLoop = Boolean(opts.liveLoop || S._liveLoop);
    S.seek(0);
    S.ready = true;
    const fxi = S.fx ? {
      variant: S.fx.cur.variant,
      preset: S.fx.cur.preset,
      motion: S.fx.cur.motion,
      transition: S.fx.cur.transition,
      logoMotion: S.fx.cur.logoMotion,
      leak: S.fx.cur.leak,
      dust: S.fx.cur.dust,
    } : {};
    return {
      duration: S._dur,
      entrances: ent,
      sayDuration: sayDur,
      fps: S.fps,
      frames: Math.round(S._dur * S.fps),
      fx: fxi,
      cues: (S.cues || []).sort((a, b) => a.t - b.t),
    };
  };
  S.setTransparent = function (flag) {
    S._transparent = Boolean(flag);
    const stage = document.getElementById("stage");
    if (stage) stage.classList.toggle("stage-transparent", S._transparent);
    document.body.classList.toggle("stage-transparent", S._transparent);
    document.documentElement.classList.toggle("stage-transparent", S._transparent);
  };
  S.setMicLevel = function (level) {
    const stage = document.getElementById("stage");
    if (!stage) return;
    const lvl = Math.max(0, Math.min(1, Number(level) || 0));
    stage.style.setProperty("--mic-level", lvl.toFixed(3));
    const wave = stage.querySelector(".living-wave");
    if (wave) {
      wave.style.transform = `scaleY(${(1 + lvl * 0.65).toFixed(3)})`;
      wave.style.opacity = (0.55 + lvl * 0.45).toFixed(2);
    }
  };
  S.updateFloat = function (t) {
    const items = S._floats;
    if (!Array.isArray(items) || !items.length) return;
    const cfg = S._floatCfg || { enabled: false, baseAmp: 2, speed: 0.45, style: "silk-glide" };
    if (!cfg.enabled || cfg.baseAmp <= 0) {
      for (let i = 0; i < items.length; i += 1) {
        items[i].el.style.translate = "0px 0px 0px";
        items[i].el.style.rotate = "0deg";
        items[i].el.style.scale = "1";
      }
      return;
    }
    const speed = cfg.speed || 0.45;
    for (let i = 0; i < items.length; i += 1) {
      const it = items[i];
      if (t <= it.startAt) {
        it.el.style.translate = "0px 0px 0px";
        it.el.style.rotate = "0deg";
        it.el.style.scale = "1";
        continue;
      }
      // Quintic C2 smootherstep fade-in over 2.8s so entrance transitions imperceptibly into optical glide
      const u = Math.min(1, (t - it.startAt) / 2.8);
      const fade = u * u * u * (10 - u * (15 - 6 * u));
      const wt = (t - it.startAt) * speed;
      const dx = fade * it.ampX * Math.sin(wt * it.w2 + it.p2);
      const dy = fade * it.ampY * Math.sin(wt * it.w1 + it.p1);
      it.el.style.translate = `${dx.toFixed(3)}px ${dy.toFixed(3)}px 0px`;
      it.el.style.rotate = "0deg";
      if (it.ampScale) {
        const sc = 1 + fade * it.ampScale * Math.sin(wt * it.w3 + it.p3);
        it.el.style.scale = sc.toFixed(5);
      } else {
        it.el.style.scale = "1";
      }
    }
  };
  S.seek = function (t, fireSfx = false) {
    if (S.tl) S.tl.time(Math.min(t, S.tl.duration()), false);
    if (S.amb) {
      const ambDur = S.amb.duration();
      const ambTime = S._liveLoop && ambDur > 0 ? (t % Math.max(20, ambDur)) : t;
      S.amb.time(ambTime, false);
    }
    S.updateFloat(t);
    if (Array.isArray(S._seekHooks)) {
      for (let i = 0; i < S._seekHooks.length; i += 1) {
        try { S._seekHooks[i](t); } catch (_) { /* keep deterministic seek resilient */ }
      }
    }
    if (S._mascots.length && window.parent && window.parent !== window) {
      const now = performance.now ? performance.now() : 0;
      if (!S._lastTelemetryAt || (now - S._lastTelemetryAt) >= 45) {
        S._lastTelemetryAt = now;
        try { window.parent.postMessage({ cmd: "mascotTelemetry", state: S.getMascotState() }, "*"); } catch (_) {}
      }
    }
    if (fireSfx && window.StageSFX && Array.isArray(S.cues) && S.cues.length) {
      const prevT = S._t || 0;
      if (t >= prevT) {
        S.cues.forEach((c) => {
          if (c.t > prevT && c.t <= t && (t - prevT) < 0.25) {
            window.StageSFX.play(c.type, c.vol ?? 0.55, c.opts || {});
          }
        });
      }
    }
    S._t = t;
  };
  S.duration = () => S._dur;
  S.camOverlap = function () {
    if ((S.slide.layout || "").toUpperCase() !== "SCAM") return [];
    const c = S.theme.layout.cam, st = document.getElementById("stage").getBoundingClientRect();
    const bad = [];
    document.querySelectorAll("#stage .content *").forEach((e) => {
      if (e.closest(".fullbleed") || e.closest(".stage-annotations")) return;
      if (e.children.length && !e.matches(".frame,.card,.bubble,.bar,.t-body,.t-h1,.t-hero,.t-label,.t-caption,.t-eyebrow,.t-quote,.num,.stage-logo")) return;
      const r = e.getBoundingClientRect(); if (!r.width || !r.height) return;
      const x0 = r.left - st.left, y0 = r.top - st.top, x1 = x0 + r.width, y1 = y0 + r.height;
      if (x0 < c[2] && x1 > c[0] && y0 < c[3] && y1 > c[1]) bad.push((e.className || e.tagName) + " " + (e.textContent || "").slice(0, 30));
    });
    return bad;
  };

  /* preview playback (editor + live OBS loop): drives the same seek() from the clock */
  let raf = null;
  S.play = function (from = 0, opts = {}) {
    cancelAnimationFrame(raf);
    const keepLiving = Boolean(opts.liveLoop || S._liveLoop);
    const t0 = performance.now() - from * 1000;
    const loop = () => {
      const t = (performance.now() - t0) / 1000;
      if (keepLiving) {
        S.seek(t, true);
        raf = requestAnimationFrame(loop);
      } else {
        S.seek(Math.min(t, S._dur), true);
        if (t < S._dur) raf = requestAnimationFrame(loop);
        else S.onEnd && S.onEnd();
      }
    };
    raf = requestAnimationFrame(loop);
  };
  S.stop = () => cancelAnimationFrame(raf);

  /* editor bridge */
  window.addEventListener("message", async (e) => {
    const d = e.data || {};
    if (d.cmd === "load") {
      S._camGuide = !!d.camGuide;
      if (d.sfxMuted !== undefined && window.StageSFX) window.StageSFX.setMuted(d.sfxMuted);
      if (d.sfxVolume !== undefined && window.StageSFX) window.StageSFX.setVolume(d.sfxVolume);
      const info = await S.load(d.slide, {
        theme: d.theme,
        format: d.format,
        camGuide: d.camGuide,
        transparent: d.transparent,
        liveLoop: d.liveLoop,
      });
      if (d.at != null) {
        const seekT = (d.at === 0) ? Math.max(1.8, (info && info.entrances) || 1.8) : d.at;
        S.seek(seekT, false);
      } else {
        S.play(0, { liveLoop: d.liveLoop });
      }
      parent.postMessage({ cmd: "loaded", info, cam: S.camOverlap() }, "*");
    } else if (d.cmd === "seek") {
      S.stop();
      S.seek(d.t, Boolean(d.fireSfx));
    } else if (d.cmd === "play") {
      S.play(d.from || 0, { liveLoop: d.liveLoop });
    } else if (d.cmd === "sfxConfig" && window.StageSFX) {
      if (d.muted !== undefined) window.StageSFX.setMuted(d.muted);
      if (d.volume !== undefined) window.StageSFX.setVolume(d.volume);
    } else if (d.cmd === "livingConfig" && d.livingStage && S.slide) {
      S.slide.livingStage = Object.assign({}, S.slide.livingStage || {}, d.livingStage);
      if (Array.isArray(S._floats)) {
        S._floats.forEach((it) => {
          it.el.style.translate = "0px 0px 0px";
          it.el.style.rotate = "0deg";
          it.el.style.scale = "1";
        });
      }
      const content = document.querySelector("#stage .content");
      if (content && S.fx && S.fx.applyMicroMotion) {
        content.querySelectorAll(".card-sheen").forEach((el) => el.remove());
        S.fx.applyMicroMotion(content, S.slide);
        S.updateFloat(S._t || 0);
      }
    } else if (d.cmd === "mascotTone") {
      const st = S.setMascotTone(d.tone || {});
      if (st && parent && parent !== window) {
        parent.postMessage({ cmd: "mascotTelemetry", state: st }, "*");
      }
    } else if (d.cmd === "puppetConfig") {
      const st = S.setPuppetConfig(d.puppet || {});
      if (st && parent && parent !== window) {
        parent.postMessage({ cmd: "mascotTelemetry", state: st }, "*");
      }
    } else if (d.cmd === "setFps") {
      S.setFps(d.fps || 30);
    } else if (d.cmd === "puppetDebug") {
      S.setPuppetDebug(d.debug !== undefined ? d.debug : d.enabled);
      S.seek(S._t || 0, false);
    }
  });
})();
