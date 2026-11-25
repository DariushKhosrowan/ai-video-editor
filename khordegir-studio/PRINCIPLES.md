# اصول و خط قرمزهای خرده‌گیر استودیو / Principles & Red Lines

> هر PR، هر قالب و هر پیشنهاد AI باید با این سند بخواند. اگر نخواند، رد می‌شود.

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

## اصول مهندسی
1. **پیش‌نمایش = خروجی.** یک stage واحد (`stage/stage.html`) هم برای ویرایشگر و هم برای رندر. هیچ مسیر رندر دومی ساخته نمی‌شود.
2. **قطعیت (determinism).** هر فریم = `Stage.seek(i/30)` + اسکرین‌شات. تصادفی فقط با seed. یک ورودی ← همیشه یک خروجی.
3. **`video.yaml` تنها منبع حقیقت.** ساده، خوانا، قابل ویرایش دستی، بدون شناسهٔ پنهان. ویرایشگر فقط آن را می‌خواند و می‌نویسد.
4. **قالب = داده + schema.** هر قالب یک پوشه با `schema.json` + `template.js`؛ فیلدهای قابل‌ویرایش روی بوم با `editable: true` و `A.field()` معرفی می‌شوند.
5. **پوسته جدا از انیمیشن.** موقعیت/اندازهٔ کاربر (x, y, scale) روی پوستهٔ بیرونی، انیمیشن GSAP روی هستهٔ درونی. هرگز روی یک عنصر.
6. **تم = توکن معنایی.** قالب‌ها رنگ hex مستقیم ندارند؛ فقط `bg, surface, text, muted, accent, danger`.
7. **فارسی‌اول.** RTL، Vazirmatn، اعداد فارسی، اتصال درست حروف در DOM (نه Canvas 2D).
8. **آفلاین و محلی.** سرور فقط روی `127.0.0.1`؛ بدون ابر، بدون حساب، بدون تله‌متری.
9. **یک پیاده‌سازی برای هر منطق.** تجزیهٔ اسکریپت فقط در Python؛ ویرایشگر از API می‌پرسد.
10. **هر تغییر، تست.** هر PR حداقل یک تست خودکار یا یک رندر نمونه.

## خط قرمزها (غیرقابل مذاکره)
- ⛔ قالب، تم یا افکت تازه **قبل از کار کردن حلقهٔ MVP** اضافه نمی‌شود.
- ⛔ کاربر هرگز مجبور به ترمینال، نوشتن کد، کی‌فریم یا تایم‌لاین نمی‌شود.
- ⛔ هیچ قابلیتی که `video.yaml` را بدون ویرایشگر غیرقابل ساخت کند.
- ⛔ پیش‌نمایشی که با MP4 نهایی فرق کند.
- ⛔ متن یا عنصری که در چیدمان SCAM روی ناحیهٔ دوربین `[24, 740, 584, 1055]` بیفتد.
- ⛔ وابستگی ابری، کلید API پولی یا ارسال داده به بیرون در مسیر اصلی.
- ⛔ بیش از ~۳۰ پوشهٔ قالب؛ گونه‌ها پارامتر می‌شوند، نه پوشهٔ جدا.
- ⛔ ادغام در `master`، force-push یا حذف تاریخچه بدون تأیید صاحب پروژه.
- ⛔ کتابخانه‌ای با مجوز ناسازگار. **هشدار باز:** مجوز استاندارد GSAP استفاده در ابزارهای ساخت انیمیشن بی‌کد که با Webflow رقابت کنند را منع می‌کند (به نقل Gemini، هنوز تأیید حقوقی نشده). پیش از انتشار عمومی/تجاری باید بررسی و در صورت لزوم جایگزین MIT (مثلاً anime.js یا Motion One) سنجیده شود.

## English (for contributors / AI)
Preview == output · deterministic seek rendering · video.yaml is the only source of truth · templates are data + schema · user transforms on an outer wrapper, GSAP on the inner node · themes are semantic tokens · Persian/RTL first, DOM text · offline, 127.0.0.1 only · one implementation per logic (Python) · every PR ships a test.
Red lines: no new templates/themes/FX before the MVP loop works; no terminal/code/keyframes for users; nothing that breaks editor-free rebuilds; no preview/output divergence; nothing in the SCAM webcam zone; no cloud/paid dependency in the core path; ≤30 template folders; no merge/force-push without owner approval; license-compatible deps only (GSAP no-code clause flagged, unverified).
