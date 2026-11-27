"""Tests for Khordegir Studio animation presets and keyframe resolver module.

Licensed under MIT / Apache 2.0.
Covers parsing video.yaml animation blocks, validation, default presets,
advanced keyframes, exponential e^(-x) easing resolution, and error handling.
"""
from __future__ import annotations

import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from khordegir import anim_presets


class TestAnimPresets(unittest.TestCase):
    def test_list_and_get_presets(self):
        presets = anim_presets.list_presets()
        self.assertIn("fade-up", presets)
        self.assertIn("pop", presets)
        self.assertIn("slide", presets)
        self.assertIn("typewriter", presets)
        self.assertIn("zoom", presets)
        self.assertIn("bounce", presets)
        self.assertIn("glitch", presets)
        self.assertIn("spin", presets)

        p = anim_presets.get_preset("pop")
        self.assertEqual(p["duration"], 0.45)
        self.assertEqual(p["ease"], "expOut(5)")
        self.assertEqual(p["from"]["scale"], 0.8)

    def test_parse_string_preset(self):
        cfg = anim_presets.parse_animation("fade-up")
        self.assertEqual(cfg["duration"], 0.5)
        self.assertEqual(cfg["ease"], "expOut(5)")
        self.assertEqual(cfg["from"]["y"], 24.0)

        # None / empty defaults to fade-up
        self.assertEqual(anim_presets.parse_animation(None)["ease"], "expOut(5)")
        self.assertEqual(anim_presets.parse_animation("")["ease"], "expOut(5)")

    def test_parse_dict_preset_with_overrides(self):
        raw = {
            "preset": "pop",
            "duration": 0.8,
            "delay": 0.2,
            "ease": "expOut(6)",
            "from": {"scale": 0.5},
        }
        cfg = anim_presets.parse_animation(raw)
        self.assertEqual(cfg["preset"], "pop")
        self.assertEqual(cfg["duration"], 0.8)
        self.assertEqual(cfg["delay"], 0.2)
        self.assertEqual(cfg["ease"], "expOut(6)")
        self.assertEqual(cfg["from"]["scale"], 0.5)
        self.assertEqual(cfg["to"]["scale"], 1.0)

    def test_parse_advanced_keyframes(self):
        raw = {
            "advanced": {
                "keyframes": [
                    {"t": 0.0, "opacity": 0.0, "scale": 0.5},
                    {"t": 0.3, "opacity": 1.0, "scale": 1.1},
                    {"t": 0.5, "opacity": 1.0, "scale": 1.0},
                ]
            }
        }
        cfg = anim_presets.parse_animation(raw)
        self.assertIn("keyframes", cfg)
        kfs = cfg["keyframes"]
        self.assertEqual(len(kfs), 3)
        self.assertEqual(kfs[0]["t"], 0.0)
        self.assertEqual(kfs[1]["scale"], 1.1)
        self.assertEqual(kfs[2]["t"], 0.5)

    def test_parse_direct_keyframes_list(self):
        raw = [
            {"time": 0.0, "opacity": 0.0},
            {"time": 0.5, "opacity": 1.0},
        ]
        cfg = anim_presets.parse_animation(raw)
        self.assertEqual(cfg["preset"], "custom-keyframes")
        self.assertEqual(len(cfg["keyframes"]), 2)
        self.assertEqual(cfg["keyframes"][1]["t"], 0.5)

    def test_resolve_animation(self):
        spec = anim_presets.resolve_animation("slide")
        self.assertEqual(spec["duration"], 0.5)
        self.assertEqual(spec["ease"], "expOut(5)")
        self.assertEqual(spec["from"]["x"], 40.0)
        self.assertEqual(spec["to"]["x"], 0.0)

    def test_validation_errors(self):
        with self.assertRaises(ValueError):
            anim_presets.parse_animation("non-existent-preset")

        with self.assertRaises(TypeError):
            anim_presets.parse_animation({"preset": "pop", "duration": "fast"})

        with self.assertRaises(TypeError):
            anim_presets.parse_animation({"preset": "pop", "duration": -0.5})

        with self.assertRaises(ValueError):
            anim_presets.parse_animation({"from": {"unknown_prop": 123}})

        with self.assertRaises(TypeError):
            anim_presets.parse_animation({"from": {"opacity": "zero"}})

        with self.assertRaises(ValueError):
            anim_presets.parse_animation({
                "keyframes": [
                    {"t": 0.5, "opacity": 1.0},
                    {"t": 0.2, "opacity": 0.5},
                ]
            })

        with self.assertRaises(ValueError):
            anim_presets.parse_animation({
                "keyframes": [
                    {"opacity": 1.0},
                ]
            })

        with self.assertRaises(TypeError):
            anim_presets.parse_animation(12345)


if __name__ == "__main__":
    unittest.main()
