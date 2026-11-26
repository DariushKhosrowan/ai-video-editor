/* Khordegir Studio — Live OBS Browser Source Runtime (/obs-stage/)
   Connects via WebSocket (/ws/live?project=<name>&role=viewer) with auto-reconnect,
   runs Stage with continuous living motion (liveLoop: true), renders live lower-thirds
   and chapter progress overlays, and plays Web Audio SFX triggers. */
(function () {
  "use strict";

  const FA = "۰۱۲۳۴۵۶۷۸۹";
  const fa = (v) => String(v ?? "").replace(/[0-9]/g, (d) => FA[+d]);
  const q = new URLSearchParams(window.location.search);

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

  const projectName = (q.get("project") || "").trim() || "default";
  const forceTransparent = q.get("transparent") === "1" || q.get("transparent") === "true";
  const forceMuted = q.get("sfx") === "0" || q.get("muted") === "1";
  const forceMic = q.get("mic") === "1";

  let ws = null;
  let reconnectMs = 900;
  let reconnectTimer = null;
  let pingTimer = null;
  let lastSlideKey = "";
  let lastSfxSeq = -1;
  let lastLtVisible = false;
  let micStarted = false;
  let currentRoomState = null;

  function fitViewport() {
    const vw = Math.max(320, window.innerWidth);
    const vh = Math.max(180, window.innerHeight);
    const scale = Math.min(vw / 1920, vh / 1080);
    canvas.style.transform = `scale(${scale})`;
  }

  window.addEventListener("resize", fitViewport);
  fitViewport();

  // Audio unlock helper
  const unlockAudio = () => {
    if (window.StageSFX && !forceMuted) window.StageSFX.resume();
  };
  window.addEventListener("pointerdown", unlockAudio, { passive: true });
  window.addEventListener("keydown", unlockAudio, { passive: true });

  async function enableMicReactivity() {
    if (micStarted || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
    micStarted = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ac = new AC();
      const src = ac.createMediaStreamSource(stream);
      const analyser = ac.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      let smoothed = 0;
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i += 1) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buf.length);
        smoothed = smoothed * 0.72 + Math.min(1, rms * 4.5) * 0.28;
        if (window.Stage && window.Stage.setMicLevel) {
          window.Stage.setMicLevel(smoothed);
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } catch {
      // Silent fallback if mic permission denied in OBS or headless browser
    }
  }

  if (forceMic) void enableMicReactivity();

  function renderOverlays(state) {
    if (!state) return;
    const ov = state.overlay || {};
    const sfxAllowed = !forceMuted && ov.sfxEnabled !== false;
    if (window.StageSFX) {
      window.StageSFX.setMuted(!sfxAllowed);
    }

    if (ov.micReactive || forceMic) {
      void enableMicReactivity();
    }

    // LIVE pill
    liveBadgePill.classList.toggle("hidden", !ov.showLiveBadge);

    // Chapter bar
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

    // Lower-third overlay
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
    if (state.livingStage && !slide.livingStage) {
      slide.livingStage = state.livingStage;
    }
    if (ov.showLogo === false) {
      slide.logo = false;
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
      }
    };

    ws.onclose = () => {
      clearInterval(pingTimer);
      scheduleReconnect();
    };

    ws.onerror = () => {
      // onclose handles reconnect
    };
  }

  function scheduleReconnect() {
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      reconnectMs = Math.min(6000, Math.round(reconnectMs * 1.45));
      connectWs();
    }, reconnectMs);
  }

  // Initial HTTP hydration fallback before WS completes
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
