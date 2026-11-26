"""Exponential easing family (e^-x) used by every motion in the stage.

expOut(k)(t)   = (1 - e^(-k t)) / (1 - e^(-k))     entrances: fast start, exponentially decaying speed
expIn(k)(t)    = (e^(k t) - 1) / (e^k - 1)           exits: mirror of expOut
expInOut(k)(t) = expIn on the first half, expOut on the second half

Part 1 checks the math in Node (motion-tokens.js in a vm context).
Part 2 loads real GSAP 3 + motion-tokens.js + core.js in Chromium and checks that
S.ease() turns every token and every legacy GSAP name into an exponential curve,
and that a real GSAP tween follows that curve frame by frame.
"""
from __future__ import annotations

import json
import math
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
STAGE = ROOT / "khordegir" / "stage"
MT_JS = STAGE / "motion-tokens.js"
CORE_JS = STAGE / "core.js"
GSAP_JS = ROOT / "khordegir" / "vendor" / "gsap.min.js"

SAMPLES = [i / 20 for i in range(21)]


def exp_out(k, t):
    return (1 - math.exp(-k * t)) / (1 - math.exp(-k))


def exp_in(k, t):
    return (math.exp(k * t) - 1) / (math.exp(k) - 1)


def exp_in_out(k, t):
    return exp_in(k, 2 * t) / 2 if t < 0.5 else 0.5 + exp_out(k, 2 * t - 1) / 2


NODE = r"""
const fs = require("fs"), vm = require("vm");
const ctx = { Math, console }; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(process.argv[process.argv.length - 2], "utf8"), ctx);
const KM = ctx.KhordegirMotion, E = ctx.MOTION_TOKENS.eases;
const ts = JSON.parse(process.argv[process.argv.length - 1]);
const out = {};
for (const k of [3, 4, 5, 6]) {
  out["out" + k] = ts.map(KM.expOut(k)); out["in" + k] = ts.map(KM.expIn(k)); out["inout" + k] = ts.map(KM.expInOut(k));
}
out.tokens = {};
for (const [name, f] of Object.entries(E)) out.tokens[name] = typeof f === "function" ? ts.map(f) : String(f);
out.dense = {};
const dense = Array.from({ length: 1001 }, (_, i) => i / 1000);
for (const [name, f] of Object.entries(E)) if (typeof f === "function") out.dense[name] = dense.map(f);
console.log(JSON.stringify(out));
"""


@pytest.fixture(scope="module")
def node_data():
    if not shutil.which("node"):
        pytest.skip("node not installed")
    r = subprocess.run(["node", "-e", NODE, str(MT_JS), json.dumps(SAMPLES)], capture_output=True, text=True, check=True)
    return json.loads(r.stdout)


@pytest.mark.parametrize("k", [3, 4, 5, 6])
def test_closed_form_matches(node_data, k):
    for i, t in enumerate(SAMPLES):
        assert abs(node_data[f"out{k}"][i] - exp_out(k, t)) < 1e-9
        assert abs(node_data[f"in{k}"][i] - exp_in(k, t)) < 1e-9
        assert abs(node_data[f"inout{k}"][i] - exp_in_out(k, t)) < 1e-9


@pytest.mark.parametrize("k", [3, 4, 5, 6])
def test_in_is_mirror_of_out(node_data, k):
    for i, t in enumerate(SAMPLES):
        j = len(SAMPLES) - 1 - i  # sample at 1 - t
        assert abs(node_data[f"in{k}"][i] - (1 - node_data[f"out{k}"][j])) < 1e-9


def test_every_token_is_exponential_and_well_formed(node_data):
    for name, ys in node_data["tokens"].items():
        assert isinstance(ys, list), f"token {name} is still a GSAP string: {ys}"
    for name, ys in node_data["dense"].items():
        assert abs(ys[0]) < 1e-9 and abs(ys[-1] - 1) < 1e-9, name
        assert all(b >= a - 1e-12 for a, b in zip(ys, ys[1:])), f"{name} not monotone"


def test_exp_out_slope_decays_exponentially():
    # speed of expOut is k e^(-k t)/(1-e^(-k)): start speed k/(1-e^-k), and each 1/k of time halves... by e
    k, h = 5, 1e-6
    v0 = (exp_out(k, h) - exp_out(k, 0)) / h
    assert abs(v0 - k / (1 - math.exp(-k))) < 1e-3
    v1 = (exp_out(k, 0.2 + h) - exp_out(k, 0.2)) / h
    assert abs(v1 / v0 - math.exp(-1)) < 1e-4  # after t = 1/k, speed is v0 / e


# ---------- real GSAP in Chromium ----------

@pytest.fixture(scope="module")
def page():
    sync = pytest.importorskip("playwright.sync_api")
    with sync.sync_playwright() as p:
        try:
            b = p.chromium.launch()
        except Exception as e:  # pragma: no cover
            pytest.skip(f"chromium unavailable: {e}")
        pg = b.new_page()
        pg.set_content("<html><body><div id='stage'></div><div id='box'></div></body></html>")
        for f in (GSAP_JS, MT_JS, CORE_JS):
            pg.add_script_tag(content=f.read_text(encoding="utf-8"))
        yield pg
        b.close()


LEGACY = {
    "power3.out": ("out", 5), "power4.out": ("out", 6), "power2.out": ("out", 4), "power1.out": ("out", 3),
    "power2.in": ("in", 4), "power3.inOut": ("inout", 5), "sine.inOut": ("inout", 3), "expo.out": ("out", 6),
    "back.out(1.2)": ("out", 5), "snappy": ("out", 6), "textIn": ("out", 5), "textOut": ("in", 5),
    "zoomIn": ("inout", 3), "zoomOut": ("inout", 5), "cameraPan": ("inout", 3), "chartGrow": ("out", 5),
}
REF = {"out": exp_out, "in": exp_in, "inout": exp_in_out}


def test_stage_ease_routes_everything_to_exp(page):
    ys = page.evaluate("([names, ts]) => Object.fromEntries(names.map(n => [n, ts.map(Stage.ease(n))]))",
                       [list(LEGACY), SAMPLES])
    for name, (fam, k) in LEGACY.items():
        for t, y in zip(SAMPLES, ys[name]):
            assert abs(y - REF[fam](k, t)) < 1e-9, (name, t, y)


def test_real_gsap_tween_follows_curve(page):
    # a real paused GSAP tween, seeked like the renderer does, 30 fps over 2.4 s (chart bar)
    res = page.evaluate("""() => {
      const el = document.getElementById('box'); const tl = gsap.timeline({paused:true});
      tl.fromTo(el, {x:0}, {x:1000, duration:2.4, ease: Stage.ease('chartGrow')}, 0);
      const out = []; for (let f = 0; f <= 72; f++) { tl.seek(f/30, false); out.push(gsap.getProperty(el,'x')); }
      return out; }""")
    for f, x in enumerate(res):
        assert abs(x - 1000 * exp_out(5, min(1, f / 72))) < 0.05, (f, x)


def test_timeline_default_ease_is_exponential():
    src = CORE_JS.read_text(encoding="utf-8")
    assert 'defaults: { ease: S.ease("textIn") }' in src and 'defaults: { ease: S.ease("ambient") }' in src
