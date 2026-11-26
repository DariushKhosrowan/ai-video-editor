"""Sound Effects (SFX) module for Khordegir Studio.

Licensed under MIT / Apache 2.0.
Provides parsing, validation, deterministic WAV generation (using numpy + wave),
and ffmpeg audio mixing filter plans for top-level 'sfx' configurations in video.yaml.
"""
from __future__ import annotations

import math
import struct
import wave
from pathlib import Path

try:
    import numpy as np
except ImportError:
    np = None

VALID_SFX_NAMES = {"whorl", "pop", "tick", "whoosh"}
VALID_SFX_KEYS = {"at", "name", "gain_db"}


def validate_sfx_config(sfx_list: list | None) -> list[dict]:
    """Parse and validate optional top-level 'sfx' list with beginner-friendly defaults and strict checks."""
    if sfx_list is None:
        return []
    if not isinstance(sfx_list, list):
        raise TypeError("Top-level 'sfx' configuration must be a list")

    validated = []
    for idx, item in enumerate(sfx_list):
        if isinstance(item, str):
            item = {"name": item}
        if not isinstance(item, dict):
            raise TypeError(f"SFX item at index {idx} must be a mapping or string")

        unknown_keys = set(item.keys()) - VALID_SFX_KEYS
        if unknown_keys:
            raise ValueError(f"Unknown key(s) in SFX item {idx}: {sorted(unknown_keys)}. Allowed keys: {sorted(VALID_SFX_KEYS)}")

        # Defaults: name defaults to "tick", at defaults to 0.0, gain_db defaults to 0.0
        name = item.get("name", "tick")
        if not isinstance(name, str) or name not in VALID_SFX_NAMES:
            raise ValueError(f"Unknown SFX name '{name}' at index {idx}. Allowed names: {sorted(VALID_SFX_NAMES)}")

        at = item.get("at", 0.0)
        if not isinstance(at, (int, float)):
            raise TypeError(f"Non-numeric 'at' value '{at}' at index {idx}")
        at = float(at)
        if at < 0:
            raise ValueError(f"Negative 'at' value '{at}' at index {idx}")

        gain_db = item.get("gain_db", 0.0)
        if not isinstance(gain_db, (int, float)):
            raise TypeError(f"Non-numeric 'gain_db' value '{gain_db}' at index {idx}")
        gain_db = float(gain_db)
        if not (-60.0 <= gain_db <= 24.0):
            raise ValueError(f"Out-of-range 'gain_db' value '{gain_db}' at index {idx}. Must be between -60 and +24 dB.")

        validated.append({
            "name": name,
            "at": at,
            "gain_db": gain_db,
        })
    return validated


def generate_sfx_wav(name: str, out_path: Path, sample_rate: int = 48000) -> Path:
    """Generate a 48 kHz 16-bit PCM WAV file deterministically using numpy and stdlib wave."""
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    durations = {
        "tick": 0.025,
        "pop": 0.08,
        "whoosh": 0.35,
        "whorl": 0.40,
    }
    dur = durations.get(name, 0.1)
    n_samples = int(sample_rate * dur)

    # Fixed seed determinism based on sound name
    seed_val = 42 + sum(ord(c) for c in name)

    if np is not None:
        rng = np.random.default_rng(seed=seed_val)
        t = np.linspace(0, dur, n_samples, endpoint=False)

        if name == "tick":
            freq = 2200.0
            env = np.exp(-t * 180.0)
            signal = np.sin(2 * np.pi * freq * t) * env
        elif name == "pop":
            freq_start = 750.0
            freq_end = 120.0
            inst_freq = np.linspace(freq_start, freq_end, n_samples)
            phase = 2 * np.pi * np.cumsum(inst_freq) / sample_rate
            env = np.exp(-t * 70.0)
            signal = np.sin(phase) * env
        elif name == "whoosh":
            noise = rng.normal(0, 1, n_samples)
            kernel_size = int(sample_rate * 0.015)
            if kernel_size > 1:
                kernel = np.ones(kernel_size) / kernel_size
                noise = np.convolve(noise, kernel, mode="same")
            env = np.sin(np.pi * t / dur) ** 0.7
            signal = noise * env
        elif name == "whorl":
            freq = 380.0
            mod = np.sin(2 * np.pi * 12 * t) * 180
            inst_freq = freq + mod
            phase = 2 * np.pi * np.cumsum(inst_freq) / sample_rate
            env = np.sin(np.pi * t / dur)
            signal = np.sin(phase) * env
        else:
            signal = np.zeros(n_samples)

        max_val = np.max(np.abs(signal))
        if max_val > 0:
            signal = signal / max_val * 0.85
        pcm_data = np.clip(signal * 32767, -32768, 32767).astype(np.int16).tobytes()
    else:
        # Fallback pure python implementation
        samples = []
        for i in range(n_samples):
            t_val = i / sample_rate
            if name == "tick":
                val = math.sin(2 * math.pi * 2200 * t_val) * math.exp(-t_val * 180)
            elif name == "pop":
                val = math.sin(2 * math.pi * 500 * t_val) * math.exp(-t_val * 70)
            elif name == "whoosh":
                val = math.sin(math.pi * t_val / dur) * 0.5
            else:
                val = math.sin(2 * math.pi * 380 * t_val) * math.sin(math.pi * t_val / dur)
            samples.append(max(-32768, min(32767, int(val * 20000))))
        pcm_data = struct.pack(f"<{len(samples)}h", *samples)

    with wave.open(str(out_path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm_data)

    return out_path


def build_sfx_plan(project_or_data, out_dir: Path) -> dict:
    """Process sfx list from project/data, generate WAVs in out_dir, and return ffmpeg plan dict."""
    out_dir = Path(out_dir)
    if isinstance(project_or_data, list):
        sfx_raw = project_or_data
    elif hasattr(project_or_data, "sfx"):
        sfx_raw = getattr(project_or_data, "sfx", None)
    elif hasattr(project_or_data, "data") and isinstance(project_or_data.data, dict):
        sfx_raw = project_or_data.data.get("sfx")
    elif isinstance(project_or_data, dict):
        sfx_raw = project_or_data.get("sfx")
    else:
        sfx_raw = None

    validated = validate_sfx_config(sfx_raw)
    if not validated:
        return {"wavs": [], "inputs_args": [], "filter_complex": "", "validated": []}

    sfx_dir = out_dir / "sfx"
    sfx_dir.mkdir(parents=True, exist_ok=True)

    wav_paths = []
    inputs_args = []
    filter_clauses = []
    mix_inputs = []

    for idx, item in enumerate(validated):
        wav_name = f"sfx_{idx:02d}_{item['name']}.wav"
        wav_path = sfx_dir / wav_name
        generate_sfx_wav(item["name"], wav_path)
        wav_paths.append(wav_path)

        inputs_args.extend(["-i", str(wav_path)])
        delay_ms = int(item["at"] * 1000)
        gain_db = item["gain_db"]

        # Each generated sfx input is referenced by its ffmpeg input index tag.
        # Assuming main video/audio is input 0, sfx inputs start at index 1+.
        in_tag = f"{idx + 1}:a"
        out_tag = f"sfx_out_{idx}"
        filter_clauses.append(f"[{in_tag}]adelay={delay_ms}|{delay_ms},volume={gain_db}dB[{out_tag}]")
        mix_inputs.append(f"[{out_tag}]")

    return {
        "wavs": wav_paths,
        "validated": validated,
        "inputs_args": inputs_args,
        "filter_complex": ";".join(filter_clauses),
        "mix_inputs": mix_inputs,
    }
