"""Transcript → timeline: find segments matching keywords, return time windows."""
import re
from .transcribe import transcribe


def parse_transcript(text: str):
    segs = []
    for line in text.splitlines():
        m = re.match(r"\[([\d.]+)-([\d.]+)\] (.*)", line.strip())
        if m:
            segs.append({"start": float(m.group(1)), "end": float(m.group(2)),
                         "text": m.group(3).strip()})
    return segs


def find_segments(segs, keywords, context=0.0):
    """Return list of {start,end,text} segments whose text contains any keyword
    (fuzzy: case-insensitive substring), expanded by `context` seconds."""
    hits = []
    for s in segs:
        if any(k.lower() in s["text"].lower() for k in keywords):
            hits.append({"start": max(0, s["start"]-context),
                         "end": s["end"]+context, "text": s["text"]})
    return hits


def merge_windows(windows, gap=1.0):
    """Merge overlapping/adjacent time windows into contiguous ranges."""
    if not windows:
        return []
    ws = sorted(windows, key=lambda w: w["start"])
    merged = [dict(ws[0])]
    for w in ws[1:]:
        last = merged[-1]
        if w["start"] <= last["end"] + gap:
            last["end"] = max(last["end"], w["end"])
        else:
            merged.append(dict(w))
    return merged
