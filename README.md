# AI Video Editor

ابزارک متن‌باز برای **ویرایش ویدیو به کمک دستیار هوش مصنوعی** (Agent-assisted video editing).
این پروژه از گردش‌کار (pipeline) کاملاً خودکار و قطعی (deterministic) استفاده می‌کند تا هر مدل زبانی
یا انسان بتواند با دستور زبان طبیعی، ویدیو را ویرایش کند: رونویسی → تحلیل → اُوِرلی → ضبط walkthrough → کامپوزیت.

> این پروژه در عمل برای ویرایش ویدیوی معرفی «چالش ورزش همگانی» خسروان استفاده شد
> (`khosrowan.ir/sport/`) و خروجی واقعی آن تولید شد.

---

## چرا؟

ویرایش ویدیو معمولاً به ابزارهای سنگین GUI نیاز دارد. اما بخش بزرگی از کارهای تکرارشونده
(یافتن بخش‌های کلیدی، افزودن متن/آدرس، درج ویدیوی فرعی، نرمال‌سازی صدا) **کاملاً قابل برنامه‌ریزی** است.
این مخزن آن کارها را به ماژول‌های کوچک که هر کدام یک کار را درست انجام می‌دهند، تجزیه می‌کند
و یک CLI واحد برای راندن کل زنجیره در اختیار می‌گذارد.

## گردش‌کار

```
1) transcribe   رونویسی ویدیو (faster-whisper، پشتیبانی فارسی)
2) timeline      یافتن بخش‌های کلیدی از رونویسی (مثلاً «سایت»، «ورزش»)
3) badge         ساخت برچسب آدرس فارسی (PIL + arabic_reshaper)
4) walkthrough   ضبط واقعی مرورگر از یک جریان وب (Playwright + Chrome)
5) motion        ساخت ویدیو از اسکرین‌شات‌ها (Ken Burns + crossfade)
6) compose       کامپوزیت نهایی: اُوِرلی + ویدیوی فرعی (PiP) + نرمال‌سازی صدا
```

## نصب

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install -e .
# برای ضبط walkthrough مرورگر:
python3 -m playwright install chromium   # یا channel=chrome با Chrome نصب‌شده
```

نیازمندی سیستم: `ffmpeg` + `ffprobe` در PATH، و یک فونت فارسی (Vazirmatn توصیه می‌شود).

## استفاده

```bash
# 1) رونویسی
ai-video-editor transcribe video.mp4 small > transcript.txt

# 2) یافتن بخش «سایت»
ai-video-editor timeline transcript.txt سایت آدرس => windows.txt

# 3) ساخت برچسب آدرس
ai-video-editor badge khosrowan.ir "سایت شخصی" -o overlay_url.png

# 4) ضبط جریان وب (مراحل در JSON)
ai-video-editor walkthrough steps.json -o wt/

# 5) تبدیل اسکرین‌شات‌ها به ویدیوی متحرک
ai-video-editor motion shots.json -o walkthrough.mp4

# 6) کامپوزیت نهایی
ai-video-editor compose video.mp4 overlays.json -o edited.mp4
```

### نمونه `steps.json` (ضبط walkthrough)

```json
[
  {"url":"https://khosrowan.ir/sport/","wait":1.5,"shot":"01_hero.png"},
  {"url":"https://khosrowan.ir/sport/","scroll_to":700,"wait":0.8,"shot":"02_howto.png"},
  {"url":"https://khosrowan.ir/sport/","scroll_into":"report","wait":1.0,"shot":"03_form.png"},
  {"url":"https://khosrowan.ir/wp-login.php","wait":1.5,"shot":"04_login.png"},
  {"url":"https://khosrowan.ir/wp-login.php","fill":{"#user_login":"user","#user_pass":"secret"},"wait":0.5,"shot":"05_login_filled.png"}
]
```

### نمونه `overlays.json` (کامپوزیت)

```json
[
  {"type":"badge","file":"overlay_url.png","x":90,"y":60,"start":27,"end":46},
  {"type":"pip","file":"walkthrough.mp4","x":36,"y":1512,"w":600,"h":338,"start":27.5,"end":47.5}
]
```

> مختصات برای قاب عمودی ۱۰۸۰×۱۹۲۰ است. پروژه قاب را به‌صورت قطعی می‌سازد
> (scale+pad) تا صرف‌نظر از متادیتای چرخش سورس، اُوِرلی‌ها همیشه سر جای خود باشند.

---

## یافته‌های تحقیق (چرا این‌ها بهترین‌ها هستند)

هنگام طراحی، بستر ابزارهای متن‌باز/مرتبط بررسی شد. خلاصه ارزیابی:

| ابزار | امتیاز | ارزیابی |
|---|---|---|
| **Kinocut** (KyaniteLabs) | ★★★★★ | MCP server برای ادیت ویدیو با agent؛ تایپ‌شده، guardrailed، «Video Receipt» برای تأیید کیفیت قبل انتشار. ایده‌آل برای Claude Code / Cursor / Hermes. |
| **FireRed-OpenStoryline** (Tencent) | ★★★★ | Agent کامل برای تولید ویدیو از گفتگو؛ تولید اسکریپت، پیشنهاد موسیقی، ذخیره «Skill» مشترک. سنگین‌تر و نیازمند مدل‌های بزرگ. |
| **ViralCutter** | ★★★☆ | تولید کلیپ از YouTube؛ بهینه برای Shorts/Reels، نه بررسی کامل. |
| **ai-video-editing-skill** (znyupup) | ★★★★ | یک فایل Skill برای agent ها که گردش‌کار کامل تحلیل→برنامه‌ریزی→پیش‌نمایش→رندر را تعریف می‌کند؛ الهام‌بخش برای طراحی API ما. |
| **VidioPy** | ★★★☆ | جایگزین مدرن MoviePy؛ برای کامپوزیت برنامه‌ای عالی اما ناپخته‌تر از ffmpeg. |
| **llm_video_editor** | ★★☆ | تولید دستور ffmpeg از زبان طبیعی؛ ساده و GUIمحور. |
| **DeadAir** | ★★★☆ | pipeline رونویسی→حذف سکوت/کلمات پرکننده→EDL؛ ایده خوب، پیاده‌سازی سنگین (Redis). |
| **PostHog/AudioNormalize (loudnorm)** | ★★★★ | استاندارد صنعت: نرمال‌سازی بلندی صدا با `loudnorm` (EBU R128). |

### تصمیم‌های معماری

- **ffmpeg به‌عنوان موتور رندر** — با وجود کتابخانه‌هایی مثل MoviePy/VidioPy، کل ffmpeg
  برای کنترل دقیق فیلترها (zoompan, xfade, overlay, loudnorm) و سرعت، بهترین انتخاب است.
- **faster-whisper** برای رونویسی — سریع، آفلاین، و با `language="fa"` خروجی فارسی قابل قبولی می‌دهد.
- **Playwright + سیستم Chrome** برای ضبط walkthrough — به‌جای ضبط فریم‌به‌فریم نمایشگر
  (که نیازمند X11 زنده است)، اسکرین‌شات‌های مرحله‌ای می‌گیریم و با zoompan متحرک می‌کنیم؛
  خروجی تمیزتر و قابل‌کنترل‌تر است.
- **PIL + arabic_reshaper + python-bidi** برای متن فارسی — بدون این‌ها حروف فارسی
  جدا و جهت‌دار درست رندر نمی‌شوند.
- **قاب عمودی قطعی (scale+pad)** — چرخش متادیتای گوشی‌ها می‌تواند مختصات را به‌هم بریزد؛
  پروژه قاب را اجباری می‌کند.

## ساختار

```
ai_video_editor/
  __init__.py
  transcribe.py   # faster-whisper
  timeline.py      # یافتن/ادغام بازه‌های زمانی
  overlay.py       # برچسب فارسی
  walkthrough.py   # ضبط مرورگر
  motion.py        # Ken Burns + crossfade
  compose.py       # کامپوزیت نهایی
  cli.py           # CLI
pyproject.toml
examples/
  steps.json
  shots.json
  overlays.json
tests/
```

## مجوز

MIT
