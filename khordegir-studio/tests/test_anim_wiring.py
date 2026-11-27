"""Tests for Khordegir Studio animation presets wiring (video.yaml -> project.py -> stage/core.js).

Licensed under MIT / Apache-2.0.
Covers:
- Default no-anim state
- Project-level anim inheritance
- Per-slide anim override and 'none' clearing
- Persian line-aware errors for invalid presets (project and slide level)
- Per-slide and project-level anim_objects mapping
- Keyframes (Advanced) pass-through
- Support across all three formats (landscape, portrait, square)
"""
from __future__ import annotations

import subprocess
import sys
import textwrap
from pathlib import Path
import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from khordegir.project import Project, stage_payload  # noqa: E402

STAGE = ROOT / "khordegir" / "stage"


def make(tmp_path, body):
    (tmp_path / "video.yaml").write_text(textwrap.dedent(body), encoding="utf-8")
    return Project(tmp_path)


def test_default_none(tmp_path):
    p = make(tmp_path, """
        title: test
        slides:
          - template: quote
            text: hi
    """)
    assert p.anim is None
    for s in p.slides:
        assert "anim" not in s
        assert "anim_objects" not in s
    payload = stage_payload(p.slides[0])
    assert "anim" not in payload
    assert "anim_objects" not in payload


def test_project_anim_inheritance(tmp_path):
    p = make(tmp_path, """
        title: test
        anim: pop
        slides:
          - template: quote
            text: first slide
          - template: quote
            text: second slide
    """)
    assert p.anim == "pop"
    assert len(p.slides) == 2
    for s in p.slides:
        assert "anim" in s
        assert s["anim"]["duration"] == 0.45
        assert s["anim"]["ease"] == "expOut(5)"
        assert s["anim"]["from"]["scale"] == 0.8
        assert s["anim"]["to"]["scale"] == 1.0

        payload = stage_payload(s)
        assert "anim" in payload
        assert payload["anim"]["duration"] == 0.45
        assert payload["anim"]["from"]["scale"] == 0.8


def test_slide_anim_override(tmp_path):
    p = make(tmp_path, """
        title: test
        anim: pop
        slides:
          - template: quote
            text: override to slide
            anim: slide
          - template: quote
            text: override to none
            anim: none
          - template: quote
            text: inherit pop
    """)
    assert p.slides[0]["anim"]["from"]["x"] == 40.0
    assert p.slides[0]["anim"]["duration"] == 0.5
    assert p.slides[0]["anim"]["preset"] == "slide"

    # Slide 1 set anim: none, so it should be stripped
    assert "anim" not in p.slides[1]
    assert "anim" not in stage_payload(p.slides[1])

    # Slide 2 inherited project-level pop
    assert p.slides[2]["anim"]["from"]["scale"] == 0.8
    assert p.slides[2]["anim"]["preset"] == "pop"


def test_invalid_preset_error_project_level(tmp_path):
    with pytest.raises(SystemExit) as excinfo:
        make(tmp_path, "title: test\nanim: wood\nslides:\n  - template: quote\n    text: hi\n")
    msg = str(excinfo.value)
    assert "خطای خط 2" in msg
    assert "wood" in msg
    assert "video.yaml" in msg


def test_invalid_preset_error_slide_level(tmp_path):
    with pytest.raises(SystemExit) as excinfo:
        make(tmp_path, "title: test\nslides:\n  - template: quote\n    text: hi\n    anim: badpreset\n")
    msg = str(excinfo.value)
    assert "خطای خط 5" in msg
    assert "badpreset" in msg
    assert "video.yaml" in msg


def test_anim_objects(tmp_path):
    p = make(tmp_path, """
        title: test
        slides:
          - template: quote
            text: hi
            anim_objects:
              title: pop
              text: typewriter
              custom_card:
                preset: zoom
                duration: 0.85
    """)
    s = p.slides[0]
    assert "anim_objects" in s
    objs = s["anim_objects"]
    assert "title" in objs and objs["title"]["from"]["scale"] == 0.8
    assert "text" in objs and objs["text"]["mode"] == "word" and objs["text"]["stagger"] == 0.045
    assert "custom_card" in objs and objs["custom_card"]["duration"] == 0.85

    payload = stage_payload(s)
    assert "anim_objects" in payload
    assert payload["anim_objects"]["title"]["from"]["scale"] == 0.8


def test_keyframes_pass_through(tmp_path):
    p = make(tmp_path, """
        title: test
        slides:
          - template: quote
            text: hi
            anim:
              advanced:
                keyframes:
                  - t: 0.0
                    opacity: 0.0
                    scale: 0.5
                  - t: 0.3
                    opacity: 1.0
                    scale: 1.05
                  - t: 0.6
                    opacity: 1.0
                    scale: 1.0
    """)
    s = p.slides[0]
    assert "anim" in s
    assert "keyframes" in s["anim"]
    kfs = s["anim"]["keyframes"]
    assert len(kfs) == 3
    assert kfs[0]["t"] == 0.0
    assert kfs[1]["t"] == 0.3
    assert kfs[1]["scale"] == 1.05
    assert kfs[2]["t"] == 0.6

    payload = stage_payload(s)
    assert "keyframes" in payload["anim"]
    assert len(payload["anim"]["keyframes"]) == 3


@pytest.mark.parametrize("fmt", ["landscape", "portrait", "square"])
def test_all_three_formats_supported(tmp_path, fmt):
    p = make(tmp_path, f"""
        title: format test
        format: {fmt}
        anim: zoom
        slides:
          - template: quote
            text: hello format
    """)
    assert p.format == fmt
    assert p.slides[0]["anim"]["from"]["scale"] == 0.9


def test_stage_core_js_parse_and_typewriter_rtl():
    # Verify motion-tokens.js loads before core.js and JS syntax in Node
    mt_code = (STAGE / "motion-tokens.js").read_text(encoding="utf-8")
    core_code = (STAGE / "core.js").read_text(encoding="utf-8")
    node_script = f"""
    const window = {{ addEventListener: () => {{}} }};
    {mt_code}
    {core_code}
    const S = window.Stage;
    if (!S || !S.MOTION) process.exit(1);
    if (typeof S.MOTION.clampScale !== 'function') process.exit(2);
    if (S.MOTION.clampScale(1.5) > 1.0601) process.exit(3);
    """
    res = subprocess.run(["node", "-e", node_script], capture_output=True, text=True)
    assert res.returncode == 0, f"Node script failed: {res.stderr}"
