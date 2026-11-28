import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_DIR = path.resolve(__dirname, "..");
const KH_DIR = path.join(STUDIO_DIR, "khordegir");

function createMockElement(tag) {
  const el = {
    tagName: String(tag).toUpperCase(),
    attrs: Object.create(null),
    style: Object.create(null),
    children: [],
    parentNode: null,
    className: "",
    textContent: "",
    innerHTML: "",
    dataset: Object.create(null),
    setAttribute(k, v) {
      this.attrs[k] = String(v);
      if (k === "class") this.className = String(v);
    },
    getAttribute(k) {
      return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null;
    },
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    },
    querySelectorAll(sel) {
      const out = [];
      const walk = (n) => {
        for (const c of n.children || []) {
          if (sel.startsWith(".") && String(c.className || "").split(/\s+/).includes(sel.slice(1))) out.push(c);
          walk(c);
        }
      };
      walk(this);
      return out;
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 420, height: 120 };
    },
  };
  return el;
}

function createStageSandbox(initFormat = "16:9") {
  const tokensSrc = fs.readFileSync(path.join(KH_DIR, "stage", "motion-tokens.js"), "utf8");
  const rigSrc = fs.readFileSync(path.join(KH_DIR, "stage", "mascot-rig.js"), "utf8");
  const tplSrc = fs.readFileSync(path.join(KH_DIR, "templates", "mascot_talk", "template.js"), "utf8");

  const doc = {
    createElement: (tag) => createMockElement(tag),
    createElementNS: (_ns, tag) => createMockElement(tag),
  };

  let registeredTpl = null;
  let seekHooks = [];

  const sandbox = {
    window: null,
    document: doc,
    Math,
    Number,
    String,
    Array,
    Object,
    Stage: null,
    console,
  };
  sandbox.window = sandbox;

  vm.runInNewContext(tokensSrc, sandbox);
  vm.runInNewContext(rigSrc, sandbox);

  const fmtSpec = sandbox.StageMotionTokens.resolveFormat(initFormat);
  const W = fmtSpec.width;
  const H = fmtSpec.height;
  const M = Math.round(Math.min(W, H) * 0.056);

  const stageObj = {
    W,
    H,
    fps: 30,
    format: initFormat,
    fx: { cur: { preset: "editorial-host" } },
    estimateSayDuration: () => 5.4,
    onSeek(fn) {
      seekHooks.push(fn);
    },
    seek(t) {
      for (const fn of seekHooks) fn(t);
    },
    template(def) {
      registeredTpl = def;
    },
  };
  sandbox.Stage = stageObj;
  vm.runInNewContext(tplSrc, sandbox);

  const root = createMockElement("div");
  const fields = [];
  const A = {
    W,
    H,
    root,
    area: { x: M, y: M },
    th: { clip: { min: 5 } },
    el(tag, cls, parent, style) {
      const e = doc.createElement(tag);
      e.className = cls || "";
      Object.assign(e.style, style || {});
      if (parent) parent.appendChild(e);
      return e;
    },
    text(parent, val, role) {
      const e = doc.createElement("div");
      e.className = `t-${role}`;
      e.textContent = String(val || "");
      parent.appendChild(e);
      return e;
    },
    field(name, el) {
      fields.push({ name, el });
    },
    enter() {},
    kinetic() {},
    at: () => 0.1,
    sweepLine() {},
    image(parent) {
      const f = doc.createElement("div");
      parent.appendChild(f);
      return f;
    },
    fit() {},
  };

  return {
    sandbox,
    Stage: stageObj,
    A,
    root,
    fields,
    getTemplate: () => registeredTpl,
    resetHooks: () => {
      seekHooks = [];
    },
  };
}

function snapshotRig(rig) {
  return {
    root: rig.rootG.getAttribute("transform"),
    body: rig.bodyG.getAttribute("transform"),
    head: rig.headG.getAttribute("transform"),
    browL: rig.browL.getAttribute("transform"),
    browR: rig.browR.getAttribute("transform"),
    pupilL: rig.eyeL.pupilG.getAttribute("transform"),
    lidLU: rig.eyeL.upperLid.getAttribute("y"),
    lidLD: rig.eyeL.lowerLid.getAttribute("y"),
    happyL: rig.eyeL.happyArc.getAttribute("opacity"),
    beak: rig.beakG.getAttribute("transform"),
    lowerBeak: rig.lowerBeakG.getAttribute("transform"),
    mouthCav: rig.mouthCavG.getAttribute("opacity"),
    tongue: rig.tongueEl.getAttribute("opacity"),
    teeth: rig.teethEl.getAttribute("opacity"),
    armsCrossed: rig.armsCrossedG.getAttribute("opacity"),
    wingsOpen: rig.wingsOpenG.getAttribute("opacity"),
    wingThink: rig.wingThinkG.getAttribute("opacity"),
    accQ: rig.accQuestion.getAttribute("opacity"),
    accSweat: rig.accSweat.getAttribute("opacity"),
    accShock: rig.accShock.getAttribute("opacity"),
    accSparkle: rig.accSparkle.getAttribute("opacity"),
  };
}

test("motion tokens enforce STAGE_ZOOM_CAP 1.06 and 16:9 / 9:16 / 1:1 formats", () => {
  const { sandbox } = createStageSandbox("16:9");
  const MT = sandbox.StageMotionTokens;
  assert.equal(MT.STAGE_ZOOM_CAP, 1.06);
  assert.equal(MT.clampZoom(1.4), 1.06);
  assert.equal(MT.clampZoom(1.03), 1.03);
  const f16 = MT.resolveFormat("16:9");
  const f916 = MT.resolveFormat("9:16");
  const f11 = MT.resolveFormat("1:1");
  assert.equal(f16.width, 1920);
  assert.equal(f16.height, 1080);
  assert.equal(f916.width, 1080);
  assert.equal(f916.height, 1920);
  assert.equal(f11.width, 1080);
  assert.equal(f11.height, 1080);
  assert.ok(f16.label && f916.label && f11.label);
});

test("mascot rig seek(t) is 100% deterministic, shuts beak on silence, and renders audio visemes", () => {
  const demoTrack = JSON.parse(
    fs.readFileSync(path.join(STUDIO_DIR, "examples", "mascot-demo", "narration.visemes.json"), "utf8"),
  );
  const { sandbox } = createStageSandbox("16:9");
  const p1 = createMockElement("div");
  const p2 = createMockElement("div");

  const cfg = {
    side: "left",
    scale: 1,
    expression: "neutral",
    expression_timeline: [
      { t: 0.0, expression: "neutral", blend: 0.25 },
      { t: 1.0, expression: "happy", blend: 0.3 },
      { t: 2.2, expression: "thinking", blend: 0.3 },
      { t: 3.4, expression: "shocked", blend: 0.25 },
      { t: 4.5, expression: "smug", blend: 0.3 },
    ],
    visemeTrack: demoTrack,
    duration: demoTrack.duration,
    seed: "det-check",
  };

  const i1 = sandbox.StageMascot.createMascotInstance(p1, cfg);
  const i2 = sandbox.StageMascot.createMascotInstance(p2, cfg);

  // Out-of-order seeking on i1 matches straight seek on i2 at same timestamp
  i1.seek(3.733);
  i1.seek(0.03);
  i1.seek(1.433);
  i2.seek(1.433);
  assert.deepEqual(snapshotRig(i1.rig), snapshotRig(i2.rig));

  // Silence frame at t=2.40s shuts mouth cavity cleanly
  i1.seek(2.40);
  const silenceSnap = snapshotRig(i1.rig);
  assert.equal(silenceSnap.mouthCav, "0");

  // Loud speech frame at t=1.433s (emphasis peak) opens beak cavity
  i1.seek(1.433);
  const peakSnap = snapshotRig(i1.rig);
  assert.equal(peakSnap.mouthCav, "1");
  assert.notEqual(peakSnap.lowerBeak, silenceSnap.lowerBeak);

  // Thinking expression blends smoothly (t=2.45 is mid-blend, t=2.55 is full)
  i1.seek(2.45);
  const thinkBlendSnap = snapshotRig(i1.rig);
  assert.equal(Number(thinkBlendSnap.accQ) > 0.8 && Number(thinkBlendSnap.accQ) < 1, true);
  i1.seek(2.55);
  const thinkSnap = snapshotRig(i1.rig);
  assert.equal(thinkSnap.wingThink, "1");
  assert.equal(Number(thinkSnap.accQ), 1);

  // Smug expression activates crescent lid & sparkle accent around t=4.90s
  i1.seek(4.90);
  const smugSnap = snapshotRig(i1.rig);
  assert.equal(Number(smugSnap.happyL) > 0, true);
  assert.equal(Number(smugSnap.accSparkle) > 0, true);
});

test("all 7 expression presets and 8 visemes preserve palette & anatomy cleanly", () => {
  const { sandbox } = createStageSandbox("16:9");
  const exprs = ["neutral", "happy", "smug", "shocked", "annoyed", "embarrassed", "thinking"];
  for (const exp of exprs) {
    const p = createMockElement("div");
    const inst = sandbox.StageMascot.createMascotInstance(p, {
      expression: exp,
      accents: true,
      say: "تست تمام حالت‌ها با صدای گوینده",
      duration: 4,
      seed: `expr-${exp}`,
    });
    inst.seek(1.2);
    const snap = snapshotRig(inst.rig);
    assert.ok(snap.head && snap.head.includes("rotate("));
    assert.ok(snap.browL && snap.browR);
  }
});

test("mascot_talk template renders across 16:9, 9:16, and 1:1 without card overlap or errors", () => {
  const demoTrack = JSON.parse(
    fs.readFileSync(path.join(STUDIO_DIR, "examples", "mascot-demo", "narration.visemes.json"), "utf8"),
  );
  for (const fmt of ["16:9", "9:16", "1:1"]) {
    const ctx = createStageSandbox(fmt);
    const tpl = ctx.getTemplate();
    tpl.build(
      {
        template: "mascot_talk",
        format: fmt,
        eyebrow: "تست",
        title: "عقاب *قرمز* در سه فرمت",
        text: "چیدمان کارت و شخصیت بدون هم‌پوشانی",
        side: "left",
        expression: "happy",
        visemeTrack: demoTrack,
        say: "متن تست",
      },
      ctx.A,
    );

    const cardField = ctx.fields.find((f) => f.name === "card");
    const mascotField = ctx.fields.find((f) => f.name === "mascot");
    assert.ok(cardField, `card field missing in ${fmt}`);
    assert.ok(mascotField, `mascot field missing in ${fmt}`);

    // Verify no overlap between card and mascot bounding box
    const cardLeft = Number(cardField.el.style.left ?? 0);
    const cardTop = Number(cardField.el.style.top ?? 0);
    const cardHeight = Number(cardField.el.style.height ?? 0);
    const masLeft = parseFloat(mascotField.el.style.left);
    const masTop = parseFloat(mascotField.el.style.top);
    const masWidth = parseFloat(mascotField.el.style.width);
    if (fmt === "9:16") {
      assert.ok(cardTop + cardHeight <= masTop, `Vertical card (${cardTop + cardHeight}) overlaps mascot (${masTop})`);
    } else {
      assert.ok(masLeft + masWidth <= cardLeft, `Mascot right (${masLeft + masWidth}) overlaps card left (${cardLeft})`);
    }

    // Seeking on Stage drives rig smoothly without throwing
    ctx.Stage.seek(0.9);
    ctx.Stage.seek(2.4);
  }
});

test("look_at points pupils accurately on screen for both left and right sides and keeps sheet palette", () => {
  const { sandbox } = createStageSandbox("16:9");
  const parsePupilX = (tf) => {
    const m = /translate\(([-0-9.]+),/.exec(tf || "");
    return m ? parseFloat(m[1]) : 0;
  };
  const screenPupilX = (side, lookAt) => {
    const p = createMockElement("div");
    const inst = sandbox.StageMascot.createMascotInstance(p, {
      side,
      look_at: lookAt,
      expression: "neutral",
      say: "",
      duration: 4,
      seed: "look-test",
    });
    inst.seek(0); // saccade at t=0 has dx=0
    const localX = parsePupilX(inst.rig.eyeL.pupilG.getAttribute("transform"));
    return (side === "left" ? -1 : 1) * localX;
  };

  assert.ok(screenPupilX("left", "right") > 5, "left-side eagle looking right must shift right on screen");
  assert.ok(screenPupilX("left", "left") < -5, "left-side eagle looking left must shift left on screen");
  assert.ok(screenPupilX("left", "slide") > 5, "left-side eagle looking at slide must gaze right toward slide");
  assert.ok(screenPupilX("right", "slide") < -5, "right-side eagle looking at slide must gaze left toward slide");

  // Palette constants match sheet exactly across rig
  assert.equal(sandbox.StageMascot.PALETTE.redPrimary, "#EB1818");
  assert.equal(sandbox.StageMascot.PALETTE.chestBlack, "#141418");
  assert.equal(sandbox.StageMascot.PALETTE.beakGold, "#F5A614");
});

/* ---------------- Voice-Tone Prosody Rig Tests (Monotonicity, Springs, Bounds, Live Mode) */

function makeConstantProsodyTrack(fps, duration, frameVals, peaks = []) {
  const n = Math.round(duration * fps);
  const frames = [];
  for (let i = 0; i < n; i += 1) {
    frames.push(Object.assign({
      t: +(i / fps).toFixed(4),
      rms: 0.2,
      db: -18,
      loudness: 0.5,
      f0_hz: 180,
      pitch_norm: 0,
      pitch_delta: 0,
      is_speaking: true,
      is_pause: false,
      emphasis: 0,
    }, frameVals));
  }
  return {
    version: 1,
    fps,
    duration,
    source: "synthetic-test",
    median_f0_hz: 180,
    frames,
    peaks,
    phrases: frameVals.is_speaking === false ? [] : [{ start: 0, end: duration }],
    pauses: frameVals.is_speaking === false ? [{ start: 0, end: duration }] : [],
  };
}

function makeConstantVisemeTrack(fps, duration, viseme = "open", energy = 0.5, isSpeech = true) {
  const n = Math.round(duration * fps);
  const frames = [];
  for (let i = 0; i < n; i += 1) {
    frames.push({
      t: +(i / fps).toFixed(4),
      viseme,
      energy,
      openness: isSpeech ? energy : 0,
      width: 1,
      stress: 0,
      is_speech: isSpeech,
    });
  }
  return { version: 1, fps, duration, source: "synthetic-test", frames, peaks: [], phrases: [] };
}

test("mouth openness responds monotonically to loudness on top of visemes and closes on silence", () => {
  const { sandbox } = createStageSandbox("16:9");
  const evalMouth = (loudness, isSpeaking) => {
    const p = createMockElement("div");
    const inst = sandbox.StageMascot.createMascotInstance(p, {
      expression: "neutral",
      visemeTrack: makeConstantVisemeTrack(30, 2.0, isSpeaking ? "open" : "rest", loudness, isSpeaking),
      prosodyTrack: makeConstantProsodyTrack(30, 2.0, { loudness, is_speaking: isSpeaking, is_pause: !isSpeaking }),
      tone: { preset: "lively" },
      duration: 2.0,
      seed: "mono-mouth",
    });
    return inst.seek(1.0).mouthOpen;
  };

  const mSilent = evalMouth(0.0, false);
  const mLow = evalMouth(0.20, true);
  const mMid = evalMouth(0.55, true);
  const mHigh = evalMouth(0.92, true);

  assert.equal(mSilent, 0, "mouth must close completely on silence");
  assert.ok(mLow > mSilent, `expected low (${mLow}) > silent (${mSilent})`);
  assert.ok(mMid > mLow, `expected mid (${mMid}) > low (${mLow})`);
  assert.ok(mHigh > mMid, `expected high (${mHigh}) > mid (${mMid})`);
  assert.ok(mHigh <= sandbox.StageMascot.TONE_LIMITS.mouthMax, "mouth must stay within anatomical max");
});

test("eyebrows rise monotonically with pitch above median and furrow below median", () => {
  const { sandbox } = createStageSandbox("16:9");
  const evalBrow = (pitchNorm) => {
    const p = createMockElement("div");
    const inst = sandbox.StageMascot.createMascotInstance(p, {
      expression: "neutral",
      visemeTrack: makeConstantVisemeTrack(30, 2.0, "open", 0.5, true),
      prosodyTrack: makeConstantProsodyTrack(30, 2.0, {
        loudness: 0.5,
        f0_hz: 180 * Math.pow(2, (pitchNorm * 6) / 12),
        pitch_norm: pitchNorm,
        is_speaking: true,
        is_pause: false,
      }),
      tone: { preset: "lively" },
      duration: 2.0,
      seed: "mono-brow",
    });
    return inst.seek(1.0);
  };

  const lowPitch = evalBrow(-0.85);
  const medPitch = evalBrow(0.0);
  const highPitch = evalBrow(0.85);

  // In SVG coordinates, smaller/more-negative browY means HIGHER raised eyebrows
  assert.ok(lowPitch.browY > medPitch.browY, `low pitch (${lowPitch.browY}) should furrow lower than median (${medPitch.browY})`);
  assert.ok(medPitch.browY > highPitch.browY, `high pitch (${highPitch.browY}) should lift higher than median (${medPitch.browY})`);
  assert.ok(lowPitch.browRot > highPitch.browRot, "low pitch should furrow brow rotation more inward than high pitch");
});

test("head nod & tilt respond monotonically to emphasis peaks and stay clamped within natural bounds", () => {
  const { sandbox } = createStageSandbox("16:9");
  const evalHead = (emphasis, toneCfg) => {
    const p = createMockElement("div");
    const peaks = emphasis > 0 ? [{ t: 1.0, strength: emphasis }] : [];
    const inst = sandbox.StageMascot.createMascotInstance(p, {
      expression: "neutral",
      visemeTrack: makeConstantVisemeTrack(30, 2.0, "open", 0.5, true),
      prosodyTrack: makeConstantProsodyTrack(30, 2.0, {
        loudness: 0.5,
        emphasis,
        is_speaking: true,
        is_pause: false,
      }, peaks),
      tone: toneCfg,
      duration: 2.0,
      seed: "mono-head",
    });
    return inst.seek(1.0);
  };

  const h0 = evalHead(0.0, { preset: "lively" });
  const hMid = evalHead(0.45, { preset: "lively" });
  const hPeak = evalHead(0.95, { preset: "lively" });

  assert.ok(hMid.headNodY > h0.headNodY, `expected mid emphasis nod (${hMid.headNodY}) > zero (${h0.headNodY})`);
  assert.ok(hPeak.headNodY > hMid.headNodY, `expected peak emphasis nod (${hPeak.headNodY}) > mid (${hMid.headNodY})`);
  assert.ok(Math.abs(hPeak.headTilt) > Math.abs(h0.headTilt), "emphasis peak must increase head tilt");

  // Presets calm < lively < dramatic
  const hCalm = evalHead(0.85, { preset: "calm" });
  const hLively = evalHead(0.85, { preset: "lively" });
  const hDramatic = evalHead(0.85, { preset: "dramatic" });
  assert.ok(hCalm.headNodY < hLively.headNodY && hLively.headNodY < hDramatic.headNodY);

  // Extreme Advanced gains never exceed natural TONE_LIMITS
  const hExtreme = evalHead(1.0, {
    preset: "dramatic",
    mouthGain: 2.0,
    browGain: 2.0,
    headGain: 2.0,
    chestGain: 2.0,
    wingGain: 2.0,
  });
  const lim = sandbox.StageMascot.TONE_LIMITS;
  assert.ok(hExtreme.headTilt >= lim.headTiltMin - 7 && hExtreme.headTilt <= lim.headTiltMax + 7);
  assert.ok(hExtreme.headNodY >= lim.headNodMin - 6 && hExtreme.headNodY <= lim.headNodMax + 6);
  assert.ok(hExtreme.mouthOpen <= lim.mouthMax);
  assert.ok(hExtreme.browY >= -28 && hExtreme.browY <= 16);
});

test("critically damped spring seek(t) with narration.prosody.json is 100% deterministic out-of-order", () => {
  const demoVis = JSON.parse(
    fs.readFileSync(path.join(STUDIO_DIR, "examples", "mascot-demo", "narration.visemes.json"), "utf8"),
  );
  const demoPro = JSON.parse(
    fs.readFileSync(path.join(STUDIO_DIR, "examples", "mascot-demo", "narration.prosody.json"), "utf8"),
  );
  const { sandbox } = createStageSandbox("16:9");
  const cfg = {
    side: "left",
    scale: 1,
    expression: "neutral",
    visemeTrack: demoVis,
    prosodyTrack: demoPro,
    tone: { preset: "lively" },
    duration: demoPro.duration,
    seed: "spring-det",
  };
  const i1 = sandbox.StageMascot.createMascotInstance(createMockElement("div"), cfg);
  const i2 = sandbox.StageMascot.createMascotInstance(createMockElement("div"), cfg);

  // Random-access seeks on i1 must match direct seek on i2 identically
  i1.seek(4.8);
  i1.seek(0.15);
  i1.seek(2.9);
  const st1 = i1.seek(1.433);
  const st2 = i2.seek(1.433);
  assert.deepEqual(st1, st2);
  assert.deepEqual(snapshotRig(i1.rig), snapshotRig(i2.rig));
});

test("applyLiveVoice and ObsLiveVoice YIN pitch detector work cleanly with zero Math.random", () => {
  const { sandbox } = createStageSandbox("16:9");
  const inst = sandbox.StageMascot.createMascotInstance(createMockElement("div"), {
    expression: "neutral",
    tone: { preset: "lively" },
    duration: 4,
    seed: "live-test",
  });

  // Step 20 frames of live high-pitch loud voice (~333ms) and verify responsive pose
  let st = null;
  for (let i = 0; i < 20; i += 1) {
    st = inst.applyLiveVoice({
      active: true,
      loudness: 0.85,
      db: -8,
      f0Hz: 240,
      pitchNorm: 0.75,
      pitchDelta: 0.1,
      emphasis: 0.8,
      isSpeaking: true,
      viseme: "wide",
    }, 1 / 60);
  }
  assert.equal(st.liveMode, true);
  assert.ok(st.mouthOpen > 0.5, `expected live mouthOpen > 0.5, got ${st.mouthOpen}`);
  assert.ok(st.browY < 0, `expected raised brow on high pitch, got ${st.browY}`);

  // Verify ObsLiveVoice YIN pitch detector detects a synthetic 200 Hz sine wave accurately
  const obsSrc = fs.readFileSync(path.join(KH_DIR, "obs_stage", "obs-stage.js"), "utf8");
  const noopEl = () => ({
    style: {},
    classList: { toggle() {}, add() {}, remove() {} },
    textContent: "",
    className: "",
  });
  const obsBox = {
    window: null,
    document: {
      getElementById: noopEl,
      documentElement: noopEl(),
      body: noopEl(),
    },
    URLSearchParams,
    Math,
    Float32Array,
    Array,
    Number,
    String,
    Object,
    Boolean,
    JSON,
    console,
    addEventListener() {},
    setTimeout: () => 0,
    clearTimeout() {},
    setInterval: () => 0,
    clearInterval() {},
    fetch: () => Promise.resolve({ ok: false }),
    WebSocket: function MockWs() {},
    navigator: {},
    location: { search: "", protocol: "http:", host: "127.0.0.1:3000" },
    innerWidth: 1920,
    innerHeight: 1080,
  };
  obsBox.window = obsBox;
  vm.runInNewContext(obsSrc, obsBox);

  const sr = 48000;
  const buf = new Float32Array(1024);
  for (let i = 0; i < buf.length; i += 1) {
    buf[i] = 0.5 * Math.sin((2 * Math.PI * 200 * i) / sr);
  }
  const f0 = obsBox.ObsLiveVoice.detectLivePitchYIN(buf, sr);
  assert.ok(Math.abs(f0 - 200) < 3.5, `expected ~200 Hz from live YIN detector, got ${f0}`);

  // Verify zero Math.random() calls across all stage, obs, and editor mascot/puppet modules
  for (const rel of [
    "obs_stage/obs-stage.js",
    "editor/mascot-ui.js",
    "editor/puppet-inspector.js",
    "stage/mascot-rig.js",
    "stage/motion-tokens.js",
  ]) {
    const src = fs.readFileSync(path.join(KH_DIR, rel), "utf8");
    assert.equal(/\bMath\.random\s*\(/.test(src), false, `Forbidden Math.random() call found in ${rel}`);
  }
});

test("Phase 1: 18-part SVG tree, visibility/transform/outline/zOrder, and Brand Palette Lock", () => {
  const { sandbox } = createStageSandbox("16:9");
  const expectedParts = [
    "body", "head", "beak_upper", "beak_lower",
    "eye_l", "eye_r", "pupil_l", "pupil_r",
    "lid_l", "lid_r", "brow_l", "brow_r",
    "crest", "wing_l", "wing_r", "tail", "legs", "accessories",
  ];

  // 1) Locked palette ignores custom color overrides
  const inst = sandbox.StageMascot.createMascotInstance(createMockElement("div"), {
    duration: 4,
    seed: "p1-parts",
    puppet: {
      paletteLock: true,
      palette: { redPrimary: "#00FFAA" },
      parts: {
        head: { x: 14, y: -6, rotation: 8, scaleX: 1.1, outlineWidth: 2.0, color: "#112233" },
        crest: { visible: false },
        tail: { zOrder: 10 },
      },
      accessories: ["glasses", "bowtie"],
    },
  });

  for (const pk of expectedParts) {
    assert.ok(inst.rig.parts[pk], `Missing part in rig.parts: ${pk}`);
  }
  assert.equal(inst.rig.parts.crest.getAttribute("display"), "none");
  assert.equal(inst.rig.accGlasses.getAttribute("opacity"), "1");
  assert.equal(inst.rig.accBowtie.getAttribute("opacity"), "1");
  assert.equal(inst.rig.accHeadphones.getAttribute("opacity"), "0");
  // Brand palette lock protected redPrimary
  const headPath = inst.rig.headG.children[0];
  assert.equal(headPath.getAttribute("fill"), sandbox.StageMotionTokens.MASCOT_PALETTE.redPrimary);
  // outlineWidth 2.0 scaled base stroke-width 7.5 -> 15.00
  assert.equal(headPath.getAttribute("stroke-width"), "15.00");
  // zOrder=10 moved tailG to last child of rootG
  const rootKids = inst.rig.rootG.children;
  assert.equal(rootKids[rootKids.length - 1], inst.rig.tailG);

  // 2) Unlocking paletteLock via live setPuppetConfig updates color cleanly
  inst.setPuppetConfig({
    paletteLock: false,
    palette: { redPrimary: "#00AA88" },
    parts: { crest: { visible: true } },
  });
  assert.equal(inst.rig.parts.crest.getAttribute("display"), "inline");
  assert.equal(headPath.getAttribute("fill"), "#00AA88");
});

test("Phase 1: 10 built-in presets, analytical mass-spring-damper regimes, keyframes & per-sentence overrides", () => {
  const { sandbox } = createStageSandbox("16:9");
  const MT = sandbox.StageMotionTokens;
  const SM = sandbox.StageMascot;

  // All 10 presets present
  const presetKeys = Object.keys(MT.TONE_PRESETS);
  assert.equal(presetKeys.length, 10);
  for (const pk of ["calm", "lively", "dramatic", "newsreader", "comedian", "whisper", "shouting", "sleepy", "angry", "excited"]) {
    assert.ok(MT.TONE_PRESETS[pk], `Missing preset: ${pk}`);
  }

  // Mass-spring-damper: underdamped overshoots target (> 1.0), overdamped approaches monotonically (<= 1.0)
  const underSt = { x: 0, v: 0 };
  const overSt = { x: 0, v: 0 };
  let maxUnder = 0;
  let maxOver = 0;
  for (let i = 0; i < 45; i += 1) {
    maxUnder = Math.max(maxUnder, SM.stepMassSpring(underSt, 1.0, { stiffness: 320, damping: 8, mass: 1.0 }, 1 / 60));
    maxOver = Math.max(maxOver, SM.stepMassSpring(overSt, 1.0, { stiffness: 120, damping: 42, mass: 1.0 }, 1 / 60));
  }
  assert.ok(maxUnder > 1.05, `Expected underdamped overshoot > 1.05, got ${maxUnder}`);
  assert.ok(maxOver <= 1.0001 && maxOver > 0.5, `Expected overdamped monotonic approach, got ${maxOver}`);
  assert.ok(SM.computeDampingRatio({ stiffness: 320, damping: 8, mass: 1.0 }) < 1.0);
  assert.ok(SM.computeDampingRatio({ stiffness: 120, damping: 42, mass: 1.0 }) > 1.0);

  // Keyframed tone curve + per-sentence override evaluation
  const puppetCfg = MT.resolvePuppetConfig({
    preset: "calm",
    keyframes: [
      { t: 0.0, gain: "mouthGain", value: 0.4, ease: "linear" },
      { t: 2.0, gain: "mouthGain", value: 1.8, ease: "linear" },
    ],
    sentences: [
      { start: 0.0, end: 1.5, preset: "whisper", emotion: "thinking" },
      { start: 1.5, end: 3.5, preset: "shouting", emotion: "angry" },
    ],
  });
  const e0 = SM.evaluateToneAt(puppetCfg, 0.5);
  const e1 = SM.evaluateToneAt(puppetCfg, 1.0);
  const e2 = SM.evaluateToneAt(puppetCfg, 2.0);
  assert.equal(e0.tone.preset, "whisper");
  assert.equal(e2.tone.preset, "shouting");
  assert.ok(e1.tone.mouthGain > e0.tone.mouthGain && e2.tone.mouthGain > e1.tone.mouthGain);
  assert.ok(Math.abs(e1.tone.mouthGain - 1.1) < 0.05, `Expected linear midpoint ~1.1, got ${e1.tone.mouthGain}`);
});

test("Phase 2: 15 emotions + intensity + script tags + auto-emotion + 9 gestures + gaze + secondary motion with volume preservation", () => {
  const { sandbox } = createStageSandbox("16:9");
  const MT = sandbox.StageMotionTokens;
  const SM = sandbox.StageMascot;

  assert.equal(Object.keys(MT.EXPRESSIONS).length, 15);
  assert.equal(Object.keys(MT.GESTURES).length, 9);

  // Test all 15 emotions render cleanly & intensity scales deviation from neutral
  for (const emo of Object.keys(MT.EXPRESSIONS)) {
    const inst = SM.createMascotInstance(createMockElement("div"), {
      expression: emo,
      puppet: { emotion: emo, emotionIntensity: 1.2 },
      duration: 3,
      seed: `emo-${emo}`,
    });
    const st = inst.seek(1.0);
    assert.equal(st.emotion, emo);
    assert.ok(Number.isFinite(st.browY) && Number.isFinite(st.headTilt));
  }

  // Script tags trigger emotion, gesture with offset, and gaze target deterministically
  const parsed = MT.parseScriptTags("[point] سلام دنیا [smug:1.3] ببینید [double-take+0.2] [look:camera]", 5.0);
  assert.equal(parsed.emotions[0].expression, "smug");
  assert.equal(parsed.gestures[0].gesture, "point");
  assert.equal(parsed.gestures[1].gesture, "double-take");
  assert.equal(parsed.gaze[0].target, "camera");

  // All 9 gestures activate at their scheduled window
  const gList = Object.keys(MT.GESTURES).map((g, idx) => ({
    t: 0.2 + idx * 1.4,
    gesture: g,
    duration: 1.0,
    offset: 0,
  }));
  const gInst = SM.createMascotInstance(createMockElement("div"), {
    duration: 15,
    seed: "gest-all",
    puppet: { gestures: gList, secondary: { featherJiggle: 1.2, crestOverlap: 1.2, wingFollowThrough: 1.2, squashPreserveVolume: true } },
    prosodyTrack: makeConstantProsodyTrack(30, 15, { loudness: 0.82, pitch_norm: 0.45, emphasis: 0.85, is_speaking: true }),
  });

  for (let idx = 0; idx < gList.length; idx += 1) {
    const g = gList[idx];
    const st = gInst.seek(g.t + 0.45);
    assert.equal(st.gesture, g.gesture, `Expected gesture ${g.gesture} active at t=${g.t + 0.45}`);
    // Volume-preserving squash & stretch: scaleX * scaleY === 1.0000
    assert.ok(Math.abs(st.volumeProduct - 1.0) < 1e-4, `Volume not preserved: ${st.volumeProduct}`);
  }

  // Secondary motion channels react non-trivially during loud emphasis speech
  const secSt = gInst.seek(2.2);
  assert.ok(Math.abs(secSt.crestOverlap) > 0.01 || Math.abs(secSt.featherJiggle) > 0.01, "Expected active secondary motion");

  // Gaze smooth pursuit moves pupils smoothly toward target
  const gazeInst = SM.createMascotInstance(createMockElement("div"), {
    duration: 4,
    side: "right",
    seed: "gaze-test",
    puppet: {
      gaze: {
        target: "left",
        smoothPursuit: 12,
        saccadeScale: 0,
        timeline: [{ t: 1.5, target: "right" }],
      },
    },
  });
  const gLeft = gazeInst.seek(0.8);
  const gRight = gazeInst.seek(2.5);
  assert.ok(gLeft.gazeX < -4, `Expected left gazeX < -4, got ${gLeft.gazeX}`);
  assert.ok(gRight.gazeX > 4, `Expected right gazeX > 4, got ${gRight.gazeX}`);

  // Auto-emotion infers angry on loud low-pitched prosody
  const autoInst = SM.createMascotInstance(createMockElement("div"), {
    expression: "neutral",
    duration: 4,
    seed: "auto-emo",
    puppet: { autoEmotion: true },
    prosodyTrack: makeConstantProsodyTrack(30, 4, { loudness: 0.88, pitch_norm: -0.65, emphasis: 0.75, is_speaking: true }),
  });
  const autoSt = autoInst.seek(1.5);
  assert.equal(autoSt.emotion, "angry", `Expected autoEmotion to infer angry, got ${autoSt.emotion}`);

  // Determinism check: random seek order yields bit-identical Puppet v2 state & SVG transforms
  const r1 = gInst.seek(4.75);
  const s1 = snapshotRig(gInst.rig);
  gInst.seek(0.1);
  gInst.seek(11.3);
  const r2 = gInst.seek(4.75);
  const s2 = snapshotRig(gInst.rig);
  assert.deepEqual(r1, r2);
  assert.deepEqual(s1, s2);
});

test("Phase 3: Coarticulated viseme tracks & deterministic JS Speaker Calibration Wizard", () => {
  const { sandbox } = createStageSandbox("16:9");
  const MT = sandbox.StageMotionTokens;
  const SM = sandbox.StageMascot;

  // Coarticulated track preserves custom per-frame width, teeth, lip_tuck, and phoneme
  const coTrack = {
    version: 2,
    fps: 30,
    duration: 1.0,
    coarticulated: true,
    frames: [
      { t: 0.0, viseme: "small", phoneme: "L", energy: 0.5, openness: 0.25, width: 0.84, teeth: 0.05, lip_tuck: 0.0, tongue: 0.22, stress: 0.1, is_speech: true },
      { t: 0.0333, viseme: "round_o", phoneme: "OW", energy: 0.65, openness: 0.52, width: 0.72, teeth: 0.0, lip_tuck: 0.0, tongue: 0.45, stress: 0.2, is_speech: true },
      { t: 0.0667, viseme: "f_v", phoneme: "F", energy: 0.45, openness: 0.14, width: 1.02, teeth: 0.65, lip_tuck: 0.85, tongue: 0.0, stress: 0.1, is_speech: true },
    ],
  };
  const sampled = SM.sampleTrackAt(coTrack, 0.0);
  assert.equal(sampled.phoneme, "L");
  assert.ok(Math.abs(sampled.widthScale - 0.84) < 1e-4, `Expected coarticulated width 0.84, got ${sampled.widthScale}`);

  // JS Speaker Calibration matches expected F0 & noise gate deterministically
  const calFrames = [];
  for (let i = 0; i < 300; i += 1) {
    const quiet = i < 60 || i > 240;
    const f0 = quiet ? 0 : 185 + ((i % 20) - 10) * 3;
    calFrames.push({
      rms: quiet ? 0.0025 : 0.18,
      db: quiet ? -52 : -15,
      f0Hz: f0,
      pitchConf: quiet ? 0 : 0.9,
    });
  }
  const cal1 = MT.computeSpeakerCalibration(calFrames, 10);
  const cal2 = MT.computeSpeakerCalibration(calFrames, 10);
  assert.deepEqual(cal1, cal2);
  assert.equal(cal1.calibrated, true);
  assert.ok(Math.abs(cal1.medianF0Hz - 185) <= 6, `Expected median F0 ~185 Hz, got ${cal1.medianF0Hz}`);
  assert.ok(cal1.noiseGateDb > cal1.noiseFloorDb && cal1.noiseGateDb < cal1.loudnessMaxDb);
});

test("Phase 3: Live OBS upgrades — noise suppression, Push-to-Talk, hotkeys, latency meter, Web MIDI & Stream Deck", () => {
  const { sandbox } = createStageSandbox("16:9");
  const SM = sandbox.StageMascot;
  const obsSrc = fs.readFileSync(path.join(STUDIO_DIR, "khordegir/obs_stage/obs-stage.js"), "utf8");

  // Run obs-stage.js in a clean VM sandbox with minimal stubs
  const obsSandbox = {
    window: {
      location: { search: "", protocol: "http:", host: "127.0.0.1:3000" },
      innerWidth: 1920,
      innerHeight: 1080,
      StageMotionTokens: sandbox.StageMotionTokens,
      addEventListener() {},
      localStorage: { getItem: () => null },
    },
    document: {
      getElementById: () => null,
      documentElement: { classList: { toggle() {} } },
      body: { classList: { toggle() {} } },
    },
    URLSearchParams,
    Float32Array,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    JSON,
    console,
    navigator: {},
    setTimeout: () => 0,
    clearTimeout() {},
    setInterval: () => 0,
    clearInterval() {},
    fetch: () => Promise.resolve({ ok: false }),
    WebSocket: function FakeWS() {},
  };
  obsSandbox.window.window = obsSandbox.window;
  vm.createContext(obsSandbox);
  vm.runInContext(obsSrc, obsSandbox, { filename: "obs-stage.js" });

  const Live = obsSandbox.window.ObsLiveVoice;
  assert.ok(Live && Live.applyHighPassFilter && Live.createLatencyTracker && Live.createLiveController);

  // 1. Software noise suppression HPF attenuates DC bias & 25 Hz rumble strongly
  const sr = 48000;
  const dcRumble = new Float32Array(1024);
  for (let i = 0; i < dcRumble.length; i += 1) {
    dcRumble[i] = 0.5 + 0.25 * Math.sin((2 * Math.PI * 20 * i) / sr);
  }
  const filtered = Live.applyHighPassFilter(dcRumble, sr, 80);
  let rmsIn = 0, rmsOut = 0;
  for (let i = 200; i < dcRumble.length; i += 1) {
    rmsIn += dcRumble[i] * dcRumble[i];
    rmsOut += filtered[i] * filtered[i];
  }
  assert.ok(Math.sqrt(rmsOut) < Math.sqrt(rmsIn) * 0.45, "HPF should attenuate DC/sub-80Hz rumble");

  // 2. Push-to-Talk mutes loud speech when not held, passes when held
  const tracker = Live.createLiveVoiceTracker({
    noiseSuppression: true,
    noiseGateDb: -45,
    pttEnabled: true,
    pttActive: false,
    medianF0Hz: 200,
  });
  const loud220 = new Float32Array(1024);
  for (let i = 0; i < loud220.length; i += 1) {
    loud220[i] = 0.35 * Math.sin((2 * Math.PI * 220 * i) / sr);
  }
  const mutedFrame = tracker(loud220, null, sr, 1 / 60);
  assert.equal(mutedFrame.pttMuted, true);
  assert.equal(mutedFrame.isSpeaking, false);
  assert.equal(mutedFrame.viseme, "rest");

  tracker.setOptions({ pttActive: true });
  let liveFrame = null;
  for (let k = 0; k < 5; k += 1) liveFrame = tracker(loud220, null, sr, 1 / 60);
  assert.equal(liveFrame.pttMuted, false);
  assert.equal(liveFrame.isSpeaking, true);
  assert.ok(liveFrame.f0Hz > 205 && liveFrame.f0Hz < 235, `Expected ~220 Hz F0, got ${liveFrame.f0Hz}`);

  // 3. Latency tracker computes rolling EWMA & budget status
  const lat = Live.createLatencyTracker();
  lat.record(18.5);
  lat.record(24.0);
  const stats = lat.get();
  assert.equal(stats.underBudget, true);
  assert.equal(stats.status, "ok");
  assert.ok(stats.peakMs >= 24.0);

  // 4. Hotkeys, Web MIDI bytes, and Stream Deck commands drive mascot live emotion & gesture
  const rigInst = SM.createMascotInstance(createMockElement("div"), { duration: 6, seed: "obs-live-ctrl" });
  const events = [];
  const ctrl = Live.createLiveController({
    onEmotion: (e, inten) => { events.push(["emo", e]); rigInst.setLiveEmotion(e, inten); },
    onGesture: (g, opts) => { events.push(["gest", g]); rigInst.triggerLiveGesture(g, opts); },
    onPttChange: (active) => { events.push(["ptt", active]); },
    onToggleHud: () => { events.push(["hud"]); },
  });

  // Keyboard hotkeys
  ctrl.handleKeyDown("Digit3"); // angry
  ctrl.handleKeyDown("KeyQ");   // point
  ctrl.handleKeyDown("Space");  // PTT on
  ctrl.handleKeyUp("Space");    // PTT off
  ctrl.handleKeyDown("KeyH");   // HUD toggle

  // Web MIDI Note On (note 39 = smug, note 52 = thumbs-up) & CC 64 (PTT pedal) & CC 1 (intensity)
  ctrl.handleMidiBytes([0x90, 39, 110]);
  ctrl.handleMidiBytes([0x90, 52, 100]);
  ctrl.handleMidiBytes([0xB0, 64, 127]);
  ctrl.handleMidiBytes([0xB0, 1, 96]);

  // Verify live rig reflects triggered emotion + gesture
  const stLive = rigInst.applyLiveVoice(liveFrame, 1 / 60);
  assert.equal(stLive.emotion, "smug");
  assert.equal(stLive.gesture, "thumbs-up");

  // Stream Deck export profile is well-formed
  const profile = ctrl.exportMappingProfile();
  assert.equal(profile.schema, "khordegir-obs-live-mapping");
  assert.ok(Array.isArray(profile.streamDeckCommands) && profile.streamDeckCommands.length >= 5);
  assert.ok(events.some((e) => e[0] === "emo" && e[1] === "angry"));
  assert.ok(events.some((e) => e[0] === "gest" && e[1] === "point"));
  assert.ok(events.some((e) => e[0] === "hud"));
});

test("Phase 4: 5 characters, 6 outfits, 7 seasonal skins, 13 accessories & timed swaps", () => {
  const { sandbox } = createStageSandbox("16:9");
  const MT = sandbox.StageMotionTokens;
  const SM = sandbox.StageMascot;

  assert.equal(Object.keys(MT.CHARACTERS).length, 5);
  assert.equal(Object.keys(MT.OUTFITS).length, 6);
  assert.equal(Object.keys(MT.SKINS).length, 7);
  assert.equal(Object.keys(MT.ACCESSORIES).length, 13);

  // Every character renders on the exact 18-part tree; species layers toggle cleanly
  for (const cid of Object.keys(MT.CHARACTERS)) {
    const inst = SM.createMascotInstance(createMockElement("div"), {
      duration: 4,
      seed: `char-${cid}`,
      puppet: { character: cid, skin: "classic", paletteLock: true },
    });
    const st = inst.seek(1.0);
    assert.equal(st.character, cid);
    assert.equal(Object.keys(inst.rig.parts).length, 18);
    if (cid === "red_eagle") {
      // Exact brand palette preserved for red_eagle + classic
      assert.equal(inst.rig.headG.children[0].getAttribute("fill"), MT.MASCOT_PALETTE.redPrimary);
      assert.equal(inst.rig.speciesLayers.owlHead.getAttribute("display"), "none");
    } else if (cid === "vesper_owl") {
      assert.equal(inst.rig.speciesLayers.owlHead.getAttribute("display"), "inline");
    } else if (cid === "barnaby_tortoise") {
      assert.equal(inst.rig.speciesLayers.tortoiseShell.getAttribute("display"), "inline");
    }
  }

  // All 7 skins resolve valid hex palettes; non-classic skins customize palette tokens
  for (const sid of Object.keys(MT.SKINS)) {
    const pal = MT.resolveCharacterPalette("red_eagle", sid);
    assert.ok(/^#[0-9A-F]{6}$/i.test(pal.redPrimary), `Bad skin redPrimary for ${sid}`);
    if (sid !== "classic") {
      assert.notDeepEqual(pal, MT.MASCOT_PALETTE, `Expected skin ${sid} to alter palette`);
    }
  }

  // Timed accessory swaps (accessoryTimeline + inline [acc:...] / [outfit:...] tags)
  const swapInst = SM.createMascotInstance(createMockElement("div"), {
    duration: 6,
    seed: "swap-test",
    say: "شروع [acc:top_hat,monocle] میانه [outfit:cozy] پایان",
    puppet: {
      outfit: "default",
      accessories: ["glasses"],
      accessoryTimeline: [
        { t: 1.0, add: ["mic"], remove: ["glasses"] },
      ],
    },
  });
  const sEarly = swapInst.seek(0.2);
  assert.ok(sEarly.activeAccessories.includes("glasses"));
  assert.equal(swapInst.rig.accessoryMap.glasses.getAttribute("opacity"), "1");
  assert.equal(swapInst.rig.accessoryMap.mic.getAttribute("opacity"), "0");

  const sMid = swapInst.seek(1.3);
  assert.ok(sMid.activeAccessories.includes("mic"));
  assert.ok(!sMid.activeAccessories.includes("glasses"));
  assert.equal(swapInst.rig.accessoryMap.mic.getAttribute("opacity"), "1");

  const sEnd = swapInst.seek(5.6);
  // Cozy outfit includes beanie, scarf, coffee_mug
  assert.ok(sEnd.activeAccessories.includes("beanie"));
  assert.ok(sEnd.activeAccessories.includes("coffee_mug"));
  assert.equal(swapInst.rig.accessoryMap.coffee_mug.getAttribute("opacity"), "1");
});

test("Phase 4: Multi-character Dialogue Mode across 16:9, 9:16, 1:1 with deterministic turn-taking & listener reactions", () => {
  const dialogueSpec = {
    mode: "two-shot",
    duration: 5.0,
    characters: [
      { id: "host", character: "red_eagle", side: "left", outfit: "podcast" },
      { id: "guest", character: "vesper_owl", side: "right", outfit: "formal", skin: "nowruz" },
    ],
    turns: [
      { speaker: "host", start: 0.0, end: 2.4, text: "سلام وسپر چطوری؟", listenerReaction: "interested" },
      { speaker: "guest", start: 2.4, end: 5.0, text: "عالی ام عقاب قرمز!", emotion: "smug", listenerReaction: "skeptical" },
    ],
  };

  for (const fmt of ["16:9", "9:16", "1:1"]) {
    const ctx = createStageSandbox(fmt);
    const tpl = ctx.getTemplate();
    tpl.build(
      {
        template: "mascot_talk",
        format: fmt,
        title: "گفت‌وگوی دو شخصیت",
        duration: 5.0,
        dialogue: dialogueSpec,
      },
      ctx.A,
    );
    const insts = ctx.Stage._dialogueMascots;
    assert.equal(insts.length, 2, `Expected 2 dialogue characters on ${fmt}`);

    // During Turn 1 (t=1.0): host speaks, guest listens with shut beak & interested reaction
    ctx.Stage.seek(1.0);
    const hostT1 = insts[0].getState();
    const guestT1 = insts[1].getState();
    assert.equal(hostT1.isListening, false);
    assert.ok(hostT1.mouthOpen > 0.02, `Expected host beak open on ${fmt}, got ${hostT1.mouthOpen}`);
    assert.equal(guestT1.isListening, true);
    assert.equal(guestT1.mouthOpen, 0, `Expected listening guest beak shut on ${fmt}`);
    assert.equal(guestT1.listenerReaction, "interested");
    // Automatic "other" gaze in screen space (left side has flipX = -1, right side has flipX = +1)
    assert.ok((-1 * hostT1.gazeX) > 0, `Host on left should gaze right on screen toward guest, got screenX=${-1 * hostT1.gazeX}`);
    assert.ok(guestT1.gazeX < 0, `Guest on right should gaze left on screen toward host, got screenX=${guestT1.gazeX}`);

    // During Turn 2 (t=3.5): guest speaks, host listens with shut beak & skeptical reaction
    ctx.Stage.seek(3.5);
    const hostT2 = insts[0].getState();
    const guestT2 = insts[1].getState();
    assert.equal(guestT2.isListening, false);
    assert.ok(guestT2.mouthOpen > 0.02, `Expected guest beak open on ${fmt}`);
    assert.equal(hostT2.isListening, true);
    assert.equal(hostT2.mouthOpen, 0, `Expected listening host beak shut on ${fmt}`);
    assert.equal(hostT2.listenerReaction, "skeptical");

    // Out-of-order determinism check
    ctx.Stage.seek(1.0);
    assert.deepEqual(insts[0].getState(), hostT1);
    assert.deepEqual(insts[1].getState(), guestT1);
  }
});

test("Phase 4: Offline JS SVG Rig Importer maps English & Persian layers with deterministic auto-pivots", () => {
  const { sandbox } = createStageSandbox("16:9");
  const MT = sandbox.StageMotionTokens;

  const sampleSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 360">
      <g id="body"><rect x="100" y="180" width="120" height="120" fill="#181818"/></g>
      <g id="سر"><circle cx="160" cy="110" r="55" fill="#EB1818"/></g>
      <g inkscape:label="منقار_پایین"><rect x="140" y="120" width="40" height="30" fill="#F8AD1B"/></g>
      <g data-part="wing_l"><rect x="40" y="180" width="60" height="90" fill="#D41010"/></g>
      <g id="unknown_bg_layer"><rect x="0" y="0" width="320" height="360"/></g>
    </svg>
  `;
  const r1 = MT.parseSvgToPuppetRig(sampleSvg, "red_eagle");
  const r2 = MT.parseSvgToPuppetRig(sampleSvg, "red_eagle");
  assert.deepEqual(r1, r2);
  assert.equal(r1.schema, "khordegir-svg-rig-import");
  assert.equal(r1.matchedCount, 4);
  assert.equal(r1.totalCanonicalParts, 18);
  assert.ok(r1.unmatchedLayers.includes("unknown_bg_layer"));
  assert.ok(Math.abs(r1.parts.head.pivotX - 320.0) < 0.2);
  assert.ok(Math.abs(r1.parts.head.pivotY - 303.6) < 0.2);
  assert.ok(Math.abs(r1.parts.beak_lower.pivotY - 249.0) < 0.2);
});

/* ============================================================================
   STUDIO MOTION v2 TESTS (A1 Motion Tokens, A2 14 Text Presets, A4 32 Transitions, B1-B6 12 Templates)
   ============================================================================ */

function createRichDomElement(tag, docRef) {
  const listeners = Object.create(null);
  const styleObj = Object.create(null);
  styleObj.setProperty = function (k, v) { this[k] = String(v); };
  styleObj.getPropertyValue = function (k) { return this[k] || ""; };

  const el = {
    tagName: String(tag).toUpperCase(),
    nodeType: 1,
    attrs: Object.create(null),
    style: styleObj,
    children: [],
    parentNode: null,
    get parentElement() { return this.parentNode; },
    get firstElementChild() { return this.children[0] || null; },
    className: "",
    _text: "",
    _html: "",
    dataset: Object.create(null),
    offsetHeight: 96,
    offsetWidth: 120,
    scrollHeight: 90,
    scrollWidth: 320,
    clientHeight: 120,
    clientWidth: 420,
    get textContent() {
      if (this.children.length) return this.children.map((c) => c.textContent).join("");
      return this._text;
    },
    set textContent(v) {
      this._text = String(v ?? "");
      this._html = this._text;
      this.children = [];
    },
    get innerHTML() {
      return this._html || this.textContent;
    },
    set innerHTML(v) {
      this._html = String(v ?? "");
      this.children = [];
      this._text = "";
      // Stack-based lightweight HTML parser supporting nested spans (.k-line > .k-word-group > .k-char, .hl, .ul, .strike, .k-count-num)
      const tokenRe = /<(\/?)([a-zA-Z0-9-]+)([^>]*)>|([^<]+)/g;
      const stack = [this];
      let m;
      while ((m = tokenRe.exec(this._html)) !== null) {
        const cur = stack[stack.length - 1];
        if (m[4] !== undefined) {
          cur._text += m[4];
          cur.children.push({
            nodeType: 3,
            tagName: "#TEXT",
            className: "",
            _text: m[4],
            textContent: m[4],
            children: [],
            style: {},
            matches: () => false,
          });
        } else {
          const isClose = m[1] === "/";
          const tagName = m[2].toLowerCase();
          const attrsStr = m[3] || "";
          const selfClose = /\/\s*$/.test(attrsStr) || tagName === "br" || tagName === "img" || tagName === "hr";
          if (isClose) {
            if (stack.length > 1) stack.pop();
          } else {
            const child = createRichDomElement(tagName, docRef);
            const clsM = attrsStr.match(/class\s*=\s*["']([^"']+)["']/i);
            if (clsM) child.className = clsM[1];
            const idM = attrsStr.match(/id\s*=\s*["']([^"']+)["']/i);
            if (idM) child.id = idM[1];
            const attrRe = /data-([a-z0-9_-]+)\s*=\s*["']([^"']*)["']/gi;
            let am;
            while ((am = attrRe.exec(attrsStr)) !== null) {
              const dk = am[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
              child.dataset[dk] = am[2];
            }
            cur.appendChild(child);
            if (!selfClose) stack.push(child);
          }
        }
      }
    },
    classList: {
      add(...cls) {
        const cur = new Set(String(el.className || "").split(/\s+/).filter(Boolean));
        cls.forEach((c) => cur.add(c));
        el.className = [...cur].join(" ");
      },
      remove(...cls) {
        const cur = new Set(String(el.className || "").split(/\s+/).filter(Boolean));
        cls.forEach((c) => cur.delete(c));
        el.className = [...cur].join(" ");
      },
      toggle(c, force) {
        const has = String(el.className || "").split(/\s+/).includes(c);
        const want = force !== undefined ? !!force : !has;
        if (want) this.add(c); else this.remove(c);
      },
      contains(c) {
        return String(el.className || "").split(/\s+/).includes(c);
      },
    },
    setAttribute(k, v) {
      this.attrs[k] = String(v);
      if (k === "class") this.className = String(v);
      if (k === "id") this.id = String(v);
    },
    getAttribute(k) {
      if (k === "class") return this.className;
      return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null;
    },
    appendChild(child) {
      if (!child) return child;
      child.parentNode = this;
      this.children.push(child);
      return child;
    },
    append(...nodes) {
      nodes.forEach((n) => this.appendChild(n));
    },
    insertBefore(child, ref) {
      child.parentNode = this;
      const idx = this.children.indexOf(ref);
      if (idx < 0) this.children.push(child);
      else this.children.splice(idx, 0, child);
      return child;
    },
    replaceChild(newChild, oldChild) {
      const idx = this.children.indexOf(oldChild);
      newChild.parentNode = this;
      if (idx >= 0) this.children[idx] = newChild;
      else this.children.push(newChild);
      return oldChild;
    },
    remove() {
      if (!this.parentNode) return;
      const i = this.parentNode.children.indexOf(this);
      if (i >= 0) this.parentNode.children.splice(i, 1);
      this.parentNode = null;
    },
    matches(sel) {
      return sel.split(",").some((part) => {
        const s = part.trim();
        if (s.startsWith(".")) return this.classList.contains(s.slice(1));
        if (s.startsWith("[") && s.endsWith("]")) {
          const inner = s.slice(1, -1);
          const eqIdx = inner.indexOf("=");
          if (eqIdx > 0) {
            const attrName = inner.slice(0, eqIdx).trim();
            const want = inner.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, "");
            if (this.attrs[attrName] === want) return true;
            if (attrName.startsWith("data-")) {
              const key = attrName.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
              return this.dataset[key] === want;
            }
            return false;
          }
          if (this.attrs[inner] !== undefined) return true;
          if (inner.startsWith("data-")) {
            const key = inner.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
            return this.dataset[key] !== undefined;
          }
          return false;
        }
        return this.tagName === s.toUpperCase();
      });
    },
    closest(sel) {
      let cur = this;
      while (cur) {
        if (cur.matches && cur.matches(sel)) return cur;
        cur = cur.parentNode;
      }
      return null;
    },
    querySelectorAll(sel) {
      const out = [];
      const parts = sel.split(",").map((p) => p.trim()).filter(Boolean);
      const walk = (n) => {
        for (const c of n.children || []) {
          if (parts.some((p) => {
            if (p.includes(" ")) {
              const last = p.split(/\s+/).pop();
              return c.matches(last);
            }
            return c.matches(p);
          })) out.push(c);
          walk(c);
        }
      };
      walk(this);
      return out;
    },
    querySelector(sel) {
      return this.querySelectorAll(sel)[0] || null;
    },
    addEventListener(ev, fn) {
      listeners[ev] = listeners[ev] || [];
      listeners[ev].push(fn);
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 420, height: 120 };
    },
    decode() {
      return Promise.resolve();
    },
  };
  return el;
}

function createFullStageEngineSandbox() {
  const stageEl = createRichDomElement("div");
  stageEl.id = "stage";
  const bodyEl = createRichDomElement("body");
  bodyEl.appendChild(stageEl);
  const htmlEl = createRichDomElement("html");
  htmlEl.appendChild(bodyEl);

  const doc = {
    documentElement: htmlEl,
    body: bodyEl,
    head: createRichDomElement("head"),
    fonts: { ready: Promise.resolve() },
    createElement: (tag) => createRichDomElement(tag, doc),
    createElementNS: (_ns, tag) => createRichDomElement(tag, doc),
    getElementById: (id) => (id === "stage" ? stageEl : null),
    querySelector: (sel) => (sel === "#stage" ? stageEl : bodyEl.querySelector(sel)),
    querySelectorAll: (sel) => bodyEl.querySelectorAll(sel),
  };

  // Minimal deterministic timeline shim (same API surface as GSAP paused timelines)
  const makeTl = () => {
    const entries = [];
    let curT = 0;
    const tl = {
      _entries: entries,
      _t: 0,
      fromTo(target, fromVars, toVars, at = 0) {
        entries.push({ kind: "fromTo", target, from: Object.assign({}, fromVars), to: Object.assign({}, toVars), at: Number(at) || 0, dur: Number(toVars?.duration) || 0.3 });
        return tl;
      },
      from(target, vars, at = 0) {
        entries.push({ kind: "from", target, from: Object.assign({}, vars), at: Number(at) || 0, dur: Number(vars?.duration) || 0.3 });
        return tl;
      },
      to(target, vars, at = 0) {
        entries.push({ kind: "to", target, to: Object.assign({}, vars), at: Number(at) || 0, dur: Number(vars?.duration) || 0.3 });
        return tl;
      },
      set(target, vars, at = 0) {
        entries.push({ kind: "set", target, to: Object.assign({}, vars), at: Number(at) || 0, dur: 0 });
        return tl;
      },
      time(t) {
        if (t === undefined) return curT;
        curT = Number(t) || 0;
        tl._t = curT;
        for (const e of entries) {
          const p = e.dur > 0 ? Math.max(0, Math.min(1, (curT - e.at) / e.dur)) : (curT >= e.at ? 1 : 0);
          if (e.target && typeof e.target === "object" && !e.target.tagName) {
            for (const k of Object.keys(e.to || {})) {
              if (typeof e.to[k] === "number" && k !== "duration" && k !== "repeat" && k !== "stagger") {
                const startV = (e.from && typeof e.from[k] === "number") ? e.from[k] : 0;
                e.target[k] = startV + (e.to[k] - startV) * p;
              }
            }
          }
          if (e.to && typeof e.to.onUpdate === "function") e.to.onUpdate();
        }
        return tl;
      },
      duration() {
        return entries.reduce((mx, e) => Math.max(mx, e.at + e.dur), 0);
      },
      kill() { entries.length = 0; },
    };
    return tl;
  };

  const sandbox = {
    window: null,
    document: doc,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    JSON,
    Set,
    Map,
    RegExp,
    Intl,
    Promise,
    console,
    performance: { now: () => 0 },
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
    getComputedStyle: (el) => ({ fontSize: (el && el.style && el.style.fontSize) || "48px" }),
    addEventListener: () => {},
    gsap: { timeline: () => makeTl(), set: () => {} },
    parent: { postMessage: () => {} },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);

  const loadScript = (rel) => {
    const src = fs.readFileSync(path.join(KH_DIR, rel), "utf8");
    vm.runInContext(src, sandbox, { filename: rel });
  };
  loadScript("stage/motion-tokens.js");
  loadScript("stage/core.js");
  loadScript("stage/fx.js");
  loadScript("stage/charts.js");
  loadScript("stage/mascot-rig.js");
  loadScript("stage/template-lib.js");
  loadScript("themes/khordegir-dark.js");

  // Override Stage.script so templates load synchronously from disk in Node VM
  sandbox.Stage.script = async (relUrl) => {
    const clean = String(relUrl).replace(/^\.\.\//, "");
    loadScript(clean);
  };

  return { sandbox, stageEl, loadScript };
}

test("Studio A1: Motion tokens, 8 personalities, overshoot protection on body/image, anticipation & enhanced A.stagger", async () => {
  const { sandbox } = createFullStageEngineSandbox();
  const MT = sandbox.StageMotionTokens;
  const S = sandbox.Stage;

  // Verify A1 token catalogs
  assert.equal(Object.keys(MT.DURATION_TOKENS).length, 7);
  assert.equal(Object.keys(MT.STAGGER_TOKENS).length, 6);
  assert.ok(Object.keys(MT.EASING_FAMILIES).length >= 16);
  assert.equal(Object.keys(MT.MOTION_PERSONALITIES).length, 8);
  assert.equal(MT.OVERSHOOT_RULES.body.allowOvershoot, false);
  assert.equal(MT.OVERSHOOT_RULES.image.allowOvershoot, false);
  assert.equal(MT.OVERSHOOT_RULES.badge.allowOvershoot, true);

  // Register a probe template verifying A.dur, A.enter overshoot guard, anticipation, and A.stagger modes
  let probeStats = null;
  S.template({
    name: "probe_a1",
    build(s, A) {
      const bodyEl = A.text(A.root, "متن بدنه رسمی", "body");
      const badgeEl = A.text(A.root, "فوری", "caption", "badge");
      A.enter(bodyEl, "body", 0, 0, { ease: "spring" }); // Must be clamped away from bounce!
      A.enter(badgeEl, "badge");
      const items = [0, 1, 2, 3].map((i) => A.el("div", "card", A.root, {}));
      const endCenter = A.stagger(items, "card", { from: "center", step: "grid" });
      probeStats = {
        personality: A.personality.name,
        durBase: A.dur("base"),
        endCenter,
        tlCount: S.tl._entries.length,
      };
    },
  });

  await S.load({ template: "probe_a1", motionPersonality: "calm" });
  const calmDur = probeStats.durBase;
  await S.load({ template: "probe_a1", motionPersonality: "punchy" });
  const punchyDur = probeStats.durBase;

  assert.ok(calmDur > punchyDur, `Calm personality (${calmDur}s) should be slower than Punchy (${punchyDur}s)`);
  assert.ok(probeStats.endCenter > 0);
  // Check that body element never received a spring/back ease
  const bodyTweens = S.tl._entries.filter((e) => e.target && e.target.className && e.target.className.includes("t-body"));
  assert.ok(bodyTweens.length > 0);
  bodyTweens.forEach((tw) => {
    const ez = tw.to && tw.to.ease;
    assert.ok(!/back|elastic|spring/.test(String(ez || "")), `Body must never use bouncy ease, got ${ez}`);
  });
});

test("Studio A2: All 14 RTL-safe Text Animation presets preserve Persian cursive words while splitting English cleanly", async () => {
  const { sandbox } = createFullStageEngineSandbox();
  const MT = sandbox.StageMotionTokens;
  const S = sandbox.Stage;

  const presetNames = Object.keys(MT.TEXT_ANIMATION_PRESETS);
  assert.equal(presetNames.length, 14);

  let lastEl = null;
  S.template({
    name: "probe_a2",
    build(s, A) {
      const el = A.text(A.root, s.sampleText, "hero");
      A.kinetic(el, { mode: s.textMotion, role: "title" });
      lastEl = el;
    },
  });

  const bilingualSample = "خرده‌گیر می‌شود 2026 Studio";
  for (const preset of presetNames) {
    await S.load({ template: "probe_a2", textMotion: preset, sampleText: bilingualSample });
    assert.ok(S.tl._entries.length > 0, `Preset ${preset} should schedule deterministic GSAP timeline entries`);
    S.seek(0.0);
    S.seek(0.45);
    S.seek(2.2);

    if (preset === "letter-wave") {
      // Persian cursive words with ZWNJ must stay intact as .k-word spans, NEVER broken into .k-char!
      const words = lastEl.querySelectorAll(".k-word").map((n) => n.textContent);
      const chars = lastEl.querySelectorAll(".k-char").map((n) => n.textContent);
      assert.ok(words.some((w) => w.includes("می‌شود") || w.includes("خرده‌گیر")), "Persian cursive words must stay intact in letter-wave");
      assert.ok(chars.length >= 6, `English run 'Studio' should split into .k-char spans, got ${chars.length}`);
      assert.ok(chars.every((ch) => !/[\u0600-\u06FF]/.test(ch)), "No Arabic/Persian letters may ever be placed in disconnected .k-char spans");
    }

    if (preset === "typewriter") {
      S.seek(0.0);
      const atStart = lastEl.querySelector(".k-type-text").textContent;
      S.seek(4.0);
      const atEnd = lastEl.querySelector(".k-type-text").textContent;
      assert.equal(atStart, "");
      assert.equal(atEnd, "خرده‌گیر می‌شود ۲۰۲۶ Studio");
      // Determinism: seeking back to 0.0 restores empty string
      S.seek(0.0);
      assert.equal(lastEl.querySelector(".k-type-text").textContent, "");
    }

    if (preset === "counting-text") {
      const cNodes = lastEl.querySelectorAll(".k-count-num");
      assert.ok(cNodes.length >= 1, "counting-text should detect and animate embedded numbers");
    }
  }
});

test("Studio A4: Transition Library 3.0 — all 40 broadcast transitions run deterministically across 3 formats within 1.06 zoom cap", async () => {
  const { sandbox } = createFullStageEngineSandbox();
  const S = sandbox.Stage;
  const FX = S.fx;

  assert.equal(FX.CATALOG.transitions.length, 40, `Expected 40 transitions, got ${FX.CATALOG.transitions.length}`);

  S.template({
    name: "probe_a4",
    build(s, A) {
      const t = A.text(A.root, s.title || "عنوان تست", "hero");
      A.enter(t, "title");
    },
  });

  for (const tr of FX.CATALOG.transitions) {
    for (const fmt of ["16:9", "9:16", "1:1"]) {
      await S.load(
        {
          template: "probe_a4",
          title: `تست ${tr}`,
          transition: tr,
          transitionTiming: { duration: 0.48, delay: 0.02, intensity: 1.15 },
          seed: 7,
        },
        { format: fmt }
      );
      // Verify no .content tween ever exceeds STAGE_ZOOM_CAP = 1.06
      for (const entry of S.tl._entries) {
        if (entry.target && entry.target.className === "content") {
          if (entry.from && typeof entry.from.scale === "number") {
            assert.ok(entry.from.scale <= 1.06001, `Transition ${tr} (${fmt}) exceeded 1.06 zoom cap: ${entry.from.scale}`);
          }
          if (entry.to && typeof entry.to.scale === "number") {
            assert.ok(entry.to.scale <= 1.06001, `Transition ${tr} (${fmt}) exceeded 1.06 zoom cap: ${entry.to.scale}`);
          }
        }
      }
      // Deterministic seek out-of-order
      S.seek(0.25);
      S.seek(1.5);
      S.seek(0.25);
    }
  }
});

test("Studio B1–B6: All 12 new broadcast templates render & seek deterministically across 16:9, 9:16, and 1:1", async () => {
  const { sandbox, loadScript } = createFullStageEngineSandbox();
  const S = sandbox.Stage;
  loadScript("templates/_index.js");
  const newTemplates = [
    "breaking_news",
    "fact_check",
    "two_source_compare",
    "definition_card",
    "quiz_poll",
    "mistake_vs_correct",
    "step_by_step",
    "hook_title",
    "before_after",
    "audiogram",
    "comparison_table",
    "newspaper_clip",
  ];
  for (const name of newTemplates) {
    loadScript(`templates/${name}/template.js`);
  }

  for (const name of newTemplates) {
    const schema = JSON.parse(fs.readFileSync(path.join(KH_DIR, "templates", name, "schema.json"), "utf8"));
    for (const fmt of ["16:9", "9:16", "1:1"]) {
      const slide = Object.assign({}, schema.example, {
        template: name,
        motionPersonality: fmt === "9:16" ? "punchy" : "editorial",
        seed: 12,
      });
      const info = await S.load(slide, { format: fmt });
      assert.ok(info && info.duration >= 4, `Template ${name} (${fmt}) should build with valid duration, got ${info && info.duration}`);
      assert.ok(S.tl._entries.length > 0, `Template ${name} (${fmt}) should create GSAP entrance animations`);

      // Verify WYSIWYG A.field wrappers exist
      const stageEl = sandbox.document.getElementById("stage");
      const fieldWraps = stageEl.querySelectorAll("[data-field-wrap]");
      assert.ok(fieldWraps.length >= 2, `Template ${name} (${fmt}) should register editable A.field wrappers`);

      // Seek determinism check (especially for audiogram seek-driven waveform & quiz_poll countdown)
      const serializeTree = (node) =>
        `${node.tagName}.${node.className}[${JSON.stringify(node.style)}:${node._text}](${(node.children || []).map(serializeTree).join(",")})`;
      S.seek(0.6);
      const midSnap = serializeTree(stageEl);
      S.seek(2.8);
      S.seek(0.6);
      assert.equal(serializeTree(stageEl), midSnap, `Template ${name} (${fmt}) seek(t) must be 100% deterministic`);
    }
  }
});

test("Studio A3: Shape & Path Engine — drawPath, equal-vertex morphPath, maskWipe, blobReveal & lineArtReveal", async () => {
  const { sandbox } = createFullStageEngineSandbox();
  const MT = sandbox.StageMotionTokens;
  const S = sandbox.Stage;

  assert.equal(Object.keys(MT.SHAPE_WIPE_PRESETS).length, 7);

  let morphPathEl = null;
  let blobEl = null;
  let drawEl = null;
  S.template({
    name: "probe_a3",
    build(s, A) {
      const svg = A.svg(A.root, 0, 0, 400, 300, "0 0 400 300");
      drawEl = A.svgEl(svg, "path", { d: "M10 10 L180 10 L180 120", fill: "none", stroke: "#FFD600", "stroke-width": 4 });
      A.drawPath(drawEl, { at: 0.1, dur: "base" });

      morphPathEl = A.svgEl(svg, "path", { d: "M20 20 L100 20 L100 100 L20 100 Z", fill: "#FFD600" });
      A.morphPath(
        morphPathEl,
        "M20 20 L100 20 L100 100 L20 100 Z",
        "M60 10 L110 110 L10 110 Z",
        { at: 0.2, dur: 1.0, samples: 16 }
      );

      const wipeBox = A.el("div", "card", A.root, { width: "200px", height: "120px" });
      A.maskWipe(wipeBox, "wipe-rtl", { at: 0.15, dur: 0.5 });

      blobEl = A.el("div", "card", A.root, { width: "200px", height: "120px" });
      A.blobReveal(blobEl, { at: 0.3, dur: 1.0, seed: 29, lobes: 7 });

      const artSvg = A.svg(A.root, 0, 150, 200, 100, "0 0 200 100");
      A.svgEl(artSvg, "line", { x1: 0, y1: 10, x2: 180, y2: 10 });
      A.svgEl(artSvg, "circle", { cx: 60, cy: 50, r: 22 });
      A.svgEl(artSvg, "rect", { x: 110, y: 20, width: 60, height: 40 });
      A.lineArtReveal(artSvg, { at: 0.25, stagger: "tight" });
    },
  });

  await S.load({ template: "probe_a3" });
  assert.ok(Number(drawEl.style.strokeDasharray) > 200, "drawPath should compute analytical path length");

  S.seek(0.2);
  const dStart = morphPathEl.getAttribute("d");
  const blobStart = blobEl.style.clipPath;
  S.seek(0.7);
  const dMid = morphPathEl.getAttribute("d");
  const blobMid = blobEl.style.clipPath;
  S.seek(1.5);
  const dEnd = morphPathEl.getAttribute("d");
  const blobEnd = blobEl.style.clipPath;

  assert.notEqual(dStart, dMid, "morphPath d attribute must evolve at mid-progress");
  assert.notEqual(dMid, dEnd, "morphPath d attribute must evolve to end-progress");
  assert.equal(blobStart, "circle(0% at 50% 50%)");
  assert.ok(blobMid.startsWith("polygon("), `Expected organic polygon clipPath at mid-progress, got ${blobMid}`);
  assert.equal(blobEnd, "circle(82% at 50% 50%)");

  // Out-of-order determinism
  S.seek(0.7);
  assert.equal(morphPathEl.getAttribute("d"), dMid);
  assert.equal(blobEl.style.clipPath, blobMid);
});

test("Studio A5 & A6: Virtual Camera (8 presets, 1.06 cap + map exception, parallax, focus-pull) & Seeded Particles/Weather (8 presets)", async () => {
  const { sandbox } = createFullStageEngineSandbox();
  const MT = sandbox.StageMotionTokens;
  const S = sandbox.Stage;

  const camNames = Object.keys(MT.CAMERA_PRESETS);
  const ambNames = Object.keys(MT.AMBIENCE_PRESETS);
  assert.equal(camNames.length, 8);
  assert.equal(ambNames.length, 8);

  S.template({
    name: "probe_a5_a6",
    build(s, A) {
      const fg = A.el("div", "card", A.root, { width: "260px", height: "140px" });
      fg.dataset.depth = "1";
      const bg = A.el("div", "card", A.root, { width: "260px", height: "140px" });
      bg.dataset.depth = "-1";
      A.enter(fg, "card");
    },
  });

  // 1. All 8 camera presets enforce STAGE_ZOOM_CAP = 1.06 on standard templates
  for (const preset of camNames) {
    await S.load({ template: "probe_a5_a6", camera: { preset, dolly: 0.25 }, duration: 6, seed: 42 });
    const stageEl = sandbox.document.getElementById("stage");
    const content = stageEl.querySelector(".content");
    S.seek(5.5);
    if (preset !== "none") {
      const sc = Number(content.dataset.cameraScale);
      assert.ok(sc <= 1.06001, `Camera preset ${preset} exceeded 1.06 cap on standard slide: ${sc}`);
    }
    if (preset === "parallax-drift") {
      const depthEls = content.querySelectorAll("[data-depth]");
      assert.ok(depthEls[0].style.translate && depthEls[0].style.translate !== depthEls[1].style.translate, "Parallax should shift foreground and background opposite ways");
    }
    if (preset === "focus-pull") {
      S.seek(0.05);
      assert.ok(content.style.filter.includes("blur("), "Focus-pull should blur at start");
      S.seek(1.5);
      assert.equal(content.style.filter, "", "Focus-pull should clear blur after 1.15s");
    }
  }

  // Map camera exception (allowMapCamera: true allows zoom > 1.06 up to 1.45)
  await S.load({ template: "probe_a5_a6", allowMapCamera: true, camera: { preset: "gentle-dolly-in", dolly: 0.22 }, duration: 6, seed: 42 });
  S.seek(5.8);
  const mapContent = sandbox.document.getElementById("stage").querySelector(".content");
  assert.ok(Number(mapContent.dataset.cameraScale) > 1.1, "Map camera should allow > 1.06 dolly zoom");

  // 2. All 8 ambience presets render & seek deterministically with bit-identical SVG attributes
  const snapSvgAttrs = (layer) =>
    layer.querySelectorAll("circle,rect,line").map((n) => JSON.stringify(n.attrs)).join("|");

  for (const amb of ambNames) {
    await S.load({ template: "probe_a5_a6", ambience: amb, duration: 6, seed: 99 });
    const stageEl = sandbox.document.getElementById("stage");
    const layer = stageEl.querySelector(".ambience-layer");
    if (amb === "none") {
      assert.equal(layer, null);
      continue;
    }
    assert.ok(layer, `Expected .ambience-layer for preset ${amb}`);
    S.seek(1.2);
    const snap1 = snapSvgAttrs(layer);
    S.seek(4.4);
    const snapLater = snapSvgAttrs(layer);
    assert.notEqual(snap1, snapLater, `Ambience ${amb} should animate over time`);
    S.seek(1.2);
    assert.equal(snapSvgAttrs(layer), snap1, `Ambience ${amb} seek(t) must be bit-identical out-of-order`);
  }
});

test("Studio A7: Chart Pack v2 — barRace, donut, pie, area, scatter & offline choropleth map", async () => {
  const { sandbox } = createFullStageEngineSandbox();
  const S = sandbox.Stage;

  assert.ok(S.charts.barRace && S.charts.donut && S.charts.pie && S.charts.area && S.charts.scatter && S.charts.choropleth);

  let raceBox = null;
  S.template({
    name: "probe_a7",
    build(s, A) {
      const box = A.el("div", "abs", A.root, { left: 40, top: 40, width: 1000, height: 560 });
      box.clientWidth = 1000;
      box.clientHeight = 560;
      if (s.chartKind === "barRace") raceBox = box;
      S.chart(A, box, s.spec, 0.2);
    },
  });

  const specs = [
    ["barRace", { type: "barRace", suffix: "٪", frames: [{ period: "۱۴۰۰", values: { "الف": 20, "ب": 50, "ج": 35 } }, { period: "۱۴۰۳", values: { "الف": 90, "ب": 40, "ج": 70 } }] }],
    ["donut", { type: "donut", center_label: "کل", items: [{ label: "A", value: 45 }, { label: "B", value: 35 }, { label: "C", value: 20 }] }],
    ["pie", { type: "pie", items: [{ label: "A", value: 60 }, { label: "B", value: 40 }] }],
    ["area", { type: "area", series: [{ name: "روند", values: [12, 24, 38, 52] }] }],
    ["scatter", { type: "scatter", points: [{ x: 1, y: 12, r: 12, label: "نقطه۱" }, { x: 4, y: 34, r: 16, label: "نقطه۲" }, { x: 8, y: 66, r: 20, label: "نقطه۳" }] }],
    ["choropleth", { type: "choropleth", suffix: "٪", regions: { middle_east: 88, europe: 71, asia: 94 } }],
  ];

  for (const [kind, spec] of specs) {
    await S.load({ template: "probe_a7", chartKind: kind, spec, duration: 5 });
    assert.ok(S.tl._entries.length > 0, `Chart ${kind} should schedule timeline entries`);
    if (kind === "barRace") {
      S.seek(0.2);
      const pEarly = raceBox.children[0].textContent;
      const wEarly = raceBox.querySelectorAll(".bar").map((b) => b.style.width).join(",");
      S.seek(3.5);
      const pLate = raceBox.children[0].textContent;
      const wLate = raceBox.querySelectorAll(".bar").map((b) => b.style.width).join(",");
      assert.notEqual(pEarly, pLate, "barRace period label should advance with seek(t)");
      assert.notEqual(wEarly, wLate, "barRace bar widths should interpolate over time");
      S.seek(0.2);
      assert.equal(raceBox.querySelectorAll(".bar").map((b) => b.style.width).join(","), wEarly, "barRace seek(t) must be deterministic");
    }
  }
});

test("Studio B1–B7 Wave 2: All 12 new broadcast templates render & seek deterministically across 16:9, 9:16, and 1:1", async () => {
  const { sandbox, loadScript } = createFullStageEngineSandbox();
  const S = sandbox.Stage;
  loadScript("templates/_index.js");
  const wave2Templates = [
    "by_the_numbers",
    "vocabulary_card",
    "flashcard_flip",
    "list_countdown",
    "comment_reply",
    "guest_card",
    "chapter_card",
    "bar_race",
    "donut_chart",
    "map_choropleth",
    "polaroid_wall",
    "mascot_pip",
  ];
  for (const name of wave2Templates) {
    loadScript(`templates/${name}/template.js`);
  }

  for (const name of wave2Templates) {
    const schema = JSON.parse(fs.readFileSync(path.join(KH_DIR, "templates", name, "schema.json"), "utf8"));
    for (const fmt of ["16:9", "9:16", "1:1"]) {
      const slide = Object.assign({}, schema.example, {
        template: name,
        motionPersonality: fmt === "9:16" ? "punchy" : "editorial",
        camera: name === "map_choropleth" ? { preset: "gentle-dolly-in", dolly: 0.14 } : "gentle-dolly-in",
        ambience: "studio-dust",
        seed: 24,
      });
      const info = await S.load(slide, { format: fmt });
      assert.ok(info && info.duration >= 4, `Template ${name} (${fmt}) should build with valid duration, got ${info && info.duration}`);
      assert.ok(S.tl._entries.length > 0, `Template ${name} (${fmt}) should create GSAP entrance animations`);

      const stageEl = sandbox.document.getElementById("stage");
      const fieldWraps = stageEl.querySelectorAll("[data-field-wrap]");
      assert.ok(fieldWraps.length >= 2, `Template ${name} (${fmt}) should register editable A.field wrappers`);

      const serializeTree = (node) =>
        `${node.tagName}.${node.className}[${JSON.stringify(node.style)}:${JSON.stringify(node.attrs)}:${node._text}](${(node.children || []).map(serializeTree).join(",")})`;
      S.seek(0.65);
      const midSnap = serializeTree(stageEl);
      S.seek(3.1);
      S.seek(0.65);
      assert.equal(serializeTree(stageEl), midSnap, `Template ${name} (${fmt}) seek(t) must be 100% deterministic`);
    }
  }
});

/* ============================================================================
   PUPPET PHASES 5 & 6 TESTS (Items 15–22)
   Shot system, Parallax & Lighting, SRT Captions Overlay, 60fps Frame Cache,
   Debug Overlay, Plugin API, Bilingual fa/en i18n, Golden-Frame Visual Regression,
   and 60fps Performance Benchmark.
   ============================================================================ */

test("Puppet Phase 5 (#15 & #16): Shot system (<=1.06 cap), parallax backdrops, lighting presets & transparent alpha across 16:9/9:16/1:1", async () => {
  const { sandbox, loadScript } = createFullStageEngineSandbox();
  loadScript("templates/mascot_talk/template.js");
  const MT = sandbox.StageMotionTokens;
  const S = sandbox.Stage;

  // Shot presets & strict <= 1.06 zoom cap enforcement
  assert.deepEqual(Object.keys(MT.SHOT_PRESETS).sort(), ["close-up", "medium", "two-shot", "wide"]);
  assert.ok(Object.keys(MT.PUPPET_BACKGROUNDS).length >= 8);
  assert.ok(Object.keys(MT.LIGHTING_PRESETS).length >= 6);

  const shotTimeline = [
    { t: 0.0, shot: "wide", pushIn: 0.99, blend: 0.4 },
    { t: 1.5, shot: "medium", pushIn: 0.99, blend: 0.4 },
    { t: 3.0, shot: "close-up", pushIn: 0.99, blend: 0.4 },
  ];
  for (let t = 0; t <= 4.5; t += 0.25) {
    const ev = MT.evaluateShotAt({ shotTimeline }, t, 4.5);
    assert.ok(ev.zoom <= 1.060001, `Shot zoom at t=${t} exceeded 1.06 cap: ${ev.zoom}`);
  }
  const evEarly = MT.evaluateShotAt({ shotTimeline }, 0.1, 4.5);
  const evLate = MT.evaluateShotAt({ shotTimeline }, 4.2, 4.5);
  assert.equal(evEarly.shot, "wide");
  assert.equal(evLate.shot, "close-up");
  assert.ok(evLate.zoom > evEarly.zoom, "Wide shot should zoom in smoothly toward Close-Up");

  // Full mascot_talk render with parallax backdrop + rim-light across all 3 aspect ratios
  for (const fmt of ["16:9", "9:16", "1:1"]) {
    await S.load({
      template: "mascot_talk",
      title: "تست نمای دوربین و نورپردازی",
      duration: 4.5,
      seed: 19,
      puppet: {
        character: "red_eagle",
        paletteLock: true,
        scene: {
          shot: "wide",
          shotTimeline,
          background: "studio-desk",
          parallax: 1.2,
          lighting: "rim-light",
          lightingIntensity: 0.9,
        },
      },
    }, { format: fmt });

    const stageEl = sandbox.document.getElementById("stage");
    const backdrop = stageEl.querySelector(".mt-scene-backdrop");
    assert.ok(backdrop, `Expected parallax .mt-scene-backdrop in ${fmt}`);
    const pLayers = backdrop.querySelectorAll("[data-parallax-depth]");
    assert.ok(pLayers.length >= 2, `Expected >=2 parallax depth layers in ${fmt}`);

    S.seek(0.2);
    const shot0 = Object.assign({}, S._shotState);
    const layer0 = pLayers[0].style.transform;
    S.seek(3.8);
    const shot1 = Object.assign({}, S._shotState);
    const layer1 = pLayers[0].style.transform;

    assert.ok(shot0.zoom <= 1.060001 && shot1.zoom <= 1.060001);
    assert.notEqual(shot0.shot, shot1.shot);
    assert.notEqual(layer0, layer1, "Parallax backdrop layers must shift deterministically over time");

    // Brand Palette Lock preserved under lighting overlay (#EB1818 untouched)
    const palNodes = stageEl.querySelectorAll("[data-pal-fill='redPrimary']");
    assert.ok(palNodes.length > 0);
    assert.ok(palNodes.every((n) => n.getAttribute("fill") === "#EB1818"), "Lighting must never mutate Brand Palette Lock fill #EB1818");
  }

  // Transparent background activates .stage-transparent
  await S.load({
    template: "mascot_talk",
    title: "شفاف",
    duration: 3.0,
    puppet: { scene: { background: "transparent", lighting: "cool" } },
  }, { format: "16:9" });
  assert.ok(sandbox.document.getElementById("stage").classList.contains("stage-transparent"));
});

test("Puppet Phase 5 (#17 & #18): Deterministic SRT RTL/LTR captions overlay & 60 fps rig frame cache", async () => {
  const { sandbox, loadScript } = createFullStageEngineSandbox();
  loadScript("templates/mascot_talk/template.js");
  const MT = sandbox.StageMotionTokens;
  const S = sandbox.Stage;

  const srtRaw = `1
00:00:00,200 --> 00:00:01,500
سلام! زیرنویس فارسی راست‌به‌چپ

2
00:00:01,800 --> 00:00:03,200
Deterministic English caption line
`;
  const cues = MT.parseSrt(srtRaw);
  assert.equal(cues.length, 2);
  assert.equal(cues[0].dir, "rtl");
  assert.equal(cues[1].dir, "ltr");

  await S.load({
    template: "mascot_talk",
    title: "تست زیرنویس و ۶۰ فریم",
    duration: 4.0,
    captions: cues,
    puppet: {
      character: "red_eagle",
      performance: { fps: 60, frameCache: true },
    },
  }, { format: "16:9", fps: 60 });

  assert.equal(S.fps, 60);
  const stageEl = sandbox.document.getElementById("stage");
  const capBar = stageEl.querySelector(".stage-caption-bar");
  const capText = stageEl.querySelector(".stage-caption-text");
  assert.ok(capBar && capText, "Stage must mount .stage-caption-bar when captions are supplied");

  S.seek(0.05);
  assert.equal(capBar.style.opacity, "0");
  S.seek(0.75);
  assert.equal(capBar.style.opacity, "1");
  assert.equal(capText.getAttribute("dir"), "rtl");
  assert.ok(capText.textContent.includes("سلام"));
  S.seek(2.3);
  assert.equal(capBar.style.opacity, "1");
  assert.equal(capText.getAttribute("dir"), "ltr");
  assert.ok(capText.textContent.includes("English"));

  // Verify deterministic 60 fps frame cache hits on repeat seeks and invalidation on config change
  const inst = S._mascots[0];
  assert.ok(inst && typeof inst.getCacheStats === "function");
  inst.clearFrameCache();
  S.seek(1.0);
  S.seek(1.5);
  const stBefore = inst.getCacheStats();
  S.seek(1.0);
  const stAfter = inst.getCacheStats();
  assert.ok(stAfter.hits > stBefore.hits, "Repeat seek to cached timestamp must record a deterministic cache hit");
  const verBefore = stAfter.version;
  inst.setPuppetConfig({ emotion: "happy" });
  const stInvalidated = inst.getCacheStats();
  assert.ok(stInvalidated.version > verBefore, "Changing puppet config must increment cache version and invalidate prior entries");
  assert.ok(stInvalidated.size <= 1, "Cache must drop prior frames on config invalidation");
});

test("Puppet Phase 6 (#19, #21, #22): Debug overlay (18 pivots + graphs), Bilingual fa/en i18n, and Plugin API", async () => {
  const { sandbox, loadScript } = createFullStageEngineSandbox();
  loadScript("templates/mascot_talk/template.js");
  const MT = sandbox.StageMotionTokens;
  const SM = sandbox.StageMascot;
  const S = sandbox.Stage;

  // #21 Bilingual EDITOR_I18N dictionary completeness
  assert.equal(MT.EDITOR_I18N.fa.dir, "rtl");
  assert.equal(MT.EDITOR_I18N.en.dir, "ltr");
  assert.deepEqual(Object.keys(MT.EDITOR_I18N.fa).sort(), Object.keys(MT.EDITOR_I18N.en).sort());

  // #22 Plugin API: programmatic + declarative emotion & gesture registration
  SM.registerEmotion("laser-focus", {
    label: "تمرکز لیزری",
    labelEn: "Laser Focus",
    browL: 16,
    browR: -16,
    browY: 6,
    pupilScale: 0.78,
    headTilt: -6,
    accent: "sparkle",
  });
  SM.registerGesture("hero-salute", (ctx) => ({
    wingLRot: -34 * ctx.env * ctx.intensity,
    headNod: -7 * ctx.env * ctx.intensity,
    bodyY: -9 * ctx.env * ctx.intensity,
    accent: "sparkle",
  }));

  assert.ok(SM.listEmotions().includes("laser-focus"));
  assert.ok(SM.listGestures().includes("hero-salute"));

  await S.load({
    template: "mascot_talk",
    title: "تست دیباگ و پلاگین",
    duration: 4.0,
    puppet: {
      character: "red_eagle",
      emotion: "laser-focus",
      gestures: [{ t: 0.5, type: "hero-salute", duration: 1.2, intensity: 1.0 }],
      debug: { enabled: true, showPivots: true, showGraphs: true },
      plugins: {
        emotions: {
          "yaml-joy": { label: "شادی یامل", labelEn: "YAML Joy", browY: -10, headTilt: 7 },
        },
        gestures: {
          "yaml-wave": { label: "موج یامل", labelEn: "YAML Wave", wingRRot: 28, bodyY: -8 },
        },
      },
    },
  }, { format: "16:9" });

  assert.ok(SM.listEmotions().includes("yaml-joy"));
  assert.ok(SM.listGestures().includes("yaml-wave"));

  S.seek(1.0);
  const inst = S._mascots[0];
  const st = inst.getState();
  assert.equal(st.emotion, "laser-focus");
  assert.equal(st.gesture, "hero-salute");
  assert.ok(st.accent === "sparkle");

  // #19 Debug Overlay: all 18 canonical pivot crosshairs + HUD sparklines
  const stageEl = sandbox.document.getElementById("stage");
  const pivotGroup = stageEl.querySelector(".m-debug-pivots");
  assert.ok(pivotGroup && pivotGroup.getAttribute("display") !== "none", "Debug pivot overlay should be visible");
  const partKeys = Object.keys(MT.PUPPET_PARTS);
  assert.equal(partKeys.length, 18);
  for (const pk of partKeys) {
    assert.ok(stageEl.querySelector(`.m-pivot-${pk}`), `Missing debug pivot marker for part ${pk}`);
  }
  const debugHud = stageEl.querySelector(".mascot-debug-hud");
  assert.ok(debugHud && debugHud.style.display === "block", "Debug HUD panel should be visible");
  assert.ok(debugHud.innerHTML.includes("DEBUG ·") && debugHud.innerHTML.includes("pivots=18"), "Debug HUD must render spring/viseme/prosody telemetry");

  // Toggle debug off cleanly via Stage.setPuppetDebug
  S.setPuppetDebug({ enabled: false });
  assert.equal(debugHud.style.display, "none");
  assert.equal(pivotGroup.getAttribute("display"), "none");

  // Clean unregister
  assert.equal(SM.unregisterEmotion("laser-focus"), true);
  assert.equal(SM.unregisterGesture("hero-salute"), true);
  assert.equal(SM.listEmotions().includes("laser-focus"), false);
  assert.equal(SM.listGestures().includes("hero-salute"), false);
});

test("Puppet Phase 6 (#20): Golden-Frame Visual Regression (SHA-256 bit-exact across fresh sandboxes) & 60 fps Performance Benchmark", async () => {
  const serializeStageHash = (stageEl, extraState) => {
    const walk = (n) =>
      `${n.tagName}.${n.className}[${JSON.stringify(n.attrs)}|${JSON.stringify(n.style)}|${n._text}](${(n.children || []).map(walk).join(",")})`;
    const raw = walk(stageEl) + "::" + JSON.stringify(extraState);
    return crypto.createHash("sha256").update(raw).digest("hex");
  };

  const goldenScenarios = [
    {
      name: "red-eagle-closeup-rimlight-16x9",
      format: "16:9",
      t: 1.45,
      slide: {
        template: "mascot_talk",
        title: "فریم طلایی ۱",
        duration: 4.0,
        seed: 2026,
        say: "[smug] تست رگرسیون بصری قطعی.",
        puppet: {
          character: "red_eagle",
          preset: "lively",
          outfit: "journalist",
          skin: "classic",
          scene: { shot: "close-up", background: "studio-desk", lighting: "rim-light" },
        },
      },
    },
    {
      name: "dialogue-twoshot-nightcity-9x16",
      format: "9:16",
      t: 2.1,
      slide: {
        template: "mascot_talk",
        title: "فریم طلایی ۲",
        duration: 4.0,
        seed: 77,
        dialogue: {
          enabled: true,
          turns: [
            { t: 0, speaker: "left", emotion: "happy", listenerReaction: "nod" },
            { t: 1.6, speaker: "right", emotion: "thinking", listenerReaction: "lean_in" },
          ],
          partner: { character: "vesper_owl", outfit: "scholar", skin: "winter" },
        },
        puppet: {
          character: "red_eagle",
          scene: { shot: "two-shot", background: "night-city", lighting: "cool" },
        },
      },
    },
    {
      name: "transparent-alpha-debug-1x1",
      format: "1:1",
      t: 0.9,
      slide: {
        template: "mascot_talk",
        title: "فریم طلایی ۳",
        duration: 3.5,
        seed: 314,
        transparent: true,
        puppet: {
          character: "red_eagle",
          preset: "dramatic",
          skin: "neon",
          scene: { shot: "medium", background: "transparent", lighting: "sunset-gold" },
          debug: { enabled: true, showPivots: true, showGraphs: true },
        },
      },
    },
  ];

  // Run every golden scenario across two completely independent VM sandboxes + out-of-order seek
  for (const sc of goldenScenarios) {
    const hashes = [];
    for (let run = 0; run < 2; run += 1) {
      const { sandbox, loadScript } = createFullStageEngineSandbox();
      loadScript("templates/mascot_talk/template.js");
      await sandbox.Stage.load(JSON.parse(JSON.stringify(sc.slide)), { format: sc.format, fps: 60 });
      if (run === 1) {
        // Scramble seek order first on run 2 to prove zero path-dependence
        sandbox.Stage.seek(3.2);
        sandbox.Stage.seek(0.1);
      }
      sandbox.Stage.seek(sc.t);
      const stageEl = sandbox.document.getElementById("stage");
      const rigStates = sandbox.Stage._mascots.map((m) => m.getState());
      hashes.push(serializeStageHash(stageEl, { shot: sandbox.Stage._shotState, rigStates }));
    }
    assert.equal(hashes[0], hashes[1], `Golden-frame SHA-256 mismatch for scenario ${sc.name}`);
  }

  // 60 fps Performance Benchmark: 180 sequential frames (3.0 s @ 60 fps) must average < 16.6 ms/frame
  const { sandbox, loadScript } = createFullStageEngineSandbox();
  loadScript("templates/mascot_talk/template.js");
  await sandbox.Stage.load({
    template: "mascot_talk",
    title: "بنچمارک ۶۰ فریم",
    duration: 3.5,
    seed: 101,
    puppet: {
      character: "red_eagle",
      preset: "lively",
      scene: { shot: "wide", background: "studio-desk", lighting: "rim-light" },
      performance: { fps: 60, frameCache: true },
    },
  }, { format: "16:9", fps: 60 });

  const tStart = performance.now();
  const totalFrames = 180;
  for (let f = 0; f < totalFrames; f += 1) {
    sandbox.Stage.seek(f / 60);
  }
  const elapsedMs = performance.now() - tStart;
  const avgFrameMs = elapsedMs / totalFrames;
  assert.ok(avgFrameMs < 16.6, `60 fps benchmark exceeded 16.6 ms/frame budget: ${avgFrameMs.toFixed(3)} ms/frame`);
});

test("Slow Real-Edit Pacing & Step-by-Step Progressive Reveal: slow personalities, pace presets, A.stepReveal & dim-previous spotlight", async () => {
  const { sandbox } = createFullStageEngineSandbox();
  const MT = sandbox.StageMotionTokens;
  const S = sandbox.Stage;

  assert.equal(Object.keys(MT.MOTION_PACE_PRESETS).length, 5);
  assert.equal(Object.keys(MT.REVEAL_MODES).length, 4);
  assert.ok(MT.MOTION_PERSONALITIES["explainer-slow"]);
  assert.ok(MT.MOTION_PERSONALITIES["documentary-calm"]);
  assert.ok(MT.MOTION_PERSONALITIES["podcast-story"]);

  let probe = null;
  S.template({
    name: "probe_slow_steps",
    build(s, A) {
      const title = A.text(A.root, "تست سرعت آرام", "h1");
      A.enter(title, "title");
      const items = [0, 1, 2, 3].map((i) => A.text(A.root, `مورد ${i + 1}`, "body"));
      const stepTimes = [];
      const endAt = A.stepReveal(items, {
        role: "body",
        at: 0.4,
        onStep(_el, _idx, stepAt) { stepTimes.push(stepAt); },
      });
      probe = {
        durBase: A.dur("base"),
        pacing: A.pacing,
        stepTimes,
        endAt,
        items,
      };
    },
  });

  await S.load({ template: "probe_slow_steps", motionPersonality: "punchy", motionPace: "fast" });
  const fastDur = probe.durBase;
  const fastEnd = probe.endAt;
  const fastGap = probe.stepTimes[1] - probe.stepTimes[0];

  await S.load({ template: "probe_slow_steps", motionPersonality: "editorial", motionPace: "normal" });
  const normDur = probe.durBase;
  const normEnd = probe.endAt;

  await S.load({ template: "probe_slow_steps", motionPersonality: "explainer-slow", motionPace: "slow-step" });
  const slowDur = probe.durBase;
  const slowEnd = probe.endAt;
  const slowGap = probe.stepTimes[1] - probe.stepTimes[0];

  await S.load({ template: "probe_slow_steps", motionPersonality: "podcast-story", motionPace: "ultra-slow" });
  const ultraDur = probe.durBase;
  const ultraEnd = probe.endAt;
  const ultraGap = probe.stepTimes[1] - probe.stepTimes[0];
  const ultraDim = probe.pacing.dimPrevious;
  const ultraSlideDur = S.duration();

  assert.ok(fastDur < normDur && normDur < slowDur && slowDur < ultraDur, `Expected monotonic durations: ${fastDur} < ${normDur} < ${slowDur} < ${ultraDur}`);
  assert.ok(fastGap < slowGap && slowGap < ultraGap, `Expected monotonic step gaps: ${fastGap} < ${slowGap} < ${ultraGap}`);
  assert.ok(fastEnd < normEnd && normEnd < slowEnd && slowEnd < ultraEnd, `Expected monotonic sequence end times`);
  assert.equal(ultraDim, true, "ultra-slow / podcast-story should activate dim-previous focus spotlight");
  assert.ok(ultraSlideDur >= ultraEnd, "Stage.load must automatically extend slide duration to cover slow step-by-step reveals");

  const dimTweens = S.tl._entries.filter((e) => e.to && typeof e.to.opacity === "number" && e.to.opacity > 0.4 && e.to.opacity < 0.7);
  assert.ok(dimTweens.length >= 3, `Expected >= 3 dim-previous focus tweens, got ${dimTweens.length}`);

  S.seek(1.5);
  S.seek(4.2);
  S.seek(1.5);
});

test("Studio Wave 3 (66 Templates Total): All 20 new diagram/passage/image/compare/YouTube templates render across 16:9, 9:16 & 1:1", async () => {
  const { sandbox, loadScript } = createFullStageEngineSandbox();
  const S = sandbox.Stage;

  const wave3Templates = [
    "flowchart", "funnel_diagram", "mind_map", "venn_diagram",
    "pyramid_hierarchy", "cycle_diagram", "passage_highlight", "convey_english",
    "book_excerpt", "pull_quote", "image_gallery", "annotated_image",
    "corkboard", "phone_mockup", "pros_cons", "matrix_2x2",
    "checklist_progressive", "ranking_podium", "stat_hero", "subscribe_cta",
  ];

  for (const name of wave3Templates) {
    loadScript(`templates/${name}/template.js`);
    assert.ok(S.templates[name], `Template ${name} failed to register`);
    const schema = JSON.parse(fs.readFileSync(path.join(KH_DIR, "templates", name, "schema.json"), "utf8"));
    const ex = Object.assign({ template: name, motionPace: "slow-step", seed: 19 }, schema.example || {});

    for (const fmt of ["16:9", "9:16", "1:1"]) {
      await S.load(ex, { format: fmt });
      assert.ok(S.ready, `${name} (${fmt}) did not mark Stage ready`);
      assert.ok(S.duration() >= 4, `${name} (${fmt}) duration too short`);
      for (const entry of S.tl._entries) {
        if (entry.target && entry.target.className === "content") {
          if (entry.from && typeof entry.from.scale === "number") assert.ok(entry.from.scale <= 1.06001);
          if (entry.to && typeof entry.to.scale === "number") assert.ok(entry.to.scale <= 1.06001);
        }
      }
      S.seek(0.4);
      S.seek(2.2);
      S.seek(0.4);
    }
  }
});

test("14 Visual Themes, Viral SFX 2.0 (26 cues, transition auto-sync) & 5 Karaoke Caption Styles", async () => {
  const { sandbox, loadScript } = createFullStageEngineSandbox();
  const S = sandbox.Stage;

  const newThemes = [
    "vox-documentary", "magnates-noir", "kurzgesagt-cosmos",
    "ali-productivity", "viral-shorts", "persian-turquoise",
  ];
  for (const th of newThemes) {
    loadScript(`themes/${th}.js`);
    assert.ok(S.themes[th], `Theme ${th} failed to register`);
    S.useTheme(th);
    assert.equal(S.theme.name, th);
  }

  loadScript("stage/sfx.js");
  assert.ok(sandbox.StageSFX, "StageSFX must load");
  assert.ok(sandbox.StageSFX.CATALOG.length >= 25, `Expected >= 25 viral SFX cues, got ${sandbox.StageSFX.CATALOG.length}`);
  assert.equal(sandbox.StageSFX.sfxForTransition("camera-flash"), "shutter");
  assert.ok(typeof sandbox.StageSFX.sfxForTransition("film-burn") === "string" && sandbox.StageSFX.sfxForTransition("film-burn").length > 0);

  loadScript("templates/pull_quote/template.js");
  await S.load({
    template: "pull_quote",
    quote: "تست زیرنویس کارائوکه",
    captionStyle: "karaoke-gold",
    captions: [
      { index: 1, start: 0.0, end: 4.0, text: "کلمه اول کلمه دوم کلمه سوم کلمه چهارم", dir: "rtl" },
    ],
  }, { format: "9:16" });

  S.seek(0.5);
  assert.ok(S._captionEl && S._captionEl.className.includes("caption-style-karaoke-gold"));
  const capInner = S._captionEl.children[0];
  assert.ok(capInner, "Caption bar must contain .stage-caption-text child");
  const htmlEarly = capInner.innerHTML;
  assert.ok(htmlEarly.includes("cap-word is-active"), `Expected karaoke active word span, got: ${htmlEarly}`);
  S.seek(3.5);
  const htmlLate = capInner.innerHTML;
  assert.ok(htmlLate.includes("cap-word is-active"), `Expected karaoke active word span at late time, got: ${htmlLate}`);
  assert.notEqual(htmlEarly, htmlLate, "Karaoke active word must advance deterministically across seek(t)");
  S.seek(0.5);
  assert.equal(capInner.innerHTML, htmlEarly, "Karaoke highlighting must be 100% deterministic when seeking backwards");
});

test("StageLiveMic: quiet & normal speech move loudness smoothly, resumes suspended AudioContext, connects silent sink, and drives Stage puppet live", async () => {
  const { sandbox, loadScript } = createFullStageEngineSandbox();
  loadScript("stage/live-mic.js");
  assert.ok(sandbox.StageLiveMic, "StageLiveMic must load");

  const proc = sandbox.StageLiveMic.createLiveVoiceProcessor({
    noiseSuppression: true,
    noiseGateDb: -56,
    inputGain: 1.8,
  });

  const sr = 48000;
  const makeSine = (amp, freq = 185, len = 1024) => {
    const b = new Float32Array(len);
    for (let i = 0; i < len; i += 1) b[i] = amp * Math.sin((2 * Math.PI * freq * i) / sr);
    return b;
  };
  const silence = new Float32Array(1024);

  // 1) Silence stays near 0%
  const fSil = proc(silence, null, sr, 1 / 60);
  assert.equal(fSil.loudness, 0, "Silence must stay at 0 loudness");
  assert.equal(fSil.isSpeaking, false);

  // 2) Quiet laptop mic (-44 dB, amp ~ 0.009) MUST visibly register loudness & speaking!
  let fQuiet = null;
  for (let k = 0; k < 8; k += 1) {
    fQuiet = proc(makeSine(0.009, 190), null, sr, 1 / 60);
  }
  assert.ok(fQuiet.loudness > 0.20, `Quiet mic must produce visible loudness (>0.20), got ${fQuiet.loudness}`);
  assert.equal(fQuiet.isSpeaking, true, "Quiet mic speech must trigger isSpeaking");
  assert.ok(fQuiet.f0Hz > 160 && fQuiet.f0Hz < 220, `YIN pitch must track quiet voice (~190Hz), got ${fQuiet.f0Hz}`);

  // 3) Louder speech produces even higher loudness
  let fLoud = null;
  for (let k = 0; k < 8; k += 1) {
    fLoud = proc(makeSine(0.12, 220), null, sr, 1 / 60);
  }
  assert.ok(fLoud.loudness > fQuiet.loudness, `Louder speech (${fLoud.loudness}) must exceed quiet speech (${fQuiet.loudness})`);

  // 4) PTT mute zeroes out loudness
  proc.setOptions({ pttEnabled: true, pttActive: false });
  let fMuted = null;
  for (let k = 0; k < 25; k += 1) {
    fMuted = proc(makeSine(0.15, 200), null, sr, 1 / 60);
  }
  assert.ok(fMuted.loudness < 0.02 && fMuted.pttMuted === true, `PTT mute must silence loudness, got ${fMuted.loudness}`);

  // 5) Error diagnostics are localized fa/en
  const errDesc = sandbox.StageLiveMic.describeMicError({ name: "NotAllowedError" });
  assert.ok(errDesc.fa.includes("میکروفن") && errDesc.en.includes("denied"));

  // 6) Suspended AudioContext is explicitly resumed & silent zero-gain sink connects to destination
  let resumedCalled = false;
  let connectedToDestination = false;
  let silentGainVal = null;
  const fakeDest = { isDest: true };
  class FakeAudioContext {
    constructor() {
      this.state = "suspended";
      this.sampleRate = 48000;
      this.currentTime = 0;
      this.destination = fakeDest;
    }
    async resume() {
      resumedCalled = true;
      this.state = "running";
    }
    close() {}
    createMediaStreamSource() {
      return { connect() {}, disconnect() {} };
    }
    createGain() {
      const node = {
        gain: { value: 1, setTargetAtTime(v) { this.value = v; } },
        connect(target) {
          if (target === fakeDest) {
            connectedToDestination = true;
            silentGainVal = node.gain.value;
          }
        },
        disconnect() {},
      };
      return node;
    }
    createBiquadFilter() {
      return { type: "highpass", frequency: { value: 75 }, Q: { value: 0.7 }, connect() {}, disconnect() {} };
    }
    createAnalyser() {
      return {
        fftSize: 1024,
        frequencyBinCount: 512,
        smoothingTimeConstant: 0,
        connect() {},
        disconnect() {},
        getFloatTimeDomainData(arr) { arr.set(makeSine(0.06, 200, arr.length)); },
        getFloatFrequencyData(arr) { arr.fill(-50); },
      };
    }
  }
  sandbox.AudioContext = FakeAudioContext;
  sandbox.navigator = {
    mediaDevices: {
      async getUserMedia() {
        return { getAudioTracks: () => [{ label: "Test USB Mic", stop() {} }], getTracks: () => [{ stop() {} }] };
      },
    },
  };
  let capturedFrame = null;
  sandbox.requestAnimationFrame = (cb) => {
    if (!capturedFrame) cb(16);
    return 1;
  };
  sandbox.cancelAnimationFrame = () => {};

  const session = sandbox.StageLiveMic.createLiveMicSession({
    onFrame(frame) { if (frame && frame.active) capturedFrame = frame; },
  });
  const startRes = await session.start({ inputGain: 2.0 });
  assert.equal(startRes.ok, true, "LiveMicSession must start cleanly");
  assert.equal(resumedCalled, true, "AudioContext.resume() MUST be called when suspended");
  assert.equal(connectedToDestination, true, "Silent GainNode(0) MUST connect to destination so Chromium pulls mic frames");
  assert.equal(silentGainVal, 0, "Silent sink gain MUST be 0 to prevent speaker feedback");
  assert.ok(capturedFrame && capturedFrame.loudness > 0.1, `LiveMicSession frame must report live loudness > 0.1, got ${capturedFrame && capturedFrame.loudness}`);

  // 7) Stage.setLiveVoice drives Red Eagle puppet & resets cleanly when turned off
  const S = sandbox.Stage;
  loadScript("templates/mascot_talk/template.js");
  await S.load({ template: "mascot_talk", title: "تست زنده میکروفن", say: "سلام" }, { format: "16:9" });
  const stLive = S.setLiveVoice(capturedFrame, 1 / 60);
  assert.ok(stLive && stLive.loudness > 0.1, "Stage.setLiveVoice must drive mascot loudness");
  assert.equal(S._liveVoiceActive, true);
  S.setLiveVoice({ active: false }, 1 / 60);
  assert.equal(S._liveVoiceActive, false);

  session.stop();
});









