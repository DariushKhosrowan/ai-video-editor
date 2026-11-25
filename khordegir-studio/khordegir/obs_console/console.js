/**
 * Main entrypoint for Khordegir Studio OBS Console (/obs/).
 * Plain ES module — zero build step, offline 127.0.0.1 only.
 * Works completely standalone (overview/teleprompter + keyboard/click advance + timers/takes)
 * with OBS WebSocket treated strictly as an optional enhancement.
 */
import { OBS_SCENES, ObsWebSocketClient } from './obs-ws.js';
import {
  TeleprompterController,
  VALID_VIEW_MODES,
  computeActSummaries,
  computeTotalRecordedSec,
  formatMMSS,
  toPersianDigits,
} from './prompter.js';

const $ = (id) => document.getElementById(id);

const els = {
  projectSelect: $('projectSelect'),
  projectSubtitle: $('projectSubtitle'),
  btnReloadSteps: $('btnReloadSteps'),
  btnToggleDock: $('btnToggleDock'),
  btnFocusMode: $('btnFocusMode'),
  btnOpenExport: $('btnOpenExport'),
  cueAct: $('cueAct'),
  cueStep: $('cueStep'),
  cueLayout: $('cueLayout'),
  cueSlideWrap: $('cueSlideWrap'),
  cueSlide: $('cueSlide'),
  cueTimeWrap: $('cueTimeWrap'),
  cueTime: $('cueTime'),
  btnModePrompter: $('btnModePrompter'),
  btnModeOverview: $('btnModeOverview'),
  btnModeSplit: $('btnModeSplit'),
  actTimer: $('actTimer'),
  recBadge: $('recBadge'),
  recTimer: $('recTimer'),
  wsBadge: $('wsBadge'),
  nextCueBar: $('nextCueBar'),
  fallbackBanner: $('fallbackBanner'),
  fallbackMessage: $('fallbackMessage'),
  btnBannerFocus: $('btnBannerFocus'),
  btnBannerRetry: $('btnBannerRetry'),
  btnBannerDismiss: $('btnBannerDismiss'),
  stageBody: $('stageBody'),
  prompterWrap: $('prompterWrap'),
  prompterText: $('prompterText'),
  overviewPane: $('overviewPane'),
  overviewCount: $('overviewCount'),
  overviewList: $('overviewList'),
  countdownOverlay: $('countdownOverlay'),
  countdownNumber: $('countdownNumber'),
  btnCancelCountdown: $('btnCancelCountdown'),
  btnNext: $('btnNext'),
  btnPrev: $('btnPrev'),
  btnActStart: $('btnActStart'),
  btnRecord: $('btnRecord'),
  btnAutoScroll: $('btnAutoScroll'),
  btnSpeedDown: $('btnSpeedDown'),
  speedReadout: $('speedReadout'),
  btnSpeedUp: $('btnSpeedUp'),
  btnFontDown: $('btnFontDown'),
  fontReadout: $('fontReadout'),
  btnFontUp: $('btnFontUp'),
  btnMirror: $('btnMirror'),
  countdownSelect: $('countdownSelect'),
  chkClickAdvance: $('chkClickAdvance'),
  totalRecordedLabel: $('totalRecordedLabel'),
  actTimeline: $('actTimeline'),
  obsConnLabel: $('obsConnLabel'),
  statVersion: $('statVersion'),
  statScene: $('statScene'),
  statStudio: $('statStudio'),
  statRec: $('statRec'),
  wsUrlInput: $('wsUrlInput'),
  wsPassInput: $('wsPassInput'),
  slidesDirInput: $('slidesDirInput'),
  chkAutoReconnect: $('chkAutoReconnect'),
  chkSyncObsOnStep: $('chkSyncObsOnStep'),
  obsNoticeBox: $('obsNoticeBox'),
  btnConnectObs: $('btnConnectObs'),
  btnDisconnectObs: $('btnDisconnectObs'),
  btnStudioSync: $('btnStudioSync'),
  zoomStateLabel: $('zoomStateLabel'),
  btnSceneSlide: $('btnSceneSlide'),
  btnSceneScam: $('btnSceneScam'),
  btnSceneCam: $('btnSceneCam'),
  btnZoomToggle: $('btnZoomToggle'),
  btnZoomOut: $('btnZoomOut'),
  btnMotionToggle: $('btnMotionToggle'),
  btnPushSlide: $('btnPushSlide'),
  btnClearTakes: $('btnClearTakes'),
  takeSummaryList: $('takeSummaryList'),
  takeLogBody: $('takeLogBody'),
  exportModal: $('exportModal'),
  btnCloseExport: $('btnCloseExport'),
  exportOsSelect: $('exportOsSelect'),
  chkExportPng: $('chkExportPng'),
  exportResult: $('exportResult'),
  btnRunExport: $('btnRunExport'),
};

let currentProjectName = '';
let currentProjectTitle = '';
let fallbackBannerDismissed = false;
const obs = new ObsWebSocketClient();

const prompter = new TeleprompterController({
  onChange: ({ scrollOnly }) => {
    if (scrollOnly) {
      els.prompterText.style.transform = `translateY(${prompter.scrollOffset.toFixed(1)}px)`;
      return;
    }
    renderPrompter();
  },
});

let focusFitRaf = 0;

function fitFocusText() {
  if (!prompter.prefs.focusMode) return;
  const wrap = els.prompterWrap;
  const textEl = els.prompterText;
  if (!wrap || !textEl || wrap.clientHeight <= 0 || wrap.clientWidth <= 0) return;

  let lo = 14;
  let hi = Math.max(72, Math.min(320, Math.floor(wrap.clientHeight * 0.75)));
  let best = lo;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    textEl.style.setProperty('--fs', `${mid}px`);
    if (textEl.scrollHeight <= wrap.clientHeight && textEl.scrollWidth <= wrap.clientWidth) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  textEl.style.setProperty('--fs', `${best}px`);
}

function scheduleFitFocusText() {
  if (!prompter.prefs.focusMode) return;
  if (focusFitRaf) cancelAnimationFrame(focusFitRaf);
  focusFitRaf = requestAnimationFrame(() => {
    focusFitRaf = 0;
    fitFocusText();
  });
}

function renderViewMode() {
  const mode = prompter.prefs.viewMode || 'prompter';
  const isFocus = Boolean(prompter.prefs.focusMode);
  els.stageBody.classList.remove('mode-prompter', 'mode-overview', 'mode-split');
  els.stageBody.classList.add(isFocus ? 'mode-prompter' : `mode-${mode}`);

  const showPrompter = isFocus || mode === 'prompter' || mode === 'split';
  const showOverview = !isFocus && (mode === 'overview' || mode === 'split');

  els.prompterWrap.classList.toggle('hidden', !showPrompter);
  els.overviewPane.classList.toggle('hidden', !showOverview);

  for (const btn of [els.btnModePrompter, els.btnModeOverview, els.btnModeSplit]) {
    btn.classList.toggle('active', btn.dataset.view === mode);
  }
}

function renderOverview() {
  const steps = prompter.steps || [];
  els.overviewCount.textContent = `${toPersianDigits(steps.length)} مرحله`;
  els.overviewList.innerHTML = '';

  if (!steps.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-cell';
    empty.textContent = 'مرحله‌ای برای نمایش وجود ندارد.';
    els.overviewList.appendChild(empty);
    return;
  }

  const byAct = new Map();
  steps.forEach((step, idx) => {
    const act = Number(step.act || 1);
    if (!byAct.has(act)) byAct.set(act, []);
    byAct.get(act).push({ step, idx });
  });

  const sortedActs = Array.from(byAct.keys()).sort((a, b) => a - b);
  let activeCard = null;

  for (const act of sortedActs) {
    const group = document.createElement('div');
    group.className = 'ov-act-group';

    const header = document.createElement('div');
    header.className = 'ov-act-header';
    const actTitle = document.createElement('span');
    actTitle.textContent = `پرده ${toPersianDigits(act)}`;
    const actMeta = document.createElement('span');
    actMeta.className = 'ov-act-meta';
    const entries = byAct.get(act);
    const actTakes = prompter.takes.filter((t) => Number(t.act) === act);
    actMeta.textContent = actTakes.length
      ? `${toPersianDigits(entries.length)} مرحله · ${toPersianDigits(actTakes.length)} برداشت`
      : `${toPersianDigits(entries.length)} مرحله`;
    header.append(actTitle, actMeta);
    group.appendChild(header);

    for (const { step, idx } of entries) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'ov-step-card';
      if (idx === prompter.currentIndex) {
        card.classList.add('is-current');
        activeCard = card;
      }

      const meta = document.createElement('div');
      meta.className = 'ov-step-meta';

      const numSpan = document.createElement('span');
      numSpan.className = 'ov-step-num';
      numSpan.textContent = `مرحله ${toPersianDigits(step.n)}`;

      const laySpan = document.createElement('span');
      laySpan.className = 'ov-step-tag';
      laySpan.textContent = step.lay || step.layout;

      meta.append(numSpan, laySpan);

      if (step.slide > 0) {
        const slideSpan = document.createElement('span');
        slideSpan.className = 'ov-step-tag';
        slideSpan.textContent = `اسلاید ${toPersianDigits(step.slide)}`;
        meta.appendChild(slideSpan);
      }

      if (step.time) {
        const timeSpan = document.createElement('span');
        timeSpan.className = 'mono-num';
        timeSpan.textContent = toPersianDigits(step.time);
        meta.appendChild(timeSpan);
      }

      const body = document.createElement('div');
      body.className = 'ov-step-text';
      body.textContent = step.text || '（بدون متن گفتار در این مرحله）';

      card.append(meta, body);
      card.onclick = () => {
        const dir = idx > prompter.currentIndex ? 'next' : idx < prompter.currentIndex ? 'prev' : 'jump';
        jumpAndSyncStep(() => prompter.jumpTo(idx), dir);
      };
      card.ondblclick = () => {
        prompter.updatePrefs({ viewMode: 'prompter' });
      };

      group.appendChild(card);
    }

    els.overviewList.appendChild(group);
  }

  if (activeCard && typeof activeCard.scrollIntoView === 'function') {
    activeCard.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function renderPrompter() {
  const prefs = prompter.prefs;
  const step = prompter.currentStep();
  const next = prompter.nextStep();
  const total = prompter.steps.length;
  const isFocus = Boolean(prefs.focusMode);

  renderViewMode();
  document.body.classList.toggle('mirror', Boolean(prefs.mirror));
  document.body.classList.toggle('focus-mode', isFocus);
  if (els.btnFocusMode) {
    els.btnFocusMode.classList.toggle('btn-active', isFocus);
    els.btnFocusMode.setAttribute('aria-pressed', isFocus ? 'true' : 'false');
    els.btnFocusMode.textContent = isFocus ? 'خروج از تمرکز (F)' : 'حالت تمرکز (F)';
  }
  els.prompterWrap.classList.toggle('clickable', Boolean(prefs.clickTextToAdvance || isFocus));
  if (!isFocus) {
    els.prompterText.style.setProperty('--fs', `${prefs.fontSizePx}px`);
  }
  els.prompterText.style.transform = `translateY(${prompter.scrollOffset.toFixed(1)}px)`;

  els.fontReadout.textContent = `${toPersianDigits(prefs.fontSizePx)}px`;
  els.speedReadout.textContent = `${toPersianDigits(prefs.scrollSpeed.toFixed(1))}x`;
  els.btnAutoScroll.classList.toggle('btn-active', Boolean(prefs.autoScroll));
  els.btnAutoScroll.textContent = prefs.autoScroll ? '⏸ توقف اسکرول' : '▶ اسکرول خودکار';
  els.btnMirror.classList.toggle('btn-active', Boolean(prefs.mirror));
  els.chkClickAdvance.checked = Boolean(prefs.clickTextToAdvance);
  els.countdownSelect.value = String(prefs.countdownSec);

  if (prompter.countdownRemaining > 0) {
    els.countdownOverlay.classList.remove('hidden');
    els.countdownNumber.textContent = toPersianDigits(prompter.countdownRemaining);
  } else {
    els.countdownOverlay.classList.add('hidden');
  }

  if (!step) {
    els.cueAct.textContent = '—';
    els.cueStep.textContent = 'مرحله‌ای بارگذاری نشده';
    els.cueLayout.textContent = '';
    els.cueSlideWrap.classList.add('hidden');
    els.cueTimeWrap.classList.add('hidden');
    els.nextCueBar.textContent = 'یک پروژه با اسلاید انتخاب کنید.';
    els.prompterText.textContent = '';
    els.btnNext.disabled = true;
    els.btnPrev.disabled = true;
    renderOverview();
    renderTimelineAndTakes();
    return;
  }

  els.cueAct.textContent = `پرده ${toPersianDigits(step.act)}`;
  els.cueStep.textContent = `مرحله ${toPersianDigits(step.n)} از ${toPersianDigits(total)}`;
  els.cueLayout.textContent = step.lay || step.layout;

  if (step.slide > 0) {
    els.cueSlideWrap.classList.remove('hidden');
    els.cueSlide.textContent = `اسلاید ${toPersianDigits(step.slide)}`;
  } else {
    els.cueSlideWrap.classList.add('hidden');
  }

  if (step.time) {
    els.cueTimeWrap.classList.remove('hidden');
    els.cueTime.textContent = toPersianDigits(step.time);
  } else {
    els.cueTimeWrap.classList.add('hidden');
  }

  if (next) {
    const slideTxt = next.slide > 0 ? ` · اسلاید ${toPersianDigits(next.slide)}` : '';
    const actEnd = next.act !== step.act ? ' — پایان پرده (آماده قطع ضبط)' : '';
    els.nextCueBar.textContent = `بعدی: ${next.lay || next.layout}${slideTxt}${actEnd}`;
  } else {
    els.nextCueBar.textContent = 'پایان اسکریپت';
  }

  els.prompterText.textContent = step.text || '（بدون متن گفتار در این مرحله）';
  els.prompterWrap.scrollTop = 0;

  if (isFocus) {
    fitFocusText();
    scheduleFitFocusText();
  }

  els.btnNext.disabled = prompter.currentIndex >= total - 1;
  els.btnPrev.disabled = prompter.currentIndex <= 0;

  // Highlight active scene button
  const curLayout = String(step.layoutKey || step.layout || 'SCAM').toUpperCase();
  for (const btn of [els.btnSceneSlide, els.btnSceneScam, els.btnSceneCam]) {
    btn.classList.toggle('active', btn.dataset.layout === curLayout);
  }

  renderOverview();
  renderTimers();
  renderTimelineAndTakes();
}

function renderTimers() {
  els.actTimer.textContent = formatMMSS(prompter.getActElapsedSec());
  const obsSnap = obs.getSnapshot();
  const isRec = obsSnap.status === 'connected' ? obsSnap.recording : Boolean(prompter.activeRec);

  els.btnRecord.classList.toggle('recording', isRec);
  els.btnRecord.textContent = isRec ? '■ توقف ضبط' : '● شروع ضبط';

  if (isRec) {
    els.recBadge.classList.remove('hidden');
    els.recTimer.textContent = formatMMSS(prompter.getActiveRecElapsedSec());
  } else {
    els.recBadge.classList.add('hidden');
  }
}

function renderTimelineAndTakes() {
  const summaries = computeActSummaries(prompter.steps, prompter.takes, prompter.activeRec);
  const currentAct = prompter.currentStep()?.act;

  els.actTimeline.innerHTML = '';
  for (const act of summaries) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'act-card';
    if (act.act === currentAct) btn.classList.add('here');
    if (act.isRecording) btn.classList.add('rec');
    else if (act.latestDurationSec !== null) btn.classList.add('done');

    const title = document.createElement('strong');
    title.textContent = `پرده ${toPersianDigits(act.act)}`;
    const sub = document.createElement('span');
    if (act.isRecording) {
      sub.textContent = `در حال ضبط · ${formatMMSS(prompter.getActiveRecElapsedSec())}`;
    } else if (act.latestDurationSec !== null) {
      sub.textContent = `برداشت ${toPersianDigits(act.takes.length)} · ${formatMMSS(act.latestDurationSec)}`;
    } else {
      sub.textContent = `${toPersianDigits(act.stepCount)} مرحله`;
    }
    btn.append(title, sub);
    btn.onclick = () => jumpAndSyncStep(() => prompter.jumpToActStart(act.act));
    els.actTimeline.appendChild(btn);
  }

  const totalSec = computeTotalRecordedSec(prompter.takes);
  els.totalRecordedLabel.textContent = `مجموع ضبط‌شده: ${formatMMSS(totalSec)}`;

  els.takeSummaryList.innerHTML = '';
  for (const act of summaries) {
    if (!act.takes.length) continue;
    const chip = document.createElement('span');
    chip.className = 'take-chip';
    chip.textContent = `پرده ${toPersianDigits(act.act)}: ${toPersianDigits(act.takes.length)} برداشت (آخرین ${formatMMSS(act.latestDurationSec || 0)})`;
    els.takeSummaryList.appendChild(chip);
  }

  if (!prompter.takes.length) {
    els.takeLogBody.innerHTML = '<tr><td colspan="4" class="empty-cell">هنوز برداشتی ثبت نشده است.</td></tr>';
  } else {
    els.takeLogBody.innerHTML = '';
    for (let idx = prompter.takes.length - 1; idx >= 0; idx -= 1) {
      const t = prompter.takes[idx];
      const tr = document.createElement('tr');
      if (t.file) tr.title = t.file;
      tr.innerHTML = `
        <td>پرده ${toPersianDigits(t.act)}</td>
        <td>${toPersianDigits(t.take)}</td>
        <td class="mono-num">${formatMMSS(t.durationSec)}</td>
        <td class="mono-num">${t.timestampLabel}</td>
      `;
      els.takeLogBody.appendChild(tr);
    }
  }
}

function renderObsStatus(snap) {
  const connected = snap.status === 'connected';
  const connecting = snap.status === 'connecting';
  const isFallback = snap.status === 'fallback';

  els.wsBadge.className = 'ws-badge ' + (
    connected ? 'ws-on' : connecting ? 'ws-wait' : isFallback ? 'ws-fallback' : 'ws-standalone'
  );
  els.wsBadge.textContent = connected
    ? 'OBS متصل'
    : connecting
      ? 'در حال اتصال به OBS...'
      : isFallback
        ? 'حالت مستقل (OBS در دسترس نیست)'
        : 'حالت مستقل (بدون OBS)';

  els.obsConnLabel.className = 'status-text ' + (connected ? 'ok' : isFallback ? 'warn' : '');
  els.obsConnLabel.textContent = connected
    ? 'متصل'
    : connecting
      ? 'در حال اتصال...'
      : 'حالت مستقل';

  els.statVersion.textContent = snap.obsVersion || '—';
  els.statScene.textContent = snap.programScene || '—';
  els.statStudio.textContent = connected ? (snap.studioMode ? 'فعال' : 'غیرفعال') : '—';
  els.statRec.textContent = connected
    ? (snap.recording ? `در حال ضبط ${snap.recordTimecode ? `(${snap.recordTimecode})` : ''}` : 'متوقف')
    : (prompter.activeRec ? 'ضبط زمان‌بندی محلی' : 'مستقل');

  els.zoomStateLabel.textContent = connected ? (snap.zoomed ? 'زوم فعال' : 'عادی') : 'اختیاری';
  els.btnConnectObs.classList.toggle('hidden', connected);
  els.btnConnectObs.textContent = isFallback ? 'تلاش مجدد برای OBS' : 'اتصال به OBS';
  els.btnDisconnectObs.classList.toggle('hidden', !connected);

  // Enable/disable OBS-only hardware controls cleanly; teleprompter & overview remain 100% active
  const obsOnlyBtns = document.querySelectorAll('.obs-only-btn');
  obsOnlyBtns.forEach((btn) => {
    btn.disabled = !connected;
    if (!connected) {
      btn.title = 'این دکمه در صورت اتصال اختیاری به OBS WebSocket فعال می‌شود';
    } else {
      btn.removeAttribute('title');
    }
  });

  if (snap.noticeMessage) {
    els.obsNoticeBox.textContent = snap.noticeMessage;
    els.obsNoticeBox.classList.remove('hidden');
  } else {
    els.obsNoticeBox.classList.add('hidden');
  }

  if (isFallback && !fallbackBannerDismissed) {
    els.fallbackMessage.textContent =
      snap.noticeMessage ||
      'اتصال OBS WebSocket در دسترس نیست یا رد شد؛ تله‌پرامپتر و نمای کلی بدون نیاز به OBS فعال هستند.';
    els.fallbackBanner.classList.remove('hidden');
  } else {
    els.fallbackBanner.classList.add('hidden');
  }

  renderTimers();
}

function resolveSlideFilePath(slideNum) {
  if (!slideNum || slideNum <= 0) return '';
  const padded = String(slideNum).padStart(2, '0');
  const base = (els.slidesDirInput.value || '').trim().replace(/[\\/]+$/, '');
  if (!base) return `slides/slide-${padded}.png`;
  return `${base}/slide-${padded}.png`;
}

async function syncObsToStep(step, direction = 'jump') {
  if (!step) return;
  const snap = obs.getSnapshot();
  if (snap.status !== 'connected' || !prompter.prefs.syncObsOnStep) return;

  try {
    if (direction === 'next') {
      await obs.triggerHotkey('hs_next');
    } else if (direction === 'prev') {
      await obs.triggerHotkey('hs_prev');
    }
    const layoutKey = step.layoutKey || step.layout || 'SCAM';
    await obs.switchLayoutScene(layoutKey);
    if (step.slide > 0 && els.slidesDirInput.value.trim()) {
      await obs.setSlideImage(resolveSlideFilePath(step.slide));
    }
    if (snap.studioMode) {
      await obs.setPreviewScene(OBS_SCENES.PROMPTER);
    }
  } catch {
    // Non-fatal if Lua script or scene names differ
  }
}

function jumpAndSyncStep(stepFn, direction = 'jump') {
  const step = stepFn();
  if (step) {
    void syncObsToStep(step, direction);
  }
}

async function toggleRecordingFlow() {
  const snap = obs.getSnapshot();
  const isRec = snap.status === 'connected' ? snap.recording : Boolean(prompter.activeRec);

  if (isRec) {
    prompter.cancelCountdown();
    if (snap.status === 'connected') {
      try {
        await obs.stopRecord();
      } catch {
        prompter.stopRecordingState();
      }
    } else {
      prompter.stopRecordingState();
    }
    return;
  }

  const doStart = async () => {
    const act = prompter.currentStep()?.act ?? 1;
    if (obs.getSnapshot().status === 'connected') {
      try {
        await obs.startRecord();
        prompter.startRecordingState(act);
      } catch {
        await obs.toggleRecord().catch(() => {
          prompter.startRecordingState(act);
        });
      }
    } else {
      prompter.startRecordingState(act);
    }
  };

  prompter.startCountdown(prompter.prefs.countdownSec, () => {
    void doStart();
  });
}

async function loadProjectsList() {
  const res = await fetch('/api/projects');
  if (!res.ok) throw new Error('خطا در دریافت فهرست پروژه‌ها');
  const data = await res.json();
  const projects = data.projects || [];

  els.projectSelect.innerHTML = '';
  if (!projects.length) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'پروژه‌ای یافت نشد';
    els.projectSelect.appendChild(opt);
    return [];
  }

  for (const p of projects) {
    const opt = document.createElement('option');
    opt.value = p.name;
    opt.textContent = p.title ? `${p.title} (${p.name})` : p.name;
    els.projectSelect.appendChild(opt);
  }
  return projects;
}

async function loadProjectSteps(name, { preserveIndex = false, initialStep = null } = {}) {
  if (!name) {
    currentProjectName = '';
    els.projectSubtitle.textContent = 'پروژه‌ای انتخاب نشده است';
    prompter.setSteps([], false);
    return;
  }

  const res = await fetch(`/api/projects/${encodeURIComponent(name)}/steps`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'خطا در بارگذاری مراحل پروژه');
  }
  const payload = await res.json();
  currentProjectName = payload.name || name;
  currentProjectTitle = payload.title || name;
  els.projectSelect.value = currentProjectName;
  els.projectSubtitle.textContent = `${currentProjectTitle} · ${toPersianDigits((payload.steps || []).length)} مرحله از video.yaml`;

  const url = new URL(window.location.href);
  url.searchParams.set('project', currentProjectName);
  window.history.replaceState({}, '', url);

  prompter.setSteps(payload.steps || [], preserveIndex);
  if (initialStep !== null && initialStep >= 1 && (payload.steps || []).length > 0) {
    prompter.jumpTo(initialStep - 1);
  }
}

async function runObsPackageExport() {
  if (!currentProjectName) return;
  els.btnRunExport.disabled = true;
  els.exportResult.classList.remove('hidden', 'error');
  els.exportResult.textContent = 'در حال ساخت فایل‌های بستهٔ OBS...';

  try {
    const res = await fetch(`/api/projects/${encodeURIComponent(currentProjectName)}/obs-export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        os: els.exportOsSelect.value,
        ws_url: els.wsUrlInput.value.trim() || 'ws://127.0.0.1:4455',
        ws_password: els.wsPassInput.value,
        render_png: els.chkExportPng.checked ? 'auto' : false,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'خطا در ساخت بستهٔ OBS');
    }
    const pngInfo = data.prompter_pngs?.length
      ? `<br>تصاویر پرامپتر: ${toPersianDigits(data.prompter_pngs.length)} فایل PNG`
      : '';
    const warnInfo = data.warnings?.length
      ? `<br>توجه: ${data.warnings.join(' · ')}`
      : '';
    els.exportResult.innerHTML = `
      <strong>بستهٔ OBS با موفقیت ساخته شد</strong><br>
      مسیر: <code dir="ltr">${data.out_dir}</code><br>
      فایل‌ها: <span dir="ltr">${(data.files || []).join('، ')}</span>
      ${pngInfo}${warnInfo}
    `;
  } catch (err) {
    els.exportResult.classList.add('error');
    els.exportResult.textContent = err instanceof Error ? err.message : 'خطای ناشناخته';
  } finally {
    els.btnRunExport.disabled = false;
  }
}

function connectOptionalObs() {
  fallbackBannerDismissed = false;
  obs.setAutoReconnect(els.chkAutoReconnect.checked);
  obs.connect(els.wsUrlInput.value, els.wsPassInput.value);
}

function wireEvents() {
  obs.subscribe(renderObsStatus);
  obs.onEvent((eventType, eventData) => {
    if (eventType === 'RecordStateChanged') {
      if (eventData.outputActive) {
        prompter.startRecordingState(prompter.currentStep()?.act ?? 1);
      } else {
        prompter.stopRecordingState(eventData.outputPath || '');
      }
    }
  });

  els.projectSelect.onchange = () => {
    void loadProjectSteps(els.projectSelect.value).catch((e) => {
      els.projectSubtitle.textContent = e.message;
    });
  };

  els.btnReloadSteps.onclick = () => {
    if (currentProjectName) {
      void loadProjectSteps(currentProjectName, { preserveIndex: true });
    }
  };

  els.btnToggleDock.onclick = () => {
    const active = document.body.classList.toggle('dock-mode');
    els.btnToggleDock.textContent = active ? 'خروج از نمای تمام‌عرض' : 'نمای تمام‌عرض پرامپتر';
  };

  els.btnFocusMode.onclick = () => {
    prompter.toggleFocusMode();
  };

  // View mode tabs
  for (const btn of [els.btnModePrompter, els.btnModeOverview, els.btnModeSplit]) {
    btn.onclick = () => prompter.updatePrefs({ viewMode: btn.dataset.view });
  }

  // Fallback banner controls
  els.btnBannerFocus.onclick = () => {
    document.body.classList.add('dock-mode');
    els.btnToggleDock.textContent = 'خروج از نمای تمام‌عرض';
  };
  els.btnBannerRetry.onclick = () => connectOptionalObs();
  els.btnBannerDismiss.onclick = () => {
    fallbackBannerDismissed = true;
    els.fallbackBanner.classList.add('hidden');
  };

  // Teleprompter controls
  els.btnNext.onclick = () => jumpAndSyncStep(() => prompter.next(), 'next');
  els.btnPrev.onclick = () => jumpAndSyncStep(() => prompter.prev(), 'prev');
  els.btnActStart.onclick = () => {
    jumpAndSyncStep(() => prompter.jumpToActStart());
    if (obs.getSnapshot().status === 'connected') {
      void obs.triggerHotkey('hs_rec').catch(() => {});
    }
  };
  els.btnRecord.onclick = () => void toggleRecordingFlow();
  els.btnCancelCountdown.onclick = () => prompter.cancelCountdown();

  els.prompterWrap.onclick = () => {
    if ((prompter.prefs.clickTextToAdvance || prompter.prefs.focusMode) && prompter.countdownRemaining === 0) {
      jumpAndSyncStep(() => prompter.next(), 'next');
    }
  };

  els.btnAutoScroll.onclick = () => {
    prompter.updatePrefs({ autoScroll: !prompter.prefs.autoScroll });
  };
  els.btnSpeedDown.onclick = () => {
    prompter.updatePrefs({ scrollSpeed: Math.max(0.2, Number((prompter.prefs.scrollSpeed - 0.2).toFixed(1))) });
  };
  els.btnSpeedUp.onclick = () => {
    prompter.updatePrefs({ scrollSpeed: Math.min(4.0, Number((prompter.prefs.scrollSpeed + 0.2).toFixed(1))) });
  };
  els.btnFontDown.onclick = () => {
    prompter.updatePrefs({ fontSizePx: Math.max(20, prompter.prefs.fontSizePx - 4) });
  };
  els.btnFontUp.onclick = () => {
    prompter.updatePrefs({ fontSizePx: Math.min(84, prompter.prefs.fontSizePx + 4) });
  };
  els.btnMirror.onclick = () => {
    prompter.updatePrefs({ mirror: !prompter.prefs.mirror });
  };
  els.chkClickAdvance.onchange = (e) => {
    prompter.updatePrefs({ clickTextToAdvance: e.target.checked });
  };
  els.countdownSelect.onchange = (e) => {
    prompter.updatePrefs({ countdownSec: Number(e.target.value) });
  };

  // Optional OBS controls
  els.wsUrlInput.value = prompter.prefs.wsUrl;
  els.wsPassInput.value = prompter.prefs.wsPassword;
  els.slidesDirInput.value = prompter.prefs.slidesDir;
  els.chkAutoReconnect.checked = Boolean(prompter.prefs.autoReconnect);
  els.chkSyncObsOnStep.checked = Boolean(prompter.prefs.syncObsOnStep);
  els.exportOsSelect.value = prompter.prefs.osTarget || 'linux';

  els.wsUrlInput.onchange = () => prompter.updatePrefs({ wsUrl: els.wsUrlInput.value });
  els.wsPassInput.onchange = () => prompter.updatePrefs({ wsPassword: els.wsPassInput.value });
  els.slidesDirInput.onchange = () => prompter.updatePrefs({ slidesDir: els.slidesDirInput.value });
  els.chkAutoReconnect.onchange = (e) => {
    prompter.updatePrefs({ autoReconnect: e.target.checked });
    obs.setAutoReconnect(e.target.checked);
  };
  els.chkSyncObsOnStep.onchange = (e) => prompter.updatePrefs({ syncObsOnStep: e.target.checked });
  els.exportOsSelect.onchange = () => prompter.updatePrefs({ osTarget: els.exportOsSelect.value });

  els.btnConnectObs.onclick = () => connectOptionalObs();
  els.btnDisconnectObs.onclick = () => obs.disconnect();

  els.btnStudioSync.onclick = async () => {
    if (obs.getSnapshot().status !== 'connected') return;
    try {
      await obs.setStudioMode(true);
      await obs.setPreviewScene(OBS_SCENES.PROMPTER);
    } catch {
      // handled gracefully
    }
  };

  for (const btn of [els.btnSceneSlide, els.btnSceneScam, els.btnSceneCam]) {
    btn.onclick = () => {
      if (obs.getSnapshot().status !== 'connected') return;
      void obs.switchLayoutScene(btn.dataset.layout).catch(() => {});
    };
  }
  els.btnZoomToggle.onclick = () => {
    if (obs.getSnapshot().status !== 'connected') return;
    void obs.toggleZoom().catch(() => {});
  };
  els.btnZoomOut.onclick = () => {
    if (obs.getSnapshot().status !== 'connected') return;
    void obs.zoomOut().catch(() => {});
  };
  els.btnMotionToggle.onclick = () => {
    if (obs.getSnapshot().status !== 'connected') return;
    void obs.toggleMotion().catch(() => {});
  };
  els.btnPushSlide.onclick = () => {
    if (obs.getSnapshot().status !== 'connected') return;
    const step = prompter.currentStep();
    if (step && step.slide > 0) {
      void obs.setSlideImage(resolveSlideFilePath(step.slide)).catch(() => {});
    }
  };

  els.btnClearTakes.onclick = () => prompter.clearTakes();

  // Export modal
  els.btnOpenExport.onclick = () => els.exportModal.classList.remove('hidden');
  els.btnCloseExport.onclick = () => els.exportModal.classList.add('hidden');
  els.exportModal.onclick = (e) => {
    if (e.target === els.exportModal) els.exportModal.classList.add('hidden');
  };
  els.btnRunExport.onclick = () => void runObsPackageExport();

  // Keyboard + Foot Pedal (PageUp / PageDown) shortcuts
  document.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (e.key === 'ArrowLeft' || e.key === 'PageDown') {
      e.preventDefault();
      jumpAndSyncStep(() => prompter.next(), 'next');
    } else if (e.key === 'ArrowRight' || e.key === 'PageUp') {
      e.preventDefault();
      jumpAndSyncStep(() => prompter.prev(), 'prev');
    } else if (e.key === ' ') {
      e.preventDefault();
      prompter.updatePrefs({ autoScroll: !prompter.prefs.autoScroll });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      prompter.updatePrefs({ scrollSpeed: Math.max(0.2, Number((prompter.prefs.scrollSpeed - 0.2).toFixed(1))) });
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      prompter.updatePrefs({ scrollSpeed: Math.min(4.0, Number((prompter.prefs.scrollSpeed + 0.2).toFixed(1))) });
    } else if (e.key === '+' || e.key === '=') {
      prompter.updatePrefs({ fontSizePx: Math.min(84, prompter.prefs.fontSizePx + 4) });
    } else if (e.key === '-') {
      prompter.updatePrefs({ fontSizePx: Math.max(20, prompter.prefs.fontSizePx - 4) });
    } else if (e.key === 'm' || e.key === 'M') {
      prompter.updatePrefs({ mirror: !prompter.prefs.mirror });
    } else if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      prompter.toggleFocusMode();
    } else if (e.key === 'o' || e.key === 'O') {
      e.preventDefault();
      prompter.cycleViewMode();
    } else if (e.key === 'F9') {
      e.preventDefault();
      jumpAndSyncStep(() => prompter.jumpToActStart());
    } else if (e.key === 'Escape') {
      if (prompter.countdownRemaining > 0) {
        prompter.cancelCountdown();
      } else if (prompter.prefs.focusMode) {
        e.preventDefault();
        prompter.updatePrefs({ focusMode: false });
      }
    }
  });

  window.addEventListener('resize', scheduleFitFocusText);
  if (typeof ResizeObserver === 'function' && els.prompterWrap) {
    const ro = new ResizeObserver(() => scheduleFitFocusText());
    ro.observe(els.prompterWrap);
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => scheduleFitFocusText());
  }

  // Live 1s timer tick for act elapsed & active recording timer
  setInterval(renderTimers, 1000);
}

async function init() {
  const q = new URLSearchParams(window.location.search);
  if (q.get('dock') === '1' || q.get('standalone') === '1') {
    document.body.classList.add('dock-mode');
    els.btnToggleDock.textContent = 'خروج از نمای تمام‌عرض';
  }
  const focusParam = q.get('focus');
  if (focusParam === '1' || focusParam === 'true') {
    prompter.updatePrefs({ focusMode: true });
  } else if (focusParam === '0' || focusParam === 'false') {
    prompter.updatePrefs({ focusMode: false });
  }
  const viewParam = q.get('view');
  if (viewParam && VALID_VIEW_MODES.includes(viewParam)) {
    prompter.prefs.viewMode = viewParam;
  }
  const fsParam = Number(q.get('fs'));
  if (fsParam >= 20 && fsParam <= 84) {
    prompter.prefs.fontSizePx = fsParam;
  }
  if (q.get('mirror') === '1') {
    prompter.prefs.mirror = true;
  }
  if (q.get('auto') === '1') {
    prompter.updatePrefs({ autoScroll: true });
  }

  wireEvents();

  const initialStep = q.get('s') ? Number(q.get('s')) : null;
  try {
    const projects = await loadProjectsList();
    const requested = q.get('project');
    const chosen = requested || (projects[0] ? projects[0].name : '');
    if (chosen) {
      await loadProjectSteps(chosen, { preserveIndex: false, initialStep });
    } else {
      renderPrompter();
    }
  } catch (err) {
    els.projectSubtitle.textContent = err instanceof Error ? err.message : 'خطا در اتصال به سرور';
    renderPrompter();
  }

  // WebSocket is strictly optional; if autoconnect=1 is requested, attempt and degrade gracefully on refusal.
  if (q.get('autoconnect') === '1' || q.get('ws') === '1') {
    connectOptionalObs();
  }
}

void init();
