"""Automated Python tests for Slow Real-Edit Pacing, 14 Themes, and 20 Wave-3 Templates (66 total)."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from khordegir.index import load_template_entries, load_theme_files
from khordegir.project import load_project

STUDIO_DIR = Path(__file__).resolve().parents[1]
TPL_DIR = STUDIO_DIR / "khordegir" / "templates"
THEMES_DIR = STUDIO_DIR / "khordegir" / "themes"

WAVE3_TEMPLATES = [
    # Diagrams (6)
    "flowchart",
    "funnel_diagram",
    "mind_map",
    "venn_diagram",
    "pyramid_hierarchy",
    "cycle_diagram",
    # Passages & English (4)
    "passage_highlight",
    "convey_english",
    "book_excerpt",
    "pull_quote",
    # Images & Visual Stories (4)
    "image_gallery",
    "annotated_image",
    "corkboard",
    "phone_mockup",
    # Compares & Lists (4)
    "pros_cons",
    "matrix_2x2",
    "checklist_progressive",
    "ranking_podium",
    # YouTube & Stats (2)
    "stat_hero",
    "subscribe_cta",
]

NEW_THEMES = [
    "vox-documentary.js",
    "magnates-noir.js",
    "kurzgesagt-cosmos.js",
    "ali-productivity.js",
    "viral-shorts.js",
    "persian-turquoise.js",
]


class SlowPacingAndWave3TemplatesTests(unittest.TestCase):
    def test_all_66_templates_and_14_themes_registered_with_zero_duplicate_aliases(self) -> None:
        entries = load_template_entries()
        themes = load_theme_files()
        self.assertGreaterEqual(len(entries), 66)
        self.assertGreaterEqual(len(themes), 14)

        by_name = {e["name"]: e for e in entries}
        for name in WAVE3_TEMPLATES:
            self.assertIn(name, by_name, f"Wave-3 template missing from index: {name}")

        for tf in NEW_THEMES:
            self.assertIn(tf, themes, f"New theme missing from themes/_list.js: {tf}")
            self.assertTrue((THEMES_DIR / tf).is_file())

        seen_aliases = {}
        for entry in entries:
            for al in entry.get("schema", {}).get("aliases", []) or []:
                self.assertNotIn(
                    al,
                    seen_aliases,
                    f"Duplicate alias '{al}' between '{seen_aliases.get(al)}' and '{entry['name']}'",
                )
                seen_aliases[al] = entry["name"]

    def test_wave3_templates_schema_aspect_step_reveal_and_no_math_random(self) -> None:
        for name in WAVE3_TEMPLATES:
            sp = TPL_DIR / name / "schema.json"
            jp = TPL_DIR / name / "template.js"
            self.assertTrue(sp.is_file(), f"Missing schema.json for {name}")
            self.assertTrue(jp.is_file(), f"Missing template.js for {name}")

            schema = json.loads(sp.read_text(encoding="utf-8"))
            self.assertEqual(schema["name"], name)
            self.assertTrue(schema.get("label"))
            self.assertTrue(schema.get("description"))
            self.assertIsInstance(schema.get("example"), dict)

            editable = [f for f in schema.get("fields", []) if f.get("editable") is True]
            self.assertGreaterEqual(len(editable), 3, f"{name} must expose >=3 editable fields")

            src = jp.read_text(encoding="utf-8")
            self.assertIn(f'name: "{name}"', src)
            self.assertIn("Stage.T.aspect", src, f"{name} must adapt across 16:9 / 9:16 / 1:1")
            self.assertNotIn("Math.random(", src, f"{name} must be 100% deterministic")
            self.assertIn("A.field(", src, f"{name} must bind editable A.field hooks")

    def test_project_loader_inherits_slow_pacing_and_step_reveal_keys(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            pdir = Path(td)
            yaml_text = "\n".join([
                'title: "آزمون ریتم آرام و گام‌به‌گام"',
                'theme: "vox-documentary"',
                'format: "16:9"',
                'motionPersonality: "explainer-slow"',
                'motionPace: "slow-step"',
                'revealMode: "dim-previous"',
                'stepDelay: 1.2',
                'motionSpeed: 0.65',
                'captionStyle: "karaoke-gold"',
                "slides:",
                '  - template: "flowchart"',
                '    title: "مسیر اول"',
                '  - template: "convey_english"',
                '    english: "Break the ice"',
                '    motionPace: "ultra-slow"',
                '    stepDelay: 1.6',
            ]) + "\n"
            (pdir / "video.yaml").write_text(yaml_text, encoding="utf-8")
            loaded = load_project(pdir, auto_lipsync=False)
            self.assertEqual(len(loaded["slides"]), 2)

            s0 = loaded["slides"][0]
            self.assertEqual(s0["motionPersonality"], "explainer-slow")
            self.assertEqual(s0["motionPace"], "slow-step")
            self.assertEqual(s0["revealMode"], "dim-previous")
            self.assertEqual(s0["stepDelay"], 1.2)
            self.assertEqual(s0["motionSpeed"], 0.65)
            self.assertEqual(s0["captionStyle"], "karaoke-gold")

            s1 = loaded["slides"][1]
            self.assertEqual(s1["template"], "convey_english")
            self.assertEqual(s1["motionPace"], "ultra-slow")
            self.assertEqual(s1["stepDelay"], 1.6)
            self.assertEqual(s1["revealMode"], "dim-previous")


if __name__ == "__main__":
    unittest.main()
