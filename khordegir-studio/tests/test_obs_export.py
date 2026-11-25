"""Tests for OBS export, Lua escaping, CLI obs command, /obs/ console, and /steps + /obs-export API."""
from __future__ import annotations

import json
import sys
import threading
import types
import urllib.error
import urllib.request
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from khordegir import cli, obs_export, outputs
from khordegir.project import Project
from khordegir.server import PKG as REAL_PKG
from khordegir.server import create_server


def _request(url: str, method: str = "GET", data: bytes | None = None, headers: dict[str, str] | None = None):
    req = urllib.request.Request(url, data=data, method=method, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status, dict(resp.headers.items()), resp.read()
    except urllib.error.HTTPError as exc:
        try:
            return exc.code, dict(exc.headers.items()), exc.read()
        finally:
            exc.close()


SAMPLE_VIDEO_YAML = """title: تست کنسول و اکسپورت OBS
theme: editorial-dark
slides:
  - template: title_card
    act: 1
    layout: SLIDE
    time: "0:00"
    say: 'سلام! امروز دربارهٔ «باج‌گیری» و مسیر C:\\obs\\test حرف می‌زنیم.'
    steps:
      - layout: SCAM
        time: "0:15"
        say: "خط اول\\nخط دوم با \\"نقل‌قول\\" و اعداد ۱۲۳"
        zoom:
          s: 1.5
          x: 0.4
          y: 0.6
  - template: cam
    act: 2
    say: جمع‌بندی مقابل دوربین بدون اسلاید.
  - template: big_number
    act: 2
    number: "۸۴٪"
    motion: out
    say: این آخرین مرحلهٔ تست است.
"""


@pytest.fixture()
def sample_project(tmp_path: Path) -> Project:
    proj_dir = tmp_path / "videos" / "persian-obs"
    (proj_dir / "img").mkdir(parents=True)
    (proj_dir / "video.yaml").write_text(SAMPLE_VIDEO_YAML, encoding="utf-8")
    return Project(proj_dir)


@pytest.fixture()
def obs_server_ctx(tmp_path: Path):
    videos_dir = tmp_path / "videos"
    proj_dir = videos_dir / "persian-obs"
    (proj_dir / "img").mkdir(parents=True)
    (proj_dir / "video.yaml").write_text(SAMPLE_VIDEO_YAML, encoding="utf-8")

    httpd = create_server(videos_dir, port=0, pkg_root=REAL_PKG)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    host, port = httpd.server_address
    base_url = f"http://{host}:{port}"
    try:
        yield {
            "base_url": base_url,
            "videos_dir": videos_dir,
            "proj_dir": proj_dir,
        }
    finally:
        httpd.shutdown()
        httpd.server_close()
        thread.join(timeout=2)


def test_lua_escaping_handles_persian_quotes_backslashes_and_newlines():
    raw = 'متن فارسی با "نقل‌قول" و مسیر C:\\hark\\v8\nسطر دوم\r\nسطر سوم'
    escaped = obs_export.escape_lua_string(raw)
    assert "متن فارسی" in escaped
    assert '\\"نقل‌قول\\"' in escaped
    assert "C:\\\\hark\\\\v8" in escaped
    assert "\n" not in escaped
    assert "\r" not in escaped
    assert escaped.count("\\n") == 2


def test_steps_count_matches_video_yaml_across_all_outputs(sample_project: Project, tmp_path: Path):
    steps = obs_export.steps_for_obs(sample_project)
    # Slide 1 has 2 steps (main + 1 sub-step), Slide 2 (cam) has 1 step, Slide 3 has 1 step => 4 steps
    assert len(steps) == 4
    assert [s["n"] for s in steps] == [1, 2, 3, 4]
    assert steps[0]["layout"] == "SLIDE" and steps[0]["slide"] == 1
    assert steps[1]["layout"] == "SCAM" and steps[1]["slide"] == 1
    assert steps[1]["zoom"] == {"s": 1.5, "x": 0.4, "y": 0.6}
    assert steps[2]["layout"] == "CAM" and steps[2]["slide"] == 0
    assert steps[3]["motion"] == "out" and steps[3]["slide"] == 2

    out_dir = tmp_path / "obs_out"
    res = obs_export.export_obs_package(sample_project, out_dir=out_dir, os_target="linux", render_png=False)
    assert res["ok"] is True
    assert res["steps_count"] == 4

    steps_lua = (out_dir / "steps_data.lua").read_text(encoding="utf-8")
    assert steps_lua.count("-- step ") == 4
    assert 'text="سلام! امروز دربارهٔ «باج‌گیری» و مسیر C:\\\\obs\\\\test حرف می‌زنیم."' in steps_lua
    assert 'zoom={s=1.5, x=0.4, y=0.6}' in steps_lua
    assert 'motion="out"' in steps_lua

    lua_v8 = (out_dir / "hark_studio_v8.lua").read_text(encoding="utf-8")
    assert "(4 steps):" in lua_v8
    assert "text_ft2_source_v2" in lua_v8
    assert "prompter/p-01.png ... p-04.png" in lua_v8

    steps_json = json.loads((out_dir / "steps.json").read_text(encoding="utf-8"))
    assert len(steps_json) == 4

    prompter_html = (out_dir / "prompter.html").read_text(encoding="utf-8")
    assert 'dir="rtl"' in prompter_html
    assert "text-align:right" in prompter_html
    assert "state.js" in prompter_html
    assert "WebSocket" not in prompter_html
    assert "window.TOTAL_HINT=" in prompter_html
    assert "باج‌گیری" in prompter_html
    assert "focus-mode" in prompter_html
    assert "focusBtn" in prompter_html
    assert "khordegir_prompter_focus_v1" in prompter_html
    assert "fitFocus" in prompter_html

    prompter_dock = (out_dir / "prompter_dock.html").read_text(encoding="utf-8")
    assert 'dir="rtl"' in prompter_dock
    assert "حالت مستقل" in prompter_dock


def test_outputs_write_steps_reuses_obs_export(sample_project: Project, tmp_path: Path):
    out_dir = tmp_path / "legacy_out"
    steps = outputs.write_steps(sample_project, out_dir)
    assert len(steps) == 4
    assert (out_dir / "steps_data.lua").is_file()
    assert (out_dir / "steps.json").is_file()
    assert (out_dir / "prompter.txt").is_file()
    assert (out_dir / "prompter.html").is_file()
    lua_txt = (out_dir / "steps_data.lua").read_text(encoding="utf-8")
    assert 'text="' in lua_txt
    assert "باج‌گیری" in lua_txt
    prompter_html = (out_dir / "prompter.html").read_text(encoding="utf-8")
    assert "WebSocket" not in prompter_html
    assert "text-align:right" in prompter_html


def test_installer_and_os_targets(sample_project: Project, tmp_path: Path):
    steps = obs_export.steps_for_obs(sample_project)

    win_lua = obs_export.generate_lua_v8(steps, os_target="windows")
    assert "text_gdiplus_v2" in win_lua

    win_name, win_script = obs_export.generate_installer_script(steps, os_target="windows")
    assert win_name == "replace_hark_v8.bat"
    assert "hark_studio_v8.lua" in win_script

    mac_name, mac_script = obs_export.generate_installer_script(steps, os_target="macos")
    assert mac_name == "replace_hark_v8.sh"
    assert "macOS (FreeType 2)" in mac_script

    # CLI obs command integration
    cli_out = tmp_path / "cli_obs"
    rc = cli.main(["obs", str(sample_project.dir), "--os", "windows", "-o", str(cli_out), "--no-png"])
    assert rc == 0
    assert (cli_out / "replace_hark_v8.bat").is_file()
    assert (cli_out / "hark_studio_v8.lua").is_file()


def test_prompter_card_html_and_playwright_png_pipeline(sample_project: Project, tmp_path: Path, monkeypatch):
    steps = obs_export.steps_for_obs(sample_project)
    card_html = obs_export.render_prompter_card_html(steps, 0)
    assert 'dir="rtl"' in card_html
    assert "width:1920px;height:1080px" in card_html
    assert "پرده ۱ · مرحله ۱ از ۴" in card_html
    assert "باج‌گیری" in card_html

    captured_htmls: list[str] = []

    class FakePage:
        def set_content(self, content: str, wait_until: str = "load"):
            captured_htmls.append(content)

        def screenshot(self, path: str, type: str = "png"):
            Path(path).write_bytes(b"\x89PNG\r\n\x1a\nFAKE_PROMPTER")

    class FakeBrowser:
        def new_page(self, viewport=None):
            assert viewport == {"width": 1920, "height": 1080}
            return FakePage()

        def close(self):
            pass

    class FakePlaywrightCtx:
        def __enter__(self):
            return types.SimpleNamespace(
                chromium=types.SimpleNamespace(launch=lambda: FakeBrowser())
            )

        def __exit__(self, exc_type, exc, tb):
            return False

    fake_sync_api = types.ModuleType("playwright.sync_api")
    fake_sync_api.sync_playwright = lambda: FakePlaywrightCtx()
    fake_playwright = types.ModuleType("playwright")
    fake_playwright.sync_api = fake_sync_api
    monkeypatch.setitem(sys.modules, "playwright", fake_playwright)
    monkeypatch.setitem(sys.modules, "playwright.sync_api", fake_sync_api)

    res = obs_export.export_obs_package(
        sample_project,
        out_dir=tmp_path / "with_png",
        os_target="linux",
        render_png=True,
    )
    assert len(res["prompter_pngs"]) == 4
    assert len(captured_htmls) == 4
    for idx in range(1, 5):
        assert (tmp_path / "with_png" / "prompter" / f"p-{idx:02d}.png").is_file()


def test_obs_console_static_and_api_endpoints(obs_server_ctx):
    base = obs_server_ctx["base_url"]
    proj_dir = obs_server_ctx["proj_dir"]

    # /obs/ static assets
    for path, expected_mime, marker in [
        ("/obs/", "text/html", "نمای کلی".encode("utf-8")),
        ("/obs/", "text/html", b"overviewPane"),
        ("/obs/", "text/html", b"fallbackBanner"),
        ("/obs/", "text/html", b"btnFocusMode"),
        ("/obs/console.css", "text/css", b".overview-pane"),
        ("/obs/console.css", "text/css", b"body.focus-mode"),
        ("/obs/obs-ws.js", "application/javascript", b"ObsWebSocketClient"),
        ("/obs/prompter.js", "application/javascript", b"TeleprompterController"),
        ("/obs/prompter.js", "application/javascript", b"toggleFocusMode"),
        ("/obs/console.js", "application/javascript", b"/api/projects/"),
        ("/obs/console.js", "application/javascript", b"fitFocusText"),
    ]:
        status, headers, body = _request(f"{base}{path}")
        assert status == 200, f"failed for {path}"
        assert expected_mime in headers.get("Content-Type", "")
        assert marker in body

    # GET /api/projects/<name>/steps
    status, headers, body = _request(f"{base}/api/projects/persian-obs/steps")
    assert status == 200
    assert "application/json" in headers.get("Content-Type", "")
    payload = json.loads(body.decode("utf-8"))
    assert payload["ok"] is True
    assert payload["name"] == "persian-obs"
    assert len(payload["steps"]) == 4
    assert payload["steps"][0]["lay"] == "اسلاید تمام‌صفحه"
    assert payload["steps"][2]["slide"] == 0

    # Missing project steps returns 404
    status, _, _ = _request(f"{base}/api/projects/does-not-exist/steps")
    assert status == 404

    # POST /api/projects/<name>/obs-export
    status, _, body = _request(
        f"{base}/api/projects/persian-obs/obs-export",
        method="POST",
        data=json.dumps({"os": "linux", "render_png": False}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    assert status == 200
    export_res = json.loads(body.decode("utf-8"))
    assert export_res["ok"] is True
    assert export_res["steps_count"] == 4
    assert (proj_dir / "out" / "obs" / "hark_studio_v8.lua").is_file()
    assert (proj_dir / "out" / "obs" / "steps_data.lua").is_file()
    assert (proj_dir / "out" / "obs" / "prompter.html").is_file()
    assert (proj_dir / "out" / "obs" / "replace_hark_v8.sh").is_file()

    # Invalid OS returns 400
    status, _, _ = _request(
        f"{base}/api/projects/persian-obs/obs-export",
        method="POST",
        data=json.dumps({"os": "amiga"}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    assert status == 400

    # Traversal out_dir returns 403
    status, _, _ = _request(
        f"{base}/api/projects/persian-obs/obs-export",
        method="POST",
        data=json.dumps({"out_dir": "../../escaped"}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    assert status == 403


def test_lua_gentle_zoom_and_motion_toggle():
    """obs-tp 8c7518c: no over-zoom (max scale 1.06), F7 motion toggle and fit-slide button."""
    import re as _re
    from khordegir.obs_export import generate_lua_v8
    steps = [{"n": 1, "act": 1, "layout": "SLIDE", "slide": 1, "time": "00:00", "text": "سلام"}]
    lua = generate_lua_v8(steps)
    scales = [float(x) for x in _re.findall(r"s = (1\.\d+)", lua)]
    assert scales and max(scales) <= 1.06
    assert '"slide_motion"' in lua and '"fit_slide"' in lua
    assert "local MOTION_ON = false" in generate_lua_v8(steps, slide_motion=False)
