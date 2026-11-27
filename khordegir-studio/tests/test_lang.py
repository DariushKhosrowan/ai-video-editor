import pytest
from khordegir.project import norm_lang


def test_norm_lang():
    assert norm_lang(None) == "fa"
    assert norm_lang(" EN ") == "en"
    with pytest.raises(ValueError):
        norm_lang("de")
