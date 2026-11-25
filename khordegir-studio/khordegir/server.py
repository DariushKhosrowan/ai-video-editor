"""Local HTTP server for Khordegir Studio (Python stdlib only, bound to 127.0.0.1)."""
from __future__ import annotations

import json
import mimetypes
import os
import re
import shutil
import tempfile
import threading
import webbrowser
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, quote, unquote, urlsplit

try:
    import yaml
except ImportError:  # pragma: no cover
    raise SystemExit("خطا: کتابخانه‌ی pyyaml نصب نیست. بزن:  pip install pyyaml")

from . import obs_export
from .project import Project

PKG = Path(__file__).resolve().parent
STATIC_DIRS = ("editor", "stage", "templates", "themes", "vendor", "fonts")
STATIC_ALIASES = {"obs": "obs_console"}
YAML_CANDIDATES = ("video.yaml", "video.yml", "project.yaml", "project.json")
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif"}

MAX_JSON_BYTES = 1 * 1024 * 1024
MAX_YAML_BYTES = 5 * 1024 * 1024
MAX_IMAGE_BYTES = 50 * 1024 * 1024

MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".htm": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".yaml": "text/yaml; charset=utf-8",
    ".yml": "text/yaml; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".avif": "image/avif",
    ".ico": "image/x-icon",
    ".woff2": "font/woff2",
    ".woff": "font/woff",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".eot": "application/vnd.ms-fontobject",
    ".wasm": "application/wasm",
}


def guess_mime(path: Path) -> str:
    ext = path.suffix.lower()
    if ext in MIME_TYPES:
        return MIME_TYPES[ext]
    guessed, _ = mimetypes.guess_type(str(path))
    return guessed or "application/octet-stream"


def _has_traversal_syntax(raw_path: str) -> bool:
    if "\x00" in raw_path or "\\" in raw_path:
        return True
    for part in raw_path.split("/"):
        if part in (".", ".."):
            return True
    return False


def _safe_resolve_inside(base_dir: Path, rel_parts: list[str]) -> Path | None:
    base_resolved = base_dir.resolve()
    try:
        candidate = base_resolved.joinpath(*rel_parts).resolve()
    except (OSError, ValueError):
        return None
    if not candidate.is_relative_to(base_resolved):
        return None
    return candidate


def _validate_project_name(name: object) -> tuple[str | None, int, str]:
    if not isinstance(name, str):
        return None, HTTPStatus.BAD_REQUEST, "Project name must be a string"
    cleaned = name.strip()
    if not cleaned or len(cleaned) > 120:
        return None, HTTPStatus.BAD_REQUEST, "Invalid project name"
    if cleaned in (".", "..") or cleaned.startswith("."):
        return None, HTTPStatus.FORBIDDEN if cleaned in (".", "..") else HTTPStatus.BAD_REQUEST, "Invalid project name"
    if any(ch in cleaned for ch in ("/", "\\", "\x00")) or ".." in cleaned:
        return None, HTTPStatus.FORBIDDEN, "Invalid characters in project name"
    if any(ord(ch) < 32 or ord(ch) == 127 for ch in cleaned):
        return None, HTTPStatus.BAD_REQUEST, "Invalid control characters in project name"
    return cleaned, HTTPStatus.OK, ""


def _sanitise_image_filename(raw_name: str) -> str | None:
    if not raw_name or "\x00" in raw_name or "/" in raw_name or "\\" in raw_name or ".." in raw_name:
        return None
    p = Path(raw_name.strip())
    ext = p.suffix.lower()
    if ext not in IMAGE_EXTS:
        return None
    stem = re.sub(r"[^\w\-.]", "_", p.stem, flags=re.UNICODE)
    stem = stem.strip("._- ")
    if not stem:
        stem = "image"
    stem = stem[:80]
    return f"{stem}{ext}"


def _find_project_yaml(proj_dir: Path) -> Path | None:
    for fname in YAML_CANDIDATES:
        cand = proj_dir / fname
        if cand.is_file():
            return cand
    return None


def _atomic_write_text(target: Path, content: str) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(prefix=".video.", suffix=".tmp", dir=str(target.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(content)
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp_name, target)
    except Exception:
        try:
            os.unlink(tmp_name)
        except OSError:
            pass
        raise


def _atomic_write_bytes(target: Path, data: bytes) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(prefix=".img.", suffix=".tmp", dir=str(target.parent))
    try:
        with os.fdopen(fd, "wb") as fh:
            fh.write(data)
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp_name, target)
    except Exception:
        try:
            os.unlink(tmp_name)
        except OSError:
            pass
        raise


class KhordegirHTTPServer(ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True

    def __init__(self, server_address, RequestHandlerClass, videos_root: Path, pkg_root: Path):
        self.videos_root = videos_root.resolve()
        self.pkg_root = pkg_root.resolve()
        super().__init__(server_address, RequestHandlerClass)


class KhordegirHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _drain_small_body(self) -> None:
        if self.command not in ("POST", "PUT") or getattr(self, "_body_read", False):
            return
        raw_len = self.headers.get("Content-Length")
        if raw_len is None:
            self.close_connection = True
            return
        try:
            length = int(raw_len)
        except ValueError:
            self.close_connection = True
            return
        if 0 < length <= 65536:
            self.rfile.read(length)
            self._body_read = True
        elif length > 65536:
            self.close_connection = True

    def _send_json(self, status: int, payload: dict) -> None:
        self._drain_small_body()
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        if self.close_connection:
            self.send_header("Connection", "close")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _send_bytes(self, status: int, content_type: str, data: bytes) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(data)

    def _send_file(self, path: Path) -> None:
        try:
            data = path.read_bytes()
        except OSError:
            self._send_json(HTTPStatus.NOT_FOUND, {"error": "File not found"})
            return
        self._send_bytes(HTTPStatus.OK, guess_mime(path), data)

    def _read_body(self, max_bytes: int) -> tuple[bytes | None, int, str]:
        raw_len = self.headers.get("Content-Length")
        if raw_len is None:
            return None, HTTPStatus.LENGTH_REQUIRED, "Missing Content-Length header"
        try:
            length = int(raw_len)
        except ValueError:
            return None, HTTPStatus.BAD_REQUEST, "Invalid Content-Length header"
        if length < 0:
            return None, HTTPStatus.BAD_REQUEST, "Invalid Content-Length header"
        if length > max_bytes:
            return None, HTTPStatus.REQUEST_ENTITY_TOO_LARGE, "Payload too large"
        data = self.rfile.read(length) if length > 0 else b""
        self._body_read = True
        if len(data) != length:
            return None, HTTPStatus.BAD_REQUEST, "Incomplete request body"
        return data, HTTPStatus.OK, ""

    def do_HEAD(self) -> None:
        self.do_GET()

    def do_GET(self) -> None:
        parsed = urlsplit(self.path)
        raw_path = parsed.path
        decoded_path = unquote(raw_path)

        if _has_traversal_syntax(raw_path) or _has_traversal_syntax(decoded_path):
            self._send_json(HTTPStatus.FORBIDDEN, {"error": "Path traversal blocked"})
            return

        if decoded_path == "/":
            self.send_response(HTTPStatus.FOUND)
            self.send_header("Location", "/editor/")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return

        if decoded_path == "/api/health":
            self._send_json(HTTPStatus.OK, {"ok": True})
            return

        if decoded_path == "/api/projects":
            self._handle_list_projects()
            return

        if decoded_path.startswith("/api/projects/"):
            rest = decoded_path[len("/api/projects/"):]
            if "/" not in rest and rest:
                self._handle_get_project(rest)
                return
            if rest.endswith("/steps"):
                proj_name = rest[:-len("/steps")]
                if proj_name and "/" not in proj_name:
                    self._handle_get_project_steps(proj_name)
                    return
            self._send_json(HTTPStatus.NOT_FOUND, {"error": "Not found"})
            return

        if decoded_path.startswith("/projects/"):
            self._handle_get_project_asset(decoded_path)
            return

        parts = [p for p in decoded_path.split("/") if p]
        if parts and (parts[0] in STATIC_DIRS or parts[0] in STATIC_ALIASES):
            if len(parts) == 1 and not decoded_path.endswith("/"):
                self.send_response(HTTPStatus.FOUND)
                self.send_header("Location", f"/{parts[0]}/")
                self.send_header("Content-Length", "0")
                self.end_headers()
                return
            static_root = STATIC_ALIASES.get(parts[0], parts[0])
            self._handle_static(static_root, parts[1:])
            return

        self._send_json(HTTPStatus.NOT_FOUND, {"error": "Not found"})

    def do_POST(self) -> None:
        self._body_read = False
        parsed = urlsplit(self.path)
        raw_path = parsed.path
        decoded_path = unquote(raw_path)

        if _has_traversal_syntax(raw_path) or _has_traversal_syntax(decoded_path):
            self._send_json(HTTPStatus.FORBIDDEN, {"error": "Path traversal blocked"})
            return

        if decoded_path == "/api/projects":
            self._handle_create_project()
            return

        if decoded_path.startswith("/api/projects/") and decoded_path.endswith("/images"):
            inner = decoded_path[len("/api/projects/"):-len("/images")]
            if inner and "/" not in inner:
                self._handle_upload_image(inner, parsed.query)
                return

        if decoded_path.startswith("/api/projects/") and decoded_path.endswith("/obs-export"):
            inner = decoded_path[len("/api/projects/"):-len("/obs-export")]
            if inner and "/" not in inner:
                self._handle_obs_export(inner)
                return

        self._send_json(HTTPStatus.NOT_FOUND, {"error": "Not found"})

    def do_PUT(self) -> None:
        self._body_read = False
        parsed = urlsplit(self.path)
        raw_path = parsed.path
        decoded_path = unquote(raw_path)

        if _has_traversal_syntax(raw_path) or _has_traversal_syntax(decoded_path):
            self._send_json(HTTPStatus.FORBIDDEN, {"error": "Path traversal blocked"})
            return

        if decoded_path.startswith("/api/projects/"):
            name = decoded_path[len("/api/projects/"):]
            if name and "/" not in name:
                self._handle_update_project(name)
                return

        self._send_json(HTTPStatus.NOT_FOUND, {"error": "Not found"})

    # ------------------------------------------------------------------ static
    def _handle_static(self, root_name: str, rel_parts: list[str]) -> None:
        base = self.server.pkg_root / root_name
        if not base.is_dir():
            self._send_json(HTTPStatus.NOT_FOUND, {"error": "Not found"})
            return
        target = _safe_resolve_inside(base, rel_parts)
        if target is None:
            self._send_json(HTTPStatus.FORBIDDEN, {"error": "Path traversal blocked"})
            return
        if target.is_dir():
            index_file = _safe_resolve_inside(target, ["index.html"])
            if index_file is not None and index_file.is_file():
                self._send_file(index_file)
                return
            self._send_json(HTTPStatus.NOT_FOUND, {"error": "Not found"})
            return
        if not target.is_file():
            self._send_json(HTTPStatus.NOT_FOUND, {"error": "Not found"})
            return
        self._send_file(target)

    # ------------------------------------------------------------------ projects
    def _resolve_project_dir(self, raw_name: str) -> Path | None:
        valid_name, err_status, err_msg = _validate_project_name(raw_name)
        if valid_name is None:
            self._send_json(err_status, {"error": err_msg})
            return None
        proj_dir = _safe_resolve_inside(self.server.videos_root, [valid_name])
        if proj_dir is None or proj_dir.parent != self.server.videos_root:
            self._send_json(HTTPStatus.FORBIDDEN, {"error": "Invalid project path"})
            return None
        return proj_dir

    def _handle_list_projects(self) -> None:
        videos_root = self.server.videos_root
        items = []
        if videos_root.is_dir():
            for entry in sorted(videos_root.iterdir(), key=lambda p: p.name):
                if not entry.is_dir() or entry.name.startswith("."):
                    continue
                yaml_path = _find_project_yaml(entry)
                if yaml_path is None:
                    continue
                title = entry.name
                theme = None
                slides_count = 0
                try:
                    raw = yaml_path.read_text(encoding="utf-8")
                    data = (json.loads(raw) if yaml_path.suffix == ".json" else yaml.safe_load(raw)) or {}
                    if isinstance(data, dict):
                        title = data.get("title") or entry.name
                        theme = data.get("theme")
                        slides = data.get("slides")
                        if isinstance(slides, list):
                            slides_count = len(slides)
                except Exception:
                    pass
                items.append({
                    "name": entry.name,
                    "title": title,
                    "theme": theme,
                    "slides_count": slides_count,
                    "updated_at": yaml_path.stat().st_mtime,
                })
        self._send_json(HTTPStatus.OK, {"projects": items})

    def _handle_create_project(self) -> None:
        body, status, msg = self._read_body(MAX_JSON_BYTES)
        if body is None:
            self._send_json(status, {"error": msg})
            return
        try:
            payload = json.loads(body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Invalid JSON body"})
            return
        if not isinstance(payload, dict):
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": "JSON body must be an object"})
            return

        valid_name, err_status, err_msg = _validate_project_name(payload.get("name"))
        if valid_name is None:
            self._send_json(err_status, {"error": err_msg})
            return

        self.server.videos_root.mkdir(parents=True, exist_ok=True)
        proj_dir = _safe_resolve_inside(self.server.videos_root, [valid_name])
        if proj_dir is None or proj_dir.parent != self.server.videos_root:
            self._send_json(HTTPStatus.FORBIDDEN, {"error": "Invalid project path"})
            return

        if _find_project_yaml(proj_dir) is not None or (proj_dir / "video.yaml").exists():
            self._send_json(HTTPStatus.CONFLICT, {"error": "Project already exists"})
            return

        starter_yaml = self.server.pkg_root / "starter" / "video.yaml"
        if not starter_yaml.is_file():
            self._send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": "Starter video.yaml missing"})
            return

        (proj_dir / "img").mkdir(parents=True, exist_ok=True)
        dst_yaml = proj_dir / "video.yaml"
        shutil.copy2(starter_yaml, dst_yaml)
        yaml_text = dst_yaml.read_text(encoding="utf-8")
        data = yaml.safe_load(yaml_text) or {}
        self._send_json(HTTPStatus.CREATED, {
            "ok": True,
            "name": valid_name,
            "yaml": yaml_text,
            "data": data,
        })

    def _handle_get_project(self, raw_name: str) -> None:
        proj_dir = self._resolve_project_dir(raw_name)
        if proj_dir is None:
            return
        yaml_path = _find_project_yaml(proj_dir)
        if yaml_path is None:
            self._send_json(HTTPStatus.NOT_FOUND, {"error": "Project not found"})
            return
        yaml_text = yaml_path.read_text(encoding="utf-8")
        try:
            data = (json.loads(yaml_text) if yaml_path.suffix == ".json" else yaml.safe_load(yaml_text)) or {}
        except Exception as exc:
            data = None
            yaml_error = str(exc)
        else:
            yaml_error = None

        img_dir = proj_dir / "img"
        images = []
        if img_dir.is_dir():
            for p in sorted(img_dir.iterdir(), key=lambda x: x.name):
                if p.is_file() and not p.name.startswith(".") and p.suffix.lower() in IMAGE_EXTS:
                    images.append(p.name)

        resp = {
            "name": proj_dir.name,
            "yaml": yaml_text,
            "data": data,
            "images": images,
        }
        if yaml_error is not None:
            resp["yaml_error"] = yaml_error
        self._send_json(HTTPStatus.OK, resp)

    def _handle_update_project(self, raw_name: str) -> None:
        proj_dir = self._resolve_project_dir(raw_name)
        if proj_dir is None:
            return
        yaml_path = _find_project_yaml(proj_dir)
        if yaml_path is None:
            self._send_json(HTTPStatus.NOT_FOUND, {"error": "Project not found"})
            return

        body, status, msg = self._read_body(MAX_YAML_BYTES)
        if body is None:
            self._send_json(status, {"error": msg})
            return

        content_type = (self.headers.get("Content-Type") or "").split(";")[0].strip().lower()
        if content_type == "application/json":
            try:
                obj = json.loads(body.decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError):
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Invalid JSON body"})
                return
            if not isinstance(obj, dict):
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": "JSON body must be an object"})
                return
            if "yaml" in obj:
                if not isinstance(obj["yaml"], str):
                    self._send_json(HTTPStatus.BAD_REQUEST, {"error": "'yaml' must be a string"})
                    return
                raw_yaml = obj["yaml"]
            elif "slides" in obj:
                if not isinstance(obj["slides"], list):
                    self._send_json(HTTPStatus.BAD_REQUEST, {"error": "'slides' must be a list"})
                    return
                raw_yaml = yaml.safe_dump(obj, allow_unicode=True, sort_keys=False)
            else:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": "JSON body must contain 'yaml' or 'slides'"})
                return
        else:
            try:
                raw_yaml = body.decode("utf-8")
            except UnicodeDecodeError:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Body must be UTF-8 text"})
                return

        try:
            parsed = yaml.safe_load(raw_yaml)
        except yaml.YAMLError as exc:
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": f"Invalid YAML: {exc}"})
            return

        if not isinstance(parsed, dict):
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": "YAML root must be a mapping"})
            return
        if "slides" not in parsed or not isinstance(parsed["slides"], list):
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": "YAML must contain a 'slides' list"})
            return

        target_yaml = proj_dir / "video.yaml" if yaml_path.suffix == ".json" else yaml_path
        _atomic_write_text(target_yaml, raw_yaml)
        self._send_json(HTTPStatus.OK, {
            "ok": True,
            "name": proj_dir.name,
            "yaml": raw_yaml,
            "data": parsed,
        })

    def _handle_get_project_steps(self, raw_name: str) -> None:
        proj_dir = self._resolve_project_dir(raw_name)
        if proj_dir is None:
            return
        if _find_project_yaml(proj_dir) is None:
            self._send_json(HTTPStatus.NOT_FOUND, {"error": "Project not found"})
            return
        try:
            pr = Project(proj_dir)
        except SystemExit as exc:
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
            return
        steps = obs_export.steps_for_obs(pr)
        self._send_json(HTTPStatus.OK, {
            "ok": True,
            "name": proj_dir.name,
            "title": pr.title,
            "steps": steps,
            "warnings": pr.warnings,
        })

    def _handle_obs_export(self, raw_name: str) -> None:
        proj_dir = self._resolve_project_dir(raw_name)
        if proj_dir is None:
            return
        if _find_project_yaml(proj_dir) is None:
            self._send_json(HTTPStatus.NOT_FOUND, {"error": "Project not found"})
            return

        opts: dict = {}
        raw_len = self.headers.get("Content-Length")
        if raw_len is not None:
            body, status, msg = self._read_body(MAX_JSON_BYTES)
            if body is None:
                self._send_json(status, {"error": msg})
                return
            if body.strip():
                try:
                    parsed = json.loads(body.decode("utf-8"))
                except (UnicodeDecodeError, json.JSONDecodeError):
                    self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Invalid JSON body"})
                    return
                if not isinstance(parsed, dict):
                    self._send_json(HTTPStatus.BAD_REQUEST, {"error": "JSON body must be an object"})
                    return
                opts = parsed

        os_target = str(opts.get("os") or "linux").lower()
        if os_target not in obs_export.VALID_OS:
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": f"Unsupported OS target: {os_target}"})
            return

        out_dir = None
        if opts.get("out_dir"):
            rel = str(opts["out_dir"])
            if _has_traversal_syntax(rel) or Path(rel).is_absolute():
                self._send_json(HTTPStatus.FORBIDDEN, {"error": "Invalid out_dir"})
                return
            out_dir = _safe_resolve_inside(proj_dir, [p for p in rel.split("/") if p])
            if out_dir is None:
                self._send_json(HTTPStatus.FORBIDDEN, {"error": "Invalid out_dir"})
                return

        try:
            pr = Project(proj_dir)
            result = obs_export.export_obs_package(
                pr,
                out_dir=out_dir,
                os_target=os_target,
                ws_url=str(opts.get("ws_url") or "ws://127.0.0.1:4455"),
                ws_password=str(opts.get("ws_password") or ""),
                auto_studio_preview_sync=bool(opts.get("auto_studio_preview_sync", True)),
                render_png=opts.get("render_png", "auto"),
            )
        except (SystemExit, ValueError, RuntimeError) as exc:
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
            return
        self._send_json(HTTPStatus.OK, result)

    # ------------------------------------------------------------------ images
    def _handle_upload_image(self, raw_name: str, query_str: str) -> None:
        proj_dir = self._resolve_project_dir(raw_name)
        if proj_dir is None:
            return
        if not proj_dir.is_dir():
            self._send_json(HTTPStatus.NOT_FOUND, {"error": "Project not found"})
            return

        qs = parse_qs(query_str, keep_blank_values=False)
        raw_filename = (qs.get("filename") or [None])[0]
        if not raw_filename:
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Missing filename query parameter"})
            return

        if "\x00" in raw_filename or "/" in raw_filename or "\\" in raw_filename or ".." in raw_filename:
            self._send_json(HTTPStatus.FORBIDDEN, {"error": "Invalid filename"})
            return

        safe_name = _sanitise_image_filename(raw_filename)
        if safe_name is None:
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Unsupported or invalid image filename"})
            return

        body, status, msg = self._read_body(MAX_IMAGE_BYTES)
        if body is None:
            self._send_json(status, {"error": msg})
            return
        if not body:
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Empty image body"})
            return

        img_dir = (proj_dir / "img").resolve()
        img_dir.mkdir(parents=True, exist_ok=True)
        target = _safe_resolve_inside(img_dir, [safe_name])
        if target is None or target.parent != img_dir:
            self._send_json(HTTPStatus.FORBIDDEN, {"error": "Invalid image path"})
            return

        _atomic_write_bytes(target, body)
        self._send_json(HTTPStatus.CREATED, {
            "ok": True,
            "filename": safe_name,
            "url": f"/projects/{quote(proj_dir.name)}/img/{quote(safe_name)}",
            "size": len(body),
        })

    def _handle_get_project_asset(self, decoded_path: str) -> None:
        # /projects/<name>/img/<file>
        parts = [p for p in decoded_path.split("/") if p]
        if len(parts) < 4 or parts[0] != "projects" or parts[2] != "img":
            self._send_json(HTTPStatus.NOT_FOUND, {"error": "Not found"})
            return
        proj_dir = self._resolve_project_dir(parts[1])
        if proj_dir is None:
            return
        img_dir = (proj_dir / "img").resolve()
        if not img_dir.is_dir():
            self._send_json(HTTPStatus.NOT_FOUND, {"error": "Image not found"})
            return
        target = _safe_resolve_inside(img_dir, parts[3:])
        if target is None:
            self._send_json(HTTPStatus.FORBIDDEN, {"error": "Path traversal blocked"})
            return
        if not target.is_file():
            self._send_json(HTTPStatus.NOT_FOUND, {"error": "Image not found"})
            return
        self._send_file(target)


def create_server(
    videos_root: str | Path,
    port: int = 8765,
    pkg_root: str | Path | None = None,
) -> KhordegirHTTPServer:
    root = Path(videos_root).expanduser().resolve()
    root.mkdir(parents=True, exist_ok=True)
    pkg = Path(pkg_root).expanduser().resolve() if pkg_root else PKG
    return KhordegirHTTPServer(("127.0.0.1", port), KhordegirHandler, videos_root=root, pkg_root=pkg)


def serve(videos_root: str | Path, port: int = 8765, open_browser: bool = True) -> None:
    httpd = create_server(videos_root, port=port)
    actual_port = httpd.server_address[1]
    url = f"http://127.0.0.1:{actual_port}/editor/"
    print(f"سرور خرده‌گیر استودیو آماده است: {url}", flush=True)
    if open_browser:
        threading.Timer(0.2, webbrowser.open, args=(url,)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nسرور متوقف شد.")
    finally:
        httpd.server_close()
