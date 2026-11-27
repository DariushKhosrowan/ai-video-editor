"""Unit tests for the offline Python prosody analyzer on synthetic tone/chirp WAV audio."""
from __future__ import annotations

import json
import math
import struct
import tempfile
import unittest
import wave
from pathlib import Path

from khordegir.mascot_lipsync import (
    analyze_prosody,
    derive_prosody_path,
    write_prosody_track,
    write_viseme_track,
)
from khordegir.project import load_project

STUDIO_ROOT = Path(__file__).resolve().parents[1]
DEMO_DIR = STUDIO_ROOT / "examples" / "mascot-demo"


def _write_synthetic_prosody_wav(path: Path, sample_rate: int = 16000) -> None:
    """Synthesize a deterministic 5.2s mono 16-bit WAV with:
    - 0.00..0.45s: silence
    - 0.45..1.35s: quiet 180 Hz steady tone (amp 0.16)
    - 1.35..2.25s: loud 180 Hz steady tone (amp 0.72)
    - 2.25..2.70s: silence pause
    - 2.70..4.20s: upward chirp 120 Hz -> 260 Hz (amp 0.48)
    - 4.20..4.55s: silence
    - 4.55..5.10s: emphasized loud burst at 220 Hz (amp 0.88)
    """
    duration = 5.2
    n_samples = int(duration * sample_rate)
    phase = 0.0
    pcm = bytearray()

    for i in range(n_samples):
        t = i / sample_rate
        if t < 0.45:
            amp, freq = 0.0, 0.0
        elif t < 1.35:
            amp, freq = 0.16, 180.0
        elif t < 2.25:
            amp, freq = 0.72, 180.0
        elif t < 2.70:
            amp, freq = 0.0, 0.0
        elif t < 4.20:
            u = (t - 2.70) / (4.20 - 2.70)
            amp = 0.48
            freq = 120.0 + (260.0 - 120.0) * u
        elif t < 4.55:
            amp, freq = 0.0, 0.0
        else:
            amp, freq = 0.88, 220.0

        if freq > 0.0:
            phase += 2.0 * math.pi * freq / sample_rate
            # Slight 2nd harmonic simulates voiced speech timbre while preserving clear F0
            val = amp * (0.85 * math.sin(phase) + 0.15 * math.sin(2.0 * phase))
        else:
            val = 0.0
        val = max(-0.99, min(0.99, val))
        pcm += struct.pack("<h", int(val * 32767))

    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(bytes(pcm))


class MascotProsodyTests(unittest.TestCase):
    def test_synthetic_tone_and_chirp_prosody_accuracy_and_determinism(self):
        with tempfile.TemporaryDirectory() as tmp:
            wav_path = Path(tmp) / "synthetic_chirp.wav"
            _write_synthetic_prosody_wav(wav_path)

            pro1 = analyze_prosody(wav_path, fps=30)
            pro2 = analyze_prosody(wav_path, fps=30)
            self.assertEqual(
                json.dumps(pro1, sort_keys=True),
                json.dumps(pro2, sort_keys=True),
                "Prosody analyzer must be 100% deterministic",
            )

            self.assertEqual(pro1["fps"], 30)
            self.assertGreater(len(pro1["frames"]), 140)
            self.assertGreater(pro1["median_f0_hz"], 100.0)

            def window_frames(t0: float, t1: float):
                return [f for f in pro1["frames"] if t0 <= f["t"] <= t1]

            # 1. Silence vs quiet vs loud vs emphasis loudness/RMS/dB monotonicity
            sil = window_frames(0.05, 0.35)
            quiet = window_frames(0.65, 1.15)
            loud = window_frames(1.55, 2.05)
            burst = window_frames(4.70, 5.00)

            mean_rms = lambda arr: sum(f["rms"] for f in arr) / len(arr)
            mean_db = lambda arr: sum(f["db"] for f in arr) / len(arr)
            mean_loud = lambda arr: sum(f["loudness"] for f in arr) / len(arr)

            self.assertLess(mean_rms(sil), mean_rms(quiet))
            self.assertLess(mean_rms(quiet), mean_rms(loud))
            self.assertLess(mean_rms(loud), mean_rms(burst))
            self.assertLess(mean_db(sil), mean_db(quiet))
            self.assertLess(mean_db(quiet), mean_db(loud))
            self.assertLess(mean_loud(sil), mean_loud(quiet))
            self.assertLess(mean_loud(quiet), mean_loud(loud))

            self.assertTrue(all(not f["is_speaking"] and f["is_pause"] for f in sil))
            self.assertTrue(all(f["is_speaking"] and not f["is_pause"] for f in loud))

            # 2. Steady 180 Hz tone F0 accuracy via YIN
            steady_f0s = [f["f0_hz"] for f in loud if f["f0_hz"] > 0]
            self.assertGreater(len(steady_f0s), 8)
            avg_steady = sum(steady_f0s) / len(steady_f0s)
            self.assertAlmostEqual(avg_steady, 180.0, delta=4.5)

            # 3. Upward chirp 120 -> 260 Hz tracked monotonically
            chirp_early = [f["f0_hz"] for f in window_frames(2.85, 3.10) if f["f0_hz"] > 0]
            chirp_mid = [f["f0_hz"] for f in window_frames(3.35, 3.60) if f["f0_hz"] > 0]
            chirp_late = [f["f0_hz"] for f in window_frames(3.85, 4.10) if f["f0_hz"] > 0]
            self.assertTrue(chirp_early and chirp_mid and chirp_late)
            f0_e = sum(chirp_early) / len(chirp_early)
            f0_m = sum(chirp_mid) / len(chirp_mid)
            f0_l = sum(chirp_late) / len(chirp_late)
            self.assertLess(f0_e, f0_m - 20.0)
            self.assertLess(f0_m, f0_l - 20.0)

            # Pitch delta across chirp is positive on average, and pitch_norm crosses median
            chirp_frames = window_frames(2.85, 4.10)
            self.assertGreater(sum(f["pitch_delta"] for f in chirp_frames), 0.0)
            early_norm = sum(f["pitch_norm"] for f in window_frames(2.85, 3.10)) / len(window_frames(2.85, 3.10))
            late_norm = sum(f["pitch_norm"] for f in window_frames(3.85, 4.10)) / len(window_frames(3.85, 4.10))
            self.assertLess(early_norm, 0.0)
            self.assertGreater(late_norm, 0.0)

            # 4. Pauses, phrases, and emphasis peaks detected
            self.assertGreaterEqual(len(pro1["pauses"]), 2)
            self.assertGreaterEqual(len(pro1["phrases"]), 2)
            self.assertGreaterEqual(len(pro1["peaks"]), 1)

    def test_write_viseme_track_emits_sibling_prosody_json(self):
        with tempfile.TemporaryDirectory() as tmp:
            wav_path = Path(tmp) / "narration.wav"
            _write_synthetic_prosody_wav(wav_path)
            vis_out = Path(tmp) / "narration.visemes.json"
            expected_pro = derive_prosody_path(vis_out)
            self.assertEqual(expected_pro.name, "narration.prosody.json")

            write_viseme_track(wav_path, vis_out, fps=30)
            self.assertTrue(vis_out.exists())
            self.assertTrue(expected_pro.exists())

            pro_data = json.loads(expected_pro.read_text(encoding="utf-8"))
            self.assertIn("frames", pro_data)
            self.assertIn("median_f0_hz", pro_data)
            self.assertIn("pauses", pro_data)

            # Explicit standalone writer matches byte-for-byte
            pro_direct = Path(tmp) / "direct.prosody.json"
            write_prosody_track(wav_path, pro_direct, fps=30)
            self.assertEqual(
                expected_pro.read_text(encoding="utf-8"),
                pro_direct.read_text(encoding="utf-8"),
            )

    def test_demo_project_loads_prosody_track_and_tone_config(self):
        proj = load_project(DEMO_DIR)
        s0 = proj["slides"][0]
        self.assertIn("prosodyTrack", s0)
        self.assertGreater(len(s0["prosodyTrack"]["frames"]), 100)
        self.assertEqual(s0["mascot"]["tone"]["preset"], "lively")
        s1 = proj["slides"][1]
        self.assertEqual(s1["mascot"]["tone"]["preset"], "dramatic")
        self.assertIn("prosodyTrack", s1["mascot"])


if __name__ == "__main__":
    unittest.main()
