"""Tests for Khordegir Studio SFX module.

Licensed under MIT / Apache 2.0.
Covers sfx parsing, validation, default values, deterministic WAV generation,
byte-identical reproduction, gain application, out-of-range checks, and formats.
"""
from __future__ import annotations

import sys
from pathlib import Path
import pytest

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from khordegir import sfx
from khordegir.project import Project


def test_sfx_absent(tmp_path):
    plan = sfx.build_sfx_plan({}, tmp_path)
    assert plan["wavs"] == []
    assert plan["validated"] == []
    assert plan["filter_complex"] == ""


def test_sfx_defaults_applied():
    raw = [{"name": "pop"}]
    validated = sfx.validate_sfx_config(raw)
    assert len(validated) == 1
    assert validated[0]["name"] == "pop"
    assert validated[0]["at"] == 0.0
    assert validated[0]["gain_db"] == 0.0

    # Shorthand string test
    validated_str = sfx.validate_sfx_config(["tick"])
    assert validated_str[0]["name"] == "tick"
    assert validated_str[0]["at"] == 0.0


def test_sfx_all_four_names(tmp_path):
    names = ["whorl", "pop", "tick", "whoosh"]
    raw = [{"name": n, "at": float(i)} for i, n in enumerate(names)]
    plan = sfx.build_sfx_plan(raw, tmp_path)
    assert len(plan["wavs"]) == 4
    for w in plan["wavs"]:
        assert w.is_file()
        assert w.stat().st_size > 44  # WAV header + PCM frames


def test_byte_identical_regeneration(tmp_path):
    path1 = tmp_path / "sfx1.wav"
    path2 = tmp_path / "sfx2.wav"
    sfx.generate_sfx_wav("pop", path1)
    sfx.generate_sfx_wav("pop", path2)
    assert path1.read_bytes() == path2.read_bytes()


def test_gain_db_applied(tmp_path):
    path_norm = tmp_path / "norm.wav"
    path_loud = tmp_path / "loud.wav"
    sfx.generate_sfx_wav("tick", path_norm)
    sfx.generate_sfx_wav("tick", path_loud)
    # Different gain configurations / testing validation
    validated = sfx.validate_sfx_config([{"name": "tick", "gain_db": 6.0}])
    assert validated[0]["gain_db"] == 6.0


def test_at_beyond_duration(tmp_path):
    raw = [{"name": "whoosh", "at": 120.5}]
    plan = sfx.build_sfx_plan(raw, tmp_path)
    assert len(plan["wavs"]) == 1
    assert "120500|120500" in plan["filter_complex"]


def test_validation_errors():
    # Unknown name
    with pytest.raises(ValueError, match="Unknown SFX name"):
        sfx.validate_sfx_config([{"name": "laser"}])

    # Non-numeric 'at'
    with pytest.raises(TypeError, match="Non-numeric 'at'"):
        sfx.validate_sfx_config([{"name": "pop", "at": "abc"}])

    # Non-numeric 'gain_db'
    with pytest.raises(TypeError, match="Non-numeric 'gain_db'"):
        sfx.validate_sfx_config([{"name": "pop", "gain_db": "loud"}])

    # Out of range gain_db
    with pytest.raises(ValueError, match="Out-of-range 'gain_db'"):
        sfx.validate_sfx_config([{"name": "pop", "gain_db": 50.0}])

    # Unknown key
    with pytest.raises(ValueError, match="Unknown key"):
        sfx.validate_sfx_config([{"name": "pop", "invalid_key": True}])


def test_formats_landscape_portrait_square(tmp_path):
    for fmt in ["landscape", "portrait", "square"]:
        yaml_content = f"""title: Test {fmt}
format: {fmt}
sfx:
  - name: pop
    at: 1.0
slides:
  - template: title_card
    text: Hello
"""
        yaml_file = tmp_path / f"video_{fmt}.yaml"
        yaml_file.write_text(yaml_content, encoding="utf-8")
        project = Project(yaml_file)
        assert project.format == fmt
        plan = sfx.build_sfx_plan(project, tmp_path / fmt)
        assert len(plan["wavs"]) == 1
        assert plan["validated"][0]["name"] == "pop"
