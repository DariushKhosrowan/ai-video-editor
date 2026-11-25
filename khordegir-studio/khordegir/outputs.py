"""OBS outputs: steps_data.lua, steps.json, prompter.txt / prompter.html, slides.pdf."""
from __future__ import annotations

import json
import os
from pathlib import Path

from .obs_export import (
    escape_lua_string,
    generate_prompter_html,
    generate_prompter_txt,
    generate_steps_data_lua,
    steps_for_obs,
)

PKG = Path(__file__).resolve().parent


def _lua_str(s):
    return '"' + escape_lua_string(s) + '"'


def write_steps(project, out_dir):
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    steps = steps_for_obs(project)

    (out_dir / "steps_data.lua").write_text(
        generate_steps_data_lua(steps),
        encoding="utf-8",
    )

    sj = [
        {
            "act": s["act"],
            "layout": s["layout"],
            "slide": s["slide"],
            "time": s["time"],
            "text": s["text"],
            "n": s["n"],
        }
        for s in steps
    ]
    (out_dir / "steps.json").write_text(
        json.dumps(sj, ensure_ascii=False, indent=1),
        encoding="utf-8",
    )

    (out_dir / "prompter.txt").write_text(
        generate_prompter_txt(steps),
        encoding="utf-8",
    )

    (out_dir / "prompter.html").write_text(
        generate_prompter_html(steps),
        encoding="utf-8",
    )
    return steps


def write_pdf(pngs, pdf_path):
    from PIL import Image

    pngs = [p for p in pngs if os.path.exists(p)]
    if not pngs:
        return None
    ims = [Image.open(p).convert("RGB") for p in pngs]
    ims[0].save(pdf_path, save_all=True, append_images=ims[1:], resolution=150, quality=92)
    return pdf_path
