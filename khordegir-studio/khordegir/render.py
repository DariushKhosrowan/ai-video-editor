"""Deterministic frame-exact renderer & multi-format exporter (16:9, 9:16, 1:1).

Phase 5 Items 17–18 upgrades:
- Output formats: MP4 (libx264), transparent WebM (VP9 yuva420p), ProRes 4444 (yuva444p10le), PNG sequence.
- Deterministic SRT captions burn-in (Stage RTL overlay or ffmpeg subtitles filter).
- 30 fps & 60 fps support + deterministic static-frame render cache.
- Render farm-friendly CLI slicing: `--slide`, `--start-frame`, `--end-frame`, `--shard K/N`, `--manifest`.
"""

from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

from .outputs import export_obs_bundle
from .project import PKG_DIR, load_project, resolve_format_size
from .srt import build_ffmpeg_srt_filter, load_srt_file

SUPPORTED_OUTPUT_FORMATS = ("mp4", "webm", "prores", "png-seq")


def parse_shard_spec(shard: Optional[str]) -> Optional[Tuple[int, int]]:
    """Parse a 1-based render-farm shard string like '2/4' into (index, total)."""
    if not shard:
        return None
    raw = str(shard).strip()
    if "/" not in raw:
        raise ValueError(f"Invalid shard spec '{raw}'; expected K/N (e.g. 1/4)")
    k_str, n_str = raw.split("/", 1)
    k = int(k_str.strip())
    n = int(n_str.strip())
    if n < 1 or k < 1 or k > n:
        raise ValueError(f"Invalid shard bounds '{raw}'; require 1 <= K <= N")
    return (k, n)


def compute_frame_range(
    total_frames: int,
    *,
    start_frame: Optional[int] = None,
    end_frame: Optional[int] = None,
    shard: Optional[Tuple[int, int]] = None,
) -> Tuple[int, int]:
    """Deterministically compute inclusive-start, exclusive-end frame slice [lo, hi)."""
    total = max(1, int(total_frames))
    lo = max(0, int(start_frame)) if start_frame is not None else 0
    hi = min(total, int(end_frame)) if end_frame is not None else total
    if hi < lo:
        hi = lo
    if shard is not None and hi > lo:
        k, n = shard
        span = hi - lo
        base = span // n
        rem = span % n
        s_lo = lo + (k - 1) * base + min(k - 1, rem)
        s_hi = s_lo + base + (1 if k <= rem else 0)
        return (s_lo, s_hi)
    return (lo, hi)


class FrameRenderCache:
    """Deterministic in-memory frame cache keyed by stage state signature hash.

    When animations settle and the stage state hash is identical across consecutive or repeated
    frames, avoids redundant Playwright screenshot captures while emitting byte-identical PNGs.
    """

    def __init__(self, enabled: bool = True, max_entries: int = 240) -> None:
        self.enabled = bool(enabled)
        self.max_entries = max(1, int(max_entries))
        self._store: Dict[str, bytes] = {}
        self._order: List[str] = []
        self.hits = 0
        self.misses = 0

    @staticmethod
    def hash_signature(sig: Any) -> str:
        payload = json.dumps(sig, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        return hashlib.sha256(payload).hexdigest()

    def get(self, key: str) -> Optional[bytes]:
        if not self.enabled:
            self.misses += 1
            return None
        val = self._store.get(key)
        if val is not None:
            self.hits += 1
            return val
        self.misses += 1
        return None

    def put(self, key: str, data: bytes) -> None:
        if not self.enabled:
            return
        if key not in self._store:
            if len(self._order) >= self.max_entries:
                evict = self._order.pop(0)
                self._store.pop(evict, None)
            self._order.append(key)
        self._store[key] = data

    def stats(self) -> Dict[str, Any]:
        total = self.hits + self.misses
        return {
            "enabled": self.enabled,
            "entries": len(self._store),
            "hits": self.hits,
            "misses": self.misses,
            "hitRate": round(self.hits / total, 4) if total else 0.0,
        }


def build_ffmpeg_command(
    ffmpeg_bin: str,
    output_path: Path,
    *,
    fps: int = 30,
    output_format: str = "mp4",
    transparent: bool = False,
    audio_path: Optional[str | Path] = None,
    srt_burnin_path: Optional[str | Path] = None,
) -> List[str]:
    """Construct a deterministic ffmpeg CLI invocation for MP4, transparent WebM, or ProRes 4444."""
    fmt = str(output_format or "mp4").strip().lower()
    if fmt not in ("mp4", "webm", "prores"):
        raise ValueError(f"Unsupported ffmpeg output_format '{fmt}'")

    cmd: List[str] = [
        str(ffmpeg_bin), "-y",
        "-f", "image2pipe", "-vcodec", "png", "-r", str(int(fps)), "-i", "pipe:0",
    ]
    has_audio = bool(audio_path and Path(audio_path).is_file())
    if has_audio:
        cmd += ["-i", str(audio_path)]

    if srt_burnin_path and Path(srt_burnin_path).is_file():
        cmd += ["-vf", build_ffmpeg_srt_filter(srt_burnin_path)]

    if fmt == "webm":
        pix_fmt = "yuva420p" if transparent else "yuv420p"
        cmd += [
            "-c:v", "libvpx-vp9",
            "-pix_fmt", pix_fmt,
            "-auto-alt-ref", "0",
            "-b:v", "0",
            "-crf", "26",
            "-deadline", "good",
            "-cpu-used", "2",
        ]
        if has_audio:
            cmd += ["-c:a", "libopus", "-b:a", "160k", "-shortest"]
    elif fmt == "prores":
        pix_fmt = "yuva444p10le" if transparent else "yuv422p10le"
        profile = "4444" if transparent else "3"
        cmd += [
            "-c:v", "prores_ks",
            "-profile:v", profile,
            "-pix_fmt", pix_fmt,
        ]
        if has_audio:
            cmd += ["-c:a", "pcm_s16le", "-shortest"]
    else:
        cmd += [
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-crf", "18",
            "-movflags", "+faststart",
        ]
        if has_audio:
            cmd += ["-c:a", "aac", "-b:a", "192k", "-shortest"]

    cmd.append(str(output_path))
    return cmd


def plan_render_jobs(
    project: Dict[str, Any],
    formats: Optional[Sequence[str]] = None,
    fps: int = 30,
    *,
    output_format: str = "mp4",
    transparent: bool = False,
    srt_path: Optional[str | Path] = None,
    captions_mode: str = "stage",
    slide_filter: Optional[Sequence[int]] = None,
    start_frame: Optional[int] = None,
    end_frame: Optional[int] = None,
    shard: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Build deterministic multi-format render job specifications for a loaded project."""
    out_fmt = str(output_format or "mp4").strip().lower()
    if out_fmt not in SUPPORTED_OUTPUT_FORMATS:
        raise ValueError(f"Unsupported output_format '{out_fmt}'; choose from {SUPPORTED_OUTPUT_FORMATS}")
    shard_tuple = parse_shard_spec(shard)
    allowed_slides = set(int(x) for x in slide_filter) if slide_filter else None

    ext_map = {"mp4": ".mp4", "webm": ".webm", "prores": ".mov", "png-seq": ""}
    ext = ext_map[out_fmt]
    req_formats = list(formats) if formats else [project.get("format") or "16:9"]
    jobs: List[Dict[str, Any]] = []

    for fmt in req_formats:
        slug = fmt.replace(":", "x")
        for idx, slide in enumerate(project.get("slides", []), start=1):
            if str(slide.get("layout", "SLIDE")).upper() == "CAM":
                continue
            if allowed_slides is not None and idx not in allowed_slides:
                continue
            slide_fmt = fmt if formats else (slide.get("format") or fmt)
            sw, sh = resolve_format_size(slide_fmt)
            eff_fps = int(fps or slide.get("fps") or 30)
            est_dur = float(slide.get("duration") or 6.0)
            est_total = max(1, int(round(est_dur * eff_fps)))
            f_lo, f_hi = compute_frame_range(est_total, start_frame=start_frame, end_frame=end_frame, shard=shard_tuple)

            slide_trans = bool(
                transparent
                or slide.get("transparent")
                or ((slide.get("puppet") or {}).get("scene") or {}).get("background") == "transparent"
            )
            eff_srt = str(Path(srt_path).resolve()) if srt_path else slide.get("_srt_path")

            shard_tag = f"-s{shard_tuple[0]}of{shard_tuple[1]}" if shard_tuple else ""
            base_stem = f"slide-{idx:02d}-{slug}{shard_tag}" if len(req_formats) > 1 else f"slide-{idx:02d}{shard_tag}"
            output_name = f"{base_stem}-frames" if out_fmt == "png-seq" else f"{base_stem}{ext}"

            jobs.append({
                "index": idx,
                "format": slide_fmt,
                "format_slug": slide_fmt.replace(":", "x"),
                "width": sw,
                "height": sh,
                "fps": eff_fps,
                "output_format": out_fmt,
                "transparent": slide_trans,
                "captions_mode": str(captions_mode or "stage").strip().lower(),
                "srt_path": eff_srt,
                "start_frame": f_lo,
                "end_frame": f_hi,
                "estimated_frames": est_total,
                "shard": shard,
                "slide": slide,
                "audio_path": slide.get("_audio_path"),
                "output_name": output_name,
                "still_name": f"{base_stem}.png",
            })
    return jobs


def _prepare_stage_slide(
    slide: Dict[str, Any],
    fmt: str,
    *,
    fps: int = 30,
    transparent: bool = False,
    srt_path: Optional[str] = None,
    captions_mode: str = "stage",
) -> Dict[str, Any]:
    s = json.loads(json.dumps(slide))
    s["format"] = fmt
    s["fps"] = int(fps)
    if transparent:
        s["transparent"] = True
    if srt_path and Path(srt_path).is_file():
        if captions_mode == "stage":
            s["captions"] = load_srt_file(srt_path)
        elif captions_mode == "ffmpeg":
            # Avoid double-burning captions when ffmpeg subtitles filter is active
            s.pop("captions", None)
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
    output_format: str = "mp4",
    transparent: bool = False,
    srt_path: Optional[str | Path] = None,
    captions_mode: str = "stage",
    slide_filter: Optional[Sequence[int]] = None,
    start_frame: Optional[int] = None,
    end_frame: Optional[int] = None,
    shard: Optional[str] = None,
    frame_cache: bool = True,
    manifest_path: Optional[str | Path] = None,
) -> Dict[str, Any]:
    """Render non-CAM slides to MP4, transparent WebM, ProRes 4444, or PNG sequence."""
    proj = load_project(project_dir, auto_lipsync=True, fps=fps)
    pdir = Path(proj["dir"])
    target_out = Path(out_dir) if out_dir else (pdir / "out")
    target_out.mkdir(parents=True, exist_ok=True)

    obs_files = export_obs_bundle(proj, target_out)
    jobs = plan_render_jobs(
        proj,
        formats=formats,
        fps=fps,
        output_format=output_format,
        transparent=transparent,
        srt_path=srt_path,
        captions_mode=captions_mode,
        slide_filter=slide_filter,
        start_frame=start_frame,
        end_frame=end_frame,
        shard=shard,
    )

    manifest_summary = {
        "project": proj["name"],
        "out_dir": str(target_out),
        "fps": int(fps),
        "output_format": output_format,
        "transparent": bool(transparent),
        "shard": shard,
        "jobs": [
            {
                "index": j["index"],
                "format": j["format"],
                "width": j["width"],
                "height": j["height"],
                "fps": j["fps"],
                "output_format": j["output_format"],
                "transparent": j["transparent"],
                "srt_path": j["srt_path"],
                "start_frame": j["start_frame"],
                "end_frame": j["end_frame"],
                "output_name": j["output_name"],
            }
            for j in jobs
        ],
    }
    if manifest_path:
        mp = Path(manifest_path)
        mp.parent.mkdir(parents=True, exist_ok=True)
        mp.write_text(json.dumps(manifest_summary, ensure_ascii=False, indent=2), encoding="utf-8")

    if dry_run:
        return {
            "project": proj["name"],
            "out_dir": str(target_out),
            "obs": obs_files,
            "jobs": jobs,
            "rendered": [],
            "manifest": manifest_summary,
        }

    try:
        from playwright.sync_api import sync_playwright  # type: ignore
    except ImportError as exc:
        raise RuntimeError(
            "Playwright is required to render video frames (pip install playwright && python3 -m playwright install chromium). "
            "Use --dry-run to inspect the render plan without Chromium."
        ) from exc

    ffmpeg_bin = shutil.which("ffmpeg")
    if output_format != "png-seq" and not ffmpeg_bin:
        raise RuntimeError("ffmpeg binary not found in PATH")

    stage_uri = (PKG_DIR / "stage" / "stage.html").as_uri()
    rendered: List[str] = []
    cache = FrameRenderCache(enabled=frame_cache)
    shard_tuple = parse_shard_spec(shard)

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        try:
            for job in jobs:
                w, h = job["width"], job["height"]
                job_fps = int(job["fps"])
                page = browser.new_page(viewport={"width": w, "height": h})
                page.goto(f"{stage_uri}?format={job['format']}", wait_until="load")
                payload = _prepare_stage_slide(
                    job["slide"],
                    job["format"],
                    fps=job_fps,
                    transparent=job["transparent"],
                    srt_path=job.get("srt_path"),
                    captions_mode=job.get("captions_mode", "stage"),
                )
                info = page.evaluate(
                    "async ([slide, theme, fmt, fpsVal, trans]) => await Stage.load(slide, { theme, format: fmt, fps: fpsVal, transparent: trans })",
                    [payload, proj["theme"], job["format"], job_fps, job["transparent"]],
                )
                total_frames = max(1, int(info.get("frames") or round((info.get("duration") or 6) * job_fps)))
                f_lo, f_hi = compute_frame_range(
                    total_frames,
                    start_frame=start_frame,
                    end_frame=end_frame,
                    shard=shard_tuple,
                )
                still_path = target_out / job["still_name"]

                if job["output_format"] == "png-seq":
                    seq_dir = target_out / job["output_name"]
                    seq_dir.mkdir(parents=True, exist_ok=True)
                    last_png: Optional[bytes] = None
                    for f_idx in range(f_lo, f_hi):
                        t_sec = f_idx / float(job_fps)
                        sig = page.evaluate(
                            "t => { Stage.seek(t); return { m: Stage.getMascotState ? Stage.getMascotState() : null, s: Stage._shotState || null, c: Stage._captionEl ? Stage._captionEl.textContent : '', tl: Stage.tl ? +(Stage.tl.progress().toFixed(4)) : 0, amb: +(t.toFixed(4)) }; }",
                            t_sec,
                        )
                        sig_key = cache.hash_signature([job["index"], job["format"], sig])
                        png_bytes = cache.get(sig_key)
                        if png_bytes is None:
                            png_bytes = page.screenshot(type="png", omit_background=job["transparent"])
                            cache.put(sig_key, png_bytes)
                        (seq_dir / f"frame_{f_idx:05d}.png").write_bytes(png_bytes)
                        last_png = png_bytes
                    if last_png is not None:
                        still_path.write_bytes(last_png)
                    rendered.append(str(seq_dir))
                else:
                    out_path = target_out / job["output_name"]
                    srt_for_ff = job.get("srt_path") if job.get("captions_mode") == "ffmpeg" else None
                    assert ffmpeg_bin is not None
                    ff_cmd = build_ffmpeg_command(
                        ffmpeg_bin,
                        out_path,
                        fps=job_fps,
                        output_format=job["output_format"],
                        transparent=job["transparent"],
                        audio_path=job.get("audio_path"),
                        srt_burnin_path=srt_for_ff,
                    )
                    ff = subprocess.Popen(ff_cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
                    assert ff.stdin is not None
                    last_png = None
                    for f_idx in range(f_lo, f_hi):
                        t_sec = f_idx / float(job_fps)
                        sig = page.evaluate(
                            "t => { Stage.seek(t); return { m: Stage.getMascotState ? Stage.getMascotState() : null, s: Stage._shotState || null, c: Stage._captionEl ? Stage._captionEl.textContent : '', tl: Stage.tl ? +(Stage.tl.progress().toFixed(4)) : 0, amb: +(t.toFixed(4)) }; }",
                            t_sec,
                        )
                        sig_key = cache.hash_signature([job["index"], job["format"], sig])
                        png_bytes = cache.get(sig_key)
                        if png_bytes is None:
                            png_bytes = page.screenshot(type="png", omit_background=job["transparent"])
                            cache.put(sig_key, png_bytes)
                        ff.stdin.write(png_bytes)
                        last_png = png_bytes
                    if last_png is not None:
                        still_path.write_bytes(last_png)
                    ff.stdin.close()
                    rc = ff.wait()
                    if rc != 0:
                        err = ff.stderr.read().decode("utf-8", errors="replace") if ff.stderr else ""
                        raise RuntimeError(f"ffmpeg failed rendering {out_path.name}: {err}")
                    rendered.append(str(out_path))
                page.close()
        finally:
            browser.close()

    return {
        "project": proj["name"],
        "out_dir": str(target_out),
        "obs": obs_files,
        "jobs": jobs,
        "rendered": rendered,
        "cache": cache.stats(),
        "manifest": manifest_summary,
    }
