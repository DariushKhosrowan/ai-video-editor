"""OBS outputs: steps_data.lua, steps.json, prompter.txt / prompter.html, slides.pdf."""
import json, os
from pathlib import Path

PKG = Path(__file__).resolve().parent
LAY_FA = {"SLIDE": "اسلاید تمام‌صفحه", "SCAM": "اسلاید + من", "CAM": "فقط من"}


def _lua_str(s):
    return '"' + str(s).replace("\\", "\\\\").replace('"', '\\"') + '"'


def write_steps(project, out_dir):
    out_dir = Path(out_dir); out_dir.mkdir(parents=True, exist_ok=True)
    steps = project.steps()
    lines = ["-- Step list. layout = SLIDE | SCAM | CAM ; slide = slide number (0 = none)",
             "-- ساخته‌شده خودکار از video.yaml با Khordegir Studio — دستی ویرایش نکن.", "return {"]
    for st in steps:
        z = st.get("zoom")
        zs = ""
        if isinstance(z, dict) and z:
            zs = ", zoom={" + ", ".join(f"{k}={float(v)}" for k, v in z.items() if k in ("x", "y", "s")) + "}"
        lines.append(f'  {{act={st["act"]}, layout="{st["layout"]}", slide={st["slide"]}{zs}}},  -- step {st["n"]} {st["time"]}')
    lines.append("}")
    (out_dir / "steps_data.lua").write_text("\n".join(lines) + "\n", encoding="utf-8")
    sj = [{"act": s["act"], "layout": s["layout"], "slide": s["slide"], "time": s["time"], "text": s["text"], "n": s["n"]} for s in steps]
    (out_dir / "steps.json").write_text(json.dumps(sj, ensure_ascii=False, indent=1), encoding="utf-8")
    # plain prompter text
    txt = []
    for s in steps:
        head = f"── مرحله {s['n']} · پرده {s['act']} · {LAY_FA.get(s['layout'], s['layout'])}" + (f" · اسلاید {s['slide']}" if s["slide"] else "")
        txt += [head, s["text"], ""]
    (out_dir / "prompter.txt").write_text("\n".join(txt), encoding="utf-8")
    # teleprompter page (same as Hark Studio's)
    tpl = (PKG / "obs" / "prompter_template.html").read_text(encoding="utf-8")
    S = [{"n": s["n"], "act": s["act"], "lay": LAY_FA.get(s["layout"], s["layout"]), "slide": s["slide"], "time": s["time"], "text": s["text"]} for s in steps]
    words = sum(len(s["text"].split()) for s in steps)
    mins = words / 140.0
    hint = f"{int(mins):02d}:{int((mins % 1) * 60):02d}".translate(str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹"))
    html = tpl.replace("__STEPS__", json.dumps(S, ensure_ascii=False)).replace("<script>", f"<script>window.TOTAL_HINT='{hint}';", 1)
    (out_dir / "prompter.html").write_text(html, encoding="utf-8")
    return steps


def write_pdf(pngs, pdf_path):
    from PIL import Image
    pngs = [p for p in pngs if os.path.exists(p)]
    if not pngs:
        return None
    ims = [Image.open(p).convert("RGB") for p in pngs]
    ims[0].save(pdf_path, save_all=True, append_images=ims[1:], resolution=150, quality=92)
    return pdf_path
