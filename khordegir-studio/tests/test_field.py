"""Acceptance tests for A.field(key, el) in stage/core.js (ROADMAP task 3)."""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from khordegir.project import Project, stage_payload

CORE_JS = ROOT / "khordegir" / "stage" / "core.js"

NODE_HARNESS = r"""
const fs = require("fs");
const vm = require("vm");
const assert = require("assert");

const corePath = process.argv[2];
const coreCode = fs.readFileSync(corePath, "utf8");

function camelToKebab(k) {
  return k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
}
function kebabToCamel(k) {
  return k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function makeStyle() {
  const store = {};
  return new Proxy(store, {
    get(target, prop) {
      if (prop === "setProperty") return (k, v) => { target[kebabToCamel(k)] = String(v); };
      if (prop === "getPropertyValue") return (k) => target[kebabToCamel(k)] ?? "";
      return prop in target ? target[prop] : "";
    },
    set(target, prop, val) {
      if (val === undefined || val === null || val === "") {
        delete target[prop];
      } else {
        target[prop] = String(val);
      }
      return true;
    },
  });
}

function makeClassList(el) {
  const set = () => new Set(String(el.className || "").split(/\s+/).filter(Boolean));
  return {
    add(...cls) {
      const s = set();
      cls.forEach((c) => s.add(c));
      el.className = [...s].join(" ");
    },
    remove(...cls) {
      const s = set();
      cls.forEach((c) => s.delete(c));
      el.className = [...s].join(" ");
    },
    contains(c) { return set().has(c); },
  };
}

function makeElement(tagName) {
  const attrs = {};
  let _innerHTML = "";
  const el = {
    tagName: String(tagName || "div").toUpperCase(),
    id: "",
    className: "",
    get innerHTML() { return _innerHTML; },
    set innerHTML(v) {
      _innerHTML = String(v ?? "");
      for (const ch of this.childNodes) ch.parentNode = null;
      this.childNodes.length = 0;
    },
    textContent: "",
    src: "",
    alt: "",
    parentNode: null,
    get parentElement() { return this.parentNode && this.parentNode.nodeType === 1 ? this.parentNode : null; },
    nodeType: 1,
    childNodes: [],
    style: makeStyle(),
    get children() { return this.childNodes.filter((n) => n.nodeType === 1); },
    get firstElementChild() { return this.children[0] || null; },
    get isConnected() {
      let cur = this;
      while (cur) {
        if (cur === doc.body || cur === doc.head || cur === doc.documentElement) return true;
        cur = cur.parentNode;
      }
      return false;
    },
    setAttribute(k, v) {
      attrs[k] = String(v);
      if (k === "id") this.id = String(v);
      if (k === "class") this.className = String(v);
    },
    getAttribute(k) { return k in attrs ? attrs[k] : null; },
    appendChild(child) {
      if (child.parentNode) {
        const idx = child.parentNode.childNodes.indexOf(child);
        if (idx >= 0) child.parentNode.childNodes.splice(idx, 1);
      }
      child.parentNode = this;
      this.childNodes.push(child);
      return child;
    },
    insertBefore(newNode, refNode) {
      if (!refNode) return this.appendChild(newNode);
      if (newNode.parentNode) {
        const oldIdx = newNode.parentNode.childNodes.indexOf(newNode);
        if (oldIdx >= 0) newNode.parentNode.childNodes.splice(oldIdx, 1);
      }
      const idx = this.childNodes.indexOf(refNode);
      newNode.parentNode = this;
      if (idx < 0) this.childNodes.push(newNode);
      else this.childNodes.splice(idx, 0, newNode);
      return newNode;
    },
    remove() {
      if (this.parentNode) {
        const idx = this.parentNode.childNodes.indexOf(this);
        if (idx >= 0) this.parentNode.childNodes.splice(idx, 1);
        this.parentNode = null;
      }
    },
    decode() { return Promise.resolve(); },
    matches(sel) {
      return sel.split(",").some((part) => {
        part = part.trim();
        if (part.startsWith(".")) return this.classList.contains(part.slice(1));
        return this.tagName.toLowerCase() === part.toLowerCase();
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
      const walk = (node) => {
        for (const ch of node.children) {
          if (sel === "[class*='t-']" && /\bt-/.test(ch.className || "")) out.push(ch);
          else if (sel.startsWith("[data-") && sel.endsWith("]")) {
            const inner = sel.slice(1, -1);
            const [k, v] = inner.split("=");
            const actual = ch.getAttribute(k);
            if (v ? actual === v.replace(/['"]/g, "") : actual !== null) out.push(ch);
          } else if (ch.matches(sel)) out.push(ch);
          walk(ch);
        }
      };
      walk(this);
      return out;
    },
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null; },
    getBoundingClientRect() {
      const left = parseFloat(this.style.left) || 0;
      const top = parseFloat(this.style.top) || 0;
      const width = parseFloat(this.style.width) || 300;
      const height = parseFloat(this.style.height) || 80;
      return { left, top, width, height, right: left + width, bottom: top + height };
    },
    get offsetTop() { return parseFloat(this.style.top) || 0; },
    get offsetHeight() { return parseFloat(this.style.height) || 60; },
    get clientHeight() { return parseFloat(this.style.height) || 260; },
    get clientWidth() { return parseFloat(this.style.width) || 1760; },
    get scrollWidth() { return parseFloat(this.style.width) || 600; },
  };
  el.classList = makeClassList(el);
  el.dataset = new Proxy({}, {
    get(_, prop) {
      return el.getAttribute("data-" + camelToKebab(prop)) ?? undefined;
    },
    set(_, prop, val) {
      el.setAttribute("data-" + camelToKebab(prop), val);
      return true;
    },
  });
  return el;
}

const stageEl = makeElement("div");
stageEl.id = "stage";
const headEl = makeElement("head");
const bodyEl = makeElement("body");
bodyEl.appendChild(stageEl);
const docEl = makeElement("html");
docEl.appendChild(headEl);
docEl.appendChild(bodyEl);

const doc = {
  head: headEl,
  body: bodyEl,
  documentElement: docEl,
  fonts: { ready: Promise.resolve() },
  createElement: (tag) => makeElement(tag),
  createElementNS: (_, tag) => makeElement(tag),
  getElementById: (id) => {
    if (id === "stage") return stageEl;
    const stack = [headEl, bodyEl];
    while (stack.length) {
      const n = stack.shift();
      if (n.id === id) return n;
      stack.push(...n.children);
    }
    return null;
  },
  querySelectorAll: (sel) => {
    if (sel === "#stage .content *") {
      const content = stageEl.children.find((c) => c.classList.contains("content"));
      if (!content) return [];
      const out = [];
      const walk = (n) => { for (const c of n.children) { out.push(c); walk(c); } };
      walk(content);
      return out;
    }
    return docEl.querySelectorAll(sel);
  },
};

function makeTimeline() {
  const tweens = [];
  let currentTime = 0;

  function applyTween(tw, t) {
    const start = tw.at;
    const dur = tw.dur || 0.001;
    let p;
    if (t < start) {
      if (!tw.immediateRender) return;
      p = 0;
    } else if (t >= start + dur) {
      p = 1;
    } else {
      const raw = (t - start) / dur;
      p = typeof tw.ease === "function" ? tw.ease(raw) : raw;
    }

    const target = tw.target;
    if (!target) return;
    if (target.style) {
      if ("opacity" in tw.from || "opacity" in tw.to) {
        const a = tw.from.opacity ?? 1;
        const b = tw.to.opacity ?? 1;
        target.style.opacity = +(a + (b - a) * p).toFixed(4);
      }
      const hasX = "x" in tw.from || "x" in tw.to;
      const hasY = "y" in tw.from || "y" in tw.to;
      const hasS = "scale" in tw.from || "scale" in tw.to;
      if (hasX || hasY || hasS) {
        const x = (tw.from.x ?? 0) + ((tw.to.x ?? 0) - (tw.from.x ?? 0)) * p;
        const y = (tw.from.y ?? 0) + ((tw.to.y ?? 0) - (tw.from.y ?? 0)) * p;
        const sc = (tw.from.scale ?? 1) + ((tw.to.scale ?? 1) - (tw.from.scale ?? 1)) * p;
        target.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${sc.toFixed(4)})`;
      }
      if ("strokeDashoffset" in tw.to) {
        const a = tw.from.strokeDashoffset ?? parseFloat(target.style.strokeDashoffset) ?? 0;
        const b = tw.to.strokeDashoffset ?? 0;
        target.style.strokeDashoffset = (a + (b - a) * p).toFixed(2);
      }
    } else if ("v" in tw.to && typeof tw.onUpdate === "function" && t >= start) {
      const a = tw.from.v ?? 0;
      const b = tw.to.v ?? 0;
      target.v = a + (b - a) * p;
      tw.onUpdate();
    }
  }

  return {
    fromTo(target, from, to, at = 0) {
      const dur = to.duration ?? 0.5;
      const ease = to.ease;
      const immediateRender = !!to.immediateRender;
      const tw = { target, from: { ...from }, to: { ...to }, at, dur, ease, immediateRender };
      tweens.push(tw);
      if (immediateRender) applyTween(tw, 0);
      return this;
    },
    from(target, from, at = 0) {
      const dur = from.duration ?? 0.5;
      const to = {};
      if ("opacity" in from) to.opacity = 1;
      if ("x" in from) to.x = 0;
      if ("y" in from) to.y = 0;
      if ("scale" in from) to.scale = 1;
      return this.fromTo(target, from, { ...to, duration: dur, ease: from.ease, immediateRender: !!from.immediateRender }, at);
    },
    to(target, to, at = 0) {
      const dur = to.duration ?? 0.5;
      const from = {};
      if ("v" in to) from.v = target.v ?? 0;
      if ("strokeDashoffset" in to) from.strokeDashoffset = parseFloat(target.style?.strokeDashoffset) || 0;
      const tw = { target, from, to: { ...to }, at, dur, ease: to.ease, immediateRender: false, onUpdate: to.onUpdate };
      tweens.push(tw);
      return this;
    },
    time(t) {
      if (t === undefined) return currentTime;
      currentTime = t;
      for (const tw of tweens) applyTween(tw, t);
      return this;
    },
    duration() {
      return tweens.reduce((m, tw) => Math.max(m, tw.at + (tw.dur || 0)), 0);
    },
    kill() { tweens.length = 0; },
  };
}

const sandbox = {
  window: null,
  document: doc,
  parent: { postMessage() {} },
  performance: { now: () => 0 },
  requestAnimationFrame: () => 1,
  cancelAnimationFrame: () => {},
  getComputedStyle: (el) => ({
    position: el.style.position || ((el.classList.contains("abs") || el.classList.contains("frame") || el.classList.contains("col")) ? "absolute" : "static"),
    fontSize: el.style.fontSize || (el.classList.contains("t-h1") ? "72px" : "36px"),
    paddingTop: "0px",
    paddingRight: "0px",
    paddingBottom: "0px",
    paddingLeft: "0px",
  }),
  gsap: { timeline: () => makeTimeline() },
  console,
};
sandbox.window = sandbox;
sandbox.window.addEventListener = () => {};

vm.createContext(sandbox);
vm.runInContext(coreCode, sandbox);

const Stage = sandbox.window.Stage;
assert(Stage, "Stage must be defined");

Stage.defineTheme({
  name: "test-dark",
  colors: { bg: "#111", surface: "#222", text: "#fff", muted: "#aaa", accent: "#ff0", danger: "#f44", glow: "rgba(255,255,0,0.1)" },
  type: {
    eyebrow: { size: 28, weight: 600, lh: 1.3 },
    h1: { size: 72, weight: 800, lh: 1.2 },
    body: { size: 36, weight: 400, lh: 1.5 },
    caption: { size: 24, weight: 400, lh: 1.3 },
  },
  layout: { margin: 80, top: 80, bottom: 80, scamLeft: 620, cam: [24, 740, 584, 1055], radius: 16, badgeRadius: 12 },
  motion: {
    eyebrow: { delay: 0.0, dur: 0.5, y: 18, ease: "power3.out" },
    title: { delay: 0.1, dur: 0.8, y: 32, scale: 0.96, ease: "power3.out" },
    body: { delay: 0.25, dur: 0.7, y: 24, ease: "power3.out" },
    image: { delay: 0.2, dur: 0.9, scale: 0.94, ease: "power3.out" },
    note: { delay: 0.4, dur: 0.5, y: 12, ease: "power3.out" },
  },
  kenburns: { scale: 0.05, x: 20, period: 12 },
  clip: { min: 6, hold: 2.5, fade: 0.3 },
  ease: {},
});

Stage.template({
  name: "field_test_tpl",
  build(slide, A) {
    const col = A.el("div", "col", A.root, { right: A.area.x, left: A.area.x, top: A.area.y, gap: "8px", height: 260 });
    const titleEl = A.text(col, slide.title || "عنوان تست", "h1");
    A.field("title", titleEl);
    A.enter(titleEl, "title");

    // Also test passing the wrapper returned by A.field into A.enter
    const subEl = A.text(col, slide.subtitle || "زیرعنوان", "body");
    const subWrap = A.field("subtitle", subEl);
    A.enter(subWrap, "body");

    // Image frame wrapped by A.field
    const imgFrame = A.image(A.root, slide.image || "", 100, 360, 640, 400);
    A.field("image", imgFrame);
  },
});

Stage.template({
  name: "baseline_test_tpl",
  build(slide, A) {
    const col = A.el("div", "col", A.root, { right: A.area.x, left: A.area.x, top: A.area.y, gap: "8px", height: 260 });
    const titleEl = A.text(col, slide.title || "عنوان تست", "h1");
    A.enter(titleEl, "title");

    const subEl = A.text(col, slide.subtitle || "زیرعنوان", "body");
    A.enter(subEl, "body");

    A.image(A.root, slide.image || "", 100, 360, 640, 400);
  },
});

(async () => {
  // 1. With overrides set: wrapper transform stays constant at t=0, 0.5, 5.9 while inner node animates
  await Stage.load({
    template: "field_test_tpl",
    title: "سلام دنیا",
    subtitle: "توضیح کوتاه",
    overrides: {
      title: { x: 120, y: -45, scale: 1.25 },
      subtitle: { x: -15, y: 30, scale: 0.9 },
      image: { x: -40, y: 55, scale: 0.85 },
    },
  });

  const titleWrap = docEl.querySelector('[data-field-wrap="title"]');
  const titleInner = docEl.querySelector('[data-field="title"]');
  const subWrap = docEl.querySelector('[data-field-wrap="subtitle"]');
  const subInner = docEl.querySelector('[data-field="subtitle"]');
  const imgWrap = docEl.querySelector('[data-field-wrap="image"]');
  const imgInner = docEl.querySelector('[data-field="image"]');

  assert(titleWrap && titleInner && titleInner.parentNode === titleWrap, "title wrapped");
  assert(subWrap && subInner && subInner.parentNode === subWrap, "subtitle wrapped");
  assert(imgWrap && imgInner && imgInner.parentNode === imgWrap, "image wrapped");
  assert.strictEqual(imgWrap.style.position, "absolute");
  assert.strictEqual(imgWrap.style.left, "100px");
  assert.strictEqual(imgWrap.style.top, "360px");
  assert.strictEqual(imgInner.style.position, "relative");
  assert.strictEqual(imgInner.style.width, "640px");
  assert.strictEqual(imgInner.style.height, "400px");

  const snap = {};
  for (const t of [0, 0.5, 5.9]) {
    Stage.seek(t);
    assert.strictEqual(titleWrap.style.transform, "translate(120px, -45px) scale(1.25)", `titleWrap constant at t=${t}`);
    assert.strictEqual(subWrap.style.transform, "translate(-15px, 30px) scale(0.9)", `subWrap constant at t=${t}`);
    assert.strictEqual(imgWrap.style.transform, "translate(-40px, 55px) scale(0.85)", `imgWrap constant at t=${t}`);
    snap[t] = {
      titleOpacity: parseFloat(titleInner.style.opacity),
      titleTransform: titleInner.style.transform,
      subOpacity: parseFloat(subInner.style.opacity),
      subTransform: subInner.style.transform,
      imgOpacity: parseFloat(imgInner.style.opacity),
      imgTransform: imgInner.style.transform,
    };
  }

  // Inner nodes must animate across t=0 -> 0.5 -> 5.9
  assert.strictEqual(snap[0].titleOpacity, 0);
  assert(snap[0.5].titleOpacity > 0 && snap[0.5].titleOpacity < 1, "title opacity mid-animation at t=0.5");
  assert.strictEqual(snap[5.9].titleOpacity, 1);
  assert.notStrictEqual(snap[0].titleTransform, snap[0.5].titleTransform);
  assert.notStrictEqual(snap[0.5].titleTransform, snap[5.9].titleTransform);
  assert.strictEqual(snap[5.9].titleTransform, "translate(0.00px, 0.00px) scale(1.0000)");

  assert.strictEqual(snap[0].subOpacity, 0);
  assert(snap[0.5].subOpacity > 0 && snap[0.5].subOpacity < 1, "sub opacity mid-animation at t=0.5");
  assert.strictEqual(snap[5.9].subOpacity, 1);

  assert.strictEqual(snap[0].imgOpacity, 0);
  assert(snap[0.5].imgOpacity > 0 && snap[0.5].imgOpacity < 1, "image opacity mid-animation at t=0.5");
  assert.strictEqual(snap[5.9].imgOpacity, 1);

  // 2. Layout-scoped overrides (SLIDE vs SCAM)
  await Stage.load({
    template: "field_test_tpl",
    layout: "SCAM",
    title: "حالت دوربین",
    overrides: {
      SLIDE: { title: { x: 10, y: 10, scale: 1.1 } },
      SCAM: { title: { x: 250, y: 15, scale: 0.8 } },
    },
  });
  for (const t of [0, 0.5, 5.9]) {
    Stage.seek(t);
    assert.strictEqual(docEl.querySelector('[data-field-wrap="title"]').style.transform, "translate(250px, 15px) scale(0.8)");
  }

  // 3. No overrides / empty / identity overrides: identical animation & layout output to baseline
  for (const ovCase of [undefined, {}, { title: {} }, { title: { x: 0, y: 0, scale: 1 } }]) {
    const infoField = await Stage.load({ template: "field_test_tpl", title: "متن ثابت", subtitle: "زیرمتن", overrides: ovCase });
    const fieldStates = {};
    for (const t of [0, 0.5, 5.9]) {
      Stage.seek(t);
      const tw = docEl.querySelector('[data-field-wrap="title"]');
      const sw = docEl.querySelector('[data-field-wrap="subtitle"]');
      const iw = docEl.querySelector('[data-field-wrap="image"]');
      assert.strictEqual(tw.style.transform, "", "identity wrapper has no transform");
      assert.strictEqual(sw.style.transform, "", "identity wrapper has no transform");
      assert.strictEqual(iw.style.transform, "", "identity wrapper has no transform");
      const ti = docEl.querySelector('[data-field="title"]');
      const si = docEl.querySelector('[data-field="subtitle"]');
      const ii = docEl.querySelector('[data-field="image"]');
      fieldStates[t] = {
        tiOp: ti.style.opacity, tiTr: ti.style.transform,
        siOp: si.style.opacity, siTr: si.style.transform,
        iiOp: ii.style.opacity, iiTr: ii.style.transform,
      };
    }

    const infoBase = await Stage.load({ template: "baseline_test_tpl", title: "متن ثابت", subtitle: "زیرمتن" });
    assert.strictEqual(infoField.duration, infoBase.duration);
    assert.strictEqual(infoField.entrances, infoBase.entrances);
    for (const t of [0, 0.5, 5.9]) {
      Stage.seek(t);
      const ti = docEl.querySelector(".t-h1");
      const si = docEl.querySelector(".t-body");
      const ii = docEl.querySelector(".frame");
      assert.deepStrictEqual(fieldStates[t], {
        tiOp: ti.style.opacity, tiTr: ti.style.transform,
        siOp: si.style.opacity, siTr: si.style.transform,
        iiOp: ii.style.opacity, iiTr: ii.style.transform,
      });
    }
  }

  // 4. Idempotency, null-safety, and A.fit through wrapper
  Stage.template({
    name: "edge_tpl",
    build(slide, A) {
      assert.strictEqual(A.field("none", null), null);
      const col = A.el("div", "col", A.root, { left: 80, right: 80, top: 80, height: 120 });
      const el = A.text(col, "متن بسیار بلند برای تست fit", "h1");
      const w1 = A.field("k", el);
      const w2 = A.field("k", el);
      assert.strictEqual(w1, w2, "A.field must be idempotent");
      assert.strictEqual(w1.querySelectorAll('[data-field="k"]').length, 1);
      A.fit(col, 0.5);
    },
  });
  await Stage.load({ template: "edge_tpl" });
  const stageRoot = doc.getElementById("stage");
  assert(stageRoot.querySelector('[data-field="k"]'), "edge_tpl rendered field");

  console.log(JSON.stringify({ ok: true }));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
"""


def test_field_wrapper_and_overrides_in_core_js(tmp_path: Path):
    assert CORE_JS.is_file(), f"Missing {CORE_JS}"
    node = shutil.which("node")
    assert node is not None, "node is required to run stage/core.js acceptance test"

    harness_path = tmp_path / "test_field_harness.js"
    harness_path.write_text(NODE_HARNESS, encoding="utf-8")

    proc = subprocess.run(
        [node, str(harness_path), str(CORE_JS)],
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc.returncode == 0, f"Node harness failed:\nSTDOUT:\n{proc.stdout}\nSTDERR:\n{proc.stderr}"
    result = json.loads(proc.stdout.strip().splitlines()[-1])
    assert result == {"ok": True}


def test_project_preserves_slide_overrides_in_stage_payload(tmp_path: Path):
    proj_dir = tmp_path / "demo"
    (proj_dir / "img").mkdir(parents=True)
    (proj_dir / "video.yaml").write_text(
        "title: تست\n"
        "slides:\n"
        "  - template: quote\n"
        "    text: سلام\n"
        "    overrides:\n"
        "      text:\n"
        "        x: 120\n"
        "        y: -45\n"
        "        scale: 1.25\n",
        encoding="utf-8",
    )
    pr = Project(proj_dir)
    payload = stage_payload(pr.render_slides()[0])
    assert payload["overrides"] == {"text": {"x": 120, "y": -45, "scale": 1.25}}
