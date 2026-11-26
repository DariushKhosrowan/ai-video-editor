"""Pytest suite for Khordegir Studio Captions / Subtitles (khordegir/captions.py).

Covers:
  - 'captions' absent: output identical to today, no caption files created, existing schema keys intact
  - Beginner one-click defaults: single key ('text') already works, auto lang detection, WCAG AA >= 4.5:1
  - One Persian ('fa') cue and one English ('en') cue, plus deterministic mixed fa/en cues
  - SRT and WebVTT contents, timestamps, regions, styles, and escaping
  - Real RTL markers for 'fa' (RLI/RLM/PDI + WebVTT region/align + CSS direction: rtl) and LTR for 'en'
  - Byte-identical regeneration across repeated runs and separate directories
  - Cues extending past video duration (clamped or skipped with clear warnings)
  - Validation errors for bad values (not a list, non-numeric/negative start/end, end <= start,
    unknown lang, empty text, unknown keys, zoom > 1.06)
  - Format support across landscape (16:9), portrait (9:16), and square (1:1)
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from khordegir import captions, outputs
from khordegir.project import Project


def _write_project(tmp_path: Path, name: str, yaml_text: str) -> Project:
    proj_dir = tmp_path / name
    (proj_dir / "img").mkdir(parents=True, exist_ok=True)
    (proj_dir / "video.yaml").write_text(yaml_text, encoding="utf-8")
    return Project(proj_dir)


# ---------------------------------------------------------------------------
# 1. 'captions' absent: zero-impact on existing behavior and schema
# ---------------------------------------------------------------------------
def test_captions_absent_leaves_outputs_unchanged(tmp_path: Path):
    yaml_text = """title: پروژه بدون زیرنویس
theme: plain
format: landscape
duration: 6
slides:
  - template: title_card
    title: عنوان آزمایشی
    subtitle: زیرعنوان
    say: سلام دنیا
"""
    proj = _write_project(tmp_path, "no_captions", yaml_text)

    assert captions.has_captions(proj) is False
    assert captions.parse_captions(proj) is None
    assert captions.write_captions(proj) is None
    assert not proj.out.exists()

    # Existing outputs still work identically and no .srt / .vtt are created
    steps = outputs.write_steps(proj, proj.out)
    assert len(steps) == 1
    assert (proj.out / "steps.json").is_file()
    assert not (proj.out / "captions.srt").exists()
    assert not (proj.out / "captions.vtt").exists()

    # Every existing Project schema key remains untouched
    assert proj.title == "پروژه بدون زیرنویس"
    assert proj.theme == "plain"
    assert proj.format == "landscape"
    assert proj.default_duration == 6
    assert len(proj.slides) == 1


# ---------------------------------------------------------------------------
# 2. Beginner one-click defaults: one key ('text') already works
# ---------------------------------------------------------------------------
def test_beginner_defaults_single_key_text_only(tmp_path: Path):
    proj = _write_project(
        tmp_path,
        "beginner_defaults",
        """title: شروع سریع برای تازه‌کار
slides:
  - template: quote
    text: سلام
captions:
  - text: سلام! این اولین زیرنویس است.
  - text: Welcome to Khordegir Studio
""",
    )

    assert captions.has_captions(proj) is True
    cues = captions.parse_captions(proj)
    assert cues is not None
    assert len(cues) == 2

    # First cue defaults: start=0.0, end=3.0, auto-detected fa, accessible default style
    c1, c2 = cues
    assert c1.start == 0.0
    assert c1.end == captions.DEFAULT_CUE_DURATION
    assert c1.lang == "fa"
    assert c1.direction == "rtl"
    assert c1.style["preset"] == "default"
    assert c1.style["position"] == "bottom"
    assert c1.style["advanced"] == {}
    assert captions.contrast_ratio(c1.style["text_color"], c1.style["bg_color"]) >= 4.5

    # Second cue chains sequentially and auto-detects 'en'
    assert c2.start == c1.end
    assert c2.end == round(c1.end + captions.DEFAULT_CUE_DURATION, 3)
    assert c2.lang == "en"
    assert c2.direction == "ltr"


@pytest.mark.parametrize("preset_name", list(captions.STYLE_PRESETS.keys()))
def test_all_builtin_presets_satisfy_wcag_aa(preset_name: str):
    st = captions.STYLE_PRESETS[preset_name]
    assert captions.contrast_ratio(st["text_color"], st["bg_color"]) >= 4.5
    assert st["zoom"] <= captions.STAGE_ZOOM_CAP


def test_advanced_style_controls_live_inside_advanced_section(tmp_path: Path):
    proj = _write_project(
        tmp_path,
        "advanced_style",
        """title: تنظیمات پیشرفته زیرنویس
slides:
  - template: quote
    text: تست
captions:
  - text: زیرنویس با تنظیمات پیشرفته
    start: 0.5
    end: 4.0
    lang: fa
    style:
      preset: high-contrast
      position: top
      advanced:
        font_scale: 1.1
        line_height: 1.6
        bg_opacity: 0.9
        margin_bottom: 120
        max_chars_per_line: 30
        zoom: 1.04
""",
    )
    cues = captions.parse_captions(proj)
    assert cues is not None and len(cues) == 1
    st = cues[0].style
    assert st["preset"] == "high-contrast"
    assert st["position"] == "top"
    assert st["advanced"]["zoom"] == 1.04
    assert st["max_chars_per_line"] == 30

    res = captions.write_captions(proj)
    assert res is not None
    vtt = res["vtt"].read_text(encoding="utf-8")
    assert "region:fa_top align:right" in vtt


# ---------------------------------------------------------------------------
# 3, 4, 5. One fa + one en cue, SRT & WebVTT contents, RTL markers & mixed bidi
# ---------------------------------------------------------------------------
def test_one_fa_and_one_en_cue_srt_vtt_and_rtl_markers(tmp_path: Path):
    proj = _write_project(
        tmp_path,
        "fa_and_en",
        """title: تست دوزبانه
format: landscape
slides:
  - template: title_card
    title: تست
captions:
  - text: امروز دربارهٔ Python و دسترسی‌پذیری حرف می‌زنیم & یاد می‌گیریم.
    start: 0
    end: 3.5
    lang: fa
  - text: Built offline with خرده‌گیر استودیو <v2>.
    start: 4.25
    end: 8.125
    lang: en
""",
    )

    res = captions.write_captions(proj)
    assert res is not None
    assert res["count"] == 2
    assert res["srt"] == proj.out / "captions.srt"
    assert res["vtt"] == proj.out / "captions.vtt"
    assert res["srt"].is_file()
    assert res["vtt"].is_file()

    srt_txt = res["srt"].read_text(encoding="utf-8")
    vtt_txt = res["vtt"].read_text(encoding="utf-8")

    # SRT structure & millisecond comma timestamps
    assert "1\n00:00:00,000 --> 00:00:03,500\n" in srt_txt
    assert "2\n00:00:04,250 --> 00:00:08,125\n" in srt_txt

    # RTL markers for fa cue and embedded LTR isolation for mixed Python token
    fa_srt_block = srt_txt.split("\n\n")[0]
    assert captions.RLI in fa_srt_block
    assert captions.RLM in fa_srt_block
    assert captions.PDI in fa_srt_block
    assert f"{captions.LRI}Python{captions.PDI}" in fa_srt_block

    # LTR markers for en cue and embedded RTL isolation for mixed Persian phrase
    en_srt_block = srt_txt.split("\n\n")[1]
    assert en_srt_block.splitlines()[2].startswith(captions.LRI)
    assert f"{captions.RLI}{captions.RLM}خرده‌گیر استودیو{captions.PDI}" in en_srt_block

    # WebVTT header, STYLE, REGION, cue settings, and XML escaping
    assert vtt_txt.startswith("WEBVTT\n")
    assert "STYLE\n" in vtt_txt
    assert "::cue(.fa)" in vtt_txt
    assert "direction: rtl;" in vtt_txt
    assert "unicode-bidi: isolate;" in vtt_txt
    assert "text-align: right;" in vtt_txt
    assert "::cue(.en)" in vtt_txt
    assert "direction: ltr;" in vtt_txt

    assert "REGION\nid:fa_bottom\n" in vtt_txt
    assert "REGION\nid:en_bottom\n" in vtt_txt

    assert "00:00:00.000 --> 00:00:03.500 region:fa_bottom align:right" in vtt_txt
    assert "00:00:04.250 --> 00:00:08.125 region:en_bottom align:left" in vtt_txt
    assert "<c.fa>" in vtt_txt
    assert "<c.en>" in vtt_txt
    assert "&amp;" in vtt_txt
    assert "&lt;v2&gt;" in vtt_txt


# ---------------------------------------------------------------------------
# 6. Byte-identical regeneration
# ---------------------------------------------------------------------------
def test_byte_identical_regeneration(tmp_path: Path):
    yaml_text = """title: تست تکرارپذیری قطعی
format: square
slides:
  - template: quote
    text: متن
captions:
  - text: جملهٔ فارسی همراه با React و TypeScript در یک خط.
    start: 0.0
    end: 2.5
    lang: fa
  - text: Pure English cue after فارسی
    start: 2.5
    end: 5.0
    lang: en
"""
    proj_a = _write_project(tmp_path, "regen_a", yaml_text)
    proj_b = _write_project(tmp_path, "regen_b", yaml_text)

    res_a1 = captions.write_captions(proj_a)
    assert res_a1 is not None
    srt_bytes_1 = res_a1["srt"].read_bytes()
    vtt_bytes_1 = res_a1["vtt"].read_bytes()

    # Overwrite in same directory
    res_a2 = captions.write_captions(proj_a)
    assert res_a2 is not None
    assert res_a2["srt"].read_bytes() == srt_bytes_1
    assert res_a2["vtt"].read_bytes() == vtt_bytes_1

    # Fresh build directory
    res_b = captions.write_captions(proj_b)
    assert res_b is not None
    assert res_b["srt"].read_bytes() == srt_bytes_1
    assert res_b["vtt"].read_bytes() == vtt_bytes_1


# ---------------------------------------------------------------------------
# 7. Cues past the video duration
# ---------------------------------------------------------------------------
def test_cues_past_video_duration_are_clamped_and_skipped_with_warnings(tmp_path: Path):
    proj = _write_project(
        tmp_path,
        "duration_clamp",
        """title: مدت محدود
duration: 5
slides:
  - template: quote
    text: اسلاید ۱
  - template: quote
    text: اسلاید ۲
captions:
  - text: زیرنویس اول داخل محدوده
    start: 0
    end: 4
    lang: fa
  - text: زیرنویس دوم از مرز ۱۰ ثانیه عبور می‌کند
    start: 7.5
    end: 13.0
    lang: fa
  - text: زیرنویس سوم کاملاً بیرون از ویدیو است
    start: 10.0
    end: 14.0
    lang: fa
  - text: زیرنویس چهارم خیلی دیرتر است
    start: 18.0
    end: 21.0
    lang: en
""",
    )

    # Total explicit duration = 2 slides * 5s = 10.0s
    assert captions.resolve_video_duration(proj) == 10.0

    res = captions.write_captions(proj)
    assert res is not None
    assert res["count"] == 2
    assert len(res["warnings"]) == 3

    c1, c2 = res["cues"]
    assert (c1.start, c1.end) == (0.0, 4.0)
    assert (c2.start, c2.end) == (7.5, 10.0)
    assert "clamped to 10.000s" in res["warnings"][0]
    assert "skipped" in res["warnings"][1]
    assert "skipped" in res["warnings"][2]

    srt_txt = res["srt"].read_text(encoding="utf-8")
    assert "00:00:07,500 --> 00:00:10,000" in srt_txt
    assert "خیلی دیرتر" not in srt_txt


def test_explicit_video_duration_parameter_overrides_and_clamps():
    data = {
        "captions": [
            {"text": "First cue", "start": 0, "end": 6, "lang": "en"},
            {"text": "Second cue", "start": 6, "end": 9, "lang": "en"},
        ]
    }
    warnings: list[str] = []
    cues = captions.parse_captions(data, video_duration=4.5, warnings=warnings)
    assert cues is not None
    assert len(cues) == 1
    assert cues[0].end == 4.5
    assert len(warnings) == 2


# ---------------------------------------------------------------------------
# 8. Bad values & strict schema validation
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("bad_captions", ["just a string", 123, True, {"text": "not a list"}])
def test_captions_not_a_list_raises_type_error(bad_captions):
    with pytest.raises(TypeError, match="must be a list"):
        captions.parse_captions({"captions": bad_captions})


@pytest.mark.parametrize("bad_item", ["plain string", 42, ["nested"]])
def test_caption_item_not_a_dict_raises_type_error(bad_item):
    with pytest.raises(TypeError, match="expected a mapping"):
        captions.parse_captions({"captions": [bad_item]})


@pytest.mark.parametrize("bad_time", ["1.5", True, False, [1], {"s": 1}])
def test_non_numeric_start_or_end_raises_type_error(bad_time):
    with pytest.raises(TypeError, match="must be a number"):
        captions.parse_captions({"captions": [{"text": "سلام", "start": bad_time}]})
    with pytest.raises(TypeError, match="must be a number"):
        captions.parse_captions({"captions": [{"text": "سلام", "start": 0, "end": bad_time}]})


@pytest.mark.parametrize("bad_num", [-0.1, -5, math.nan, math.inf, -math.inf])
def test_negative_or_nonfinite_start_or_end_raises_value_error(bad_num):
    with pytest.raises(ValueError):
        captions.parse_captions({"captions": [{"text": "سلام", "start": bad_num}]})
    with pytest.raises(ValueError):
        captions.parse_captions({"captions": [{"text": "سلام", "start": 0, "end": bad_num}]})


@pytest.mark.parametrize("start,end", [(3.0, 3.0), (5.0, 2.0)])
def test_end_not_after_start_raises_value_error(start, end):
    with pytest.raises(ValueError, match="must be after 'start'"):
        captions.parse_captions({"captions": [{"text": "سلام", "start": start, "end": end}]})


@pytest.mark.parametrize("bad_lang", ["fr", "ar", "de", "persian", ""])
def test_unknown_lang_raises_value_error(bad_lang):
    with pytest.raises(ValueError, match="unknown lang"):
        captions.parse_captions({"captions": [{"text": "سلام", "lang": bad_lang}]})


def test_non_string_lang_raises_type_error():
    with pytest.raises(TypeError, match="'lang' must be a string"):
        captions.parse_captions({"captions": [{"text": "سلام", "lang": 98}]})


@pytest.mark.parametrize("bad_text", ["", "   ", "\n\t  "])
def test_empty_text_raises_value_error(bad_text):
    with pytest.raises(ValueError, match="'text' must not be empty"):
        captions.parse_captions({"captions": [{"text": bad_text}]})


def test_missing_text_raises_value_error():
    with pytest.raises(ValueError, match="missing required key 'text'"):
        captions.parse_captions({"captions": [{"start": 0, "end": 2}]})


def test_unknown_keys_raise_value_error():
    with pytest.raises(ValueError, match="unknown key\\(s\\): extra_field"):
        captions.parse_captions({"captions": [{"text": "سلام", "extra_field": 1}]})

    with pytest.raises(ValueError, match="unknown key\\(s\\) in style: font_scale"):
        # Harder controls are not allowed at top-level style; must live in style.advanced
        captions.parse_captions({"captions": [{"text": "سلام", "style": {"font_scale": 1.1}}]})

    with pytest.raises(ValueError, match="unknown key\\(s\\) in style.advanced"):
        captions.parse_captions(
            {"captions": [{"text": "سلام", "style": {"advanced": {"bogus": 1}}}]}
        )


def test_zoom_cap_and_contrast_validation():
    with pytest.raises(ValueError, match="1.06"):
        captions.parse_captions(
            {"captions": [{"text": "سلام", "style": {"advanced": {"zoom": 1.2}}}]}
        )
    with pytest.raises(ValueError, match="WCAG AA"):
        captions.parse_captions(
            {
                "captions": [
                    {
                        "text": "سلام",
                        "style": {"advanced": {"text_color": "#777777", "bg_color": "#888888"}},
                    }
                ]
            }
        )


# ---------------------------------------------------------------------------
# 9. Landscape / Portrait / Square formats
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    "fmt,expected_width_pct,expected_anchor_y,expected_max_chars",
    [
        ("landscape", 80, 92, 42),
        ("portrait", 86, 82, 26),
        ("square", 84, 88, 32),
    ],
)
def test_landscape_portrait_square_layouts_and_wrapping(
    tmp_path: Path,
    fmt: str,
    expected_width_pct: int,
    expected_anchor_y: int,
    expected_max_chars: int,
):
    long_en = "This caption should wrap deterministically according to the selected video aspect ratio."
    proj = _write_project(
        tmp_path,
        f"fmt_{fmt}",
        f"""title: فرمت {fmt}
format: {fmt}
slides:
  - template: quote
    text: تست
captions:
  - text: این یک جملهٔ نمونه برای بررسی شکست خط در فرمت‌های مختلف است.
    start: 0
    end: 3
    lang: fa
  - text: {long_en}
    start: 3
    end: 6
    lang: en
""",
    )

    layout = captions.compute_caption_layout(fmt)
    assert layout["max_chars_per_line"] == expected_max_chars

    res = captions.write_captions(proj)
    assert res is not None
    assert res["format"] == fmt

    vtt_txt = res["vtt"].read_text(encoding="utf-8")
    srt_txt = res["srt"].read_text(encoding="utf-8")

    assert f"width:{expected_width_pct}%" in vtt_txt
    assert f"viewportanchor:50%,{expected_anchor_y}%" in vtt_txt

    # Verify wrapped lines stay within max_chars_per_line (excluding zero-width bidi markers)
    bidi_strip = str.maketrans("", "", captions.LRI + captions.RLI + captions.PDI + captions.LRM + captions.RLM)
    en_block = srt_txt.strip().split("\n\n")[1]
    en_lines = en_block.splitlines()[2:]
    assert len(en_lines) >= 2
    for ln in en_lines:
        visible = ln.translate(bidi_strip)
        assert len(visible) <= expected_max_chars
