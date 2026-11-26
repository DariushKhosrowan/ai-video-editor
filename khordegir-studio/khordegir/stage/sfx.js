/* Khordegir Studio — Zero-Dependency Web Audio SFX Synthesizer & Soundboard
   Generates broadcast-grade sound effects on demand for Stage.cues and live podcast soundboard pads. */
(function () {
  "use strict";

  const CATALOG = [
    { id: "whoosh", label: "ووش ورود", en: "Whoosh", icon: "💨", color: "amber" },
    { id: "pop", label: "پاپ کینتیک", en: "Pop", icon: "🫧", color: "cyan" },
    { id: "swish", label: "هایلایت متن", en: "Swish", icon: "✨", color: "amber" },
    { id: "ding", label: "زنگ تأکید", en: "Ding", icon: "🔔", color: "green" },
    { id: "boom", label: "بوم سینمایی", en: "Impact Boom", icon: "💥", color: "red" },
    { id: "alert", label: "هشدار خبر", en: "Alert Chime", icon: "⚡", color: "red" },
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
    const len = Math.floor(ac.sampleRate * 1.0);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    noiseBuf = buf;
    return buf;
  }

  function playWhoosh(ac, gain, dur = 0.28, f0 = 240, f1 = 1600) {
    const now = ac.currentTime;
    const src = ac.createBufferSource();
    src.buffer = getNoiseBuffer(ac);
    const filter = ac.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.setValueAtTime(1.6, now);
    filter.frequency.setValueAtTime(f0, now);
    filter.frequency.exponentialRampToValueAtTime(f1, now + dur * 0.55);
    filter.frequency.exponentialRampToValueAtTime(Math.max(120, f0 * 0.8), now + dur);

    const env = ac.createGain();
    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(0.55 * gain, now + dur * 0.35);
    env.gain.exponentialRampToValueAtTime(0.001, now + dur);

    src.connect(filter);
    filter.connect(env);
    env.connect(ac.destination);
    src.start(now);
    src.stop(now + dur + 0.02);
  }

  function playTone(ac, gain, { freq = 520, endFreq = 880, dur = 0.14, type = "sine", delay = 0 }) {
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
  }

  function play(type, volume = null) {
    if (muted) return false;
    const ac = ensureCtx();
    if (!ac) return false;
    const vol = Math.max(0, Math.min(1, volume == null ? masterVol : Number(volume))) * masterVol;
    if (vol <= 0.005) return false;

    const kind = String(type || "pop").toLowerCase();
    try {
      if (kind === "whoosh" || kind === "logo") {
        playWhoosh(ac, vol, 0.26, 220, 1750);
      } else if (kind === "sweep") {
        playWhoosh(ac, vol * 0.9, 0.44, 160, 2200);
        playTone(ac, vol * 0.35, { freq: 330, endFreq: 495, dur: 0.32, type: "triangle" });
      } else if (kind === "swish" || kind === "draw") {
        playWhoosh(ac, vol * 0.65, 0.18, 650, 2600);
      } else if (kind === "pop" || kind === "bar") {
        playTone(ac, vol * 0.65, { freq: 290, endFreq: 760, dur: 0.095, type: "sine" });
      } else if (kind === "soft" || kind === "click" || kind === "count-start") {
        playTone(ac, vol * 0.4, { freq: 620, endFreq: 480, dur: 0.065, type: "triangle" });
      } else if (kind === "count-end" || kind === "ding") {
        playTone(ac, vol * 0.6, { freq: 880, endFreq: 880, dur: 0.24, type: "sine" });
        playTone(ac, vol * 0.45, { freq: 1320, endFreq: 1320, dur: 0.32, type: "sine", delay: 0.07 });
      } else if (kind === "boom") {
        playTone(ac, vol * 0.95, { freq: 125, endFreq: 36, dur: 0.52, type: "sine" });
        playWhoosh(ac, vol * 0.7, 0.38, 120, 620);
      } else if (kind === "alert") {
        playTone(ac, vol * 0.55, { freq: 740, endFreq: 740, dur: 0.12, type: "triangle", delay: 0 });
        playTone(ac, vol * 0.55, { freq: 988, endFreq: 988, dur: 0.18, type: "triangle", delay: 0.12 });
      } else if (kind === "rimshot") {
        playTone(ac, vol * 0.6, { freq: 210, endFreq: 120, dur: 0.09, type: "triangle", delay: 0 });
        playTone(ac, vol * 0.6, { freq: 260, endFreq: 140, dur: 0.09, type: "triangle", delay: 0.15 });
        playWhoosh(ac, vol * 0.65, 0.22, 1800, 5400);
      } else {
        playTone(ac, vol * 0.5, { freq: 520, endFreq: 680, dur: 0.1, type: "sine" });
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
