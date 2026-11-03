"""ai-video-editor CLI — drive the whole pipeline from the shell.

Subcommands:
  transcribe  <video> [model]
  timeline     <transcript.txt> <keyword>...
  badge        <url> <label> [-o out.png]
  walkthrough  <steps.json> [-o dir]
  motion       <shots.json> [-o out.mp4]
  compose      <base> <overlays.json> [-o out.mp4]
  intro       <edited.mp4> [-o out.mp4]
"""
import argparse
import json
import sys

from . import transcribe, timeline, overlay, walkthrough, motion, compose, intro


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
    else:
        p.print_help()


if __name__ == "__main__":
    main()
