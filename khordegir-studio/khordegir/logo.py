"""Logo placement config parsing (from AI Studio, extracted from project.py)."""
import math, os
from pathlib import Path

# Broadcast Logo Placement (MIT-compatible clean-room broadcast safe-area config)
LOGO_POSITIONS = ("tl", "tr", "bl", "br")
LOGO_POSITION_ALIASES = {
    "tl": "tl", "top-left": "tl", "top_left": "tl", "topleft": "tl",
    "tr": "tr", "top-right": "tr", "top_right": "tr", "topright": "tr",
    "bl": "bl", "bottom-left": "bl", "bottom_left": "bl", "bottomleft": "bl",
    "br": "br", "bottom-right": "br", "bottom_right": "br", "bottomright": "br",
}
LOGO_DEFAULT_POSITION = "br"
LOGO_DEFAULT_SIZE_PCT = 10.0
LOGO_SIZE_PCT_MIN = 4.0
LOGO_SIZE_PCT_MAX = 25.0
LOGO_DEFAULT_OPACITY = 0.9
LOGO_BLEND_MODES = ("normal", "screen", "multiply", "overlay", "soft-light", "lighten", "darken")
LOGO_DEFAULT_BLEND_MODE = "normal"
LOGO_ALLOWED_KEYS = {
    "path", "position", "size_pct", "opacity", "blend_mode",
    # Preserved legacy schema keys / aliases
    "file", "image", "corner", "size", "margin", "hide", "text",
}


def _parse_numeric_field(val, name):
    if isinstance(val, bool):
        raise ValueError(f"logo.{name} must be numeric, got bool ({val!r})")
    if isinstance(val, (int, float)):
        num = float(val)
    elif isinstance(val, str):
        s = val.strip().lower().rstrip("%").strip()
        if not s:
            raise ValueError(f"logo.{name} must be numeric, got {val!r}")
        try:
            num = float(s)
        except ValueError as exc:
            raise ValueError(f"logo.{name} must be numeric, got {val!r}") from exc
    else:
        raise ValueError(f"logo.{name} must be numeric, got {type(val).__name__}")
    if not math.isfinite(num):
        raise ValueError(f"logo.{name} must be a finite number, got {val!r}")
    return num


def norm_logo_position(raw, default=LOGO_DEFAULT_POSITION):
    if raw is None or (isinstance(raw, str) and raw.strip() == ""):
        return default
    if not isinstance(raw, str):
        raise ValueError(f"Unknown logo position {raw!r}; expected one of {LOGO_POSITIONS}")
    key = raw.strip().lower()
    if key not in LOGO_POSITION_ALIASES:
        raise ValueError(f"Unknown logo position {raw!r}; expected one of {LOGO_POSITIONS}")
    return LOGO_POSITION_ALIASES[key]


def clamp_logo_size_pct(val):
    return round(max(LOGO_SIZE_PCT_MIN, min(LOGO_SIZE_PCT_MAX, float(val))), 3)


def resolve_logo_path(raw_path, project_dir, find_fn=None):
    """Resolve logo path relative to project_dir, returning a file:// URI (or external/data URI)."""
    p_str = os.path.expanduser(str(raw_path).strip())
    if p_str.startswith(("http://", "https://", "file://", "data:", "blob:")):
        return p_str, True
    base = Path(project_dir).expanduser().resolve() if project_dir else Path.cwd().resolve()
    p = Path(p_str)
    cand = p.resolve() if p.is_absolute() else (base / p).resolve()
    if cand.is_file():
        return cand.as_uri(), True
    if find_fn is not None:
        found = find_fn(p_str)
        if found:
            fp = Path(found)
            return (fp.as_uri() if not str(found).startswith(("http", "file:", "data:")) else found), True
    return cand.as_uri(), False


def parse_logo_config(
    raw_logo,
    project_dir=None,
    find_fn=None,
    base_logo=None,
    legacy_position=None,
    warnings_out=None,
):
    """Parse and validate video.yaml top-level or per-slide `logo` configuration.

    Returns None if logo is absent/off, False if explicitly disabled on a slide (`false`/`"off"`/`"none"`),
    or a normalized, resolved dict `{path, position, size_pct, opacity, blend_mode, ...}`.
    """
    if raw_logo is None:
        return None
    if raw_logo is False or (isinstance(raw_logo, str) and raw_logo.strip().lower() in ("off", "none", "false")):
        return False
    if isinstance(raw_logo, str):
        s = raw_logo.strip()
        if not s:
            return None
        cfg = {"path": s}
    elif isinstance(raw_logo, dict):
        cfg = dict(raw_logo)
    else:
        raise ValueError(f"Invalid logo configuration type: {type(raw_logo).__name__}; expected mapping or path string")

    unknown = sorted(set(cfg.keys()) - LOGO_ALLOWED_KEYS)
    if unknown:
        raise ValueError(f"Unknown logo key(s): {unknown}; allowed: {sorted(LOGO_ALLOWED_KEYS)}")

    # Path resolution (allow base_logo inheritance for per-slide partial overrides)
    raw_path = cfg.get("path")
    if raw_path is None:
        raw_path = cfg.get("file")
    if raw_path is None:
        raw_path = cfg.get("image")

    if raw_path is None:
        if isinstance(base_logo, dict) and base_logo.get("path"):
            resolved_path = base_logo["path"]
        else:
            raise ValueError("logo.path is required and must be a non-empty string path")
    else:
        if not isinstance(raw_path, str) or not raw_path.strip():
            raise ValueError("logo.path is required and must be a non-empty string path")
        resolved_path, exists_on_disk = resolve_logo_path(raw_path, project_dir, find_fn=find_fn)
        if not exists_on_disk and warnings_out is not None:
            warnings_out.append(f"لوگو «{raw_path}» پیدا نشد؛ مسیر نسبی به پوشهٔ پروژه تنظیم شد.")

    # Position ('tl'|'tr'|'bl'|'br', default 'br')
    base_pos = base_logo.get("position", LOGO_DEFAULT_POSITION) if isinstance(base_logo, dict) else LOGO_DEFAULT_POSITION
    if "position" in cfg:
        position = norm_logo_position(cfg["position"])
    elif "corner" in cfg:
        position = norm_logo_position(cfg["corner"])
    elif legacy_position is not None and not isinstance(base_logo, dict):
        position = norm_logo_position(legacy_position, default=LOGO_DEFAULT_POSITION)
    else:
        position = base_pos

    # size_pct (% of shorter stage edge, default 10, validated (0, 100], clamped [4, 25])
    base_size = base_logo.get("size_pct", LOGO_DEFAULT_SIZE_PCT) if isinstance(base_logo, dict) else LOGO_DEFAULT_SIZE_PCT
    if "size_pct" in cfg or "size" in cfg:
        raw_sz = cfg["size_pct"] if "size_pct" in cfg else cfg["size"]
        if raw_sz is None:
            raise ValueError("logo.size_pct must be numeric, got None")
        sz_num = _parse_numeric_field(raw_sz, "size_pct")
        if sz_num <= 0.0 or sz_num > 100.0:
            raise ValueError(f"logo.size_pct out of range: {sz_num}; expected > 0 and <= 100")
        size_pct = clamp_logo_size_pct(sz_num)
        if size_pct != round(sz_num, 3) and warnings_out is not None:
            warnings_out.append(
                f"اندازهٔ لوگو ({sz_num}%) به بازهٔ استاندارد پخش ({LOGO_SIZE_PCT_MIN}–{LOGO_SIZE_PCT_MAX}%) محدود شد: {size_pct}%."
            )
    else:
        size_pct = base_size

    # opacity (0..1, default 0.9)
    base_op = base_logo.get("opacity", LOGO_DEFAULT_OPACITY) if isinstance(base_logo, dict) else LOGO_DEFAULT_OPACITY
    if "opacity" in cfg:
        raw_op = cfg["opacity"]
        if raw_op is None:
            raise ValueError("logo.opacity must be numeric, got None")
        op_num = _parse_numeric_field(raw_op, "opacity")
        if op_num < 0.0 or op_num > 1.0:
            raise ValueError(f"logo.opacity out of range: {op_num}; expected 0.0..1.0")
        opacity = round(op_num, 3)
    else:
        opacity = base_op

    # blend_mode (optional advanced option)
    base_bm = base_logo.get("blend_mode", LOGO_DEFAULT_BLEND_MODE) if isinstance(base_logo, dict) else LOGO_DEFAULT_BLEND_MODE
    if "blend_mode" in cfg and cfg["blend_mode"] is not None:
        raw_bm = cfg["blend_mode"]
        if not isinstance(raw_bm, str) or raw_bm.strip().lower() not in LOGO_BLEND_MODES:
            raise ValueError(f"Unknown logo blend_mode {raw_bm!r}; expected one of {LOGO_BLEND_MODES}")
        blend_mode = raw_bm.strip().lower()
    else:
        blend_mode = base_bm

    out = {
        "path": resolved_path,
        "position": position,
        "size_pct": size_pct,
        "opacity": opacity,
        "blend_mode": blend_mode,
    }

    # Preserve optional legacy fields cleanly when provided
    if "hide" in cfg and cfg["hide"] is not None:
        h_raw = cfg["hide"]
        out["hide"] = list(h_raw) if isinstance(h_raw, (list, tuple)) else [h_raw]
    elif isinstance(base_logo, dict) and base_logo.get("hide"):
        out["hide"] = list(base_logo["hide"])

    if "margin" in cfg and cfg["margin"] is not None:
        m_num = _parse_numeric_field(cfg["margin"], "margin")
        if m_num < 0.0 or m_num > 500.0:
            raise ValueError(f"logo.margin out of range: {m_num}; expected 0..500")
        out["margin"] = round(m_num, 2)
    elif isinstance(base_logo, dict) and "margin" in base_logo:
        out["margin"] = base_logo["margin"]

    if "text" in cfg and cfg["text"] is not None:
        out["text"] = str(cfg["text"])
    elif isinstance(base_logo, dict) and "text" in base_logo:
        out["text"] = base_logo["text"]

    return out


