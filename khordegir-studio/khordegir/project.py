"""Video project: read video.yaml, normalise slides, resolve image paths, list OBS steps."""
import copy, glob, json, os, re
from pathlib import Path

try:
    import yaml
except ImportError:  # pragma: no cover
    raise SystemExit("خطا: کتابخانه‌ی pyyaml نصب نیست. بزن:  pip install pyyaml")

PKG = Path(__file__).resolve().parent
IMAGE_KEYS = {"image", "src", "bg_image", "icon_image"}
IMG_EXT = (".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif")
CHART_SLIDE = {"bar_chart", "line_chart", "compare", "counter_grid", "chart", "timeline"}
ALIASES = {
    "title-card": "title_card", "عنوان": "title_card", "big-number": "big_number", "counter": "big_number", "عدد": "big_number",
    "image-text": "image_text", "تصویر": "image_text", "عکس": "image_text", "bar-chart": "bar_chart", "bar": "bar_chart",
    "نمودار میله‌ای": "bar_chart", "میله‌ای": "bar_chart", "list": "bullet_list", "bullets": "bullet_list", "فهرست": "bullet_list",
    "line-chart": "line_chart", "line": "line_chart", "نمودار خطی": "line_chart", "خطی": "line_chart",
    "before-after": "compare", "مقایسه": "compare", "counter-grid": "counter_grid", "اعداد": "counter_grid",
    "statement": "quote", "جمله": "quote", "نقل‌قول": "quote", "section-break": "section_break", "section": "section_break",
    "بخش": "section_break", "image-full": "image_full", "full-image": "image_full", "عکس کامل": "image_full",
    "three-cards": "three_cards", "cards": "three_cards", "کارت‌ها": "three_cards", "messages": "chat", "گفتگو": "chat",
    "پیام": "chat", "خط زمان": "timeline", "camera": "cam", "دوربین": "cam", "layer": "layers", "لایه": "layers",
}


def template_names():
    from .index import template_dirs
    return sorted(template_dirs())


_AL = None


def norm_template(t):
    global _AL
    if _AL is None:
        from .index import aliases
        _AL = dict(ALIASES); _AL.update(aliases())
    t = str(t or "").strip()
    t = _AL.get(t, t)
    return t.replace("-", "_")


class Project:
    def __init__(self, folder):
        folder = Path(folder).expanduser().resolve()
        if folder.is_file():
            self.yaml_path, folder = folder, folder.parent
        else:
            cands = [folder / n for n in ("video.yaml", "video.yml", "project.yaml", "project.json")]
            self.yaml_path = next((c for c in cands if c.exists()), None)
        self.dir = folder
        self.warnings = []
        if not self.yaml_path:
            # a folder of layer / spec JSON files is also a project
            self.data = {"slides": []}
            for f in sorted(folder.glob("*.json")) + sorted((folder / "specs").glob("*.json")) + sorted((folder / "layers").glob("*.json")):
                self.data["slides"].append({"file": str(f)})
            if not self.data["slides"]:
                raise SystemExit(f"خطا: در پوشه‌ی {folder} فایل video.yaml پیدا نشد.")
        else:
            txt = self.yaml_path.read_text(encoding="utf-8")
            try:
                self.data = (json.loads(txt) if self.yaml_path.suffix == ".json" else yaml.safe_load(txt)) or {}
            except Exception as e:
                raise SystemExit(f"خطا در فایل {self.yaml_path.name}: ساختار YAML درست نیست.\n{e}\n"
                                 "راهنما: هر اسلاید با «- template:» شروع می‌شود و فاصله‌های اول خط باید یکسان باشند.")
        d = self.data
        self.title = d.get("title", folder.name)
        self.theme = d.get("theme")
        self.out = (folder / d.get("out", "out")).resolve()
        dirs = [folder] + [(folder / p).resolve() for p in (d.get("images") or [])]
        anc = [folder] + list(folder.parents)[:6]
        self.search = []
        for p in dirs + [a / "img" for a in anc] + anc:
            if p not in self.search:
                self.search.append(p)
        self.studio = (folder / d["studio"]).resolve() if d.get("studio") else None
        self.copy = d.get("copy") or ["mp4", "png", "steps", "prompter"]
        self.default_duration = d.get("duration")
        self.slides = self._normalise(d.get("slides") or [])

    # ------------------------------------------------------------ paths
    def find(self, p, extra=()):
        if not p:
            return None
        p = os.path.expanduser(str(p))
        if p.startswith(("http://", "https://", "file://", "data:", "blob:")):
            return p
        if os.path.isabs(p) and os.path.exists(p):
            return p
        for base in list(extra) + self.search:
            for cand in (Path(base) / p, Path(base) / Path(p).name):
                if cand.exists():
                    return str(cand.resolve())
        return None

    def _resolve_images(self, obj, where, extra=()):
        if isinstance(obj, dict):
            for k, v in obj.items():
                if isinstance(v, str) and (k in IMAGE_KEYS or (v.lower().endswith(IMG_EXT) and k not in ("text", "title", "say"))):
                    if not v.strip():
                        continue
                    r = self.find(v, extra)
                    if r:
                        obj[k] = Path(r).as_uri() if not r.startswith(("http", "file:", "data:")) else r
                    else:
                        self.warnings.append(f"{where}: تصویر «{v}» پیدا نشد؛ به‌جایش قاب جایگزین تیره گذاشته شد. "
                                             f"(عکس را در پوشه‌ی img کنار video.yaml بگذار)")
                        obj[k] = v
                else:
                    self._resolve_images(v, where, extra)
        elif isinstance(obj, list):
            for x in obj:
                self._resolve_images(x, where, extra)

    # ------------------------------------------------------------ slides
    def _normalise(self, raw):
        slides, act, n = [], 1, 0
        for i, s in enumerate(raw):
            if isinstance(s, str):
                s = {"template": "quote", "text": s}
            s = copy.deepcopy(s or {})
            extra = []
            if s.get("file"):                                   # layer JSON / chart spec file
                f = self.find(s["file"])
                if not f:
                    self.warnings.append(f"اسلاید {i + 1}: فایل «{s['file']}» پیدا نشد.")
                    continue
                with open(f, encoding="utf-8") as fh:
                    js = json.load(fh)
                extra = [Path(f).parent] + list(Path(f).parents)[:6]
                if "elements" in js:
                    s = dict(js, **{k: v for k, v in s.items() if k != "file"}); s["template"] = "layers"
                    for el in s["elements"]:
                        if el.get("type") == "chart" and el.get("spec") and not el.get("chart"):
                            sp = self.find(el["spec"], extra)
                            if sp:
                                el["chart"] = json.load(open(sp, encoding="utf-8"))
                elif js.get("type") in ("bar", "line", "counter", "compare"):
                    meta = {k: js.pop(k) for k in ("title", "subtitle", "eyebrow", "source", "note", "layout", "duration") if k in js}
                    s = dict(meta, **{k: v for k, v in s.items() if k != "file"}); s["template"] = "chart"; s["chart"] = js
                else:
                    s = dict(js, **{k: v for k, v in s.items() if k != "file"})
            if s.get("spec") and not s.get("chart"):
                f = self.find(s["spec"])
                if f:
                    s["chart"] = json.load(open(f, encoding="utf-8"))
                    for k in ("title", "subtitle", "source", "note"):
                        if k in s["chart"] and k not in s:
                            s[k] = s["chart"][k]
            t = norm_template(s.get("template") or s.get("type") or ("layers" if "elements" in s else "quote"))
            s["template"] = t
            if t not in template_names():
                self.warnings.append(f"اسلاید {i + 1}: قالب «{t}» وجود ندارد. قالب‌های موجود: {', '.join(template_names())}")
            act = int(s.get("act", act))
            s["act"] = act
            steps = []
            first_layout = (s.get("layout") or ("CAM" if t == "cam" else "SLIDE" if t in CHART_SLIDE else "SCAM")).upper()
            steps.append({"layout": first_layout, "say": s.get("say", ""), "zoom": s.get("zoom"), "time": s.get("time", "")})
            for st in s.get("steps") or []:
                if isinstance(st, str):
                    st = {"say": st}
                steps.append({"layout": (st.get("layout") or first_layout).upper(), "say": st.get("say", ""),
                              "zoom": st.get("zoom"), "time": st.get("time", "")})
            s["_steps"] = steps
            if t == "cam" or all(x["layout"] == "CAM" for x in steps):
                s["_num"] = 0
            else:
                n += 1
                s["_num"] = int(s.get("slide_no", n))
                n = s["_num"]
                # render with the camera corner empty if any step shows the camera over the slide
                s["layout"] = (s.get("render_layout") or ("SCAM" if any(x["layout"] == "SCAM" for x in steps) else "SLIDE")).upper()
            s["_seed"] = f"{self.dir.name}:{s['_num'] or i + 1}"
            if self.default_duration and not s.get("duration"):
                s["duration"] = self.default_duration
            self._resolve_images(s, f"اسلاید {s.get('_num') or i + 1}", extra)
            slides.append(s)
        # previous rendered template, so auto transitions can match-cut between two slides of the same kind
        prev = None
        for s in slides:
            if s["_num"]:
                s["_prevTemplate"] = prev
                prev = s.get("template")
        return slides

    def render_slides(self):
        return [s for s in self.slides if s["_num"]]

    def steps(self):
        out, k = [], 0
        for s in self.slides:
            for st in s["_steps"]:
                k += 1
                out.append({"n": k, "act": s["act"], "layout": st["layout"], "slide": s["_num"] if st["layout"] != "CAM" else 0,
                            "time": st.get("time") or "", "text": (st.get("say") or "").strip(), "zoom": st.get("zoom")})
        return out


def stage_payload(slide):
    """Strip private keys before sending to the stage."""
    out = {k: v for k, v in slide.items() if not k.startswith("_")}
    out["_seed"] = slide.get("_seed") or f"{slide.get('template')}:{slide.get('_num')}"
    if slide.get("_prevTemplate"):
        out["_prevTemplate"] = slide["_prevTemplate"]
    return out
