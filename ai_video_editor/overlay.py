"""Generate Persian-text overlay badges (URL pills, lower-thirds) as RGBA PNGs.
Uses arabic_reshaper + python-bidi under the hood so Persian renders correctly
(joined glyphs + RTL ordering). Falls back to a system font if Vazirmatn is
not present."""
import os
from PIL import Image, ImageDraw, ImageFont
import arabic_reshaper
from bidi.algorithm import get_display

FONT_CANDIDATES = [
    os.path.expanduser("~/.local/share/fonts/Vazirmatn-ExtraBold.ttf"),
    os.path.expanduser("~/.local/share/fonts/Vazirmatn-Bold.ttf"),
    "/usr/share/fonts/truetype/vazir/Vazir-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]


def find_font():
    for f in FONT_CANDIDATES:
        if os.path.exists(f):
            return f
    raise FileNotFoundError("No suitable font found")


def fa(text: str) -> str:
    """Reshape + bidi-reorder Persian text for correct glyph rendering."""
    reshaped = arabic_reshaper.reshape(text)
    return get_display(reshaped)


def make_url_badge(url: str, label: str, size=(900, 140), out_path="overlay_url.png"):
    font_p = find_font()
    W, H = size
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    d.rounded_rectangle((20, 15, W-20, H-15), radius=35,
                        fill=(10, 12, 20, 210))
    # accent dot
    d.ellipse((70, 55, 100, 85), fill=(52, 211, 153, 255))

    small = ImageFont.truetype(font_p, 40)
    big = ImageFont.truetype(font_p, 66)
    d.text((W-135, 48), fa(label), font=small, fill=(200, 210, 220, 255), anchor="mm")
    d.text((W-160, 98), url, font=big, fill=(255, 255, 255, 255), anchor="mm")

    img.save(out_path)
    return out_path


if __name__ == "__main__":
    make_url_badge("khosrowan.ir", "سایت شخصی", out_path="overlay_url.png")
    print("wrote overlay_url.png")
