# نقشهٔ راه خرده‌گیر استودیو / Khordegir Studio Roadmap

> نسخهٔ ۲ — ۲۰۲۶-۱۱-۲۵. جایگزین نقشهٔ قبلی (که ۹۷ قالب را پیش از ویرایشگر می‌ساخت).
> مرجع‌ها: [PRINCIPLES.md](PRINCIPLES.md) (اصول و خط قرمزها) · [ARCHITECTURE.md](ARCHITECTURE.md) (معماری) · [ROADMAP-LOOP.md](ROADMAP-LOOP.md) (صف کارهای روزانه) · [docs-gemini-roadmap-review-2026-11-25.md](docs-gemini-roadmap-review-2026-11-25.md) (نقد Gemini).

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

## خلاصه در یک جمله
**اول یک حلقهٔ کامل و ساده برای تازه‌کار بساز (باز کن → بنویس → خروجی بگیر)، بعد آن را عمیق‌تر کن.** هیچ قالب، تم یا افکت تازه‌ای پیش از کار کردن این حلقه اضافه نمی‌شود.

## حلقهٔ MVP (تعریف «تمام‌شده»)
کاربری که هرگز ترمینال ندیده:
1. روی آیکون «خرده‌گیر استودیو» دوبار کلیک می‌کند → مرورگر روی `http://127.0.0.1:8765` باز می‌شود (رابط فارسی، راست‌به‌چپ).
2. «ویدیوی جدید» → اسلاید ۱ خودکار «عنوان» است؛ فقط عنوان را تایپ می‌کند.
3. با «+» اسلاید اضافه می‌کند، از ~۸ نوع اسلاید (عنوان، عدد بزرگ، فهرست، نقل‌قول، عکس+متن، جداکننده، مقایسه، نمودار ستونی) یکی را برمی‌دارد، متن می‌نویسد، عکس می‌کشد و رها می‌کند.
4. پیش‌نمایش زنده همان چیزی است که رندر می‌شود.
5. «ساخت ویدیو» → نوار پیشرفت → پوشه‌ای با MP4 هر اسلاید، PNG، PDF، تله‌پرامپتر و فایل OBS باز می‌شود.
6. همه‌چیز در `video.yaml` ساده ذخیره شده و بدون ویرایشگر هم دوباره ساخته می‌شود.

**کشیدن/تغییر اندازه، تم‌های متعدد، دکمهٔ «انیمیشن دیگر» و چسباندن اسکریپت در MVP نیستند**؛ بلافاصله بعد از آن می‌آیند.

## جریان نهایی کاربر (هدف محصول)
پروژهٔ تازه → نوشتن متن (اسکریپت) داخل خود نرم‌افزار → ساخت خودکار اسلایدها و انیمیشن‌ها → تله‌پرامپتر آماده → بستهٔ OBS (صحنه‌ها، اسلایدها، اسکریپت Lua) → ضبط. تولیدکننده فقط با همین نرم‌افزار کار می‌کند؛ نه ترمینال، نه ابزار دیگر. کمک هوش مصنوعی در نوشتن اختیاری است و هیچ‌وقت شرط کار نیست.

## فازها

| فاز | هدف | تحویلی‌ها | معیار خروج (قابل آزمون) | تخمین |
|---|---|---|---|---|
| 0 ✅ | موتور | stage، renderer، ffmpeg، ۱۷ قالب، خروجی OBS | — | انجام‌شده |
| **0.5** | **تور ایمنی** | `tests/` در khordegir-studio: ساخت دود (slide-15 + یک نمودار) → MP4/PNG/lua؛ تست رفت‌وبرگشت `video.yaml`؛ CI ساده (GitHub Actions، pytest) | `pytest` سبز؛ یک رندر نمونه بدون خطا | ۱ روز |
| **1 — MVP** | حلقهٔ بی‌ترمینال | `server.py` (stdlib، 127.0.0.1)؛ API پروژه/عکس/ساخت با پیشرفت؛ ویرایشگر واقعی: لیست اسلاید، فرم فارسی از `schema.json`، جابه‌جایی ترتیب، آپلود عکس، پیش‌نمایش زنده، دکمهٔ ساخت؛ لانچر دسکتاپ | تست E2E با Playwright: پروژهٔ تازه → عنوان → عکس → big_number → ساخت → وجود همهٔ خروجی‌ها، بدون CLI | ۱–۲ هفته |
| 2 | «پاورپوینت واقعی» | لایهٔ `A.field` (پوستهٔ بیرونی برای x/y/scale، هستهٔ درونی برای GSAP)؛ دستگیرهٔ کشیدن/اندازه؛ محافظ ناحیهٔ دوربین SCAM؛ دکمهٔ «انیمیشن دیگر» (seed)؛ توکن‌های معنایی تم + ۵ تم بازبینی‌شده (روشن، تیره، تحریریه) و «تصادفی» | جابه‌جایی پس از ذخیره/بارگذاری ±۱px پایدار؛ PNG رندر با پیش‌نمایش <۱٪ اختلاف؛ گالری همهٔ قالب‌ها × همهٔ تم‌ها بدون خطای کنتراست | ۱–۲ هفته |
| 3 | اسکریپت → اسلاید | تقسیم‌کنندهٔ بی‌نشانه در `importer.py` (یک پیاده‌سازی، حذف `importer.js`)؛ پیشنهاد قالب؛ پر کردن `say` | ۵ اسکریپت فارسی طلایی؛ ≥۸۰٪ پیشنهاد معقول | ۱ هفته |
| 4 | سرعت و بسته‌بندی | بازاستفادهٔ فریم ثابت (۲.۵ ثانیهٔ پایانی)، مسیر سریع CDP، کش افزایشی؛ نصب‌کنندهٔ یک‌کلیکی (Linux/Windows) | ساخت ۳۳ اسلاید ≥۴۰٪ سریع‌تر؛ ویرایش یک اسلاید <۱۵ ثانیه | ۱ هفته |
| 5 | گسترش قالب (خانواده، نه ۹۷ پوشه) | نمودار پارامتری، دیاگرام، نقشه، ماکاپ (خبر/توییت)، کارت افراد؛ سقف ~۲۵–۳۰ قالب | هر قالب: schema، تست A.field، گالری همهٔ تم‌ها، بدون هم‌پوشانی با SCAM | مداوم |
| 6 | زنده‌سازی | تصاویر زنده، پس‌زمینه‌های حلقه‌ای، صدای افکت از `sound_cues` | حلقهٔ بی‌درز؛ کنتراست ≥۴.۵:۱ | مداوم |
| 7 | حلقهٔ نقد | خروجی contact sheet → نقد AI → پیشنهاد اصلاح yaml (با تأیید انسان) | — | مداوم |

## سریع‌ترین مسیر MVP (ترتیب کار)
همان ۱۰ کار [ROADMAP-LOOP.md](ROADMAP-LOOP.md)؛ ترتیب MVP: **0.5 → 1 → 2 → 5 → 7** از آن فهرست (سرور، API، ویرایشگر، پیشرفت ساخت). بعد 3، 4، 6 (فاز ۲)، 9، 8، 10.

## روش کار (حلقهٔ بهبود)
- هر چرخه یک کار کوچک (۱–۴ ساعت)، روی شاخهٔ `studio-roadmap-loop`، کامیت کوچک، تست، push، به‌روزرسانی PR پیش‌نویس.
- کدنویسی سنگین در Google AI Studio (Build/Apps، تفکر بالا)؛ Hark هدایت، بازبینی و آزمون می‌کند.
- ادغام در `master` فقط با تأیید صاحب پروژه.

## English summary (for AI tools)
Build the **beginner end-to-end loop first** (desktop launcher → local server → real editor → one-click export) on the existing 17 templates. Then WYSIWYG drag/resize + reroll + themes, then script-to-slides, then render speed/packaging, then template *families* (≤30). Never add templates/themes/FX before the loop works. See PRINCIPLES.md for non-negotiables.

<details><summary>Previous roadmap (v1, superseded)</summary>

Phases: 0 core engine ✅ · 1 full template catalog · 2 variants + random · 3 alive images · 4 live backgrounds · 5 no-code editor · 6 script importer · 7 OBS integration · 8 critique loop. Superseded because it built ~97 templates before the editor contract existed (see Gemini review).
</details>

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
