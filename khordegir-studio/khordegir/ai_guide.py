"""Khordegir Studio — Offline AI Slide Writer & YAML Import Engine.

Converts free-form AI outputs (ChatGPT, Claude, Gemini web, DeepSeek, Local LLMs)
into valid, deterministic, ready-to-render Khordegir video.yaml projects.
Licensed under MIT / Apache-2.0 compatible terms. Single source of truth: video.yaml.
Zero remote API calls, 100% offline and deterministic.
"""
import copy
import json
import os
import re
from pathlib import Path

try:
    import yaml
except ImportError:  # pragma: no cover
    raise SystemExit("خطا: کتابخانه‌ی pyyaml نصب نیست. بزن: pip install pyyaml")

from .project import ALIASES, norm_template

FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹"
AR_DIGITS = "٠١٢٣٤٥٦٧٨٩"
FA2EN_TRANS = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩٫", "01234567890123456789.")


def fa_to_en_num_str(s):
    """Convert Persian and Arabic numerals to ASCII digits, Persian decimal '٫' to '.', remove '٬'."""
    if s is None:
        return ""
    return str(s).replace("٬", "").translate(FA2EN_TRANS).strip()


def to_finite_number(val):
    """Parse integer or float from int/float or Persian/English string; return None if invalid."""
    if isinstance(val, (int, float)):
        return val
    if not isinstance(val, str):
        return None
    cleaned = fa_to_en_num_str(val).replace(",", "")
    if not cleaned or not re.match(r"^-?\d+(?:\.\d+)?$", cleaned):
        return None
    try:
        return float(cleaned) if "." in cleaned else int(cleaned)
    except ValueError:
        return None


def parse_bool_like(val):
    """Convert boolean-like inputs (including Persian بله/نه) to bool or None."""
    if isinstance(val, bool):
        return val
    if not isinstance(val, str):
        return None
    s = val.strip().lower()
    if s in ("true", "on", "yes", "1", "بله", "روشن"):
        return True
    if s in ("false", "off", "no", "0", "نه", "خیر", "خاموش"):
        return False
    return None


def levenshtein(a, b):
    """Compute Levenshtein edit distance between strings a and b."""
    s, t = str(a or ""), str(b or "")
    m, n = len(s), len(t)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            cost = 0 if s[i - 1] == t[j - 1] else 1
            dp[i][j] = min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    return dp[m][n]


def closest_match(input_str, candidates, max_dist=3):
    """Find the closest matching string in candidates with Levenshtein distance <= max_dist."""
    clean = str(input_str or "").strip().lower()
    if not clean or not candidates:
        return None
    best = None
    best_dist = float("inf")
    for c in candidates:
        d = levenshtein(clean, str(c).lower())
        if d < best_dist:
            best_dist = d
            best = c
    return best if best_dist <= max_dist else None


# ------------------------------------------------------------------ Live Registry Loader
def _parse_fx_catalog(fx_path):
    """Deterministically parse CATALOG, PRESETS and TRANSITIONS from stage/fx.js without JS eval."""
    fx_catalog = {
        "presets": {},
        "presetLabels": {},
        "transitions": [
            "curtain-rtl",
            "accent-slash",
            "iris-rise",
            "soft-fade",
            "split-curtain",
            "diagonal-wipe",
            "zoom-iris",
            "shutter-bars",
        ],
        "transitionLabels": {},
        "logoMotions": [
            "pop-spin",
            "slide-rtl",
            "orbit-pulse",
            "flip-reveal",
            "stamp-drop",
            "glitch-snap",
            "float-fade",
        ],
        "logoMotionLabels": {},
        "logoPositions": ["top-left", "top-right", "bottom-right", "bottom-left"],
        "imageMotions": ["breathe", "zoom-out", "pan-left", "pan-right", "depth", "none"],
    }
    fx_variants = ["rise", "slide", "mask", "blur", "scale"]

    if not fx_path.exists():
        return fx_catalog, fx_variants

    try:
        content = fx_path.read_text(encoding="utf-8")

        # Parse PRESETS object: template: ["p1", "p2", ...]
        presets_match = re.search(r"const\s+PRESETS\s*=\s*\{([\s\S]*?)\};", content)
        if presets_match:
            presets_block = presets_match.group(1)
            for m in re.finditer(r"([A-Za-z0-9_]+)\s*:\s*\[([^\]]*)\]", presets_block):
                tpl = m.group(1)
                items = [x.strip().strip("'\"") for x in m.group(2).split(",") if x.strip()]
                fx_catalog["presets"][tpl] = items

        # Parse PRESET_LABELS
        labels_match = re.search(r"const\s+PRESET_LABELS\s*=\s*\{([\s\S]*?)\};", content)
        if labels_match:
            labels_block = labels_match.group(1)
            for m in re.finditer(r'["\']?([A-Za-z0-9_-]+)["\']?\s*:\s*["\']([^"\']+)["\']', labels_block):
                fx_catalog["presetLabels"][m.group(1)] = m.group(2)

        # Parse TRANSITIONS
        trans_match = re.search(r"const\s+TRANSITIONS\s*=\s*\[([^\]]*)\]", content)
        if trans_match:
            fx_catalog["transitions"] = [x.strip().strip("'\"") for x in trans_match.group(1).split(",") if x.strip()]

        # Parse TRANSITION_LABELS
        trans_lbl_match = re.search(r"const\s+TRANSITION_LABELS\s*=\s*\{([\s\S]*?)\};", content)
        if trans_lbl_match:
            for m in re.finditer(r'["\']?([A-Za-z0-9_-]+)["\']?\s*:\s*["\']([^"\']+)["\']', trans_lbl_match.group(1)):
                fx_catalog["transitionLabels"][m.group(1)] = m.group(2)

        # Parse LOGO_MOTIONS
        logo_m_match = re.search(r"const\s+LOGO_MOTIONS\s*=\s*\[([^\]]*)\]", content)
        if logo_m_match:
            fx_catalog["logoMotions"] = [x.strip().strip("'\"") for x in logo_m_match.group(1).split(",") if x.strip()]

        # Parse LOGO_MOTION_LABELS
        logo_lbl_match = re.search(r"const\s+LOGO_MOTION_LABELS\s*=\s*\{([\s\S]*?)\};", content)
        if logo_lbl_match:
            for m in re.finditer(r'["\']?([A-Za-z0-9_-]+)["\']?\s*:\s*["\']([^"\']+)["\']', logo_lbl_match.group(1)):
                fx_catalog["logoMotionLabels"][m.group(1)] = m.group(2)

        # Parse FX.VARIANTS
        var_match = re.search(r"FX\.VARIANTS\s*=\s*\[([^\]]*)\]", content)
        if var_match:
            fx_variants = [x.strip().strip("'\"") for x in var_match.group(1).split(",") if x.strip()]

    except Exception:
        pass

    return fx_catalog, fx_variants


def _parse_themes(themes_dir):
    """Deterministically parse theme files in themes/*.js without JS eval."""
    themes = []
    if not themes_dir.exists():
        return [{"name": "khordegir-dark", "label": "خرده‌گیر — تیره", "mode": "dark", "accent": "#FFD600", "danger": "#E53935", "fx": {}}]

    for f in sorted(themes_dir.glob("*.js")):
        if f.name.startswith("_"):
            continue
        try:
            txt = f.read_text(encoding="utf-8")
            name_m = re.search(r'name\s*:\s*["\']([^"\']+)["\']', txt)
            name = name_m.group(1) if name_m else f.stem
            label_m = re.search(r'label\s*:\s*["\']([^"\']+)["\']', txt)
            label = label_m.group(1) if label_m else name
            is_dark_m = re.search(r'isDark\s*:\s*(false|true)', txt, re.IGNORECASE)
            mode = "light" if is_dark_m and is_dark_m.group(1).lower() == "false" else "dark"
            accent_m = re.search(r'accent\s*:\s*["\']([^"\']+)["\']', txt)
            accent = accent_m.group(1) if accent_m else ""
            danger_m = re.search(r'danger\s*:\s*["\']([^"\']+)["\']', txt)
            danger = danger_m.group(1) if danger_m else ""
            themes.append({
                "name": name,
                "label": label,
                "mode": mode,
                "accent": accent,
                "danger": danger,
                "fx": {},
            })
        except Exception:
            pass

    if not themes:
        themes = [{"name": "khordegir-dark", "label": "خرده‌گیر — تیره", "mode": "dark", "accent": "#FFD600", "danger": "#E53935", "fx": {}}]
    return themes


def load_live_registry(pkg_root=None):
    """Load real templates, themes, transitions, presets and motion tokens from disk."""
    root = Path(pkg_root or Path(__file__).resolve().parent).resolve()

    # 1. Templates from templates/*/schema.json
    tpl_dir = root / "templates"
    templates = []
    alias_map = dict(ALIASES)

    if tpl_dir.exists():
        for entry in sorted(tpl_dir.iterdir()):
            if not entry.is_dir() or entry.name.startswith(("_", ".")):
                continue
            schema_path = entry / "schema.json"
            if not schema_path.exists():
                continue
            try:
                schema = json.loads(schema_path.read_text(encoding="utf-8"))
                templates.append(schema)
                for a in schema.get("aliases", []):
                    alias_map[a] = entry.name
            except Exception:
                pass

    templates.sort(key=lambda t: (t.get("order", 999), str(t.get("name", ""))))

    # 2. Motion Tokens & FX Catalog from stage/fx.js
    fx_path = root / "stage" / "fx.js"
    fx_catalog, fx_variants = _parse_fx_catalog(fx_path)
    motion_tokens = {"autoCount": {"pop": {}, "smooth": {}, "slam": {}, "subtle": {}}}

    # 3. Themes from themes/*.js
    themes_dir = root / "themes"
    themes = _parse_themes(themes_dir)

    template_names = [t["name"] for t in templates]
    theme_names = [t["name"] for t in themes]

    return {
        "templates": templates,
        "templateNames": template_names,
        "template_names": template_names,
        "aliasMap": alias_map,
        "alias_map": alias_map,
        "themes": themes,
        "themeNames": theme_names,
        "theme_names": theme_names,
        "fxCatalog": fx_catalog,
        "fx_catalog": fx_catalog,
        "fxVariants": fx_variants,
        "fx_variants": fx_variants,
        "motionTokens": motion_tokens,
        "motion_tokens": motion_tokens,
    }


loadLiveRegistry = load_live_registry


# ------------------------------------------------------------------ Live AI Guide Generator
def generate_ai_guide(pkg_root=None, options=None):
    """Generate offline AI prompt specification guide matching the project's real catalog."""
    options = options or {}
    reg = load_live_registry(pkg_root)
    topic = str(options.get("topic") or "").strip()

    count_styles = list(reg.get("motionTokens", {}).get("autoCount", {}).keys()) or ["pop", "smooth", "slam", "subtle"]

    themes_section = "\n".join(
        f"- `{t['name']}` ({t['mode']}, accent {t.get('accent') or 'auto'}) — {t.get('label') or t['name']}"
        for t in reg["themes"]
    )

    tr_labels = reg["fxCatalog"].get("transitionLabels", {})
    transitions_section = "\n".join(
        f"- `{tr}`" + (f" — {tr_labels[tr]}" if tr in tr_labels else "")
        for tr in reg["fxCatalog"].get("transitions", [])
    )

    lm_labels = reg["fxCatalog"].get("logoMotionLabels", {})
    logo_motions_section = "\n".join(
        f"- `{lm}`" + (f" — {lm_labels[lm]}" if lm in lm_labels else "")
        for lm in reg["fxCatalog"].get("logoMotions", [])
    )

    templates_list = []
    skip_generic = {"preset", "transition", "seed"}
    for tpl in reg["templates"]:
        name = tpl.get("name", "")
        label = tpl.get("label", name)
        cat = tpl.get("category", "عمومی")
        presets = reg["fxCatalog"].get("presets", {}).get(name, [])
        custom_fields = [f for f in tpl.get("fields", []) if f.get("key") not in skip_generic]

        field_lines = []
        for f in custom_fields:
            req = " *(required)*" if f.get("required") else ""
            extra = ""
            if f.get("options"):
                extra += f" | values: {', '.join(f'`{o[0]}`' for o in f['options'])}"
            if f.get("columns"):
                extra += f" | row keys: {', '.join(f'`{c[0]}` ({c[1]})' for c in f['columns'])}"
            if f.get("default") is not None:
                extra += f" | default: `{f['default']}`"
            field_lines.append(f"  - `{f.get('key')}` ({f.get('type')}{req}){extra} — {f.get('label', '')}")

        example_obj = {"template": name}
        example_obj.update(tpl.get("example", {}))
        example_yaml = yaml.safe_dump(example_obj, allow_unicode=True, sort_keys=False, width=120).strip()
        indented_example = "\n".join("  " + l for l in example_yaml.splitlines())

        tpl_blocks = [
            f"### `{name}` — {label} [{cat}]",
            tpl.get("description", ""),
            f"Aliases: {', '.join(f'`{a}`' for a in tpl.get('aliases', []))}" if tpl.get("aliases") else "",
            f"Presets: `auto`, `random`, {', '.join(f'`{p}`' for p in presets)}" if presets else "",
            "Fields:\n" + "\n".join(field_lines) if field_lines else "Fields: (none — uses common slide keys like `say`, `layout`, `act`)",
            f"Example:\n```yaml\n{indented_example}\n```",
        ]
        templates_list.append("\n".join(b for b in tpl_blocks if b))

    templates_section = "\n\n".join(templates_list)

    topic_block = topic if topic else "[اینجا موضوع، عنوان یا متن اسکریپت ویدیوی خودتان را بنویسید / Write your video topic or script here]"
    logo_positions = ", ".join(f"`{p}`" for p in reg["fxCatalog"].get("logoPositions", []))
    image_motions = ", ".join(f"`{m}`" for m in reg["fxCatalog"].get("imageMotions", []))
    count_styles_str = ", ".join(f"`{c}`" for c in count_styles)

    return f"""# Khordegir Studio — Offline AI Slide Writer Specification (video.yaml)

You are generating a complete, ready-to-render **Khordegir Studio** `video.yaml` project from the user's topic or script below.
Khordegir Studio is an offline deterministic 1920x1080 motion-graphics & OBS teleprompter studio (`fa` RTL by default, `en` LTR supported).

## STRICT OUTPUT RULES
1. Return **ONE** valid YAML block fenced with ```yaml ... ``` and nothing else inside the YAML (2-space indentation, UTF-8).
2. Always include root keys `title`, `theme`, and `slides` (non-empty list).
3. Use ONLY real template names, theme names, transitions, presets, and field keys documented below.
4. Keep on-screen text punchy and visual (3–10 words per headline, short labels on charts). Put the full spoken narration in `say:` on each slide.
5. Every slide should have `say:` (natural spoken lines matching the video language) and an explicit `layout:` (`SCAM` when the presenter's webcam sits in the bottom-left corner, `SLIDE` for full-screen charts/tables/titles, `CAM` for camera-only moments).
6. For any image-based slide (`image_text`, `image_full`, `title_card` with image), if the user hasn't supplied filenames yet, omit `image` or put a descriptive placeholder filename like `img_1.png` and mention it in `note:`.

---

## 1. PROJECT ROOT KEYS (`video.yaml`)
- `title`: Video title string.
- `theme`: `random` or one of the real themes listed in Section 5.
- `lang`: `fa` (default, RTL Persian) or `en` (LTR English, flips horizontal motion & UI direction).
- `duration`: Minimum clip duration in seconds (number, default `6`). Clips automatically extend to fit `say` reading duration (~2.25 words/sec + pause weight) unless `sync_say: false`.
- `seed`: Integer seed for deterministic randomness (default `0`).
- `preset`: Default slide animation preset (`auto`, `random`, or template-specific preset).
- `transition`: Default slide transition (`auto`, `random`, or one from Section 6).
- `variant`: Entrance style (`rise`, `slide`, `mask`, `blur`, `scale`, or `random`).
- `logo` / `logo_text` / `logo_motion` / `logo_position`: Brand badge overlay. Positions: {logo_positions} (in `SCAM` layout, `bottom-left` auto-shifts to `top-left` to protect the webcam box).
- **Auto Count-Up & Micro-Details**:
  - `count`: `true` (default) or `false`. Automatically animates inline numbers (Persian `۰-۹` or Latin `0-9`, `٪`/`%`, decimals, thousands separators) inside titles & body text with tabular digits and landing pop!
  - `count_style`: {count_styles_str} (default `pop`).
  - `count_from`: `auto` (years roll from nearby value, stats from 0), `zero`, or `near` (~72%).
  - `micro_fx`: `true` (default) or `false`. Subtle bounces on short accented phrases, badges, and emojis.
- **Audio / Mood / SFX Metadata** (kept cleanly in `video.yaml`):
  - `music`: Background music track filename or style cue (e.g. `ambient-synth.mp3` or `dark-investigative`).
  - `mood`: Overall pacing/tone tag (e.g. `curious`, `urgent`, `calm`, `dramatic`).
  - `sfx`: Sound cue note or cue list (note: Stage also generates deterministic visual-sync audio cues: `whoosh`, `pop`, `soft`, `count-start`, `count-end`, `swish`, `logo`).
- Project asset defaults (optional): `images: [img]`, `copy: [mp4, png, steps, prompter]`, `out: out`.

---

## 2. INLINE RICH-TEXT FORMATTING & NUMBERS
Inside text fields (`title`, `subtitle`, `text`, `caption`, `items`, `messages`, `cards`):
- `*word*` → Accent highlight color (and subtle bounce if 1–3 words).
- `~word~` → Danger/negative red color.
- `_word_` → Muted gray secondary emphasis.
- `==word==` → Animated marker highlighter sweep.
- `__word__` → Animated underline sweep.
- Inline numbers (e.g. `*۷۳٪*`, `۲٬۵۰۰`, `3.4x`, `1998`) automatically animate with YouTube-style tabular count-up unless `count: false` is set on the slide or project. Years (1300–2150) automatically roll from a nearby year.

---

## 3. COMMON SLIDE KEYS (work on EVERY template)
- `template`: Exact template ID from Section 7 (required).
- `layout`: `SLIDE` (full 1920x1080) | `SCAM` (protects bottom-left webcam zone `[24, 740, 584, 1055]`) | `CAM` (full-screen presenter camera, no slide rendered).
- `say`: Spoken teleprompter text for this slide.
- `steps`: Optional array of follow-up teleprompter beats on the SAME slide (PageDown in OBS):
  ```yaml
  steps:
    - layout: SCAM
      say: ادامه توضیح روی همین اسلاید...
      zoom: {{ x: 0.5, y: 0.4, s: 1.6 }}
      time: "1:15"
  ```
- `zoom`: OBS F5 zoom point on the slide or inside a step: `{{ x: 0..1, y: 0..1, s: 1.0..2.5 }}` (e.g. `{{ x: 0.65, y: 0.35, s: 1.6 }}`).
- `act`: Integer act/chapter number for OBS teleprompter (auto-carries forward if omitted).
- `time`: Optional timestamp label (e.g. `"0:45"`).
- `duration`: Per-slide minimum seconds override.
- `source`: Small credit/citation in bottom corner (numbers inside `.source` do NOT auto-count).
- `note`: Small bottom footnote.
- `background`: `{{ image: bg.jpg, dim: 0.6, color: "#121212" }}` or image path string.
- `fx`: Per-slide atmosphere toggles `{{ leak: true/false, dust: true/false, grain: true/false, accent: "underline"|"none" }}`.
- `sfx` / `mood` / `music`: Optional per-slide audio cue or mood override.
- **Advanced Keys**:
  - `count`: `false` to turn off auto number count-up on a specific slide.
  - `count_style`: `pop` | `smooth` | `slam` | `subtle`.
  - `count_from`: `auto` | `zero` | `near`.
  - `micro_fx`: `false` to turn off micro-bounces & emoji pops on that slide.
  - `preset`, `transition`, `variant`, `seed`, `logo`, `logo_motion`, `logo_position`, `lang`, `glow: false`, `vignette: false`, `sync_say: false`, `slide_no`, `render_layout`, `overrides: {{ fieldKey: {{ x: 0, y: 0, scale: 1 }} }}`.

---

## 4. MAPS, PINS & IMAGE MOTION
- For world/region maps or annotated photos, use `template: image_full` with `dots` (percentage coordinates `x,y` or `x,y,color` where `color` is `accent` or `danger`):
  ```yaml
  - template: image_full
    image: world_map.png
    title: ~نقاط بحرانی~ در ۱۶ شهر
    dots:
      - "47.5,31.1"
      - "55.6,40.0,danger"
    zoom: {{ x: 0.55, y: 0.4, s: 1.7 }}
    motion: zoom-out
    dim: 0.4
    layout: SLIDE
  ```
- Image `motion` values: {image_motions}.

---

## 5. REAL THEMES (auto-loaded from `themes/`)
{themes_section}

---

## 6. REAL TRANSITIONS & LOGO MOTIONS (auto-loaded from `stage/fx.js`)
Transitions (`transition`):
{transitions_section}

Logo Motions (`logo_motion`):
{logo_motions_section}

---

## 7. ALL REAL TEMPLATES & FIELDS (auto-loaded from `templates/*/schema.json`)
{templates_section}

---

## 8. SHORT COMPLETE EXAMPLE
```yaml
title: چرا ۹۰٪ عادت‌های جدید شکست می‌خورند؟
theme: khordegir-dark
lang: fa
preset: random
transition: curtain-rtl
count_style: pop
mood: curious
music: minimal-pulse
slides:
  - template: title_card
    layout: SLIDE
    eyebrow: علم رفتار
    title: چرا *۹۰٪* عادت‌ها شکست می‌خورند؟ 💡
    subtitle: راز ۲ دقیقه در روز
    say: سلام! امروز می‌بینیم چرا نود درصد عادت‌های تازه در دو هفتهٔ اول رها می‌شوند.
  - template: big_number
    layout: SCAM
    number: 66
    suffix: "٪"
    color: accent
    caption: میانگین روزهای لازم برای ==تثبیت عادت==
    source: Lally et al., 2010
    zoom: {{ x: 0.65, y: 0.45, s: 1.5 }}
    say: پژوهش‌ها نشان می‌دهند تثبیت یک عادت حدود شصت و شش روز زمان می‌برد، نه بیست و یک روز!
  - template: cam
    layout: CAM
    say: پس همین امروز با کوچک‌ترین قدم ممکن شروع کنید.
```

---

## USER TOPIC / SCRIPT:
{topic_block}
"""


generateAiGuide = generate_ai_guide


# ------------------------------------------------------------------ Paste Validator & Auto-Fixer
def extract_yaml_block(raw_text):
    """Extract code block fenced with ```yaml ... ``` if present."""
    lines = str(raw_text or "").splitlines()
    fence_start = -1
    for i, line in enumerate(lines):
        if re.match(r"^\s*```(?:ya?ml)?\s*$", line, re.IGNORECASE):
            fence_start = i
            break

    if fence_start != -1:
        fence_end = len(lines)
        for i in range(fence_start + 1, len(lines)):
            if re.match(r"^\s*```\s*$", lines[i]):
                fence_end = i
                break
        return {
            "text": "\n".join(lines[fence_start + 1:fence_end]),
            "line_offset": fence_start + 1,
            "lineOffset": fence_start + 1,
            "extracted_fence": True,
            "extractedFence": True,
        }

    return {
        "text": str(raw_text or ""),
        "line_offset": 0,
        "lineOffset": 0,
        "extracted_fence": False,
        "extractedFence": False,
    }


def find_slide_line_numbers(text):
    """Find line numbers where slides start in YAML text."""
    lines = str(text or "").splitlines()
    slide_lines = []
    in_slides = False
    slides_indent = -1

    for i, line in enumerate(lines):
        trimmed = line.strip()
        if not trimmed or trimmed.startswith("#"):
            continue
        indent = len(line) - len(line.lstrip())
        if re.match(r"^slides\s*:", trimmed):
            in_slides = True
            slides_indent = indent
            continue
        if in_slides:
            if indent <= slides_indent and not trimmed.startswith("-"):
                in_slides = False
                continue
            if re.match(r"^-\s+", trimmed) and (slides_indent == -1 or indent <= slides_indent + 4):
                slide_lines.append(i + 1)
        elif re.match(r"^-\s+(?:template|type)\s*:", trimmed):
            slide_lines.append(i + 1)

    return slide_lines


def pre_normalize_yaml_text(raw_text):
    """Clean markdown fences, BOM, bidi control characters, tab indents, and curly quotes."""
    auto_fixes = []
    ext = extract_yaml_block(raw_text)
    if ext["extracted_fence"]:
        auto_fixes.append("کادر کد مارک‌داون (```yaml) به‌صورت خودکار جدا شد.")

    working = ext["text"]

    # Strip invisible bidi control chars and BOM
    if re.search(r"[\uFEFF\u200E\u200F\u202A-\u202E]", working):
        working = re.sub(r"[\uFEFF\u200E\u200F\u202A-\u202E]", "", working)
        auto_fixes.append("کاراکترهای مخفی جهت‌نما (BOM / LRM / RLM) پاک‌سازی شدند.")

    lines = working.splitlines()
    tab_fixed = 0
    quote_fixed = 0
    colon_space_fixed = 0
    fixed_lines = []

    for line in lines:
        out = line
        lead_tab = re.match(r"^(\t+)", out)
        if lead_tab:
            out = "  " * len(lead_tab.group(1)) + out[len(lead_tab.group(1)):]
            tab_fixed += 1

        # Fix curly quotes around YAML values: `key: “value”`
        curly_m = re.match(r'^(\s*(?:-\s*)?[A-Za-z_][A-Za-z0-9_-]*\s*:\s*)[“”](.*)[“”]\s*$', out)
        if curly_m:
            out = f'{curly_m.group(1)}"{curly_m.group(2)}"'
            quote_fixed += 1

        # Fix missing space after colon on known scalar keys: `title:سلام` -> `title: سلام`
        colon_m = re.match(r'^(\s*(?:-\s*)?[A-Za-z_][A-Za-z0-9_-]*):([^\s/\d"\'\[{].*)$', out)
        if colon_m:
            out = f"{colon_m.group(1)}: {colon_m.group(2)}"
            colon_space_fixed += 1

        fixed_lines.append(out)

    if tab_fixed > 0:
        auto_fixes.append(f"تورفتگی با Tab در {tab_fixed} خط به ۲ فاصله تبدیل شد.")
    if quote_fixed > 0:
        auto_fixes.append(f"نقل‌قول‌های خمیده در {quote_fixed} خط به نقل‌قول استاندارد تبدیل شد.")
    if colon_space_fixed > 0:
        auto_fixes.append(f"فاصلهٔ جاافتاده بعد از دونقطه در {colon_space_fixed} خط اصلاح شد.")

    return {
        "text": "\n".join(fixed_lines),
        "line_offset": ext["line_offset"],
        "lineOffset": ext["line_offset"],
        "auto_fixes": auto_fixes,
        "autoFixes": auto_fixes,
    }


def validate_and_fix_video_yaml(raw_markup, pkg_root=None):
    """Validate and auto-repair YAML markup from AI slide writer."""
    reg = load_live_registry(pkg_root)
    raw_str = str(raw_markup or "")
    if not raw_str.strip():
        return {
            "ok": False,
            "errors": ["متن ورودی خالی است. خروجی YAML را از چت‌بات کپی و اینجا جای‌گذاری کنید."],
            "warnings": [],
            "autoFixes": [],
            "auto_fixes": [],
            "yamlText": "",
            "yaml_text": "",
            "data": None,
        }

    norm = pre_normalize_yaml_text(raw_str)
    clean_text = norm["text"]
    line_offset = norm["line_offset"]
    auto_fixes = list(norm["auto_fixes"])
    errors = []
    warnings = []

    try:
        parsed = yaml.safe_load(clean_text)
    except yaml.YAMLError as err:
        err_line = 1
        err_col = 1
        if hasattr(err, "problem_mark") and err.problem_mark is not None:
            err_line = err.problem_mark.line + line_offset + 1
            err_col = err.problem_mark.column + 1
        reason = getattr(err, "problem", None) or str(err)
        hint = ""
        r_low = reason.lower()
        if "mapping values are not allowed" in r_low:
            hint = " — احتمالاً داخل یکی از متن‌ها علامت `:` آمده و باید دور متن را '...' یا \"...\" بگذارید."
        elif "could not find expected ':'" in r_low or "bad indentation" in r_low:
            hint = " — تورفتگی فاصله‌های این خط با خط بالایی هم‌تراز نیست."
        elif "unexpected end" in r_low or "unclosed" in r_low:
            hint = " — نقل‌قول یا آکولاد باز مانده و بسته نشده است."

        errors.append(f"خط {err_line} (ستون {err_col}): خطای نحوی YAML ({reason}){hint}")
        return {
            "ok": False,
            "errors": errors,
            "warnings": warnings,
            "autoFixes": auto_fixes,
            "auto_fixes": auto_fixes,
            "yamlText": "",
            "yaml_text": "",
            "data": None,
        }

    slide_line_numbers = [n + line_offset for n in find_slide_line_numbers(clean_text)]

    # Allow bare slide array
    if isinstance(parsed, list):
        parsed = {"title": "ویدیوی جدید", "theme": "khordegir-dark", "slides": parsed}
        auto_fixes.append("فهرست اسلایدها بدون ریشه بود؛ ساختار کامل video.yaml با title و slides ساخته شد.")

    if not isinstance(parsed, dict):
        errors.append("خط ۱: ساختار ریشهٔ YAML باید یک آبجکت شامل title، theme و slides باشد.")
        return {
            "ok": False,
            "errors": errors,
            "warnings": warnings,
            "autoFixes": auto_fixes,
            "auto_fixes": auto_fixes,
            "yamlText": "",
            "yaml_text": "",
            "data": None,
        }

    data = copy.deepcopy(parsed)

    # Normalize singular `slide:` -> `slides:`
    if "slides" not in data and isinstance(data.get("slide"), list):
        data["slides"] = data.pop("slide")
        auto_fixes.append("کلید `slide` به `slides` اصلاح شد.")

    # Normalize title
    if not data.get("title") or not str(data["title"]).strip():
        data["title"] = "ویدیوی جدید"
        auto_fixes.append("کلید `title` خالی بود؛ مقدار پیش‌فرض قرار گرفت.")
    else:
        data["title"] = str(data["title"]).strip()

    # Root lang normalization
    if data.get("lang") is not None:
        l = str(data["lang"]).strip().lower()
        if l in ("fa", "fa-ir", "persian", "farsi", "فارسی"):
            if data["lang"] != "fa":
                auto_fixes.append(f"زبان «{data['lang']}» به «fa» نرمال‌سازی شد.")
            data["lang"] = "fa"
        elif l in ("en", "en-us", "en-gb", "english", "انگلیسی"):
            if data["lang"] != "en":
                auto_fixes.append(f"زبان «{data['lang']}» به «en» نرمال‌سازی شد.")
            data["lang"] = "en"
        else:
            warnings.append(f"کلید lang مقدار «{data['lang']}» دارد (مقادیر معتبر: fa یا en). به «fa» تغییر یافت.")
            data["lang"] = "fa"

    # Root theme check
    theme_names = reg.get("themeNames", [])
    if not data.get("theme"):
        data["theme"] = "khordegir-dark"
        auto_fixes.append("کلید `theme` مشخص نشده بود؛ تم پیش‌فرض «khordegir-dark» تنظیم شد.")
    else:
        raw_th = str(data["theme"]).strip()
        low_th = raw_th.lower()
        if low_th in ("random", "تصادفی"):
            data["theme"] = "random"
        elif raw_th not in theme_names:
            ci = next((t for t in theme_names if t.lower() == low_th), None)
            if ci:
                data["theme"] = ci
                auto_fixes.append(f"تم «{raw_th}» به «{ci}» اصلاح شد.")
            else:
                guess = closest_match(raw_th, theme_names, 4)
                if guess:
                    warnings.append(f"تم «{raw_th}» پیدا نشد؛ به‌جای آن نزدیک‌ترین تم «{guess}» انتخاب شد.")
                    data["theme"] = guess
                else:
                    errors.append(f"تم «{raw_th}» معتبر نیست. تم‌های موجود: {', '.join(theme_names)}")

    # Root transition
    valid_transitions = set(["auto", "random", "تصادفی"] + reg["fxCatalog"].get("transitions", []))
    if data.get("transition") is not None:
        raw_tr = str(data["transition"]).strip().lower()
        if raw_tr == "تصادفی":
            data["transition"] = "random"
            auto_fixes.append("ترنزیشن «تصادفی» به «random» تبدیل شد.")
        elif raw_tr not in valid_transitions:
            guess = closest_match(raw_tr, list(valid_transitions), 3)
            if guess:
                data["transition"] = guess
                auto_fixes.append(f"ترنزیشن «{raw_tr}» به «{guess}» اصلاح شد.")
            else:
                warnings.append(f"ترنزیشن «{data['transition']}» ناشناخته است؛ از لیست استاندارد استفاده کنید.")
        else:
            data["transition"] = raw_tr

    # count_style
    valid_count_styles = list(reg.get("motionTokens", {}).get("autoCount", {}).keys()) or ["pop", "smooth", "slam", "subtle"]
    if data.get("count_style") is not None:
        cs = str(data["count_style"]).strip().lower()
        if cs in valid_count_styles:
            data["count_style"] = cs
        else:
            guess = closest_match(cs, valid_count_styles, 2)
            if guess:
                data["count_style"] = guess
                auto_fixes.append(f"مقدار count_style به «{guess}» اصلاح شد.")
            else:
                warnings.append(f"مقدار count_style «{data['count_style']}» معتبر نیست؛ مقدار «pop» جایگزین شد.")
                data["count_style"] = "pop"

    # count_from
    if data.get("count_from") is not None:
        cf = str(data["count_from"]).strip().lower()
        if cf in ("auto", "zero", "near"):
            data["count_from"] = cf
        else:
            warnings.append(f"مقدار count_from «{data['count_from']}» معتبر نیست (مقادیر مجاز: auto، zero، near).")
            data["count_from"] = "auto"

    # Booleans normalization
    for b_key in ("count", "micro_fx"):
        if data.get(b_key) is not None and not isinstance(data[b_key], bool):
            b = parse_bool_like(data[b_key])
            if b is not None:
                data[b_key] = b
                auto_fixes.append(f"کلید {b_key} به مقدار بولین {b} تبدیل شد.")

    # Numbers normalization
    for n_key in ("duration", "seed"):
        if data.get(n_key) is not None and not isinstance(data[n_key], (int, float)):
            num = to_finite_number(data[n_key])
            if num is not None:
                data[n_key] = num
                auto_fixes.append(f"مقدار عددی {n_key} به {num} استانداردسازی شد.")

    # Slides array check
    if not isinstance(data.get("slides"), list) or len(data["slides"]) == 0:
        errors.append("فهرست `slides` وجود ندارد یا خالی است؛ حداقل ۱ اسلاید تعریف کنید.")
        return {
            "ok": False,
            "errors": errors,
            "warnings": warnings,
            "autoFixes": auto_fixes,
            "auto_fixes": auto_fixes,
            "yamlText": "",
            "yaml_text": "",
            "data": data,
        }

    schema_by_name = {t["name"]: t for t in reg["templates"]}
    template_names_set = set(reg.get("templateNames", []))
    normalized_slides = []

    for i, raw_sl in enumerate(data["slides"]):
        line_no = slide_line_numbers[i] if i < len(slide_line_numbers) else None
        loc_prefix = f"خط {line_no} (اسلاید {i + 1})" if line_no else f"اسلاید {i + 1}"
        sl = raw_sl

        if isinstance(sl, str):
            sl = {"template": "quote", "text": sl}
            auto_fixes.append(f"{loc_prefix}: متن ساده به قالب `quote` تبدیل شد.")
        if not isinstance(sl, dict):
            errors.append(f"{loc_prefix}: هر اسلاید باید یک آبجکت YAML شامل `template` باشد.")
            continue

        sl = copy.deepcopy(sl)

        # `type` -> `template`
        if "template" not in sl and "type" in sl:
            sl["template"] = sl.pop("type")
            auto_fixes.append(f"{loc_prefix}: کلید `type` به `template` تبدیل شد.")

        raw_tpl = sl.get("template") or ("layers" if "elements" in sl else "")
        if not raw_tpl:
            errors.append(f"{loc_prefix}: کلید `template` مشخص نشده است.")
            continue

        tpl_name = norm_template(raw_tpl)
        if tpl_name not in template_names_set:
            guess = closest_match(tpl_name, list(template_names_set), 3)
            if guess:
                errors.append(f"{loc_prefix}: قالب «{raw_tpl}» معتبر نیست. آیا منظورتان «{guess}» بود؟")
            else:
                errors.append(f"{loc_prefix}: قالب «{raw_tpl}» در سیستم وجود ندارد.")
            continue

        if tpl_name != str(raw_tpl).strip():
            auto_fixes.append(f"{loc_prefix}: نام قالب «{raw_tpl}» به «{tpl_name}» استانداردسازی شد.")
        sl["template"] = tpl_name

        # Layout normalization
        if sl.get("layout") is not None:
            raw_lay = str(sl["layout"]).strip()
            up_lay = raw_lay.upper()
            if up_lay in ("SLIDE", "SCAM", "CAM"):
                if raw_lay != up_lay:
                    auto_fixes.append(f"{loc_prefix}: مقدار layout به «{up_lay}» اصلاح شد.")
                sl["layout"] = up_lay
            elif raw_lay in ("تمام صفحه", "تمام‌صفحه", "اسلاید"):
                sl["layout"] = "SLIDE"
                auto_fixes.append(f"{loc_prefix}: مقدار layout به «SLIDE» تبدیل شد.")
            elif raw_lay in ("دوربین", "فقط دوربین"):
                sl["layout"] = "CAM"
                auto_fixes.append(f"{loc_prefix}: مقدار layout به «CAM» تبدیل شد.")
            else:
                errors.append(f"{loc_prefix}: مقدار layout «{raw_lay}» معتبر نیست (فقط SLIDE، SCAM یا CAM مجاز است).")

        # `step` -> `steps`
        if "steps" not in sl and isinstance(sl.get("step"), list):
            sl["steps"] = sl.pop("step")
            auto_fixes.append(f"{loc_prefix}: کلید `step` به `steps` اصلاح شد.")

        # Numeric fields conversion
        for nk in ("act", "seed", "duration", "dim", "ymax", "columns", "from"):
            if sl.get(nk) is not None and not isinstance(sl[nk], (int, float)):
                num = to_finite_number(sl[nk])
                if num is not None:
                    sl[nk] = num
                    auto_fixes.append(f"{loc_prefix}: فیلد عددی `{nk}` استانداردسازی شد.")

        # Booleans normalization
        for bk in ("count", "micro_fx", "glow", "vignette", "sync_say"):
            if sl.get(bk) is not None and not isinstance(sl[bk], bool):
                b = parse_bool_like(sl[bk])
                if b is not None:
                    sl[bk] = b
                    auto_fixes.append(f"{loc_prefix}: فیلد `{bk}` به مقدار بولین {b} تبدیل شد.")

        # `dots` normalization for image_full
        if isinstance(sl.get("dots"), list):
            fixed_dots = 0
            new_dots = []
            for d in sl["dots"]:
                if isinstance(d, dict):
                    fixed_dots += 1
                    parts = [str(d.get("x", 50)), str(d.get("y", 50))]
                    if d.get("color"):
                        parts.append(str(d["color"]))
                    new_dots.append(",".join(parts))
                else:
                    new_dots.append(str(d))
            sl["dots"] = new_dots
            if fixed_dots > 0:
                auto_fixes.append(f"{loc_prefix}: مختصات dots به قالب «x,y,color» تبدیل شد.")

        # `zoom` object check
        if sl.get("zoom") is not None:
            if not isinstance(sl["zoom"], dict):
                errors.append(f"{loc_prefix}: فیلد `zoom` باید آبجکتی شامل {{ x, y, s }} باشد.")
            else:
                for zk in ("x", "y", "s"):
                    if sl["zoom"].get(zk) is not None and not isinstance(sl["zoom"][zk], (int, float)):
                        num = to_finite_number(sl["zoom"][zk])
                        if num is not None:
                            sl["zoom"][zk] = num
                if "s" not in sl["zoom"]:
                    sl["zoom"]["s"] = 1.5
                    auto_fixes.append(f"{loc_prefix}: ضریب زوم `zoom.s` مشخص نبود و روی ۱.۵ تنظیم شد.")

        # Required fields check from schema.json
        schema = schema_by_name.get(tpl_name)
        if schema and isinstance(schema.get("fields"), list):
            for f in schema["fields"]:
                if not f.get("required"):
                    continue
                val = sl.get(f["key"])
                missing = (
                    val is None or
                    val == "" or
                    (isinstance(val, list) and len(val) == 0)
                )
                if missing:
                    if f.get("type") == "image":
                        warnings.append(f"{loc_prefix}: تصویر (`{f['key']}`) خالی است — می‌توانید بعد از ورود در ویرایشگر انتخاب یا آپلود کنید.")
                    else:
                        errors.append(f"{loc_prefix}: فیلد ضروری `{f['key']}` ({f.get('label', '')}) برای قالب `{tpl_name}` خالی است.")

        # Template-specific structural checks
        if tpl_name == "bar_chart" and not sl.get("data"):
            errors.append(f"{loc_prefix}: قالب `bar_chart` نیاز به فهرست `data` دارد.")
        if tpl_name == "compare" and not isinstance(sl.get("steps"), list):
            errors.append(f"{loc_prefix}: قالب `compare` نیاز به فهرست `steps` با `value` و `label` دارد.")
        if tpl_name == "counter_grid" and not isinstance(sl.get("cards"), list):
            errors.append(f"{loc_prefix}: قالب `counter_grid` نیاز به فهرست `cards` دارد.")
        if tpl_name == "three_cards" and not isinstance(sl.get("cards"), list):
            errors.append(f"{loc_prefix}: قالب `three_cards` نیاز به فهرست `cards` دارد.")
        if tpl_name == "line_chart" and not sl.get("series"):
            errors.append(f"{loc_prefix}: قالب `line_chart` نیاز به `series` دارد.")

        normalized_slides.append(sl)

    data["slides"] = normalized_slides
    yaml_text = ""
    if len(errors) == 0:
        head = ("# ساخته‌شده از روی متن اسکریپت با Khordegir Studio (AI Guide).\n"
                "# هر اسلاید با «- template:» شروع می‌شود. say = متن تله‌پرامپتر. layout: SLIDE | SCAM | CAM\n")
        yaml_text = head + yaml.safe_dump(data, allow_unicode=True, sort_keys=False, width=120)

    return {
        "ok": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "autoFixes": auto_fixes,
        "auto_fixes": auto_fixes,
        "yamlText": yaml_text,
        "yaml_text": yaml_text,
        "data": data,
    }


validateAndFixVideoYaml = validate_and_fix_video_yaml


def ai_import_to_project(raw_markup, target_path, pkg_root=None, append=False, title=None, theme=None):
    """Import AI output into target video.yaml (or project folder), creating or appending slides."""
    res = validate_and_fix_video_yaml(raw_markup, pkg_root=pkg_root)
    if not res["ok"]:
        return {
            "ok": False,
            "errors": res["errors"],
            "warnings": res["warnings"],
            "auto_fixes": res["auto_fixes"],
            "target": str(target_path),
            "slide_count": 0,
        }

    target = Path(target_path).expanduser().resolve()
    if target.is_dir() or target.suffix not in (".yaml", ".yml"):
        target_file = target / "video.yaml"
    else:
        target_file = target

    target_file.parent.mkdir(parents=True, exist_ok=True)
    img_dir = target_file.parent / "img"
    img_dir.mkdir(parents=True, exist_ok=True)

    imported_data = res["data"]
    if title:
        imported_data["title"] = title
    if theme:
        imported_data["theme"] = theme

    if append and target_file.exists():
        try:
            existing = yaml.safe_load(target_file.read_text(encoding="utf-8")) or {}
            existing_slides = existing.get("slides") or []
            existing_slides.extend(imported_data.get("slides") or [])
            existing["slides"] = existing_slides
            imported_data = existing
        except Exception:
            pass

    out_yaml = yaml.safe_dump(imported_data, allow_unicode=True, sort_keys=False, width=120)
    head = ("# ساخته‌شده با Khordegir Studio — ویرایشگر اسلاید متحرک.\n"
            "# هر اسلاید با «- template:» شروع می‌شود. say = متن تله‌پرامپتر. layout: SLIDE | SCAM | CAM\n")
    target_file.write_text(head + out_yaml, encoding="utf-8")

    return {
        "ok": True,
        "errors": [],
        "warnings": res["warnings"],
        "auto_fixes": res["auto_fixes"],
        "target": str(target_file),
        "slide_count": len(imported_data.get("slides") or []),
        "data": imported_data,
    }
