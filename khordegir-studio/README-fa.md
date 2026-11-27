# Khordegir Studio — اسلایدهای متحرک بدون کدنویسی

برای کانال **خرده‌گیر**: یک فایل متنی ساده (`video.yaml`) می‌نویسی، برای هر اسلاید یک **قالب** انتخاب می‌کنی و چند فیلد پر می‌کنی؛
یک دستور، برای هر اسلاید یک ویدیوی متحرک `slide-NN.mp4` (۱۹۲۰×۱۰۸۰، ۳۰ فریم، H.264) + تصویر `slide-NN.png` + `slides.pdf` + فایل‌های OBS
(`steps_data.lua`، تله‌پرامپتر `prompter.html`) می‌سازد. هیچ هوش مصنوعی و هیچ کدنویسی لازم نیست.

## نصب و بروزرسانی با یک دستور (یکپارچه و خودکار)
برای نصب یا بروزرسانی استودیو، فقط کافیست دستور زیر را در ترمینال اجرا کنید:
```bash
# نصب خودکار با یک دستور:
bash install.sh
# یا از طریق npm:
npm run setup

# بروزرسانی در هر زمان با یک دستور:
bash install.sh --update
# یا از طریق npm:
npm run update

# اجرای وب‌استودیو و کنسول OBS:
npm start
```
پس از اجرا، آدرس‌های زیر در دسترس شما خواهند بود:
- **ویرایشگر اسلایدها و استیج کینتیک:** `http://localhost:3000/editor`
- **کنسول پخش زنده و پرامپتر OBS:** `http://localhost:3000/obs`
- **سورس بروزر برای ضبط در OBS:** `http://localhost:3000/obs-stage`

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
| `python3 -m khordegir lipsync audio.wav -o track.visemes.json` | تحلیل آفلاین صدا به ویزیم‌های لب (هم‌ترازسازی آوایی فارسی/انگلیسی + Coarticulation) و فایل پروزودی `*.prosody.json` |
| `python3 -m khordegir prosody audio.wav -o track.prosody.json` | تحلیل آفلاین لحن صدا (بلندی RMS/dB، زیر و بمی F0/YIN، مکث و تاکید) |
| `python3 -m khordegir calibrate sample.wav -o profile.json` | کالیبراسیون ۱۰ ثانیه‌ای گوینده (میانهٔ F0، بازهٔ زیر و بمی، کف نویز و آستانهٔ گیت) |
| `python3 -m khordegir import-rig character.svg -o rig.json` | ورود آفلاین فایل SVG با لایه‌های نام‌گذاری‌شده (فارسی/انگلیسی) به درخت ۱۸ بخشی با پیوت خودکار |
| `python3 -m khordegir index` | بازسازی خودکار فهرست قالب‌ها و تم‌ها |
| `python3 -m khordegir render videos/X --formats 16:9,9:16,1:1` | رندر فریم‌به‌فریم چندفرمته به MP4/PNG + OBS |
| `python3 -m khordegir editor` | ویرایشگر بصری + پیش‌نمایش زنده با صدا و بازرس کامل عروسک |

## شخصیت کارتونی سخنگو، عروسک‌گردانی با لحن صدا و سیستم چندشخصیتی (`mascot_talk` / Red Eagle Mascot)
قالب **`mascot_talk`** و لایهٔ اختیاری **`mascot:`** روی هر اسلاید دیگر، شخصیت کارتونی **عقاب قرمز** (و ۴ شخصیت دیگر روی همین ریگ ۱۸ بخشی) را با ریگ لایه‌لایهٔ SVG، **لحن صدای گوینده** (پروزودی)، هم‌ترازسازی آوایی و فنرهای تحلیلی هدایت می‌کند — کاملاً **آفلاین** و قطعی:

- **تحلیل آفلاین صدا، هم‌ترازسازی آوایی و کالیبراسیون گوینده (`mascot_lipsync.py`)**:
  ```bash
  python3 -m khordegir lipsync examples/mascot-demo/narration.wav \
    -o examples/mascot-demo/narration.visemes.json \
    -t examples/mascot-demo/transcript.json   # اختیاری (هم‌ترازسازی آوایی فارسی/انگلیسی + Coarticulation)

  python3 -m khordegir calibrate sample.wav -o speaker.calibration.json
  ```
  این دستور هم‌زمان فایل **`narration.prosody.json`** را کنار فایل ویزیم می‌سازد (شامل بلندی صدا RMS/dB، زیر و بمی صدا F0 با الگوریتم YIN، تغییر زیر و بمی `pitch_delta`، فلگ‌های صحبت/مکث و قله‌های تاکید در ۳۰ فریم بر ثانیه).
- **سیستم سفارشی‌سازی کامل عروسک (Puppet Schema v2 · `puppet:` در `video.yaml`) و تب «عروسک» در ویرایشگر (`Puppet Inspector`)**:
  - **درخت ۱۸ بخشی (Parts Tree) + ورود آفلاین SVG (`import-rig`)**: `body`, `head`, `beak_upper`, `beak_lower`, `eye_l`, `eye_r`, `pupil_l`, `pupil_r`, `lid_l`, `lid_r`, `brow_l`, `brow_r`, `crest`, `wing_l`, `wing_r`, `tail`, `legs`, `accessories` (با کنترل موقعیت X/Y، چرخش، مقیاس، پیوت، `zOrder`، ضخامت خط دور و نمایش/مخفی).
  - **۵ شخصیت روی یک ریگ + حالت دیالوگ (`dialogue:`)**: عقاب قرمز (`red_eagle`)، جغد وسپر (`vesper_owl`)، کبوتر پیپ (`pip_pigeon`)، مرغ مگس میج (`midge_hummingbird`) و لاک‌پشت بارنابی (`barnaby_tortoise`) با نوبت‌دهی خودکار، نگاه متقابل (`other`) و واکنش شنونده (`nodding`, `interested`, `skeptical`, `surprised`, `laughing`, `thoughtful`).
  - **۶ لباس، ۷ پوستهٔ فصلی/استودیویی و ۱۳ اکسسوری با تعویض زمان‌بندی‌شده**: لباس‌های `default`, `formal`, `podcast`, `royal`, `street`, `cozy`؛ پوسته‌های `classic`, `nowruz`, `yalda`, `winter`, `autumn`, `neon_studio`, `noir`؛ و تعویض قطعی در زمان `t` از طریق `accessoryTimeline` یا تگ‌های متنی `[acc:top_hat,monocle]` و `[outfit:formal]`.
  - **۱۰ پریست تک‌کلیکی آماده**: `calm`، `lively`، `dramatic`، `newsreader`، `comedian`، `whisper`، `shouting`، `sleepy`، `angry`، `excited` به‌همراه ذخیره/بارگذاری پریست کاربری، خروجی/ورودی JSON، کپی/پیست، بازنشانی، قفل پالت برند (`paletteLock`) و مقایسهٔ A/B.
  - **فیزیک فنر واقعی (`stiffness`, `damping`, `mass`) و حرکت ثانویه**: حل تحلیلی فنر در حالت‌های Underdamped / Critical / Overdamped، لرزش پرها (`featherJiggle`)، دنباله‌روی تاج بال (`crestOverlap`)، تداوم حرکت بال (`wingFollowThrough`) و کشش/فشردگی با حفظ دقیق حجم (`scaleX × scaleY = 1`).
  - **تنظیمات جمله‌ای و منحنی کی‌فریم (Per-Sentence & Keyframed Tone Curves)**: تغییر پریست، احساس، ژست، نگاه و گِین‌ها در طول زمان روی هر جمله یا کی‌فریم.
  - **۱۵ احساس + تگ‌های متنی + احساس خودکار از صدا + ۹ ژست و سیستم نگاه (Gaze)**.
- **حالت زندهٔ OBS (`obs-stage`) با میکروفون اختیاری (<100ms)، حذف نویز، PTT و Web MIDI / Stream Deck**:
  با باز کردن `http://127.0.0.1:3000/obs-stage/?project=X&mic=1` (یا فعال‌کردن `micReactive` در کنسول OBS) صدای زندهٔ میکروفون از طریق Web Audio (`AnalyserNode` + فیلتر HPF 80Hz + گیت نویز + YIN F0) با کلیدهای میانبر (`1–0` احساس‌ها، `Q–O` ژست‌ها، `Space` برای Push-to-Talk، `H` برای HUD و نمایشگر تاخیر) و پشتیبانی آفلاین از Web MIDI و Stream Deck مستقیم همین ریگ را در زمان واقعی هدایت می‌کند و هنگام خاموشی میکروفون به فایل پروزودی JSON برمی‌گردد.
- **پروژهٔ نمونه و تست‌ها**:
  - پروژهٔ نمونه: `examples/mascot-demo/` (`video.yaml`, `narration.wav`, `narration.visemes.json`, `narration.prosody.json`, `transcript.json`)
  - تست‌های خودکار:
    ```bash
    PYTHONPATH=. python3 -m unittest discover -s tests -v
    node --test tests/test_stage_render.mjs
    ```

مستندات فنی: [ARCHITECTURE.md](ARCHITECTURE.md) · [HANDOFF.md](HANDOFF.md) · [ROADMAP.md](ROADMAP.md) · [LICENSES](LICENSES)

