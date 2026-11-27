import pytest
from khordegir.zoompoints import validate_zoom_points, STAGE_ZOOM_CAP


def test_default_off():
    assert validate_zoom_points(None) == []


def test_sorted_and_defaults():
    r = validate_zoom_points([{"at": 2}, {"at": 1, "scale": 1.05}])
    assert [p["at"] for p in r] == [1, 2] and r[1]["scale"] == 1.04


def test_cap_rejected():
    with pytest.raises(ValueError):
        validate_zoom_points([{"scale": STAGE_ZOOM_CAP + 0.1}])
