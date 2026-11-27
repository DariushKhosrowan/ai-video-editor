/* Khordegir Studio — Zero-Dependency Web Audio SFX Synthesizer & Soundboard
   Generates broadcast-grade sound effects on demand for Stage.cues and live podcast soundboard pads. */
(function () {
  "use strict";

  const CATALOG = [
    { id: "whoosh", label: "ووش سینمایی", en: "Whoosh", icon: "💨", color: "amber" },
    { id: "pop", label: "پاپ کینتیک", en: "Pop", icon: "🫧", color: "cyan" },
    { id: "card", label: "فرود کارت / آیتم", en: "Card Tap", icon: "🃏", color: "amber" },
    { id: "bubble", label: "حباب پیام‌رسان", en: "Bubble", icon: "💬", color: "green" },
    { id: "swish", label: "هایلایت ماژیکی", en: "Marker Swish", icon: "✨", color: "amber" },
    { id: "tick", label: "تیک مکانیکی", en: "Tick", icon: "⏱", color: "cyan" },
    { id: "ding", label: "زنگ تأکید بلورین", en: "Crystal Ding", icon: "🔔", color: "green" },
    { id: "shutter", label: "شاتر و زوم لنز", en: "Camera Snap", icon: "📷", color: "cyan" },
    { id: "boom", label: "بوم سینمایی سنگین", en: "Sub Boom", icon: "💥", color: "red" },
    { id: "alert", label: "هشدار و نکته", en: "Alert", icon: "⚡", color: "red" },
    { id: "sweep", label: "ترنزیشن نرم", en: "Sweep", icon: "🌊", color: "cyan" },
    { id: "rimshot", label: "ضرب طنز", en: "Rimshot", icon: "🥁", color: "amber" },
  ];

  let ctx = null;
  let noiseBuf = null;
  let muted = false;
  let masterVol = 0.72;

  function ensureCtx() {
    if (typeof window === "undefined") return null;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) {
      ctx = new AC();
    }
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function getNoiseBuffer(ac) {
    if (noiseBuf && noiseBuf.sampleRate === ac.sampleRate) return noiseBuf;
    const len = Math.floor(ac.sampleRate * 0.8);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i += 1) {
      const white = Math.random() * 2 - 1;
      // Pink-ish filtered noise (warmer, less harsh than pure white noise)
      last = last * 0.7 + white * 0.3;
      data[i] = last;
    }
    noiseBuf = buf;
    return buf;
  }

  function playWhoosh(ac, gain, dur = 0.28, f0 = 240, f1 = 1800, sub = false) {
    const now = ac.currentTime;
    const src = ac.createBufferSource();
    src.buffer = getNoiseBuffer(ac);
    const filter = ac.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.setValueAtTime(1.8, now);
    filter.frequency.setValueAtTime(f0, now);
    filter.frequency.exponentialRampToValueAtTime(f1, now + dur * 0.5);
    filter.frequency.exponentialRampToValueAtTime(Math.max(100, f0 * 0.7), now + dur);

    const env = ac.createGain();
    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(0.55 * gain, now + dur * 0.32);
    env.gain.exponentialRampToValueAtTime(0.001, now + dur);

    src.connect(filter);
    filter.connect(env);
    env.connect(ac.destination);
    src.start(now);
    src.stop(now + dur + 0.02);

    if (sub) {
      const osc = ac.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(95, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + dur);
      const subGain = ac.createGain();
      subGain.gain.setValueAtTime(0.001, now);
      subGain.gain.linearRampToValueAtTime(0.4 * gain, now + 0.03);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(subGain);
      subGain.connect(ac.destination);
      osc.start(now);
      osc.stop(now + dur + 0.02);
    }
  }

  function playTone(ac, gain, { freq = 520, endFreq = 880, dur = 0.14, type = "sine", delay = 0, harmonics = false }) {
    const now = ac.currentTime + delay;
    const osc = ac.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + dur);
    }
    const env = ac.createGain();
    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(0.45 * gain, now + 0.012);
    env.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(env);
    env.connect(ac.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);

    if (harmonics) {
      const hOsc = ac.createOscillator();
      hOsc.type = "sine";
      hOsc.frequency.setValueAtTime(freq * 2.01, now);
      if (endFreq !== freq) hOsc.frequency.exponentialRampToValueAtTime(endFreq * 2.01, now + dur);
      const hEnv = ac.createGain();
      hEnv.gain.setValueAtTime(0.001, now);
      hEnv.gain.linearRampToValueAtTime(0.18 * gain, now + 0.01);
      hEnv.gain.exponentialRampToValueAtTime(0.001, now + dur * 0.85);
      hOsc.connect(hEnv);
      hEnv.connect(ac.destination);
      hOsc.start(now);
      hOsc.stop(now + dur + 0.02);
    }
  }

  // Musical pentatonic intervals for staggered items: C (1.0), D (1.125), E (1.25), G (1.5), A (1.68)
  const SCALE_STEPS = [1.0, 1.125, 1.25, 1.5, 1.68, 1.875, 2.0];

  function play(type, volume = null, opts = {}) {
    if (muted) return false;
    const ac = ensureCtx();
    if (!ac) return false;
    const vol = Math.max(0, Math.min(1, volume == null ? masterVol : Number(volume))) * masterVol;
    if (vol <= 0.005) return false;

    const kind = String(type || "pop").toLowerCase();
    const idx = Number.isFinite(+opts.index) ? Math.max(0, +opts.index) : 0;
    const pitchMod = Number.isFinite(+opts.pitch) ? +opts.pitch : SCALE_STEPS[idx % SCALE_STEPS.length];

    try {
      if (kind === "whoosh" || kind === "logo") {
        playWhoosh(ac, vol, 0.28, 220, 1900, true);
      } else if (kind === "whoosh-subtle") {
        playWhoosh(ac, vol * 0.7, 0.22, 340, 1600, false);
      } else if (kind === "card") {
        // Tactile card pop with subtle acoustic wood snap and musical pitch step per card
        const baseF = 340 * pitchMod;
        playTone(ac, vol * 0.65, { freq: baseF, endFreq: baseF * 0.58, dur: 0.085, type: "sine" });
        playTone(ac, vol * 0.35, { freq: baseF * 2.2, endFreq: baseF * 1.4, dur: 0.05, type: "triangle" });
      } else if (kind === "pop" || kind === "bar") {
        const baseF = (kind === "bar" ? 360 : 380) * pitchMod;
        playTone(ac, vol * 0.7, { freq: baseF, endFreq: baseF * 1.55, dur: 0.08, type: "sine" });
        playTone(ac, vol * 0.3, { freq: baseF * 2.1, endFreq: baseF * 1.2, dur: 0.05, type: "triangle" });
      } else if (kind === "bubble") {
        // Playful bubble pop with wet pitch rise
        const isOut = idx % 2 === 1;
        const baseF = (isOut ? 520 : 410) * (0.95 + (idx * 0.08));
        playTone(ac, vol * 0.75, { freq: baseF, endFreq: baseF * 1.75, dur: 0.09, type: "sine" });
      } else if (kind === "tick" || kind === "soft" || kind === "click") {
        // Crisp mechanical click
        playTone(ac, vol * 0.45, { freq: 1150 * pitchMod, endFreq: 650, dur: 0.035, type: "triangle" });
      } else if (kind === "swish" || kind === "draw") {
        // Marker pen highlighter sweep
        playWhoosh(ac, vol * 0.68, 0.24, 700, 2900, false);
      } else if (kind === "shutter") {
        // Camera snap / optical zoom
        playTone(ac, vol * 0.45, { freq: 1600, endFreq: 950, dur: 0.04, type: "triangle" });
        playWhoosh(ac, vol * 0.55, 0.16, 450, 1800, false);
      } else if (kind === "count-start") {
        playTone(ac, vol * 0.4, { freq: 720 * pitchMod, endFreq: 520, dur: 0.045, type: "triangle" });
      } else if (kind === "count-end" || kind === "ding") {
        // Crystalline harmonic bell
        const f = 1046 * pitchMod;
        playTone(ac, vol * 0.65, { freq: f, endFreq: f, dur: 0.38, type: "sine", harmonics: true });
        playTone(ac, vol * 0.35, { freq: f * 1.5, endFreq: f * 1.5, dur: 0.28, type: "sine", delay: 0.05 });
      } else if (kind === "boom") {
        playTone(ac, vol * 0.95, { freq: 110, endFreq: 32, dur: 0.65, type: "sine" });
        playWhoosh(ac, vol * 0.75, 0.45, 120, 680, true);
      } else if (kind === "alert") {
        playTone(ac, vol * 0.6, { freq: 880, endFreq: 880, dur: 0.11, type: "triangle" });
        playTone(ac, vol * 0.6, { freq: 1174, endFreq: 1174, dur: 0.18, type: "triangle", delay: 0.1 });
      } else if (kind === "sweep") {
        playWhoosh(ac, vol * 0.85, 0.42, 160, 2200, false);
        playTone(ac, vol * 0.35, { freq: 330, endFreq: 520, dur: 0.35, type: "triangle" });
      } else if (kind === "rimshot") {
        playTone(ac, vol * 0.65, { freq: 220, endFreq: 110, dur: 0.08, type: "triangle" });
        playTone(ac, vol * 0.65, { freq: 280, endFreq: 130, dur: 0.08, type: "triangle", delay: 0.14 });
        playWhoosh(ac, vol * 0.7, 0.24, 2200, 6000, false);
      } else {
        playTone(ac, vol * 0.5, { freq: 480 * pitchMod, endFreq: 720, dur: 0.085, type: "sine" });
      }
      return true;
    } catch {
      return false;
    }
  }

  window.StageSFX = {
    CATALOG,
    play,
    resume: ensureCtx,
    setMuted(flag) {
      muted = Boolean(flag);
    },
    isMuted() {
      return muted;
    },
    setVolume(v) {
      const n = Number(v);
      if (Number.isFinite(n)) masterVol = Math.max(0, Math.min(1, n));
    },
    getVolume() {
      return masterVol;
    },
  };
})();
