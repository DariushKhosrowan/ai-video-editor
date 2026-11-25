"""Tests for khordegir/server.py (ROADMAP-LOOP tasks 1-2). Generated with Gemini in AI Studio, condensed by Hark."""
import json
import sys
import threading
import urllib.error
import urllib.request
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from khordegir.server import create_server  # noqa: E402


_OPENER = urllib.request.build_opener(urllib.request.ProxyHandler({}))  # never route localhost via a proxy


def _req(url, method="GET", data=None, headers=None):
    r = urllib.request.Request(url, data=data, method=method, headers=headers or {})
    try:
        with _OPENER.open(r, timeout=10) as resp:
            return resp.status, dict(resp.headers), resp.read()
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read()


@pytest.fixture
def srv(tmp_path):
    httpd = create_server(tmp_path / "videos", port=0)
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    yield f"http://127.0.0.1:{httpd.server_address[1]}", tmp_path / "videos"
    httpd.shutdown()
    httpd.server_close()


def _create(base, name="demo"):
    return _req(f"{base}/api/projects", "POST", json.dumps({"name": name}).encode(),
                {"Content-Type": "application/json"})


def test_health_and_static(srv):
    base, _ = srv
    s, _, b = _req(f"{base}/api/health")
    assert s == 200 and json.loads(b)["ok"] is True
    assert _req(f"{base}/editor/")[0] == 200
    s, h, _ = _req(f"{base}/stage/stage.html")
    assert s == 200 and "text/html" in h.get("Content-Type", "")


def test_create_list_get(srv):
    base, videos = srv
    assert _create(base)[0] in (200, 201)
    assert (videos / "demo" / "video.yaml").is_file()
    s, _, b = _req(f"{base}/api/projects")
    assert s == 200 and "demo" in b.decode()
    s, _, b = _req(f"{base}/api/projects/demo")
    assert s == 200 and b"slides" in b
    assert _create(base)[0] == 409 or _create(base)[0] >= 400


def test_put_invalid_keeps_file(srv):
    base, videos = srv
    _create(base)
    f = videos / "demo" / "video.yaml"
    before = f.read_bytes()
    for bad in (b"slides: [unclosed", b"title: no slides here\n", b"- just\n- a list\n"):
        s, _, _ = _req(f"{base}/api/projects/demo", "PUT", bad, {"Content-Type": "text/yaml"})
        assert s == 400
        assert f.read_bytes() == before


def test_put_valid_persists(srv):
    base, videos = srv
    _create(base)
    new = "title: آزمون\nslides:\n  - template: title_card\n    title: سلام\n".encode()
    s, _, _ = _req(f"{base}/api/projects/demo", "PUT", new, {"Content-Type": "text/yaml"})
    assert s == 200
    assert "سلام" in (videos / "demo" / "video.yaml").read_text(encoding="utf-8")


def test_image_upload_and_serve(srv):
    base, videos = srv
    _create(base)
    png = b"\x89PNG\r\n\x1a\n" + b"0" * 64
    s, _, _ = _req(f"{base}/api/projects/demo/images?filename=../x.png", "POST", png,
                   {"Content-Type": "image/png"})
    assert s in (400, 403)
    s, _, b = _req(f"{base}/api/projects/demo/images?filename=my%20pic.png", "POST", png,
                   {"Content-Type": "image/png"})
    assert s in (200, 201)
    saved = list((videos / "demo" / "img").iterdir())
    assert len(saved) == 1 and saved[0].read_bytes() == png
    assert ".." not in saved[0].name and "/" not in saved[0].name
    s, _, served = _req(f"{base}/projects/demo/img/{saved[0].name}")
    assert s == 200 and served == png
    s, _, _ = _req(f"{base}/api/projects/demo/images?filename=evil.html", "POST", b"<script>",
                   {"Content-Type": "text/html"})
    assert s == 400


@pytest.mark.parametrize("path", ["/stage/../cli.py", "/stage/%2e%2e/cli.py", "/editor/..%2f..%2fsetup.py",
                                  "/api/projects/..%2f..", "/projects/../../etc/passwd"])
def test_traversal_blocked(srv, path):
    base, _ = srv
    s, _, b = _req(base + path)
    assert s in (400, 403, 404)
    assert b"def " not in b
