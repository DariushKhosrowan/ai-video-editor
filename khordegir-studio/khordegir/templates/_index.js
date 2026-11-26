/* خودکار ساخته می‌شود — دستی ویرایش نکن (python3 -m khordegir index) */
window.TEMPLATE_INDEX = [
 {
  "name": "title_card",
  "js": "../templates/title_card/template.js",
  "schema": {
   "name": "title_card",
   "label": "کارت عنوان",
   "description": "یک عنوان بزرگ با تیتر کوچک و زیرعنوان؛ می‌تواند روی یک عکس تمام‌صفحه‌ی تیره باشد. برای شروع ویدیو یا شروع هر بخش.",
   "aliases": [
    "title-card",
    "عنوان"
   ],
   "category": "متن",
   "fields": [
    {
     "key": "eyebrow",
     "label": "تیتر کوچک بالا",
     "type": "text",
     "editable": true
    },
    {
     "key": "title",
     "label": "عنوان اصلی (*زرد* ، ~قرمز~)",
     "type": "text",
     "required": true,
     "editable": true
    },
    {
     "key": "subtitle",
     "label": "زیرعنوان",
     "type": "textarea",
     "editable": true
    },
    {
     "key": "image",
     "label": "عکس پس‌زمینه (اختیاری)",
     "type": "image",
     "editable": true
    },
    {
     "key": "dim",
     "label": "تیرگی عکس (۰ تا ۱)",
     "type": "number",
     "default": 0.55,
     "editable": false
    },
    {
     "key": "align",
     "label": "جای متن",
     "type": "select",
     "options": [
      [
       "bottom",
       "پایین"
      ],
      [
       "center",
       "وسط"
      ]
     ],
     "default": "bottom",
     "editable": false
    },
    {
     "key": "preset",
     "label": "سبک انیمیشن",
     "type": "select",
     "options": [
      [
       "auto",
       "کلاسیک / ارث‌بری از پروژه"
      ],
      [
       "random",
       "🎲 تصادفی (با بذر قطعی)"
      ],
      [
       "kinetic-hero",
       "تایپ کینتیک سینمایی"
      ],
      [
       "spotlight",
       "نورپردازی متمرکز"
      ],
      [
       "curtain-editorial",
       "پرده سردبیری"
      ],
      [
       "split-contrast",
       "کنتراست دوگانه"
      ],
      [
       "minimal-type",
       "تایپوگرافی مینیمال"
      ],
      [
       "glitch-pop",
       "پرش مدرن"
      ]
     ],
     "default": "auto",
     "editable": false
    },
    {
     "key": "transition",
     "label": "ترنزیشن ورود",
     "type": "select",
     "options": [
      [
       "auto",
       "پیش‌فرض / ارث‌بری"
      ],
      [
       "random",
       "🎲 تصادفی"
      ],
      [
       "soft-fade",
       "محو نرم (کلاسیک)"
      ],
      [
       "curtain-rtl",
       "پرده از راست به چپ"
      ],
      [
       "accent-slash",
       "نوار تأکید مورب"
      ],
      [
       "iris-rise",
       "باز شدن دایره‌ای"
      ],
      [
       "split-curtain",
       "پرده دوقسمتی"
      ],
      [
       "diagonal-wipe",
       "پاک‌شدن مورب"
      ],
      [
       "zoom-iris",
       "گشایش زوم"
      ],
      [
       "shutter-bars",
       "کرکره ستونی"
      ]
     ],
     "default": "auto",
     "editable": false
    },
    {
     "key": "seed",
     "label": "بذر تصادفی",
     "type": "number",
     "default": 0,
     "editable": false
    }
   ],
   "example": {
    "eyebrow": "یک سؤال ساده",
    "title": "پول می‌دی یا به *پلیس* زنگ می‌زنی؟",
    "subtitle": "قانونی که پشت همه‌ی باج‌گیری‌ها هست",
    "image": "",
    "layout": "SLIDE"
   },
   "order": 0,
   "version": 1
  },
  "css": "../templates/title_card/template.css"
 },
 {
  "name": "big_number",
  "js": "../templates/big_number/template.js",
  "schema": {
   "name": "big_number",
   "label": "عدد بزرگ",
   "description": "یک عدد خیلی بزرگ که از صفر می‌شمارد (مثل ۸۰٪) با یک جمله زیرش؛ اختیاری با عکس کنارش.",
   "aliases": [
    "big-number",
    "counter",
    "عدد"
   ],
   "category": "عدد",
   "fields": [
    {
     "key": "number",
     "label": "عدد",
     "type": "text",
     "required": true,
     "editable": true
    },
    {
     "key": "prefix",
     "label": "قبل از عدد (مثل + یا حدود)",
     "type": "text",
     "editable": false
    },
    {
     "key": "suffix",
     "label": "بعد از عدد (مثل ٪ یا نفر)",
     "type": "text",
     "editable": false
    },
    {
     "key": "from",
     "label": "شروع شمارش از",
     "type": "number",
     "default": 0,
     "editable": false
    },
    {
     "key": "color",
     "label": "رنگ عدد",
     "type": "select",
     "options": [
      [
       "accent",
       "زرد (مثبت/کلیدی)"
      ],
      [
       "danger",
       "قرمز (بد)"
      ],
      [
       "text",
       "سفید"
      ]
     ],
     "default": "accent",
     "editable": false
    },
    {
     "key": "eyebrow",
     "label": "تیتر کوچک بالای عدد",
     "type": "text",
     "editable": true
    },
    {
     "key": "caption",
     "label": "جمله‌ی زیر عدد",
     "type": "textarea",
     "editable": true
    },
    {
     "key": "detail",
     "label": "توضیح کوچک",
     "type": "text",
     "editable": true
    },
    {
     "key": "image",
     "label": "عکس کنار (اختیاری)",
     "type": "image",
     "editable": true
    },
    {
     "key": "motion",
     "label": "حرکت عکس",
     "type": "select",
     "options": [
      [
       "breathe",
       "نفس‌کشیدن"
      ],
      [
       "zoom-out",
       "زوم به بیرون"
      ],
      [
       "pan-left",
       "حرکت به چپ"
      ],
      [
       "pan-right",
       "حرکت به راست"
      ],
      [
       "none",
       "ثابت"
      ]
     ],
     "default": "breathe",
     "editable": false
    },
    {
     "key": "preset",
     "label": "سبک انیمیشن",
     "type": "select",
     "options": [
      [
       "auto",
       "کلاسیک / ارث‌بری از پروژه"
      ],
      [
       "random",
       "🎲 تصادفی (با بذر قطعی)"
      ],
      [
       "slam-count",
       "شمارش کوبنده"
      ],
      [
       "halo-pulse",
       "هالهٔ نور و شمارش"
      ],
      [
       "bar-meter",
       "نوار سنجش پویا"
      ],
      [
       "dual-split",
       "چیدمان دوتایی"
      ],
      [
       "kinetic-stat",
       "آمار کینتیک"
      ],
      [
       "minimal-count",
       "شمارش تمیز"
      ]
     ],
     "default": "auto",
     "editable": false
    },
    {
     "key": "transition",
     "label": "ترنزیشن ورود",
     "type": "select",
     "options": [
      [
       "auto",
       "پیش‌فرض / ارث‌بری"
      ],
      [
       "random",
       "🎲 تصادفی"
      ],
      [
       "soft-fade",
       "محو نرم (کلاسیک)"
      ],
      [
       "curtain-rtl",
       "پرده از راست به چپ"
      ],
      [
       "accent-slash",
       "نوار تأکید مورب"
      ],
      [
       "iris-rise",
       "باز شدن دایره‌ای"
      ],
      [
       "split-curtain",
       "پرده دوقسمتی"
      ],
      [
       "diagonal-wipe",
       "پاک‌شدن مورب"
      ],
      [
       "zoom-iris",
       "گشایش زوم"
      ],
      [
       "shutter-bars",
       "کرکره ستونی"
      ]
     ],
     "default": "auto",
     "editable": false
    },
    {
     "key": "seed",
     "label": "بذر تصادفی",
     "type": "number",
     "default": 0,
     "editable": false
    }
   ],
   "example": {
    "number": "80",
    "suffix": "٪",
    "color": "danger",
    "caption": "شرکت‌هایی که باج دادند، دوباره هدف حمله قرار گرفتند",
    "detail": "نظرسنجی از نزدیک به ۱٬۵۰۰ مدیر امنیت",
    "source": "Cybereason, 2022",
    "layout": "SCAM"
   },
   "order": 10,
   "version": 1
  },
  "css": "../templates/big_number/template.css"
 },
 {
  "name": "image_text",
  "js": "../templates/image_text/template.js",
  "schema": {
   "name": "image_text",
   "label": "عکس + متن",
   "description": "یک عکس در قاب گرد (آرام نفس می‌کشد) و کنارش تیتر کوچک، عنوان، متن و چند نکته.",
   "aliases": [
    "image-text",
    "تصویر"
   ],
   "category": "تصویر",
   "fields": [
    {
     "key": "image",
     "label": "عکس",
     "type": "image",
     "required": true,
     "editable": true
    },
    {
     "key": "eyebrow",
     "label": "تیتر کوچک (زرد)",
     "type": "text",
     "editable": true
    },
    {
     "key": "title",
     "label": "عنوان",
     "type": "text",
     "editable": true
    },
    {
     "key": "text",
     "label": "متن",
     "type": "textarea",
     "editable": true
    },
    {
     "key": "points",
     "label": "نکته‌ها / کارت‌ها (هر خط یکی)",
     "type": "list",
     "editable": true
    },
    {
     "key": "motion",
     "label": "حرکت عکس",
     "type": "select",
     "options": [
      [
       "breathe",
       "نفس‌کشیدن"
      ],
      [
       "zoom-out",
       "زوم به بیرون"
      ],
      [
       "pan-left",
       "حرکت به چپ"
      ],
      [
       "pan-right",
       "حرکت به راست"
      ],
      [
       "none",
       "ثابت"
      ]
     ],
     "default": "breathe",
     "editable": false
    },
    {
     "key": "fit",
     "label": "جای‌گیری عکس",
     "type": "select",
     "options": [
      [
       "cover",
       "پر کردن قاب"
      ],
      [
       "contain",
       "کامل دیده شود"
      ]
     ],
     "default": "cover",
     "editable": false
    },
    {
     "key": "shape",
     "label": "شکل قاب",
     "type": "select",
     "options": [
      [
       "portrait",
       "عمودی"
      ],
      [
       "landscape",
       "افقی (بالا)"
      ]
     ],
     "default": "portrait",
     "editable": false
    },
    {
     "key": "preset",
     "label": "سبک انیمیشن",
     "type": "select",
     "options": [
      [
       "auto",
       "کلاسیک / ارث‌بری از پروژه"
      ],
      [
       "random",
       "🎲 تصادفی (با بذر قطعی)"
      ],
      [
       "editorial-split",
       "قاب دو تکه سردبیری"
      ],
      [
       "kenburns-drift",
       "حرکت سینمایی تصویر"
      ],
      [
       "card-float",
       "کارت شناور"
      ],
      [
       "frame-mask",
       "پردهٔ ماسک تصویر"
      ],
      [
       "accent-bar",
       "خط تأکید پویا"
      ],
      [
       "cinema-wide",
       "کادر عریض سینمایی"
      ]
     ],
     "default": "auto",
     "editable": false
    },
    {
     "key": "transition",
     "label": "ترنزیشن ورود",
     "type": "select",
     "options": [
      [
       "auto",
       "پیش‌فرض / ارث‌بری"
      ],
      [
       "random",
       "🎲 تصادفی"
      ],
      [
       "soft-fade",
       "محو نرم (کلاسیک)"
      ],
      [
       "curtain-rtl",
       "پرده از راست به چپ"
      ],
      [
       "accent-slash",
       "نوار تأکید مورب"
      ],
      [
       "iris-rise",
       "باز شدن دایره‌ای"
      ],
      [
       "split-curtain",
       "پرده دوقسمتی"
      ],
      [
       "diagonal-wipe",
       "پاک‌شدن مورب"
      ],
      [
       "zoom-iris",
       "گشایش زوم"
      ],
      [
       "shutter-bars",
       "کرکره ستونی"
      ]
     ],
     "default": "auto",
     "editable": false
    },
    {
     "key": "seed",
     "label": "بذر تصادفی",
     "type": "number",
     "default": 0,
     "editable": false
    }
   ],
   "example": {
    "image": "",
    "eyebrow": "بی. اف. اسکینر، ۱۹۵۷",
    "title": "پاداشِ گاه‌به‌گاه",
    "text": "سرسخت‌ترین رفتار وقتی ساخته می‌شه که *فقط گاهی* جواب بگیره",
    "source": "Ferster & Skinner, 1957",
    "layout": "SCAM"
   },
   "order": 20,
   "version": 1
  },
  "css": "../templates/image_text/template.css"
 },
 {
  "name": "bar_chart",
  "js": "../templates/bar_chart/template.js",
  "schema": {
   "name": "bar_chart",
   "label": "نمودار میله‌ای",
   "description": "میله‌ها از پایین رشد می‌کنند و عددها روی‌شان می‌شمارند. افقی هم می‌شود (برای برچسب‌های بلند).",
   "aliases": [
    "bar-chart",
    "bar",
    "نمودار میله‌ای",
    "میله‌ای"
   ],
   "category": "نمودار",
   "fields": [
    {
     "key": "title",
     "label": "عنوان",
     "type": "text",
     "editable": true
    },
    {
     "key": "subtitle",
     "label": "زیرعنوان",
     "type": "text",
     "editable": true
    },
    {
     "key": "data",
     "label": "داده‌ها",
     "type": "table",
     "columns": [
      [
       "label",
       "برچسب"
      ],
      [
       "value",
       "عدد"
      ],
      [
       "color",
       "رنگ (accent/danger/muted)"
      ],
      [
       "display",
       "متن به‌جای عدد"
      ]
     ],
     "editable": true
    },
    {
     "key": "prefix",
     "label": "قبل از عدد (مثل +)",
     "type": "text",
     "editable": false
    },
    {
     "key": "suffix",
     "label": "بعد از عدد (مثل ٪)",
     "type": "text",
     "editable": false
    },
    {
     "key": "highlight",
     "label": "میله‌ی برجسته (برچسب یا شماره)",
     "type": "text",
     "editable": false
    },
    {
     "key": "orientation",
     "label": "جهت",
     "type": "select",
     "options": [
      [
       "vertical",
       "عمودی"
      ],
      [
       "horizontal",
       "افقی"
      ]
     ],
     "default": "vertical",
     "editable": false
    },
    {
     "key": "ymax",
     "label": "سقف محور (اختیاری)",
     "type": "number",
     "editable": false
    },
    {
     "key": "axis",
     "label": "محور و خطوط راهنما",
     "type": "select",
     "options": [
      [
       "true",
       "نمایش"
      ],
      [
       "false",
       "پنهان"
      ]
     ],
     "default": "true",
     "editable": false
    },
    {
     "key": "preset",
     "label": "سبک انیمیشن",
     "type": "select",
     "options": [
      [
       "auto",
       "کلاسیک / ارث‌بری"
      ],
      [
       "random",
       "🎲 تصادفی"
      ],
      [
       "surge-bars",
       "جهش میله‌ها"
      ],
      [
       "editorial-bars",
       "میله‌های تحریریه"
      ],
      [
       "pulse-highlight",
       "درخشش میلهٔ برجسته"
      ],
      [
       "elastic-rise",
       "رشد فنری"
      ],
      [
       "cascade-grid",
       "آبشاری شبکه"
      ],
      [
       "minimal-bars",
       "میله‌های تمیز"
      ]
     ],
     "default": "auto",
     "editable": false
    },
    {
     "key": "transition",
     "label": "ترنزیشن ورود",
     "type": "select",
     "options": [
      [
       "auto",
       "ارث‌بری"
      ],
      [
       "random",
       "🎲 تصادفی"
      ],
      [
       "soft-fade",
       "محو نرم"
      ],
      [
       "curtain-rtl",
       "پرده از راست به چپ"
      ],
      [
       "accent-slash",
       "نوار تأکید مورب"
      ],
      [
       "iris-rise",
       "باز شدن دایره‌ای"
      ],
      [
       "split-curtain",
       "پرده دوقسمتی"
      ],
      [
       "diagonal-wipe",
       "پاک‌شدن مورب"
      ],
      [
       "zoom-iris",
       "گشایش زوم"
      ],
      [
       "shutter-bars",
       "کرکره ستونی"
      ]
     ],
     "default": "auto",
     "editable": false
    },
    {
     "key": "seed",
     "label": "بذر تصادفی",
     "type": "number",
     "default": 0,
     "editable": false
    }
   ],
   "example": {
    "title": "آدم‌ربایی‌های ثبت‌شده در ایتالیا",
    "data": [
     {
      "label": "۱۹۶۹ تا ۱۹۹۱",
      "value": 630,
      "color": "danger"
     },
     {
      "label": "۷ سال بعد از قانون ۱۹۹۱",
      "value": 38,
      "color": "accent"
     }
    ],
    "source": "Bohlen / NYT, 1998; Avraham & Porat, 2023",
    "layout": "SLIDE"
   },
   "order": 30,
   "version": 1
  }
 },
 {
  "name": "bullet_list",
  "js": "../templates/bullet_list/template.js",
  "schema": {
   "name": "bullet_list",
   "label": "فهرست / کارت‌ها",
   "description": "چند مورد که یکی‌یکی وارد می‌شوند؛ با شماره یا بدون آن، یک یا دو ستون.",
   "aliases": [
    "list",
    "bullets",
    "فهرست"
   ],
   "category": "متن",
   "fields": [
    {
     "key": "eyebrow",
     "label": "تیتر کوچک",
     "type": "text",
     "editable": true
    },
    {
     "key": "title",
     "label": "عنوان",
     "type": "text",
     "editable": true
    },
    {
     "key": "items",
     "label": "موردها (هر خط یکی؛ *زرد* ~قرمز~)",
     "type": "list",
     "required": true,
     "editable": true
    },
    {
     "key": "numbered",
     "label": "شماره‌دار",
     "type": "select",
     "options": [
      [
       "true",
       "بله"
      ],
      [
       "false",
       "نه"
      ]
     ],
     "default": "true",
     "editable": false
    },
    {
     "key": "columns",
     "label": "تعداد ستون",
     "type": "select",
     "options": [
      [
       "1",
       "۱"
      ],
      [
       "2",
       "۲"
      ]
     ],
     "default": "1",
     "editable": false
    },
    {
     "key": "preset",
     "label": "سبک انیمیشن",
     "type": "select",
     "options": [
      [
       "auto",
       "کلاسیک / ارث‌بری"
      ],
      [
       "random",
       "🎲 تصادفی"
      ],
      [
       "stagger-cards",
       "ورود پلکانی کارت‌ها"
      ],
      [
       "cascade-rows",
       "آبشاری از راست"
      ],
      [
       "timeline-rail",
       "خط راهنمای عمودی"
      ],
      [
       "pill-grid",
       "شبکه مدرن"
      ],
      [
       "spotlight-focus",
       "تأکید نوری روی مورد"
      ],
      [
       "minimal-clean",
       "ورود نرم و تمیز"
      ]
     ],
     "default": "auto",
     "editable": false
    },
    {
     "key": "transition",
     "label": "ترنزیشن ورود",
     "type": "select",
     "options": [
      [
       "auto",
       "ارث‌بری"
      ],
      [
       "random",
       "🎲 تصادفی"
      ],
      [
       "soft-fade",
       "محو نرم"
      ],
      [
       "curtain-rtl",
       "پرده از راست به چپ"
      ],
      [
       "accent-slash",
       "نوار تأکید مورب"
      ],
      [
       "iris-rise",
       "باز شدن دایره‌ای"
      ],
      [
       "split-curtain",
       "پرده دوقسمتی"
      ],
      [
       "diagonal-wipe",
       "پاک‌شدن مورب"
      ],
      [
       "zoom-iris",
       "گشایش زوم"
      ],
      [
       "shutter-bars",
       "کرکره ستونی"
      ]
     ],
     "default": "auto",
     "editable": false
    },
    {
     "key": "seed",
     "label": "بذر تصادفی",
     "type": "number",
     "default": 0,
     "editable": false
    }
   ],
   "example": {
    "title": "سه سؤالِ قبل از کوتاه اومدن",
    "items": [
     "کی زیر فشاره و کی داره از بقیه خرج می‌کنه؟",
     "اولین بارشه یا تبدیل به عادت شده؟",
     "پناه و اهرم داری یا واقعاً ~گروگانِ بقایی؟~"
    ],
    "layout": "SLIDE"
   },
   "order": 40,
   "version": 1
  },
  "css": "../templates/bullet_list/template.css"
 },
 {
  "name": "line_chart",
  "js": "../templates/line_chart/template.js",
  "schema": {
   "name": "line_chart",
   "label": "نمودار خطی",
   "description": "یک یا چند خط که از چپ به راست کشیده می‌شوند، با برچسب در انتهای هر خط و خط‌چین‌های رویداد.",
   "aliases": [
    "line-chart",
    "line",
    "نمودار خطی",
    "خطی"
   ],
   "category": "نمودار",
   "fields": [
    {
     "key": "title",
     "label": "عنوان",
     "type": "text",
     "editable": true
    },
    {
     "key": "subtitle",
     "label": "زیرعنوان",
     "type": "text",
     "editable": true
    },
    {
     "key": "series",
     "label": "خط‌ها: «اسم: عدد، عدد، …» هر خط یک سطر",
     "type": "series",
     "editable": true
    },
    {
     "key": "x_labels",
     "label": "برچسب محور افقی (مثل: ۱=هفته ۱، ۵=هفته ۵)",
     "type": "text",
     "editable": false
    },
    {
     "key": "vlines",
     "label": "خط‌چین رویداد (مثل: ۵=شروع جریمه)",
     "type": "text",
     "editable": false
    },
    {
     "key": "suffix",
     "label": "واحد محور عمودی (مثل ٪)",
     "type": "text",
     "editable": false
    },
    {
     "key": "ymax",
     "label": "سقف محور عمودی",
     "type": "number",
     "editable": false
    },
    {
     "key": "badge",
     "label": "برچسب کوتاه کنار عنوان (مثل: نمودار مفهومی)",
     "type": "text",
     "editable": false
    },
    {
     "key": "preset",
     "label": "سبک انیمیشن",
     "type": "select",
     "options": [
      [
       "auto",
       "کلاسیک / ارث‌بری"
      ],
      [
       "random",
       "🎲 تصادفی"
      ],
      [
       "sweep-trace",
       "کشش پیوسته خط"
      ],
      [
       "editorial-curve",
       "منحنی تحریریه"
      ],
      [
       "marker-pop",
       "پرش نقطه‌ها"
      ],
      [
       "glow-path",
       "خط نورانی"
      ],
      [
       "split-axis",
       "محورهای پویا"
      ],
      [
       "minimal-trace",
       "رسم مینیمال"
      ]
     ],
     "default": "auto",
     "editable": false
    },
    {
     "key": "transition",
     "label": "ترنزیشن ورود",
     "type": "select",
     "options": [
      [
       "auto",
       "ارث‌بری"
      ],
      [
       "random",
       "🎲 تصادفی"
      ],
      [
       "soft-fade",
       "محو نرم"
      ],
      [
       "curtain-rtl",
       "پرده از راست به چپ"
      ],
      [
       "accent-slash",
       "نوار تأکید مورب"
      ],
      [
       "iris-rise",
       "باز شدن دایره‌ای"
      ],
      [
       "split-curtain",
       "پرده دوقسمتی"
      ],
      [
       "diagonal-wipe",
       "پاک‌شدن مورب"
      ],
      [
       "zoom-iris",
       "گشایش زوم"
      ],
      [
       "shutter-bars",
       "کرکره ستونی"
      ]
     ],
     "default": "auto",
     "editable": false
    },
    {
     "key": "seed",
     "label": "بذر تصادفی",
     "type": "number",
     "default": 0,
     "editable": false
    }
   ],
   "example": {
    "title": "سهم همکاری در هر دور بازی",
    "series": "با تنبیه: 13.5, 15.5, 16.5, 17.2, 17.6, 17.9, 18.2, 18.4, 18.5, 18.2\nبدون تنبیه: 10, 9.4, 8.9, 8.5, 8.1, 7.7, 7.2, 6.5, 5.5, 3.2",
    "ymax": 20,
    "source": "Fehr & Gächter, 2000 (AER)",
    "layout": "SLIDE"
   },
   "order": 50,
   "version": 1
  }
 },
 {
  "name": "compare",
  "js": "../templates/compare/template.js",
  "schema": {
   "name": "compare",
   "label": "قبل ← بعد",
   "description": "دو یا سه عدد بزرگ با فلش بینشان (مثل ۸ ← ۱۶ ← ۱۹). از راست به چپ خوانده می‌شود.",
   "aliases": [
    "before-after",
    "مقایسه"
   ],
   "category": "عدد",
   "fields": [
    {
     "key": "title",
     "label": "عنوان",
     "type": "text",
     "editable": true
    },
    {
     "key": "steps",
     "label": "مرحله‌ها",
     "type": "table",
     "columns": [
      [
       "value",
       "عدد"
      ],
      [
       "label",
       "برچسب"
      ],
      [
       "color",
       "رنگ"
      ],
      [
       "prefix",
       "قبل"
      ],
      [
       "suffix",
       "بعد"
      ]
     ],
     "editable": true
    },
    {
     "key": "suffix",
     "label": "واحد مشترک (مثل ٪)",
     "type": "text",
     "editable": false
    },
    {
     "key": "preset",
     "label": "سبک انیمیشن",
     "type": "select",
     "options": [
      [
       "auto",
       "کلاسیک / ارث‌بری"
      ],
      [
       "random",
       "🎲 تصادفی"
      ],
      [
       "versus-clash",
       "مقایسه کوبنده"
      ],
      [
       "editorial-delta",
       "تفاوت تحریریه"
      ],
      [
       "sweep-compare",
       "فلش کشیده"
      ],
      [
       "pop-badges",
       "پرش نشان‌ها"
      ],
      [
       "mirror-flip",
       "چرخش متقارن"
      ],
      [
       "minimal-compare",
       "مقایسه تمیز"
      ]
     ],
     "default": "auto",
     "editable": false
    },
    {
     "key": "transition",
     "label": "ترنزیشن ورود",
     "type": "select",
     "options": [
      [
       "auto",
       "ارث‌بری"
      ],
      [
       "random",
       "🎲 تصادفی"
      ],
      [
       "soft-fade",
       "محو نرم"
      ],
      [
       "curtain-rtl",
       "پرده از راست به چپ"
      ],
      [
       "accent-slash",
       "نوار تأکید مورب"
      ],
      [
       "iris-rise",
       "باز شدن دایره‌ای"
      ],
      [
       "split-curtain",
       "پرده دوقسمتی"
      ],
      [
       "diagonal-wipe",
       "پاک‌شدن مورب"
      ],
      [
       "zoom-iris",
       "گشایش زوم"
      ],
      [
       "shutter-bars",
       "کرکره ستونی"
      ]
     ],
     "default": "auto",
     "editable": false
    },
    {
     "key": "seed",
     "label": "بذر تصادفی",
     "type": "number",
     "default": 0,
     "editable": false
    }
   ],
   "example": {
    "title": "میانگین تأخیر هفتگی در مهدکودک‌ها",
    "steps": [
     {
      "value": 8,
      "label": "قبل از جریمه",
      "color": "muted"
     },
     {
      "value": 16,
      "prefix": "+",
      "label": "با جریمه‌ی ۳ دلاری",
      "color": "accent"
     },
     {
      "value": 19,
      "prefix": "≈",
      "label": "بعد از حذف جریمه",
      "color": "danger"
     }
    ],
    "source": "Gneezy & Rustichini, 2000",
    "layout": "SLIDE"
   },
   "order": 60,
   "version": 1
  }
 },
 {
  "name": "counter_grid",
  "js": "../templates/counter_grid/template.js",
  "schema": {
   "name": "counter_grid",
   "label": "کارت‌های عددی",
   "description": "دو تا چهار کارت، هر کدام یک عدد که می‌شمارد و توضیح زیرش (مثل مقایسه‌ی دو گروه).",
   "aliases": [
    "counter-grid",
    "cards-numbers",
    "اعداد"
   ],
   "category": "عدد",
   "fields": [
    {
     "key": "title",
     "label": "عنوان",
     "type": "text",
     "editable": true
    },
    {
     "key": "cards",
     "label": "کارت‌ها",
     "type": "table",
     "columns": [
      [
       "value",
       "عدد"
      ],
      [
       "prefix",
       "قبل"
      ],
      [
       "suffix",
       "بعد"
      ],
      [
       "label",
       "توضیح"
      ],
      [
       "sub",
       "توضیح کوچک"
      ],
      [
       "color",
       "رنگ"
      ]
     ],
     "editable": true
    },
    {
     "key": "preset",
     "label": "سبک انیمیشن",
     "type": "select",
     "options": [
      [
       "auto",
       "کلاسیک / ارث‌بری"
      ],
      [
       "random",
       "🎲 تصادفی"
      ],
      [
       "stagger-counters",
       "شمارش پلکانی"
      ],
      [
       "pulse-tiles",
       "کارت‌های نبض‌دار"
      ],
      [
       "editorial-grid",
       "شبکه تحریریه"
      ],
      [
       "spring-cards",
       "کارت‌های فنری"
      ],
      [
       "sweep-row",
       "ردیف کشیده"
      ],
      [
       "minimal-grid",
       "شبکه مینیمال"
      ]
     ],
     "default": "auto",
     "editable": false
    },
    {
     "key": "transition",
     "label": "ترنزیشن ورود",
     "type": "select",
     "options": [
      [
       "auto",
       "ارث‌بری"
      ],
      [
       "random",
       "🎲 تصادفی"
      ],
      [
       "soft-fade",
       "محو نرم"
      ],
      [
       "curtain-rtl",
       "پرده از راست به چپ"
      ],
      [
       "accent-slash",
       "نوار تأکید مورب"
      ],
      [
       "iris-rise",
       "باز شدن دایره‌ای"
      ],
      [
       "split-curtain",
       "پرده دوقسمتی"
      ],
      [
       "diagonal-wipe",
       "پاک‌شدن مورب"
      ],
      [
       "zoom-iris",
       "گشایش زوم"
      ],
      [
       "shutter-bars",
       "کرکره ستونی"
      ]
     ],
     "default": "auto",
     "editable": false
    },
    {
     "key": "seed",
     "label": "بذر تصادفی",
     "type": "number",
     "default": 0,
     "editable": false
    }
   ],
   "example": {
    "title": "آزمایش بیمه‌ی سلامت RAND",
    "cards": [
     {
      "value": 50,
      "prefix": "+",
      "suffix": "٪",
      "label": "مصرف بیشترِ خدمات درمانی وقتی برای افراد عادی رایگان شد",
      "sub": "خطر اخلاقی",
      "color": "accent"
     },
     {
      "value": 14,
      "prefix": "+",
      "suffix": "٪",
      "label": "احتمال پیش‌بینی‌شده‌ی مرگ در کم‌درآمدهای دارای فشار خون بالا",
      "sub": "وقتی هزینه روی دوششون گذاشتند",
      "color": "danger"
     }
    ],
    "source": "Manning et al., 1987; Newhouse, 1993",
    "layout": "SLIDE"
   },
   "order": 70,
   "version": 1
  }
 },
 {
  "name": "quote",
  "js": "../templates/quote/template.js",
  "schema": {
   "name": "quote",
   "label": "جمله‌ی کلیدی",
   "description": "یک جمله‌ی بزرگ و پررنگ (با کلمه‌ی زرد/قرمز) و یک خط توضیح کوچک‌تر. برای قانون‌ها و جمع‌بندی‌ها.",
   "aliases": [
    "statement",
    "جمله",
    "نقل‌قول"
   ],
   "category": "متن",
   "fields": [
    {
     "key": "text",
     "label": "جمله (*زرد* ، ~قرمز~)",
     "type": "textarea",
     "required": true,
     "editable": true
    },
    {
     "key": "highlight",
     "label": "خط دوم بزرگ‌تر (اختیاری)",
     "type": "text",
     "editable": true
    },
    {
     "key": "highlight_color",
     "label": "رنگ خط دوم",
     "type": "select",
     "options": [
      [
       "accent",
       "زرد"
      ],
      [
       "danger",
       "قرمز"
      ],
      [
       "text",
       "سفید"
      ]
     ],
     "default": "accent",
     "editable": false
    },
    {
     "key": "caption",
     "label": "توضیح کوچک",
     "type": "textarea",
     "editable": true
    },
    {
     "key": "author",
     "label": "گوینده (اختیاری)",
     "type": "text",
     "editable": true
    },
    {
     "key": "preset",
     "label": "سبک انیمیشن",
     "type": "select",
     "options": [
      [
       "auto",
       "کلاسیک / ارث‌بری"
      ],
      [
       "random",
       "🎲 تصادفی"
      ],
      [
       "editorial-mark",
       "نشان نقل‌قول تحریریه"
      ],
      [
       "kinetic-words",
       "کلمه‌به‌کلمه زنده"
      ],
      [
       "accent-brace",
       "کروشهٔ تأکید"
      ],
      [
       "glass-panel",
       "پنل شیشه‌ای"
      ],
      [
       "spotlight-serif",
       "کلاسیک برجسته"
      ],
      [
       "bold-contrast",
       "کنتراست پررنگ"
      ]
     ],
     "default": "auto",
     "editable": false
    },
    {
     "key": "transition",
     "label": "ترنزیشن ورود",
     "type": "select",
     "options": [
      [
       "auto",
       "ارث‌بری"
      ],
      [
       "random",
       "🎲 تصادفی"
      ],
      [
       "soft-fade",
       "محو نرم"
      ],
      [
       "curtain-rtl",
       "پرده از راست به چپ"
      ],
      [
       "accent-slash",
       "نوار تأکید مورب"
      ],
      [
       "iris-rise",
       "باز شدن دایره‌ای"
      ],
      [
       "split-curtain",
       "پرده دوقسمتی"
      ],
      [
       "diagonal-wipe",
       "پاک‌شدن مورب"
      ],
      [
       "zoom-iris",
       "گشایش زوم"
      ],
      [
       "shutter-bars",
       "کرکره ستونی"
      ]
     ],
     "default": "auto",
     "editable": false
    },
    {
     "key": "seed",
     "label": "بذر تصادفی",
     "type": "number",
     "default": 0,
     "editable": false
    }
   ],
   "example": {
    "text": "هر رفتاری که پاداشش بدی،",
    "highlight": "بیشتر می‌شه",
    "caption": "",
    "layout": "SCAM"
   },
   "order": 80,
   "version": 1
  },
  "css": "../templates/quote/template.css"
 },
 {
  "name": "section_break",
  "js": "../templates/section_break/template.js",
  "schema": {
   "name": "section_break",
   "label": "جداکننده‌ی بخش",
   "description": "صفحه‌ی ساده بین دو بخش: شماره/اسم بخش و یک عنوان کوتاه. برای لحظه‌هایی که بیشتر خودت حرف می‌زنی.",
   "aliases": [
    "section-break",
    "section",
    "بخش"
   ],
   "category": "متن",
   "fields": [
    {
     "key": "eyebrow",
     "label": "بالای عنوان (مثل: بخش ۲)",
     "type": "text",
     "editable": true
    },
    {
     "key": "title",
     "label": "عنوان",
     "type": "text",
     "required": true,
     "editable": true
    },
    {
     "key": "subtitle",
     "label": "زیرعنوان",
     "type": "text",
     "editable": true
    },
    {
     "key": "preset",
     "label": "سبک انیمیشن",
     "type": "select",
     "options": [
      [
       "auto",
       "کلاسیک / ارث‌بری"
      ],
      [
       "random",
       "🎲 تصادفی"
      ],
      [
       "chapter-banner",
       "بنر فصل سینمایی"
      ],
      [
       "curtain-drop",
       "فرود پردهٔ فصل"
      ],
      [
       "numeral-watermark",
       "واترمارک عدد بزرگ"
      ],
      [
       "axis-sweep",
       "خط محور کشیده"
      ],
      [
       "split-headline",
       "تیتر دوپاره"
      ],
      [
       "minimal-divider",
       "جداکنندهٔ مینیمال"
      ]
     ],
     "default": "auto",
     "editable": false
    },
    {
     "key": "transition",
     "label": "ترنزیشن ورود",
     "type": "select",
     "options": [
      [
       "auto",
       "ارث‌بری"
      ],
      [
       "random",
       "🎲 تصادفی"
      ],
      [
       "soft-fade",
       "محو نرم"
      ],
      [
       "curtain-rtl",
       "پرده از راست به چپ"
      ],
      [
       "accent-slash",
       "نوار تأکید مورب"
      ],
      [
       "iris-rise",
       "باز شدن دایره‌ای"
      ],
      [
       "split-curtain",
       "پرده دوقسمتی"
      ],
      [
       "diagonal-wipe",
       "پاک‌شدن مورب"
      ],
      [
       "zoom-iris",
       "گشایش زوم"
      ],
      [
       "shutter-bars",
       "کرکره ستونی"
      ]
     ],
     "default": "auto",
     "editable": false
    },
    {
     "key": "seed",
     "label": "بذر تصادفی",
     "type": "number",
     "default": 0,
     "editable": false
    }
   ],
   "example": {
    "eyebrow": "بخش سوم",
    "title": "«خودش طلبکار می‌شه!»",
    "layout": "SCAM"
   },
   "order": 90,
   "version": 1
  },
  "css": "../templates/section_break/template.css"
 },
 {
  "name": "image_full",
  "js": "../templates/image_full/template.js",
  "schema": {
   "name": "image_full",
   "label": "عکس تمام‌صفحه",
   "description": "عکس بزرگ با زیرنویس پررنگ؛ در حالت SCAM عکس در قاب بزرگ بالا-راست می‌نشیند تا جای دوربین خالی بماند. می‌شود روی عکس نقطه گذاشت (مثل نقشه).",
   "aliases": [
    "image-full",
    "full-image",
    "عکس کامل"
   ],
   "category": "تصویر",
   "fields": [
    {
     "key": "image",
     "label": "عکس",
     "type": "image",
     "required": true,
     "editable": true
    },
    {
     "key": "title",
     "label": "زیرنویس / عنوان (*زرد*)",
     "type": "text",
     "editable": true
    },
    {
     "key": "text",
     "label": "متن کوچک",
     "type": "text",
     "editable": true
    },
    {
     "key": "dim",
     "label": "تیرگی عکس (۰ تا ۱)",
     "type": "number",
     "default": 0.25,
     "editable": false
    },
    {
     "key": "dots",
     "label": "نقطه‌ها روی عکس: x,y,رنگ (درصد) هر خط یکی",
     "type": "list",
     "editable": false
    },
    {
     "key": "motion",
     "label": "حرکت عکس",
     "type": "select",
     "options": [
      [
       "breathe",
       "نفس‌کشیدن"
      ],
      [
       "zoom-out",
       "زوم به بیرون"
      ],
      [
       "pan-left",
       "حرکت به چپ"
      ],
      [
       "pan-right",
       "حرکت به راست"
      ],
      [
       "none",
       "ثابت"
      ]
     ],
     "default": "breathe",
     "editable": false
    },
    {
     "key": "title_position",
     "label": "جای عنوان",
     "type": "select",
     "options": [
      [
       "bottom",
       "پایین"
      ],
      [
       "top",
       "بالا"
      ]
     ],
     "default": "bottom",
     "editable": false
    },
    {
     "key": "preset",
     "label": "سبک انیمیشن",
     "type": "select",
     "options": [
      [
       "auto",
       "کلاسیک / ارث‌بری"
      ],
      [
       "random",
       "🎲 تصادفی"
      ],
      [
       "cinema-zoom",
       "زوم سینمایی"
      ],
      [
       "curtain-reveal",
       "پرده تصویر"
      ],
      [
       "radar-dots",
       "نقاط راداری"
      ],
      [
       "parallax-caption",
       "زیرنویس پارالاکس"
      ],
      [
       "noir-vignette",
       "کنتراست تیره"
      ],
      [
       "minimal-frame",
       "قاب مینیمال"
      ]
     ],
     "default": "auto",
     "editable": false
    },
    {
     "key": "transition",
     "label": "ترنزیشن ورود",
     "type": "select",
     "options": [
      [
       "auto",
       "ارث‌بری"
      ],
      [
       "random",
       "🎲 تصادفی"
      ],
      [
       "soft-fade",
       "محو نرم"
      ],
      [
       "curtain-rtl",
       "پرده از راست به چپ"
      ],
      [
       "accent-slash",
       "نوار تأکید مورب"
      ],
      [
       "iris-rise",
       "باز شدن دایره‌ای"
      ],
      [
       "split-curtain",
       "پرده دوقسمتی"
      ],
      [
       "diagonal-wipe",
       "پاک‌شدن مورب"
      ],
      [
       "zoom-iris",
       "گشایش زوم"
      ],
      [
       "shutter-bars",
       "کرکره ستونی"
      ]
     ],
     "default": "auto",
     "editable": false
    },
    {
     "key": "seed",
     "label": "بذر تصادفی",
     "type": "number",
     "default": 0,
     "editable": false
    }
   ],
   "example": {
    "image": "",
    "title": "*تنبیه ضداجتماعی* در ۱۶ شهر دنیا",
    "text": "ضعیف‌تر بودن اعتماد و قانون ← حمله‌ی مفت‌خور به آدمِ درستکار",
    "dots": [
     "20,40",
     "26,36",
     "48,32,danger",
     "52,30",
     "60,45,danger"
    ],
    "layout": "SLIDE"
   },
   "order": 100,
   "version": 1
  }
 },
 {
  "name": "three_cards",
  "js": "../templates/three_cards/template.js",
  "schema": {
   "name": "three_cards",
   "label": "سه کارت",
   "description": "سه (یا دو تا پنج) کارت کنار هم، هر کدام با عکس یا نماد و یک برچسب. اختیاری: یک عکس مشترک بالای کارت‌ها.",
   "aliases": [
    "three-cards",
    "cards",
    "کارت‌ها"
   ],
   "category": "تصویر",
   "fields": [
    {
     "key": "title",
     "label": "عنوان",
     "type": "text",
     "editable": true
    },
    {
     "key": "image",
     "label": "عکس مشترک بالا (اختیاری)",
     "type": "image",
     "editable": true
    },
    {
     "key": "cards",
     "label": "کارت‌ها",
     "type": "table",
     "columns": [
      [
       "label",
       "برچسب"
      ],
      [
       "icon",
       "نماد/ایموجی"
      ],
      [
       "image",
       "عکس کارت"
      ],
      [
       "text",
       "توضیح"
      ]
     ],
     "editable": true
    },
    {
     "key": "preset",
     "label": "سبک انیمیشن",
     "type": "select",
     "options": [
      [
       "auto",
       "کلاسیک / ارث‌بری"
      ],
      [
       "random",
       "🎲 تصادفی"
      ],
      [
       "trio-cascade",
       "سه‌تایی آبشاری"
      ],
      [
       "elastic-fan",
       "بادبزن فنری"
      ],
      [
       "spotlight-cards",
       "کارت‌های درخشان"
      ],
      [
       "floating-trio",
       "کارت‌های شناور"
      ],
      [
       "sweep-grid",
       "ورود شبکه‌ای"
      ],
      [
       "minimal-cards",
       "کارت‌های ساده"
      ]
     ],
     "default": "auto",
     "editable": false
    },
    {
     "key": "transition",
     "label": "ترنزیشن ورود",
     "type": "select",
     "options": [
      [
       "auto",
       "ارث‌بری"
      ],
      [
       "random",
       "🎲 تصادفی"
      ],
      [
       "soft-fade",
       "محو نرم"
      ],
      [
       "curtain-rtl",
       "پرده از راست به چپ"
      ],
      [
       "accent-slash",
       "نوار تأکید مورب"
      ],
      [
       "iris-rise",
       "باز شدن دایره‌ای"
      ],
      [
       "split-curtain",
       "پرده دوقسمتی"
      ],
      [
       "diagonal-wipe",
       "پاک‌شدن مورب"
      ],
      [
       "zoom-iris",
       "گشایش زوم"
      ],
      [
       "shutter-bars",
       "کرکره ستونی"
      ]
     ],
     "default": "auto",
     "editable": false
    },
    {
     "key": "seed",
     "label": "بذر تصادفی",
     "type": "number",
     "default": 0,
     "editable": false
    }
   ],
   "example": {
    "title": "",
    "image": "",
    "cards": [
     {
      "label": "مشتری",
      "icon": "🧾"
     },
     {
      "label": "همکار",
      "icon": "💼"
     },
     {
      "label": "کارفرما",
      "icon": "🏢"
     }
    ],
    "layout": "SCAM"
   },
   "order": 110,
   "version": 1
  }
 },
 {
  "name": "chat",
  "js": "../templates/chat/template.js",
  "schema": {
   "name": "chat",
   "label": "گفتگوی پیام‌رسان",
   "description": "حباب‌های پیام یکی‌یکی ظاهر می‌شوند. «او» سمت راست (خاکستری)، «من» سمت چپ (سبز تیره)، لحن بد = قرمز.",
   "aliases": [
    "messages",
    "گفتگو",
    "پیام"
   ],
   "category": "ماکت",
   "fields": [
    {
     "key": "title",
     "label": "عنوان بالای گفتگو",
     "type": "text",
     "editable": true
    },
    {
     "key": "messages",
     "label": "پیام‌ها",
     "type": "table",
     "columns": [
      [
       "from",
       "فرستنده (او/من)"
      ],
      [
       "text",
       "متن"
      ],
      [
       "tone",
       "لحن (bad/good)"
      ],
      [
       "tag",
       "برچسب کوچک"
      ]
     ],
     "editable": true
    },
    {
     "key": "preset",
     "label": "سبک انیمیشن",
     "type": "select",
     "options": [
      [
       "auto",
       "کلاسیک / ارث‌بری"
      ],
      [
       "random",
       "🎲 تصادفی"
      ],
      [
       "pop-bubbles",
       "پرش حباب‌ها"
      ],
      [
       "rapid-thread",
       "رشته گفتگوی سریع"
      ],
      [
       "editorial-dialog",
       "گفتگوی تحریریه"
      ],
      [
       "slide-thread",
       "ورود از طرفین"
      ],
      [
       "focus-alert",
       "تأکید پیام مهم"
      ],
      [
       "minimal-chat",
       "گفتگوی آرام"
      ]
     ],
     "default": "auto",
     "editable": false
    },
    {
     "key": "transition",
     "label": "ترنزیشن ورود",
     "type": "select",
     "options": [
      [
       "auto",
       "ارث‌بری"
      ],
      [
       "random",
       "🎲 تصادفی"
      ],
      [
       "soft-fade",
       "محو نرم"
      ],
      [
       "curtain-rtl",
       "پرده از راست به چپ"
      ],
      [
       "accent-slash",
       "نوار تأکید مورب"
      ],
      [
       "iris-rise",
       "باز شدن دایره‌ای"
      ],
      [
       "split-curtain",
       "پرده دوقسمتی"
      ],
      [
       "diagonal-wipe",
       "پاک‌شدن مورب"
      ],
      [
       "zoom-iris",
       "گشایش زوم"
      ],
      [
       "shutter-bars",
       "کرکره ستونی"
      ]
     ],
     "default": "auto",
     "editable": false
    },
    {
     "key": "seed",
     "label": "بذر تصادفی",
     "type": "number",
     "default": 0,
     "editable": false
    }
   ],
   "example": {
    "title": "",
    "messages": [
     {
      "from": "او",
      "text": "این دو تا بخش جدیدم اضافه کن؛ *کار پنج دقیقه‌ست!*"
     },
     {
      "from": "من",
      "text": "توی قرارمون نبوده"
     },
     {
      "from": "من",
      "text": "باز هم نه، زمان می‌بره"
     },
     {
      "from": "او",
      "text": "ای بابا، روت حساب کرده بودیم رفیق!"
     },
     {
      "from": "من",
      "text": "باشه... می‌زنم",
      "tone": "bad"
     }
    ],
    "layout": "SCAM"
   },
   "order": 120,
   "version": 1
  }
 },
 {
  "name": "timeline",
  "js": "../templates/timeline/template.js",
  "schema": {
   "name": "timeline",
   "label": "خط زمان",
   "description": "یک خط افقی که از راست به چپ کشیده می‌شود و نقطه‌های تاریخ با توضیح، یکی‌یکی روی آن ظاهر می‌شوند.",
   "aliases": [
    "خط زمان"
   ],
   "category": "نمودار",
   "fields": [
    {
     "key": "title",
     "label": "عنوان",
     "type": "text",
     "editable": true
    },
    {
     "key": "events",
     "label": "رویدادها",
     "type": "table",
     "columns": [
      [
       "date",
       "تاریخ"
      ],
      [
       "text",
       "توضیح"
      ],
      [
       "tone",
       "لحن (bad/good)"
      ]
     ],
     "editable": true
    },
    {
     "key": "preset",
     "label": "سبک انیمیشن",
     "type": "select",
     "options": [
      [
       "auto",
       "کلاسیک / ارث‌بری"
      ],
      [
       "random",
       "🎲 تصادفی"
      ],
      [
       "track-sweep",
       "کشش خط زمان"
      ],
      [
       "milestone-pop",
       "پرش رویدادها"
      ],
      [
       "editorial-arc",
       "قوس تحریریه"
      ],
      [
       "elastic-nodes",
       "نقاط فنری"
      ],
      [
       "stagger-eras",
       "دوره‌های پلکانی"
      ],
      [
       "minimal-rail",
       "ریل مینیمال"
      ]
     ],
     "default": "auto",
     "editable": false
    },
    {
     "key": "transition",
     "label": "ترنزیشن ورود",
     "type": "select",
     "options": [
      [
       "auto",
       "ارث‌بری"
      ],
      [
       "random",
       "🎲 تصادفی"
      ],
      [
       "soft-fade",
       "محو نرم"
      ],
      [
       "curtain-rtl",
       "پرده از راست به چپ"
      ],
      [
       "accent-slash",
       "نوار تأکید مورب"
      ],
      [
       "iris-rise",
       "باز شدن دایره‌ای"
      ],
      [
       "split-curtain",
       "پرده دوقسمتی"
      ],
      [
       "diagonal-wipe",
       "پاک‌شدن مورب"
      ],
      [
       "zoom-iris",
       "گشایش زوم"
      ],
      [
       "shutter-bars",
       "کرکره ستونی"
      ]
     ],
     "default": "auto",
     "editable": false
    },
    {
     "key": "seed",
     "label": "بذر تصادفی",
     "type": "number",
     "default": 0,
     "editable": false
    }
   ],
   "example": {
    "title": "ایتالیا و آدم‌ربایی",
    "events": [
     {
      "date": "۱۹۶۹",
      "text": "شروع موج آدم‌ربایی"
     },
     {
      "date": "۱۹۹۱",
      "text": "قانون مسدود کردن حساب خانواده",
      "tone": "good"
     },
     {
      "date": "۱۹۹۸",
      "text": "فقط ۳۸ مورد در ۷ سال"
     }
    ],
    "source": "Bohlen / NYT, 1998; Avraham & Porat, 2023",
    "layout": "SLIDE"
   },
   "order": 130,
   "version": 1
  }
 },
 {
  "name": "chart",
  "js": "../templates/chart/template.js",
  "schema": {
   "name": "chart",
   "label": "نمودار از فایل spec",
   "description": "نمودار از روی یک فایل JSON (spec) با فیلدهای type/title/data/series؛ برای نمودارهای پیچیده‌تر.",
   "aliases": [
    "spec"
   ],
   "category": "نمودار",
   "fields": [
    {
     "key": "spec",
     "label": "مسیر فایل spec (JSON)",
     "type": "text",
     "editable": true
    },
    {
     "key": "title",
     "label": "عنوان",
     "type": "text",
     "editable": true
    },
    {
     "key": "subtitle",
     "label": "زیرعنوان",
     "type": "text",
     "editable": true
    },
    {
     "key": "preset",
     "label": "سبک انیمیشن",
     "type": "select",
     "options": [
      [
       "auto",
       "کلاسیک / ارث‌بری"
      ],
      [
       "random",
       "🎲 تصادفی"
      ],
      [
       "sweep-chart",
       "ورود پویا"
      ],
      [
       "editorial-spec",
       "نمودار تحریریه"
      ],
      [
       "elastic-spec",
       "نمودار فنری"
      ],
      [
       "spotlight-spec",
       "تمرکز داده‌ها"
      ],
      [
       "cascade-spec",
       "رسم آبشاری"
      ],
      [
       "minimal-spec",
       "نمودار مینیمال"
      ]
     ],
     "default": "auto",
     "editable": false
    },
    {
     "key": "transition",
     "label": "ترنزیشن ورود",
     "type": "select",
     "options": [
      [
       "auto",
       "ارث‌بری"
      ],
      [
       "random",
       "🎲 تصادفی"
      ],
      [
       "soft-fade",
       "محو نرم"
      ],
      [
       "curtain-rtl",
       "پرده از راست به چپ"
      ],
      [
       "accent-slash",
       "نوار تأکید مورب"
      ],
      [
       "iris-rise",
       "باز شدن دایره‌ای"
      ],
      [
       "split-curtain",
       "پرده دوقسمتی"
      ],
      [
       "diagonal-wipe",
       "پاک‌شدن مورب"
      ],
      [
       "zoom-iris",
       "گشایش زوم"
      ],
      [
       "shutter-bars",
       "کرکره ستونی"
      ]
     ],
     "default": "auto",
     "editable": false
    },
    {
     "key": "seed",
     "label": "بذر تصادفی",
     "type": "number",
     "default": 0,
     "editable": false
    }
   ],
   "example": {
    "chart": {
     "type": "bar",
     "data": [
      {
       "label": "الف",
       "value": 10
      },
      {
       "label": "ب",
       "value": 25,
       "color": "accent"
      }
     ]
    },
    "title": "نمونه",
    "layout": "SLIDE"
   },
   "order": 140,
   "version": 1
  }
 },
 {
  "name": "layers",
  "js": "../templates/layers/template.js",
  "schema": {
   "name": "layers",
   "label": "لایه‌ای (JSON)",
   "description": "اسلایدی که از فایل لایه‌ای JSON می‌آید: هر المان با مختصات دقیق. برای طرح‌های خاص.",
   "aliases": [
    "layer"
   ],
   "category": "ویژه",
   "fields": [
    {
     "key": "file",
     "label": "مسیر فایل لایه‌ای JSON",
     "type": "text",
     "editable": true
    },
    {
     "key": "preset",
     "label": "سبک انیمیشن",
     "type": "select",
     "options": [
      [
       "auto",
       "کلاسیک / ارث‌بری"
      ],
      [
       "random",
       "🎲 تصادفی"
      ],
      [
       "layered-depth",
       "عمق چندلایه"
      ],
      [
       "kinetic-stage",
       "صحنه کینتیک"
      ],
      [
       "sweep-compose",
       "ترکیب کشیده"
      ],
      [
       "elastic-nodes",
       "نقاط فنری"
      ],
      [
       "cinematic-pass",
       "گذر سینمایی"
      ],
      [
       "minimal-layers",
       "لایه‌های مینیمال"
      ]
     ],
     "default": "auto",
     "editable": false
    },
    {
     "key": "transition",
     "label": "ترنزیشن ورود",
     "type": "select",
     "options": [
      [
       "auto",
       "ارث‌بری"
      ],
      [
       "random",
       "🎲 تصادفی"
      ],
      [
       "soft-fade",
       "محو نرم"
      ],
      [
       "curtain-rtl",
       "پرده از راست به چپ"
      ],
      [
       "accent-slash",
       "نوار تأکید مورب"
      ],
      [
       "iris-rise",
       "باز شدن دایره‌ای"
      ],
      [
       "split-curtain",
       "پرده دوقسمتی"
      ],
      [
       "diagonal-wipe",
       "پاک‌شدن مورب"
      ],
      [
       "zoom-iris",
       "گشایش زوم"
      ],
      [
       "shutter-bars",
       "کرکره ستونی"
      ]
     ],
     "default": "auto",
     "editable": false
    },
    {
     "key": "seed",
     "label": "بذر تصادفی",
     "type": "number",
     "default": 0,
     "editable": false
    }
   ],
   "example": {
    "elements": [
     {
      "type": "text",
      "text": "نمونه‌ی لایه‌ای",
      "font": "Black",
      "size": 90,
      "color": "#FFFFFF",
      "x": 1840,
      "y": 300,
      "anchor": "rs"
     },
     {
      "type": "counter",
      "from": 0,
      "to": 79,
      "suffix": "٪",
      "font": "Black",
      "size": 220,
      "color": "#FFD600",
      "x": 1840,
      "y": 640,
      "anchor": "rs",
      "delay": 0.2
     }
    ],
    "layout": "SLIDE"
   },
   "order": 150,
   "version": 1
  }
 },
 {
  "name": "cam",
  "js": "../templates/cam/template.js",
  "schema": {
   "name": "cam",
   "label": "فقط دوربین (بدون اسلاید)",
   "description": "این قدم اسلاید ندارد؛ فقط تصویر خودت تمام‌صفحه. در خروجی OBS به‌صورت CAM ثبت می‌شود و فایل ویدیویی ساخته نمی‌شود.",
   "aliases": [
    "camera",
    "دوربین"
   ],
   "category": "ویژه",
   "fields": [
    {
     "key": "preset",
     "label": "سبک انیمیشن",
     "type": "select",
     "options": [
      [
       "auto",
       "کلاسیک / ارث‌بری"
      ],
      [
       "random",
       "🎲 تصادفی"
      ],
      [
       "cam-clean",
       "دوربین تمیز"
      ],
      [
       "cam-soft",
       "دوربین نرم"
      ],
      [
       "cam-pulse",
       "دوربین نبض‌دار"
      ],
      [
       "cam-editorial",
       "دوربین تحریریه"
      ],
      [
       "cam-focus",
       "تمرکز دوربین"
      ],
      [
       "cam-minimal",
       "دوربین ساده"
      ]
     ],
     "default": "auto",
     "editable": false
    },
    {
     "key": "transition",
     "label": "ترنزیشن ورود",
     "type": "select",
     "options": [
      [
       "auto",
       "ارث‌بری"
      ],
      [
       "random",
       "🎲 تصادفی"
      ],
      [
       "soft-fade",
       "محو نرم"
      ],
      [
       "curtain-rtl",
       "پرده از راست به چپ"
      ],
      [
       "accent-slash",
       "نوار تأکید مورب"
      ],
      [
       "iris-rise",
       "باز شدن دایره‌ای"
      ],
      [
       "split-curtain",
       "پرده دوقسمتی"
      ],
      [
       "diagonal-wipe",
       "پاک‌شدن مورب"
      ],
      [
       "zoom-iris",
       "گشایش زوم"
      ],
      [
       "shutter-bars",
       "کرکره ستونی"
      ]
     ],
     "default": "auto",
     "editable": false
    },
    {
     "key": "seed",
     "label": "بذر تصادفی",
     "type": "number",
     "default": 0,
     "editable": false
    }
   ],
   "example": {
    "layout": "CAM"
   },
   "order": 160,
   "version": 1
  }
 }
];
