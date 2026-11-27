import test from "node:test";
import assert from "node:assert/strict";
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





