"""AI Video Editor — programmatic, agent-assisted video editing toolkit.

Pipeline:
  1. transcribe  — speech-to-text (faster-whisper) with Persian support
  2. analyze      — anchor segments from the transcript (find "about site" moment)
  3. overlay      — generate Persian-text URL badges (PIL + arabic shaping)
  4. walkthrough  — capture a real browser walkthrough (Playwright + Chrome)
  5. compose      — ffmpeg composition: badge + PiP + loudness normalization

Everything is deterministic and driven by a simple YAML/JSON timeline, so any
LLM agent (or human) can drive it with natural-language instructions.
"""
__version__ = "0.1.0"
