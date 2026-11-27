"""Offline deterministic audio-to-viseme analyzer for Khordegir Studio Red Eagle mascot.

Zero cloud / zero API keys / pure Python stdlib (+ ffmpeg CLI for non-WAV formats).
Algorithm:
  - Resample/decode audio to mono 16 kHz PCM s16le (stdlib wave for WAV; ffmpeg fallback for MP3/M4A/OGG).
  - Frame-exact Hann window + Radix-2 Cooley-Tukey FFT at `fps` (default 30 fps).
  - Extract RMS loudness envelope, zero-crossing rate (ZCR), spectral centroid, and low/mid/high band ratios.
  - Smooth loudness with asymmetric attack/release envelope.
  - Gate silence to `rest`/`closed` so beak shuts cleanly during pauses.
  - Optional transcript/phoneme timing override (`segments` / `words` / `phonemes` JSON).
  - Map acoustic features or phonemes to 8 visemes (`closed`, `rest`, `small`, `open`, `wide`, `round_o`, `e_teeth`, `f_v`).
  - Enforce minimum hold frames (`min_hold_frames >= 2`) so shapes remain readable.
  - Detect emphasis peaks (`peaks`) and long continuous speech spans (`phrases`) for blinks, brows, and wing gestures.
"""

from __future__ import annotations

import cmath
import json
import math
import shutil
import statistics
import struct
import subprocess
import wave
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

from .phoneme_align import (
    PHONEME_TABLE,
    VISEME_TO_RHUBARB,
    align_phonemes_viterbi,
    apply_coarticulation,
    normalize_phoneme_token,
    phoneme_to_rhubarb,
    phoneme_to_viseme,
    text_to_phonemes,
)

try:
    import numpy as _np  # type: ignore
except ImportError:
    _np = None

TARGET_SAMPLE_RATE = 16000
FFT_SIZE = 512
PROSODY_WINDOW = 1024
YIN_MIN_F0_HZ = 65.0
YIN_MAX_F0_HZ = 500.0
YIN_THRESHOLD = 0.16

VISEME_SPECS: Dict[str, Dict[str, float]] = {
    "closed":  {"openness": 0.00, "width": 1.00},
    "rest":    {"openness": 0.03, "width": 1.00},
    "small":   {"openness": 0.24, "width": 0.96},
    "open":    {"openness": 0.56, "width": 1.02},
    "wide":    {"openness": 0.88, "width": 1.12},
    "round_o": {"openness": 0.52, "width": 0.72},
    "e_teeth": {"openness": 0.28, "width": 1.16},
    "f_v":     {"openness": 0.14, "width": 1.02},
}


def _fft_radix2(x: Sequence[complex]) -> List[complex]:
    """Iterative Cooley-Tukey Radix-2 FFT (power-of-two length)."""
    n = len(x)
    if n <= 1:
        return list(x)
    bits = n.bit_length() - 1
    out = [complex(0.0, 0.0)] * n
    for i in range(n):
        rev = 0
        tmp = i
        for _ in range(bits):
            rev = (rev << 1) | (tmp & 1)
            tmp >>= 1
        out[rev] = complex(x[i])

    size = 2
    while size <= n:
        half = size // 2
        step = -2.0 * math.pi / size
        w_step = cmath.exp(1j * step)
        for start in range(0, n, size):
            w = 1.0 + 0j
            for j in range(half):
                u = out[start + j]
                v = out[start + j + half] * w
                out[start + j] = u + v
                out[start + j + half] = u - v
                w *= w_step
        size <<= 1
    return out


_HANN_512 = [0.5 * (1.0 - math.cos(2.0 * math.pi * i / (FFT_SIZE - 1))) for i in range(FFT_SIZE)]


def load_audio_mono_16k(audio_path: str | Path) -> Tuple[List[float], int]:
    """Decode WAV natively via stdlib wave (or any format via ffmpeg) into float [-1, 1] at 16 kHz."""
    path = Path(audio_path)
    if not path.exists():
        raise FileNotFoundError(f"Audio file not found: {path}")

    if path.suffix.lower() == ".wav":
        try:
            with wave.open(str(path), "rb") as wf:
                channels = wf.getnchannels()
                sampwidth = wf.getsampwidth()
                sr = wf.getframerate()
                nframes = wf.getnframes()
                raw = wf.readframes(nframes)
            if sampwidth in (1, 2, 4) and sr > 0:
                samples: List[float] = []
                if sampwidth == 2:
                    total = len(raw) // 2
                    ints = struct.unpack(f"<{total}h", raw)
                    for i in range(0, total, channels):
                        acc = sum(ints[i + c] for c in range(channels))
                        samples.append((acc / channels) / 32768.0)
                elif sampwidth == 1:
                    for i in range(0, len(raw), channels):
                        acc = sum((raw[i + c] - 128) for c in range(channels))
                        samples.append((acc / channels) / 128.0)
                else:
                    total = len(raw) // 4
                    ints = struct.unpack(f"<{total}i", raw)
                    for i in range(0, total, channels):
                        acc = sum(ints[i + c] for c in range(channels))
                        samples.append((acc / channels) / 2147483648.0)
                if sr != TARGET_SAMPLE_RATE and samples:
                    new_len = max(1, int(round(len(samples) * TARGET_SAMPLE_RATE / sr)))
                    resampled: List[float] = []
                    scale = (len(samples) - 1) / max(1, new_len - 1) if new_len > 1 else 0.0
                    for i in range(new_len):
                        pos = i * scale
                        i0 = int(pos)
                        i1 = min(len(samples) - 1, i0 + 1)
                        frac = pos - i0
                        resampled.append(samples[i0] * (1.0 - frac) + samples[i1] * frac)
                    samples = resampled
                return samples, TARGET_SAMPLE_RATE
        except wave.Error:
            pass

    ffmpeg_bin = shutil.which("ffmpeg")
    if not ffmpeg_bin:
        raise RuntimeError(f"ffmpeg is required to decode non-PCM/compressed audio: {path}")

    cmd = [
        ffmpeg_bin,
        "-v", "error",
        "-i", str(path),
        "-ac", "1",
        "-ar", str(TARGET_SAMPLE_RATE),
        "-f", "s16le",
        "pipe:1",
    ]
    proc = subprocess.run(cmd, capture_output=True, check=False)
    if proc.returncode != 0:
        err = proc.stderr.decode("utf-8", errors="replace").strip()
        raise RuntimeError(f"ffmpeg failed decoding {path}: {err}")

    raw = proc.stdout
    total = len(raw) // 2
    ints = struct.unpack(f"<{total}h", raw)
    samples = [v / 32768.0 for v in ints]
    return samples, TARGET_SAMPLE_RATE


def _phoneme_to_viseme(token: str) -> Optional[str]:
    raw = str(token or "").strip()
    if not raw:
        return None
    low = raw.lower()
    if low in VISEME_SPECS:
        return low
    return phoneme_to_viseme(raw)


def _parse_transcript_cues(transcript: Any) -> List[Dict[str, Any]]:
    """Extract sorted timed phoneme/viseme cues from optional transcript JSON ({phonemes|words|segments})."""
    if not transcript:
        return []
    cues: List[Dict[str, Any]] = []

    def _expand_word_to_cues(txt: str, st: float, en: float) -> None:
        if not txt or en <= st:
            return
        phs = text_to_phonemes(txt)
        if not phs:
            return
        total_w = sum(max(0.25, float(p.get("weight", 1.0))) for p in phs)
        cur_t = st
        dur = en - st
        for p in phs:
            w = max(0.25, float(p.get("weight", 1.0)))
            nxt_t = cur_t + dur * (w / total_w)
            cues.append({
                "start": cur_t,
                "end": nxt_t,
                "viseme": p["viseme"],
                "phoneme": p["phoneme"],
                "rhubarb": p["rhubarb"],
            })
            cur_t = nxt_t

    if isinstance(transcript, dict):
        if isinstance(transcript.get("phonemes"), list):
            for p in transcript["phonemes"]:
                if isinstance(p, dict):
                    st = float(p.get("start", p.get("t", 0.0)))
                    en = float(p.get("end", st + float(p.get("duration", 0.09))))
                    tok = str(p.get("viseme") or p.get("phoneme") or p.get("label") or "")
                    ph = normalize_phoneme_token(tok)
                    vis = _phoneme_to_viseme(tok)
                    if vis:
                        cues.append({"start": st, "end": en, "viseme": vis, "phoneme": ph, "rhubarb": phoneme_to_rhubarb(ph)})
        for seg in transcript.get("segments", []) or []:
            if not isinstance(seg, dict):
                continue
            for w in seg.get("words", []) or []:
                if isinstance(w, dict) and ("start" in w or "t" in w):
                    st = float(w.get("start", w.get("t", 0.0)))
                    en = float(w.get("end", st + 0.25))
                    txt = str(w.get("word") or w.get("text") or "").strip()
                    _expand_word_to_cues(txt, st, en)
            if not seg.get("words") and ("start" in seg and "end" in seg):
                st = float(seg["start"])
                en = float(seg["end"])
                txt = str(seg.get("text") or "").strip()
                _expand_word_to_cues(txt, st, en)
        for w in transcript.get("words", []) or []:
            if isinstance(w, dict) and ("start" in w or "t" in w):
                st = float(w.get("start", w.get("t", 0.0)))
                en = float(w.get("end", st + 0.25))
                txt = str(w.get("word") or w.get("text") or "").strip()
                _expand_word_to_cues(txt, st, en)
    elif isinstance(transcript, list):
        for item in transcript:
            if isinstance(item, dict) and ("start" in item or "t" in item):
                st = float(item.get("start", item.get("t", 0.0)))
                en = float(item.get("end", st + float(item.get("duration", 0.1))))
                tok = str(item.get("viseme") or item.get("phoneme") or item.get("text") or "")
                ph = normalize_phoneme_token(tok)
                vis = _phoneme_to_viseme(tok)
                if vis:
                    cues.append({"start": st, "end": en, "viseme": vis, "phoneme": ph, "rhubarb": phoneme_to_rhubarb(ph)})
    cues.sort(key=lambda c: c["start"])
    return cues


def analyze_samples(
    samples: Sequence[float],
    sample_rate: int = TARGET_SAMPLE_RATE,
    fps: int = 30,
    transcript: Any = None,
    text: Optional[str] = None,
    min_hold_frames: int = 2,
    attack_ms: float = 35.0,
    release_ms: float = 95.0,
    silence_db: float = -44.0,
    coarticulation: bool = True,
    calibration: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Analyze mono PCM samples into a deterministic per-frame viseme track (v2 with phoneme alignment + coarticulation)."""
    fps = max(1, int(fps))
    min_hold_frames = max(1, int(min_hold_frames))
    if isinstance(calibration, dict) and calibration.get("noiseGateDb") is not None:
        silence_db = max(-68.0, min(-22.0, float(calibration["noiseGateDb"])))
    n_samples = len(samples)
    duration = n_samples / float(sample_rate) if n_samples > 0 else 0.0
    total_frames = max(1, int(round(duration * fps)))
    cues = _parse_transcript_cues(transcript)
    text_phonemes = text_to_phonemes(text or "") if (text and not cues) else []

    if n_samples == 0:
        frames = [
            {
                "t": round(i / fps, 4),
                "viseme": "rest",
                "energy": 0.0,
                "openness": 0.0,
                "width": 1.0,
                "stress": 0.0,
                "is_speech": False,
            }
            for i in range(total_frames)
        ]
        return {
            "version": 1,
            "fps": fps,
            "duration": round(duration, 4),
            "source": "silence",
            "frames": frames,
            "peaks": [],
            "phrases": [],
        }

    # First pass: compute raw acoustic features per frame
    raw_rms: List[float] = []
    raw_zcr: List[float] = []
    raw_centroid: List[float] = []
    raw_low_ratio: List[float] = []
    raw_mid_ratio: List[float] = []
    raw_high_ratio: List[float] = []

    half_win = FFT_SIZE // 2
    freq_step = sample_rate / float(FFT_SIZE)

    for i in range(total_frames):
        center = int(round((i / float(fps)) * sample_rate))
        start = center - half_win
        buf = [0.0] * FFT_SIZE
        sq_sum = 0.0
        zc = 0
        prev_s = 0.0
        for k in range(FFT_SIZE):
            idx = start + k
            s = float(samples[idx]) if 0 <= idx < n_samples else 0.0
            sq_sum += s * s
            if k > 0 and ((s >= 0.0 and prev_s < 0.0) or (s < 0.0 and prev_s >= 0.0)):
                zc += 1
            prev_s = s
            buf[k] = s * _HANN_512[k]

        rms = math.sqrt(sq_sum / float(FFT_SIZE))
        zcr = zc / float(FFT_SIZE - 1)
        spec = _fft_radix2(buf)

        num = 0.0
        den = 0.0
        e_low = 0.0
        e_mid = 0.0
        e_high = 0.0
        for bin_idx in range(1, FFT_SIZE // 2):
            freq = bin_idx * freq_step
            mag = abs(spec[bin_idx])
            mag2 = mag * mag
            num += freq * mag
            den += mag
            if 75.0 <= freq < 480.0:
                e_low += mag2
            elif 480.0 <= freq < 1850.0:
                e_mid += mag2
            elif 1850.0 <= freq <= 7200.0:
                e_high += mag2

        tot_band = e_low + e_mid + e_high + 1e-12
        centroid = (num / den) if den > 1e-9 else 0.0

        raw_rms.append(rms)
        raw_zcr.append(zcr)
        raw_centroid.append(centroid)
        raw_low_ratio.append(e_low / tot_band)
        raw_mid_ratio.append(e_mid / tot_band)
        raw_high_ratio.append(e_high / tot_band)

    # Adaptive normalization (95th percentile RMS so tracks with varying gain still articulate cleanly)
    sorted_rms = sorted(raw_rms)
    p95 = sorted_rms[min(len(sorted_rms) - 1, int(0.95 * len(sorted_rms)))]
    ref_peak = max(p95, 1e-4)
    silence_amp = 10.0 ** (silence_db / 20.0)

    # Asymmetric attack/release smoothing on energy envelope
    dt_ms = 1000.0 / float(fps)
    atk_a = 1.0 - math.exp(-dt_ms / max(5.0, attack_ms))
    rel_a = 1.0 - math.exp(-dt_ms / max(5.0, release_ms))

    smoothed_energy: List[float] = []
    env = 0.0
    for r_val in raw_rms:
        db = 20.0 * math.log10(max(r_val, 1e-7))
        if r_val < silence_amp or db < silence_db:
            norm = 0.0
        else:
            norm = min(1.0, max(0.0, r_val / ref_peak))
        coeff = atk_a if norm >= env else rel_a
        env = env + coeff * (norm - env)
        smoothed_energy.append(env)

    # Emphasis peaks & continuous phrase spans
    peaks: List[Dict[str, float]] = []
    last_peak_t = -99.0
    for i in range(1, total_frames - 1):
        e = smoothed_energy[i]
        if e >= 0.56 and e >= smoothed_energy[i - 1] and e >= smoothed_energy[i + 1]:
            t = i / float(fps)
            if t - last_peak_t >= 0.45:
                peaks.append({"t": round(t, 3), "strength": round(min(1.0, e), 3)})
                last_peak_t = t

    phrases: List[Dict[str, float]] = []
    ph_start: Optional[float] = None
    for i, e in enumerate(smoothed_energy):
        t = i / float(fps)
        active = e >= 0.065
        if active and ph_start is None:
            ph_start = t
        elif not active and ph_start is not None:
            if t - ph_start >= 0.35:
                phrases.append({"start": round(ph_start, 3), "end": round(t, 3)})
            ph_start = None
    if ph_start is not None:
        end_t = total_frames / float(fps)
        if end_t - ph_start >= 0.35:
            phrases.append({"start": round(ph_start, 3), "end": round(end_t, 3)})

    # Optional offline Viterbi phoneme-level forced alignment when narration text is supplied
    aligned_phonemes: List[Optional[Dict[str, Any]]] = [None] * total_frames
    if text_phonemes:
        frame_feats = [
            {
                "energy": smoothed_energy[i],
                "zcr": raw_zcr[i],
                "centroid": raw_centroid[i],
                "low_r": raw_low_ratio[i],
                "mid_r": raw_mid_ratio[i],
                "high_r": raw_high_ratio[i],
            }
            for i in range(total_frames)
        ]
        # Align across active speech span [first_speech, last_speech] so leading/trailing silence stays shut
        speech_indices = [i for i, e in enumerate(smoothed_energy) if e >= 0.045]
        if speech_indices:
            s_start = speech_indices[0]
            s_end = speech_indices[-1] + 1
            viterbi_res = align_phonemes_viterbi(text_phonemes, frame_feats, s_start, s_end)
            for idx_off, item in enumerate(viterbi_res):
                aligned_phonemes[s_start + idx_off] = item

    # Map frames to visemes with optional transcript/Viterbi override & minimum hold-frame stability
    cue_idx = 0
    raw_visemes: List[str] = []
    raw_phonemes: List[str] = []
    for i in range(total_frames):
        t = i / float(fps)
        e = smoothed_energy[i]
        if e < 0.045:
            was_talking = i > 0 and smoothed_energy[i - 1] >= 0.045
            raw_visemes.append("closed" if was_talking else "rest")
            raw_phonemes.append("SP" if was_talking else "SIL")
            continue

        # 1. Explicit timed transcript / phoneme cues
        cue_vis: Optional[str] = None
        cue_ph: Optional[str] = None
        if cues:
            while cue_idx < len(cues) and cues[cue_idx]["end"] < t:
                cue_idx += 1
            if cue_idx < len(cues) and cues[cue_idx]["start"] <= t <= cues[cue_idx]["end"]:
                cue_vis = cues[cue_idx]["viseme"]
                cue_ph = cues[cue_idx].get("phoneme")

        if cue_vis:
            raw_visemes.append(cue_vis)
            raw_phonemes.append(cue_ph or normalize_phoneme_token(cue_vis))
            continue

        # 2. Offline Viterbi phoneme forced alignment from Persian/English narration text
        if aligned_phonemes[i] is not None:
            ap = aligned_phonemes[i]
            raw_visemes.append(ap["viseme"])
            raw_phonemes.append(ap["phoneme"])
            continue

        zcr = raw_zcr[i]
        cent = raw_centroid[i]
        low_r = raw_low_ratio[i]
        high_r = raw_high_ratio[i]

        # 3. Acoustic -> 8-viseme fallback classification
        if zcr > 0.22 and high_r > 0.30 and e < 0.55:
            raw_visemes.append("f_v"); raw_phonemes.append("F")
        elif cent >= 1750.0 and high_r >= 0.16 and e >= 0.14:
            raw_visemes.append("e_teeth"); raw_phonemes.append("IY")
        elif low_r >= 0.56 and cent <= 950.0 and e >= 0.22:
            raw_visemes.append("round_o"); raw_phonemes.append("OW")
        elif e >= 0.64:
            raw_visemes.append("wide"); raw_phonemes.append("AA")
        elif e >= 0.34:
            raw_visemes.append("open"); raw_phonemes.append("EH")
        elif e >= 0.10:
            raw_visemes.append("small"); raw_phonemes.append("T")
        else:
            raw_visemes.append("closed"); raw_phonemes.append("M")

    # Enforce min_hold_frames for readable animation (never hold silence open; allow immediate snap to closed/rest)
    held_visemes: List[str] = []
    held_phonemes: List[str] = []
    cur_vis = raw_visemes[0]
    cur_ph = raw_phonemes[0]
    hold_count = 1
    for i, cand in enumerate(raw_visemes):
        cand_ph = raw_phonemes[i]
        if i == 0:
            held_visemes.append(cur_vis)
            held_phonemes.append(cur_ph)
            continue
        is_silence = smoothed_energy[i] < 0.045
        if is_silence:
            cur_vis = cand
            cur_ph = cand_ph
            hold_count = min_hold_frames
        elif cand != cur_vis:
            if hold_count >= min_hold_frames:
                cur_vis = cand
                cur_ph = cand_ph
                hold_count = 1
            else:
                hold_count += 1
        else:
            cur_ph = cand_ph
            hold_count += 1
        held_visemes.append(cur_vis)
        held_phonemes.append(cur_ph)

    frames: List[Dict[str, Any]] = []
    for i in range(total_frames):
        t = i / float(fps)
        e = smoothed_energy[i]
        vis = held_visemes[i]
        ph = held_phonemes[i]
        spec = VISEME_SPECS.get(vis, VISEME_SPECS["rest"])
        is_speech = e >= 0.045 and vis not in ("rest",)
        stress = 0.0
        for pk in peaks:
            dt = abs(t - pk["t"])
            if dt < 0.18:
                stress = max(stress, pk["strength"] * (1.0 - dt / 0.18))

        openness = 0.0 if not is_speech else min(1.0, spec["openness"] * (0.55 + 0.65 * e))
        frames.append({
            "t": round(t, 4),
            "viseme": vis,
            "phoneme": ph,
            "rhubarb": VISEME_TO_RHUBARB.get(vis, "X"),
            "energy": round(e, 3),
            "openness": round(openness, 3),
            "width": round(spec["width"], 3),
            "stress": round(stress, 3),
            "is_speech": bool(is_speech),
        })

    if coarticulation:
        frames = apply_coarticulation(frames)

    source_kind = "transcript+audio" if cues else ("phoneme+audio" if text_phonemes else "audio")
    return {
        "version": 1,
        "phoneme_version": 2,
        "fps": fps,
        "duration": round(duration, 4),
        "source": source_kind,
        "coarticulated": bool(coarticulation),
        "frames": frames,
        "peaks": peaks,
        "phrases": phrases,
    }


def _yin_pitch_frame(
    frame: Sequence[float],
    sample_rate: int = TARGET_SAMPLE_RATE,
    f0_min: float = YIN_MIN_F0_HZ,
    f0_max: float = YIN_MAX_F0_HZ,
    threshold: float = YIN_THRESHOLD,
) -> Tuple[float, float]:
    """Deterministic YIN F0 estimator (de Cheveigne & Kawahara, 2002).

    Uses vectorized numpy when installed, or an identical-math FFT-accelerated
    pure-Python fallback so offline environments with zero external deps still
    run fast and deterministically.
    Returns (f0_hz, confidence in [0..1]).
    """
    n = len(frame)
    w = n // 2
    if w < 16:
        return 0.0, 0.0

    tau_min = max(2, int(sample_rate / max(1.0, f0_max)))
    tau_max = min(w - 2, int(sample_rate / max(1.0, f0_min)))
    if tau_max <= tau_min:
        return 0.0, 0.0

    if _np is not None:
        arr = _np.asarray(frame, dtype=_np.float64)
        arr = arr - float(_np.mean(arr))
        if float(_np.dot(arr, arr)) < 1e-10:
            return 0.0, 0.0
        # Difference function d(tau) = sum_{j=0}^{W-1} (x[j] - x[j+tau])^2 via FFT cross-correlation
        fft_len = 1 << (n * 2 - 1).bit_length()
        x0 = _np.zeros(fft_len, dtype=_np.float64)
        x0[:w] = arr[:w]
        x1 = _np.zeros(fft_len, dtype=_np.float64)
        x1[:n] = arr[:n]
        corr = _np.fft.irfft(_np.conj(_np.fft.rfft(x0)) * _np.fft.rfft(x1), n=fft_len)[: tau_max + 1]
        sq = arr * arr
        csum = _np.concatenate(([0.0], _np.cumsum(sq)))
        e0 = float(csum[w])
        taus = _np.arange(0, tau_max + 1)
        e_tau = csum[taus + w] - csum[taus]
        diff_arr = _np.maximum(0.0, e0 + e_tau - 2.0 * corr)
        diff = [float(v) for v in diff_arr]
    else:
        mean = sum(frame) / float(n)
        arr_py = [float(v) - mean for v in frame]
        energy_tot = sum(v * v for v in arr_py)
        if energy_tot < 1e-10:
            return 0.0, 0.0

        # Exact difference function via Radix-2 FFT cross-correlation: O(N log N)
        fft_len = 1 << (n * 2 - 1).bit_length()
        x0_c = [complex(arr_py[i], 0.0) if i < w else 0j for i in range(fft_len)]
        x1_c = [complex(arr_py[i], 0.0) if i < n else 0j for i in range(fft_len)]
        f0 = _fft_radix2(x0_c)
        f1 = _fft_radix2(x1_c)
        # Inverse FFT via conjugate property: ifft(Z) = conj(fft(conj(Z))) / N
        prod_conj = [(f0[k] * f1[k].conjugate()) for k in range(fft_len)]
        corr_c = _fft_radix2(prod_conj)
        inv_n = 1.0 / float(fft_len)

        csum = [0.0] * (n + 1)
        acc = 0.0
        for idx, val in enumerate(arr_py):
            acc += val * val
            csum[idx + 1] = acc
        e0 = csum[w]
        diff = [0.0] * (tau_max + 1)
        for tau in range(1, tau_max + 1):
            e_tau = csum[tau + w] - csum[tau]
            r_tau = corr_c[tau].real * inv_n
            d_val = e0 + e_tau - 2.0 * r_tau
            diff[tau] = d_val if d_val > 0.0 else 0.0

    # Cumulative Mean Normalized Difference Function (CMNDF)
    cmndf = [1.0] * (tau_max + 1)
    running = 0.0
    for tau in range(1, tau_max + 1):
        running += diff[tau]
        cmndf[tau] = (diff[tau] * tau / running) if running > 1e-12 else 1.0

    # Absolute threshold search for first local minimum
    tau_est = -1
    for tau in range(tau_min, tau_max):
        if cmndf[tau] < threshold:
            while tau + 1 < tau_max and cmndf[tau + 1] < cmndf[tau]:
                tau += 1
            tau_est = tau
            break

    if tau_est == -1:
        # Fallback to global minimum inside valid pitch band if clearly periodic
        best_tau = tau_min
        best_val = cmndf[tau_min]
        for tau in range(tau_min + 1, tau_max + 1):
            if cmndf[tau] < best_val:
                best_val = cmndf[tau]
                best_tau = tau
        if best_val > 0.38:
            return 0.0, 0.0
        tau_est = best_tau

    # Parabolic interpolation around tau_est for sub-sample pitch accuracy
    better_tau = float(tau_est)
    if 1 <= tau_est < tau_max:
        s0 = cmndf[tau_est - 1]
        s1 = cmndf[tau_est]
        s2 = cmndf[tau_est + 1]
        denom = s0 - 2.0 * s1 + s2
        if abs(denom) > 1e-12:
            shift = 0.5 * (s0 - s2) / denom
            if abs(shift) <= 1.0:
                better_tau = tau_est + shift

    if better_tau <= 0.0:
        return 0.0, 0.0

    f0_hz = sample_rate / better_tau
    if f0_hz < f0_min or f0_hz > f0_max:
        return 0.0, 0.0

    conf = max(0.0, min(1.0, 1.0 - cmndf[tau_est]))
    return f0_hz, conf


def analyze_prosody_samples(
    samples: Sequence[float],
    sample_rate: int = TARGET_SAMPLE_RATE,
    fps: int = 30,
    attack_ms: float = 35.0,
    release_ms: float = 95.0,
    silence_db: float = -44.0,
    calibration: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Extract deterministic per-frame prosody (RMS, dB, F0 pitch, pitch_delta, speaking/pause, emphasis peaks)."""
    fps = max(1, int(fps))
    cal = calibration if isinstance(calibration, dict) else {}
    if cal.get("noiseGateDb") is not None:
        silence_db = max(-68.0, min(-22.0, float(cal["noiseGateDb"])))
    n_samples = len(samples)
    duration = n_samples / float(sample_rate) if n_samples > 0 else 0.0
    total_frames = max(1, int(round(duration * fps)))

    if n_samples == 0:
        frames = [
            {
                "t": round(i / float(fps), 4),
                "rms": 0.0,
                "db": -80.0,
                "loudness": 0.0,
                "f0_hz": 0.0,
                "pitch_norm": 0.0,
                "pitch_delta": 0.0,
                "pitch_conf": 0.0,
                "is_speaking": False,
                "is_pause": True,
                "emphasis": 0.0,
            }
            for i in range(total_frames)
        ]
        return {
            "version": 1,
            "fps": fps,
            "duration": round(duration, 4),
            "median_f0_hz": 0.0,
            "p95_rms": 0.0,
            "peaks": [],
            "phrases": [],
            "pauses": [{"start": 0.0, "end": round(duration, 3)}] if duration > 0 else [],
            "frames": frames,
        }

    half_win = PROSODY_WINDOW // 2
    silence_amp = 10.0 ** (silence_db / 20.0)

    raw_rms: List[float] = []
    raw_db: List[float] = []
    raw_f0: List[float] = []
    raw_conf: List[float] = []

    for i in range(total_frames):
        center = int(round((i / float(fps)) * sample_rate))
        start = center - half_win
        win = [float(samples[start + k]) if 0 <= (start + k) < n_samples else 0.0 for k in range(PROSODY_WINDOW)]

        sq = 0.0
        for v in win:
            sq += v * v
        rms = math.sqrt(sq / float(PROSODY_WINDOW))
        db = max(-80.0, min(0.0, 20.0 * math.log10(max(rms, 1e-4 if rms > 1e-4 else max(rms, 1e-6)))))
        raw_rms.append(rms)
        raw_db.append(db)

        if rms >= silence_amp and db >= silence_db:
            f0_hz, conf = _yin_pitch_frame(win, sample_rate=sample_rate)
            raw_f0.append(f0_hz)
            raw_conf.append(conf)
        else:
            raw_f0.append(0.0)
            raw_conf.append(0.0)

    # Adaptive loudness normalization + asymmetric attack/release envelope
    sorted_rms = sorted(raw_rms)
    p95 = sorted_rms[min(len(sorted_rms) - 1, int(0.95 * len(sorted_rms)))]
    ref_peak = max(p95, 1e-4)

    dt_ms = 1000.0 / float(fps)
    atk_a = 1.0 - math.exp(-dt_ms / max(5.0, attack_ms))
    rel_a = 1.0 - math.exp(-dt_ms / max(5.0, release_ms))

    loudness_env: List[float] = []
    env = 0.0
    for r_val, db_val in zip(raw_rms, raw_db):
        if r_val < silence_amp or db_val < silence_db:
            norm = 0.0
        else:
            norm = min(1.0, max(0.0, r_val / ref_peak))
        coeff = atk_a if norm >= env else rel_a
        env = env + coeff * (norm - env)
        loudness_env.append(env)

    # 3-frame median filter on voiced F0 to suppress isolated octave glitches cleanly
    clean_f0: List[float] = list(raw_f0)
    for i in range(1, total_frames - 1):
        if raw_f0[i] > 0.0:
            nbrs = [v for v in (raw_f0[i - 1], raw_f0[i], raw_f0[i + 1]) if v > 0.0]
            if len(nbrs) == 3:
                clean_f0[i] = sorted(nbrs)[1]

    voiced_vals = [f for f, l in zip(clean_f0, loudness_env) if f > 0.0 and l >= 0.045]
    cal_med = float(cal.get("medianF0Hz") or 0.0)
    median_f0 = cal_med if (65.0 <= cal_med <= 500.0) else (float(statistics.median(voiced_vals)) if voiced_vals else 0.0)
    pitch_span_semi = max(3.5, min(10.0, float(cal.get("pitchSpanSemitones") or 6.0)))

    # Speaker-relative semitone pitch_norm [-1..1] and smoothed pitch_delta [-1..1]
    pitch_norm_arr: List[float] = []
    pitch_delta_arr: List[float] = []
    prev_semi: Optional[float] = None
    for i in range(total_frames):
        f0_hz = clean_f0[i]
        speaking = loudness_env[i] >= 0.045
        if speaking and f0_hz > 0.0 and median_f0 > 0.0:
            semi = 12.0 * math.log2(f0_hz / median_f0)
            p_norm = max(-1.0, min(1.0, semi / pitch_span_semi))
            if prev_semi is not None:
                p_delta = max(-1.0, min(1.0, (semi - prev_semi) / 2.5))
            else:
                p_delta = 0.0
            prev_semi = semi
        else:
            p_norm = 0.0
            p_delta = 0.0
            prev_semi = None
        pitch_norm_arr.append(p_norm)
        pitch_delta_arr.append(p_delta)

    # Emphasis peaks (combined loudness + positive pitch accent local maxima)
    emphasis_score = [
        loudness_env[i] * 0.78 + max(0.0, pitch_norm_arr[i]) * 0.22
        for i in range(total_frames)
    ]
    peaks: List[Dict[str, float]] = []
    last_peak_t = -99.0
    for i in range(1, total_frames - 1):
        sc = emphasis_score[i]
        if loudness_env[i] >= 0.48 and sc >= 0.52 and sc >= emphasis_score[i - 1] and sc >= emphasis_score[i + 1]:
            t = i / float(fps)
            if t - last_peak_t >= 0.42:
                peaks.append({
                    "t": round(t, 3),
                    "strength": round(min(1.0, max(loudness_env[i], sc)), 3),
                    "pitch_norm": round(pitch_norm_arr[i], 3),
                })
                last_peak_t = t

    # Continuous speaking phrases & pauses (for wing gestures + pause/phrase-end blinks)
    phrases: List[Dict[str, Any]] = []
    pauses: List[Dict[str, float]] = []
    ph_start: Optional[float] = None
    pause_start: Optional[float] = None

    for i, e in enumerate(loudness_env):
        t = i / float(fps)
        speaking = e >= 0.055
        if speaking:
            if ph_start is None:
                ph_start = t
            if pause_start is not None:
                if t - pause_start >= 0.14:
                    pauses.append({"start": round(pause_start, 3), "end": round(t, 3)})
                pause_start = None
        else:
            if pause_start is None:
                pause_start = t
            if ph_start is not None:
                if t - ph_start >= 0.30:
                    has_emp = any(ph_start <= pk["t"] <= t for pk in peaks)
                    phrases.append({
                        "start": round(ph_start, 3),
                        "end": round(t, 3),
                        "duration": round(t - ph_start, 3),
                        "has_emphasis": bool(has_emp),
                    })
                ph_start = None

    end_t = total_frames / float(fps)
    if ph_start is not None and end_t - ph_start >= 0.30:
        has_emp = any(ph_start <= pk["t"] <= end_t for pk in peaks)
        phrases.append({
            "start": round(ph_start, 3),
            "end": round(end_t, 3),
            "duration": round(end_t - ph_start, 3),
            "has_emphasis": bool(has_emp),
        })
    if pause_start is not None and end_t - pause_start >= 0.14:
        pauses.append({"start": round(pause_start, 3), "end": round(end_t, 3)})

    frames: List[Dict[str, Any]] = []
    for i in range(total_frames):
        t = i / float(fps)
        loud = loudness_env[i]
        is_speaking = loud >= 0.045
        emp = 0.0
        for pk in peaks:
            dt = abs(t - pk["t"])
            if dt < 0.22:
                emp = max(emp, pk["strength"] * (1.0 - dt / 0.22))
        frames.append({
            "t": round(t, 4),
            "rms": round(raw_rms[i], 5),
            "db": round(raw_db[i], 2),
            "loudness": round(loud, 4),
            "f0_hz": round(clean_f0[i], 2) if is_speaking else 0.0,
            "pitch_norm": round(pitch_norm_arr[i], 4),
            "pitch_delta": round(pitch_delta_arr[i], 4),
            "pitch_conf": round(raw_conf[i], 3) if is_speaking else 0.0,
            "is_speaking": bool(is_speaking),
            "is_pause": bool(not is_speaking),
            "emphasis": round(emp, 4),
        })

    return {
        "version": 1,
        "fps": fps,
        "duration": round(duration, 4),
        "median_f0_hz": round(median_f0, 2),
        "p95_rms": round(p95, 5),
        "peaks": peaks,
        "phrases": phrases,
        "pauses": pauses,
        "frames": frames,
    }


def analyze_prosody(
    audio_path: str | Path,
    fps: int = 30,
    attack_ms: float = 35.0,
    release_ms: float = 95.0,
    silence_db: float = -44.0,
    calibration: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Analyze a WAV/MP3 audio file into a deterministic per-frame prosody track."""
    samples, sr = load_audio_mono_16k(audio_path)
    return analyze_prosody_samples(
        samples,
        sample_rate=sr,
        fps=fps,
        attack_ms=attack_ms,
        release_ms=release_ms,
        silence_db=silence_db,
        calibration=calibration,
    )


def calibrate_speaker_samples(
    samples: Sequence[float],
    sample_rate: int = TARGET_SAMPLE_RATE,
    fps: int = 30,
) -> Dict[str, Any]:
    """Offline Speaker Calibration Wizard (Phase 3 Item 10).

    From a ~10s recording (or any narration clip), auto-computes deterministic:
      - noiseFloorDb & noiseGateDb
      - medianF0Hz, f0MinHz, f0MaxHz, pitchSpanSemitones
      - loudnessMinDb, loudnessMaxDb, p95Rms, voicedRatio
      - recommendedPreset (`calm` | `lively` | `dramatic`)
    """
    fps = max(1, int(fps))
    n_samples = len(samples)
    duration = n_samples / float(sample_rate) if n_samples > 0 else 0.0
    total_frames = max(1, int(round(duration * fps)))
    if n_samples == 0:
        return {
            "version": 1,
            "duration": 0.0,
            "noiseFloorDb": -60.0,
            "noiseGateDb": -46.0,
            "medianF0Hz": 165.0,
            "f0MinHz": 115.0,
            "f0MaxHz": 240.0,
            "pitchSpanSemitones": 6.0,
            "loudnessMinDb": -42.0,
            "loudnessMaxDb": -12.0,
            "p95Rms": 0.16,
            "voicedRatio": 0.0,
            "recommendedPreset": "lively",
        }

    half_win = PROSODY_WINDOW // 2
    rms_list: List[float] = []
    db_list: List[float] = []
    windows: List[List[float]] = []

    for i in range(total_frames):
        center = int(round((i / float(fps)) * sample_rate))
        start = center - half_win
        win = [float(samples[start + k]) if 0 <= (start + k) < n_samples else 0.0 for k in range(PROSODY_WINDOW)]
        sq = sum(v * v for v in win)
        rms = math.sqrt(sq / float(PROSODY_WINDOW))
        db = max(-80.0, min(0.0, 20.0 * math.log10(max(rms, 1e-6))))
        rms_list.append(rms)
        db_list.append(db)
        windows.append(win)

    sorted_db = sorted(db_list)
    sorted_rms = sorted(rms_list)
    p15_db = sorted_db[min(len(sorted_db) - 1, int(0.15 * len(sorted_db)))]
    p95_db = sorted_db[min(len(sorted_db) - 1, int(0.95 * len(sorted_db)))]
    p95_rms = sorted_rms[min(len(sorted_rms) - 1, int(0.95 * len(sorted_rms)))]

    # Noise gate sits safely above the room floor while staying well below active speech
    if p95_db - p15_db < 10.0:
        noise_gate_db = max(-60.0, min(-26.0, p95_db - 14.0))
    else:
        noise_gate_db = max(-62.0, min(-26.0, min(p15_db + 7.5, p95_db - 12.0)))
    gate_amp = 10.0 ** (noise_gate_db / 20.0)

    voiced_f0: List[float] = []
    speech_dbs: List[float] = []
    for rms, db, win in zip(rms_list, db_list, windows):
        if rms >= gate_amp and db >= noise_gate_db:
            speech_dbs.append(db)
            f0, conf = _yin_pitch_frame(win, sample_rate=sample_rate)
            if f0 >= YIN_MIN_F0_HZ and f0 <= YIN_MAX_F0_HZ and conf >= 0.45:
                voiced_f0.append(f0)

    if voiced_f0:
        voiced_f0.sort()
        med_f0 = float(statistics.median(voiced_f0))
        f0_p10 = voiced_f0[min(len(voiced_f0) - 1, int(0.10 * len(voiced_f0)))]
        f0_p90 = voiced_f0[min(len(voiced_f0) - 1, int(0.90 * len(voiced_f0)))]
        span_semi = 12.0 * math.log2(max(f0_p90, med_f0 + 1.0) / max(60.0, min(f0_p10, med_f0)))
        pitch_span = max(3.5, min(10.0, span_semi * 0.65))
    else:
        med_f0 = 165.0
        f0_p10 = 120.0
        f0_p90 = 230.0
        pitch_span = 6.0

    if speech_dbs:
        speech_dbs.sort()
        loud_min = speech_dbs[min(len(speech_dbs) - 1, int(0.10 * len(speech_dbs)))]
        loud_max = speech_dbs[min(len(speech_dbs) - 1, int(0.95 * len(speech_dbs)))]
    else:
        loud_min = noise_gate_db
        loud_max = max(noise_gate_db + 6.0, p95_db)

    dyn_range = loud_max - loud_min
    if dyn_range >= 22.0:
        rec_preset = "dramatic"
    elif dyn_range <= 10.0:
        rec_preset = "calm"
    else:
        rec_preset = "lively"

    return {
        "version": 1,
        "duration": round(duration, 3),
        "noiseFloorDb": round(p15_db, 2),
        "noiseGateDb": round(noise_gate_db, 2),
        "medianF0Hz": round(med_f0, 2),
        "f0MinHz": round(f0_p10, 2),
        "f0MaxHz": round(f0_p90, 2),
        "pitchSpanSemitones": round(pitch_span, 2),
        "loudnessMinDb": round(loud_min, 2),
        "loudnessMaxDb": round(loud_max, 2),
        "p95Rms": round(max(1e-4, p95_rms), 5),
        "voicedRatio": round(len(voiced_f0) / float(max(1, total_frames)), 3),
        "recommendedPreset": rec_preset,
    }


def calibrate_speaker_audio(audio_path: str | Path, fps: int = 30) -> Dict[str, Any]:
    """Calibrate speaker vocal profile from a WAV/MP3 recording."""
    samples, sr = load_audio_mono_16k(audio_path)
    return calibrate_speaker_samples(samples, sample_rate=sr, fps=fps)


def write_calibration(audio_path: str | Path, output_json_path: str | Path, fps: int = 30) -> Dict[str, Any]:
    cal = calibrate_speaker_audio(audio_path, fps=fps)
    out = Path(output_json_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(cal, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return cal


def derive_prosody_path(viseme_json_path: str | Path) -> Path:
    """Derive sibling `*.prosody.json` path next to `*.visemes.json`."""
    p = Path(viseme_json_path)
    name = p.name
    if name.endswith(".visemes.json"):
        return p.with_name(name[: -len(".visemes.json")] + ".prosody.json")
    if name.endswith(".json"):
        return p.with_name(name[: -len(".json")] + ".prosody.json")
    return p.with_suffix(".prosody.json")


def write_prosody_track(
    audio_path: str | Path,
    output_json_path: str | Path,
    fps: int = 30,
    calibration: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Analyze audio and write deterministic prosody JSON to disk."""
    track = analyze_prosody(audio_path, fps=fps, calibration=calibration)
    out = Path(output_json_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(track, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return track


def analyze_audio(
    audio_path: str | Path,
    transcript_path: Optional[str | Path] = None,
    text: Optional[str] = None,
    fps: int = 30,
    min_hold_frames: int = 2,
    attack_ms: float = 35.0,
    release_ms: float = 95.0,
    silence_db: float = -44.0,
    coarticulation: bool = True,
    calibration: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Analyze a WAV or MP3 audio file (plus optional transcript JSON or narration text) into a deterministic viseme track."""
    samples, sr = load_audio_mono_16k(audio_path)
    transcript = None
    if transcript_path:
        tp = Path(transcript_path)
        if tp.exists():
            transcript = json.loads(tp.read_text(encoding="utf-8"))
    return analyze_samples(
        samples,
        sample_rate=sr,
        fps=fps,
        transcript=transcript,
        text=text,
        min_hold_frames=min_hold_frames,
        attack_ms=attack_ms,
        release_ms=release_ms,
        silence_db=silence_db,
        coarticulation=coarticulation,
        calibration=calibration,
    )


def write_viseme_track(
    audio_path: str | Path,
    output_json_path: str | Path,
    transcript_path: Optional[str | Path] = None,
    text: Optional[str] = None,
    fps: int = 30,
    min_hold_frames: int = 2,
    write_prosody: bool = True,
    prosody_output_path: Optional[str | Path] = None,
    coarticulation: bool = True,
    calibration: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Analyze audio and write deterministic viseme JSON (plus sibling prosody.json) to disk."""
    samples, sr = load_audio_mono_16k(audio_path)
    transcript = None
    if transcript_path:
        tp = Path(transcript_path)
        if tp.exists():
            transcript = json.loads(tp.read_text(encoding="utf-8"))
    track = analyze_samples(
        samples,
        sample_rate=sr,
        fps=fps,
        transcript=transcript,
        text=text,
        min_hold_frames=min_hold_frames,
        coarticulation=coarticulation,
        calibration=calibration,
    )
    out = Path(output_json_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(track, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    if write_prosody:
        p_out = Path(prosody_output_path) if prosody_output_path else derive_prosody_path(out)
        prosody = analyze_prosody_samples(samples, sample_rate=sr, fps=fps, calibration=calibration)
        p_out.parent.mkdir(parents=True, exist_ok=True)
        p_out.write_text(json.dumps(prosody, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    return track
