/* Khordegir Studio — Viral YouTuber Procedural Sound Design & Foley Engine 2.0 (Zero-Dependency Web Audio)
   24 studio-grade broadcast & viral YouTube SFX (whooshes, risers, sub-booms, pops, mechanical clicks,
   typewriter, cash dings, rubber stamps, paper rustle/tear, camera shutter, glitches, notification bells,
   marker sweeps, countdowns, and musical stings). 100% offline, deterministic seeded noise (no Math.random). */
(function () {
  "use strict";

  const CATALOG = [
    // Transitions & Swooshes
    { id: "whoosh",          cat: "transition", label: "ووش سینمایی",           en: "Cinematic Whoosh",    icon: "💨", color: "amber" },
    { id: "whoosh-whip",     cat: "transition", label: "ویپ‌پن سریع یوتیوبی",    en: "Whip Pan Swoosh",     icon: "⚡", color: "cyan" },
    { id: "whoosh-silk",     cat: "transition", label: "ووش ابریشمی نرم",        en: "Silk Air Whoosh",     icon: "🌬", color: "cyan" },
    { id: "swoosh-reverse",  cat: "transition", label: "مکش معکوس (Reverse)",    en: "Reverse Suction",     icon: "🌀", color: "amber" },
    { id: "riser-cinematic", cat: "transition", label: "رایزر تنش سینمایی",       en: "Cinematic Riser",     icon: "📈", color: "red" },
    { id: "sweep",           cat: "transition", label: "گذر نرم استودیو",        en: "Studio Sweep",        icon: "🌊", color: "cyan" },
    // Impacts & Documentary Foley
    { id: "boom",            cat: "impact",     label: "بوم بیس سینمایی",        en: "Sub Bass Boom",       icon: "💥", color: "red" },
    { id: "stamp-thud",      cat: "impact",     label: "مهر سنگین راستی‌آزمایی",  en: "Rubber Stamp Thud",   icon: "📛", color: "red" },
    { id: "paper-slide",     cat: "foley",      label: "کشیدن کاغذ مستند",       en: "Paper Slide",         icon: "📄", color: "amber" },
    { id: "paper-tear",      cat: "foley",      label: "پاره‌شدن کاغذ خبری",     en: "Paper Tear",          icon: "📰", color: "amber" },
    { id: "shutter",         cat: "foley",      label: "شاتر دوربین و فلاش",     en: "Camera Shutter",      icon: "📷", color: "cyan" },
    { id: "swish",           cat: "foley",      label: "ماژیک هایلایت",          en: "Highlighter Marker",  icon: "🖍", color: "amber" },
    // Viral UI, Text & Notifications
    { id: "pop",             cat: "ui",         label: "پاپ وایرال (Viral Pop)", en: "Viral UI Pop",        icon: "🫧", color: "cyan" },
    { id: "card",            cat: "ui",         label: "فرود کارت چوبی",         en: "Tactile Card Snap",   icon: "🃏", color: "amber" },
    { id: "bubble",          cat: "ui",         label: "حباب پیام‌رسان",         en: "Chat Bubble Pop",     icon: "💬", color: "green" },
    { id: "click-mech",      cat: "ui",         label: "کلیک مکانیکی کیبورد",    en: "Mechanical Click",    icon: "⌨️", color: "cyan" },
    { id: "typewriter-key",  cat: "ui",         label: "تایپ‌رایتر تحریریه",     en: "Typewriter Key",      icon: "🖋", color: "amber" },
    { id: "bell-notify",     cat: "ui",         label: "زنگ نوتیفیکیشن یوتیوب",  en: "Subscribe Bell",      icon: "🔔", color: "amber" },
    // Data, Quiz & Musical Stings
    { id: "ding",            cat: "sting",      label: "زنگ تأکید بلورین",       en: "Crystal Ding",        icon: "✨", color: "green" },
    { id: "cash-ding",       cat: "sting",      label: "صدای پول و رشد آمار",    en: "Cash / KPI Chime",    icon: "💰", color: "green" },
    { id: "countdown-beep",  cat: "sting",      label: "بیپ شمارش معکوس",        en: "Countdown Beep",      icon: "⏱", color: "cyan" },
    { id: "success-chord",   cat: "sting",      label: "آکورد موفقیت و جواب",    en: "Success Chord",       icon: "🏆", color: "green" },
    { id: "glitch-zap",      cat: "fx",         label: "گلیچ دیجیتال سریع",      en: "Digital Glitch Zap",  icon: "📺", color: "red" },
    { id: "alert",           cat: "fx",         label: "هشدار خبر فوری",         en: "Breaking Alert",      icon: "🚨", color: "red" },
    { id: "vinyl-stop",      cat: "fx",         label: "توقف صفحه (Record Stop)",en: "Vinyl Record Stop",   icon: "💿", color: "red" },
    { id: "rimshot",         cat: "fx",         label: "ضرب طنز (Rimshot)",      en: "Comedy Rimshot",      icon: "🥁", color: "amber" },
  ];

  // Auto-matched SFX map for all 40 transitions
  const TRANSITION_SFX_MAP = {
    "soft-fade": "whoosh-silk",
    "curtain-rtl": "whoosh",
    "curtain-ltr": "whoosh",
    "editorial-push": "whoosh-silk",
    "split-curtain": "whoosh",
    "cinema-bars": "boom",
    "push-left": "whoosh-whip",
    "push-right": "whoosh-whip",
    "push-up": "whoosh-whip",
    "push-down": "whoosh-whip",
    "slide-over-rtl": "paper-slide",
    "slide-over-up": "paper-slide",
    "zoom-iris": "whoosh-silk",
    "zoom-through-in": "swoosh-reverse",
    "zoom-through-out": "whoosh-whip",
    "iris-rise": "sweep",
    "diagonal-wipe": "whoosh-whip",
    "accent-slash": "whoosh-whip",
    "shutter-bars": "shutter",
    "venetian-blinds": "paper-slide",
    "clock-wipe": "sweep",
    "diamond-iris": "ding",
    "whip-pan-rtl": "whoosh-whip",
    "whip-pan-ltr": "whoosh-whip",
    "whip-pan-up": "whoosh-whip",
    "ink-splash": "swish",
    "paper-tear": "paper-tear",
    "glitch-lite": "glitch-zap",
    "light-leak": "riser-cinematic",
    "film-flash": "shutter",
    "rgb-split": "glitch-zap",
    "page-turn": "paper-slide",
    "film-burn": "riser-cinematic",
    "camera-flash": "shutter",
    "paper-crumple": "paper-tear",
    "crt-power": "glitch-zap",
    "split-diagonal-slash": "whoosh-whip",
    "zoom-blur-whip": "whoosh-whip",
    "ribbon-sweep": "sweep",
    "type-cut": "click-mech",
  };

  let ctx = null;
  let noiseBuf = null;
  let crispNoiseBuf = null;
  let muted = false;
  let masterVol = 0.74;

  function ensureCtx() {
    if (typeof window === "undefined") return null;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  }

  // Deterministic xorshift32 noise generator (zero Math.random!)
  function getNoiseBuffer(ac, crisp = false) {
    if (!crisp && noiseBuf && noiseBuf.sampleRate === ac.sampleRate) return noiseBuf;
    if (crisp && crispNoiseBuf && crispNoiseBuf.sampleRate === ac.sampleRate) return crispNoiseBuf;
    const len = Math.floor(ac.sampleRate * 1.1);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    let seed = crisp ? 0x9E3779B9 : 0x6D2B79F5;
    let last = 0;
    for (let i = 0; i < len; i += 1) {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      const white = ((seed >>> 0) / 2147483648.0) - 1.0;
      if (crisp) {
        data[i] = white * 0.85;
      } else {
        last = last * 0.72 + white * 0.28;
        data[i] = last * 1.35;
      }
    }
    if (crisp) crispNoiseBuf = buf;
    else noiseBuf = buf;
    return buf;
  }

  function playNoiseSweep(ac, gain, { dur = 0.28, f0 = 240, f1 = 1800, f2 = null, q = 1.8, filterType = "bandpass", crisp = false, delay = 0, peakAt = 0.34, sub = false }) {
    const now = ac.currentTime + delay;
    const src = ac.createBufferSource();
    src.buffer = getNoiseBuffer(ac, crisp);
    const filter = ac.createBiquadFilter();
    filter.type = filterType;
    filter.Q.setValueAtTime(q, now);
    filter.frequency.setValueAtTime(Math.max(40, f0), now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, f1), now + dur * peakAt);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, f2 != null ? f2 : f0 * 0.7), now + dur);

    const env = ac.createGain();
    env.gain.setValueAtTime(0.0008, now);
    env.gain.linearRampToValueAtTime(0.62 * gain, now + dur * peakAt);
    env.gain.exponentialRampToValueAtTime(0.0008, now + dur);

    src.connect(filter);
    filter.connect(env);
    env.connect(ac.destination);
    src.start(now);
    src.stop(now + dur + 0.03);

    if (sub) {
      const osc = ac.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(102, now);
      osc.frequency.exponentialRampToValueAtTime(34, now + dur);
      const sg = ac.createGain();
      sg.gain.setValueAtTime(0.0008, now);
      sg.gain.linearRampToValueAtTime(0.46 * gain, now + Math.min(0.04, dur * 0.2));
      sg.gain.exponentialRampToValueAtTime(0.0008, now + dur);
      osc.connect(sg);
      sg.connect(ac.destination);
      osc.start(now);
      osc.stop(now + dur + 0.03);
    }
  }

  function playTone(ac, gain, { freq = 520, endFreq = 880, dur = 0.14, type = "sine", delay = 0, attack = 0.01, harmonics = false, detune = 0 }) {
    const now = ac.currentTime + delay;
    const osc = ac.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), now);
    if (detune) osc.detune.setValueAtTime(detune, now);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + dur);
    }
    const env = ac.createGain();
    env.gain.setValueAtTime(0.0008, now);
    env.gain.linearRampToValueAtTime(0.48 * gain, now + Math.min(attack, dur * 0.35));
    env.gain.exponentialRampToValueAtTime(0.0008, now + dur);

    osc.connect(env);
    env.connect(ac.destination);
    osc.start(now);
    osc.stop(now + dur + 0.025);

    if (harmonics) {
      const hOsc = ac.createOscillator();
      hOsc.type = "sine";
      hOsc.frequency.setValueAtTime(Math.max(40, freq * 2.005), now);
      if (endFreq !== freq) hOsc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq * 2.005), now + dur);
      const hEnv = ac.createGain();
      hEnv.gain.setValueAtTime(0.0008, now);
      hEnv.gain.linearRampToValueAtTime(0.2 * gain, now + 0.01);
      hEnv.gain.exponentialRampToValueAtTime(0.0008, now + dur * 0.85);
      hOsc.connect(hEnv);
      hEnv.connect(ac.destination);
      hOsc.start(now);
      hOsc.stop(now + dur + 0.025);
    }
  }

  const SCALE_STEPS = [1.0, 1.125, 1.25, 1.5, 1.68, 1.875, 2.0];

  function play(type, volume = null, opts = {}) {
    if (muted) return false;
    const ac = ensureCtx();
    if (!ac) return false;
    const vol = Math.max(0, Math.min(1, volume == null ? masterVol : Number(volume))) * masterVol;
    if (vol <= 0.004) return false;

    const kind = String(type || "pop").toLowerCase();
    const idx = Number.isFinite(+opts.index) ? Math.max(0, +opts.index) : 0;
    const pitchMod = Number.isFinite(+opts.pitch) ? +opts.pitch : SCALE_STEPS[idx % SCALE_STEPS.length];

    try {
      if (kind === "whoosh" || kind === "logo") {
        playNoiseSweep(ac, vol, { dur: 0.30, f0: 200, f1: 2100, f2: 180, q: 1.7, sub: true });
      } else if (kind === "whoosh-whip") {
        // Fast punchy viral YouTuber whip-pan swoosh
        playNoiseSweep(ac, vol * 0.95, { dur: 0.19, f0: 320, f1: 4200, f2: 260, q: 2.2, crisp: true, peakAt: 0.42, sub: true });
        playTone(ac, vol * 0.32, { freq: 240, endFreq: 90, dur: 0.14, type: "sine" });
      } else if (kind === "whoosh-silk" || kind === "whoosh-subtle") {
        playNoiseSweep(ac, vol * 0.72, { dur: 0.26, f0: 380, f1: 1650, f2: 280, q: 1.3, peakAt: 0.4 });
      } else if (kind === "swoosh-reverse") {
        // Classic YouTuber reverse suction swell into a cut
        playNoiseSweep(ac, vol * 0.9, { dur: 0.36, f0: 180, f1: 3600, f2: 4600, q: 2.6, peakAt: 0.88 });
        playTone(ac, vol * 0.42, { freq: 140, endFreq: 560, dur: 0.34, type: "sine", attack: 0.26 });
      } else if (kind === "riser-cinematic") {
        // MagnatesMedia / Vox cinematic tension riser
        playNoiseSweep(ac, vol * 0.82, { dur: 0.56, f0: 140, f1: 3400, f2: 4200, q: 2.1, peakAt: 0.86 });
        playTone(ac, vol * 0.55, { freq: 65, endFreq: 210, dur: 0.54, type: "sawtooth", attack: 0.42 });
        playTone(ac, vol * 0.35, { freq: 330, endFreq: 660, dur: 0.52, type: "sine", attack: 0.4, harmonics: true });
      } else if (kind === "boom") {
        // Deep trailer sub-impact with transient punch
        playTone(ac, vol * 1.0, { freq: 128, endFreq: 28, dur: 0.72, type: "sine", attack: 0.006 });
        playTone(ac, vol * 0.5, { freq: 260, endFreq: 54, dur: 0.18, type: "triangle", attack: 0.004 });
        playNoiseSweep(ac, vol * 0.72, { dur: 0.42, f0: 110, f1: 620, f2: 90, q: 1.4, peakAt: 0.14 });
      } else if (kind === "stamp-thud") {
        // Heavy documentary rubber fact-check stamp thud
        playTone(ac, vol * 0.95, { freq: 190, endFreq: 42, dur: 0.18, type: "triangle", attack: 0.004 });
        playTone(ac, vol * 0.85, { freq: 95, endFreq: 34, dur: 0.26, type: "sine", attack: 0.005 });
        playNoiseSweep(ac, vol * 0.7, { dur: 0.09, f0: 900, f1: 2200, f2: 320, q: 1.5, crisp: true, peakAt: 0.18 });
      } else if (kind === "paper-slide") {
        // Documentary archival paper glide
        playNoiseSweep(ac, vol * 0.75, { dur: 0.24, f0: 1400, f1: 3600, f2: 900, q: 1.9, crisp: true, peakAt: 0.35 });
      } else if (kind === "paper-tear") {
        // Layered crisp paper rip
        playNoiseSweep(ac, vol * 0.82, { dur: 0.14, f0: 2100, f1: 4800, f2: 1400, q: 2.2, crisp: true, peakAt: 0.3 });
        playNoiseSweep(ac, vol * 0.72, { dur: 0.18, f0: 1600, f1: 4200, f2: 950, q: 2.0, crisp: true, delay: 0.07, peakAt: 0.35 });
      } else if (kind === "shutter") {
        // Crisp DSLR mechanical double-curtain shutter
        playTone(ac, vol * 0.52, { freq: 1850, endFreq: 760, dur: 0.032, type: "triangle", attack: 0.003 });
        playNoiseSweep(ac, vol * 0.65, { dur: 0.07, f0: 1800, f1: 5200, f2: 1200, q: 1.6, crisp: true, peakAt: 0.2 });
        playTone(ac, vol * 0.42, { freq: 1450, endFreq: 680, dur: 0.035, type: "triangle", delay: 0.055, attack: 0.003 });
      } else if (kind === "swish" || kind === "draw" || kind === "strike") {
        // Felt-tip highlighter / pen sweep across paper
        playNoiseSweep(ac, vol * 0.72, { dur: 0.25, f0: 850, f1: 3200, f2: 1100, q: 2.4, crisp: true, peakAt: 0.45 });
      } else if (kind === "card") {
        const baseF = 340 * pitchMod;
        playTone(ac, vol * 0.68, { freq: baseF, endFreq: baseF * 0.56, dur: 0.085, type: "sine", attack: 0.006 });
        playTone(ac, vol * 0.38, { freq: baseF * 2.2, endFreq: baseF * 1.4, dur: 0.048, type: "triangle", attack: 0.004 });
      } else if (kind === "pop" || kind === "bar") {
        // Crisp viral UI mouth/bubble pop (Ali Abdaal / MrBeast style)
        const baseF = (kind === "bar" ? 370 : 410) * pitchMod;
        playTone(ac, vol * 0.78, { freq: baseF, endFreq: baseF * 1.85, dur: 0.075, type: "sine", attack: 0.005 });
        playTone(ac, vol * 0.32, { freq: baseF * 2.4, endFreq: baseF * 1.3, dur: 0.045, type: "triangle", attack: 0.004 });
      } else if (kind === "bubble") {
        const isOut = idx % 2 === 1;
        const baseF = (isOut ? 540 : 420) * (0.95 + idx * 0.07);
        playTone(ac, vol * 0.78, { freq: baseF, endFreq: baseF * 1.8, dur: 0.09, type: "sine", attack: 0.005 });
      } else if (kind === "click-mech" || kind === "tick" || kind === "soft" || kind === "click") {
        playTone(ac, vol * 0.52, { freq: 1450 * pitchMod, endFreq: 540, dur: 0.028, type: "triangle", attack: 0.002 });
        playNoiseSweep(ac, vol * 0.38, { dur: 0.022, f0: 2600, f1: 4200, f2: 1800, q: 2.0, crisp: true, peakAt: 0.25 });
      } else if (kind === "typewriter-key") {
        playTone(ac, vol * 0.55, { freq: 2100 * (0.9 + (idx % 4) * 0.07), endFreq: 720, dur: 0.026, type: "square", attack: 0.002 });
        playNoiseSweep(ac, vol * 0.45, { dur: 0.028, f0: 2400, f1: 5400, f2: 1600, q: 2.5, crisp: true, peakAt: 0.2 });
      } else if (kind === "bell-notify") {
        // Bright YouTube subscribe notification bell
        playTone(ac, vol * 0.65, { freq: 1318.5, endFreq: 1318.5, dur: 0.38, type: "sine", harmonics: true });
        playTone(ac, vol * 0.62, { freq: 1760.0, endFreq: 1760.0, dur: 0.48, type: "sine", delay: 0.085, harmonics: true });
      } else if (kind === "count-start") {
        playTone(ac, vol * 0.42, { freq: 720 * pitchMod, endFreq: 520, dur: 0.045, type: "triangle" });
      } else if (kind === "count-end" || kind === "ding") {
        const f = 1046.5 * pitchMod;
        playTone(ac, vol * 0.66, { freq: f, endFreq: f, dur: 0.40, type: "sine", harmonics: true });
        playTone(ac, vol * 0.36, { freq: f * 1.5, endFreq: f * 1.5, dur: 0.30, type: "sine", delay: 0.05 });
      } else if (kind === "cash-ding") {
        // Bright metallic cash register / milestone chime
        playTone(ac, vol * 0.62, { freq: 1568, endFreq: 1568, dur: 0.26, type: "sine", harmonics: true });
        playTone(ac, vol * 0.72, { freq: 2093, endFreq: 2093, dur: 0.46, type: "sine", delay: 0.07, harmonics: true });
        playNoiseSweep(ac, vol * 0.32, { dur: 0.06, f0: 3600, f1: 6800, f2: 2800, q: 2.2, crisp: true, peakAt: 0.2 });
      } else if (kind === "countdown-beep") {
        const f = 880 * (idx >= 3 ? 1.5 : 1.0);
        playTone(ac, vol * 0.62, { freq: f, endFreq: f, dur: idx >= 3 ? 0.28 : 0.11, type: "sine", attack: 0.005 });
      } else if (kind === "success-chord") {
        // Uplifting major triad arpeggio (C5-E5-G5-C6)
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          playTone(ac, vol * (0.48 - i * 0.05), { freq: f, endFreq: f, dur: 0.42, type: "sine", delay: i * 0.055, harmonics: i === 3 });
        });
      } else if (kind === "glitch-zap") {
        // Crisp modern digital glitch stutter
        playTone(ac, vol * 0.58, { freq: 920, endFreq: 140, dur: 0.055, type: "sawtooth", attack: 0.002 });
        playNoiseSweep(ac, vol * 0.66, { dur: 0.09, f0: 1800, f1: 6200, f2: 900, q: 3.0, crisp: true, delay: 0.025, peakAt: 0.3 });
        playTone(ac, vol * 0.48, { freq: 1620, endFreq: 320, dur: 0.06, type: "square", delay: 0.065, attack: 0.002 });
      } else if (kind === "alert") {
        playTone(ac, vol * 0.62, { freq: 880, endFreq: 880, dur: 0.11, type: "triangle" });
        playTone(ac, vol * 0.62, { freq: 1174.6, endFreq: 1174.6, dur: 0.18, type: "triangle", delay: 0.10 });
      } else if (kind === "vinyl-stop") {
        // Viral comedy/plot-twist record scratch stop
        playTone(ac, vol * 0.7, { freq: 520, endFreq: 48, dur: 0.34, type: "sawtooth", attack: 0.006 });
        playNoiseSweep(ac, vol * 0.52, { dur: 0.28, f0: 2400, f1: 420, f2: 180, q: 2.2, crisp: true, peakAt: 0.22 });
      } else if (kind === "sweep") {
        playNoiseSweep(ac, vol * 0.82, { dur: 0.40, f0: 170, f1: 2300, f2: 240, q: 1.6 });
        playTone(ac, vol * 0.34, { freq: 330, endFreq: 540, dur: 0.34, type: "triangle" });
      } else if (kind === "rimshot") {
        playTone(ac, vol * 0.68, { freq: 220, endFreq: 110, dur: 0.08, type: "triangle" });
        playTone(ac, vol * 0.68, { freq: 280, endFreq: 130, dur: 0.08, type: "triangle", delay: 0.14 });
        playNoiseSweep(ac, vol * 0.72, { dur: 0.26, f0: 2200, f1: 6400, f2: 1800, q: 1.5, crisp: true, delay: 0.24, peakAt: 0.2 });
      } else {
        playTone(ac, vol * 0.52, { freq: 480 * pitchMod, endFreq: 740, dur: 0.085, type: "sine" });
      }
      return true;
    } catch {
      return false;
    }
  }

  function sfxForTransition(transitionName) {
    const key = String(transitionName || "soft-fade").trim().toLowerCase();
    return TRANSITION_SFX_MAP[key] || "whoosh";
  }

  window.StageSFX = {
    CATALOG,
    TRANSITION_SFX_MAP,
    sfxForTransition,
    play,
    resume: ensureCtx,
    setMuted(flag) { muted = Boolean(flag); },
    isMuted() { return muted; },
    setVolume(v) {
      const n = Number(v);
      if (Number.isFinite(n)) masterVol = Math.max(0, Math.min(1, n));
    },
    getVolume() { return masterVol; },
  };
})();
