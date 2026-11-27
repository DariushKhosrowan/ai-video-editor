"""Multi-format offline export for Khordegir Studio.

SPDX-License-Identifier: MIT

Renders a single ``video.yaml`` project into any combination of:
  - ``landscape`` (1920x1080, 16:9)
  - ``portrait``  (1080x1920, 9:16)
  - ``square``    (1080x1080, 1:1)

Design principles:
  - ``video.yaml`` remains the single source of truth (never mutated).
  - Reuses ``project.validate_format`` (``norm_format``) and ``stage_payload``.
  - Beginner one-click default: ``khordegir build <folder> --formats all`` needs
    no extra tuning; harder options live under ``advanced``.
  - 100% offline, deterministic, and additive (existing single-format ``build``
    behaviour is untouched when ``--formats`` is omitted).
"""
from __future__ import annotations

from concurrent.futures import ProcessPoolExecutor
import copy
import hashlib
import json
import os
from pathlib import Path
import shutil
import sys
import time
from typing import Any, Iterable, Mapping, Sequence

from .captions import write_captions
from .index import build_index, template_hash
from .outputs import write_pdf, write_steps
from .project import Project, FORMATS, stage_payload, norm_format as _project_norm_format

VALID_FORMATS = tuple(FORMATS)


def validate_format(fmt, *, where="format"):
    if fmt is not None and not isinstance(fmt, str):
        raise TypeError(f"{where}: Wrong type for format: {type(fmt).__name__}")
    out = _project_norm_format(fmt, "landscape")
    if out is None:
        raise ValueError(f"{where}: Unknown format {fmt!r}; allowed: {', '.join(VALID_FORMATS)}")
    return out

from .render import Renderer
from .sfx import build_sfx_plan

PKG = Path(__file__).resolve().parent

FORMAT_SPECS: dict[str, dict[str, Any]] = {
    "landscape": {
        "name": "landscape",
        "width": 1920,
        "height": 1080,
        "aspect": "16:9",
        "label": "افقی (۱۶:۹)",
    },
    "portrait": {
        "name": "portrait",
        "width": 1080,
        "height": 1920,
        "aspect": "9:16",
        "label": "عمودی (۹:۱۶)",
    },
    "square": {
        "name": "square",
        "width": 1080,
        "height": 1080,
        "aspect": "1:1",
        "label": "مربع (۱:۱)",
    },
}

VALID_ADVANCED_KEYS = frozenset(
    {"fps", "crf", "preset", "quality", "jobs", "only", "no_video", "force"}
)

CUE_FA = {
    "whoosh": "ووش (ورود عنوان)",
    "pop": "پاپ (حباب/نشان)",
    "soft": "ورود نرم کارت‌ها",
    "count-start": "شروع تیک شمارنده",
    "count-end": "پایان شمارش (دینگ)",
    "bar": "نشستن میله",
    "draw": "کشیده شدن خط",
    "swish": "ماژیک/هایلایت",
}


def norm_format(fmt: Any, *, where: str = "MultiExport") -> str:
    """Normalize and validate a display format using ``project.validate_format``."""
    return validate_format(fmt, where=where)


def format_dimensions(fmt: str) -> tuple[int, int]:
    """Return ``(width, height)`` in pixels for a validated format."""
    clean = norm_format(fmt, where="MultiExport")
    spec = FORMAT_SPECS[clean]
    return int(spec["width"]), int(spec["height"])


def parse_formats(
    formats: str | Sequence[str] | Iterable[str] | None,
    *,
    default_format: str | None = None,
) -> list[str]:
    """Parse ``--formats`` CLI or Python API input into a deduplicated ordered list.

    Supports ``"all"`` (or ``"*"`` / ``"همه"``), comma-separated strings like
    ``"landscape,portrait"``, or an iterable of format names. Every individual
    format name is validated via ``norm_format`` (``project.validate_format``).
    """
    if formats is None:
        if default_format is not None:
            return [norm_format(default_format, where="MultiExport")]
        return list(VALID_FORMATS)

    if isinstance(formats, str):
        cleaned = formats.strip()
        if not cleaned:
            raise ValueError(
                "MultiExport: Empty formats value. Use 'all' or a comma-separated list from: "
                + ", ".join(VALID_FORMATS)
            )
        if cleaned.lower() in ("all", "*", "همه"):
            return list(VALID_FORMATS)
        raw_items = [part.strip() for part in cleaned.replace("،", ",").split(",")]
        if any(not part for part in raw_items):
            raise ValueError(
                f"MultiExport: Invalid empty format entry in {formats!r}. "
                f"Allowed formats: {', '.join(VALID_FORMATS)}"
            )
    elif isinstance(formats, (bytes, bytearray)):
        raise TypeError(
            f"MultiExport: Wrong type for formats: expected string or sequence, got {type(formats).__name__}"
        )
    elif isinstance(formats, Iterable):
        raw_items = list(formats)
        if not raw_items:
            raise ValueError(
                "MultiExport: Formats sequence must not be empty. Allowed formats: "
                + ", ".join(VALID_FORMATS)
            )
        if len(raw_items) == 1 and isinstance(raw_items[0], str) and raw_items[0].strip().lower() in ("all", "*", "همه"):
            return list(VALID_FORMATS)
    else:
        # Delegate type error formatting to norm_format
        norm_format(formats, where="MultiExport")
        raw_items = []  # pragma: no cover

    resolved: list[str] = []
    seen: set[str] = set()
    for item in raw_items:
        clean = norm_format(item, where="MultiExport")
        if clean not in seen:
            seen.add(clean)
            resolved.append(clean)
    return resolved


def normalize_advanced_options(advanced: Mapping[str, Any] | None = None) -> dict[str, Any]:
    """Validate optional ``advanced`` tuning parameters with beginner-safe defaults."""
    opts: dict[str, Any] = {
        "fps": 30,
        "crf": 18,
        "preset": "medium",
        "quality": "jpeg",
        "jobs": 1,
        "only": None,
        "no_video": False,
        "force": False,
    }
    if advanced is None:
        return opts
    if not isinstance(advanced, Mapping):
        raise TypeError(
            f"MultiExport: 'advanced' must be a mapping, got {type(advanced).__name__}"
        )
    unknown = set(advanced.keys()) - VALID_ADVANCED_KEYS
    if unknown:
        raise ValueError(
            f"MultiExport: Unknown key(s) in advanced: {', '.join(sorted(unknown))}. "
            f"Allowed keys: {', '.join(sorted(VALID_ADVANCED_KEYS))}"
        )
    if "fps" in advanced and advanced["fps"] is not None:
        fps = advanced["fps"]
        if isinstance(fps, bool) or not isinstance(fps, int) or fps <= 0:
            raise ValueError(f"MultiExport: advanced.fps must be a positive integer, got {fps!r}")
        opts["fps"] = fps
    if "crf" in advanced and advanced["crf"] is not None:
        crf = advanced["crf"]
        if isinstance(crf, bool) or not isinstance(crf, int) or not (0 <= crf <= 51):
            raise ValueError(f"MultiExport: advanced.crf must be an integer in 0..51, got {crf!r}")
        opts["crf"] = crf
    if "preset" in advanced and advanced["preset"] is not None:
        preset = str(advanced["preset"]).strip()
        if not preset:
            raise ValueError("MultiExport: advanced.preset must be non-empty")
        opts["preset"] = preset
    if "quality" in advanced and advanced["quality"] is not None:
        q = str(advanced["quality"]).strip().lower()
        if q not in ("png", "jpeg"):
            raise ValueError(f"MultiExport: advanced.quality must be 'png' or 'jpeg', got {q!r}")
        opts["quality"] = q
    if "jobs" in advanced and advanced["jobs"] is not None:
        jobs = advanced["jobs"]
        if isinstance(jobs, bool) or not isinstance(jobs, int) or jobs < 1:
            raise ValueError(f"MultiExport: advanced.jobs must be >= 1, got {jobs!r}")
        opts["jobs"] = jobs
    if "only" in advanced:
        opts["only"] = advanced["only"]
    if "no_video" in advanced:
        opts["no_video"] = bool(advanced["no_video"])
    if "force" in advanced:
        opts["force"] = bool(advanced["force"])
    return opts


def _fa(n: Any) -> str:
    return str(n).translate(str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹"))


def _parse_only(s: Any) -> set[int] | None:
    if not s:
        return None
    if isinstance(s, (set, list, tuple)):
        return {int(x) for x in s}
    out: set[int] = set()
    for part in str(s).split(","):
        part = part.strip().translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789"))
        if "-" in part:
            a, b = part.split("-", 1)
            out.update(range(int(a), int(b) + 1))
        elif part:
            out.add(int(part))
    return out


def _engine_hash(theme: Any) -> str:
    h = hashlib.sha1()
    for p in sorted(list((PKG / "stage").glob("*")) + list((PKG / "themes").glob("*.js"))):
        if p.is_file():
            h.update(p.read_bytes())
    h.update(json.dumps(theme, ensure_ascii=False, sort_keys=True).encode("utf-8"))
    return h.hexdigest()[:12]


def _renderer_theme_arg(theme: Any) -> str | None:
    if isinstance(theme, Mapping):
        name = theme.get("name")
        return str(name) if name else None
    if isinstance(theme, str):
        return theme
    return None


def build_slide_payload(slide: Mapping[str, Any], target_format: str) -> dict[str, Any]:
    """Return a clean stage payload for ``slide`` locked to ``target_format``."""
    clean_fmt = norm_format(target_format, where="MultiExport")
    payload = copy.deepcopy(stage_payload(slide))
    payload["format"] = clean_fmt
    return payload


class FormatRenderer(Renderer):
    """Format-aware subclass of ``khordegir.render.Renderer``.

    Dynamically adjusts Chromium viewport and screenshot clip rectangle to match
    ``landscape`` (1920x1080), ``portrait`` (1080x1920), or ``square`` (1080x1080)
    without modifying ``render.py``.
    """

    def __init__(self, theme=None, fps: int = 30, quality: str = "png", fmt: str = "landscape"):
        super().__init__(theme=theme, fps=fps, quality=quality)
        self.format = norm_format(fmt, where="FormatRenderer")
        self.width, self.height = format_dimensions(self.format)

    def __enter__(self):
        super().__enter__()
        self.set_format(self.format)
        return self

    def set_format(self, fmt: str) -> tuple[int, int]:
        clean = norm_format(fmt, where="FormatRenderer")
        w, h = format_dimensions(clean)
        self.format = clean
        self.width = w
        self.height = h
        page = getattr(self, "page", None)
        if page is not None:
            page.set_viewport_size({"width": w, "height": h})
            page.evaluate(
                "([w, h, f]) => { "
                "document.body.style.width = w + 'px'; "
                "document.body.style.height = h + 'px'; "
                "const st = document.getElementById('stage'); "
                "if (st) { st.style.width = w + 'px'; st.style.height = h + 'px'; st.setAttribute('data-format', f); } "
                "if (window.Stage) { Stage.W = w; Stage.H = h; } "
                "}",
                [w, h, clean],
            )
        return w, h

    def load(self, slide):
        payload = dict(slide or {})
        slide_fmt = norm_format(payload.get("format") or self.format, where="FormatRenderer")
        w, h = format_dimensions(slide_fmt)
        if slide_fmt != self.format or w != self.width or h != self.height:
            self.set_format(slide_fmt)
        payload["format"] = self.format
        return super().load(payload)

    def shot(self, t, path=None, jpeg=False):
        self.page.evaluate("t => Stage.seek(t)", t)
        kw = dict(type="jpeg", quality=95) if jpeg else dict(type="png")
        return self.page.screenshot(
            path=path,
            clip={"x": 0, "y": 0, "width": self.width, "height": self.height},
            animations="allow",
            caret="hide",
            **kw,
        )


def _render_format_batch(args: tuple) -> list[dict[str, Any]]:
    jobs, theme, fps, crf, preset, quality, fmt = args
    res: list[dict[str, Any]] = []
    with FormatRenderer(theme=_renderer_theme_arg(theme), fps=fps, quality=quality, fmt=fmt) as r:
        for payload, mp4, png in jobs:
            t0 = time.time()
            try:
                info = r.render(payload, mp4=mp4, png=png, crf=crf, preset=preset)
                info["ok"] = True
            except Exception as exc:
                info = {"ok": False, "error": str(exc)}
            info["file"] = mp4 or png
            info["format"] = fmt
            info["sec"] = round(time.time() - t0, 1)
            print(
                f"  ✓ [{fmt}] {Path(info['file']).name}  ({info.get('duration', 0):.1f}s کلیپ، {info['sec']} ثانیه ساخت)"
                if info["ok"]
                else f"  ✗ [{fmt}] {Path(info['file']).name}: {info['error']}",
                flush=True,
            )
            res.append(info)
    return res


def _run_format_jobs(
    jobs: list[tuple[dict[str, Any], str | None, str]],
    *,
    theme: Any,
    fps: int,
    n_jobs: int,
    crf: int,
    preset: str,
    quality: str,
    fmt: str,
) -> list[dict[str, Any]]:
    if not jobs:
        return []
    workers = max(1, min(n_jobs, len(jobs)))
    if workers == 1:
        return _render_format_batch((jobs, theme, fps, crf, preset, quality, fmt))
    batches = [jobs[i::workers] for i in range(workers)]
    out: list[dict[str, Any]] = []
    with ProcessPoolExecutor(workers) as ex:
        for r in ex.map(
            _render_format_batch,
            [(b, theme, fps, crf, preset, quality, fmt) for b in batches],
        ):
            out += r
    return out


def _write_cues(out: Path, results: list[dict[str, Any]]) -> None:
    f = out / "sound_cues.json"
    allc = json.loads(f.read_text(encoding="utf-8")) if f.exists() else {}
    for r in results:
        if r.get("ok"):
            allc[Path(r["file"]).stem] = {
                "duration": r.get("duration"),
                "fx": r.get("fx"),
                "cues": r.get("cues", []),
            }
    f.write_text(
        json.dumps(dict(sorted(allc.items())), ensure_ascii=False, indent=1),
        encoding="utf-8",
    )
    lines = ["# نشانه‌های صدا برای هر کلیپ (ثانیه از شروع کلیپ). برای افکت صوتی در تدوین.", ""]
    for name, d in sorted(allc.items()):
        fx = d.get("fx") or {}
        lines.append(
            f"## {name}  ({d.get('duration', 0):.1f}s)  حالت: {fx.get('variant')} / {fx.get('motion')}"
        )
        for c in d.get("cues", []):
            lines.append(f"  {c['t']:5.2f}s  {CUE_FA.get(c['type'], c['type'])}  {c.get('label', '')}")
        lines.append("")
    (out / "sound_cues.txt").write_text("\n".join(lines), encoding="utf-8")


def _copy_format_out(
    project: Project,
    fmt_out: Path,
    target_dir: Path,
    what: Sequence[str],
) -> int:
    target_dir = target_dir.expanduser().resolve()
    (target_dir / "slides").mkdir(parents=True, exist_ok=True)
    n = 0
    for s in project.render_slides():
        for ext in ("mp4", "png"):
            if ext in what:
                src = fmt_out / "slides" / f"slide-{s['_num']:02d}.{ext}"
                if src.exists():
                    shutil.copy2(src, target_dir / "slides" / src.name)
                    n += 1
    if "steps" in what:
        for fname in ("steps_data.lua", "steps.json"):
            src = fmt_out / fname
            if src.exists():
                shutil.copy2(src, target_dir / fname)
                n += 1
    if "prompter" in what:
        src = fmt_out / "prompter.html"
        if src.exists():
            shutil.copy2(src, target_dir / "prompter.html")
            n += 1
    return n


def export_single_format(
    project: Project,
    fmt: str,
    *,
    out_dir: str | Path | None = None,
    advanced: Mapping[str, Any] | None = None,
    copy_to: str | Path | None = None,
    copy_what: Sequence[str] | None = None,
    no_copy: bool = False,
) -> dict[str, Any]:
    """Render and package all outputs for one validated format into ``out_dir/<fmt>``."""
    clean_fmt = norm_format(fmt, where="MultiExport")
    w, h = format_dimensions(clean_fmt)
    adv = normalize_advanced_options(advanced)

    base_out = Path(out_dir).resolve() if out_dir is not None else project.out
    fmt_out = base_out / clean_fmt
    sd = fmt_out / "slides"
    sd.mkdir(parents=True, exist_ok=True)

    only = _parse_only(adv["only"])
    no_video = bool(adv["no_video"])
    force = bool(adv["force"])

    cache_f = fmt_out / ".build-cache.json"
    cache = json.loads(cache_f.read_text(encoding="utf-8")) if cache_f.exists() else {}
    eh = _engine_hash(project.theme)

    jobs: list[tuple[dict[str, Any], str | None, str]] = []
    keys: dict[str, str] = {}
    slide_records: list[dict[str, Any]] = []

    for s in project.render_slides():
        n = s["_num"]
        if only and n not in only:
            continue
        payload = build_slide_payload(s, clean_fmt)
        key_src = (
            json.dumps(payload, ensure_ascii=False, sort_keys=True)
            + eh
            + template_hash(s["template"])
            + str(no_video)
            + f"|{clean_fmt}|{w}x{h}|{adv['fps']}|{adv['crf']}|{adv['preset']}|{adv['quality']}"
        )
        key = hashlib.sha1(key_src.encode("utf-8")).hexdigest()[:16]
        name = f"slide-{n:02d}"
        mp4 = None if no_video else str(sd / f"{name}.mp4")
        png = str(sd / f"{name}.png")
        slide_records.append(
            {
                "num": n,
                "name": name,
                "template": s["template"],
                "mp4": mp4,
                "png": png,
            }
        )
        if (
            not force
            and cache.get(name) == key
            and os.path.exists(png)
            and (no_video or os.path.exists(mp4))
        ):
            print(f"  = [{clean_fmt}] {name} بدون تغییر (رد شد)")
            continue
        jobs.append((payload, mp4, png))
        keys[name] = key

    results = _run_format_jobs(
        jobs,
        theme=project.theme,
        fps=adv["fps"],
        n_jobs=adv["jobs"],
        crf=adv["crf"],
        preset=adv["preset"],
        quality=adv["quality"],
        fmt=clean_fmt,
    )

    for r in results:
        name = Path(r["file"]).stem
        if r.get("ok"):
            cache[name] = keys.get(name)
            if r.get("cam_overlap"):
                print(f"  ⚠ [{clean_fmt}] {name}: چیزی داخل جای دوربین افتاده: {r['cam_overlap'][:3]}")

    cache_f.write_text(json.dumps(cache, indent=1, sort_keys=True), encoding="utf-8")
    _write_cues(fmt_out, results)
    steps = write_steps(project, fmt_out)
    cap_res = write_captions(project, fmt_out, video_format=clean_fmt)
    sfx_plan = build_sfx_plan(project, fmt_out)

    pngs = [str(sd / f"slide-{s['_num']:02d}.png") for s in project.render_slides()]
    existing_pngs = [p for p in pngs if os.path.exists(p)]
    pdf_path: str | None = None
    warnings = list(project.warnings)
    if cap_res:
        warnings.extend(cap_res.get("warnings", []))
    if existing_pngs:
        try:
            pdf_path = write_pdf(existing_pngs, str(fmt_out / "slides.pdf"))
        except ImportError:
            warnings.append("Pillow نصب نیست؛ فایل slides.pdf ساخته نشد.")

    report_lines = [
        f"{Path(r['file']).name}\t{clean_fmt}({w}x{h})\t{r.get('duration', 0):.2f}s\t"
        + ("OK" if r.get("ok") else "ERROR " + r.get("error", ""))
        + (f"\tCAM-OVERLAP {r['cam_overlap']}" if r.get("cam_overlap") else "")
        for r in results
    ]
    (fmt_out / "build-report.txt").write_text(
        "\n".join(report_lines + ["", "هشدارها:"] + warnings) + "\n",
        encoding="utf-8",
    )

    target = copy_to or (str(project.studio) if project.studio and not no_copy else None)
    copied = 0
    if target:
        what = list(copy_what) if copy_what else list(project.copy)
        copied = _copy_format_out(project, fmt_out, Path(target) / clean_fmt, what)

    bad = [r for r in results if not r.get("ok")]
    return {
        "format": clean_fmt,
        "width": w,
        "height": h,
        "aspect": FORMAT_SPECS[clean_fmt]["aspect"],
        "out_dir": str(fmt_out),
        "slides": slide_records,
        "results": results,
        "steps_count": len(steps),
        "captions": {
            "srt": str(cap_res["srt"]),
            "vtt": str(cap_res["vtt"]),
        }
        if cap_res
        else None,
        "sfx_wavs": [str(p) for p in sfx_plan.get("wavs", [])] if sfx_plan else [],
        "pdf": pdf_path,
        "copied": copied,
        "warnings": warnings,
        "errors": bad,
        "ok": len(bad) == 0,
    }


def export_project(
    project_or_path: Project | str | Path,
    *,
    formats: str | Sequence[str] | Iterable[str] | None = "all",
    out_dir: str | Path | None = None,
    advanced: Mapping[str, Any] | None = None,
    copy_to: str | Path | None = None,
    copy_what: Sequence[str] | None = None,
    no_copy: bool = False,
) -> dict[str, Any]:
    """Export ``project_or_path`` across multiple formats in one deterministic run."""
    build_index()
    project = (
        project_or_path
        if isinstance(project_or_path, Project)
        else Project(project_or_path)
    )
    target_formats = parse_formats(formats, default_format=project.format)
    base_out = Path(out_dir).resolve() if out_dir is not None else project.out
    base_out.mkdir(parents=True, exist_ok=True)

    print(
        f"ساخت چندفرمته «{project.title}» — {_fa(len(project.render_slides()))} اسلاید، "
        f"فرمت‌ها: {', '.join(target_formats)}"
    )
    for w in project.warnings:
        print("  ⚠ " + w)

    format_outputs: dict[str, dict[str, Any]] = {}
    all_ok = True
    for fmt in target_formats:
        res = export_single_format(
            project,
            fmt,
            out_dir=base_out,
            advanced=advanced,
            copy_to=copy_to,
            copy_what=copy_what,
            no_copy=no_copy,
        )
        format_outputs[fmt] = res
        if not res["ok"]:
            all_ok = False

    manifest = {
        "title": project.title,
        "source": project.yaml_path.name if project.yaml_path else "slides",
        "formats": {
            fmt: {
                "format": info["format"],
                "width": info["width"],
                "height": info["height"],
                "aspect": info["aspect"],
                "out_dir": info["out_dir"],
                "slides": info["slides"],
                "captions": info["captions"],
                "pdf": info["pdf"],
                "steps_count": info["steps_count"],
                "ok": info["ok"],
            }
            for fmt, info in format_outputs.items()
        },
        "ok": all_ok,
    }
    manifest_path = base_out / "multiexport-manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    return {
        "title": project.title,
        "out_dir": str(base_out),
        "manifest_path": str(manifest_path),
        "target_formats": target_formats,
        "formats": format_outputs,
        "ok": all_ok,
    }


def cmd_build_formats(args: Any) -> int:
    """CLI handler for ``khordegir build <folder> --formats ...``."""
    t0 = time.time()
    advanced = {
        "crf": getattr(args, "crf", 18),
        "preset": getattr(args, "preset", "medium"),
        "quality": getattr(args, "quality", "jpeg"),
        "jobs": getattr(args, "jobs", 1),
        "only": getattr(args, "only", None),
        "no_video": bool(getattr(args, "no_video", False)),
        "force": bool(getattr(args, "force", False)),
    }
    copy_raw = getattr(args, "copy", None)
    copy_what = [c.strip() for c in copy_raw.split(",") if c.strip()] if copy_raw else None
    try:
        summary = export_project(
            args.folder,
            formats=args.formats,
            advanced=advanced,
            copy_to=getattr(args, "copy_to", None),
            copy_what=copy_what,
            no_copy=bool(getattr(args, "no_copy", False)),
        )
    except (ValueError, TypeError) as exc:
        print(f"خطا در پارامتر فرمت‌ها: {exc}", file=sys.stderr)
        return 2

    elapsed = round(time.time() - t0)
    print(f"تمام شد در {_fa(elapsed)} ثانیه → {summary['out_dir']} ({', '.join(summary['target_formats'])})")
    if not summary["ok"]:
        print("⚠ برخی اسلایدها خطا داشتند؛ جزئیات در build-report.txt")
        return 1
    return 0
