"""Premiere-style opening: animated lower-third title over the original footage.

This replaces the old "word-burst" intro, which had two flaws:
  1. It covered the center of the frame with a large dark panel, hiding the
     actual video — the opposite of what a broadcast-style title should do.
  2. It animated through a VP9 webm alpha layer whose alpha was lost in
     compositing, so the whole frame went black during the intro.

New behavior: the original video is fully preserved; only a tasteful lower-third
title card (accent bar + main title + subtitle over a soft gradient scrim) is
animated on top of the footage, in the style of a Premiere Pro lower-third.
Elements are rendered as per-frame RGBA PNGs with real alpha (Pillow + Persian
reshaping/bidi) and composited directly via the image2 demuxer — no intermediate
lossy alpha codec, so the footage underneath always stays visible.
"""
import os
import subprocess
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from .overlay import fa, find_font

FONT_BOLD = os.path.expanduser("~/.local/share/fonts/Vazirmatn-ExtraBold.ttf")
FONT_REG = os.path.expanduser("~/.local/share/fonts/Vazirmatn-Bold.ttf")
W, H, FPS = 1080, 1920, 30
INTRO = 3.0               # total intro length (seconds)
ACCENT = (245, 198, 90)   # soft gold accent (Premiere-ish)

# Lower-third layout (inside 1080x1920 portrait)
LT_LEFT = 84              # left safe margin
LT_BOTTOM = 260           # gap from bottom edge
LT_TITLE_SIZE = 116
LT_SUB_SIZE = 52
LT_BAR_H = 14             # accent bar thickness
LT_BAR_MIN_W = 60
LT_BAR_MAX_W = 360
LT_SCRIM_H = 620          # height of the bottom gradient scrim


# ---------------------------------------------------------------------------
# easing
# ---------------------------------------------------------------------------
def _ease_out_back(x):
    c1, c3 = 1.70158, 2.70158
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2


def _ease_out_cubic(x):
    return 1 - (1 - x) ** 3


def _smoothstep(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


# ---------------------------------------------------------------------------
# artwork
# ---------------------------------------------------------------------------
def _shadow_text_art(text, font, pad=36, blur=10):
    """Render Persian text (reshaped) on transparent, with a soft drop shadow."""
    tmp = Image.new("RGBA", (2400, 1200), (0, 0, 0, 0))
    d = ImageDraw.Draw(tmp)
    bbox = d.textbbox((0, 0), text, font=font)
    ox, oy = -bbox[0], -bbox[1]
    # layered shadow: offset black + blurred to fake softness
    shadow = Image.new("RGBA", tmp.size, (0, 0, 0, 0))
    ds = ImageDraw.Draw(shadow)
    ds.text((ox + 5, oy + 7), text, font=font, fill=(0, 0, 0, 190))
    shadow = shadow.filter(ImageFilter.GaussianBlur(blur))
    tmp.alpha_composite(shadow)
    d.text((ox, oy), text, font=font, fill=(255, 255, 255, 255))
    return tmp.crop((bbox[0] - pad, bbox[1] - pad,
                     bbox[2] + pad, bbox[3] + pad))


def _accent_bar_art(width, height=LT_BAR_H):
    """A rounded accent bar with a subtle edge glow."""
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, width - 1, height - 1), radius=height // 2,
                        fill=ACCENT + (255,))
    return img


def _scrim_art(height=LT_SCRIM_H, width=W):
    """Bottom gradient scrim: transparent at top -> dark at bottom."""
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    px = img.load()
    for y in range(height):
        a = int(235 * (y / height) ** 1.8)
        for x in range(width):
            px[x, y] = (4, 6, 12, a)
    return img


def make_lowerthird_animation(title="با درود دوستان",
                              subtitle="به کانال من خوش آمدید",
                              frames_dir="/tmp/lowerthird_frames",
                              out="/tmp/lowerthird_anim.mp4"):
    """Render the title animation as a frame sequence (RGBA PNGs)."""
    os.makedirs(frames_dir, exist_ok=True)
    t_font = ImageFont.truetype(FONT_BOLD, LT_TITLE_SIZE)
    s_font = ImageFont.truetype(FONT_REG, LT_SUB_SIZE)
    title_art = _shadow_text_art(fa(title), t_font)
    sub_art = _shadow_text_art(fa(subtitle), s_font, pad=28, blur=7)
    scrim = _scrim_art()
    bar_full = _accent_bar_art(LT_BAR_MAX_W)

    # vertical layout of the lower-third group (bottom-anchored)
    group_h = LT_SCRIM_H
    bar_h = LT_BAR_H
    title_h = title_art.size[1]
    sub_h = sub_art.size[1]
    gap_bar_title = 42
    gap_title_sub = 26
    # place inside scrim, bottom-aligned within it
    bottom_pad = 120
    base_y = H - bottom_pad

    n = int(INTRO * FPS)
    # timeline (seconds)
    t_line_in, t_line_dur = 0.00, 0.45
    t_title_in, t_title_dur = 0.15, 0.65
    t_sub_in, t_sub_dur = 0.50, 0.55
    t_hold_end = 2.35
    t_fade_out, t_fade_dur = 2.35, 0.65

    for i in range(n):
        t = i / FPS
        frame = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        frame.alpha_composite(scrim, (0, H - LT_SCRIM_H))

        def _anim_alpha(start, dur, hold_end):
            if t < start or t > hold_end + t_fade_dur:
                return 0.0
            if t < start + dur:
                return _smoothstep((t - start) / dur)
            if t <= hold_end:
                return 1.0
            return 1.0 - _smoothstep((t - hold_end) / t_fade_dur)

        # accent bar draws out from left
        if t >= t_line_in:
            p = (t - t_line_in) / t_line_dur
            p = max(0.0, min(1.0, p))
            bw = int(LT_BAR_MIN_W + (LT_BAR_MAX_W - LT_BAR_MIN_W) * _ease_out_cubic(p))
            bar = bar_full.crop((0, 0, bw, LT_BAR_H))
            bar = bar.point(lambda px, a=_anim_alpha(t_line_in, t_line_dur, t_hold_end):
                            int(px * a) if px < 255 else px)
            frame.alpha_composite(bar, (LT_LEFT, base_y - bar_h - gap_bar_title))

        # title slides up + fades in with ease-out-back
        a_title = _anim_alpha(t_title_in, t_title_dur, t_hold_end)
        if a_title > 0.01:
            tw, th = title_art.size
            if t < t_title_in + t_title_dur:
                q = (t - t_title_in) / t_title_dur
                e = _ease_out_back(q)
                slide = int(70 * (1 - _ease_out_cubic(q)))
                scale = 0.92 + 0.08 * e
                sw, sh = max(1, int(tw * scale)), max(1, int(th * scale))
                art = title_art.resize((sw, sh), Image.LANCZOS)
                art = art.point(lambda px, a=a_title: int(px * a) if px < 255 else px)
                x = LT_LEFT + (tw - sw) // 2
                y = base_y - sh - slide
            else:
                art = title_art.point(lambda px, a=a_title: int(px * a) if px < 255 else px)
                x, y = LT_LEFT, base_y - th
            frame.alpha_composite(art, (x, y))

        # subtitle fades in slightly after
        a_sub = _anim_alpha(t_sub_in, t_sub_dur, t_hold_end)
        if a_sub > 0.01:
            sw, sh = sub_art.size
            art = sub_art.point(lambda px, a=a_sub: int(px * a) if px < 255 else px)
            frame.alpha_composite(art, (LT_LEFT, base_y - sh - gap_title_sub))

        frame.save(os.path.join(frames_dir, f"f{i:04d}.png"))
    # always emit a result path (the sequence itself is the animation)
    return frames_dir


def make_sound(out="/tmp/intro_sound.wav", sr=48000):
    """Tasteful sting under the lower-third (soft sub-boom + airy whoosh)."""
    entries = [
        ("boom", f"sine=frequency=64:duration=1.6:sample_rate={sr},"
                 f"afade=t=out:st=0.12:d=1.4,volume=0.5", 1.6),
        ("whoosh", f"anoisesrc=color=brown:amplitude=0.45:duration=1.2:sample_rate={sr},"
                   f"lowpass=f=2000,afade=t=in:st=0:d=0.4,"
                   f"afade=t=out:st=0.55:d=0.65,volume=0.35", 1.2),
    ]
    parts = []
    for name, spec, dur in entries:
        tmp = f"/tmp/intro_{name}.wav"
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi",
                        "-i", spec, "-ar", str(sr), "-ac", "2",
                        "-t", str(dur), tmp], check=True)
        parts.append(tmp)
    subprocess.run(["ffmpeg", "-y", "-v", "error",
                    "-i", parts[0], "-i", parts[1],
                    "-filter_complex",
                    "[0:a]adelay=0|0[a0];[1:a]adelay=110|110[a1];"
                    "[a0][a1]amix=inputs=2:normalize=0,"
                    "alimiter=limit=0.8[a]",
                    "-map", "[a]", "-t", "2.4", out], check=True)
    return out


# ---------------------------------------------------------------------------
# compose
# ---------------------------------------------------------------------------
def prepend(edited, frames_dir="/tmp/lowerthird_frames",
            sound="/tmp/intro_sound.wav", out="/tmp/with_intro.mp4"):
    """Prepend the lower-third title onto the footage, preserving the video.

    The source footage is the visual base for the entire intro; only the
    title elements are composited on top. Audio = ducked original + sting.
    """
    VENC = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20"]
    AENC = ["-c:a", "aac", "-b:a", "192k", "-ar", "48000"]

    # 1) intro video: footage + title overlay (frames), first INTRO seconds
    intro_v = "/tmp/intro_v.mp4"
    subprocess.run(["ffmpeg", "-y", "-v", "error",
                    "-ss", "0", "-t", str(INTRO),
                    "-i", edited,
                    "-framerate", str(FPS), "-start_number", "0",
                    "-i", os.path.join(frames_dir, "f%04d.png"),
                    "-filter_complex",
                    "[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,"
                    "pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1[base];"
                    "[1:v]format=yuva420p[ov];"
                    "[base][ov]overlay=0:0:format=auto[out]",
                    "-map", "[out]", "-map", "0:a",
                    "-t", str(INTRO),
                    *VENC, *AENC,
                    "-metadata:s:v", "rotate=0", intro_v], check=True)

    # 2) intro audio: original ducked + sting
    intro_a = "/tmp/intro_audio.m4a"
    subprocess.run(["ffmpeg", "-y", "-v", "error",
                    "-ss", "0", "-t", str(INTRO),
                    "-i", edited, "-i", sound,
                    "-filter_complex",
                    "[0:a]volume=0.75[bg];[1:a]adelay=60|60[intro];"
                    "[bg][intro]amix=inputs=2:normalize=0[a]",
                    "-map", "[a]", "-t", str(INTRO),
                    "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
                    intro_a], check=True)

    # 3) mux intro video + audio
    intro_full = "/tmp/intro_full.mp4"
    subprocess.run(["ffmpeg", "-y", "-v", "error",
                    "-i", intro_v, "-i", intro_a,
                    "-map", "0:v", "-map", "1:a",
                    "-c:v", "copy", "-c:a", "copy", intro_full], check=True)

    # 4) tail: footage after the intro, same encode params
    tail = "/tmp/intro_tail.mp4"
    subprocess.run(["ffmpeg", "-y", "-v", "error",
                    "-ss", str(INTRO), "-i", edited,
                    *VENC, *AENC, tail], check=True)

    # 5) concat (identical codec/params required)
    lst = "/tmp/intro_concat.txt"
    with open(lst, "w") as fh:
        fh.write(f"file '{intro_full}'\n")
        fh.write(f"file '{tail}'\n")
    subprocess.run(["ffmpeg", "-y", "-v", "warning", "-f", "concat",
                    "-safe", "0", "-i", lst, "-c", "copy", out], check=True)
    return out
