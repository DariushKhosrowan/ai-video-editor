"""Project loader and normalizer for Khordegir Studio (`video.yaml` single source of truth).

Preserves every existing schema key, resolves relative images, audio files, viseme tracks,
template aliases (including `mascot_talk`), and multi-format dimensions (`16:9`, `9:16`, `1:1`).
Works both with PyYAML installed AND cleanly offline with zero external deps via a fallback parser.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from .index import load_template_entries
from .mascot_lipsync import analyze_audio, analyze_prosody, derive_prosody_path
from .puppet_schema import normalize_dialogue_config, normalize_puppet_config
from .srt import load_srt_file, parse_srt

try:
    import yaml as _pyyaml  # type: ignore
except ImportError:
    _pyyaml = None

PKG_DIR = Path(__file__).resolve().parent

FORMATS: Dict[str, Tuple[int, int]] = {
    "16:9": (1920, 1080),
    "9:16": (1080, 1920),
    "1:1": (1080, 1080),
}


def resolve_format_size(fmt: Optional[str]) -> Tuple[int, int]:
    key = str(fmt or "16:9").strip()
    return FORMATS.get(key, FORMATS["16:9"])


def _strip_yaml_comment(line: str) -> str:
    in_sq = False
    in_dq = False
    for idx, ch in enumerate(line):
        if ch == "'" and not in_dq:
            in_sq = not in_sq
        elif ch == '"' and not in_sq and (idx == 0 or line[idx - 1] != "\\"):
            in_dq = not in_dq
        elif ch == "#" and not in_sq and not in_dq:
            if idx == 0 or line[idx - 1].isspace():
                return line[:idx].rstrip()
    return line.rstrip()


def _parse_scalar(val: str) -> Any:
    s = val.strip()
    if s == "" or s in ("~", "null", "Null", "NULL"):
        return None
    if s in ("true", "True", "TRUE"):
        return True
    if s in ("false", "False", "FALSE"):
        return False
    if (s.startswith('"') and s.endswith('"')) or (s.startswith("'") and s.endswith("'")):
        if s.startswith('"'):
            try:
                return json.loads(s)
            except Exception:
                return s[1:-1]
        return s[1:-1].replace("''", "'")
    if (s.startswith("[") and s.endswith("]")) or (s.startswith("{") and s.endswith("}")):
        try:
            return json.loads(s)
        except Exception:
            if s.startswith("[") and s.endswith("]"):
                inner = s[1:-1].strip()
                if not inner:
                    return []
                return [_parse_scalar(x) for x in inner.split(",")]
    if re.fullmatch(r"[-+]?\d+", s):
        return int(s)
    if re.fullmatch(r"[-+]?(?:\d+\.\d*|\.\d+)", s):
        return float(s)
    return s


def _split_kv(text: str) -> Optional[Tuple[str, str]]:
    in_sq = False
    in_dq = False
    for idx, ch in enumerate(text):
        if ch == "'" and not in_dq:
            in_sq = not in_sq
        elif ch == '"' and not in_dq and (idx == 0 or text[idx - 1] != "\\"):
            in_dq = not in_dq
        elif ch == ":" and not in_sq and not in_dq:
            if idx + 1 == len(text) or text[idx + 1].isspace():
                key = text[:idx].strip().strip("\"'")
                rest = text[idx + 1 :].strip()
                return key, rest
    return None


def _stdlib_yaml_load(text: str) -> Any:
    """Minimal deterministic YAML subset loader covering all video.yaml constructs."""
    raw_lines = text.splitlines()
    tokens: List[Tuple[int, str]] = []
    i = 0
    while i < len(raw_lines):
        cleaned = _strip_yaml_comment(raw_lines[i])
        if not cleaned.strip():
            i += 1
            continue
        indent = len(cleaned) - len(cleaned.lstrip(" "))
        stripped = cleaned.strip()
        # Handle block scalars | and >
        kv = _split_kv(stripped)
        if kv and kv[1] in ("|", "|-", ">", ">-"):
            mode = kv[1][0]
            block: List[str] = []
            j = i + 1
            base_ind: Optional[int] = None
            while j < len(raw_lines):
                ln = raw_lines[j]
                if not ln.strip():
                    block.append("")
                    j += 1
                    continue
                ind_j = len(ln) - len(ln.lstrip(" "))
                if ind_j <= indent:
                    break
                if base_ind is None:
                    base_ind = ind_j
                block.append(ln[base_ind:])
                j += 1
            while block and block[-1] == "":
                block.pop()
            joined = ("\n" if mode == "|" else " ").join(block)
            tokens.append((indent, f"{kv[0]}: {json.dumps(joined, ensure_ascii=False)}"))
            i = j
            continue
        tokens.append((indent, stripped))
        i += 1

    if not tokens:
        return {}

    def parse_block(idx: int, min_indent: int) -> Tuple[Any, int]:
        if idx >= len(tokens):
            return {}, idx
        cur_ind, first = tokens[idx]
        if first.startswith("- ") or first == "-":
            arr: List[Any] = []
            while idx < len(tokens):
                ind, txt = tokens[idx]
                if ind < cur_ind or (not txt.startswith("- ") and txt != "-"):
                    break
                item_str = txt[1:].strip()
                idx += 1
                if not item_str:
                    val, idx = parse_block(idx, ind + 1)
                    arr.append(val)
                else:
                    kv = _split_kv(item_str)
                    if kv:
                        obj: Dict[str, Any] = {}
                        k, rest = kv
                        if rest:
                            obj[k] = _parse_scalar(rest)
                        else:
                            sub, idx = parse_block(idx, ind + 2)
                            obj[k] = sub
                        while idx < len(tokens) and tokens[idx][0] > ind and not tokens[idx][1].startswith("-"):
                            s_ind, s_txt = tokens[idx]
                            skv = _split_kv(s_txt)
                            if not skv:
                                break
                            sk, srest = skv
                            idx += 1
                            if srest:
                                obj[sk] = _parse_scalar(srest)
                            else:
                                sub, idx = parse_block(idx, s_ind + 1)
                                obj[sk] = sub
                        arr.append(obj)
                    else:
                        arr.append(_parse_scalar(item_str))
            return arr, idx

        mapping: Dict[str, Any] = {}
        while idx < len(tokens):
            ind, txt = tokens[idx]
            if ind < min_indent or txt.startswith("- ") or txt == "-":
                break
            kv = _split_kv(txt)
            if not kv:
                idx += 1
                continue
            k, rest = kv
            idx += 1
            if rest:
                mapping[k] = _parse_scalar(rest)
            else:
                if idx < len(tokens) and tokens[idx][0] > ind:
                    sub, idx = parse_block(idx, ind + 1)
                    mapping[k] = sub
                else:
                    mapping[k] = None
        return mapping, idx

    parsed, _ = parse_block(0, tokens[0][0])
    return parsed if isinstance(parsed, dict) else {}


def load_yaml(text: str) -> Dict[str, Any]:
    if _pyyaml is not None:
        data = _pyyaml.safe_load(text)
        return data if isinstance(data, dict) else {}
    # Prefer js-yaml via Node if available for 100% YAML fidelity, else stdlib subset parser
    node_bin = shutil.which("node")
    js_yaml = PKG_DIR / "vendor" / "js-yaml.min.js"
    if node_bin and js_yaml.is_file():
        script = (
            "const fs=require('fs'), y=require(process.argv[1]);"
            "const doc=y.load(fs.readFileSync(0,'utf8'));"
            "process.stdout.write(JSON.stringify(doc || {}));"
        )
        proc = subprocess.run(
            [node_bin, "-e", script, str(js_yaml)],
            input=text.encode("utf-8"),
            capture_output=True,
            check=False,
        )
        if proc.returncode == 0 and proc.stdout:
            data = json.loads(proc.stdout.decode("utf-8"))
            if isinstance(data, dict):
                return data
    return _stdlib_yaml_load(text)


def build_alias_map() -> Dict[str, str]:
    aliases: Dict[str, str] = {}
    for entry in load_template_entries(PKG_DIR):
        name = entry["name"]
        aliases[name] = name
        aliases[name.replace("_", "-")] = name
        for al in entry.get("schema", {}).get("aliases", []) or []:
            aliases[str(al)] = name
            aliases[str(al).replace("-", "_")] = name
    return aliases


def resolve_asset_path(project_dir: Path, raw: Any, *, kind: str = "file") -> Optional[Path]:
    if not raw or not isinstance(raw, str):
        return None
    s = raw.strip()
    if not s or re.match(r"^(https?:|data:|blob:)", s):
        return None
    if s.startswith("/assets/"):
        cand = PKG_DIR / "assets" / s[len("/assets/"):]
        return cand if cand.exists() else None
    if s.startswith("assets/"):
        cand = PKG_DIR / s
        return cand if cand.exists() else None
    clean = s.lstrip("/")
    for base in (project_dir, project_dir / "img", project_dir / "audio", PKG_DIR / "assets"):
        cand = base / clean
        if cand.exists():
            return cand
    return None


def load_project(
    project_dir: str | Path,
    *,
    auto_lipsync: bool = True,
    fps: int = 30,
) -> Dict[str, Any]:
    """Load and normalize a Khordegir project directory containing `video.yaml`."""
    pdir = Path(project_dir).resolve()
    yaml_path = pdir / "video.yaml"
    if not yaml_path.is_file():
        raise FileNotFoundError(f"video.yaml not found in {pdir}")

    data = load_yaml(yaml_path.read_text(encoding="utf-8"))
    alias_map = build_alias_map()

    proj_seed = int(data.get("seed", 0) or 0)
    proj_format = str(data.get("format", "16:9") or "16:9")
    proj_puppet_raw = data.get("puppet") if isinstance(data.get("puppet"), dict) else None
    proj_puppet_norm = normalize_puppet_config(proj_puppet_raw) if proj_puppet_raw is not None else None
    slides_in = data.get("slides") or []
    normalized_slides: List[Dict[str, Any]] = []

    inherited_keys = (
        "preset",
        "transition",
        "transitionTiming",
        "transition_timing",
        "motionPersonality",
        "motion_personality",
        "motionPace",
        "motion_pace",
        "motionSpeed",
        "motion_speed",
        "stepDelay",
        "step_delay",
        "revealMode",
        "reveal_mode",
        "textMotion",
        "text_motion",
        "captionStyle",
        "caption_style",
        "brandKit",
        "camera",
        "cameraConfig",
        "ambience",
        "particles",
        "weather",
        "logo",
        "logo_motion",
        "logo_position",
        "logo_text",
        "livingStage",
        "motionCurve",
        "srt",
        "fps",
        "transparent",
        "shot",
        "lighting",
        "scene",
    )

    for idx, raw_slide in enumerate(slides_in):
        if not isinstance(raw_slide, dict):
            continue
        s = json.loads(json.dumps(raw_slide))
        raw_tpl = str(s.get("template") or "quote").strip()
        tpl_norm = alias_map.get(raw_tpl) or alias_map.get(raw_tpl.replace("-", "_")) or raw_tpl.replace("-", "_")
        s["template"] = tpl_norm
        s["_num"] = idx + 1
        s["_seed"] = f"{pdir.name}:{proj_seed}:{idx + 1}"
        if "format" not in s or s["format"] == "auto":
            s["format"] = proj_format

        for ik in inherited_keys:
            if ik in data and ik not in s:
                s[ik] = json.loads(json.dumps(data[ik]))

        # Resolve image URIs for local rendering when file exists
        for img_key in ("image", "src", "bg_image", "before_image", "after_image", "avatar", "photo1", "photo2", "photo3"):
            if isinstance(s.get(img_key), str):
                resolved = resolve_asset_path(pdir, s[img_key], kind="image")
                if resolved is not None:
                    s[f"_{img_key}_path"] = str(resolved)

        # Puppet Schema v2 normalization & project -> slide inheritance (computed before auto-analysis so calibration applies)
        slide_puppet_raw = s.get("puppet") if isinstance(s.get("puppet"), dict) else None
        if slide_puppet_raw is None and isinstance(s.get("mascot"), dict) and isinstance(s["mascot"].get("puppet"), dict):
            slide_puppet_raw = s["mascot"]["puppet"]
        legacy_tone = (s["mascot"].get("tone") if isinstance(s.get("mascot"), dict) else None) or s.get("tone")
        has_puppet_context = (
            slide_puppet_raw is not None
            or proj_puppet_raw is not None
            or tpl_norm in ("mascot_talk", "mascot_pip")
            or isinstance(s.get("mascot"), dict)
        )
        active_cal: Optional[Dict[str, Any]] = None
        if has_puppet_context:
            s["puppet"] = normalize_puppet_config(
                slide_puppet_raw,
                legacy_tone=legacy_tone,
                project_puppet=proj_puppet_raw,
            )
            if isinstance(s["puppet"].get("calibration"), dict) and s["puppet"]["calibration"].get("calibrated"):
                active_cal = s["puppet"]["calibration"]

        # Resolve audio, SRT captions, and viseme_track
        audio_path = resolve_asset_path(pdir, s.get("audio"), kind="audio")
        if audio_path is not None:
            s["_audio_path"] = str(audio_path)

        srt_field = s.get("srt")
        if isinstance(srt_field, str) and srt_field.strip():
            srt_path = resolve_asset_path(pdir, srt_field, kind="srt")
            if srt_path is not None:
                s["_srt_path"] = str(srt_path)
                if "captions" not in s:
                    s["captions"] = load_srt_file(srt_path)
        elif isinstance(s.get("captions"), str) and s["captions"].strip():
            s["captions"] = parse_srt(s["captions"])

        vt_field = s.get("viseme_track")
        vt_path: Optional[Path] = None
        if isinstance(vt_field, dict):
            s["visemeTrack"] = vt_field
        elif isinstance(vt_field, str):
            vt_path = resolve_asset_path(pdir, vt_field, kind="json")
            if vt_path is not None:
                s["visemeTrack"] = json.loads(vt_path.read_text(encoding="utf-8"))

        if "visemeTrack" not in s and audio_path is not None and auto_lipsync:
            tr_path = resolve_asset_path(pdir, s.get("transcript"), kind="json")
            narration_text = str(s.get("say") or (s.get("mascot") or {}).get("say") or "").strip() or None
            s["visemeTrack"] = analyze_audio(
                audio_path,
                transcript_path=tr_path,
                text=narration_text,
                fps=fps,
                calibration=active_cal,
            )

        # Resolve prosody_track (explicit path/object -> sibling *.prosody.json -> auto analyze_prosody)
        pt_field = s.get("prosody_track")
        if isinstance(pt_field, dict):
            s["prosodyTrack"] = pt_field
        elif isinstance(pt_field, str):
            pt_path = resolve_asset_path(pdir, pt_field, kind="json")
            if pt_path is not None:
                s["prosodyTrack"] = json.loads(pt_path.read_text(encoding="utf-8"))
        if "prosodyTrack" not in s and vt_path is not None:
            sib = derive_prosody_path(vt_path)
            if sib.is_file():
                s["prosodyTrack"] = json.loads(sib.read_text(encoding="utf-8"))
        if "prosodyTrack" not in s and audio_path is not None and auto_lipsync:
            s["prosodyTrack"] = analyze_prosody(audio_path, fps=fps, calibration=active_cal)

        # Phase 4 Item 12: Multi-character dialogue normalization & per-character audio/track resolution
        if isinstance(s.get("dialogue"), dict):
            norm_dlg = normalize_dialogue_config(s["dialogue"], project_puppet=proj_puppet_raw)
            if norm_dlg is not None:
                for ch in norm_dlg["characters"]:
                    ch_audio = resolve_asset_path(pdir, ch.get("audio") or (ch.get("puppet") or {}).get("voice", {}).get("audio"), kind="audio")
                    ch_cal = (ch.get("puppet") or {}).get("calibration")
                    if ch_audio is not None:
                        ch["_audio_path"] = str(ch_audio)
                    if isinstance(ch.get("viseme_track"), dict):
                        ch["visemeTrack"] = ch["viseme_track"]
                    elif isinstance(ch.get("viseme_track"), str):
                        ch_vt_p = resolve_asset_path(pdir, ch["viseme_track"], kind="json")
                        if ch_vt_p is not None:
                            ch["visemeTrack"] = json.loads(ch_vt_p.read_text(encoding="utf-8"))
                    if "visemeTrack" not in ch and ch_audio is not None and auto_lipsync:
                        ch_text = " ".join(t["say"] for t in norm_dlg["turns"] if t["speaker"] == ch["id"]).strip() or None
                        ch["visemeTrack"] = analyze_audio(ch_audio, text=ch_text, fps=fps, calibration=ch_cal)
                    if isinstance(ch.get("prosody_track"), dict):
                        ch["prosodyTrack"] = ch["prosody_track"]
                    elif isinstance(ch.get("prosody_track"), str):
                        ch_pt_p = resolve_asset_path(pdir, ch["prosody_track"], kind="json")
                        if ch_pt_p is not None:
                            ch["prosodyTrack"] = json.loads(ch_pt_p.read_text(encoding="utf-8"))
                    if "prosodyTrack" not in ch and ch_audio is not None and auto_lipsync:
                        ch["prosodyTrack"] = analyze_prosody(ch_audio, fps=fps, calibration=ch_cal)
                s["dialogue"] = norm_dlg
                if "duration" not in s and norm_dlg.get("duration"):
                    s["duration"] = norm_dlg["duration"]

        if isinstance(s.get("mascot"), dict):
            if "visemeTrack" in s and "visemeTrack" not in s["mascot"]:
                s["mascot"]["visemeTrack"] = s["visemeTrack"]
            if "prosodyTrack" in s and "prosodyTrack" not in s["mascot"]:
                s["mascot"]["prosodyTrack"] = s["prosodyTrack"]
            if "puppet" in s and "puppet" not in s["mascot"]:
                s["mascot"]["puppet"] = s["puppet"]

        normalized_slides.append(s)

    return {
        "dir": str(pdir),
        "name": pdir.name,
        "title": data.get("title", pdir.name),
        "theme": data.get("theme", "khordegir-dark"),
        "format": proj_format,
        "seed": proj_seed,
        "puppet": proj_puppet_norm,
        "raw": data,
        "slides": normalized_slides,
    }
