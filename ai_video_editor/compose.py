"""Composition: bake overlays + PiP clip into the base video with ffmpeg.
Builds a 1080x1920 portrait canvas deterministically so overlay coordinates are
stable regardless of source rotation metadata."""
import json
import os
import subprocess


def compose(base, overlays, out, audio_loudness="I=-16:TP=-1.5:LRA=11",
            canvas="1080x1920", crf=20):
    """overlays: list of dicts:
       {type:"badge"|"pip", file, x, y, w, h, start, end}
    """
    W, H = map(int, canvas.split("x"))
    inputs = [base]
    for o in overlays:
        inputs.append(o["file"])

    # inputs: 0=base, 1..n=overlays
    fc = (f"[0:v]scale={W}:{H}:force_original_aspect_ratio=decrease,"
          f"pad={W}:{H}:(ow-iw)/2:(oh-ih)/2,setsar=1[base];")
    cur = "base"
    label = 1
    for o in overlays:
        if o["type"] == "badge":
            fc += (f"[{label}:v]format=yuva420p[b{label}];"
                   f"[{cur}][b{label}]overlay=x={o['x']}:y={o['y']}:"
                   f"enable='between(t,{o['start']},{o['end']})'[v{label}];")
        elif o["type"] == "pip":
            fc += (f"[{label}:v]scale={o['w']}:{o['h']},setsar=1,"
                   f"format=yuva420p[p{label}];"
                   f"[{cur}][p{label}]overlay=x={o['x']}:y={o['y']}:"
                   f"enable='between(t,{o['start']},{o['end']})'[v{label}];")
        cur = f"v{label}"
        label += 1
    fc += f"[{cur}]null[out]"
    ac = f"[0:a]loudnorm={audio_loudness}[aout]"

    cmd = ["ffmpeg", "-y", "-v", "warning"]
    for i in inputs:
        cmd += ["-i", i]
    cmd += ["-filter_complex", fc + ";" + ac,
            "-map", "[out]", "-map", "[aout]",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", str(crf),
            "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
            "-metadata:s:v", "rotate=0", "-movflags", "+faststart", out]
    subprocess.run(cmd, check=True)
    return out
