"""Tests for template schemas, project video.yaml normalization, CLI, and 16:9 / 9:16 / 1:1 planning."""

from __future__ import annotations

import json
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from khordegir.cli import main as cli_main
from khordegir.index import load_template_entries
from khordegir.project import PKG_DIR, load_project
from khordegir.render import plan_render_jobs, render_project

STUDIO_DIR = Path(__file__).resolve().parent.parent
DEMO_DIR = STUDIO_DIR / "examples" / "mascot-demo"

EXPECTED_EXPRESSIONS = ["neutral", "happy", "smug", "shocked", "annoyed", "embarrassed", "thinking"]


class TestSchemaAndProject(unittest.TestCase):
    def test_all_schemas_valid_and_mascot_talk_complete(self) -> None:
        entries = load_template_entries(PKG_DIR)
        names = [e["name"] for e in entries]
        self.assertEqual(len(names), len(set(names)), "Duplicate template names detected")

        # Existing core templates remain registered cleanly
        for legacy in ("title_card", "big_number", "bar_chart", "quote", "cam"):
            self.assertIn(legacy, names, f"Missing existing template: {legacy}")

        self.assertIn("mascot_talk", names)
        mt = next(e["schema"] for e in entries if e["name"] == "mascot_talk")
        fields = {f["key"]: f for f in mt["fields"]}

        for req_key in (
            "eyebrow", "title", "text", "image", "expression", "side", "scale",
            "position_x", "position_y", "look_at", "enter", "exit", "audio",
            "viseme_track", "accents", "format", "preset",
        ):
            self.assertIn(req_key, fields, f"Missing schema field {req_key}")

        expr_opts = [opt[0] for opt in fields["expression"]["options"]]
        for ex in EXPECTED_EXPRESSIONS:
            self.assertIn(ex, expr_opts)

        fmt_opts = [opt[0] for opt in fields["format"]["options"]]
        for fmt in ("auto", "16:9", "9:16", "1:1"):
            self.assertIn(fmt, fmt_opts)

        # Verify generated templates/_index.js references every template
        index_js = (PKG_DIR / "templates" / "_index.js").read_text(encoding="utf-8")
        for n in names:
            self.assertIn(f"templates/{n}/template.js", index_js)

    def test_demo_project_load_auto_lipsync_and_multiformat_plan(self) -> None:
        proj = load_project(DEMO_DIR, auto_lipsync=True, fps=30)
        self.assertEqual(len(proj["slides"]), 4)

        s0 = proj["slides"][0]
        self.assertEqual(s0["template"], "mascot_talk")
        self.assertEqual(s0["format"], "16:9")
        self.assertIn("visemeTrack", s0)
        self.assertGreater(len(s0["visemeTrack"]["frames"]), 120)
        self.assertEqual(len(s0["expression_timeline"]), 6)

        # Slide 2 tests mascot overlay layer + auto audio->viseme generation when viseme_track omitted
        s1 = proj["slides"][1]
        self.assertEqual(s1["template"], "big_number")
        self.assertEqual(s1["number"], 80)
        self.assertTrue(s1["mascot"]["enabled"])
        self.assertEqual(s1["mascot"]["expression"], "shocked")
        self.assertIn("visemeTrack", s1["mascot"])

        # Slide 3 & 4 carry 9:16 and 1:1 per-slide formats
        self.assertEqual(proj["slides"][2]["format"], "9:16")
        self.assertEqual(proj["slides"][3]["format"], "1:1")

        # Per-slide natural planning
        natural_jobs = plan_render_jobs(proj, formats=None, fps=30)
        self.assertEqual([(j["width"], j["height"]) for j in natural_jobs], [
            (1920, 1080),
            (1920, 1080),
            (1080, 1920),
            (1080, 1080),
        ])

        # Explicit multi-format export across 16:9, 9:16, 1:1
        multi_jobs = plan_render_jobs(proj, formats=["16:9", "9:16", "1:1"], fps=30)
        self.assertEqual(len(multi_jobs), 12)
        self.assertEqual({(j["width"], j["height"]) for j in multi_jobs}, {
            (1920, 1080),
            (1080, 1920),
            (1080, 1080),
        })

    def test_dry_run_render_and_cli_commands(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            out_dir = Path(td) / "out"
            res = render_project(DEMO_DIR, formats=["16:9", "9:16", "1:1"], out_dir=out_dir, dry_run=True)
            self.assertEqual(len(res["jobs"]), 12)
            self.assertTrue((out_dir / "steps_data.lua").is_file())
            self.assertTrue((out_dir / "steps.json").is_file())
            self.assertTrue((out_dir / "prompter.txt").is_file())
            lua_txt = (out_dir / "steps_data.lua").read_text(encoding="utf-8")
            self.assertIn("هنجار", lua_txt)

            # CLI lipsync invocation
            cli_out = Path(td) / "cli.visemes.json"
            rc = cli_main(["lipsync", str(DEMO_DIR / "narration.wav"), "-o", str(cli_out)])
            self.assertEqual(rc, 0)
            self.assertTrue(cli_out.is_file())
            parsed = json.loads(cli_out.read_text(encoding="utf-8"))
            self.assertGreater(len(parsed["frames"]), 120)

    def test_stage_and_editor_script_order_and_rules(self) -> None:
        for html_rel in (
            "stage/stage.html",
            "obs_stage/index.html",
            "editor/index.html",
        ):
            html = (PKG_DIR / html_rel).read_text(encoding="utf-8")
            mt_m = re.search(r'src="[^"]*motion-tokens\.js"', html)
            self.assertIsNotNone(mt_m, f"{html_rel} missing motion-tokens.js")
            assert mt_m is not None
            for target in ("core.js", "fx.js"):
                tm = re.search(rf'src="[^"]*(?:^|/|"){re.escape(target)}"', html)
                if tm:
                    self.assertLess(mt_m.start(), tm.start(), f"motion-tokens.js must load before {target} in {html_rel}")

        # Ensure zero Math.random() calls in deterministic mascot modules
        for js_rel in (
            "stage/motion-tokens.js",
            "stage/mascot-rig.js",
            "templates/mascot_talk/template.js",
            "editor/mascot-ui.js",
        ):
            src = (PKG_DIR / js_rel).read_text(encoding="utf-8")
            self.assertIsNone(re.search(r"\bMath\.random\s*\(", src), f"Math.random() call forbidden in {js_rel}")


if __name__ == "__main__":
    unittest.main()
