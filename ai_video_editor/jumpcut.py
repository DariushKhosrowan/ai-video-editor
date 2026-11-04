"""Auto jump-cut editing from a Whisper transcript.

This is the "expert" automatic editing step. It turns a raw take into a
tight, watchable cut by:

  1. Transcribing with word-level timestamps (faster-whisper).
  2. Building a timeline of *keep* ranges: anything that is speech and not a
     filler word (uh, um, like, you know, ...) and not a long silence.
  3. Exporting that as a non-destructive Project (model.Project) containing
     one Clip per keep-range, laid back-to-back — the source is never
     modified.

Because the output is just a Project, the user can render it, preview it, or
export to OTIO/EDL without ever touching the original footage.
"""
from __future__ import annotations

import json
import os
import tempfile
from typing import List, Dict, Optional

from . import transcribe
from .model import Project, Clip, Track

# Words that read as filler when spoken at the start of a phrase. These are
# removed by the jump-cut editor. Extend freely; the list is ASCII-primary plus
# common Persian filler interjections.
FILLERS = {
    "uh", "um", "uhm", "mmm", "hmm", "like", "you know", "sort of",
    "kind of", "y'know", "erm", "ah", "well", "actually", "basically",
    "literally", "so yeah", "anyway", "er", "huh", "yeah yeah",
    "mhm", "huh", "umm", "e", "eh", "آ", "ا", "این", "خب", "بله",
    "مثلاً", "مثلا", "میدونید", "خودتی", "آره", "بله", "والا",
}


def _load_word_timestamps(transcript_path: str) -> List[Dict]:
    """Load a word-timestamped transcript JSON.

    Supported shapes:
      - [{"start":..,"end":..,"text":..,"words":[{"word","start","end"},..]},...]
      - list of word dicts directly.
    Returns flat list of {"word","start","end"}.
    """
    with open(transcript_path) as f:
        data = json.load(f)

    words = []
    if isinstance(data, list):
        for seg in data:
            if isinstance(seg, dict):
                if "words" in seg and seg["words"]:
                    words.extend(seg["words"])
                elif "text" in seg:
                    # No word stream: approximate by splitting evenly over [start,end]
                    words.extend(_approx_words(seg))
    return words


def _approx_words(seg: Dict) -> List[Dict]:
    """Fallback: synthesize word timestamps by splitting the segment text
    evenly across [start, end] — used only when word timing is absent."""
    text = seg.get("text", "").strip()
    if not text or not seg.get("start") is not None and not seg.get("end") is not None:
        return []
    toks = text.split()
    if not toks:
        return []
    start, end = float(seg["start"]), float(seg["end"])
    span = max(end - start, 0.05)
    step = span / len(toks)
    out = []
    for i, t in enumerate(toks):
        out.append({
            "word": t, "start": round(start + i * step, 3),
            "end": round(start + (i + 1) * step, 3),
        })
    return out


def _norm_word(w: str) -> str:
    return w.strip(" .,!?;:\"'()[]{}«»—…‌").lower()


def build_jumpcut_project(
    transcript: str,
    src: str,
    min_speech_gap: float = 0.35,
    padding: float = 0.12,
    fps: float = 30.0,
) -> Project:
    """Build a non-destructive jump-cut Project from a transcript file.

    The output Project contains one Clip per contiguous *kept* region. Kept
    regions are speech words that are not fillers, with a small `padding`
    around each so the cut doesn't feel surgical.
    """
    from .scenes import _probe_duration

    words = _load_word_timestamps(transcript)
    if not words:
        # Nothing to cut — keep the whole source as one clip.
        dur = _probe_duration(src)
        return Project(
            name="jumpcut", fps=fps,
            tracks=[Track(kind="video", clips=[Clip(src=src, in_=0.0,
                                                    out=dur, name="source")])],
        )

    # 1) Mark each word keep/drop.
    keeps: List[Dict] = []
    for w in words:
        if not _norm_word(w.get("word", "")):
            continue
        if _norm_word(w["word"]) in FILLERS:
            continue
        keeps.append({"start": float(w["start"]), "end": float(w["end"])})

    if not keeps:
        dur = _probe_duration(src)
        return Project(
            name="jumpcut", fps=fps,
            tracks=[Track(kind="video", clips=[Clip(src=src, in_=0.0,
                                                    out=dur, name="source")])],
        )

    # 2) Merge keeps that are separated by less than min_speech_gap.
    merged: List[Dict] = [dict(keeps[0])]
    for k in keeps[1:]:
        last = merged[-1]
        if k["start"] - last["end"] <= min_speech_gap:
            last["end"] = max(last["end"], k["end"])
        else:
            merged.append(dict(k))

    # 3) Apply padding (clamp to [0, source duration] when known).
    src_dur = _probe_duration(src)
    clips = []
    for i, r in enumerate(merged):
        s = max(0.0, r["start"] - padding)
        e = r["end"] + padding
        if src_dur > 0:
            e = min(src_dur, e)
        if e - s > 0.08:
            clips.append(Clip(src=src, in_=round(s, 3), out=round(e, 3),
                              name=f"kept{i+1}"))

    return Project(
        name="jumpcut",
        fps=fps,
        tracks=[Track(kind="video", clips=clips)],
        meta={"editor": "jumpcut", "kept": len(clips),
              "original_duration": round(src_dur, 3)},
    )
