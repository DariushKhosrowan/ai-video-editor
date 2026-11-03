"""Motion-video assembly from screenshots (Ken Burns zoompan + crossfades)."""
import json
import os
import subprocess


def _zoompan_filter(dur: float, zoom: float, center: str, fps: int,
                    W: int, H: int) -> str:
    n = int(dur * fps)
    z_out = 1.15 if zoom < 1.0 else 0.85
    x, y = center.split(",")
    return (f"zoompan=z='{zoom}+({z_out}-{zoom})*on/{n}':"
            f"x='{x}*(1-{zoom})':y='{y}*(1-{zoom})':d={n}:s={W}x{H}:fps={fps}")


def motion_from_shots(shots, out="walkthrough.mp4", W=1280, H=720, fps=30,
                      transition=0.6):
    """shots: list of {file, dur, zoom, center}."""
    segs, offsets = [], []
    acc = 0.0
    for i, s in enumerate(shots):
        seg = f"/tmp/seg{i}.mp4"
        zf = _zoompan_filter(s["dur"], s.get("zoom", 0.9),
                             s.get("center", "0.5,0.5"), fps, W, H)
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-loop", "1",
                        "-i", s["file"], "-vf", zf, "-t", str(s["dur"]),
                        "-c:v", "libx264", "-preset", "veryfast", "-crf", "22",
                        "-pix_fmt", "yuv420p", "-r", str(fps), seg],
                       check=True)
        segs.append(seg)
        if i < len(shots) - 1:
            acc += s["dur"] - transition
            offsets.append(acc)

    cur = "0:v"
    fc_parts = []
    for i in range(1, len(segs)):
        outl = f"xf{i}"
        fc_parts.append(f"[{cur}][{i}:v]xfade=transition=fade:duration="
                        f"{transition}:offset={offsets[i-1]:.2f}[{outl}]")
        cur = outl
    fc = ";".join(fc_parts)
    cmd = ["ffmpeg", "-y", "-v", "error"]
    for s in segs:
        cmd += ["-i", s]
    cmd += ["-filter_complex", fc, "-map", f"[{cur}]",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "22",
            "-pix_fmt", "yuv420p", out]
    subprocess.run(cmd, check=True)
    return out
