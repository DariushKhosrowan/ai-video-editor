"""Deterministic offline SRT caption parser, formatter & ffmpeg burn-in helper.

Supports Persian (RTL) and English (LTR) subtitle tracks without any external dependencies.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

SRT_TIME_RE = re.compile(
    r"^\s*(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})"
)
RTL_CHAR_RE = re.compile(r"[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]")


def _ts_to_sec(h: str, m: str, s: str, ms: str) -> float:
    ms_padded = ms.ljust(3, "0")[:3]
    return round(int(h) * 3600 + int(m) * 60 + int(s) + int(ms_padded) / 1000.0, 3)


def _sec_to_ts(sec: float) -> str:
    total_ms = max(0, int(round(float(sec) * 1000.0)))
    ms = total_ms % 1000
    total_s = total_ms // 1000
    s = total_s % 60
    total_m = total_s // 60
    m = total_m % 60
    h = total_m // 60
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def detect_text_dir(text: str) -> str:
    """Return 'rtl' if text contains Persian/Arabic characters, else 'ltr'."""
    return "rtl" if RTL_CHAR_RE.search(str(text or "")) else "ltr"


def parse_srt(raw_srt: str) -> List[Dict[str, Any]]:
    """Parse an SRT string into deterministic cue dicts: [{index, start, end, text, dir}]."""
    text = str(raw_srt or "").lstrip("\ufeff").replace("\r\n", "\n").replace("\r", "\n")
    blocks = re.split(r"\n{2,}", text.strip())
    cues: List[Dict[str, Any]] = []

    for block in blocks:
        lines = [ln.strip() for ln in block.split("\n") if ln.strip() != ""]
        if not lines:
            continue
        time_line_idx = -1
        match = None
        for i, ln in enumerate(lines[:2]):
            m = SRT_TIME_RE.match(ln)
            if m:
                time_line_idx = i
                match = m
                break
        if match is None:
            continue
        start = _ts_to_sec(match.group(1), match.group(2), match.group(3), match.group(4))
        end = _ts_to_sec(match.group(5), match.group(6), match.group(7), match.group(8))
        if end < start:
            start, end = end, start
        cue_text = "\n".join(lines[time_line_idx + 1 :]).strip()
        if not cue_text:
            continue
        cues.append({
            "index": len(cues) + 1,
            "start": start,
            "end": end,
            "text": cue_text,
            "dir": detect_text_dir(cue_text),
        })

    cues.sort(key=lambda c: (c["start"], c["end"], c["index"]))
    for idx, cue in enumerate(cues, start=1):
        cue["index"] = idx
    return cues


def load_srt_file(path: str | Path) -> List[Dict[str, Any]]:
    """Load and parse an SRT file from disk."""
    p = Path(path)
    return parse_srt(p.read_text(encoding="utf-8-sig"))


def format_srt(cues: Sequence[Dict[str, Any]]) -> str:
    """Serialize cue dicts back into canonical SRT text."""
    chunks: List[str] = []
    for idx, cue in enumerate(cues, start=1):
        start = float(cue.get("start", 0.0) or 0.0)
        end = max(start + 0.05, float(cue.get("end", start + 1.0) or (start + 1.0)))
        txt = str(cue.get("text") or "").strip()
        if not txt:
            continue
        chunks.append(f"{idx}\n{_sec_to_ts(start)} --> {_sec_to_ts(end)}\n{txt}")
    return "\n\n".join(chunks) + ("\n" if chunks else "")


def active_caption_at(cues: Sequence[Dict[str, Any]], t_sec: float) -> Optional[Dict[str, Any]]:
    """Return the active caption cue at time `t_sec`, or None if silent."""
    t = max(0.0, float(t_sec or 0.0))
    for cue in cues:
        if float(cue.get("start", 0.0)) <= t < float(cue.get("end", 0.0)):
            return dict(cue)
    return None


def escape_ffmpeg_filter_path(path: str | Path) -> str:
    """Escape a filesystem path for ffmpeg's subtitles/ass filter argument."""
    s = str(Path(path).resolve()).replace("\\", "/")
    s = s.replace(":", "\\:").replace("'", "\\'").replace(",", "\\,").replace("[", "\\[").replace("]", "\\]")
    return s


def build_ffmpeg_srt_filter(
    srt_path: str | Path,
    *,
    font_name: str = "Vazirmatn",
    font_size: int = 24,
    margin_v: int = 34,
) -> str:
    """Build a broadcast-clean ffmpeg subtitles burn-in filter string."""
    escaped = escape_ffmpeg_filter_path(srt_path)
    style = (
        f"FontName={font_name},"
        f"FontSize={int(max(12, min(72, font_size)))},"
        f"PrimaryColour=&H00FFFFFF,"
        f"OutlineColour=&H0009090B,"
        f"BackColour=&H9609090B,"
        f"BorderStyle=3,"
        f"Outline=2,"
        f"Shadow=0,"
        f"MarginV={int(max(8, min(180, margin_v)))}"
    )
    return f"subtitles='{escaped}':force_style='{style}'"
