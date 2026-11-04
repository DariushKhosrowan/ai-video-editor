"""Unit tests for the non-destructive timeline model."""
import json
import pytest

from ai_video_editor.model import Project, Track, Clip, Overlay


def test_clip_duration():
    c = Clip(src="a.mp4", in_=2.0, out=5.0, start=0.0)
    assert c.duration == pytest.approx(3.0)
    assert c.end == pytest.approx(3.0)


def test_clip_speed():
    c = Clip(src="a.mp4", in_=0.0, out=10.0, start=0.0, speed=2.0)
    assert c.duration == pytest.approx(5.0)


def test_project_roundtrip():
    proj = Project(name="t", width=1080, height=1920, fps=30)
    proj.add_clip(Clip(src="v.mp4", in_=0.0, out=4.0, start=0.0,
                        name="a"))
    proj.add_clip(Clip(src="v.mp4", in_=4.0, out=8.0, start=4.0,
                        overlays=[Overlay(type="text", text="سلام", x=10,
                                          y=20, start=0.5, end=1.5)],
                        name="b"))
    data = proj.to_dict()
    assert data["width"] == 1080
    assert len(data["tracks"]) == 1
    assert len(data["tracks"][0]["clips"]) == 2
    assert proj.duration() == pytest.approx(8.0)

    back = Project.from_dict(data)
    assert back.name == "t"
    assert back.tracks[0].clips[1].overlays[0].text == "سلام"
    assert back.tracks[0].clips[1].start == pytest.approx(4.0)
    assert back.tracks[0].clips[1].duration == pytest.approx(4.0)


def test_project_to_json_has_src():
    proj = Project(name="t")
    proj.add_clip(Clip(src="/tmp/a.mp4", in_=0.0, out=1.0))
    blob = proj.to_json()
    assert "/tmp/a.mp4" in blob
    assert json.loads(blob)["tracks"][0]["clips"][0]["src"] == "/tmp/a.mp4"
