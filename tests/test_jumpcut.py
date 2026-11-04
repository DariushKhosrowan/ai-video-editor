"""Unit tests for the jump-cut editor."""
import json
import os
import tempfile
import pytest

from ai_video_editor.jumpcut import (build_jumpcut_project, FILLERS,
                                     _norm_word, _load_word_timestamps)


SAMPLE_TRANSCRIPT = [
    {
        "start": 0.0, "end": 4.0, "text": "hello um world",
        "words": [
            {"word": "hello", "start": 0.0, "end": 0.8},
            {"word": "um", "start": 0.8, "end": 1.2},
            {"word": "world", "start": 1.2, "end": 2.5},
        ],
    }
]


def _write_transcript(transcript=None):
    fd, path = tempfile.mkstemp(suffix=".json")
    with os.fdopen(fd, "w") as f:
        json.dump(transcript if transcript is not None else SAMPLE_TRANSCRIPT, f)
    return path


def test_norm_word():
    assert _norm_word("  Hello! ") == "hello"
    assert _norm_word("…سلام") == "سلام"


def test_fillers_present():
    assert "um" in FILLERS
    assert "like" in FILLERS


def test_load_word_timestamps():
    path = _write_transcript()
    words = _load_word_timestamps(path)
    os.unlink(path)
    assert len(words) == 3
    assert words[0]["word"] == "hello"
    assert words[2]["end"] == 2.5


def test_build_jumpcut_project():
    path = _write_transcript()
    try:
        # gap=0.5 merges hello("0-0.8) and world(1.2-2.5) into one kept clip
        proj = build_jumpcut_project(path, "/tmp/nonexistent.mp4",
                                     min_speech_gap=0.5, padding=0.0)
        clips = proj.tracks[0].clips
        assert len(clips) == 1
        assert clips[0].in_ == pytest.approx(0.0)
        assert clips[0].out == pytest.approx(2.5)
    finally:
        os.unlink(path)
