"""Speech-to-text transcription with faster-whisper (offline, Persian-capable)."""
import sys


def transcribe(path: str, model: str = "small", language: str | None = None,
               beam: int = 5, vad: bool = True):
    """Return list of dicts: {start, end, text}."""
    from faster_whisper import WhisperModel
    m = WhisperModel(model, device="cpu", compute_type="int8")
    segs, info = m.transcribe(path, language=language, beam_size=beam, vad_filter=vad)
    out = []
    for s in segs:
        out.append({"start": round(s.start, 2), "end": round(s.end, 2),
                    "text": s.text.strip()})
    return info.language, out


def main():
    if len(sys.argv) < 2:
        print("usage: python -m ai_video_editor.transcribe video.mp4 [model]")
        sys.exit(1)
    path = sys.argv[1]
    model = sys.argv[2] if len(sys.argv) > 2 else "small"
    lang, segs = transcribe(path, model=model)
    print(f"# language={lang}")
    for s in segs:
        print(f"[{s['start']:.1f}-{s['end']:.1f}] {s['text']}")


if __name__ == "__main__":
    main()
