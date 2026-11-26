"""Khordegir Studio — Deterministic Music Block, Mood Resolver & Loudness DSP.

Reads top-level `music` configuration directly from `video.yaml` (single source of
truth) and renders sample-accurate, deterministic background music tracks with:
  - Mood library resolution (`mood: 1..8` -> `music/mood_N.mp3`)
  - Logarithmic perceptual fade-in / fade-out curves (plus exp / scurve / linear)
  - Equal-power cosine/sine crossfades between mood segments
  - Smooth attack/hold/release narration ducking derived from slide `say` timings
  - Clean-room ITU-R BS.1770-4 / EBU R128 K-weighted gated LUFS measurement & normalization
  - Deterministic FFmpeg `-filter_complex` pipeline builder

Licenses & Attribution:
  - DSP math, YAML fallback parser, envelope follower, and fade/crossfade formulas:
    Original clean-room implementation for Khordegir Studio (MIT-compatible).
  - Loudness weighting & gating algorithm: Clean-room implementation from the public
    ITU-R BS.1770-4 / EBU R128 broadcast loudness specification (bilinear transform
    K-weighting pre-filter + 400 ms gated integrated loudness).
  - External CLI decoding/muxing (optional): invokes local `ffmpeg` (`libmp3lame`,
    LGPL/GPL-compatible subprocess boundary). Zero network calls, zero randomness.
"""

from __future__ import annotations

import hashlib
import io
import json
import math
import pathlib
import re
import struct
import subprocess
import wave
from dataclasses import dataclass, field
from typing import Any, Iterable, Sequence

KHODEGIR_ROOT = pathlib.Path(__file__).resolve().parent
MUSIC_DIR = KHODEGIR_ROOT / "music"

FA_DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")

MOOD_CATALOG: tuple[dict[str, Any], ...] = (
    {
        "id": 1,
        "slug": "calm-ambient",
        "file": "music/mood_1.mp3",
        "label_fa": "آرام و توضیحی",
        "label_en": "Calm Ambient",
        "bpm": 84,
        "key": "C major",
        "color": "#38bdf8",
    },
    {
        "id": 2,
        "slug": "curious-investigative",
        "file": "music/mood_2.mp3",
        "label_fa": "کنجکاو و تحقیقی",
        "label_en": "Curious Investigative",
        "bpm": 104,
        "key": "D minor",
        "color": "#f5b700",
    },
    {
        "id": 3,
        "slug": "upbeat-creator",
        "file": "music/mood_3.mp3",
        "label_fa": "پرانرژی و یوتیوبی",
        "label_en": "Upbeat Creator",
        "bpm": 118,
        "key": "G major",
        "color": "#10b981",
    },
    {
        "id": 4,
        "slug": "dramatic-tension",
        "file": "music/mood_4.mp3",
        "label_fa": "دراماتیک و تنش‌زا",
        "label_en": "Dramatic Tension",
        "bpm": 92,
        "key": "C minor",
        "color": "#ef4444",
    },
    {
        "id": 5,
        "slug": "minimal-tech-data",
        "file": "music/mood_5.mp3",
        "label_fa": "مینیمال و داده‌محور",
        "label_en": "Minimal Tech Data",
        "bpm": 112,
        "key": "A minor",
        "color": "#818cf8",
    },
    {
        "id": 6,
        "slug": "warm-storytelling",
        "file": "music/mood_6.mp3",
        "label_fa": "داستان‌گو و صمیمی",
        "label_en": "Warm Storytelling",
        "bpm": 88,
        "key": "F major",
        "color": "#fb923c",
    },
    {
        "id": 7,
        "slug": "urgent-news-pulse",
        "file": "music/mood_7.mp3",
        "label_fa": "فوری و خبری",
        "label_en": "Urgent News Pulse",
        "bpm": 126,
        "key": "E minor",
        "color": "#f43f5e",
    },
    {
        "id": 8,
        "slug": "inspiring-finale",
        "file": "music/mood_8.mp3",
        "label_fa": "الهام‌بخش و جمع‌بندی",
        "label_en": "Inspiring Finale",
        "bpm": 98,
        "key": "D major",
        "color": "#a855f7",
    },
)

MOOD_BY_ID: dict[int, dict[str, Any]] = {m["id"]: m for m in MOOD_CATALOG}
MOOD_BY_SLUG: dict[str, dict[str, Any]] = {m["slug"]: m for m in MOOD_CATALOG}

VALID_FADE_CURVES = ("log", "exp", "scurve", "linear")
VALID_CROSSFADE_SHAPES = ("equal_power", "sqrt_power", "linear", "log")

DEFAULT_MUSIC_CONFIG: dict[str, Any] = {
    "enabled": False,
    "mood": 1,
    "volume": 0.35,
    "fade_in": 1.5,
    "fade_out": 2.0,
    "fade_curve": "log",
    "ducking": True,
    "duck_depth_db": -12.0,
    "duck_attack": 0.18,
    "duck_release": 0.55,
    "duck_hold": 0.12,
    "lufs_target": -18.0,
    "peak_ceiling_db": -1.0,
    "crossfade_dur": 1.2,
    "crossfade_shape": "equal_power",
}


@dataclass(frozen=True)
class MoodResolution:
    mood_id: int
    rel_path: str
    abs_path: pathlib.Path
    meta: dict[str, Any]


@dataclass(frozen=True)
class MusicSegment:
    mood: int
    src: str
    start: float
    end: float
    volume: float = 1.0


@dataclass(frozen=True)
class MusicConfig:
    enabled: bool
    mood: int | None
    src: str | None
    volume: float
    fade_in: float
    fade_out: float
    fade_curve: str
    ducking: bool
    duck_depth_db: float
    duck_attack: float
    duck_release: float
    duck_hold: float
    lufs_target: float
    peak_ceiling_db: float
    crossfade_dur: float
    crossfade_shape: str
    segments: tuple[MusicSegment, ...] = field(default_factory=tuple)


# ---------------------------------------------------------------------------
# Pure-Python deterministic YAML loader (with optional PyYAML acceleration)
# ---------------------------------------------------------------------------

def _strip_yaml_comment(line: str) -> str:
    in_single = False
    in_double = False
    for idx, ch in enumerate(line):
        if ch == "'" and not in_double:
            in_single = not in_single
        elif ch == '"' and not in_single and (idx == 0 or line[idx - 1] != "\\"):
            in_double = not in_double
        elif ch == "#" and not in_single and not in_double:
            if idx == 0 or line[idx - 1].isspace():
                return line[:idx]
    return line


def _split_inline_csv(inner: str) -> list[str]:
    items: list[str] = []
    cur: list[str] = []
    depth = 0
    in_single = False
    in_double = False
    for idx, ch in enumerate(inner):
        if ch == "'" and not in_double:
            in_single = not in_single
        elif ch == '"' and not in_single and (idx == 0 or inner[idx - 1] != "\\"):
            in_double = not in_double
        elif not in_single and not in_double:
            if ch in "[{":
                depth += 1
            elif ch in "]}":
                depth = max(0, depth - 1)
            elif ch == "," and depth == 0:
                items.append("".join(cur).strip())
                cur = []
                continue
        cur.append(ch)
    tail = "".join(cur).strip()
    if tail:
        items.append(tail)
    return items


def _parse_yaml_scalar(raw: str) -> Any:
    s = raw.strip()
    if not s or s in ("null", "Null", "NULL", "~"):
        return None
    if s in ("true", "True", "TRUE", "yes", "Yes", "on", "ON"):
        return True
    if s in ("false", "False", "FALSE", "no", "No", "off", "OFF"):
        return False
    if (s.startswith('"') and s.endswith('"')) or (s.startswith("'") and s.endswith("'")):
        inner = s[1:-1]
        if s.startswith('"'):
            inner = inner.replace('\\"', '"').replace("\\n", "\n").replace("\\\\", "\\")
        else:
            inner = inner.replace("''", "'")
        return inner
    if s.startswith("[") and s.endswith("]"):
        inner = s[1:-1].strip()
        if not inner:
            return []
        return [_parse_yaml_scalar(p) for p in _split_inline_csv(inner)]
    if s.startswith("{") and s.endswith("}"):
        inner = s[1:-1].strip()
        if not inner:
            return {}
        out: dict[str, Any] = {}
        for part in _split_inline_csv(inner):
            if ":" in part:
                k, v = part.split(":", 1)
                out[str(_parse_yaml_scalar(k.strip()))] = _parse_yaml_scalar(v.strip())
        return out
    en = s.translate(FA_DIGITS)
    if re.fullmatch(r"-?\d+", en):
        try:
            return int(en)
        except ValueError:
            pass
    if re.fullmatch(r"-?(?:\d+\.\d*|\.\d+|\d+[eE][+-]?\d+|\d+\.\d+[eE][+-]?\d+)", en):
        try:
            return float(en)
        except ValueError:
            pass
    return s


def _split_kv(text: str) -> tuple[str, str] | None:
    in_single = False
    in_double = False
    for idx, ch in enumerate(text):
        if ch == "'" and not in_double:
            in_single = not in_single
        elif ch == '"' and not in_single and (idx == 0 or text[idx - 1] != "\\"):
            in_double = not in_double
        elif ch == ":" and not in_single and not in_double:
            if idx + 1 == len(text) or text[idx + 1].isspace():
                return text[:idx].strip(), text[idx + 1 :].strip()
    return None


def _minimal_yaml_load(text: str) -> Any:
    """Clean-room indentation-based YAML subset parser for `video.yaml` files."""
    raw_lines = text.splitlines()
    tokens: list[tuple[int, str]] = []
    for raw in raw_lines:
        cleaned = _strip_yaml_comment(raw).rstrip()
        if not cleaned.strip():
            continue
        indent = len(cleaned) - len(cleaned.lstrip(" "))
        tokens.append((indent, cleaned.strip()))

    if not tokens:
        return {}

    def parse_block(idx: int, base_indent: int) -> tuple[Any, int]:
        if idx >= len(tokens):
            return {}, idx
        if tokens[idx][1].startswith("- ") or tokens[idx][1] == "-":
            return parse_seq(idx, base_indent)
        return parse_map(idx, base_indent)

    def collect_multiline(idx: int, key_indent: int, first_val: str) -> tuple[Any, int]:
        if first_val in ("|", ">", "|-", ">-"):
            parts: list[str] = []
            j = idx
            block_indent = None
            while j < len(tokens):
                ind, txt = tokens[j]
                if ind <= key_indent:
                    break
                if block_indent is None:
                    block_indent = ind
                parts.append(txt)
                j += 1
            sep = "\n" if first_val.startswith("|") else " "
            return sep.join(parts), j

        # Handle wrapped plain scalar lines (common in video.yaml `say:` lines)
        if not first_val.startswith(("'", '"', "[", "{")):
            parts = [first_val]
            j = idx
            while j < len(tokens):
                ind, txt = tokens[j]
                if ind <= key_indent:
                    break
                if txt.startswith("- ") or _split_kv(txt) is not None:
                    break
                parts.append(txt)
                j += 1
            return _parse_yaml_scalar(" ".join(parts)), j

        # Handle multiline quoted string
        quote = first_val[0]
        if len(first_val) >= 2 and first_val.endswith(quote) and not (quote == '"' and first_val.endswith('\\"')):
            return _parse_yaml_scalar(first_val), idx
        parts = [first_val]
        j = idx
        while j < len(tokens):
            ind, txt = tokens[j]
            if ind <= key_indent:
                break
            parts.append(txt)
            j += 1
            if txt.endswith(quote):
                break
        return _parse_yaml_scalar(" ".join(parts)), j

    def parse_map(idx: int, map_indent: int) -> tuple[dict[str, Any], int]:
        out: dict[str, Any] = {}
        while idx < len(tokens):
            ind, txt = tokens[idx]
            if ind < map_indent or txt.startswith("- ") or txt == "-":
                break
            if ind > map_indent:
                break
            kv = _split_kv(txt)
            if kv is None:
                idx += 1
                continue
            raw_k, raw_v = kv
            key = str(_parse_yaml_scalar(raw_k))
            idx += 1
            if raw_v == "":
                if idx < len(tokens) and tokens[idx][0] > map_indent:
                    val, idx = parse_block(idx, tokens[idx][0])
                elif idx < len(tokens) and tokens[idx][0] == map_indent and (
                    tokens[idx][1].startswith("- ") or tokens[idx][1] == "-"
                ):
                    val, idx = parse_seq(idx, map_indent)
                else:
                    val = None
            else:
                val, idx = collect_multiline(idx, map_indent, raw_v)
            out[key] = val
        return out, idx

    def parse_seq(idx: int, seq_indent: int) -> tuple[list[Any], int]:
        out: list[Any] = []
        while idx < len(tokens):
            ind, txt = tokens[idx]
            if ind < seq_indent or not (txt.startswith("- ") or txt == "-"):
                break
            if ind > seq_indent:
                break
            rest = txt[1:].strip()
            idx += 1
            if not rest:
                if idx < len(tokens) and tokens[idx][0] > seq_indent:
                    item, idx = parse_block(idx, tokens[idx][0])
                else:
                    item = None
                out.append(item)
                continue

            if rest.startswith("- ") or rest == "-":
                nested_indent = seq_indent + (len(txt) - len(rest))
                tokens[idx - 1] = (nested_indent, rest)
                nested, idx = parse_seq(idx - 1, nested_indent)
                out.append(nested)
                continue

            kv = _split_kv(rest)
            if kv is not None:
                raw_k, raw_v = kv
                item_indent = seq_indent + 2
                item_map: dict[str, Any] = {}
                key = str(_parse_yaml_scalar(raw_k))
                if raw_v == "":
                    if idx < len(tokens) and tokens[idx][0] > item_indent:
                        val, idx = parse_block(idx, tokens[idx][0])
                    elif idx < len(tokens) and tokens[idx][0] == item_indent and (
                        tokens[idx][1].startswith("- ") or tokens[idx][1] == "-"
                    ):
                        val, idx = parse_seq(idx, item_indent)
                    else:
                        val = None
                else:
                    val, idx = collect_multiline(idx, item_indent, raw_v)
                item_map[key] = val
                if idx < len(tokens) and tokens[idx][0] > seq_indent and not (
                    tokens[idx][1].startswith("- ") or tokens[idx][1] == "-"
                ):
                    extra, idx = parse_map(idx, tokens[idx][0])
                    item_map.update(extra)
                out.append(item_map)
            else:
                val, idx = collect_multiline(idx, seq_indent, rest)
                out.append(val)
        return out, idx

    parsed, _ = parse_block(0, tokens[0][0])
    return parsed


def safe_load_yaml(text: str) -> Any:
    """Parse YAML text deterministically (uses PyYAML if installed, else stdlib fallback)."""
    try:
        import yaml  # type: ignore

        return yaml.safe_load(text) or {}
    except ImportError:
        return _minimal_yaml_load(text)


def load_video_yaml(source: str | pathlib.Path | dict[str, Any]) -> dict[str, Any]:
    """Load `video.yaml` single source of truth from a file path, YAML string, or mapping."""
    if isinstance(source, dict):
        return source
    if isinstance(source, pathlib.Path):
        data = safe_load_yaml(source.read_text(encoding="utf-8"))
    elif isinstance(source, str):
        stripped = source.lstrip()
        if "\n" not in source and (source.endswith(".yaml") or source.endswith(".yml")):
            p = pathlib.Path(source)
            if p.is_file():
                data = safe_load_yaml(p.read_text(encoding="utf-8"))
            else:
                raise FileNotFoundError(f"video.yaml not found: {source}")
        elif stripped.endswith(".json") and "\n" not in source and pathlib.Path(source).is_file():
            data = json.loads(pathlib.Path(source).read_text(encoding="utf-8"))
        else:
            data = safe_load_yaml(source)
    else:
        raise TypeError(f"Unsupported video.yaml source type: {type(source).__name__}")

    if not isinstance(data, dict):
        raise ValueError("video.yaml root must be a mapping")
    return data


# ---------------------------------------------------------------------------
# Mood library resolution (`mood: 1..8` -> `music/mood_N.mp3`)
# ---------------------------------------------------------------------------

def _normalize_mood_id(mood: Any) -> int:
    if isinstance(mood, bool):
        raise ValueError(f"Invalid mood value: {mood!r}; expected integer 1..8")
    if isinstance(mood, (int, float)) and not isinstance(mood, bool):
        if isinstance(mood, float) and not mood.is_integer():
            raise ValueError(f"Mood must be an integer 1..8, got {mood!r}")
        mid = int(mood)
    elif isinstance(mood, str):
        s = mood.strip().translate(FA_DIGITS)
        if s in MOOD_BY_SLUG:
            mid = MOOD_BY_SLUG[s]["id"]
        else:
            m = re.fullmatch(r"(?:music/)?mood_([1-8])(?:\.mp3)?", s)
            if m:
                mid = int(m.group(1))
            elif re.fullmatch(r"-?\d+", s):
                mid = int(s)
            else:
                raise ValueError(f"Invalid mood specifier: {mood!r}; expected 1..8")
    else:
        raise ValueError(f"Invalid mood type: {type(mood).__name__}; expected 1..8")

    if mid < 1 or mid > 8:
        raise ValueError(f"Mood out of range: {mid}; expected 1..8")
    return mid


def resolve_mood(
    mood: Any,
    khordegir_root: pathlib.Path | str | None = None,
    require_exists: bool = True,
) -> MoodResolution:
    """Resolve mood `1..8` strictly to `music/mood_N.mp3` inside `khordegir_root`."""
    mid = _normalize_mood_id(mood)
    root = pathlib.Path(khordegir_root).resolve() if khordegir_root else KHODEGIR_ROOT
    rel_path = f"music/mood_{mid}.mp3"
    abs_path = (root / rel_path).resolve()
    try:
        abs_path.relative_to(root)
    except ValueError as exc:
        raise ValueError(f"Resolved mood path escapes root: {abs_path}") from exc
    if require_exists and not abs_path.is_file():
        raise FileNotFoundError(f"Mood stem missing: {abs_path}")
    return MoodResolution(
        mood_id=mid,
        rel_path=rel_path,
        abs_path=abs_path,
        meta=dict(MOOD_BY_ID[mid]),
    )


# ---------------------------------------------------------------------------
# Slide duration & narration interval extraction from video.yaml
# ---------------------------------------------------------------------------

def _words_in_say(say: Any) -> int:
    if not isinstance(say, str) or not say.strip():
        return 0
    return len(say.strip().split())


def estimate_say_seconds(say: Any) -> float | None:
    words = _words_in_say(say)
    if words <= 0:
        return None
    # Matches Khordegir Studio editor/stage pacing formula
    return round(max(4.5, min(26.0, words / 2.25 + 1.15)), 3)


def estimate_slide_durations(video_data: dict[str, Any]) -> list[float]:
    """Compute deterministic per-slide duration in seconds from `video.yaml`."""
    slides = video_data.get("slides") or []
    proj_dur = float(video_data.get("duration") or 6.0)
    proj_sync = video_data.get("sync_say", True)
    durations: list[float] = []

    for slide in slides:
        if not isinstance(slide, dict):
            durations.append(max(0.5, proj_dur))
            continue
        base_dur = float(slide.get("duration") or proj_dur)
        sync_say = slide.get("sync_say", proj_sync)
        parts: list[str] = []
        if isinstance(slide.get("say"), str) and slide["say"].strip():
            parts.append(slide["say"].strip())
        for st in slide.get("steps") or []:
            if isinstance(st, str) and st.strip():
                parts.append(st.strip())
            elif isinstance(st, dict) and isinstance(st.get("say"), str) and st["say"].strip():
                parts.append(st["say"].strip())
        combined_say = " ".join(parts).strip()
        say_est = estimate_say_seconds(combined_say) if sync_say is not False else None
        dur = max(base_dur, say_est) if say_est is not None else base_dur
        durations.append(max(0.5, float(dur)))

    return durations


def extract_narration_intervals(
    video_data: dict[str, Any],
    lead_pad: float = 0.22,
    tail_pad: float = 0.22,
) -> tuple[list[tuple[float, float]], float]:
    """Derive deterministic spoken narration intervals `[(start, end), ...]` and total duration."""
    slides = video_data.get("slides") or []
    durations = estimate_slide_durations(video_data)
    intervals: list[tuple[float, float]] = []
    cursor = 0.0

    for slide, slide_dur in zip(slides, durations):
        t0 = cursor
        t1 = cursor + slide_dur
        cursor = t1
        if not isinstance(slide, dict):
            continue

        # Collect active speech segments across slide + steps
        step_list = slide.get("steps") if isinstance(slide.get("steps"), list) else []
        sub_beats: list[tuple[bool, int]] = []
        main_words = _words_in_say(slide.get("say"))
        if main_words > 0 or not step_list:
            sub_beats.append((main_words > 0, max(1, main_words)))
        for st in step_list:
            if isinstance(st, str):
                w = _words_in_say(st)
                sub_beats.append((w > 0, max(1, w)))
            elif isinstance(st, dict):
                w = _words_in_say(st.get("say"))
                sub_beats.append((w > 0, max(1, w)))

        total_weight = sum(w for _, w in sub_beats) or 1
        beat_cursor = t0
        for has_speech, weight in sub_beats:
            beat_dur = slide_dur * (weight / total_weight)
            b0 = beat_cursor
            b1 = beat_cursor + beat_dur
            beat_cursor = b1
            if has_speech:
                s = min(b1, b0 + min(lead_pad, beat_dur * 0.2))
                e = max(s, b1 - min(tail_pad, beat_dur * 0.2))
                if e - s >= 0.15:
                    # Merge directly adjacent speaking intervals separated by <= 0.15s
                    if intervals and s - intervals[-1][1] <= 0.15:
                        prev_s, _ = intervals[-1]
                        intervals[-1] = (prev_s, e)
                    else:
                        intervals.append((round(s, 4), round(e, 4)))

    total_duration = round(max(cursor, float(video_data.get("duration") or 6.0) if not slides else cursor), 4)
    return intervals, total_duration


# ---------------------------------------------------------------------------
# Parse top-level `music` block from video.yaml (single source of truth)
# ---------------------------------------------------------------------------

def _parse_volume(val: Any, default: float) -> float:
    if val is None:
        return default
    if isinstance(val, str):
        s = val.strip().lower().translate(FA_DIGITS)
        if s.endswith("db"):
            db = float(s[:-2].strip())
            return max(0.0, min(2.0, 10.0 ** (db / 20.0)))
        if s.endswith("%"):
            return max(0.0, min(2.0, float(s[:-1].strip()) / 100.0))
        val = float(s)
    v = float(val)
    if v < 0.0:
        # Negative scalar interpreted as dB if <= -1, else clamp to 0
        return max(0.0, min(2.0, 10.0 ** (v / 20.0))) if v <= -1.0 else 0.0
    return max(0.0, min(2.0, v))


def parse_music_block(
    video_source: str | pathlib.Path | dict[str, Any],
    khordegir_root: pathlib.Path | str | None = None,
) -> MusicConfig:
    """Parse and validate `music` block from `video.yaml` (single source of truth)."""
    data = load_video_yaml(video_source)
    raw_music = data.get("music")
    _, total_dur = extract_narration_intervals(data)
    slide_durs = estimate_slide_durations(data)
    slides = data.get("slides") or []

    # Check if any slide has a per-slide mood override even without top-level `music`
    has_slide_mood = any(
        isinstance(s, dict) and (s.get("music_mood") is not None or isinstance(s.get("music"), (int, dict)))
        for s in slides
    )

    if raw_music is None and not has_slide_mood:
        return MusicConfig(
            enabled=False,
            mood=None,
            src=None,
            volume=DEFAULT_MUSIC_CONFIG["volume"],
            fade_in=DEFAULT_MUSIC_CONFIG["fade_in"],
            fade_out=DEFAULT_MUSIC_CONFIG["fade_out"],
            fade_curve=DEFAULT_MUSIC_CONFIG["fade_curve"],
            ducking=DEFAULT_MUSIC_CONFIG["ducking"],
            duck_depth_db=DEFAULT_MUSIC_CONFIG["duck_depth_db"],
            duck_attack=DEFAULT_MUSIC_CONFIG["duck_attack"],
            duck_release=DEFAULT_MUSIC_CONFIG["duck_release"],
            duck_hold=DEFAULT_MUSIC_CONFIG["duck_hold"],
            lufs_target=DEFAULT_MUSIC_CONFIG["lufs_target"],
            peak_ceiling_db=DEFAULT_MUSIC_CONFIG["peak_ceiling_db"],
            crossfade_dur=DEFAULT_MUSIC_CONFIG["crossfade_dur"],
            crossfade_shape=DEFAULT_MUSIC_CONFIG["crossfade_shape"],
            segments=(),
        )

    if raw_music in (False, 0, "off", "none", "false", "خاموش"):
        return MusicConfig(
            enabled=False,
            mood=None,
            src=None,
            volume=DEFAULT_MUSIC_CONFIG["volume"],
            fade_in=DEFAULT_MUSIC_CONFIG["fade_in"],
            fade_out=DEFAULT_MUSIC_CONFIG["fade_out"],
            fade_curve=DEFAULT_MUSIC_CONFIG["fade_curve"],
            ducking=DEFAULT_MUSIC_CONFIG["ducking"],
            duck_depth_db=DEFAULT_MUSIC_CONFIG["duck_depth_db"],
            duck_attack=DEFAULT_MUSIC_CONFIG["duck_attack"],
            duck_release=DEFAULT_MUSIC_CONFIG["duck_release"],
            duck_hold=DEFAULT_MUSIC_CONFIG["duck_hold"],
            lufs_target=DEFAULT_MUSIC_CONFIG["lufs_target"],
            peak_ceiling_db=DEFAULT_MUSIC_CONFIG["peak_ceiling_db"],
            crossfade_dur=DEFAULT_MUSIC_CONFIG["crossfade_dur"],
            crossfade_shape=DEFAULT_MUSIC_CONFIG["crossfade_shape"],
            segments=(),
        )

    if isinstance(raw_music, (int, str)):
        cfg: dict[str, Any] = {"mood": raw_music}
    elif isinstance(raw_music, dict):
        cfg = dict(raw_music)
    else:
        cfg = {}

    if cfg.get("enabled") is False or str(cfg.get("mood", "")).strip().lower() in ("off", "none", "false", "0"):
        return MusicConfig(
            enabled=False,
            mood=None,
            src=None,
            volume=DEFAULT_MUSIC_CONFIG["volume"],
            fade_in=DEFAULT_MUSIC_CONFIG["fade_in"],
            fade_out=DEFAULT_MUSIC_CONFIG["fade_out"],
            fade_curve=DEFAULT_MUSIC_CONFIG["fade_curve"],
            ducking=DEFAULT_MUSIC_CONFIG["ducking"],
            duck_depth_db=DEFAULT_MUSIC_CONFIG["duck_depth_db"],
            duck_attack=DEFAULT_MUSIC_CONFIG["duck_attack"],
            duck_release=DEFAULT_MUSIC_CONFIG["duck_release"],
            duck_hold=DEFAULT_MUSIC_CONFIG["duck_hold"],
            lufs_target=DEFAULT_MUSIC_CONFIG["lufs_target"],
            peak_ceiling_db=DEFAULT_MUSIC_CONFIG["peak_ceiling_db"],
            crossfade_dur=DEFAULT_MUSIC_CONFIG["crossfade_dur"],
            crossfade_shape=DEFAULT_MUSIC_CONFIG["crossfade_shape"],
            segments=(),
        )

    raw_mood = cfg.get("mood")
    if raw_mood is None and not cfg.get("segments") and not has_slide_mood:
        raw_mood = DEFAULT_MUSIC_CONFIG["mood"]

    primary_res = resolve_mood(raw_mood, khordegir_root=khordegir_root) if raw_mood is not None else None

    volume = _parse_volume(cfg.get("volume"), DEFAULT_MUSIC_CONFIG["volume"])
    fade_in = max(0.0, float(cfg.get("fade_in") if cfg.get("fade_in") is not None else DEFAULT_MUSIC_CONFIG["fade_in"]))
    fade_out = max(0.0, float(cfg.get("fade_out") if cfg.get("fade_out") is not None else DEFAULT_MUSIC_CONFIG["fade_out"]))

    fade_curve = str(cfg.get("fade_curve") or DEFAULT_MUSIC_CONFIG["fade_curve"]).strip().lower()
    if fade_curve not in VALID_FADE_CURVES:
        raise ValueError(f"Unsupported fade_curve {fade_curve!r}; valid: {VALID_FADE_CURVES}")

    duck_raw = cfg.get("ducking", DEFAULT_MUSIC_CONFIG["ducking"])
    if isinstance(duck_raw, dict):
        duck_enabled = bool(duck_raw.get("enabled", True))
        duck_depth_db = float(duck_raw.get("depth_db", cfg.get("duck_depth_db", DEFAULT_MUSIC_CONFIG["duck_depth_db"])))
        duck_attack = float(duck_raw.get("attack", cfg.get("duck_attack", DEFAULT_MUSIC_CONFIG["duck_attack"])))
        duck_release = float(duck_raw.get("release", cfg.get("duck_release", DEFAULT_MUSIC_CONFIG["duck_release"])))
        duck_hold = float(duck_raw.get("hold", cfg.get("duck_hold", DEFAULT_MUSIC_CONFIG["duck_hold"])))
    else:
        duck_enabled = bool(duck_raw)
        duck_depth_db = float(cfg.get("duck_depth_db", DEFAULT_MUSIC_CONFIG["duck_depth_db"]))
        duck_attack = float(cfg.get("duck_attack", DEFAULT_MUSIC_CONFIG["duck_attack"]))
        duck_release = float(cfg.get("duck_release", DEFAULT_MUSIC_CONFIG["duck_release"]))
        duck_hold = float(cfg.get("duck_hold", DEFAULT_MUSIC_CONFIG["duck_hold"]))

    duck_depth_db = max(-40.0, min(0.0, duck_depth_db))
    duck_attack = max(0.01, min(3.0, duck_attack))
    duck_release = max(0.02, min(5.0, duck_release))
    duck_hold = max(0.0, min(2.0, duck_hold))

    lufs_target = max(-40.0, min(-3.0, float(cfg.get("lufs_target", DEFAULT_MUSIC_CONFIG["lufs_target"]))))
    peak_ceiling_db = max(-12.0, min(0.0, float(cfg.get("peak_ceiling_db", DEFAULT_MUSIC_CONFIG["peak_ceiling_db"]))))

    crossfade_dur = max(0.0, min(10.0, float(cfg.get("crossfade_dur", DEFAULT_MUSIC_CONFIG["crossfade_dur"]))))
    crossfade_shape = str(cfg.get("crossfade_shape") or DEFAULT_MUSIC_CONFIG["crossfade_shape"]).strip().lower()
    if crossfade_shape not in VALID_CROSSFADE_SHAPES:
        raise ValueError(f"Unsupported crossfade_shape {crossfade_shape!r}; valid: {VALID_CROSSFADE_SHAPES}")

    # Build mood segments: explicit `music.segments` > per-slide overrides > single primary mood
    segments: list[MusicSegment] = []
    if isinstance(cfg.get("segments"), list) and cfg["segments"]:
        cursor = 0.0
        for seg in cfg["segments"]:
            if not isinstance(seg, dict):
                continue
            seg_mood = seg.get("mood", primary_res.mood_id if primary_res else 1)
            res = resolve_mood(seg_mood, khordegir_root=khordegir_root)
            s_start = float(seg.get("start", cursor))
            if seg.get("end") is not None:
                s_end = float(seg["end"])
            elif seg.get("duration") is not None:
                s_end = s_start + float(seg["duration"])
            else:
                s_end = max(s_start + 1.0, total_dur)
            s_vol = _parse_volume(seg.get("volume"), 1.0)
            if s_end > s_start:
                segments.append(MusicSegment(mood=res.mood_id, src=res.rel_path, start=s_start, end=s_end, volume=s_vol))
                cursor = s_end
    elif has_slide_mood:
        cursor = 0.0
        default_id = primary_res.mood_id if primary_res else 1
        for slide, sdur in zip(slides, slide_durs):
            s_mood = None
            s_vol = 1.0
            if isinstance(slide, dict):
                if slide.get("music_mood") is not None:
                    s_mood = slide["music_mood"]
                elif isinstance(slide.get("music"), (int, str)):
                    s_mood = slide["music"]
                elif isinstance(slide.get("music"), dict):
                    s_mood = slide["music"].get("mood", default_id)
                    if slide["music"].get("volume") is not None:
                        s_vol = _parse_volume(slide["music"]["volume"], 1.0)
            res = resolve_mood(s_mood if s_mood is not None else default_id, khordegir_root=khordegir_root)
            s_end = cursor + sdur
            if segments and segments[-1].mood == res.mood_id and abs(segments[-1].volume - s_vol) < 1e-6:
                prev = segments[-1]
                segments[-1] = MusicSegment(mood=prev.mood, src=prev.src, start=prev.start, end=s_end, volume=prev.volume)
            else:
                segments.append(MusicSegment(mood=res.mood_id, src=res.rel_path, start=cursor, end=s_end, volume=s_vol))
            cursor = s_end
    elif primary_res is not None:
        segments.append(
            MusicSegment(
                mood=primary_res.mood_id,
                src=primary_res.rel_path,
                start=0.0,
                end=max(total_dur, 0.5),
                volume=1.0,
            )
        )

    if primary_res is None and segments:
        primary_res = resolve_mood(segments[0].mood, khordegir_root=khordegir_root)

    return MusicConfig(
        enabled=bool(segments),
        mood=primary_res.mood_id if primary_res else None,
        src=primary_res.rel_path if primary_res else None,
        volume=volume,
        fade_in=fade_in,
        fade_out=fade_out,
        fade_curve=fade_curve,
        ducking=duck_enabled,
        duck_depth_db=duck_depth_db,
        duck_attack=duck_attack,
        duck_release=duck_release,
        duck_hold=duck_hold,
        lufs_target=lufs_target,
        peak_ceiling_db=peak_ceiling_db,
        crossfade_dur=crossfade_dur,
        crossfade_shape=crossfade_shape,
        segments=tuple(segments),
    )


VALID_LOGO_CORNERS = ("top-left", "top-right", "bottom-left", "bottom-right")


@dataclass(frozen=True)
class LogoConfig:
    file: str
    corner: str = "top-left"
    size: float = 8.0  # % of stage width
    opacity: float = 0.85
    margin: float = 40.0  # px or %
    hide: tuple[Any, ...] = field(default_factory=tuple)


def parse_logo_block(
    video_source: str | pathlib.Path | dict[str, Any],
    khordegir_root: pathlib.Path | str | None = None,
) -> LogoConfig | None:
    """Parse and validate top-level `logo` block from `video.yaml` (single source of truth)."""
    data = load_video_yaml(video_source)
    raw_logo = data.get("logo")
    if raw_logo is None or raw_logo is False or raw_logo == "off" or raw_logo == "none":
        return None

    root = pathlib.Path(khordegir_root).resolve() if khordegir_root else KHODEGIR_ROOT

    if isinstance(raw_logo, str):
        file_str = raw_logo.strip()
        if not file_str:
            return None
        cfg_dict = {"file": file_str}
    elif isinstance(raw_logo, dict):
        cfg_dict = dict(raw_logo)
    else:
        raise ValueError(f"Invalid logo configuration type: {type(raw_logo).__name__}")

    allowed_keys = {"file", "corner", "size", "opacity", "margin", "hide"}
    unknown_keys = set(cfg_dict.keys()) - allowed_keys
    if unknown_keys:
        raise ValueError(f"Unknown logo keys: {sorted(unknown_keys)}; allowed: {sorted(allowed_keys)}")

    file_val = cfg_dict.get("file")
    if not file_val or not isinstance(file_val, str):
        raise ValueError("Logo block requires a valid string 'file' path")

    corner = str(cfg_dict.get("corner", "top-left")).strip().lower()
    if corner not in VALID_LOGO_CORNERS:
        raise ValueError(f"Unknown logo corner {corner!r}; valid: {VALID_LOGO_CORNERS}")

    size_raw = cfg_dict.get("size", 8.0)
    if isinstance(size_raw, str):
        s_clean = size_raw.strip().lower().rstrip("%").strip()
        size_val = float(s_clean)
    else:
        size_val = float(size_raw)
    if not (0.5 <= size_val <= 100.0):
        raise ValueError(f"Logo size out of range: {size_val}; expected 0.5..100 (%)")

    op_raw = cfg_dict.get("opacity", 0.85)
    opacity_val = float(op_raw)
    if not (0.0 <= opacity_val <= 1.0):
        raise ValueError(f"Logo opacity out of range: {opacity_val}; expected 0.0..1.0")

    margin_raw = cfg_dict.get("margin", 40.0)
    if isinstance(margin_raw, str):
        m_clean = margin_raw.strip().lower().rstrip("px").rstrip("%").strip()
        margin_val = float(m_clean)
    else:
        margin_val = float(margin_raw)
    if not (0.0 <= margin_val <= 500.0):
        raise ValueError(f"Logo margin out of range: {margin_val}; expected 0..500")

    file_path = pathlib.Path(file_val)
    abs_file_path = file_path if file_path.is_absolute() else (root / file_path).resolve()
    if not abs_file_path.is_file():
        raise FileNotFoundError(f"Logo file missing or unreadable: {abs_file_path}")

    hide_raw = cfg_dict.get("hide", ())
    if hide_raw is None:
        hide_tuple = ()
    elif isinstance(hide_raw, (list, tuple)):
        hide_tuple = tuple(hide_raw)
    else:
        hide_tuple = (hide_raw,)

    return LogoConfig(
        file=str(file_path),
        corner=corner,
        size=round(size_val, 2),
        opacity=round(opacity_val, 3),
        margin=round(margin_val, 2),
        hide=hide_tuple,
    )



# ---------------------------------------------------------------------------
# Logarithmic fade curves & equal-power crossfade mathematics
# ---------------------------------------------------------------------------

def fade_gain(
    t: float,
    duration: float,
    direction: str = "in",
    curve: str = "log",
    log_alpha: float = 9.0,
    min_db: float = -60.0,
) -> float:
    """Compute perceptual fade gain in [0.0, 1.0].

    - `curve="log"` (default): true logarithmic curve `log(1 + alpha * u) / log(1 + alpha)`
      matching perceptual dB loudness growth (concave in linear gain, smooth arrival at 0 dB).
    - `curve="exp"`: linear-in-dB exponential amplitude ramp `(10^(k*u) - 1) / (10^k - 1)`.
    - `curve="scurve"`: half-sine cosine taper `0.5 * (1 - cos(pi * u))`.
    - `curve="linear"`: `u`.
    """
    if duration <= 0.0:
        return 1.0
    u = max(0.0, min(1.0, float(t) / float(duration)))
    if direction == "out":
        u = 1.0 - u
    elif direction != "in":
        raise ValueError(f"direction must be 'in' or 'out', got {direction!r}")

    if u <= 0.0:
        return 0.0
    if u >= 1.0:
        return 1.0

    c = curve.strip().lower()
    if c == "log":
        return math.log1p(log_alpha * u) / math.log1p(log_alpha)
    if c == "exp":
        k = abs(float(min_db)) / 20.0
        return (math.pow(10.0, k * u) - 1.0) / (math.pow(10.0, k) - 1.0)
    if c == "scurve":
        return 0.5 * (1.0 - math.cos(math.pi * u))
    if c == "linear":
        return u
    raise ValueError(f"Unsupported fade curve: {curve!r}")


def compute_fade_envelope(
    num_samples: int,
    sample_rate: int,
    fade_in: float,
    fade_out: float,
    curve: str = "log",
) -> list[float]:
    """Generate per-sample fade-in and fade-out envelope in [0.0, 1.0]."""
    if num_samples <= 0:
        return []
    env = [1.0] * num_samples
    in_n = int(round(max(0.0, fade_in) * sample_rate))
    out_n = int(round(max(0.0, fade_out) * sample_rate))

    if in_n > 0:
        limit = min(num_samples, in_n)
        for i in range(limit):
            env[i] *= fade_gain(i, in_n, direction="in", curve=curve)
    if out_n > 0:
        start = max(0, num_samples - out_n)
        for i in range(start, num_samples):
            local_t = i - start
            # Last sample reaches 0.0 cleanly
            env[i] *= fade_gain(local_t, max(1, out_n - 1), direction="out", curve=curve)
    return env


def crossfade_gains(u: float, shape: str = "equal_power") -> tuple[float, float]:
    """Return `(gain_out, gain_in)` for normalized crossfade progress `u in [0, 1]`.

    For `"equal_power"` (default): `cos(pi/2 * u), sin(pi/2 * u)`, preserving constant
    acoustic energy (`gain_out**2 + gain_in**2 == 1.0` across `[0, 1]`).
    """
    u_clamped = max(0.0, min(1.0, float(u)))
    s = shape.strip().lower()
    if s == "equal_power":
        angle = 0.5 * math.pi * u_clamped
        return math.cos(angle), math.sin(angle)
    if s == "sqrt_power":
        return math.sqrt(1.0 - u_clamped), math.sqrt(u_clamped)
    if s == "linear":
        return 1.0 - u_clamped, u_clamped
    if s == "log":
        return (
            fade_gain(1.0 - u_clamped, 1.0, direction="in", curve="log"),
            fade_gain(u_clamped, 1.0, direction="in", curve="log"),
        )
    raise ValueError(f"Unsupported crossfade shape: {shape!r}")


# ---------------------------------------------------------------------------
# Smooth Attack / Hold / Release Narration Ducking Envelope
# ---------------------------------------------------------------------------

def compute_ducking_envelope(
    num_samples: int,
    sample_rate: int,
    narration_intervals: Sequence[tuple[float, float]],
    depth_db: float = -12.0,
    attack: float = 0.18,
    release: float = 0.55,
    hold: float = 0.12,
) -> list[float]:
    """Compute smooth deterministic gain envelope ducking music under spoken intervals."""
    if num_samples <= 0:
        return []
    if not narration_intervals or depth_db >= 0.0:
        return [1.0] * num_samples

    duck_gain = 10.0 ** (float(depth_db) / 20.0)
    # Build sample-accurate speech gate with pre-attack lookahead and hangover hold
    lookahead_s = 0.5 * attack
    gate = bytearray(num_samples)
    for start_s, end_s in narration_intervals:
        if end_s <= start_s:
            continue
        i0 = max(0, int(math.floor((start_s - lookahead_s) * sample_rate)))
        i1 = min(num_samples, int(math.ceil((end_s + hold) * sample_rate)))
        if i1 > i0:
            gate[i0:i1] = b"\x01" * (i1 - i0)

    # 1-pole exponential RC smoothing (tau = dur / 3 reaches ~95% in `attack`/`release` seconds)
    tau_att = max(1e-4, attack / 3.0)
    tau_rel = max(1e-4, release / 3.0)
    a_att = 1.0 - math.exp(-1.0 / (tau_att * sample_rate))
    a_rel = 1.0 - math.exp(-1.0 / (tau_rel * sample_rate))

    env = [1.0] * num_samples
    cur = 1.0
    for i in range(num_samples):
        target = duck_gain if gate[i] else 1.0
        coeff = a_att if target < cur else a_rel
        cur += coeff * (target - cur)
        env[i] = cur
    return env


# ---------------------------------------------------------------------------
# ITU-R BS.1770-4 / EBU R128 K-weighted Loudness Measurement & Normalization
# ---------------------------------------------------------------------------

def k_weight_biquads(sample_rate: int) -> tuple[tuple[float, float, float, float, float], tuple[float, float, float, float, float]]:
    """Compute Stage-1 (high-shelf) & Stage-2 (RLB high-pass) biquads per ITU-R BS.1770-4."""
    sr = float(sample_rate)
    if sr <= 0:
        raise ValueError(f"Invalid sample_rate: {sample_rate}")

    # Stage 1: pre-filter high-shelf (+4 dB above ~1.68 kHz)
    db = 3.999843853973347
    f0_s1 = 1681.974450955533
    q_s1 = 0.7071752369554196
    k1 = math.tan(math.pi * f0_s1 / sr)
    vh = 10.0 ** (db / 20.0)
    vb = vh ** 0.4996667741545416
    a0_1 = 1.0 + k1 / q_s1 + k1 * k1
    stage1 = (
        (vh + vb * k1 / q_s1 + k1 * k1) / a0_1,
        2.0 * (k1 * k1 - vh) / a0_1,
        (vh - vb * k1 / q_s1 + k1 * k1) / a0_1,
        2.0 * (k1 * k1 - 1.0) / a0_1,
        (1.0 - k1 / q_s1 + k1 * k1) / a0_1,
    )

    # Stage 2: RLB high-pass (~38.135 Hz)
    f0_s2 = 38.13547087602444
    q_s2 = 0.5003270373238773
    k2 = math.tan(math.pi * f0_s2 / sr)
    a0_2 = 1.0 + k2 / q_s2 + k2 * k2
    stage2 = (
        1.0 / a0_2,
        -2.0 / a0_2,
        1.0 / a0_2,
        2.0 * (k2 * k2 - 1.0) / a0_2,
        (1.0 - k2 / q_s2 + k2 * k2) / a0_2,
    )
    return stage1, stage2


def _biquad_df2t(samples: Sequence[float], coeffs: tuple[float, float, float, float, float]) -> list[float]:
    b0, b1, b2, a1, a2 = coeffs
    z1 = 0.0
    z2 = 0.0
    out = [0.0] * len(samples)
    for idx, x in enumerate(samples):
        y = b0 * x + z1
        z1 = b1 * x - a1 * y + z2
        z2 = b2 * x - a2 * y
        out[idx] = y
    return out


def apply_k_weighting(channels: Sequence[Sequence[float]], sample_rate: int) -> list[list[float]]:
    """Apply ITU-R BS.1770-4 Stage 1 + Stage 2 K-weighting filter to each channel."""
    s1, s2 = k_weight_biquads(sample_rate)
    return [_biquad_df2t(_biquad_df2t(ch, s1), s2) for ch in channels]


def measure_lufs(channels: Sequence[Sequence[float]], sample_rate: int) -> float:
    """Measure integrated loudness in LUFS per ITU-R BS.1770-4 (400 ms blocks, 75% overlap)."""
    if not channels or not channels[0]:
        return -70.0
    n_samples = len(channels[0])
    filtered = apply_k_weighting(channels, sample_rate)

    block_len = max(1, int(round(0.4 * sample_rate)))
    hop_len = max(1, int(round(0.1 * sample_rate)))

    # Sum of channel mean squares (L, R weight = 1.0; if >3 ch, LFE skipped or surround weighted)
    block_powers: list[float] = []
    if n_samples <= block_len:
        z = sum(sum(v * v for v in ch) / n_samples for ch in filtered)
        if z <= 1e-12:
            return -70.0
        return -0.691 + 10.0 * math.log10(z)

    # Prefix sums of squares per channel for O(N) exact sliding block energy
    prefixes: list[list[float]] = []
    for ch in filtered:
        pref = [0.0] * (n_samples + 1)
        acc = 0.0
        for i, v in enumerate(ch):
            acc += v * v
            pref[i + 1] = acc
        prefixes.append(pref)

    for start in range(0, n_samples - block_len + 1, hop_len):
        end = start + block_len
        z = sum((pref[end] - pref[start]) / block_len for pref in prefixes)
        if z > 0.0:
            loud = -0.691 + 10.0 * math.log10(z)
            if loud > -70.0:
                block_powers.append(z)

    if not block_powers:
        return -70.0

    # Relative gate: -10 LU below absolute-gated mean power
    abs_mean_z = sum(block_powers) / len(block_powers)
    gamma_r = -0.691 + 10.0 * math.log10(abs_mean_z) - 10.0
    rel_threshold_z = 10.0 ** ((gamma_r + 0.691) / 10.0)
    gated = [z for z in block_powers if z > rel_threshold_z]
    if not gated:
        return -0.691 + 10.0 * math.log10(abs_mean_z)

    final_z = sum(gated) / len(gated)
    return -0.691 + 10.0 * math.log10(final_z)


def apply_peak_ceiling(channels: Sequence[Sequence[float]], peak_ceiling_db: float = -1.0) -> list[list[float]]:
    """Soft-knee deterministic safety limiter ensuring sample peaks stay <= peak_ceiling_db."""
    ceiling = 10.0 ** (float(peak_ceiling_db) / 20.0)
    knee_start = ceiling * 0.89
    headroom = max(1e-6, ceiling - knee_start)
    out: list[list[float]] = []
    for ch in channels:
        limited = [0.0] * len(ch)
        for i, x in enumerate(ch):
            ax = abs(x)
            if ax <= knee_start:
                limited[i] = x
            else:
                sign = 1.0 if x >= 0.0 else -1.0
                limited[i] = sign * (knee_start + headroom * math.tanh((ax - knee_start) / headroom))
        out.append(limited)
    return out


def normalize_lufs(
    channels: Sequence[Sequence[float]],
    sample_rate: int,
    target_lufs: float = -18.0,
    peak_ceiling_db: float = -1.0,
) -> tuple[list[list[float]], float, float, float]:
    """Deterministically normalize audio channels to `target_lufs` with peak protection.

    Returns `(normalized_channels, applied_gain_db, lufs_before, lufs_after)`.
    """
    lufs_before = measure_lufs(channels, sample_rate)
    if lufs_before <= -69.9:
        return [list(ch) for ch in channels], 0.0, lufs_before, lufs_before

    gain_db = max(-36.0, min(36.0, float(target_lufs) - lufs_before))
    gain = 10.0 ** (gain_db / 20.0)
    scaled = [[v * gain for v in ch] for ch in channels]
    limited = apply_peak_ceiling(scaled, peak_ceiling_db=peak_ceiling_db)
    lufs_after = measure_lufs(limited, sample_rate)
    return limited, gain_db, lufs_before, lufs_after


# ---------------------------------------------------------------------------
# Deterministic PCM Audio Decoding & WAV Output
# ---------------------------------------------------------------------------

def _read_wav_pcm(wav_path: pathlib.Path, target_channels: int = 2) -> tuple[list[list[float]], int]:
    with wave.open(str(wav_path), "rb") as wf:
        n_ch = wf.getnchannels()
        sampwidth = wf.getsampwidth()
        sr = wf.getframerate()
        n_frames = wf.getnframes()
        raw = wf.readframes(n_frames)

    if sampwidth != 2:
        raise ValueError(f"Only 16-bit WAV supported natively (got {sampwidth * 8}-bit)")

    total_vals = n_frames * n_ch
    unpacked = struct.unpack(f"<{total_vals}h", raw)
    channels = [[0.0] * n_frames for _ in range(n_ch)]
    inv = 1.0 / 32768.0
    for f in range(n_frames):
        base = f * n_ch
        for c in range(n_ch):
            channels[c][f] = unpacked[base + c] * inv

    if n_ch == 1 and target_channels == 2:
        channels = [list(channels[0]), list(channels[0])]
    elif n_ch > target_channels:
        channels = channels[:target_channels]
    return channels, sr


def decode_audio_pcm(
    audio_path: pathlib.Path | str,
    sample_rate: int = 44100,
    channels: int = 2,
) -> list[list[float]]:
    """Decode local `.mp3` / `.wav` audio file into deterministic float channels `[-1, 1]`."""
    p = pathlib.Path(audio_path)
    if not p.is_file():
        raise FileNotFoundError(f"Audio file not found: {p}")

    if p.suffix.lower() == ".wav":
        wav_ch, wav_sr = _read_wav_pcm(p, target_channels=channels)
        if wav_sr == sample_rate:
            return wav_ch

    proc = subprocess.run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-i",
            str(p),
            "-f",
            "s16le",
            "-acodec",
            "pcm_s16le",
            "-ac",
            str(channels),
            "-ar",
            str(sample_rate),
            "-bitexact",
            "pipe:1",
        ],
        capture_output=True,
        check=True,
    )
    raw = proc.stdout
    frame_bytes = channels * 2
    n_frames = len(raw) // frame_bytes
    unpacked = struct.unpack(f"<{n_frames * channels}h", raw[: n_frames * frame_bytes])
    out = [[0.0] * n_frames for _ in range(channels)]
    inv = 1.0 / 32768.0
    for f in range(n_frames):
        base = f * channels
        for c in range(channels):
            out[c][f] = unpacked[base + c] * inv
    return out


def _loop_stem_to_length(stem: list[list[float]], target_samples: int, offset_samples: int = 0) -> list[list[float]]:
    """Seamlessly tile a stereo stem starting at `offset_samples` to `target_samples`."""
    n_ch = len(stem)
    stem_len = len(stem[0]) if stem and stem[0] else 0
    if stem_len == 0 or target_samples <= 0:
        return [[0.0] * max(0, target_samples) for _ in range(n_ch)]
    out = [[0.0] * target_samples for _ in range(n_ch)]
    for c in range(n_ch):
        src_ch = stem[c]
        dst_ch = out[c]
        for i in range(target_samples):
            dst_ch[i] = src_ch[(offset_samples + i) % stem_len]
    return out


def write_wav(
    out_path: pathlib.Path | str,
    channels: Sequence[Sequence[float]],
    sample_rate: int = 44100,
) -> pathlib.Path:
    """Write stereo/mono float channels deterministically as PCM16 WAV."""
    p = pathlib.Path(out_path)
    p.parent.mkdir(parents=True, exist_ok=True)
    n_ch = len(channels)
    n_frames = len(channels[0]) if channels else 0
    frames = bytearray(n_frames * n_ch * 2)
    for f in range(n_frames):
        for c in range(n_ch):
            v = max(-1.0, min(1.0, channels[c][f]))
            si = max(-32767, min(32767, int(round(v * 32767.0))))
            struct.pack_into("<h", frames, (f * n_ch + c) * 2, si)
    with wave.open(str(p), "wb") as wf:
        wf.setnchannels(n_ch)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(bytes(frames))
    return p


def pcm_sha256(channels: Sequence[Sequence[float]]) -> str:
    """Deterministic SHA-256 digest of rendered PCM16 samples."""
    h = hashlib.sha256()
    n_ch = len(channels)
    n_frames = len(channels[0]) if channels else 0
    buf = bytearray(n_frames * n_ch * 2)
    for f in range(n_frames):
        for c in range(n_ch):
            v = max(-1.0, min(1.0, channels[c][f]))
            si = max(-32767, min(32767, int(round(v * 32767.0))))
            struct.pack_into("<h", buf, (f * n_ch + c) * 2, si)
    h.update(buf)
    return h.hexdigest()


# ---------------------------------------------------------------------------
# Full Deterministic Music Timeline Renderer & FFmpeg Filtergraph Builder
# ---------------------------------------------------------------------------

def render_music_track(
    video_source: str | pathlib.Path | dict[str, Any],
    out_wav_path: pathlib.Path | str | None = None,
    sample_rate: int = 44100,
    khordegir_root: pathlib.Path | str | None = None,
    narration_intervals: Sequence[tuple[float, float]] | None = None,
    total_duration: float | None = None,
) -> dict[str, Any]:
    """Render deterministic music bed for `video.yaml` with crossfades, log fades, ducking, and LUFS leveling."""
    root = pathlib.Path(khordegir_root).resolve() if khordegir_root else KHODEGIR_ROOT
    data = load_video_yaml(video_source)
    cfg = parse_music_block(data, khordegir_root=root)

    derived_intervals, derived_dur = extract_narration_intervals(data)
    active_intervals = list(narration_intervals) if narration_intervals is not None else derived_intervals
    dur_s = float(total_duration if total_duration is not None else derived_dur)
    if cfg.segments:
        dur_s = max(dur_s, max(seg.end for seg in cfg.segments))
    n_samples = max(1, int(round(dur_s * sample_rate)))

    if not cfg.enabled or not cfg.segments:
        silent = [[0.0] * n_samples, [0.0] * n_samples]
        if out_wav_path:
            write_wav(out_wav_path, silent, sample_rate=sample_rate)
        return {
            "enabled": False,
            "duration": dur_s,
            "sample_rate": sample_rate,
            "samples": silent,
            "lufs_measured": -70.0,
            "sha256": pcm_sha256(silent),
            "config": cfg,
            "narration_intervals": active_intervals,
        }

    # 1. Decode & LUFS-normalize each unique mood stem deterministically
    stem_cache: dict[int, list[list[float]]] = {}
    for seg in cfg.segments:
        if seg.mood not in stem_cache:
            res = resolve_mood(seg.mood, khordegir_root=root)
            raw_pcm = decode_audio_pcm(res.abs_path, sample_rate=sample_rate, channels=2)
            norm_pcm, _, _, _ = normalize_lufs(
                raw_pcm,
                sample_rate=sample_rate,
                target_lufs=cfg.lufs_target,
                peak_ceiling_db=cfg.peak_ceiling_db,
            )
            stem_cache[seg.mood] = norm_pcm

    # 2. Stitch mood segments with equal-power crossfades across boundaries
    mix = [[0.0] * n_samples, [0.0] * n_samples]
    segs = list(cfg.segments)
    half_xf = 0.5 * cfg.crossfade_dur

    for idx, seg in enumerate(segs):
        has_prev = idx > 0 and cfg.crossfade_dur > 0.0
        has_next = idx + 1 < len(segs) and cfg.crossfade_dur > 0.0

        prev_xf_s = min(half_xf, 0.45 * (seg.end - seg.start), 0.45 * (segs[idx - 1].end - segs[idx - 1].start)) if has_prev else 0.0
        next_xf_s = min(half_xf, 0.45 * (seg.end - seg.start), 0.45 * (segs[idx + 1].end - segs[idx + 1].start)) if has_next else 0.0

        eff_start = max(0.0, seg.start - prev_xf_s)
        eff_end = min(dur_s, seg.end + next_xf_s)
        i_start = max(0, int(round(eff_start * sample_rate)))
        i_end = min(n_samples, int(round(eff_end * sample_rate)))
        if i_end <= i_start:
            continue

        seg_len = i_end - i_start
        stem_looped = _loop_stem_to_length(stem_cache[seg.mood], seg_len, offset_samples=i_start)

        in_xf_n = int(round((seg.start + prev_xf_s - eff_start) * sample_rate)) if has_prev else 0
        out_xf_start_local = (seg_len - int(round((eff_end - (seg.end - next_xf_s)) * sample_rate))) if has_next else seg_len

        for local_i in range(seg_len):
            g = seg.volume
            if has_prev and in_xf_n > 0 and local_i < in_xf_n:
                _, g_in = crossfade_gains(local_i / in_xf_n, shape=cfg.crossfade_shape)
                g *= g_in
            if has_next and local_i >= out_xf_start_local:
                rem_len = max(1, seg_len - out_xf_start_local)
                g_out, _ = crossfade_gains((local_i - out_xf_start_local) / rem_len, shape=cfg.crossfade_shape)
                g *= g_out
            out_idx = i_start + local_i
            mix[0][out_idx] += stem_looped[0][local_i] * g
            mix[1][out_idx] += stem_looped[1][local_i] * g

    # 3. Apply master bed volume, logarithmic fade-in/out, and narration ducking envelope
    fade_env = compute_fade_envelope(
        num_samples=n_samples,
        sample_rate=sample_rate,
        fade_in=cfg.fade_in,
        fade_out=cfg.fade_out,
        curve=cfg.fade_curve,
    )
    duck_env = (
        compute_ducking_envelope(
            num_samples=n_samples,
            sample_rate=sample_rate,
            narration_intervals=active_intervals,
            depth_db=cfg.duck_depth_db,
            attack=cfg.duck_attack,
            release=cfg.duck_release,
            hold=cfg.duck_hold,
        )
        if cfg.ducking
        else [1.0] * n_samples
    )

    vol = cfg.volume
    for i in range(n_samples):
        g = vol * fade_env[i] * duck_env[i]
        mix[0][i] *= g
        mix[1][i] *= g

    mix = apply_peak_ceiling(mix, peak_ceiling_db=cfg.peak_ceiling_db)
    measured = measure_lufs(mix, sample_rate)
    digest = pcm_sha256(mix)

    if out_wav_path:
        write_wav(out_wav_path, mix, sample_rate=sample_rate)

    return {
        "enabled": True,
        "duration": dur_s,
        "sample_rate": sample_rate,
        "samples": mix,
        "lufs_measured": round(measured, 3),
        "sha256": digest,
        "config": cfg,
        "narration_intervals": active_intervals,
        "fade_curve": cfg.fade_curve,
        "crossfade_shape": cfg.crossfade_shape,
    }


def _ffmpeg_curve_name(curve: str) -> str:
    return {
        "log": "log",
        "exp": "exp",
        "scurve": "hsin",
        "linear": "tri",
    }.get(curve, "log")


def _ffmpeg_xfade_curve(shape: str) -> str:
    return {
        "equal_power": "qsin",
        "sqrt_power": "qsin",
        "linear": "tri",
        "log": "log",
    }.get(shape, "qsin")


def build_ffmpeg_filter_complex(
    video_source: str | pathlib.Path | dict[str, Any],
    khordegir_root: pathlib.Path | str | None = None,
    narration_intervals: Sequence[tuple[float, float]] | None = None,
) -> dict[str, Any]:
    """Build deterministic FFmpeg inputs & `-filter_complex` string matching `music` block."""
    root = pathlib.Path(khordegir_root).resolve() if khordegir_root else KHODEGIR_ROOT
    data = load_video_yaml(video_source)
    cfg = parse_music_block(data, khordegir_root=root)
    derived_intervals, dur_s = extract_narration_intervals(data)
    active_intervals = list(narration_intervals) if narration_intervals is not None else derived_intervals

    if not cfg.enabled or not cfg.segments:
        return {"enabled": False, "inputs": [], "filter_complex": "", "config": cfg}

    inputs: list[str] = []
    filters: list[str] = []
    seg_labels: list[str] = []

    for idx, seg in enumerate(cfg.segments):
        res = resolve_mood(seg.mood, khordegir_root=root)
        inputs.extend(["-stream_loop", "-1", "-i", str(res.abs_path)])
        seg_dur = max(0.2, seg.end - seg.start)
        lbl = f"mseg{idx}"
        filters.append(
            f"[{idx}:a]atrim=duration={seg_dur:.4f},asetpts=PTS-STARTPTS,"
            f"loudnorm=I={cfg.lufs_target:.1f}:TP={cfg.peak_ceiling_db:.1f}:LRA=9,"
            f"volume={seg.volume:.4f}[{lbl}]"
        )
        seg_labels.append(lbl)

    cur_lbl = seg_labels[0]
    xf_curve = _ffmpeg_xfade_curve(cfg.crossfade_shape)
    for idx in range(1, len(seg_labels)):
        nxt_lbl = seg_labels[idx]
        out_lbl = f"mxf{idx}"
        xf_d = max(0.05, min(cfg.crossfade_dur, 0.45 * (cfg.segments[idx].end - cfg.segments[idx].start)))
        filters.append(
            f"[{cur_lbl}][{nxt_lbl}]acrossfade=d={xf_d:.4f}:c1={xf_curve}:c2={xf_curve}[{out_lbl}]"
        )
        cur_lbl = out_lbl

    # Piecewise linear/smoothed ducking expression for FFmpeg volume filter
    duck_lin = 10.0 ** (cfg.duck_depth_db / 20.0)
    if cfg.ducking and active_intervals:
        expr = "1"
        for s0, e0 in reversed(active_intervals):
            att = max(0.02, cfg.duck_attack)
            rel = max(0.04, cfg.duck_release)
            s_pre = max(0.0, s0 - 0.5 * att)
            e_hold = e0 + cfg.duck_hold
            s_end = s_pre + att
            r_end = e_hold + rel
            expr = (
                f"if(between(t,{s_pre:.3f},{s_end:.3f}),"
                f"1-(1-{duck_lin:.4f})*(t-{s_pre:.3f})/{att:.3f},"
                f"if(between(t,{s_end:.3f},{e_hold:.3f}),{duck_lin:.4f},"
                f"if(between(t,{e_hold:.3f},{r_end:.3f}),"
                f"{duck_lin:.4f}+(1-{duck_lin:.4f})*(t-{e_hold:.3f})/{rel:.3f},{expr})))"
            )
        duck_filter = f",volume='{expr}':eval=frame"
    else:
        duck_filter = ""

    curve_name = _ffmpeg_curve_name(cfg.fade_curve)
    fade_out_st = max(0.0, dur_s - cfg.fade_out)
    final_chain = (
        f"[{cur_lbl}]atrim=duration={dur_s:.4f},asetpts=PTS-STARTPTS,"
        f"volume={cfg.volume:.4f}{duck_filter}"
    )
    if cfg.fade_in > 0:
        final_chain += f",afade=t=in:st=0:d={cfg.fade_in:.4f}:curve={curve_name}"
    if cfg.fade_out > 0:
        final_chain += f",afade=t=out:st={fade_out_st:.4f}:d={cfg.fade_out:.4f}:curve={curve_name}"
    final_chain += "[music_out]"
    filters.append(final_chain)

    return {
        "enabled": True,
        "inputs": inputs,
        "filter_complex": ";".join(filters),
        "output_pad": "[music_out]",
        "duration": dur_s,
        "config": cfg,
    }
