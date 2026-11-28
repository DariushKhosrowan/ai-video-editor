"""Tests for offline deterministic audio -> viseme lip-sync analysis."""

from __future__ import annotations

import json
import math
import shutil
import struct
import subprocess
import tempfile
import unittest
import wave
from pathlib import Path

from khordegir.mascot_lipsync import VISEME_SPECS, analyze_audio, write_viseme_track

STUDIO_DIR = Path(__file__).resolve().parent.parent
DEMO_WAV = STUDIO_DIR / "examples" / "mascot-demo" / "narration.wav"
DEMO_TRANSCRIPT = STUDIO_DIR / "examples" / "mascot-demo" / "transcript.json"


def _synth_test_wav(path: Path, sample_rate: int = 16000) -> None:
    dur = 3.2
    n = int(sample_rate * dur)
    syllables = [
        (0.25, 0.50, 740, 1280, 0.85, False),   # open/wide
        (0.52, 0.72, 240, 400, 0.55, False),    # round_o
        (0.74, 0.96, 180, 3600, 0.20, True),    # f_v fricative
        (0.98, 1.32, 780, 1340, 0.98, False),   # loud peak -> wide
        (1.34, 1.56, 2200, 2900, 0.62, False),  # high formant -> e_teeth
        # 1.58 .. 2.25 -> silence pause (beak must close)
        (2.26, 2.72, 660, 1180, 0.70, False),   # open
    ]
    seed = 4242
    buf = []
    for i in range(n):
        t = i / sample_rate
        seed = (seed * 1664525 + 1013904223) & 0xFFFFFFFF
        noise = (seed / 0xFFFFFFFF) * 2.0 - 1.0
        s = 0.0
        for st, en, f1, f2, amp, fric in syllables:
            if st <= t <= en:
                env = math.sin(math.pi * ((t - st) / (en - st))) ** 0.55
                if fric:
                    s += amp * env * (0.45 * math.sin(2 * math.pi * 3500 * t) + 0.35 * noise)
                else:
                    s += amp * env * (
                        0.58 * math.sin(2 * math.pi * f1 * t)
                        + 0.34 * math.sin(2 * math.pi * f2 * t)
                    )
        buf.append(int(max(-0.98, min(0.98, s)) * 32767))

    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(struct.pack(f"<{len(buf)}h", *buf))


class TestMascotLipsync(unittest.TestCase):
    def test_deterministic_output_for_fixed_file(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            wav = Path(td) / "fixed.wav"
            out1 = Path(td) / "run1.json"
            out2 = Path(td) / "run2.json"
            _synth_test_wav(wav)

            write_viseme_track(wav, out1, fps=30, min_hold_frames=2)
            write_viseme_track(wav, out2, fps=30, min_hold_frames=2)

            b1 = out1.read_bytes()
            b2 = out2.read_bytes()
            self.assertEqual(b1, b2, "Lipsync output must be byte-for-byte deterministic")

            data = json.loads(b1.decode("utf-8"))
            self.assertEqual(data["version"], 1)
            self.assertEqual(data["fps"], 30)
            self.assertGreater(len(data["frames"]), 60)

    def test_silence_closes_beak_and_speech_uses_multiple_visemes(self) -> None:
        track = analyze_audio(DEMO_WAV, fps=30, min_hold_frames=2)
        frames = track["frames"]

        # Opening & trailing silence must keep beak closed (openness == 0.0, is_speech == False)
        for f in frames[:4]:
            self.assertFalse(f["is_speech"])
            self.assertIn(f["viseme"], ("rest", "closed"))
            self.assertEqual(f["openness"], 0.0)
        for f in frames[-6:]:
            self.assertFalse(f["is_speech"])
            self.assertIn(f["viseme"], ("rest", "closed"))
            self.assertEqual(f["openness"], 0.0)

        # Mid pause gap (~2.30s - 2.55s) closes beak
        pause_frames = [f for f in frames if 2.30 <= f["t"] <= 2.55]
        self.assertTrue(len(pause_frames) >= 5)
        for f in pause_frames:
            self.assertFalse(f["is_speech"])
            self.assertEqual(f["openness"], 0.0)

        # All emitted viseme names belong to the canonical 8-viseme set
        seen = {f["viseme"] for f in frames}
        self.assertTrue(seen.issubset(set(VISEME_SPECS.keys())))
        self.assertGreaterEqual(len(seen), 5, f"Expected varied visemes across speech, got {seen}")

        # Must detect emphasis peaks and long phrase spans
        self.assertGreaterEqual(len(track["peaks"]), 2)
        self.assertGreaterEqual(len(track["phrases"]), 2)

    def test_min_hold_frames_and_smoothing(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            wav = Path(td) / "hold.wav"
            _synth_test_wav(wav)
            track = analyze_audio(wav, fps=30, min_hold_frames=3)
            frames = track["frames"]

            # Verify no isolated 1-frame speech viseme flicker inside continuous speech
            for i in range(1, len(frames) - 1):
                if frames[i]["is_speech"] and frames[i - 1]["is_speech"] and frames[i + 1]["is_speech"]:
                    same_adj = (frames[i]["viseme"] == frames[i - 1]["viseme"]) or (
                        frames[i]["viseme"] == frames[i + 1]["viseme"]
                    )
                    self.assertTrue(same_adj, f"Isolated 1-frame speech flicker at frame {i}: {frames[i]}")

            # Attack/release smoothing keeps step jumps bounded during speech
            for i in range(1, len(frames)):
                delta = abs(frames[i]["energy"] - frames[i - 1]["energy"])
                self.assertLessEqual(delta, 0.72)

    def test_optional_transcript_alignment_and_mp3_support(self) -> None:
        tr_track = analyze_audio(DEMO_WAV, transcript_path=DEMO_TRANSCRIPT, fps=30)
        self.assertEqual(tr_track["source"], "transcript+audio")
        self.assertIn("f_v", {f["viseme"] for f in tr_track["frames"]})

        # Silence intervals stay closed even when transcript is supplied
        for f in tr_track["frames"][:4]:
            self.assertFalse(f["is_speech"])
            self.assertEqual(f["openness"], 0.0)

        # Offline MP3 decoding test when ffmpeg is installed
        ffmpeg_bin = shutil.which("ffmpeg")
        if ffmpeg_bin:
            with tempfile.TemporaryDirectory() as td:
                mp3_path = Path(td) / "narration.mp3"
                proc = subprocess.run(
                    [ffmpeg_bin, "-y", "-i", str(DEMO_WAV), "-codec:a", "libmp3lame", "-qscale:a", "4", str(mp3_path)],
                    capture_output=True,
                    check=False,
                )
                if proc.returncode == 0 and mp3_path.exists():
                    mp3_track1 = analyze_audio(mp3_path, fps=30)
                    mp3_track2 = analyze_audio(mp3_path, fps=30)
                    self.assertEqual(mp3_track1, mp3_track2)
                    self.assertGreater(len(mp3_track1["frames"]), 100)
                    self.assertTrue(any(f["is_speech"] for f in mp3_track1["frames"]))


if __name__ == "__main__":
    unittest.main()
