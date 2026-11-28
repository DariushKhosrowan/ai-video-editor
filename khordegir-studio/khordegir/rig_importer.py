"""Offline SVG Rig Importer for Khordegir Studio Puppet Schema v2 (Phase 4 Item 13).

Maps named SVG `<g>` layers (id, inkscape:label, data-name, data-part, class) to the
canonical 18-part puppet tree, computes bounding boxes from vector primitives (`path`,
`rect`, `circle`, `ellipse`, `polygon`, `polyline`, `line`), normalizes coordinates into
the 640x720 puppet stage space, and proposes anatomically accurate pivot points and z-orders.

100% offline, deterministic, stdlib-only (xml.etree.ElementTree), MIT-compatible.
"""

from __future__ import annotations

import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from .puppet_schema import PART_DEFAULTS, normalize_puppet_config

TARGET_W = 640.0
TARGET_H = 720.0

# Bilingual (English + Persian) layer name aliases mapped to the 18 canonical puppet parts
PART_ALIASES: Dict[str, Tuple[str, ...]] = {
    "body":        ("body", "torso", "chest", "m-body", "بدن", "سینه", "تنه"),
    "head":        ("head", "face", "skull", "m-head", "سر", "صورت"),
    "beak_upper":  ("beak_upper", "beak-upper", "upper_beak", "upper-beak", "upperbeak", "mouth_top", "m-upper-beak", "منقار-بالا", "منقار_بالا", "لب-بالا"),
    "beak_lower":  ("beak_lower", "beak-lower", "lower_beak", "lower-beak", "lowerbeak", "jaw", "mouth_bottom", "m-lower-beak", "منقار-پایین", "منقار_پایین", "فک"),
    "eye_l":       ("eye_l", "eye-l", "left_eye", "left-eye", "eyeleft", "m-eye-l", "چشم-چپ", "چشم_چپ"),
    "eye_r":       ("eye_r", "eye-r", "right_eye", "right-eye", "eyeright", "m-eye-r", "چشم-راست", "چشم_راست"),
    "pupil_l":     ("pupil_l", "pupil-l", "left_pupil", "left-pupil", "iris_l", "m-pupil-l", "مردمک-چپ", "مردمک_چپ"),
    "pupil_r":     ("pupil_r", "pupil-r", "right_pupil", "right-pupil", "iris_r", "m-pupil-r", "مردمک-راست", "مردمک_راست"),
    "lid_l":       ("lid_l", "lid-l", "left_lid", "left-lid", "eyelid_l", "m-lid-l", "پلک-چپ", "پلک_چپ"),
    "lid_r":       ("lid_r", "lid-r", "right_lid", "right-lid", "eyelid_r", "m-lid-r", "پلک-راست", "پلک_راست"),
    "brow_l":      ("brow_l", "brow-l", "left_brow", "left-brow", "eyebrow_l", "m-brow-l", "ابرو-چپ", "ابروی-چپ", "ابروی_چپ"),
    "brow_r":      ("brow_r", "brow-r", "right_brow", "right-brow", "eyebrow_r", "m-brow-r", "ابرو-راست", "ابروی-راست", "ابروی_راست"),
    "crest":       ("crest", "plume", "tuft", "comb", "hair", "crown_feathers", "shell", "m-crest-wing", "تاج", "کاکل", "لاک"),
    "wing_l":      ("wing_l", "wing-l", "left_wing", "left-wing", "arm_l", "left_arm", "m-wing-l", "بال-چپ", "بال_چپ", "دست-چپ"),
    "wing_r":      ("wing_r", "wing-r", "right_wing", "right-wing", "arm_r", "right_arm", "m-wing-r", "بال-راست", "بال_راست", "دست-راست"),
    "tail":        ("tail", "tail_feathers", "m-tail", "دم"),
    "legs":        ("legs", "feet", "talons", "claws", "m-legs", "پا", "پاها", "چنگال"),
    "accessories": ("accessories", "accessory", "props", "hat", "glasses", "costume", "m-accessories", "اکسسوری", "اکسسوری‌ها", "کلاه", "عینک"),
}

# Normalized anchor ratios (u in [0,1] left->right, v in [0,1] top->bottom) for anatomical auto-pivot suggestion
PART_PIVOT_ANCHORS: Dict[str, Tuple[float, float]] = {
    "body":        (0.50, 0.90),  # hips / base of torso
    "head":        (0.50, 0.88),  # neck base hinge
    "beak_upper":  (0.50, 0.45),  # upper bridge hinge
    "beak_lower":  (0.50, 0.15),  # top-center jaw hinge
    "eye_l":       (0.50, 0.50),
    "eye_r":       (0.50, 0.50),
    "pupil_l":     (0.50, 0.50),
    "pupil_r":     (0.50, 0.50),
    "lid_l":       (0.50, 0.50),
    "lid_r":       (0.50, 0.50),
    "brow_l":      (0.50, 0.55),
    "brow_r":      (0.50, 0.55),
    "crest":       (0.20, 0.78),  # shoulder/crown attachment root
    "wing_l":      (0.85, 0.18),  # right-top shoulder attachment
    "wing_r":      (0.15, 0.18),  # left-top shoulder attachment
    "tail":        (0.50, 0.15),  # base of tail
    "legs":        (0.50, 0.12),  # hip joint
    "accessories": (0.50, 0.50),
}

_NUM_RE = re.compile(r"[-+]?(?:\d+\.\d+|\d+|\.\d+)(?:[eE][-+]?\d+)?")
_PATH_TOKEN_RE = re.compile(r"[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d+\.\d+|\d+|\.\d+)(?:[eE][-+]?\d+)?")


def _strip_ns(tag: str) -> str:
    return tag.split("}", 1)[1] if "}" in tag else tag


def _parse_float(val: Optional[str], default: float = 0.0) -> float:
    if not val:
        return default
    m = _NUM_RE.search(str(val))
    return float(m.group(0)) if m else default


def _parse_viewbox(root: ET.Element) -> Tuple[float, float, float, float]:
    vb = root.attrib.get("viewBox") or root.attrib.get("viewbox")
    if vb:
        nums = [float(x) for x in _NUM_RE.findall(vb)]
        if len(nums) >= 4 and nums[2] > 0 and nums[3] > 0:
            return nums[0], nums[1], nums[2], nums[3]
    w = _parse_float(root.attrib.get("width"), TARGET_W)
    h = _parse_float(root.attrib.get("height"), TARGET_H)
    return 0.0, 0.0, (w if w > 0 else TARGET_W), (h if h > 0 else TARGET_H)


def _path_points(d: str) -> List[Tuple[float, float]]:
    """Extract approximate anchor/control points from an SVG path `d` attribute."""
    tokens = _PATH_TOKEN_RE.findall(d or "")
    pts: List[Tuple[float, float]] = []
    cmd = ""
    i = 0
    cx = 0.0
    cy = 0.0
    sx = 0.0
    sy = 0.0

    def next_f() -> float:
        nonlocal i
        v = float(tokens[i])
        i += 1
        return v

    while i < len(tokens):
        tk = tokens[i]
        if len(tk) == 1 and tk.isalpha():
            cmd = tk
            i += 1
            if cmd in ("Z", "z"):
                cx, cy = sx, sy
            continue
        if not cmd:
            i += 1
            continue
        try:
            if cmd in ("M", "L", "T"):
                x, y = next_f(), next_f()
                cx, cy = x, y
                if cmd == "M":
                    sx, sy = cx, cy
                    cmd = "L"
                pts.append((cx, cy))
            elif cmd in ("m", "l", "t"):
                dx, dy = next_f(), next_f()
                cx += dx
                cy += dy
                if cmd == "m":
                    sx, sy = cx, cy
                    cmd = "l"
                pts.append((cx, cy))
            elif cmd == "H":
                cx = next_f()
                pts.append((cx, cy))
            elif cmd == "h":
                cx += next_f()
                pts.append((cx, cy))
            elif cmd == "V":
                cy = next_f()
                pts.append((cx, cy))
            elif cmd == "v":
                cy += next_f()
                pts.append((cx, cy))
            elif cmd in ("C", "c"):
                rel = cmd == "c"
                x1, y1, x2, y2, x, y = next_f(), next_f(), next_f(), next_f(), next_f(), next_f()
                if rel:
                    pts.extend([(cx + x1, cy + y1), (cx + x2, cy + y2), (cx + x, cy + y)])
                    cx += x
                    cy += y
                else:
                    pts.extend([(x1, y1), (x2, y2), (x, y)])
                    cx, cy = x, y
            elif cmd in ("S", "s", "Q", "q"):
                rel = cmd in ("s", "q")
                x1, y1, x, y = next_f(), next_f(), next_f(), next_f()
                if rel:
                    pts.extend([(cx + x1, cy + y1), (cx + x, cy + y)])
                    cx += x
                    cy += y
                else:
                    pts.extend([(x1, y1), (x, y)])
                    cx, cy = x, y
            elif cmd in ("A", "a"):
                rel = cmd == "a"
                _rx, _ry, _rot, _laf, _sf, x, y = (
                    next_f(), next_f(), next_f(), next_f(), next_f(), next_f(), next_f()
                )
                if rel:
                    cx += x
                    cy += y
                else:
                    cx, cy = x, y
                pts.append((cx, cy))
            else:
                i += 1
        except (IndexError, ValueError):
            break
    return pts


def _element_bbox(el: ET.Element) -> Optional[Tuple[float, float, float, float]]:
    """Compute (minX, minY, maxX, maxY) across all vector primitives inside an SVG node."""
    xs: List[float] = []
    ys: List[float] = []

    for node in el.iter():
        tag = _strip_ns(node.tag).lower()
        if tag == "path":
            for px, py in _path_points(node.attrib.get("d", "")):
                xs.append(px)
                ys.append(py)
        elif tag == "rect":
            x = _parse_float(node.attrib.get("x"), 0.0)
            y = _parse_float(node.attrib.get("y"), 0.0)
            w = _parse_float(node.attrib.get("width"), 0.0)
            h = _parse_float(node.attrib.get("height"), 0.0)
            if w > 0 or h > 0:
                xs.extend([x, x + w])
                ys.extend([y, y + h])
        elif tag == "circle":
            cx = _parse_float(node.attrib.get("cx"), 0.0)
            cy = _parse_float(node.attrib.get("cy"), 0.0)
            r = _parse_float(node.attrib.get("r"), 0.0)
            xs.extend([cx - r, cx + r])
            ys.extend([cy - r, cy + r])
        elif tag == "ellipse":
            cx = _parse_float(node.attrib.get("cx"), 0.0)
            cy = _parse_float(node.attrib.get("cy"), 0.0)
            rx = _parse_float(node.attrib.get("rx"), 0.0)
            ry = _parse_float(node.attrib.get("ry"), 0.0)
            xs.extend([cx - rx, cx + rx])
            ys.extend([cy - ry, cy + ry])
        elif tag in ("polygon", "polyline"):
            nums = [float(v) for v in _NUM_RE.findall(node.attrib.get("points", ""))]
            for idx in range(0, len(nums) - 1, 2):
                xs.append(nums[idx])
                ys.append(nums[idx + 1])
        elif tag == "line":
            xs.extend([_parse_float(node.attrib.get("x1"), 0.0), _parse_float(node.attrib.get("x2"), 0.0)])
            ys.extend([_parse_float(node.attrib.get("y1"), 0.0), _parse_float(node.attrib.get("y2"), 0.0)])

    if not xs or not ys:
        return None
    return min(xs), min(ys), max(xs), max(ys)


def _extract_fill_hex(el: ET.Element) -> Optional[str]:
    for node in el.iter():
        fill = (node.attrib.get("fill") or "").strip()
        if re.fullmatch(r"#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?", fill):
            return fill.upper()
    return None


def _match_part_name(candidates: List[str]) -> Optional[str]:
    tokens: List[str] = []
    for raw in candidates:
        if not raw:
            continue
        s = str(raw).strip().lower()
        if not s:
            continue
        tokens.append(s)
        for piece in re.split(r"[\s,]+", s):
            if piece:
                tokens.append(piece)

    # Exact alias match first
    for tok in tokens:
        norm = tok.replace(" ", "_")
        for part_key, aliases in PART_ALIASES.items():
            if tok in aliases or norm in aliases:
                return part_key

    # Substring match fallback (longest alias first for specificity)
    ordered: List[Tuple[str, str]] = []
    for part_key, aliases in PART_ALIASES.items():
        for al in aliases:
            ordered.append((al, part_key))
    ordered.sort(key=lambda x: len(x[0]), reverse=True)

    for tok in tokens:
        for al, part_key in ordered:
            if len(al) >= 3 and al in tok:
                return part_key
    return None


def import_svg_rig_text(svg_text: str, *, character: str = "red_eagle") -> Dict[str, Any]:
    """Parse an SVG string, map named `<g>` layers to the 18 puppet parts, and suggest pivots."""
    if not svg_text or not svg_text.strip():
        raise ValueError("Empty SVG content")

    try:
        root = ET.fromstring(svg_text)
    except ET.ParseError as exc:
        raise ValueError(f"Invalid SVG XML: {exc}") from exc

    vx, vy, vw, vh = _parse_viewbox(root)
    sx = TARGET_W / max(1.0, vw)
    sy = TARGET_H / max(1.0, vh)

    matched_parts: Dict[str, Dict[str, Any]] = {}
    layer_report: List[Dict[str, Any]] = []
    unmatched_layers: List[str] = []
    z_idx = 0

    for node in root.iter():
        tag = _strip_ns(node.tag).lower()
        if tag != "g":
            continue
        z_idx += 1
        # Collect candidate labels from standard SVG / Inkscape / Illustrator / Figma attributes
        raw_id = node.attrib.get("id", "")
        raw_data_part = node.attrib.get("data-part", "")
        raw_data_name = node.attrib.get("data-name", "")
        raw_class = node.attrib.get("class", "")
        raw_ink = ""
        for k, v in node.attrib.items():
            if k.endswith("}label") or k == "inkscape:label":
                raw_ink = v
                break

        candidates = [raw_data_part, raw_id, raw_ink, raw_data_name, raw_class]
        display_name = raw_data_part or raw_id or raw_ink or raw_data_name or raw_class
        if not display_name:
            continue

        part_key = _match_part_name(candidates)
        if not part_key:
            unmatched_layers.append(display_name)
            continue

        bbox = _element_bbox(node)
        default_part = PART_DEFAULTS[part_key]
        if bbox is not None:
            min_x, min_y, max_x, max_y = bbox
            nx0 = (min_x - vx) * sx
            ny0 = (min_y - vy) * sy
            nx1 = (max_x - vx) * sx
            ny1 = (max_y - vy) * sy
            u, v = PART_PIVOT_ANCHORS.get(part_key, (0.5, 0.5))
            pivot_x = round(max(0.0, min(TARGET_W, nx0 + (nx1 - nx0) * u)), 1)
            pivot_y = round(max(0.0, min(TARGET_H, ny0 + (ny1 - ny0) * v)), 1)
            norm_bbox = [round(nx0, 1), round(ny0, 1), round(nx1, 1), round(ny1, 1)]
        else:
            pivot_x = float(default_part["pivotX"])
            pivot_y = float(default_part["pivotY"])
            norm_bbox = None

        fill_hex = _extract_fill_hex(node)
        visible = (node.attrib.get("display", "").lower() != "none") and (node.attrib.get("visibility", "").lower() != "hidden")

        # Keep first explicit match unless a later node carries an explicit data-part
        if part_key not in matched_parts or raw_data_part:
            matched_parts[part_key] = {
                "x": 0.0,
                "y": 0.0,
                "rotation": 0.0,
                "scaleX": 1.0,
                "scaleY": 1.0,
                "pivotX": pivot_x,
                "pivotY": pivot_y,
                "zOrder": z_idx,
                "color": fill_hex,
                "outlineWidth": 1.0,
                "visible": visible,
            }
            layer_report.append({
                "layer": display_name,
                "part": part_key,
                "label": default_part["label"],
                "labelEn": default_part["labelEn"],
                "pivotX": pivot_x,
                "pivotY": pivot_y,
                "zOrder": z_idx,
                "bbox": norm_bbox,
                "color": fill_hex,
            })

    missing_parts = [pk for pk in PART_DEFAULTS if pk not in matched_parts]
    puppet_cfg = normalize_puppet_config({
        "character": character,
        "paletteLock": False if any(p.get("color") for p in matched_parts.values()) else True,
        "parts": matched_parts,
    })

    return {
        "schema": "khordegir-svg-rig-import",
        "version": 1,
        "viewBox": [round(vx, 2), round(vy, 2), round(vw, 2), round(vh, 2)],
        "matchedCount": len(matched_parts),
        "totalCanonicalParts": len(PART_DEFAULTS),
        "layers": layer_report,
        "missingParts": missing_parts,
        "unmatchedLayers": unmatched_layers,
        "parts": puppet_cfg["parts"],
        "puppet": puppet_cfg,
    }


def import_svg_rig_file(
    svg_path: str | Path,
    *,
    output_path: Optional[str | Path] = None,
    character: str = "red_eagle",
) -> Dict[str, Any]:
    """Read an SVG file from disk, map layers to Puppet Schema v2, and optionally write JSON."""
    p = Path(svg_path)
    if not p.is_file():
        raise FileNotFoundError(f"SVG file not found: {p}")
    result = import_svg_rig_text(p.read_text(encoding="utf-8"), character=character)
    result["sourceFile"] = p.name
    if output_path is not None:
        out_p = Path(output_path)
        out_p.parent.mkdir(parents=True, exist_ok=True)
        out_p.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return result
