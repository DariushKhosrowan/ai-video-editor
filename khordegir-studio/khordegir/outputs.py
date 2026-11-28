"""OBS & teleprompter output generators for Khordegir Studio (`steps.json`, `prompter.txt`, `steps_data.lua`)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List


def export_obs_bundle(project: Dict[str, Any], out_dir: str | Path) -> List[str]:
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    steps: List[Dict[str, Any]] = []
    prompter_lines: List[str] = []

    for idx, s in enumerate(project.get("slides", []), start=1):
        layout = str(s.get("layout") or "SLIDE").upper()
        say = str(s.get("say") or "").strip()
        slide_file = f"slide-{idx:02d}.mp4" if layout != "CAM" else None
        steps.append({
            "num": idx,
            "layout": layout,
            "template": s.get("template", "quote"),
            "file": slide_file,
            "say": say,
            "expression": s.get("expression"),
            "format": s.get("format", project.get("format", "16:9")),
        })
        if say:
            prompter_lines.append(f"[{idx:02d} · {layout}] {say}")

    steps_json = out / "steps.json"
    steps_json.write_text(json.dumps(steps, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    prompter_txt = out / "prompter.txt"
    prompter_txt.write_text("\n\n".join(prompter_lines) + "\n", encoding="utf-8")

    lua_lines = ["return {"]
    for st in steps:
        file_lua = f'"{st["file"]}"' if st["file"] else "nil"
        say_esc = st["say"].replace("\\", "\\\\").replace('"', '\\"').replace("\n", " ")
        lua_lines.append(
            f'  {{ num = {st["num"]}, layout = "{st["layout"]}", file = {file_lua}, say = "{say_esc}" }},'
        )
    lua_lines.append("}")
    steps_lua = out / "steps_data.lua"
    steps_lua.write_text("\n".join(lua_lines) + "\n", encoding="utf-8")

    return [str(steps_json), str(prompter_txt), str(steps_lua)]
