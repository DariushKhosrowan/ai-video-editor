import pytest
from khordegir import logo as L

def test_absent_is_none():
    assert L.parse_logo_config(None, ".") is None

def test_off_variants():
    assert L.parse_logo_config("off", ".") is False

def test_bad_position():
    with pytest.raises(ValueError):
        L.norm_logo_position("zz")

def test_clamp():
    assert L.clamp_logo_size_pct(1) == 4.0
    assert L.clamp_logo_size_pct(99) == 25.0

def test_unknown_key():
    with pytest.raises(ValueError):
        L.parse_logo_config({"path": "a.png", "bogus": 1}, ".")
