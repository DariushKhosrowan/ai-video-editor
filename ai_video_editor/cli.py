"""ai-video-editor CLI — drive the whole pipeline from the shell.

Subcommands:
  transcribe  <video> [model]
  timeline     <transcript.txt> <keyword>...
  badge        <url> <label> [-o out.png]
  walkthrough  <steps.json> [-o dir]
  motion       <shots.json> [-o out.mp4]
  compose      <base> <overlays.json> [-o out.mp4]
  intro       <edited.mp4> [-o out.mp4]

Advanced / agent-ready commands:
  shots        <video> [-o shots.json]
  jumpcut      <transcript.json> <source> [-o project.json]
  subtitles    <transcript.json> [--base out]
  burn         <video> <transcript.json> [-o out.mp4] [--no-karaoke]
  export       <project.json> -o dir
  render       <project.json> [-o out.mp4] [--cpu]
  mcp         (stdio MCP server — use from an agent client)
  info         <project.json>
"""
import argparse
import json
import sys

from . import (transcribe, timeline, overlay, walkthrough, motion, compose,
               intro, scenes, jumpcut, captions, export_timeline, render)
from .model import Project


def _load_project(path):
    return Project.from_json(open(path).read())


def main():
    p = argparse.ArgumentParser(prog="ai-video-editor")
    sub = p.add_subparsers(dest="cmd", required=True)

    sp = sub.add_parser("transcribe")
    sp.add_argument("video"); sp.add_argument("model", nargs="?", default="small")

    sp = sub.add_parser("timeline")
    sp.add_argument("transcript"); sp.add_argument("keywords", nargs="+")

    sp = sub.add_parser("badge")
    sp.add_argument("url"); sp.add_argument("label")
    sp.add_argument("-o", default="overlay_url.png")

    sp = sub.add_parser("walkthrough")
    sp.add_argument("steps"); sp.add_argument("-o", default="wt")

    sp = sub.add_parser("motion")
    sp.add_argument("shots"); sp.add_argument("-o", default="walkthrough.mp4")

    sp = sub.add_parser("compose")
    sp.add_argument("base"); sp.add_argument("overlays")
    sp.add_argument("-o", default="edited.mp4")

    sp = sub.add_parser("intro")
    sp.add_argument("edited"); sp.add_argument("-o", default="with_intro.mp4")
    sp.add_argument("--title", default="با درود دوستان")
    sp.add_argument("--subtitle", default="به کانال من خوش آمدید")

    sp = sub.add_parser("lowerthird")
    sp.add_argument("--title", default="با درود دوستان")
    sp.add_argument("--subtitle", default="به کانال من خوش آمدید")
    sp.add_argument("-o", dest="frames", default="/tmp/lowerthird_frames")

    # --- advanced subcommands ---------------------------------------------
    sp = sub.add_parser("shots")
    sp.add_argument("video")
    sp.add_argument("--threshold", type=float, default=15.0)
    sp.add_argument("--min-shot-len", type=float, default=0.5)
    sp.add_argument("-o", default="shots.json")

    sp = sub.add_parser("jumpcut")
    sp.add_argument("transcript")
    sp.add_argument("source")
    sp.add_argument("--gap", type=float, default=0.35)
    sp.add_argument("--padding", type=float, default=0.12)
    sp.add_argument("-o", default="jumpcut_project.json")

    sp = sub.add_parser("subtitles")
    sp.add_argument("transcript")
    sp.add_argument("--base", default="captions")

    sp = sub.add_parser("burn")
    sp.add_argument("video")
    sp.add_argument("transcript")
    sp.add_argument("-o", default="captioned.mp4")
    sp.add_argument("--no-karaoke", action="store_true")
    sp.add_argument("--no-sidecars", action="store_true")

    sp = sub.add_parser("export")
    sp.add_argument("project")
    sp.add_argument("-o", dest="out_dir", default="export")

    sp = sub.add_parser("render")
    sp.add_argument("project")
    sp.add_argument("-o", default="edit.mp4")
    sp.add_argument("--cpu", action="store_true", help="force CPU libx264")

    sp = sub.add_parser("info")
    sp.add_argument("project")

    sp = sub.add_parser("mcp")
    sp.add_argument("--stdio", action="store_true")

    a = p.parse_args()

    if a.cmd == "transcribe":
        lang, segs = transcribe.transcribe(a.video, model=a.model)
        print(f"# language={lang}")
        for s in segs:
            print(f"[{s['start']:.1f}-{s['end']:.1f}] {s['text']}")
    elif a.cmd == "timeline":
        segs = timeline.parse_transcript(open(a.transcript).read())
        hits = timeline.find_segments(segs, a.keywords)
        for w in timeline.merge_windows(hits):
            print(f"{w['start']:.1f} {w['end']:.1f} {w['text']}")
    elif a.cmd == "badge":
        overlay.make_url_badge(a.url, a.label, out_path=a.o)
        print("wrote", a.o)
    elif a.cmd == "walkthrough":
        steps = json.load(open(a.steps))
        d = walkthrough.capture_walkthrough(steps, out_dir=a.o)
        print("captured to", d)
    elif a.cmd == "motion":
        shots = json.load(open(a.shots))
        motion.motion_from_shots(shots, out=a.o)
        print("wrote", a.o)
    elif a.cmd == "compose":
        ovs = json.load(open(a.overlays))
        compose.compose(a.base, ovs, out=a.o)
        print("wrote", a.o)
    elif a.cmd == "intro":
        import os as _os
        frames = "/tmp/lowerthird_frames"
        sound = "/tmp/intro_sound.wav"
        if not _os.path.exists(frames):
            intro.make_lowerthird_animation(title=a.title, subtitle=a.subtitle,
                                            frames_dir=frames)
            intro.make_sound(out=sound)
            print("wrote", frames)
        intro.prepend(a.edited, frames_dir=frames, sound=sound, out=a.o)
        print("wrote", a.o)
    elif a.cmd == "lowerthird":
        frames = a.frames or "/tmp/lowerthird_frames"
        intro.make_lowerthird_animation(title=a.title, subtitle=a.subtitle,
                                        frames_dir=frames)
        print("wrote", frames)
    # ------------------------------------------------------------------ advanced
    elif a.cmd == "shots":
        detected = scenes.detect_shots(a.video, threshold=a.threshold,
                                       min_shot_len=a.min_shot_len)
        with open(a.o, "w") as f:
            json.dump(detected, f, indent=2, ensure_ascii=False)
        print(f"wrote {a.o} ({len(detected)} shots)")
    elif a.cmd == "jumpcut":
        proj = jumpcut.build_jumpcut_project(a.transcript, a.source,
                                             min_speech_gap=a.gap,
                                             padding=a.padding)
        with open(a.o, "w") as f:
            f.write(proj.to_json())
        print(f"wrote {a.o} (kept {len(proj.tracks[0].clips)} clips, "
              f"duration {proj.duration():.2f}s)")
    elif a.cmd == "subtitles":
        lines = captions.load_word_stream(a.transcript)
        srt = captions.export_srt(lines, a.base + ".srt")
        vtt = captions.export_vtt(lines, a.base + ".vtt")
        print("wrote", srt)
        print("wrote", vtt)
    elif a.cmd == "burn":
        res = captions.burn_captions(
            a.video, a.transcript, a.o,
            karaoke=not a.no_karaoke,
            generate_srt=not a.no_sidecars)
        print("wrote", res["video"])
        if res["srt"]:
            print("wrote", res["srt"], "+ .vtt")
    elif a.cmd == "export":
        proj = _load_project(a.project)
        paths = export_timeline.export_all(proj, a.out_dir)
        for k, v in paths.items():
            print(f"{k}: {v}")
    elif a.cmd == "render":
        proj = _load_project(a.project)
        out = render.render_project(proj, out=a.o, hardware=not a.cpu)
        print("wrote", out)
    elif a.cmd == "info":
        proj = _load_project(a.project)
        print(f"name={proj.name} size={proj.width}x{proj.height} "
              f"fps={proj.fps} duration={proj.duration():.2f}s "
              f"tracks={len(proj.tracks)}")
    elif a.cmd == "mcp":
        from .mcp_server import main as mcp_main
        mcp_main()
    else:
        p.print_help()


if __name__ == "__main__":
    main()
