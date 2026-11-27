"""Tests for Khordegir Studio scene surface layer module.

Licensed under MIT / Apache 2.0.
Covers parsing top-level 'scene:' in video.yaml, allowed values (corkboard, paper, dark-grid, none),
defaults, and Persian line-numbered error raising.
"""
from __future__ import annotations

import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from khordegir import scene


class TestSceneModule(unittest.TestCase):
    def test_default_scene(self):
        self.assertEqual(scene.validate_scene(None), "none")
        self.assertEqual(scene.parse_scene({}), "none")
        self.assertEqual(scene.validate_scene(""), "none")

    def test_valid_scenes(self):
        for s in ("corkboard", "paper", "dark-grid", "none"):
            self.assertEqual(scene.validate_scene(s), s)
            self.assertEqual(scene.parse_scene({"scene": s}), s)

        # Case insensitivity and whitespace
        self.assertEqual(scene.validate_scene("  CorkBoard  "), "corkboard")
        self.assertEqual(scene.parse_scene({"scene": " PAPER "}), "paper")

    def test_invalid_scene_raises_persian_error(self):
        yaml_snippet = "title: Test\nscene: unknown-surface\n"
        with self.assertRaises(ValueError) as ctx:
            scene.validate_scene("unknown-surface", yaml_text=yaml_snippet)
        msg = str(ctx.exception)
        self.assertIn("خطای خط", msg)
        self.assertIn("video.yaml", msg)
        self.assertIn("unknown-surface", msg)

    def test_invalid_type_raises_error(self):
        with self.assertRaises(TypeError):
            scene.validate_scene(123)


if __name__ == "__main__":
    unittest.main()
