"""CLI entrypoint for Khordegir Studio (offline 127.0.0.1 & render-farm batch CLI)."""

from __future__ import annotations

import argparse
import json
import math
import struct
import sys
import tempfile
import time
import wave
from pathlib import Path
from typing import List, Optional

from .index import rebuild_index
from .mascot_lipsync import (
    analyze_audio,
    analyze_prosody,
    derive_prosody_path,
    write_calibration,
    write_prosody_track,
    write_viseme_track,
)
from .puppet_schema import normalize_puppet_config
from .render import SUPPORTED_OUTPUT_FORMATS, render_project
from .rig_importer import import_svg_rig_file


def run_benchmark(duration_sec: float = 4.0, fps: int = 60) -> dict:
    """Run a reproducible offline benchmark of lipsync, prosody, and puppet schema normalization."""
    sr = 16000
    n_samples = int(sr * max(1.0, float(duration_sec)))
    with tempfile.TemporaryDirectory() as td:
        wav_path = Path(td) / "bench.wav"
        with wave.open(str(wav_path), "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sr)
            frames = bytearray()
            for i in range(n_samples):
                t = i / sr
                env = 0.55 if (int(t * 2.5) % 2 == 0) else 0.02
                f0 = 155.0 + 45.0 * math.sin(2.0 * math.pi * 0.7 * t)
                s = env * (0.7 * math.sin(2.0 * math.pi * f0 * t) + 0.3 * math.sin(2.0 * math.pi * f0 * 2.0 * t))
                frames += struct.pack("<h", max(-32767, min(32767, int(s * 28000))))
            wf.writeframes(bytes(frames))

        t0 = time.perf_counter()
        v_track = analyze_audio(wav_path, text="سلام به همه! امروز درباره طراحی کاراکتر حرف می‌زنیم.", fps=fps)
        t_lip_ms = (time.perf_counter() - t0) * 1000.0

        t1 = time.perf_counter()
        p_track = analyze_prosody(wav_path, fps=fps)
        t_pro_ms = (time.perf_counter() - t1) * 1000.0

        t2 = time.perf_counter()
        for _ in range(100):
            normalize_puppet_config({"preset": "dramatic", "scene": {"shot": "close-up", "lighting": "rim-light"}})
        t_schema_ms = (time.perf_counter() - t2) * 1000.0

    n_frames = len(v_track.get("frames") or [])
    return {
        "durationSec": round(float(duration_sec), 2),
        "fps": int(fps),
        "frames": n_frames,
        "lipsyncMs": round(t_lip_ms, 2),
        "prosodyMs": round(t_pro_ms, 2),
        "schema100xMs": round(t_schema_ms, 2),
        "msPerFrameTotal": round((t_lip_ms + t_pro_ms) / max(1, n_frames), 4),
        "prosodyFrames": len(p_track.get("frames") or []),
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="khordegir", description="Khordegir Studio offline motion graphics CLI")
    sub = parser.add_subparsers(dest="command", required=True)

    p_lip = sub.add_parser("lipsync", help="Analyze narration WAV/MP3 into deterministic viseme & prosody JSON tracks")
    p_lip.add_argument("audio", help="Input audio file (.wav, .mp3, .m4a, .ogg)")
    p_lip.add_argument("-o", "--out", help="Output viseme JSON path (default: <audio>.visemes.json)")
    p_lip.add_argument("--prosody-out", help="Optional prosody JSON path (default: sibling *.prosody.json)")
    p_lip.add_argument("-t", "--transcript", help="Optional transcript/phoneme timing JSON file")
    p_lip.add_argument("--text", help="Optional Persian/English narration text for offline Viterbi phoneme alignment")
    p_lip.add_argument("--calibration", help="Optional speaker calibration JSON file")
    p_lip.add_argument("--no-coarticulation", action="store_true", help="Disable coarticulation smoothing pass")
    p_lip.add_argument("--fps", type=int, default=30, help="Target frame rate (default: 30)")
    p_lip.add_argument("--min-hold", type=int, default=2, help="Minimum hold frames per viseme (default: 2)")

    p_pro = sub.add_parser("prosody", help="Analyze narration WAV/MP3 into deterministic prosody JSON (RMS, dB, F0, peaks)")
    p_pro.add_argument("audio", help="Input audio file (.wav, .mp3, .m4a, .ogg)")
    p_pro.add_argument("-o", "--out", help="Output prosody JSON path (default: <audio>.prosody.json)")
    p_pro.add_argument("--calibration", help="Optional speaker calibration JSON file")
    p_pro.add_argument("--fps", type=int, default=30, help="Target frame rate (default: 30)")

    p_cal = sub.add_parser("calibrate", help="Calibrate speaker vocal profile (median F0, loudness range, noise gate) from WAV/MP3")
    p_cal.add_argument("audio", help="Input ~10s calibration audio file (.wav, .mp3)")
    p_cal.add_argument("-o", "--out", help="Output calibration JSON path (default: <audio>.calibration.json)")
    p_cal.add_argument("--fps", type=int, default=30, help="Analysis frame rate (default: 30)")

    p_imp = sub.add_parser("import-rig", help="Import an SVG file and map named <g> layers to 18 puppet parts with auto-pivots")
    p_imp.add_argument("svg", help="Input SVG file path")
    p_imp.add_argument("-o", "--out", help="Optional output JSON path")
    p_imp.add_argument("--character", default="red_eagle", help="Base character ID (default: red_eagle)")

    p_idx = sub.add_parser("index", help="Regenerate templates/_index.js and themes/_list.js")
    p_idx.add_argument("--json", action="store_true", help="Print JSON summary")

    p_bench = sub.add_parser("benchmark", help="Run deterministic offline performance benchmark (60 fps lipsync + prosody + schema)")
    p_bench.add_argument("--duration", type=float, default=4.0, help="Synthetic audio length in seconds (default: 4.0)")
    p_bench.add_argument("--fps", type=int, default=60, help="Target FPS (default: 60)")

    for cmd_name in ("build", "render"):
        p_r = sub.add_parser(cmd_name, help="Build/render a video.yaml project across 16:9, 9:16, and/or 1:1 (render-farm ready)")
        p_r.add_argument("project", help="Path to project directory containing video.yaml")
        p_r.add_argument("-f", "--formats", default="", help="Comma-separated formats (e.g. 16:9,9:16,1:1)")
        p_r.add_argument("--fps", type=int, default=30, help="Frame rate: 30 or 60 (default: 30)")
        p_r.add_argument("-o", "--out", help="Output directory (default: <project>/out)")
        p_r.add_argument("--format-type", choices=SUPPORTED_OUTPUT_FORMATS, default="mp4", help="Output container/sequence: mp4, webm, prores, png-seq")
        p_r.add_argument("--transparent", action="store_true", help="Render with transparent alpha channel (for WebM VP9 / ProRes 4444 / PNG sequence)")
        p_r.add_argument("--srt", help="Optional SRT subtitle file to overlay or burn into rendered video")
        p_r.add_argument("--captions-mode", choices=("stage", "ffmpeg"), default="stage", help="Caption rendering mode: stage (RTL HTML overlay) or ffmpeg (subtitles filter)")
        p_r.add_argument("--slide", default="", help="Comma-separated 1-based slide indices to render (e.g. 1,3)")
        p_r.add_argument("--start-frame", type=int, default=None, help="Inclusive start frame index for render-farm slicing")
        p_r.add_argument("--end-frame", type=int, default=None, help="Exclusive end frame index for render-farm slicing")
        p_r.add_argument("--shard", default=None, help="Render-farm worker shard K/N (1-based, e.g. 1/4)")
        p_r.add_argument("--no-frame-cache", action="store_true", help="Disable static-frame render cache")
        p_r.add_argument("--manifest", help="Optional path to write deterministic JSON render-farm manifest")
        p_r.add_argument("--dry-run", action="store_true", help="Plan outputs and OBS bundle without launching Chromium")

    return parser


def _load_optional_json(path_str: Optional[str]) -> Optional[dict]:
    if not path_str:
        return None
    p = Path(path_str)
    if not p.is_file():
        return None
    data = json.loads(p.read_text(encoding="utf-8"))
    return data if isinstance(data, dict) else None


def main(argv: Optional[List[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == "lipsync":
        audio_p = Path(args.audio)
        out_p = Path(args.out) if args.out else audio_p.with_suffix(".visemes.json")
        pro_p = Path(args.prosody_out) if args.prosody_out else derive_prosody_path(out_p)
        cal = _load_optional_json(args.calibration)
        track = write_viseme_track(
            audio_p,
            out_p,
            transcript_path=args.transcript,
            text=args.text,
            fps=args.fps,
            min_hold_frames=args.min_hold,
            write_prosody=True,
            prosody_output_path=pro_p,
            coarticulation=not args.no_coarticulation,
            calibration=cal,
        )
        print(f"Wrote {len(track['frames'])} viseme frames ({track['duration']}s @ {track['fps']}fps, {track['source']}) -> {out_p} + {pro_p}")
        return 0

    if args.command == "prosody":
        audio_p = Path(args.audio)
        out_p = Path(args.out) if args.out else audio_p.with_suffix(".prosody.json")
        cal = _load_optional_json(args.calibration)
        pro = write_prosody_track(audio_p, out_p, fps=args.fps, calibration=cal)
        print(f"Wrote {len(pro['frames'])} prosody frames (median F0={pro['median_f0_hz']}Hz) -> {out_p}")
        return 0

    if args.command == "calibrate":
        audio_p = Path(args.audio)
        out_p = Path(args.out) if args.out else audio_p.with_suffix(".calibration.json")
        cal = write_calibration(audio_p, out_p, fps=args.fps)
        print(json.dumps(cal, ensure_ascii=False, indent=2))
        return 0

    if args.command == "import-rig":
        res = import_svg_rig_file(args.svg, output_path=args.out, character=args.character)
        print(json.dumps({
            "sourceFile": res.get("sourceFile"),
            "matchedCount": res["matchedCount"],
            "totalCanonicalParts": res["totalCanonicalParts"],
            "layers": res["layers"],
            "missingParts": res["missingParts"],
            "unmatchedLayers": res["unmatchedLayers"],
        }, ensure_ascii=False, indent=2))
        return 0

    if args.command == "index":
        res = rebuild_index()
        if args.json:
            print(json.dumps(res, ensure_ascii=False, indent=2))
        else:
            print(f"Indexed {len(res['templates'])} templates and {len(res['themes'])} themes.")
        return 0

    if args.command == "benchmark":
        res = run_benchmark(duration_sec=args.duration, fps=args.fps)
        print(json.dumps(res, ensure_ascii=False, indent=2))
        return 0

    if args.command in ("build", "render"):
        fmts = [x.strip() for x in args.formats.split(",") if x.strip()] if args.formats else None
        slide_filter = [int(x.strip()) for x in args.slide.split(",") if x.strip()] if args.slide else None
        res = render_project(
            args.project,
            formats=fmts,
            fps=args.fps,
            out_dir=args.out,
            dry_run=args.dry_run,
            output_format=args.format_type,
            transparent=args.transparent,
            srt_path=args.srt,
            captions_mode=args.captions_mode,
            slide_filter=slide_filter,
            start_frame=args.start_frame,
            end_frame=args.end_frame,
            shard=args.shard,
            frame_cache=not args.no_frame_cache,
            manifest_path=args.manifest,
        )
        print(json.dumps({
            "project": res["project"],
            "jobs": len(res["jobs"]),
            "output_format": args.format_type,
            "transparent": args.transparent,
            "shard": args.shard,
            "rendered": res["rendered"],
            "obs": res["obs"],
        }, ensure_ascii=False, indent=2))
        return 0

    return 1


if __name__ == "__main__":
    sys.exit(main())
