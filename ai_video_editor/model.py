"""Non-destructive timeline model.

A project is an ordered list of tracks, each containing clips. Clips reference
a source media file plus in/out points (so the edit never mutates the source),
an optional transition into the clip, and a list of overlay/effect slots.

This model is the single source of truth that the render engine, the OTIO
(FCPXML / CMX3600 EDL) exporter, and the MCP server all operate on. Because the
clips are time-ranged references, the same `Project` can be re-rendered with a
different encoder, previewed at low res, or exported to a professional NLE.
"""
from __future__ import annotations

import json
import dataclasses
from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Any


def _ts(t: float) -> float:
    """Round a timestamp to ms precision to keep exports/edits deterministic."""
    return round(float(t), 3)


@dataclass
class Overlay:
    """A visual/audio element composited over a clip's output.

    type: badge | text | image | pip | audio | captions
    """
    type: str
    file: str = ""                    # media/image path (empty for text)
    text: str = ""                    # for type=text
    x: int = 0
    y: int = 0
    w: Optional[int] = None           # only for pip/image
    h: Optional[int] = None
    start: float = 0.0                # offset relative to the CLIP's start
    end: float = 0.0
    # opacity 0..1, only used by the render engine (badge/image/pip)
    opacity: float = 1.0


@dataclass
class Clip:
    """A time-ranged reference to media on a track."""
    src: str                          # path to source media
    in_: float = 0.0                  # in-point in source media (s)
    out: float = 0.0                  # out-point in source media (s)
    start: float = 0.0                # timeline position where the clip begins (s)
    transition_from: str = "none"     # none | crossfade | fade
    transition_dur: float = 0.0
    overlays: List[Overlay] = field(default_factory=list)
    name: str = ""
    speed: float = 1.0                # playback rate (1.0 = normal)

    @property
    def duration(self) -> float:
        return _ts((self.out - self.in_) / self.speed) if self.out > self.in_ else 0.0

    @property
    def end(self) -> float:
        return _ts(self.start + self.duration)


@dataclass
class Track:
    kind: str = "video"               # video | audio
    clips: List[Clip] = field(default_factory=list)


@dataclass
class Project:
    name: str = "untitled"
    width: int = 1080
    height: int = 1920
    fps: float = 30.0
    audio_rate: int = 48000
    tracks: List[Track] = field(default_factory=list)
    meta: Dict[str, Any] = field(default_factory=dict)

    # -- construction helpers ------------------------------------------------
    def add_clip(self, clip: Clip, track_index: int = 0) -> Clip:
        while len(self.tracks) <= track_index:
            self.tracks.append(Track())
        self.tracks[track_index].clips.append(clip)
        return clip

    def duration(self) -> float:
        end = 0.0
        for tr in self.tracks:
            for c in tr.clips:
                end = max(end, c.end)
        return _ts(end)

    # -- serialization ---------------------------------------------------------
    def to_dict(self) -> dict:
        return dataclasses.asdict(self)

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent, ensure_ascii=False)

    @classmethod
    def from_dict(cls, d: dict) -> "Project":
        tracks = []
        for td in d.get("tracks", []):
            clips = []
            for cd in td.get("clips", []):
                ovs = [Overlay(**o) for o in cd.get("overlays", [])]
                c = Clip(
                    src=cd["src"],
                    in_=_ts(cd.get("in_", cd.get("in", 0.0))),
                    out=_ts(cd.get("out", 0.0)),
                    start=_ts(cd.get("start", 0.0)),
                    transition_from=cd.get("transition_from", "none"),
                    transition_dur=_ts(cd.get("transition_dur", 0.0)),
                    overlays=ovs,
                    name=cd.get("name", ""),
                    speed=cd.get("speed", 1.0),
                )
                clips.append(c)
            tracks.append(Track(kind=td.get("kind", "video"), clips=clips))
        return cls(
            name=d.get("name", "untitled"),
            width=int(d.get("width", 1080)),
            height=int(d.get("height", 1920)),
            fps=float(d.get("fps", 30.0)),
            audio_rate=int(d.get("audio_rate", 48000)),
            tracks=tracks,
            meta=d.get("meta", {}),
        )

    @classmethod
    def from_json(cls, text: str) -> "Project":
        return cls.from_dict(json.loads(text))
