"""Deterministic frame-exact renderer & multi-format exporter (16:9, 9:16, 1:1).

Drives Chromium headless via Playwright over `stage/stage.html` (`Stage.seek(i / fps)`)
and pipes screenshots directly into `ffmpeg` (`libx264`, `yuv420p`, optional audio muxing).
"""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

from .outputs import export_obs_bundle
from .project import PKG_DIR, load_project, resolve_format_size


def plan_render_jobs(
    project: Dict[str, Any],
    formats: Optional[Sequence[str]] = None,
    fps: int = 30,
) -> List[Dict[str, Any]]:
    """Build deterministic multi-format render job specifications for a loaded project."""
    req_formats = list(formats) if formats else [project.get("format") or "16:9"]
    jobs: List[Dict[str, Any]] = []
    for fmt in req_formats:
        w, h = resolve_format_size(fmt)
        slug = fmt.replace(":", "x")
        for idx, slide in enumerate(project.get("slides", []), start=1):
            if str(slide.get("layout", "SLIDE")).upper() == "CAM":
                continue
            slide_fmt = fmt if formats else (slide.get("format") or fmt)
            sw, sh = resolve_format_size(slide_fmt)
            jobs.append({
                "index": idx,
                "format": slide_fmt,
                "format_slug": slide_fmt.replace(":", "x"),
                "width": sw,
                "height": sh,
                "fps": int(fps),
                "slide": slide,
                "audio_path": slide.get("_audio_path"),
                "output_name": f"slide-{idx:02d}-{slug}.mp4" if len(req_formats) > 1 else f"slide-{idx:02d}.mp4",
                "still_name": f"slide-{idx:02d}-{slug}.png" if len(req_formats) > 1 else f"slide-{idx:02d}.png",
            })
    return jobs


def _prepare_stage_slide(slide: Dict[str, Any], fmt: str) -> Dict[str, Any]:
    s = json.loads(json.dumps(slide))
    s["format"] = fmt
    for img_key in ("image", "src", "bg_image"):
        path_key = f"_{img_key}_path"
        if path_key in s and s[path_key]:
            s[img_key] = Path(s[path_key]).as_uri()
        elif isinstance(s.get(img_key), str) and s[img_key].startswith("/assets/"):
            cand = PKG_DIR / "assets" / s[img_key][len("/assets/"):]
            if cand.exists():
                s[img_key] = cand.as_uri()
    return s


def render_project(
    project_dir: str | Path,
    *,
    formats: Optional[Sequence[str]] = None,
    fps: int = 30,
    out_dir: Optional[str | Path] = None,
    dry_run: bool = False,
) -> Dict[str, Any]:
    """Render all non-CAM slides to MP4 + final PNG across requested aspect formats."""
    proj = load_project(project_dir, auto_lipsync=True, fps=fps)
    pdir = Path(proj["dir"])
    target_out = Path(out_dir) if out_dir else (pdir / "out")
    target_out.mkdir(parents=True, exist_ok=True)

    obs_files = export_obs_bundle(proj, target_out)
    jobs = plan_render_jobs(proj, formats=formats, fps=fps)

    if dry_run:
        return {"project": proj["name"], "out_dir": str(target_out), "obs": obs_files, "jobs": jobs, "rendered": []}

    try:
        from playwright.sync_api import sync_playwright  # type: ignore
    except ImportError as exc:
        raise RuntimeError(
            "Playwright is required to render MP4 frames (pip install playwright && python3 -m playwright install chromium). "
            "Use --dry-run to inspect the render plan without Chromium."
        ) from exc

    ffmpeg_bin = shutil.which("ffmpeg")
    if not ffmpeg_bin:
        raise RuntimeError("ffmpeg binary not found in PATH")

    stage_uri = (PKG_DIR / "stage" / "stage.html").as_uri()
    rendered: List[str] = []

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        try:
            for job in jobs:
                w, h = job["width"], job["height"]
                page = browser.new_page(viewport={"width": w, "height": h})
                page.goto(f"{stage_uri}?format={job['format']}", wait_until="load")
                payload = _prepare_stage_slide(job["slide"], job["format"])
                info = page.evaluate(
                    "async ([slide, theme, fmt]) => await Stage.load(slide, { theme, format: fmt })",
                    [payload, proj["theme"], job["format"]],
                )
                total_frames = max(1, int(info.get("frames") or round((info.get("duration") or 6) * fps)))
                mp4_path = target_out / job["output_name"]
                still_path = target_out / job["still_name"]

                audio_path = job.get("audio_path")
                ff_cmd = [
                    ffmpeg_bin, "-y",
                    "-f", "image2pipe", "-vcodec", "png", "-r", str(fps), "-i", "pipe:0",
                ]
                if audio_path and Path(audio_path).is_file():
                    ff_cmd += ["-i", str(audio_path), "-c:a", "aac", "-b:a", "192k", "-shortest"]
                ff_cmd += [
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18",
                    "-movflags", "+faststart", str(mp4_path),
                ]
                ff = subprocess.Popen(ff_cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
                assert ff.stdin is not None
                for f_idx in range(total_frames):
                    page.evaluate("t => Stage.seek(t)", f_idx / float(fps))
                    png_bytes = page.screenshot(type="png")
                    ff.stdin.write(png_bytes)
                    if f_idx == total_frames - 1:
                        still_path.write_bytes(png_bytes)
                ff.stdin.close()
                rc = ff.wait()
                if rc != 0:
                    err = ff.stderr.read().decode("utf-8", errors="replace") if ff.stderr else ""
                    raise RuntimeError(f"ffmpeg failed rendering {mp4_path.name}: {err}")
                rendered.append(str(mp4_path))
                page.close()
        finally:
            browser.close()

    return {"project": proj["name"], "out_dir": str(target_out), "obs": obs_files, "jobs": jobs, "rendered": rendered}
