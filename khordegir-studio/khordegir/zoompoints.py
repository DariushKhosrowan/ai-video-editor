"""Ordered camera zoom points (yaml zoom_points). Beginner default: off."""
import math, re
STAGE_ZOOM_CAP = 1.06
DEFAULT_ZOOM_EASE = "expOut(5)"
DEFAULT_ZOOM_DUR = 0.9
VALID_ZOOM_POINT_KEYS = {"x", "y", "scale", "at", "dur", "ease"}
_EXP_EASE_RE = re.compile(r"^exp(?:Out|In|InOut)\((\d+(?:\.\d+)?)\)$")
_GSAP_EASE_RE = re.compile(
    r"^(?:power[1-4]|expo|sine|circ|quad|cubic|quart|quint)(?:\.(?:in|out|inOut))?$"
    r"|^back(?:\.(?:in|out|inOut)(?:\(\d+(?:\.\d+)?\))?)?$"
)
_ALIAS_EASES = {"power1", "power2", "power3", "power4", "editorial", "snappy", "expo", "back", "spring", "linear", "none"}


def _is_valid_zoom_ease(ease_str):
    if ease_str in _ALIAS_EASES:
        return True
    m = _EXP_EASE_RE.match(ease_str)
    if m:
        return float(m.group(1)) > 0.0
    return bool(_GSAP_EASE_RE.match(ease_str))


def _validate_zoom_number(val, key, where):
    if isinstance(val, bool) or not isinstance(val, (int, float)):
        raise TypeError(f"{where}: Wrong type for '{key}': expected number, got {type(val).__name__}")
    num = float(val)
    if not math.isfinite(num):
        raise ValueError(f"{where}: '{key}' must be finite, got {val!r}")
    return num


def validate_zoom_points(raw, where="Project"):
    """Parse and validate ordered camera zoom points (beginner default: off / []).

    Each point accepts {x, y, scale, at, dur, ease}:
      - x, y: normalized focal coordinates in [0.0, 1.0] (default 0.5)
      - scale: zoom factor in [1.0, 1.06] (default 1.04)
      - at: start timestamp in seconds >= 0.0 (default 0.0)
      - dur: transition duration in seconds > 0.0 (default 0.9)
      - ease: GSAP / motion-tokens ease name (default 'expOut(5)')
    Returns a new list sorted stably by ascending 'at'.
    """
    if raw is None:
        return []
    if not isinstance(raw, list):
        raise TypeError(f"{where}: Wrong type for zoom_points: expected list, got {type(raw).__name__}")
    if not raw:
        return []

    normalized = []
    for idx, item in enumerate(raw):
        ctx = f"{where} zoom_points[{idx}]"
        if not isinstance(item, dict):
            raise TypeError(f"{ctx}: Expected mapping, got {type(item).__name__}")
        unknown = set(item.keys()) - VALID_ZOOM_POINT_KEYS
        if unknown:
            raise ValueError(
                f"{ctx}: Unknown key(s): {', '.join(sorted(unknown))}. "
                f"Allowed keys: {', '.join(sorted(VALID_ZOOM_POINT_KEYS))}"
            )

        x = _validate_zoom_number(item["x"], "x", ctx) if item.get("x") is not None else 0.5
        if not (0.0 <= x <= 1.0):
            raise ValueError(f"{ctx}: 'x' must be between 0.0 and 1.0, got {x}")

        y = _validate_zoom_number(item["y"], "y", ctx) if item.get("y") is not None else 0.5
        if not (0.0 <= y <= 1.0):
            raise ValueError(f"{ctx}: 'y' must be between 0.0 and 1.0, got {y}")

        scale = _validate_zoom_number(item["scale"], "scale", ctx) if item.get("scale") is not None else 1.04
        if not (1.0 <= scale <= STAGE_ZOOM_CAP):
            raise ValueError(f"{ctx}: 'scale' must be between 1.0 and {STAGE_ZOOM_CAP}, got {scale}")

        at = _validate_zoom_number(item["at"], "at", ctx) if item.get("at") is not None else 0.0
        if at < 0.0:
            raise ValueError(f"{ctx}: 'at' must be >= 0.0, got {at}")

        dur = _validate_zoom_number(item["dur"], "dur", ctx) if item.get("dur") is not None else DEFAULT_ZOOM_DUR
        if dur <= 0.0:
            raise ValueError(f"{ctx}: 'dur' must be > 0.0, got {dur}")

        raw_ease = item.get("ease")
        if raw_ease is not None:
            if not isinstance(raw_ease, str):
                raise TypeError(f"{ctx}: Wrong type for 'ease': expected string, got {type(raw_ease).__name__}")
            ease = raw_ease.strip()
            if not ease or not _is_valid_zoom_ease(ease):
                raise ValueError(f"{ctx}: Invalid ease '{raw_ease}'")
        else:
            ease = DEFAULT_ZOOM_EASE

        normalized.append({
            "x": round(x, 6),
            "y": round(y, 6),
            "scale": round(scale, 6),
            "at": round(at, 6),
            "dur": round(dur, 6),
            "ease": ease,
        })

    normalized.sort(key=lambda pt: pt["at"])
    return normalized
