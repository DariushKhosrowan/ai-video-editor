"""Unit tests for Puppet Schema v2 (Phase 1 Items 1-4 & Phase 2 Items 5-8)."""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from khordegir.puppet_schema import (  # noqa: E402
    BRAND_PALETTE,
    EMOTION_NAMES,
    GESTURE_NAMES,
    PART_DEFAULTS,
    PUPPET_PRESETS,
    PUPPET_SCHEMA_VERSION,
    export_preset_json,
    import_preset_json,
    normalize_puppet_config,
    parse_script_tags,
)
from khordegir.project import load_project  # noqa: E402


class TestPuppetSchemaV2(unittest.TestCase):
    def test_18_part_tree_and_defaults_clamped(self):
        cfg = normalize_puppet_config({
            "parts": {
                "head": {"x": 999, "y": -500, "rotation": 180, "scaleX": 10, "outlineWidth": 5, "visible": False, "zOrder": 9},
                "crest": {"zOrder": 15, "rotation": -12},
            },
            "spring": {"stiffness": 9999, "damping": 0.5, "mass": 99},
        })
        self.assertEqual(cfg["version"], PUPPET_SCHEMA_VERSION)
        self.assertEqual(len(cfg["parts"]), 18)
        for pk in PART_DEFAULTS:
            self.assertIn(pk, cfg["parts"])
        self.assertEqual(cfg["parts"]["head"]["x"], 240.0)
        self.assertEqual(cfg["parts"]["head"]["y"], -240.0)
        self.assertEqual(cfg["parts"]["head"]["rotation"], 90.0)
        self.assertEqual(cfg["parts"]["head"]["scaleX"], 2.5)
        self.assertEqual(cfg["parts"]["head"]["outlineWidth"], 3.0)
        self.assertFalse(cfg["parts"]["head"]["visible"])
        self.assertEqual(cfg["parts"]["crest"]["zOrder"], 15)
        self.assertEqual(cfg["spring"]["stiffness"], 600.0)
        self.assertEqual(cfg["spring"]["damping"], 4.0)
        self.assertEqual(cfg["spring"]["mass"], 4.0)

    def test_brand_palette_lock_enforced_and_unlockable(self):
        locked = normalize_puppet_config({
            "paletteLock": True,
            "palette": {"redPrimary": "#00FF00"},
            "parts": {"head": {"color": "#123456"}},
        })
        self.assertTrue(locked["paletteLock"])
        self.assertEqual(locked["palette"]["redPrimary"], BRAND_PALETTE["redPrimary"])
        self.assertIsNone(locked["parts"]["head"]["color"])

        unlocked = normalize_puppet_config({
            "paletteLock": False,
            "palette": {"redPrimary": "#00aa88", "beakGold": "invalid"},
            "parts": {"head": {"color": "#112233"}},
        })
        self.assertFalse(unlocked["paletteLock"])
        self.assertEqual(unlocked["palette"]["redPrimary"], "#00AA88")
        self.assertEqual(unlocked["palette"]["beakGold"], BRAND_PALETTE["beakGold"])
        self.assertEqual(unlocked["parts"]["head"]["color"], "#112233")

    def test_all_10_presets_and_15_emotions_and_9_gestures(self):
        self.assertEqual(len(PUPPET_PRESETS), 10)
        self.assertEqual(len(EMOTION_NAMES), 15)
        self.assertEqual(len(GESTURE_NAMES), 9)
        for name in (
            "calm", "lively", "dramatic", "newsreader", "comedian",
            "whisper", "shouting", "sleepy", "angry", "excited",
        ):
            cfg = normalize_puppet_config({"preset": name})
            self.assertEqual(cfg["preset"], name)
            self.assertEqual(cfg["tone"]["preset"], name)
            self.assertGreater(cfg["spring"]["stiffness"], 0)
            self.assertGreater(cfg["spring"]["damping"], 0)
            self.assertGreater(cfg["spring"]["mass"], 0)

    def test_preset_json_export_import_roundtrip(self):
        orig = normalize_puppet_config({
            "preset": "comedian",
            "paletteLock": False,
            "palette": {"beakGold": "#FFCC00"},
            "spring": {"stiffness": 290, "damping": 21, "mass": 0.9},
            "secondary": {"featherJiggle": 1.2, "crestOverlap": 1.1, "squashPreserveVolume": True},
            "keyframes": [{"t": 0.5, "gain": "mouthGain", "value": 1.5, "ease": "linear"}],
        })
        raw_json = export_preset_json("my-comedian", orig)
        parsed = json.loads(raw_json)
        self.assertEqual(parsed["schema"], "khordegir-puppet-preset")
        self.assertEqual(parsed["version"], 2)

        imported = import_preset_json(raw_json)
        self.assertEqual(imported["name"], "my-comedian")
        self.assertEqual(imported["puppet"]["preset"], "comedian")
        self.assertEqual(imported["puppet"]["spring"]["stiffness"], 290.0)
        self.assertEqual(imported["puppet"]["palette"]["beakGold"], "#FFCC00")
        self.assertEqual(len(imported["puppet"]["keyframes"]), 1)

    def test_script_tag_parser_deterministic(self):
        text = "[point] سلام بچه‌ها! [smug:1.3] این آمار شگفت‌انگیز است [double-take+0.2] [look:camera] [angry:0.8]"
        a = parse_script_tags(text, duration=6.0)
        b = parse_script_tags(text, duration=6.0)
        self.assertEqual(a, b)
        self.assertNotIn("[point]", a["clean_text"])
        self.assertNotIn("[smug:1.3]", a["clean_text"])
        self.assertEqual([e["expression"] for e in a["emotions"]], ["smug", "angry"])
        self.assertAlmostEqual(a["emotions"][0]["intensity"], 1.3, places=2)
        self.assertEqual([g["gesture"] for g in a["gestures"]], ["point", "double-take"])
        self.assertAlmostEqual(a["gestures"][1]["offset"], 0.2, places=2)
        self.assertEqual(a["gaze"][0]["target"], "camera")

    def test_project_puppet_inheritance_and_demo_load(self):
        demo = load_project(ROOT / "examples" / "mascot-demo", auto_lipsync=False)
        self.assertIsNotNone(demo.get("puppet"))
        self.assertEqual(demo["puppet"]["version"], 2)
        s0 = demo["slides"][0]
        self.assertIn("puppet", s0)
        self.assertEqual(len(s0["puppet"]["parts"]), 18)
        self.assertEqual(len(s0["puppet"]["keyframes"]), 2)
        self.assertEqual(len(s0["puppet"]["sentences"]), 2)
        self.assertEqual(len(s0["puppet"]["gestures"]), 2)
        # Slide 2 inherits project-level puppet defaults + keeps its own dramatic legacy tone
        s1 = demo["slides"][1]
        self.assertEqual(s1["puppet"]["preset"], "dramatic")

    def test_custom_project_override_merging(self):
        with tempfile.TemporaryDirectory() as td:
            pdir = Path(td)
            (pdir / "video.yaml").write_text(
                """
title: Puppet Inheritance Test
puppet:
  preset: newsreader
  secondary:
    featherJiggle: 0.9
slides:
  - template: mascot_talk
    title: Slide 1
    say: تست اول
  - template: mascot_talk
    title: Slide 2
    puppet:
      preset: sleepy
      parts:
        crest:
          visible: false
""",
                encoding="utf-8",
            )
            proj = load_project(pdir, auto_lipsync=False)
            self.assertEqual(proj["slides"][0]["puppet"]["preset"], "newsreader")
            self.assertAlmostEqual(proj["slides"][0]["puppet"]["secondary"]["featherJiggle"], 0.9, places=2)
            self.assertEqual(proj["slides"][1]["puppet"]["preset"], "sleepy")
            self.assertFalse(proj["slides"][1]["puppet"]["parts"]["crest"]["visible"])
            self.assertAlmostEqual(proj["slides"][1]["puppet"]["secondary"]["featherJiggle"], 0.9, places=2)


if __name__ == "__main__":
    unittest.main()
