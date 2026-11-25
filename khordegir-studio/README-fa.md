# Khordegir Studio — اسلایدهای متحرک بدون کدنویسی

برای کانال **خرده‌گیر**: یک فایل متنی ساده (`video.yaml`) می‌نویسی، برای هر اسلاید یک **قالب** انتخاب می‌کنی و چند فیلد پر می‌کنی؛
یک دستور، برای هر اسلاید یک ویدیوی متحرک `slide-NN.mp4` (۱۹۲۰×۱۰۸۰، ۳۰ فریم، H.264) + تصویر `slide-NN.png` + `slides.pdf` + فایل‌های OBS
(`steps_data.lua`، تله‌پرامپتر `prompter.html`) می‌سازد. هیچ هوش مصنوعی و هیچ کدنویسی لازم نیست.

## نصب روی اوبونتو (یک بار)
```bash
sudo apt install python3-pip ffmpeg
cd khordegir-studio
pip install -r requirements.txt
python3 -m playwright install --with-deps chromium
```

## ساختن یک ویدیو
1. پوشه‌ی جدید:  `python3 -m khordegir new videos/my-video`  (یک `video.yaml` نمونه با همه‌ی قالب‌ها می‌سازد)
2. عکس‌ها را در `videos/my-video/img/` بگذار.
3. `video.yaml` را با هر ویرایشگر متنی باز کن؛ برای هر اسلاید قالب را انتخاب کن و متن‌ها/عددها را بنویس:
```yaml
title: اسم ویدیو
slides:
  - template: big_number        # عدد بزرگ که از صفر می‌شمارد
    number: 80
    suffix: "٪"
    color: danger               # accent = زرد (مثبت/کلیدی)  ،  danger = قرمز (بد)
    caption: شرکت‌هایی که باج دادند دوباره هدف حمله قرار گرفتند
    image: ransom.jpg
    source: Cybereason, 2022
    layout: SCAM                # SLIDE = اسلاید تمام‌صفحه ، SCAM = اسلاید + من (گوشه‌ی پایین-چپ خالی) ، CAM = فقط من
    say: متن تله‌پرامپتر این اسلاید...
```
4. ساخت:  `python3 -m khordegir build videos/my-video`  (یا روی `build.sh` دوبار کلیک کن)
5. خروجی در `videos/my-video/out/` است. برای کپی مستقیم در پوشه‌ی HarkStudio:
   `python3 -m khordegir build videos/my-video --copy-to ~/HarkStudio --copy mp4,png,steps,prompter`

## قالب‌ها
فهرست کامل با تصویر و فیلدها: [`khordegir/gallery/GALLERY.md`](khordegir/gallery/GALLERY.md) — اسم‌ها:
`title_card` `big_number` `image_text` `bar_chart` `bullet_list` `line_chart` `compare` `counter_grid` `quote`
`section_break` `image_full` `three_cards` `chat` `timeline` `chart` (از فایل JSON) `layers` (طرح لایه‌ای JSON) `cam`.

نکته‌ها:
- رنگ داخل متن: `*زرد*` ، `~قرمز~` ، `_خاکستری_` ، `==هایلایت==` ، `__زیرخط__`
- هر اسلاید خودکار یک سبک ورود/حرکت می‌گیرد (ثابت برای هر بار ساخت). برای عوض کردن: `seed: 2` یا `variant: mask` (rise/slide/mask/blur/scale) یا `motion: zoom-out`.
- طول کلیپ: `duration: 20` (پیش‌فرض ۶ ثانیه؛ ۲٫۵ ثانیه‌ی آخر کاملاً ثابت است چون OBS روی فریم آخر می‌ماند).
- قدم‌های بیشتر روی یک اسلاید (هر PageDown در OBS): `steps: [{say: "...", layout: SCAM}]`
- فقط چند اسلاید:  `--only 3,9-12` ؛ فقط عکس و PDF (سریع):  `--no-video`
- ساخت دوباره فقط اسلایدهای تغییرکرده را می‌سازد.
- نشانه‌های صدا (برای افکت در تدوین): `out/sound_cues.txt`

## دستورها
| دستور | کار |
|---|---|
| `python3 -m khordegir build videos/X` | ساخت همه‌چیز |
| `python3 -m khordegir new videos/X` | ویدیوی جدید از نمونه |
| `python3 -m khordegir import script.txt -o videos/X/video.yaml` | ساخت video.yaml از متن اسکریپت با نشانه‌های `[عدد ۸۰٪ \| ...]` |
| `python3 -m khordegir render spec.json -o out.mp4` | یک نمودار/طرح از فایل JSON |
| `python3 -m khordegir gallery` | ساخت تصویر پیش‌نمایش قالب‌ها |
| `python3 -m khordegir editor` | ویرایشگر (فعلاً فقط پیش‌نمایش قالب‌ها) |

مستندات فنی: [ARCHITECTURE.md](ARCHITECTURE.md) · [HANDOFF.md](HANDOFF.md) · [ROADMAP.md](ROADMAP.md)
