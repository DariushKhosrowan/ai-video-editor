"""Template gallery: one preview PNG per template (final frame of its built-in example),
a contact sheet and GALLERY.md with every template's fields, in Persian."""
import json, os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

PKG = Path(__file__).resolve().parent
OUT = PKG / "gallery"
SAMPLES = PKG / "gallery" / "samples"


def _sample_images():
    return sorted(str(p) for p in SAMPLES.glob("*") if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp"))


def _fill(example, imgs, k=[0]):
    ex = json.loads(json.dumps(example))
    def walk(o):
        if isinstance(o, dict):
            for key, v in list(o.items()):
                if key in ("image", "src") and not v and imgs:
                    o[key] = Path(imgs[k[0] % len(imgs)]).as_uri(); k[0] += 1
                else:
                    walk(v)
        elif isinstance(o, list):
            for x in o: walk(x)
    walk(ex)
    return ex


def build_gallery(jobs=1):
    from .render import Renderer
    from .index import build_index, template_dirs
    build_index()
    dirs = template_dirs()
    (OUT / "previews").mkdir(parents=True, exist_ok=True)
    imgs = _sample_images()
    metas = []
    with Renderer() as r:
        names = r.page.evaluate("Stage.templateList().map(t=>({name:t.name,label:t.label,description:t.description,category:t.category,fields:t.fields,example:t.example}))")
        for m in names:
            ex = _fill(m["example"] or {}, imgs)
            ex["template"] = m["name"]
            r.page.evaluate("Stage._camGuide=true")
            info = r.load(ex)
            png = OUT / "previews" / f"{m['name']}.png"
            r.shot(info["duration"] - 0.05, path=str(png))
            im = Image.open(png).convert("RGB").resize((640, 360), Image.LANCZOS)
            im.save(png, optimize=True)
            if m["name"] in dirs:
                im.save(dirs[m["name"]] / "preview.png", optimize=True)
            mid = OUT / "previews" / f"{m['name']}-mid.png"
            r.shot(0.55, path=str(mid))
            Image.open(mid).convert("RGB").resize((640, 360), Image.LANCZOS).save(mid, optimize=True)
            metas.append(m)
            print("  ✓", m["name"])
        r.page.evaluate("Stage._camGuide=false")
    build_index()   # picks up the new preview.png files
    # contact sheet
    cols, tw, th, pad, lab = 3, 640, 360, 24, 56
    rows = (len(metas) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (tw + pad) + pad, rows * (th + lab + pad) + pad), (14, 14, 14))
    font = ImageFont.truetype(str(PKG / "fonts" / "Vazirmatn-Bold.woff2"), 30) if False else None
    try:
        from PIL import features
        ttf = "/usr/share/fonts/truetype/vazirmatn/Vazirmatn-Bold.ttf"
        font = ImageFont.truetype(ttf if os.path.exists(ttf) else str(PKG / "fonts" / "Vazirmatn-Bold.woff2"), 30,
                                  layout_engine=ImageFont.Layout.RAQM)
    except Exception:
        font = ImageFont.load_default()
    d = ImageDraw.Draw(sheet)
    for i, m in enumerate(metas):
        x = pad + (cols - 1 - i % cols) * (tw + pad); y = pad + (i // cols) * (th + lab + pad)
        sheet.paste(Image.open(OUT / "previews" / f"{m['name']}.png"), (x, y + lab))
        try:
            d.text((x + tw, y + lab - 12), f"{m['label']}  ·  {m['name']}", font=font, fill=(255, 214, 0), anchor="rs", direction="rtl")
        except Exception:
            d.text((x, y + 10), m["name"], fill=(255, 214, 0))
    sheet.save(OUT / "gallery.png", optimize=True)
    # markdown
    md = ["# گالری قالب‌ها", "", "هر قالب: یک تصویر از فریم آخر، اسمی که در `video.yaml` می‌نویسی و فیلدهایش.",
          "قاب زرد خط‌چین در پیش‌نمایش‌ها فقط جای دوربین را نشان می‌دهد (در خروجی نیست).", "", "![همه‌ی قالب‌ها](gallery.png)", ""]
    for m in metas:
        md += [f"## {m['label']} — `template: {m['name']}`", "", f"دسته: {m.get('category') or '—'}", "", m.get("description", ""), "",
               f"![{m['name']}](../templates/{m['name']}/preview.png)", "", "| فیلد | توضیح |", "|---|---|"]
        for f in m.get("fields") or []:
            md.append(f"| `{f['key']}` | {f['label']}{' (لازم)' if f.get('required') else ''} |")
        md += ["", "نمونه:", "", "```yaml", "- template: " + m["name"]]
        import yaml
        ex = {k: v for k, v in (m.get("example") or {}).items() if v not in ("", None)}
        md += ["  " + l for l in yaml.safe_dump(ex, allow_unicode=True, sort_keys=False, width=110).strip().splitlines()]
        md += ["```", ""]
    md += ["## فیلدهای مشترک همه‌ی قالب‌ها", "", "| فیلد | توضیح |", "|---|---|",
           "| `layout` | SLIDE (اسلاید تمام‌صفحه) / SCAM (اسلاید + من؛ گوشه‌ی پایین-چپ خالی می‌ماند) / CAM (فقط دوربین) |",
           "| `say` | متن تله‌پرامپتر برای این اسلاید |", "| `steps` | قدم‌های بیشتر روی همین اسلاید: فهرست `{say, layout, zoom}` |",
           "| `zoom` | زوم OBS با F5: `{x: 0.5, y: 0.5, s: 1.6}` |", "| `source` | منبع کوچک پایین-راست (انگلیسی هم می‌شود) |",
           "| `note` | یادداشت کوچک پایین صفحه |", "| `duration` | طول کلیپ به ثانیه (پیش‌فرض ۶؛ مثلاً ۲۰ تا عکس بیشتر نفس بکشد) |",
           "| `background` | `{image: bg.jpg, dim: 0.6}` عکس پس‌زمینه‌ی کل صفحه |", "| `act` | شماره‌ی پرده (برای OBS) |", ""]
    (OUT / "GALLERY.md").write_text("\n".join(md), encoding="utf-8")
    print("✓ گالری:", OUT / "GALLERY.md")
