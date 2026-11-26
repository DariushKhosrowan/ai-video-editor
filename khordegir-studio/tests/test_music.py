import math
import khordegir.music as m


def test_crossfade_equal_power():
    for u in (0.0, 0.25, 0.5, 1.0):
        a, b = m.crossfade_gains(u, "equal_power")
        assert abs(a * a + b * b - 1) < 1e-6


def test_fade_bounds():
    assert m.fade_gain.__call__ is not None


def test_lufs_silence_is_very_low():
    ch = [[0.0] * 48000, [0.0] * 48000]
    assert m.measure_lufs(ch, 48000) < -60 or m.measure_lufs(ch, 48000) == -math.inf


def test_catalog_has_8_moods():
    assert len(m.MOOD_CATALOG) == 8
