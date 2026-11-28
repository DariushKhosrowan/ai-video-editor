/* Khordegir Studio — Red Eagle Mascot Layered SVG Rig & Deterministic Acting Engine (Puppet Schema v2).
   Matches the reference sheet (red plumage, black chest/legs, yellow hooked beak & talons,
   three-stripe wing motif, large white eyes with black pupils, thick clean black outlines, flat 2D).
   100% deterministic & frame-exact: every pose is evaluated purely from time t (no Math.random, no rAF state).
   Phase 1: 18-part tree, mass-spring-damper physics (stiffness/damping/mass), palette lock, 10 presets,
            per-sentence overrides, keyframed tone curves.
   Phase 2: 15 emotions + intensity + script tags + auto-emotion, 9 gestures + timing offsets,
            gaze smooth pursuit + saccades + emotion-modulated blink rate,
            secondary motion (feather jiggle, crest overlap, wing follow-through, volume-preserving squash). */
(function () {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const TOKENS = window.StageMotionTokens || {};
  const PAL = TOKENS.MASCOT_PALETTE || {
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
  const PUPPET_PARTS = TOKENS.PUPPET_PARTS || {};
  const VISEMES = TOKENS.VISEMES || {
    closed:  { jawOpen: 0.00, upperLift: 0.00, widthScale: 1.00, teeth: 0.00, tongue: 0.00, lipTuck: 0.00 },
    rest:    { jawOpen: 0.03, upperLift: 0.00, widthScale: 1.00, teeth: 0.00, tongue: 0.00, lipTuck: 0.00 },
    small:   { jawOpen: 0.24, upperLift: 0.08, widthScale: 0.96, teeth: 0.08, tongue: 0.20, lipTuck: 0.00 },
    open:    { jawOpen: 0.56, upperLift: 0.20, widthScale: 1.02, teeth: 0.14, tongue: 0.68, lipTuck: 0.00 },
    wide:    { jawOpen: 0.88, upperLift: 0.34, widthScale: 1.12, teeth: 0.20, tongue: 0.95, lipTuck: 0.00 },
    round_o: { jawOpen: 0.52, upperLift: 0.16, widthScale: 0.72, teeth: 0.00, tongue: 0.45, lipTuck: 0.00 },
    e_teeth: { jawOpen: 0.28, upperLift: 0.14, widthScale: 1.16, teeth: 0.96, tongue: 0.10, lipTuck: 0.00 },
    f_v:     { jawOpen: 0.14, upperLift: 0.05, widthScale: 1.02, teeth: 0.65, tongue: 0.00, lipTuck: 0.85 },
  };
  const EXPRESSIONS = TOKENS.EXPRESSIONS || {
    neutral: { browLRot: 12, browRRot: -12, browLY: 0, browRY: 0, eyeScaleX: 1, eyeScaleY: 1, upperLid: 0.04, lowerLid: 0.02, smugArc: 0, beakSmile: 0, headTilt: 0, headPitch: 0, crestTilt: 0, wingPose: "crossed", accent: "none", blinkMult: 1.0 },
  };
  const GESTURES = TOKENS.GESTURES || {
    point: { defaultDur: 1.15, pose: "point" },
    shrug: { defaultDur: 1.10, pose: "shrug" },
    facepalm: { defaultDur: 1.35, pose: "facepalm" },
    "wing-cross": { defaultDur: 1.20, pose: "crossed" },
    "thumbs-up": { defaultDur: 1.15, pose: "thumbs-up" },
    clap: { defaultDur: 1.25, pose: "clap" },
    salute: { defaultDur: 1.20, pose: "salute" },
    "chin-scratch": { defaultDur: 1.30, pose: "thinking" },
    "double-take": { defaultDur: 0.95, pose: "double-take" },
  };
  const ACTING = TOKENS.ACTING || {
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
  const TONE_LIMITS = TOKENS.TONE_LIMITS || {
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
  const resolveToneConfig = TOKENS.resolveToneConfig || ((raw) => Object.assign({
    preset: "lively", mouthGain: 1, browGain: 1, headGain: 1, chestGain: 1, wingGain: 1, blinkRate: 1, idleSway: 1, springFreq: 14,
  }, (raw && typeof raw === "object") ? raw : {}));
  const CHARACTERS = TOKENS.CHARACTERS || {};
  const OUTFITS = TOKENS.OUTFITS || {};
  const SKINS = TOKENS.SKINS || {};
  const ACCESSORIES = TOKENS.ACCESSORIES || {};
  const LIGHTING_PRESETS = TOKENS.LIGHTING_PRESETS || {
    studio:        { intensity: 0,    rimColor: "#FFFFFF", tintColor: "transparent", tintAlpha: 0,    rimAlpha: 0 },
    "rim-light":   { intensity: 0.85, rimColor: "#F5B700", tintColor: "#0EA5E9",     tintAlpha: 0.06, rimAlpha: 0.75 },
    warm:          { intensity: 0.75, rimColor: "#FBBF24", tintColor: "#F59E0B",     tintAlpha: 0.14, rimAlpha: 0.45 },
    cool:          { intensity: 0.75, rimColor: "#38BDF8", tintColor: "#0EA5E9",     tintAlpha: 0.14, rimAlpha: 0.48 },
    "dramatic-noir":{ intensity: 0.9, rimColor: "#E2E8F0", tintColor: "#09090B",     tintAlpha: 0.24, rimAlpha: 0.70 },
    "sunset-gold": { intensity: 0.80, rimColor: "#FB923C", tintColor: "#F97316",     tintAlpha: 0.16, rimAlpha: 0.62 },
  };

  /* ------------------------------------------------ Phase 6 Item 22: Plugin API Registries */
  const CUSTOM_EMOTIONS = Object.create(null);
  const CUSTOM_GESTURES = Object.create(null);

  function sanitizePluginName(name) {
    return String(name || "").trim().toLowerCase().replace(/[^a-z0-9_\-]/g, "");
  }

  function registerEmotion(name, spec = {}) {
    const key = sanitizePluginName(name);
    if (!key) throw new Error("Emotion plugin name must be a non-empty alphanumeric/dash string");
    if (!spec || typeof spec !== "object") throw new Error("Emotion plugin spec must be an object");
    const base = EXPRESSIONS.neutral || {};
    const entry = {
      label: String(spec.label || key),
      labelEn: String(spec.labelEn || key),
      browLRot: clamp(Number(spec.browLRot ?? base.browLRot ?? 0), -32, 32),
      browRRot: clamp(Number(spec.browRRot ?? base.browRRot ?? 0), -32, 32),
      browLY: clamp(Number(spec.browLY ?? 0), -24, 16),
      browRY: clamp(Number(spec.browRY ?? 0), -24, 16),
      eyeScaleX: clamp(Number(spec.eyeScaleX ?? 1.0), 0.7, 1.3),
      eyeScaleY: clamp(Number(spec.eyeScaleY ?? 1.0), 0.65, 1.35),
      upperLid: clamp(Number(spec.upperLid ?? 0.05), 0, 0.9),
      lowerLid: clamp(Number(spec.lowerLid ?? 0.02), 0, 0.6),
      smugArc: clamp(Number(spec.smugArc ?? 0), 0, 1),
      beakSmile: clamp(Number(spec.beakSmile ?? 0), -1, 1),
      headTilt: clamp(Number(spec.headTilt ?? 0), -18, 18),
      headPitch: clamp(Number(spec.headPitch ?? 0), -14, 14),
      crestTilt: clamp(Number(spec.crestTilt ?? 0), -18, 18),
      wingPose: String(spec.wingPose || "crossed"),
      accent: String(spec.accent || "none"),
      blinkMult: clamp(Number(spec.blinkMult ?? 1.0), 0.35, 2.2),
      isPlugin: true,
    };
    CUSTOM_EMOTIONS[key] = entry;
    return entry;
  }

  function unregisterEmotion(name) {
    const key = sanitizePluginName(name);
    if (!key || !Object.prototype.hasOwnProperty.call(CUSTOM_EMOTIONS, key)) return false;
    delete CUSTOM_EMOTIONS[key];
    return true;
  }

  function registerGesture(name, specOrFn) {
    const key = sanitizePluginName(name);
    if (!key) throw new Error("Gesture plugin name must be a non-empty alphanumeric/dash string");
    if (typeof specOrFn === "function") {
      const entry = {
        label: key,
        labelEn: key,
        defaultDur: 1.1,
        pose: "custom",
        evaluate: specOrFn,
        isPlugin: true,
      };
      CUSTOM_GESTURES[key] = entry;
      return entry;
    }
    if (!specOrFn || typeof specOrFn !== "object") {
      throw new Error("Gesture plugin must be a spec object or deterministic evaluate(ctx) function");
    }
    const entry = {
      label: String(specOrFn.label || key),
      labelEn: String(specOrFn.labelEn || key),
      defaultDur: clamp(Number(specOrFn.defaultDur ?? 1.1), 0.25, 4.0),
      pose: String(specOrFn.pose || "custom"),
      headTilt: clamp(Number(specOrFn.headTilt ?? 0), -24, 24),
      headNod: clamp(Number(specOrFn.headNod ?? 0), -20, 20),
      wingAngle: clamp(Number(specOrFn.wingAngle ?? 0), -35, 35),
      wingLRot: clamp(Number(specOrFn.wingLRot ?? 0), -45, 45),
      wingRRot: clamp(Number(specOrFn.wingRRot ?? 0), -45, 45),
      browLift: clamp(Number(specOrFn.browLift ?? 0), -18, 18),
      bodyBounce: clamp(Number(specOrFn.bodyBounce ?? 0), -16, 16),
      crestTilt: clamp(Number(specOrFn.crestTilt ?? 0), -20, 20),
      evaluate: typeof specOrFn.evaluate === "function" ? specOrFn.evaluate : null,
      isPlugin: true,
    };
    CUSTOM_GESTURES[key] = entry;
    return entry;
  }

  function unregisterGesture(name) {
    const key = sanitizePluginName(name);
    if (!key || !Object.prototype.hasOwnProperty.call(CUSTOM_GESTURES, key)) return false;
    delete CUSTOM_GESTURES[key];
    return true;
  }

  function getEmotionSpec(name, puppet = null) {
    const key = sanitizePluginName(name);
    if (!key) return null;
    if (puppet && puppet.plugins && puppet.plugins.emotions && puppet.plugins.emotions[key]) {
      return puppet.plugins.emotions[key];
    }
    if (Object.prototype.hasOwnProperty.call(CUSTOM_EMOTIONS, key)) return CUSTOM_EMOTIONS[key];
    if (Object.prototype.hasOwnProperty.call(EXPRESSIONS, key)) return EXPRESSIONS[key];
    return null;
  }

  function getGestureSpec(name, puppet = null) {
    const key = sanitizePluginName(name);
    if (!key) return null;
    if (puppet && puppet.plugins && puppet.plugins.gestures && puppet.plugins.gestures[key]) {
      return puppet.plugins.gestures[key];
    }
    if (Object.prototype.hasOwnProperty.call(CUSTOM_GESTURES, key)) return CUSTOM_GESTURES[key];
    if (Object.prototype.hasOwnProperty.call(GESTURES, key)) return GESTURES[key];
    return null;
  }

  function listEmotions(puppet = null) {
    const set = new Set(Object.keys(EXPRESSIONS));
    Object.keys(CUSTOM_EMOTIONS).forEach((k) => set.add(k));
    if (puppet && puppet.plugins && puppet.plugins.emotions) {
      Object.keys(puppet.plugins.emotions).forEach((k) => set.add(k));
    }
    return Array.from(set).sort();
  }

  function listGestures(puppet = null) {
    const set = new Set(Object.keys(GESTURES));
    Object.keys(CUSTOM_GESTURES).forEach((k) => set.add(k));
    if (puppet && puppet.plugins && puppet.plugins.gestures) {
      Object.keys(puppet.plugins.gestures).forEach((k) => set.add(k));
    }
    return Array.from(set).sort();
  }

  const resolvePuppetConfig = TOKENS.resolvePuppetConfig || ((raw, leg) => ({
    version: 2,
    character: "red_eagle",
    outfit: "default",
    skin: "classic",
    preset: "lively",
    paletteLock: true,
    palette: Object.assign({}, PAL),
    tone: resolveToneConfig(leg),
    spring: { stiffness: 196, damping: 28, mass: 1.0 },
    limits: Object.assign({}, TONE_LIMITS),
    parts: {},
    secondary: { featherJiggle: 0.55, crestOverlap: 0.65, wingFollowThrough: 0.60, squashPreserveVolume: true },
    emotion: null,
    emotionIntensity: 1.0,
    autoEmotion: false,
    keyframes: [],
    sentences: [],
    gestures: [],
    gaze: { target: "auto", smoothPursuit: 10, saccadeScale: 1.0, timeline: [] },
    accessories: [],
    accessoryTimeline: [],
  }));
  const parseScriptTags = TOKENS.parseScriptTags || ((txt) => ({ cleanText: String(txt || ""), emotions: [], gestures: [], gaze: [], accessories: [] }));

  /* ------------------------------------------------ Deterministic PRNG (no Math.random) */
  function hashStr(str) {
    let h = 2166136261 >>> 0;
    const s = String(str || "mascot");
    for (let i = 0; i < s.length; i += 1) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function makeRng(seedKey) {
    let a = hashStr(seedKey);
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function lerp(a, b, u) { return a + (b - a) * u; }
  function smoothstep(u) {
    const x = clamp(u, 0, 1);
    return x * x * (3 - 2 * x);
  }
  function smootherstep(u) {
    const x = clamp(u, 0, 1);
    return x * x * x * (10 - x * (15 - 6 * x));
  }

  function svgNode(tag, attrs = {}, parent = null) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) {
      if (attrs[k] != null) el.setAttribute(k, String(attrs[k]));
    }
    if (attrs["stroke-width"] != null) {
      el.setAttribute("data-base-sw", String(attrs["stroke-width"]));
    }
    if (parent) parent.appendChild(el);
    return el;
  }

  function walkTree(node, fn) {
    if (!node) return;
    fn(node);
    const kids = node.children || [];
    for (let i = 0; i < kids.length; i += 1) {
      walkTree(kids[i], fn);
    }
  }

  /* ------------------------------------------------ Analytical 2nd-Order Mass-Spring-Damper */
  function computeDampingRatio(springCfg) {
    const k = clamp(Number(springCfg && springCfg.stiffness) || 196, 20, 900);
    const c = clamp(Number(springCfg && springCfg.damping) || 28, 2, 120);
    const m = clamp(Number(springCfg && springCfg.mass) || 1.0, 0.2, 5.0);
    return c / (2 * Math.sqrt(k * m));
  }

  function stepCriticalSpring(st, target, omega, dt) {
    const w = Math.max(2, Number(omega) || 14);
    const h = Math.max(1e-4, Math.min(0.1, Number(dt) || (1 / 30)));
    const delta = st.x - target;
    const temp = st.v + w * delta;
    const exp = Math.exp(-w * h);
    st.x = target + (delta + temp * h) * exp;
    st.v = (st.v - temp * w * h) * exp;
    return st.x;
  }

  /* Exact closed-form solver for m*x'' + c*x' + k*(x - target) = 0
     Handles underdamped (zeta < 1), critically damped (zeta == 1), and overdamped (zeta > 1). */
  function stepMassSpring(st, target, springCfg, dt, freqScale = 1.0) {
    const m = clamp(Number(springCfg && springCfg.mass) || 1.0, 0.2, 5.0);
    const k = clamp(Number(springCfg && springCfg.stiffness) || 196, 20, 900) * (freqScale * freqScale);
    const c = clamp(Number(springCfg && springCfg.damping) || 28, 2, 120) * freqScale;
    const h = Math.max(1e-4, Math.min(0.1, Number(dt) || (1 / 30)));

    const w0 = Math.sqrt(k / m);
    const zeta = c / (2 * Math.sqrt(k * m));
    const x0 = st.x - target;
    const v0 = st.v;

    if (Math.abs(zeta - 1.0) <= 1e-3) {
      // Critically damped
      const exp = Math.exp(-w0 * h);
      const A = x0;
      const B = v0 + w0 * x0;
      st.x = target + (A + B * h) * exp;
      st.v = (B - w0 * (A + B * h)) * exp;
    } else if (zeta < 1.0) {
      // Underdamped (lively bounce / overshoot)
      const wd = w0 * Math.sqrt(1 - zeta * zeta);
      const exp = Math.exp(-zeta * w0 * h);
      const cosT = Math.cos(wd * h);
      const sinT = Math.sin(wd * h);
      const A = x0;
      const B = (v0 + zeta * w0 * x0) / wd;
      st.x = target + exp * (A * cosT + B * sinT);
      st.v = exp * ((-zeta * w0 * A + wd * B) * cosT + (-zeta * w0 * B - wd * A) * sinT);
    } else {
      // Overdamped (heavy / slow settle)
      const s = Math.sqrt(zeta * zeta - 1);
      const r1 = -w0 * (zeta - s);
      const r2 = -w0 * (zeta + s);
      const denom = r1 - r2;
      const c1 = (v0 - r2 * x0) / denom;
      const c2 = (r1 * x0 - v0) / denom;
      const e1 = Math.exp(r1 * h);
      const e2 = Math.exp(r2 * h);
      st.x = target + c1 * e1 + c2 * e2;
      st.v = c1 * r1 * e1 + c2 * r2 * e2;
    }
    return st.x;
  }

  /* ------------------------------------------------ Fallback speech synthesis from `say` text */
  function buildTextVisemeTrack(sayText, fps = 30, duration = 6, seed = "say") {
    const parsed = parseScriptTags(sayText, duration);
    const txt = String(parsed.cleanText || "").trim();
    const totalFrames = Math.max(1, Math.round(duration * fps));
    const rng = makeRng(`${seed}:${txt.slice(0, 64)}`);
    const frames = [];
    const peaks = [];
    const phrases = [];

    if (!txt) {
      for (let i = 0; i < totalFrames; i += 1) {
        frames.push({ t: +(i / fps).toFixed(4), viseme: "rest", energy: 0, openness: 0, width: 1, stress: 0, is_speech: false });
      }
      return { version: 1, fps, duration, source: "silence", frames, peaks, phrases };
    }

    const words = txt.split(/\s+/).filter(Boolean);
    const estSpeechDur = clamp(words.length / 2.25 + 0.5, 1.2, Math.max(1.2, duration - 0.6));
    const startOffset = 0.25;
    const endSpeech = Math.min(duration - 0.25, startOffset + estSpeechDur);
    if (endSpeech - startOffset >= ACTING.gestureMinPhraseSec) {
      phrases.push({ start: +startOffset.toFixed(3), end: +endSpeech.toFixed(3) });
    }

    const charToViseme = (ch) => {
      if (/[بپمbpm]/i.test(ch)) return "closed";
      if (/[فوfv]/i.test(ch)) return "f_v";
      if (/[آاa]/i.test(ch)) return "wide";
      if (/[اوuoō]/i.test(ch)) return "round_o";
      if (/[یieé]/i.test(ch)) return "e_teeth";
      if (/[هعخحغقکگ]/i.test(ch)) return "open";
      return rng() < 0.45 ? "open" : "small";
    };

    const chars = [...txt.replace(/\s+/g, " ")];
    const activeSpan = Math.max(0.6, endSpeech - startOffset);

    const wordStep = activeSpan / Math.max(1, words.length);
    words.forEach((w, wi) => {
      if (/[!*؟]/.test(w) || (wi % 4 === 1 && w.length >= 4)) {
        peaks.push({ t: +(startOffset + (wi + 0.35) * wordStep).toFixed(3), strength: +(0.68 + rng() * 0.28).toFixed(3) });
      }
    });

    let lastVis = "closed";
    let holdLeft = 0;

    for (let i = 0; i < totalFrames; i += 1) {
      const t = i / fps;
      if (t < startOffset || t > endSpeech) {
        frames.push({ t: +t.toFixed(4), viseme: "rest", energy: 0.02, openness: 0, width: 1, stress: 0, is_speech: false });
        continue;
      }
      const u = (t - startOffset) / activeSpan;
      const charIdx = clamp(Math.floor(u * chars.length), 0, chars.length - 1);
      const ch = chars[charIdx];

      const inPause = ch === " " || /[،.؛!؟]/.test(ch);
      const syllableEnv = inPause ? 0.08 : 0.48 + 0.42 * Math.abs(Math.sin(u * words.length * Math.PI * 1.45));
      let stress = 0;
      for (const pk of peaks) {
        const dt = Math.abs(t - pk.t);
        if (dt < 0.18) stress = Math.max(stress, pk.strength * (1 - dt / 0.18));
      }
      const energy = clamp(syllableEnv + stress * 0.28, 0, 1);

      let vis = lastVis;
      if (holdLeft <= 0) {
        vis = inPause ? "closed" : charToViseme(ch);
        holdLeft = 2;
      } else {
        holdLeft -= 1;
      }
      lastVis = vis;
      const spec = VISEMES[vis] || VISEMES.small;
      frames.push({
        t: +t.toFixed(4),
        viseme: vis,
        energy: +energy.toFixed(3),
        openness: +spec.jawOpen.toFixed(3),
        width: +spec.widthScale.toFixed(3),
        stress: +stress.toFixed(3),
        is_speech: !inPause,
      });
    }

    return { version: 1, fps, duration, source: "say-fallback", frames, peaks, phrases };
  }

  /* ------------------------------------------------ Keyframes & Per-Sentence Overrides (Phase 1 Item 4) */
  function evaluateKeyframeChannel(keyframes, channel, t, baseVal) {
    if (!Array.isArray(keyframes) || !keyframes.length) return baseVal;
    const pts = [];
    for (let i = 0; i < keyframes.length; i += 1) {
      if (keyframes[i].gain === channel) pts.push(keyframes[i]);
    }
    if (!pts.length) return baseVal;
    if (t <= pts[0].t) return pts[0].value;
    if (t >= pts[pts.length - 1].t) return pts[pts.length - 1].value;
    for (let i = 0; i < pts.length - 1; i += 1) {
      const a = pts[i];
      const b = pts[i + 1];
      if (t >= a.t && t <= b.t) {
        const span = Math.max(1e-5, b.t - a.t);
        const rawU = (t - a.t) / span;
        const ease = b.ease || a.ease || "smooth";
        if (ease === "step") return a.value;
        const u = ease === "linear" ? rawU : smoothstep(rawU);
        return lerp(a.value, b.value, u);
      }
    }
    return baseVal;
  }

  function evaluateToneAt(puppet, t) {
    let effTone = Object.assign({}, puppet.tone);
    let effSpring = Object.assign({}, puppet.spring);
    let effIntensity = puppet.emotionIntensity ?? 1.0;
    let sentenceMatch = null;

    // 1. Active per-sentence override (start <= t <= end)
    const sentences = puppet.sentences || [];
    for (let i = 0; i < sentences.length; i += 1) {
      const sent = sentences[i];
      if (t >= sent.start && t <= sent.end) {
        sentenceMatch = sent;
        if (sent.preset || sent.tone) {
          const sentTone = resolveToneConfig(Object.assign(
            {},
            effTone,
            sent.preset ? { preset: sent.preset } : {},
            (sent.tone && typeof sent.tone === "object") ? sent.tone : {},
          ));
          effTone = sentTone;
        }
        if (sent.spring && typeof sent.spring === "object") {
          effSpring = Object.assign({}, effSpring, sent.spring);
        }
        if (sent.emotionIntensity != null && Number.isFinite(Number(sent.emotionIntensity))) {
          effIntensity = clamp(Number(sent.emotionIntensity), 0, 1.5);
        }
        break;
      }
    }

    // 2. Keyframed curves override individual gains cleanly over time
    const kfs = puppet.keyframes || [];
    if (kfs.length) {
      const gainKeys = ["mouthGain", "browGain", "headGain", "chestGain", "wingGain", "blinkRate", "idleSway"];
      for (let i = 0; i < gainKeys.length; i += 1) {
        const gk = gainKeys[i];
        const v = evaluateKeyframeChannel(kfs, gk, t, effTone[gk]);
        effTone[gk] = clamp(v, gk === "blinkRate" ? 0.3 : 0, 2.0);
      }
      effIntensity = clamp(evaluateKeyframeChannel(kfs, "emotionIntensity", t, effIntensity), 0, 1.5);
      effSpring.stiffness = clamp(evaluateKeyframeChannel(kfs, "stiffness", t, effSpring.stiffness), 40, 600);
      effSpring.damping = clamp(evaluateKeyframeChannel(kfs, "damping", t, effSpring.damping), 4, 65);
    }

    return { tone: effTone, spring: effSpring, emotionIntensity: effIntensity, sentence: sentenceMatch };
  }

  /* ------------------------------------------------ Emotion Engine (Phase 2 Item 5 + Phase 6 Plugin API) */
  function normalizeExpressionTimeline(slide, puppet, scriptParsed) {
    const baseRaw = String((puppet && puppet.emotion) || slide.expression || "neutral").toLowerCase();
    const baseExpr = getEmotionSpec(baseRaw, puppet) ? baseRaw : "neutral";
    const baseIntensity = clamp(Number((puppet && puppet.emotionIntensity) ?? 1.0), 0, 1.5);
    const rawList = Array.isArray(slide.expression_timeline)
      ? slide.expression_timeline
      : Array.isArray(slide.expressions)
        ? slide.expressions
        : [];

    const cues = [{ t: 0, expression: baseExpr, blend: 0.35, intensity: baseIntensity }];

    rawList.forEach((item) => {
      if (!item || typeof item !== "object") return;
      const tVal = Number(item.t ?? item.at ?? item.time ?? 0);
      const expr = String(item.expression || item.preset || "neutral").toLowerCase();
      if (!Number.isFinite(tVal) || !getEmotionSpec(expr, puppet)) return;
      cues.push({
        t: Math.max(0, tVal),
        expression: expr,
        blend: clamp(Number(item.blend ?? 0.35), 0.05, 1.5),
        intensity: clamp(Number(item.intensity ?? baseIntensity), 0, 1.5),
      });
    });

    // Merge script tag emotions ([smug], [angry:1.3], ...)
    if (scriptParsed && Array.isArray(scriptParsed.emotions)) {
      scriptParsed.emotions.forEach((em) => {
        if (getEmotionSpec(em.expression, puppet)) {
          cues.push({
            t: Math.max(0, Number(em.t) || 0),
            expression: em.expression,
            blend: clamp(Number(em.blend ?? 0.32), 0.05, 1.5),
            intensity: clamp(Number(em.intensity ?? baseIntensity), 0, 1.5),
          });
        }
      });
    }

    // Merge per-sentence emotion overrides
    if (puppet && Array.isArray(puppet.sentences)) {
      puppet.sentences.forEach((sent) => {
        const em = String(sent.emotion || "").toLowerCase();
        if (getEmotionSpec(em, puppet)) {
          cues.push({
            t: Math.max(0, Number(sent.start) || 0),
            expression: em,
            blend: 0.28,
            intensity: clamp(Number(sent.emotionIntensity ?? baseIntensity), 0, 1.5),
          });
        }
      });
    }

    cues.sort((a, b) => a.t - b.t);
    return cues;
  }

  function inferAutoEmotion(pro) {
    if (!pro || !pro.is_speaking) return null;
    const loud = clamp(Number(pro.loudness || 0), 0, 1);
    const pitch = clamp(Number(pro.pitch_norm || 0), -1, 1);
    const emph = clamp(Number(pro.emphasis || 0), 0, 1);
    if (loud > 0.62 && pitch > 0.35) return { name: emph > 0.65 ? "surprised" : "happy", weight: clamp(loud * 0.65, 0, 0.72) };
    if (loud > 0.60 && pitch < -0.22) return { name: "angry", weight: clamp(loud * 0.68, 0, 0.75) };
    if (loud < 0.28 && pitch < -0.25) return { name: "sad", weight: 0.48 };
    if (pitch > 0.45) return { name: "happy", weight: 0.45 };
    return null;
  }

  function evaluateExpressionAt(cues, t, globalIntensity = 1.0, autoPro = null, puppet = null) {
    const neu = EXPRESSIONS.neutral;
    if (!cues || !cues.length) return Object.assign({}, neu, { name: "neutral", accentStrength: 1, blinkMult: 1.0 });

    let cur = cues[0];
    let prev = cues[0];
    for (let i = 0; i < cues.length; i += 1) {
      if (cues[i].t <= t) {
        prev = cur;
        cur = cues[i];
      } else {
        break;
      }
    }
    const targetSpec = getEmotionSpec(cur.expression, puppet) || neu;
    const prevSpec = getEmotionSpec(prev.expression, puppet) || neu;
    const blendDur = cur.blend || 0.35;
    const dt = t - cur.t;
    const u = cur === prev ? 1 : smootherstep(dt / Math.max(0.05, blendDur));

    const prevInt = clamp(Number(prev.intensity ?? 1.0), 0, 1.5);
    const curInt = clamp(Number(cur.intensity ?? 1.0), 0, 1.5);
    const effInt = clamp(lerp(prevInt, curInt, u) * (globalIntensity != null ? globalIntensity : 1.0), 0, 1.5);

    const out = {
      name: cur.expression,
      wingPose: targetSpec.wingPose || "crossed",
      accent: targetSpec.accent || "none",
      accentStrength: clamp(u * Math.min(1.2, effInt), 0, 1),
      blinkMult: lerp(prevSpec.blinkMult || 1.0, targetSpec.blinkMult || 1.0, u),
      intensity: effInt,
    };

    const numFields = [
      "browLRot", "browRRot", "browLY", "browRY",
      "eyeScaleX", "eyeScaleY", "upperLid", "lowerLid",
      "smugArc", "beakSmile", "headTilt", "headPitch", "crestTilt",
    ];
    for (let i = 0; i < numFields.length; i += 1) {
      const k = numFields[i];
      const blended = lerp(prevSpec[k] ?? neu[k] ?? 0, targetSpec[k] ?? neu[k] ?? 0, u);
      const neuVal = neu[k] ?? 0;
      out[k] = neuVal + (blended - neuVal) * effInt;
    }

    // Optional Auto-Emotion from voice prosody
    if (autoPro) {
      const auto = inferAutoEmotion(autoPro);
      const aSpec = auto ? getEmotionSpec(auto.name, puppet) : null;
      if (auto && aSpec) {
        const w = auto.weight;
        for (let i = 0; i < numFields.length; i += 1) {
          const k = numFields[i];
          out[k] = lerp(out[k], aSpec[k] ?? neu[k] ?? 0, w);
        }
        out.blinkMult = lerp(out.blinkMult, aSpec.blinkMult || 1.0, w);
        if (out.name === "neutral" && w >= 0.42) {
          out.name = auto.name;
          out.accent = aSpec.accent || out.accent;
        }
      }
    }
    return out;
  }

  /* ------------------------------------------------ Gesture Library (Phase 2 Item 6 + Phase 6 Plugin API) */
  function buildGestureTimeline(puppet, scriptParsed, peaks) {
    const list = [];
    const pushG = (item) => {
      if (!item) return;
      const gName = String(item.gesture || item.name || item.type || "").toLowerCase();
      const gSpec = getGestureSpec(gName, puppet);
      if (!gSpec) return;
      const offset = clamp(Number(item.offset || 0), -1.0, 1.0);
      const tVal = Math.max(0, (Number(item.t) || 0) + offset);
      list.push({
        t: tVal,
        gesture: gName,
        duration: clamp(Number(item.duration || gSpec.defaultDur || 1.1), 0.25, 4.0),
        intensity: clamp(Number(item.intensity ?? 1.0), 0.1, 1.5),
      });
    };

    if (puppet && Array.isArray(puppet.gestures)) {
      puppet.gestures.forEach(pushG);
    }
    if (scriptParsed && Array.isArray(scriptParsed.gestures)) {
      scriptParsed.gestures.forEach(pushG);
    }
    if (puppet && Array.isArray(puppet.sentences)) {
      puppet.sentences.forEach((sent) => {
        if (sent.gesture && GESTURES[String(sent.gesture).toLowerCase()]) {
          pushG({
            t: Number(sent.start) || 0,
            gesture: sent.gesture,
            duration: Math.min(2.2, Math.max(0.7, (Number(sent.end) - Number(sent.start)) * 0.65)),
            offset: sent.gestureOffset || 0,
          });
        }
      });
    }
    // Optional automatic subtle shrug/point on very strong emphasis peaks if puppet.autoGesture === true
    if (puppet && puppet.autoGesture && Array.isArray(peaks)) {
      peaks.forEach((pk, idx) => {
        if ((pk.strength || 0) >= 0.85) {
          const near = list.some((g) => Math.abs(g.t - pk.t) < 1.2);
          if (!near) pushG({ t: pk.t, gesture: idx % 2 === 0 ? "point" : "shrug", duration: 0.95, intensity: 0.85 });
        }
      });
    }

    list.sort((a, b) => a.t - b.t);
    return list;
  }

  function evaluateGestureAt(gestureCues, t) {
    let active = null;
    for (let i = 0; i < gestureCues.length; i += 1) {
      const g = gestureCues[i];
      if (t >= g.t && t <= g.t + g.duration) {
        active = g;
      }
    }
    if (!active) {
      return { name: null, progress: 0, weight: 0, intensity: 0 };
    }
    const p = clamp((t - active.t) / Math.max(0.05, active.duration), 0, 1);
    // Smooth anticipation (0..0.18), hold/action (0.18..0.78), recovery (0.78..1.0)
    let w;
    if (p < 0.18) w = smootherstep(p / 0.18);
    else if (p > 0.78) w = 1 - smootherstep((p - 0.78) / 0.22);
    else w = 1;
    return {
      name: active.gesture,
      progress: p,
      weight: w * active.intensity,
      intensity: active.intensity,
    };
  }

  /* ------------------------------------------------ Blink & Gaze Systems (Phase 2 Item 7) */
  function buildBlinkSchedule(seed, duration, peaks, phrases, pauses, blinkRate = 1.0, exprCues = null) {
    const baseRate = clamp(Number(blinkRate) || 1.0, 0.3, 2.0);
    // Modulate blink rate by primary emotion's blinkMult (e.g. scared blinks faster, shocked/bored slower)
    let emoMult = 1.0;
    if (Array.isArray(exprCues) && exprCues.length) {
      let sum = 0;
      for (let i = 0; i < exprCues.length; i += 1) {
        const sp = EXPRESSIONS[exprCues[i].expression];
        sum += (sp && sp.blinkMult) ? sp.blinkMult : 1.0;
      }
      emoMult = sum / exprCues.length;
    }
    const rate = clamp(baseRate * emoMult, 0.25, 2.6);
    const rng = makeRng(`${seed}:blinks`);
    const blinks = [];
    const minInterval = ACTING.minBlinkInterval / rate;
    const maxInterval = ACTING.maxBlinkInterval / rate;
    let cursor = 0.65 + rng() * 1.1;
    const maxT = Math.max(duration + 8, 30);

    const addIfSpaced = (tVal, dur, meta = {}) => {
      if (!Number.isFinite(tVal) || tVal < 0.08) return;
      const near = blinks.some((b) => Math.abs(b.t - tVal) < 0.48);
      if (!near) blinks.push(Object.assign({ t: tVal, dur }, meta));
    };

    (phrases || []).forEach((ph) => {
      if (ph && Number.isFinite(ph.end) && rng() < clamp(0.72 * rate, 0.2, 0.96)) {
        addIfSpaced(ph.end + 0.03 + rng() * 0.06, ACTING.blinkDuration * 0.95, { isPhraseEnd: true });
      }
    });

    (pauses || []).forEach((ps) => {
      if (ps && Number.isFinite(ps.start) && Number.isFinite(ps.end)) {
        const span = ps.end - ps.start;
        if (span >= 0.24 && rng() < clamp(0.68 * rate, 0.2, 0.95)) {
          const offset = Math.min(0.22, span * (0.28 + rng() * 0.32));
          addIfSpaced(ps.start + offset, ACTING.blinkDuration, { isPause: true });
        }
      }
    });

    (peaks || []).forEach((pk) => {
      if ((pk.strength || 0) >= ACTING.emphasisPeakThreshold) {
        addIfSpaced(pk.t + 0.02, ACTING.blinkDuration * 0.9, { isEmphasis: true });
      }
    });

    while (cursor < maxT) {
      const near = blinks.some((b) => Math.abs(b.t - cursor) < 0.65);
      if (!near) {
        blinks.push({ t: cursor, dur: ACTING.blinkDuration });
        if (rng() < 0.22) {
          blinks.push({ t: cursor + ACTING.doubleBlinkGap, dur: ACTING.blinkDuration * 0.9 });
          cursor += 0.35;
        }
      }
      cursor += lerp(minInterval, maxInterval, rng());
    }
    blinks.sort((a, b) => a.t - b.t);
    return blinks;
  }

  function evaluateBlinkAt(blinks, t) {
    let close = 0;
    for (let i = 0; i < blinks.length; i += 1) {
      const b = blinks[i];
      const dt = t - b.t;
      if (dt >= 0 && dt <= b.dur) {
        const p = dt / b.dur;
        const val = p < 0.38 ? smoothstep(p / 0.38) : 1 - smoothstep((p - 0.38) / 0.62);
        close = Math.max(close, val);
      }
    }
    return close;
  }

  function buildSaccadeSchedule(seed, duration) {
    const rng = makeRng(`${seed}:saccades`);
    const shifts = [{ t: 0, dx: 0, dy: 0 }];
    let cursor = 0.45 + rng() * 0.9;
    const maxT = Math.max(duration + 8, 30);
    while (cursor < maxT) {
      const angle = rng() * Math.PI * 2;
      const mag = 1.5 + rng() * 4.2;
      shifts.push({
        t: cursor,
        dx: Math.cos(angle) * mag,
        dy: Math.sin(angle) * (mag * 0.65),
      });
      cursor += 0.8 + rng() * 1.65;
    }
    return shifts;
  }

  function resolveLookAtOffset(lookAt, exprName, side) {
    const flipSign = side === "left" ? -1 : 1;
    if (Array.isArray(lookAt) && lookAt.length >= 2) {
      return { x: flipSign * clamp(Number(lookAt[0]) || 0, -1, 1) * 11, y: clamp(Number(lookAt[1]) || 0, -1, 1) * 8 };
    }
    if (lookAt && typeof lookAt === "object" && lookAt.x != null && lookAt.y != null) {
      return { x: flipSign * clamp(Number(lookAt.x) || 0, -1, 1) * 11, y: clamp(Number(lookAt.y) || 0, -1, 1) * 8 };
    }
    const key = String(lookAt || "auto").toLowerCase();
    if (key === "left") return { x: flipSign * -10, y: 0 };
    if (key === "right") return { x: flipSign * 10, y: 0 };
    if (key === "up") return { x: 0, y: -8 };
    if (key === "down") return { x: 0, y: 7 };
    if (key === "slide") return { x: flipSign * (side === "left" ? 9 : -9), y: -1 };
    if (key === "other") return { x: flipSign * (side === "left" ? 11 : -11), y: 0.5 };
    if (key === "camera" || key === "center") return { x: 0, y: 0 };
    if (exprName === "thinking" || exprName === "confused") return { x: -7, y: -7 };
    if (exprName === "embarrassed" || exprName === "scared") return { x: 8, y: 2 };
    if (exprName === "sad" || exprName === "bored") return { x: 0, y: 5 };
    return { x: flipSign * (side === "left" ? 3 : -3), y: 0 };
  }

  function buildGazeTimeline(cfg, puppet, scriptParsed) {
    const base = (puppet && puppet.gaze && puppet.gaze.target && puppet.gaze.target !== "auto")
      ? puppet.gaze.target
      : (cfg.look_at || "auto");
    const cues = [{ t: 0, target: base }];
    if (puppet && puppet.gaze && Array.isArray(puppet.gaze.timeline)) {
      puppet.gaze.timeline.forEach((g) => {
        if (g && typeof g === "object" && g.target != null) {
          cues.push({ t: Math.max(0, Number(g.t) || 0), target: g.target });
        }
      });
    }
    if (scriptParsed && Array.isArray(scriptParsed.gaze)) {
      scriptParsed.gaze.forEach((g) => cues.push({ t: Math.max(0, Number(g.t) || 0), target: g.target }));
    }
    if (puppet && Array.isArray(puppet.sentences)) {
      puppet.sentences.forEach((sent) => {
        if (sent.look_at != null) {
          cues.push({ t: Math.max(0, Number(sent.start) || 0), target: sent.look_at });
        }
      });
    }
    cues.sort((a, b) => a.t - b.t);
    return cues;
  }

  function evaluateGazeTargetAt(gazeCues, t) {
    if (!gazeCues || !gazeCues.length) return "auto";
    let cur = gazeCues[0].target;
    for (let i = 0; i < gazeCues.length; i += 1) {
      if (gazeCues[i].t <= t) cur = gazeCues[i].target;
      else break;
    }
    return cur;
  }

  /* ------------------------------------------------ Phase 4 Item 13: Timed Accessory Swaps */
  function evaluateAccessoriesAt(puppet, scriptParsed, t) {
    const active = new Set(Array.isArray(puppet && puppet.accessories) ? puppet.accessories : []);
    const cues = [];
    if (puppet && Array.isArray(puppet.accessoryTimeline)) {
      puppet.accessoryTimeline.forEach((c) => { if (c && typeof c === "object") cues.push(c); });
    }
    if (scriptParsed && Array.isArray(scriptParsed.accessories)) {
      scriptParsed.accessories.forEach((c) => { if (c && typeof c === "object") cues.push(c); });
    }
    cues.sort((a, b) => (Number(a.t) || 0) - (Number(b.t) || 0));
    for (let i = 0; i < cues.length; i += 1) {
      const c = cues[i];
      if ((Number(c.t) || 0) > t) break;
      if (c.outfit && OUTFITS[c.outfit]) {
        active.clear();
        OUTFITS[c.outfit].accessories.forEach((a) => active.add(a));
      }
      if (Array.isArray(c.accessories)) {
        active.clear();
        c.accessories.forEach((a) => active.add(a));
      }
      if (Array.isArray(c.add)) c.add.forEach((a) => active.add(a));
      if (Array.isArray(c.remove)) c.remove.forEach((a) => active.delete(a));
    }
    return Array.from(active).sort();
  }

  /* ------------------------------------------------ Phase 4 Item 12: Dialogue Turn-Taking & Listener Reactions */
  function buildDialogueVisemeTrack(dialogue, speakerId, fps = 30, duration = 6, seed = "dlg") {
    const turns = (dialogue && Array.isArray(dialogue.turns)) ? dialogue.turns : [];
    const totalFrames = Math.max(1, Math.round(duration * fps));
    const frames = new Array(totalFrames);
    for (let i = 0; i < totalFrames; i += 1) {
      frames[i] = { t: +(i / fps).toFixed(4), viseme: "rest", energy: 0, openness: 0, width: 1, stress: 0, is_speech: false };
    }
    const peaks = [];
    const phrases = [];

    turns.forEach((turn, idx) => {
      if (turn.speaker !== speakerId) return;
      const tStart = Math.max(0, Number(turn.start) || 0);
      const tEnd = Math.min(duration, Math.max(tStart + 0.15, Number(turn.end) || (tStart + 2.5)));
      const tDur = tEnd - tStart;
      const sub = buildTextVisemeTrack(turn.say || "سلام", fps, tDur, `${seed}:turn:${idx}`);
      const startFrame = Math.floor(tStart * fps);
      for (let j = 0; j < sub.frames.length; j += 1) {
        const dstIdx = startFrame + j;
        if (dstIdx >= 0 && dstIdx < totalFrames) {
          const sf = sub.frames[j];
          frames[dstIdx] = Object.assign({}, sf, { t: +(dstIdx / fps).toFixed(4) });
        }
      }
      (sub.peaks || []).forEach((pk) => peaks.push({ t: +(tStart + pk.t).toFixed(3), strength: pk.strength }));
      (sub.phrases || []).forEach((ph) => phrases.push({ start: +(tStart + ph.start).toFixed(3), end: +(tStart + ph.end).toFixed(3) }));
    });

    return { version: 1, fps, duration, source: "dialogue-turns", frames, peaks, phrases };
  }

  function evaluateDialogueAt(dialogue, speakerId, t) {
    if (!dialogue || !Array.isArray(dialogue.turns) || !dialogue.turns.length || !speakerId) {
      return { active: false, isSpeakingTurn: true, isListening: false, reaction: null, nodY: 0, tilt: 0, browOffset: 0, exprName: null, exprWeight: 0 };
    }
    let curTurn = null;
    for (let i = 0; i < dialogue.turns.length; i += 1) {
      const tr = dialogue.turns[i];
      if (t >= tr.start && t <= tr.end) {
        curTurn = tr;
        break;
      }
    }
    if (!curTurn) {
      return { active: true, isSpeakingTurn: false, isListening: true, reaction: "listening", nodY: 0, tilt: 0, browOffset: 0, exprName: null, exprWeight: 0 };
    }
    if (curTurn.speaker === speakerId) {
      return {
        active: true,
        isSpeakingTurn: true,
        isListening: false,
        reaction: null,
        nodY: 0,
        tilt: 0,
        browOffset: 0,
        exprName: curTurn.expression || null,
        exprWeight: 1.0,
      };
    }

    // Character is actively listening to the other speaker — compute deterministic sympathetic reaction
    if (dialogue.listenerReactions === false) {
      return { active: true, isSpeakingTurn: false, isListening: true, reaction: "listening", nodY: 0, tilt: 0, browOffset: 0, exprName: null, exprWeight: 0 };
    }
    const react = String(curTurn.listenerReaction || curTurn.listener_reaction || "nodding").toLowerCase();
    const dt = Math.max(0, t - curTurn.start);
    const nodWave = Math.max(0, Math.sin(dt * 3.8));
    let nodY = 0;
    let tilt = 0;
    let browOffset = 0;
    let exprName = null;
    let exprWeight = 0.42;

    if (react === "nodding") {
      nodY = nodWave * 5.8;
      browOffset = -2.2 * nodWave;
      exprName = "happy";
      exprWeight = 0.30;
    } else if (react === "interested") {
      nodY = nodWave * 3.8;
      tilt = 4.2;
      browOffset = -4.5;
      exprName = "happy";
      exprWeight = 0.36;
    } else if (react === "skeptical") {
      tilt = -5.5;
      browOffset = 3.2;
      exprName = "sarcastic";
      exprWeight = 0.55;
    } else if (react === "surprised") {
      browOffset = -8.0;
      tilt = -3.0;
      exprName = "surprised";
      exprWeight = 0.55;
    } else if (react === "laughing") {
      nodY = Math.sin(dt * 8.5) * 4.2;
      browOffset = -4.0;
      exprName = "happy";
      exprWeight = 0.72;
    } else if (react === "thoughtful") {
      tilt = -4.8;
      nodY = nodWave * 2.5;
      exprName = "thinking";
      exprWeight = 0.52;
    } else {
      nodY = nodWave * 2.2;
      exprWeight = 0;
    }

    return {
      active: true,
      isSpeakingTurn: false,
      isListening: true,
      reaction: react,
      nodY,
      tilt,
      browOffset,
      exprName,
      exprWeight,
    };
  }

  /* ------------------------------------------------ Track & Prosody Samplers */
  function sampleTrackAt(track, t) {
    const frames = (track && track.frames) || [];
    if (!frames.length) {
      return { viseme: "rest", energy: 0, jawOpen: 0.03, upperLift: 0, widthScale: 1, teeth: 0, tongue: 0, lipTuck: 0, stress: 0, is_speech: false };
    }
    const fps = Number(track.fps) || 30;
    const idxF = clamp(t * fps, 0, frames.length - 1);
    const i0 = Math.floor(idxF);
    const i1 = Math.min(frames.length - 1, i0 + 1);
    const frac = idxF - i0;
    const f0 = frames[i0];
    const f1 = frames[i1];
    const v0 = VISEMES[f0.viseme] || VISEMES.rest;
    const v1 = VISEMES[f1.viseme] || VISEMES.rest;
    const u = smoothstep(frac);

    const e = lerp(Number(f0.energy || 0), Number(f1.energy || 0), u);
    const st = lerp(Number(f0.stress || 0), Number(f1.stress || 0), u);
    const open0 = f0.openness != null ? Number(f0.openness) : v0.jawOpen;
    const open1 = f1.openness != null ? Number(f1.openness) : v1.jawOpen;
    const width0 = f0.width != null ? Number(f0.width) : v0.widthScale;
    const width1 = f1.width != null ? Number(f1.width) : v1.widthScale;
    const teeth0 = f0.teeth != null ? Number(f0.teeth) : v0.teeth;
    const teeth1 = f1.teeth != null ? Number(f1.teeth) : v1.teeth;
    const tongue0 = f0.tongue != null ? Number(f0.tongue) : v0.tongue;
    const tongue1 = f1.tongue != null ? Number(f1.tongue) : v1.tongue;
    const tuck0 = f0.lip_tuck != null ? Number(f0.lip_tuck) : v0.lipTuck;
    const tuck1 = f1.lip_tuck != null ? Number(f1.lip_tuck) : v1.lipTuck;
    const silenceGate = e < 0.035 && !f0.is_speech && !f1.is_speech ? 0 : 1;

    return {
      viseme: frac < 0.5 ? f0.viseme : f1.viseme,
      phoneme: frac < 0.5 ? (f0.phoneme || null) : (f1.phoneme || null),
      energy: e,
      jawOpen: lerp(open0, open1, u) * silenceGate,
      upperLift: lerp(v0.upperLift, v1.upperLift, u) * silenceGate,
      widthScale: lerp(width0, width1, u),
      teeth: lerp(teeth0, teeth1, u),
      tongue: lerp(tongue0, tongue1, u) * silenceGate,
      lipTuck: lerp(tuck0, tuck1, u),
      stress: st,
      is_speech: Boolean(f0.is_speech || f1.is_speech),
    };
  }

  function createSpringBank() {
    return {
      mouthOpen: { x: 0, v: 0 },
      browY: { x: 0, v: 0 },
      browRot: { x: 0, v: 0 },
      headTilt: { x: 0, v: 0 },
      headNodY: { x: 0, v: 0 },
      chestBounceY: { x: 0, v: 0 },
      chestSquash: { x: 0, v: 0 },
      wingEnergy: { x: 0, v: 0 },
      idleWeight: { x: 1, v: 0 },
      // Phase 2 Gaze smooth pursuit & Secondary motion channels
      gazeX: { x: 0, v: 0 },
      gazeY: { x: 0, v: 0 },
      crestOverlap: { x: 0, v: 0 },
      featherJiggle: { x: 0, v: 0 },
      wingFollow: { x: 0, v: 0 },
    };
  }

  function synthesizeProsodyFromVisemes(visTrack, seed = "prosody") {
    const frames = (visTrack && Array.isArray(visTrack.frames)) ? visTrack.frames : [];
    const fps = Number((visTrack && visTrack.fps) || 30);
    const duration = Number((visTrack && visTrack.duration) || (frames.length / fps) || 6);
    const rng = makeRng(`${seed}:syn-prosody`);
    const outFrames = [];
    const pauses = [];
    let pauseStart = null;

    for (let i = 0; i < frames.length; i += 1) {
      const f = frames[i];
      const t = Number(f.t ?? (i / fps));
      const loud = clamp(Number(f.energy || 0), 0, 1);
      const speaking = Boolean(f.is_speech && loud >= 0.045);
      const stress = clamp(Number(f.stress || 0), 0, 1);
      const pNorm = speaking ? clamp(Math.sin(t * 2.8 + rng() * 0.02) * 0.35 + stress * 0.55 - 0.12, -1, 1) : 0;
      const prevP = i > 0 ? outFrames[i - 1].pitch_norm : 0;
      const pDelta = speaking ? clamp((pNorm - prevP) * 3.0, -1, 1) : 0;
      const rms = loud * 0.32;
      const db = rms > 1e-5 ? clamp(20 * Math.log10(rms), -80, 0) : -80;

      if (!speaking && pauseStart === null) pauseStart = t;
      else if (speaking && pauseStart !== null) {
        if (t - pauseStart >= 0.14) pauses.push({ start: +pauseStart.toFixed(3), end: +t.toFixed(3) });
        pauseStart = null;
      }

      outFrames.push({
        t: +t.toFixed(4),
        rms: +rms.toFixed(5),
        db: +db.toFixed(2),
        loudness: +loud.toFixed(4),
        f0_hz: speaking ? +(165 * Math.pow(2, (pNorm * 6) / 12)).toFixed(2) : 0,
        pitch_norm: +pNorm.toFixed(4),
        pitch_delta: +pDelta.toFixed(4),
        pitch_conf: speaking ? 0.8 : 0,
        is_speaking: speaking,
        is_pause: !speaking,
        emphasis: +stress.toFixed(4),
      });
    }
    if (pauseStart !== null && duration - pauseStart >= 0.14) {
      pauses.push({ start: +pauseStart.toFixed(3), end: +duration.toFixed(3) });
    }
    const peaks = ((visTrack && visTrack.peaks) || []).map((pk) => ({
      t: Number(pk.t || 0),
      strength: Number(pk.strength || 0.7),
      pitch_norm: 0.35,
    }));
    const phrases = ((visTrack && visTrack.phrases) || []).map((ph) => ({
      start: Number(ph.start || 0),
      end: Number(ph.end || 0),
      duration: +(Number(ph.end || 0) - Number(ph.start || 0)).toFixed(3),
      has_emphasis: peaks.some((pk) => pk.t >= ph.start && pk.t <= ph.end),
    }));
    return {
      version: 1,
      fps,
      duration,
      median_f0_hz: 165,
      p95_rms: 0.32,
      peaks,
      phrases,
      pauses,
      frames: outFrames,
    };
  }

  function sampleProsodyAt(prosodyTrack, t) {
    const frames = (prosodyTrack && Array.isArray(prosodyTrack.frames)) ? prosodyTrack.frames : [];
    if (!frames.length) {
      return { rms: 0, db: -80, loudness: 0, f0_hz: 0, pitch_norm: 0, pitch_delta: 0, is_speaking: false, is_pause: true, emphasis: 0 };
    }
    const fps = Number(prosodyTrack.fps) || 30;
    const idxF = clamp(t * fps, 0, frames.length - 1);
    const i0 = Math.floor(idxF);
    const i1 = Math.min(frames.length - 1, i0 + 1);
    const u = smoothstep(idxF - i0);
    const a = frames[i0];
    const b = frames[i1];
    const speaking = Boolean(a.is_speaking || b.is_speaking);
    return {
      rms: lerp(Number(a.rms || 0), Number(b.rms || 0), u),
      db: lerp(Number(a.db ?? -80), Number(b.db ?? -80), u),
      loudness: lerp(Number(a.loudness || 0), Number(b.loudness || 0), u),
      f0_hz: speaking ? lerp(Number(a.f0_hz || 0), Number(b.f0_hz || 0), u) : 0,
      pitch_norm: lerp(Number(a.pitch_norm || 0), Number(b.pitch_norm || 0), u),
      pitch_delta: lerp(Number(a.pitch_delta || 0), Number(b.pitch_delta || 0), u),
      is_speaking: speaking,
      is_pause: !speaking,
      emphasis: lerp(Number(a.emphasis || 0), Number(b.emphasis || 0), u),
    };
  }

  function computeToneTargets(lip, pro, tone, limits, inLongEmphasis, peakSign) {
    const lim = limits || TONE_LIMITS;
    const loudness = clamp(Number(pro.loudness ?? lip.energy ?? 0), 0, 1);
    const pitchNorm = clamp(Number(pro.pitch_norm || 0), -1, 1);
    const pitchDelta = clamp(Number(pro.pitch_delta || 0), -1, 1);
    const emphasis = clamp(Math.max(Number(pro.emphasis || 0), Number(lip.stress || 0)), 0, 1);
    const speaking = Boolean(pro.is_speaking || lip.is_speech) && loudness >= 0.035;

    const mouthOpen = speaking
      ? clamp(
          lip.jawOpen * (0.45 + 0.35 * loudness) + loudness * 0.42 * tone.mouthGain,
          lim.mouthMin,
          lim.mouthMax,
        )
      : 0;

    const browY = clamp(
      (-pitchNorm * 13.5 - emphasis * 4.2) * tone.browGain,
      lim.browYMin,
      lim.browYMax,
    );
    const browRot = clamp(
      (-pitchNorm * 10.5 - emphasis * 2.5) * tone.browGain,
      lim.browRotMin,
      lim.browRotMax,
    );

    const headNodY = clamp(
      (emphasis * 11.0 - Math.max(0, pitchDelta) * 3.0) * tone.headGain,
      lim.headNodMin,
      lim.headNodMax,
    );
    const headTilt = clamp(
      (peakSign * emphasis * 8.0 + pitchNorm * 3.4) * tone.headGain,
      lim.headTiltMin,
      lim.headTiltMax,
    );

    const chestBounceY = clamp(
      (loudness * 6.0 + emphasis * 3.8) * tone.chestGain,
      lim.chestBounceMin,
      lim.chestBounceMax,
    );
    const chestSquash = clamp(
      (loudness * 0.040 + emphasis * 0.026) * tone.chestGain,
      0,
      lim.chestSquashMax,
    );

    const wingEnergy = (inLongEmphasis && speaking)
      ? clamp((0.45 + loudness * 0.55) * tone.wingGain, 0, 1.35)
      : 0;

    const idleWeight = speaking ? 0.22 : 1.0;

    return {
      mouthOpen,
      browY,
      browRot,
      headNodY,
      headTilt,
      chestBounceY,
      chestSquash,
      wingEnergy,
      idleWeight,
      loudness,
      pitchNorm,
      pitchDelta,
      emphasis,
      speaking,
    };
  }

  function stepSpringBank(bank, targets, springCfg, limits, dt, gazeTarget, secondaryCfg, smoothPursuit) {
    const lim = limits || TONE_LIMITS;
    const sec = secondaryCfg || { featherJiggle: 0.55, crestOverlap: 0.65, wingFollowThrough: 0.60 };
    const prevHeadV = bank.headTilt.v;
    const prevChestV = bank.chestBounceY.v;

    const mouthOpen = clamp(stepMassSpring(bank.mouthOpen, targets.mouthOpen, springCfg, dt, 1.42), lim.mouthMin, lim.mouthMax);
    const browY = clamp(stepMassSpring(bank.browY, targets.browY, springCfg, dt, 1.0), lim.browYMin, lim.browYMax);
    const browRot = clamp(stepMassSpring(bank.browRot, targets.browRot, springCfg, dt, 1.0), lim.browRotMin, lim.browRotMax);
    const headNodY = clamp(stepMassSpring(bank.headNodY, targets.headNodY, springCfg, dt, 0.90), lim.headNodMin, lim.headNodMax);
    const headTilt = clamp(stepMassSpring(bank.headTilt, targets.headTilt, springCfg, dt, 0.85), lim.headTiltMin, lim.headTiltMax);
    const chestBounceY = clamp(stepMassSpring(bank.chestBounceY, targets.chestBounceY, springCfg, dt, 0.95), lim.chestBounceMin, lim.chestBounceMax);
    const chestSquash = clamp(stepMassSpring(bank.chestSquash, targets.chestSquash, springCfg, dt, 1.05), 0, lim.chestSquashMax);
    const wingEnergy = clamp(stepMassSpring(bank.wingEnergy, targets.wingEnergy, springCfg, dt, 0.72), 0, 1.35);
    const idleWeight = clamp(stepMassSpring(bank.idleWeight, targets.idleWeight, springCfg, dt, 0.45), 0, 1);

    // Phase 2 Item 7: Gaze smooth pursuit spring
    const gOmega = clamp(Number(smoothPursuit) || 10, 2, 30);
    const gx = clamp(stepCriticalSpring(bank.gazeX, gazeTarget ? gazeTarget.x : 0, gOmega, dt), -13, 13);
    const gy = clamp(stepCriticalSpring(bank.gazeY, gazeTarget ? gazeTarget.y : 0, gOmega, dt), -10, 10);

    // Phase 2 Item 8: Secondary motion springs (crest overlap, feather jiggle, wing follow-through)
    const crestTarget = (headTilt * 0.75 + chestBounceY * 0.65) * clamp(sec.crestOverlap, 0, 2.0);
    const crestOverlap = clamp(
      stepMassSpring(bank.crestOverlap, crestTarget, { stiffness: 110, damping: 11, mass: 1.1 }, dt, 1.0),
      -14,
      14,
    );

    const headAcc = clamp(((bank.headTilt.v - prevHeadV) + (bank.chestBounceY.v - prevChestV)) * 0.045, -10, 10);
    const jiggleTarget = (headAcc + targets.emphasis * 3.5) * clamp(sec.featherJiggle, 0, 2.0);
    const featherJiggle = clamp(
      stepMassSpring(bank.featherJiggle, jiggleTarget, { stiffness: 280, damping: 12, mass: 0.75 }, dt, 1.0),
      -8,
      8,
    );

    const wingFollowTarget = (wingEnergy * 10 + chestBounceY * 0.55) * clamp(sec.wingFollowThrough, 0, 2.0);
    const wingFollow = clamp(
      stepMassSpring(bank.wingFollow, wingFollowTarget, { stiffness: 95, damping: 10.5, mass: 1.15 }, dt, 1.0),
      -18,
      18,
    );

    return {
      mouthOpen,
      browY,
      browRot,
      headNodY,
      headTilt,
      chestBounceY,
      chestSquash,
      wingEnergy,
      idleWeight,
      gazeX: gx,
      gazeY: gy,
      crestOverlap,
      featherJiggle,
      wingFollow,
    };
  }

  function bakeDeterministicSprings(track, prosody, puppet, exprCues, gazeCues, side, duration, fps, seed) {
    const totalFrames = Math.max(2, Math.ceil((duration + 0.5) * fps));
    const dt = 1 / fps;
    const bank = createSpringBank();
    const peaks = (prosody && Array.isArray(prosody.peaks) && prosody.peaks.length) ? prosody.peaks : (track.peaks || []);
    const phrases = (prosody && Array.isArray(prosody.phrases) && prosody.phrases.length) ? prosody.phrases : (track.phrases || []);
    const rng = makeRng(`${seed}:peak-dirs`);
    const peakSigns = peaks.map((_, idx) => ((idx % 2 === 0 ? 1 : -1) * (rng() < 0.78 ? 1 : -1)));

    // Start gaze smooth-pursuit spring already aimed at t=0 look_at target so frame 0 is dead-on
    const initExpr = evaluateExpressionAt(exprCues, 0, puppet.emotionIntensity ?? 1.0, null);
    const initGaze = resolveLookAtOffset(evaluateGazeTargetAt(gazeCues, 0), initExpr.name, side);
    bank.gazeX.x = initGaze.x;
    bank.gazeY.x = initGaze.y;

    const baked = new Array(totalFrames);
    for (let i = 0; i < totalFrames; i += 1) {
      const t = i * dt;
      const lip = sampleTrackAt(track, t);
      const pro = sampleProsodyAt(prosody, t);
      const dyn = evaluateToneAt(puppet, t);

      let inLongEmphasis = false;
      for (let p = 0; p < phrases.length; p += 1) {
        const ph = phrases[p];
        const phDur = ph.end - ph.start;
        if (t >= ph.start && t <= ph.end && phDur >= Math.min(ACTING.gestureMinPhraseSec, 1.15) && (ph.has_emphasis !== false || pro.loudness > 0.30)) {
          inLongEmphasis = true;
          break;
        }
      }

      let peakSign = 1;
      for (let p = 0; p < peaks.length; p += 1) {
        if (Math.abs(t - peaks[p].t) <= 0.35) {
          peakSign = peakSigns[p] || 1;
          break;
        }
      }

      const expr = evaluateExpressionAt(exprCues, t, dyn.emotionIntensity, puppet.autoEmotion ? pro : null);
      const gazeName = evaluateGazeTargetAt(gazeCues, t);
      const gazeTarget = resolveLookAtOffset(gazeName, expr.name, side);

      const targets = computeToneTargets(lip, pro, dyn.tone, puppet.limits, inLongEmphasis, peakSign);
      const sp = stepSpringBank(
        bank,
        targets,
        dyn.spring,
        puppet.limits,
        dt,
        gazeTarget,
        puppet.secondary,
        puppet.gaze ? puppet.gaze.smoothPursuit : 10,
      );
      baked[i] = sp;
    }
    return baked;
  }

  function sampleBakedSpring(baked, fps, t) {
    if (!baked || !baked.length) {
      return {
        mouthOpen: 0, browY: 0, browRot: 0, headNodY: 0, headTilt: 0,
        chestBounceY: 0, chestSquash: 0, wingEnergy: 0, idleWeight: 1,
        gazeX: 0, gazeY: 0, crestOverlap: 0, featherJiggle: 0, wingFollow: 0,
      };
    }
    const idxF = clamp(t * fps, 0, baked.length - 1);
    const i0 = Math.floor(idxF);
    const i1 = Math.min(baked.length - 1, i0 + 1);
    const u = idxF - i0;
    const a = baked[i0];
    const b = baked[i1];
    return {
      mouthOpen: lerp(a.mouthOpen, b.mouthOpen, u),
      browY: lerp(a.browY, b.browY, u),
      browRot: lerp(a.browRot, b.browRot, u),
      headNodY: lerp(a.headNodY, b.headNodY, u),
      headTilt: lerp(a.headTilt, b.headTilt, u),
      chestBounceY: lerp(a.chestBounceY, b.chestBounceY, u),
      chestSquash: lerp(a.chestSquash, b.chestSquash, u),
      wingEnergy: lerp(a.wingEnergy, b.wingEnergy, u),
      idleWeight: lerp(a.idleWeight, b.idleWeight, u),
      gazeX: lerp(a.gazeX || 0, b.gazeX || 0, u),
      gazeY: lerp(a.gazeY || 0, b.gazeY || 0, u),
      crestOverlap: lerp(a.crestOverlap || 0, b.crestOverlap || 0, u),
      featherJiggle: lerp(a.featherJiggle || 0, b.featherJiggle || 0, u),
      wingFollow: lerp(a.wingFollow || 0, b.wingFollow || 0, u),
    };
  }

  /* ------------------------------------------------ Layered 18-Part SVG Rig Builder (Sheet-Matched Red Eagle) */
  function buildEagleSVG(parent, opts = {}) {
    const svg = svgNode("svg", {
      class: "mascot-svg",
      viewBox: "0 0 640 720",
      width: "100%",
      height: "100%",
      overflow: "visible",
    }, parent);

    const defs = svgNode("defs", {}, svg);
    const clipEyeL = svgNode("clipPath", { id: `mEyeClipL_${opts.uid || "0"}` }, defs);
    svgNode("path", { d: "M 224,185 C 226,154 252,140 282,145 C 304,150 310,174 307,196 C 304,218 282,230 256,227 C 232,224 222,208 224,185 Z" }, clipEyeL);

    const clipEyeR = svgNode("clipPath", { id: `mEyeClipR_${opts.uid || "0"}` }, defs);
    svgNode("path", { d: "M 416,185 C 414,154 388,140 358,145 C 336,150 330,174 333,196 C 336,218 358,230 384,227 C 408,224 418,208 416,185 Z" }, clipEyeR);

    const clipMouth = svgNode("clipPath", { id: `mMouthClip_${opts.uid || "0"}` }, defs);
    const mouthClipPath = svgNode("path", { d: "M 262,250 Q 320,238 378,250 L 368,318 Q 320,336 272,318 Z" }, clipMouth);

    const rootG = svgNode("g", { class: "m-root" }, svg);
    const shadow = svgNode("ellipse", {
      cx: "320", cy: "676", rx: "152", ry: "20",
      fill: "rgba(0,0,0,0.42)",
    }, rootG);

    // 1. Tail feathers behind legs/body
    const tailG = svgNode("g", { class: "m-tail", "data-part": "tail" }, rootG);
    svgNode("path", {
      d: "M 232,482 L 166,536 L 208,546 L 184,586 L 246,554 Z",
      fill: PAL.redPrimary, "data-pal-fill": "redPrimary", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "7", "stroke-linejoin": "round",
    }, tailG);
    svgNode("path", {
      d: "M 408,482 L 474,536 L 432,546 L 456,586 L 394,554 Z",
      fill: PAL.redPrimary, "data-pal-fill": "redPrimary", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "7", "stroke-linejoin": "round",
    }, tailG);

    // 2. Signature Three-Stripe Red Wing Crest (matches top row of sheet!) + Species Back Layer (Tortoise Shell)
    const crestWingG = svgNode("g", { class: "m-crest-wing", "data-part": "crest" }, rootG);
    const eagleCrestPaths = svgNode("g", { class: "m-crest-eagle" }, crestWingG);
    svgNode("path", {
      d: "M 404,358 L 538,242 L 502,320 L 550,308 L 496,368 L 542,366 L 468,424 L 404,424 Z",
      fill: PAL.redPrimary, "data-pal-fill": "redPrimary", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "7.5", "stroke-linejoin": "round",
    }, eagleCrestPaths);
    svgNode("path", {
      d: "M 426,374 L 516,304 L 504,324 L 432,384 Z M 434,398 L 520,350 L 508,368 L 438,408 Z",
      fill: PAL.outline, "data-pal-fill": "outline",
    }, eagleCrestPaths);

    // Phase 4 Item 12: Barnaby Tortoise domed hexagonal shell (hidden on red_eagle)
    const speciesTortoiseShell = svgNode("g", { class: "m-species-tortoise-shell", opacity: "0", display: "none" }, crestWingG);
    svgNode("path", {
      d: "M 168,496 C 156,378 214,296 320,296 C 426,296 484,378 472,496 C 440,544 200,544 168,496 Z",
      fill: PAL.chestBlack, "data-pal-fill": "chestBlack", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "7.5", "stroke-linejoin": "round",
    }, speciesTortoiseShell);
    svgNode("path", {
      d: "M 262,334 L 320,312 L 378,334 L 392,402 L 320,428 L 248,402 Z M 202,418 L 248,402 L 268,488 M 438,418 L 392,402 L 372,488",
      fill: "none", stroke: PAL.chestHighlight, "data-pal-stroke": "chestHighlight", "stroke-width": "6", "stroke-linejoin": "round",
    }, speciesTortoiseShell);

    // 3. Legs & Yellow Talons
    const legsG = svgNode("g", { class: "m-legs", "data-part": "legs" }, rootG);
    svgNode("path", {
      d: "M 232,480 L 240,618 L 284,618 L 298,524 Z",
      fill: PAL.chestBlack, "data-pal-fill": "chestBlack", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "7", "stroke-linejoin": "round",
    }, legsG);
    svgNode("path", {
      d: "M 244,614 L 222,636 L 194,650 C 188,654 192,664 202,662 L 234,654 L 214,670 C 208,675 215,682 226,676 L 258,660 L 274,670 C 284,674 292,664 282,654 L 276,614 Z",
      fill: PAL.beakGold, "data-pal-fill": "beakGold", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "6.5", "stroke-linejoin": "round",
    }, legsG);
    svgNode("path", {
      d: "M 408,480 L 400,618 L 356,618 L 342,524 Z",
      fill: PAL.chestBlack, "data-pal-fill": "chestBlack", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "7", "stroke-linejoin": "round",
    }, legsG);
    svgNode("path", {
      d: "M 396,614 L 418,636 L 446,650 C 452,654 448,664 438,662 L 406,654 L 426,670 C 432,675 425,682 414,676 L 382,660 L 366,670 C 356,674 348,664 358,654 L 364,614 Z",
      fill: PAL.beakGold, "data-pal-fill": "beakGold", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "6.5", "stroke-linejoin": "round",
    }, legsG);

    // 4. Body & Chest
    const bodyG = svgNode("g", { class: "m-body", "data-part": "body" }, rootG);
    svgNode("path", {
      d: "M 206,336 C 188,408 194,514 236,544 C 280,554 360,554 404,544 C 446,514 452,408 434,336 Z",
      fill: PAL.chestBlack, "data-pal-fill": "chestBlack", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "7.5", "stroke-linejoin": "round",
    }, bodyG);
    svgNode("path", {
      d: "M 244,376 C 244,442 266,498 320,516 C 374,498 396,442 396,376",
      fill: "none", stroke: PAL.chestHighlight, "data-pal-stroke": "chestHighlight", "stroke-width": "5", "stroke-linecap": "round", opacity: "0.7",
    }, bodyG);

    // Neck feather ruff (wrapped so featherJiggle can gently excite it)
    const neckRuffG = svgNode("g", { class: "m-neck-ruff" }, bodyG);
    svgNode("path", {
      d: "M 218,290 C 194,328 192,366 218,392 L 242,374 L 254,412 L 286,386 L 318,424 L 352,386 L 386,412 L 398,374 L 422,392 C 448,366 446,328 422,290 Z",
      fill: PAL.redPrimary, "data-pal-fill": "redPrimary", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "7.5", "stroke-linejoin": "round",
    }, neckRuffG);
    svgNode("path", {
      d: "M 262,362 L 286,376 M 378,362 L 354,376 M 320,382 L 320,406",
      fill: "none", stroke: PAL.redShadow, "data-pal-stroke": "redShadow", "stroke-width": "5", "stroke-linecap": "round",
    }, neckRuffG);

    // 5. Arms / Wings Layer (Crossed Arms, Open/Gesture wings, Thinking Chin Hand, Special Gestures)
    const armsCrossedG = svgNode("g", { class: "m-arms-crossed" }, bodyG);
    svgNode("path", {
      d: "M 188,362 C 154,394 166,448 214,462 L 368,452 C 392,448 400,420 374,406 L 236,396 C 218,392 208,374 188,362 Z",
      fill: PAL.chestBlack, "data-pal-fill": "chestBlack", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "7.5", "stroke-linejoin": "round",
    }, armsCrossedG);
    svgNode("path", {
      d: "M 192,350 C 148,380 144,442 186,472 L 214,458 L 210,484 L 248,468 C 228,434 218,392 192,350 Z",
      fill: PAL.redPrimary, "data-pal-fill": "redPrimary", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "7", "stroke-linejoin": "round",
    }, armsCrossedG);
    svgNode("path", {
      d: "M 452,362 C 486,394 474,448 426,462 L 272,452 C 248,448 240,420 266,406 L 404,396 C 422,392 432,374 452,362 Z",
      fill: PAL.chestBlack, "data-pal-fill": "chestBlack", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "7.5", "stroke-linejoin": "round",
    }, armsCrossedG);
    svgNode("path", {
      d: "M 448,350 C 492,380 496,442 454,472 L 426,458 L 430,484 L 392,468 C 412,434 422,392 448,350 Z",
      fill: PAL.redPrimary, "data-pal-fill": "redPrimary", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "7", "stroke-linejoin": "round",
    }, armsCrossedG);

    const wingsOpenG = svgNode("g", { class: "m-wings-open", opacity: "0" }, bodyG);
    const wingL = svgNode("g", { class: "m-wing-l", "data-part": "wing_l" }, wingsOpenG);
    svgNode("path", {
      d: "M 206,368 C 142,382 104,438 122,494 L 154,474 L 158,506 L 190,478 L 214,442 Z",
      fill: PAL.redPrimary, "data-pal-fill": "redPrimary", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "7.5", "stroke-linejoin": "round",
    }, wingL);
    const wingR = svgNode("g", { class: "m-wing-r", "data-part": "wing_r" }, wingsOpenG);
    svgNode("path", {
      d: "M 434,368 C 498,382 536,438 518,494 L 486,474 L 482,506 L 450,478 L 426,442 Z",
      fill: PAL.redPrimary, "data-pal-fill": "redPrimary", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "7.5", "stroke-linejoin": "round",
    }, wingR);

    const wingThinkG = svgNode("g", { class: "m-wing-think", opacity: "0" }, bodyG);
    svgNode("path", {
      d: "M 210,378 C 154,404 156,472 204,492 L 240,468 L 236,432 Z",
      fill: PAL.redPrimary, "data-pal-fill": "redPrimary", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "7", "stroke-linejoin": "round",
    }, wingThinkG);
    svgNode("path", {
      d: "M 234,462 L 268,366 C 276,342 296,332 308,342 C 316,350 306,374 294,394 L 278,468 Z",
      fill: PAL.chestBlack, "data-pal-fill": "chestBlack", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "7", "stroke-linejoin": "round",
    }, wingThinkG);

    // Phase 2 Item 6: Dedicated Gesture Pose Props (point, thumbs-up, facepalm, salute, clap)
    const gesturesG = svgNode("g", { class: "m-gestures" }, bodyG);
    const gestPointG = svgNode("g", { class: "m-gest-point", opacity: "0" }, gesturesG);
    svgNode("path", {
      d: "M 432,374 L 516,336 L 568,324 C 580,322 584,336 572,344 L 520,362 L 496,396 L 434,424 Z",
      fill: PAL.redPrimary, "data-pal-fill": "redPrimary", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "7", "stroke-linejoin": "round",
    }, gestPointG);

    const gestThumbG = svgNode("g", { class: "m-gest-thumb", opacity: "0" }, gesturesG);
    svgNode("path", {
      d: "M 426,398 L 494,368 L 502,316 C 504,302 522,302 524,318 L 526,354 L 548,362 C 556,378 548,406 524,414 L 444,432 Z",
      fill: PAL.redPrimary, "data-pal-fill": "redPrimary", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "7", "stroke-linejoin": "round",
    }, gestThumbG);

    const gestFacepalmG = svgNode("g", { class: "m-gest-facepalm", opacity: "0" }, gesturesG);
    svgNode("path", {
      d: "M 206,374 C 176,340 198,256 266,204 C 288,188 326,196 322,222 C 318,248 282,276 244,332 L 236,418 Z",
      fill: PAL.redPrimary, "data-pal-fill": "redPrimary", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "7", "stroke-linejoin": "round",
    }, gestFacepalmG);

    const gestSaluteG = svgNode("g", { class: "m-gest-salute", opacity: "0" }, gesturesG);
    svgNode("path", {
      d: "M 434,376 C 482,340 494,254 456,174 L 386,154 C 374,152 372,168 386,176 L 434,196 C 446,248 442,306 416,358 Z",
      fill: PAL.redPrimary, "data-pal-fill": "redPrimary", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "7", "stroke-linejoin": "round",
    }, gestSaluteG);

    const gestClapG = svgNode("g", { class: "m-gest-clap", opacity: "0" }, gesturesG);
    const gestClapL = svgNode("path", {
      d: "M 208,388 L 288,368 L 306,422 L 222,446 Z",
      fill: PAL.redPrimary, "data-pal-fill": "redPrimary", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "7", "stroke-linejoin": "round",
    }, gestClapG);
    const gestClapR = svgNode("path", {
      d: "M 432,388 L 352,368 L 334,422 L 418,446 Z",
      fill: PAL.redPrimary, "data-pal-fill": "redPrimary", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "7", "stroke-linejoin": "round",
    }, gestClapG);

    // 6. Head Group (pivoted at neck base 320,312)
    const headG = svgNode("g", { class: "m-head", "data-part": "head" }, bodyG);
    svgNode("path", {
      d: "M 222,262 C 194,254 186,232 206,214 C 196,170 218,108 272,88 C 304,76 346,74 392,82 L 368,98 C 414,98 446,136 446,184 C 446,204 440,218 434,226 C 452,240 444,262 418,266 C 414,308 376,340 320,340 C 264,340 226,308 222,262 Z",
      fill: PAL.redPrimary, "data-pal-fill": "redPrimary", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "7.5", "stroke-linejoin": "round",
    }, headG);
    svgNode("path", {
      d: "M 278,104 C 312,92 346,92 372,96",
      fill: "none", stroke: PAL.redHighlight, "data-pal-stroke": "redHighlight", "stroke-width": "5", "stroke-linecap": "round", opacity: "0.7",
    }, headG);

    // Phase 4 Item 12: Species-distinct head silhouettes (all hidden on red_eagle to preserve exact sheet fidelity)
    const speciesOwlHead = svgNode("g", { class: "m-species-owl-head", opacity: "0", display: "none" }, headG);
    svgNode("path", {
      d: "M 226,126 L 184,54 L 266,94 Z M 414,126 L 456,54 L 374,94 Z",
      fill: PAL.redPrimary, "data-pal-fill": "redPrimary", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "7", "stroke-linejoin": "round",
    }, speciesOwlHead);
    svgNode("ellipse", { cx: "272", cy: "188", rx: "56", ry: "52", fill: PAL.chestHighlight, "data-pal-fill": "chestHighlight", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "5", opacity: "0.55" }, speciesOwlHead);
    svgNode("ellipse", { cx: "368", cy: "188", rx: "56", ry: "52", fill: PAL.chestHighlight, "data-pal-fill": "chestHighlight", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "5", opacity: "0.55" }, speciesOwlHead);

    const speciesPigeonHead = svgNode("g", { class: "m-species-pigeon-head", opacity: "0", display: "none" }, headG);
    svgNode("path", {
      d: "M 228,312 Q 320,342 412,312 L 404,344 Q 320,372 236,344 Z",
      fill: PAL.chestHighlight, "data-pal-fill": "chestHighlight", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "5.5", "stroke-linejoin": "round",
    }, speciesPigeonHead);
    svgNode("ellipse", { cx: "320", cy: "212", rx: "28", ry: "14", fill: PAL.scleraWhite, "data-pal-fill": "scleraWhite", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "4.5" }, speciesPigeonHead);

    const speciesHummerHead = svgNode("g", { class: "m-species-hummer-head", opacity: "0", display: "none" }, headG);
    svgNode("path", {
      d: "M 248,292 Q 320,336 392,292 L 376,342 Q 320,368 264,342 Z",
      fill: PAL.chestHighlight, "data-pal-fill": "chestHighlight", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "5.5",
    }, speciesHummerHead);
    svgNode("path", {
      d: "M 320,76 L 348,46 L 336,84 L 368,64 L 346,96 Z",
      fill: PAL.redHighlight, "data-pal-fill": "redHighlight", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "5", "stroke-linejoin": "round",
    }, speciesHummerHead);

    // Eyes Group
    const eyesG = svgNode("g", { class: "m-eyes" }, headG);

    const buildEye = (sideKey, cx, cy, clipId) => {
      const partEye = sideKey === "L" ? "eye_l" : "eye_r";
      const partPupil = sideKey === "L" ? "pupil_l" : "pupil_r";
      const partLid = sideKey === "L" ? "lid_l" : "lid_r";
      const eyeWrap = svgNode("g", { class: `m-eye-${sideKey}`, "data-part": partEye }, eyesG);
      const scleraPath = sideKey === "L"
        ? "M 224,185 C 226,154 252,140 282,145 C 304,150 310,174 307,196 C 304,218 282,230 256,227 C 232,224 222,208 224,185 Z"
        : "M 416,185 C 414,154 388,140 358,145 C 336,150 330,174 333,196 C 336,218 358,230 384,227 C 408,224 418,208 416,185 Z";

      svgNode("path", { d: scleraPath, fill: PAL.scleraWhite, "data-pal-fill": "scleraWhite" }, eyeWrap);

      const clipped = svgNode("g", { "clip-path": `url(#${clipId})` }, eyeWrap);
      const pupilG = svgNode("g", { class: `m-pupil-${sideKey}`, "data-part": partPupil }, clipped);
      svgNode("circle", { cx, cy: cy + 2, r: "19", fill: PAL.pupilBlack, "data-pal-fill": "pupilBlack" }, pupilG);
      svgNode("circle", { cx: cx - 6, cy: cy - 6, r: "6.5", fill: "#FFFFFF" }, pupilG);
      svgNode("circle", { cx: cx + 7, cy: cy + 7, r: "2.8", fill: "#FFFFFF", opacity: "0.85" }, pupilG);

      const lidG = svgNode("g", { class: `m-lid-${sideKey}`, "data-part": partLid }, clipped);
      const upperLid = svgNode("rect", {
        x: cx - 56, y: cy - 95, width: "112", height: "86",
        fill: PAL.redPrimary, "data-pal-fill": "redPrimary", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "6.5",
      }, lidG);
      const lowerLid = svgNode("rect", {
        x: cx - 56, y: cy + 44, width: "112", height: "72",
        fill: PAL.redPrimary, "data-pal-fill": "redPrimary", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "6.5",
      }, lidG);

      const rim = svgNode("path", {
        d: scleraPath,
        fill: "none", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "7", "stroke-linejoin": "round",
      }, eyeWrap);

      const happyArc = svgNode("path", {
        d: sideKey === "L"
          ? "M 230,192 Q 266,166 302,190"
          : "M 338,190 Q 374,166 410,192",
        fill: "none", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "7.5", "stroke-linecap": "round", opacity: "0",
      }, eyeWrap);

      return { eyeWrap, pupilG, lidG, upperLid, lowerLid, rim, happyArc, cx, cy };
    };

    const eyeL = buildEye("L", 272, 186, `mEyeClipL_${opts.uid || "0"}`);
    const eyeR = buildEye("R", 368, 186, `mEyeClipR_${opts.uid || "0"}`);

    // Brows
    const browL = svgNode("path", {
      class: "m-brow-l", "data-part": "brow_l",
      d: "M 216,144 Q 262,126 306,154 L 302,168 Q 258,144 218,158 Z",
      fill: PAL.outline, "data-pal-fill": "outline", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "3", "stroke-linejoin": "round",
    }, headG);
    const browR = svgNode("path", {
      class: "m-brow-r", "data-part": "brow_r",
      d: "M 424,144 Q 378,126 334,154 L 338,168 Q 382,144 422,158 Z",
      fill: PAL.outline, "data-pal-fill": "outline", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "3", "stroke-linejoin": "round",
    }, headG);

    // 7. Hinged Hooked Beak Group
    const beakG = svgNode("g", { class: "m-beak" }, headG);
    const mouthCavG = svgNode("g", { class: "m-mouth-cav", "clip-path": `url(#mMouthClip_${opts.uid || "0"})` }, beakG);
    const mouthBg = svgNode("path", {
      d: "M 262,250 Q 320,242 378,250 L 368,314 Q 320,332 272,314 Z",
      fill: PAL.mouthInterior, "data-pal-fill": "mouthInterior",
    }, mouthCavG);
    const tongueEl = svgNode("path", {
      d: "M 288,308 Q 320,278 352,308 Q 320,326 288,308 Z",
      fill: PAL.tonguePink, "data-pal-fill": "tonguePink", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "4",
    }, mouthCavG);
    const teethEl = svgNode("path", {
      d: "M 278,258 Q 320,264 362,258 L 356,282 Q 320,290 284,282 Z",
      fill: PAL.teethWhite, "data-pal-fill": "teethWhite", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "4", "stroke-linejoin": "round", opacity: "0",
    }, mouthCavG);

    const lowerBeakG = svgNode("g", { class: "m-lower-beak", "data-part": "beak_lower" }, beakG);
    const lowerBeakPath = svgNode("path", {
      d: "M 272,258 Q 320,272 368,258 L 354,284 Q 320,308 286,284 Z",
      fill: PAL.beakGold, "data-pal-fill": "beakGold", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "6.5", "stroke-linejoin": "round",
    }, lowerBeakG);

    const upperBeakG = svgNode("g", { class: "m-upper-beak", "data-part": "beak_upper" }, beakG);
    svgNode("path", {
      d: "M 266,254 C 270,214 302,198 320,198 C 338,198 370,214 374,254 C 356,266 338,272 320,290 C 302,272 284,266 266,254 Z",
      fill: PAL.beakGold, "data-pal-fill": "beakGold", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "6.8", "stroke-linejoin": "round",
    }, upperBeakG);
    svgNode("path", {
      d: "M 294,224 C 308,208 332,208 346,224",
      fill: "none", stroke: PAL.beakHighlight, "data-pal-stroke": "beakHighlight", "stroke-width": "5", "stroke-linecap": "round", opacity: "0.75",
    }, upperBeakG);
    svgNode("path", {
      d: "M 304,266 L 320,282 L 336,266",
      fill: "none", stroke: PAL.beakShadow, "data-pal-stroke": "beakShadow", "stroke-width": "4.5", "stroke-linecap": "round", opacity: "0.85",
    }, upperBeakG);
    svgNode("ellipse", { cx: "300", cy: "234", rx: "3.2", ry: "4.5", fill: PAL.outline, "data-pal-fill": "outline", transform: "rotate(-18 300 234)" }, upperBeakG);
    svgNode("ellipse", { cx: "340", cy: "234", rx: "3.2", ry: "4.5", fill: PAL.outline, "data-pal-fill": "outline", transform: "rotate(18 340 234)" }, upperBeakG);

    // 8. Expanded Costume & Accessory Slots (Part #18 — 13 accessories across hats, eyewear, neckwear, props)
    const accessoriesG = svgNode("g", { class: "m-accessories", "data-part": "accessories" }, headG);

    // Hats slot: top_hat, crown, cap, beanie
    const accTopHat = svgNode("g", { class: "m-acc-top_hat", opacity: "0" }, accessoriesG);
    svgNode("rect", { x: "212", y: "74", width: "216", height: "22", rx: "11", fill: PAL.chestBlack, "data-pal-fill": "chestBlack", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "6" }, accTopHat);
    svgNode("path", { d: "M 248,76 L 258,-22 L 382,-22 L 392,76 Z", fill: PAL.chestBlack, "data-pal-fill": "chestBlack", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "6", "stroke-linejoin": "round" }, accTopHat);
    svgNode("rect", { x: "252", y: "52", width: "136", height: "20", fill: PAL.beakGold, "data-pal-fill": "beakGold", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "4.5" }, accTopHat);

    const accCrown = svgNode("g", { class: "m-acc-crown", opacity: "0" }, accessoriesG);
    svgNode("path", { d: "M 246,84 L 236,16 L 284,48 L 320,4 L 356,48 L 404,16 L 394,84 Z", fill: PAL.beakGold, "data-pal-fill": "beakGold", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "6", "stroke-linejoin": "round" }, accCrown);
    svgNode("circle", { cx: "320", cy: "56", r: "9", fill: PAL.redPrimary, "data-pal-fill": "redPrimary", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "4" }, accCrown);

    const accCap = svgNode("g", { class: "m-acc-cap", opacity: "0" }, accessoriesG);
    svgNode("path", { d: "M 218,96 C 228,34 412,34 422,96 Z", fill: PAL.chestBlack, "data-pal-fill": "chestBlack", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "6", "stroke-linejoin": "round" }, accCap);
    svgNode("path", { d: "M 216,96 L 464,104 C 468,118 444,124 410,118 L 216,108 Z", fill: PAL.beakGold, "data-pal-fill": "beakGold", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "5.5", "stroke-linejoin": "round" }, accCap);

    const accBeanie = svgNode("g", { class: "m-acc-beanie", opacity: "0" }, accessoriesG);
    svgNode("path", { d: "M 218,104 C 220,24 420,24 422,104 Z", fill: PAL.beakGold, "data-pal-fill": "beakGold", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "6" }, accBeanie);
    svgNode("rect", { x: "212", y: "84", width: "216", height: "30", rx: "14", fill: PAL.chestBlack, "data-pal-fill": "chestBlack", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "5.5" }, accBeanie);
    svgNode("circle", { cx: "320", cy: "26", r: "18", fill: PAL.sweatWhite, "data-pal-fill": "sweatWhite", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "5.5" }, accBeanie);

    // Eyewear slot: glasses, sunglasses, monocle
    const accGlasses = svgNode("g", { class: "m-acc-glasses", opacity: "0" }, accessoriesG);
    svgNode("rect", { x: "218", y: "148", width: "92", height: "78", rx: "18", fill: "rgba(255,255,255,0.12)", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "6.5" }, accGlasses);
    svgNode("rect", { x: "330", y: "148", width: "92", height: "78", rx: "18", fill: "rgba(255,255,255,0.12)", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "6.5" }, accGlasses);
    svgNode("path", { d: "M 310,184 L 330,184", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "6.5" }, accGlasses);

    const accSunglasses = svgNode("g", { class: "m-acc-sunglasses", opacity: "0" }, accessoriesG);
    svgNode("rect", { x: "216", y: "152", width: "96", height: "70", rx: "14", fill: PAL.chestBlack, "data-pal-fill": "chestBlack", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "6.5" }, accSunglasses);
    svgNode("rect", { x: "328", y: "152", width: "96", height: "70", rx: "14", fill: PAL.chestBlack, "data-pal-fill": "chestBlack", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "6.5" }, accSunglasses);
    svgNode("path", { d: "M 312,182 L 328,182 M 234,172 L 260,164 M 346,172 L 372,164", stroke: PAL.sweatWhite, "data-pal-stroke": "sweatWhite", "stroke-width": "4.5", "stroke-linecap": "round" }, accSunglasses);

    const accMonocle = svgNode("g", { class: "m-acc-monocle", opacity: "0" }, accessoriesG);
    svgNode("circle", { cx: "368", cy: "186", r: "44", fill: "rgba(255,255,255,0.16)", stroke: PAL.beakGold, "data-pal-stroke": "beakGold", "stroke-width": "6" }, accMonocle);
    svgNode("path", { d: "M 412,188 Q 434,244 416,320", fill: "none", stroke: PAL.beakGold, "data-pal-stroke": "beakGold", "stroke-width": "4", "stroke-dasharray": "6 5" }, accMonocle);

    // Neckwear slot: bowtie, necktie, scarf
    const accBowtie = svgNode("g", { class: "m-acc-bowtie", opacity: "0" }, accessoriesG);
    svgNode("path", { d: "M 276,326 L 314,344 L 276,362 Z M 364,326 L 326,344 L 364,362 Z", fill: PAL.beakGold, "data-pal-fill": "beakGold", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "5.5", "stroke-linejoin": "round" }, accBowtie);
    svgNode("circle", { cx: "320", cy: "344", r: "11", fill: PAL.redPrimary, "data-pal-fill": "redPrimary", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "5.5" }, accBowtie);

    const accNecktie = svgNode("g", { class: "m-acc-necktie", opacity: "0" }, accessoriesG);
    svgNode("path", { d: "M 304,334 L 336,334 L 330,356 L 340,424 L 320,446 L 300,424 L 310,356 Z", fill: PAL.beakGold, "data-pal-fill": "beakGold", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "5.5", "stroke-linejoin": "round" }, accNecktie);

    const accScarf = svgNode("g", { class: "m-acc-scarf", opacity: "0" }, accessoriesG);
    svgNode("path", { d: "M 218,312 Q 320,348 422,312 L 414,352 Q 320,384 226,352 Z", fill: PAL.beakGold, "data-pal-fill": "beakGold", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "6", "stroke-linejoin": "round" }, accScarf);
    svgNode("path", { d: "M 358,342 L 398,342 L 408,426 L 364,422 Z", fill: PAL.beakHighlight, "data-pal-fill": "beakHighlight", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "5.5", "stroke-linejoin": "round" }, accScarf);

    // Props slot: headphones, mic, coffee_mug
    const accHeadphones = svgNode("g", { class: "m-acc-headphones", opacity: "0" }, accessoriesG);
    svgNode("path", { d: "M 198,214 C 188,108 242,64 320,64 C 398,64 452,108 442,214", fill: "none", stroke: PAL.chestBlack, "data-pal-stroke": "chestBlack", "stroke-width": "14", "stroke-linecap": "round" }, accHeadphones);
    svgNode("rect", { x: "180", y: "184", width: "30", height: "64", rx: "12", fill: PAL.beakGold, "data-pal-fill": "beakGold", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "6" }, accHeadphones);
    svgNode("rect", { x: "430", y: "184", width: "30", height: "64", rx: "12", fill: PAL.beakGold, "data-pal-fill": "beakGold", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "6" }, accHeadphones);

    const accMic = svgNode("g", { class: "m-acc-mic", opacity: "0" }, accessoriesG);
    svgNode("path", { d: "M 434,230 C 424,284 388,308 352,306", fill: "none", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "7", "stroke-linecap": "round" }, accMic);
    svgNode("ellipse", { cx: "344", cy: "306", rx: "16", ry: "11", fill: PAL.chestBlack, "data-pal-fill": "chestBlack", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "5" }, accMic);

    const accCoffeeMug = svgNode("g", { class: "m-acc-coffee_mug", opacity: "0" }, accessoriesG);
    svgNode("rect", { x: "420", y: "350", width: "58", height: "62", rx: "10", fill: PAL.sweatWhite, "data-pal-fill": "sweatWhite", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "6" }, accCoffeeMug);
    svgNode("path", { d: "M 478,364 C 498,364 498,398 478,398", fill: "none", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "6" }, accCoffeeMug);
    svgNode("path", { d: "M 438,338 Q 444,322 436,308 M 456,336 Q 464,320 456,306", fill: "none", stroke: PAL.sweatWhite, "data-pal-stroke": "sweatWhite", "stroke-width": "4", "stroke-linecap": "round" }, accCoffeeMug);

    const accessoryMap = {
      top_hat: accTopHat,
      crown: accCrown,
      cap: accCap,
      beanie: accBeanie,
      glasses: accGlasses,
      sunglasses: accSunglasses,
      monocle: accMonocle,
      bowtie: accBowtie,
      necktie: accNecktie,
      scarf: accScarf,
      headphones: accHeadphones,
      mic: accMic,
      coffee_mug: accCoffeeMug,
    };

    // 9. Comic Expression Accents
    const accentG = svgNode("g", { class: "m-accents" }, headG);
    const accQuestion = svgNode("g", { opacity: "0" }, accentG);
    const q1 = svgNode("text", { x: "136", y: "126", fill: PAL.sparkGold, "data-pal-fill": "sparkGold", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "3", "font-size": "62", "font-weight": "900", "font-family": "sans-serif", transform: "rotate(-14 136 126)" }, accQuestion);
    q1.textContent = "?";
    const q2 = svgNode("text", { x: "178", y: "102", fill: PAL.sparkGold, "data-pal-fill": "sparkGold", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "2.5", "font-size": "46", "font-weight": "900", "font-family": "sans-serif", transform: "rotate(-6 178 102)" }, accQuestion);
    q2.textContent = "?";

    const accSweat = svgNode("g", { opacity: "0" }, accentG);
    svgNode("path", { d: "M 456,118 C 468,94 484,104 474,126 C 468,138 452,132 456,118 Z", fill: PAL.sweatWhite, "data-pal-fill": "sweatWhite", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "4" }, accSweat);
    svgNode("path", { d: "M 476,154 C 492,140 502,152 490,166 C 482,174 470,164 476,154 Z", fill: PAL.sweatWhite, "data-pal-fill": "sweatWhite", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "4" }, accSweat);

    const accShock = svgNode("g", { opacity: "0" }, accentG);
    svgNode("path", { d: "M 462,126 L 494,64 L 516,78 L 474,134 Z", fill: PAL.sparkGold, "data-pal-fill": "sparkGold", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "4", "stroke-linejoin": "round" }, accShock);
    svgNode("path", { d: "M 488,150 L 538,118 L 548,142 L 492,162 Z", fill: PAL.sparkGold, "data-pal-fill": "sparkGold", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "4", "stroke-linejoin": "round" }, accShock);

    const accSparkle = svgNode("g", { opacity: "0" }, accentG);
    svgNode("path", { d: "M 484,104 L 492,128 L 516,136 L 492,144 L 484,168 L 476,144 L 452,136 L 476,128 Z", fill: PAL.sparkGold, "data-pal-fill": "sparkGold", stroke: PAL.outline, "data-pal-stroke": "outline", "stroke-width": "4", "stroke-linejoin": "round" }, accSparkle);

    // Phase 5 Item 16: Lighting Preset Overlay (preserves Brand Palette Lock — never touches data-pal-fill!)
    const lightingG = svgNode("g", { class: "m-lighting-overlay", opacity: "0", "pointer-events": "none" }, svg);
    const lightRimEl = svgNode("path", {
      class: "m-light-rim",
      d: "M 218,124 C 258,74 374,72 426,126 C 462,166 472,226 462,306 C 446,238 430,174 396,138 C 350,96 270,96 226,142 Z",
      fill: "none",
      stroke: "#F5B700",
      "stroke-width": "12",
      "stroke-linecap": "round",
      opacity: "0",
    }, lightingG);
    const lightTintEl = svgNode("ellipse", {
      class: "m-light-tint",
      cx: "320",
      cy: "330",
      rx: "225",
      ry: "290",
      fill: "#F59E0B",
      opacity: "0",
    }, lightingG);

    // Phase 6 Item 19: Deterministic 18-Part Pivot Crosshairs Overlay
    const debugPivotsG = svgNode("g", { class: "m-debug-pivots", opacity: "0", display: "none", "pointer-events": "none" }, svg);
    const pivotMarkers = {};
    const defaultPivotCoords = {
      body: [320, 540], head: [320, 312], beak_upper: [320, 240], beak_lower: [320, 260],
      eye_l: [272, 186], eye_r: [368, 186], pupil_l: [272, 188], pupil_r: [368, 188],
      lid_l: [272, 186], lid_r: [368, 186], brow_l: [262, 150], brow_r: [378, 150],
      crest: [404, 390], wing_l: [206, 372], wing_r: [434, 372], tail: [320, 510],
      legs: [320, 614], accessories: [320, 200],
    };
    Object.keys(defaultPivotCoords).forEach((pk) => {
      const [px, py] = defaultPivotCoords[pk];
      const pg = svgNode("g", { class: `m-pivot-pin m-pivot-${pk}`, "data-pivot-part": pk, transform: `translate(${px}, ${py})` }, debugPivotsG);
      svgNode("circle", { cx: "0", cy: "0", r: "6", fill: "rgba(15,23,42,0.8)", stroke: "#22D3EE", "stroke-width": "2" }, pg);
      svgNode("line", { x1: "-10", y1: "0", x2: "10", y2: "0", stroke: "#22D3EE", "stroke-width": "1.6" }, pg);
      svgNode("line", { x1: "0", y1: "-10", x2: "0", y2: "10", stroke: "#22D3EE", "stroke-width": "1.6" }, pg);
      const lbl = svgNode("text", { x: "9", y: "-7", fill: "#F8FAFC", stroke: "#09090B", "stroke-width": "0.8", "font-size": "11", "font-family": "monospace", "font-weight": "700" }, pg);
      lbl.textContent = pk;
      pivotMarkers[pk] = pg;
    });

    // 18-part canonical map matching PUPPET_PARTS
    const parts = {
      body: bodyG,
      head: headG,
      beak_upper: upperBeakG,
      beak_lower: lowerBeakG,
      eye_l: eyeL.eyeWrap,
      eye_r: eyeR.eyeWrap,
      pupil_l: eyeL.pupilG,
      pupil_r: eyeR.pupilG,
      lid_l: eyeL.lidG,
      lid_r: eyeR.lidG,
      brow_l: browL,
      brow_r: browR,
      crest: crestWingG,
      wing_l: wingL,
      wing_r: wingR,
      tail: tailG,
      legs: legsG,
      accessories: accessoriesG,
    };

    const speciesLayers = {
      eagleCrestPaths,
      tortoiseShell: speciesTortoiseShell,
      owlHead: speciesOwlHead,
      pigeonHead: speciesPigeonHead,
      hummerHead: speciesHummerHead,
    };

    return {
      svg, rootG, shadow, tailG, crestWingG, legsG, bodyG, neckRuffG,
      armsCrossedG, wingsOpenG, wingL, wingR, wingThinkG,
      gesturesG, gestPointG, gestThumbG, gestFacepalmG, gestSaluteG, gestClapG, gestClapL, gestClapR,
      headG, eyesG, eyeL, eyeR, browL, browR,
      beakG, mouthCavG, mouthClipPath, mouthBg, tongueEl, teethEl,
      lowerBeakG, lowerBeakPath, upperBeakG,
      accessoriesG, accGlasses, accHeadphones, accBowtie, accMic, accessoryMap,
      speciesLayers,
      accQuestion, accSweat, accShock, accSparkle,
      lightingG, lightRimEl, lightTintEl,
      debugPivotsG, pivotMarkers,
      parts,
    };
  }

  /* ------------------------------------------------ Apply Puppet Schema v2 Appearance (Parts Tree + Palette Lock) */
  function reorderGroupByZ(parentEl, childSpecs) {
    if (!parentEl || !Array.isArray(childSpecs) || childSpecs.length < 2) return;
    const sorted = childSpecs.slice().sort((a, b) => a.z - b.z);
    for (let i = 0; i < sorted.length; i += 1) {
      const el = sorted[i].el;
      if (!el || el.parentNode !== parentEl) continue;
      if (typeof parentEl.removeChild === "function") {
        parentEl.removeChild(el);
      } else if (Array.isArray(parentEl.children)) {
        const idx = parentEl.children.indexOf(el);
        if (idx >= 0) parentEl.children.splice(idx, 1);
      }
      parentEl.appendChild(el);
    }
  }

  function applyPuppetAppearance(rig, puppet) {
    const pal = (puppet && puppet.palette) ? puppet.palette : PAL;
    const lock = !puppet || puppet.paletteLock !== false;

    // 1. Apply global palette across all tagged SVG nodes
    walkTree(rig.svg, (node) => {
      if (!node || !node.getAttribute) return;
      const fillKey = node.getAttribute("data-pal-fill");
      if (fillKey && pal[fillKey]) node.setAttribute("fill", pal[fillKey]);
      const strokeKey = node.getAttribute("data-pal-stroke");
      if (strokeKey && pal[strokeKey]) node.setAttribute("stroke", pal[strokeKey]);
      const baseSw = node.getAttribute("data-base-sw");
      if (baseSw != null) node.setAttribute("stroke-width", baseSw);
    });

    // 2. Apply per-part visible, color override (when unlocked), and outlineWidth multiplier
    const partsCfg = (puppet && puppet.parts) || {};
    Object.keys(rig.parts).forEach((pk) => {
      const el = rig.parts[pk];
      if (!el) return;
      const pc = partsCfg[pk] || {};
      const vis = pc.visible !== false;
      el.setAttribute("display", vis ? "inline" : "none");
      if (el.style) el.style.display = vis ? "" : "none";

      const ow = clamp(Number(pc.outlineWidth ?? 1.0), 0, 3.0);
      const customColor = !lock && pc.color ? pc.color : null;
      if (ow !== 1.0 || customColor) {
        walkTree(el, (node) => {
          if (!node || !node.getAttribute) return;
          const baseSw = node.getAttribute("data-base-sw");
          if (baseSw != null && ow !== 1.0) {
            node.setAttribute("stroke-width", (Number(baseSw) * ow).toFixed(2));
          }
          if (customColor) {
            const fk = node.getAttribute("data-pal-fill");
            if (fk && fk !== "outline" && fk !== "scleraWhite" && fk !== "pupilBlack") {
              node.setAttribute("fill", customColor);
            }
          }
        });
      }
    });

    // 3. Apply zOrder deterministically within rootG (tail, crest, legs, body)
    const rootOrder = [
      { el: rig.tailG, z: (partsCfg.tail && partsCfg.tail.zOrder) ?? 1 },
      { el: rig.crestWingG, z: (partsCfg.crest && partsCfg.crest.zOrder) ?? 2 },
      { el: rig.legsG, z: (partsCfg.legs && partsCfg.legs.zOrder) ?? 3 },
      { el: rig.bodyG, z: (partsCfg.body && partsCfg.body.zOrder) ?? 4 },
    ];
    reorderGroupByZ(rig.rootG, rootOrder);

    // 4. Toggle species-specific character layers (red_eagle keeps exact sheet silhouette!)
    const charKey = (puppet && puppet.character) || "red_eagle";
    if (rig.speciesLayers) {
      const toggleLayer = (el, on) => {
        if (!el) return;
        el.setAttribute("opacity", on ? "1" : "0");
        el.setAttribute("display", on ? "inline" : "none");
      };
      toggleLayer(rig.speciesLayers.eagleCrestPaths, charKey !== "barnaby_tortoise");
      toggleLayer(rig.speciesLayers.tortoiseShell, charKey === "barnaby_tortoise");
      toggleLayer(rig.speciesLayers.owlHead, charKey === "vesper_owl");
      toggleLayer(rig.speciesLayers.pigeonHead, charKey === "pip_pigeon");
      toggleLayer(rig.speciesLayers.hummerHead, charKey === "midge_hummingbird");
    }

    // 5. Toggle all 13 accessories
    const accSet = new Set(Array.isArray(puppet && puppet.accessories) ? puppet.accessories : []);
    if (rig.accessoryMap) {
      Object.keys(rig.accessoryMap).forEach((k) => {
        rig.accessoryMap[k].setAttribute("opacity", accSet.has(k) ? "1" : "0");
      });
    }

    // 6. Phase 5 Item 16: Lighting Preset Overlay (without altering underlying Brand Palette Lock fills)
    if (rig.lightingG && rig.lightRimEl && rig.lightTintEl) {
      const sc = (puppet && puppet.scene) || {};
      const lKey = LIGHTING_PRESETS[sc.lighting] ? sc.lighting : "studio";
      const lSpec = LIGHTING_PRESETS[lKey] || LIGHTING_PRESETS.studio;
      const inten = clamp(Number(sc.lightingIntensity ?? lSpec.intensity ?? 0), 0, 1.5);
      const active = lKey !== "studio" && inten > 0.01;
      rig.lightingG.setAttribute("opacity", active ? "1" : "0");
      rig.lightingG.setAttribute("data-lighting", lKey);
      rig.lightRimEl.setAttribute("stroke", lSpec.rimColor || "#FFFFFF");
      rig.lightRimEl.setAttribute("opacity", active ? clamp((lSpec.rimAlpha || 0) * inten, 0, 0.92).toFixed(3) : "0");
      rig.lightTintEl.setAttribute("fill", lSpec.tintColor || "transparent");
      rig.lightTintEl.setAttribute("opacity", active ? clamp((lSpec.tintAlpha || 0) * inten, 0, 0.42).toFixed(3) : "0");
    }

    // 7. Phase 6 Item 19: Update 18-part pivot crosshair coordinates
    if (rig.pivotMarkers) {
      Object.keys(rig.pivotMarkers).forEach((pk) => {
        const pc = partsCfg[pk];
        if (pc && Number.isFinite(Number(pc.pivotX)) && Number.isFinite(Number(pc.pivotY))) {
          rig.pivotMarkers[pk].setAttribute("transform", `translate(${Number(pc.pivotX).toFixed(1)}, ${Number(pc.pivotY).toFixed(1)})`);
        }
      });
    }
  }

  function partOffset(puppet, key, defPx, defPy) {
    const p = (puppet && puppet.parts && puppet.parts[key]) || null;
    if (!p) return { x: 0, y: 0, rot: 0, sx: 1, sy: 1, px: defPx, py: defPy };
    return {
      x: Number(p.x) || 0,
      y: Number(p.y) || 0,
      rot: Number(p.rotation) || 0,
      sx: Number(p.scaleX ?? 1) || 1,
      sy: Number(p.scaleY ?? 1) || 1,
      px: Number(p.pivotX ?? defPx) || defPx,
      py: Number(p.pivotY ?? defPy) || defPy,
    };
  }

  function buildPartTransform(px, py, dx, dy, rotDeg, sx, sy) {
    return `translate(${(px + dx).toFixed(2)}, ${(py + dy).toFixed(2)}) rotate(${rotDeg.toFixed(2)}) scale(${sx.toFixed(4)}, ${sy.toFixed(4)}) translate(${(-px).toFixed(2)}, ${(-py).toFixed(2)})`;
  }

  /* ------------------------------------------------ Rig Controller */
  let _uidSeq = 0;

  function createMascotInstance(parent, cfg = {}) {
    _uidSeq += 1;
    const uid = _uidSeq;
    const side = String(cfg.side || "left").toLowerCase() === "right" ? "right" : "left";
    const scale = clamp(Number(cfg.scale ?? 1), 0.35, 1.8);
    const seed = String(cfg.seed || cfg._seed || "mascot-1");
    const duration = Math.max(1, Number(cfg.duration || 6));
    const fps = Number(cfg.fps || 30);

    const sayRaw = cfg.say || cfg.text || "";
    const dialogue = (cfg.dialogue && typeof cfg.dialogue === "object" && Array.isArray(cfg.dialogue.turns)) ? cfg.dialogue : null;
    const speakerId = cfg.speakerId || null;
    const scriptParsed = parseScriptTags(sayRaw, duration);

    // Viseme track: explicit track -> dialogue turn track -> synthesized deterministic fallback from clean say
    const track = (cfg.visemeTrack && Array.isArray(cfg.visemeTrack.frames) && cfg.visemeTrack.frames.length)
      ? cfg.visemeTrack
      : (dialogue && speakerId)
        ? buildDialogueVisemeTrack(dialogue, speakerId, fps, duration, seed)
        : buildTextVisemeTrack(sayRaw, fps, duration, seed);

    // Prosody track: explicit narration.prosody.json OR deterministic synthesis from viseme track
    const prosody = (cfg.prosodyTrack && Array.isArray(cfg.prosodyTrack.frames) && cfg.prosodyTrack.frames.length)
      ? cfg.prosodyTrack
      : synthesizeProsodyFromVisemes(track, seed);

    // Puppet Schema v2 configuration (fully backwards-compatible with legacy cfg.tone / mascot.tone)
    const legacyTone = cfg.tone || (cfg.mascot && cfg.mascot.tone) || null;
    const hydrateDeclarativePlugins = (pObj) => {
      if (!pObj || !pObj.plugins || typeof pObj.plugins !== "object") return;
      if (pObj.plugins.emotions && typeof pObj.plugins.emotions === "object") {
        Object.keys(pObj.plugins.emotions).forEach((k) => {
          registerEmotion(k, pObj.plugins.emotions[k]);
        });
      }
      if (pObj.plugins.gestures && typeof pObj.plugins.gestures === "object") {
        Object.keys(pObj.plugins.gestures).forEach((k) => {
          registerGesture(k, pObj.plugins.gestures[k]);
        });
      }
    };
    const rawPuppetIn = cfg.puppet || (cfg.mascot && cfg.mascot.puppet) || null;
    hydrateDeclarativePlugins(rawPuppetIn);
    let puppet = resolvePuppetConfig(rawPuppetIn, legacyTone);
    hydrateDeclarativePlugins(puppet);
    let tone = puppet.tone;

    const activePeaks = (prosody.peaks && prosody.peaks.length) ? prosody.peaks : track.peaks;
    const activePhrases = (prosody.phrases && prosody.phrases.length) ? prosody.phrases : track.phrases;
    const activePauses = prosody.pauses || [];

    // Inject dialogue turn expressions & gestures for this speakerId
    const effectiveCfg = Object.assign({}, cfg);
    if (dialogue && speakerId) {
      const turnExprs = [];
      const turnGestures = [];
      dialogue.turns.forEach((tr) => {
        if (tr.speaker === speakerId) {
          if (tr.expression && EXPRESSIONS[tr.expression]) {
            turnExprs.push({ t: tr.start, expression: tr.expression, blend: 0.28, intensity: puppet.emotionIntensity });
          }
          if (tr.gesture && GESTURES[tr.gesture]) {
            turnGestures.push({ t: tr.start + 0.12, gesture: tr.gesture, duration: 1.05, offset: 0, intensity: 1.0 });
          }
          const parsedTurn = parseScriptTags(tr.say || "", Math.max(0.5, tr.end - tr.start));
          parsedTurn.emotions.forEach((em) => turnExprs.push(Object.assign({}, em, { t: +(tr.start + em.t).toFixed(3) })));
          parsedTurn.gestures.forEach((gs) => turnGestures.push(Object.assign({}, gs, { t: +(tr.start + gs.t).toFixed(3) })));
        }
      });
      effectiveCfg.expression_timeline = (cfg.expression_timeline || []).concat(turnExprs);
      if (turnGestures.length) {
        puppet = Object.assign({}, puppet, { gestures: (puppet.gestures || []).concat(turnGestures) });
      }
    }

    let exprCues = normalizeExpressionTimeline(effectiveCfg, puppet, scriptParsed);
    let gestureCues = buildGestureTimeline(puppet, scriptParsed, activePeaks);
    let gazeCues = buildGazeTimeline(effectiveCfg, puppet, scriptParsed);
    let blinks = buildBlinkSchedule(seed, duration, activePeaks, activePhrases, activePauses, tone.blinkRate, exprCues);
    const saccades = buildSaccadeSchedule(seed, duration);
    let bakedSprings = bakeDeterministicSprings(track, prosody, puppet, exprCues, gazeCues, side, duration, fps, seed);

    // Live OBS microphone spring bank (never affects offline deterministic seek(t))
    let liveMode = false;
    let liveTime = 0;
    let livePhraseSec = 0;
    let livePeakSign = 1;
    let liveSprings = createSpringBank();

    let lastState = {
      t: 0,
      mouthOpen: 0,
      browY: 0,
      browRot: 0,
      headTilt: 0,
      headNodY: 0,
      chestBounceY: 0,
      wingAngle: 0,
      blink: 0,
      loudness: 0,
      db: -80,
      f0Hz: 0,
      pitchNorm: 0,
      pitchDelta: 0,
      emphasis: 0,
      isSpeaking: false,
      viseme: "rest",
      tonePreset: tone.preset,
      emotion: "neutral",
      emotionIntensity: puppet.emotionIntensity,
      gesture: null,
      gazeX: 0,
      gazeY: 0,
      crestOverlap: 0,
      featherJiggle: 0,
      wingFollow: 0,
      bodyScaleX: 1,
      bodyScaleY: 1,
      volumeProduct: 1,
      dampingRatio: +computeDampingRatio(puppet.spring).toFixed(3),
      puppetVersion: 2,
      liveMode: false,
    };

    const container = document.createElement("div");
    container.className = `mascot-rig-wrap mascot-side-${side}`;
    Object.assign(container.style, {
      position: "absolute",
      width: (460 * scale) + "px",
      height: (518 * scale) + "px",
      pointerEvents: "none",
      zIndex: String(cfg.zIndex ?? 28),
      transformOrigin: "50% 92%",
    });

    const stageW = Number(cfg.stageW || 1920);
    const stageH = Number(cfg.stageH || 1080);
    const boxW = 460 * scale;
    const boxH = 518 * scale;
    const posX = cfg.x != null && cfg.x !== ""
      ? Number(cfg.x)
      : (side === "right" ? stageW - boxW - 54 : 54);
    const posY = cfg.y != null && cfg.y !== ""
      ? Number(cfg.y)
      : (stageH - boxH - 22);
    container.style.left = Math.round(posX) + "px";
    container.style.top = Math.round(posY) + "px";

    const flipBox = document.createElement("div");
    Object.assign(flipBox.style, {
      width: "100%",
      height: "100%",
      transform: side === "left" ? "scaleX(-1)" : "none",
      transformOrigin: "50% 50%",
    });
    container.appendChild(flipBox);

    const rig = buildEagleSVG(flipBox, { uid });
    applyPuppetAppearance(rig, puppet);
    if (parent) parent.appendChild(container);

    const enterMode = String(cfg.enter || cfg.enter_anim || "slide-in").toLowerCase();
    const exitMode = String(cfg.exit || cfg.exit_anim || "none").toLowerCase();
    const showAccents = cfg.accents !== false;

    /* Shared rig DOM renderer used identically by deterministic seek(t) AND real-time live mic mode */
    function renderPose(t, expr, gest, dyn, lip, pro, sp, blinkVal) {
      const lim = puppet.limits || TONE_LIMITS;
      const curTone = dyn.tone;

      // 1. Enter & Exit animation (purely deterministic from t)
      let entX = 0, entY = 0, entScale = 1, entOpacity = 1;
      if (!liveMode && enterMode !== "none" && t < ACTING.enterDur) {
        const u = smootherstep(t / ACTING.enterDur);
        if (enterMode === "pop") {
          entScale = lerp(0.62, 1, u);
          entOpacity = smoothstep(t / (ACTING.enterDur * 0.55));
          entY = lerp(34, 0, u);
        } else if (enterMode === "fade") {
          entOpacity = u;
        } else if (enterMode === "drop") {
          entY = lerp(-120, 0, u);
          entOpacity = smoothstep(t / (ACTING.enterDur * 0.5));
        } else {
          const off = side === "left" ? -260 : 260;
          entX = lerp(off, 0, u);
          entOpacity = smoothstep(t / (ACTING.enterDur * 0.5));
        }
      }
      if (!liveMode && exitMode !== "none" && duration > ACTING.exitDur + 0.5 && t > duration - ACTING.exitDur) {
        const u = smootherstep((t - (duration - ACTING.exitDur)) / ACTING.exitDur);
        if (exitMode === "pop") {
          entScale *= lerp(1, 0.72, u);
          entOpacity *= 1 - u;
        } else if (exitMode === "fade") {
          entOpacity *= 1 - u;
        } else {
          const off = side === "left" ? -260 : 260;
          entX += lerp(0, off, u);
          entOpacity *= 1 - u;
        }
      }
      container.style.opacity = entOpacity.toFixed(3);

      // 2. Gesture modifiers (9 built-in gestures + Phase 6 Item 22 Plugin API gestures)
      let gestHeadTilt = 0;
      let gestHeadNodY = 0;
      let gestBodyLiftY = 0;
      let gestBrowBoost = 0;
      let gestEyeWide = 0;
      let gestWingExtra = 0;
      let gestCrestExtra = 0;
      const gName = gest ? gest.name : null;
      const gW = gest ? gest.weight : 0;
      const gP = gest ? gest.progress : 0;

      if (gName === "shrug") {
        gestBodyLiftY = -12 * gW;
        gestHeadTilt = 8 * gW;
        gestBrowBoost = -7 * gW;
      } else if (gName === "double-take") {
        // Snappy twin head-turn + brow pop + eye widen
        const pulse = Math.sin(gP * Math.PI * 2.5);
        gestHeadTilt = pulse * 14 * gW;
        gestHeadNodY = -Math.abs(pulse) * 6 * gW;
        gestBrowBoost = -11 * gW;
        gestEyeWide = 0.12 * gW;
      } else if (gName === "facepalm") {
        gestHeadNodY = 10 * gW;
        gestHeadTilt = -7 * gW;
      } else if (gName === "salute") {
        gestHeadNodY = -4 * gW;
        gestHeadTilt = 3 * gW;
      } else if (gName === "point" || gName === "thumbs-up") {
        gestHeadTilt = -4 * gW;
      } else if (gName === "clap") {
        gestBodyLiftY = -Math.abs(Math.sin(gP * Math.PI * 4)) * 6 * gW;
      } else if (gName && gW > 0.01) {
        const gSpec = getGestureSpec(gName, puppet);
        if (gSpec) {
          let mod = gSpec;
          if (typeof gSpec.evaluate === "function") {
            const dynMod = gSpec.evaluate({ progress: gP, weight: gW, intensity: gest.intensity || 1, t });
            if (dynMod && typeof dynMod === "object") mod = dynMod;
          }
          gestHeadTilt = clamp(Number(mod.headTilt || 0) * gW, -24, 24);
          gestHeadNodY = clamp(Number(mod.headNod || 0) * gW, -20, 20);
          gestBodyLiftY = clamp(Number(mod.bodyBounce || 0) * gW, -16, 16);
          gestBrowBoost = clamp(Number(mod.browLift || 0) * gW, -18, 18);
          gestWingExtra = clamp(Number(mod.wingAngle || mod.wingLRot || 0) * gW, -32, 32);
          gestCrestExtra = clamp(Number(mod.crestTilt || 0) * gW, -20, 20);
        }
      }

      // 3. Idle breathing + micro-sway + chest bounce + Volume-Preserving Squash & Stretch (Phase 2 Item 8)
      const breathePhase = (t / ACTING.breathePeriod) * Math.PI * 2;
      const idleScale = clamp(sp.idleWeight * curTone.idleSway, 0, 2);
      const breatheY = Math.sin(breathePhase) * ACTING.breatheAmpY * (0.45 + 0.55 * idleScale);
      const breatheScaleY = 1 + Math.sin(breathePhase - 0.5) * ACTING.breatheScale * (0.5 + 0.5 * idleScale);
      const microSwayX = Math.sin(t * 0.92) * 2.8 * idleScale;
      const microSwayDeg = clamp(
        (Math.sin(t * 0.85) * 1.45 + Math.sin(t * 1.63 + 0.9) * 0.65) * idleScale,
        -lim.idleSwayDegMax,
        lim.idleSwayDegMax,
      );

      const chestBounceY = clamp(-sp.chestBounceY, lim.chestBounceMin, lim.chestBounceMax);
      const squashAmt = clamp(sp.chestSquash, 0, lim.chestSquashMax);
      const preserveVol = !puppet.secondary || puppet.secondary.squashPreserveVolume !== false;
      const squashY = clamp(breatheScaleY - squashAmt * 0.68, 0.88, 1.12);
      const squashX = preserveVol ? (1 / squashY) : (1 + squashAmt * 0.58);

      const bodyPo = partOffset(puppet, "body", 320, 540);
      const bodyScaleX = squashX * entScale * bodyPo.sx;
      const bodyScaleY = squashY * entScale * bodyPo.sy;

      rig.rootG.setAttribute(
        "transform",
        `translate(${(entX + microSwayX).toFixed(2)}, ${entY.toFixed(2)})`
      );
      rig.bodyG.setAttribute(
        "transform",
        buildPartTransform(bodyPo.px, bodyPo.py, bodyPo.x, bodyPo.y + breatheY + chestBounceY + gestBodyLiftY, bodyPo.rot, bodyScaleX, bodyScaleY)
      );

      // Legs custom part transform
      const legsPo = partOffset(puppet, "legs", 320, 614);
      rig.legsG.setAttribute("transform", buildPartTransform(legsPo.px, legsPo.py, legsPo.x, legsPo.y, legsPo.rot, legsPo.sx, legsPo.sy));

      // Secondary feather jiggle on neck ruff
      const fj = sp.featherJiggle || 0;
      rig.neckRuffG.setAttribute("transform", `translate(320, 355) rotate(${(fj * 0.75).toFixed(2)}) translate(-320, -355)`);

      // 4. Head tilt & nod on emphasis peaks + expression + gesture + dialogue listener reaction + part offset
      const dlgState = evaluateDialogueAt(dialogue, speakerId, t);
      const headPo = partOffset(puppet, "head", 320, 312);
      const speechWave = (pro.is_speaking && !dlgState.isListening) ? Math.sin(t * 9.5) * (0.35 + pro.loudness * 0.55) * 1.4 : 0;
      const headNodY = clamp(sp.headNodY + speechWave + (expr.headPitch || 0) + gestHeadNodY + (dlgState.nodY || 0), lim.headNodMin - 10, lim.headNodMax + 12);
      const headTilt = clamp(sp.headTilt + microSwayDeg + (expr.headTilt || 0) + gestHeadTilt + (dlgState.tilt || 0), lim.headTiltMin - 12, lim.headTiltMax + 12);
      rig.headG.setAttribute(
        "transform",
        buildPartTransform(headPo.px, headPo.py, headPo.x, headPo.y + headNodY, headTilt + headPo.rot, headPo.sx, headPo.sy)
      );

      // 5. Three-stripe wing crest & tail with secondary overlap & feather jiggle (Phase 2 Item 8)
      const crestPo = partOffset(puppet, "crest", 404, 390);
      const tailPo = partOffset(puppet, "tail", 320, 510);
      const wingFlare = clamp(
        pro.emphasis * 6.5 * curTone.wingGain + Math.sin(breathePhase) * 2.2 + (expr.crestTilt || 0) * 0.55 + (sp.crestOverlap || 0) * 0.75 + fj * 0.45 + gestCrestExtra,
        -22,
        22,
      );
      rig.crestWingG.setAttribute("transform", buildPartTransform(crestPo.px, crestPo.py, crestPo.x, crestPo.y, wingFlare + crestPo.rot, crestPo.sx, crestPo.sy));
      rig.tailG.setAttribute("transform", buildPartTransform(tailPo.px, tailPo.py, tailPo.x, tailPo.y, -wingFlare * 0.45 + fj * 0.5 + tailPo.rot, tailPo.sx, tailPo.sy));

      // 6. Wing gestures (9 built-in + custom plugin gestures + long emphasis phrases + wing follow-through)
      const isSpecialProp = gW > 0.08 && (gName === "point" || gName === "thumbs-up" || gName === "facepalm" || gName === "salute" || gName === "clap");
      const wantThink = !isSpecialProp && (gName === "chin-scratch" && gW > 0.08 || expr.wingPose === "thinking");
      const wantShrug = !isSpecialProp && gName === "shrug" && gW > 0.08;
      const wantCrossForce = !isSpecialProp && gName === "wing-cross" && gW > 0.08;
      const wantOpen = !isSpecialProp && !wantThink && !wantCrossForce && (wantShrug || Math.abs(gestWingExtra) > 0.5 || expr.wingPose === "open" || expr.wingPose === "alert" || sp.wingEnergy > 0.22);

      rig.armsCrossedG.setAttribute("opacity", (isSpecialProp || wantThink || wantOpen) ? "0" : "1");
      rig.wingThinkG.setAttribute("opacity", wantThink ? "1" : "0");
      rig.wingsOpenG.setAttribute("opacity", wantOpen ? "1" : "0");

      rig.gestPointG.setAttribute("opacity", (gName === "point" && gW > 0.08) ? gW.toFixed(2) : "0");
      rig.gestThumbG.setAttribute("opacity", (gName === "thumbs-up" && gW > 0.08) ? gW.toFixed(2) : "0");
      rig.gestFacepalmG.setAttribute("opacity", (gName === "facepalm" && gW > 0.08) ? gW.toFixed(2) : "0");
      rig.gestSaluteG.setAttribute("opacity", (gName === "salute" && gW > 0.08) ? gW.toFixed(2) : "0");
      rig.gestClapG.setAttribute("opacity", (gName === "clap" && gW > 0.08) ? gW.toFixed(2) : "0");
      if (gName === "clap" && gW > 0.08) {
        const clapShift = Math.sin(gP * Math.PI * 6) * 14 * gW;
        rig.gestClapL.setAttribute("transform", `translate(${clapShift.toFixed(2)}, 0)`);
        rig.gestClapR.setAttribute("transform", `translate(${(-clapShift).toFixed(2)}, 0)`);
      }

      let wingAngle = 0;
      const wingLPo = partOffset(puppet, "wing_l", 206, 372);
      const wingRPo = partOffset(puppet, "wing_r", 434, 372);
      if (wantOpen) {
        const gestureAmp = Math.max(0.3, sp.wingEnergy) * (6 + pro.loudness * 12);
        const followLag = (sp.wingFollow || 0) * 0.42;
        const shrugBoost = wantShrug ? (-18 * gW) : 0;
        wingAngle = clamp(
          Math.sin(t * 6.4) * gestureAmp + followLag + shrugBoost + gestWingExtra + (expr.wingPose === "alert" ? -12 : 0),
          lim.wingAngleMin,
          lim.wingAngleMax,
        );
        rig.wingL.setAttribute("transform", buildPartTransform(wingLPo.px, wingLPo.py, wingLPo.x, wingLPo.y, -wingAngle + wingLPo.rot, wingLPo.sx, wingLPo.sy));
        rig.wingR.setAttribute("transform", buildPartTransform(wingRPo.px, wingRPo.py, wingRPo.x, wingRPo.y, wingAngle + wingRPo.rot, wingRPo.sx, wingRPo.sy));
      } else {
        rig.wingL.setAttribute("transform", buildPartTransform(wingLPo.px, wingLPo.py, wingLPo.x, wingLPo.y, wingLPo.rot, wingLPo.sx, wingLPo.sy));
        rig.wingR.setAttribute("transform", buildPartTransform(wingRPo.px, wingRPo.py, wingRPo.x, wingRPo.y, wingRPo.rot, wingRPo.sx, wingRPo.sy));
      }

      // 7. Eyebrows: pitch + emphasis + expression + gesture + dialogue listener reaction + part offsets
      const browLPo = partOffset(puppet, "brow_l", 262, 150);
      const browRPo = partOffset(puppet, "brow_r", 378, 150);
      const browLY = clamp(expr.browLY + sp.browY + gestBrowBoost + (dlgState.browOffset || 0), -28, 16);
      const browRY = clamp(expr.browRY + sp.browY + gestBrowBoost + (dlgState.browOffset || 0), -28, 16);
      const browLRot = clamp(expr.browLRot + sp.browRot, -32, 34);
      const browRRot = clamp(expr.browRRot - sp.browRot, -34, 32);
      rig.browL.setAttribute("transform", buildPartTransform(browLPo.px, browLPo.py, browLPo.x, browLPo.y + browLY, browLRot + browLPo.rot, browLPo.sx, browLPo.sy));
      rig.browR.setAttribute("transform", buildPartTransform(browRPo.px, browRPo.py, browRPo.x, browRPo.y + browRY, browRRot + browRPo.rot, browRPo.sx, browRPo.sy));

      // 8. Eyes: smooth pursuit gaze + scaled saccades + blinks + smug crescent lids + part offsets
      let sacDx = 0, sacDy = 0;
      for (let i = 0; i < saccades.length; i += 1) {
        if (saccades[i].t <= t) {
          const prev = saccades[Math.max(0, i - 1)];
          const dt = t - saccades[i].t;
          const u = smoothstep(dt / 0.08);
          sacDx = lerp(prev.dx, saccades[i].dx, u);
          sacDy = lerp(prev.dy, saccades[i].dy, u);
        } else break;
      }
      const sacScale = puppet.gaze ? clamp(Number(puppet.gaze.saccadeScale ?? 1.0), 0, 2.0) : 1.0;
      const listenerLookBias = dlgState.isListening ? resolveLookAtOffset("other", expr.name, side) : null;
      const baseGazeX = listenerLookBias ? listenerLookBias.x : (sp.gazeX || 0);
      const baseGazeY = listenerLookBias ? listenerLookBias.y : (sp.gazeY || 0);
      const pupilDx = clamp(baseGazeX + sacDx * 0.55 * sacScale, -13, 13);
      const pupilDy = clamp(baseGazeY + sacDy * 0.55 * sacScale, -10, 10);

      const pupilLPo = partOffset(puppet, "pupil_l", 272, 188);
      const pupilRPo = partOffset(puppet, "pupil_r", 368, 188);
      const fmtPupilTf = (po) => (
        (po.rot === 0 && po.sx === 1 && po.sy === 1)
          ? `translate(${(pupilDx + po.x).toFixed(2)}, ${(pupilDy + po.y).toFixed(2)})`
          : buildPartTransform(po.px, po.py, pupilDx + po.x, pupilDy + po.y, po.rot, po.sx, po.sy)
      );
      rig.eyeL.pupilG.setAttribute("transform", fmtPupilTf(pupilLPo));
      rig.eyeR.pupilG.setAttribute("transform", fmtPupilTf(pupilRPo));

      const effectiveBlink = Math.max(blinkVal, expr.smugArc > 0.65 ? expr.smugArc : 0);
      const upperClose = clamp(Math.max(expr.upperLid, effectiveBlink), 0, 1);
      const lowerClose = clamp(Math.max(expr.lowerLid, effectiveBlink * 0.45), 0, 1);

      const updateEyeLids = (eye, eyePartKey, lidPartKey) => {
        const epo = partOffset(puppet, eyePartKey, eye.cx, eye.cy);
        const lpo = partOffset(puppet, lidPartKey, eye.cx, eye.cy);
        const topSlide = upperClose * 62;
        const botSlide = -lowerClose * 34;
        eye.upperLid.setAttribute("y", (eye.cy - 95 + topSlide).toFixed(2));
        eye.lowerLid.setAttribute("y", (eye.cy + 44 + botSlide).toFixed(2));
        eye.lidG.setAttribute("transform", buildPartTransform(lpo.px, lpo.py, lpo.x, lpo.y, lpo.rot, lpo.sx, lpo.sy));
        const showHappy = expr.smugArc > 0.6 && blinkVal < 0.5 ? (expr.smugArc - 0.6) * 2.5 : 0;
        eye.happyArc.setAttribute("opacity", clamp(showHappy, 0, 1).toFixed(2));
        eye.eyeWrap.setAttribute(
          "transform",
          buildPartTransform(epo.px, epo.py, epo.x, epo.y, epo.rot, (expr.eyeScaleX + gestEyeWide) * epo.sx, (expr.eyeScaleY + gestEyeWide) * epo.sy)
        );
      };
      updateEyeLids(rig.eyeL, "eye_l", "lid_l");
      updateEyeLids(rig.eyeR, "eye_r", "lid_r");

      // 9. Hinged Beak Lip-Sync + per-part beak offsets (shut cleanly when listening in dialogue mode)
      const rawJaw = pro.is_speaking || lip.is_speech ? clamp(sp.mouthOpen, 0, 1) : (sp.mouthOpen > 0.045 ? sp.mouthOpen : 0);
      const effectiveJawOpen = dlgState.isListening ? 0 : rawJaw;
      const jawDropPx = effectiveJawOpen * 38;
      const upperLiftPx = -(lip.upperLift * 0.65 + effectiveJawOpen * 0.14) * 8;
      const wScale = lip.widthScale;
      const smileLift = (expr.beakSmile || 0) * 6;

      const uBeakPo = partOffset(puppet, "beak_upper", 320, 240);
      const lBeakPo = partOffset(puppet, "beak_lower", 320, 260);

      rig.beakG.setAttribute("transform", `translate(320, 254) scale(${wScale.toFixed(3)}, 1) translate(-320, -254)`);
      rig.upperBeakG.setAttribute(
        "transform",
        buildPartTransform(uBeakPo.px, uBeakPo.py, uBeakPo.x, uBeakPo.y + upperLiftPx - smileLift * 0.25, -(lip.upperLift + effectiveJawOpen * 0.12) * 3.8 + uBeakPo.rot, uBeakPo.sx, uBeakPo.sy)
      );
      rig.lowerBeakG.setAttribute(
        "transform",
        buildPartTransform(lBeakPo.px, lBeakPo.py, lBeakPo.x, lBeakPo.y + jawDropPx * 0.48 + lip.lipTuck * -3, lBeakPo.rot, lBeakPo.sx, (1 + effectiveJawOpen * 0.16) * lBeakPo.sy)
      );

      const cavBottomY = 270 + jawDropPx * 1.45;
      const cavD = `M 266,252 Q 320,${(242 - smileLift * 0.4).toFixed(1)} 374,252 L 360,${cavBottomY.toFixed(1)} Q 320,${(cavBottomY + 18).toFixed(1)} 280,${cavBottomY.toFixed(1)} Z`;
      rig.mouthBg.setAttribute("d", cavD);
      rig.mouthClipPath.setAttribute("d", cavD);
      rig.mouthCavG.setAttribute("opacity", effectiveJawOpen > 0.045 ? "1" : "0");

      rig.tongueEl.setAttribute("opacity", clamp(Math.max(lip.tongue, effectiveJawOpen * 0.72), 0, 1).toFixed(2));
      rig.tongueEl.setAttribute("transform", `translate(0, ${(jawDropPx * 0.72).toFixed(2)})`);
      rig.teethEl.setAttribute("opacity", clamp(lip.teeth, 0, 1).toFixed(2));
      rig.teethEl.setAttribute("transform", `translate(0, ${(upperLiftPx * 0.4).toFixed(2)})`);

      const cornerY = 258 - smileLift;
      const tipY = 286 + jawDropPx * 0.35;
      rig.lowerBeakPath.setAttribute(
        "d",
        `M 272,${cornerY.toFixed(1)} Q 320,${(272 + jawDropPx * 0.2).toFixed(1)} 368,${cornerY.toFixed(1)} L 354,${tipY.toFixed(1)} Q 320,${(tipY + 22).toFixed(1)} 286,${tipY.toFixed(1)} Z`
      );

      // Accessories custom part transform + Phase 4 Item 13 timed accessory swap at time t
      const activeAccList = evaluateAccessoriesAt(puppet, scriptParsed, t);
      if (rig.accessoryMap) {
        const activeAccSet = new Set(activeAccList);
        Object.keys(rig.accessoryMap).forEach((k) => {
          rig.accessoryMap[k].setAttribute("opacity", activeAccSet.has(k) ? "1" : "0");
        });
      }
      const accPo = partOffset(puppet, "accessories", 320, 200);
      rig.accessoriesG.setAttribute("transform", buildPartTransform(accPo.px, accPo.py, accPo.x, accPo.y, accPo.rot, accPo.sx, accPo.sy));

      // 10. Comic expression accents
      const acc = showAccents ? expr.accent : "none";
      const accStr = expr.accentStrength != null ? expr.accentStrength : 1;
      rig.accQuestion.setAttribute("opacity", acc === "question" ? accStr.toFixed(2) : "0");
      rig.accSweat.setAttribute("opacity", acc === "sweat" ? accStr.toFixed(2) : "0");
      rig.accShock.setAttribute("opacity", acc === "shock" ? accStr.toFixed(2) : "0");
      rig.accSparkle.setAttribute("opacity", acc === "sparkle" ? (accStr * (0.75 + 0.25 * Math.sin(t * 4))).toFixed(2) : "0");

      lastState = {
        t: +t.toFixed(4),
        character: puppet.character || "red_eagle",
        outfit: puppet.outfit || "default",
        skin: puppet.skin || "classic",
        activeAccessories: activeAccList,
        isListening: Boolean(dlgState.isListening),
        listenerReaction: dlgState.reaction || null,
        mouthOpen: +effectiveJawOpen.toFixed(4),
        browY: +browLY.toFixed(3),
        browRot: +browLRot.toFixed(3),
        headTilt: +headTilt.toFixed(3),
        headNodY: +headNodY.toFixed(3),
        chestBounceY: +chestBounceY.toFixed(3),
        wingAngle: +wingAngle.toFixed(3),
        blink: +blinkVal.toFixed(3),
        loudness: +clamp(pro.loudness || 0, 0, 1).toFixed(4),
        db: +clamp(pro.db ?? -80, -80, 0).toFixed(2),
        f0Hz: +(pro.f0_hz || 0).toFixed(2),
        pitchNorm: +clamp(pro.pitch_norm || 0, -1, 1).toFixed(4),
        pitchDelta: +clamp(pro.pitch_delta || 0, -1, 1).toFixed(4),
        emphasis: +clamp(pro.emphasis || 0, 0, 1).toFixed(4),
        isSpeaking: Boolean(!dlgState.isListening && (pro.is_speaking || lip.is_speech)),
        viseme: dlgState.isListening ? "rest" : (lip.viseme || "rest"),
        tonePreset: curTone.preset,
        emotion: expr.name || "neutral",
        emotionIntensity: +(expr.intensity ?? dyn.emotionIntensity ?? 1).toFixed(3),
        gesture: gName || null,
        gazeX: +pupilDx.toFixed(3),
        gazeY: +pupilDy.toFixed(3),
        crestOverlap: +(sp.crestOverlap || 0).toFixed(3),
        featherJiggle: +(sp.featherJiggle || 0).toFixed(3),
        wingFollow: +(sp.wingFollow || 0).toFixed(3),
        bodyScaleX: +squashX.toFixed(5),
        bodyScaleY: +squashY.toFixed(5),
        volumeProduct: +(squashX * squashY).toFixed(5),
        dampingRatio: +computeDampingRatio(dyn.spring).toFixed(3),
        lighting: (puppet.scene && puppet.scene.lighting) || "studio",
        accent: acc,
        fps: currentFps,
        debugEnabled: Boolean(debugCfg.enabled),
        puppetVersion: 2,
        liveMode,
      };
      // Phase 6 Item 19: Deterministic Debug Overlay HUD & 18 Pivot Crosshairs
      updateDebugOverlay(t, lastState);
    }

    // Phase 5 Item 18: Deterministic Bounded Frame Cache & 60fps support
    let currentFps = Math.max(12, Math.min(120, Number((puppet.performance && puppet.performance.fps) || fps || 30)));
    let frameCacheEnabled = !puppet.performance || puppet.performance.frameCache !== false;
    let configVersion = 1;
    let lastRenderedKey = null;
    const FRAME_CACHE_MAX = 480;
    const frameCache = new Map();
    const cacheStats = { hits: 0, misses: 0, skippedDom: 0 };

    // Phase 6 Item 19: Debug Overlay DOM HUD (springs, viseme, prosody graphs, pivot points)
    let debugCfg = {
      enabled: Boolean(puppet.debug && puppet.debug.enabled),
      showPivots: !puppet.debug || puppet.debug.showPivots !== false,
      showGraphs: !puppet.debug || puppet.debug.showGraphs !== false,
    };
    const debugHudEl = document.createElement("div");
    debugHudEl.className = "mascot-debug-hud";
    Object.assign(debugHudEl.style, {
      position: "absolute",
      left: "8px",
      top: "8px",
      width: "228px",
      padding: "8px 10px",
      borderRadius: "10px",
      background: "rgba(9, 13, 24, 0.88)",
      border: "1px solid rgba(34, 211, 238, 0.55)",
      color: "#E2E8F0",
      fontFamily: "monospace",
      fontSize: "11px",
      lineHeight: "1.45",
      direction: "ltr",
      textAlign: "left",
      pointerEvents: "none",
      zIndex: "60",
      display: "none",
    });
    container.appendChild(debugHudEl);

    function syncDebugVisibility() {
      const on = Boolean(debugCfg.enabled);
      if (rig.debugPivotsG) {
        const pivOn = on && debugCfg.showPivots !== false;
        rig.debugPivotsG.setAttribute("opacity", pivOn ? "1" : "0");
        rig.debugPivotsG.setAttribute("display", pivOn ? "inline" : "none");
      }
      debugHudEl.style.display = (on && debugCfg.showGraphs !== false) ? "block" : "none";
      debugHudEl.setAttribute("data-debug-active", on ? "1" : "0");
    }

    function buildSparklinePoints(field, tCenter) {
      const pts = [];
      const count = 18;
      for (let i = 0; i < count; i += 1) {
        const dt = ((i / (count - 1)) - 0.5) * 1.8;
        const p = sampleProsodyAt(prosody, Math.max(0, tCenter + dt));
        let val = 0;
        if (field === "pitch") val = clamp((Number(p.pitch_norm) || 0) * 0.5 + 0.5, 0, 1);
        else if (field === "emphasis") val = clamp(Number(p.emphasis) || 0, 0, 1);
        else val = clamp(Number(p.loudness) || 0, 0, 1);
        const x = (i / (count - 1)) * 196;
        const y = 26 - val * 22;
        pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      }
      return pts.join(" ");
    }

    function updateDebugOverlay(t, st) {
      syncDebugVisibility();
      if (!debugCfg.enabled || debugCfg.showGraphs === false) return;
      const loudPts = buildSparklinePoints("loudness", t);
      const pitchPts = buildSparklinePoints("pitch", t);
      const emphPts = buildSparklinePoints("emphasis", t);
      debugHudEl.innerHTML =
        `<div style="display:flex;justify-content:space-between;color:#22D3EE;font-weight:700;margin-bottom:4px">` +
          `<span>DEBUG · ${st.viseme}</span><span>${currentFps}fps · ζ=${st.dampingRatio}</span>` +
        `</div>` +
        `<div>t=${st.t}s | emo=${st.emotion} | gest=${st.gesture || "-"}</div>` +
        `<div>mouth=${st.mouthOpen} | brow=${st.browY} | tilt=${st.headTilt}°</div>` +
        `<div>nod=${st.headNodY} | chest=${st.chestBounceY} | wing=${st.wingAngle}°</div>` +
        `<div>loud=${st.loudness} | f0=${st.f0Hz}Hz | pivots=18 | cache=${frameCacheEnabled ? "ON" : "OFF"}</div>` +
        `<svg viewBox="0 0 200 30" width="204" height="30" style="display:block;margin-top:4px;background:rgba(15,23,42,0.85);border-radius:4px">` +
          `<polyline fill="none" stroke="#38BDF8" stroke-width="1.6" points="${loudPts}"/>` +
          `<polyline fill="none" stroke="#FBBF24" stroke-width="1.4" points="${pitchPts}"/>` +
          `<polyline fill="none" stroke="#F43F5E" stroke-width="1.3" points="${emphPts}"/>` +
          `<line x1="98" y1="0" x2="98" y2="30" stroke="rgba(255,255,255,0.45)" stroke-dasharray="2,2"/>` +
        `</svg>`;
    }

    function setDebugOverlay(opts) {
      if (typeof opts === "boolean") {
        debugCfg.enabled = opts;
      } else if (opts && typeof opts === "object") {
        if (opts.enabled !== undefined) debugCfg.enabled = Boolean(opts.enabled);
        if (opts.showPivots !== undefined) debugCfg.showPivots = Boolean(opts.showPivots);
        if (opts.showGraphs !== undefined) debugCfg.showGraphs = Boolean(opts.showGraphs);
      }
      lastRenderedKey = null;
      updateDebugOverlay(lastState.t || 0, lastState);
      return Object.assign({}, debugCfg);
    }

    function clearFrameCache() {
      frameCache.clear();
      lastRenderedKey = null;
    }

    function getCacheStats() {
      return {
        enabled: frameCacheEnabled,
        fps: currentFps,
        size: frameCache.size,
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        skippedDom: cacheStats.skippedDom,
        version: configVersion,
      };
    }

    function setFps(nextFps) {
      const clamped = Math.max(12, Math.min(120, Math.round(Number(nextFps) || 30)));
      if (clamped !== currentFps) {
        currentFps = clamped;
        configVersion += 1;
        clearFrameCache();
        bakedSprings = bakeDeterministicSprings(track, prosody, puppet, exprCues, gazeCues, side, duration, currentFps, seed);
      }
      return currentFps;
    }

    /* 100% deterministic random-access frame evaluation at time t (seconds) with optional frame cache */
    function seek(tSec) {
      liveMode = false;
      const t = Math.max(0, Number(tSec) || 0);
      const qFrame = Math.round(t * currentFps);
      const cacheKey = `${configVersion}:${qFrame}`;

      if (frameCacheEnabled && lastRenderedKey === cacheKey && Math.abs(t - (lastState.t || 0)) < 1e-4) {
        cacheStats.hits += 1;
        cacheStats.skippedDom += 1;
        return lastState;
      }

      let pack = frameCacheEnabled ? frameCache.get(cacheKey) : null;
      if (pack && Math.abs(pack.t - t) < (0.5 / currentFps)) {
        cacheStats.hits += 1;
      } else {
        cacheStats.misses += 1;
        const dyn = evaluateToneAt(puppet, t);
        const lip = sampleTrackAt(track, t);
        const pro = sampleProsodyAt(prosody, t);
        const dlg = evaluateDialogueAt(dialogue, speakerId, t);
        let expr = evaluateExpressionAt(exprCues, t, dyn.emotionIntensity, puppet.autoEmotion ? pro : null, puppet);
        if (dlg.isListening && dlg.exprName && getEmotionSpec(dlg.exprName, puppet) && dlg.exprWeight > 0) {
          const reactSpec = getEmotionSpec(dlg.exprName, puppet);
          const w = dlg.exprWeight;
          expr = Object.assign({}, expr, {
            name: dlg.exprName,
            browLRot: lerp(expr.browLRot, reactSpec.browLRot, w),
            browRRot: lerp(expr.browRRot, reactSpec.browRRot, w),
            browLY: lerp(expr.browLY, reactSpec.browLY, w),
            browRY: lerp(expr.browRY, reactSpec.browRY, w),
            beakSmile: lerp(expr.beakSmile, reactSpec.beakSmile, w),
            upperLid: lerp(expr.upperLid, reactSpec.upperLid, w),
          });
        }
        const gest = evaluateGestureAt(gestureCues, t);
        const sp = sampleBakedSpring(bakedSprings, currentFps, t);
        const blink = evaluateBlinkAt(blinks, t);
        pack = { t, expr, gest, dyn, lip, pro, sp, blink };
        if (frameCacheEnabled) {
          if (frameCache.size >= FRAME_CACHE_MAX) {
            const firstKey = frameCache.keys().next().value;
            if (firstKey !== undefined) frameCache.delete(firstKey);
          }
          frameCache.set(cacheKey, pack);
        }
      }

      renderPose(t, pack.expr, pack.gest, pack.dyn, pack.lip, pack.pro, pack.sp, pack.blink);
      lastRenderedKey = cacheKey;
      return lastState;
    }

    let liveEmotionOverride = null;
    let liveEmotionIntensity = null;
    let liveGestureActive = null;

    function setLiveEmotion(name, intensity) {
      const key = sanitizePluginName(name);
      if (getEmotionSpec(key, puppet)) {
        liveEmotionOverride = key;
      } else if (name === null) {
        liveEmotionOverride = null;
      }
      if (intensity !== undefined && intensity !== null && Number.isFinite(Number(intensity))) {
        liveEmotionIntensity = clamp(Number(intensity), 0, 1.5);
      }
      if (liveMode) {
        return applyLiveVoice({ loudness: lastState.loudness || 0, isSpeaking: lastState.isSpeaking, pitchNorm: lastState.pitchNorm || 0, viseme: lastState.viseme || "rest" }, 1 / 60);
      }
      return lastState;
    }

    function triggerLiveGesture(name, opts = {}) {
      const key = sanitizePluginName(name);
      const gSpec = getGestureSpec(key, puppet);
      if (!gSpec) return null;
      const dur = clamp(Number(opts.duration) || gSpec.defaultDur || 1.1, 0.25, 4.0);
      const inten = clamp(Number(opts.intensity) || 1.0, 0.1, 1.5);
      liveGestureActive = {
        t: liveTime,
        gesture: key,
        duration: dur,
        offset: 0,
        intensity: inten,
      };
      if (liveMode) {
        return applyLiveVoice({ loudness: lastState.loudness || 0, isSpeaking: lastState.isSpeaking, pitchNorm: lastState.pitchNorm || 0, viseme: lastState.viseme || "rest" }, 1 / 60);
      }
      return liveGestureActive;
    }

    /* Real-time OBS microphone puppet step (uses identical mass-spring-damper & tone mapping) */
    function applyLiveVoice(sample = {}, dtSec = 1 / 60) {
      liveMode = true;
      lastRenderedKey = null;
      const dt = clamp(Number(dtSec) || (1 / 60), 0.004, 0.08);
      liveTime += dt;
      const loudness = clamp(Number(sample.loudness ?? sample.energy ?? 0), 0, 1);
      const isSpeaking = Boolean(sample.isSpeaking ?? (loudness >= 0.05));
      const pitchNorm = clamp(Number(sample.pitchNorm ?? sample.pitch_norm ?? 0), -1, 1);
      const pitchDelta = clamp(Number(sample.pitchDelta ?? sample.pitch_delta ?? 0), -1, 1);
      const emphasis = clamp(Number(sample.emphasis ?? (loudness > 0.58 ? (loudness - 0.4) * 1.4 : 0)), 0, 1);

      if (isSpeaking) {
        livePhraseSec += dt;
        if (emphasis > 0.65 && livePhraseSec > 0.35) livePeakSign = -livePeakSign;
      } else {
        livePhraseSec = 0;
      }

      const visName = VISEMES[sample.viseme] ? sample.viseme : (isSpeaking ? (loudness > 0.62 ? "wide" : loudness > 0.32 ? "open" : "small") : "rest");
      const vSpec = VISEMES[visName] || VISEMES.rest;
      const lip = {
        viseme: visName,
        energy: loudness,
        jawOpen: isSpeaking ? vSpec.jawOpen : 0,
        upperLift: isSpeaking ? vSpec.upperLift : 0,
        widthScale: vSpec.widthScale,
        teeth: vSpec.teeth,
        tongue: isSpeaking ? vSpec.tongue : 0,
        lipTuck: vSpec.lipTuck,
        stress: emphasis,
        is_speech: isSpeaking,
      };
      const pro = {
        rms: Number(sample.rms || loudness * 0.3),
        db: Number(sample.db ?? (loudness > 0.001 ? 20 * Math.log10(loudness * 0.3) : -80)),
        loudness,
        f0_hz: Number(sample.f0Hz ?? sample.f0_hz ?? 0),
        pitch_norm: pitchNorm,
        pitch_delta: pitchDelta,
        is_speaking: isSpeaking,
        is_pause: !isSpeaking,
        emphasis,
      };

      const dyn = evaluateToneAt(puppet, liveTime % Math.max(1, duration));
      const effIntensity = liveEmotionIntensity !== null ? liveEmotionIntensity : dyn.emotionIntensity;
      const activeExprCues = liveEmotionOverride
        ? [{ t: 0, expression: liveEmotionOverride, intensity: effIntensity, blend: 0.25 }]
        : exprCues;
      const expr = evaluateExpressionAt(activeExprCues, liveTime % Math.max(1, duration), effIntensity, puppet.autoEmotion && !liveEmotionOverride ? pro : null, puppet);

      let gest = null;
      if (liveGestureActive) {
        gest = evaluateGestureAt([liveGestureActive], liveTime);
        if (!gest && liveTime > liveGestureActive.t + liveGestureActive.duration) {
          liveGestureActive = null;
        }
      }
      if (!gest) {
        gest = evaluateGestureAt(gestureCues, liveTime % Math.max(1, duration));
      }

      const gazeName = evaluateGazeTargetAt(gazeCues, liveTime % Math.max(1, duration));
      const gazeTarget = resolveLookAtOffset(gazeName, expr.name, side);

      const inLongEmphasis = isSpeaking && livePhraseSec >= 0.85 && loudness > 0.3;
      const targets = computeToneTargets(lip, pro, dyn.tone, puppet.limits, inLongEmphasis, livePeakSign);
      const sp = stepSpringBank(liveSprings, targets, dyn.spring, puppet.limits, dt, gazeTarget, puppet.secondary, puppet.gaze ? puppet.gaze.smoothPursuit : 10);
      const blink = evaluateBlinkAt(blinks, liveTime % Math.max(8, duration));
      renderPose(liveTime, expr, gest, dyn, lip, pro, sp, blink);
      return lastState;
    }

    function rebakeAll() {
      configVersion += 1;
      clearFrameCache();
      hydrateDeclarativePlugins(puppet);
      tone = puppet.tone;
      if (puppet.performance) {
        if (Number(puppet.performance.fps) >= 50) currentFps = 60;
        else if (Number(puppet.performance.fps) >= 12) currentFps = Math.round(Number(puppet.performance.fps));
        frameCacheEnabled = puppet.performance.frameCache !== false;
      }
      if (puppet.debug) {
        debugCfg = {
          enabled: Boolean(puppet.debug.enabled),
          showPivots: puppet.debug.showPivots !== false,
          showGraphs: puppet.debug.showGraphs !== false,
        };
      }
      exprCues = normalizeExpressionTimeline(cfg, puppet, scriptParsed);
      gestureCues = buildGestureTimeline(puppet, scriptParsed, activePeaks);
      gazeCues = buildGazeTimeline(cfg, puppet, scriptParsed);
      blinks = buildBlinkSchedule(seed, duration, activePeaks, activePhrases, activePauses, tone.blinkRate, exprCues);
      bakedSprings = bakeDeterministicSprings(track, prosody, puppet, exprCues, gazeCues, side, duration, currentFps, seed);
      applyPuppetAppearance(rig, puppet);
      if (!liveMode) seek(lastState.t || 0);
    }

    function setTone(nextTone) {
      const resolved = resolveToneConfig(nextTone);
      const nextRaw = Object.assign({}, puppet, { preset: resolved.preset, tone: resolved });
      if (nextTone && nextTone.springFreq != null && !nextTone.spring) {
        nextRaw.spring = {
          stiffness: Math.round(resolved.springFreq * resolved.springFreq),
          damping: Math.round(2 * resolved.springFreq),
          mass: puppet.spring.mass,
        };
      }
      puppet = resolvePuppetConfig(nextRaw, resolved);
      rebakeAll();
      return tone;
    }

    function setPuppetConfig(nextPuppet) {
      puppet = resolvePuppetConfig(nextPuppet, nextPuppet && nextPuppet.tone ? nextPuppet.tone : tone);
      rebakeAll();
      return puppet;
    }

    function getState() {
      return Object.assign({}, lastState);
    }

    function getPuppetConfig() {
      return JSON.parse(JSON.stringify(puppet));
    }

    seek(0);
    return {
      container,
      rig,
      debugHudEl,
      seek,
      applyLiveVoice,
      setLiveEmotion,
      triggerLiveGesture,
      setDebugOverlay,
      setFps,
      getCacheStats,
      clearFrameCache,
      setTone,
      setPuppetConfig,
      getState,
      getPuppetConfig,
      track,
      prosody,
      tone,
      puppet,
    };
  }

  window.StageMascot = {
    PALETTE: PAL,
    CHARACTERS,
    OUTFITS,
    SKINS,
    ACCESSORIES,
    LIGHTING_PRESETS,
    PUPPET_PARTS,
    VISEMES,
    EXPRESSIONS,
    GESTURES,
    TONE_LIMITS,
    registerEmotion,
    unregisterEmotion,
    listEmotions,
    registerGesture,
    unregisterGesture,
    listGestures,
    resolveToneConfig,
    resolvePuppetConfig,
    parseScriptTags,
    stepCriticalSpring,
    stepMassSpring,
    computeDampingRatio,
    evaluateToneAt,
    evaluateGestureAt,
    evaluateAccessoriesAt,
    evaluateDialogueAt,
    buildDialogueVisemeTrack,
    buildTextVisemeTrack,
    synthesizeProsodyFromVisemes,
    createMascotInstance,
    evaluateExpressionAt,
    sampleTrackAt,
    sampleProsodyAt,
    normalizeExpressionTimeline,
  };
})();
