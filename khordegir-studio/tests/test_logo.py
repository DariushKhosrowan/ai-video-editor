"""Python tests for Khordegir Studio Logo Placement (Broadcast Bug Watermark).

Covers defaults, each corner, each format, bad values, unknown keys, missing files, and per-slide hide.
Executable directly via `python3 test_logo.py`.
"""

from __future__ import annotations

import pathlib
import sys
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
PKG_PARENT = ROOT.parent
if str(PKG_PARENT) not in sys.path:
    sys.path.insert(0, str(PKG_PARENT))

from khordegir.music import LogoConfig, parse_logo_block


class TestLogoPlacement(unittest.TestCase):
    def test_logo_absent_defaults(self):
        yaml_txt = """
title: Test Video
slides:
  - template: title_card
    title: Hello
"""
        self.assertIsNone(parse_logo_block(yaml_txt))

    def test_logo_valid_configurations(self):
        with unittest.mock.patch.object(pathlib.Path, "is_file", return_value=True):
            # 1. Shorthand string path
            yaml_str = """
logo: img/logo.png
slides:
  - template: title_card
    title: Test
"""
            cfg = parse_logo_block(yaml_str, khordegir_root=ROOT)
            self.assertIsInstance(cfg, LogoConfig)
            self.assertEqual(cfg.corner, "top-left")
            self.assertEqual(cfg.size, 8.0)
            self.assertEqual(cfg.opacity, 0.85)
            self.assertEqual(cfg.margin, 40.0)
            self.assertEqual(cfg.hide, ())

            # 2. Explicit dictionary with all options and per-slide hide
            yaml_dict = """
logo:
  file: img/logo.png
  corner: top-right
  size: 10%
  opacity: 0.9
  margin: 30px
  hide: [1, "slide-2", 3]
slides:
  - template: title_card
    title: Test 1
"""
            cfg2 = parse_logo_block(yaml_dict, khordegir_root=ROOT)
            self.assertEqual(cfg2.corner, "top-right")
            self.assertEqual(cfg2.size, 10.0)
            self.assertEqual(cfg2.opacity, 0.90)
            self.assertEqual(cfg2.margin, 30.0)
            self.assertEqual(cfg2.hide, (1, "slide-2", 3))

    def test_logo_all_corners(self):
        with unittest.mock.patch.object(pathlib.Path, "is_file", return_value=True):
            for corner in ("top-left", "top-right", "bottom-left", "bottom-right"):
                yaml_txt = f"""
logo:
  file: img/logo.png
  corner: {corner}
"""
                cfg = parse_logo_block(yaml_txt, khordegir_root=ROOT)
                self.assertEqual(cfg.corner, corner)

    def test_logo_validation_errors(self):
        # 1. Unknown corner
        with self.assertRaises(ValueError):
            parse_logo_block(
                {"logo": {"file": "img/logo.png", "corner": "middle-earth"}},
                khordegir_root=ROOT,
            )

        # 2. Out of range size
        with self.assertRaises(ValueError):
            parse_logo_block(
                {"logo": {"file": "img/logo.png", "size": 150}},
                khordegir_root=ROOT,
            )

        # 3. Out of range opacity
        with self.assertRaises(ValueError):
            parse_logo_block(
                {"logo": {"file": "img/logo.png", "opacity": 1.5}},
                khordegir_root=ROOT,
            )

        # 4. Out of range margin
        with self.assertRaises(ValueError):
            parse_logo_block(
                {"logo": {"file": "img/logo.png", "margin": 600}},
                khordegir_root=ROOT,
            )

        # 5. Unknown keys in logo block
        with self.assertRaises(ValueError):
            parse_logo_block(
                {"logo": {"file": "img/logo.png", "unsupported_key": True}},
                khordegir_root=ROOT,
            )

        # 6. Missing or unreadable file
        with self.assertRaises(FileNotFoundError):
            parse_logo_block(
                {"logo": {"file": "non_existent_logo.png"}},
                khordegir_root=ROOT,
            )


import unittest.mock

if __name__ == "__main__":
    unittest.main()
