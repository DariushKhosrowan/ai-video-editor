"""Template & theme registry.

A template is a folder  templates/<name>/  containing
    schema.json    name, label, description, category, aliases, fields, example   (required)
    template.js    Stage.template({ name, build(slide, A) { ... } })            (required)
    template.css   optional styles for this template
    preview.png    optional thumbnail (made by `python3 -m khordegir gallery`)
Browsers opened from file:// cannot list folders, so the stage and the editor read a generated
manifest, templates/_index.js. It is rebuilt automatically by every build / gallery / editor command,
or by hand with `python3 -m khordegir index`.  Extra template folders can live outside the package:
set KHORDEGIR_TEMPLATES=/path/a:/path/b  (their files are referenced by absolute file:// URLs).
"""
import json, os, sys
from pathlib import Path

PKG = Path(__file__).resolve().parent
TPL = PKG / "templates"
THEMES = PKG / "themes"


def template_dirs():
    roots = [TPL] + [Path(p) for p in os.environ.get("KHORDEGIR_TEMPLATES", "").split(os.pathsep) if p]
    seen = {}
    for root in roots:
        if not root.is_dir():
            continue
        for d in sorted(root.iterdir()):
            if d.is_dir() and not d.name.startswith(("_", ".")) and (d / "schema.json").exists():
                seen[d.name] = d          # later roots override built-ins with the same name
    return seen


def load_schemas():
    out = []
    for name, d in template_dirs().items():
        try:
            s = json.loads((d / "schema.json").read_text(encoding="utf-8"))
        except Exception as e:
            print(f"⚠ قالب «{name}»: فایل schema.json خراب است ({e})", file=sys.stderr)
            continue
        s.setdefault("name", name)
        if s["name"] != name:
            print(f"⚠ قالب «{name}»: name در schema.json باید «{name}» باشد", file=sys.stderr)
            s["name"] = name
        if not (d / "template.js").exists():
            print(f"⚠ قالب «{name}»: template.js ندارد؛ رد شد", file=sys.stderr)
            continue
        s["_dir"] = d
        out.append(s)
    out.sort(key=lambda s: (s.get("order", 999), s["name"]))
    return out


def _rel(d, f):
    p = d / f
    try:
        return "../templates/" + str(p.relative_to(TPL)).replace(os.sep, "/")
    except ValueError:
        return p.resolve().as_uri()


def build_index():
    schemas = load_schemas()
    idx = []
    for s in schemas:
        d = s.pop("_dir")
        e = {"name": s["name"], "js": _rel(d, "template.js"), "schema": s}
        if (d / "template.css").exists():
            e["css"] = _rel(d, "template.css")
        if (d / "preview.png").exists():
            e["preview"] = _rel(d, "preview.png")
        idx.append(e)
    js = "/* خودکار ساخته می‌شود — دستی ویرایش نکن (python3 -m khordegir index) */\nwindow.TEMPLATE_INDEX = " + \
         json.dumps(idx, ensure_ascii=False, indent=1) + ";\n"
    f = TPL / "_index.js"
    if not f.exists() or f.read_text(encoding="utf-8") != js:
        f.write_text(js, encoding="utf-8")
    themes = sorted(p.name for p in THEMES.glob("*.js") if not p.name.startswith("_"))
    tj = "window.THEME_FILES = " + json.dumps(themes) + ";\n"
    tf = THEMES / "_list.js"
    if not tf.exists() or tf.read_text() != tj:
        tf.write_text(tj)
    return idx


def aliases():
    m = {}
    for s in load_schemas():
        for a in s.get("aliases") or []:
            m[a] = s["name"]
    return m


def template_hash(name):
    import hashlib
    d = template_dirs().get(name)
    h = hashlib.sha1()
    if d:
        for p in sorted(d.glob("*")):
            if p.suffix in (".js", ".css", ".json"):
                h.update(p.read_bytes())
    return h.hexdigest()[:12]
