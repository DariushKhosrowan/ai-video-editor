/* Khordegir Studio — Bulletproof Offline Live Microphone & Loudness Engine
   Shared across /editor/, /obs/, and /obs-stage/.
   Fixes:
   1. Explicit AudioContext.resume() + suspended-context auto-recovery.
   2. Zero-gain sink (analyser -> silentGain(0) -> destination) so Chromium/Edge/OBS
      always pulls real-time mic buffers without speaker feedback or GC drop.
   3. Configurable Input Gain Boost (GainNode 0.5x..8x) + lower default gate (-56 dB)
      + perceptual dB/RMS loudness blend so quiet laptop/USB mics react immediately.
   4. Automatic getByteTimeDomainData fallback if Float32 returns flat zeros.
   5. Actionable Persian + English diagnostics (never silently swallows mic errors).
   100% offline, zero external dependencies, deterministic signal processing. */
(function () {
  "use strict";

  const CALIBRATION_STORAGE_KEY = "khordegir_speaker_calibration_v1";
  const MIC_PREFS_STORAGE_KEY = "khordegir_mic_prefs_v1";

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function loadStoredCalibration() {
    try {
      const raw = window.localStorage && window.localStorage.getItem(CALIBRATION_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return (parsed && typeof parsed === "object") ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function loadMicPrefs() {
    try {
      const raw = window.localStorage && window.localStorage.getItem(MIC_PREFS_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return (parsed && typeof parsed === "object") ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function saveMicPrefs(patch) {
    try {
      const next = Object.assign({}, loadMicPrefs(), patch || {});
      if (window.localStorage) {
        window.localStorage.setItem(MIC_PREFS_STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    } catch (_) {
      return patch || {};
    }
  }

  /* Deterministic 1-pole High-Pass Filter (75 Hz rumble/DC suppression) */
  function applyHighPassFilter(inputBuf, sampleRate, cutoffHz = 75) {
    const n = inputBuf.length;
    const out = new Float32Array(n);
    if (!n || !sampleRate) return out;
    const rc = 1 / (2 * Math.PI * cutoffHz);
    const dt = 1 / sampleRate;
    const alpha = rc / (rc + dt);
    let yPrev = 0;
    let xPrev = inputBuf[0] || 0;
    for (let i = 0; i < n; i += 1) {
      const x = inputBuf[i];
      const y = alpha * (yPrev + x - xPrev);
      out[i] = y;
      yPrev = y;
      xPrev = x;
    }
    return out;
  }

  /* Lightweight YIN (CMNDF) autocorrelation F0 detector on Float32Array (65..500 Hz).
     RMS floor lowered to 0.0025 so quiet laptop/USB mics still track pitch smoothly. */
  function detectLivePitchYIN(timeBuf, sampleRate, fMin = 65, fMax = 500, threshold = 0.16) {
    const n = timeBuf.length;
    const half = n >> 1;
    if (half < 32 || !sampleRate) return 0;
    const tauMin = Math.max(2, Math.floor(sampleRate / fMax));
    const tauMax = Math.min(half - 2, Math.ceil(sampleRate / fMin));
    if (tauMax <= tauMin) return 0;

    let sumSq = 0;
    for (let i = 0; i < n; i += 1) sumSq += timeBuf[i] * timeBuf[i];
    const rms = Math.sqrt(sumSq / n);
    if (rms < 0.0025) return 0;

    const cmndf = new Float32Array(tauMax + 2);
    cmndf[0] = 1;
    let runningSum = 0;
    let bestTau = -1;
    let bestVal = 1;

    for (let tau = 1; tau <= tauMax; tau += 1) {
      let diff = 0;
      for (let j = 0; j < half; j += 1) {
        const d = timeBuf[j] - timeBuf[j + tau];
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

    let chosenTau = -1;
    for (let tau = tauMin; tau <= tauMax; tau += 1) {
      if (cmndf[tau] < threshold) {
        while (tau + 1 <= tauMax && cmndf[tau + 1] <= cmndf[tau]) tau += 1;
        chosenTau = tau;
        break;
      }
    }
    if (chosenTau < 0) {
      if (bestTau >= tauMin && bestVal < 0.34) chosenTau = bestTau;
      else return 0;
    }

    let refinedTau = chosenTau;
    if (chosenTau > tauMin && chosenTau < tauMax) {
      const s0 = cmndf[chosenTau - 1];
      const s1 = cmndf[chosenTau];
      const s2 = cmndf[chosenTau + 1];
      const denom = 2 * (2 * s1 - s2 - s0);
      if (Math.abs(denom) > 1e-9) {
        refinedTau = chosenTau + clamp((s2 - s0) / denom, -0.5, 0.5);
      }
    }
    const f0 = refinedTau > 0 ? sampleRate / refinedTau : 0;
    return (f0 >= fMin && f0 <= fMax) ? f0 : 0;
  }

  /* Pure deterministic frame-by-frame voice & loudness tracker.
     Uses perceptual dB mapping + adaptive peak normalization + software input gain
     so both quiet laptop mics (-48 dB) and hot broadcast mics (-12 dB) respond smoothly. */
  function createLiveVoiceProcessor(initOpts = {}) {
    const opts = Object.assign({
      noiseSuppression: true,
      noiseGateDb: -56,
      gateHoldMs: 160,
      inputGain: 1.8,
      pttEnabled: false,
      pttActive: false,
      medianF0Hz: 0,
      pitchSpanSemitones: 6.0,
      p95Rms: 0.045,
    }, initOpts || {});

    const pitchRing = new Float32Array(60);
    let pitchCount = 0;
    let pitchCursor = 0;
    let envLoudness = 0;
    let peakRef = Math.max(0.014, Number(opts.p95Rms) || 0.045);
    let prevPitchNorm = 0;
    let smoothPitchNorm = 0;
    let prevLoudness = 0;
    let gateHoldRemainMs = 0;
    let calibratedMedianF0 = (opts.medianF0Hz >= 65 && opts.medianF0Hz <= 500) ? Number(opts.medianF0Hz) : 0;
    let pitchSpanSemi = clamp(Number(opts.pitchSpanSemitones) || 6.0, 3.5, 10.0);

    function medianPitch() {
      if (pitchCount < 4) return calibratedMedianF0 || 165;
      const vals = Array.from(pitchRing.subarray(0, pitchCount)).sort((a, b) => a - b);
      const liveMed = vals[vals.length >> 1] || 165;
      return calibratedMedianF0 ? (calibratedMedianF0 * 0.55 + liveMed * 0.45) : liveMed;
    }

    function analyzeFrame(timeBuf, freqDbBuf, sampleRate, dtSec, alreadyGained = false) {
      const rawBuf = opts.noiseSuppression
        ? applyHighPassFilter(timeBuf, sampleRate || 48000, 75)
        : timeBuf;

      const gain = alreadyGained ? 1.0 : clamp(Number(opts.inputGain) || 1.8, 0.25, 10.0);
      const n = rawBuf.length;
      const procBuf = (gain === 1.0) ? rawBuf : new Float32Array(n);

      let sumSq = 0;
      let peakAbs = 0;
      let zc = 0;
      let prev = 0;
      for (let i = 0; i < n; i += 1) {
        const v = gain === 1.0 ? rawBuf[i] : clamp(rawBuf[i] * gain, -1.0, 1.0);
        if (gain !== 1.0) procBuf[i] = v;
        const av = v < 0 ? -v : v;
        if (av > peakAbs) peakAbs = av;
        sumSq += v * v;
        if (i > 0 && ((v >= 0 && prev < 0) || (v < 0 && prev >= 0))) zc += 1;
        prev = v;
      }

      const rms = Math.sqrt(sumSq / Math.max(1, n));
      const db = rms > 1e-6 ? clamp(20 * Math.log10(rms), -80, 0) : -80;
      const zcr = zc / Math.max(1, n - 1);
      const dtMs = Math.max(8, (Number(dtSec) || (1 / 60)) * 1000);

      const pttMuted = Boolean(opts.pttEnabled && !opts.pttActive);
      const gateDb = clamp(Number(opts.noiseGateDb) ?? -56, -72, -18);

      let gateOpen = false;
      if (!pttMuted) {
        if (db >= gateDb) {
          gateOpen = true;
          gateHoldRemainMs = Math.max(0, Number(opts.gateHoldMs) || 160);
        } else if (gateHoldRemainMs > 0) {
          gateOpen = true;
          gateHoldRemainMs = Math.max(0, gateHoldRemainMs - dtMs);
        }
      } else {
        gateHoldRemainMs = 0;
      }

      // Adaptive peak reference with low floor (0.014) so quiet mics still reach full bar range
      if (gateOpen && rms > peakRef) {
        peakRef = peakRef * 0.72 + rms * 0.28;
      } else {
        peakRef = Math.max(0.014, peakRef * (1 - 0.18 * (dtMs / 1000)));
      }

      // Perceptual dB loudness blended with adaptive RMS so normal voice sits naturally at 45-90%
      let rawLoud = 0;
      if (gateOpen && !pttMuted) {
        const dbSpan = Math.max(14, Math.min(48, -6 - gateDb));
        const dbNorm = clamp((db - gateDb) / dbSpan, 0, 1);
        const rmsNorm = clamp(rms / Math.max(peakRef, 0.014), 0, 1);
        const blended = clamp(dbNorm * 0.55 + Math.pow(rmsNorm, 0.75) * 0.45, 0, 1);
        if (opts.noiseSuppression && db < gateDb + 3.5) {
          const knee = clamp((db - (gateDb - 3.5)) / 7.0, 0, 1);
          rawLoud = blended * knee;
        } else {
          rawLoud = blended;
        }
      }

      const atk = 1 - Math.exp(-dtMs / 20);
      const rel = 1 - Math.exp(-dtMs / 82);
      envLoudness += (rawLoud >= envLoudness ? atk : rel) * (rawLoud - envLoudness);
      if ((pttMuted || !gateOpen) && envLoudness < 0.004) envLoudness = 0;

      const isSpeaking = !pttMuted && envLoudness >= 0.045;
      const f0Hz = isSpeaking ? detectLivePitchYIN(procBuf, sampleRate) : 0;
      if (f0Hz > 0) {
        pitchRing[pitchCursor] = f0Hz;
        pitchCursor = (pitchCursor + 1) % pitchRing.length;
        if (pitchCount < pitchRing.length) pitchCount += 1;
      }

      const medF0 = medianPitch();
      const rawPitchNorm = (f0Hz > 0 && medF0 > 0)
        ? clamp((12 * Math.log2(f0Hz / medF0)) / pitchSpanSemi, -1, 1)
        : 0;
      const pAlpha = isSpeaking ? 0.35 : 0.15;
      smoothPitchNorm += pAlpha * (rawPitchNorm - smoothPitchNorm);
      const pitchDelta = clamp(((smoothPitchNorm - prevPitchNorm) / Math.max(dtSec || 0.016, 0.016)) * 0.12, -1, 1);
      prevPitchNorm = smoothPitchNorm;

      let lowShare = 0.35;
      let highShare = 0.2;
      if (freqDbBuf && freqDbBuf.length && sampleRate) {
        const binHz = (sampleRate * 0.5) / freqDbBuf.length;
        let eL = 0, eM = 0, eH = 0;
        for (let b = 1; b < freqDbBuf.length; b += 1) {
          const f = b * binHz;
          if (f > 7000) break;
          const lin = Math.pow(10, clamp(freqDbBuf[b], -100, 0) / 10);
          if (f >= 75 && f < 480) eL += lin;
          else if (f >= 480 && f < 1850) eM += lin;
          else if (f >= 1850) eH += lin;
        }
        const tot = eL + eM + eH + 1e-12;
        lowShare = eL / tot;
        highShare = eH / tot;
      }

      let viseme = "rest";
      if (!isSpeaking) viseme = "rest";
      else if (zcr > 0.20 && highShare > 0.28 && envLoudness < 0.55) viseme = "f_v";
      else if (highShare >= 0.22 && envLoudness >= 0.14) viseme = "e_teeth";
      else if (lowShare >= 0.56 && envLoudness >= 0.22) viseme = "round_o";
      else if (envLoudness >= 0.62) viseme = "wide";
      else if (envLoudness >= 0.30) viseme = "open";
      else viseme = "small";

      const risingKick = Math.max(0, envLoudness - prevLoudness) * 2.2;
      prevLoudness = envLoudness;
      const emphasis = isSpeaking
        ? clamp((envLoudness > 0.48 ? (envLoudness - 0.34) * 1.45 : 0) + risingKick * 0.35, 0, 1)
        : 0;

      return {
        active: true,
        rms: +rms.toFixed(5),
        peakAbs: +peakAbs.toFixed(5),
        db: +db.toFixed(2),
        loudness: +envLoudness.toFixed(4),
        f0Hz: +f0Hz.toFixed(2),
        medianF0: +medF0.toFixed(2),
        pitchNorm: +smoothPitchNorm.toFixed(4),
        pitchDelta: +pitchDelta.toFixed(4),
        emphasis: +emphasis.toFixed(4),
        isSpeaking,
        viseme,
        gateOpen,
        pttEnabled: Boolean(opts.pttEnabled),
        pttActive: Boolean(opts.pttActive),
        pttMuted,
        noiseSuppression: Boolean(opts.noiseSuppression),
        noiseGateDb: gateDb,
        inputGain: clamp(Number(opts.inputGain) || 1.8, 0.25, 10.0),
      };
    }

    analyzeFrame.setOptions = function (patch = {}) {
      Object.assign(opts, patch || {});
      if (patch && patch.medianF0Hz >= 65 && patch.medianF0Hz <= 500) {
        calibratedMedianF0 = Number(patch.medianF0Hz);
      }
      if (patch && patch.pitchSpanSemitones != null) {
        pitchSpanSemi = clamp(Number(patch.pitchSpanSemitones) || 6.0, 3.5, 10.0);
      }
      if (patch && patch.p95Rms > 0.005) {
        peakRef = Math.max(0.014, Number(patch.p95Rms));
      }
    };
    analyzeFrame.getOptions = function () {
      return Object.assign({}, opts, {
        medianF0Hz: calibratedMedianF0 || medianPitch(),
        pitchSpanSemitones: pitchSpanSemi,
      });
    };
    return analyzeFrame;
  }

  /* Translate browser getUserMedia errors into clear Persian + English guidance */
  function describeMicError(err) {
    const name = (err && err.name) || "";
    const msg = (err && err.message) || "";
    const isSecure = typeof window !== "undefined" && (window.isSecureContext !== false);
    if (!isSecure) {
      return {
        code: "insecure-context",
        fa: "مرورگر روی این آدرس اجازه میکروفن نمی‌دهد. استودیو را با آدرس http://127.0.0.1:3000 یا http://localhost:3000 باز کنید.",
        en: "Microphone requires localhost / 127.0.0.1 or HTTPS. Open Studio via http://127.0.0.1:3000.",
      };
    }
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return {
        code: "permission-denied",
        fa: "دسترسی میکروفن مسدود شده است. روی آیکون قفل/میکروفن کنار نوار آدرس مرورگر کلیک کنید و Allow بزنید.",
        en: "Microphone permission denied. Click the lock/mic icon in the browser address bar and select Allow.",
      };
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return {
        code: "no-device",
        fa: "هیچ میکروفنی به سیستم متصل نیست یا در تنظیمات ویندوز/مک غیرفعال شده است.",
        en: "No microphone found. Check your OS sound input settings or plug in a mic.",
      };
    }
    if (name === "NotReadableError" || name === "TrackStartError") {
      return {
        code: "device-busy",
        fa: "میکروفن توسط برنامه دیگری اشغال شده است (مثلاً OBS یا تماس صوتی). دستگاه دیگری انتخاب کنید یا دسترسی انحصاری را ببندید.",
        en: "Microphone is busy in another app. Select another mic device or disable exclusive mode.",
      };
    }
    return {
      code: name || "mic-error",
      fa: `خطا در راه‌اندازی میکروفن: ${msg || name || "نامشخص"}`,
      en: `Microphone error: ${msg || name || "Unknown"}`,
    };
  }

  async function listAudioInputDevices() {
    if (!navigator || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return [];
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter((d) => d.kind === "audioinput")
        .map((d, idx) => ({
          deviceId: d.deviceId,
          label: d.label || `میکروفن ${idx + 1} (Microphone ${idx + 1})`,
        }));
    } catch (_) {
      return [];
    }
  }

  /* Complete resilient Web Audio live microphone session controller */
  function createLiveMicSession(callbacks = {}) {
    const savedPrefs = loadMicPrefs();
    const storedCal = loadStoredCalibration();

    let running = false;
    let rafId = null;
    let stream = null;
    let audioCtx = null;
    let nodes = null; // keep strong references to prevent Chromium GC!
    let processor = null;
    let useByteFallback = false;
    let zeroFramesStreak = 0;
    let lastError = null;
    let activeDeviceLabel = "";

    const config = {
      deviceId: savedPrefs.deviceId || "",
      inputGain: clamp(Number(savedPrefs.inputGain ?? 1.8), 0.5, 8.0),
      noiseSuppression: savedPrefs.noiseSuppression !== false,
      autoGainControl: savedPrefs.autoGainControl !== false,
      noiseGateDb: clamp(Number(savedPrefs.noiseGateDb ?? (storedCal && storedCal.noiseGateDb != null ? Math.min(storedCal.noiseGateDb, -48) : -56)), -72, -20),
      medianF0Hz: (storedCal && storedCal.medianF0Hz) ? storedCal.medianF0Hz : 0,
      pitchSpanSemitones: (storedCal && storedCal.pitchSpanSemitones) ? storedCal.pitchSpanSemitones : 6.0,
      p95Rms: (storedCal && storedCal.p95Rms) ? storedCal.p95Rms : 0.045,
      pttEnabled: false,
      pttActive: false,
    };

    function emitState(extra = {}) {
      if (typeof callbacks.onStateChange === "function") {
        callbacks.onStateChange(Object.assign({
          running,
          suspended: Boolean(audioCtx && audioCtx.state === "suspended"),
          deviceLabel: activeDeviceLabel,
          error: lastError,
          silentWarning: zeroFramesStreak >= 90,
          config: Object.assign({}, config),
        }, extra));
      }
    }

    async function resumeIfSuspended() {
      if (audioCtx && audioCtx.state === "suspended") {
        try {
          await audioCtx.resume();
          emitState();
          return true;
        } catch (_) {
          return false;
        }
      }
      return Boolean(audioCtx && audioCtx.state === "running");
    }

    function setConfig(patch = {}) {
      Object.assign(config, patch || {});
      saveMicPrefs({
        deviceId: config.deviceId,
        inputGain: config.inputGain,
        noiseSuppression: config.noiseSuppression,
        autoGainControl: config.autoGainControl,
        noiseGateDb: config.noiseGateDb,
      });
      if (nodes && nodes.gainNode && audioCtx) {
        try {
          nodes.gainNode.gain.setTargetAtTime(clamp(Number(config.inputGain) || 1.8, 0.25, 10.0), audioCtx.currentTime, 0.015);
        } catch (_) {
          nodes.gainNode.gain.value = clamp(Number(config.inputGain) || 1.8, 0.25, 10.0);
        }
      }
      if (processor) processor.setOptions(config);
      emitState();
    }

    function stop() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      if (stream) {
        try { stream.getTracks().forEach((tr) => tr.stop()); } catch (_) {}
        stream = null;
      }
      if (nodes) {
        try { Object.values(nodes).forEach((nd) => nd && nd.disconnect && nd.disconnect()); } catch (_) {}
        nodes = null;
      }
      if (audioCtx) {
        try { audioCtx.close(); } catch (_) {}
        audioCtx = null;
      }
      running = false;
      processor = null;
      zeroFramesStreak = 0;
      useByteFallback = false;
      if (typeof callbacks.onFrame === "function") {
        callbacks.onFrame({ active: false, loudness: 0, db: -80, f0Hz: 0, pitchNorm: 0, emphasis: 0, isSpeaking: false, viseme: "rest" }, 1 / 60);
      }
      emitState();
    }

    async function start(overrideCfg = null) {
      if (overrideCfg) setConfig(overrideCfg);
      if (running) {
        await resumeIfSuspended();
        return { ok: true };
      }
      lastError = null;
      if (!navigator || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        lastError = describeMicError(new Error("getUserMedia unavailable"));
        emitState();
        return { ok: false, error: lastError };
      }

      running = true;
      emitState();

      try {
        const audioConstraints = {
          echoCancellation: true,
          noiseSuppression: Boolean(config.noiseSuppression),
          autoGainControl: Boolean(config.autoGainControl),
        };
        if (config.deviceId) {
          audioConstraints.deviceId = { ideal: config.deviceId };
        }

        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
        } catch (firstErr) {
          // Retry with plain { audio: true } in case specific deviceId/constraints failed
          if (config.deviceId || firstErr.name === "OverconstrainedError") {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          } else {
            throw firstErr;
          }
        }

        const audioTracks = stream.getAudioTracks ? stream.getAudioTracks() : [];
        if (audioTracks.length) {
          activeDeviceLabel = audioTracks[0].label || "";
          audioTracks[0].onmute = () => emitState({ trackMuted: true });
          audioTracks[0].onunmute = () => emitState({ trackMuted: false });
          audioTracks[0].onended = () => {
            if (running) {
              lastError = {
                code: "track-ended",
                fa: "اتصال میکروفن قطع شد. دوباره روی روشن کردن میکروفن کلیک کنید.",
                en: "Microphone disconnected. Click Start Mic to reconnect.",
              };
              stop();
            }
          };
        }

        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) throw new Error("Web Audio API not supported");
        audioCtx = new AC({ latencyHint: "interactive" });
        // CRITICAL FIX #1: Explicitly resume AudioContext so Chromium never outputs flat zeros!
        if (audioCtx.state === "suspended") {
          try { await audioCtx.resume(); } catch (_) {}
        }

        const src = audioCtx.createMediaStreamSource(stream);
        const gainNode = audioCtx.createGain();
        gainNode.gain.value = clamp(Number(config.inputGain) || 1.8, 0.25, 10.0);

        let chainTail = src;
        chainTail.connect(gainNode);
        chainTail = gainNode;

        let hpf = null;
        if (typeof audioCtx.createBiquadFilter === "function") {
          hpf = audioCtx.createBiquadFilter();
          hpf.type = "highpass";
          hpf.frequency.value = 75;
          hpf.Q.value = 0.707;
          chainTail.connect(hpf);
          chainTail = hpf;
        }

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0;
        chainTail.connect(analyser);

        // CRITICAL FIX #2: Connect analyser -> silent GainNode(0) -> destination
        // Forces Chromium/Edge/OBS Web Audio graph to pull real-time mic buffers every frame!
        const silentGain = audioCtx.createGain();
        silentGain.gain.value = 0;
        analyser.connect(silentGain);
        silentGain.connect(audioCtx.destination);

        nodes = { src, gainNode, hpf, analyser, silentGain };

        const timeBuf = new Float32Array(analyser.fftSize);
        const byteBuf = new Uint8Array(analyser.fftSize);
        const freqBuf = new Float32Array(analyser.frequencyBinCount);
        processor = createLiveVoiceProcessor(config);
        useByteFallback = false;
        zeroFramesStreak = 0;

        let lastTs = performance.now();
        const tick = (now) => {
          if (!running || !audioCtx || !nodes) return;
          const t0 = performance.now();
          const dt = clamp((now - lastTs) / 1000, 0.006, 0.08);
          lastTs = now;

          if (audioCtx.state === "suspended") {
            // Try gentle resume; emit suspended banner state
            audioCtx.resume().catch(() => {});
          }

          let hasNonZero = false;
          if (!useByteFallback && typeof analyser.getFloatTimeDomainData === "function") {
            analyser.getFloatTimeDomainData(timeBuf);
            for (let i = 0; i < timeBuf.length; i += 8) {
              if (Math.abs(timeBuf[i]) > 1e-7) { hasNonZero = true; break; }
            }
          }
          if (!hasNonZero && typeof analyser.getByteTimeDomainData === "function") {
            analyser.getByteTimeDomainData(byteBuf);
            let byteActive = false;
            for (let i = 0; i < byteBuf.length; i += 1) {
              const s = (byteBuf[i] - 128) / 128;
              timeBuf[i] = s;
              if (Math.abs(s) > 0.005) byteActive = true;
            }
            if (byteActive) {
              useByteFallback = true;
              hasNonZero = true;
            }
          }

          if (!hasNonZero) {
            zeroFramesStreak += 1;
            if (zeroFramesStreak === 90) emitState({ silentWarning: true });
          } else {
            if (zeroFramesStreak >= 90) {
              zeroFramesStreak = 0;
              emitState({ silentWarning: false });
            } else {
              zeroFramesStreak = 0;
            }
          }

          if (typeof analyser.getFloatFrequencyData === "function") {
            analyser.getFloatFrequencyData(freqBuf);
          }

          // Pass alreadyGained=true because Web Audio GainNode already applied inputGain
          const frame = processor(timeBuf, freqBuf, audioCtx.sampleRate || 48000, dt, true);
          frame.procMs = +(performance.now() - t0).toFixed(2);
          frame.baseLatencyMs = +(((Number(audioCtx.baseLatency) || 0) + (Number(audioCtx.outputLatency) || 0)) * 1000).toFixed(2);
          frame.windowMs = +((analyser.fftSize / (audioCtx.sampleRate || 48000)) * 500).toFixed(2);
          frame.audioCtxState = audioCtx.state;

          if (typeof callbacks.onFrame === "function") {
            callbacks.onFrame(frame, dt);
          }
          rafId = requestAnimationFrame(tick);
        };

        emitState();
        rafId = requestAnimationFrame(tick);
        return { ok: true, deviceLabel: activeDeviceLabel };
      } catch (err) {
        lastError = describeMicError(err);
        stop();
        return { ok: false, error: lastError };
      }
    }

    return {
      start,
      stop,
      setConfig,
      resumeIfSuspended,
      isRunning: () => running,
      getConfig: () => Object.assign({}, config),
      getAudioContext: () => audioCtx,
      getLastError: () => lastError,
    };
  }

  window.StageLiveMic = {
    applyHighPassFilter,
    detectLivePitchYIN,
    createLiveVoiceProcessor,
    createLiveMicSession,
    describeMicError,
    listAudioInputDevices,
    loadStoredCalibration,
    loadMicPrefs,
    saveMicPrefs,
  };
})();
