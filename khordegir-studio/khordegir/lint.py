"""Validator for Khordegir Studio video.yaml projects."""
from __future__ import annotations

import difflib
import json
import os
import re
import subprocess
from pathlib import Path
from typing import Any

PKG_ROOT = Path(__file__).resolve().parent

COMMON_KEYS = frozenset({
    "template", "layout", "say", "source", "note", "duration",
    "transition", "preset", "seed", "variant", "motion",
    "background", "bg_style", "drift", "pop", "flash", "act",
    "steps", "overrides", "fx", "logo", "annotations", "livingStage",
})

VALID_LAYOUTS = frozenset({"SLIDE", "SCAM", "CAM"})
IMAGE_KEYS = frozenset({"image", "src", "bg_image", "icon_image", "logo"})
IMAGE_EXTS = (".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif")

TITLE_KEYS = frozenset({"title", "a_title", "b_title", "article_title", "eyebrow", "heading"})
BODY_KEYS = frozenset({
    "body", "text", "quote", "finding", "excerpt", "subtitle",
    "caption", "a_body", "b_body", "article_body", "verdict",
})
SKIP_MARKUP_KEYS = frozenset({
    "template", "layout", "transition", "preset", "variant", "motion", "bg_style",
    "image", "src", "bg_image", "icon_image", "logo", "source", "link", "time",
    "date", "color", "tone", "a_tone", "b_tone", "verdict_tone", "align",
    "size", "fit", "shape", "paper_theme",
})


def strip_markup(text: Any) -> str:
    """Remove inline stage markup tokens so visible character length can be measured."""
    return re.sub(r"\*|~|==|__|\[\[|\]\]|\{\{|\}\}", "", str(text or ""))


def _load_yaml(path: Path) -> Any:
    raw = path.read_text(encoding="utf-8")
    if path.suffix.lower() == ".json":
        return json.loads(raw) if raw.strip() else {}
    try:
        import yaml  # type: ignore
        return yaml.safe_load(raw)
    except ImportError:
        js_yaml = PKG_ROOT / "vendor" / "js-yaml.min.js"
        script = (
            "const fs=require('fs'),vm=require('vm');"
            "const ctx={globalThis:{},self:{},window:{}};"
            "ctx.globalThis=ctx;ctx.self=ctx;ctx.window=ctx;"
            "vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),ctx);"
            "const doc=ctx.jsyaml.load(fs.readFileSync(0,'utf8'));"
            "process.stdout.write(JSON.stringify(doc===undefined?null:doc));"
        )
        res = subprocess.run(
            ["node", "-e", script, str(js_yaml)],
            input=raw,
            text=True,
            capture_output=True,
        )
        if res.returncode != 0:
            raise ValueError(res.stderr.strip() or "YAML parse error")
        return json.loads(res.stdout)


def load_transitions(fx_path: Path | None = None) -> set[str]:
    """Parse TRANSITIONS array from stage/fx.js by regex, plus auto/random."""
    path = fx_path or (PKG_ROOT / "stage" / "fx.js")
    transitions = {"auto", "random", "خودکار", "تصادفی"}
    if not path.is_file():
        return transitions
    src = path.read_text(encoding="utf-8")
    m = re.search(r"const\s+TRANSITIONS\s*=\s*\[([^\]]+)\]", src, re.S)
    if m:
        transitions.update(re.findall(r"""["']([^"']+)["']""", m.group(1)))
    return transitions


def load_schemas(pkg_root: Path | None = None) -> tuple[dict[str, dict[str, Any]], dict[str, str]]:
    """Load templates/*/schema.json and build canonical + alias lookup maps."""
    root = pkg_root or PKG_ROOT
    dirs: list[Path] = [root / "templates"]
    extra = os.environ.get("KHORDEGIR_TEMPLATES", "")
    for part in extra.split(os.pathsep):
        if part.strip():
            dirs.append(Path(part.strip()))

    schemas: dict[str, dict[str, Any]] = {}
    aliases: dict[str, str] = {}
    for tpl_root in dirs:
        if not tpl_root.is_dir():
            continue
        for entry in sorted(tpl_root.iterdir()):
            if not entry.is_dir() or entry.name.startswith(("_", ".")):
                continue
            sp = entry / "schema.json"
            if not sp.is_file():
                continue
            try:
                schema = json.loads(sp.read_text(encoding="utf-8"))
            except Exception:
                continue
            name = schema.get("name") or entry.name
            schemas[name] = schema
            aliases[name] = name
            aliases[name.replace("_", "-")] = name
            for al in schema.get("aliases") or []:
                aliases[str(al)] = name
                aliases[str(al).replace("-", "_")] = name
    return schemas, aliases


def _unbalanced_tokens(text: str) -> list[str]:
    bad: list[str] = []
    for tok in ("*", "~"):
        if text.count(tok) % 2 != 0:
            bad.append(tok)
    for tok in ("==", "__"):
        if len(re.findall(re.escape(tok), text)) % 2 != 0:
            bad.append(tok)
    for op, cl in (("[[", "]]"), ("{{", "}}")):
        depth = 0
        ok = True
        i = 0
        while i < len(text):
            if text.startswith(op, i):
                depth += 1
                i += len(op)
            elif text.startswith(cl, i):
                depth -= 1
                if depth < 0:
                    ok = False
                    break
                i += len(cl)
            else:
                i += 1
        if not ok or depth != 0:
            bad.append(f"{op} {cl}")
    return bad


def _find_image(val: str, search_dirs: list[Path], pkg_root: Path) -> bool:
    s = str(val).strip()
    if not s:
        return True
    if re.match(r"^(https?:|file:|data:|blob:)", s, re.I):
        return True
    if re.match(r"^/?assets/", s):
        clean = re.sub(r"^/?assets/", "", s)
        if (pkg_root / "assets" / clean).is_file():
            return True
    p = Path(s)
    if p.is_absolute() and p.is_file():
        return True
    for base in search_dirs:
        if (base / s).is_file() or (base / p.name).is_file():
            return True
    return False


def _collect_image_refs(
    obj: Any, schema_img_keys: set[str], out: list[str], parent_key: str = ""
) -> None:
    if isinstance(obj, dict):
        for k, v in obj.items():
            if isinstance(v, str):
                s = v.strip()
                if not s:
                    continue
                is_img_key = k in IMAGE_KEYS or k in schema_img_keys or (k == "image" and parent_key == "background")
                has_ext = s.lower().endswith(IMAGE_EXTS)
                if is_img_key or (has_ext and k not in {"text", "title", "say", "subtitle", "quote", "finding"}):
                    out.append(s)
            else:
                _collect_image_refs(v, schema_img_keys, out, k)
    elif isinstance(obj, list):
        for item in obj:
            _collect_image_refs(item, schema_img_keys, out, parent_key)


def _iter_markup_strings(obj: Any, parent_key: str = "") -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k in SKIP_MARKUP_KEYS:
                continue
            if isinstance(v, str):
                out.append((k, v))
            else:
                out.extend(_iter_markup_strings(v, k))
    elif isinstance(obj, list):
        for item in obj:
            if isinstance(item, str):
                if parent_key not in SKIP_MARKUP_KEYS:
                    out.append((parent_key or "item", item))
            else:
                out.extend(_iter_markup_strings(item, parent_key))
    return out


def format_issue(slide_no: int, level: str, message: str) -> str:
    """Format a lint finding like 'slide 07  WARN  title is 84 chars (max 70)'."""
    return f"slide {slide_no:02d}  {level}  {message}"


def lint_video(video_dir: str | Path, pkg_root: Path | None = None) -> list[tuple[int, str, str]]:
    """Validate a video project directory (video.yaml) and return (slide_no, level, message) items."""
    root = pkg_root or PKG_ROOT
    target = Path(video_dir)
    issues: list[tuple[int, str, str]] = []

    if target.is_file():
        yaml_path = target
        vdir = target.parent
    else:
        vdir = target
        yaml_path = next((vdir / name for name in ("video.yaml", "video.yml", "project.yaml", "project.json") if (vdir / name).is_file()), None)  # type: ignore[assignment]

    if not vdir.exists():
        return [(0, "ERROR", f"video directory not found: {vdir}")]
    if not yaml_path or not yaml_path.is_file():
        return [(0, "ERROR", f"video.yaml not found in {vdir}")]

    try:
        doc = _load_yaml(yaml_path)
    except Exception as exc:
        return [(0, "ERROR", f"invalid YAML in {yaml_path.name}: {exc}")]

    if not isinstance(doc, dict):
        return [(0, "ERROR", f"{yaml_path.name} must contain a YAML mapping")]

    transitions = load_transitions(root / "stage" / "fx.js")
    top_tr = doc.get("transition")
    if top_tr is not None and str(top_tr).strip() != "" and str(top_tr).strip() not in transitions:
        issues.append((0, "ERROR", f"unknown transition '{top_tr}'"))

    slides = doc.get("slides")
    if not isinstance(slides, list) or not slides:
        issues.append((0, "ERROR", "missing or empty 'slides' list"))
        return issues

    schemas, aliases = load_schemas(root)
    all_tpl_keys = sorted(set(schemas.keys()) | set(aliases.keys()))

    search_dirs: list[Path] = [vdir]
    if isinstance(doc.get("images"), list):
        for p in doc["images"]:
            search_dirs.append((vdir / str(p)).resolve())
    search_dirs.extend([vdir / "img", root / "assets"])

    prev_tpl: str | None = None
    for idx, raw_slide in enumerate(slides, start=1):
        if isinstance(raw_slide, str):
            slide: dict[str, Any] = {"template": "quote", "text": raw_slide}
        elif isinstance(raw_slide, dict):
            slide = raw_slide
        else:
            issues.append((idx, "ERROR", "slide entry must be a mapping"))
            prev_tpl = None
            continue

        raw_tpl = slide.get("template")
        tpl_name: str | None = None
        schema: dict[str, Any] | None = None

        if raw_tpl is None or str(raw_tpl).strip() == "":
            issues.append((idx, "ERROR", "missing required field 'template'"))
        else:
            rt = str(raw_tpl).strip()
            resolved = aliases.get(rt) or aliases.get(rt.replace("-", "_"))
            if resolved and resolved in schemas:
                tpl_name = resolved
                schema = schemas[resolved]
            else:
                close = difflib.get_close_matches(rt, all_tpl_keys, n=1, cutoff=0.45)
                hint = f" (did you mean '{aliases.get(close[0], close[0])}'?)" if close else ""
                issues.append((idx, "ERROR", f"unknown template '{rt}'{hint}"))

        if tpl_name and prev_tpl and tpl_name == prev_tpl:
            issues.append((idx, "INFO", f"duplicate consecutive template '{tpl_name}'"))
        prev_tpl = tpl_name

        # Layout validation
        lay = slide.get("layout")
        if lay is not None and str(lay).strip() != "":
            if str(lay).strip().upper() not in VALID_LAYOUTS:
                issues.append((idx, "ERROR", f"invalid layout '{lay}' (expected SLIDE, SCAM, or CAM)"))
        if isinstance(slide.get("steps"), list):
            for st in slide["steps"]:
                if isinstance(st, dict) and st.get("layout") is not None and str(st["layout"]).strip() != "":
                    if str(st["layout"]).strip().upper() not in VALID_LAYOUTS:
                        issues.append((idx, "ERROR", f"invalid step layout '{st['layout']}' (expected SLIDE, SCAM, or CAM)"))

        # Transition validation
        tr = slide.get("transition")
        if tr is not None and str(tr).strip() != "" and str(tr).strip() not in transitions:
            issues.append((idx, "ERROR", f"unknown transition '{tr}'"))

        # Schema checks
        schema_img_keys: set[str] = set()
        if schema is not None:
            fields = schema.get("fields") or []
            allowed = set(COMMON_KEYS)
            for f in fields:
                k = f.get("key")
                if not k:
                    continue
                allowed.add(k)
                if f.get("type") == "image":
                    schema_img_keys.add(k)

                val = slide.get(k)
                is_empty = (
                    val is None
                    or (isinstance(val, str) and val.strip() == "")
                    or (isinstance(val, (list, dict)) and len(val) == 0)
                )
                if f.get("required") and is_empty:
                    issues.append((idx, "ERROR", f"missing required field '{k}' for template '{tpl_name}'"))

                if f.get("type") == "select" and not is_empty and k != "transition":
                    opts = [o[0] if isinstance(o, (list, tuple)) else o for o in (f.get("options") or [])]
                    if opts and val not in opts:
                        issues.append((idx, "ERROR", f"invalid value '{val}' for '{k}' (expected {', '.join(map(str, opts))})"))

            for k in slide:
                if k not in allowed:
                    close_k = difflib.get_close_matches(k, sorted(allowed), n=1, cutoff=0.6)
                    hint = f" (did you mean '{close_k[0]}'?)" if close_k else ""
                    issues.append((idx, "WARN", f"unknown field '{k}' for template '{tpl_name}'{hint}"))

        # Missing teleprompter say
        say = slide.get("say")
        if say is None or (isinstance(say, str) and say.strip() == ""):
            issues.append((idx, "WARN", "missing 'say' teleprompter text"))

        # Readability checks (after stripping markup)
        for k, v in slide.items():
            if not isinstance(v, str):
                continue
            plain_len = len(strip_markup(v).strip())
            if k in TITLE_KEYS or (k.endswith("_title") and k != "x_title"):
                if plain_len > 70:
                    issues.append((idx, "WARN", f"{k} is {plain_len} chars (max 70)"))
            elif k in BODY_KEYS or k.endswith("_body"):
                if plain_len > 220:
                    issues.append((idx, "WARN", f"{k} is {plain_len} chars (max 220)"))

        # Unbalanced markup
        for k, txt in _iter_markup_strings(slide):
            bad = _unbalanced_tokens(txt)
            if bad:
                issues.append((idx, "WARN", f"unbalanced markup ({', '.join(bad)}) in '{k}'"))

        # Missing image files
        img_refs: list[str] = []
        _collect_image_refs(slide, schema_img_keys, img_refs)
        seen_imgs: set[str] = set()
        for ref in img_refs:
            if ref in seen_imgs:
                continue
            seen_imgs.add(ref)
            if not _find_image(ref, search_dirs, root):
                issues.append((idx, "ERROR", f"missing image file '{ref}'"))

    return issues
