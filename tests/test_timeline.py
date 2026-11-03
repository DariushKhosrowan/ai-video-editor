from ai_video_editor.timeline import parse_transcript, find_segments, merge_windows

SAMPLE = """[10.0-15.0] سلام، امروز درباره سایت من صحبت می‌کنم
[20.0-25.0] این بخش ورزش و چالش همگانی است
[40.0-45.0] ممنون از همراهی شما
"""


def test_parse():
    s = parse_transcript(SAMPLE)
    assert len(s) == 3
    assert s[0]["start"] == 10.0


def test_find():
    s = parse_transcript(SAMPLE)
    hits = find_segments(s, ["سایت"], context=1.0)
    assert len(hits) == 1
    assert hits[0]["start"] == 9.0  # context 1s


def test_merge():
    s = parse_transcript(SAMPLE)
    hits = find_segments(s, ["سایت", "ورزش"], context=0)
    m = merge_windows(hits)
    assert len(m) == 2
