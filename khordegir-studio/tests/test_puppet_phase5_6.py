"""Tests for Red Eagle Puppet Phases 5 & 6 (Items 15–22).

Covers:
- Item 15: Shot system schema normalization (wide/medium/close-up/two-shot, <= 1.06 zoom cap, shotTimeline)
- Item 16: Parallax backgrounds & lighting presets normalization
- Item 17: Offline SRT parser (RTL Persian + LTR English, round-trip format, ffmpeg filter escaping) &
           Transparent WebM (VP9 yuva420p), ProRes 4444 (yuva444p10le), PNG sequence export commands
- Item 18: 60 fps support, deterministic FrameRenderCache, render-farm sharding/slicing, and JSON manifest
- Item 19–22: Debug flags, performance flags, declarative plugin emotions/gestures, tutorial project validation,
              and deterministic benchmark suite CLI.
"""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

STUDIO_DIR = Path(__file__).resolve().parents[1]
if str(STUDIO_DIR) not in sys.path:
    sys.path.insert(0, str(STUDIO_DIR))

from khordegir.cli import main as cli_main, run_benchmark
from khordegir.project import load_project
from khordegir.puppet_schema import (
    LIGHTING_PRESETS,
    PUPPET_BACKGROUNDS,
    SHOT_PRESETS,
    STAGE_ZOOM_CAP,
    normalize_puppet_config,
)
from khordegir.render import (
    FrameRenderCache,
    SUPPORTED_OUTPUT_FORMATS,
    build_ffmpeg_command,
    compute_frame_range,
    parse_shard_spec,
    plan_render_jobs,
    render_project,
)
from khordegir.srt import (
    active_caption_at,
    build_ffmpeg_srt_filter,
    detect_text_dir,
    escape_ffmpeg_filter_path,
    format_srt,
    load_srt_file,
    parse_srt,
)

TUTORIAL_DIR = STUDIO_DIR / "examples" / "red-eagle-tutorial"


class TestPuppetPhase5And6(unittest.TestCase):
    def test_srt_parser_bilingual_rtl_ltr_and_roundtrip(self) -> None:
        raw = """\ufeff1
00:00:00,200 --> 00:00:01,500
سلام دنیا! تست زیرنویس فارسی.

2
00:00:02,000 --> 00:00:03,250
Hello broadcast world!
Line two English.
"""
        cues = parse_srt(raw)
        self.assertEqual(len(cues), 2)
        self.assertEqual(cues[0]["dir"], "rtl")
        self.assertEqual(cues[0]["start"], 0.2)
        self.assertEqual(cues[0]["end"], 1.5)
        self.assertEqual(cues[1]["dir"], "ltr")
        self.assertIn("Line two", cues[1]["text"])

        # Deterministic lookup at time t
        self.assertIsNone(active_caption_at(cues, 0.05))
        self.assertEqual(active_caption_at(cues, 0.8)["index"], 1)
        self.assertIsNone(active_caption_at(cues, 1.75))
        self.assertEqual(active_caption_at(cues, 2.5)["index"], 2)

        # Round-trip format -> parse
        re_cues = parse_srt(format_srt(cues))
        self.assertEqual(len(re_cues), len(cues))
        for a, b in zip(cues, re_cues):
            self.assertEqual(a["start"], b["start"])
            self.assertEqual(a["end"], b["end"])
            self.assertEqual(a["text"], b["text"])
            self.assertEqual(a["dir"], b["dir"])

        self.assertEqual(detect_text_dir("خرده‌گیر"), "rtl")
        self.assertEqual(detect_text_dir("Red Eagle 2026"), "ltr")

        escaped = escape_ffmpeg_filter_path("C:/video's/sub:1.srt")
        self.assertIn("\\:", escaped)
        self.assertIn("\\'", escaped)
        flt = build_ffmpeg_srt_filter("/tmp/captions.srt")
        self.assertTrue(flt.startswith("subtitles='"))
        self.assertIn("Vazirmatn", flt)

    def test_puppet_schema_phase5_6_scene_debug_perf_plugins(self) -> None:
        self.assertEqual(STAGE_ZOOM_CAP, 1.06)
        self.assertIn("close-up", SHOT_PRESETS)
        self.assertIn("two-shot", SHOT_PRESETS)
        self.assertIn("studio-desk", PUPPET_BACKGROUNDS)
        self.assertIn("transparent", PUPPET_BACKGROUNDS)
        self.assertIn("rim-light", LIGHTING_PRESETS)

        cfg = normalize_puppet_config({
            "preset": "lively",
            "emotion": "eureka",
            "scene": {
                "shot": "wide",
                "pushIn": 0.95,  # Way above cap -> must clamp strictly so zoom + pushIn <= 1.06
                "background": "night-city",
                "parallax": 1.4,
                "lighting": "rim-light",
                "lightingIntensity": 0.9,
                "shotTimeline": [
                    {"t": 2.0, "shot": "close-up", "pushIn": 0.5, "blend": 0.5},
                    {"t": 0.0, "shot": "wide", "pushIn": 0.3, "blend": 0.4},
                ],
            },
            "debug": {"enabled": True, "showPivots": True, "showGraphs": True},
            "performance": {"fps": 60, "frameCache": True},
            "plugins": {
                "emotions": {
                    "eureka": {"label": "ایده", "labelEn": "Eureka", "browY": -12, "headTilt": 6}
                },
                "gestures": {
                    "victory-flap": {"label": "پیروزی", "labelEn": "Victory Flap", "wingLRot": -28}
                },
            },
            "gestures": [{"t": 1.2, "type": "victory-flap", "duration": 1.0}],
        })

        # Strict 1.06 zoom cap enforcement
        sc = cfg["scene"]
        self.assertLessEqual(SHOT_PRESETS[sc["shot"]]["zoom"] + sc["pushIn"], STAGE_ZOOM_CAP + 1e-6)
        self.assertEqual(len(sc["shotTimeline"]), 2)
        self.assertLessEqual(sc["shotTimeline"][0]["t"], sc["shotTimeline"][1]["t"])
        for cue in sc["shotTimeline"]:
            self.assertLessEqual(SHOT_PRESETS[cue["shot"]]["zoom"] + cue["pushIn"], STAGE_ZOOM_CAP + 1e-6)

        self.assertEqual(sc["background"], "night-city")
        self.assertEqual(sc["lighting"], "rim-light")
        self.assertTrue(cfg["debug"]["enabled"])
        self.assertEqual(cfg["performance"]["fps"], 60)
        self.assertTrue(cfg["performance"]["frameCache"])
        self.assertEqual(cfg["emotion"], "eureka")
        self.assertIn("eureka", cfg["plugins"]["emotions"])
        self.assertIn("victory-flap", cfg["plugins"]["gestures"])
        self.assertEqual(cfg["gestures"][0]["type"], "victory-flap")

    def test_ffmpeg_commands_alpha_webm_prores_and_srt_burnin(self) -> None:
        self.assertEqual(SUPPORTED_OUTPUT_FORMATS, ("mp4", "webm", "prores", "png-seq"))
        with tempfile.TemporaryDirectory() as td:
            srt_file = Path(td) / "sub.srt"
            srt_file.write_text("1\n00:00:00,000 --> 00:00:01,000\nسلام\n", encoding="utf-8")

            cmd_webm = build_ffmpeg_command(
                "ffmpeg", Path(td) / "out.webm",
                fps=60, output_format="webm", transparent=True, srt_burnin_path=srt_file,
            )
            self.assertIn("libvpx-vp9", cmd_webm)
            self.assertIn("yuva420p", cmd_webm)
            self.assertIn("60", cmd_webm)
            self.assertIn("-vf", cmd_webm)

            cmd_prores = build_ffmpeg_command(
                "ffmpeg", Path(td) / "out.mov",
                fps=30, output_format="prores", transparent=True,
            )
            self.assertIn("prores_ks", cmd_prores)
            self.assertIn("4444", cmd_prores)
            self.assertIn("yuva444p10le", cmd_prores)

            cmd_mp4 = build_ffmpeg_command(
                "ffmpeg", Path(td) / "out.mp4",
                fps=30, output_format="mp4", transparent=False,
            )
            self.assertIn("libx264", cmd_mp4)
            self.assertIn("yuv420p", cmd_mp4)

    def test_render_farm_sharding_and_frame_cache_determinism(self) -> None:
        self.assertEqual(parse_shard_spec("2/4"), (2, 4))
        with self.assertRaises(ValueError):
            parse_shard_spec("5/4")

        # Shards 1/3, 2/3, 3/3 must form an exact disjoint partition of [0, 100)
        covered = []
        for k in (1, 2, 3):
            lo, hi = compute_frame_range(100, shard=(k, 3))
            self.assertLess(lo, hi)
            covered.extend(range(lo, hi))
        self.assertEqual(covered, list(range(100)))

        # Slice + shard combination
        lo, hi = compute_frame_range(200, start_frame=20, end_frame=80, shard=(2, 2))
        self.assertEqual((lo, hi), (50, 80))

        # Deterministic FrameRenderCache hit/miss & FIFO eviction
        cache = FrameRenderCache(enabled=True, max_entries=2)
        k1 = cache.hash_signature({"t": 1.0, "pose": "a"})
        k2 = cache.hash_signature({"pose": "a", "t": 1.0})
        self.assertEqual(k1, k2)
        self.assertIsNone(cache.get(k1))
        cache.put(k1, b"PNG_DATA_1")
        self.assertEqual(cache.get(k1), b"PNG_DATA_1")
        cache.put("k2", b"PNG_DATA_2")
        cache.put("k3", b"PNG_DATA_3")  # Evicts k1
        self.assertIsNone(cache.get(k1))
        st = cache.stats()
        self.assertEqual(st["hits"], 1)
        self.assertEqual(st["misses"], 2)
        self.assertEqual(st["entries"], 2)

    def test_tutorial_project_loads_and_plans_multiformat_and_manifest(self) -> None:
        self.assertTrue((TUTORIAL_DIR / "video.yaml").is_file())
        self.assertTrue((TUTORIAL_DIR / "captions.srt").is_file())
        self.assertTrue((TUTORIAL_DIR / "narration.wav").is_file())
        self.assertTrue((TUTORIAL_DIR / "README.md").is_file())

        cues = load_srt_file(TUTORIAL_DIR / "captions.srt")
        self.assertGreaterEqual(len(cues), 3)

        proj = load_project(TUTORIAL_DIR)
        self.assertEqual(len(proj["slides"]), 3)
        self.assertEqual(proj["slides"][0]["puppet"]["scene"]["shot"], "wide")
        self.assertEqual(proj["slides"][0]["puppet"]["scene"]["background"], "studio-desk")
        self.assertEqual(proj["slides"][0]["puppet"]["scene"]["lighting"], "rim-light")
        self.assertEqual(len(proj["slides"][0].get("captions") or []), 3)
        self.assertTrue(proj["slides"][2].get("transparent"))
        self.assertTrue(proj["slides"][2]["puppet"]["debug"]["enabled"])

        # Multi-format dry-run with transparent WebM & manifest
        with tempfile.TemporaryDirectory() as td:
            out_dir = Path(td) / "out"
            manifest = Path(td) / "farm.manifest.json"
            res = render_project(
                TUTORIAL_DIR,
                formats=["16:9", "9:16", "1:1"],
                fps=60,
                out_dir=out_dir,
                dry_run=True,
                output_format="webm",
                transparent=True,
                shard="1/2",
                manifest_path=manifest,
            )
            self.assertEqual(len(res["jobs"]), 9)  # 3 slides x 3 formats
            self.assertTrue(all(j["transparent"] for j in res["jobs"]))
            self.assertTrue(all(j["output_name"].endswith(".webm") for j in res["jobs"]))
            self.assertTrue(manifest.is_file())
            m_data = json.loads(manifest.read_text(encoding="utf-8"))
            self.assertEqual(m_data["schema"], "khordegir-render-manifest")
            self.assertEqual(m_data["fps"], 60)
            self.assertEqual(m_data["shard"], "1/2")
            self.assertEqual(len(m_data["jobs"]), 9)

        # PNG-seq + slide filter plan
        png_jobs = plan_render_jobs(proj, formats=["16:9"], fps=60, output_format="png-seq", slide_filter=[3])
        self.assertEqual(len(png_jobs), 1)
        self.assertEqual(png_jobs[0]["output_format"], "png-seq")
        self.assertTrue(png_jobs[0]["output_name"].endswith("-frames"))
        self.assertTrue(png_jobs[0]["transparent"])

    def test_benchmark_suite_and_cli(self) -> None:
        res = run_benchmark(duration_sec=2.0, fps=60)
        self.assertEqual(res["fps"], 60)
        self.assertEqual(res["frames"], 120)
        self.assertEqual(res["prosodyFrames"], 120)
        self.assertGreater(res["lipsyncMs"], 0)
        self.assertLess(res["msPerFrameTotal"], 50.0)

        # CLI dry-run smoke test for new Phase 5-6 flags
        with tempfile.TemporaryDirectory() as td:
            rc = cli_main([
                "render", str(TUTORIAL_DIR),
                "--formats", "16:9,9:16",
                "--fps", "60",
                "--format-type", "webm",
                "--transparent",
                "--slide", "1,3",
                "--shard", "1/2",
                "--out", td,
                "--dry-run",
            ])
            self.assertEqual(rc, 0)


if __name__ == "__main__":
    unittest.main()
