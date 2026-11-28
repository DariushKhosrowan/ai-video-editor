"""Phase 3 tests: Offline Persian+English phoneme alignment, coarticulation smoothing,
Speaker Calibration Wizard (10s WAV + CLI), and Schema v2 calibration/live normalization.
"""

from __future__ import annotations

import json
import math
import struct
import tempfile
import unittest
import wave
from pathlib import Path

from khordegir.cli import main as cli_main
from khordegir.mascot_lipsync import (
    analyze_prosody_samples,
    analyze_samples,
    calibrate_speaker_samples,
)
from khordegir.phoneme_align import (
    apply_coarticulation,
    english_word_to_phonemes,
    persian_word_to_phonemes,
    phoneme_to_rhubarb,
    phoneme_to_viseme,
    text_to_phonemes,
)
from khordegir.puppet_schema import normalize_puppet_config


def _make_speaker_calibration_samples(sr: int = 16000, duration_s: float = 10.0) -> list[float]:
    """Deterministic 10s synthetic speaker recording:
    - Quiet room noise floor (~ -52 dB) during pauses
    - Voiced speech bursts with F0 sweeping 170 -> 255 Hz (median ~210 Hz)
    """
    n = int(sr * duration_s)
    out = [0.0] * n
    phase = 0.0
    for i in range(n):
        t = i / float(sr)
        # Deterministic low-level room floor (~0.0025 => ~ -52 dB)
        floor = 0.0022 * math.sin(2.0 * math.pi * 60.0 * t) + 0.0012 * math.sin(2.0 * math.pi * 1117.0 * t)
        # Speech active in [1.0..5.0] (2 full cycles) and [6.0..8.0] (1 full cycle) -> true median F0 == 210.0 Hz
        in_speech = (1.0 <= t <= 5.0) or (6.0 <= t <= 8.0)
        if in_speech:
            f0 = 210.0 + 40.0 * math.sin(2.0 * math.pi * 0.5 * t)
            amp = 0.16 + 0.14 * (0.5 + 0.5 * math.sin(2.0 * math.pi * 1.5 * t))
            phase += 2.0 * math.pi * f0 / float(sr)
            sig = amp * (0.65 * math.sin(phase) + 0.25 * math.sin(2.0 * phase) + 0.10 * math.sin(3.0 * phase))
            out[i] = max(-0.98, min(0.98, sig + floor))
        else:
            out[i] = floor
    return out


def _write_wav(path: Path, samples: list[float], sr: int = 16000) -> None:
    ints = [max(-32767, min(32767, int(round(s * 32767.0)))) for s in samples]
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(struct.pack(f"<{len(ints)}h", *ints))


class TestPhase3VoiceAndCalibration(unittest.TestCase):
    def test_persian_and_english_g2p_and_phoneme_maps(self) -> None:
        # Persian dictionary & contextual rules
        p_salam = persian_word_to_phonemes("سلام")
        self.assertEqual(p_salam, ["S", "AE", "L", "AA", "M"])
        self.assertEqual(phoneme_to_viseme("M"), "closed")
        self.assertEqual(phoneme_to_rhubarb("M"), "A")

        # Contextual Persian و: initial -> V (f_v), medial/final -> UW (round_o)
        p_var = persian_word_to_phonemes("ورزش")
        self.assertEqual(p_var[0], "V")
        self.assertEqual(phoneme_to_viseme(p_var[0]), "f_v")
        p_dost = persian_word_to_phonemes("دوست")
        self.assertIn("UW", p_dost)
        self.assertEqual(phoneme_to_viseme("UW"), "round_o")

        # English digraphs, exceptions, silent-e
        e_phone = english_word_to_phonemes("phone")
        self.assertEqual(e_phone[0], "F")
        self.assertIn("OW", e_phone)
        e_thought = english_word_to_phonemes("thought")
        self.assertEqual(e_thought[0], "TH")

        # Mixed Persian + English text with script tags stripped cleanly
        seq = text_to_phonemes("[smug] سلام Red Eagle! [point]")
        phonemes = [item["phoneme"] for item in seq]
        self.assertIn("S", phonemes)
        self.assertIn("M", phonemes)
        self.assertIn("IY", phonemes)
        self.assertIn("SIL", phonemes)
        # Script tag text must never become spoken phonemes
        self.assertFalse(any(item["word"].lower() in ("smug", "point") for item in seq))

    def test_viterbi_phoneme_alignment_and_coarticulation_deterministic(self) -> None:
        sr = 16000
        samples = _make_speaker_calibration_samples(sr=sr, duration_s=4.5)
        narration = "سلام! به خرده‌گیر استودیو خوش آمدید. Red Eagle speaks with smooth coarticulation."

        t1 = analyze_samples(samples, sample_rate=sr, fps=30, text=narration, coarticulation=True)
        t2 = analyze_samples(samples, sample_rate=sr, fps=30, text=narration, coarticulation=True)
        self.assertEqual(t1, t2)
        self.assertEqual(t1["version"], 1)
        self.assertEqual(t1["phoneme_version"], 2)
        self.assertEqual(t1["source"], "phoneme+audio")
        self.assertTrue(t1["coarticulated"])

        # Speech frames emit phoneme, rhubarb, teeth, lip_tuck, tongue
        speech_frames = [f for f in t1["frames"] if f["is_speech"]]
        self.assertGreater(len(speech_frames), 30)
        for f in speech_frames:
            self.assertIn("phoneme", f)
            self.assertIn("rhubarb", f)
            self.assertIn("teeth", f)
            self.assertIn("lip_tuck", f)
            self.assertIn("tongue", f)

        # Leading silence stays shut cleanly
        self.assertEqual(t1["frames"][2]["openness"], 0.0)
        self.assertFalse(t1["frames"][2]["is_speech"])

    def test_coarticulation_anticipates_round_o_and_preserves_bilabial_closure(self) -> None:
        raw_frames = [
            {"t": 0.00, "viseme": "small",   "phoneme": "T",  "energy": 0.5, "openness": 0.24, "width": 0.96, "is_speech": True},
            {"t": 0.03, "viseme": "small",   "phoneme": "L",  "energy": 0.5, "openness": 0.24, "width": 0.96, "is_speech": True},
            {"t": 0.06, "viseme": "round_o", "phoneme": "OW", "energy": 0.7, "openness": 0.52, "width": 0.72, "is_speech": True},
            {"t": 0.10, "viseme": "closed",  "phoneme": "M",  "energy": 0.4, "openness": 0.00, "width": 1.00, "is_speech": True},
            {"t": 0.13, "viseme": "wide",    "phoneme": "AA", "energy": 0.8, "openness": 0.88, "width": 1.12, "is_speech": True},
        ]
        sm = apply_coarticulation(raw_frames)
        # Frame 1 (before round_o) must anticipate lip narrowing (< 0.96)
        self.assertLess(sm[1]["width"], 0.93)
        # Frame 3 (bilabial M between round_o and wide) must preserve crisp closure (<= 0.04)
        self.assertLessEqual(sm[3]["openness"], 0.04)
        self.assertEqual(sm[3]["teeth"], 0.0)

    def test_speaker_calibration_10s_wizard_and_cli_and_prosody_integration(self) -> None:
        sr = 16000
        samples = _make_speaker_calibration_samples(sr=sr, duration_s=10.0)
        cal1 = calibrate_speaker_samples(samples, sample_rate=sr, fps=30)
        cal2 = calibrate_speaker_samples(samples, sample_rate=sr, fps=30)
        self.assertEqual(cal1, cal2)

        # Synthetic speaker sweeps around 210 Hz; room noise floor around -52 dB
        self.assertAlmostEqual(cal1["medianF0Hz"], 210.0, delta=12.0)
        self.assertGreater(cal1["noiseGateDb"], cal1["noiseFloorDb"])
        self.assertLess(cal1["noiseGateDb"], cal1["loudnessMaxDb"] - 6.0)
        self.assertGreater(cal1["loudnessMaxDb"], cal1["loudnessMinDb"])
        self.assertIn(cal1["recommendedPreset"], ("calm", "lively", "dramatic"))

        # Prosody analyzer honors calibrated medianF0Hz & noiseGateDb
        pro = analyze_prosody_samples(samples, sample_rate=sr, fps=30, calibration=cal1)
        self.assertAlmostEqual(pro["median_f0_hz"], cal1["medianF0Hz"], places=2)

        # CLI `khordegir calibrate` + `khordegir lipsync --text --calibration`
        with tempfile.TemporaryDirectory() as td:
            wav_p = Path(td) / "cal10s.wav"
            cal_p = Path(td) / "speaker.calibration.json"
            vis_p = Path(td) / "out.visemes.json"
            _write_wav(wav_p, samples, sr=sr)

            rc_cal = cli_main(["calibrate", str(wav_p), "-o", str(cal_p)])
            self.assertEqual(rc_cal, 0)
            cal_disk = json.loads(cal_p.read_text(encoding="utf-8"))
            self.assertAlmostEqual(cal_disk["medianF0Hz"], cal1["medianF0Hz"], delta=1.5)

            rc_lip = cli_main([
                "lipsync", str(wav_p),
                "-o", str(vis_p),
                "--text", "سلام عقاب قرمز! Red Eagle live test.",
                "--calibration", str(cal_p),
            ])
            self.assertEqual(rc_lip, 0)
            vis_disk = json.loads(vis_p.read_text(encoding="utf-8"))
            self.assertEqual(vis_disk["source"], "phoneme+audio")
            self.assertTrue(vis_disk["coarticulated"])

    def test_puppet_schema_v2_calibration_and_live_fields(self) -> None:
        cfg = normalize_puppet_config({
            "preset": "lively",
            "calibration": {"medianF0Hz": 195.5, "noiseGateDb": -41.0, "pitchSpanSemitones": 7.2},
            "live": {"noiseSuppression": True, "pushToTalk": True, "pttKey": "Space"},
        })
        self.assertTrue(cfg["calibration"]["calibrated"])
        self.assertEqual(cfg["calibration"]["medianF0Hz"], 195.5)
        self.assertEqual(cfg["calibration"]["noiseGateDb"], -41.0)
        self.assertTrue(cfg["live"]["pushToTalk"])
        self.assertTrue(cfg["live"]["noiseSuppression"])


if __name__ == "__main__":
    unittest.main()
