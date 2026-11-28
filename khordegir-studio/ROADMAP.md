# Roadmap

| Phase | Goal | Deliverables |
|---|---|---|
| 0 ✅ | Core engine | HTML stage, seek renderer, ffmpeg, template folders, video.yaml build, OBS outputs, 17 templates, seeded entrance variants, grain/dust/leak/depth, sound cues |
| 0.5 ✅ (2026-11-28) | Bilingual engine | LTR themes (`dir/digits/font`), `english-convey` theme, direction helpers, fit() fix, bilingual gallery, 9 new templates: kinetic_text, quote_card, study_card, split_compare, stat_bars, lower_third, punch_in, chapter_card, doc_highlight (26 total) |
| 1 | Full template catalog | maps, every chart family, curves, diagrams, shapes/annotations, document & social mockups, people cards — one folder each with schema/example/preview; gallery grouped by category |
| 2 | Variants + random | 3–5 entrance and idle variants per template, `variant/motion: random` per slide, gallery matrix to QA every combination |
| 3 | Alive images | seeded drift/rotation/float/parallax for image frames, depth layers, safe-area dimming under text |
| 4 | Live backgrounds | bokeh, dust, aurora/mesh gradient, light rays, moving grid, flow field, floating shapes, glow orbs; `background: random`; seamless loop MP4 export for OBS (`khordegir bg`) |
| 5 | No-code editor | offline `editor/index.html`: gallery picker, Persian forms from schema.json, drag reorder, live preview (same stage), YAML save/load, theme dropdown, script import |
| 6 | Script importer | full marker grammar for all templates, `---` steps, `>>>` prompter lines, smart default layouts |
| 7 | OBS integration | one-click copy to HarkStudio, SFX track from sound cues, per-step zoom presets, live preview inside OBS browser source |
| 8 | Critique loop | export contact sheet + mid-frames → AI Studio / ChatGPT critique prompt → apply fixes to yaml (human-approved) |

## اصل محوری محصول (درخواست صاحب پروژه، ۲۰۲۶-۱۱-۲۵) / Core product principle

**فارسی:** همه‌چیز باید برای یک کاربر کاملاً تازه‌کار، در یک محیط بسیار ساده، قابل ساخت و بازنویسی باشد؛ چیزی شبیه پاورپوینت اما با انیمیشن‌های کاملاً آماده.
- کاربر برنامه را باز می‌کند، اسلاید اول را «عنوان ویدیو» انتخاب می‌کند و فقط عنوان را تایپ می‌کند.
- «قالب کلی ویدیو» (تم/استایل) را از میان تعداد زیادی تم انتخاب می‌کند یا «تصادفی» می‌گذارد.
- برای هر اسلاید متن را وارد می‌کند و می‌تواند با کشیدن، متن را جابه‌جا کند و اندازه‌اش را تغییر دهد (و موارد ساده‌ی مشابه: رنگ تأکیدی، عکس، چیدمان دوربین).
- انیمیشن‌ها آماده‌اند و کاربر هرگز کد یا تایم‌لاین نمی‌نویسد؛ فقط نوع اسلاید و در صورت تمایل «یک انیمیشن دیگر» (reroll).
- چسباندن یک اسکریپت کامل ← تبدیل خودکار به پیش‌نویس اسلایدها با پیشنهاد قالب برای هر بند ← کاربر فقط اصلاح می‌کند.
- هدف: کمترین زمان و کمترین تغییر؛ از اسکریپت تا اسلایدهای زنده و حرفه‌ای یوتیوبی در چند دقیقه. خروجی: MP4 هر اسلاید، PNG، PDF، تله‌پرامپتر، فایل OBS.

**English (for contributors / Gemini):** The product is "PowerPoint for animated YouTube explainers" for absolute beginners. Requirements:
1. Open app → slide 1 defaults to "Video title" type → user only types the title.
2. Pick a global video theme from a large theme library, or "Random".
3. Per slide: pick a slide type (or accept the suggested one), type text; text boxes can be dragged and resized directly on the canvas (WYSIWYG), stored as optional per-field overrides (x, y, scale) in video.yaml so templates stay intact.
4. Zero animation authoring: every type ships with ready, professional, seeded random animation variants; a single "shuffle animation" button rerolls the seed.
5. Script-to-slides: paste a whole script → auto-split into slides with a suggested template per paragraph (numbers → big_number, lists → bullet_list, quotes → quote, etc.) → user just tweaks.
6. One-click export (MP4 per slide, PNG, PDF, teleprompter, OBS step file). Persian UI, RTL, no terminal needed (desktop launcher), works offline.
7. Every edit must round-trip to plain video.yaml so videos can be rebuilt later without the editor or any AI.

## Next for the bilingual library (from the 2026-11-28 build)
- Port the remaining RTL-only chart code (charts.js `hbar`, `compare`) to the direction helpers so they mirror in LTR themes.
- More LTR themes (light "paper" theme, high-contrast) and per-template variant sets (e.g. kinetic_text: word / line / letter).
- Transition clips between slides (wipe/punch) exported as separate short MP4s for the editor timeline.
- Golden-frame tests for every template × theme × layout (the test harness used on 2026-11-28 lives in english-convey-long-videos/process).
