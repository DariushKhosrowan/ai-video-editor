"""Render slides with Playwright (Chromium): load stage.html, Stage.load(slide), seek each frame,
screenshot, pipe into ffmpeg -> H.264 MP4. Same stage the editor previews, so preview == output."""
import os, shutil, subprocess, sys, time
from pathlib import Path

PKG = Path(__file__).resolve().parent
STAGE = PKG / "stage" / "stage.html"
FORMATS = {"landscape": (1920, 1080), "portrait": (1080, 1920), "square": (1080, 1080)}


def size_of(slide):
    """Pixel size the stage renders this slide at (its `format`, default landscape)."""
    from .project import format_size
    return format_size((slide or {}).get("format"))
FFMPEG = shutil.which("ffmpeg") or "/usr/bin/ffmpeg"


def _need_playwright():
    try:
        from playwright.sync_api import sync_playwright  # noqa
        return sync_playwright
    except ImportError:
        raise SystemExit("خطا: Playwright نصب نیست. این دو خط را در ترمینال بزن:\n"
                         "  pip install playwright pyyaml\n  python3 -m playwright install chromium")


class Renderer:
    def __init__(self, theme=None, fps=30, quality="png"):
        self.theme, self.fps, self.quality = theme, fps, quality
        self._pw = None
        self.size = FORMATS["landscape"]

    def __enter__(self):
        sp = _need_playwright()
        self._ctx = sp()
        self._pw = self._ctx.__enter__()
        try:
            self.browser = self._pw.chromium.launch(args=["--force-color-profile=srgb", "--disable-gpu-vsync",
                                                          "--allow-file-access-from-files"])
        except Exception as e:
            raise SystemExit("خطا: مرورگر Chromium برای Playwright نصب نیست. بزن:\n  python3 -m playwright install chromium\n"
                             f"({e})")
        w, h = self.size
        self.page = self.browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
        self.page.on("console", lambda m: m.type == "error" and print("  [stage]", m.text, file=sys.stderr))
        self.page.goto(STAGE.as_uri())
        self.page.wait_for_function("document.title === 'ready' && window.Stage && Stage.theme")
        if self.theme:
            ok = self.page.evaluate("n => { if (!Stage.themes[n]) return false; Stage.useTheme(n); return true; }", self.theme)
            if not ok:
                print(f"هشدار: تم «{self.theme}» پیدا نشد؛ تم پیش‌فرض استفاده شد.", file=sys.stderr)
        return self

    def __exit__(self, *a):
        try:
            self.browser.close()
        finally:
            self._ctx.__exit__(*a)

    def set_size(self, size):
        """Resize the Playwright viewport (and so the screenshot) to (w, h)."""
        size = tuple(size)
        if size != self.size:
            self.page.set_viewport_size({"width": size[0], "height": size[1]})
            self.size = size

    def load(self, slide):
        self.set_size(size_of(slide))
        info = self.page.evaluate("s => Stage.load(s)", slide)
        if info and info.get("width") and (info["width"], info["height"]) != self.size:
            raise RuntimeError(f"stage size {info['width']}x{info['height']} != viewport {self.size}")
        return info

    def shot(self, t, path=None, jpeg=False):
        self.page.evaluate("t => Stage.seek(t)", t)
        kw = dict(type="jpeg", quality=95) if jpeg else dict(type="png")
        w, h = self.size
        return self.page.screenshot(path=path, clip={"x": 0, "y": 0, "width": w, "height": h},
                                    animations="allow", caret="hide", **kw)

    def cam_overlap(self):
        return self.page.evaluate("Stage.camOverlap()")

    def render(self, slide, mp4=None, png=None, crf=18, preset="medium", log=print):
        info = self.load(slide)
        n = int(round(info["duration"] * self.fps))
        bad = self.cam_overlap()
        if mp4:
            os.makedirs(os.path.dirname(os.path.abspath(mp4)), exist_ok=True)
            tmp = str(mp4) + ".part.mp4"
            w, h = self.size
            cmd = [FFMPEG, "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", str(self.fps), "-video_size", f"{w}x{h}",
                   "-c:v", "mjpeg" if self.quality == "jpeg" else "png", "-i", "-",
                   "-vf", ("scale=in_range=pc:out_range=tv," if self.quality == "jpeg" else "") + "format=yuv420p",
                   "-c:v", "libx264", "-preset", preset, "-crf", str(crf), "-pix_fmt", "yuv420p", "-color_range", "tv",
                   "-s", f"{w}x{h}", "-r", str(self.fps), "-movflags", "+faststart", "-an", tmp]
            p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
            t0 = time.time()
            try:
                for i in range(n):
                    p.stdin.write(self.shot(i / self.fps, jpeg=self.quality == "jpeg"))
            finally:
                p.stdin.close()
            if p.wait() != 0:
                raise RuntimeError("ffmpeg خطا داد برای " + str(mp4))
            os.replace(tmp, mp4)
            info["render_sec"] = round(time.time() - t0, 1)
        if png:
            os.makedirs(os.path.dirname(os.path.abspath(png)), exist_ok=True)
            self.shot((n - 1) / self.fps, path=str(png))
        info["frames"] = n
        info["size"] = list(self.size)
        info["cam_overlap"] = bad
        return info
