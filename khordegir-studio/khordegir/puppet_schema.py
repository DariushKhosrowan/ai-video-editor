"""Puppet Schema v2 (`puppet:` in video.yaml) — canonical definitions, normalization,
preset library (10 presets), emotion/gesture registries, script tag parser, and JSON preset I/O.

100% offline, deterministic, stdlib-only, backwards-compatible with v1 `mascot.tone` & `expression_timeline`.
"""

from __future__ import annotations

import copy
import json
import re
from typing import Any, Dict, List, Optional, Tuple

PUPPET_SCHEMA_VERSION = 2

BRAND_PALETTE: Dict[str, str] = {
    "redPrimary": "#EB1818",
    "redHighlight": "#F72A2A",
    "redShadow": "#A30E12",
    "chestBlack": "#141418",
    "chestHighlight": "#26262E",
    "beakGold": "#F5A614",
    "beakHighlight": "#F9BD32",
    "beakShadow": "#C97808",
    "mouthInterior": "#5A1014",
    "tonguePink": "#E06C65",
    "teethWhite": "#FFFFFF",
    "scleraWhite": "#FFFFFF",
    "pupilBlack": "#09090B",
    "outline": "#09090B",
    "sparkGold": "#F7AE1B",
    "sweatWhite": "#F8FAFC",
}

PART_DEFAULTS: Dict[str, Dict[str, Any]] = {
    "body":        {"label": "بدن و سینه",      "labelEn": "Body",        "pivotX": 320, "pivotY": 540, "zOrder": 4,  "color": None, "outlineWidth": 1.0, "visible": True},
    "head":        {"label": "سر",              "labelEn": "Head",        "pivotX": 320, "pivotY": 312, "zOrder": 6,  "color": None, "outlineWidth": 1.0, "visible": True},
    "beak_upper":  {"label": "منقار بالا",      "labelEn": "Upper Beak",  "pivotX": 320, "pivotY": 240, "zOrder": 3,  "color": None, "outlineWidth": 1.0, "visible": True},
    "beak_lower":  {"label": "منقار پایین",     "labelEn": "Lower Beak",  "pivotX": 320, "pivotY": 260, "zOrder": 2,  "color": None, "outlineWidth": 1.0, "visible": True},
    "eye_l":       {"label": "چشم چپ",          "labelEn": "Left Eye",    "pivotX": 272, "pivotY": 186, "zOrder": 1,  "color": None, "outlineWidth": 1.0, "visible": True},
    "eye_r":       {"label": "چشم راست",        "labelEn": "Right Eye",   "pivotX": 368, "pivotY": 186, "zOrder": 2,  "color": None, "outlineWidth": 1.0, "visible": True},
    "pupil_l":     {"label": "مردمک چپ",        "labelEn": "Left Pupil",  "pivotX": 272, "pivotY": 188, "zOrder": 1,  "color": None, "outlineWidth": 1.0, "visible": True},
    "pupil_r":     {"label": "مردمک راست",      "labelEn": "Right Pupil", "pivotX": 368, "pivotY": 188, "zOrder": 1,  "color": None, "outlineWidth": 1.0, "visible": True},
    "lid_l":       {"label": "پلک چپ",          "labelEn": "Left Lid",    "pivotX": 272, "pivotY": 186, "zOrder": 2,  "color": None, "outlineWidth": 1.0, "visible": True},
    "lid_r":       {"label": "پلک راست",        "labelEn": "Right Lid",   "pivotX": 368, "pivotY": 186, "zOrder": 2,  "color": None, "outlineWidth": 1.0, "visible": True},
    "brow_l":      {"label": "ابروی چپ",        "labelEn": "Left Brow",   "pivotX": 262, "pivotY": 150, "zOrder": 3,  "color": None, "outlineWidth": 1.0, "visible": True},
    "brow_r":      {"label": "ابروی راست",      "labelEn": "Right Brow",  "pivotX": 378, "pivotY": 150, "zOrder": 4,  "color": None, "outlineWidth": 1.0, "visible": True},
    "crest":       {"label": "تاج و بال سه‌خط",  "labelEn": "Crest",       "pivotX": 404, "pivotY": 390, "zOrder": 2,  "color": None, "outlineWidth": 1.0, "visible": True},
    "wing_l":      {"label": "بال چپ",          "labelEn": "Left Wing",   "pivotX": 206, "pivotY": 372, "zOrder": 5,  "color": None, "outlineWidth": 1.0, "visible": True},
    "wing_r":      {"label": "بال راست",        "labelEn": "Right Wing",  "pivotX": 434, "pivotY": 372, "zOrder": 5,  "color": None, "outlineWidth": 1.0, "visible": True},
    "tail":        {"label": "دم",              "labelEn": "Tail",        "pivotX": 320, "pivotY": 510, "zOrder": 1,  "color": None, "outlineWidth": 1.0, "visible": True},
    "legs":        {"label": "پاها و چنگال",    "labelEn": "Legs",        "pivotX": 320, "pivotY": 614, "zOrder": 3,  "color": None, "outlineWidth": 1.0, "visible": True},
    "accessories": {"label": "اکسسوری‌ها",       "labelEn": "Accessories", "pivotX": 320, "pivotY": 200, "zOrder": 10, "color": None, "outlineWidth": 1.0, "visible": True},
}

EMOTION_NAMES = (
    "neutral", "happy", "sad", "angry", "surprised", "shocked",
    "smug", "confused", "scared", "proud", "bored",
    "embarrassed", "thinking", "sarcastic", "annoyed",
)

GESTURE_NAMES = (
    "point", "shrug", "facepalm", "wing-cross", "thumbs-up",
    "clap", "salute", "chin-scratch", "double-take",
)

DEFAULT_LIMITS: Dict[str, float] = {
    "mouthMin": 0.0,
    "mouthMax": 1.0,
    "browYMin": -18.0,
    "browYMax": 12.0,
    "browRotMin": -14.0,
    "browRotMax": 14.0,
    "headTiltMin": -13.0,
    "headTiltMax": 13.0,
    "headNodMin": -15.0,
    "headNodMax": 15.0,
    "chestBounceMin": -10.0,
    "chestBounceMax": 10.0,
    "chestSquashMax": 0.072,
    "wingAngleMin": -25.0,
    "wingAngleMax": 25.0,
    "idleSwayDegMax": 2.8,
}

DEFAULT_SECONDARY: Dict[str, Any] = {
    "featherJiggle": 0.55,
    "crestOverlap": 0.65,
    "wingFollowThrough": 0.60,
    "squashPreserveVolume": True,
}

# 10 Beginner One-Click Presets (Phase 1 Item 3)
PUPPET_PRESETS: Dict[str, Dict[str, Any]] = {
    "calm": {
        "label": "آرام (Calm)",
        "tone": {"mouthGain": 0.68, "browGain": 0.55, "headGain": 0.50, "chestGain": 0.45, "wingGain": 0.45, "blinkRate": 0.90, "idleSway": 0.75, "springFreq": 11.0},
        "spring": {"stiffness": 121.0, "damping": 22.0, "mass": 1.0},
        "emotion": "neutral",
        "emotionIntensity": 0.85,
    },
    "lively": {
        "label": "زنده (Lively)",
        "tone": {"mouthGain": 1.00, "browGain": 1.00, "headGain": 1.00, "chestGain": 1.00, "wingGain": 1.00, "blinkRate": 1.00, "idleSway": 1.00, "springFreq": 14.0},
        "spring": {"stiffness": 196.0, "damping": 28.0, "mass": 1.0},
        "emotion": "neutral",
        "emotionIntensity": 1.0,
    },
    "dramatic": {
        "label": "نمایشی (Dramatic)",
        "tone": {"mouthGain": 1.38, "browGain": 1.48, "headGain": 1.50, "chestGain": 1.42, "wingGain": 1.45, "blinkRate": 1.15, "idleSway": 1.20, "springFreq": 18.0},
        "spring": {"stiffness": 324.0, "damping": 30.0, "mass": 1.0},
        "emotion": "proud",
        "emotionIntensity": 1.25,
    },
    "newsreader": {
        "label": "گوینده خبر (Newsreader)",
        "tone": {"mouthGain": 0.92, "browGain": 0.62, "headGain": 0.55, "chestGain": 0.35, "wingGain": 0.25, "blinkRate": 0.85, "idleSway": 0.45, "springFreq": 15.0},
        "spring": {"stiffness": 225.0, "damping": 30.0, "mass": 1.0},
        "emotion": "neutral",
        "emotionIntensity": 0.75,
    },
    "comedian": {
        "label": "کمدین (Comedian)",
        "tone": {"mouthGain": 1.28, "browGain": 1.55, "headGain": 1.45, "chestGain": 1.35, "wingGain": 1.50, "blinkRate": 1.25, "idleSway": 1.25, "springFreq": 16.5},
        "spring": {"stiffness": 272.0, "damping": 23.0, "mass": 0.9},
        "emotion": "happy",
        "emotionIntensity": 1.20,
    },
    "whisper": {
        "label": "نجوا (Whisper)",
        "tone": {"mouthGain": 0.52, "browGain": 0.72, "headGain": 0.48, "chestGain": 0.30, "wingGain": 0.30, "blinkRate": 0.75, "idleSway": 0.60, "springFreq": 9.5},
        "spring": {"stiffness": 90.0, "damping": 20.0, "mass": 1.05},
        "emotion": "thinking",
        "emotionIntensity": 0.85,
    },
    "shouting": {
        "label": "پرخروش (Shouting)",
        "tone": {"mouthGain": 1.55, "browGain": 1.60, "headGain": 1.60, "chestGain": 1.55, "wingGain": 1.60, "blinkRate": 1.10, "idleSway": 1.10, "springFreq": 21.0},
        "spring": {"stiffness": 420.0, "damping": 33.0, "mass": 0.92},
        "emotion": "angry",
        "emotionIntensity": 1.30,
    },
    "sleepy": {
        "label": "خواب‌آلود (Sleepy)",
        "tone": {"mouthGain": 0.58, "browGain": 0.42, "headGain": 0.55, "chestGain": 0.40, "wingGain": 0.25, "blinkRate": 0.55, "idleSway": 1.35, "springFreq": 7.5},
        "spring": {"stiffness": 64.0, "damping": 18.0, "mass": 1.25},
        "emotion": "bored",
        "emotionIntensity": 1.05,
    },
    "angry": {
        "label": "عصبانی (Angry)",
        "tone": {"mouthGain": 1.32, "browGain": 1.45, "headGain": 1.38, "chestGain": 1.30, "wingGain": 1.28, "blinkRate": 0.85, "idleSway": 0.65, "springFreq": 19.5},
        "spring": {"stiffness": 380.0, "damping": 34.0, "mass": 0.95},
        "emotion": "angry",
        "emotionIntensity": 1.25,
    },
    "excited": {
        "label": "هیجان‌زده (Excited)",
        "tone": {"mouthGain": 1.35, "browGain": 1.42, "headGain": 1.45, "chestGain": 1.50, "wingGain": 1.55, "blinkRate": 1.30, "idleSway": 1.30, "springFreq": 19.0},
        "spring": {"stiffness": 340.0, "damping": 26.0, "mass": 0.88},
        "emotion": "happy",
        "emotionIntensity": 1.30,
    },
}

# Phase 4 Item 12: Multi-Character Cast (all share the exact 18-part rig tree)
CHARACTERS: Dict[str, Dict[str, Any]] = {
    "red_eagle": {
        "label": "عقاب قرمز",
        "labelEn": "Red Eagle",
        "species": "eagle",
        "defaultPreset": "lively",
        "defaultVoice": {"medianF0Hz": 165.0, "pitchSpanSemitones": 6.0, "preset": "lively"},
        "palette": dict(BRAND_PALETTE),
    },
    "vesper_owl": {
        "label": "جغد وسپر",
        "labelEn": "Vesper Owl",
        "species": "owl",
        "defaultPreset": "calm",
        "defaultVoice": {"medianF0Hz": 145.0, "pitchSpanSemitones": 5.5, "preset": "calm"},
        "palette": {
            **BRAND_PALETTE,
            "redPrimary": "#47467B",
            "redHighlight": "#6362A3",
            "redShadow": "#2B2A52",
            "chestBlack": "#D9CFC1",
            "chestHighlight": "#EFE8DD",
            "beakGold": "#E8A42A",
            "beakHighlight": "#F8C354",
            "beakShadow": "#B87814",
        },
    },
    "pip_pigeon": {
        "label": "کبوتر پیپ",
        "labelEn": "Pip Pigeon",
        "species": "pigeon",
        "defaultPreset": "comedian",
        "defaultVoice": {"medianF0Hz": 198.0, "pitchSpanSemitones": 7.0, "preset": "comedian"},
        "palette": {
            **BRAND_PALETTE,
            "redPrimary": "#627D98",
            "redHighlight": "#829AB1",
            "redShadow": "#3E546B",
            "chestBlack": "#2E7D6B",
            "chestHighlight": "#48B29A",
            "beakGold": "#E09A7B",
            "beakHighlight": "#F2BCA3",
            "beakShadow": "#B56F52",
        },
    },
    "midge_hummingbird": {
        "label": "مرغ مگس‌خوار میج",
        "labelEn": "Midge Hummingbird",
        "species": "hummingbird",
        "defaultPreset": "excited",
        "defaultVoice": {"medianF0Hz": 248.0, "pitchSpanSemitones": 7.5, "preset": "excited"},
        "palette": {
            **BRAND_PALETTE,
            "redPrimary": "#12A876",
            "redHighlight": "#2BD49B",
            "redShadow": "#0A6F4D",
            "chestBlack": "#C81E56",
            "chestHighlight": "#F0477E",
            "beakGold": "#E5B429",
            "beakHighlight": "#F7D25C",
            "beakShadow": "#A87E0F",
        },
    },
    "barnaby_tortoise": {
        "label": "لاک‌پشت بارنابی",
        "labelEn": "Barnaby Tortoise",
        "species": "tortoise",
        "defaultPreset": "sleepy",
        "defaultVoice": {"medianF0Hz": 116.0, "pitchSpanSemitones": 4.8, "preset": "sleepy"},
        "palette": {
            **BRAND_PALETTE,
            "redPrimary": "#5C8A4D",
            "redHighlight": "#7BAE6A",
            "redShadow": "#3B5E30",
            "chestBlack": "#A36B33",
            "chestHighlight": "#C98F50",
            "beakGold": "#D4B675",
            "beakHighlight": "#E8CE96",
            "beakShadow": "#9D8045",
        },
    },
}

# Phase 4 Item 13: Costume & Accessory Slots (12 accessories across 4 slots)
ACCESSORY_NAMES = (
    "top_hat", "crown", "cap", "beanie",
    "glasses", "sunglasses", "monocle",
    "bowtie", "necktie", "scarf",
    "headphones", "mic", "coffee_mug",
)

# Phase 4 Item 14: Outfit Variants (one-click accessory bundles)
OUTFITS: Dict[str, Dict[str, Any]] = {
    "default": {"label": "پیش‌فرض",     "labelEn": "Default",      "accessories": []},
    "formal":  {"label": "رسمی",        "labelEn": "Formal",       "accessories": ["top_hat", "bowtie", "monocle"]},
    "podcast": {"label": "میز پادکست",  "labelEn": "Podcast Host", "accessories": ["headphones", "mic"]},
    "royal":   {"label": "سلطنتی",      "labelEn": "Royal",        "accessories": ["crown", "bowtie"]},
    "street":  {"label": "خیابانی",     "labelEn": "Street",       "accessories": ["cap", "sunglasses"]},
    "cozy":    {"label": "دنج زمستانی", "labelEn": "Cozy",         "accessories": ["beanie", "scarf", "coffee_mug"]},
}

# Phase 4 Item 14: Seasonal & Studio Palette Skins
SKINS: Dict[str, Dict[str, Any]] = {
    "classic":     {"label": "کلاسیک",       "labelEn": "Classic",     "paletteOverrides": {}},
    "nowruz":      {"label": "نوروز",        "labelEn": "Nowruz",      "paletteOverrides": {"chestBlack": "#0F5E59", "chestHighlight": "#1D8F87", "sparkGold": "#38D9A9"}},
    "yalda":       {"label": "شب یلدا",      "labelEn": "Yalda",       "paletteOverrides": {"redPrimary": "#B8142C", "redHighlight": "#E02442", "chestBlack": "#114B32", "chestHighlight": "#1E7850"}},
    "winter":      {"label": "زمستانی",      "labelEn": "Winter",      "paletteOverrides": {"redPrimary": "#2B6CB0", "redHighlight": "#63B3ED", "redShadow": "#1A365D", "chestBlack": "#E2E8F0", "chestHighlight": "#FFFFFF"}},
    "autumn":      {"label": "پاییزی",       "labelEn": "Autumn",      "paletteOverrides": {"redPrimary": "#C85A17", "redHighlight": "#EA7B2E", "redShadow": "#7C3209", "chestBlack": "#3B2417", "chestHighlight": "#5E3A24"}},
    "neon_studio": {"label": "نئون استودیو", "labelEn": "Neon Studio", "paletteOverrides": {"redPrimary": "#EC187A", "redHighlight": "#FF4DA6", "redShadow": "#990B4D", "chestBlack": "#121029", "chestHighlight": "#22D3EE", "beakGold": "#00E5FF", "beakHighlight": "#6BF2FF"}},
    "noir":        {"label": "فیلم نوآر",    "labelEn": "Noir",        "paletteOverrides": {"redPrimary": "#94A3B8", "redHighlight": "#CBD5E1", "redShadow": "#475569", "chestBlack": "#0F172A", "chestHighlight": "#334155", "beakGold": "#E2C044"}},
}

LISTENER_REACTIONS = (
    "listening", "nodding", "interested", "skeptical", "surprised", "laughing", "thoughtful",
)


def resolve_character_palette(character: str, skin: str) -> Dict[str, str]:
    char_key = character if character in CHARACTERS else "red_eagle"
    skin_key = skin if skin in SKINS else "classic"
    pal = dict(CHARACTERS[char_key]["palette"])
    pal.update(SKINS[skin_key]["paletteOverrides"])
    return pal


def _clamp(val: float, lo: float, hi: float) -> float:
    return lo if val < lo else hi if val > hi else val


def _num(raw: Any, default: float, lo: float, hi: float) -> float:
    if raw is None or raw == "":
        return default
    try:
        v = float(raw)
    except (TypeError, ValueError):
        return default
    return _clamp(v, lo, hi)


def _valid_hex(val: Any) -> Optional[str]:
    if not isinstance(val, str):
        return None
    s = val.strip()
    if re.fullmatch(r"#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?", s):
        return s.upper()
    return None


def _normalize_part(part_key: str, raw: Any) -> Dict[str, Any]:
    base = PART_DEFAULTS[part_key]
    src = raw if isinstance(raw, dict) else {}
    return {
        "x": round(_num(src.get("x"), 0.0, -240.0, 240.0), 2),
        "y": round(_num(src.get("y"), 0.0, -240.0, 240.0), 2),
        "rotation": round(_num(src.get("rotation"), 0.0, -90.0, 90.0), 2),
        "scaleX": round(_num(src.get("scaleX"), 1.0, 0.25, 2.5), 3),
        "scaleY": round(_num(src.get("scaleY"), 1.0, 0.25, 2.5), 3),
        "pivotX": round(_num(src.get("pivotX"), float(base["pivotX"]), 0.0, 640.0), 1),
        "pivotY": round(_num(src.get("pivotY"), float(base["pivotY"]), 0.0, 720.0), 1),
        "zOrder": int(_clamp(float(src.get("zOrder", base["zOrder"]) or base["zOrder"]), -20, 40)),
        "color": _valid_hex(src.get("color")),
        "outlineWidth": round(_num(src.get("outlineWidth"), float(base["outlineWidth"]), 0.0, 3.0), 2),
        "visible": True if src.get("visible") is None else bool(src.get("visible")),
    }


def _deep_merge(base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
    out = copy.deepcopy(base)
    for k, v in (override or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = _deep_merge(out[k], v)
        elif v is not None:
            out[k] = copy.deepcopy(v)
    return out


def normalize_puppet_config(
    raw_puppet: Optional[Dict[str, Any]] = None,
    *,
    legacy_tone: Optional[Dict[str, Any]] = None,
    project_puppet: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Normalize and validate Puppet Schema v2, merging project defaults + slide overrides + v1 tone."""
    merged: Dict[str, Any] = {}
    if isinstance(project_puppet, dict):
        merged = _deep_merge(merged, project_puppet)
    if isinstance(raw_puppet, dict):
        merged = _deep_merge(merged, raw_puppet)

    raw_tone = merged.get("tone") if isinstance(merged.get("tone"), dict) else {}
    if isinstance(legacy_tone, dict):
        raw_tone = _deep_merge(raw_tone, legacy_tone) if not (isinstance(raw_puppet, dict) and isinstance(raw_puppet.get("tone"), dict)) else _deep_merge(legacy_tone, raw_tone)

    slide_explicit_preset = (raw_puppet.get("preset") if isinstance(raw_puppet, dict) else None)
    legacy_preset = (legacy_tone.get("preset") if isinstance(legacy_tone, dict) else (legacy_tone if isinstance(legacy_tone, str) else None))
    preset_key = str(slide_explicit_preset or legacy_preset or merged.get("preset") or raw_tone.get("preset") or "lively").strip().lower()
    if preset_key not in PUPPET_PRESETS:
        preset_key = "lively"
    preset_spec = PUPPET_PRESETS[preset_key]

    # Gains
    pt = preset_spec["tone"]
    tone = {
        "preset": preset_key,
        "mouthGain": round(_num(raw_tone.get("mouthGain"), pt["mouthGain"], 0.0, 2.0), 3),
        "browGain": round(_num(raw_tone.get("browGain"), pt["browGain"], 0.0, 2.0), 3),
        "headGain": round(_num(raw_tone.get("headGain"), pt["headGain"], 0.0, 2.0), 3),
        "chestGain": round(_num(raw_tone.get("chestGain"), pt["chestGain"], 0.0, 2.0), 3),
        "wingGain": round(_num(raw_tone.get("wingGain"), pt["wingGain"], 0.0, 2.0), 3),
        "blinkRate": round(_num(raw_tone.get("blinkRate"), pt["blinkRate"], 0.3, 2.0), 3),
        "idleSway": round(_num(raw_tone.get("idleSway"), pt["idleSway"], 0.0, 2.0), 3),
        "springFreq": round(_num(raw_tone.get("springFreq"), pt["springFreq"], 5.0, 28.0), 2),
    }

    # Spring physics (stiffness, damping, mass)
    ps = preset_spec["spring"]
    raw_sp = merged.get("spring") if isinstance(merged.get("spring"), dict) else {}
    spring = {
        "stiffness": round(_num(raw_sp.get("stiffness"), ps["stiffness"], 40.0, 600.0), 2),
        "damping": round(_num(raw_sp.get("damping"), ps["damping"], 4.0, 65.0), 2),
        "mass": round(_num(raw_sp.get("mass"), ps["mass"], 0.25, 4.0), 3),
    }

    # Limits
    raw_lim = merged.get("limits") if isinstance(merged.get("limits"), dict) else {}
    limits = {
        "mouthMin": round(_num(raw_lim.get("mouthMin"), DEFAULT_LIMITS["mouthMin"], 0.0, 0.3), 3),
        "mouthMax": round(_num(raw_lim.get("mouthMax"), DEFAULT_LIMITS["mouthMax"], 0.2, 1.0), 3),
        "browYMin": round(_num(raw_lim.get("browYMin"), DEFAULT_LIMITS["browYMin"], -28.0, 0.0), 2),
        "browYMax": round(_num(raw_lim.get("browYMax"), DEFAULT_LIMITS["browYMax"], 0.0, 16.0), 2),
        "browRotMin": round(_num(raw_lim.get("browRotMin"), DEFAULT_LIMITS["browRotMin"], -24.0, 0.0), 2),
        "browRotMax": round(_num(raw_lim.get("browRotMax"), DEFAULT_LIMITS["browRotMax"], 0.0, 24.0), 2),
        "headTiltMin": round(_num(raw_lim.get("headTiltMin"), DEFAULT_LIMITS["headTiltMin"], -20.0, 0.0), 2),
        "headTiltMax": round(_num(raw_lim.get("headTiltMax"), DEFAULT_LIMITS["headTiltMax"], 0.0, 20.0), 2),
        "headNodMin": round(_num(raw_lim.get("headNodMin"), DEFAULT_LIMITS["headNodMin"], -22.0, 0.0), 2),
        "headNodMax": round(_num(raw_lim.get("headNodMax"), DEFAULT_LIMITS["headNodMax"], 0.0, 22.0), 2),
        "chestBounceMin": round(_num(raw_lim.get("chestBounceMin"), DEFAULT_LIMITS["chestBounceMin"], -16.0, 0.0), 2),
        "chestBounceMax": round(_num(raw_lim.get("chestBounceMax"), DEFAULT_LIMITS["chestBounceMax"], 0.0, 16.0), 2),
        "chestSquashMax": round(_num(raw_lim.get("chestSquashMax"), DEFAULT_LIMITS["chestSquashMax"], 0.0, 0.12), 4),
        "wingAngleMin": round(_num(raw_lim.get("wingAngleMin"), DEFAULT_LIMITS["wingAngleMin"], -36.0, 0.0), 2),
        "wingAngleMax": round(_num(raw_lim.get("wingAngleMax"), DEFAULT_LIMITS["wingAngleMax"], 0.0, 36.0), 2),
        "idleSwayDegMax": round(_num(raw_lim.get("idleSwayDegMax"), DEFAULT_LIMITS["idleSwayDegMax"], 0.0, 5.0), 2),
    }

    # Phase 4: Character, Outfit & Seasonal Skin resolution
    char_key = str(merged.get("character") or "red_eagle").strip().lower()
    if char_key not in CHARACTERS:
        char_key = "red_eagle"
    char_spec = CHARACTERS[char_key]

    outfit_key = str(merged.get("outfit") or "default").strip().lower()
    if outfit_key not in OUTFITS:
        outfit_key = "default"
    skin_key = str(merged.get("skin") or "classic").strip().lower()
    if skin_key not in SKINS:
        skin_key = "classic"

    # Palette + Brand/Character Palette Lock
    palette_lock = True if merged.get("paletteLock") is None else bool(merged.get("paletteLock"))
    palette = resolve_character_palette(char_key, skin_key)
    raw_pal = merged.get("palette") if isinstance(merged.get("palette"), dict) else {}
    if not palette_lock:
        for pk in BRAND_PALETTE:
            hv = _valid_hex(raw_pal.get(pk))
            if hv:
                palette[pk] = hv

    # Parts tree (all 18 parts)
    raw_parts = merged.get("parts") if isinstance(merged.get("parts"), dict) else {}
    parts = {pk: _normalize_part(pk, raw_parts.get(pk)) for pk in PART_DEFAULTS}
    if palette_lock:
        for pk in parts:
            parts[pk]["color"] = None

    # Secondary motion
    raw_sec = merged.get("secondary") if isinstance(merged.get("secondary"), dict) else {}
    secondary = {
        "featherJiggle": round(_num(raw_sec.get("featherJiggle"), DEFAULT_SECONDARY["featherJiggle"], 0.0, 2.0), 3),
        "crestOverlap": round(_num(raw_sec.get("crestOverlap"), DEFAULT_SECONDARY["crestOverlap"], 0.0, 2.0), 3),
        "wingFollowThrough": round(_num(raw_sec.get("wingFollowThrough"), DEFAULT_SECONDARY["wingFollowThrough"], 0.0, 2.0), 3),
        "squashPreserveVolume": True if raw_sec.get("squashPreserveVolume") is None else bool(raw_sec.get("squashPreserveVolume")),
    }

    # Emotion & Acting defaults
    emo = str(merged.get("emotion") or preset_spec["emotion"] or "neutral").lower()
    if emo not in EMOTION_NAMES:
        emo = "neutral"
    emotion_intensity = round(_num(merged.get("emotionIntensity"), preset_spec["emotionIntensity"], 0.0, 1.5), 3)
    auto_emotion = bool(merged.get("autoEmotion", False))

    # Keyframed tone curves
    keyframes: List[Dict[str, Any]] = []
    for kf in merged.get("keyframes") or []:
        if not isinstance(kf, dict):
            continue
        gain = str(kf.get("gain") or "").strip()
        if not gain:
            continue
        keyframes.append({
            "t": round(max(0.0, float(kf.get("t", 0.0) or 0.0)), 3),
            "gain": gain,
            "value": round(float(kf.get("value", 1.0) or 0.0), 4),
            "ease": str(kf.get("ease") or "smooth").lower(),
        })
    keyframes.sort(key=lambda x: (x["gain"], x["t"]))

    # Per-sentence overrides
    sentences: List[Dict[str, Any]] = []
    for seg in merged.get("sentences") or []:
        if not isinstance(seg, dict):
            continue
        start = round(max(0.0, float(seg.get("start", 0.0) or 0.0)), 3)
        end = round(max(start + 0.05, float(seg.get("end", start + 1.5) or (start + 1.5))), 3)
        entry: Dict[str, Any] = {"start": start, "end": end}
        if seg.get("text"):
            entry["text"] = str(seg["text"])
        if seg.get("preset") and str(seg["preset"]).lower() in PUPPET_PRESETS:
            entry["preset"] = str(seg["preset"]).lower()
        if seg.get("emotion") and str(seg["emotion"]).lower() in EMOTION_NAMES:
            entry["emotion"] = str(seg["emotion"]).lower()
        if seg.get("intensity") is not None:
            entry["intensity"] = round(_num(seg["intensity"], 1.0, 0.0, 1.5), 3)
        if seg.get("gesture") and str(seg["gesture"]).lower() in GESTURE_NAMES:
            entry["gesture"] = str(seg["gesture"]).lower()
        if seg.get("look_at"):
            entry["look_at"] = seg["look_at"]
        if isinstance(seg.get("tone"), dict):
            entry["tone"] = {k: float(v) for k, v in seg["tone"].items() if isinstance(v, (int, float))}
        sentences.append(entry)
    sentences.sort(key=lambda x: x["start"])

    # Gestures list
    gestures: List[Dict[str, Any]] = []
    for g in merged.get("gestures") or []:
        if not isinstance(g, dict):
            continue
        gname = str(g.get("gesture") or g.get("name") or "").strip().lower()
        if gname not in GESTURE_NAMES:
            continue
        gestures.append({
            "t": round(max(0.0, float(g.get("t", 0.0) or 0.0)), 3),
            "gesture": gname,
            "duration": round(_num(g.get("duration"), 1.05, 0.25, 4.0), 3),
            "offset": round(_num(g.get("offset"), 0.0, -1.0, 1.0), 3),
            "intensity": round(_num(g.get("intensity"), 1.0, 0.1, 1.5), 3),
        })
    gestures.sort(key=lambda x: x["t"])

    # Gaze config
    raw_gaze = merged.get("gaze") if isinstance(merged.get("gaze"), dict) else {}
    gaze = {
        "target": raw_gaze.get("target", "auto"),
        "smoothPursuit": round(_num(raw_gaze.get("smoothPursuit"), 10.0, 2.0, 30.0), 2),
        "saccadeScale": round(_num(raw_gaze.get("saccadeScale"), 1.0, 0.0, 2.0), 3),
        "timeline": list(raw_gaze.get("timeline") or []),
    }

    # Accessories (explicit list or outfit bundle) + Timed Accessory Swap Timeline (Phase 4 Item 13)
    raw_acc = merged.get("accessories")
    if isinstance(raw_acc, list):
        accessories = [str(a).strip().lower() for a in raw_acc if str(a).strip().lower() in ACCESSORY_NAMES]
    else:
        accessories = list(OUTFITS[outfit_key]["accessories"])

    accessory_timeline: List[Dict[str, Any]] = []
    for cue in merged.get("accessoryTimeline") or merged.get("accessory_timeline") or []:
        if not isinstance(cue, dict):
            continue
        t_val = round(max(0.0, float(cue.get("t", 0.0) or 0.0)), 3)
        cue_entry: Dict[str, Any] = {"t": t_val}
        if isinstance(cue.get("accessories"), list):
            cue_entry["accessories"] = [str(a).strip().lower() for a in cue["accessories"] if str(a).strip().lower() in ACCESSORY_NAMES]
        if isinstance(cue.get("add"), list):
            cue_entry["add"] = [str(a).strip().lower() for a in cue["add"] if str(a).strip().lower() in ACCESSORY_NAMES]
        if isinstance(cue.get("remove"), list):
            cue_entry["remove"] = [str(a).strip().lower() for a in cue["remove"] if str(a).strip().lower() in ACCESSORY_NAMES]
        if cue.get("outfit") and str(cue["outfit"]).strip().lower() in OUTFITS:
            cue_entry["outfit"] = str(cue["outfit"]).strip().lower()
        accessory_timeline.append(cue_entry)
    accessory_timeline.sort(key=lambda x: x["t"])

    # Per-character voice mapping (Phase 4 Item 12)
    def_voice = char_spec["defaultVoice"]
    raw_voice = merged.get("voice") if isinstance(merged.get("voice"), dict) else {}
    voice_preset = str(raw_voice.get("preset") or def_voice["preset"]).strip().lower()
    if voice_preset not in PUPPET_PRESETS:
        voice_preset = def_voice["preset"]
    voice = {
        "speakerId": str(raw_voice.get("speakerId") or raw_voice.get("speaker_id") or char_key),
        "medianF0Hz": round(_num(raw_voice.get("medianF0Hz"), def_voice["medianF0Hz"], 65.0, 500.0), 2),
        "pitchSpanSemitones": round(_num(raw_voice.get("pitchSpanSemitones"), def_voice["pitchSpanSemitones"], 3.5, 10.0), 2),
        "preset": voice_preset,
        "audio": str(raw_voice.get("audio") or ""),
    }

    # Speaker calibration profile (Phase 3 Item 10)
    raw_cal = merged.get("calibration") if isinstance(merged.get("calibration"), dict) else {}
    calibration = {
        "medianF0Hz": round(_num(raw_cal.get("medianF0Hz"), voice["medianF0Hz"], 65.0, 500.0), 2),
        "f0MinHz": round(_num(raw_cal.get("f0MinHz"), max(60.0, voice["medianF0Hz"] * 0.7), 60.0, 450.0), 2),
        "f0MaxHz": round(_num(raw_cal.get("f0MaxHz"), min(550.0, voice["medianF0Hz"] * 1.45), 80.0, 550.0), 2),
        "pitchSpanSemitones": round(_num(raw_cal.get("pitchSpanSemitones"), voice["pitchSpanSemitones"], 3.5, 10.0), 2),
        "noiseFloorDb": round(_num(raw_cal.get("noiseFloorDb"), -56.0, -80.0, -18.0), 2),
        "noiseGateDb": round(_num(raw_cal.get("noiseGateDb"), -46.0, -68.0, -22.0), 2),
        "loudnessMinDb": round(_num(raw_cal.get("loudnessMinDb"), -42.0, -70.0, -6.0), 2),
        "loudnessMaxDb": round(_num(raw_cal.get("loudnessMaxDb"), -12.0, -40.0, 0.0), 2),
        "p95Rms": round(_num(raw_cal.get("p95Rms"), 0.16, 0.01, 1.0), 5),
        "calibrated": bool(raw_cal.get("calibrated", bool(raw_cal))),
    }

    # Live OBS settings (Phase 3 Item 11)
    raw_live = merged.get("live") if isinstance(merged.get("live"), dict) else {}
    live = {
        "noiseSuppression": True if raw_live.get("noiseSuppression") is None else bool(raw_live.get("noiseSuppression")),
        "pushToTalk": bool(raw_live.get("pushToTalk", False)),
        "pttKey": str(raw_live.get("pttKey") or "Space"),
        "showHud": bool(raw_live.get("showHud", False)),
    }

    return {
        "version": PUPPET_SCHEMA_VERSION,
        "character": char_key,
        "outfit": outfit_key,
        "skin": skin_key,
        "preset": preset_key,
        "paletteLock": palette_lock,
        "palette": palette,
        "tone": tone,
        "spring": spring,
        "limits": limits,
        "parts": parts,
        "secondary": secondary,
        "emotion": emo,
        "emotionIntensity": emotion_intensity,
        "autoEmotion": auto_emotion,
        "keyframes": keyframes,
        "sentences": sentences,
        "gestures": gestures,
        "gaze": gaze,
        "accessories": accessories,
        "accessoryTimeline": accessory_timeline,
        "voice": voice,
        "calibration": calibration,
        "live": live,
    }


def normalize_dialogue_config(
    raw_dialogue: Optional[Dict[str, Any]],
    *,
    project_puppet: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    """Normalize a Phase 4 multi-character `dialogue:` block (cast, voice mapping, turns, listener reactions)."""
    if not isinstance(raw_dialogue, dict):
        return None
    raw_chars = raw_dialogue.get("characters") or raw_dialogue.get("cast") or []
    if not isinstance(raw_chars, list) or not raw_chars:
        return None

    cast: List[Dict[str, Any]] = []
    seen_ids: set[str] = set()
    for idx, rc in enumerate(raw_chars):
        if not isinstance(rc, dict):
            continue
        char_key = str(rc.get("character") or "red_eagle").strip().lower()
        if char_key not in CHARACTERS:
            char_key = "red_eagle"
        cid = str(rc.get("id") or f"char_{idx + 1}").strip()
        if cid in seen_ids:
            cid = f"{cid}_{idx + 1}"
        seen_ids.add(cid)
        side = "right" if str(rc.get("side") or ("left" if idx % 2 == 0 else "right")).lower() == "right" else "left"
        raw_p = rc.get("puppet") if isinstance(rc.get("puppet"), dict) else {}
        merged_p = _deep_merge(
            {
                "character": char_key,
                "outfit": rc.get("outfit") or "default",
                "skin": rc.get("skin") or "classic",
                "preset": (rc.get("voice") or {}).get("preset") or rc.get("preset") or CHARACTERS[char_key]["defaultPreset"],
                "voice": rc.get("voice") if isinstance(rc.get("voice"), dict) else {"speakerId": cid},
            },
            raw_p,
        )
        norm_p = normalize_puppet_config(merged_p, project_puppet=project_puppet)
        cast.append({
            "id": cid,
            "name": str(rc.get("name") or CHARACTERS[char_key]["label"]),
            "character": char_key,
            "side": side,
            "scale": round(_num(rc.get("scale"), 0.86, 0.35, 1.5), 3),
            "expression": str(rc.get("expression") or "neutral").lower(),
            "audio": rc.get("audio"),
            "viseme_track": rc.get("viseme_track"),
            "prosody_track": rc.get("prosody_track"),
            "puppet": norm_p,
        })

    if not cast:
        return None

    turns: List[Dict[str, Any]] = []
    cursor = 0.0
    for rt in raw_dialogue.get("turns") or []:
        if not isinstance(rt, dict):
            continue
        speaker = str(rt.get("speaker") or cast[0]["id"]).strip()
        if speaker not in seen_ids:
            speaker = cast[0]["id"]
        start = round(max(0.0, float(rt.get("start", cursor) if rt.get("start") is not None else cursor)), 3)
        dur = float(rt.get("duration") or 2.8)
        end = round(max(start + 0.15, float(rt.get("end", start + dur) if rt.get("end") is not None else (start + dur))), 3)
        cursor = end
        expr = str(rt.get("expression") or "neutral").strip().lower()
        if expr not in EMOTION_NAMES:
            expr = "neutral"
        react = str(rt.get("listener_reaction") or rt.get("listenerReaction") or "nodding").strip().lower()
        if react not in LISTENER_REACTIONS:
            react = "nodding"
        entry: Dict[str, Any] = {
            "speaker": speaker,
            "start": start,
            "end": end,
            "say": str(rt.get("say") or rt.get("text") or ""),
            "expression": expr,
            "listenerReaction": react,
        }
        if rt.get("gesture") and str(rt["gesture"]).strip().lower() in GESTURE_NAMES:
            entry["gesture"] = str(rt["gesture"]).strip().lower()
        if rt.get("audio"):
            entry["audio"] = str(rt["audio"])
        turns.append(entry)
    turns.sort(key=lambda x: x["start"])

    return {
        "mode": str(raw_dialogue.get("mode") or "two-shot").strip().lower(),
        "listenerReactions": True if raw_dialogue.get("listenerReactions") is None else bool(raw_dialogue.get("listenerReactions")),
        "characters": cast,
        "turns": turns,
        "duration": round(max((t["end"] for t in turns), default=6.0), 3),
    }


TAG_RE = re.compile(r"\[([a-zA-Z0-9_\-:+,.\s]+)\]")


def parse_script_tags(say_text: str, duration: float = 6.0) -> Dict[str, Any]:
    """Deterministically parse inline script tags like [smug], [angry:1.3], [point], [look:camera],
    [acc:top_hat,monocle], [outfit:formal].

    Returns clean narration text plus timed emotion, gesture, gaze, and accessory cues.
    """
    text = str(say_text or "")
    if not text.strip():
        return {"clean_text": "", "emotions": [], "gestures": [], "gaze": [], "accessories": []}

    raw_tags: List[Tuple[int, str]] = []
    clean_chunks: List[str] = []
    last_end = 0
    clean_len = 0

    for m in TAG_RE.finditer(text):
        before = text[last_end : m.start()]
        clean_chunks.append(before)
        clean_len += len(before)
        raw_tags.append((clean_len, m.group(1).strip().lower()))
        last_end = m.end()
    clean_chunks.append(text[last_end:])
    clean_text = re.sub(r"\s+", " ", "".join(clean_chunks)).strip()
    total_chars = max(1, len("".join(clean_chunks)))

    emotions: List[Dict[str, Any]] = []
    gestures: List[Dict[str, Any]] = []
    gaze: List[Dict[str, Any]] = []
    accessories: List[Dict[str, Any]] = []

    span = max(0.5, float(duration or 6.0) - 0.3)
    for char_pos, token in raw_tags:
        t_val = round(0.15 + (char_pos / total_chars) * span, 3)
        if token.startswith("look:"):
            gaze.append({"t": t_val, "target": token[5:].strip()})
            continue
        if token.startswith("acc:"):
            items = [x.strip() for x in token[4:].split(",") if x.strip() in ACCESSORY_NAMES]
            accessories.append({"t": t_val, "accessories": items})
            continue
        if token.startswith("outfit:"):
            okey = token[7:].strip()
            if okey in OUTFITS:
                accessories.append({"t": t_val, "outfit": okey})
            continue
        # Optional :intensity or +offset
        intensity = 1.0
        offset = 0.0
        base = token
        if "+" in base:
            base, off_s = base.split("+", 1)
            offset = _num(off_s, 0.0, -1.0, 1.0)
        if ":" in base:
            base, int_s = base.split(":", 1)
            intensity = _num(int_s, 1.0, 0.1, 1.5)
        if base in EMOTION_NAMES:
            emotions.append({"t": t_val, "expression": base, "intensity": intensity, "blend": 0.32})
        elif base in GESTURE_NAMES:
            gestures.append({"t": max(0.0, round(t_val + offset, 3)), "gesture": base, "duration": 1.05, "offset": offset, "intensity": intensity})

    return {
        "clean_text": clean_text,
        "emotions": emotions,
        "gestures": gestures,
        "gaze": gaze,
        "accessories": accessories,
    }


def export_preset_json(name: str, puppet_cfg: Dict[str, Any]) -> str:
    """Serialize a normalized user puppet preset to deterministic JSON."""
    norm = normalize_puppet_config(puppet_cfg)
    payload = {
        "schema": "khordegir-puppet-preset",
        "version": PUPPET_SCHEMA_VERSION,
        "khordegirPuppetPreset": PUPPET_SCHEMA_VERSION,
        "name": str(name or "custom-preset").strip() or "custom-preset",
        "puppet": norm,
    }
    return json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True)


def import_preset_json(raw_json: str) -> Dict[str, Any]:
    """Parse and validate an imported user puppet preset JSON string."""
    parsed = json.loads(raw_json)
    if not isinstance(parsed, dict):
        raise ValueError("Preset JSON must be an object")
    puppet_raw = parsed.get("puppet") if isinstance(parsed.get("puppet"), dict) else parsed
    return {
        "name": str(parsed.get("name") or "imported-preset").strip() or "imported-preset",
        "puppet": normalize_puppet_config(puppet_raw),
    }
