"""Per-object animation presets and keyframe resolver for Khordegir Studio.

Licensed under MIT / Apache 2.0 compatible terms.
Supports beginner one-click defaults (fade-up, pop, slide, typewriter, zoom, bounce, glitch, spin)
and advanced keyframe specifications, resolved to GSAP-ready tween specs using true exponential
easing (e^-x family: expOut, expIn, expInOut).
100% deterministic, offline, single source of truth.
"""
from __future__ import annotations

import copy

# Standard beginner one-click animation presets
PRESETS = {
    "fade-up": {
        "duration": 0.5,
        "delay": 0.0,
        "ease": "expOut(5)",
        "from": {"opacity": 0.0, "y": 24.0, "scale": 0.98},
        "to": {"opacity": 1.0, "y": 0.0, "scale": 1.0},
    },
    "pop": {
        "duration": 0.45,
        "delay": 0.0,
        "ease": "expOut(5)",
        "from": {"opacity": 0.0, "scale": 0.8},
        "to": {"opacity": 1.0, "scale": 1.0},
    },
    "slide": {
        "duration": 0.5,
        "delay": 0.0,
        "ease": "expOut(5)",
        "from": {"opacity": 0.0, "x": 40.0},
        "to": {"opacity": 1.0, "x": 0.0},
    },
    "typewriter": {
        "duration": 0.6,
        "delay": 0.0,
        "ease": "expOut(5)",
        "stagger": 0.045,
        "mode": "word",
        "from": {"opacity": 0.0, "y": 14.0},
        "to": {"opacity": 1.0, "y": 0.0},
    },
    "zoom": {
        "duration": 0.5,
        "delay": 0.0,
        "ease": "expOut(5)",
        "from": {"opacity": 0.0, "scale": 0.9},
        "to": {"opacity": 1.0, "scale": 1.0},
    },
    "bounce": {
        "duration": 0.55,
        "delay": 0.0,
        "ease": "expOut(5)",
        "from": {"opacity": 0.0, "scale": 0.85},
        "to": {"opacity": 1.0, "scale": 1.0},
    },
    "glitch": {
        "duration": 0.4,
        "delay": 0.0,
        "ease": "expOut(6)",
        "from": {"opacity": 0.0, "skewX": 4.0},
        "to": {"opacity": 1.0, "skewX": 0.0},
    },
    "spin": {
        "duration": 0.5,
        "delay": 0.0,
        "ease": "expOut(5)",
        "from": {"opacity": 0.0, "rotation": -18.0, "scale": 0.9},
        "to": {"opacity": 1.0, "rotation": 0.0, "scale": 1.0},
    },
}

ALLOWED_KEYS = {"preset", "duration", "delay", "ease", "from", "to", "advanced", "keyframes", "stagger", "mode"}
ALLOWED_PROP_KEYS = {"opacity", "x", "y", "scale", "rotation", "skewX", "skewY"}


def list_presets() -> list[str]:
    """Return sorted list of available beginner animation preset names."""
    return sorted(list(PRESETS.keys()))


def get_preset(name: str) -> dict:
    """Return a copy of the preset configuration for the given name."""
    key = str(name or "").strip().lower()
    if key not in PRESETS:
        raise ValueError(f"Unknown animation preset name: '{name}'. Available: {list_presets()}")
    return copy.deepcopy(PRESETS[key])


def validate_animation_config(raw) -> dict:
    """Validate raw animation configuration (string preset, dict config, or list of keyframes).

    Raises ValueError or TypeError on invalid values.
    Returns normalized configuration dict.
    """
    if raw is None:
        cfg = copy.deepcopy(PRESETS["fade-up"])
        cfg["preset"] = "fade-up"
        return cfg

    if isinstance(raw, str):
        key = raw.strip().lower()
        if not key:
            cfg = copy.deepcopy(PRESETS["fade-up"])
            cfg["preset"] = "fade-up"
            return cfg
        cfg = get_preset(key)
        cfg["preset"] = key
        return cfg

    if isinstance(raw, list):
        # List of keyframes
        return {
            "preset": "custom-keyframes",
            "keyframes": validate_keyframes(raw),
        }

    if isinstance(raw, dict):
        unknown = set(raw.keys()) - ALLOWED_KEYS
        if unknown:
            raise ValueError(f"Unknown keys in animation configuration: {unknown}. Allowed: {ALLOWED_KEYS}")

        cfg = copy.deepcopy(PRESETS["fade-up"])
        if "preset" in raw:
            p_name = raw["preset"]
            if p_name and isinstance(p_name, str):
                p_cfg = get_preset(p_name)
                cfg.update(p_cfg)
                cfg["preset"] = p_name.strip().lower()

        for k in ("duration", "delay", "stagger"):
            if k in raw:
                val = raw[k]
                if not isinstance(val, (int, float)) or val < 0:
                    raise TypeError(f"'{k}' must be a non-negative number, got: {val}")
                cfg[k] = float(val)

        if "ease" in raw:
            e = raw["ease"]
            if not isinstance(e, str) or not e.strip():
                raise TypeError(f"'ease' must be a non-empty string, got: {e}")
            cfg["ease"] = e.strip()

        if "from" in raw:
            f_val = raw["from"]
            if not isinstance(f_val, dict):
                raise TypeError("'from' must be a dictionary of properties")
            validate_properties(f_val, "from")
            cfg["from"] = dict(f_val)

        if "to" in raw:
            t_val = raw["to"]
            if not isinstance(t_val, dict):
                raise TypeError("'to' must be a dictionary of properties")
            validate_properties(t_val, "to")
            cfg["to"] = dict(t_val)

        if "keyframes" in raw:
            kf_val = raw["keyframes"]
            cfg["keyframes"] = validate_keyframes(kf_val)

        if "advanced" in raw:
            adv = raw["advanced"]
            if not isinstance(adv, dict):
                raise TypeError("'advanced' must be a dictionary")
            if "keyframes" in adv:
                cfg["keyframes"] = validate_keyframes(adv["keyframes"])
            for ak in ("duration", "delay", "ease"):
                if ak in adv:
                    cfg[ak] = adv[ak]

        return cfg

    raise TypeError(f"Invalid animation configuration type: {type(raw)}")


def validate_properties(props: dict, context: str):
    """Validate property dict keys and numeric values."""
    for pk, pv in props.items():
        if pk not in ALLOWED_PROP_KEYS:
            raise ValueError(f"Unknown property '{pk}' in {context}. Allowed: {ALLOWED_PROP_KEYS}")
        if not isinstance(pv, (int, float)):
            raise TypeError(f"Property '{pk}' in {context} must be numeric, got: {pv}")


def validate_keyframes(kf_list) -> list[dict]:
    """Validate advanced keyframes list."""
    if not isinstance(kf_list, list) or not kf_list:
        raise TypeError("'keyframes' must be a non-empty list of keyframe dictionaries")
    validated = []
    last_t = -1.0
    for idx, kf in enumerate(kf_list):
        if not isinstance(kf, dict):
            raise TypeError(f"Keyframe at index {idx} must be a dictionary")
        t_val = kf.get("t") if kf.get("t") is not None else kf.get("time")
        if t_val is None:
            raise ValueError(f"Keyframe at index {idx} missing 't' or 'time' coordinate")
        if not isinstance(t_val, (int, float)) or t_val < 0:
            raise TypeError(f"Keyframe 't' must be a non-negative number, got: {t_val}")
        t_float = float(t_val)
        if t_float < last_t:
            raise ValueError(f"Keyframe times must be monotonically increasing (index {idx})")
        last_t = t_float

        v_kf = {"t": t_float}
        for pk, pv in kf.items():
            if pk in ("t", "time"):
                continue
            if pk == "ease":
                if not isinstance(pv, str):
                    raise TypeError("Keyframe 'ease' must be a string")
                v_kf["ease"] = pv
                continue
            if pk not in ALLOWED_PROP_KEYS:
                raise ValueError(f"Unknown property '{pk}' in keyframe at index {idx}")
            if not isinstance(pv, (int, float)):
                raise TypeError(f"Keyframe property '{pk}' must be numeric, got: {pv}")
            v_kf[pk] = float(pv)
        validated.append(v_kf)
    return validated


def parse_animation(raw) -> dict:
    """Parse and validate animation configuration from video.yaml block."""
    return validate_animation_config(raw)


def resolve_animation(raw) -> dict:
    """Resolve raw animation configuration into a GSAP-ready tween specification.

    Maps easing to motion-tokens compatible $e^{-x}$ exponential easing strings.
    """
    cfg = validate_animation_config(raw)
    resolved = {
        "duration": cfg.get("duration", 0.5),
        "delay": cfg.get("delay", 0.0),
        "ease": cfg.get("ease", "expOut(5)"),
    }
    if "preset" in cfg:
        resolved["preset"] = cfg["preset"]
    if "from" in cfg:
        resolved["from"] = dict(cfg["from"])
    if "to" in cfg:
        resolved["to"] = dict(cfg["to"])
    if "keyframes" in cfg:
        resolved["keyframes"] = copy.deepcopy(cfg["keyframes"])
    if "stagger" in cfg:
        resolved["stagger"] = cfg["stagger"]
    if "mode" in cfg:
        resolved["mode"] = cfg["mode"]
    return resolved


def find_line_number(yaml_text, key: str = "anim", value=None, start_line: int = 1) -> int:
    """Find the 1-indexed line of key/value in the YAML text (1 when unknown)."""
    if not yaml_text or not isinstance(yaml_text, str):
        return 1
    lines = yaml_text.splitlines()
    val_str = str(value).strip().lower() if value is not None and not isinstance(value, (dict, list)) else None
    if val_str:
        for idx in range(max(0, start_line - 1), len(lines)):
            low = lines[idx].lower()
            if key.lower() in low and val_str in low:
                return idx + 1
        for idx in range(max(0, start_line - 1), len(lines)):
            if val_str in lines[idx].lower():
                return idx + 1
    for idx in range(max(0, start_line - 1), len(lines)):
        stripped = lines[idx].strip()
        if stripped.startswith(f"{key}:") or stripped.startswith(f"- {key}:") or stripped == f"{key}:":
            return idx + 1
    return max(1, start_line)


def validate_anim_with_line(raw, yaml_text=None, line_no=None, key: str = "anim", where: str = "") -> dict:
    """Validate an animation block; raise SystemExit with a Persian line-aware error."""
    try:
        return validate_animation_config(raw)
    except (ValueError, TypeError) as exc:
        ln = line_no or find_line_number(yaml_text, key=key.split("[")[0], value=raw) or 1
        where_str = f" در {where}" if where else ""
        raise SystemExit(f"خطای خط {ln} در video.yaml: مقدار {key}{where_str} نامعتبر است ('{raw}'). {exc}")
