# نقشهٔ راه خرده‌گیر استودیو / Khordegir Studio Roadmap

> نسخهٔ ۲ — ۲۰۲۶-۱۱-۲۵. جایگزین نقشهٔ قبلی (که ۹۷ قالب را پیش از ویرایشگر می‌ساخت).
> مرجع‌ها: [PRINCIPLES.md](PRINCIPLES.md) (اصول و خط قرمزها) · [ARCHITECTURE.md](ARCHITECTURE.md) (معماری) · [ROADMAP-LOOP.md](ROADMAP-LOOP.md) (صف کارهای روزانه) · [docs-gemini-roadmap-review-2026-11-25.md](docs-gemini-roadmap-review-2026-11-25.md) (نقد Gemini).

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
| **0.5** | **تور ایمنی** | `tests/` در khordegir-studio: تست دود، رفت‌وبرگشت `video.yaml`، تحلیل آفلاین `mascot_lipsync`، رندر فریم‌به‌فریم `stage` | `unittest` + `node --test` سبز؛ رندر نمونه بدون خطا | انجام‌شده |
| **1 — MVP** | حلقهٔ بی‌ترمینال | `server.py` (stdlib، 127.0.0.1)؛ API پروژه/عکس/ساخت با پیشرفت؛ ویرایشگر واقعی: لیست اسلاید، فرم فارسی از `schema.json`، جابه‌جایی ترتیب، آپلود عکس، پیش‌نمایش زنده، دکمهٔ ساخت؛ لانچر دسکتاپ | تست E2E با Playwright: پروژهٔ تازه → عنوان → عکس → big_number → ساخت → وجود همهٔ خروجی‌ها، بدون CLI | ۱–۲ هفته |
| 2 | «پاورپوینت واقعی» | لایهٔ `A.field` (پوستهٔ بیرونی برای x/y/scale، هستهٔ درونی برای GSAP)؛ دستگیرهٔ کشیدن/اندازه؛ محافظ ناحیهٔ دوربین SCAM؛ دکمهٔ «انیمیشن دیگر» (seed)؛ توکن‌های معنایی تم + ۵ تم بازبینی‌شده (روشن، تیره، تحریریه) و «تصادفی» | جابه‌جایی پس از ذخیره/بارگذاری ±۱px پایدار؛ PNG رندر با پیش‌نمایش <۱٪ اختلاف؛ گالری همهٔ قالب‌ها × همهٔ تم‌ها بدون خطای کنتراست | ۱–۲ هفته |
| 3 | اسکریپت → اسلاید | تقسیم‌کنندهٔ بی‌نشانه در `importer.py` (یک پیاده‌سازی، حذف `importer.js`)؛ پیشنهاد قالب؛ پر کردن `say` | ۵ اسکریپت فارسی طلایی؛ ≥۸۰٪ پیشنهاد معقول | ۱ هفته |
| 4 | سرعت و بسته‌بندی | بازاستفادهٔ فریم ثابت (۲.۵ ثانیهٔ پایانی)، مسیر سریع CDP، کش افزایشی؛ نصب‌کنندهٔ یک‌کلیکی (Linux/Windows) | ساخت ۳۳ اسلاید ≥۴۰٪ سریع‌تر؛ ویرایش یک اسلاید <۱۵ ثانیه | ۱ هفته |
| 5 ✅ | شخصیت سخنگو، سیستم عروسک v2 (`puppet:`)، پروزودی و چندشخصیتی (`mascot_talk`) | ریگ ۱۸ بخشی و ۵ شخصیت (`red_eagle`, `vesper_owl`, `pip_pigeon`, `midge_hummingbird`, `barnaby_tortoise`)، ۶ لباس و ۷ پوستهٔ فصلی، ۱۳ اکسسوری با تعویض زمان‌بندی‌شده، حالت دیالوگ دو‌شخصیتی (`dialogue:`)، ورود آفلاین ریگ SVG (`import-rig`)، هم‌ترازسازی آوایی فارسی/انگلیسی با Coarticulation، کالیبراسیون ۱۰ ثانیه‌ای گوینده (`calibrate`)، OBS زنده با حذف نویز/PTT/MIDI/Stream Deck، و تب `Puppet Inspector` | ۱۰۰٪ آفلاین (127.0.0.1)، بدون `Math.random`، فریم‌به‌فریم دقیق روی `Stage.seek(t)` و همهٔ تست‌های Python/Node سبز | انجام‌شده (فاز ۱ تا ۴ عروسک · آیتم‌های ۱–۱۴) |
| 6 ✅ | ارتقای حرکت استودیو (A1، A2، A4) و ۱۲ قالب تازه (B1–B6) | توکن‌های مدت/استگر، ۱۷ منحنی شتاب، قوانین Overshoot و پیش‌حرکت/پیگیری، ۵ شخصیت حرکتی (`editorial`, `calm`, `punchy`, `playful`, `news`)، ۱۴ انیمیشن متن ایمن برای فارسی/انگلیسی (`typewriter`, `letter-wave`, `highlight-sweep`, `underline-draw`, `strike-through`, `counting-text` و...)، ۳۲ ترنزیشن پخش قطعی + زمان‌بندی پیشرفته، و ۱۲ قالب جدید سه‌فرمته (`breaking_news`, `fact_check`, `two_source_compare`, `definition_card`, `quiz_poll`, `mistake_vs_correct`, `step_by_step`, `hook_title`, `before_after`, `audiogram`, `comparison_table`, `newspaper_clip` — مجموع ۳۴ قالب) | تست‌های واحد Python + Node برای A1/A2/A4 و ۳۴ قالب در ۱۶:۹، ۹:۱۶ و ۱:۱ سبز؛ سقف زوم ۱.۰۶ رعایت‌شده | انجام‌شده (A1، A2، A4 و ۱۲ قالب B1–B6) |
| 7 ✅ | تکمیل موتور انیمیشن (A3، A5، A6، A7) و ۱۲ قالب تازه (B1–B7 · مجموع ۴۶ قالب) | موتور شکل و مسیر بدون پلاگین پولی (`A.drawPath`, `A.morphPath`, `A.maskWipe`, `A.blobReveal`, `A.lineArtReveal`)، دوربین مجازی قطعی با ۸ پریست دالی/پارالاکس/تغییر فوکوس/لرزش و سقف زوم ۱.۰۶ (به‌جز نقشه)، سیستم ذرات و آب‌وهوای بذردار قطعی با ۸ پریست (`studio-dust`, `gold-bokeh`, `celebration-confetti`, `warm-sparks`, `soft-rain`, `gentle-snow`, `news-grid-pulse`)، بسته نمودار نسخه ۲ (`barRace`, `donut`, `pie`, `area`, `scatter`, `choropleth`)، کنترل‌های ویرایشگر + ۱۲ قالب سه‌فرمتهٔ تازه (`by_the_numbers`, `vocabulary_card`, `flashcard_flip`, `list_countdown`, `comment_reply`, `guest_card`, `chapter_card`, `bar_race`, `donut_chart`, `map_choropleth`, `polaroid_wall`, `mascot_pip`) | تست‌های واحد Python + Node برای A3/A5/A6/A7 و هر ۴۶ قالب در ۱۶:۹، ۹:۱۶ و ۱:۱ سبز؛ قطعیت کامل `seek(t)` و بدون `Math.random` | انجام‌شده (کل بخش A کامل + ۴۶ قالب) |
| 8 | ویرایشگر تایم‌لاین و گردش کار حرفه‌ای (C1–C8) و پایداری (D1–D3) | تایم‌لاین چندلایه، اسکریپت-به-ویدیو، بانک دارایی آفلاین، Brand Kit، زیرنویس کارائوکه SRT، میکس صدا/داکینگ، صف رندر چندپلتفرمی و تست فریم طلایی | — | در صف بعدی |

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
