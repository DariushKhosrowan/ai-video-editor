"""Tests for khordegir.server and editor CLI wiring."""
from __future__ import annotations

import json
import sys
import threading
import urllib.error
import urllib.request
_OPENER = urllib.request.build_opener(urllib.request.ProxyHandler({}))
from pathlib import Path
from unittest.mock import patch

import pytest
import yaml

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from khordegir import cli
from khordegir.server import create_server


def _request(url: str, method: str = "GET", data: bytes | None = None, headers: dict[str, str] | None = None):
    req = urllib.request.Request(url, data=data, method=method, headers=headers or {})
    try:
        with _OPENER.open(req, timeout=5) as resp:
            return resp.status, dict(resp.headers.items()), resp.read()
    except urllib.error.HTTPError as exc:
        try:
            return exc.code, dict(exc.headers.items()), exc.read()
        finally:
            exc.close()


@pytest.fixture()
def server_ctx(tmp_path: Path):
    videos_dir = tmp_path / "videos"
    videos_dir.mkdir()

    pkg_dir = tmp_path / "pkg"
    (pkg_dir / "starter").mkdir(parents=True)
    (pkg_dir / "starter" / "video.yaml").write_text(
        "title: ویدیوی آزمایشی\ntheme: editorial-dark\nslides:\n  - template: title_card\n    title: سلام\n",
        encoding="utf-8",
    )
    for sub in ("editor", "stage", "templates", "themes", "vendor", "fonts"):
        (pkg_dir / sub).mkdir(parents=True)
    (pkg_dir / "editor" / "index.html").write_text("<!doctype html><html><body>Editor</body></html>", encoding="utf-8")
    (pkg_dir / "stage" / "stage.html").write_text("<!doctype html><html><body>Stage</body></html>", encoding="utf-8")
    (pkg_dir / "stage" / "core.js").write_text("window.Stage = {};", encoding="utf-8")
    (pkg_dir / "templates" / "_index.js").write_text("window.TEMPLATE_INDEX = [];", encoding="utf-8")
    (pkg_dir / "themes" / "default.js").write_text("window.THEME = {};", encoding="utf-8")
    (pkg_dir / "vendor" / "gsap.min.js").write_text("// gsap", encoding="utf-8")
    (pkg_dir / "fonts" / "Vazirmatn.woff2").write_bytes(b"wOF2dummy")
    (tmp_path / "outside_secret.txt").write_text("TOP_SECRET", encoding="utf-8")

    httpd = create_server(videos_dir, port=0, pkg_root=pkg_dir)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    host, port = httpd.server_address
    assert host == "127.0.0.1"
    base_url = f"http://{host}:{port}"
    try:
        yield {
            "base_url": base_url,
            "videos_dir": videos_dir,
            "pkg_dir": pkg_dir,
            "tmp_path": tmp_path,
        }
    finally:
        httpd.shutdown()
        httpd.server_close()
        thread.join(timeout=2)


def test_health(server_ctx):
    status, headers, body = _request(f"{server_ctx['base_url']}/api/health")
    assert status == 200
    assert "application/json" in headers.get("Content-Type", "")
    assert json.loads(body.decode("utf-8")) == {"ok": True}


def test_static_dirs_and_mime_types(server_ctx):
    base = server_ctx["base_url"]
    cases = [
        ("/editor/", "text/html", b"Editor"),
        ("/stage/stage.html", "text/html", b"Stage"),
        ("/stage/core.js", "application/javascript", b"window.Stage"),
        ("/templates/_index.js", "application/javascript", b"TEMPLATE_INDEX"),
        ("/themes/default.js", "application/javascript", b"window.THEME"),
        ("/vendor/gsap.min.js", "application/javascript", b"// gsap"),
        ("/fonts/Vazirmatn.woff2", "font/woff2", b"wOF2dummy"),
    ]
    for path, expected_mime, expected_sub in cases:
        status, headers, body = _request(f"{base}{path}")
        assert status == 200, f"failed for {path}"
        assert expected_mime in headers.get("Content-Type", ""), f"wrong mime for {path}: {headers}"
        assert expected_sub in body


def test_create_list_and_get_project(server_ctx):
    base = server_ctx["base_url"]
    videos_dir = server_ctx["videos_dir"]

    status, _, body = _request(f"{base}/api/projects")
    assert status == 200
    assert json.loads(body.decode("utf-8")) == {"projects": []}

    status, _, body = _request(
        f"{base}/api/projects",
        method="POST",
        data=json.dumps({"name": "my-video"}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    assert status == 201
    created = json.loads(body.decode("utf-8"))
    assert created["ok"] is True
    assert created["name"] == "my-video"
    assert (videos_dir / "my-video" / "video.yaml").is_file()
    assert (videos_dir / "my-video" / "img").is_dir()

    # Duplicate creation is rejected
    status, _, _ = _request(
        f"{base}/api/projects",
        method="POST",
        data=json.dumps({"name": "my-video"}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    assert status == 409

    status, _, body = _request(f"{base}/api/projects")
    assert status == 200
    projects = json.loads(body.decode("utf-8"))["projects"]
    assert len(projects) == 1
    assert projects[0]["name"] == "my-video"
    assert projects[0]["slides_count"] == 1

    status, _, body = _request(f"{base}/api/projects/my-video")
    assert status == 200
    proj = json.loads(body.decode("utf-8"))
    assert proj["name"] == "my-video"
    assert proj["data"]["slides"][0]["template"] == "title_card"


def test_invalid_put_returns_400_and_leaves_file_untouched(server_ctx):
    base = server_ctx["base_url"]
    videos_dir = server_ctx["videos_dir"]

    status, _, _ = _request(
        f"{base}/api/projects",
        method="POST",
        data=json.dumps({"name": "demo"}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    assert status == 201

    yaml_file = videos_dir / "demo" / "video.yaml"
    original_bytes = yaml_file.read_bytes()

    invalid_payloads = [
        (b"title: broken\nslides: [unclosed", {}),
        (b"just a string", {}),
        (b"title: no slides key here\n", {}),
        (b"title: slides not list\nslides: nope\n", {}),
        (json.dumps({"yaml": "slides: 'not-a-list'"}).encode("utf-8"), {"Content-Type": "application/json"}),
        (b"{bad json", {"Content-Type": "application/json"}),
    ]
    for payload, hdrs in invalid_payloads:
        status, _, _ = _request(f"{base}/api/projects/demo", method="PUT", data=payload, headers=hdrs)
        assert status == 400
        assert yaml_file.read_bytes() == original_bytes


def test_valid_put_persists(server_ctx):
    base = server_ctx["base_url"]
    videos_dir = server_ctx["videos_dir"]

    status, _, _ = _request(
        f"{base}/api/projects",
        method="POST",
        data=json.dumps({"name": "demo"}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    assert status == 201

    new_yaml = (
        "title: ویدیوی جدید من\n"
        "theme: editorial-dark\n"
        "slides:\n"
        "  - template: title_card\n"
        "    title: شروع\n"
        "  - template: big_number\n"
        "    number: \"۴۲\"\n"
    )
    status, _, body = _request(
        f"{base}/api/projects/demo",
        method="PUT",
        data=new_yaml.encode("utf-8"),
        headers={"Content-Type": "text/yaml; charset=utf-8"},
    )
    assert status == 200
    resp = json.loads(body.decode("utf-8"))
    assert resp["ok"] is True
    assert len(resp["data"]["slides"]) == 2
    assert (videos_dir / "demo" / "video.yaml").read_text(encoding="utf-8") == new_yaml

    status, _, get_body = _request(f"{base}/api/projects/demo")
    assert status == 200
    loaded = yaml.safe_load(json.loads(get_body.decode("utf-8"))["yaml"])
    assert loaded["title"] == "ویدیوی جدید من"
    assert loaded["slides"][1]["number"] == "۴۲"


def test_image_upload_and_serve(server_ctx):
    base = server_ctx["base_url"]
    videos_dir = server_ctx["videos_dir"]

    status, _, _ = _request(
        f"{base}/api/projects",
        method="POST",
        data=json.dumps({"name": "demo"}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    assert status == 201

    png_bytes = b"\x89PNG\r\n\x1a\nfake-png-content"
    status, _, body = _request(
        f"{base}/api/projects/demo/images?filename=my%20photo%20(1).png",
        method="POST",
        data=png_bytes,
        headers={"Content-Type": "image/png"},
    )
    assert status == 201
    uploaded = json.loads(body.decode("utf-8"))
    assert uploaded["ok"] is True
    filename = uploaded["filename"]
    assert "/" not in filename and ".." not in filename and " " not in filename
    assert filename.endswith(".png")
    assert (videos_dir / "demo" / "img" / filename).read_bytes() == png_bytes

    # Served from /projects/<name>/img/<file>
    status, headers, served = _request(f"{base}{uploaded['url']}")
    assert status == 200
    assert "image/png" in headers.get("Content-Type", "")
    assert served == png_bytes

    # Unsupported extension rejected
    status, _, _ = _request(
        f"{base}/api/projects/demo/images?filename=evil.html",
        method="POST",
        data=b"<script>alert(1)</script>",
    )
    assert status == 400


def test_path_traversal_blocked(server_ctx):
    base = server_ctx["base_url"]
    tmp_path = server_ctx["tmp_path"]

    status, _, _ = _request(
        f"{base}/api/projects",
        method="POST",
        data=json.dumps({"name": "demo"}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    assert status == 201

    traversal_urls = [
        "/templates/../../outside_secret.txt",
        "/templates/%2e%2e/%2e%2e/outside_secret.txt",
        "/editor/..%5c..%5coutside_secret.txt",
        "/projects/demo/img/../video.yaml",
        "/projects/demo/img/%2e%2e/video.yaml",
        "/api/projects/%2e%2e",
    ]
    for path in traversal_urls:
        status, _, body = _request(f"{base}{path}")
        assert status in (400, 403, 404), f"unexpected {status} for {path}"
        assert b"TOP_SECRET" not in body

    # Traversal on project create
    status, _, _ = _request(
        f"{base}/api/projects",
        method="POST",
        data=json.dumps({"name": "../escaped"}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    assert status in (400, 403)
    assert not (tmp_path / "escaped").exists()

    # Traversal on image upload
    status, _, _ = _request(
        f"{base}/api/projects/demo/images?filename=../../outside.png",
        method="POST",
        data=b"\x89PNG\r\n\x1a\n",
    )
    assert status in (400, 403)
    assert not (tmp_path / "outside.png").exists()


def test_cli_editor_invokes_server_serve(tmp_path: Path):
    videos_arg = str(tmp_path / "my_videos")
    with patch("khordegir.index.build_index") as mock_idx, patch("khordegir.server.serve") as mock_serve:
        rc = cli.main(["editor", "--port", "9090", "--no-browser", "--videos", videos_arg])
    assert rc == 0
    mock_idx.assert_called_once()
    mock_serve.assert_called_once()
    args, kwargs = mock_serve.call_args
    assert Path(args[0]) == Path(videos_arg)
    assert kwargs["port"] == 9090
    assert kwargs["open_browser"] is False
