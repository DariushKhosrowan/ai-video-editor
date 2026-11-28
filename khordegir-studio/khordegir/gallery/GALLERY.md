# گالری قالب‌ها

هر قالب: یک تصویر از فریم آخر، اسمی که در `video.yaml` می‌نویسی و فیلدهایش.
قاب زرد خط‌چین در پیش‌نمایش‌ها فقط جای دوربین را نشان می‌دهد (در خروجی نیست).

![همه‌ی قالب‌ها](gallery.png)

## کارت عنوان — `template: title_card`

دسته: متن

یک عنوان بزرگ با تیتر کوچک و زیرعنوان؛ می‌تواند روی یک عکس تمام‌صفحه‌ی تیره باشد. برای شروع ویدیو یا شروع هر بخش.

![title_card](../templates/title_card/preview.png)

| فیلد | توضیح |
|---|---|
| `eyebrow` | تیتر کوچک بالا |
| `title` | عنوان اصلی (*زرد* ، ~قرمز~) (لازم) |
| `subtitle` | زیرعنوان |
| `image` | عکس پس‌زمینه (اختیاری) |
| `dim` | تیرگی عکس (۰ تا ۱) |
| `align` | جای متن |

نمونه:

```yaml
- template: title_card
  eyebrow: یک سؤال ساده
  title: پول می‌دی یا به *پلیس* زنگ می‌زنی؟
  subtitle: قانونی که پشت همه‌ی باج‌گیری‌ها هست
  layout: SLIDE
```

## عدد بزرگ — `template: big_number`

دسته: عدد

یک عدد خیلی بزرگ که از صفر می‌شمارد (مثل ۸۰٪) با یک جمله زیرش؛ اختیاری با عکس کنارش.

![big_number](../templates/big_number/preview.png)

| فیلد | توضیح |
|---|---|
| `number` | عدد (لازم) |
| `prefix` | قبل از عدد (مثل + یا حدود) |
| `suffix` | بعد از عدد (مثل ٪ یا نفر) |
| `from` | شروع شمارش از |
| `color` | رنگ عدد |
| `eyebrow` | تیتر کوچک بالای عدد |
| `caption` | جمله‌ی زیر عدد |
| `detail` | توضیح کوچک |
| `image` | عکس کنار (اختیاری) |
| `motion` | حرکت عکس |

نمونه:

```yaml
- template: big_number
  number: '80'
  suffix: ٪
  color: danger
  caption: شرکت‌هایی که باج دادند، دوباره هدف حمله قرار گرفتند
  detail: نظرسنجی از نزدیک به ۱٬۵۰۰ مدیر امنیت
  source: Cybereason, 2022
  layout: SCAM
```

## عکس + متن — `template: image_text`

دسته: تصویر

یک عکس در قاب گرد (آرام نفس می‌کشد) و کنارش تیتر کوچک، عنوان، متن و چند نکته.

![image_text](../templates/image_text/preview.png)

| فیلد | توضیح |
|---|---|
| `image` | عکس (لازم) |
| `eyebrow` | تیتر کوچک (زرد) |
| `title` | عنوان |
| `text` | متن |
| `points` | نکته‌ها / کارت‌ها (هر خط یکی) |
| `motion` | حرکت عکس |
| `fit` | جای‌گیری عکس |
| `shape` | شکل قاب |

نمونه:

```yaml
- template: image_text
  eyebrow: بی. اف. اسکینر، ۱۹۵۷
  title: پاداشِ گاه‌به‌گاه
  text: سرسخت‌ترین رفتار وقتی ساخته می‌شه که *فقط گاهی* جواب بگیره
  source: Ferster & Skinner, 1957
  layout: SCAM
```

## Kinetic Text — `template: kinetic_text`

دسته: text

Word-by-word kinetic typography with rise and blur-in; *emphasis* words punch in accent colour with an underline sweep.

![kinetic_text](../templates/kinetic_text/preview.png)

| فیلد | توضیح |
|---|---|
| `eyebrow` | Eyebrow (optional) |
| `text` | Sentence (*accent* ~danger~ _muted_ ==highlight==) (لازم) |
| `align` | Alignment |
| `size` | Text Size |

نمونه:

```yaml
- template: kinetic_text
  eyebrow: THE CORE IDEA
  text: 'A boundary says what *you* won''t do.
  
    A principle makes others ~question~ what they''re doing.'
  align: center
  size: auto
  layout: SCAM
```

## نمودار میله‌ای — `template: bar_chart`

دسته: نمودار

میله‌ها از پایین رشد می‌کنند و عددها روی‌شان می‌شمارند. افقی هم می‌شود (برای برچسب‌های بلند).

![bar_chart](../templates/bar_chart/preview.png)

| فیلد | توضیح |
|---|---|
| `title` | عنوان |
| `subtitle` | زیرعنوان |
| `data` | داده‌ها |
| `prefix` | قبل از عدد (مثل +) |
| `suffix` | بعد از عدد (مثل ٪) |
| `highlight` | میله‌ی برجسته (برچسب یا شماره) |
| `orientation` | جهت |
| `ymax` | سقف محور (اختیاری) |
| `axis` | محور و خطوط راهنما |

نمونه:

```yaml
- template: bar_chart
  title: آدم‌ربایی‌های ثبت‌شده در ایتالیا
  data:
  - label: ۱۹۶۹ تا ۱۹۹۱
    value: 630
    color: danger
  - label: ۷ سال بعد از قانون ۱۹۹۱
    value: 38
    color: accent
  source: Bohlen / NYT, 1998; Avraham & Porat, 2023
  layout: SLIDE
```

## Quote Card — `template: quote_card`

دسته: text

Editorial pull-quote card with oversized animated quotation mark, drawing accent rule, author attribution, and optional portrait on the end side.

![quote_card](../templates/quote_card/preview.png)

| فیلد | توضیح |
|---|---|
| `eyebrow` | Eyebrow (optional) |
| `quote` | Quote (لازم) |
| `author` | Author (لازم) |
| `role` | Role / Publication / Year |
| `image` | Portrait Image (optional) |
| `tone` | Accent Colour |
| `motion` | Portrait Motion |

نمونه:

```yaml
- template: quote_card
  eyebrow: MORAL REBELS
  quote: Rebels are resented when their *implicit reproach* threatens the positive self-image of individuals who did
    not rebel.
  author: Monin, Sawyer & Marquez
  role: Journal of Personality and Social Psychology, 2008
  tone: accent
  layout: SCAM
```

## جمله‌ی کلیدی — `template: quote`

دسته: متن

یک جمله‌ی بزرگ و پررنگ (با کلمه‌ی زرد/قرمز) و یک خط توضیح کوچک‌تر. برای قانون‌ها و جمع‌بندی‌ها.

![quote](../templates/quote/preview.png)

| فیلد | توضیح |
|---|---|
| `text` | جمله (*زرد* ، ~قرمز~) (لازم) |
| `highlight` | خط دوم بزرگ‌تر (اختیاری) |
| `highlight_color` | رنگ خط دوم |
| `caption` | توضیح کوچک |
| `author` | گوینده (اختیاری) |

نمونه:

```yaml
- template: quote
  text: هر رفتاری که پاداشش بدی،
  highlight: بیشتر می‌شه
  layout: SCAM
```

## فهرست / کارت‌ها — `template: bullet_list`

دسته: متن

چند مورد که یکی‌یکی وارد می‌شوند؛ با شماره یا بدون آن، یک یا دو ستون.

![bullet_list](../templates/bullet_list/preview.png)

| فیلد | توضیح |
|---|---|
| `eyebrow` | تیتر کوچک |
| `title` | عنوان |
| `items` | موردها (هر خط یکی؛ *زرد* ~قرمز~) (لازم) |
| `numbered` | شماره‌دار |
| `columns` | تعداد ستون |

نمونه:

```yaml
- template: bullet_list
  title: سه سؤالِ قبل از کوتاه اومدن
  items:
  - کی زیر فشاره و کی داره از بقیه خرج می‌کنه؟
  - اولین بارشه یا تبدیل به عادت شده؟
  - پناه و اهرم داری یا واقعاً ~گروگانِ بقایی؟~
  layout: SLIDE
```

## Study Card — `template: study_card`

دسته: data

Research citation card with study eyebrow, authors, journal, sample-size badge, one-sentence finding, 1–3 count-up numbers, and optional caveat.

![study_card](../templates/study_card/preview.png)

| فیلد | توضیح |
|---|---|
| `eyebrow` | Eyebrow (e.g. STUDY · 2008) |
| `sample` | Sample Size Badge (e.g. n = 51) |
| `authors` | Authors & Year (لازم) |
| `journal` | Journal / Institution |
| `finding` | Key Finding (1 sentence) (لازم) |
| `stats` | 1–3 Numbers (Label: Value | tone per line) (لازم) |
| `caveat` | Caveat / Limitation (optional) |

نمونه:

```yaml
- template: study_card
  eyebrow: STUDY · 2008
  sample: Columbia students
  authors: Flynn & Lake (2008)
  journal: Journal of Personality and Social Psychology
  finding: Asked to find one stranger who would walk them to the gym, people *overestimated* how many they'd need
    to ask.
  stats: 'Predicted asks: 7.2 | danger
  
    Actual asks: 2.3 | accent'
  caveat: Study 2 · most students already knew where the gym was.
  layout: SCAM
```

## نمودار خطی — `template: line_chart`

دسته: نمودار

یک یا چند خط که از چپ به راست کشیده می‌شوند، با برچسب در انتهای هر خط و خط‌چین‌های رویداد.

![line_chart](../templates/line_chart/preview.png)

| فیلد | توضیح |
|---|---|
| `title` | عنوان |
| `subtitle` | زیرعنوان |
| `series` | خط‌ها: «اسم: عدد، عدد، …» هر خط یک سطر |
| `x_labels` | برچسب محور افقی (مثل: ۱=هفته ۱، ۵=هفته ۵) |
| `vlines` | خط‌چین رویداد (مثل: ۵=شروع جریمه) |
| `suffix` | واحد محور عمودی (مثل ٪) |
| `ymax` | سقف محور عمودی |
| `badge` | برچسب کوتاه کنار عنوان (مثل: نمودار مفهومی) |

نمونه:

```yaml
- template: line_chart
  title: سهم همکاری در هر دور بازی
  series: 'با تنبیه: 13.5, 15.5, 16.5, 17.2, 17.6, 17.9, 18.2, 18.4, 18.5, 18.2
  
    بدون تنبیه: 10, 9.4, 8.9, 8.5, 8.1, 7.7, 7.2, 6.5, 5.5, 3.2'
  ymax: 20
  source: Fehr & Gächter, 2000 (AER)
  layout: SLIDE
```

## Split Compare — `template: split_compare`

دسته: compare

Two side-by-side panels following reading direction with tone, optional icon/emoji, headline, body, drawing center divider, popping VS badge, and optional verdict.

![split_compare](../templates/split_compare/preview.png)

| فیلد | توضیح |
|---|---|
| `eyebrow` | Eyebrow (optional) |
| `title` | Header Title (optional) |
| `a_icon` | Side A — Icon / Emoji (optional) |
| `a_title` | Side A — Headline (لازم) |
| `a_body` | Side A — Body (lines or paragraph) |
| `a_tone` | Side A — Tone |
| `b_icon` | Side B — Icon / Emoji (optional) |
| `b_title` | Side B — Headline (لازم) |
| `b_body` | Side B — Body (lines or paragraph) |
| `b_tone` | Side B — Tone |
| `vs_label` | Center Badge Label |
| `verdict` | Verdict Line (optional) |
| `verdict_tone` | Verdict Tone |

نمونه:

```yaml
- template: split_compare
  eyebrow: TWO KINDS OF NO
  title: Same word, *different* weight
  a_icon: 🍦
  a_title: Personal boundary
  a_body: '"I''m skipping coffee tonight."
  
    Says what you won''t do
  
    No verdict on anyone else'
  a_tone: accent
  b_icon: ⚖️
  b_title: Principled refusal
  b_body: '"I won''t join this."
  
    Can feel like a verdict
  
    May make others question themselves'
  b_tone: danger
  vs_label: VS
  verdict: Most everyday refusals land *softer* than we fear.
  verdict_tone: accent
  layout: SCAM
```

## قبل ← بعد — `template: compare`

دسته: عدد

دو یا سه عدد بزرگ با فلش بینشان (مثل ۸ ← ۱۶ ← ۱۹). از راست به چپ خوانده می‌شود.

![compare](../templates/compare/preview.png)

| فیلد | توضیح |
|---|---|
| `title` | عنوان |
| `steps` | مرحله‌ها |
| `suffix` | واحد مشترک (مثل ٪) |

نمونه:

```yaml
- template: compare
  title: میانگین تأخیر هفتگی در مهدکودک‌ها
  steps:
  - value: 8
    label: قبل از جریمه
    color: muted
  - value: 16
    prefix: +
    label: با جریمه‌ی ۳ دلاری
    color: accent
  - value: 19
    prefix: ≈
    label: بعد از حذف جریمه
    color: danger
  source: Gneezy & Rustichini, 2000
  layout: SLIDE
```

## Stat Bars — `template: stat_bars`

دسته: data

Horizontal comparison bars (2–7 rows) with start-aligned labels, bars growing from start, count-up values at bar ends, one highlighted bar, optional suffix and max.

![stat_bars](../templates/stat_bars/preview.png)

| فیلد | توضیح |
|---|---|
| `eyebrow` | Eyebrow (optional) |
| `title` | Title |
| `subtitle` | Subtitle (optional) |
| `items` | Rows (Label: Value per line; wrap *Label* to highlight) (لازم) |
| `highlight` | Highlighted Row (label or 1-based #; blank = *marked* or max) |
| `max` | Max Scale Value (optional) |
| `prefix` | Value Prefix (optional) |
| `suffix` | Value Suffix (e.g. %) |
| `decimals` | Decimal Places |
| `unit` | Unit / Footnote Caption (optional) |

نمونه:

```yaml
- template: stat_bars
  eyebrow: ASCH (1955)
  title: Wrong answers grow with the *size* of the majority
  items: '1 opponent: 3.6
  
    2 opponents: 13.6
  
    *3 opponents*: 31.8'
  highlight: 3 opponents
  max: 40
  suffix: '%'
  decimals: 1
  unit: Share of critical answers that followed the wrong majority. Larger majorities added little.
  layout: SCAM
```

## کارت‌های عددی — `template: counter_grid`

دسته: عدد

دو تا چهار کارت، هر کدام یک عدد که می‌شمارد و توضیح زیرش (مثل مقایسه‌ی دو گروه).

![counter_grid](../templates/counter_grid/preview.png)

| فیلد | توضیح |
|---|---|
| `title` | عنوان |
| `cards` | کارت‌ها |

نمونه:

```yaml
- template: counter_grid
  title: آزمایش بیمه‌ی سلامت RAND
  cards:
  - value: 50
    prefix: +
    suffix: ٪
    label: مصرف بیشترِ خدمات درمانی وقتی برای افراد عادی رایگان شد
    sub: خطر اخلاقی
    color: accent
  - value: 14
    prefix: +
    suffix: ٪
    label: احتمال پیش‌بینی‌شده‌ی مرگ در کم‌درآمدهای دارای فشار خون بالا
    sub: وقتی هزینه روی دوششون گذاشتند
    color: danger
  source: Manning et al., 1987; Newhouse, 1993
  layout: SLIDE
```

## Lower Third — `template: lower_third`

دسته: people

Broadcast-style name and role strip with an animated accent bar wipe; safely avoids the bottom-left camera box in SCAM layout.

![lower_third](../templates/lower_third/preview.png)

| فیلد | توضیح |
|---|---|
| `name` | Name (لازم) |
| `role` | Role / Title |
| `tag` | Small Uppercase Tag (optional) |
| `position` | Position |

نمونه:

```yaml
- template: lower_third
  name: Solomon Asch
  role: Social psychologist · "Opinions and Social Pressure", 1955
  tag: RESEARCHER
  position: auto
  layout: SCAM
```

## Punch In — `template: punch_in`

دسته: text

One giant word or short phrase slamming in from 1.25× to 1× with slight blur-in, an accent impact flash behind it, and an optional caption.

![punch_in](../templates/punch_in/preview.png)

| فیلد | توضیح |
|---|---|
| `eyebrow` | Small Eyebrow (optional) |
| `text` | Giant Word / Short Phrase (لازم) |
| `caption` | Caption Below (optional) |
| `tone` | Accent Flash Colour |

نمونه:

```yaml
- template: punch_in
  eyebrow: THE ALLY EFFECT
  text: '*ONE* VOICE'
  caption: 'One truthful partner: wrong answers only one fourth as often.'
  tone: accent
  layout: SCAM
```

## جداکننده‌ی بخش — `template: section_break`

دسته: متن

صفحه‌ی ساده بین دو بخش: شماره/اسم بخش و یک عنوان کوتاه. برای لحظه‌هایی که بیشتر خودت حرف می‌زنی.

![section_break](../templates/section_break/preview.png)

| فیلد | توضیح |
|---|---|
| `eyebrow` | بالای عنوان (مثل: بخش ۲) |
| `title` | عنوان (لازم) |
| `subtitle` | زیرعنوان |

نمونه:

```yaml
- template: section_break
  eyebrow: بخش سوم
  title: «خودش طلبکار می‌شه!»
  layout: SCAM
```

## Chapter Card — `template: chapter_card`

دسته: transition

Section transition card with a full-width wiping accent band, big part number, title, and subtitle; stays clear of the camera box in SCAM.

![chapter_card](../templates/chapter_card/preview.png)

| فیلد | توضیح |
|---|---|
| `prefix` | Number Prefix (e.g. PART ) |
| `number` | Part Number (e.g. 2 or PART 2) (لازم) |
| `title` | Chapter Title (لازم) |
| `subtitle` | Subtitle (optional) |
| `tone` | Band Accent Tone |

نمونه:

```yaml
- template: chapter_card
  prefix: 'PART '
  number: '2'
  title: The Discomfort *Inside* Your Own Head
  subtitle: Why saying no feels heavier than it is.
  tone: accent
  layout: SCAM
```

## عکس تمام‌صفحه — `template: image_full`

دسته: تصویر

عکس بزرگ با زیرنویس پررنگ؛ در حالت SCAM عکس در قاب بزرگ بالا-راست می‌نشیند تا جای دوربین خالی بماند. می‌شود روی عکس نقطه گذاشت (مثل نقشه).

![image_full](../templates/image_full/preview.png)

| فیلد | توضیح |
|---|---|
| `image` | عکس (لازم) |
| `title` | زیرنویس / عنوان (*زرد*) |
| `text` | متن کوچک |
| `dim` | تیرگی عکس (۰ تا ۱) |
| `dots` | نقطه‌ها روی عکس: x,y,رنگ (درصد) هر خط یکی |
| `motion` | حرکت عکس |
| `title_position` | جای عنوان |

نمونه:

```yaml
- template: image_full
  title: '*تنبیه ضداجتماعی* در ۱۶ شهر دنیا'
  text: ضعیف‌تر بودن اعتماد و قانون ← حمله‌ی مفت‌خور به آدمِ درستکار
  dots:
  - 20,40
  - 26,36
  - 48,32,danger
  - 52,30
  - 60,45,danger
  layout: SLIDE
```

## Doc Highlight — `template: doc_highlight`

دسته: text

Paper or abstract excerpt on a document card where ==marked phrases== sweep in with a marker highlight one after another; optional link line.

![doc_highlight](../templates/doc_highlight/preview.png)

| فیلد | توضیح |
|---|---|
| `journal` | Journal / Publication |
| `year` | Year |
| `title` | Paper / Article Title (لازم) |
| `excerpt` | Excerpt (wrap key phrases in ==like this==) (لازم) |
| `link` | Source Link / DOI (optional) |
| `tone` | Marker Highlight Colour |

نمونه:

```yaml
- template: doc_highlight
  journal: JOURNAL OF PERSONALITY AND SOCIAL PSYCHOLOGY
  year: '2024'
  title: 'Saying no: The negative ramifications from invitation declines are less severe than we think'
  excerpt: We demonstrate that ==invitees overestimate the negative ramifications== that arise in the eyes of inviters
    following an invitation decline.
  link: doi.org/10.1037/pspi0000443
  tone: accent
  layout: SCAM
```

## سه کارت — `template: three_cards`

دسته: تصویر

سه (یا دو تا پنج) کارت کنار هم، هر کدام با عکس یا نماد و یک برچسب. اختیاری: یک عکس مشترک بالای کارت‌ها.

![three_cards](../templates/three_cards/preview.png)

| فیلد | توضیح |
|---|---|
| `title` | عنوان |
| `image` | عکس مشترک بالا (اختیاری) |
| `cards` | کارت‌ها |

نمونه:

```yaml
- template: three_cards
  cards:
  - label: مشتری
    icon: 🧾
  - label: همکار
    icon: 💼
  - label: کارفرما
    icon: 🏢
  layout: SCAM
```

## گفتگوی پیام‌رسان — `template: chat`

دسته: ماکت

حباب‌های پیام یکی‌یکی ظاهر می‌شوند. «او» سمت راست (خاکستری)، «من» سمت چپ (سبز تیره)، لحن بد = قرمز.

![chat](../templates/chat/preview.png)

| فیلد | توضیح |
|---|---|
| `title` | عنوان بالای گفتگو |
| `messages` | پیام‌ها |

نمونه:

```yaml
- template: chat
  messages:
  - from: او
    text: این دو تا بخش جدیدم اضافه کن؛ *کار پنج دقیقه‌ست!*
  - from: من
    text: توی قرارمون نبوده
  - from: من
    text: باز هم نه، زمان می‌بره
  - from: او
    text: ای بابا، روت حساب کرده بودیم رفیق!
  - from: من
    text: باشه... می‌زنم
    tone: bad
  layout: SCAM
```

## خط زمان — `template: timeline`

دسته: نمودار

یک خط افقی که از راست به چپ کشیده می‌شود و نقطه‌های تاریخ با توضیح، یکی‌یکی روی آن ظاهر می‌شوند.

![timeline](../templates/timeline/preview.png)

| فیلد | توضیح |
|---|---|
| `title` | عنوان |
| `events` | رویدادها |

نمونه:

```yaml
- template: timeline
  title: ایتالیا و آدم‌ربایی
  events:
  - date: ۱۹۶۹
    text: شروع موج آدم‌ربایی
  - date: ۱۹۹۱
    text: قانون مسدود کردن حساب خانواده
    tone: good
  - date: ۱۹۹۸
    text: فقط ۳۸ مورد در ۷ سال
  layout: SLIDE
```

## نمودار از فایل spec — `template: chart`

دسته: نمودار

نمودار از روی یک فایل JSON (spec) با فیلدهای type/title/data/series؛ برای نمودارهای پیچیده‌تر.

![chart](../templates/chart/preview.png)

| فیلد | توضیح |
|---|---|
| `spec` | مسیر فایل spec (JSON) |

نمونه:

```yaml
- template: chart
  chart:
    type: bar
    data:
    - label: الف
      value: 10
    - label: ب
      value: 25
      color: accent
  title: نمونه
  layout: SLIDE
```

## لایه‌ای (JSON) — `template: layers`

دسته: ویژه

اسلایدی که از فایل لایه‌ای JSON می‌آید: هر المان با مختصات دقیق. برای طرح‌های خاص.

![layers](../templates/layers/preview.png)

| فیلد | توضیح |
|---|---|
| `file` | مسیر فایل لایه‌ای JSON |

نمونه:

```yaml
- template: layers
  elements:
  - type: text
    text: نمونه‌ی لایه‌ای
    font: Black
    size: 90
    color: '#FFFFFF'
    x: 1840
    y: 300
    anchor: rs
  - type: counter
    from: 0
    to: 79
    suffix: ٪
    font: Black
    size: 220
    color: '#FFD600'
    x: 1840
    y: 640
    anchor: rs
    delay: 0.2
  layout: SLIDE
```

## فقط دوربین (بدون اسلاید) — `template: cam`

دسته: ویژه

این قدم اسلاید ندارد؛ فقط تصویر خودت تمام‌صفحه. در خروجی OBS به‌صورت CAM ثبت می‌شود و فایل ویدیویی ساخته نمی‌شود.

![cam](../templates/cam/preview.png)

| فیلد | توضیح |
|---|---|

نمونه:

```yaml
- template: cam
  layout: CAM
```

## فیلدهای مشترک همه‌ی قالب‌ها

| فیلد | توضیح |
|---|---|
| `layout` | SLIDE (اسلاید تمام‌صفحه) / SCAM (اسلاید + من؛ گوشه‌ی پایین-چپ خالی می‌ماند) / CAM (فقط دوربین) |
| `say` | متن تله‌پرامپتر برای این اسلاید |
| `steps` | قدم‌های بیشتر روی همین اسلاید: فهرست `{say, layout, zoom}` |
| `zoom` | زوم OBS با F5: `{x: 0.5, y: 0.5, s: 1.6}` |
| `source` | منبع کوچک پایین-راست (انگلیسی هم می‌شود) |
| `note` | یادداشت کوچک پایین صفحه |
| `duration` | طول کلیپ به ثانیه (پیش‌فرض ۶؛ مثلاً ۲۰ تا عکس بیشتر نفس بکشد) |
| `background` | `{image: bg.jpg, dim: 0.6}` عکس پس‌زمینه‌ی کل صفحه |
| `act` | شماره‌ی پرده (برای OBS) |
