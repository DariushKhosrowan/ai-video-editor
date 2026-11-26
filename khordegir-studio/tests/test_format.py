"""Roadmap 0a — format foundation: `format: landscape | portrait | square` in video.yaml (per video,
optional per-slide override), stage sizes, per-format layouts, renderer viewport size."""
from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from khordegir import cli
from khordegir.project import (DEFAULT_FORMAT, FORMATS, Project, format_size, norm_format, slide_format,
                               stage_payload)
from khordegir.render import size_of

STAGE = ROOT / "khordegir" / "stage"


def _project(tmp_path: Path, yaml_text: str) -> Project:
    (tmp_path / "video.yaml").write_text(yaml_text, encoding="utf-8")
    return Project(tmp_path)


# ------------------------------------------------------------------ parsing
@pytest.mark.parametrize("raw,want", [
    ("landscape", "landscape"), ("Landscape", "landscape"), ("16:9", "landscape"), ("افقی", "landscape"),
    ("portrait", "portrait"), ("vertical", "portrait"), ("9:16", "portrait"), ("عمودی", "portrait"),
    ("square", "square"), ("1:1", "square"), ("مربع", "square"), (" SQUARE ", "square"),
])
def test_norm_format_aliases(raw, want):
    assert norm_format(raw) == want


def test_norm_format_empty_and_unknown():
    assert norm_format(None) is None
    assert norm_format("", "landscape") == "landscape"
    assert norm_format("cinema") is None


def test_stage_sizes():
    assert FORMATS == {"landscape": (1920, 1080), "portrait": (1080, 1920), "square": (1080, 1080)}
    assert DEFAULT_FORMAT == "landscape"
    assert format_size("portrait") == (1080, 1920)
    assert format_size("square") == (1080, 1080)
    assert format_size(None) == (1920, 1080)
    assert format_size("nonsense") == (1920, 1080)
    assert size_of({"format": "portrait"}) == (1080, 1920)
    assert size_of({}) == (1920, 1080)


# ------------------------------------------------------------------ video.yaml
def test_default_is_landscape_and_payload_unchanged(tmp_path: Path):
    pr = _project(tmp_path, "title: t\nslides:\n  - template: quote\n    text: سلام\n")
    assert pr.format == "landscape" and pr.size == (1920, 1080)
    payload = stage_payload(pr.slides[0])
    # landscape is never written into the payload, so old videos render (and cache) identically
    assert "format" not in payload
    assert slide_format(payload) == "landscape"
    assert not pr.warnings


def test_project_format_and_per_slide_override(tmp_path: Path):
    pr = _project(tmp_path, (
        "title: t\nformat: عمودی\nslides:\n"
        "  - template: quote\n    text: a\n"
        "  - template: quote\n    text: b\n    format: square\n"
        "  - template: quote\n    text: c\n    format: landscape\n"
        "  - template: quote\n    text: d\n    format_overrides:\n      portrait: {size: 60}\n"
    ))
    assert pr.format == "portrait" and pr.size == (1080, 1920)
    fmts = [slide_format(stage_payload(s)) for s in pr.slides]
    assert fmts == ["portrait", "square", "landscape", "portrait"]
    # hard per-format overrides travel to the stage untouched (the stage merges them)
    assert stage_payload(pr.slides[3])["format_overrides"] == {"portrait": {"size": 60}}
    # the source YAML keeps its keys (single source of truth)
    assert pr.data["format"] == "عمودی"
    assert pr.data["slides"][1]["format"] == "square"


def test_unknown_format_warns_and_falls_back(tmp_path: Path):
    pr = _project(tmp_path, "title: t\nformat: cinema\nslides:\n  - template: quote\n    text: a\n    format: wide-ish\n")
    assert pr.format == "landscape"
    assert len(pr.warnings) == 2
    assert slide_format(stage_payload(pr.slides[0])) == "landscape"


def test_force_format_overrides_every_slide(tmp_path: Path):
    (tmp_path / "video.yaml").write_text(
        "title: t\nslides:\n  - template: quote\n    text: a\n  - template: quote\n    text: b\n    format: square\n",
        encoding="utf-8")
    pr = Project(tmp_path, force_format="portrait")
    assert pr.format == "portrait"
    assert {slide_format(stage_payload(s)) for s in pr.slides} == {"portrait"}


def test_cli_build_accepts_format_and_out():
    seen = {}

    def fake(a):
        seen.update(vars(a))
        return 0
    orig = cli.cmd_build
    cli.cmd_build = fake
    try:
        rc = cli.main(["build", "x", "--format", "square", "--out", "/tmp/o", "--no-video"])
    finally:
        cli.cmd_build = orig
    assert rc == 0 and seen["format"] == "square" and seen["out"] == "/tmp/o"


# ------------------------------------------------------------------ stage (core.js in a Node VM)
NODE_HARNESS = r"""
const fs = require("fs"), vm = require("vm");
const props = {};
const style = { setProperty(k, v) { props[k] = v; } };
const ctx = { console, document: { documentElement: { style }, getElementById: () => null,
  head: { appendChild() {} }, createElement: () => ({ style: {} }), addEventListener() {} } };
ctx.window = ctx; ctx.addEventListener = () => {};
vm.createContext(ctx);
for (const f of process.argv.slice(2)) vm.runInContext(fs.readFileSync(f, "utf8"), ctx, { filename: f });
const S = ctx.Stage;
const theme = { layout: { margin: 80, top: 64, bottom: 64, radius: 16, badgeRadius: 8, cam: [24, 740, 584, 1055], scamLeft: 650 } };
const out = { formats: {}, layouts: {}, aliases: {} };
for (const f of ["landscape", "portrait", "square"]) {
  const r = S.setFormat(f);
  out.formats[f] = [r.w, r.h, S.W, S.H, props["--stage-w"], props["--stage-h"]];
  out.layouts[f] = S.layoutFor(theme, f);
}
out.sameObject = S.layoutFor(theme, "landscape") === theme.layout;
out.themeOwn = S.layoutFor({ layout: Object.assign({}, theme.layout, { formats: { portrait: { margin: 50 } } }) }, "portrait").margin;
for (const a of ["9:16", "عمودی", "1:1", "bogus", ""]) out.aliases[a] = S.normFormat(a);
console.log(JSON.stringify(out));
"""


@pytest.fixture(scope="module")
def stage_vm(tmp_path_factory):
    node = shutil.which("node")
    if not node:
        pytest.skip("node not installed")
    h = tmp_path_factory.mktemp("fmt") / "h.js"
    h.write_text(NODE_HARNESS, encoding="utf-8")
    # motion-tokens.js must load before core.js
    r = subprocess.run([node, str(h), str(STAGE / "motion-tokens.js"), str(STAGE / "core.js")],
                       capture_output=True, text=True, timeout=60)
    assert r.returncode == 0, r.stderr
    return json.loads(r.stdout)


def test_stage_set_format_sizes(stage_vm):
    f = stage_vm["formats"]
    assert f["landscape"] == [1920, 1080, 1920, 1080, "1920px", "1080px"]
    assert f["portrait"] == [1080, 1920, 1080, 1920, "1080px", "1920px"]
    assert f["square"] == [1080, 1080, 1080, 1080, "1080px", "1080px"]
    assert stage_vm["aliases"] == {"9:16": "portrait", "عمودی": "portrait", "1:1": "square", "bogus": "landscape", "": "landscape"}


def test_stage_layouts_per_format(stage_vm):
    # landscape: the theme's own layout object, untouched (identical renders)
    assert stage_vm["sameObject"] is True
    sizes = {"landscape": (1920, 1080), "portrait": (1080, 1920), "square": (1080, 1080)}
    for fmt, L in stage_vm["layouts"].items():
        w, h = sizes[fmt]
        x0, y0, x1, y1 = L["cam"]
        assert 0 <= x0 < x1 <= w and 0 <= y0 < y1 <= h, (fmt, L["cam"])
        assert L["margin"] * 2 < w and L["top"] + L["bottom"] < h
    P, Q = stage_vm["layouts"]["portrait"], stage_vm["layouts"]["square"]
    # portrait keeps platform UI clear (top/bottom safe areas) and puts the camera under full-width content
    assert P["top"] >= 120 and P["bottom"] >= 200
    assert P["scamLeft"] == P["margin"] and Q["scamLeft"] == Q["margin"]
    assert P["cam"][3] <= 1920 - P["bottom"] + 4
    assert stage_vm["themeOwn"] == 50     # a theme can tune layout.formats.portrait


def test_stage_and_renderer_files_have_no_hardcoded_viewport():
    render = (ROOT / "khordegir" / "render.py").read_text(encoding="utf-8")
    assert '"width": 1920' not in render
    css = (STAGE / "stage.css").read_text(encoding="utf-8")
    assert "var(--stage-w,1920px)" in css and "var(--stage-h,1080px)" in css
    html = (STAGE / "stage.html").read_text(encoding="utf-8")
    assert html.index("motion-tokens.js") < html.index("core.js")


def test_templates_use_format_helpers_and_stay_deterministic():
    tpl = ROOT / "khordegir" / "templates"
    for name in ("bullet_list", "three_cards", "counter_grid", "image_text", "big_number", "timeline", "chat", "compare"):
        js = (tpl / name / "template.js").read_text(encoding="utf-8")
        assert "A.stack" in js or "A.portrait" in js or "A.columns" in js, name
    for f in list(tpl.glob("*/template.js")) + list(STAGE.glob("*.js")):
        src = re.sub(r"/\*[\s\S]*?\*/|//[^\n]*", "", f.read_text(encoding="utf-8"))
        assert "Math.random" not in src, f
        if f.name == "template.js":   # templates are seek-driven only (core.js uses rAF just for editor preview play)
            assert "requestAnimationFrame" not in src, f


# ------------------------------------------------------------------ real render (optional)
def test_playwright_renders_each_format_at_its_size(tmp_path: Path):
    pytest.importorskip("playwright.sync_api")
    from PIL import Image
    from khordegir.render import Renderer
    try:
        r = Renderer().__enter__()
    except SystemExit as e:   # chromium not installed
        pytest.skip(str(e))
    try:
        for fmt, size in FORMATS.items():
            slide = {"template": "title_card", "title": "سلام", "format": fmt, "duration": 1}
            info = r.load(slide)
            assert info["format"] == fmt and (info["width"], info["height"]) == size
            png = tmp_path / f"{fmt}.png"
            r.shot(0.9, path=str(png))
            assert Image.open(png).size == size
    finally:
        r.__exit__(None, None, None)
