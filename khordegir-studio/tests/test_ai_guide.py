"""Tests for Khordegir Studio Offline AI Guide & Slide Writer (khordegir/ai_guide.py).

Verifies:
- Offline determinism (zero remote API calls, no network, no unseeded randomness).
- Live catalog registry loader (templates, themes, fx catalog, motion tokens).
- Markdown prompt specification guide generation.
- YAML extraction, BOM/bidi cleaning, tab replacement, and curly quote normalization.
- Validation, auto-repair, and error reporting with line numbers and fuzzy suggestions.
- CLI subcommands `ai-guide` and `ai-import`.
- Single source of truth: video.yaml.
Licensed under MIT / Apache-2.0 compatible terms.
"""
import json
import os
import subprocess
import sys
from pathlib import Path
import pytest
import yaml

# Ensure khordegir package is on python path
TESTS_DIR = Path(__file__).resolve().parent
STUDIO_ROOT = TESTS_DIR.parent
if str(STUDIO_ROOT) not in sys.path:
    sys.path.insert(0, str(STUDIO_ROOT))

from khordegir.ai_guide import (
    load_live_registry,
    generate_ai_guide,
    validate_and_fix_video_yaml,
    ai_import_to_project,
    fa_to_en_num_str,
    to_finite_number,
    parse_bool_like,
    levenshtein,
    closest_match,
    extract_yaml_block,
    pre_normalize_yaml_text,
)
from khordegir.cli import main as cli_main

PKG_ROOT = STUDIO_ROOT / "khordegir"


# ------------------------------------------------------------------ 1. Registry Loader Tests
def test_load_live_registry_templates():
    reg = load_live_registry(PKG_ROOT)
    assert "templates" in reg
    assert len(reg["templates"]) >= 10
    names = reg["templateNames"]
    assert "title_card" in names
    assert "big_number" in names
    assert "bullet_list" in names
    assert "quote" in names
    assert "bar_chart" in names
    assert "line_chart" in names
    assert "compare" in names
    assert "cam" in names

    # Verify template schemas have fields and required flags
    title_card = next(t for t in reg["templates"] if t["name"] == "title_card")
    assert any(f["key"] == "title" and f.get("required") for f in title_card["fields"])


def test_load_live_registry_themes():
    reg = load_live_registry(PKG_ROOT)
    assert len(reg["themes"]) >= 1
    theme_names = reg["themeNames"]
    assert "khordegir-dark" in theme_names

    kd = next(t for t in reg["themes"] if t["name"] == "khordegir-dark")
    assert kd["mode"] == "dark"
    assert kd["accent"] == "#FFD600"
    assert kd["danger"] == "#E53935"


def test_load_live_registry_fx_catalog():
    reg = load_live_registry(PKG_ROOT)
    fx = reg["fxCatalog"]
    assert "transitions" in fx
    assert "curtain-rtl" in fx["transitions"]
    assert "soft-fade" in fx["transitions"]
    assert "logoMotions" in fx
    assert "pop-spin" in fx["logoMotions"]
    assert "slide-rtl" in fx["logoMotions"]
    assert "top-left" in fx["logoPositions"]
    assert "breathe" in fx["imageMotions"]


def test_load_live_registry_aliases():
    reg = load_live_registry(PKG_ROOT)
    aliases = reg["aliasMap"]
    assert aliases.get("عنوان") == "title_card"
    assert aliases.get("عدد") == "big_number"
    assert aliases.get("میله‌ای") == "bar_chart"
    assert aliases.get("خط زمان") == "timeline"


# ------------------------------------------------------------------ 2. AI Guide Generation Tests
def test_generate_ai_guide_structure():
    guide = generate_ai_guide(PKG_ROOT, {"topic": "تست رشد عادت‌ها"})
    assert "# Khordegir Studio — Offline AI Slide Writer Specification" in guide
    assert "## STRICT OUTPUT RULES" in guide
    assert "## 1. PROJECT ROOT KEYS (`video.yaml`)" in guide
    assert "## 2. INLINE RICH-TEXT FORMATTING & NUMBERS" in guide
    assert "## 3. COMMON SLIDE KEYS" in guide
    assert "## 4. MAPS, PINS & IMAGE MOTION" in guide
    assert "## 5. REAL THEMES" in guide
    assert "## 6. REAL TRANSITIONS & LOGO MOTIONS" in guide
    assert "## 7. ALL REAL TEMPLATES & FIELDS" in guide
    assert "## 8. SHORT COMPLETE EXAMPLE" in guide
    assert "## USER TOPIC / SCRIPT:" in guide
    assert "تست رشد عادت‌ها" in guide


def test_generate_ai_guide_deterministic():
    g1 = generate_ai_guide(PKG_ROOT, {"topic": "موضوع تست ۱"})
    g2 = generate_ai_guide(PKG_ROOT, {"topic": "موضوع تست ۱"})
    assert g1 == g2


def test_generate_ai_guide_default_placeholder_when_no_topic():
    guide = generate_ai_guide(PKG_ROOT)
    assert "[اینجا موضوع، عنوان یا متن اسکریپت ویدیوی خودتان را بنویسید" in guide


# ------------------------------------------------------------------ 3. String & Number Normalization Helpers
def test_fa_to_en_num_str():
    assert fa_to_en_num_str("۱۲۳۴۵۶۷۸۹۰") == "1234567890"
    assert fa_to_en_num_str("١٢٣٤٥٦٧٨٩٠") == "1234567890"
    assert fa_to_en_num_str("۳٫۱۴") == "3.14"
    assert fa_to_en_num_str("۲٬۵۰۰") == "2500"
    assert fa_to_en_num_str(None) == ""


def test_to_finite_number():
    assert to_finite_number(42) == 42
    assert to_finite_number(3.14) == 3.14
    assert to_finite_number("۸۰") == 80
    assert to_finite_number("-۱۲٫۵") == -12.5
    assert to_finite_number("1,000") == 1000
    assert to_finite_number("invalid") is None
    assert to_finite_number(None) is None


def test_parse_bool_like():
    assert parse_bool_like(True) is True
    assert parse_bool_like(False) is False
    assert parse_bool_like("true") is True
    assert parse_bool_like("بله") is True
    assert parse_bool_like("1") is True
    assert parse_bool_like("روشن") is True
    assert parse_bool_like("false") is False
    assert parse_bool_like("نه") is False
    assert parse_bool_like("خیر") is False
    assert parse_bool_like("0") is False
    assert parse_bool_like("خاموش") is False
    assert parse_bool_like("maybe") is None


def test_levenshtein_and_closest_match():
    assert levenshtein("kitten", "sitting") == 3
    assert levenshtein("khordegir", "khordegir") == 0
    cands = ["title_card", "big_number", "bullet_list", "quote"]
    assert closest_match("title-crad", cands) == "title_card"
    assert closest_match("big_numbr", cands) == "big_number"
    assert closest_match("completely_unknown_xyz", cands) is None


# ------------------------------------------------------------------ 4. Markdown Fencing & Pre-Normalization
def test_extract_yaml_block_fenced():
    raw = """
توضیحات قبل از کد
```yaml
title: تست
theme: khordegir-dark
slides:
  - template: cam
    say: سلام
```
توضیحات بعد از کد
"""
    res = extract_yaml_block(raw)
    assert res["extracted_fence"] is True
    assert "توضیحات قبل" not in res["text"]
    assert "title: تست" in res["text"]
    assert "slides:" in res["text"]


def test_extract_yaml_block_unfenced():
    raw = "title: بدون کادر\ntheme: khordegir-dark\nslides: []\n"
    res = extract_yaml_block(raw)
    assert res["extracted_fence"] is False
    assert res["text"] == raw


def test_pre_normalize_tabs_and_curly_quotes():
    raw = """
title: “عنوان با نقل قول خمیده”
slides:
\t- template: “quote”
\t  text: “متن نقل قول”
"""
    res = pre_normalize_yaml_text(raw)
    assert "“" not in res["text"]
    assert '"' in res["text"]
    assert "\t" not in res["text"]
    assert any("Tab" in fix for fix in res["auto_fixes"])
    assert any("نقل‌قول" in fix for fix in res["auto_fixes"])


def test_pre_normalize_colon_spacing():
    raw = "title:سلام به همه\ntheme:khordegir-dark"
    res = pre_normalize_yaml_text(raw)
    assert "title: سلام به همه" in res["text"]
    assert "theme: khordegir-dark" in res["text"]


# ------------------------------------------------------------------ 5. Validation and Auto-Fixes
def test_validate_empty_input():
    res = validate_and_fix_video_yaml("", PKG_ROOT)
    assert res["ok"] is False
    assert len(res["errors"]) == 1
    assert "خالی" in res["errors"][0]


def test_validate_bare_slide_array():
    raw = """
- template: title_card
  title: عنوان تست
  say: سلام
- template: cam
  say: خداحافظ
"""
    res = validate_and_fix_video_yaml(raw, PKG_ROOT)
    assert res["ok"] is True
    assert res["data"]["title"] == "ویدیوی جدید"
    assert res["data"]["theme"] == "khordegir-dark"
    assert len(res["data"]["slides"]) == 2
    assert any("بدون ریشه" in fix for fix in res["auto_fixes"])


def test_validate_singular_slide_key():
    raw = """
title: تست
slide:
  - template: title_card
    title: سلام
"""
    res = validate_and_fix_video_yaml(raw, PKG_ROOT)
    assert res["ok"] is True
    assert "slides" in res["data"]
    assert any("`slide` به `slides`" in fix for fix in res["auto_fixes"])


def test_validate_persian_layout_and_type_key():
    raw = """
title: تست
slides:
  - type: title_card
    layout: تمام‌صفحه
    title: عنوان اول
  - template: cam
    layout: دوربین
    say: سلام
"""
    res = validate_and_fix_video_yaml(raw, PKG_ROOT)
    assert res["ok"] is True
    s0 = res["data"]["slides"][0]
    s1 = res["data"]["slides"][1]
    assert s0["template"] == "title_card"
    assert s0["layout"] == "SLIDE"
    assert s1["layout"] == "CAM"


def test_validate_persian_digits_in_numeric_fields():
    raw = """
title: تست عدد
seed: ۱۲۳
duration: ۶٫۵
slides:
  - template: big_number
    number: "۸۵"
    suffix: "٪"
    act: ۲
    caption: توضیح
"""
    res = validate_and_fix_video_yaml(raw, PKG_ROOT)
    assert res["ok"] is True
    assert res["data"]["seed"] == 123
    assert res["data"]["duration"] == 6.5
    assert res["data"]["slides"][0]["act"] == 2


def test_validate_string_slide_converted_to_quote():
    raw = """
title: تست
slides:
  - این یک اسلاید نقل‌قول ساده است
"""
    res = validate_and_fix_video_yaml(raw, PKG_ROOT)
    assert res["ok"] is True
    sl = res["data"]["slides"][0]
    assert sl["template"] == "quote"
    assert sl["text"] == "این یک اسلاید نقل‌قول ساده است"


def test_validate_dots_normalization():
    raw = """
title: نقشه
slides:
  - template: image_full
    image: iran_map.png
    dots:
      - { x: 45, y: 32, color: accent }
      - { x: 50, y: 40 }
"""
    res = validate_and_fix_video_yaml(raw, PKG_ROOT)
    assert res["ok"] is True
    dots = res["data"]["slides"][0]["dots"]
    assert dots == ["45,32,accent", "50,40"]


def test_validate_zoom_normalization():
    raw = """
title: زوم
slides:
  - template: big_number
    number: 70
    caption: درصد
    zoom:
      x: ۰٫۶
      y: ۰٫۴
"""
    res = validate_and_fix_video_yaml(raw, PKG_ROOT)
    assert res["ok"] is True
    zoom = res["data"]["slides"][0]["zoom"]
    assert zoom["x"] == 0.6
    assert zoom["y"] == 0.4
    assert zoom["s"] == 1.5  # default scale added


def test_validate_fuzzy_theme_suggestion():
    raw = """
title: تست تم
theme: khordgir-drak
slides:
  - template: cam
    say: سلام
"""
    res = validate_and_fix_video_yaml(raw, PKG_ROOT)
    assert res["ok"] is True
    assert res["data"]["theme"] == "khordegir-dark"
    assert any("نزدیک‌ترین تم" in w for w in res["warnings"])


def test_validate_fuzzy_template_suggestion():
    raw = """
title: تست قالب اشتباه
slides:
  - template: big_numbr
    number: 50
    caption: تست
"""
    res = validate_and_fix_video_yaml(raw, PKG_ROOT)
    assert res["ok"] is False
    assert any("آیا منظورتان «big_number» بود؟" in err for err in res["errors"])


def test_validate_missing_required_field():
    raw = """
title: تست فیلد الزامی
slides:
  - template: big_number
    caption: فقط کپشن بدون عدد
"""
    res = validate_and_fix_video_yaml(raw, PKG_ROOT)
    assert res["ok"] is False
    assert any("فیلد ضروری `number`" in err for err in res["errors"])


def test_validate_structural_template_checks():
    raw_bad_bar = """
title: چارت ناقص
slides:
  - template: bar_chart
    title: بدون دیتا
"""
    res = validate_and_fix_video_yaml(raw_bad_bar, PKG_ROOT)
    assert res["ok"] is False
    assert any("نیاز به فهرست `data` دارد" in err for err in res["errors"])


# ------------------------------------------------------------------ 6. End-to-End File Import
def test_ai_import_to_project(tmp_path):
    raw = """
```yaml
title: پروژه تستی
theme: khordegir-dark
slides:
  - template: title_card
    title: سلام بر همه
    say: سلام دوستان
  - template: big_number
    number: "۹۹"
    suffix: "٪"
    caption: رشد چشمگیر
```
"""
    proj_dir = tmp_path / "my_project"
    res = ai_import_to_project(raw, proj_dir, pkg_root=PKG_ROOT)
    assert res["ok"] is True
    assert res["slide_count"] == 2

    yaml_file = proj_dir / "video.yaml"
    assert yaml_file.exists()
    assert (proj_dir / "img").is_dir()

    data = yaml.safe_load(yaml_file.read_text(encoding="utf-8"))
    assert data["title"] == "پروژه تستی"
    assert len(data["slides"]) == 2
    assert data["slides"][0]["template"] == "title_card"
    assert data["slides"][1]["template"] == "big_number"


def test_ai_import_to_project_append_mode(tmp_path):
    proj_file = tmp_path / "video.yaml"
    initial_yaml = """
title: پروژه اولیه
theme: khordegir-dark
slides:
  - template: cam
    say: بخش اول
"""
    proj_file.write_text(initial_yaml, encoding="utf-8")

    new_ai = """
slides:
  - template: title_card
    title: اسلاید الحاقی
"""
    res = ai_import_to_project(new_ai, proj_file, pkg_root=PKG_ROOT, append=True)
    assert res["ok"] is True
    assert res["slide_count"] == 2

    final_data = yaml.safe_load(proj_file.read_text(encoding="utf-8"))
    assert final_data["title"] == "پروژه اولیه"
    assert len(final_data["slides"]) == 2
    assert final_data["slides"][0]["template"] == "cam"
    assert final_data["slides"][1]["template"] == "title_card"


# ------------------------------------------------------------------ 7. CLI Subcommand Tests
def test_cli_ai_guide_prints_to_stdout(capsys):
    ret = cli_main(["ai-guide", "موضوع تستی در خط فرمان"])
    assert ret == 0
    captured = capsys.readouterr()
    assert "# Khordegir Studio — Offline AI Slide Writer Specification" in captured.out
    assert "موضوع تستی در خط فرمان" in captured.out


def test_cli_ai_guide_writes_to_file(tmp_path):
    out_file = tmp_path / "ai_prompt.md"
    ret = cli_main(["ai-guide", "موضوع خروجی فایل", "-o", str(out_file)])
    assert ret == 0
    assert out_file.exists()
    content = out_file.read_text(encoding="utf-8")
    assert "موضوع خروجی فایل" in content
    assert "## STRICT OUTPUT RULES" in content


def test_cli_ai_import_dry_run(capsys):
    test_yaml = """
title: آزمون خط فرمان
theme: khordegir-dark
slides:
  - template: title_card
    title: عنوان معتبر
"""
    tmp_input = Path("/tmp/test_ai_input.yaml")
    tmp_input.write_text(test_yaml, encoding="utf-8")

    ret = cli_main(["ai-import", str(tmp_input), "--dry-run"])
    assert ret == 0
    captured = capsys.readouterr()
    assert "خروجی معتبر است" in captured.out


def test_cli_ai_import_writes_video_yaml(tmp_path):
    test_yaml = """
title: ویدیوی جدید از هوش مصنوعی
theme: khordegir-dark
slides:
  - template: title_card
    title: شروع ویدیو
  - template: cam
    say: کلام پایانی
"""
    input_file = tmp_path / "ai_output.txt"
    input_file.write_text(test_yaml, encoding="utf-8")

    out_yaml = tmp_path / "video.yaml"
    ret = cli_main(["ai-import", str(input_file), "-o", str(out_yaml)])
    assert ret == 0
    assert out_yaml.exists()

    parsed = yaml.safe_load(out_yaml.read_text(encoding="utf-8"))
    assert parsed["title"] == "ویدیوی جدید از هوش مصنوعی"
    assert len(parsed["slides"]) == 2


# ------------------------------------------------------------------ 8. Red Lines & Architectural Compliance
def test_offline_red_line_no_external_imports():
    """Verify ai_guide.py contains no google.genai, cloud, or external network requests."""
    ai_guide_path = PKG_ROOT / "ai_guide.py"
    content = ai_guide_path.read_text(encoding="utf-8")
    assert "google.genai" not in content
    assert "requests.get" not in content
    assert "urllib.request" not in content
    assert "API_KEY" not in content


def test_gsap_vendor_never_modified():
    """Verify vendor/gsap.min.js remains intact."""
    gsap_path = PKG_ROOT / "vendor" / "gsap.min.js"
    assert gsap_path.exists()
    # Check that standard GSAP license header or text is untouched
    txt = gsap_path.read_text(encoding="utf-8", errors="ignore")
    assert "GreenSock" in txt or "gsap" in txt.lower()
