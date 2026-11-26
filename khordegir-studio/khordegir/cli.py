"""Khordegir Studio command line.

  python3 -m khordegir build  videos/<name>      # همه‌چیز: mp4 + png + pdf + steps_data.lua + تله‌پرامپتر
  python3 -m khordegir build  videos/<name> --only 3,9-12 --copy-to ../slides/studio
  python3 -m khordegir render spec.json -o out/slide-03.mp4 [--preview]
  python3 -m khordegir import script.txt -o videos/<name>/video.yaml
  python3 -m khordegir new    videos/<name>
  python3 -m khordegir editor [--port 8765] [--no-browser] [--videos DIR]
  python3 -m khordegir obs    videos/<name> [--os linux|windows|macos] [-o DIR]
  python3 -m khordegir gallery                   # پیش‌نمایش قالب‌ها
  python3 -m khordegir templates                 # فهرست قالب‌ها
"""
import argparse, hashlib, json, os, shutil, sys, time
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

PKG = Path(__file__).resolve().parent


def fa(n):
    return str(n).translate(str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹"))


def parse_only(s):
    if not s:
        return None
    out = set()
    for part in str(s).split(","):
        part = part.strip().translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789"))
        if "-" in part:
            a, b = part.split("-"); out.update(range(int(a), int(b) + 1))
        elif part:
            out.add(int(part))
    return out


def engine_hash(theme):
    """Hash of the shared engine (stage + themes). Each slide adds its own template folder's hash,
    so editing one template only re-renders the slides that use it."""
    h = hashlib.sha1()
    for p in sorted(list((PKG / "stage").glob("*")) + list((PKG / "themes").glob("*.js"))):
        if p.is_file():
            h.update(p.read_bytes())
    h.update(str(theme).encode())
    return h.hexdigest()[:12]


def _render_batch(args):
    jobs, theme, crf, preset, quality = args
    from .render import Renderer
    res = []
    with Renderer(theme=theme, quality=quality) as r:
        for payload, mp4, png in jobs:
            t0 = time.time()
            try:
                info = r.render(payload, mp4=mp4, png=png, crf=crf, preset=preset)
                info["ok"] = True
            except Exception as e:  # keep going with the other slides
                info = {"ok": False, "error": str(e)}
            info["file"] = mp4 or png
            info["sec"] = round(time.time() - t0, 1)
            print(f"  ✓ {Path(info['file']).name}  ({info.get('duration', 0):.1f}s کلیپ، {info['sec']} ثانیه ساخت)" if info["ok"]
                  else f"  ✗ {Path(info['file']).name}: {info['error']}", flush=True)
            res.append(info)
    return res


def run_jobs(jobs, theme, n_jobs, crf=18, preset="medium", quality="png"):
    if not jobs:
        return []
    n_jobs = max(1, min(n_jobs, len(jobs)))
    if n_jobs == 1:
        return _render_batch((jobs, theme, crf, preset, quality))
    batches = [jobs[i::n_jobs] for i in range(n_jobs)]
    out = []
    with ProcessPoolExecutor(n_jobs) as ex:
        for r in ex.map(_render_batch, [(b, theme, crf, preset, quality) for b in batches]):
            out += r
    return out


def cmd_build(a):
    from .project import Project, stage_payload
    from .outputs import write_steps, write_pdf
    from .index import build_index, template_hash
    build_index()
    pr = Project(a.folder, force_format=getattr(a, "format", None))
    if getattr(a, "out", None):
        pr.out = Path(a.out).expanduser().resolve()
    out = pr.out
    sd = out / "slides"; sd.mkdir(parents=True, exist_ok=True)
    only = parse_only(a.only)
    print(f"ساخت «{pr.title}» — {fa(len(pr.render_slides()))} اسلاید، تم: {pr.theme or 'پیش‌فرض'}، قاب: {pr.format} {pr.size[0]}×{pr.size[1]}")
    for w in pr.warnings:
        print("  ⚠ " + w)
    cache_f = out / ".build-cache.json"
    cache = json.loads(cache_f.read_text()) if cache_f.exists() else {}
    eh = engine_hash(pr.theme)
    jobs, keys = [], {}
    for s in pr.render_slides():
        n = s["_num"]
        if only and n not in only:
            continue
        payload = stage_payload(s)
        key = hashlib.sha1((json.dumps(payload, ensure_ascii=False, sort_keys=True) + eh + template_hash(s["template"]) + str(a.no_video)).encode()).hexdigest()[:16]
        name = f"slide-{n:02d}"
        mp4 = None if a.no_video else str(sd / f"{name}.mp4")
        png = str(sd / f"{name}.png")
        if not a.force and cache.get(name) == key and os.path.exists(png) and (a.no_video or os.path.exists(mp4)):
            print(f"  = {name} بدون تغییر (رد شد)")
            continue
        jobs.append((payload, mp4, png)); keys[name] = key
    t0 = time.time()
    results = run_jobs(jobs, pr.theme, a.jobs, a.crf, a.preset, a.quality)
    for r in results:
        name = Path(r["file"]).stem
        if r.get("ok"):
            cache[name] = keys.get(name)
            if r.get("cam_overlap"):
                print(f"  ⚠ {name}: چیزی داخل جای دوربین افتاده: {r['cam_overlap'][:3]}")
    cache_f.write_text(json.dumps(cache, indent=1))
    write_cues(out, results)
    steps = write_steps(pr, out)
    pngs = [str(sd / f"slide-{s['_num']:02d}.png") for s in pr.render_slides()]
    write_pdf(pngs, str(out / "slides.pdf"))
    report = [f"{Path(r['file']).name}\t{r.get('duration', 0):.2f}s\t{'OK' if r.get('ok') else 'ERROR ' + r.get('error', '')}"
              + (f"\tCAM-OVERLAP {r['cam_overlap']}" if r.get("cam_overlap") else "") for r in results]
    (out / "build-report.txt").write_text("\n".join(report + ["", "هشدارها:"] + pr.warnings) + "\n", encoding="utf-8")
    bad = [r for r in results if not r.get("ok")]
    print(f"تمام شد در {fa(round(time.time() - t0))} ثانیه → {out}")
    print(f"  {fa(len(steps))} مرحله در steps_data.lua، فایل PDF: slides.pdf، تله‌پرامپتر: prompter.html")
    target = a.copy_to or (str(pr.studio) if pr.studio and not a.no_copy else None)
    if target:
        copy_out(pr, out, Path(target), a.copy.split(",") if a.copy else pr.copy)
    if bad:
        print(f"⚠ {fa(len(bad))} اسلاید خطا داشت؛ جزئیات در build-report.txt")
        return 1
    return 0


CUE_FA = {"whoosh": "ووش (ورود عنوان)", "pop": "پاپ (حباب/نشان)", "soft": "ورود نرم کارت‌ها", "count-start": "شروع تیک شمارنده",
          "count-end": "پایان شمارش (دینگ)", "bar": "نشستن میله", "draw": "کشیده شدن خط", "swish": "ماژیک/هایلایت"}


def write_cues(out, results):
    """Sound-cue list for post production (merged with earlier builds)."""
    f = out / "sound_cues.json"
    allc = json.loads(f.read_text(encoding="utf-8")) if f.exists() else {}
    for r in results:
        if r.get("ok"):
            allc[Path(r["file"]).stem] = {"duration": r.get("duration"), "fx": r.get("fx"), "cues": r.get("cues", [])}
    f.write_text(json.dumps(dict(sorted(allc.items())), ensure_ascii=False, indent=1), encoding="utf-8")
    lines = ["# نشانه‌های صدا برای هر کلیپ (ثانیه از شروع کلیپ). برای افکت صوتی در تدوین.", ""]
    for name, d in sorted(allc.items()):
        lines.append(f"## {name}  ({d.get('duration', 0):.1f}s)  حالت: {((d.get('fx') or {}).get('variant'))} / {((d.get('fx') or {}).get('motion'))}")
        for c in d["cues"]:
            lines.append(f"  {c['t']:5.2f}s  {CUE_FA.get(c['type'], c['type'])}  {c.get('label', '')}")
        lines.append("")
    (out / "sound_cues.txt").write_text("\n".join(lines), encoding="utf-8")


def copy_out(pr, out, target, what):
    target = target.expanduser().resolve()
    (target / "slides").mkdir(parents=True, exist_ok=True)
    n = 0
    for s in pr.render_slides():
        for ext in ("mp4", "png"):
            if ext in what:
                f = out / "slides" / f"slide-{s['_num']:02d}.{ext}"
                if f.exists():
                    shutil.copy2(f, target / "slides" / f.name); n += 1
    if "steps" in what:
        for f in ("steps_data.lua", "steps.json"):
            shutil.copy2(out / f, target / f); n += 1
    if "prompter" in what:
        shutil.copy2(out / "prompter.html", target / "prompter.html"); n += 1
    print(f"  {fa(n)} فایل در {target} کپی شد ({', '.join(what)})")


def cmd_render(a):
    """Render single spec / layer JSON files (or every *.json in a folder)."""
    from .project import Project, stage_payload
    from .index import build_index
    build_index()
    paths = []
    for p in a.paths:
        p = Path(p)
        paths += sorted(p.glob("*.json")) if p.is_dir() else [p]
    jobs = []
    for p in paths:
        pr = Project.__new__(Project)
        pr.dir = p.parent.resolve(); pr.warnings = []; pr.default_duration = None
        pr.search = [pr.dir] + list(pr.dir.parents)[:6]
        s = pr._normalise([{"file": str(p.resolve())}])
        for w in pr.warnings:
            print("  ⚠ " + w)
        if not s:
            continue
        if a.output and len(paths) == 1:
            mp4 = a.output
        else:
            od = Path(a.out_dir or (p.parent / "out")); mp4 = str(od / (p.stem + ".mp4"))
        png = str(Path(mp4).with_suffix(".png")) if a.preview or True else None
        jobs.append((stage_payload(s[0]), None if a.preview_only else mp4, png))
    res = run_jobs(jobs, a.theme, a.jobs, a.crf, a.preset, a.quality)
    return 0 if all(r.get("ok") for r in res) else 1


def cmd_import(a):
    from .importer import import_script, to_yaml
    txt = Path(a.script).read_text(encoding="utf-8")
    data = import_script(txt, a.title or Path(a.script).stem)
    y = to_yaml(data)
    if a.output:
        Path(a.output).parent.mkdir(parents=True, exist_ok=True)
        Path(a.output).write_text(y, encoding="utf-8")
        print(f"✓ {len(data['slides'])} اسلاید → {a.output}")
    else:
        print(y)
    return 0


def cmd_new(a):
    src = PKG / "starter" / "video.yaml"
    dst = Path(a.folder)
    if (dst / "video.yaml").exists():
        print("این پوشه از قبل video.yaml دارد؛ دست نزدم."); return 1
    (dst / "img").mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst / "video.yaml")
    print(f"✓ ویدیوی جدید ساخته شد: {dst}/video.yaml  (عکس‌ها را در {dst}/img بگذار)")
    return 0


def cmd_templates(a):
    from .project import template_names
    for t in template_names():
        print(t)
    return 0


def cmd_index(a):
    from .index import build_index
    idx = build_index()
    print(f"✓ {fa(len(idx))} قالب در فهرست: " + "، ".join(t["name"] for t in idx))
    return 0


def cmd_editor(a):
    from .index import build_index
    from .server import serve
    build_index()
    if a.videos:
        videos_root = Path(a.videos)
    elif (Path.cwd() / "videos").exists() or not (PKG.parent / "videos").exists():
        videos_root = Path.cwd() / "videos"
    else:
        videos_root = PKG.parent / "videos"
    serve(videos_root, port=a.port, open_browser=not a.no_browser)
    return 0


def cmd_obs(a):
    from .obs_export import export_obs_package
    from .project import Project
    pr = Project(a.folder)
    render_png = False if a.no_png else (True if a.png else "auto")
    res = export_obs_package(
        pr,
        out_dir=a.out_dir,
        os_target=a.os,
        ws_url=a.ws_url,
        render_png=render_png,
    )
    print(f"✓ بستهٔ OBS برای «{pr.title}» ({fa(res['steps_count'])} مرحله، سیستم‌عامل: {a.os}) → {res['out_dir']}")
    print("  فایل‌ها: " + "، ".join(res["files"]))
    if res["prompter_pngs"]:
        print(f"  تصاویر پرامپتر: {fa(len(res['prompter_pngs']))} فایل PNG در پوشه prompter/")
    for w in res["warnings"]:
        print("  ⚠ " + w)
    return 0


def cmd_gallery(a):
    from .gallery import build_gallery
    build_gallery(a.jobs)
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(prog="khordegir", description="Khordegir Studio — اسلاید متحرک از روی قالب‌ها")
    sub = ap.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("build", help="ساخت همه‌ی اسلایدهای یک ویدیو")
    b.add_argument("folder")
    b.add_argument("--only", help="فقط این اسلایدها، مثل 3,9-12")
    b.add_argument("--copy-to", help="پوشه‌ی HarkStudio برای کپی خروجی")
    b.add_argument("--copy", help="چه چیزهایی کپی شود: mp4,png,steps,prompter")
    b.add_argument("--no-copy", action="store_true")
    b.add_argument("--format", choices=["landscape", "portrait", "square"],
                   help="قاب همه‌ی اسلایدها را برای این ساخت عوض کن (بدون تغییر video.yaml)")
    b.add_argument("--out", help="پوشه‌ی خروجی به جای out کنار video.yaml")
    b.add_argument("--no-video", action="store_true", help="فقط PNG و PDF (سریع)")
    b.add_argument("--force", action="store_true", help="همه را از نو بساز")
    b.add_argument("--jobs", type=int, default=max(1, min(4, (os.cpu_count() or 2))))
    b.add_argument("--crf", type=int, default=18)
    b.add_argument("--preset", default="medium")
    b.add_argument("--quality", choices=["png", "jpeg"], default="jpeg")
    b.set_defaults(fn=cmd_build)
    r = sub.add_parser("render", help="ساخت از فایل spec یا لایه‌ای JSON")
    r.add_argument("paths", nargs="+")
    r.add_argument("-o", "--output")
    r.add_argument("--out-dir")
    r.add_argument("--preview", action="store_true", help="فریم آخر را هم PNG ذخیره کن")
    r.add_argument("--preview-only", action="store_true")
    r.add_argument("--theme")
    r.add_argument("--jobs", type=int, default=2)
    r.add_argument("--crf", type=int, default=18)
    r.add_argument("--preset", default="medium")
    r.add_argument("--quality", choices=["png", "jpeg"], default="jpeg")
    r.set_defaults(fn=cmd_render)
    i = sub.add_parser("import", help="تبدیل متن اسکریپت با نشانه‌ها به video.yaml")
    i.add_argument("script"); i.add_argument("-o", "--output"); i.add_argument("--title")
    i.set_defaults(fn=cmd_import)
    n = sub.add_parser("new", help="ساخت پوشه‌ی ویدیوی جدید از روی نمونه")
    n.add_argument("folder"); n.set_defaults(fn=cmd_new)
    t = sub.add_parser("templates", help="فهرست قالب‌ها"); t.set_defaults(fn=cmd_templates)
    x = sub.add_parser("index", help="به‌روزرسانی فهرست قالب‌ها و تم‌ها (بعد از اضافه کردن پوشه‌ی قالب)"); x.set_defaults(fn=cmd_index)
    e = sub.add_parser("editor", help="اجرای سرور محلی و باز کردن ویرایشگر در مرورگر")
    e.add_argument("--port", type=int, default=8765, help="پورت سرور محلی (پیش‌فرض: 8765)")
    e.add_argument("--no-browser", action="store_true", help="مرورگر خودکار باز نشود")
    e.add_argument("--videos", metavar="DIR", help="پوشهٔ پروژه‌های ویدیو (پیش‌فرض: ./videos)")
    e.set_defaults(fn=cmd_editor)
    o = sub.add_parser("obs", help="ساخت بستهٔ کامل OBS (Lua v8، پرامپتر و اسکریپت نصب)")
    o.add_argument("folder")
    o.add_argument("--os", choices=["linux", "windows", "macos"], default="linux", help="سیستم‌عامل هدف")
    o.add_argument("-o", "--out-dir", help="پوشهٔ خروجی بستهٔ OBS")
    o.add_argument("--ws-url", default="ws://127.0.0.1:4455", help="آدرس OBS WebSocket")
    o.add_argument("--no-png", action="store_true", help="بدون رندر تصاویر PNG پرامپتر")
    o.add_argument("--png", action="store_true", help="اجبار رندر تصاویر PNG پرامپتر با Playwright")
    o.set_defaults(fn=cmd_obs)
    g = sub.add_parser("gallery", help="ساخت تصویر پیش‌نمایش قالب‌ها")
    g.add_argument("--jobs", type=int, default=2); g.set_defaults(fn=cmd_gallery)
    a = ap.parse_args(argv)
    try:
        return a.fn(a) or 0
    except KeyboardInterrupt:
        print("لغو شد."); return 130


if __name__ == "__main__":
    sys.exit(main())
