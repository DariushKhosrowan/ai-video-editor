"""Automatic shot/scene detection via PySceneDetect.

Given a source video, returns a list of shot boundaries (in seconds). These
form the atomic building blocks for the non-destructive timeline: each shot
becomes a Clip that can be re-ordered, cross-cut, or auto-trimmed.

Modes:
  content — detect hard cuts by content hash (default, fast).
  threshold — detect by frame brightness deltas (catches dissolves/fades).

The detector writes to /tmp (never mutates the source). If the source has no
video stream, we return a single shot covering the whole file.
"""
from __future__ import annotations

import os
import subprocess
import tempfile
from typing import List, Dict

# The scenedetect CLI writes the per-shot list to stdout with lines like:
#   Shot 1.00 2.50 1.50
# (index, start, end, duration). We parse that instead of depending on the
# library's project API to keep us robust across versions.
_SHOT_LINE = None  # set lazily after import


def _scenedetect_available() -> bool:
    try:
        import scenedetect  # noqa: F401
        return True
    except Exception:
        return False


def detect_shots(
    video: str,
    threshold: float = 15.0,
    min_shot_len: float = 0.5,
    method: str = "content",
    fps: float = 30.0,
) -> List[Dict]:
    """Return [{start, end, duration}, ...] for every detected shot.

    If PySceneDetect is unavailable, fall back to a single shot covering the
    entire video so downstream stages always have *something* to work with.
    """
    if not _scenedetect_available():
        dur = _probe_duration(video)
        return [{"start": 0.0, "end": dur, "duration": dur}]

    import scenedetect
    from scenedetect import open_video, SceneManager, ContentDetector, ThresholdDetector

    out_dir = tempfile.mkdtemp(prefix="hermes-scenedetect-")
    stderr_log = os.path.join(out_dir, "detect.log")

    try:
        video_obj = open_video(video)
        sm = SceneManager()
        if method == "threshold":
            sm.add_detector(ThresholdDetector(threshold=threshold))
        else:
            sm.add_detector(ContentDetector(threshold=threshold))
        # A small downscale accelerates detection with negligible accuracy loss.
        sm.auto_downscale = True
        sm.detect_scenes(video_obj, show_progress=False)

        scenes = sm.get_scene_list()
        shots = []
        for start, end in scenes:
            d = (end - start).get_seconds()
            if d >= min_shot_len:
                shots.append({
                    "start": round(start.get_seconds(), 3),
                    "end": round(end.get_seconds(), 3),
                    "duration": round(d, 3),
                })
        if not shots:
            dur = _probe_duration(video)
            shots = [{"start": 0.0, "end": dur, "duration": dur}]
        return shots
    except Exception as e:  # never crash the editor over a detector limitation
        dur = _probe_duration(video)
        # Still surface the failure to the caller (e.g. the CLI) for logging.
        import warnings
        warnings.warn(f"scenedetect failed ({e}); using whole-file shot", RuntimeWarning)
        return [{"start": 0.0, "end": dur, "duration": dur}]


def _probe_duration(path: str) -> float:
    """Duration in seconds via ffprobe (0.0 on failure)."""
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", path],
            capture_output=True, text=True, timeout=30)
        return float(out.stdout.strip())
    except Exception:
        return 0.0


def shots_to_clips(shots: List[Dict], src: str) -> list:
    """Convert detected shots into non-destructive Clip objects (model.Clip)."""
    from .model import Clip
    return [Clip(src=src, in_=s["start"], out=s["end"], name=f"shot{i+1}")
            for i, s in enumerate(shots)]
