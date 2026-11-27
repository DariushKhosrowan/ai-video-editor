"""Scene surface layer module for Khordegir Studio.

Licensed under MIT / Apache 2.0.
Parses top-level 'scene:' in video.yaml with allowed values corkboard, paper, dark-grid, none,
defaulting to 'none', with Persian line-numbered errors.
"""
from __future__ import annotations

VALID_SCENES = ("none", "corkboard", "paper", "dark-grid")
DEFAULT_SCENE = "none"


def list_scenes() -> list[str]:
    """Return sorted list of allowed scene surface values."""
    return sorted(list(VALID_SCENES))


def find_line_number(yaml_text: str, key: str = "scene") -> int | None:
    """Find 1-indexed line number of a given key in YAML text."""
    if not yaml_text or not isinstance(yaml_text, str):
        return None
    for idx, line in enumerate(yaml_text.splitlines(), start=1):
        stripped = line.strip()
        if stripped.startswith(f"{key}:") or stripped == key:
            return idx
    return None


def validate_scene(raw, yaml_text: str | None = None, line_no: int | None = None) -> str:
    """Validate top-level scene specification.

    Allowed values: corkboard, paper, dark-grid, none.
    Default: none.
    Raises ValueError with Persian line-numbered error if invalid.
    """
    if raw is None:
        return DEFAULT_SCENE

    if not isinstance(raw, str):
        ln = line_no or find_line_number(yaml_text or "", "scene") or 1
        raise TypeError(f"خطای خط {ln} در video.yaml: نوع مقدار scene نامعتبر است (باید رشته باشد، مقدار دریافتی: {type(raw).__name__})")

    val = raw.strip().lower()
    if not val:
        return DEFAULT_SCENE

    if val not in VALID_SCENES:
        ln = line_no or find_line_number(yaml_text or "", "scene") or 1
        allowed_str = ", ".join(VALID_SCENES)
        raise ValueError(f"خطای خط {ln} در video.yaml: مقدار scene نامعتبر است ('{raw}'). مقادیر مجاز: {allowed_str}")

    return val


def parse_scene(data: dict, yaml_text: str | None = None) -> str:
    """Parse and validate scene from video.yaml parsed dictionary."""
    if not isinstance(data, dict):
        return DEFAULT_SCENE
    if "scene" not in data:
        return DEFAULT_SCENE
    raw = data["scene"]
    ln = find_line_number(yaml_text or "", "scene")
    return validate_scene(raw, yaml_text=yaml_text, line_no=ln)
