"""MCP server for ai-video-editor.

Exposes the whole editing pipeline as **typed tools** so AI agents (Claude,
Hermes, Cursor, any MCP client) can drive it. This is what makes the editor a
genuine *agent* editor — the AI plans and calls tools; the engine executes.

Implements the Model Context Protocol over stdio (JSON-RPC 2.0) with zero
third-party dependencies, so it runs reliably anywhere. Tools:

  shots.detect        - scene/shot detection -> clips
  jumpcut.build       - auto jump-cut (silence/filler removal) -> project
  captions.burn       - word-level karaoke captions burned onto video
  subtitles.export    - SRT/VTT sidecar export
  export.otio        - non-destructive OTIO/FCPXML/EDL export
  project.render      - render a project to MP4 (GPU NVENC when available)
  project.info        - inspect a project file
"""
from __future__ import annotations

import json
import os
import sys
import traceback
from typing import Any, Callable, Dict, List, Optional

from . import transcribe, scenes, jumpcut, captions, export_timeline, render
from .model import Project

PROTOCOL = "2024-11-05"


class McpError(Exception):
    def __init__(self, code: int, message: str, data: Any = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.data = data


# --------------------------------------------------------------------------
# Tool registry
# --------------------------------------------------------------------------
TOOLS: List[Dict[str, Any]] = []
_HANDLERS: Dict[str, Callable] = {}


def tool(name: str, description: str, input_schema: Dict):
    def deco(fn):
        TOOLS.append({
            "name": name,
            "description": description,
            "inputSchema": input_schema,
        })
        _HANDLERS[name] = fn
        return fn
    return deco


def _p(path: str) -> str:
    return os.path.abspath(os.path.expanduser(path))


def _require(cond: bool, msg: str):
    if not cond:
        raise McpError(-32602, msg)


@tool("shots.detect",
      "Detect shot/scene boundaries in a video and return clips list.",
      {"type": "object", "properties": {
          "video": {"type": "string"},
          "threshold": {"type": "number", "default": 15.0},
          "min_shot_len": {"type": "number", "default": 0.5},
      }, "required": ["video"]})
def _shots_detect(video: str, threshold: float = 15.0,
                  min_shot_len: float = 0.5) -> Dict:
    _require(os.path.exists(_p(video)), f"video not found: {video}")
    shots = scenes.detect_shots(_p(video), threshold=threshold,
                                min_shot_len=min_shot_len)
    return {"shots": shots, "count": len(shots)}


@tool("jumpcut.build",
      "Build a non-destructive jump-cut project from a transcript+source.",
      {"type": "object", "properties": {
          "transcript": {"type": "string"},
          "source": {"type": "string"},
          "min_speech_gap": {"type": "number", "default": 0.35},
          "padding": {"type": "number", "default": 0.12},
      }, "required": ["transcript", "source"]})
def _jumpcut_build(transcript: str, source: str,
                   min_speech_gap: float = 0.35,
                   padding: float = 0.12) -> Dict:
    _require(os.path.exists(_p(transcript)), "transcript not found")
    _require(os.path.exists(_p(source)), "source not found")
    proj = jumpcut.build_jumpcut_project(_p(transcript), _p(source),
                                         min_speech_gap=min_speech_gap,
                                         padding=padding)
    return {"project": proj.to_dict()}


@tool("captions.burn",
      "Burn word-level karaoke captions directly onto a video.",
      {"type": "object", "properties": {
          "video": {"type": "string"},
          "transcript": {"type": "string"},
          "output": {"type": "string"},
          "karaoke": {"type": "boolean", "default": True},
      }, "required": ["video", "transcript", "output"]})
def _captions_burn(video: str, transcript: str, output: str,
                   karaoke: bool = True) -> Dict:
    _require(os.path.exists(_p(video)), "video not found")
    _require(os.path.exists(_p(transcript)), "transcript not found")
    res = captions.burn_captions(_p(video), _p(transcript), _p(output),
                                 karaoke=karaoke)
    return res


@tool("subtitles.export",
      "Export SRT and VTT subtitle sidecars from a transcript.",
      {"type": "object", "properties": {
          "transcript": {"type": "string"},
          "base": {"type": "string"},
      }, "required": ["transcript", "base"]})
def _subtitles_export(transcript: str, base: str) -> Dict:
    _require(os.path.exists(_p(transcript)), "transcript not found")
    lines = captions.load_word_stream(_p(transcript))
    srt = captions.export_srt(lines, _p(base) + ".srt")
    vtt = captions.export_vtt(lines, _p(base) + ".vtt")
    return {"srt": srt, "vtt": vtt, "lines": len(lines)}


@tool("export.otio",
      "Export a project to OTIO / FCPXML / CMX3600 EDL (non-destructive).",
      {"type": "object", "properties": {
          "project_json": {"type": "string"},
          "out_dir": {"type": "string"},
      }, "required": ["project_json", "out_dir"]})
def _export_otio(project_json: str, out_dir: str) -> Dict:
    proj = Project.from_dict(json.loads(project_json))
    paths = export_timeline.export_all(proj, _p(out_dir))
    return {"exported": paths}


@tool("project.render",
      "Render a project JSON to an MP4 (GPU NVENC when available).",
      {"type": "object", "properties": {
          "project_json": {"type": "string"},
          "output": {"type": "string"},
          "hardware": {"type": "boolean", "default": True},
      }, "required": ["project_json", "output"]})
def _project_render(project_json: str, output: str,
                    hardware: bool = True) -> Dict:
    proj = Project.from_dict(json.loads(project_json))
    out = render.render_project(proj, out=_p(output), hardware=hardware)
    return {"output": out, "duration": round(proj.duration(), 3)}


@tool("project.info",
      "Return metadata about a project JSON string.",
      {"type": "object", "properties": {
          "project_json": {"type": "string"},
      }, "required": ["project_json"]})
def _project_info(project_json: str) -> Dict:
    proj = Project.from_dict(json.loads(project_json))
    return {
        "name": proj.name,
        "width": proj.width, "height": proj.height,
        "fps": proj.fps, "duration": round(proj.duration(), 3),
        "tracks": len(proj.tracks),
        "clips": sum(len(t.clips) for t in proj.tracks),
    }


# --------------------------------------------------------------------------
# JSON-RPC plumbing
# --------------------------------------------------------------------------
def _send(msg: Dict):
    sys.stdout.write(json.dumps(msg))
    sys.stdout.write("\n")
    sys.stdout.flush()


def _handle_call(method: str, params: Dict) -> Dict:
    if method in _HANDLERS:
        return _HANDLERS[method](**(params or {}))
    raise McpError(-32601, f"method not found: {method}")


def _dispatch(msg: Dict) -> Optional[Dict]:
    mid = msg.get("id")
    method = msg.get("method")

    if method == "initialize":
        _send({
            "jsonrpc": "2.0", "id": mid,
            "result": {
                "protocolVersion": PROTOCOL,
                "capabilities": {"tools": {}},
                "serverInfo": {"name": "ai-video-editor-mcp",
                               "version": "0.2.0"},
            },
        })
        return None

    if method == "notifications/initialized":
        return None

    if method == "tools/list":
        _send({"jsonrpc": "2.0", "id": mid, "result": {"tools": TOOLS}})
        return None

    if method == "tools/call":
        params = msg.get("params", {}) or {}
        try:
            result = _handle_call(params.get("name", ""),
                                  params.get("arguments", {}))
            _send({"jsonrpc": "2.0", "id": mid,
                   "result": {"content": [
                       {"type": "text",
                        "text": json.dumps(result, ensure_ascii=False)}
                   ]}})
        except McpError as e:
            _send({"jsonrpc": "2.0", "id": mid,
                   "error": {"code": e.code, "message": e.message}})
        except Exception as e:
            _send({"jsonrpc": "2.0", "id": mid,
                   "error": {"code": -32603,
                             "message": f"{e}\n{traceback.format_exc()}"}})
        return None

    if method == "shutdown":
        _send({"jsonrpc": "2.0", "id": mid, "result": None})
        return None

    _send({"jsonrpc": "2.0", "id": mid,
           "error": {"code": -32601, "message": f"unknown method: {method}"}})
    return None


def main():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            msg = json.loads(line)
        except json.JSONDecodeError:
            continue
        try:
            _dispatch(msg)
        except Exception:
            continue


if __name__ == "__main__":
    main()
