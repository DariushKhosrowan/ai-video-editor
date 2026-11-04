"""Timeline render engine with GPU NVENC acceleration.

Renders a non-destructive model.Project to a single MP4. The render is
*lossless-with-respect-to-the-edit*: the source media is never altered, we
decode each clip's [in_, out] range, apply transitions/overlays, and encode
the assembled timeline.

USING THE GPU:
  - The encoder is h264_nvenc / hevc_nvenc when a CUDA-capable NVIDIA GPU is
    present (checked at import); otherwise it falls back to libx264.
  - The decode path uses the CPU (libavcodec) but the encode goes through
    NVENC, which is the bulk of the cost.
"""
from __future__ import annotations

import os
import subprocess
import tempfile
from typing import List, Optional

from .model import Project, Clip, Overlay
from . import overlay as overlay_mod


def _nvidia_present() -> bool:
    try:
        out = subprocess.run(["nvidia-smi", "--query-gpu=name",
                              "--format=csv,noheader"],
                             capture_output=True, text=True, timeout=10)
        return "NVIDIA" in out.stdout.upper()
    except Exception:
        return False


def _cuda_encoders() -> set:
    try:
        out = subprocess.run(["ffmpeg", "-hide_banner", "-encoders"],
                             capture_output=True, text=True, timeout=15)
        return {line.split()[1] for line in out.stdout.splitlines()
                if "nvenc" in line}
    except Exception:
        return set()


class Renderer:
    def __init__(self, project: Project, hardware: bool = True,
                 crf: int = 20, preset: str = "p4"):
        self.project = project
        self.crf = crf
        self.preset = preset
        enc = _cuda_encoders()
        self.use_nvenc = hardware and _nvidia_present() and "h264_nvenc" in enc
        self.vcodec = "h264_nvenc" if self.use_nvenc else "libx264"

    def encode_args(self) -> List[str]:
        if self.use_nvenc:
            return ["-c:v", "h264_nvenc", "-preset", self.preset,
                    "-rc", "vbr", "-cq", str(self.crf), "-b:v", "0"]
        return ["-c:v", "libx264", "-preset", "veryfast", "-crf", str(self.crf)]

    def _trim_clip(self, clip: Clip, idx: int) -> str:
        """Trim a clip's [in_,out] range (plus speed) to an intermediate file."""
        seg = tempfile.NamedTemporaryFile(
            prefix=f"hermes-seg{idx}-", suffix=".mp4", delete=False).name
        cmd = ["ffmpeg", "-y", "-v", "error",
               "-ss", str(clip.in_), "-i", clip.src,
               "-t", str(clip.duration)]
        if clip.speed != 1.0:
            cmd += ["-vf", f"setpts={1/clip.speed}*PTS,atempo={clip.speed}"]
        cmd += ["-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
                "-an", "-pix_fmt", "yuv420p", seg]
        subprocess.run(cmd, check=True)
        return seg

    def render(self, out: str, audio_source: Optional[str] = None) -> str:
        p = self.project
        video_clips = [c for tr in p.tracks if tr.kind == "video"
                       for c in tr.clips]

        # 1) Trim each clip to an intermediate segment.
        segs = [self._trim_clip(c, i) for i, c in enumerate(video_clips)]
        if not segs:
            raise ValueError("project has no video clips to render")

        # 2) Build the concatenation chain. Track absolute timeline time so
        #    overlay enable() windows use the right values.
        #    We compute start-of-clip in the concatenated output by summing
        #    durations minus transitions.
        #    For N segments we use xfade (needs >=2) or plain concat.
        timeline_start = []
        running = 0.0
        for i, c in enumerate(video_clips):
            timeline_start.append(running)
            running += c.duration
            if (i < len(video_clips) - 1 and
                    video_clips[i + 1].transition_from in ("crossfade", "fade") and
                    video_clips[i + 1].transition_dur > 0):
                running -= video_clips[i + 1].transition_dur

        # 3) Build the filter graph.
        # Inputs: segs[0..N-1] (video, no audio) then optional audio_source.
        fc_parts = []
        W, H = p.width, p.height

        # Normalize every segment to the canvas (separate input pad).
        for i in range(len(segs)):
            fc_parts.append(
                f"[{i}:v]scale={W}:{H}:force_original_aspect_ratio=decrease,"
                f"pad={W}:{H}:(ow-iw)/2:(oh-ih)/2,setsar=1[s{i}]")

        # Concatenate.
        if len(segs) == 1:
            cur = "s0"
        else:
            cur = "s0"
            for i in range(1, len(segs)):
                prev_start = timeline_start[i]
                tr = video_clips[i].transition_from
                dur = video_clips[i].transition_dur
                if tr in ("crossfade", "fade") and dur > 0:
                    lbl = f"c{i}"
                    # xfade offset = clip start time (in output timeline)
                    off = prev_start
                    fc_parts.append(
                        f"[{cur}][s{i}]xfade=transition=fade:duration={dur}:"
                        f"offset={off:.3f}[{lbl}]")
                else:
                    lbl = f"c{i}"
                    fc_parts.append(f"[{cur}][s{i}]concat=n=2:v=1:a=0[{lbl}]")
                cur = lbl

        # 4) Overlays (from all video clips, positioned in absolute timeline time)
        ov_inputs = []   # (path, absolute_start, absolute_end, x, y, w, h)
        for c in video_clips:
            for o in c.overlays:
                if o.type in ("badge", "image", "pip"):
                    fpath = o.file
                elif o.type == "text":
                    fpath = tempfile.NamedTemporaryFile(
                        prefix="hermes-ovtext-", suffix=".png",
                        delete=False).name
                    overlay_mod.make_url_badge(o.text, "", out_path=fpath)
                else:
                    continue
                ov_inputs.append((fpath, c.start + o.start, c.start + o.end,
                                 o.x, o.y, o.w, o.h))

        # The base stream for overlays is `cur` after concat.
        for idx, (fpath, astart, aend, x, y, w, h) in enumerate(ov_inputs):
            in_idx = len(segs) + idx
            lbl = f"ov{idx}"
            if w and h:
                fc_parts.append(
                    f"[{in_idx}:v]scale={w}:{h}:force_original_aspect_ratio=decrease,"
                    f"setsar=1,format=yuva420p[{lbl}]")
            else:
                fc_parts.append(f"[{in_idx}:v]format=yuva420p[{lbl}]")
            fc_parts.append(
                f"[{cur}][{lbl}]overlay=x={x}:y={y}:"
                f"enable='between(t,{astart},{aend})'[o{idx}]")
            cur = f"o{idx}"

        fc_parts.append(f"[{cur}]null[outv]")
        fc = ";".join(fc_parts)

        # 5) Audio: map from supplied source, or first audio-track clip source.
        audio_input = audio_source
        if audio_input is None:
            for tr in p.tracks:
                if tr.kind == "audio" and tr.clips:
                    audio_input = tr.clips[0].src
                    break
        has_audio = audio_input and os.path.exists(audio_input)

        cmd = ["ffmpeg", "-y", "-v", "warning"]
        for s in segs:
            cmd += ["-i", s]
        for (fpath, *_rest) in ov_inputs:
            cmd += ["-i", fpath]
        if has_audio:
            cmd += ["-i", audio_input]
        cmd += ["-filter_complex", fc, "-map", "[outv]"]
        if has_audio:
            cmd += ["-map", f"{len(segs)+len(ov_inputs)}:a"]
        cmd += self.encode_args()
        if has_audio:
            cmd += ["-c:a", "aac", "-b:a", "192k", "-ar", "48000"]
        else:
            cmd += ["-an"]
        cmd += ["-movflags", "+faststart", out]
        subprocess.run(cmd, check=True)

        for s in segs:
            try:
                os.unlink(s)
            except OSError:
                pass
        return out


def render_project(project: Project, out: str = "edit.mp4",
                  audio_source: Optional[str] = None, hardware: bool = True,
                  crf: int = 20) -> str:
    return Renderer(project, hardware=hardware, crf=crf).render(out, audio_source)
