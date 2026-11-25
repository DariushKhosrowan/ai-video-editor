/**
 * Optional OBS WebSocket v5 client (plain ES module).
 * WebSocket is strictly an optional enhancement: if unavailable, blocked, timed out,
 * or refused, the client degrades gracefully into standalone/fallback mode without
 * blocking the teleprompter or spamming failed reconnect loops.
 */

export const OBS_SCENES = {
  SLIDE: '01 اسلاید',
  SCAM: '02 اسلاید + من',
  CAM: '03 فقط من',
  PROMPTER: '99 تلهپرامپتر (ضبط نمیشود)',
  PROGRAM: '00 استودیو (روی این بمان)',
};

export const OBS_SOURCES = {
  SLIDE_IMAGE: 'HS اسلاید',
};

const MAX_LIVE_RECONNECT_ATTEMPTS = 4;
const HANDSHAKE_TIMEOUT_MS = 4000;

async function sha256Base64(input) {
  if (!globalThis.crypto || !globalThis.crypto.subtle) {
    throw new Error('WebCrypto در دسترس نیست');
  }
  const bytes = new TextEncoder().encode(input);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  const arr = new Uint8Array(digest);
  let bin = '';
  for (let i = 0; i < arr.length; i += 1) {
    bin += String.fromCharCode(arr[i]);
  }
  return btoa(bin);
}

export async function computeObsAuthString(password, salt, challenge) {
  const secret = await sha256Base64(password + salt);
  return sha256Base64(secret + challenge);
}

export class ObsWebSocketClient {
  constructor() {
    this.ws = null;
    this.pending = new Map();
    this.reqCounter = 0;
    this.listeners = new Set();
    this.eventListeners = new Set();
    this.reconnectTimer = null;
    this.handshakeTimer = null;
    this.reconnectAttempt = 0;
    this.autoReconnect = true;
    this.manualDisconnect = false;
    this.hasConnectedOnce = false;
    this.lastUrl = 'ws://127.0.0.1:4455';
    this.lastPassword = '';
    this.snapshot = {
      status: 'standalone', // standalone | connecting | connected | fallback
      fallbackReason: null, // null | unsupported | invalid_url | refused | auth_required | timeout | closed
      noticeMessage: null,
      obsVersion: null,
      recording: false,
      recordTimecode: null,
      studioMode: false,
      programScene: null,
      previewScene: null,
      zoomed: false,
      motionOn: true,
    };
  }

  getSnapshot() {
    return this.snapshot;
  }

  subscribe(fn) {
    this.listeners.add(fn);
    fn(this.snapshot);
    return () => this.listeners.delete(fn);
  }

  onEvent(fn) {
    this.eventListeners.add(fn);
    return () => this.eventListeners.delete(fn);
  }

  _emit(patch) {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const fn of this.listeners) {
      fn(this.snapshot);
    }
  }

  _emitEvent(eventType, eventData) {
    for (const fn of this.eventListeners) {
      fn(eventType, eventData);
    }
  }

  setAutoReconnect(enabled) {
    this.autoReconnect = Boolean(enabled);
    if (!this.autoReconnect && this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  _clearTimers() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.handshakeTimer) {
      clearTimeout(this.handshakeTimer);
      this.handshakeTimer = null;
    }
  }

  _enterFallback(reason, message) {
    this._clearTimers();
    this._closeSocketOnly();
    this._emit({
      status: 'fallback',
      fallbackReason: reason,
      noticeMessage: message,
      obsVersion: null,
      recording: false,
      studioMode: false,
      programScene: null,
      previewScene: null,
    });
  }

  _scheduleReconnect() {
    if (this.manualDisconnect || !this.autoReconnect) return;
    // Only auto-reconnect if a live session previously succeeded; if initial connection was refused,
    // immediately settle into standalone fallback mode instead of hammering ws://127.0.0.1:4455.
    if (!this.hasConnectedOnce) return;
    if (this.reconnectAttempt >= MAX_LIVE_RECONNECT_ATTEMPTS) {
      this._enterFallback(
        'closed',
        'اتصال OBS پس از چند تلاش برقرار نشد؛ کنسول به حالت تله‌پرامپتر و نمای کلی مستقل برگشت.'
      );
      return;
    }
    this._clearTimers();
    const delay = Math.min(12000, 1500 * Math.pow(1.6, this.reconnectAttempt));
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.manualDisconnect && this.snapshot.status !== 'connected') {
        this.connect(this.lastUrl, this.lastPassword, { isRetry: true });
      }
    }, delay);
  }

  disconnect() {
    this.manualDisconnect = true;
    this.hasConnectedOnce = false;
    this._clearTimers();
    this._closeSocketOnly();
    this._emit({
      status: 'standalone',
      fallbackReason: null,
      noticeMessage: null,
      obsVersion: null,
      recording: false,
      studioMode: false,
      programScene: null,
      previewScene: null,
    });
  }

  _closeSocketOnly() {
    if (this.ws) {
      const sock = this.ws;
      this.ws = null;
      sock.onopen = null;
      sock.onmessage = null;
      sock.onerror = null;
      sock.onclose = null;
      try {
        sock.close(1000, 'Client disconnect');
      } catch {
        // ignore
      }
    }
    for (const [, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error('Disconnected'));
    }
    this.pending.clear();
  }

  connect(url, password = '', opts = {}) {
    this._clearTimers();
    this._closeSocketOnly();

    this.manualDisconnect = false;
    if (!opts.isRetry) {
      this.reconnectAttempt = 0;
      this.hasConnectedOnce = false;
    }

    const cleanUrl = String(url || '').trim();
    this.lastUrl = cleanUrl;
    this.lastPassword = String(password || '');

    if (typeof WebSocket === 'undefined') {
      this._enterFallback(
        'unsupported',
        'WebSocket در این مرورگر در دسترس نیست؛ حالت مستقل تله‌پرامپتر و نمای کلی فعال است.'
      );
      return;
    }

    if (!cleanUrl.startsWith('ws://') && !cleanUrl.startsWith('wss://')) {
      this._enterFallback(
        'invalid_url',
        'آدرس WebSocket معتبر نیست؛ کنسول در حالت مستقل (بدون OBS) کار می‌کند.'
      );
      return;
    }

    this._emit({
      status: 'connecting',
      fallbackReason: null,
      noticeMessage: null,
    });

    let socket;
    try {
      socket = new WebSocket(cleanUrl);
    } catch {
      this._enterFallback(
        'refused',
        'امکان باز کردن WebSocket وجود ندارد؛ کنسول به حالت تله‌پرامپتر و نمای کلی مستقل بازگشت.'
      );
      return;
    }

    this.ws = socket;
    let identified = false;

    this.handshakeTimer = setTimeout(() => {
      if (this.ws !== socket || identified) return;
      this._enterFallback(
        'timeout',
        'پاسخی از OBS WebSocket دریافت نشد؛ کنسول در حالت تله‌پرامپتر و نمای کلی مستقل کار می‌کند.'
      );
    }, HANDSHAKE_TIMEOUT_MS);

    socket.onmessage = async (event) => {
      if (this.ws !== socket) return;
      try {
        const msg = JSON.parse(String(event.data));
        const op = msg.op;
        const d = msg.d || {};

        if (op === 0) {
          const authObj = d.authentication;
          let authentication;
          if (authObj) {
            if (!this.lastPassword) {
              this.manualDisconnect = true;
              this._enterFallback(
                'auth_required',
                'سرور OBS رمز عبور WebSocket می‌خواهد؛ رمز را وارد کنید یا در حالت مستقل ادامه دهید.'
              );
              return;
            }
            try {
              authentication = await computeObsAuthString(
                this.lastPassword,
                authObj.salt,
                authObj.challenge
              );
            } catch {
              this.manualDisconnect = true;
              this._enterFallback(
                'unsupported',
                'امکان احراز هویت رمزدار در این بستر نیست؛ کنسول در حالت مستقل فعال ماند.'
              );
              return;
            }
          }
          socket.send(
            JSON.stringify({
              op: 1,
              d: {
                rpcVersion: 1,
                ...(authentication ? { authentication } : {}),
              },
            })
          );
        } else if (op === 2) {
          identified = true;
          this.hasConnectedOnce = true;
          this.reconnectAttempt = 0;
          if (this.handshakeTimer) {
            clearTimeout(this.handshakeTimer);
            this.handshakeTimer = null;
          }
          this._emit({
            status: 'connected',
            fallbackReason: null,
            noticeMessage: null,
          });
          void this.refreshInitialState();
        } else if (op === 5) {
          const eventType = d.eventType;
          const eventData = d.eventData || {};
          if (eventType === 'RecordStateChanged') {
            this._emit({ recording: Boolean(eventData.outputActive) });
          } else if (eventType === 'CurrentProgramSceneChanged') {
            this._emit({ programScene: eventData.sceneName || null });
          } else if (eventType === 'CurrentPreviewSceneChanged') {
            this._emit({ previewScene: eventData.sceneName || null });
          } else if (eventType === 'StudioModeStateChanged') {
            this._emit({ studioMode: Boolean(eventData.studioModeEnabled) });
          }
          this._emitEvent(eventType, eventData);
        } else if (op === 7) {
          const requestId = String(d.requestId || '');
          const pendingReq = this.pending.get(requestId);
          if (pendingReq) {
            clearTimeout(pendingReq.timer);
            this.pending.delete(requestId);
            const st = d.requestStatus || {};
            if (st.result) {
              pendingReq.resolve(d.responseData || {});
            } else {
              pendingReq.reject(
                new Error(st.comment || `OBS Error (${st.code ?? 'unknown'})`)
              );
            }
          }
        }
      } catch {
        // Ignore malformed packets
      }
    };

    socket.onerror = () => {
      if (this.ws !== socket) return;
      if (!identified && !this.hasConnectedOnce) {
        this._enterFallback(
          'refused',
          'اتصال به OBS WebSocket برقرار نشد یا رد شد؛ کنسول در حالت تله‌پرامپتر و نمای کلی مستقل کار می‌کند.'
        );
      }
    };

    socket.onclose = (ev) => {
      if (this.ws !== socket) return;
      if (this.handshakeTimer) {
        clearTimeout(this.handshakeTimer);
        this.handshakeTimer = null;
      }
      this.ws = null;

      if (this.manualDisconnect) {
        this.disconnect();
        return;
      }

      if (!identified && !this.hasConnectedOnce) {
        const authFail = ev && (ev.code === 4009 || /auth/i.test(ev.reason || ''));
        this._enterFallback(
          authFail ? 'auth_required' : 'refused',
          authFail
            ? 'رمز عبور OBS WebSocket نادرست است؛ می‌توانید در حالت مستقل ادامه دهید.'
            : 'اتصال به OBS WebSocket در دسترس نیست یا رد شد؛ کنسول به حالت تله‌پرامپتر و نمای کلی مستقل بازگشت.'
        );
        return;
      }

      if (this.autoReconnect && this.reconnectAttempt < MAX_LIVE_RECONNECT_ATTEMPTS) {
        this._emit({
          status: 'connecting',
          noticeMessage: 'ارتباط با OBS قطع شد؛ در حال تلاش برای اتصال مجدد...',
        });
        this._scheduleReconnect();
      } else {
        this._enterFallback(
          'closed',
          'ارتباط با OBS قطع شد؛ کنسول به حالت تله‌پرامپتر و نمای کلی مستقل بازگشت.'
        );
      }
    };
  }

  async refreshInitialState() {
    try {
      const [ver, rec, studio, scene] = await Promise.all([
        this.request('GetVersion'),
        this.request('GetRecordStatus'),
        this.request('GetStudioModeEnabled'),
        this.request('GetCurrentProgramScene'),
      ]);
      this._emit({
        obsVersion: ver.obsVersion || null,
        recording: Boolean(rec.outputActive),
        recordTimecode: rec.outputTimecode || null,
        studioMode: Boolean(studio.studioModeEnabled),
        programScene: scene.currentProgramSceneName || null,
      });
    } catch {
      // Non-fatal
    }
  }

  request(requestType, requestData) {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('OBS متصل نیست'));
        return;
      }
      this.reqCounter += 1;
      const requestId = `ks_${Date.now()}_${this.reqCounter}`;
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`Timeout: ${requestType}`));
      }, 4500);

      this.pending.set(requestId, { resolve, reject, timer });
      this.ws.send(
        JSON.stringify({
          op: 6,
          d: {
            requestType,
            requestId,
            ...(requestData ? { requestData } : {}),
          },
        })
      );
    });
  }

  triggerHotkey(hotkeyName) {
    return this.request('TriggerHotkeyByName', { hotkeyName });
  }

  toggleRecord() {
    return this.request('ToggleRecord');
  }

  startRecord() {
    return this.request('StartRecord');
  }

  stopRecord() {
    return this.request('StopRecord');
  }

  setStudioMode(enabled) {
    return this.request('SetStudioModeEnabled', { studioModeEnabled: Boolean(enabled) });
  }

  setPreviewScene(sceneName) {
    return this.request('SetCurrentPreviewScene', { sceneName });
  }

  setProgramScene(sceneName) {
    return this.request('SetCurrentProgramScene', { sceneName });
  }

  async switchLayoutScene(layoutKey) {
    const key = String(layoutKey || 'SCAM').toUpperCase();
    const targetScene = OBS_SCENES[key] || OBS_SCENES.SCAM;
    const hotkeyMap = {
      SLIDE: 'hs_slide',
      SCAM: 'hs_scam',
      CAM: 'hs_cam',
    };

    if (this.snapshot.programScene === OBS_SCENES.PROGRAM) {
      const hk = hotkeyMap[key];
      if (hk) {
        try {
          await this.triggerHotkey(hk);
          return;
        } catch {
          // Fall back to direct scene switch
        }
      }
    }
    try {
      await this.setProgramScene(targetScene);
    } catch {
      if (hotkeyMap[key]) {
        await this.triggerHotkey(hotkeyMap[key]);
      }
    }
  }

  async setSlideImage(filePath) {
    if (!filePath) return;
    await this.request('SetInputSettings', {
      inputName: OBS_SOURCES.SLIDE_IMAGE,
      inputSettings: { file: filePath },
      overlay: true,
    });
  }

  async toggleZoom() {
    this._emit({ zoomed: !this.snapshot.zoomed });
    return this.triggerHotkey('hs_zoom');
  }

  async zoomOut() {
    this._emit({ zoomed: false });
    return this.triggerHotkey('hs_zout');
  }

  async toggleMotion() {
    this._emit({ motionOn: !this.snapshot.motionOn });
    return this.triggerHotkey('hs_motion');
  }
}
