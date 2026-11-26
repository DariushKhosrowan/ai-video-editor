"""Offline, deterministic captions / subtitles module for Khordegir Studio.

SPDX-License-Identifier: MIT

Follows open-source standards & MIT/Apache-2.0 patterns:
  - W3C WebVTT specification (REGION, STYLE, cue settings: region, align)
  - SubRip (.srt) standard cue blocks with millisecond comma timestamps
  - Unicode UAX #9 Bidirectional Algorithm directional isolates (RLI/LRI/PDI + RLM)
  - WCAG 2.1 AA contrast ratios (>= 4.5:1) for all default caption styles

Design principles:
  - Additive & zero-impact: when the top-level ``captions`` block is absent from
    ``video.yaml``, nothing is generated and existing outputs stay byte-identical.
  - ``video.yaml`` remains the single source of truth.
  - Beginner one-click defaults: a cue with only ``text`` already works; harder
    tuning controls live exclusively inside ``style.advanced``.
  - 100% offline, deterministic (no random/clock/network calls), zoom cap <= 1.06,
    supports ``landscape`` (16:9), ``portrait`` (9:16), and ``square`` (1:1).
"""
from __future__ import annotations

from dataclasses import dataclass, field
import math
from pathlib import Path
import re
from typing import Any, Mapping, Sequence

try:
    import yaml
except ImportError:  # pragma: no cover
    yaml = None  # type: ignore[assignment]


# ---------------------------------------------------------------------------
# Constants & Open-Source Design Tokens (aligned with stage/motion-tokens.js)
# ---------------------------------------------------------------------------
STAGE_ZOOM_CAP = 1.06
DEFAULT_CUE_DURATION = 3.0
DEFAULT_LANG = "fa"
SUPPORTED_LANGS = ("fa", "en")
VALID_FORMATS = ("landscape", "portrait", "square")

VALID_CAPTION_KEYS = frozenset({"text", "start", "end", "lang", "style"})
VALID_STYLE_KEYS = frozenset({"preset", "position", "advanced"})
VALID_ADVANCED_STYLE_KEYS = frozenset(
    {
        "font_scale",
        "line_height",
        "bg_opacity",
        "margin_bottom",
        "max_chars_per_line",
        "zoom",
        "text_color",
        "bg_color",
    }
)
VALID_POSITIONS = ("bottom", "top")

# Unicode UAX #9 Bidirectional Algorithm markers
LRI = "\u2066"  # LEFT-TO-RIGHT ISOLATE
RLI = "\u2067"  # RIGHT-TO-LEFT ISOLATE
PDI = "\u2069"  # POP DIRECTIONAL ISOLATE
LRM = "\u200E"  # LEFT-TO-RIGHT MARK
RLM = "\u200F"  # RIGHT-TO-LEFT MARK

_PERSIAN_CHAR_RE = re.compile(r"[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]")
_LATIN_CHAR_RE = re.compile(r"[A-Za-z]")
_LATIN_RUN_RE = re.compile(
    r"[A-Za-z][A-Za-z0-9._:/+-]*(?:\s+[A-Za-z0-9._:/+-]*[A-Za-z0-9])*"
)
_RTL_CHAR_CLS = r"[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]"
_RTL_WORD_PAT = rf"{_RTL_CHAR_CLS}(?:[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\u200C\u200D]*{_RTL_CHAR_CLS})?"
_RTL_RUN_RE = re.compile(rf"{_RTL_WORD_PAT}(?:\s+{_RTL_WORD_PAT})*")

# Format-specific safe-area layout presets (mirrors motion-tokens.js FORMATS)
FORMAT_LAYOUTS: dict[str, dict[str, Any]] = {
    "landscape": {
        "name": "landscape",
        "width": 1920,
        "height": 1080,
        "region_width_pct": 80,
        "bottom_anchor_y_pct": 92,
        "top_anchor_y_pct": 8,
        "max_chars_per_line": 42,
        "font_size_px": 44,
        "margin_bottom_px": 86,
        "max_lines": 2,
    },
    "portrait": {
        "name": "portrait",
        "width": 1080,
        "height": 1920,
        "region_width_pct": 86,
        "bottom_anchor_y_pct": 82,
        "top_anchor_y_pct": 12,
        "max_chars_per_line": 26,
        "font_size_px": 40,
        "margin_bottom_px": 340,
        "max_lines": 2,
    },
    "square": {
        "name": "square",
        "width": 1080,
        "height": 1080,
        "region_width_pct": 84,
        "bottom_anchor_y_pct": 88,
        "top_anchor_y_pct": 10,
        "max_chars_per_line": 32,
        "font_size_px": 40,
        "margin_bottom_px": 128,
        "max_lines": 2,
    },
}

# WCAG 2.1 AA (>= 4.5:1) verified caption style presets
STYLE_PRESETS: dict[str, dict[str, Any]] = {
    "default": {
        "text_color": "#FFFFFF",
        "bg_color": "#121212",
        "bg_opacity": 0.88,
        "font_scale": 1.0,
        "line_height": 1.45,
        "zoom": 1.0,
    },
    "high-contrast": {
        "text_color": "#FFD600",
        "bg_color": "#000000",
        "bg_opacity": 0.96,
        "font_scale": 1.08,
        "line_height": 1.5,
        "zoom": 1.0,
    },
    "minimal": {
        "text_color": "#F8FAFC",
        "bg_color": "#0F172A",
        "bg_opacity": 0.72,
        "font_scale": 0.96,
        "line_height": 1.4,
        "zoom": 1.0,
    },
    "cinema": {
        "text_color": "#FAF6EE",
        "bg_color": "#161719",
        "bg_opacity": 0.82,
        "font_scale": 1.0,
        "line_height": 1.45,
        "zoom": 1.0,
    },
}

_HEX_COLOR_RE = re.compile(r"^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$")


@dataclass(frozen=True)
class CaptionCue:
    """Normalized, immutable caption cue."""

    index: int
    text: str
    start: float
    end: float
    lang: str
    style: dict[str, Any] = field(default_factory=dict)

    @property
    def duration(self) -> float:
        return round(self.end - self.start, 3)

    @property
    def direction(self) -> str:
        return "rtl" if self.lang == "fa" else "ltr"

    def to_dict(self) -> dict[str, Any]:
        return {
            "index": self.index,
            "text": self.text,
            "start": self.start,
            "end": self.end,
            "lang": self.lang,
            "direction": self.direction,
            "style": dict(self.style),
        }


# ---------------------------------------------------------------------------
# Contrast & Layout Utilities
# ---------------------------------------------------------------------------
def _srgb_luminance(hex_color: str) -> float:
    clean = hex_color.lstrip("#")
    if len(clean) == 3:
        clean = "".join(c * 2 for c in clean)
    r = int(clean[0:2], 16) / 255.0
    g = int(clean[2:4], 16) / 255.0
    b = int(clean[4:6], 16) / 255.0
    channels = [
        c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
        for c in (r, g, b)
    ]
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]


def contrast_ratio(hex1: str, hex2: str) -> float:
    """Return WCAG 2.1 relative contrast ratio rounded to 2 decimals."""
    l1 = _srgb_luminance(hex1)
    l2 = _srgb_luminance(hex2)
    brightest = max(l1, l2)
    darkest = min(l1, l2)
    return round((brightest + 0.05) / (darkest + 0.05), 2)


def validate_format(fmt: str | None) -> str:
    """Normalize and validate display format (landscape, portrait, square)."""
    if fmt is None:
        return "landscape"
    if not isinstance(fmt, str):
        raise TypeError(f"Captions: wrong type for format: expected string, got {type(fmt).__name__}")
    clean = fmt.strip().lower()
    if clean not in VALID_FORMATS:
        raise ValueError(
            f"Captions: unknown format {fmt!r}. Allowed formats: {', '.join(VALID_FORMATS)}"
        )
    return clean


def detect_lang(text: str) -> str:
    """Deterministically detect 'fa' or 'en' from caption text."""
    if _PERSIAN_CHAR_RE.search(text):
        return "fa"
    if _LATIN_CHAR_RE.search(text):
        return "en"
    return DEFAULT_LANG


def _validate_number(value: Any, *, field_name: str, where: str, allow_zero: bool = True) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise TypeError(
            f"{where}: '{field_name}' must be a number (seconds), got {type(value).__name__}"
        )
    fval = float(value)
    if not math.isfinite(fval):
        raise ValueError(f"{where}: '{field_name}' must be a finite number, got {value!r}")
    if fval < 0 or (not allow_zero and fval == 0):
        op = ">=" if allow_zero else ">"
        raise ValueError(f"{where}: '{field_name}' must be {op} 0, got {value!r}")
    return round(fval, 3)


def normalize_style(raw_style: Any, *, where: str = "Caption") -> dict[str, Any]:
    """Validate and resolve beginner defaults + optional Advanced style section."""
    preset_name = "default"
    position = "bottom"
    adv_in: dict[str, Any] = {}

    if raw_style is None:
        pass
    elif isinstance(raw_style, str):
        clean_preset = raw_style.strip().lower()
        if clean_preset not in STYLE_PRESETS:
            raise ValueError(
                f"{where}: unknown style preset {raw_style!r}. "
                f"Allowed presets: {', '.join(sorted(STYLE_PRESETS))}"
            )
        preset_name = clean_preset
    elif isinstance(raw_style, Mapping):
        unknown = set(raw_style.keys()) - VALID_STYLE_KEYS
        if unknown:
            raise ValueError(
                f"{where}: unknown key(s) in style: {', '.join(sorted(unknown))}. "
                f"Allowed keys: {', '.join(sorted(VALID_STYLE_KEYS))}"
            )
        if "preset" in raw_style and raw_style["preset"] is not None:
            raw_preset = raw_style["preset"]
            if not isinstance(raw_preset, str):
                raise TypeError(
                    f"{where}: style 'preset' must be a string, got {type(raw_preset).__name__}"
                )
            clean_preset = raw_preset.strip().lower()
            if clean_preset not in STYLE_PRESETS:
                raise ValueError(
                    f"{where}: unknown style preset {raw_preset!r}. "
                    f"Allowed presets: {', '.join(sorted(STYLE_PRESETS))}"
                )
            preset_name = clean_preset
        if "position" in raw_style and raw_style["position"] is not None:
            raw_pos = raw_style["position"]
            if not isinstance(raw_pos, str):
                raise TypeError(
                    f"{where}: style 'position' must be a string, got {type(raw_pos).__name__}"
                )
            clean_pos = raw_pos.strip().lower()
            if clean_pos not in VALID_POSITIONS:
                raise ValueError(
                    f"{where}: unknown style position {raw_pos!r}. "
                    f"Allowed positions: {', '.join(VALID_POSITIONS)}"
                )
            position = clean_pos
        if "advanced" in raw_style and raw_style["advanced"] is not None:
            raw_adv = raw_style["advanced"]
            if not isinstance(raw_adv, Mapping):
                raise TypeError(
                    f"{where}: style 'advanced' must be a mapping, got {type(raw_adv).__name__}"
                )
            unknown_adv = set(raw_adv.keys()) - VALID_ADVANCED_STYLE_KEYS
            if unknown_adv:
                raise ValueError(
                    f"{where}: unknown key(s) in style.advanced: {', '.join(sorted(unknown_adv))}. "
                    f"Allowed keys: {', '.join(sorted(VALID_ADVANCED_STYLE_KEYS))}"
                )
            adv_in = dict(raw_adv)
    else:
        raise TypeError(
            f"{where}: 'style' must be a string preset or mapping, got {type(raw_style).__name__}"
        )

    resolved = dict(STYLE_PRESETS[preset_name])
    resolved["preset"] = preset_name
    resolved["position"] = position

    advanced_resolved: dict[str, Any] = {}
    if "font_scale" in adv_in and adv_in["font_scale"] is not None:
        fs = _validate_number(adv_in["font_scale"], field_name="style.advanced.font_scale", where=where, allow_zero=False)
        if not (0.75 <= fs <= 1.5):
            raise ValueError(f"{where}: 'style.advanced.font_scale' must be between 0.75 and 1.5, got {fs}")
        resolved["font_scale"] = fs
        advanced_resolved["font_scale"] = fs
    if "line_height" in adv_in and adv_in["line_height"] is not None:
        lh = _validate_number(adv_in["line_height"], field_name="style.advanced.line_height", where=where, allow_zero=False)
        if not (1.1 <= lh <= 2.2):
            raise ValueError(f"{where}: 'style.advanced.line_height' must be between 1.1 and 2.2, got {lh}")
        resolved["line_height"] = lh
        advanced_resolved["line_height"] = lh
    if "bg_opacity" in adv_in and adv_in["bg_opacity"] is not None:
        op = _validate_number(adv_in["bg_opacity"], field_name="style.advanced.bg_opacity", where=where, allow_zero=True)
        if not (0.0 <= op <= 1.0):
            raise ValueError(f"{where}: 'style.advanced.bg_opacity' must be between 0.0 and 1.0, got {op}")
        resolved["bg_opacity"] = op
        advanced_resolved["bg_opacity"] = op
    if "margin_bottom" in adv_in and adv_in["margin_bottom"] is not None:
        mb = _validate_number(adv_in["margin_bottom"], field_name="style.advanced.margin_bottom", where=where, allow_zero=True)
        if mb > 500:
            raise ValueError(f"{where}: 'style.advanced.margin_bottom' must be <= 500, got {mb}")
        resolved["margin_bottom"] = mb
        advanced_resolved["margin_bottom"] = mb
    if "max_chars_per_line" in adv_in and adv_in["max_chars_per_line"] is not None:
        mc = adv_in["max_chars_per_line"]
        if isinstance(mc, bool) or not isinstance(mc, int):
            raise TypeError(
                f"{where}: 'style.advanced.max_chars_per_line' must be an integer, got {type(mc).__name__}"
            )
        if not (16 <= mc <= 120):
            raise ValueError(
                f"{where}: 'style.advanced.max_chars_per_line' must be between 16 and 120, got {mc}"
            )
        resolved["max_chars_per_line"] = mc
        advanced_resolved["max_chars_per_line"] = mc
    if "zoom" in adv_in and adv_in["zoom"] is not None:
        zm = _validate_number(adv_in["zoom"], field_name="style.advanced.zoom", where=where, allow_zero=False)
        if not (0.5 <= zm <= STAGE_ZOOM_CAP):
            raise ValueError(
                f"{where}: 'style.advanced.zoom' must be between 0.5 and {STAGE_ZOOM_CAP}, got {zm}"
            )
        resolved["zoom"] = zm
        advanced_resolved["zoom"] = zm
    for color_key in ("text_color", "bg_color"):
        if color_key in adv_in and adv_in[color_key] is not None:
            cval = adv_in[color_key]
            if not isinstance(cval, str) or not _HEX_COLOR_RE.match(cval.strip()):
                raise ValueError(
                    f"{where}: 'style.advanced.{color_key}' must be a hex color (#RGB or #RRGGBB), got {cval!r}"
                )
            resolved[color_key] = cval.strip()
            advanced_resolved[color_key] = cval.strip()

    if contrast_ratio(resolved["text_color"], resolved["bg_color"]) < 4.5:
        raise ValueError(
            f"{where}: caption text_color {resolved['text_color']} on bg_color {resolved['bg_color']} "
            f"fails WCAG AA contrast >= 4.5:1"
        )

    resolved["advanced"] = advanced_resolved
    return resolved


# ---------------------------------------------------------------------------
# Source extraction & duration helpers (single source of truth = video.yaml)
# ---------------------------------------------------------------------------
def _load_yaml_data(source: Any) -> tuple[dict[str, Any], str, float | None]:
    """Return ``(raw_dict, format_name, inferred_duration)`` without altering source."""
    if hasattr(source, "data") and isinstance(getattr(source, "data"), Mapping):
        raw_data = dict(source.data)
        fmt = validate_format(getattr(source, "format", None) or raw_data.get("format"))
        inferred = resolve_video_duration(source)
        return raw_data, fmt, inferred

    if isinstance(source, (str, Path)):
        p = Path(source).expanduser().resolve()
        if p.is_dir():
            cands = [p / name for name in ("video.yaml", "video.yml", "project.yaml", "project.json")]
            yaml_path = next((c for c in cands if c.exists()), None)
            if yaml_path is None:
                raise FileNotFoundError(f"Captions: no video.yaml found in {p}")
            p = yaml_path
        txt = p.read_text(encoding="utf-8")
        if p.suffix.lower() == ".json":
            import json

            raw_data = json.loads(txt) or {}
        else:
            if yaml is None:
                raise RuntimeError("pyyaml is required to read video.yaml")
            raw_data = yaml.safe_load(txt) or {}
        if not isinstance(raw_data, Mapping):
            raise TypeError(f"Captions: {p.name} root must be a mapping, got {type(raw_data).__name__}")
        raw_dict = dict(raw_data)
        fmt = validate_format(raw_dict.get("format"))
        return raw_dict, fmt, resolve_video_duration(raw_dict)

    if isinstance(source, Mapping):
        raw_dict = dict(source)
        fmt = validate_format(raw_dict.get("format"))
        return raw_dict, fmt, resolve_video_duration(raw_dict)

    raise TypeError(
        f"Captions: expected Project, mapping, or path to video.yaml, got {type(source).__name__}"
    )


def resolve_video_duration(source: Any) -> float | None:
    """Return total duration in seconds when every renderable slide declares numeric duration.

    Returns ``None`` if slide durations are omitted/dynamic so cues are not
    unexpectedly truncated when no explicit duration ceiling exists.
    """
    if hasattr(source, "slides") and hasattr(source, "data"):
        slides = source.slides
        default_dur = getattr(source, "default_duration", None)
    elif isinstance(source, Mapping):
        slides = source.get("slides") or []
        default_dur = source.get("duration")
    else:
        return None

    if not isinstance(slides, Sequence) or isinstance(slides, (str, bytes)) or not slides:
        return None

    total = 0.0
    counted = 0
    for slide in slides:
        if not isinstance(slide, Mapping):
            continue
        dur = slide.get("duration", default_dur)
        if dur is None or isinstance(dur, bool) or not isinstance(dur, (int, float)):
            return None
        f_dur = float(dur)
        if not math.isfinite(f_dur) or f_dur <= 0:
            return None
        total += f_dur
        counted += 1
    return round(total, 3) if counted > 0 else None


def has_captions(source: Any) -> bool:
    """Return True iff the source defines a non-None top-level 'captions' block."""
    if isinstance(source, list):
        return True
    raw_data, _, _ = _load_yaml_data(source)
    return "captions" in raw_data and raw_data["captions"] is not None


# ---------------------------------------------------------------------------
# Parsing, validation, and duration clamping
# ---------------------------------------------------------------------------
def clamp_cues_to_duration(
    cues: Sequence[CaptionCue],
    video_duration: float,
) -> tuple[list[CaptionCue], list[str]]:
    """Clamp or drop cues extending past ``video_duration`` deterministically."""
    dur = _validate_number(video_duration, field_name="video_duration", where="Captions", allow_zero=False)
    kept: list[CaptionCue] = []
    warnings: list[str] = []

    for cue in cues:
        if cue.start >= dur:
            warnings.append(
                f"Caption {cue.index}: starts at {cue.start:.3f}s (>= video duration {dur:.3f}s) and was skipped."
            )
            continue
        if cue.end > dur:
            clamped_end = round(dur, 3)
            if clamped_end <= cue.start:
                warnings.append(
                    f"Caption {cue.index}: clamped duration <= 0s at video duration {dur:.3f}s and was skipped."
                )
                continue
            warnings.append(
                f"Caption {cue.index}: end {cue.end:.3f}s exceeded video duration {dur:.3f}s; clamped to {clamped_end:.3f}s."
            )
            kept.append(
                CaptionCue(
                    index=len(kept) + 1,
                    text=cue.text,
                    start=cue.start,
                    end=clamped_end,
                    lang=cue.lang,
                    style=dict(cue.style),
                )
            )
        else:
            kept.append(
                CaptionCue(
                    index=len(kept) + 1,
                    text=cue.text,
                    start=cue.start,
                    end=cue.end,
                    lang=cue.lang,
                    style=dict(cue.style),
                )
            )

    return kept, warnings


def parse_captions(
    source: Any,
    *,
    video_duration: float | None = None,
    warnings: list[str] | None = None,
) -> list[CaptionCue] | None:
    """Parse and validate the optional top-level ``captions`` block from ``video.yaml``.

    Returns ``None`` when ``captions`` is absent (or ``None``) so callers keep
    exact existing behavior. Raises ``TypeError`` or ``ValueError`` with clear
    messages on invalid blocks.
    """
    inferred_duration: float | None = None
    if isinstance(source, list):
        raw_captions: Any = source
    elif isinstance(source, Mapping) and "captions" not in source and "slides" not in source:
        # Dict passed directly as a project mapping without 'captions' key
        return None
    else:
        raw_data, _, inferred_duration = _load_yaml_data(source)
        if "captions" not in raw_data or raw_data["captions"] is None:
            return None
        raw_captions = raw_data["captions"]

    if not isinstance(raw_captions, list):
        raise TypeError(
            f"Captions: 'captions' must be a list of items, got {type(raw_captions).__name__}"
        )

    cues: list[CaptionCue] = []
    prev_end = 0.0

    for idx, item in enumerate(raw_captions, start=1):
        where = f"Caption {idx}"
        if not isinstance(item, Mapping):
            raise TypeError(
                f"{where}: expected a mapping/dict with keys (text, start, end, lang, style), "
                f"got {type(item).__name__}"
            )

        unknown_keys = set(item.keys()) - VALID_CAPTION_KEYS
        if unknown_keys:
            raise ValueError(
                f"{where}: unknown key(s): {', '.join(sorted(unknown_keys))}. "
                f"Allowed keys: {', '.join(sorted(VALID_CAPTION_KEYS))}"
            )

        if "text" not in item or item["text"] is None:
            raise ValueError(f"{where}: missing required key 'text'")
        raw_text = item["text"]
        if not isinstance(raw_text, str):
            raise TypeError(f"{where}: 'text' must be a string, got {type(raw_text).__name__}")
        clean_text = raw_text.strip()
        if not clean_text:
            raise ValueError(f"{where}: 'text' must not be empty")

        if "start" not in item or item["start"] is None:
            start = prev_end
        else:
            start = _validate_number(item["start"], field_name="start", where=where, allow_zero=True)

        if "end" not in item or item["end"] is None:
            end = round(start + DEFAULT_CUE_DURATION, 3)
        else:
            end = _validate_number(item["end"], field_name="end", where=where, allow_zero=True)

        if end <= start:
            raise ValueError(
                f"{where}: 'end' ({end}) must be after 'start' ({start})"
            )

        if "lang" not in item or item["lang"] is None:
            lang = detect_lang(clean_text)
        else:
            raw_lang = item["lang"]
            if not isinstance(raw_lang, str):
                raise TypeError(f"{where}: 'lang' must be a string ('fa' or 'en'), got {type(raw_lang).__name__}")
            lang = raw_lang.strip().lower()
            if lang not in SUPPORTED_LANGS:
                raise ValueError(
                    f"{where}: unknown lang {raw_lang!r}. Allowed languages: {', '.join(SUPPORTED_LANGS)}"
                )

        style = normalize_style(item.get("style"), where=where)
        cues.append(CaptionCue(index=idx, text=clean_text, start=start, end=end, lang=lang, style=style))
        prev_end = end

    effective_duration = video_duration if video_duration is not None else inferred_duration
    if effective_duration is not None:
        cues, dur_warnings = clamp_cues_to_duration(cues, effective_duration)
        if warnings is not None:
            warnings.extend(dur_warnings)

    return cues


# ---------------------------------------------------------------------------
# Unicode Bidi-safe wrapping & RTL/LTR isolation (deterministic)
# ---------------------------------------------------------------------------
def _isolate_embedded_runs(line: str, lang: str) -> str:
    """Wrap embedded opposite-script runs in Unicode directional isolates."""
    if lang == "fa":
        def _wrap_ltr(match: re.Match[str]) -> str:
            token = match.group(0)
            return f"{LRI}{token}{PDI}"

        return _LATIN_RUN_RE.sub(_wrap_ltr, line)

    def _wrap_rtl(match: re.Match[str]) -> str:
        token = match.group(0)
        return f"{RLI}{RLM}{token}{PDI}"

    return _RTL_RUN_RE.sub(_wrap_rtl, line)


def wrap_bidi_line(line: str, lang: str) -> str:
    """Wrap a single line deterministically with UAX #9 directional isolates."""
    isolated = _isolate_embedded_runs(line, lang)
    if lang == "fa":
        return f"{RLI}{RLM}{isolated}{PDI}"
    return f"{LRI}{isolated}{PDI}"


def wrap_caption_text(text: str, lang: str, *, max_chars: int = 42) -> list[str]:
    """Deterministically wrap caption text into lines and apply bidi-safe wrapping."""
    if lang not in SUPPORTED_LANGS:
        raise ValueError(f"Unknown lang {lang!r}. Allowed: {', '.join(SUPPORTED_LANGS)}")

    paragraphs = [p.strip() for p in text.replace("\r\n", "\n").replace("\r", "\n").split("\n")]
    raw_lines: list[str] = []

    for para in paragraphs:
        if not para:
            continue
        words = para.split()
        current = ""
        for word in words:
            candidate = f"{current} {word}".strip() if current else word
            if current and len(candidate) > max_chars:
                raw_lines.append(current)
                current = word
            else:
                current = candidate
        if current:
            raw_lines.append(current)

    if not raw_lines:
        raw_lines = [text.strip()]

    return [wrap_bidi_line(line, lang) for line in raw_lines]


# ---------------------------------------------------------------------------
# SRT & WebVTT formatters
# ---------------------------------------------------------------------------
def format_srt_timestamp(seconds: float) -> str:
    """Format seconds as ``HH:MM:SS,mmm`` (SubRip standard)."""
    total_ms = int(round(seconds * 1000))
    hours, rem = divmod(total_ms, 3_600_000)
    minutes, rem = divmod(rem, 60_000)
    secs, ms = divmod(rem, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{ms:03d}"


def format_vtt_timestamp(seconds: float) -> str:
    """Format seconds as ``HH:MM:SS.mmm`` (W3C WebVTT standard)."""
    return format_srt_timestamp(seconds).replace(",", ".")


def _escape_vtt_text(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def compute_caption_layout(fmt: str = "landscape", style: Mapping[str, Any] | None = None) -> dict[str, Any]:
    """Compute format-aware safe-zone layout metrics for landscape/portrait/square."""
    clean_fmt = validate_format(fmt)
    base = dict(FORMAT_LAYOUTS[clean_fmt])
    st = dict(style or STYLE_PRESETS["default"])
    max_chars = int(st.get("max_chars_per_line") or base["max_chars_per_line"])
    font_scale = float(st.get("font_scale") or 1.0)
    zoom = min(float(st.get("zoom") or 1.0), STAGE_ZOOM_CAP)
    base["max_chars_per_line"] = max_chars
    base["effective_font_size_px"] = round(base["font_size_px"] * font_scale * zoom, 2)
    base["zoom"] = zoom
    return base


def _rgba_css(hex_color: str, opacity: float) -> str:
    clean = hex_color.lstrip("#")
    if len(clean) == 3:
        clean = "".join(c * 2 for c in clean)
    r = int(clean[0:2], 16)
    g = int(clean[2:4], 16)
    b = int(clean[4:6], 16)
    return f"rgba({r}, {g}, {b}, {opacity:.2f})"


def render_srt(cues: Sequence[CaptionCue], *, video_format: str = "landscape") -> str:
    """Render normalized cues to deterministic UTF-8 SubRip (.srt) text."""
    clean_fmt = validate_format(video_format)
    blocks: list[str] = []
    for idx, cue in enumerate(cues, start=1):
        layout = compute_caption_layout(clean_fmt, cue.style)
        lines = wrap_caption_text(cue.text, cue.lang, max_chars=layout["max_chars_per_line"])
        ts = f"{format_srt_timestamp(cue.start)} --> {format_srt_timestamp(cue.end)}"
        blocks.append(f"{idx}\n{ts}\n" + "\n".join(lines))
    return ("\n\n".join(blocks) + "\n") if blocks else ""


def render_vtt(cues: Sequence[CaptionCue], *, video_format: str = "landscape") -> str:
    """Render normalized cues to deterministic W3C WebVTT (.vtt) with RTL regions & align."""
    clean_fmt = validate_format(video_format)
    fmt_layout = FORMAT_LAYOUTS[clean_fmt]
    reg_w = fmt_layout["region_width_pct"]
    bot_y = fmt_layout["bottom_anchor_y_pct"]
    top_y = fmt_layout["top_anchor_y_pct"]
    max_lines = fmt_layout["max_lines"]

    default_style = STYLE_PRESETS["default"]
    bg_rgba = _rgba_css(default_style["bg_color"], default_style["bg_opacity"])

    parts: list[str] = [
        "WEBVTT",
        "",
        "STYLE",
        "::cue {",
        "  font-family: Vazirmatn, sans-serif;",
        f"  color: {default_style['text_color']};",
        f"  background-color: {bg_rgba};",
        f"  line-height: {default_style['line_height']};",
        "}",
        "::cue(.fa) {",
        "  direction: rtl;",
        "  unicode-bidi: isolate;",
        "  text-align: right;",
        "}",
        "::cue(.en) {",
        "  direction: ltr;",
        "  unicode-bidi: isolate;",
        "  text-align: left;",
        "}",
        "",
    ]

    regions = (
        ("fa_bottom", bot_y, 100),
        ("en_bottom", bot_y, 100),
        ("fa_top", top_y, 0),
        ("en_top", top_y, 0),
    )
    for region_id, anchor_y, region_anchor_y in regions:
        parts.extend(
            [
                "REGION",
                f"id:{region_id}",
                f"width:{reg_w}%",
                f"lines:{max_lines}",
                f"regionanchor:50%,{region_anchor_y}%",
                f"viewportanchor:50%,{anchor_y}%",
                "scroll:up",
                "",
            ]
        )

    for idx, cue in enumerate(cues, start=1):
        layout = compute_caption_layout(clean_fmt, cue.style)
        pos = cue.style.get("position", "bottom")
        region_id = f"{cue.lang}_{pos}"
        align = "right" if cue.lang == "fa" else "left"
        lines = wrap_caption_text(cue.text, cue.lang, max_chars=layout["max_chars_per_line"])
        escaped_payload = "\n".join(_escape_vtt_text(line) for line in lines)
        cls_tag = "fa" if cue.lang == "fa" else "en"
        ts = (
            f"{format_vtt_timestamp(cue.start)} --> {format_vtt_timestamp(cue.end)} "
            f"region:{region_id} align:{align}"
        )
        parts.append(f"{idx}\n{ts}\n<c.{cls_tag}>{escaped_payload}</c>\n")

    return "\n".join(parts)


# ---------------------------------------------------------------------------
# Project build directory writer
# ---------------------------------------------------------------------------
def write_captions(
    source: Any,
    out_dir: str | Path | None = None,
    *,
    video_duration: float | None = None,
    video_format: str | None = None,
) -> dict[str, Any] | None:
    """Write ``captions.srt`` and ``captions.vtt`` into the build directory.

    When ``captions`` is absent from ``video.yaml``, writes nothing and returns
    ``None`` so existing project outputs remain completely unchanged.
    """
    warnings: list[str] = []
    cues = parse_captions(source, video_duration=video_duration, warnings=warnings)
    if cues is None:
        return None

    if video_format is not None:
        clean_fmt = validate_format(video_format)
    elif hasattr(source, "format"):
        clean_fmt = validate_format(getattr(source, "format"))
    elif isinstance(source, Mapping):
        clean_fmt = validate_format(source.get("format"))
    elif isinstance(source, (str, Path)):
        _, clean_fmt, _ = _load_yaml_data(source)
    else:
        clean_fmt = "landscape"

    if out_dir is None:
        if hasattr(source, "out"):
            target_dir = Path(source.out)
        elif isinstance(source, (str, Path)):
            p = Path(source).expanduser().resolve()
            target_dir = (p if p.is_dir() else p.parent) / "out"
        else:
            raise ValueError("Captions: out_dir is required when source has no build directory")
    else:
        target_dir = Path(out_dir)

    target_dir.mkdir(parents=True, exist_ok=True)
    srt_path = target_dir / "captions.srt"
    vtt_path = target_dir / "captions.vtt"

    srt_content = render_srt(cues, video_format=clean_fmt)
    vtt_content = render_vtt(cues, video_format=clean_fmt)

    srt_path.write_text(srt_content, encoding="utf-8", newline="\n")
    vtt_path.write_text(vtt_content, encoding="utf-8", newline="\n")

    return {
        "cues": cues,
        "count": len(cues),
        "format": clean_fmt,
        "srt": srt_path,
        "vtt": vtt_path,
        "warnings": warnings,
    }
