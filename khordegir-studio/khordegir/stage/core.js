/* Khordegir Studio — stage runtime.
   One shared stage for: the offline editor preview (iframe) and the MP4 renderer (Playwright).
   Everything is driven by two paused GSAP 3 timelines that are *seeked*, never played by the clock:
     Stage.tl  : entrances, kinetic typography, transitions, animated logo
     Stage.amb : ambient motion (Ken Burns inside image frames, background glow/drift, dust, light sweep)
   so frame i of the video is strictly deterministic: Stage.seek(i / fps).                        */
(function () {
  "use strict";
  /* Frame formats. W/H follow the current slide's format (Stage.setFormat); landscape is the default
     and renders exactly as before. */
  const FORMATS = {
    landscape: { w: 1920, h: 1080, typeScale: 1 },
    portrait: { w: 1080, h: 1920, typeScale: 1.12 },
    square: { w: 1080, h: 1080, typeScale: 1 },
  };
  /* per-format safe areas & camera box (SCAM) when the theme does not give its own layout.formats[fmt] */
  const FORMAT_LAYOUT = {
    portrait: { margin: 72, top: 160, bottom: 280, cam: [48, 1088, 1032, 1641] },
    square: { margin: 64, top: 64, bottom: 64, cam: [24, 786, 504, 1056] },
  };
  const FORMAT_ALIASES = {
    landscape: "landscape", horizontal: "landscape", wide: "landscape", "16:9": "landscape", "16x9": "landscape", "افقی": "landscape",
    portrait: "portrait", vertical: "portrait", tall: "portrait", "9:16": "portrait", "9x16": "portrait", "عمودی": "portrait",
    square: "square", "1:1": "square", "1x1": "square", "مربع": "square", "مربعی": "square",
  };
  let W = 1920, H = 1080;
  const MT = window.MOTION_TOKENS || (window.Stage && window.Stage.MOTION);
  const S = window.Stage = Object.assign(window.Stage || {}, {
    W, H, fps: 30, themes: (window.Stage && window.Stage.themes) || {}, templates: {}, theme: null, tl: null, amb: null, slide: null,
    ready: false, _dur: 6, _base: "", _clipSeq: 0, _lang: "fa", MOTION: MT, motionTokens: MT,
  });

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
    if (S._lang === "en") {
      if (thousands && i.length > 3) i = i.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      return (neg ? "-" : "") + i + (f ? "." + f : "");
    }
    if (thousands && i.length > 3) i = i.replace(/\B(?=(\d{3})+(?!\d))/g, "٬");
    return (neg ? "-" : "") + fa(i + (f ? "٫" + f : ""));
  };
  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const hasFa = S.hasFa = (s) => /[\u0620-\u064A\u0671-\u06D3\u06FA-\u06FF]/.test(String(s ?? ""));
  const applyRichMarks = (h) => h
    .replace(/==([^=]+)==/g, '<span class="hl">$1</span>')
    .replace(/__([^_]+)__/g, '<span class="ul">$1</span>')
    .replace(/\*([^*]+)\*/g, '<span class="acc">$1</span>')
    .replace(/~([^~]+)~/g, '<span class="dng">$1</span>')
    .replace(/(^|[\s(«])_([^_]+)_/g, '$1<span class="mut">$2</span>')
    .replace(/\n/g, "<br>");

  function wrapInlineDelights(html, { isEn, allowCount, allowMicro }) {
    if (!allowCount && !allowMicro) return html;
    const parts = String(html).split(/(<[^>]+>)/g);
    let insideLatBdi = 0;
    return parts.map((seg) => {
      if (!seg) return seg;
      if (seg.startsWith("<")) {
        if (/^<bdi\b/i.test(seg)) insideLatBdi++;
        else if (/^<\/bdi>/i.test(seg) && insideLatBdi > 0) insideLatBdi--;
        return seg;
      }
      let out = seg;
      if (allowCount) {
        out = out.replace(
          /(?<![A-Za-z0-9۰-۹_:\/\\.\-])([+\-±])?([0-9۰-۹]+(?:[٬,][0-9۰-۹]{3})*(?:[٫.][0-9۰-۹]+)?)(\s?[٪%])?(?![A-Za-z0-9۰-۹:\/\\])/g,
          (full, sign, numRaw, pctRaw) => {
            if (!numRaw) return full;
            const enDigits = numRaw.replace(/[۰-۹]/g, (d) => String(FA.indexOf(d))).replace(/٬/g, ",").replace(/٫/g, ".");
            if (/^0\d/.test(enDigits)) return full;
            const clean = enDigits.replace(/,/g, "");
            const val = Number(clean);
            if (!Number.isFinite(val)) return full;
            const dec = (clean.split(".")[1] || "").length;
            const hasTh = /[٬,]/.test(numRaw) ? 1 : 0;
            const pre = sign === "+" ? "+" : (sign === "-" ? "-" : (sign === "±" ? "±" : ""));
            const signedVal = sign === "-" ? -val : val;
            const preForFmt = sign === "-" ? "" : pre;
            const suf = pctRaw ? (isEn ? pctRaw.replace("٪", "%") : pctRaw.replace("%", "٪")) : "";
            const isYear = !sign && !pctRaw && !hasTh && dec === 0 && val >= 1300 && val <= 2150 ? 1 : 0;
            if (isYear) return full; // years stay still: rolling dates reads as a gimmick
            const display = (sign === "-" ? "-" : preForFmt) + S.fmt(val, dec, hasTh === 1) + suf;
            return `<span class="auto-num" data-to="${signedVal}" data-dec="${dec}" data-th="${hasTh}" data-pre="${esc(preForFmt)}" data-suf="${esc(suf)}" data-year="${isYear}"><bdi dir="ltr" class="auto-num-core">${display}</bdi></span>`;
          },
        );
      }
      if (allowMicro && !insideLatBdi) {
        try {
          out = out.replace(/(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)/gu, (em) => {
            if (/^[0-9#*]+$/.test(em)) return em;
            return `<span class="emo-pop">${em}</span>`;
          });
        } catch (_) { /* older regex engines */ }
      }
      return out;
    }).join("");
  }

  /* Rich text: *accent*  ~danger~  _muted_  ==highlight==  __underline__  newline -> <br>;
     Includes deterministic inline auto-count numbers & emoji pops unless disabled. */
  S.rich = function (s, opts = {}) {
    s = String(s ?? "");
    const allowCount = opts.count !== false && (!S.slide || S.slide.count !== false);
    const allowMicro = opts.micro !== false && (!S.slide || S.slide.micro_fx !== false);
    const isEn = S._lang === "en";
    if (isEn) {
      const h = wrapInlineDelights(applyRichMarks(esc(s)), { isEn: true, allowCount, allowMicro });
      return hasFa(s) ? h : `<bdi dir="ltr" class="lat">${h}</bdi>`;
    }
    if (!hasFa(s) && /[A-Za-z]/.test(s)) {
      const h = wrapInlineDelights(applyRichMarks(esc(s)), { isEn: false, allowCount, allowMicro });
      return `<bdi dir="ltr" class="lat">${h}</bdi>`;
    }
    let h = esc(s);
    const lat = [];
    h = h.replace(/\(?[A-Za-z][A-Za-z0-9.,&;:'’\-\/() ]*[A-Za-z0-9.)]|[A-Za-z]/g, (m) => {
      lat.push(m);
      return String.fromCharCode(0xE000 + lat.length - 1);
    });
    h = fa(h);
    h = applyRichMarks(h)
      .replace(/([≈+−±])\s?([۰-۹][۰-۹٫٬]*\s?[٪%]?)/g, '<bdi dir="ltr">$1$2</bdi>');
    h = h.replace(/[\uE000-\uE0FF]/g, (m) => `<bdi dir="ltr" class="lat">${lat[m.charCodeAt(0) - 0xE000]}</bdi>`);
    return wrapInlineDelights(h, { isEn: false, allowCount, allowMicro });
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

  /* True exponential easing resolution helpers for S.ease */
  function getExpHelpers() {
    const root = typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : {};
    const KM = root.KhordegirMotion || (root.Stage && root.Stage.KhordegirMotion) || (MT && MT.expOut && MT) || null;
    if (KM && typeof KM.expOut === "function" && typeof KM.expIn === "function" && typeof KM.expInOut === "function") {
      return KM;
    }
    const expOut = (k = 5) => {
      const K = Number(k) || 5;
      const d = 1 - Math.exp(-K);
      return (t) => (t <= 0 ? 0 : t >= 1 ? 1 : (1 - Math.exp(-K * t)) / d);
    };
    const expIn = (k = 5) => {
      const K = Number(k) || 5;
      const d = Math.exp(K) - 1;
      return (t) => (t <= 0 ? 0 : t >= 1 ? 1 : (Math.exp(K * t) - 1) / d);
    };
    const expInOut = (k = 5) => {
      const fi = expIn(k), fo = expOut(k);
      return (t) => (t <= 0 ? 0 : t >= 1 ? 1 : (t < 0.5 ? fi(2 * t) / 2 : 0.5 + fo(2 * t - 1) / 2));
    };
    const linear = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t);
    return { expOut, expIn, expInOut, linear };
  }

  function mapBezierToExp(arr, KM) {
    const [x1 = 0, y1 = 0, x2 = 1, y2 = 1] = Array.isArray(arr) ? arr : [];
    const s0 = y1 / (x1 || 1e-4);
    const s1 = (1 - y2) / ((1 - x2) || 1e-4);
    if (s0 > 1.2 && s1 < 0.8) return KM.expOut(5);
    if (s0 < 0.8 && s1 > 1.2) return KM.expIn(5);
    if (s0 < 1 && s1 < 1) return KM.expInOut(5);
    return KM.expOut(5);
  }

  function mapEaseStringToExp(str, KM) {
    const s = String(str || "").trim().toLowerCase();
    if (!s || s === "none" || s === "linear") {
      return KM.linear || ((t) => (t <= 0 ? 0 : t >= 1 ? 1 : t));
    }
    if (s === "chartgrow" && MT && MT.eases && typeof MT.eases.chartGrow === "function") {
      return MT.eases.chartGrow;
    }

    // Direct semantic token lookup
    if (s === "textin" || s === "wordstagger") return KM.expOut(5);
    if (s === "textout") return KM.expIn(5);
    if (s === "zoomin" || s === "camerapan" || s === "ambient" || s === "zoompoint") return KM.expInOut(3);
    if (s === "zoompointtravel") return KM.expInOut(4);
    if (s === "zoompointreturn") return KM.expInOut(5);
    // Explicit e^(-x) exponential curve strings e.g. "expOut(6)", "expInOut(5)"
    const expMatch = s.match(/^exp(inout|in|out)\(\s*([0-9.]+)\s*\)$/);
    if (expMatch) {
      const kVal = Math.max(0.5, Math.min(12, parseFloat(expMatch[2]) || 5));
      if (expMatch[1] === "inout") return KM.expInOut(kVal);
      if (expMatch[1] === "in") return KM.expIn(kVal);
      return KM.expOut(kVal);
    }
    if (s === "zoomout" || s === "transitionslash") return KM.expInOut(5);
    if (s === "chartreveal" || s === "transition" || s === "snappy") return KM.expOut(6);
    if (s === "transitionsoft") return KM.expOut(3);

    // Strength mapping: power1/sine->3, power2->4, power3/back->5, power4/expo->6
    let k = 5;
    if (s.includes("power1") || s.includes("sine")) {
      k = 3;
    } else if (s.includes("power2") || s.includes("quad")) {
      k = 4;
    } else if (s.includes("power3") || s.includes("back") || s.includes("cubic") || s.includes("spring") || s.includes("editorial")) {
      k = 5;
    } else if (s.includes("power4") || s.includes("expo") || s.includes("quart") || s.includes("quint")) {
      k = 6;
    }

    // Direction mapping: .out->expOut, .in->expIn, .inOut->expInOut
    const isInOut = s.includes("inout") || s.includes("in-out");
    if (isInOut) {
      return KM.expInOut(k);
    }
    const isIn = s.includes(".in") || (s.endsWith("in") && !s.includes("inout"));
    if (isIn) {
      return KM.expIn(k);
    }
    return KM.expOut(k);
  }

  /* cubic-bezier ease function mapped to true exponential family so nothing bypasses e^(-x) */
  function bezier(x1, y1, x2, y2) {
    const KM = getExpHelpers();
    return mapBezierToExp([x1, y1, x2, y2], KM);
  }

  S.ease = function (name) {
    const KM = getExpHelpers();
    if (name == null || name === "") {
      return (MT && MT.eases && MT.eases.textIn) || KM.expOut(5);
    }
    const resolved = ((S.theme && S.theme.ease) || {})[name] ?? (MT && MT.eases && MT.eases[name]) ?? name;
    if (typeof resolved === "function") return resolved;
    if (Array.isArray(resolved)) return mapBezierToExp(resolved, KM);
    if (typeof resolved === "string") return mapEaseStringToExp(resolved, KM);
    return (MT && MT.eases && MT.eases.textIn) || KM.expOut(5);
  };

  function hexToRgb(hex, fallback) {
    const m = String(hex || "").trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!m) return fallback;
    let h = m[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  S.FORMATS = FORMATS;
  S.format = "landscape";
  S.normFormat = function (v) {
    const k = String(v == null ? "" : v).trim().toLowerCase();
    return FORMAT_ALIASES[k] || "landscape";
  };
  /* Resize the stage (and the page body) for a format. Returns {format, w, h}. */
  S.setFormat = function (v) {
    const f = S.normFormat(v), F = FORMATS[f];
    W = F.w; H = F.h; S.W = W; S.H = H; S.format = f;
    const root = document.documentElement;
    if (root && root.style) { root.style.setProperty("--stage-w", W + "px"); root.style.setProperty("--stage-h", H + "px"); }
    const st = document.getElementById("stage");
    if (st) st.setAttribute("data-format", f);
    return { format: f, w: W, h: H };
  };
  /* Theme layout for a format: landscape = the theme's own layout object untouched. Other formats take
     FORMAT_LAYOUT, then the theme's layout.formats[fmt]; the camera sits under full-width content. */
  S.layoutFor = function (th, fmt) {
    const base = (th && th.layout) || { margin: 80, top: 64, bottom: 64, radius: 16, badgeRadius: 8, cam: [24, 740, 584, 1055], scamLeft: 650 };
    const f = S.normFormat(fmt);
    if (f === "landscape") return base;
    const own = (base.formats && base.formats[f]) || {};
    const L = Object.assign({}, base, FORMAT_LAYOUT[f], own);
    delete L.formats;
    if (own.scamLeft == null) L.scamLeft = L.margin;
    return L;
  };

  function getZoomCap() {
    const tokens = (typeof window !== "undefined" && (window.MOTION_TOKENS || window.MotionTokens)) || null;
    const cap = tokens && Number(tokens.STAGE_ZOOM_CAP);
    return (Number.isFinite(cap) && cap >= 1) ? cap : 1.06;
  }

  function buildCameraTimeline(stage, slide, curW, curH) {
    const rawPts = slide && Array.isArray(slide.zoom_points) ? slide.zoom_points : [];
    const ZOOM_CAP = getZoomCap();
    S._camState = { scale: 1, x: 0, y: 0 };
    S._applyCamera = null;

    if (!rawPts.length) {
      if (stage && stage.style) {
        stage.style.transform = "";
        stage.style.transformOrigin = "";
      }
      S.camTl = null;
      return 0;
    }

    const ordered = rawPts
      .map((pt, idx) => {
        if (!pt || typeof pt !== "object") return null;
        const x = (pt.x != null && Number.isFinite(+pt.x)) ? Math.max(0, Math.min(1, +pt.x)) : 0.5;
        const y = (pt.y != null && Number.isFinite(+pt.y)) ? Math.max(0, Math.min(1, +pt.y)) : 0.5;
        const sc = (pt.scale != null && Number.isFinite(+pt.scale)) ? Math.max(1, Math.min(ZOOM_CAP, +pt.scale)) : Math.min(1.04, ZOOM_CAP);
        const at = (pt.at != null && Number.isFinite(+pt.at)) ? Math.max(0, +pt.at) : 0;
        const dur = (pt.dur != null && Number.isFinite(+pt.dur) && +pt.dur > 0) ? +pt.dur : 0.9;
        const ease = typeof pt.ease === "string" && pt.ease.trim() ? pt.ease.trim() : "expOut(5)";
        return { x, y, scale: sc, at, dur, ease, _idx: idx };
      })
      .filter(Boolean)
      .sort((a, b) => (a.at - b.at) || (a._idx - b._idx));

    if (!ordered.length) {
      if (stage && stage.style) {
        stage.style.transform = "";
        stage.style.transformOrigin = "";
      }
      S.camTl = null;
      return 0;
    }

    const poseFor = (pt) => {
      const sc = Math.max(1, Math.min(ZOOM_CAP, pt.scale));
      const maxTx = (curW * (sc - 1)) / 2;
      const maxTy = (curH * (sc - 1)) / 2;
      const idealX = -(pt.x - 0.5) * curW * sc;
      const idealY = -(pt.y - 0.5) * curH * sc;
      return {
        scale: sc,
        x: Math.max(-maxTx, Math.min(maxTx, idealX)),
        y: Math.max(-maxTy, Math.min(maxTy, idealY)),
      };
    };

    const cam = S._camState;
    const applyCamera = () => {
      const sc = Math.max(1, Math.min(ZOOM_CAP, Number(cam.scale) || 1));
      const maxTx = (curW * (sc - 1)) / 2;
      const maxTy = (curH * (sc - 1)) / 2;
      const tx = Math.max(-maxTx, Math.min(maxTx, Number(cam.x) || 0));
      const ty = Math.max(-maxTy, Math.min(maxTy, Number(cam.y) || 0));
      cam._appliedScale = sc;
      cam._appliedX = tx;
      cam._appliedY = ty;
      if (stage && stage.style) {
        stage.style.transformOrigin = "50% 50%";
        if (Math.abs(sc - 1) < 1e-6 && Math.abs(tx) < 1e-4 && Math.abs(ty) < 1e-4) {
          stage.style.transform = "translate(0px, 0px) scale(1)";
        } else {
          stage.style.transform = `translate(${tx.toFixed(3)}px, ${ty.toFixed(3)}px) scale(${sc.toFixed(5)})`;
        }
      }
    };
    S._applyCamera = applyCamera;

    const tl = S.camTl = gsap.timeline({ paused: true });
    if (typeof tl.set === "function") {
      tl.set(cam, { scale: 1, x: 0, y: 0, onUpdate: applyCamera }, 0);
    }

    let prev = { scale: 1, x: 0, y: 0 };
    ordered.forEach((pt) => {
      const next = poseFor(pt);
      tl.fromTo(
        cam,
        { scale: prev.scale, x: prev.x, y: prev.y },
        {
          scale: next.scale,
          x: next.x,
          y: next.y,
          duration: pt.dur,
          ease: S.ease(pt.ease),
          immediateRender: false,
          onUpdate: applyCamera,
        },
        pt.at
      );
      prev = next;
    });

    applyCamera();
    return ordered.length;
  }

  S.cameraState = function () {
    const cam = S._camState || { scale: 1, x: 0, y: 0 };
    return {
      scale: cam._appliedScale != null ? cam._appliedScale : (Number(cam.scale) || 1),
      x: cam._appliedX != null ? cam._appliedX : (Number(cam.x) || 0),
      y: cam._appliedY != null ? cam._appliedY : (Number(cam.y) || 0),
    };
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
    const isLight = c.isDark === false;
    const [sr, sg, sb] = isLight ? hexToRgb(c.text, [15, 23, 42]) : [0, 0, 0];
    const [ar, ag, ab] = hexToRgb(c.accent, [255, 214, 0]);
    const sh = t.shadows || {};
    const shadowCard = sh.card || (isLight
      ? `0 2px 6px rgba(${sr},${sg},${sb},.05), 0 10px 26px rgba(${sr},${sg},${sb},.08), 0 24px 52px rgba(${sr},${sg},${sb},.06), inset 0 1px 0 rgba(255,255,255,.78)`
      : `0 2px 6px rgba(0,0,0,.30), 0 12px 28px rgba(0,0,0,.36), 0 28px 60px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.06)`);
    const shadowImage = sh.image || (isLight
      ? `0 4px 12px rgba(${sr},${sg},${sb},.08), 0 16px 34px rgba(${sr},${sg},${sb},.12), 0 32px 64px rgba(${sr},${sg},${sb},.09)`
      : `0 4px 12px rgba(0,0,0,.38), 0 16px 38px rgba(0,0,0,.46), 0 34px 72px rgba(0,0,0,.34)`);
    const shadowTitle = sh.title || (isLight
      ? `0 1px 2px rgba(${sr},${sg},${sb},.06), 0 6px 18px rgba(${sr},${sg},${sb},.05)`
      : `0 2px 6px rgba(0,0,0,.48), 0 10px 28px rgba(0,0,0,.34)`);
    const shadowBubble = sh.bubble || (isLight
      ? `0 2px 6px rgba(${sr},${sg},${sb},.05), 0 10px 22px rgba(${sr},${sg},${sb},.08)`
      : `0 2px 6px rgba(0,0,0,.28), 0 10px 24px rgba(0,0,0,.32)`);
    const shadowLogo = sh.logo || (isLight
      ? `0 3px 10px rgba(${sr},${sg},${sb},.08), 0 12px 28px rgba(${sr},${sg},${sb},.10)`
      : `0 4px 12px rgba(0,0,0,.34), 0 14px 32px rgba(0,0,0,.42)`);
    const shadowAccent = `0 6px 20px rgba(${ar},${ag},${ab},.18), 0 18px 44px rgba(${ar},${ag},${ab},.10)`;
    const vignetteBg = t.vignette || (isLight
      ? `radial-gradient(ellipse 114% 98% at 50% 50%, transparent 62%, rgba(${sr},${sg},${sb},.045) 84%, rgba(${sr},${sg},${sb},.11) 100%)`
      : `radial-gradient(ellipse 112% 96% at 50% 48%, transparent 56%, rgba(0,0,0,.22) 82%, rgba(0,0,0,.46) 100%)`);

    let css = `:root{`;
    for (const k in c) if (typeof c[k] === "string") css += `--c-${k}:${c[k]};`;
    css += `--radius:${lay.radius}px;--badge-radius:${lay.badgeRadius}px;`;
    css += `--shadow-card:${shadowCard};--shadow-image:${shadowImage};--shadow-title:${shadowTitle};`;
    css += `--shadow-bubble:${shadowBubble};--shadow-logo:${shadowLogo};--shadow-accent:${shadowAccent};`;
    css += `--vignette-bg:${vignetteBg};}`;
    for (const k in ty) css += `.t-${k}{font-size:${ty[k].size}px;font-weight:${ty[k].weight};line-height:${ty[k].lh};}`;
    for (const f in FORMATS) {
      const sc = FORMATS[f].typeScale;
      if (sc === 1) continue;
      for (const k in ty) css += `#stage[data-format="${f}"] .t-${k}{font-size:${Math.round(ty[k].size * sc)}px;}`;
    }
    let st = document.getElementById("theme-vars");
    if (!st) { st = document.createElement("style"); st.id = "theme-vars"; document.head.appendChild(st); }
    st.textContent = css;
    const stageEl = document.getElementById("stage");
    if (stageEl) stageEl.setAttribute("data-theme-mode", isLight ? "light" : "dark");
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
  function wrapHtmlWords(html, mode = "word") {
    const lineCls = mode === "line" ? "k-line k-line-block" : "k-line";
    const lines = String(html || "").split(/<br\s*\/?>/i);
    return lines.map((line) => {
      if (mode === "line") {
        return `<span class="${lineCls}">${line}</span>`;
      }
      const tokens = line.match(/(<[^>]+>|\s+|[^\s<]+)/g) || [];
      const out = [];
      for (const tok of tokens) {
        if (tok.startsWith("<")) {
          out.push(tok);
        } else if (/^\s+$/.test(tok)) {
          out.push(" ");
        } else {
          // Wrap whole Persian/Latin word intact (never split connected letters or ZWNJ)
          out.push(`<span class="k-word">${tok}</span>`);
        }
      }
      return `<span class="${lineCls}">${out.join("")}</span>`;
    }).join("<br>");
  }


  /* ---- per-object animation presets (video.yaml anim / anim_objects, resolved by anim_presets.py) ---- */
  const ANIM_TEXT_ROLES = ["eyebrow", "title", "body", "note", "bubble", "badge"];
  function animCfgFor(slide, e, role) {
    if (!slide) return null;
    const objs = slide.anim_objects;
    const fieldKey = e && ((e.dataset && e.dataset.field) ||
      (e.parentElement && e.parentElement.dataset && e.parentElement.dataset.fieldWrap));
    return (objs && ((fieldKey && objs[fieldKey]) || objs[role])) || slide.anim || null;
  }
  /* returns the end time, or null when the config has nothing to say (role defaults then apply) */
  function animEnter(e, role, t, cfg, over, m) {
    const scl = (o) => { if (o && o.scale != null) o.scale = MT.clampScale(o.scale); return o; };
    const cue = () => {
      if (!S.fx) return;
      if (role === "title") S.fx.cue(t, "whoosh", e.textContent.slice(0, 30));
      else if (role === "bubble" || role === "badge") S.fx.cue(t, "pop", e.textContent.slice(0, 30));
    };
    const kfs = Array.isArray(cfg.keyframes) ? cfg.keyframes : null;
    if (kfs && kfs.length) {   /* Advanced: sequential tweens at keyframe times (e^-x ease per step) */
      const first = Object.assign({}, kfs[0]); delete first.t; delete first.ease; scl(first);
      S.tl.set(e, Object.assign({ opacity: 0 }, first), 0);
      const kfTl = gsap.timeline();
      for (let j = 1; j < kfs.length; j++) {
        const props = Object.assign({}, kfs[j]);
        const ez = props.ease || cfg.ease || "expOut(5)";
        const dt = Math.max(0, kfs[j].t - kfs[j - 1].t);
        delete props.t; delete props.ease; scl(props);
        kfTl.to(e, Object.assign(props, { duration: dt, ease: S.ease(ez) }), kfs[j - 1].t - kfs[0].t);
      }
      S.tl.add(kfTl, t);
      const total = kfs[kfs.length - 1].t - kfs[0].t;
      e.dataset.end = (t + total).toFixed(3);
      cue();
      return t + total;
    }
    const dur = cfg.duration != null ? cfg.duration : (m.dur || 0.5);
    const ease = S.ease(cfg.ease || m.ease || "expOut(5)");
    const from = scl(Object.assign({ opacity: 0 }, cfg.from || {}));
    const to = scl(Object.assign({ opacity: 1, x: 0, y: 0, scale: 1 }, cfg.to || {}));
    if (over) {
      if (over.x != null) from.x = over.x;
      if (over.y != null) from.y = over.y;
      if (over.scale != null) from.scale = MT.clampScale(over.scale);
    }
    if (cfg.mode && ANIM_TEXT_ROLES.indexOf(role) >= 0 && !e.querySelector("img,svg,canvas,video")) {
      const mode = cfg.mode === "line" ? "line" : "word";   /* whole words only: Persian joins + ZWNJ stay intact */
      if (!e.querySelector(".k-word, .k-line")) e.innerHTML = wrapHtmlWords(e.innerHTML, mode);
      const units = [...e.querySelectorAll(mode === "line" ? ".k-line" : ".k-word")];
      if (units.length) {
        const st = cfg.stagger != null ? cfg.stagger : 0.045;
        units.forEach((u, idx) => S.tl.fromTo(u, from, Object.assign({}, to, { duration: dur, ease, immediateRender: true }), t + idx * st));
        const end = t + Math.max(0, units.length - 1) * st + dur;
        e.dataset.end = end.toFixed(3);
        cue();
        return end;
      }
    }
    S.tl.fromTo(e, from, Object.assign(to, { duration: dur, ease, immediateRender: true }), t);
    e.dataset.end = (t + dur).toFixed(3);
    cue();
    return t + dur;
  }

  function makeAPI(slide, root) {
    const th = S.theme, fmt = S.format, L = S.layoutFor(th, fmt), M = th.motion || MT.themeMotion();
    const scam = (slide.layout || "SLIDE").toUpperCase() === "SCAM";
    const base = MT.ui.baseDelay;
    S._L = L;
    const A = {
      slide, root, th, scam, W, H, L,
      format: fmt, landscape: fmt === "landscape", portrait: fmt === "portrait", square: fmt === "square",
      stack: fmt !== "landscape",                 // side-by-side columns stack vertically
      typeScale: FORMATS[fmt].typeScale,          // inline font sizes are multiplied by this (1 in landscape)
      /* pick a value per format: A.pick(landscapeValue, portraitValue, squareValue = portraitValue) */
      pick(land, por, sq) { return fmt === "landscape" ? land : fmt === "portrait" ? por : (sq === undefined ? por : sq); },
      /* font size scaled for the format (number px) */
      fs(px) { return Math.round(px * A.typeScale); },
      /* how many grid columns n items get in this format (landscape: min(n, max)) */
      columns(n, o = {}) {
        n = Math.max(1, +n || 1);
        if (fmt === "landscape") return Math.min(n, o.max || n);
        if (fmt === "portrait") return o.portrait || (n >= 4 ? 2 : 1);
        return o.square || (n <= 2 ? n : n === 4 ? 2 : 1);
      },
      /* bottom gap of a content block: landscape keeps the template's own value; other formats use
         the safe area, plus the camera band in SCAM, plus room for a note/source line */
      gapB(land, extra = 0) {
        if (fmt === "landscape") return land;
        const camGap = scam ? H - L.cam[1] + 40 : 0;
        return Math.max(L.bottom, camGap) + extra;
      },
      /* rectangle of the free content area (below `top`, above gapB) */
      region(top, extra = 0) {
        const t = top == null ? L.top : top;
        return { x: L.margin, y: t, w: W - 2 * L.margin, h: H - A.gapB(0, extra) - t };
      },
      area: {
        x: L.margin, y: L.top, w: W - 2 * L.margin, h: H - L.top - L.bottom,
        right: W - L.margin, bottom: H - L.bottom,
        left: scam ? L.scamLeft : L.margin,
        camTop: L.cam[1] - 40,
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
          let v = st[k];
          if (v === undefined) continue;
          if (k === "fontSize" && A.typeScale !== 1 && v != null && v !== "") {
            const n = typeof v === "number" ? v : (/^\d+(\.\d+)?px$/.test(String(v)) ? parseFloat(v) : null);
            if (n != null) v = Math.round(n * A.typeScale * 10) / 10 + "px";
          }
          e.style[k] = (typeof v === "number" && !/opacity|zIndex|fontWeight|lineHeight|flex/.test(k)) ? v + "px" : v;
        }
        return e;
      },
      box(parent, x, y, w, h, cls) {
        return A.el("div", "abs " + (cls || ""), parent, { left: x, top: y, width: w, height: h });
      },
      text(parent, str, role, cls, style, richOpts) {
        const e = A.el("div", `t-${role || "body"} ${cls || ""}`, parent, style);
        const isSource = /\bsource\b/.test(cls || "");
        const noCount = isSource || role === "axis" || role === "label"; // chart ticks and category labels never count
        e.innerHTML = S.rich(str, Object.assign(isSource ? { count: false, micro: false } : (noCount ? { count: false } : {}), richOpts || {}));
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

        const ovRoot = slide && slide.overrides;
        /* drag/resize overrides belong to a format: landscape reads the top level (as before),
           portrait/square read overrides[format] only */
        const allOv = (fmt === "landscape") ? ovRoot : (ovRoot && typeof ovRoot === "object" ? ovRoot[fmt] : null);
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
        const m = M[role] || M.body || MT.text.body;
        const ac = animCfgFor(slide, null, role);
        return base + (m.delay || 0) + (ac && ac.delay ? ac.delay : 0) + i * (m.stagger || 0) + extra;
      },
      /* entrance by role: eyebrow | title | body | card | bubble | badge | image | imageFull | note */
      enter(e, role, i = 0, extra = 0, over) {
        if (!e) return 0;
        if (e.dataset && e.dataset.fieldWrap && e.firstElementChild) e = e.firstElementChild;
        const baseRole = M[role] || MT.ui[role] || M.body || MT.text.body;
        const m = Object.assign({}, baseRole, over || {});
        const animCfg = animCfgFor(slide, e, role);
        if (animCfg) {   /* A.at already adds the preset delay on top of the role delay (keeps title/body order) */
          const at0 = (over && over.at != null) ? over.at : A.at(role, i, extra);
          return animEnter(e, role, at0, animCfg, over, m);
        }
        const explicit = over && (over.x != null || over.y != null || over.scale != null);
        let from;
        if (explicit || !S.fx) {
          from = { opacity: 0 };
          const dir = S._lang === "en" ? -1 : 1;
          if (m.x) from.x = (over && over.x != null) ? m.x : m.x * dir;
          if (m.y) from.y = m.y;
          if (m.scale) from.scale = MT.clampScale(m.scale);
        } else {
          from = S.fx.from(role, m);
          if (from.scale != null) from.scale = MT.clampScale(from.scale);
        }
        const t = (over && over.at != null) ? over.at : A.at(role, i, extra);
        const to = Object.assign({ opacity: 1, x: 0, y: 0, scale: 1 }, S.fx ? S.fx.to(from) : {});
        Object.keys(to).forEach((k) => { if (!(k in from)) delete to[k]; });
        const dur = m.dur ?? MT.text.in.dur;
        S.tl.fromTo(e, from, Object.assign(to, { duration: dur, ease: S.ease(m.ease || MT.eases.textIn), immediateRender: true }), t);
        e.dataset.end = (t + dur).toFixed(3);
        if (S.fx) {
          if (role === "title") S.fx.cue(t, "whoosh", e.textContent.slice(0, 30));
          else if (role === "bubble" || role === "badge") S.fx.cue(t, "pop", e.textContent.slice(0, 30));
          else if (role === "card" && i === 0) S.fx.cue(t, "soft", "");
        }
        return t + dur;
      },
      /* fast accelerating exit using textOut token (~0.25-0.35s power2.in) */
      exit(e, at, opts = {}) {
        if (!e) return 0;
        if (e.dataset && e.dataset.fieldWrap && e.firstElementChild) e = e.firstElementChild;
        const tok = MT.text[opts.variant || "out"] || MT.text.out;
        const dur = opts.dur ?? tok.dur;
        const to = {
          opacity: 0,
          y: opts.y ?? tok.y,
          scale: MT.clampScale(opts.scale ?? tok.scale),
          duration: dur,
          ease: S.ease(opts.ease || tok.ease),
        };
        if (opts.x != null) to.x = opts.x;
        S.tl.to(e, to, at);
        return at + dur;
      },
      /* Kinetic Persian RTL word-by-word or line-by-line animation (NEVER splits connected letters; preserves ZWNJ) */
      kinetic(e, opts = {}) {
        if (!e) return 0;
        if (e.dataset && e.dataset.fieldWrap && e.firstElementChild) e = e.firstElementChild;
        const presetKey = opts.preset || "default";
        const tok = MT.wordStagger[presetKey] || MT.wordStagger.default;
        const mode = opts.mode || tok.mode || "word";
        const at = opts.at ?? A.at(opts.role || "title", 0, opts.extra || 0);
        const dur = opts.dur ?? tok.dur;
        const stagger = opts.stagger ?? tok.stagger;
        const fromY = opts.y ?? tok.y;
        const fromX = opts.x ?? ((S._lang === "en" && tok.x) ? -tok.x : tok.x);
        const fromScale = MT.clampScale(opts.scale ?? tok.scale);
        const ease = S.ease(opts.ease || tok.ease);

        if (!e.querySelector(".k-word, .k-line")) {
          e.innerHTML = wrapHtmlWords(e.innerHTML, mode);
        }
        const units = [...e.querySelectorAll(mode === "line" ? ".k-line" : ".k-word")];
        if (!units.length) return A.enter(e, opts.role || "title", 0, opts.extra || 0);

        units.forEach((u, idx) => {
          const wt = at + idx * stagger;
          S.tl.fromTo(u,
            { opacity: 0, y: fromY, x: fromX, scale: fromScale },
            { opacity: 1, y: 0, x: 0, scale: 1, duration: dur, ease, immediateRender: true },
            wt);
        });
        const end = at + Math.max(0, units.length - 1) * stagger + dur;
        e.dataset.end = end.toFixed(3);
        if (S.fx) S.fx.cue(at, "whoosh", e.textContent.slice(0, 30));
        return end;
      },
      /* Camera zoom & pan helpers (capped <= 1.06) */
      zoom(e, mode = "in", opts = {}) {
        if (!e) return 0;
        const isOut = mode === "out";
        const tok = isOut ? MT.camera.zoomOut : MT.camera.zoomIn;
        const dur = opts.dur ?? tok.dur;
        const at = opts.at ?? 0;
        const fromScale = MT.clampScale(opts.fromScale ?? (isOut ? tok.fromScale : 1));
        const toScale = MT.clampScale(opts.scale ?? (isOut ? tok.toScale : tok.scale));
        S.tl.fromTo(e, { scale: fromScale }, { scale: toScale, duration: dur, ease: S.ease(opts.ease || tok.ease), immediateRender: true }, at);
        return at + dur;
      },
      pan(e, opts = {}) {
        if (!e) return 0;
        const tok = MT.camera.pan;
        const dur = opts.dur ?? tok.dur;
        const at = opts.at ?? 0;
        const to = { duration: dur, ease: S.ease(opts.ease || tok.ease) };
        if (opts.x != null) to.x = opts.x;
        if (opts.y != null) to.y = opts.y;
        if (opts.scale != null) to.scale = MT.clampScale(opts.scale);
        S.tl.to(e, to, at);
        return at + dur;
      },
      /* Animated accent rule / sweep line */
      sweepLine(parent, opts = {}) {
        const cls = "rule " + (opts.cls || "");
        const r = A.el("div", cls.trim(), parent, Object.assign({
          width: (opts.width || 160) + "px",
          height: (opts.height || 6) + "px",
          transformOrigin: opts.origin || (A.scam ? (S._lang === "en" ? "0% 50%" : "100% 50%") : "50% 50%"),
        }, opts.style || {}));
        const tok = MT.ui.sweepLine;
        S.tl.fromTo(r, { scaleX: 0, opacity: 0 }, {
          scaleX: 1, opacity: 1, duration: opts.dur ?? tok.dur, ease: S.ease(opts.ease || tok.ease), immediateRender: true,
        }, opts.at ?? A.at("body", 1));
        return r;
      },
      /* Gentle secondary ambient float (for glass panels/spotlights) */
      drift(el, opts = {}) {
        if (!el) return;
        const tok = MT.atmosphere.drift;
        const dx = opts.x ?? tok.x, dy = opts.y ?? tok.y, dur = opts.dur ?? tok.dur;
        S.amb.fromTo(el, { x: -dx, y: -dy }, {
          x: dx, y: dy, duration: dur, ease: S.ease(opts.ease || tok.ease), yoyo: true, repeat: tok.repeat,
        }, 0);
      },
      stagger(list, role, extra = 0) {
        list.forEach((e, i) => A.enter(e, role, i, extra));
      },
      /* number counting up; tabular Persian or English digits; scale .92 -> 1 */
      count(e, o) {
        if (e && e.dataset && e.dataset.fieldWrap && e.firstElementChild) e = e.firstElementChild;
        const m = M.number || MT.chart.number;
        const to = toNum(o.to), from = toNum(o.from ?? 0), dec = o.decimals ?? decOf(o.to), th1 = o.thousands !== false;
        const pre = o.prefix ?? "", suf = o.suffix ?? "";
        const isEn = S._lang === "en";
        const fmtPart = (p) => (isEn ? String(p) : fa(p));
        const coreStr = (v) => esc(fmtPart(hasFa(pre) ? "" : pre)) + S.fmt(v, dec, th1) + esc(fmtPart(hasFa(suf) ? "" : suf));
        const html = (v) => {
          const n = `<bdi dir="ltr" class="num-core">${coreStr(v)}</bdi>`;
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
            if (c) c.innerHTML = coreStr(obj.v);
          },
        }, t);
        if (core) core.innerHTML = coreStr(from);
        if (o.enter !== false) {
          const enterDur = Math.min(MT.chart.number.enterDur, dur);
          S.tl.from(e, {
            opacity: 0, scale: MT.clampScale(o.scale ?? m.scale ?? 1), duration: enterDur,
            ease: S.ease(o.enterEase || m.ease), immediateRender: true,
          }, t);
        }
        e.dataset.end = (t + dur).toFixed(3);
        if (S.fx) { S.fx.cue(t, "count-start", String(o.to)); S.fx.cue(t + dur * MT.chart.countEndCueFrac, "count-end", String(o.to)); }
        return t + dur;
      },
      /* image in a rounded frame + Ken Burns inside the frame */
      image(parent, src, x, y, w, h, o = {}) {
        const f = A.el("div", "frame" + (o.shadow === false ? "" : " shadow") + (o.border ? " bordered" : ""), parent,
          { left: x, top: y, width: w, height: h, borderRadius: (o.radius ?? L.radius) + "px" });
        if (o.border) f.style.setProperty("--frame-border", S.color(o.border));
        const inner = A.el("div", "frame-inner", f);
        if (src) {
          const im = A.el("img", "", inner);
          im.src = src; im.alt = "";
          im.style.objectFit = o.fit || "cover";
          if (o.focus) im.style.objectPosition = o.focus;
          im.onerror = () => { im.remove(); A.placeholder(inner, src); };
          S._imgs.push(im);
          A._imgIndex = (A._imgIndex || 0) + 1;
          let mo = S.fx ? S.fx.imageMotion(o.motion, A._imgIndex) : o.motion;
          if (mo === "depth") { if (o.depth !== false && w * h > 200000 && S.fx) S.fx.depth(src); mo = "breathe"; }
          A.kenburns(im, mo);
        } else A.placeholder(inner, o.name || "");
        if (o.dim) A.el("div", "dim", inner, { opacity: o.dim });
        if (o.enter !== false) A.enter(f, "image", 0, o.delay || 0);
        return f;
      },
      placeholder(parent, name) {
        const p = A.el("div", "ph", parent);
        p.innerHTML = `<svg viewBox="0 0 64 48" width="22%"><rect x="2" y="2" width="60" height="44" rx="6" fill="none" stroke="#5a5a5a" stroke-width="3"/><path d="M8 40 L24 22 L34 32 L42 25 L56 40 Z" fill="#4a4a4a"/><circle cx="46" cy="14" r="5" fill="#7a6d2a"/></svg>` +
          (name ? `<div class="ph-name">${esc(String(name).split("/").pop())}</div>` : "");
        return p;
      },
      kenburns(im, motion) {
        const kb = MT.camera.kenburns;
        const thKb = th.kenburns || kb.breathe;
        motion = motion || "breathe";
        if (motion === "none") return;
        let a = { scale: 1, x: 0 }, b = { scale: MT.clampScale(1 + thKb.scale), x: thKb.x };
        let dur = thKb.period, ease = S.ease(thKb.ease || kb.breathe.ease);
        if (motion === "zoom-out") {
          a = { scale: MT.clampScale(kb.zoomOut.fromScale), x: kb.zoomOut.x };
          b = { scale: MT.clampScale(kb.zoomOut.toScale), x: kb.zoomOut.x };
          dur = kb.zoomOut.period;
          ease = S.ease(kb.zoomOut.ease);
        } else if (motion === "pan-left") {
          a = { scale: MT.clampScale(kb.pan.scale), x: kb.pan.dx };
          b = { scale: MT.clampScale(kb.pan.scale), x: -kb.pan.dx };
          dur = kb.pan.period;
          ease = S.ease(kb.pan.ease);
        } else if (motion === "pan-right") {
          a = { scale: MT.clampScale(kb.pan.scale), x: -kb.pan.dx };
          b = { scale: MT.clampScale(kb.pan.scale), x: kb.pan.dx };
          dur = kb.pan.period;
          ease = S.ease(kb.pan.ease);
        }
        S.amb.fromTo(im, a, Object.assign(b, { duration: dur, ease }), 0);
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
      draw(el, at, dur = MT.ui.draw.dur, ease = MT.ui.draw.ease) {
        const L1 = el.getTotalLength ? el.getTotalLength() : 1000;
        el.style.strokeDasharray = L1; el.style.strokeDashoffset = L1;
        S.tl.to(el, { strokeDashoffset: 0, duration: dur, ease: S.ease(ease) }, at ?? A.at("body"));
        return (at ?? A.at("body")) + dur;
      },
      pop(el, at, i = 0) { return A.enter(el, "badge", i, 0, at != null ? { at } : null); },
      list: (v) => (S.T ? S.T.list(v) : (Array.isArray(v) ? v : [])),
      data: (v) => (S.T ? S.T.data(v) : (Array.isArray(v) ? v : [])),
      tone: (v) => (S.T ? S.T.tone(v) : null),
    };
    return A;
  }

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
    slide = Object.assign({}, slide || {});
    const fmtInfo = S.setFormat(slide.format || opts.format || S.defaultFormat || "landscape");
    slide.format = fmtInfo.format;
    /* hard per-format overrides: format_overrides: {portrait: {size: 70, columns: 1, ...}} */
    const fo = slide.format_overrides && slide.format_overrides[fmtInfo.format];
    if (fo && typeof fo === "object") Object.assign(slide, fo);
    S.slide = slide;
    if (S.tl) S.tl.kill(); if (S.amb) S.amb.kill(); if (S.camTl) S.camTl.kill(); S.camTl = null;
    S.tl = gsap.timeline({ paused: true, defaults: { ease: S.ease("textIn") } }); S.amb = gsap.timeline({ paused: true, defaults: { ease: S.ease("ambient") } });
    S._imgs = [];
    S._clipSeq = 0;

    const stage = document.getElementById("stage");
    stage.innerHTML = "";
    const lang = String(slide.lang || opts.lang || "fa").toLowerCase() === "en" ? "en" : "fa";
    S._lang = lang;
    const layout = (slide.layout || "SLIDE").toUpperCase();
    stage.className = "layout-" + layout.toLowerCase();
    stage.setAttribute("dir", lang === "en" ? "ltr" : "rtl");
    stage.setAttribute("data-lang", lang);
    stage.setAttribute("data-format", S.format);
    stage.setAttribute("data-theme-mode", (th.colors && th.colors.isDark === false) ? "light" : "dark");
    // scene surface (none | corkboard | paper | dark-grid): pure-CSS texture under the content
    const _sc = String(slide.scene || "none").trim().toLowerCase();
    S.scene = (_sc === "corkboard" || _sc === "paper" || _sc === "dark-grid") ? _sc : "none";
    stage.setAttribute("data-scene", S.scene);

    // background
    const bg = document.createElement("div"); bg.className = "bg"; stage.appendChild(bg);
    const bgs = slide.background || {};
    const bgimg = typeof bgs === "string" ? bgs : (bgs.image || slide.bg_image);
    if (bgs.color) bg.style.background = S.color(bgs.color);
    if (bgimg) {
      const wrap = document.createElement("div"); wrap.className = "bgimg"; stage.appendChild(wrap);
      const im = document.createElement("img"); im.src = bgimg; wrap.appendChild(im); S._imgs.push(im);
      im.onerror = () => wrap.remove();
      const d = document.createElement("div"); d.className = "dim"; d.style.opacity = bgs.dim ?? slide.bg_dim ?? 0.55; wrap.appendChild(d);
      S.amb.fromTo(im, { scale: 1 }, { scale: MT.clampScale(MT.camera.kenburns.bg.scale), duration: MT.camera.kenburns.bg.period, ease: S.ease(MT.camera.kenburns.bg.ease) }, 0);
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
        { opacity: g.opacity[1], x: g.move, y: g.move * 0.6, duration: half, ease: S.ease(MT.atmosphere.glow.ease), yoyo: true, repeat: MT.atmosphere.glow.repeat }, 0);
    }
    if (S.fx) S.fx.atmosphere(stage, slide);
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
      S.fx.post(content);
      S.fx.grain(stage);
    }
    if (slide.vignette !== false) {
      const vig = document.createElement("div");
      vig.className = "vignette";
      stage.appendChild(vig);
    }
    // common extras: source credit + note
    const Lf = A.L, footB = A.landscape ? null : Math.max(26, Lf.bottom - 70);
    if (slide.source) {
      const s = A.text(content, slide.source, "caption", "source");
      if (!A.landscape) A.css(s, { bottom: footB, right: Lf.margin, maxWidth: W - 2 * Lf.margin });
      A.enter(s, "note");
    }
    if (slide.note) {
      const n = A.text(content, slide.note, "caption", "note " + (A.scam ? "note-scam" : ""));
      if (!A.landscape) {
        A.css(n, { left: Lf.margin, right: Lf.margin, maxWidth: "none", bottom: A.scam ? H - Lf.cam[1] + 8 : footB + (slide.source ? 40 : 0) });
      }
      A.enter(n, "note");
    }
    if (opts.camGuide || S._camGuide) {
      const c = A.L.cam; const cg = document.createElement("div"); cg.className = "camguide";
      Object.assign(cg.style, {
        left: c[0] + "px", top: c[1] + "px", width: (c[2] - c[0]) + "px", height: (c[3] - c[1]) + "px",
        display: layout === "SCAM" ? "flex" : "none",
      });
      cg.textContent = S._lang === "en" ? "Camera Zone" : "جای دوربین"; stage.appendChild(cg);
    }
    // Transition in (default "soft-fade" matches classic .fadein)
    if (S.fx && S.fx.transitionIn) {
      S.fx.transitionIn(stage, slide, th);
    } else {
      const fade = document.createElement("div"); fade.className = "fadein"; stage.appendChild(fade);
      const fadeTok = MT.transitions.softFade;
      const fadeDur = (th.clip && th.clip.fade > 0) ? th.clip.fade : fadeTok.dur;
      if (fadeDur > 0) S.tl.fromTo(fade, { opacity: 1 }, { opacity: 0, duration: fadeDur, ease: S.ease(fadeTok.ease), immediateRender: true }, 0);
      else fade.remove();
    }

    await Promise.all(S._imgs.map((im) => im.decode().catch(() => {})));
    const zoomCount = buildCameraTimeline(stage, slide, W, H);
    const camDur = S.camTl ? S.camTl.duration() : 0;
    const ent = S.tl.duration();
    S._entrances = ent;
    const clip = th.clip || MT.clip;
    const sayDur = estimateSayDuration(slide);
    const baseMin = +slide.duration ? +slide.duration : Math.max(clip.min, sayDur || 0);
    S._dur = zoomCount > 0 ? Math.max(baseMin, ent + clip.hold, camDur) : Math.max(baseMin, ent + clip.hold);
    S.seek(0);
    S.ready = true;
    const fxi = S.fx ? {
      variant: S.fx.cur.variant,
      preset: S.fx.cur.preset,
      motion: S.fx.cur.motion,
      transition: S.fx.cur.transition,
      transitionOpts: S.fx.cur.transitionOpts,
      logoMotion: S.fx.cur.logoMotion,
      leak: S.fx.cur.leak,
      dust: S.fx.cur.dust,
    } : {};
    return {
      format: S.format,
      scene: S.scene || "none",
      width: W,
      height: H,
      duration: S._dur,
      entrances: ent,
      sayDuration: sayDur,
      fps: S.fps,
      frames: Math.round(S._dur * S.fps),
      fx: fxi,
      cues: (S.cues || []).sort((a, b) => a.t - b.t),
      zoomPoints: zoomCount,
    };
  };
  S.seek = function (t) {
    if (S.tl) S.tl.time(Math.min(t, S.tl.duration()), false);
    if (S.amb) S.amb.time(t, false);
    if (S.camTl) {
      S.camTl.time(Math.min(t, S.camTl.duration()), false);
      if (S._applyCamera) S._applyCamera();
    }
    S._t = t;
  };
  S.duration = () => S._dur;
  S.camOverlap = function () {
    if ((S.slide.layout || "").toUpperCase() !== "SCAM") return [];
    const c = (S._L || S.theme.layout).cam, st = document.getElementById("stage").getBoundingClientRect();
    const bad = [];
    document.querySelectorAll("#stage .content *").forEach((e) => {
      if (e.closest(".fullbleed")) return;
      if (e.children.length && !e.matches(".frame,.card,.bubble,.bar,.t-body,.t-h1,.t-hero,.t-label,.t-caption,.t-eyebrow,.t-quote,.num,.stage-logo")) return;
      const r = e.getBoundingClientRect(); if (!r.width || !r.height) return;
      const x0 = r.left - st.left, y0 = r.top - st.top, x1 = x0 + r.width, y1 = y0 + r.height;
      if (x0 < c[2] && x1 > c[0] && y0 < c[3] && y1 > c[1]) bad.push((e.className || e.tagName) + " " + (e.textContent || "").slice(0, 30));
    });
    return bad;
  };

  S.getFieldBoxes = function () {
    const stage = document.getElementById("stage");
    if (!stage) return [];
    const st = stage.getBoundingClientRect();
    const scaleX = st.width ? (W / st.width) : 1;
    const scaleY = st.height ? (H / st.height) : 1;
    const boxes = [];
    stage.querySelectorAll("[data-field-wrap]").forEach((wrap) => {
      const key = wrap.dataset.fieldWrap;
      if (!key) return;
      const r = wrap.getBoundingClientRect();
      if (!r.width || !r.height) return;
      boxes.push({
        key,
        rect: {
          x: Math.round((r.left - st.left) * scaleX),
          y: Math.round((r.top - st.top) * scaleY),
          w: Math.round(r.width * scaleX),
          h: Math.round(r.height * scaleY),
        },
      });
    });
    return boxes;
  };

  function applyLiveOverride(key, x, y, scale) {
    const stage = document.getElementById("stage");
    if (!stage || !key) return;
    let wrap = null;
    stage.querySelectorAll("[data-field-wrap]").forEach((el) => {
      if (!wrap && el.dataset.fieldWrap === String(key)) wrap = el;
    });
    if (!wrap) return;
    const nx = Number.isFinite(+x) ? +x : 0;
    const ny = Number.isFinite(+y) ? +y : 0;
    const nsc = Number.isFinite(+scale) ? +scale : 1;
    wrap.style.transform = (nx === 0 && ny === 0 && nsc === 1) ? "" : `translate(${nx}px, ${ny}px) scale(${nsc})`;
    if (S.slide) {
      if (!S.slide.overrides || typeof S.slide.overrides !== "object") S.slide.overrides = {};
      if (nx === 0 && ny === 0 && nsc === 1) delete S.slide.overrides[key];
      else S.slide.overrides[key] = { x: nx, y: ny, scale: nsc };
    }
  }

  /* preview playback (editor): drives the same seek() from the clock */
  let raf = null;
  S.play = function (from = 0) {
    cancelAnimationFrame(raf);
    const t0 = performance.now() - from * 1000;
    const loop = () => {
      const t = (performance.now() - t0) / 1000;
      S.seek(Math.min(t, S._dur));
      if (t < S._dur) raf = requestAnimationFrame(loop);
      else S.onEnd && S.onEnd();
    };
    raf = requestAnimationFrame(loop);
  };
  S.stop = () => cancelAnimationFrame(raf);

  /* editor bridge */
  window.addEventListener("message", async (e) => {
    const d = e.data || {};
    if (d.cmd === "load") {
      S._camGuide = !!d.camGuide;
      const info = await S.load(d.slide, { theme: d.theme, camGuide: d.camGuide });
      if (d.at != null) S.seek(d.at); else S.play(0);
      parent.postMessage({ cmd: "loaded", info, cam: S.camOverlap(), fields: S.getFieldBoxes(), camRect: (S._L || S.theme.layout).cam }, "*");
    } else if (d.cmd === "seek") { S.stop(); S.seek(d.t); }
    else if (d.cmd === "play") S.play(d.from || 0);
    else if (d.cmd === "getFields") {
      parent.postMessage({ cmd: "fields", fields: S.getFieldBoxes(), cam: S.camOverlap() }, "*");
    } else if (d.cmd === "setOverride") {
      applyLiveOverride(d.key, d.x, d.y, d.scale);
      parent.postMessage({ cmd: "fields", fields: S.getFieldBoxes(), cam: S.camOverlap() }, "*");
    }
  });
})();
