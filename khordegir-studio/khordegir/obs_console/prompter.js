/**
 * Teleprompter engine (plain ES module):
 * - Navigation (next, prev, jump to step, jump to act start)
 * - View mode switching (prompter | overview | split)
 * - Auto-scroll (requestAnimationFrame delta loop, speed control)
 * - Font size & mirror toggle (persisted in localStorage)
 * - Pre-record countdown timer
 * - Per-act elapsed timer & take log (per-act durations)
 */

const STORAGE_KEY = 'khordegir_obs_console_v1';
const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
export const VALID_VIEW_MODES = ['prompter', 'overview', 'split'];

export function toPersianDigits(val) {
  return String(val).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)] ?? d);
}

export function formatMMSS(totalSec) {
  const safe = Math.max(0, Math.round(totalSec));
  const mm = String(Math.floor(safe / 60)).padStart(2, '0');
  const ss = String(safe % 60).padStart(2, '0');
  return toPersianDigits(`${mm}:${ss}`);
}

export function loadSavedPrefs() {
  const defaults = {
    fontSizePx: 46,
    mirror: false,
    focusMode: false,
    autoScroll: false,
    scrollSpeed: 1.2,
    clickTextToAdvance: true,
    countdownSec: 3,
    viewMode: 'prompter', // prompter | overview | split
    wsUrl: 'ws://127.0.0.1:4455',
    wsPassword: '',
    slidesDir: '',
    autoReconnect: true,
    syncObsOnStep: true,
    osTarget: 'linux',
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const merged = { ...defaults, ...JSON.parse(raw) };
    if (!VALID_VIEW_MODES.includes(merged.viewMode)) {
      merged.viewMode = 'prompter';
    }
    merged.focusMode = Boolean(merged.focusMode);
    return merged;
  } catch {
    return defaults;
  }
}

export function savePrefs(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore storage errors
  }
}

export function computeActSummaries(steps, takes, currentRecording) {
  const byAct = new Map();
  steps.forEach((step, idx) => {
    const act = Number(step.act || 1);
    if (!byAct.has(act)) {
      byAct.set(act, {
        act,
        stepCount: 1,
        firstIndex: idx,
        lastIndex: idx,
        takes: [],
        latestDurationSec: null,
        isRecording: false,
      });
    } else {
      const entry = byAct.get(act);
      entry.stepCount += 1;
      entry.lastIndex = idx;
    }
  });

  const list = Array.from(byAct.values()).sort((a, b) => a.act - b.act);
  for (const item of list) {
    const actTakes = takes.filter((t) => Number(t.act) === item.act);
    item.takes = actTakes;
    const latest = actTakes[actTakes.length - 1];
    item.latestDurationSec = latest ? Math.max(0, latest.stopSec - latest.startSec) : null;
    if (currentRecording && Number(currentRecording.act) === item.act) {
      item.isRecording = true;
    }
  }
  return list;
}

export function computeTotalRecordedSec(takes) {
  const latestByAct = new Map();
  for (const t of takes) {
    latestByAct.set(Number(t.act), t);
  }
  let total = 0;
  for (const t of latestByAct.values()) {
    total += Math.max(0, t.stopSec - t.startSec);
  }
  return total;
}

export class TeleprompterController {
  constructor({ onChange }) {
    this.steps = [];
    this.currentIndex = 0;
    this.takes = [];
    this.activeRec = null; // { act, startMs, startSec }
    this.actStartedMs = Date.now();
    this.scrollOffset = 0;
    this.lastFrameMs = 0;
    this.rafId = 0;
    this.countdownTimer = null;
    this.countdownRemaining = 0;
    this.prefs = loadSavedPrefs();
    this.onChange = onChange;
  }

  setSteps(steps, preserveIndex = true) {
    this.steps = Array.isArray(steps) ? steps : [];
    if (!preserveIndex || this.currentIndex >= this.steps.length) {
      this.currentIndex = 0;
    }
    this.scrollOffset = 0;
    this.actStartedMs = Date.now();
    this.notify();
  }

  currentStep() {
    return this.steps[this.currentIndex] || null;
  }

  nextStep() {
    return this.steps[this.currentIndex + 1] || null;
  }

  updatePrefs(patch) {
    const wasAuto = this.prefs.autoScroll;
    const nextPrefs = { ...this.prefs, ...patch };
    if (!VALID_VIEW_MODES.includes(nextPrefs.viewMode)) {
      nextPrefs.viewMode = 'prompter';
    }
    nextPrefs.focusMode = Boolean(nextPrefs.focusMode);
    this.prefs = nextPrefs;
    savePrefs(this.prefs);
    if (!wasAuto && this.prefs.autoScroll) {
      this.startAutoScrollLoop();
    } else if (wasAuto && !this.prefs.autoScroll) {
      this.stopAutoScrollLoop();
    }
    this.notify();
  }

  toggleFocusMode() {
    const nextFocus = !this.prefs.focusMode;
    this.updatePrefs({ focusMode: nextFocus });
    return nextFocus;
  }

  cycleViewMode() {
    const idx = VALID_VIEW_MODES.indexOf(this.prefs.viewMode);
    const nextMode = VALID_VIEW_MODES[(idx + 1) % VALID_VIEW_MODES.length];
    this.updatePrefs({ viewMode: nextMode });
    return nextMode;
  }

  jumpTo(index) {
    if (!this.steps.length) return null;
    const prevAct = this.currentStep()?.act;
    const nextIdx = Math.max(0, Math.min(this.steps.length - 1, Number(index) || 0));
    this.currentIndex = nextIdx;
    this.scrollOffset = 0;
    if (this.currentStep()?.act !== prevAct) {
      this.actStartedMs = Date.now();
    }
    this.notify();
    return this.currentStep();
  }

  next() {
    if (this.currentIndex < this.steps.length - 1) {
      return this.jumpTo(this.currentIndex + 1);
    }
    return this.currentStep();
  }

  prev() {
    if (this.currentIndex > 0) {
      return this.jumpTo(this.currentIndex - 1);
    }
    return this.currentStep();
  }

  jumpToActStart(actNum) {
    const targetAct = actNum ?? this.currentStep()?.act ?? 1;
    const idx = this.steps.findIndex((s) => Number(s.act) === Number(targetAct));
    this.actStartedMs = Date.now();
    return this.jumpTo(idx >= 0 ? idx : 0);
  }

  getActElapsedSec() {
    return Math.max(0, Math.floor((Date.now() - this.actStartedMs) / 1000));
  }

  getActiveRecElapsedSec() {
    if (!this.activeRec) return 0;
    return Math.max(0, Math.floor((Date.now() - this.activeRec.startMs) / 1000));
  }

  startRecordingState(actOverride) {
    if (this.activeRec) return;
    const act = Number(actOverride ?? this.currentStep()?.act ?? 1);
    const nowMs = Date.now();
    this.activeRec = {
      act,
      startMs: nowMs,
      startSec: Math.floor(nowMs / 1000),
    };
    this.actStartedMs = nowMs;
    this.notify();
  }

  stopRecordingState(filePath = '') {
    if (!this.activeRec) return null;
    const stopMs = Date.now();
    const stopSec = Math.max(this.activeRec.startSec + 1, Math.floor(stopMs / 1000));
    const act = this.activeRec.act;
    const takeNum = this.takes.filter((t) => t.act === act).length + 1;
    const record = {
      act,
      take: takeNum,
      startSec: this.activeRec.startSec,
      stopSec,
      durationSec: stopSec - this.activeRec.startSec,
      timestampLabel: new Date(stopMs).toLocaleTimeString('fa-IR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      file: filePath || '',
    };
    this.takes.push(record);
    this.activeRec = null;
    this.notify();
    return record;
  }

  clearTakes() {
    this.takes = [];
    this.notify();
  }

  startCountdown(seconds, onComplete) {
    this.cancelCountdown();
    const count = Math.max(0, Number(seconds) || 0);
    if (count === 0) {
      onComplete();
      return;
    }
    this.countdownRemaining = count;
    this.notify();
    this.countdownTimer = setInterval(() => {
      this.countdownRemaining -= 1;
      if (this.countdownRemaining <= 0) {
        this.cancelCountdown();
        onComplete();
      } else {
        this.notify();
      }
    }, 1000);
  }

  cancelCountdown() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    if (this.countdownRemaining !== 0) {
      this.countdownRemaining = 0;
      this.notify();
    }
  }

  startAutoScrollLoop() {
    if (this.rafId) return;
    this.lastFrameMs = performance.now();
    const tick = (now) => {
      if (!this.prefs.autoScroll) {
        this.rafId = 0;
        return;
      }
      const dt = Math.min(0.1, (now - this.lastFrameMs) / 1000);
      this.lastFrameMs = now;
      this.scrollOffset -= this.prefs.scrollSpeed * 42 * dt;
      this.onChange({ scrollOnly: true, controller: this });
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stopAutoScrollLoop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  notify() {
    this.onChange({ scrollOnly: false, controller: this });
  }
}
