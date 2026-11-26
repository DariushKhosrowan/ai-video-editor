"""Deterministic offline synthesis for Khordegir Studio's 8-mood music library.

License: Original procedural audio compositions & DSP code released under
MIT / CC0-compatible terms for Khordegir Studio (zero external samples,
zero randomness, offline only).
"""

from __future__ import annotations

import json
import math
import pathlib
import struct
import subprocess
import wave

SAMPLE_RATE = 44100
CHANNELS = 2

# 8 curated broadcast/YouTube explainer moods (1..8 -> music/mood_N.mp3)
MOOD_SPECS = [
    {
        "id": 1,
        "slug": "calm-ambient",
        "file": "music/mood_1.mp3",
        "label_fa": "آرام و توضیحی",
        "label_en": "Calm Ambient",
        "desc_fa": "پد ملایم و آرامش‌بخش برای معرفی، روایت علمی و شروع ویدیو",
        "bpm": 84,
        "bars": 4,
        "key": "C major",
        "color": "#38bdf8",
        "chords": [
            [261.63, 329.63, 392.00, 493.88],  # Cmaj7
            [174.61, 220.00, 261.63, 329.63],  # Fmaj7
            [220.00, 261.63, 329.63, 493.88],  # Am9
            [196.00, 246.94, 293.66, 329.63],  # G6
        ],
        "bass": [130.81, 87.31, 110.00, 98.00],
        "arp_pattern": [0, 2, 1, 3, 2, 1, 3, 2],
        "style": "pad_bell",
    },
    {
        "id": 2,
        "slug": "curious-investigative",
        "file": "music/mood_2.mp3",
        "label_fa": "کنجکاو و تحقیقی",
        "label_en": "Curious Investigative",
        "desc_fa": "ریتم ماریمبا و پالس تحلیلی به سبک مستندهای تحقیقی",
        "bpm": 104,
        "bars": 4,
        "key": "D minor",
        "color": "#f5b700",
        "chords": [
            [293.66, 349.23, 440.00, 523.25],  # Dm7
            [233.08, 293.66, 349.23, 440.00],  # Bbmaj7
            [196.00, 233.08, 293.66, 349.23],  # Gm7
            [220.00, 293.66, 329.63, 392.00],  # A7sus4
        ],
        "bass": [146.83, 116.54, 98.00, 110.00],
        "arp_pattern": [0, 1, 2, 1, 3, 2, 0, 2],
        "style": "pluck_marimba",
    },
    {
        "id": 3,
        "slug": "upbeat-creator",
        "file": "music/mood_3.mp3",
        "label_fa": "پرانرژی و یوتیوبی",
        "label_en": "Upbeat Creator",
        "desc_fa": "پرانرژی، شفاف و خوش‌ریتم برای نکات کاربردی و لیست‌ها",
        "bpm": 118,
        "bars": 4,
        "key": "G major",
        "color": "#10b981",
        "chords": [
            [196.00, 246.94, 293.66, 369.99],  # Gmaj7
            [293.66, 369.99, 440.00, 493.88],  # D6
            [164.81, 196.00, 246.94, 293.66],  # Em7
            [261.63, 329.63, 392.00, 493.88],  # Cmaj7
        ],
        "bass": [98.00, 146.83, 82.41, 130.81],
        "arp_pattern": [0, 2, 3, 1, 2, 3, 1, 2],
        "style": "bouncy_pluck",
    },
    {
        "id": 4,
        "slug": "dramatic-tension",
        "file": "music/mood_4.mp3",
        "label_fa": "دراماتیک و تنش‌زا",
        "label_en": "Dramatic Tension",
        "desc_fa": "باس عمیق و ضربان کوبنده برای بحران‌ها، هشدارها و داستان‌های جدی",
        "bpm": 92,
        "bars": 4,
        "key": "C minor",
        "color": "#ef4444",
        "chords": [
            [261.63, 311.13, 392.00, 466.16],  # Cm7
            [207.65, 261.63, 311.13, 392.00],  # Abmaj7
            [174.61, 207.65, 261.63, 349.23],  # Fm
            [196.00, 233.08, 293.66, 392.00],  # Gm
        ],
        "bass": [65.41, 103.83, 87.31, 98.00],
        "arp_pattern": [0, 0, 2, 1, 0, 2, 3, 2],
        "style": "cinematic_tension",
    },
    {
        "id": 5,
        "slug": "minimal-tech-data",
        "file": "music/mood_5.mp3",
        "label_fa": "مینیمال و داده‌محور",
        "label_en": "Minimal Tech Data",
        "desc_fa": "دقیق، تمیز و مدرن برای نمودارها، آمارها و تحلیل فناوری",
        "bpm": 112,
        "bars": 4,
        "key": "A minor",
        "color": "#818cf8",
        "chords": [
            [220.00, 261.63, 329.63, 392.00],  # Am7
            [174.61, 220.00, 261.63, 329.63],  # Fmaj7
            [293.66, 349.23, 440.00, 523.25],  # Dm7
            [164.81, 196.00, 246.94, 293.66],  # Em7
        ],
        "bass": [110.00, 87.31, 146.83, 82.41],
        "arp_pattern": [0, 3, 1, 2, 0, 3, 2, 1],
        "style": "minimal_tech",
    },
    {
        "id": 6,
        "slug": "warm-storytelling",
        "file": "music/mood_6.mp3",
        "label_fa": "داستان‌گو و صمیمی",
        "label_en": "Warm Storytelling",
        "desc_fa": "آکوردهای گرم و انسانی برای روایت‌های تاریخی و تجربه‌های شخصی",
        "bpm": 88,
        "bars": 4,
        "key": "F major",
        "color": "#fb923c",
        "chords": [
            [174.61, 220.00, 261.63, 329.63],  # Fmaj7
            [293.66, 349.23, 440.00, 523.25],  # Dm7
            [233.08, 293.66, 349.23, 440.00],  # Bbmaj7
            [261.63, 293.66, 349.23, 392.00],  # C9sus4
        ],
        "bass": [87.31, 146.83, 116.54, 130.81],
        "arp_pattern": [0, 1, 2, 3, 2, 1, 3, 0],
        "style": "warm_keys",
    },
    {
        "id": 7,
        "slug": "urgent-news-pulse",
        "file": "music/mood_7.mp3",
        "label_fa": "فوری و خبری",
        "label_en": "Urgent News Pulse",
        "desc_fa": "نبض سریع و منظم برای خبرهای داغ، مقایسهٔ حساس و افشاگری",
        "bpm": 126,
        "bars": 4,
        "key": "E minor",
        "color": "#f43f5e",
        "chords": [
            [164.81, 196.00, 246.94, 293.66],  # Em7
            [261.63, 329.63, 392.00, 493.88],  # Cmaj7
            [293.66, 369.99, 440.00, 493.88],  # D6
            [246.94, 293.66, 369.99, 440.00],  # Bm7
        ],
        "bass": [82.41, 130.81, 146.83, 123.47],
        "arp_pattern": [0, 2, 0, 3, 1, 2, 1, 3],
        "style": "news_pulse",
    },
    {
        "id": 8,
        "slug": "inspiring-finale",
        "file": "music/mood_8.mp3",
        "label_fa": "الهام‌بخش و جمع‌بندی",
        "label_en": "Inspiring Finale",
        "desc_fa": "اوج گرم و امیدبخش برای نتیجه‌گیری و جمع‌بندی نهایی ویدیو",
        "bpm": 98,
        "bars": 4,
        "key": "D major",
        "color": "#a855f7",
        "chords": [
            [293.66, 369.99, 440.00, 554.37],  # Dmaj7
            [220.00, 277.18, 329.63, 440.00],  # A
            [246.94, 293.66, 369.99, 440.00],  # Bm7
            [196.00, 246.94, 293.66, 369.99],  # Gmaj7
        ],
        "bass": [146.83, 110.00, 123.47, 98.00],
        "arp_pattern": [0, 1, 3, 2, 3, 1, 2, 3],
        "style": "inspiring_swell",
    },
]


def _synthesize_mood_samples(spec: dict, sr: int = SAMPLE_RATE) -> tuple[list[float], list[float]]:
    """Synthesize a seamless 4-bar stereo instrumental loop deterministically."""
    bpm = spec["bpm"]
    bars = spec["bars"]
    bar_dur = 4.0 * 60.0 / bpm
    total_dur = bars * bar_dur
    # Ensure exact cycle length per bar so looping has zero discontinuity
    n_samples = int(round(total_dur * sr))
    step_dur = bar_dur / 8.0  # 8 eighth-notes per bar

    chords = spec["chords"]
    bass_notes = spec["bass"]
    arp_pat = spec["arp_pattern"]
    style = spec["style"]

    left = [0.0] * n_samples
    right = [0.0] * n_samples

    two_pi = 2.0 * math.pi
    loop_omega = two_pi / total_dur

    for i in range(n_samples):
        t = i / sr
        bar_pos = t / bar_dur
        bar_idx = int(bar_pos) % bars
        bar_frac = bar_pos - math.floor(bar_pos)

        chord = chords[bar_idx]
        next_chord = chords[(bar_idx + 1) % bars]
        bass_f = bass_notes[bar_idx]

        # Smooth chord crossfade over final 8% of each bar for seamless voice leading
        xfade = max(0.0, min(1.0, (bar_frac - 0.92) / 0.08))
        xfade_w = 0.5 * (1.0 - math.cos(math.pi * xfade))

        # Subtle breathing pad LFO aligned to loop period (seamless at t=0 and t=total_dur)
        pad_lfo = 0.78 + 0.22 * math.sin(loop_omega * 4.0 * t - math.pi * 0.5)

        pad_l = 0.0
        pad_r = 0.0
        for idx, (f0, f1) in enumerate(zip(chord, next_chord)):
            f = f0 * (1.0 - xfade_w) + f1 * xfade_w
            # Gentle stereo detune (odd voices slightly left, even slightly right)
            detune = 0.0018 if (idx % 2 == 0) else -0.0018
            ph_l = two_pi * f * (1.0 + detune) * t
            ph_r = two_pi * f * (1.0 - detune) * t
            # Warm fundamental + soft 2nd harmonic
            val_l = math.sin(ph_l) + 0.16 * math.sin(2.0 * ph_l)
            val_r = math.sin(ph_r) + 0.16 * math.sin(2.0 * ph_r)
            pan_l = 0.62 if (idx % 2 == 0) else 0.38
            pan_r = 1.0 - pan_l
            pad_l += (val_l * pan_l + val_r * 0.15) * 0.11
            pad_r += (val_r * pan_r + val_l * 0.15) * 0.11

        pad_l *= pad_lfo
        pad_r *= pad_lfo

        # Rhythmic bass pulse
        beat_phase = (t / (60.0 / bpm)) % 1.0
        if style in ("dramatic_tension", "news_pulse"):
            sub_phase = (t / (30.0 / bpm)) % 1.0  # 8th-note pulse
            bass_env = math.exp(-5.5 * sub_phase) * (1.0 - math.exp(-90.0 * sub_phase))
        elif style in ("bouncy_pluck", "minimal_tech"):
            bass_env = math.exp(-4.0 * beat_phase) * (1.0 - math.exp(-85.0 * beat_phase))
        else:
            bass_env = (0.55 + 0.45 * math.exp(-2.8 * bar_frac)) * (1.0 - math.exp(-40.0 * bar_frac))

        bass_sig = (
            0.78 * math.sin(two_pi * bass_f * t)
            + 0.22 * math.sin(two_pi * 2.0 * bass_f * t)
        ) * bass_env * 0.28

        # Melodic arpeggio / pluck / bell layer
        step_pos = t / step_dur
        step_idx = int(step_pos) % len(arp_pat)
        step_local = (step_pos - math.floor(step_pos)) * step_dur
        note_f = chord[arp_pat[step_idx] % len(chord)]
        if style in ("pad_bell", "warm_keys", "inspiring_swell"):
            note_f *= 2.0  # one octave up sparkle
            decay = 4.2
        elif style in ("news_pulse", "minimal_tech"):
            note_f *= 1.5 if (step_idx % 4 == 2) else 1.0
            decay = 8.5
        else:
            decay = 6.2

        # Gentle rest on beat 7 in softer moods for breathing space
        active = 0.35 if (style in ("pad_bell", "warm_keys") and step_idx in (3, 7)) else 1.0
        pluck_env = active * math.exp(-decay * step_local) * (1.0 - math.exp(-160.0 * step_local))
        pluck_sig = (
            0.75 * math.sin(two_pi * note_f * t)
            + 0.20 * math.sin(two_pi * 2.0 * note_f * t)
            + 0.05 * math.sin(two_pi * 3.0 * note_f * t)
        ) * pluck_env * 0.16

        # Pan pluck gently alternating left/right by step index
        p_pan = 0.5 + 0.22 * math.sin(step_idx * 1.1)
        pluck_l = pluck_sig * p_pan
        pluck_r = pluck_sig * (1.0 - p_pan)

        # Soft percussion tick on beats for rhythmic styles
        tick_sig = 0.0
        if style in ("bouncy_pluck", "minimal_tech", "news_pulse", "dramatic_tension"):
            sub_t = (t % (30.0 / bpm))
            tick_env = math.exp(-55.0 * sub_t) * (1.0 - math.exp(-800.0 * sub_t))
            kick_env = math.exp(-18.0 * (t % (60.0 / bpm)))
            kick = math.sin(two_pi * (55.0 + 60.0 * kick_env) * (t % (60.0 / bpm))) * kick_env * 0.11
            hat = math.sin(two_pi * 3400.0 * sub_t) * math.cos(two_pi * 1700.0 * sub_t) * tick_env * 0.025
            tick_sig = kick + hat

        # Crossfade 25 ms at the loop seam for guaranteed clickless looping
        seam_samples = int(0.025 * sr)
        seam_gain = 1.0
        if i < seam_samples:
            seam_gain = math.sin(0.5 * math.pi * (i / seam_samples))
        elif i >= n_samples - seam_samples:
            seam_gain = math.sin(0.5 * math.pi * ((n_samples - 1 - i) / seam_samples))

        s_l = (pad_l + bass_sig + pluck_l + tick_sig) * seam_gain
        s_r = (pad_r + bass_sig + pluck_r + tick_sig) * seam_gain

        # Gentle soft-clip warmth
        left[i] = math.tanh(s_l * 1.15) * 0.85
        right[i] = math.tanh(s_r * 1.15) * 0.85

    return left, right


def _encode_wav_bytes(left: list[float], right: list[float], sr: int = SAMPLE_RATE) -> bytes:
    """Pack stereo float channels [-1, 1] into PCM16 WAV bytes."""
    import io
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        frames = bytearray(len(left) * 4)
        for idx, (l_val, r_val) in enumerate(zip(left, right)):
            li = max(-32767, min(32767, int(round(l_val * 32767.0))))
            ri = max(-32767, min(32767, int(round(r_val * 32767.0))))
            struct.pack_into("<hh", frames, idx * 4, li, ri)
        wf.writeframes(bytes(frames))
    return buf.getvalue()


def generate_all_moods(out_dir: pathlib.Path | None = None) -> list[dict]:
    """Generate mood_1.mp3 .. mood_8.mp3 + catalog.json deterministically."""
    music_dir = out_dir or pathlib.Path(__file__).resolve().parent
    music_dir.mkdir(parents=True, exist_ok=True)
    catalog = []

    for spec in MOOD_SPECS:
        left, right = _synthesize_mood_samples(spec, sr=SAMPLE_RATE)
        wav_bytes = _encode_wav_bytes(left, right, sr=SAMPLE_RATE)
        mp3_path = music_dir / f"mood_{spec['id']}.mp3"

        proc = subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-v",
                "error",
                "-f",
                "wav",
                "-i",
                "pipe:0",
                "-af",
                "loudnorm=I=-16:TP=-1.5:LRA=9",
                "-codec:a",
                "libmp3lame",
                "-b:a",
                "128k",
                "-ar",
                str(SAMPLE_RATE),
                "-ac",
                "2",
                "-bitexact",
                "-write_xing",
                "0",
                str(mp3_path),
            ],
            input=wav_bytes,
            capture_output=True,
            check=True,
        )
        _ = proc
        dur_sec = round(len(left) / SAMPLE_RATE, 3)
        catalog.append(
            {
                "id": spec["id"],
                "slug": spec["slug"],
                "file": spec["file"],
                "label_fa": spec["label_fa"],
                "label_en": spec["label_en"],
                "desc_fa": spec["desc_fa"],
                "bpm": spec["bpm"],
                "key": spec["key"],
                "color": spec["color"],
                "duration_sec": dur_sec,
            }
        )

    (music_dir / "catalog.json").write_text(
        json.dumps({"version": 1, "moods": catalog}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return catalog


if __name__ == "__main__":
    items = generate_all_moods()
    print(f"Generated {len(items)} deterministic mood MP3 files.")
