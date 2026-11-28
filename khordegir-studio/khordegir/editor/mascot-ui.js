/* Offline Browser Audio Lip-Sync + Prosody Analyzer & Mascot Voice-Tone Controls.
   Mirrors khordegir/mascot_lipsync.py viseme & prosody JSON schemas cleanly (100% offline, fully deterministic). */

const TOKENS = (window.StageMotionTokens) || {};
const VISEMES = TOKENS.VISEMES || {
  closed:  { jawOpen: 0.00, widthScale: 1.00 },
  rest:    { jawOpen: 0.03, widthScale: 1.00 },
  small:   { jawOpen: 0.24, widthScale: 0.96 },
  open:    { jawOpen: 0.56, widthScale: 1.02 },
  wide:    { jawOpen: 0.88, widthScale: 1.12 },
  round_o: { jawOpen: 0.52, widthScale: 0.72 },
  e_teeth: { jawOpen: 0.28, widthScale: 1.16 },
  f_v:     { jawOpen: 0.14, widthScale: 1.02 },
};

const TONE_PRESETS = TOKENS.TONE_PRESETS || {
  calm: {
    label: "آرام (Calm)",
    mouthGain: 0.85,
    browGain: 0.65,
    headGain: 0.55,
    chestGain: 0.50,
    wingGain: 0.45,
    blinkRate: 0.90,
    idleSway: 0.75,
    springFreq: 11.5,
  },
  lively: {
    label: "زنده (Lively)",
    mouthGain: 1.00,
    browGain: 1.00,
    headGain: 1.00,
    chestGain: 1.00,
    wingGain: 1.00,
    blinkRate: 1.00,
    idleSway: 1.00,
    springFreq: 14.5,
  },
  dramatic: {
    label: "نمایشی (Dramatic)",
    mouthGain: 1.25,
    browGain: 1.45,
    headGain: 1.45,
    chestGain: 1.35,
    wingGain: 1.45,
    blinkRate: 1.15,
    idleSway: 1.15,
    springFreq: 18.0,
  },
};

const resolveTone = TOKENS.resolveToneConfig || function fallbackResolveTone(raw) {
  const src = (typeof raw === "string") ? { preset: raw } : (raw && typeof raw === "object" ? raw : {});
  const key = TONE_PRESETS[src.preset] ? src.preset : "lively";
  const base = TONE_PRESETS[key];
  return Object.assign({ preset: key }, base, src, { preset: key });
};

export const EXPRESSION_OPTIONS = [
  ["neutral", "عادی / متمرکز (neutral)"],
  ["happy", "خوشحال / پرانرژی (happy)"],
  ["smug", "مغرور / مطمئن (smug)"],
  ["shocked", "شوکه / متعجب (shocked)"],
  ["annoyed", "کلافه / جدی (annoyed)"],
  ["embarrassed", "معذب / خجالت‌زده (embarrassed)"],
  ["thinking", "در حال فکر (thinking)"],
];

const GAIN_SLIDERS = [
  { key: "mouthGain",  label: "دهان (بلندی صدا)",     min: 0, max: 2,  step: 0.05, fmt: (v) => `${v.toFixed(2)}×` },
  { key: "browGain",   label: "ابرو (زیر و بمی صدا)", min: 0, max: 2,  step: 0.05, fmt: (v) => `${v.toFixed(2)}×` },
  { key: "headGain",   label: "سر و تایید روی تاکید",  min: 0, max: 2,  step: 0.05, fmt: (v) => `${v.toFixed(2)}×` },
  { key: "chestGain",  label: "جهش سینه و بدن",        min: 0, max: 2,  step: 0.05, fmt: (v) => `${v.toFixed(2)}×` },
  { key: "wingGain",   label: "ژست بال در جملات بلند", min: 0, max: 2,  step: 0.05, fmt: (v) => `${v.toFixed(2)}×` },
  { key: "blinkRate",  label: "نرخ پلک‌زدن در مکث‌ها", min: 0, max: 2,  step: 0.05, fmt: (v) => `${v.toFixed(2)}×` },
  { key: "idleSway",   label: "تنفس و نوسان در سکوت",  min: 0, max: 2,  step: 0.05, fmt: (v) => `${v.toFixed(2)}×` },
  { key: "springFreq", label: "فرکانس فنر میراشده",    min: 6, max: 28, step: 0.5,  fmt: (v) => `${v.toFixed(1)} Hz` },
];

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function fftMagRadix2(realBuf) {
  const n = realBuf.length;
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  const bits = Math.round(Math.log2(n));
  for (let i = 0; i < n; i += 1) {
    let rev = 0;
    let t = i;
    for (let b = 0; b < bits; b += 1) {
      rev = (rev << 1) | (t & 1);
      t >>= 1;
    }
    re[rev] = realBuf[i];
  }
  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1;
    const step = (-2 * Math.PI) / size;
    const wReStep = Math.cos(step);
    const wImStep = Math.sin(step);
    for (let start = 0; start < n; start += size) {
      let wRe = 1;
      let wIm = 0;
      for (let j = 0; j < half; j += 1) {
        const i1 = start + j;
        const i2 = i1 + half;
        const tRe = wRe * re[i2] - wIm * im[i2];
        const tIm = wRe * im[i2] + wIm * re[i2];
        re[i2] = re[i1] - tRe;
        im[i2] = im[i1] - tIm;
        re[i1] += tRe;
        im[i1] += tIm;
        const nextWRe = wRe * wReStep - wIm * wImStep;
        wIm = wRe * wImStep + wIm * wReStep;
        wRe = nextWRe;
      }
    }
  }
  const mag = new Float64Array(n >> 1);
  for (let k = 0; k < mag.length; k += 1) {
    mag[k] = Math.hypot(re[k], im[k]);
  }
  return mag;
}

/* Deterministic YIN F0 estimator on a single frame buffer (65..500 Hz) */
function estimateYinF0(frameBuf, sampleRate, fMin = 65, fMax = 500, threshold = 0.15) {
  const n = frameBuf.length;
  const half = n >> 1;
  const tauMin = Math.max(2, Math.floor(sampleRate / fMax));
  const tauMax = Math.min(half - 2, Math.ceil(sampleRate / fMin));
  if (tauMax <= tauMin) return 0;

  let sumSq = 0;
  for (let i = 0; i < n; i += 1) sumSq += frameBuf[i] * frameBuf[i];
  if (Math.sqrt(sumSq / n) < 0.008) return 0;

  const cmndf = new Float64Array(tauMax + 2);
  cmndf[0] = 1;
  let runningSum = 0;
  let bestTau = -1;
  let bestVal = 1;

  for (let tau = 1; tau <= tauMax; tau += 1) {
    let diff = 0;
    for (let j = 0; j < half; j += 1) {
      const d = frameBuf[j] - frameBuf[j + tau];
      diff += d * d;
    }
    runningSum += diff;
    const val = runningSum > 1e-12 ? (diff * tau) / runningSum : 1;
    cmndf[tau] = val;
    if (tau >= tauMin && val < bestVal) {
      bestVal = val;
      bestTau = tau;
    }
  }

  let chosen = -1;
  for (let tau = tauMin; tau <= tauMax; tau += 1) {
    if (cmndf[tau] < threshold) {
      while (tau + 1 <= tauMax && cmndf[tau + 1] <= cmndf[tau]) tau += 1;
      chosen = tau;
      break;
    }
  }
  if (chosen < 0) {
    if (bestTau >= tauMin && bestVal < 0.34) chosen = bestTau;
    else return 0;
  }

  let refined = chosen;
  if (chosen > tauMin && chosen < tauMax) {
    const s0 = cmndf[chosen - 1];
    const s1 = cmndf[chosen];
    const s2 = cmndf[chosen + 1];
    const denom = 2 * (2 * s1 - s2 - s0);
    if (Math.abs(denom) > 1e-9) {
      refined = chosen + clamp((s2 - s0) / denom, -0.5, 0.5);
    }
  }
  const f0 = refined > 0 ? sampleRate / refined : 0;
  return (f0 >= fMin && f0 <= fMax) ? f0 : 0;
}

export async function analyzeAudioWithProsodyOffline(file, fps = 30) {
  const arrBuf = await file.arrayBuffer();
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) throw new Error("Web Audio API در این مرورگر در دسترس نیست.");
  const ctx = new AudioCtx();
  let decoded;
  try {
    decoded = await ctx.decodeAudioData(arrBuf.slice(0));
  } finally {
    ctx.close().catch(() => {});
  }

  const origSr = decoded.sampleRate || 44100;
  const origLen = decoded.length;
  const chCount = decoded.numberOfChannels || 1;
  const monoOrig = new Float32Array(origLen);
  for (let c = 0; c < chCount; c += 1) {
    const ch = decoded.getChannelData(c);
    for (let i = 0; i < origLen; i += 1) monoOrig[i] += ch[i] / chCount;
  }

  // Downsample to ~16 kHz if high sample rate so YIN stays fast and matches Python 16 kHz analysis
  const decimate = origSr > 24000 ? Math.max(1, Math.round(origSr / 16000)) : 1;
  const sr = origSr / decimate;
  const nSamples = Math.floor(origLen / decimate);
  const mono = decimate === 1 ? monoOrig : new Float32Array(nSamples);
  if (decimate > 1) {
    for (let i = 0; i < nSamples; i += 1) mono[i] = monoOrig[i * decimate];
  }

  const duration = decoded.duration || (nSamples / sr);
  const totalFrames = Math.max(1, Math.round(duration * fps));
  const fftSize = 512;
  const halfWin = fftSize >> 1;
  const freqStep = sr / fftSize;
  const hann = new Float64Array(fftSize);
  for (let k = 0; k < fftSize; k += 1) hann[k] = 0.5 * (1 - Math.cos((2 * Math.PI * k) / (fftSize - 1)));

  const rawRms = new Float64Array(totalFrames);
  const rawZcr = new Float64Array(totalFrames);
  const rawCent = new Float64Array(totalFrames);
  const rawLow = new Float64Array(totalFrames);
  const rawHigh = new Float64Array(totalFrames);
  const rawF0 = new Float64Array(totalFrames);

  const yinWin = 1024;
  const yinHalf = yinWin >> 1;
  const yinBuf = new Float64Array(yinWin);
  const winBuf = new Float64Array(fftSize);

  for (let i = 0; i < totalFrames; i += 1) {
    const center = Math.round((i / fps) * sr);
    const start = center - halfWin;
    let sq = 0;
    let zc = 0;
    let prev = 0;
    for (let k = 0; k < fftSize; k += 1) {
      const idx = start + k;
      const s = idx >= 0 && idx < nSamples ? mono[idx] : 0;
      sq += s * s;
      if (k > 0 && ((s >= 0 && prev < 0) || (s < 0 && prev >= 0))) zc += 1;
      prev = s;
      winBuf[k] = s * hann[k];
    }
    rawRms[i] = Math.sqrt(sq / fftSize);
    rawZcr[i] = zc / (fftSize - 1);
    const mag = fftMagRadix2(winBuf);
    let num = 0, den = 0, eL = 0, eM = 0, eH = 0;
    for (let b = 1; b < mag.length; b += 1) {
      const f = b * freqStep;
      const m = mag[b];
      const m2 = m * m;
      num += f * m;
      den += m;
      if (f >= 75 && f < 480) eL += m2;
      else if (f >= 480 && f < 1850) eM += m2;
      else if (f >= 1850 && f <= 7200) eH += m2;
    }
    const tot = eL + eM + eH + 1e-12;
    rawCent[i] = den > 1e-9 ? num / den : 0;
    rawLow[i] = eL / tot;
    rawHigh[i] = eH / tot;

    if (rawRms[i] >= 0.008) {
      const yStart = center - yinHalf;
      for (let k = 0; k < yinWin; k += 1) {
        const idx = yStart + k;
        yinBuf[k] = idx >= 0 && idx < nSamples ? mono[idx] : 0;
      }
      rawF0[i] = estimateYinF0(yinBuf, sr, 65, 500, 0.15);
    } else {
      rawF0[i] = 0;
    }
  }

  const sorted = Array.from(rawRms).sort((a, b) => a - b);
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] || 0.05;
  const refPeak = Math.max(p95, 1e-4);
  const silenceAmp = Math.pow(10, -44 / 20);
  const dtMs = 1000 / fps;
  const atkA = 1 - Math.exp(-dtMs / 35);
  const relA = 1 - Math.exp(-dtMs / 95);

  const envArr = new Float64Array(totalFrames);
  let env = 0;
  for (let i = 0; i < totalFrames; i += 1) {
    const r = rawRms[i];
    const norm = r < silenceAmp ? 0 : Math.min(1, Math.max(0, r / refPeak));
    const c = norm >= env ? atkA : relA;
    env = env + c * (norm - env);
    envArr[i] = env;
  }

  // Median-filter F0 (3-frame) and compute speaker median F0
  const smoothF0 = new Float64Array(totalFrames);
  const voicedList = [];
  for (let i = 0; i < totalFrames; i += 1) {
    if (envArr[i] < 0.045) {
      smoothF0[i] = 0;
      continue;
    }
    const vals = [];
    for (let j = Math.max(0, i - 1); j <= Math.min(totalFrames - 1, i + 1); j += 1) {
      if (rawF0[j] > 0) vals.push(rawF0[j]);
    }
    if (vals.length) {
      vals.sort((a, b) => a - b);
      smoothF0[i] = vals[vals.length >> 1];
      voicedList.push(smoothF0[i]);
    } else {
      smoothF0[i] = 0;
    }
  }
  voicedList.sort((a, b) => a - b);
  const medianF0 = voicedList.length ? voicedList[voicedList.length >> 1] : 165;

  const peaks = [];
  let lastPkT = -99;
  for (let i = 1; i < totalFrames - 1; i += 1) {
    const e = envArr[i];
    if (e >= 0.56 && e >= envArr[i - 1] && e >= envArr[i + 1]) {
      const t = i / fps;
      if (t - lastPkT >= 0.45) {
        peaks.push({ t: +t.toFixed(3), strength: +Math.min(1, e).toFixed(3) });
        lastPkT = t;
      }
    }
  }

  const phrases = [];
  const pauses = [];
  let phStart = null;
  let paStart = null;
  for (let i = 0; i < totalFrames; i += 1) {
    const t = i / fps;
    const act = envArr[i] >= 0.065;
    if (act) {
      if (phStart === null) phStart = t;
      if (paStart !== null) {
        if (t - paStart >= 0.16) pauses.push({ start: +paStart.toFixed(3), end: +t.toFixed(3) });
        paStart = null;
      }
    } else {
      if (paStart === null) paStart = t;
      if (phStart !== null) {
        if (t - phStart >= 0.35) phrases.push({ start: +phStart.toFixed(3), end: +t.toFixed(3) });
        phStart = null;
      }
    }
  }
  const endDur = totalFrames / fps;
  if (phStart !== null && endDur - phStart >= 0.35) phrases.push({ start: +phStart.toFixed(3), end: +endDur.toFixed(3) });
  if (paStart !== null && endDur - paStart >= 0.16) pauses.push({ start: +paStart.toFixed(3), end: +endDur.toFixed(3) });

  const minHold = 2;
  let curVis = "rest";
  let hold = 1;
  const frames = [];
  const prosodyFrames = [];
  let prevPitchNorm = 0;

  for (let i = 0; i < totalFrames; i += 1) {
    const t = i / fps;
    const e = envArr[i];
    let cand = "rest";
    if (e < 0.045) {
      cand = (i > 0 && envArr[i - 1] >= 0.045) ? "closed" : "rest";
    } else if (rawZcr[i] > 0.22 && rawHigh[i] > 0.3 && e < 0.55) {
      cand = "f_v";
    } else if (rawCent[i] >= 1750 && rawHigh[i] >= 0.16 && e >= 0.14) {
      cand = "e_teeth";
    } else if (rawLow[i] >= 0.56 && rawCent[i] <= 950 && e >= 0.22) {
      cand = "round_o";
    } else if (e >= 0.64) {
      cand = "wide";
    } else if (e >= 0.34) {
      cand = "open";
    } else {
      cand = "small";
    }

    if (e < 0.045) {
      curVis = cand;
      hold = minHold;
    } else if (cand !== curVis) {
      if (hold >= minHold) {
        curVis = cand;
        hold = 1;
      } else {
        hold += 1;
      }
    } else {
      hold += 1;
    }

    const spec = VISEMES[curVis] || VISEMES.rest;
    const isSpeech = e >= 0.045 && curVis !== "rest";
    let stress = 0;
    for (const pk of peaks) {
      const dt = Math.abs(t - pk.t);
      if (dt < 0.18) stress = Math.max(stress, pk.strength * (1 - dt / 0.18));
    }
    const openness = isSpeech ? Math.min(1, spec.jawOpen * (0.55 + 0.65 * e)) : 0;
    frames.push({
      t: +t.toFixed(4),
      viseme: curVis,
      energy: +e.toFixed(3),
      openness: +openness.toFixed(3),
      width: +(spec.widthScale || 1).toFixed(3),
      stress: +stress.toFixed(3),
      is_speech: isSpeech,
    });

    const f0 = smoothF0[i];
    const pNorm = (f0 > 0 && medianF0 > 0) ? clamp((12 * Math.log2(f0 / medianF0)) / 6, -1, 1) : 0;
    const pDelta = clamp(pNorm - prevPitchNorm, -1, 1);
    prevPitchNorm = pNorm;
    const db = rawRms[i] > 1e-6 ? clamp(20 * Math.log10(rawRms[i]), -80, 0) : -80;

    prosodyFrames.push({
      t: +t.toFixed(4),
      rms: +rawRms[i].toFixed(5),
      db: +db.toFixed(2),
      loudness: +e.toFixed(4),
      f0_hz: +f0.toFixed(2),
      pitch_norm: +pNorm.toFixed(4),
      pitch_delta: +pDelta.toFixed(4),
      is_speaking: isSpeech,
      is_pause: !isSpeech,
      emphasis: +stress.toFixed(4),
    });
  }

  const visemes = {
    version: 1,
    fps,
    duration: +duration.toFixed(4),
    source: "browser-audio",
    frames,
    peaks,
    phrases,
  };
  const prosody = {
    version: 1,
    fps,
    duration: +duration.toFixed(4),
    source: "browser-audio-yin",
    median_f0_hz: +medianF0.toFixed(2),
    frames: prosodyFrames,
    peaks,
    phrases,
    pauses,
  };
  return { visemes, prosody };
}

export async function analyzeAudioFileOffline(file, fps = 30) {
  const res = await analyzeAudioWithProsodyOffline(file, fps);
  res.visemes.prosody = res.prosody;
  return res.visemes;
}

/* Live Preview Meter DOM registry (updated by editor.js on mascotTelemetry postMessage) */
let activeMeterEls = null;

export function updateVoiceToneMeter(telemetry) {
  if (!activeMeterEls || !telemetry) return;
  const { loudFill, loudVal, pitchMarker, pitchVal, empDot, mouthChip, browChip, headChip } = activeMeterEls;
  const loudPct = Math.round(clamp(Number(telemetry.loudness) || 0, 0, 1) * 100);
  const dbVal = Number.isFinite(telemetry.db) ? telemetry.db : -80;
  if (loudFill) loudFill.style.width = `${loudPct}%`;
  if (loudVal) loudVal.textContent = `${loudPct}% (${dbVal.toFixed(0)} dB)`;

  const pNorm = clamp(Number(telemetry.pitchNorm) || 0, -1, 1);
  const pctPos = 50 + pNorm * 46;
  if (pitchMarker) {
    pitchMarker.style.left = `${pctPos.toFixed(1)}%`;
    pitchMarker.classList.toggle("is-high", pNorm > 0.12);
    pitchMarker.classList.toggle("is-low", pNorm < -0.12);
  }
  if (pitchVal) {
    const hz = Number(telemetry.f0Hz) || 0;
    pitchVal.textContent = hz > 0 ? `${Math.round(hz)} Hz (${pNorm >= 0 ? "+" : ""}${pNorm.toFixed(2)})` : "سکوت / بدون زیر و بمی";
  }

  const emp = clamp(Number(telemetry.emphasis) || 0, 0, 1);
  if (empDot) {
    empDot.classList.toggle("is-hot", emp >= 0.45);
    empDot.textContent = emp >= 0.45 ? `تاکید ${Math.round(emp * 100)}%` : (telemetry.isSpeaking ? "در حال صحبت" : "سکوت");
  }

  if (mouthChip) mouthChip.textContent = `دهان: ${Math.round(clamp(telemetry.mouthOpen || 0, 0, 1) * 100)}%`;
  if (browChip) browChip.textContent = `ابرو: ${(Number(telemetry.browY) || 0).toFixed(1)}px`;
  if (headChip) headChip.textContent = `سر: ${(Number(telemetry.headTilt) || 0).toFixed(1)}°`;
}

function readSlideTone(slide) {
  const raw = (slide.mascot && slide.mascot.tone) || slide.tone || null;
  return resolveTone(raw);
}

function writeSlideTone(slide, nextTone) {
  if (!slide.mascot || typeof slide.mascot !== "object") {
    slide.mascot = {};
  }
  slide.mascot.tone = {
    preset: nextTone.preset,
    mouthGain: +Number(nextTone.mouthGain).toFixed(2),
    browGain: +Number(nextTone.browGain).toFixed(2),
    headGain: +Number(nextTone.headGain).toFixed(2),
    chestGain: +Number(nextTone.chestGain).toFixed(2),
    wingGain: +Number(nextTone.wingGain).toFixed(2),
    blinkRate: +Number(nextTone.blinkRate).toFixed(2),
    idleSway: +Number(nextTone.idleSway).toFixed(2),
    springFreq: +Number(nextTone.springFreq).toFixed(1),
  };
  // Keep video.yaml clean and canonical under mascot.tone
  if (slide.tone) delete slide.tone;
  return slide.mascot.tone;
}

export function renderMascotControls({
  container,
  slide,
  audioState,
  onDirtyReload,
  onToneChange,
  onLoadAudioFile,
  onClearAudio,
  setStatus,
}) {
  activeMeterEls = null;
  const tpl = String(slide.template || "").replace(/-/g, "_");
  const isMascotTpl = tpl === "mascot_talk";

  const sec = document.createElement("div");
  sec.className = "inspector-section";
  sec.innerHTML = `
    <div class="section-title">
      <span>شخصیت عقاب قرمز و لیپ‌سینک</span>
      <span class="bilingual-sub">Red Eagle Rig</span>
    </div>
  `;

  if (!isMascotTpl) {
    const tog = document.createElement("label");
    tog.className = "toggle-chip";
    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.checked = Boolean(slide.mascot && slide.mascot.enabled !== false);
    chk.addEventListener("change", () => {
      if (chk.checked) {
        slide.mascot = Object.assign({
          enabled: true,
          side: "left",
          scale: 0.82,
          expression: "neutral",
          look_at: "slide",
          enter: "slide-in",
          accents: true,
        }, slide.mascot || {});
      } else {
        delete slide.mascot;
      }
      onDirtyReload(true, true);
    });
    tog.append(chk, document.createTextNode("نمایش شخصیت عقاب روی این اسلاید (Mascot Layer)"));
    sec.appendChild(tog);
  }

  const targetCfg = isMascotTpl ? slide : (slide.mascot && slide.mascot.enabled !== false ? slide.mascot : null);

  if (targetCfg) {
    if (!isMascotTpl) {
      const miniGrid = document.createElement("div");
      miniGrid.className = "override-grid";

      const mkSel = (lbl, key, opts) => {
        const w = document.createElement("label");
        w.textContent = lbl;
        const sel = document.createElement("select");
        sel.className = "select-ctrl compact";
        opts.forEach(([v, l]) => {
          const o = document.createElement("option");
          o.value = v;
          o.textContent = l;
          sel.appendChild(o);
        });
        sel.value = targetCfg[key] || opts[0][0];
        sel.addEventListener("change", () => {
          targetCfg[key] = sel.value;
          onDirtyReload(false, false);
        });
        w.appendChild(sel);
        return w;
      };

      miniGrid.append(
        mkSel("حالت چهره", "expression", EXPRESSION_OPTIONS),
        mkSel("سمت", "side", [["left", "چپ"], ["right", "راست"]]),
        mkSel("نگاه", "look_at", [["slide", "کارت"], ["camera", "دوربین"], ["auto", "خودکار"]])
      );
      sec.appendChild(miniGrid);
    }

    /* ---------------- Voice Tone Puppet Panel (Presets + Live Meter + Advanced Gains) */
    const curTone = readSlideTone(slide);
    const toneBox = document.createElement("div");
    toneBox.className = "float-divider-group voice-tone-panel";
    toneBox.innerHTML = `
      <div class="override-head">
        <span>لحن صدا و عروسک‌گردانی (Voice Tone)</span>
        <span class="bilingual-sub">mascot.tone</span>
      </div>
      <p class="panel-hint">واکنش ابروها به زیر و بمی صدا، تکان سر روی تاکید، جهش بدن با انرژی و پلک‌زدن در مکث‌ها.</p>
    `;

    // 1) Beginner preset picker: calm / lively / dramatic
    const presetRow = document.createElement("div");
    presetRow.className = "tone-preset-row";
    const presetButtons = [];
    const sliderControls = {};

    const applyToneLive = (nextTone, markDirty = true) => {
      const saved = writeSlideTone(slide, nextTone);
      presetButtons.forEach(({ key, btn }) => {
        btn.classList.toggle("active", key === saved.preset);
      });
      GAIN_SLIDERS.forEach((g) => {
        const ctrl = sliderControls[g.key];
        if (ctrl) {
          ctrl.input.value = String(saved[g.key]);
          ctrl.readout.textContent = g.fmt(Number(saved[g.key]));
        }
      });
      if (typeof onToneChange === "function") {
        onToneChange(saved, markDirty);
      } else if (markDirty) {
        onDirtyReload(false, false);
      }
    };

    [
      ["calm", "آرام (Calm)"],
      ["lively", "زنده (Lively)"],
      ["dramatic", "نمایشی (Dramatic)"],
    ].forEach(([key, label]) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tone-preset-btn" + (curTone.preset === key ? " active" : "");
      btn.dataset.preset = key;
      btn.textContent = label;
      btn.addEventListener("click", () => {
        const next = resolveTone({ preset: key });
        applyToneLive(next, true);
        setStatus(`پریست لحن صدا روی «${label}» تنظیم شد ✓`);
      });
      presetButtons.push({ key, btn });
      presetRow.appendChild(btn);
    });
    toneBox.appendChild(presetRow);

    // 2) Live Preview Meter (Loudness + Pitch + Emphasis + Rig outputs)
    const meterCard = document.createElement("div");
    meterCard.className = "tone-meter-card";
    meterCard.innerHTML = `
      <div class="tone-meter-row">
        <span class="tone-meter-label">بلندی صدا (Loudness)</span>
        <span class="tone-meter-val mono-num" dir="ltr" data-el="loudVal">0% (-80 dB)</span>
      </div>
      <div class="tone-meter-bar"><div class="tone-meter-fill" data-el="loudFill" style="width:0%"></div></div>
      <div class="tone-meter-row" style="margin-top:6px">
        <span class="tone-meter-label">زیر و بمی (Pitch vs Median)</span>
        <span class="tone-meter-val mono-num" dir="ltr" data-el="pitchVal">سکوت</span>
      </div>
      <div class="tone-pitch-track">
        <div class="tone-pitch-center"></div>
        <div class="tone-pitch-marker" data-el="pitchMarker" style="left:50%"></div>
      </div>
      <div class="tone-telemetry-chips">
        <span class="tone-emp-badge" data-el="empDot">سکوت</span>
        <span class="tone-chip mono-num" data-el="mouthChip">دهان: 0%</span>
        <span class="tone-chip mono-num" data-el="browChip">ابرو: 0.0px</span>
        <span class="tone-chip mono-num" data-el="headChip">سر: 0.0°</span>
      </div>
    `;
    toneBox.appendChild(meterCard);
    activeMeterEls = {
      loudFill: meterCard.querySelector('[data-el="loudFill"]'),
      loudVal: meterCard.querySelector('[data-el="loudVal"]'),
      pitchMarker: meterCard.querySelector('[data-el="pitchMarker"]'),
      pitchVal: meterCard.querySelector('[data-el="pitchVal"]'),
      empDot: meterCard.querySelector('[data-el="empDot"]'),
      mouthChip: meterCard.querySelector('[data-el="mouthChip"]'),
      browChip: meterCard.querySelector('[data-el="browChip"]'),
      headChip: meterCard.querySelector('[data-el="headChip"]'),
    };

    // 3) Advanced Gains collapsible section
    const advDetails = document.createElement("details");
    advDetails.className = "tone-advanced";
    const advSummary = document.createElement("summary");
    advSummary.textContent = "تنظیمات پیشرفتهٔ گِین‌ها (Advanced Gains)";
    advDetails.appendChild(advSummary);

    const advBody = document.createElement("div");
    advBody.className = "tone-advanced-body";
    GAIN_SLIDERS.forEach((g) => {
      const row = document.createElement("label");
      row.className = "tone-slider-row";
      const head = document.createElement("div");
      head.className = "tone-slider-head";
      const lblSpan = document.createElement("span");
      lblSpan.textContent = g.label;
      const valStrong = document.createElement("strong");
      valStrong.className = "mono-num";
      valStrong.dir = "ltr";
      valStrong.textContent = g.fmt(Number(curTone[g.key]));
      head.append(lblSpan, valStrong);

      const inp = document.createElement("input");
      inp.type = "range";
      inp.min = String(g.min);
      inp.max = String(g.max);
      inp.step = String(g.step);
      inp.value = String(curTone[g.key]);
      inp.dataset.gain = g.key;
      inp.addEventListener("input", () => {
        const cur = readSlideTone(slide);
        cur[g.key] = parseFloat(inp.value);
        applyToneLive(cur, true);
      });

      sliderControls[g.key] = { input: inp, readout: valStrong };
      row.append(head, inp);
      advBody.appendChild(row);
    });

    const resetToneBtn = document.createElement("button");
    resetToneBtn.type = "button";
    resetToneBtn.className = "btn btn-sm btn-ghost";
    resetToneBtn.textContent = "بازنشانی گِین‌ها به پیش‌فرض پریست";
    resetToneBtn.addEventListener("click", () => {
      const presetKey = readSlideTone(slide).preset;
      applyToneLive(resolveTone({ preset: presetKey }), true);
      setStatus("گِین‌های لحن صدا بازنشانی شد ✓");
    });
    advBody.appendChild(resetToneBtn);
    advDetails.appendChild(advBody);
    toneBox.appendChild(advDetails);
    sec.appendChild(toneBox);

    // Expression Timeline editor
    const tlBox = document.createElement("div");
    tlBox.className = "float-divider-group";
    tlBox.innerHTML = `
      <div class="override-head">
        <span>تغییر احساس در طول زمان (Expression Timeline)</span>
      </div>
    `;
    const list = Array.isArray(targetCfg.expression_timeline) ? targetCfg.expression_timeline : [];
    list.forEach((cue, idx) => {
      const row = document.createElement("div");
      row.className = "expr-cue-row";
      const tInp = document.createElement("input");
      tInp.type = "number";
      tInp.step = "0.1";
      tInp.min = "0";
      tInp.dir = "ltr";
      tInp.className = "text-input compact";
      tInp.value = String(cue.t ?? 0);
      tInp.title = "زمان (ثانیه)";
      tInp.addEventListener("change", () => {
        cue.t = Math.max(0, Number(tInp.value) || 0);
        onDirtyReload(false, false);
      });

      const eSel = document.createElement("select");
      eSel.className = "select-ctrl compact";
      EXPRESSION_OPTIONS.forEach(([v, l]) => {
        const o = document.createElement("option");
        o.value = v;
        o.textContent = l;
        eSel.appendChild(o);
      });
      eSel.value = cue.expression || "neutral";
      eSel.addEventListener("change", () => {
        cue.expression = eSel.value;
        onDirtyReload(false, false);
      });

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "icon-btn danger";
      delBtn.textContent = "✕";
      delBtn.addEventListener("click", () => {
        list.splice(idx, 1);
        targetCfg.expression_timeline = list;
        onDirtyReload(true, false);
      });
      row.append(tInp, eSel, delBtn);
      tlBox.appendChild(row);
    });

    const addCueBtn = document.createElement("button");
    addCueBtn.type = "button";
    addCueBtn.className = "btn btn-sm btn-ghost";
    addCueBtn.textContent = "+ افزودن تغییر حالت چهره";
    addCueBtn.addEventListener("click", () => {
      const nextT = list.length ? +((Number(list[list.length - 1].t) || 0) + 1.5).toFixed(1) : 1.2;
      list.push({ t: nextT, expression: "happy", blend: 0.35 });
      targetCfg.expression_timeline = list;
      onDirtyReload(true, false);
    });
    tlBox.appendChild(addCueBtn);
    sec.appendChild(tlBox);

    // Offline Audio Preview + Lip-sync & Prosody Import/Analyze
    const audBox = document.createElement("div");
    audBox.className = "float-divider-group";
    audBox.innerHTML = `
      <div class="override-head">
        <span>پیش‌نمایش زنده با صدای راوی (آفلاین)</span>
      </div>
      <p class="panel-hint">فایل صدای گفتار (WAV/MP3) یا فایل‌های JSON ویزیم و پروزودی خروجی پایتون را برای همگام‌سازی فوری انتخاب کنید.</p>
    `;

    const audBtnRow = document.createElement("div");
    audBtnRow.className = "btn-row-wrap";

    const audioFileInp = document.createElement("input");
    audioFileInp.type = "file";
    audioFileInp.accept = "audio/*,.wav,.mp3,.ogg,.m4a";
    audioFileInp.className = "hidden";
    audioFileInp.addEventListener("change", async () => {
      const f = audioFileInp.files && audioFileInp.files[0];
      if (!f) return;
      await onLoadAudioFile(f);
    });

    const pickAudioBtn = document.createElement("button");
    pickAudioBtn.type = "button";
    pickAudioBtn.className = "btn btn-sm btn-amber";
    pickAudioBtn.textContent = "🎙️ انتخاب فایل صوتی (WAV/MP3)";
    pickAudioBtn.addEventListener("click", () => audioFileInp.click());

    const jsonFileInp = document.createElement("input");
    jsonFileInp.type = "file";
    jsonFileInp.accept = ".json,application/json";
    jsonFileInp.className = "hidden";
    jsonFileInp.addEventListener("change", async () => {
      const f = jsonFileInp.files && jsonFileInp.files[0];
      if (!f) return;
      try {
        const parsed = JSON.parse(await f.text());
        if (!parsed || !Array.isArray(parsed.frames)) throw new Error("فرمت فایل ویزیم نامعتبر است");
        slide.visemeTrack = parsed;
        slide.viseme_track = f.name;
        onDirtyReload(true, true);
        setStatus(`مسیر ویزیم «${f.name}» با ${parsed.frames.length} فریم بارگذاری شد ✓`);
      } catch (err) {
        setStatus("خطا در خواندن JSON ویزیم: " + err.message);
      }
    });

    const pickJsonBtn = document.createElement("button");
    pickJsonBtn.type = "button";
    pickJsonBtn.className = "btn btn-sm btn-ghost";
    pickJsonBtn.textContent = "📥 بارگذاری ویزیم JSON";
    pickJsonBtn.addEventListener("click", () => jsonFileInp.click());

    const prosodyFileInp = document.createElement("input");
    prosodyFileInp.type = "file";
    prosodyFileInp.accept = ".json,application/json";
    prosodyFileInp.className = "hidden";
    prosodyFileInp.addEventListener("change", async () => {
      const f = prosodyFileInp.files && prosodyFileInp.files[0];
      if (!f) return;
      try {
        const parsed = JSON.parse(await f.text());
        if (!parsed || !Array.isArray(parsed.frames)) throw new Error("فرمت فایل پروزودی نامعتبر است");
        slide.prosodyTrack = parsed;
        slide.prosody_track = f.name;
        if (slide.mascot && typeof slide.mascot === "object") slide.mascot.prosodyTrack = parsed;
        onDirtyReload(true, true);
        setStatus(`مسیر پروزودی «${f.name}» با ${parsed.frames.length} فریم بارگذاری شد ✓`);
      } catch (err) {
        setStatus("خطا در خواندن JSON پروزودی: " + err.message);
      }
    });

    const pickProsodyBtn = document.createElement("button");
    pickProsodyBtn.type = "button";
    pickProsodyBtn.className = "btn btn-sm btn-ghost";
    pickProsodyBtn.textContent = "📈 بارگذاری پروزودی JSON";
    pickProsodyBtn.addEventListener("click", () => prosodyFileInp.click());

    audBtnRow.append(pickAudioBtn, pickJsonBtn, pickProsodyBtn, audioFileInp, jsonFileInp, prosodyFileInp);
    if (audioState && audioState.fileName) {
      const clrBtn = document.createElement("button");
      clrBtn.type = "button";
      clrBtn.className = "icon-btn danger";
      clrBtn.textContent = `حذف صدا (${audioState.fileName})`;
      clrBtn.addEventListener("click", () => onClearAudio());
      audBtnRow.appendChild(clrBtn);
    }

    audBox.appendChild(audBtnRow);
    sec.appendChild(audBox);
  }

  container.appendChild(sec);
}
