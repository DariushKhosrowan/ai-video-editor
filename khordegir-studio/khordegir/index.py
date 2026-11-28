"""Template & theme manifest generator for Khordegir Studio.

Scans `templates/*/schema.json` (+ optional `KHORDEGIR_TEMPLATES`) and `themes/*.js`
and writes `templates/_index.js` and `themes/_list.js`.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, List

STUDIO_PKG_DIR = Path(__file__).resolve().parent


def find_templates_dirs(pkg_dir: Path = STUDIO_PKG_DIR) -> List[Path]:
    dirs = [pkg_dir / "templates"]
    extra = os.environ.get("KHORDEGIR_TEMPLATES", "")
    for part in extra.split(os.pathsep):
        p = part.strip()
        if p and Path(p).is_dir():
            dirs.append(Path(p))
    return dirs


def load_template_entries(pkg_dir: Path = STUDIO_PKG_DIR) -> List[Dict[str, Any]]:
    entries: List[Dict[str, Any]] = []
    seen = set()
    for tdir in find_templates_dirs(pkg_dir):
        if not tdir.is_dir():
            continue
        for child in sorted(tdir.iterdir()):
            if not child.is_dir() or child.name.startswith("_"):
                continue
            schema_file = child / "schema.json"
            tpl_js = child / "template.js"
            if not schema_file.is_file() or not tpl_js.is_file():
                continue
            schema = json.loads(schema_file.read_text(encoding="utf-8"))
            name = schema.get("name") or child.name
            if name in seen:
                continue
            seen.add(name)
            entry: Dict[str, Any] = {
                "name": name,
                "js": f"../templates/{child.name}/template.js",
                "schema": schema,
            }
            if (child / "template.css").is_file():
                entry["css"] = f"../templates/{child.name}/template.css"
            entries.append(entry)

    entries.sort(key=lambda e: (int(e["schema"].get("order", 999)), e["name"]))
    return entries


def load_theme_files(pkg_dir: Path = STUDIO_PKG_DIR) -> List[str]:
    th_dir = pkg_dir / "themes"
    if not th_dir.is_dir():
        return []
    files = [
        p.name
        for p in sorted(th_dir.iterdir())
        if p.is_file() and p.suffix == ".js" and not p.name.startswith("_")
    ]
    return files


def rebuild_index(pkg_dir: Path = STUDIO_PKG_DIR) -> Dict[str, Any]:
    entries = load_template_entries(pkg_dir)
    themes = load_theme_files(pkg_dir)

    idx_path = pkg_dir / "templates" / "_index.js"
    idx_js = (
        "/* خودکار ساخته می‌شود — دستی ویرایش نکن (python3 -m khordegir index) */\n"
        f"window.TEMPLATE_INDEX = {json.dumps(entries, ensure_ascii=False, indent=1)};\n"
    )
    idx_path.write_text(idx_js, encoding="utf-8")

    th_path = pkg_dir / "themes" / "_list.js"
    th_js = f"window.THEME_FILES = {json.dumps(themes, ensure_ascii=False)};\n"
    th_path.write_text(th_js, encoding="utf-8")

    return {"templates": [e["name"] for e in entries], "themes": themes}
