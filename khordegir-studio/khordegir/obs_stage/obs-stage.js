/* Khordegir Studio — Live OBS Browser Source Runtime (/obs-stage/)
   Phase 3 Item 11 upgrades:
   - Software noise suppression (80 Hz HPF + adaptive soft-knee noise gate + calibrated profile)
   - Push-to-Talk (Space / MIDI CC 64 / Stream Deck / WS command)
   - Emotion (1-0) & Gesture (Q-O) hotkeys + Web MIDI API + Stream Deck / BroadcastChannel / WS routing
   - Live end-to-end latency meter (< 100 ms target) & toggleable operator HUD (H key or ?hud=1)
   100% offline, fully deterministic, falls back seamlessly to prosody JSON when mic is off. */
(function () {
  "use strict";

  const FA = "۰۱۲۳۴۵۶۷۸۹";
  const fa = (v) => String(v ?? "").replace(/[0-9]/g, (d) => FA[+d]);
  const q = new URLSearchParams(window.location.search);
  const MT = window.StageMotionTokens || {};

  const canvas = document.getElementById("obsCanvas");
  const stageSlot = document.getElementById("stageSlot");
  const liveBadgePill = document.getElementById("liveBadgePill");
  const chapterOverlay = document.getElementById("chapterOverlay");
  const chapterIndex = document.getElementById("chapterIndex");
  const chapterTitle = document.getElementById("chapterTitle");
  const chapterBarFill = document.getElementById("chapterBarFill");
  const lowerThird = document.getElementById("lowerThird");
  const ltRole = document.getElementById("ltRole");
  const ltBadge = document.getElementById("ltBadge");
  const ltTitle = document.getElementById("ltTitle");
  const ltSubtitle = document.getElementById("ltSubtitle");

  // Optional Operator HUD nodes
  const hudEl = document.getElementById("obsLiveHud");
  const hudLatency = document.getElementById("hudLatency");
  const hudMicBtn = document.getElementById("hudMicBtn");
  const hudNsBtn = document.getElementById("hudNsBtn");
  const hudPttBtn = document.getElementById("hudPttBtn");
  const hudEmoChip = document.getElementById("hudEmoChip");
  const hudGestChip = document.getElementById("hudGestChip");
  const hudMidiChip = document.getElementById("hudMidiChip");
  const hudDebugBtn = document.getElementById("hudDebugBtn");
  const hudLangBtn = document.getElementById("hudLangBtn");
  const hudExportMapBtn = document.getElementById("hudExportMapBtn");

  const projectName = (q.get("project") || "").trim() || "default";
  const forceTransparent = q.get("transparent") === "1" || q.get("transparent") === "true";
  const forceMuted = q.get("sfx") === "0" || q.get("muted") === "1";
  const forceMic = q.get("mic") === "1" || q.get("mic") === "true";
  const forcePtt = q.get("ptt") === "1" || q.get("ptt") === "true";
  const forceHud = q.get("hud") === "1" || q.get("hud") === "true";
  const forceDebug = q.get("debug") === "1" || q.get("debug") === "true";
  const forceTone = (q.get("tone") || "").trim().toLowerCase();
  const initialLang = (q.get("lang") || "").trim().toLowerCase() === "en" ? "en" : "fa";

  const CALIBRATION_STORAGE_KEY = "khordegir_speaker_calibration_v1";

  let ws = null;
  let reconnectMs = 900;
  let reconnectTimer = null;
  let pingTimer = null;
  let lastSlideKey = "";
  let lastSfxSeq = -1;
  let lastLtVisible = false;
  let micStarted = false;
  let micRaf = null;
  let micStream = null;
  let micAudioCtx = null;
  let currentRoomState = null;
  let activeVoiceTracker = null;
  let hudVisible = forceHud;
  let debugVisible = forceDebug;
  let uiLang = initialLang;
  let activeEmotionLabel = "neutral";
  let activeGestureLabel = "—";
  let midiConnectedCount = 0;

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

  /* Lightweight YIN (CMNDF) autocorrelation F0 detector on Float32Array (65..500 Hz).
     Window 1024 samples @ 48 kHz = ~21.3 ms; total mic->rig latency stays well under 100 ms. */
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
    if (rms < 0.008) return 0;

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

  /* Deterministic 1-pole High-Pass Filter (80 Hz rumble/DC suppression for software noise suppression) */
  function applyHighPassFilter(inputBuf, sampleRate, cutoffHz = 80) {
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

  /* Phase 3 Item 11: Live Latency Meter (EWMA + Peak in ms) */
  function createLatencyTracker() {
    let avgMs = 0;
    let peakMs = 0;
    let samples = 0;
    return {
      record(ms) {
        const v = Math.max(0, Number(ms) || 0);
        samples += 1;
        avgMs = samples === 1 ? v : (avgMs * 0.85 + v * 0.15);
        if (v > peakMs) peakMs = v;
        else peakMs = Math.max(avgMs, peakMs * 0.992);
        return this.get();
      },
      reset() {
        avgMs = 0;
        peakMs = 0;
        samples = 0;
      },
      get() {
        const status = avgMs < 50 ? "ok" : (avgMs < 100 ? "warn" : "high");
        return {
          avgMs: +avgMs.toFixed(2),
          peakMs: +peakMs.toFixed(2),
          samples,
          underBudget: avgMs < 100,
          status,
        };
      },
    };
  }

  /* Live Voice Tracker with Software Noise Suppression, Calibrated Noise Gate, Hold, & Push-To-Talk */
  function createLiveVoiceTracker(initOpts = {}) {
    const opts = Object.assign({
      noiseSuppression: true,
      noiseGateDb: -46,
      gateHoldMs: 140,
      pttEnabled: false,
      pttActive: false,
      medianF0Hz: 0,
      pitchSpanSemitones: 6.0,
      p95Rms: 0.08,
    }, initOpts || {});

    const pitchRing = new Float32Array(60);
    let pitchCount = 0;
    let pitchCursor = 0;
    let envLoudness = 0;
    let peakRef = Math.max(0.05, Number(opts.p95Rms) || 0.08);
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

    function analyzeFrame(timeBuf, freqDbBuf, sampleRate, dtSec) {
      const procBuf = opts.noiseSuppression
        ? applyHighPassFilter(timeBuf, sampleRate || 48000, 80)
        : timeBuf;

      const n = procBuf.length;
      let sumSq = 0;
      let zc = 0;
      let prev = procBuf[0] || 0;
      for (let i = 0; i < n; i += 1) {
        const v = procBuf[i];
        sumSq += v * v;
        if (i > 0 && ((v >= 0 && prev < 0) || (v < 0 && prev >= 0))) zc += 1;
        prev = v;
      }
      const rms = Math.sqrt(sumSq / Math.max(1, n));
      const db = rms > 1e-6 ? clamp(20 * Math.log10(rms), -80, 0) : -80;
      const zcr = zc / Math.max(1, n - 1);
      const dtMs = Math.max(8, (Number(dtSec) || (1 / 60)) * 1000);

      // Push-to-Talk hard mute gate
      const pttMuted = Boolean(opts.pttEnabled && !opts.pttActive);
      const gateDb = clamp(Number(opts.noiseGateDb) || -46, -68, -22);

      let gateOpen = false;
      if (!pttMuted) {
        if (db >= gateDb) {
          gateOpen = true;
          gateHoldRemainMs = Math.max(0, Number(opts.gateHoldMs) || 140);
        } else if (gateHoldRemainMs > 0) {
          gateOpen = true;
          gateHoldRemainMs = Math.max(0, gateHoldRemainMs - dtMs);
        }
      } else {
        gateHoldRemainMs = 0;
      }

      if (gateOpen && rms > peakRef) peakRef = peakRef * 0.8 + rms * 0.2;
      else peakRef = Math.max(0.05, peakRef * (1 - 0.15 * (dtMs / 1000)));

      // Soft-knee attenuation near noise gate when noise suppression is on
      let rawLoud = 0;
      if (gateOpen && !pttMuted) {
        const norm = clamp(rms / Math.max(peakRef, 0.05), 0, 1);
        if (opts.noiseSuppression && db < gateDb + 4) {
          const knee = clamp((db - (gateDb - 4)) / 8, 0, 1);
          rawLoud = norm * knee;
        } else {
          rawLoud = norm;
        }
      }

      const atk = 1 - Math.exp(-dtMs / 24);
      const rel = 1 - Math.exp(-dtMs / 78);
      envLoudness += (rawLoud >= envLoudness ? atk : rel) * (rawLoud - envLoudness);
      if (pttMuted && envLoudness < 0.005) envLoudness = 0;

      const isSpeaking = !pttMuted && envLoudness >= 0.055;
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
      else if (envLoudness >= 0.64) viseme = "wide";
      else if (envLoudness >= 0.32) viseme = "open";
      else viseme = "small";

      const risingKick = Math.max(0, envLoudness - prevLoudness) * 2.2;
      prevLoudness = envLoudness;
      const emphasis = isSpeaking
        ? clamp((envLoudness > 0.52 ? (envLoudness - 0.38) * 1.45 : 0) + risingKick * 0.35, 0, 1)
        : 0;

      return {
        active: true,
        rms: +rms.toFixed(5),
        db: +db.toFixed(2),
        loudness: +envLoudness.toFixed(4),
        f0Hz: +f0Hz.toFixed(2),
        medianF0: +medF0.toFixed(2),
        pitchNorm: +smoothPitchNorm.toFixed(4),
        pitchDelta: +pitchDelta.toFixed(4),
        emphasis: +emphasis.toFixed(4),
        isSpeaking,
        viseme,
        pttEnabled: Boolean(opts.pttEnabled),
        pttActive: Boolean(opts.pttActive),
        pttMuted,
        noiseSuppression: Boolean(opts.noiseSuppression),
        noiseGateDb: gateDb,
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
      if (patch && patch.p95Rms > 0.01) {
        peakRef = Math.max(0.05, Number(patch.p95Rms));
      }
    };
    analyzeFrame.getOptions = function () {
      return Object.assign({}, opts, { medianF0Hz: calibratedMedianF0 || medianPitch(), pitchSpanSemitones: pitchSpanSemi });
    };
    return analyzeFrame;
  }

  /* Phase 3 Item 11: Deterministic Hotkey + Web MIDI + Stream Deck Command Router */
  function createLiveController(cfg = {}) {
    const hotkeys = cfg.hotkeys || MT.DEFAULT_LIVE_HOTKEYS || {
      emotions: { Digit1: "neutral", Digit2: "happy", Digit3: "angry", Digit4: "smug", Digit5: "shocked", Digit6: "thinking", Digit7: "sad", Digit8: "sarcastic", Digit9: "proud", Digit0: "confused" },
      gestures: { KeyQ: "point", KeyW: "shrug", KeyE: "facepalm", KeyR: "wing-cross", KeyT: "thumbs-up", KeyY: "clap", KeyU: "salute", KeyI: "chin-scratch", KeyO: "double-take" },
      pttKey: "Space",
      hudKey: "KeyH",
    };
    const midiMap = cfg.midiMap || MT.DEFAULT_MIDI_MAP || { notes: {}, cc: {} };

    function handleCommand(cmd) {
      if (!cmd || typeof cmd !== "object") return null;
      const type = String(cmd.type || "");
      if (type === "puppet:emotion" || type === "emotion") {
        const val = String(cmd.value || cmd.emotion || "neutral").toLowerCase();
        if (cfg.onEmotion) cfg.onEmotion(val, cmd.intensity);
        return { handled: true, type: "emotion", value: val };
      }
      if (type === "puppet:gesture" || type === "gesture") {
        const val = String(cmd.value || cmd.gesture || "").toLowerCase();
        if (val && cfg.onGesture) cfg.onGesture(val, { duration: cmd.duration, intensity: cmd.intensity });
        return { handled: Boolean(val), type: "gesture", value: val };
      }
      if (type === "puppet:ptt" || type === "ptt") {
        const active = Boolean(cmd.active ?? cmd.value);
        if (cfg.onPttChange) cfg.onPttChange(active, cmd.enabled);
        return { handled: true, type: "ptt", active };
      }
      if (type === "puppet:preset" || type === "preset") {
        const val = String(cmd.value || cmd.preset || "lively").toLowerCase();
        if (cfg.onPreset) cfg.onPreset(val);
        return { handled: true, type: "preset", value: val };
      }
      if (type === "puppet:intensity" || type === "emotionIntensity") {
        const val = clamp(Number(cmd.value) || 1.0, 0, 1.5);
        if (cfg.onIntensity) cfg.onIntensity(val);
        return { handled: true, type: "intensity", value: val };
      }
      if (type === "puppet:calibration" && cmd.calibration && cfg.onCalibration) {
        cfg.onCalibration(cmd.calibration);
        return { handled: true, type: "calibration" };
      }
      return null;
    }

    function handleKeyDown(code, repeat = false) {
      if (!code) return null;
      if (code === hotkeys.pttKey) {
        if (cfg.onPttChange) cfg.onPttChange(true);
        return { handled: true, type: "ptt", active: true };
      }
      if (repeat) return null;
      if (code === hotkeys.hudKey) {
        if (cfg.onToggleHud) cfg.onToggleHud();
        return { handled: true, type: "hud" };
      }
      if (code === "KeyD") {
        if (cfg.onToggleDebug) cfg.onToggleDebug();
        return { handled: true, type: "debug" };
      }
      if (hotkeys.emotions && hotkeys.emotions[code]) {
        const emo = hotkeys.emotions[code];
        if (cfg.onEmotion) cfg.onEmotion(emo);
        return { handled: true, type: "emotion", value: emo };
      }
      if (hotkeys.gestures && hotkeys.gestures[code]) {
        const gest = hotkeys.gestures[code];
        if (cfg.onGesture) cfg.onGesture(gest);
        return { handled: true, type: "gesture", value: gest };
      }
      return null;
    }

    function handleKeyUp(code) {
      if (code === hotkeys.pttKey) {
        if (cfg.onPttChange) cfg.onPttChange(false);
        return { handled: true, type: "ptt", active: false };
      }
      return null;
    }

    /* Decode standard 3-byte Web MIDI message [status, data1, data2] */
    function handleMidiBytes(bytes) {
      if (!bytes || bytes.length < 2) return null;
      const status = bytes[0] & 0xF0;
      const data1 = bytes[1];
      const data2 = bytes.length > 2 ? bytes[2] : 0;

      // Note On (velocity > 0)
      if (status === 0x90 && data2 > 0) {
        const entry = midiMap.notes && midiMap.notes[data1];
        if (!entry) return null;
        const velIntensity = clamp(0.6 + (data2 / 127) * 0.9, 0.5, 1.5);
        return handleCommand({ type: entry.type, value: entry.value, intensity: velIntensity });
      }
      // Control Change (CC)
      if (status === 0xB0) {
        const ccEntry = midiMap.cc && midiMap.cc[data1];
        if (!ccEntry) return null;
        if (ccEntry.type === "ptt") {
          return handleCommand({ type: "ptt", active: data2 >= 64, enabled: true });
        }
        if (ccEntry.type === "emotionIntensity") {
          return handleCommand({ type: "emotionIntensity", value: +(data2 / 127 * 1.5).toFixed(2) });
        }
      }
      return null;
    }

    function exportMappingProfile() {
      return {
        schema: "khordegir-obs-live-mapping",
        version: 1,
        hotkeys,
        midiMap,
        streamDeckCommands: [
          { label: "Emotion: Happy", wsMessage: { type: "puppet:emotion", value: "happy" } },
          { label: "Emotion: Angry", wsMessage: { type: "puppet:emotion", value: "angry" } },
          { label: "Emotion: Smug", wsMessage: { type: "puppet:emotion", value: "smug" } },
          { label: "Gesture: Point", wsMessage: { type: "puppet:gesture", value: "point" } },
          { label: "Gesture: Facepalm", wsMessage: { type: "puppet:gesture", value: "facepalm" } },
          { label: "Gesture: Thumbs Up", wsMessage: { type: "puppet:gesture", value: "thumbs-up" } },
          { label: "Push-To-Talk Hold", wsMessage: { type: "puppet:ptt", active: true, enabled: true } },
        ],
      };
    }

    return { handleCommand, handleKeyDown, handleKeyUp, handleMidiBytes, exportMappingProfile, hotkeys, midiMap };
  }

  window.ObsLiveVoice = {
    detectLivePitchYIN,
    applyHighPassFilter,
    createLatencyTracker,
    createLiveVoiceTracker,
    createLiveController,
  };

  function fitViewport() {
    if (!canvas) return;
    const vw = Math.max(320, window.innerWidth);
    const vh = Math.max(180, window.innerHeight);
    const scale = Math.min(vw / 1920, vh / 1080);
    canvas.style.transform = `scale(${scale})`;
  }

  window.addEventListener("resize", fitViewport);
  fitViewport();

  const latencyTracker = createLatencyTracker();
  const storedCal = loadStoredCalibration();
  let trackerConfig = {
    noiseSuppression: true,
    noiseGateDb: (storedCal && storedCal.noiseGateDb != null) ? storedCal.noiseGateDb : -46,
    medianF0Hz: (storedCal && storedCal.medianF0Hz) ? storedCal.medianF0Hz : 0,
    pitchSpanSemitones: (storedCal && storedCal.pitchSpanSemitones) ? storedCal.pitchSpanSemitones : 6.0,
    p95Rms: (storedCal && storedCal.p95Rms) ? storedCal.p95Rms : 0.08,
    pttEnabled: forcePtt,
    pttActive: false,
  };

  function syncHudUi(latStats) {
    if (!hudEl) return;
    const isEn = uiLang === "en";
    document.documentElement.lang = isEn ? "en" : "fa";
    document.documentElement.dir = isEn ? "ltr" : "rtl";
    hudEl.classList.toggle("hidden", !hudVisible);
    if (!hudVisible) return;
    if (hudMicBtn) {
      hudMicBtn.textContent = isEn
        ? (micStarted ? "Mic: ON" : "Mic: OFF")
        : (micStarted ? "میکروفن: روشن (Mic ON)" : "میکروفن: خاموش (Mic OFF)");
      hudMicBtn.classList.toggle("active", micStarted);
    }
    if (hudNsBtn) {
      hudNsBtn.textContent = isEn
        ? (trackerConfig.noiseSuppression ? "Noise Supp: ON" : "Noise Supp: OFF")
        : (trackerConfig.noiseSuppression ? "حذف نویز: روشن (NS ON)" : "حذف نویز: خاموش (NS OFF)");
      hudNsBtn.classList.toggle("active", trackerConfig.noiseSuppression);
    }
    if (hudPttBtn) {
      const pttTxt = isEn
        ? (!trackerConfig.pttEnabled ? "PTT (Space): OFF" : (trackerConfig.pttActive ? "PTT: TALKING ●" : "PTT: Hold Space"))
        : (!trackerConfig.pttEnabled ? "PTT (Space): خاموش" : (trackerConfig.pttActive ? "PTT: در حال صحبت ●" : "PTT: نگه دارید (Space)"));
      hudPttBtn.textContent = pttTxt;
      hudPttBtn.classList.toggle("active", trackerConfig.pttEnabled && !trackerConfig.pttActive);
      hudPttBtn.classList.toggle("ptt-live", trackerConfig.pttEnabled && trackerConfig.pttActive);
    }
    if (hudDebugBtn) {
      hudDebugBtn.textContent = isEn
        ? (debugVisible ? "Debug: ON" : "Debug: OFF")
        : (debugVisible ? "دیباگ: روشن" : "دیباگ: خاموش");
      hudDebugBtn.classList.toggle("active", debugVisible);
    }
    if (hudLangBtn) {
      hudLangBtn.textContent = isEn ? "فا / RTL" : "EN / LTR";
    }
    if (hudEmoChip) hudEmoChip.textContent = isEn ? `Emotion: ${activeEmotionLabel}` : `احساس: ${activeEmotionLabel}`;
    if (hudGestChip) hudGestChip.textContent = isEn ? `Gesture: ${activeGestureLabel}` : `ژست: ${activeGestureLabel}`;
    if (hudMidiChip) {
      hudMidiChip.textContent = isEn
        ? (midiConnectedCount > 0 ? `MIDI: Connected (${midiConnectedCount})` : "MIDI: Ready")
        : (midiConnectedCount > 0 ? `MIDI: متصل (${fa(midiConnectedCount)})` : "MIDI: آماده");
    }
    if (hudLatency && latStats) {
      hudLatency.textContent = `${latStats.avgMs.toFixed(1)} ms`;
      hudLatency.classList.toggle("warn", latStats.status === "warn");
      hudLatency.classList.toggle("high", latStats.status === "high");
    }
  }

  const liveController = createLiveController({
    onEmotion(name, intensity) {
      activeEmotionLabel = name;
      if (window.Stage && window.Stage.setLiveEmotion) {
        window.Stage.setLiveEmotion(name, intensity);
      }
      syncHudUi(latencyTracker.get());
    },
    onGesture(name, opts) {
      activeGestureLabel = name;
      if (window.Stage && window.Stage.triggerLiveGesture) {
        window.Stage.triggerLiveGesture(name, opts);
      }
      syncHudUi(latencyTracker.get());
    },
    onPttChange(active, forceEnable) {
      if (forceEnable === true) trackerConfig.pttEnabled = true;
      if (forceEnable === false) trackerConfig.pttEnabled = false;
      trackerConfig.pttActive = Boolean(active);
      if (activeVoiceTracker) {
        activeVoiceTracker.setOptions({ pttEnabled: trackerConfig.pttEnabled, pttActive: trackerConfig.pttActive });
      }
      syncHudUi(latencyTracker.get());
    },
    onPreset(presetName) {
      if (window.Stage && window.Stage.setMascotTone) {
        window.Stage.setMascotTone({ preset: presetName });
      }
    },
    onIntensity(val) {
      if (window.Stage && window.Stage.setLiveEmotion) {
        window.Stage.setLiveEmotion(activeEmotionLabel, val);
      }
    },
    onCalibration(cal) {
      if (!cal || typeof cal !== "object") return;
      trackerConfig.noiseGateDb = cal.noiseGateDb ?? trackerConfig.noiseGateDb;
      trackerConfig.medianF0Hz = cal.medianF0Hz ?? trackerConfig.medianF0Hz;
      trackerConfig.pitchSpanSemitones = cal.pitchSpanSemitones ?? trackerConfig.pitchSpanSemitones;
      trackerConfig.p95Rms = cal.p95Rms ?? trackerConfig.p95Rms;
      if (activeVoiceTracker) activeVoiceTracker.setOptions(trackerConfig);
    },
    onToggleHud() {
      hudVisible = !hudVisible;
      syncHudUi(latencyTracker.get());
    },
    onToggleDebug() {
      debugVisible = !debugVisible;
      if (window.Stage && window.Stage.setPuppetDebug) {
        window.Stage.setPuppetDebug({ enabled: debugVisible, showPivots: true, showGraphs: true });
      }
      syncHudUi(latencyTracker.get());
    },
  });

  window.addEventListener("keydown", (ev) => {
    const tag = (ev.target && ev.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    const res = liveController.handleKeyDown(ev.code, ev.repeat);
    if (res && res.type === "ptt") ev.preventDefault();
  });
  window.addEventListener("keyup", (ev) => {
    liveController.handleKeyUp(ev.code);
  });

  // Stream Deck / local iframe postMessage bridge
  window.addEventListener("message", (ev) => {
    if (ev && ev.data && typeof ev.data === "object") {
      liveController.handleCommand(ev.data);
    }
  });
  if (typeof BroadcastChannel === "function") {
    try {
      const bc = new BroadcastChannel("khordegir-obs-puppet");
      bc.onmessage = (ev) => {
        if (ev && ev.data) liveController.handleCommand(ev.data);
      };
    } catch (_) {}
  }

  // Offline Web MIDI API integration (Stream Deck MIDI / MIDI pads / Sustain Pedal PTT)
  function initWebMidi() {
    if (!navigator || typeof navigator.requestMIDIAccess !== "function") return;
    navigator.requestMIDIAccess({ sysex: false }).then((access) => {
      const bindInputs = () => {
        let count = 0;
        access.inputs.forEach((input) => {
          count += 1;
          input.onmidimessage = (msg) => {
            if (msg && msg.data) liveController.handleMidiBytes(msg.data);
          };
        });
        midiConnectedCount = count;
        syncHudUi(latencyTracker.get());
      };
      bindInputs();
      access.onstatechange = bindInputs;
    }).catch(() => {});
  }
  initWebMidi();

  // HUD interactive buttons
  if (hudMicBtn && typeof hudMicBtn.addEventListener === "function") {
    hudMicBtn.addEventListener("click", () => {
      if (micStarted) disableMicReactivity();
      else void enableMicReactivity();
      syncHudUi(latencyTracker.get());
    });
  }
  if (hudNsBtn && typeof hudNsBtn.addEventListener === "function") {
    hudNsBtn.addEventListener("click", () => {
      trackerConfig.noiseSuppression = !trackerConfig.noiseSuppression;
      if (activeVoiceTracker) activeVoiceTracker.setOptions({ noiseSuppression: trackerConfig.noiseSuppression });
      syncHudUi(latencyTracker.get());
    });
  }
  if (hudPttBtn && typeof hudPttBtn.addEventListener === "function") {
    hudPttBtn.addEventListener("click", () => {
      trackerConfig.pttEnabled = !trackerConfig.pttEnabled;
      trackerConfig.pttActive = false;
      if (activeVoiceTracker) activeVoiceTracker.setOptions({ pttEnabled: trackerConfig.pttEnabled, pttActive: false });
      syncHudUi(latencyTracker.get());
    });
  }
  if (hudDebugBtn && typeof hudDebugBtn.addEventListener === "function") {
    hudDebugBtn.addEventListener("click", () => {
      debugVisible = !debugVisible;
      if (window.Stage && window.Stage.setPuppetDebug) {
        window.Stage.setPuppetDebug({ enabled: debugVisible, showPivots: true, showGraphs: true });
      }
      syncHudUi(latencyTracker.get());
    });
  }
  if (hudLangBtn && typeof hudLangBtn.addEventListener === "function") {
    hudLangBtn.addEventListener("click", () => {
      uiLang = uiLang === "fa" ? "en" : "fa";
      syncHudUi(latencyTracker.get());
    });
  }
  if (hudExportMapBtn && typeof hudExportMapBtn.addEventListener === "function") {
    hudExportMapBtn.addEventListener("click", () => {
      const profile = liveController.exportMappingProfile();
      const blob = new Blob([JSON.stringify(profile, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "khordegir-obs-midi-streamdeck.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }

  // Audio unlock helper
  const unlockAudio = () => {
    if (window.StageSFX && !forceMuted) window.StageSFX.resume();
    if (micAudioCtx && micAudioCtx.state === "suspended") {
      micAudioCtx.resume().catch(() => {});
    }
  };
  window.addEventListener("pointerdown", unlockAudio, { passive: true });
  window.addEventListener("keydown", unlockAudio, { passive: true });

  function disableMicReactivity() {
    if (micRaf) cancelAnimationFrame(micRaf);
    micRaf = null;
    if (micStream) {
      try { micStream.getTracks().forEach((tr) => tr.stop()); } catch (_) {}
      micStream = null;
    }
    if (micAudioCtx) {
      try { micAudioCtx.close(); } catch (_) {}
      micAudioCtx = null;
    }
    micStarted = false;
    activeVoiceTracker = null;
    if (window.Stage && window.Stage.setLiveVoice) {
      window.Stage.setLiveVoice({ active: false });
    }
    syncHudUi(latencyTracker.get());
  }

  async function enableMicReactivity() {
    if (micStarted || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
    micStarted = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: trackerConfig.noiseSuppression,
          autoGainControl: false,
        },
      });
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) {
        micStarted = false;
        return;
      }
      micStream = stream;
      const ac = new AC({ latencyHint: "interactive" });
      micAudioCtx = ac;
      const src = ac.createMediaStreamSource(stream);

      // Clean broadcast mic chain: 85 Hz High-Pass Filter -> Gentle Compressor -> Analyser
      let headNode = src;
      if (typeof ac.createBiquadFilter === "function") {
        const hpf = ac.createBiquadFilter();
        hpf.type = "highpass";
        hpf.frequency.value = 85;
        hpf.Q.value = 0.707;
        headNode.connect(hpf);
        headNode = hpf;
      }
      if (typeof ac.createDynamicsCompressor === "function") {
        const comp = ac.createDynamicsCompressor();
        comp.threshold.value = -24;
        comp.knee.value = 18;
        comp.ratio.value = 3.0;
        comp.attack.value = 0.005;
        comp.release.value = 0.12;
        headNode.connect(comp);
        headNode = comp;
      }

      const analyser = ac.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0;
      headNode.connect(analyser);

      const timeBuf = new Float32Array(analyser.fftSize);
      const freqBuf = new Float32Array(analyser.frequencyBinCount);
      activeVoiceTracker = createLiveVoiceTracker(trackerConfig);
      latencyTracker.reset();
      let lastTs = performance.now();
      let hudFrameCounter = 0;

      const tick = (now) => {
        if (!micStarted) return;
        const t0 = performance.now();
        const dt = clamp((now - lastTs) / 1000, 0.006, 0.08);
        lastTs = now;
        analyser.getFloatTimeDomainData(timeBuf);
        analyser.getFloatFrequencyData(freqBuf);
        const voiceFrame = activeVoiceTracker(timeBuf, freqBuf, ac.sampleRate || 48000, dt);

        if (window.Stage) {
          if (window.Stage.setLiveVoice) {
            window.Stage.setLiveVoice(voiceFrame, dt);
          } else if (window.Stage.setMicLevel) {
            window.Stage.setMicLevel(voiceFrame.loudness);
          }
        }
        const procMs = performance.now() - t0;
        const baseLatMs = ((Number(ac.baseLatency) || 0) + (Number(ac.outputLatency) || 0)) * 1000;
        const winMs = (analyser.fftSize / (ac.sampleRate || 48000)) * 500;
        const lat = latencyTracker.record(baseLatMs + winMs + procMs);
        voiceFrame.latencyMs = lat.avgMs;

        hudFrameCounter += 1;
        if (hudVisible && hudFrameCounter % 6 === 0) {
          syncHudUi(lat);
        }
        micRaf = requestAnimationFrame(tick);
      };
      syncHudUi(latencyTracker.get());
      micRaf = requestAnimationFrame(tick);
    } catch {
      micStarted = false;
      activeVoiceTracker = null;
      if (window.Stage && window.Stage.setLiveVoice) {
        window.Stage.setLiveVoice({ active: false });
      }
      syncHudUi(latencyTracker.get());
    }
  }

  if (forceMic) void enableMicReactivity();
  syncHudUi(latencyTracker.get());

  function renderOverlays(state) {
    if (!state) return;
    const ov = state.overlay || {};
    const sfxAllowed = !forceMuted && ov.sfxEnabled !== false;
    if (window.StageSFX) {
      window.StageSFX.setMuted(!sfxAllowed);
    }

    if (ov.micReactive || forceMic) {
      void enableMicReactivity();
    } else if (micStarted) {
      disableMicReactivity();
    }

    liveBadgePill.classList.toggle("hidden", !ov.showLiveBadge);

    const ch = state.chapter || {};
    const showChapter = Boolean(ch.visible && ov.showChapterBar !== false && (ch.title || ch.index));
    chapterOverlay.classList.toggle("hidden", !showChapter);
    if (showChapter) {
      const idx = Math.max(1, Number(ch.index) || 1);
      const total = Math.max(idx, Number(ch.total) || 1);
      chapterIndex.textContent = `فصل ${fa(idx)} از ${fa(total)}`;
      chapterTitle.textContent = ch.title || "";
      chapterBarFill.style.width = `${Math.max(8, Math.min(100, (idx / total) * 100)).toFixed(1)}%`;
    }

    const lt = state.lowerThird || {};
    const showLt = Boolean(lt.visible && (lt.title || lt.subtitle));
    document.body.classList.toggle("has-lower-third", showLt);
    if (showLt) {
      lowerThird.className = `obs-lower-third style-${lt.style || "glass-amber"} side-${lt.side === "left" ? "left" : "right"}`;
      ltRole.textContent = lt.role || "میزبان";
      ltBadge.textContent = lt.badge || "LIVE";
      ltBadge.classList.toggle("hidden", !lt.badge);
      ltTitle.textContent = lt.title || "";
      ltSubtitle.textContent = lt.subtitle || "";
      ltSubtitle.classList.toggle("hidden", !lt.subtitle);

      if (!lastLtVisible && window.gsap) {
        const fromX = lt.side === "left" ? -120 : 120;
        window.gsap.fromTo(
          lowerThird,
          { opacity: 0, x: fromX, scale: 0.96 },
          { opacity: 1, x: 0, scale: 1, duration: 0.55, ease: "power4.out" }
        );
      }
    } else if (lastLtVisible && window.gsap) {
      const toX = lt.side === "left" ? -90 : 90;
      window.gsap.to(lowerThird, {
        opacity: 0,
        x: toX,
        duration: 0.32,
        ease: "power2.in",
        onComplete: () => lowerThird.classList.add("hidden"),
      });
    } else {
      lowerThird.classList.add("hidden");
    }
    lastLtVisible = showLt;
  }

  async function renderStageFromState(state) {
    if (!state) return;
    currentRoomState = state;
    renderOverlays(state);

    const ov = state.overlay || {};
    const transparent = forceTransparent || Boolean(ov.transparentBg);
    document.documentElement.classList.toggle("is-transparent", transparent);
    document.body.classList.toggle("is-transparent", transparent);
    if (window.Stage && window.Stage.setTransparent) {
      window.Stage.setTransparent(transparent);
    }

    const layout = String(state.layout || (state.activeSlide && state.activeSlide.layout) || "SCAM").toUpperCase();
    const isCamOnly = layout === "CAM" || !state.activeSlide;
    stageSlot.classList.toggle("is-hidden", isCamOnly);
    if (isCamOnly) {
      if (window.Stage && window.Stage.stop) window.Stage.stop();
      return;
    }

    const slide = Object.assign({}, state.activeSlide);
    slide.layout = layout;
    if (state.livingStage) {
      slide.livingStage = Object.assign({}, slide.livingStage || {}, state.livingStage);
    }
    if (ov.showLogo === false) {
      slide.logo = false;
    }

    // Apply calibrated speaker profile & live OBS flags from slide.puppet if present
    if (slide.puppet && slide.puppet.calibration && slide.puppet.calibration.calibrated) {
      liveController.handleCommand({ type: "puppet:calibration", calibration: slide.puppet.calibration });
    }
    if (slide.puppet && slide.puppet.live) {
      trackerConfig.noiseSuppression = slide.puppet.live.noiseSuppression !== false;
      if (slide.puppet.live.pushToTalk != null && !forcePtt) {
        trackerConfig.pttEnabled = Boolean(slide.puppet.live.pushToTalk);
      }
      if (activeVoiceTracker) activeVoiceTracker.setOptions(trackerConfig);
    }

    const nextKey = JSON.stringify({
      theme: state.theme || "",
      layout,
      transparent,
      livingStage: slide.livingStage || null,
      slide,
    });
    if (nextKey === lastSlideKey) return;
    lastSlideKey = nextKey;

    stageSlot.classList.add("is-switching");
    try {
      await window.Stage.load(slide, {
        theme: state.theme || "khordegir-dark",
        transparent,
        liveLoop: true,
      });
      if (forceTone && window.Stage && window.Stage.setMascotTone) {
        window.Stage.setMascotTone({ preset: forceTone });
      }
      window.Stage.play(0, { liveLoop: true });
    } catch (err) {
      console.error("obs-stage render error:", err);
    } finally {
      stageSlot.classList.remove("is-switching");
    }
  }

  function handleSfxEvent(state, delta) {
    if (!delta || !delta.sound || forceMuted) return;
    const ov = (state && state.overlay) || {};
    if (ov.sfxEnabled === false) return;
    const seq = Number(state && state.sfxSeq) || 0;
    if (seq && seq <= lastSfxSeq) return;
    if (seq) lastSfxSeq = seq;
    if (window.StageSFX) {
      window.StageSFX.play(delta.sound, delta.volume ?? 0.75);
    }
  }

  function connectWs() {
    clearTimeout(reconnectTimer);
    clearInterval(pingTimer);

    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${proto}//${window.location.host}/ws/live?project=${encodeURIComponent(projectName)}&role=viewer`;
    try {
      ws = new WebSocket(wsUrl);
    } catch {
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      reconnectMs = 900;
      pingTimer = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 20000);
    };

    ws.onmessage = (ev) => {
      let msg;
      try {
        msg = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      if (!msg || !msg.type) return;

      if (msg.type === "room:init") {
        lastSfxSeq = Number(msg.state && msg.state.sfxSeq) || 0;
        void renderStageFromState(msg.state);
      } else if (msg.type === "room:state" || msg.type === "room:overlay") {
        void renderStageFromState(msg.state);
      } else if (msg.type === "room:lower_third" || msg.type === "room:chapter" || msg.type === "room:presence") {
        currentRoomState = msg.state;
        renderOverlays(msg.state);
      } else if (msg.type === "room:sfx") {
        handleSfxEvent(msg.state, msg.delta);
      } else if (msg.type.startsWith("puppet:") || msg.type === "room:puppet_live") {
        liveController.handleCommand(msg.payload || msg.delta || msg);
      }
    };

    ws.onclose = () => {
      clearInterval(pingTimer);
      scheduleReconnect();
    };

    ws.onerror = () => {};
  }

  function scheduleReconnect() {
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      reconnectMs = Math.min(6000, Math.round(reconnectMs * 1.45));
      connectWs();
    }, reconnectMs);
  }

  async function boot() {
    try {
      const resp = await fetch(`/api/live/${encodeURIComponent(projectName)}`);
      if (resp.ok) {
        const json = await resp.json();
        if (json && json.state) {
          lastSfxSeq = Number(json.state.sfxSeq) || 0;
          await renderStageFromState(json.state);
        }
      }
    } catch {
      // WS will hydrate on connect
    }
    connectWs();
  }

  void boot();
})();
