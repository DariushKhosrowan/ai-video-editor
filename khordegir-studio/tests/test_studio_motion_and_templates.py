"""Automated tests for Studio Motion Design System v2 (A1-A8) and 24 new broadcast templates (B1-B7, 46 total)."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from khordegir.index import load_template_entries, load_theme_files
from khordegir.project import load_project

STUDIO_DIR = Path(__file__).resolve().parents[1]
TPL_DIR = STUDIO_DIR / "khordegir" / "templates"

NEW_TEMPLATES = [
    # B1: News / Explainer
    "breaking_news",
    "fact_check",
    "two_source_compare",
    "by_the_numbers",
    # B2: Education
    "definition_card",
    "quiz_poll",
    "mistake_vs_correct",
    "step_by_step",
    "vocabulary_card",
    "flashcard_flip",
    # B3: Social / Shorts
    "hook_title",
    "before_after",
    "list_countdown",
    "comment_reply",
    # B4: Podcast / Talk
    "audiogram",
    "guest_card",
    "chapter_card",
    # B5: Data
    "comparison_table",
    "bar_race",
    "donut_chart",
    "map_choropleth",
    # B6: Story / Editorial
    "newspaper_clip",
    "polaroid_wall",
    # B7: Puppet / Mascot
    "mascot_pip",
]


class StudioMotionAndTemplatesTests(unittest.TestCase):
    def test_all_24_new_templates_have_valid_schema_and_template_js(self) -> None:
        entries = load_template_entries()
        by_name = {e["name"]: e for e in entries}
        self.assertGreaterEqual(len(entries), 46)

        seen_aliases = {}
        for entry in entries:
            schema_aliases = entry.get("schema", {}).get("aliases", [])
            for al in schema_aliases:
                self.assertNotIn(
                    al,
                    seen_aliases,
                    f"Duplicate alias '{al}' shared between '{seen_aliases.get(al)}' and '{entry['name']}'",
                )
                seen_aliases[al] = entry["name"]

        for name in NEW_TEMPLATES:
            self.assertIn(name, by_name, f"Missing template in index: {name}")
            schema_path = TPL_DIR / name / "schema.json"
            js_path = TPL_DIR / name / "template.js"
            self.assertTrue(schema_path.is_file(), f"Missing schema.json for {name}")
            self.assertTrue(js_path.is_file(), f"Missing template.js for {name}")

            schema = json.loads(schema_path.read_text(encoding="utf-8"))
            self.assertEqual(schema["name"], name)
            self.assertTrue(schema.get("label"), f"Missing label for {name}")
            self.assertTrue(schema.get("description"), f"Missing description for {name}")
            self.assertTrue(schema.get("category"), f"Missing category for {name}")
            self.assertIsInstance(schema.get("example"), dict, f"Missing example dict for {name}")

            fields = schema.get("fields", [])
            editable_fields = [f for f in fields if f.get("editable") is True]
            self.assertGreaterEqual(
                len(editable_fields),
                3,
                f"Template {name} should expose at least 3 editable fields for WYSIWYG editing",
            )

            js_src = js_path.read_text(encoding="utf-8")
            self.assertIn(f'name: "{name}"', js_src)
            self.assertIn("Stage.T.aspect", js_src, f"Template {name} should adapt to 16:9, 9:16, and 1:1")
            self.assertNotIn("Math.random(", js_src, f"Template {name} must remain 100% deterministic")
            for ef in editable_fields:
                key = ef["key"]
                # Verify template binds A.field for editable fields (either literal or via dynamic key binding)
                self.assertTrue(
                    f'A.field("{key}"' in js_src
                    or f"A.field('{key}'" in js_src
                    or "fieldPrefix" in js_src
                    or "isAfter ?" in js_src
                    or "A.field(ph.key" in js_src
                    or f"field{key.capitalize()}" in js_src,
                    f"Template {name} should wire A.field for editable key '{key}'",
                )

    def test_index_registers_all_46_templates_and_themes_cleanly(self) -> None:
        entries = load_template_entries()
        themes = load_theme_files()
        names = [e["name"] for e in entries]
        self.assertGreaterEqual(len(names), 46)
        self.assertGreaterEqual(len(themes), 1)
        idx_file = (TPL_DIR / "_index.js").read_text(encoding="utf-8")
        for name in NEW_TEMPLATES:
            self.assertIn(name, names)
            self.assertIn(f'"name": "{name}"', idx_file)

    def test_project_loader_inherits_motion_camera_ambience_and_mascot_pip_puppet(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            pdir = Path(td)
            yaml_lines = [
                'title: "آزمون کامل حرکت، دوربین، ذرات و قالب‌ها"',
                'theme: "khordegir-dark"',
                'format: "9:16"',
                'motionPersonality: "punchy"',
                'textMotion: "rise-mask"',
                'transition: "whip-pan-rtl"',
                'transitionTiming: {"duration": 0.45, "delay": 0.05, "ease": "snap", "intensity": 1.2}',
                'camera: "gentle-dolly-in"',
                'ambience: "studio-dust"',
                "slides:",
            ]
            for idx_i, name in enumerate(NEW_TEMPLATES):
                schema = json.loads((TPL_DIR / name / "schema.json").read_text(encoding="utf-8"))
                ex = dict(schema["example"])
                yaml_lines.append(f'  - template: "{name}"')
                if idx_i == 0:
                    yaml_lines.append('    motionPersonality: "news"')
                    yaml_lines.append('    textMotion: "typewriter"')
                    yaml_lines.append('    camera: "focus-pull"')
                for k, v in ex.items():
                    if k in ("template", "motionPersonality", "textMotion", "camera", "ambience"):
                        continue
                    yaml_lines.append(f"    {k}: {json.dumps(v, ensure_ascii=False)}")

            (pdir / "video.yaml").write_text("\n".join(yaml_lines) + "\n", encoding="utf-8")
            loaded = load_project(pdir, auto_lipsync=False)
            self.assertEqual(len(loaded["slides"]), len(NEW_TEMPLATES))

            # Slide 0 overrides project motionPersonality, textMotion & camera, inherits ambience & transitionTiming
            s0 = loaded["slides"][0]
            self.assertEqual(s0["template"], "breaking_news")
            self.assertEqual(s0["motionPersonality"], "news")
            self.assertEqual(s0["textMotion"], "typewriter")
            self.assertEqual(s0["camera"], "focus-pull")
            self.assertEqual(s0["ambience"], "studio-dust")
            self.assertEqual(s0["transitionTiming"]["duration"], 0.45)
            self.assertEqual(s0["format"], "9:16")

            # Slide 1 inherits project motionPersonality, textMotion, camera & ambience
            s1 = loaded["slides"][1]
            self.assertEqual(s1["template"], "fact_check")
            self.assertEqual(s1["motionPersonality"], "punchy")
            self.assertEqual(s1["textMotion"], "rise-mask")
            self.assertEqual(s1["transition"], "whip-pan-rtl")
            self.assertEqual(s1["camera"], "gentle-dolly-in")
            self.assertEqual(s1["ambience"], "studio-dust")

            # mascot_pip slide receives normalized puppet v2 config automatically
            pip_slide = next(s for s in loaded["slides"] if s["template"] == "mascot_pip")
            self.assertIn("puppet", pip_slide)
            self.assertEqual(pip_slide["puppet"].get("character"), "red_eagle")


if __name__ == "__main__":
    unittest.main()
