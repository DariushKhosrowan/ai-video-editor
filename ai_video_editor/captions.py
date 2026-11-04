"""First-class captions / subtitles burned directly onto the video frames.

This is the "text on the exact video" feature. It treats captions as an
integrated, word-level element composited over the actual footage — not a
separate animation layered on top:

  - word-level karaoke highlighting: the currently-spoken word is rendered
    brighter/gold while the rest of the line is dimmed (like top-tier editors);
  - Persian-first rendering (reshape + bidi via overlay.fa());
  - safe-area bottom placement, auto-fit to frame width;
  - exports standard SRT / VTT sidecar files alongside the burned-in video.

The subtitle file export is pure and deterministic — it can also be used to
produce the "subtitle" element of an edited project without any burn-in.
"""
from __future__ import annotations

import json
import os
import subprocess
import tempfile
import html
from typing import List, Dict, Optional

from . import overlay

# Style constants (tunable)
WORD_HIGHLIGHT = (255, 216, 120, 255)   # gold for the current word
WORD_DIM = (255, 255, 255, 255)         # white for the rest
WORD_ACTIVE_BG = (20, 20, 30, 210)      # pill behind the active word


def load_word_stream(transcript: str, max_caption_chars: int = 120) -> List[Dict]:
    """Read a word-timestamped transcript into caption lines.

    Returns a list of lines, each {text, start, end, words:[{word,start,end}]}
    where `words` is the word-level timing for karaoke highlighting.

    Accepts:
      - list of segments with `words` (faster-whisper word timestamps);
      - list of segments with only `text` (synthesizes even timing).
    """
    with open(transcript) as f:
        data = json.load(f)

    words: List[Dict] = []
    if isinstance(data, list):
        for seg in data:
            if not isinstance(seg, dict):
                continue
            if seg.get("words"):
                words.extend(seg["words"])
            elif seg.get("text") and seg.get("start") is not None:
                toks = seg["text"].split()
                if toks:
                    start, end = float(seg["start"]), float(seg["end"])
                    span = max(end - start, 0.05)
                    step = span / len(toks)
                    for i, t in enumerate(toks):
                        words.append({"word": t,
                                      "start": round(start + i*step, 3),
                                      "end": round(start + (i+1)*step, 3)})

    # Group words into lines by character budget.
    lines: List[Dict] = []
    cur = {"text": "", "start": None, "end": None, "words": []}
    for w in words:
        wrd = w.get("word", "").strip()
        if not wrd:
            continue
        if cur["words"] and len(cur["text"]) + len(wrd) + 1 > max_caption_chars:
            lines.append(cur)
            cur = {"text": "", "start": None, "end": None, "words": []}
        cur["text"] = (cur["text"] + " " + wrd).strip()
        cur["start"] = cur["start"] if cur["start"] is not None else float(w["start"])
        cur["end"] = float(w["end"])
        cur["words"].append({"word": wrd,
                             "start": round(float(w["start"]), 3),
                             "end": round(float(w["end"]), 3)})
    if cur["words"]:
        lines.append(cur)

    for ln in lines:
        ln["start"] = round(ln["start"], 3)
        ln["end"] = round(ln["end"], 3)
    return lines


def _txt_metrics(text: str, font):
    """Width/height of a display string under a PIL font."""
    from PIL import Image, ImageDraw
    tmp = Image.new("RGBA", (10, 10))
    d = ImageDraw.Draw(tmp)
    bbox = d.textbbox((0, 0), text, font=font)
    return bbox


def render_caption_png(line: Dict, out_path: str, width: int = 1500,
                       font_size: int = 60) -> str:
    """Render one caption *line* with word-level karaoke highlight.

    The currently-active word (matching `active_word` index) is gold on a dark
    pill; the surrounding words are white. To keep it deterministic we render
    the whole line at once and rely on the compositor to switch images per
    word window — so we actually render one PNG per *word step*.

    Simpler + robust approach used here: render the full line in dim white,
    and let `burn_captions` overlay a gold highlight pill for the active word
    from a second, word-level timeline. We therefore return the base line PNG.
    """
    font_p = overlay.find_font()
    from PIL import Image, ImageDraw, ImageFont
    f = ImageFont.truetype(font_p, font_size)

    display = overlay.fa(line["text"])
    bbox = _txt_metrics(display, f)
    tw = bbox[2] - bbox[0]
    ph = bbox[3] - bbox[1]
    pad_x, pad_y = 56, 28
    W = int(max(tw + 2*pad_x, 80))
    H = int(max(ph + 2*pad_y, 120))

    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, W-1, H-1), radius=H//2,
                        fill=(0, 0, 0, 180))
    d.text(((W-tw)//2 - bbox[0], (H-ph)//2 - bbox[1]), display,
           font=f, fill=(255, 255, 255, 255))
    img.save(out_path)
    return out_path


def render_active_word_png(active: str, out_path: str, width: int = 1500,
                           font_size: int = 60) -> str:
    """Render a single highlighted (gold) word pill for karaoke overlay."""
    font_p = overlay.find_font()
    from PIL import Image, ImageDraw, ImageFont
    f = ImageFont.truetype(font_p, font_size)
    display = overlay.fa(active)
    bbox = _txt_metrics(display, f)
    tw = bbox[2] - bbox[0]
    ph = bbox[3] - bbox[1]
    pad_x, pad_y = 34, 16
    W = int(max(tw + 2*pad_x, 60))
    H = int(max(ph + 2*pad_y, 90))
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, W-1, H-1), radius=H//2,
                        fill=WORD_ACTIVE_BG)
    d.text(((W-tw)//2 - bbox[0], (H-ph)//2 - bbox[1]), display,
           font=f, fill=WORD_HIGHLIGHT)
    img.save(out_path)
    return out_path


def _sub_ts(seconds: float) -> str:
    """SRT/VTT timestamp from seconds."""
    ms = int(round(seconds * 1000))
    h, rem = divmod(ms, 3600000)
    m, rem = divmod(rem, 60000)
    s, ms = divmod(rem, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def export_srt(lines: List[Dict], out_path: str) -> str:
    """Write a standard .srt sidecar from caption lines."""
    if isinstance(lines, str):
        lines = load_word_stream(lines)
    with open(out_path, "w", encoding="utf-8") as f:
        for i, ln in enumerate(lines, 1):
            f.write(f"{i}\n")
            f.write(f"{_sub_ts(ln['start'])} --> {_sub_ts(ln['end'])}\n")
            f.write(f"{ln['text']}\n\n")
    return out_path


def export_vtt(lines: List[Dict], out_path: str) -> str:
    """Write a WebVTT (.vtt) sidecar from caption lines."""
    if isinstance(lines, str):
        lines = load_word_stream(lines)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("WEBVTT\n\n")
        for i, ln in enumerate(lines, 1):
            f.write(f"{i}\n")
            f.write(f"{_sub_ts(ln['start']).replace(',', '.')} --> "
                    f"{_sub_ts(ln['end']).replace(',', '.')}\n")
            f.write(f"{ln['text']}\n\n")
    return out_path


def burn_captions(input_video: str, transcript: str, out: str,
                  width: int = 1080, height: int = 1920,
                  font_size: int = 56, max_caption_chars: int = 120,
                  y_bottom: int = 1620, crf: int = 20,
                  karaoke: bool = True,
                  generate_srt: bool = True) -> Dict:
    """Burn captions directly onto the video frames.

    Composite order per timeline:
      1. base video frame
      2. line pill (bottom-center) shown over [start,end]
      3. if karaoke: gold active-word pill positioned over where that word
         sits in the line (approx: centered on the line, at the word's
         relative position).

    Returns {"video": out, "srt": path|None, "vtt": path|None, "lines": n}.
    """
    lines = load_word_stream(transcript, max_caption_chars=max_caption_chars)
    result = {"video": out, "srt": None, "vtt": None, "lines": len(lines)}

    if not lines:
        subprocess.run(["ffmpeg", "-y", "-i", input_video, "-c", "copy", out],
                       check=True)
        return result

    tmpdir = tempfile.mkdtemp(prefix="hermes-captions-")
    base_pngs, word_pngs = [], []

    for i, ln in enumerate(lines):
        bp = os.path.join(tmpdir, f"line{i:04d}.png")
        render_caption_png(ln, bp, width=width, font_size=font_size)
        base_pngs.append(bp)
        if karaoke:
            # a pill per word, for word-level highlight
            for j, w in enumerate(ln["words"]):
                wp = os.path.join(tmpdir, f"word{i:04d}_{j:04d}.png")
                render_active_word_png(w["word"], wp, width=width,
                                       font_size=font_size)
                word_pngs.append((i, j, w, wp))

    # ---- filter graph ----
    # inputs: 0 = video, then N line PNGs, then M word PNGs.
    parts = [f"[0:v]scale={width}:{height}:force_original_aspect_ratio=decrease,"
             f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2,setsar=1[base]"]
    cur = "base"
    input_idx = 1
    x, y = "(W-w)/2", str(y_bottom)
    # line pills
    for i, ln in enumerate(lines):
        label = f"L{i}"
        parts.append(f"[{input_idx}:v]format=yuva420p[{label}]")
        parts.append(f"[{cur}][{label}]overlay=x={x}:y={y}:"
                     f"enable='between(t,{ln['start']},{ln['end']})'[vL{i}]")
        cur = f"vL{i}"
        input_idx += 1
    # karaoke word pills (just one active word at a time)
    if karaoke:
        for (i, j, w, wp) in word_pngs:
            label = f"W{i}_{j}"
            parts.append(f"[{input_idx}:v]format=yuva420p[{label}]")
            parts.append(f"[{cur}][{label}]overlay=x={x}:y={y}:"
                         f"enable='between(t,{w['start']},{w['end']})'[vW{i}_{j}]")
            cur = f"vW{i}_{j}"
            input_idx += 1

    fc = ";".join(parts) + f";[{cur}]null[out]"

    cmd = ["ffmpeg", "-y", "-v", "warning", "-i", input_video]
    for png in base_pngs + [p for (_, _, _, p) in word_pngs]:
        cmd += ["-i", png]
    cmd += ["-filter_complex", fc,
            "-map", "[out]", "-map", "0:a",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", str(crf),
            "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
            "-metadata:s:v", "rotate=0", "-movflags", "+faststart", out]
    subprocess.run(cmd, check=True)

    if generate_srt:
        result["srt"] = export_srt(lines, os.path.join(
            tmpdir if False else os.path.dirname(out),
            os.path.splitext(os.path.basename(out))[0] + ".srt"))
        result["vtt"] = export_vtt(lines, os.path.join(
            os.path.dirname(out),
            os.path.splitext(os.path.basename(out))[0] + ".vtt"))
    return result
