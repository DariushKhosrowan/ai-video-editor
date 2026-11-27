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
  python3 -m khordegir ai-guide [topic] [-o guide.md] # تولید راهنمای پرامپت هوش مصنوعی
  python3 -m khordegir ai-import output.txt -o videos/<name>/video.yaml # اعتبارسنجی و تبدیل خروجی هوش مصنوعی
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
    extras = []
    try:
        from .captions import write_captions
        cap_res = write_captions(pr, out)
        if cap_res:
            for w in cap_res.get("warnings", []):
                print("  ⚠ " + w)
            extras.append("زیرنویس: captions.srt / captions.vtt")
    except Exception as e:
        print(f"  ⚠ زیرنویس ساخته نشد: {e}")
    try:
        from .sfx import build_sfx_plan
        sfx_plan = build_sfx_plan(pr, out)
        if sfx_plan and sfx_plan.get("wavs"):
            extras.append(f"افکت صوتی: {fa(len(sfx_plan['wavs']))} فایل WAV")
    except Exception as e:
        print(f"  ⚠ افکت صوتی ساخته نشد: {e}")
    bad = [r for r in results if not r.get("ok")]
    print(f"تمام شد در {fa(round(time.time() - t0))} ثانیه → {out}")
    print(f"  {fa(len(steps))} مرحله در steps_data.lua، فایل PDF: slides.pdf، تله‌پرامپتر: prompter.html" + (("، " + "، ".join(extras)) if extras else ""))
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


# ------------------------------------------------------------------ AI Guide & AI Import CLI
def cmd_ai_guide(a):
    """Generate prompt specification guide to paste into any AI model."""
    from .ai_guide import generate_ai_guide

    topic = a.topic or a.opt_topic or ""
    if a.script:
        script_path = Path(a.script).expanduser().resolve()
        if script_path.exists():
            topic = script_path.read_text(encoding="utf-8")
        else:
            print(f"✗ خطا: فایل اسکریپت «{a.script}» پیدا نشد.", file=sys.stderr)
            return 1
    elif not topic and not sys.stdin.isatty():
        topic = sys.stdin.read()

    options = {
        "topic": topic.strip(),
        "title": getattr(a, "title", None),
        "theme": getattr(a, "theme", None),
        "lang": getattr(a, "lang", None),
        "duration": getattr(a, "duration", None),
        "count_style": getattr(a, "count_style", None),
    }

    guide_text = generate_ai_guide(PKG, options=options)

    if a.output:
        out_path = Path(a.output).expanduser().resolve()
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(guide_text, encoding="utf-8")
        print(f"✓ راهنمای پرامپت هوش مصنوعی نوشته شد → {out_path}")
    else:
        print(guide_text)

    return 0


def cmd_ai_import(a):
    """Validate and import AI-generated YAML/JSON into a video project."""
    from .ai_guide import validate_and_fix_video_yaml, ai_import_to_project

    # 1. Read input
    raw_text = ""
    if a.input and a.input != "-":
        p = Path(a.input).expanduser().resolve()
        if not p.exists():
            print(f"✗ خطا: فایل ورودی «{a.input}» پیدا نشد.", file=sys.stderr)
            return 1
        raw_text = p.read_text(encoding="utf-8")
    elif not sys.stdin.isatty() or a.input == "-":
        raw_text = sys.stdin.read()
    else:
        print("✗ خطا: لطفاً مسیر فایل ورودی را مشخص کنید یا خروجی را پایپ کنید.\nمثال: khordegir ai-import output.txt -o videos/my-video/video.yaml", file=sys.stderr)
        return 1

    # 2. Determine target video.yaml path
    target = None
    if a.output:
        target = Path(a.output).expanduser().resolve()
    elif a.project:
        target = (Path("videos") / a.project / "video.yaml").resolve()
    elif Path("video.yaml").exists():
        target = Path("video.yaml").resolve()
    else:
        target = Path("video.yaml").resolve()

    # 3. Dry-run or JSON mode
    if getattr(a, "json", False):
        res = validate_and_fix_video_yaml(raw_text, pkg_root=PKG)
        print(json.dumps(res, ensure_ascii=False, indent=2))
        return 0 if res["ok"] else 1

    if getattr(a, "dry_run", False):
        res = validate_and_fix_video_yaml(raw_text, pkg_root=PKG)
        if res["auto_fixes"]:
            print(f"✓ {fa(len(res['auto_fixes']))} مورد اصلاح خودکار انجام شد:")
            for fix in res["auto_fixes"]:
                print(f"  • {fix}")
        if res["warnings"]:
            print(f"⚠ {fa(len(res['warnings']))} هشدار:")
            for w in res["warnings"]:
                print(f"  • {w}")
        if not res["ok"]:
            print(f"✗ {fa(len(res['errors']))} خطا در ساختار ورودی:")
            for err in res["errors"]:
                print(f"  • {err}")
            return 1
        slide_count = len((res.get("data") or {}).get("slides") or [])
        print(f"✓ خروجی معتبر است ({fa(slide_count)} اسلاید). [حالت آزمایشی: تغییری در دیسک اعمال نشد]")
        return 0

    # 4. Perform actual import & write to disk
    res = ai_import_to_project(
        raw_text,
        target_path=target,
        pkg_root=PKG,
        append=getattr(a, "append", False),
        title=getattr(a, "title", None),
        theme=getattr(a, "theme", None),
    )

    if res["auto_fixes"]:
        print(f"✓ {fa(len(res['auto_fixes']))} مورد اصلاح خودکار:")
        for fix in res["auto_fixes"]:
            print(f"  • {fix}")

    if res["warnings"]:
        print(f"⚠ {fa(len(res['warnings']))} هشدار:")
        for w in res["warnings"]:
            print(f"  • {w}")

    if not res["ok"]:
        print(f"✗ {fa(len(res['errors']))} خطا در اعتبارسنجی خروجی هوش مصنوعی:", file=sys.stderr)
        for err in res["errors"]:
            print(f"  • {err}", file=sys.stderr)
        return 1

    print(f"✓ {fa(res['slide_count'])} اسلاید با موفقیت در «{res['target']}» ثبت شد.")
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(prog="khordegir", description="Khordegir Studio — اسلاید متحرک از روی قالب‌ها")
    sub = ap.add_subparsers(dest="cmd", required=True)

    # build
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

    # render
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

    # import
    i = sub.add_parser("import", help="تبدیل متن اسکریپت با نشانه‌ها به video.yaml")
    i.add_argument("script"); i.add_argument("-o", "--output"); i.add_argument("--title")
    i.set_defaults(fn=cmd_import)

    # new
    n = sub.add_parser("new", help="ساخت پوشه‌ی ویدیوی جدید از روی نمونه")
    n.add_argument("folder"); n.set_defaults(fn=cmd_new)

    # templates & index
    t = sub.add_parser("templates", help="فهرست قالب‌ها"); t.set_defaults(fn=cmd_templates)
    x = sub.add_parser("index", help="به‌روزرسانی فهرست قالب‌ها و تم‌ها (بعد از اضافه کردن پوشه‌ی قالب)"); x.set_defaults(fn=cmd_index)

    # editor
    e = sub.add_parser("editor", help="اجرای سرور محلی و باز کردن ویرایشگر در مرورگر")
    e.add_argument("--port", type=int, default=8765, help="پورت سرور محلی (پیش‌فرض: 8765)")
    e.add_argument("--no-browser", action="store_true", help="مرورگر خودکار باز نشود")
    e.add_argument("--videos", metavar="DIR", help="پوشهٔ پروژه‌های ویدیو (پیش‌فرض: ./videos)")
    e.set_defaults(fn=cmd_editor)

    # obs
    o = sub.add_parser("obs", help="ساخت بستهٔ کامل OBS (Lua v8، پرامپتر و اسکریپت نصب)")
    o.add_argument("folder")
    o.add_argument("--os", choices=["linux", "windows", "macos"], default="linux", help="سیستم‌عامل هدف")
    o.add_argument("-o", "--out-dir", help="پوشهٔ خروجی بستهٔ OBS")
    o.add_argument("--ws-url", default="ws://127.0.0.1:4455", help="آدرس OBS WebSocket")
    o.add_argument("--no-png", action="store_true", help="بدون رندر تصاویر PNG پرامپتر")
    o.add_argument("--png", action="store_true", help="اجبار رندر تصاویر PNG پرامپتر با Playwright")
    o.set_defaults(fn=cmd_obs)

    # gallery
    g = sub.add_parser("gallery", help="ساخت تصویر پیش‌نمایش قالب‌ها")
    g.add_argument("--jobs", type=int, default=2); g.set_defaults(fn=cmd_gallery)

    # ------------------ New ai-guide subcommand ------------------
    ag = sub.add_parser("ai-guide", help="تولید راهنمای پرامپت هوش مصنوعی برای تبدیل موضوع به اسلاید")
    # Beginner one-click default positional argument
    ag.add_argument("topic", nargs="?", help="موضوع ویدیو یا بخشی از اسکریپت (اختیاری)")
    ag.add_argument("-o", "--output", help="ذخیرهٔ راهنمای پرامپت در فایل متنی (مثلاً prompt.md)")
    ag.add_argument("-s", "--script", help="خواندن متن اسکریپت از فایل متنی")
    ag.add_argument("-t", "--topic", dest="opt_topic", help="موضوع به صورت آپشن")
    # Hard options under Advanced
    adv_ag = ag.add_argument_group("تنظیمات پیشرفته (Advanced)")
    adv_ag.add_argument("--theme", help="پیش‌فرض تم برای راهنما")
    adv_ag.add_argument("--lang", choices=["fa", "en"], default="fa", help="زبان پیش‌فرض پروژه (fa یا en)")
    adv_ag.add_argument("--format", choices=["landscape", "portrait", "square"], help="قاب پیش‌فرض تصویر")
    adv_ag.add_argument("--count-style", choices=["pop", "smooth", "slam", "subtle"], help="سبک شمارش اعداد")
    adv_ag.add_argument("--duration", type=float, help="حداقل ثانیه پیش‌فرض برای هر اسلاید")
    ag.set_defaults(fn=cmd_ai_guide)

    # ------------------ New ai-import subcommand -----------------
    ai = sub.add_parser("ai-import", help="اعتبارسنجی و تبدیل خروجی هوش مصنوعی به video.yaml پروژه")
    # Beginner one-click default
    ai.add_argument("input", nargs="?", help="فایل حاوی خروجی هوش مصنوعی (یا - برای خواندن از stdin)")
    ai.add_argument("-o", "--output", help="مسیر فایل یا پوشهٔ پروژه (پیش‌فرض: video.yaml)")
    ai.add_argument("-p", "--project", help="نام پوشه در videos/ (مثلاً my-video)")
    ai.add_argument("--append", action="store_true", help="افزودن اسلایدها به انتهای video.yaml موجود")
    ai.add_argument("--dry-run", action="store_true", help="بررسی اعتبار بدون نوشتن روی دیسک")
    # Hard options under Advanced
    adv_ai = ai.add_argument_group("تنظیمات پیشرفته (Advanced)")
    adv_ai.add_argument("--title", help="عنوان دلخواه برای ویدیو")
    adv_ai.add_argument("--theme", help="تغییر تم پیش‌فرض پروژه")
    adv_ai.add_argument("--force", action="store_true", help="اجبار به نوشتن با وجود هشدارها")
    adv_ai.add_argument("--json", action="store_true", help="نمایش نتیجه اعتبارسنجی با فرمت JSON")
    ai.set_defaults(fn=cmd_ai_import)

    a = ap.parse_args(argv)
    try:
        return a.fn(a) or 0
    except KeyboardInterrupt:
        print("لغو شد."); return 130


if __name__ == "__main__":
    sys.exit(main())
