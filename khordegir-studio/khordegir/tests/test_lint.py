"""Pytest suite for khordegir.lint and CLI lint/build integration."""
from __future__ import annotations

import json
from pathlib import Path

from khordegir import cli
from khordegir.lint import format_issue, lint_video


def _write_video(tmp_path: Path, text: str) -> Path:
    vdir = tmp_path / "demo-video"
    vdir.mkdir(parents=True, exist_ok=True)
    (vdir / "video.yaml").write_text(text, encoding="utf-8")
    return vdir


def test_valid_slide_and_alias(tmp_path: Path) -> None:
    vdir = _write_video(
        tmp_path,
        json.dumps({
            "title": "Test",
            "slides": [
                {
                    "template": "title-card",  # schema alias for title_card
                    "title": "Short *clean* title",
                    "layout": "SCAM",
                    "transition": "whip",
                    "say": "Opening narration line.",
                    "bg_style": "explainer",
                    "drift": True,
                }
            ],
        }),
    )
    assert lint_video(vdir) == []


def test_unknown_template_suggests_closest(tmp_path: Path) -> None:
    vdir = _write_video(
        tmp_path,
        json.dumps({
            "slides": [
                {"template": "titl_card", "title": "Hello", "say": "Hi"},
            ]
        }),
    )
    issues = lint_video(vdir)
    assert any(n == 1 and lvl == "ERROR" and "title_card" in msg for n, lvl, msg in issues)


def test_missing_required_and_unknown_field(tmp_path: Path) -> None:
    vdir = _write_video(
        tmp_path,
        json.dumps({
            "slides": [
                {"template": "big_number", "typo_field": 123, "say": "Line"},
            ]
        }),
    )
    issues = lint_video(vdir)
    assert any(n == 1 and lvl == "ERROR" and "number" in msg for n, lvl, msg in issues)
    assert any(n == 1 and lvl == "WARN" and "typo_field" in msg for n, lvl, msg in issues)


def test_select_transition_and_layout_checks(tmp_path: Path) -> None:
    vdir = _write_video(
        tmp_path,
        json.dumps({
            "slides": [
                {
                    "template": "title_card",
                    "title": "Hello",
                    "align": "diagonal",
                    "transition": "warp-star",
                    "layout": "WIDE",
                    "say": "Narration.",
                }
            ]
        }),
    )
    issues = lint_video(vdir)
    assert any(lvl == "ERROR" and "'align'" in msg for _, lvl, msg in issues)
    assert any(lvl == "ERROR" and "warp-star" in msg for _, lvl, msg in issues)
    assert any(lvl == "ERROR" and "WIDE" in msg for _, lvl, msg in issues)


def test_readability_and_format_line(tmp_path: Path) -> None:
    long_title = "A" * 84
    long_body = "B" * 230
    vdir = _write_video(
        tmp_path,
        json.dumps({
            "slides": [
                {"template": "title_card", "title": f"*{long_title}*", "subtitle": long_body, "say": "Hi"},
            ]
        }),
    )
    issues = lint_video(vdir)
    assert any(lvl == "WARN" and msg == "title is 84 chars (max 70)" for _, lvl, msg in issues)
    assert any(lvl == "WARN" and msg == "subtitle is 230 chars (max 220)" for _, lvl, msg in issues)
    assert format_issue(7, "WARN", "title is 84 chars (max 70)") == "slide 07  WARN  title is 84 chars (max 70)"


def test_unbalanced_markup_detection(tmp_path: Path) -> None:
    vdir = _write_video(
        tmp_path,
        json.dumps({
            "slides": [
                {
                    "template": "quote",
                    "text": "*unclosed [[circle {{box ==hi __under ~bad",
                    "say": "Narration.",
                }
            ]
        }),
    )
    issues = lint_video(vdir)
    msgs = [msg for _, lvl, msg in issues if lvl == "WARN" and "unbalanced markup" in msg]
    assert msgs
    for expected in ("*", "~", "==", "__", "[[ ]]", "{{ }}"):
        assert expected in msgs[0]


def test_missing_image_duplicate_template_and_missing_say(tmp_path: Path) -> None:
    img_dir = tmp_path / "demo-video" / "img"
    img_dir.mkdir(parents=True, exist_ok=True)
    (img_dir / "ok.png").write_bytes(b"png")

    vdir = _write_video(
        tmp_path,
        json.dumps({
            "slides": [
                {"template": "image_text", "image": "ok.png", "title": "One", "say": "Ok"},
                {"template": "image_text", "image": "missing_pic.jpg", "title": "Two"},
            ]
        }),
    )
    issues = lint_video(vdir)
    assert any(n == 2 and lvl == "INFO" and "duplicate consecutive template" in msg for n, lvl, msg in issues)
    assert any(n == 2 and lvl == "WARN" and "missing 'say'" in msg for n, lvl, msg in issues)
    assert any(n == 2 and lvl == "ERROR" and "missing_pic.jpg" in msg for n, lvl, msg in issues)


def test_cli_lint_exit_code_and_build_gate(tmp_path: Path) -> None:
    import argparse
    vdir = _write_video(tmp_path, json.dumps({"slides": [{"template": "nonexistent_tpl", "say": "Hello"}]}))
    assert cli.main(["lint", str(vdir)]) == 1
    assert cli._lint_gate(argparse.Namespace(folder=str(vdir), force=False, skip_lint=False)) is False
    assert cli._lint_gate(argparse.Namespace(folder=str(vdir), force=True, skip_lint=False)) is True
