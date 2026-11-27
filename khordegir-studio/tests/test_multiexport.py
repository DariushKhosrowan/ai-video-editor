"""Tests for Khordegir Studio multi-format export (khordegir/multiexport.py)."""
from __future__ import annotations

import json
import shutil
import struct
import subprocess
import sys
import types
import zlib
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from khordegir import cli, multiexport
from khordegir.project import Project
from khordegir.multiexport import VALID_FORMATS, validate_format


SAMPLE_YAML = """title: پروژهٔ تست چندفرمته
theme: plain
format: landscape
captions:
  - text: سلام! این یک تست برای زیرنویس در سه فرمت است.
    start: 0.0
    end: 2.5
slides:
  - template: title_card
    act: 1
    title: تیتر اول
    subtitle: زیرعنوان کوتاه
    say: سلام و خوش آمدید.
  - template: cam
    act: 2
    say: صحبت مستقیم با دوربین.
  - template: big_number
    act: 2
    number: "۸۴٪"
    caption: رشد تولید
    say: این بخش عدد بزرگ است.
"""


def _make_solid_png(width: int, height: int, rgb: tuple[int, int, int] = (24, 36, 48)) -> bytes:
    """Create a minimal valid RGB PNG in pure stdlib (no Pillow required)."""
    def chunk(tag: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    row = b"\x00" + bytes(rgb) * width
    raw = row * height
    compressed = zlib.compress(raw, level=1)
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", compressed)
        + chunk(b"IEND", b"")
    )


def _png_dimensions(path: Path) -> tuple[int, int]:
    data = path.read_bytes()
    assert data[:8] == b"\x89PNG\r\n\x1a\n"
    w, h = struct.unpack(">II", data[16:24])
    return w, h


def _install_fake_playwright(monkeypatch, *, duration: float = 0.2):
    """Install a deterministic fake playwright.sync_api producing exact-size PNGs."""
    events: list[dict] = []

    class FakePage:
        def __init__(self, viewport):
            self.viewport = dict(viewport or {"width": 1920, "height": 1080})
            self.format = "landscape"
            self.closed = False

        def on(self, *_args, **_kwargs):
            pass

        def goto(self, url):
            events.append({"op": "goto", "url": url})

        def wait_for_function(self, expr):
            events.append({"op": "wait_for_function"})

        def set_viewport_size(self, vp):
            self.viewport = dict(vp)
            events.append({"op": "set_viewport_size", "viewport": dict(vp)})

        def evaluate(self, script, arg=None):
            if isinstance(arg, list) and len(arg) == 3 and arg[2] in VALID_FORMATS:
                self.viewport = {"width": arg[0], "height": arg[1]}
                self.format = arg[2]
                return None
            if isinstance(arg, dict) and "template" in arg:
                fmt = arg.get("format") or self.format
                self.format = fmt
                events.append({"op": "load", "template": arg.get("template"), "format": fmt})
                return {
                    "duration": duration,
                    "entrances": 0.1,
                    "fps": 30,
                    "frames": int(round(duration * 30)),
                    "fx": {"variant": "clean", "motion": "in"},
                    "cues": [{"t": 0.05, "type": "whoosh", "label": "title"}],
                    "format": fmt,
                }
            if "camOverlap" in script:
                return []
            return True

        def screenshot(self, path=None, clip=None, type="png", **_kw):
            w = int((clip or self.viewport)["width"])
            h = int((clip or self.viewport)["height"])
            events.append({"op": "shot", "w": w, "h": h, "type": type, "path": path})
            img = _make_solid_png(w, h)
            if path:
                Path(path).write_bytes(img)
            return img

    class FakeBrowser:
        def new_page(self, viewport=None, **_kw):
            return FakePage(viewport)

        def close(self):
            events.append({"op": "close"})

    class FakePlaywrightCtx:
        def __enter__(self):
            return types.SimpleNamespace(
                chromium=types.SimpleNamespace(launch=lambda **_kw: FakeBrowser())
            )

        def __exit__(self, *_exc):
            return False

    fake_sync_api = types.ModuleType("playwright.sync_api")
    fake_sync_api.sync_playwright = lambda: FakePlaywrightCtx()
    fake_pw = types.ModuleType("playwright")
    fake_pw.sync_api = fake_sync_api
    monkeypatch.setitem(sys.modules, "playwright", fake_pw)
    monkeypatch.setitem(sys.modules, "playwright.sync_api", fake_sync_api)
    return events


@pytest.fixture()
def sample_proj_dir(tmp_path: Path) -> Path:
    proj_dir = tmp_path / "demo-multi"
    (proj_dir / "img").mkdir(parents=True)
    (proj_dir / "video.yaml").write_text(SAMPLE_YAML, encoding="utf-8")
    return proj_dir


def test_norm_format_reuses_project_validate_format():
    assert multiexport.norm_format(None) == validate_format(None) == "landscape"
    for raw, expected in [
        ("landscape", "landscape"),
        (" Portrait ", "portrait"),
        ("SQUARE", "square"),
    ]:
        assert multiexport.norm_format(raw) == validate_format(raw) == expected

    with pytest.raises(ValueError, match="Unknown format"):
        multiexport.norm_format("ultrawide")
    with pytest.raises(TypeError, match="Wrong type for format"):
        multiexport.norm_format(1080)


def test_parse_formats_and_dimensions():
    assert multiexport.parse_formats("all") == ["landscape", "portrait", "square"]
    assert multiexport.parse_formats("ALL") == ["landscape", "portrait", "square"]
    assert multiexport.parse_formats("همه") == ["landscape", "portrait", "square"]
    assert multiexport.parse_formats("portrait, square, portrait") == ["portrait", "square"]
    assert multiexport.parse_formats("landscape،portrait") == ["landscape", "portrait"]
    assert multiexport.parse_formats(["square", "landscape"]) == ["square", "landscape"]
    assert multiexport.parse_formats(None, default_format="portrait") == ["portrait"]

    assert multiexport.format_dimensions("landscape") == (1920, 1080)
    assert multiexport.format_dimensions("portrait") == (1080, 1920)
    assert multiexport.format_dimensions("square") == (1080, 1080)

    for bad in ["", "landscape,,portrait", []]:
        with pytest.raises(ValueError):
            multiexport.parse_formats(bad)
    with pytest.raises(ValueError, match="Unknown format"):
        multiexport.parse_formats("landscape,4k")
    with pytest.raises(TypeError):
        multiexport.parse_formats(123)  # type: ignore[arg-type]


def test_advanced_options_defaults_and_validation():
    defaults = multiexport.normalize_advanced_options(None)
    assert defaults["fps"] == 30
    assert defaults["crf"] == 18
    assert defaults["preset"] == "medium"
    assert defaults["quality"] == "jpeg"
    assert defaults["jobs"] == 1
    assert defaults["no_video"] is False
    assert defaults["force"] is False

    custom = multiexport.normalize_advanced_options({"fps": 24, "crf": 20, "quality": "png", "no_video": True})
    assert custom["fps"] == 24
    assert custom["crf"] == 20
    assert custom["quality"] == "png"
    assert custom["no_video"] is True

    with pytest.raises(ValueError, match="Unknown key"):
        multiexport.normalize_advanced_options({"bad_option": 1})
    with pytest.raises(ValueError, match="advanced.crf"):
        multiexport.normalize_advanced_options({"crf": 99})
    with pytest.raises(TypeError):
        multiexport.normalize_advanced_options(["not-a-dict"])  # type: ignore[arg-type]


def test_cli_build_formats_all_renders_all_three_dimensions(
    sample_proj_dir: Path, monkeypatch
):
    ffmpeg = shutil.which("ffmpeg")
    ffprobe = shutil.which("ffprobe")
    if not ffmpeg or not ffprobe:
        pytest.skip("ffmpeg and ffprobe are required for MP4 dimension verification")

    _install_fake_playwright(monkeypatch, duration=0.15)
    yaml_before = (sample_proj_dir / "video.yaml").read_text(encoding="utf-8")

    rc = cli.main(
        [
            "build",
            str(sample_proj_dir),
            "--formats",
            "all",
            "--quality",
            "png",
            "--jobs",
            "1",
        ]
    )
    assert rc == 0

    # video.yaml remains single source of truth and is never modified
    assert (sample_proj_dir / "video.yaml").read_text(encoding="utf-8") == yaml_before

    out_root = sample_proj_dir / "out"
    manifest_path = out_root / "multiexport-manifest.json"
    assert manifest_path.is_file()
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert manifest["ok"] is True
    assert list(manifest["formats"].keys()) == ["landscape", "portrait", "square"]

    expected_dims = {
        "landscape": (1920, 1080),
        "portrait": (1080, 1920),
        "square": (1080, 1080),
    }
    for fmt, (ew, eh) in expected_dims.items():
        fmt_dir = out_root / fmt
        assert manifest["formats"][fmt]["width"] == ew
        assert manifest["formats"][fmt]["height"] == eh
        assert (fmt_dir / "steps_data.lua").is_file()
        assert (fmt_dir / "steps.json").is_file()
        assert (fmt_dir / "prompter.html").is_file()
        assert (fmt_dir / "sound_cues.json").is_file()
        assert (fmt_dir / "captions.srt").is_file()
        assert (fmt_dir / "captions.vtt").is_file()
        assert (fmt_dir / "build-report.txt").is_file()

        # Verify portrait caption layout uses portrait region width (86%)
        vtt_text = (fmt_dir / "captions.vtt").read_text(encoding="utf-8")
        if fmt == "portrait":
            assert "width:86%" in vtt_text
        elif fmt == "square":
            assert "width:84%" in vtt_text
        else:
            assert "width:80%" in vtt_text

        for slide_idx in (1, 2):
            png = fmt_dir / "slides" / f"slide-{slide_idx:02d}.png"
            mp4 = fmt_dir / "slides" / f"slide-{slide_idx:02d}.mp4"
            assert png.is_file()
            assert mp4.is_file()
            assert _png_dimensions(png) == (ew, eh)

            probe = subprocess.run(
                [
                    ffprobe,
                    "-v",
                    "error",
                    "-select_streams",
                    "v:0",
                    "-show_entries",
                    "stream=width,height",
                    "-of",
                    "json",
                    str(mp4),
                ],
                capture_output=True,
                text=True,
                check=True,
            )
            stream = json.loads(probe.stdout)["streams"][0]
            assert (stream["width"], stream["height"]) == (ew, eh)


def test_deterministic_outputs_and_incremental_cache(
    sample_proj_dir: Path, tmp_path: Path, monkeypatch
):
    events = _install_fake_playwright(monkeypatch, duration=0.1)
    out_a = tmp_path / "out_a"
    out_b = tmp_path / "out_b"

    res_a = multiexport.export_project(
        sample_proj_dir,
        formats="all",
        out_dir=out_a,
        advanced={"no_video": True, "quality": "png", "jobs": 1},
    )
    shots_after_first = len([e for e in events if e["op"] == "shot"])
    assert res_a["ok"] is True
    assert shots_after_first == 6  # 2 renderable slides x 3 formats

    # Second run on same out_a without changes should hit cache and render 0 frames
    res_cached = multiexport.export_project(
        sample_proj_dir,
        formats="all",
        out_dir=out_a,
        advanced={"no_video": True, "quality": "png", "jobs": 1},
    )
    assert res_cached["ok"] is True
    assert len([e for e in events if e["op"] == "shot"]) == shots_after_first

    # Exporting to out_b must be byte-identical for deterministic artifacts
    res_b = multiexport.export_project(
        sample_proj_dir,
        formats="all",
        out_dir=out_b,
        advanced={"no_video": True, "quality": "png", "jobs": 1},
    )
    assert res_b["ok"] is True

    for fmt in VALID_FORMATS:
        for rel in (
            "slides/slide-01.png",
            "slides/slide-02.png",
            "captions.srt",
            "captions.vtt",
            "steps_data.lua",
            "steps.json",
            "sound_cues.json",
        ):
            assert (out_a / fmt / rel).read_bytes() == (out_b / fmt / rel).read_bytes()


def test_cli_single_format_build_unchanged_without_formats_flag(
    sample_proj_dir: Path, monkeypatch
):
    from khordegir import outputs

    _install_fake_playwright(monkeypatch, duration=0.1)
    monkeypatch.setattr(outputs, "write_pdf", lambda pngs, pdf_path: pdf_path)
    rc = cli.main(["build", str(sample_proj_dir), "--no-video", "--jobs", "1"])
    assert rc == 0
    assert (sample_proj_dir / "out" / "slides" / "slide-01.png").is_file()
    assert not (sample_proj_dir / "out" / "landscape").exists()
    assert not (sample_proj_dir / "out" / "multiexport-manifest.json").exists()


def test_cli_subset_formats_and_copy_to(
    sample_proj_dir: Path, tmp_path: Path, monkeypatch
):
    _install_fake_playwright(monkeypatch, duration=0.1)
    studio_dir = tmp_path / "studio-copy"
    rc = cli.main(
        [
            "build",
            str(sample_proj_dir),
            "--formats",
            "portrait,square",
            "--no-video",
            "--jobs",
            "1",
            "--copy-to",
            str(studio_dir),
        ]
    )
    assert rc == 0
    out_root = sample_proj_dir / "out"
    assert not (out_root / "landscape").exists()
    assert (out_root / "portrait" / "slides" / "slide-01.png").is_file()
    assert (out_root / "square" / "slides" / "slide-01.png").is_file()
    assert _png_dimensions(out_root / "portrait" / "slides" / "slide-01.png") == (1080, 1920)
    assert _png_dimensions(out_root / "square" / "slides" / "slide-01.png") == (1080, 1080)

    assert (studio_dir / "portrait" / "slides" / "slide-01.png").is_file()
    assert (studio_dir / "portrait" / "steps_data.lua").is_file()
    assert (studio_dir / "portrait" / "prompter.html").is_file()
    assert (studio_dir / "square" / "slides" / "slide-01.png").is_file()


def test_cli_invalid_formats_returns_exit_code_2(sample_proj_dir: Path, capsys):
    rc = cli.main(["build", str(sample_proj_dir), "--formats", "cinema-4k", "--no-video"])
    assert rc == 2
    err = capsys.readouterr().err
    assert "Unknown format" in err


