"""Scene surface wiring: yaml `scene:` -> Project.scene -> normalised slides / stage payload -> CSS/JS/editor."""
import sys, textwrap
from pathlib import Path
import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from khordegir.project import Project, stage_payload  # noqa: E402

STAGE = ROOT / "khordegir" / "stage"


def make(tmp_path, body):
    (tmp_path / "video.yaml").write_text(textwrap.dedent(body), encoding="utf-8")
    return Project(tmp_path)


def slides(p):
    return p.slides if hasattr(p, "slides") else p.normalised()


def test_default_none(tmp_path):
    p = make(tmp_path, "title: t\nslides:\n  - template: quote\n    text: hi\n")
    assert p.scene == "none"
    for s in slides(p):
        assert "scene" not in s


@pytest.mark.parametrize("v", ["corkboard", "paper", "dark-grid"])
def test_valid_values_inherit(tmp_path, v):
    p = make(tmp_path, f"title: t\nscene: {v}\nslides:\n  - template: quote\n    text: hi\n")
    assert p.scene == v
    ss = slides(p)
    assert ss and all(s["scene"] == v for s in ss)
    assert stage_payload(ss[0])["scene"] == v


def test_slide_override_and_none(tmp_path):
    p = make(tmp_path, "title: t\nscene: paper\nslides:\n  - template: quote\n    text: a\n    scene: dark-grid\n  - template: quote\n    text: b\n    scene: none\n")
    ss = slides(p)
    assert ss[0]["scene"] == "dark-grid"
    assert "scene" not in ss[1]


def test_invalid_scene_persian_error_with_line(tmp_path):
    with pytest.raises(SystemExit) as e:
        make(tmp_path, "title: t\nscene: wood\nslides:\n  - template: quote\n    text: hi\n")
    msg = str(e.value)
    assert "خطای خط 2" in msg and "wood" in msg


def test_stage_assets_wired():
    css = (STAGE / "stage.css").read_text(encoding="utf-8")
    js = (STAGE / "core.js").read_text(encoding="utf-8")
    for v in ("corkboard", "paper", "dark-grid"):
        assert f'data-scene="{v}"' in css
    block = css[css.index("Scene surfaces"):]
    assert "url(" not in block and "http" not in block and "@keyframes" not in block
    assert '"data-scene"' in js
    html = (STAGE / "stage.html").read_text(encoding="utf-8")
    assert html.index("motion-tokens.js") < html.index("core.js")
    ed = (ROOT / "khordegir" / "editor" / "index.html").read_text(encoding="utf-8")
    assert 'id="projSceneSelect"' in ed and ed.index("sceneAdvancedDetails") < ed.index("projSceneSelect")
