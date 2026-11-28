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
  "name": "guest_intro",
  "js": "../templates/guest_intro/template.js",
  "schema": {
   "name": "guest_intro",
   "label": "معرفی مهمان / میزبان پادکست",
   "description": "کارت معرفی مهمان یا میزبان پادکست با تصویر قاب‌دار، سمت/نقش، توضیح کوتاه و شبکه اجتماعی.",
   "aliases": [
    "guest-intro",
    "guest",
    "معرفی مهمان",
    "مهمان"
   ],
   "category": "پادکست",
   "fields": [
    {
     "key": "badge",
     "label": "نشان نقش (مثل: مهمان ویژه / میزبان)",
     "type": "text",
     "editable": false
    },
    {
     "key": "title",
     "label": "نام و نام خانوادگی",
     "type": "text",
     "required": true,
     "editable": true
    },
    {
     "key": "subtitle",
     "label": "عنوان شغلی یا تخصص",
     "type": "text",
     "editable": true
    },
    {
     "key": "text",
     "label": "معرفی کوتاه یا نکتهٔ کلیدی",
     "type": "textarea",
     "editable": true
    },
    {
     "key": "handle",
     "label": "آیدی شبکه‌ها (مثل @dariush)",
     "type": "text",
     "editable": false
    },
    {
     "key": "image",
     "label": "تصویر مهمان",
     "type": "image",
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
       "editorial-split",
       "قاب دو تکه سردبیری"
      ],
      [
       "card-float",
       "کارت شناور"
      ],
      [
       "spotlight",
       "نورپردازی متمرکز"
      ]
     ],
     "default": "auto",
     "editable": false
    }
   ],
   "example": {
    "badge": "مهمان ویژهٔ قسمت ۱۲",
    "title": "دکتر سارا *رادمنش*",
    "subtitle": "پژوهشگر علوم اعصاب و تصمیم‌گیری",
    "text": "بررسی علمی این‌که چرا پاداش‌های نامطمئن مغز ما را درگیرتر نگه می‌دارند.",
    "handle": "@sarah.radmanesh",
    "layout": "SCAM"
   },
   "order": 15,
   "version": 1
  }
 },
 {
  "name": "podcast_question",
  "js": "../templates/podcast_question/template.js",
  "schema": {
   "name": "podcast_question",
   "label": "کارت سؤال / موضوع داغ پادکست",
   "description": "نمایش پرسش مخاطب، موضوع بحث یا چالش اصلی اپیزود با هایلایت وکتور و نکات پاسخ.",
   "aliases": [
    "podcast-question",
    "qa",
    "سؤال مخاطب",
    "پرسش"
   ],
   "category": "پادکست",
   "fields": [
    {
     "key": "badge",
     "label": "برچسب بالا (مثل: سؤال مخاطب / موضوع داغ)",
     "type": "text",
     "editable": false
    },
    {
     "key": "author",
     "label": "نام پرسش‌گر (اختیاری)",
     "type": "text",
     "editable": true
    },
    {
     "key": "title",
     "label": "متن پرسش (*زرد* ، ==هایلایت==)",
     "type": "textarea",
     "required": true,
     "editable": true
    },
    {
     "key": "items",
     "label": "نکته‌های پاسخ (هر خط یکی، اختیاری)",
     "type": "list",
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
       "kinetic-words",
       "کلمه‌به‌کلمه زنده"
      ],
      [
       "spotlight",
       "نورپردازی متمرکز"
      ],
      [
       "glitch-pop",
       "پرش مدرن"
      ]
     ],
     "default": "auto",
     "editable": false
    }
   ],
   "example": {
    "badge": "پرسش کلیدی اپیزود",
    "author": "ارسالی از شنوندگان پادکست",
    "title": "چرا با وجود ==هوشمندتر شدن==، هنوز در دام باج‌گیری عاطفی می‌افتیم؟",
    "items": [
     "واکنش فوری مغز به تهدید کوتاه‌مدت",
     "خطای هزینهٔ غرق‌شده در روابط کاری"
    ],
    "layout": "SCAM"
   },
   "order": 16,
   "version": 1
  }
 },
 {
  "name": "podcast_end",
  "js": "../templates/podcast_end/template.js",
  "schema": {
   "name": "podcast_end",
   "label": "صفحهٔ پایان پادکست و سابسکرایب",
   "description": "کارت پایانی یوتیوب با جایگاه دو ویدیوی پیشنهادی، دکمهٔ انیمیشنی سابسکرایب و آیدی کانال.",
   "aliases": [
    "podcast-end",
    "outro",
    "end-screen",
    "پایان پادکست",
    "پایان"
   ],
   "category": "پادکست",
   "fields": [
    {
     "key": "eyebrow",
     "label": "تیتر کوچک بالا",
     "type": "text",
     "editable": true
    },
    {
     "key": "title",
     "label": "جملهٔ خداحافظی / دعوت",
     "type": "text",
     "required": true,
     "editable": true
    },
    {
     "key": "subtitle",
     "label": "لینک یا آیدی کانال",
     "type": "text",
     "editable": true
    },
    {
     "key": "cta",
     "label": "متن دکمهٔ سابسکرایب",
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
       "spotlight",
       "نورپردازی متمرکز"
      ],
      [
       "kinetic-hero",
       "تایپ کینتیک سینمایی"
      ]
     ],
     "default": "auto",
     "editable": false
    }
   ],
   "example": {
    "eyebrow": "ممنون که تا اینجا همراه بودید",
    "title": "اگر این بحث برایتان مفید بود، *سابسکرایب* یادتان نرود",
    "subtitle": "اپیزود بعدی هر پنج‌شنبه ساعت ۲۰ منتشر می‌شود",
    "cta": "عضویت در کانال + زنگوله 🔔",
    "layout": "SLIDE"
   },
   "order": 17,
   "version": 1
  }
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
  "name": "article_zoom",
  "js": "../templates/article_zoom/template.js",
  "schema": {
   "name": "article_zoom",
   "label": "مقاله و زوم روی متن",
   "description": "نمایش برگهٔ مقاله، پژوهش یا تصویر سند و زوم سینمایی روی جملهٔ کلیدی همراه با هایلایت ماژیکی (سبک یوتیوبرهای مستند).",
   "aliases": [
    "article-zoom",
    "article",
    "مقاله",
    "زوم مقاله"
   ],
   "category": "مستند و پادکست",
   "order": 25,
   "version": 1,
   "fields": [
    {
     "key": "eyebrow",
     "label": "تیتر کوچک بالای صحنه (اختیاری)",
     "type": "text",
     "editable": true
    },
    {
     "key": "title",
     "label": "تیتر توضیحی کنار یا بالای مقاله (اختیاری)",
     "type": "text",
     "editable": true
    },
    {
     "key": "publication",
     "label": "نام نشریه یا منبع مقاله (مثل Nature یا روزنامه شرق)",
     "type": "text",
     "editable": false
    },
    {
     "key": "article_title",
     "label": "تیتر اصلی مقاله / پژوهش",
     "type": "text",
     "editable": true
    },
    {
     "key": "author",
     "label": "نویسنده و تاریخ انتشار",
     "type": "text",
     "editable": false
    },
    {
     "key": "article_body",
     "label": "متن زمینهٔ مقاله (پاراگراف‌ها با Enter جدا شوند؛ برای هایلایت بین ==...== بگذارید)",
     "type": "textarea",
     "editable": true
    },
    {
     "key": "focus_text",
     "label": "جملهٔ کانونی که دوربین روی آن زوم و هایلایت می‌کند",
     "type": "textarea",
     "editable": true
    },
    {
     "key": "image",
     "label": "تصویر مقاله یا پس‌زمینهٔ سند (اختیاری)",
     "type": "image",
     "editable": true
    },
    {
     "key": "zoom_mode",
     "label": "حالت نمایش",
     "type": "select",
     "options": [
      [
       "auto",
       "خودکار (متن مقاله + پس‌زمینه محو)"
      ],
      [
       "article",
       "برگهٔ مقاله و زوم روی جمله"
      ],
      [
       "image",
       "زوم مستقیم روی تصویر مقاله / سند"
      ]
     ],
     "default": "auto",
     "editable": false
    },
    {
     "key": "paper_theme",
     "label": "جنس و رنگ برگهٔ مقاله",
     "type": "select",
     "options": [
      [
       "warm-paper",
       "کاغذ کرم پژوهشی (کلاسیک)"
      ],
      [
       "newsprint",
       "برش روزنامهٔ آرشیوی"
      ],
      [
       "editorial-dark",
       "کارت شیشه‌ای تیره (مدرن)"
      ]
     ],
     "default": "warm-paper",
     "editable": false
    },
    {
     "key": "zoom_scale",
     "label": "میزان بزرگنمایی زوم (مثلاً 1.38)",
     "type": "number",
     "default": 1.38,
     "editable": false
    },
    {
     "key": "zoom_x",
     "label": "موقعیت افقی زوم روی تصویر (۰ تا ۱۰۰٪)",
     "type": "number",
     "default": 50,
     "editable": false
    },
    {
     "key": "zoom_y",
     "label": "موقعیت عمودی زوم روی تصویر (۰ تا ۱۰۰٪)",
     "type": "number",
     "default": 48,
     "editable": false
    },
    {
     "key": "preset",
     "label": "سبک انیمیشن زوم",
     "type": "select",
     "options": [
      [
       "auto",
       "ارث‌بری / خودکار"
      ],
      [
       "random",
       "🎲 تصادفی"
      ],
      [
       "cinematic-push",
       "زوم سینمایی روی جمله"
      ],
      [
       "tilt-glide",
       "نمای سه‌بعدی مورب و زوم"
      ],
      [
       "marker-sweep",
       "ماژیک هایلایت زنده + زوم نزدیک"
      ],
      [
       "split-paper",
       "برگهٔ مقاله + متن کناری"
      ]
     ],
     "default": "auto",
     "editable": false
    }
   ],
   "example": {
    "eyebrow": "بررسی پژوهش علمی",
    "publication": "Journal of Behavioral Economics · 2024",
    "article_title": "چرا پاداش‌های نامطمئن بیش از پاداش ثابت رفتار ما را شرطی می‌کنند؟",
    "author": "تیم پژوهشی دانشگاه زوریخ · صفحهٔ ۱۴",
    "article_body": "در آزمایش‌های متعدد طی دو دههٔ گذشته مشخص شد که وقتی سیستم تشویق کاملاً قابل پیش‌بینی است، مغز به سرعت به آن عادت می‌کند.\nاما به محض اینکه فاصلهٔ زمانی پاداش تغییر می‌کند، سطح دوپامین پیش‌بینی‌کننده جهش چشمگیری دارد.",
    "focus_text": "پاداشِ گاه‌به‌گاه و غیرقابل‌پیش‌بینی تا ۳ برابر ماندگاری رفتار را افزایش می‌دهد.",
    "image": "/assets/archive-newspaper.jpg",
    "paper_theme": "warm-paper",
    "zoom_scale": 1.36,
    "layout": "SCAM",
    "say": "اگر به متن این مقاله دقت کنید، نویسنده‌ها به یک نکتهٔ کلیدی اشاره می‌کنند: پاداشِ گاه‌به‌گاه تا سه برابر ماندگاری رفتار را بالا می‌برد."
   }
  }
 },
 {
  "name": "mascot_talk",
  "js": "../templates/mascot_talk/template.js",
  "schema": {
   "name": "mascot_talk",
   "label": "عقاب سخنگو (Mascot Talk)",
   "description": "صحنهٔ گفتگو و روایت با شخصیت کارتونی عقاب قرمز همگام با صدا، حالت‌های چهره، پلک‌زدن طبیعی و کارت متن.",
   "aliases": [
    "mascot-talk",
    "mascot",
    "عقاب",
    "شخصیت",
    "مسکات"
   ],
   "category": "شخصیت و پادکست",
   "order": 28,
   "version": 1,
   "fields": [
    {
     "key": "eyebrow",
     "label": "تیتر کوچک بالا (اختیاری)",
     "type": "text",
     "editable": true
    },
    {
     "key": "title",
     "label": "تیتر اصلی کارت گفتگو (*زرد* ، ~قرمز~)",
     "type": "text",
     "required": true,
     "editable": true
    },
    {
     "key": "text",
     "label": "متن توضیح یا نقل‌قول",
     "type": "textarea",
     "editable": true
    },
    {
     "key": "image",
     "label": "تصویر کمکی یا سند در کارت (اختیاری)",
     "type": "image",
     "editable": true
    },
    {
     "key": "expression",
     "label": "حالت چهرهٔ پایه",
     "type": "select",
     "options": [
      [
       "neutral",
       "عادی / متمرکز (neutral)"
      ],
      [
       "happy",
       "خوشحال / پرانرژی (happy)"
      ],
      [
       "smug",
       "مغرور / مطمئن (smug)"
      ],
      [
       "shocked",
       "شوکه / متعجب (shocked)"
      ],
      [
       "annoyed",
       "کلافه / جدی (annoyed)"
      ],
      [
       "embarrassed",
       "معذب / خجالت‌زده (embarrassed)"
      ],
      [
       "thinking",
       "در حال فکر (thinking)"
      ],
      [
       "sad",
       "غمگین / دلسرد (sad)"
      ],
      [
       "angry",
       "عصبانی / تند (angry)"
      ],
      [
       "surprised",
       "غافلگیر / متعجب (surprised)"
      ],
      [
       "confused",
       "گیج / سردرگم (confused)"
      ],
      [
       "scared",
       "ترسیده / مضطرب (scared)"
      ],
      [
       "proud",
       "سربلند / افتخار (proud)"
      ],
      [
       "bored",
       "حوصله‌سربر / بی‌حوصله (bored)"
      ],
      [
       "sarcastic",
       "کنایه‌آمیز / طعنه (sarcastic)"
      ]
     ],
     "default": "neutral",
     "editable": false
    },
    {
     "key": "character",
     "label": "شخصیت (Character)",
     "type": "select",
     "options": [
      [
       "red_eagle",
       "عقاب قرمز (Red Eagle)"
      ],
      [
       "vesper_owl",
       "جغد وسپر (Vesper Owl)"
      ],
      [
       "pip_pigeon",
       "کبوتر پیپ (Pip Pigeon)"
      ],
      [
       "midge_hummingbird",
       "مرغ مگس‌خوار میج (Midge Hummingbird)"
      ],
      [
       "barnaby_tortoise",
       "لاک‌پشت بارنابی (Barnaby Tortoise)"
      ]
     ],
     "default": "red_eagle",
     "editable": false
    },
    {
     "key": "outfit",
     "label": "لباس و اکسسوری (Outfit)",
     "type": "select",
     "options": [
      [
       "default",
       "پیش‌فرض (Default)"
      ],
      [
       "formal",
       "رسمی (Formal)"
      ],
      [
       "podcast",
       "میز پادکست (Podcast)"
      ],
      [
       "royal",
       "سلطنتی (Royal)"
      ],
      [
       "street",
       "خیابانی (Street)"
      ],
      [
       "cozy",
       "دنج زمستانی (Cozy)"
      ]
     ],
     "default": "default",
     "editable": false
    },
    {
     "key": "skin",
     "label": "پوسته فصلی (Skin)",
     "type": "select",
     "options": [
      [
       "classic",
       "کلاسیک (Classic)"
      ],
      [
       "nowruz",
       "نوروز (Nowruz)"
      ],
      [
       "yalda",
       "شب یلدا (Yalda)"
      ],
      [
       "winter",
       "زمستانی (Winter)"
      ],
      [
       "autumn",
       "پاییزی (Autumn)"
      ],
      [
       "neon_studio",
       "نئون استودیو (Neon Studio)"
      ],
      [
       "noir",
       "فیلم نوآر (Noir)"
      ]
     ],
     "default": "classic",
     "editable": false
    },
    {
     "key": "side",
     "label": "جایگاه عقاب در صحنه",
     "type": "select",
     "options": [
      [
       "left",
       "چپ صحنه (پیشنهادی برای RTL)"
      ],
      [
       "right",
       "راست صحنه"
      ]
     ],
     "default": "left",
     "editable": false
    },
    {
     "key": "scale",
     "label": "اندازه شخصیت (مقیاس)",
     "type": "number",
     "default": 1.0,
     "editable": false
    },
    {
     "key": "position_x",
     "label": "مختصات افقی X (اختیاری)",
     "type": "number",
     "editable": false
    },
    {
     "key": "position_y",
     "label": "مختصات عمودی Y (اختیاری)",
     "type": "number",
     "editable": false
    },
    {
     "key": "look_at",
     "label": "مسیر نگاه چشم‌ها",
     "type": "select",
     "options": [
      [
       "auto",
       "خودکار (متناسب با احساس و اسلاید)"
      ],
      [
       "camera",
       "مستقیم به دوربین"
      ],
      [
       "slide",
       "به سمت کارت متن"
      ],
      [
       "other",
       "به سمت شخصیت مقابل"
      ],
      [
       "left",
       "به چپ"
      ],
      [
       "right",
       "به راست"
      ],
      [
       "up",
       "به بالا"
      ],
      [
       "down",
       "به پایین"
      ]
     ],
     "default": "auto",
     "editable": false
    },
    {
     "key": "enter",
     "label": "انیمیشن ورود شخصیت",
     "type": "select",
     "options": [
      [
       "slide-in",
       "ورود کشویی از لبه"
      ],
      [
       "pop",
       "جهش سریع (Pop)"
      ],
      [
       "fade",
       "محو آرام (Fade)"
      ],
      [
       "drop",
       "فرود از بالا (Drop)"
      ],
      [
       "none",
       "بدون ورود"
      ]
     ],
     "default": "slide-in",
     "editable": false
    },
    {
     "key": "exit",
     "label": "انیمیشن خروج شخصیت",
     "type": "select",
     "options": [
      [
       "none",
       "ثابت تا پایان"
      ],
      [
       "slide-out",
       "خروج کشویی به لبه"
      ],
      [
       "pop",
       "کوچک شدن (Pop Out)"
      ],
      [
       "fade",
       "محو آرام (Fade Out)"
      ]
     ],
     "default": "none",
     "editable": false
    },
    {
     "key": "audio",
     "label": "مسیر فایل صوتی (WAV/MP3)",
     "type": "text",
     "editable": false
    },
    {
     "key": "viseme_track",
     "label": "مسیر فایل ویزیم‌ها (JSON)",
     "type": "text",
     "editable": false
    },
    {
     "key": "prosody_track",
     "label": "مسیر فایل لحن صدا / پروزودی (JSON)",
     "type": "text",
     "editable": false
    },
    {
     "key": "srt",
     "label": "فایل زیرنویس (SRT Captions)",
     "type": "text",
     "editable": false
    },
    {
     "key": "shot",
     "label": "نمای دوربین (Camera Shot)",
     "type": "select",
     "options": [
      [
       "medium",
       "نمای متوسط (Medium)"
      ],
      [
       "close-up",
       "نمای نزدیک (Close-Up)"
      ],
      [
       "wide",
       "نمای باز (Wide)"
      ],
      [
       "two-shot",
       "دونفره گفتگو (Two-Shot)"
      ]
     ],
     "default": "medium",
     "editable": false
    },
    {
     "key": "background",
     "label": "پس‌زمینه پارالاکس (Parallax Scene)",
     "type": "select",
     "options": [
      [
       "none",
       "پیش‌فرض تم (Theme Default)"
      ],
      [
       "studio-desk",
       "میز استودیو پادکست (Studio Desk)"
      ],
      [
       "news-desk",
       "استودیو خبر (News Desk)"
      ],
      [
       "night-city",
       "شهر شبانه پارالاکس (Night City)"
      ],
      [
       "warm-library",
       "کتابخانه گرم (Warm Library)"
      ],
      [
       "gradient-cyclorama",
       "سیکلوراما استودیو (Cyclorama)"
      ],
      [
       "chroma-green",
       "پرده سبز کروماکی (Chroma Green)"
      ],
      [
       "transparent",
       "پس‌زمینه شفاف (Transparent Alpha)"
      ]
     ],
     "default": "none",
     "editable": false
    },
    {
     "key": "lighting",
     "label": "نورپردازی صحنه (Lighting Preset)",
     "type": "select",
     "options": [
      [
       "studio",
       "نور استاندارد استودیو (Studio)"
      ],
      [
       "rim-light",
       "نور لبه‌ای سینمایی (Rim Light)"
      ],
      [
       "warm",
       "نور گرم طلایی (Warm Key)"
      ],
      [
       "cool",
       "نور سرد تحریریه (Cool Blue)"
      ],
      [
       "dramatic-noir",
       "نور دراماتیک نوآر (Dramatic Noir)"
      ],
      [
       "sunset-gold",
       "نور غروب طلایی (Sunset Gold)"
      ]
     ],
     "default": "studio",
     "editable": false
    },
    {
     "key": "accents",
     "label": "علامت‌های کارتونی احساس (؟ / عرق / جرقه)",
     "type": "boolean",
     "default": true,
     "editable": false
    },
    {
     "key": "format",
     "label": "نسبت تصویر صحنه",
     "type": "select",
     "options": [
      [
       "auto",
       "ارث‌بری (16:9 پیش‌فرض)"
      ],
      [
       "16:9",
       "افقی یوتیوب (16:9)"
      ],
      [
       "9:16",
       "عمودی ریلز / شورتس (9:16)"
      ],
      [
       "1:1",
       "مربعی پست (1:1)"
      ]
     ],
     "default": "auto",
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
       "editorial-host",
       "مجری تحریریه و کارت گفتگو"
      ],
      [
       "debate-card",
       "کارت مناظره و استدلال"
      ],
      [
       "reaction-pop",
       "واکنش سریع و پویا"
      ],
      [
       "podcast-desk",
       "میز پادکست تمام‌قاب"
      ]
     ],
     "default": "auto",
     "editable": false
    }
   ],
   "example": {
    "eyebrow": "نکتهٔ کلیدی اپیزود",
    "title": "وقتی تنبیه پولی جای ==هنجار اجتماعی== را می‌گیرد",
    "text": "اینجا دقیقاً نقطه‌ای است که جریمه کردنِ دیرکرد، معامله را جایگزین تعهد اخلاقی می‌کند.",
    "expression": "smug",
    "expression_timeline": [
     {
      "t": 0.0,
      "expression": "neutral",
      "blend": 0.3
     },
     {
      "t": 1.4,
      "expression": "thinking",
      "blend": 0.35
     },
     {
      "t": 3.1,
      "expression": "smug",
      "blend": 0.35
     }
    ],
    "side": "left",
    "scale": 1.0,
    "look_at": "slide",
    "enter": "slide-in",
    "exit": "none",
    "accents": true,
    "say": "سلام! ببینید چرا جریمه‌ی دیرکرد در مهدکودک‌ها نتیجه‌ی برعکس داد و تاخیر را بیشتر کرد.",
    "layout": "SLIDE"
   }
  },
  "css": "../templates/mascot_talk/template.css"
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
  "name": "by_the_numbers",
  "js": "../templates/by_the_numbers/template.js",
  "schema": {
   "name": "by_the_numbers",
   "aliases": [
    "by-the-numbers",
    "به-زبان-آمار",
    "آمار-سه-گانه"
   ],
   "order": 35,
   "category": "خبری و تحلیلی (News & Explainer)",
   "label": "به زبان آمار (By the Numbers)",
   "description": "نمایش سه‌تایی آمارهای کلیدی خبری با شمارشگر عدد و جداکنندهٔ خطی رسم‌شونده در سه فرمت",
   "fields": [
    {
     "key": "eyebrow",
     "label": "روتیتر (Eyebrow)",
     "type": "text",
     "editable": true
    },
    {
     "key": "title",
     "label": "تیتر اصلی (Title)",
     "type": "text",
     "editable": true
    },
    {
     "key": "summary",
     "label": "جمع‌بندی کوتاه (Summary)",
     "type": "textarea",
     "editable": true
    },
    {
     "key": "items",
     "label": "آمارها (عدد، پسوند، توضیح)",
     "type": "table",
     "columns": [
      [
       "value",
       "عدد"
      ],
      [
       "suffix",
       "پسوند"
      ],
      [
       "label",
       "عنوان"
      ],
      [
       "color",
       "رنگ"
      ]
     ]
    },
    {
     "key": "source",
     "label": "منبع (Source)",
     "type": "text"
    }
   ],
   "example": {
    "eyebrow": "گزارش به زبان آمار",
    "title": "سه عدد که *کل ماجرا* را توضیح می‌دهد",
    "summary": "داده‌های رسمی سال گذشته نشان می‌دهد تغییر رفتار مخاطبان بسیار سریع‌تر از پیش‌بینی‌ها بوده است.",
    "items": [
     {
      "value": 74,
      "suffix": "٪",
      "label": "رشد تماشای ویدیوهای کوتاه عمودی",
      "color": "accent"
     },
     {
      "value": 3.4,
      "suffix": " برابر",
      "label": "افزایش ماندگاری با موشن‌گرافیک دقیق",
      "color": "good"
     },
     {
      "value": 18,
      "suffix": " ثانیه",
      "label": "میانگین زمان تصمیم مخاطب در شروع ویدیو",
      "color": "danger"
     }
    ],
    "source": "مرکز پژوهش رسانه‌های دیجیتال · ۱۴۰۴"
   }
  }
 },
 {
  "name": "vocabulary_card",
  "js": "../templates/vocabulary_card/template.js",
  "schema": {
   "name": "vocabulary_card",
   "aliases": [
    "vocabulary",
    "واژه‌آموزی",
    "کارت-لغت"
   ],
   "order": 36,
   "category": "آموزشی و توضیحی (Education)",
   "label": "کارت واژگان و تلفظ (Vocabulary + IPA)",
   "description": "آموزش واژه با تلفظ آوانگاری IPA، نقش دستوری، معنای فارسی و جملهٔ مثال در سه فرمت",
   "fields": [
    {
     "key": "eyebrow",
     "label": "برچسب درس (Eyebrow)",
     "type": "text",
     "editable": true
    },
    {
     "key": "word",
     "label": "واژه (Word)",
     "type": "text",
     "editable": true
    },
    {
     "key": "ipa",
     "label": "تلفظ آوانگاری (IPA)",
     "type": "text",
     "editable": true
    },
    {
     "key": "pos",
     "label": "نقش دستوری (Part of Speech)",
     "type": "text",
     "editable": true
    },
    {
     "key": "meaning",
     "label": "معنی فارسی (Meaning)",
     "type": "textarea",
     "editable": true
    },
    {
     "key": "example_sentence",
     "label": "جملهٔ مثال (Example)",
     "type": "textarea",
     "editable": true
    }
   ],
   "example": {
    "eyebrow": "واژگان تخصصی رسانه",
    "word": "Heuristic",
    "ipa": "/hjʊəˈrɪs.tɪk/",
    "pos": "اسم / صفت · Noun",
    "meaning": "قاعدهٔ سرانگشتی یا میان‌بر ذهنی برای *تصمیم‌گیری سریع* در شرایط پیچیده",
    "example_sentence": "مغز انسان برای صرفه‌جویی در انرژی، اغلب از __میان‌برهای ذهنی__ استفاده می‌کند."
   }
  }
 },
 {
  "name": "flashcard_flip",
  "js": "../templates/flashcard_flip/template.js",
  "schema": {
   "name": "flashcard_flip",
   "aliases": [
    "flashcard",
    "فلش‌کارت",
    "کارت-حافظه"
   ],
   "order": 37,
   "category": "آموزشی و توضیحی (Education)",
   "label": "فلش‌کارت آموزشی (Flashcard Flip)",
   "description": "کارت پرسش و پاسخ با نوار زمان و چرخش قطعی روی زمان‌بندی برای نمایش پاسخ صحیح",
   "fields": [
    {
     "key": "eyebrow",
     "label": "موضوع درس (Eyebrow)",
     "type": "text",
     "editable": true
    },
    {
     "key": "front",
     "label": "روی کارت / پرسش (Front)",
     "type": "textarea",
     "editable": true
    },
    {
     "key": "back",
     "label": "پشت کارت / پاسخ (Back)",
     "type": "textarea",
     "editable": true
    },
    {
     "key": "hint",
     "label": "نکتهٔ تکمیلی (Hint)",
     "type": "text",
     "editable": true
    },
    {
     "key": "flip_at",
     "label": "زمان چرخش به پاسخ (ثانیه)",
     "type": "number",
     "default": 2.4
    }
   ],
   "example": {
    "eyebrow": "مرور سریع · فلش‌کارت",
    "front": "تفاوت اصلی *خطای شناختی* با *اشتباه محاسباتی* چیست؟",
    "back": "خطای شناختی یک ==الگوی تکرارشونده و سیستماتیک== در قضاوت است، نه یک اشتباه تصادفی.",
    "hint": "کانمن و تورسکی، ۱۹۷۴",
    "flip_at": 2.4
   }
  }
 },
 {
  "name": "list_countdown",
  "js": "../templates/list_countdown/template.js",
  "schema": {
   "name": "list_countdown",
   "aliases": [
    "countdown-list",
    "شمارش-معکوس-فهرست",
    "فهرست-برترین"
   ],
   "order": 38,
   "category": "شبکه‌های اجتماعی و شورتس (Social & Shorts)",
   "label": "فهرست شمارش معکوس (List Countdown)",
   "description": "فهرست رتبه‌بندی پرانرژی (از ۵ تا ۱ یا ۳ تا ۱) ویژه شورتس، ریلز و معرفی نکات کلیدی",
   "fields": [
    {
     "key": "eyebrow",
     "label": "برچسب بالا (Eyebrow)",
     "type": "text",
     "editable": true
    },
    {
     "key": "title",
     "label": "تیتر اصلی (Title)",
     "type": "text",
     "editable": true
    },
    {
     "key": "items",
     "label": "موارد فهرست (هر خط یک مورد)",
     "type": "list"
    },
    {
     "key": "cta",
     "label": "جمع‌بندی کوتاه پایین (Footer Note)",
     "type": "text",
     "editable": true
    }
   ],
   "example": {
    "eyebrow": "۳ قانون طلایی تدوین",
    "title": "چرا ویدیوهای *۳ ثانیه اول* برنده می‌شوند؟",
    "items": [
     "شروع مستقیم با پرسش یا عدد تکان‌دهنده، بدون مقدمهٔ طولانی",
     "ریتم منظم حرکت متن هم‌زمان با تاکیدهای صدای گوینده",
     "کادر تمیز با کنتراست بالا برای خوانایی روی موبایل"
    ],
    "cta": "کدام مورد را بیشتر رعایت می‌کنید؟"
   }
  }
 },
 {
  "name": "comment_reply",
  "js": "../templates/comment_reply/template.js",
  "schema": {
   "name": "comment_reply",
   "aliases": [
    "comment-reply",
    "پاسخ-کامنت",
    "دیدگاه-مخاطب"
   ],
   "order": 39,
   "category": "شبکه‌های اجتماعی و شورتس (Social & Shorts)",
   "label": "کارت پاسخ به کامنت (Comment Reply)",
   "description": "نمایش دیدگاه مخاطب و پاسخ کانال برای ویدیوهای کوتاه و شورتس با شمارشگر لایک",
   "fields": [
    {
     "key": "username",
     "label": "نام کاربر (Username)",
     "type": "text",
     "editable": true
    },
    {
     "key": "comment",
     "label": "متن دیدگاه مخاطب (Comment)",
     "type": "textarea",
     "editable": true
    },
    {
     "key": "reply_author",
     "label": "نام پاسخ‌دهنده (Channel)",
     "type": "text",
     "editable": true
    },
    {
     "key": "reply",
     "label": "پاسخ شما (Reply)",
     "type": "textarea",
     "editable": true
    },
    {
     "key": "likes",
     "label": "تعداد لایک (Likes)",
     "type": "number",
     "default": 420
    }
   ],
   "example": {
    "username": "@sara_media",
    "comment": "آیا برای ساخت انیمیشن‌های دقیق فارسی حتماً باید از افترافکت استفاده کنیم؟",
    "reply_author": "خرده‌گیر استودیو",
    "reply": "خیر! با ==موتور حرکت آفلاین== و تایپوگرافی ایمن فارسی، همه‌چیز با یک فایل `video.yaml` ساخته می‌شود.",
    "likes": 1280
   }
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
  "name": "guest_card",
  "js": "../templates/guest_card/template.js",
  "schema": {
   "name": "guest_card",
   "aliases": [
    "guest-card",
    "معرفی-مهمان-کارت",
    "کارت-مهمان"
   ],
   "order": 40,
   "category": "پادکست و گفتگو (Podcast & Talk)",
   "label": "کارت معرفی مهمان (Guest Card)",
   "description": "کارت معرفی مهمان پادکست یا گفتگوی زنده با عکس/آواتار، سمت، سوابق و نوار تأکید متحرک",
   "fields": [
    {
     "key": "eyebrow",
     "label": "برچسب قسمت (Episode Tag)",
     "type": "text",
     "editable": true
    },
    {
     "key": "name",
     "label": "نام مهمان (Guest Name)",
     "type": "text",
     "editable": true
    },
    {
     "key": "role",
     "label": "سمت / تخصص (Role)",
     "type": "text",
     "editable": true
    },
    {
     "key": "bio",
     "label": "معرفی کوتاه (Bio)",
     "type": "textarea",
     "editable": true
    },
    {
     "key": "credentials",
     "label": "سوابق کلیدی (هر خط یک مورد)",
     "type": "list"
    },
    {
     "key": "avatar",
     "label": "تصویر مهمان (اختیاری)",
     "type": "image"
    }
   ],
   "example": {
    "eyebrow": "مهمان قسمت ۴۲",
    "name": "دکتر *آرش کاظمی*",
    "role": "پژوهشگر اقتصاد رفتاری و طراحی سیاست عمومی",
    "bio": "نویسندهٔ سه کتاب دربارهٔ تصمیم‌گیری جمعی و مدرس تحلیل داده در رسانه‌های مستقل.",
    "credentials": [
     "دکتری اقتصاد رفتاری و نظریه بازی‌ها",
     "مدیر آزمایشگاه تحلیل رسانه‌های دیجیتال",
     "مشاور ارشد مستندهای داده‌محور"
    ]
   }
  }
 },
 {
  "name": "chapter_card",
  "js": "../templates/chapter_card/template.js",
  "schema": {
   "name": "chapter_card",
   "aliases": [
    "chapter-card",
    "کارت-فصل",
    "بخش-پادکست"
   ],
   "order": 41,
   "category": "پادکست و گفتگو (Podcast & Talk)",
   "label": "کارت فصل و بخش‌بندی (Chapter Card)",
   "description": "بازکنندهٔ تمیز هر فصل از پادکست یا مستند با شماره فصل بزرگ، رسم خط هندسی و زمان بخش",
   "fields": [
    {
     "key": "number",
     "label": "شماره فصل (Chapter #)",
     "type": "text",
     "editable": true
    },
    {
     "key": "title",
     "label": "عنوان فصل (Chapter Title)",
     "type": "text",
     "editable": true
    },
    {
     "key": "subtitle",
     "label": "توضیح کوتاه (Subtitle)",
     "type": "textarea",
     "editable": true
    },
    {
     "key": "timestamp",
     "label": "زمان شروع / مدت (Timestamp)",
     "type": "text",
     "editable": true
    }
   ],
   "example": {
    "number": "۰۳",
    "title": "چرا *انگیزه‌های پنهان* همه‌چیز را عوض می‌کنند؟",
    "subtitle": "نگاهی به سه آزمایش واقعی در اقتصاد رفتاری و سیاست‌گذاری عمومی",
    "timestamp": "۱۲:۴۰ — بخش سوم"
   }
  }
 },
 {
  "name": "bar_race",
  "js": "../templates/bar_race/template.js",
  "schema": {
   "name": "bar_race",
   "aliases": [
    "bar-race",
    "مسابقه-میله",
    "نمودار-مسابقه‌ای"
   ],
   "order": 42,
   "category": "داده و نمودار (Data & Charts)",
   "label": "نمودار مسابقه میله‌ای (Bar Race)",
   "description": "رقابت پویا و کاملاً قطعی میله‌ها در طول زمان با جابه‌جایی روان رتبه و شمارشگر دوره",
   "fields": [
    {
     "key": "eyebrow",
     "label": "برچسب بالا (Eyebrow)",
     "type": "text",
     "editable": true
    },
    {
     "key": "title",
     "label": "عنوان نمودار (Title)",
     "type": "text",
     "editable": true
    },
    {
     "key": "suffix",
     "label": "واحد / پسوند (Unit)",
     "type": "text",
     "editable": true
    },
    {
     "key": "frames",
     "label": "دوره‌های زمانی (JSON)",
     "type": "series"
    },
    {
     "key": "source",
     "label": "منبع (Source)",
     "type": "text"
    }
   ],
   "example": {
    "eyebrow": "روند پنج‌ساله",
    "title": "مسابقه رشد *سهم پلتفرم‌های ویدیویی*",
    "suffix": " میلیون",
    "frames": [
     {
      "period": "۱۳۹۹",
      "values": {
       "یوتیوب": 48,
       "اینستاگرام": 42,
       "آپارات": 28,
       "تیک‌تاک": 18,
       "تلگرام": 34
      }
     },
     {
      "period": "۱۴۰۱",
      "values": {
       "یوتیوب": 68,
       "اینستاگرام": 64,
       "آپارات": 39,
       "تیک‌تاک": 54,
       "تلگرام": 45
      }
     },
     {
      "period": "۱۴۰۳",
      "values": {
       "یوتیوب": 92,
       "اینستاگرام": 81,
       "آپارات": 48,
       "تیک‌تاک": 88,
       "تلگرام": 58
      }
     }
    ],
    "source": "گزارش تحلیلی استودیو · ۱۴۰۴"
   }
  }
 },
 {
  "name": "donut_chart",
  "js": "../templates/donut_chart/template.js",
  "schema": {
   "name": "donut_chart",
   "aliases": [
    "donut",
    "pie-chart",
    "نمودار-دونات",
    "نمودار-دایره‌ای"
   ],
   "order": 43,
   "category": "داده و نمودار (Data & Charts)",
   "label": "نمودار دونات و دایره‌ای (Donut / Pie)",
   "description": "نمایش سهم‌بندی درصدی با رسم حلقه‌های SVG، شمارشگر عدد میانی و کارت‌های راهنما در سه فرمت",
   "fields": [
    {
     "key": "eyebrow",
     "label": "برچسب بالا (Eyebrow)",
     "type": "text",
     "editable": true
    },
    {
     "key": "title",
     "label": "عنوان نمودار (Title)",
     "type": "text",
     "editable": true
    },
    {
     "key": "center_label",
     "label": "برچسب مرکز حلقه (Center Label)",
     "type": "text",
     "editable": true
    },
    {
     "key": "suffix",
     "label": "پسوند عدد مرکز (Suffix)",
     "type": "text",
     "editable": true
    },
    {
     "key": "data",
     "label": "بخش‌ها (برچسب، مقدار، رنگ)",
     "type": "table",
     "columns": [
      [
       "label",
       "عنوان"
      ],
      [
       "value",
       "مقدار"
      ],
      [
       "color",
       "رنگ"
      ]
     ]
    },
    {
     "key": "pie",
     "label": "حالت دایره کامل (Pie)",
     "type": "boolean"
    }
   ],
   "example": {
    "eyebrow": "ترکیب بودجه تولید",
    "title": "سهم هر بخش در *ساخت یک ویدیوی تحلیلی*",
    "center_label": "کل زمان",
    "suffix": " ساعت",
    "data": [
     {
      "label": "پژوهش و راستی‌آزمایی",
      "value": 42,
      "color": "accent"
     },
     {
      "label": "نگارش فیلمنامه",
      "value": 24,
      "color": "#38BDF8"
     },
     {
      "label": "موشن‌گرافیک و تدوین",
      "value": 22,
      "color": "good"
     },
     {
      "label": "صداگذاری و میکس",
      "value": 12,
      "color": "danger"
     }
    ],
    "pie": false
   }
  }
 },
 {
  "name": "map_choropleth",
  "js": "../templates/map_choropleth/template.js",
  "schema": {
   "name": "map_choropleth",
   "aliases": [
    "choropleth",
    "نقشه-آماری",
    "نقشه-پراکندگی"
   ],
   "order": 44,
   "category": "داده و نمودار (Data & Charts)",
   "label": "نقشه آماری آفلاین (Map Choropleth)",
   "description": "نقشهٔ برداری کاملاً آفلاین با رنگ‌بندی شدت داده‌ها بر اساس مناطق، پین‌های متحرک و پشتیبانی از دوربین نقشه",
   "fields": [
    {
     "key": "eyebrow",
     "label": "برچسب بالا (Eyebrow)",
     "type": "text",
     "editable": true
    },
    {
     "key": "title",
     "label": "تیتر نقشه (Title)",
     "type": "text",
     "editable": true
    },
    {
     "key": "caption",
     "label": "توضیح پایین نقشه (Caption)",
     "type": "text",
     "editable": true
    },
    {
     "key": "suffix",
     "label": "پسوند اعداد (Suffix)",
     "type": "text",
     "editable": true
    },
    {
     "key": "regions",
     "label": "مقادیر مناطق (JSON)",
     "type": "series"
    },
    {
     "key": "color",
     "label": "رنگ شاخص",
     "type": "select",
     "options": [
      "accent",
      "danger",
      "good",
      "#38BDF8"
     ]
    }
   ],
   "example": {
    "eyebrow": "نمای جغرافیایی داده",
    "title": "شاخص *رشد تولید محتوای مستقل* در مناطق جهان",
    "caption": "مناطق پررنگ‌تر سهم رشد بالاتری در سال گذشته ثبت کرده‌اند.",
    "suffix": "٪",
    "color": "accent",
    "regions": {
     "middle_east": {
      "label": "خاورمیانه",
      "value": 84
     },
     "europe": {
      "label": "اروپا",
      "value": 68
     },
     "asia": {
      "label": "آسیا",
      "value": 92
     },
     "north_america": {
      "label": "آمریکای شمالی",
      "value": 76
     }
    }
   }
  }
 },
 {
  "name": "polaroid_wall",
  "js": "../templates/polaroid_wall/template.js",
  "schema": {
   "name": "polaroid_wall",
   "aliases": [
    "polaroid",
    "دیوار-عکس",
    "پولاروید"
   ],
   "order": 45,
   "category": "روایی و تحریریه (Story & Editorial)",
   "label": "دیوار عکس پولاروید (Polaroid Wall)",
   "description": "نمایش ۳ قاب عکس پولاروید با چسب کاغذی، زاویهٔ چرخش قطعی، زیرنویس و عمق پارالاکس",
   "fields": [
    {
     "key": "eyebrow",
     "label": "برچسب آرشیو (Eyebrow)",
     "type": "text",
     "editable": true
    },
    {
     "key": "title",
     "label": "تیتر روایت (Title)",
     "type": "text",
     "editable": true
    },
    {
     "key": "caption1",
     "label": "زیرنویس عکس ۱",
     "type": "text",
     "editable": true
    },
    {
     "key": "caption2",
     "label": "زیرنویس عکس ۲",
     "type": "text",
     "editable": true
    },
    {
     "key": "caption3",
     "label": "زیرنویس عکس ۳",
     "type": "text",
     "editable": true
    },
    {
     "key": "photo1",
     "label": "عکس ۱",
     "type": "image"
    },
    {
     "key": "photo2",
     "label": "عکس ۲",
     "type": "image"
    },
    {
     "key": "photo3",
     "label": "عکس ۳",
     "type": "image"
    }
   ],
   "example": {
    "eyebrow": "آرشیو مستند",
    "title": "سه قاب که *روند تغییر شهر* را ثبت کرد",
    "caption1": "آزمایشگاه اقتصادی · ۱۳۷۸",
    "caption2": "استودیو ضبط مستقل · ۱۳۹۶",
    "caption3": "نقشهٔ ارتباطات امروز · ۱۴۰۴",
    "photo1": "/assets/economic-lab.jpg",
    "photo2": "/assets/podcast-studio-mic.jpg",
    "photo3": "/assets/vintage-globe.jpg"
   }
  }
 },
 {
  "name": "mascot_pip",
  "js": "../templates/mascot_pip/template.js",
  "schema": {
   "name": "mascot_pip",
   "aliases": [
    "mascot-pip",
    "عروسک-تصویر-در-تصویر",
    "مجری-گوشه"
   ],
   "order": 46,
   "category": "عروسک و مجری (Puppet & Mascot)",
   "label": "اسلاید + عروسک تصویر در تصویر (Mascot PiP)",
   "description": "اسلاید تحلیلی کامل همراه با قاب تصویر در تصویر عروسک عقاب قرمز (یا ۵ شخصیت) همگام با صدا و لحن",
   "fields": [
    {
     "key": "eyebrow",
     "label": "برچسب بالا (Eyebrow)",
     "type": "text",
     "editable": true
    },
    {
     "key": "title",
     "label": "تیتر اسلاید (Title)",
     "type": "text",
     "editable": true
    },
    {
     "key": "body",
     "label": "توضیح اصلی (Body)",
     "type": "textarea",
     "editable": true
    },
    {
     "key": "bullets",
     "label": "نکات کلیدی (هر خط یک مورد)",
     "type": "list"
    },
    {
     "key": "pip_corner",
     "label": "گوشهٔ قاب عروسک",
     "type": "select",
     "options": [
      "bottom-left",
      "bottom-right",
      "top-left",
      "top-right"
     ]
    },
    {
     "key": "expression",
     "label": "حالت چهره عروسک",
     "type": "select",
     "options": [
      "neutral",
      "happy",
      "smug",
      "shocked",
      "annoyed",
      "thinking",
      "excited"
     ]
    },
    {
     "key": "say",
     "label": "متن گفتار عروسک (Say)",
     "type": "textarea",
     "editable": true
    }
   ],
   "example": {
    "eyebrow": "توضیح زنده با مجری",
    "title": "چگونه *طراحی حرکت* پیام ویدیو را شفاف می‌کند؟",
    "body": "وقتی عروسک در گوشهٔ تصویر با ریتم صدای شما واکنش نشان می‌دهد، مخاطب هم اسلاید را می‌خواند و هم ارتباط عاطفی می‌گیرد.",
    "bullets": [
     "واکنش زندهٔ ابرو، سر و منقار به لحن صدا",
     "قاب تصویر در تصویر قابل جابه‌جایی در ۴ گوشه",
     "سازگار با سه فرمت افقی، عمودی و مربعی"
    ],
    "pip_corner": "bottom-left",
    "expression": "happy",
    "say": "وقتی عروسک کنار اسلاید توضیح می‌دهد، مخاطب تا آخر ویدیو همراه می‌ماند."
   }
  }
 },
 {
  "name": "flowchart",
  "js": "../templates/flowchart/template.js",
  "schema": {
   "name": "flowchart",
   "aliases": [
    "process-flow",
    "فلوچارت",
    "دیاگرام-فرآیند"
   ],
   "order": 47,
   "category": "دیاگرام و نقشه مفهومی (Diagrams)",
   "label": "فلوچارت و دیاگرام فرآیند (Flowchart)",
   "description": "دیاگرام گام‌به‌گام با کارت‌های متصل و فلش‌های متحرک SVG که هنگام توضیح یکی‌یکی ظاهر می‌شوند",
   "fields": [
    {
     "key": "eyebrow",
     "label": "برچسب بالا (Eyebrow)",
     "type": "text",
     "editable": true
    },
    {
     "key": "title",
     "label": "عنوان دیاگرام (Title)",
     "type": "text",
     "required": true,
     "editable": true
    },
    {
     "key": "nodes",
     "label": "مراحل فلوچارت (هر خط: عنوان | توضیح کوتاه)",
     "type": "list",
     "editable": true
    },
    {
     "key": "conclusion",
     "label": "نتیجه نهایی (Outcome)",
     "type": "text",
     "editable": true
    }
   ],
   "example": {
    "eyebrow": "معماری تصمیم‌گیری",
    "title": "مسیر تبدیل یک ایده خام به *ویدیوی حرفه‌ای*",
    "nodes": [
     "پژوهش و یادداشت | جمع‌آوری داده‌ها و منابع معتبر",
     "ساختار روایت | چیدن قلاب، تنه اصلی و جمع‌بندی",
     "طراحی صحنه | انتخاب قالب، دیاگرام و سرعت آرام",
     "تدوین و صدا | همگام‌سازی گام‌به‌گام با لحن گوینده"
    ],
    "conclusion": "خروجی نهایی: روایت شفاف، آرام و ماندگار در ذهن مخاطب"
   }
  }
 },
 {
  "name": "funnel_diagram",
  "js": "../templates/funnel_diagram/template.js",
  "schema": {
   "name": "funnel_diagram",
   "aliases": [
    "funnel",
    "قیف-تبدیل",
    "قیف"
   ],
   "order": 48,
   "category": "دیاگرام و نقشه مفهومی (Diagrams)",
   "label": "قیف مراحل و تبدیل (Funnel Diagram)",
   "description": "قیف لایه‌لایه با درصد و توضیح که از بالا به پایین یکی‌یکی باز می‌شود",
   "fields": [
    {
     "key": "eyebrow",
     "label": "برچسب بالا (Eyebrow)",
     "type": "text",
     "editable": true
    },
    {
     "key": "title",
     "label": "عنوان (Title)",
     "type": "text",
     "required": true,
     "editable": true
    },
    {
     "key": "stages",
     "label": "لایه‌های قیف (هر خط: عنوان | مقدار | توضیح)",
     "type": "list",
     "editable": true
    }
   ],
   "example": {
    "eyebrow": "تحلیل مسیر مخاطب",
    "title": "از *بازدید اول* تا مخاطب وفادار",
    "stages": [
     "بازدیدکنندگان صفحه | ۱۰۰٪ | آشنایی اولیه با عنوان و کاور",
     "تماشای ۳۰ ثانیه اول | ۶۴٪ | عبور از قلاب ابتدایی ویدیو",
     "تماشای تا پایان | ۳۸٪ | درگیر شدن با روایت گام‌به‌گام",
     "عضویت و بازگشت | ۱۴٪ | تبدیل شدن به دنبال‌کننده دائمی"
    ]
   }
  }
 },
 {
  "name": "mind_map",
  "js": "../templates/mind_map/template.js",
  "schema": {
   "name": "mind_map",
   "aliases": [
    "mindmap",
    "نقشه-ذهنی",
    "درخت-مفهومی"
   ],
   "order": 49,
   "category": "دیاگرام و نقشه مفهومی (Diagrams)",
   "label": "نقشه ذهنی (Mind Map)",
   "description": "هسته مرکزی با شاخه‌های منحنی SVG و کارت‌های مفهومی که گام‌به‌گام اطراف موضوع اصلی باز می‌شوند",
   "fields": [
    {
     "key": "eyebrow",
     "label": "برچسب بالا (Eyebrow)",
     "type": "text",
     "editable": true
    },
    {
     "key": "center",
     "label": "مفهوم مرکزی (Center Hub)",
     "type": "text",
     "required": true,
     "editable": true
    },
    {
     "key": "branches",
     "label": "شاخه‌ها (هر خط: عنوان شاخه | زیرتوضیح)",
     "type": "list",
     "editable": true
    }
   ],
   "example": {
    "eyebrow": "نقشه مفهومی",
    "center": "تولید محتوای ماندگار",
    "branches": [
     "پژوهش عمیق | داده و مثال واقعی",
     "ریتم آرام | فرصت فهم برای بیننده",
     "بصری‌سازی | دیاگرام به‌جای دیوار متن",
     "صدای شفاف | لحن طبیعی و پرانرژی"
    ]
   }
  }
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
  "name": "venn_diagram",
  "js": "../templates/venn_diagram/template.js",
  "schema": {
   "name": "venn_diagram",
   "aliases": [
    "venn",
    "دیاگرام-ون",
    "نقطه-اشتراک"
   ],
   "order": 50,
   "category": "دیاگرام و نقشه مفهومی (Diagrams)",
   "label": "دیاگرام ون و نقطه اشتراک (Venn Diagram)",
   "description": "نمایش هم‌پوشانی دو یا سه مفهوم کلیدی و برجسته‌سازی نقطه اشتراک به صورت گام‌به‌گام",
   "fields": [
    {
     "key": "eyebrow",
     "label": "برچسب بالا (Eyebrow)",
     "type": "text",
     "editable": true
    },
    {
     "key": "title",
     "label": "عنوان (Title)",
     "type": "text",
     "required": true,
     "editable": true
    },
    {
     "key": "circle_a",
     "label": "دایره اول (عنوان | توضیح)",
     "type": "text",
     "editable": true
    },
    {
     "key": "circle_b",
     "label": "دایره دوم (عنوان | توضیح)",
     "type": "text",
     "editable": true
    },
    {
     "key": "circle_c",
     "label": "دایره سوم اختیاری (عنوان | توضیح)",
     "type": "text",
     "editable": true
    },
    {
     "key": "overlap",
     "label": "نقطه اشتراک مرکزی (Intersection)",
     "type": "text",
     "editable": true
    }
   ],
   "example": {
    "eyebrow": "هم‌پوشانی مهارت‌ها",
    "title": "نقطه طلایی *روایت بصری موفق*",
    "circle_a": "داده و منطق | استدلال دقیق و مستند",
    "circle_b": "داستان و احساس | درگیری ذهنی مخاطب",
    "circle_c": "طراحی و ریتم | گرافیک تمیز و سرعت آرام",
    "overlap": "تأثیر ماندگار"
   }
  }
 },
 {
  "name": "pyramid_hierarchy",
  "js": "../templates/pyramid_hierarchy/template.js",
  "schema": {
   "name": "pyramid_hierarchy",
   "aliases": [
    "pyramid",
    "هرم",
    "هرم-اولویت"
   ],
   "order": 51,
   "category": "دیاگرام و نقشه مفهومی (Diagrams)",
   "label": "هرم سطوح و اولویت (Pyramid Hierarchy)",
   "description": "هرم طبقاتی با نمایش گام‌به‌گام از پایه به قله به همراه توضیح هر طبقه",
   "fields": [
    {
     "key": "eyebrow",
     "label": "برچسب بالا (Eyebrow)",
     "type": "text",
     "editable": true
    },
    {
     "key": "title",
     "label": "عنوان هرم (Title)",
     "type": "text",
     "required": true,
     "editable": true
    },
    {
     "key": "tiers",
     "label": "طبقات هرم از قله به پایه (هر خط: عنوان | توضیح)",
     "type": "list",
     "editable": true
    }
   ],
   "example": {
    "eyebrow": "مدل اولویت‌بندی",
    "title": "هرم *تسلط عمیق* در یادگیری",
    "tiers": [
     "آموزش به دیگران | بالاترین سطح درک و تثبیت",
     "ساخت پروژه واقعی | تمرین عملی در دنیای واقعی",
     "تمرین فعال و آزمون | بازیابی اطلاعات از حافظه",
     "مطالعه و شنیدن | پایهٔ اولیه دریافت مفاهیم"
    ]
   }
  }
 },
 {
  "name": "cycle_diagram",
  "js": "../templates/cycle_diagram/template.js",
  "schema": {
   "name": "cycle_diagram",
   "aliases": [
    "cycle",
    "feedback-loop",
    "چرخه",
    "حلقه-بازخورد"
   ],
   "order": 52,
   "category": "دیاگرام و نقشه مفهومی (Diagrams)",
   "label": "چرخه و حلقه بازخورد (Cycle Diagram)",
   "description": "چرخه دایره‌ای با کمان‌های SVG و مراحل شماره‌دار که به‌نوبت یکی‌یکی روشن و توضیح داده می‌شوند",
   "fields": [
    {
     "key": "eyebrow",
     "label": "برچسب بالا (Eyebrow)",
     "type": "text",
     "editable": true
    },
    {
     "key": "title",
     "label": "عنوان چرخه (Title)",
     "type": "text",
     "required": true,
     "editable": true
    },
    {
     "key": "center_label",
     "label": "برچسب مرکز حلقه (Center)",
     "type": "text",
     "editable": true
    },
    {
     "key": "steps",
     "label": "مراحل چرخه (هر خط: عنوان | توضیح کوتاه)",
     "type": "list",
     "editable": true
    }
   ],
   "example": {
    "eyebrow": "حلقه رشد مداوم",
    "title": "چرخه *عادت‌های پایدار*",
    "center_label": "چرخه عادت",
    "steps": [
     "نشانه (Cue) | محرک شروع رفتار در محیط",
     "اشتیاق (Craving) | انگیزه ذهنی برای تغییر حس",
     "پاسخ (Response) | انجام دادن عمل واقعی",
     "پاداش (Reward) | تثبیت رفتار در مغز"
    ]
   }
  }
 },
 {
  "name": "passage_highlight",
  "js": "../templates/passage_highlight/template.js",
  "schema": {
   "name": "passage_highlight",
   "aliases": [
    "passage",
    "annotated-passage",
    "متن-تحلیلی",
    "هایلایت-متن"
   ],
   "order": 53,
   "category": "متن، مقاله و آموزش (Passages & Reading)",
   "label": "متن و هایلایت جمله‌به‌جمله (Passage Highlight)",
   "description": "نمایش یک پاراگراف یا بریده مقاله که جملات کلیدی آن یکی‌یکی با ماژیک هایلایت و یادداشت حاشیه توضیح داده می‌شوند",
   "fields": [
    {
     "key": "eyebrow",
     "label": "برچسب منبع یا فصل (Eyebrow)",
     "type": "text",
     "editable": true
    },
    {
     "key": "title",
     "label": "تیتر متن (Title)",
     "type": "text",
     "editable": true
    },
    {
     "key": "sentences",
     "label": "جملات متن (هر خط یک جمله؛ برای هایلایت با ! شروع کنید)",
     "type": "list",
     "editable": true
    },
    {
     "key": "takeaway",
     "label": "یادداشت تحلیلی حاشیه (Margin Note)",
     "type": "textarea",
     "editable": true
    },
    {
     "key": "citation",
     "label": "مرجع و سال (Citation)",
     "type": "text",
     "editable": true
    }
   ],
   "example": {
    "eyebrow": "تحلیل متن · مطالعه موردی",
    "title": "چرا *ریتم آرام* درک مخاطب را دو برابر می‌کند؟",
    "sentences": [
     "بسیاری از ویدیوهای امروزی تمام اطلاعات را در یک ثانیه روی صفحه می‌ریزند.",
     "!وقتی هر نکته هم‌زمان با کلام گوینده و به‌آرامی ظاهر می‌شود، مغز فرصت پردازش پیدا می‌کند.",
     "نتیجه این رویکرد، کاهش خستگی چشم و افزایش چشمگیر ماندگاری پیام است."
    ],
    "takeaway": "نکته تدوین: بین هر مورد تازه حداقل ۰.۸ تا ۱.۲ ثانیه فضای تنفس بگذارید.",
    "citation": "پژوهش شناختی رسانه · فصل ۴"
   }
  }
 },
 {
  "name": "convey_english",
  "js": "../templates/convey_english/template.js",
  "schema": {
   "name": "convey_english",
   "aliases": [
    "english-expression",
    "english-passage",
    "آموزش-انگلیسی",
    "عبارت-انگلیسی"
   ],
   "order": 54,
   "category": "متن، مقاله و آموزش (Passages & Reading)",
   "label": "آموزش عبارت و مفهوم انگلیسی (Convey English)",
   "description": "قالب تخصصی آموزش زبان و ترجمه مفهومی انگلیسی به فارسی: جمله انگلیسی + آوانگاری + ترجمه طبیعی + نکات ظریف و مثال که گام‌به‌گام یکی‌یکی باز می‌شوند",
   "fields": [
    {
     "key": "eyebrow",
     "label": "برچسب درس (Lesson Tag)",
     "type": "text",
     "editable": true
    },
    {
     "key": "english",
     "label": "عبارت یا جمله انگلیسی (English Phrase)",
     "type": "textarea",
     "required": true,
     "editable": true
    },
    {
     "key": "ipa",
     "label": "تلفظ و تکیه (Pronunciation / IPA)",
     "type": "text",
     "editable": true
    },
    {
     "key": "natural_fa",
     "label": "معنای طبیعی و روان فارسی (Natural Meaning)",
     "type": "textarea",
     "editable": true
    },
    {
     "key": "literal_fa",
     "label": "ترجمه تحت‌اللفظی / ساختار (Literal Breakdown)",
     "type": "text",
     "editable": true
    },
    {
     "key": "nuances",
     "label": "نکات ظریف و کاربردی (هر خط یک نکته)",
     "type": "list",
     "editable": true
    },
    {
     "key": "example_en",
     "label": "مثال کاربردی انگلیسی (Example EN)",
     "type": "text",
     "editable": true
    },
    {
     "key": "example_fa",
     "label": "ترجمه مثال فارسی (Example FA)",
     "type": "text",
     "editable": true
    }
   ],
   "example": {
    "eyebrow": "English in Context · آموزش مفهومی",
    "english": "Read between the lines",
    "ipa": "/riːd bɪˈtwiːn ðə laɪnz/ · Stress on BETWEEN & LINES",
    "natural_fa": "درک منظور پنهانِ پشت کلمات؛ فهمیدن چیزی که مستقیم گفته نشده",
    "literal_fa": "تحت‌اللفظی: خواندنِ بینِ خطوط",
    "nuances": [
     "لحن طبیعی و پرکاربرد در مکالمه، مصاحبه و مقاله",
     "معمولاً وقتی استفاده می‌شود که گوینده حرف اصلی را غیرمستقیم زده است",
     "معادل فارسی نزدیک: «از لابه‌لای حرف‌ها فهمیدن»"
    ],
    "example_en": "He said the project was fine, but reading between the lines, he wasn't happy.",
    "example_fa": "گفت پروژه خوب است، اما از لابه‌لای حرف‌هایش معلوم بود راضی نیست."
   }
  }
 },
 {
  "name": "book_excerpt",
  "js": "../templates/book_excerpt/template.js",
  "schema": {
   "name": "book_excerpt",
   "aliases": [
    "book-page",
    "بریده-کتاب",
    "صفحه-کتاب"
   ],
   "order": 55,
   "category": "متن، مقاله و آموزش (Passages & Reading)",
   "label": "بریده کتاب و حاشیه‌نویسی (Book Excerpt)",
   "description": "نمایش صفحه‌ای از کتاب یا مقاله با خط‌کشی متحرک زیر نکته اصلی، شماره صفحه و خلاصه گوینده",
   "fields": [
    {
     "key": "book_title",
     "label": "نام کتاب (Book Title)",
     "type": "text",
     "editable": true
    },
    {
     "key": "chapter",
     "label": "فصل و صفحه (Chapter / Page)",
     "type": "text",
     "editable": true
    },
    {
     "key": "excerpt",
     "label": "متن بریده کتاب (Excerpt)",
     "type": "textarea",
     "required": true,
     "editable": true
    },
    {
     "key": "key_line",
     "label": "جمله کلیدی برجسته (Key Highlighted Line)",
     "type": "textarea",
     "editable": true
    },
    {
     "key": "author",
     "label": "نویسنده (Author)",
     "type": "text",
     "editable": true
    },
    {
     "key": "commentary",
     "label": "تحلیل کوتاه (Commentary)",
     "type": "textarea",
     "editable": true
    }
   ],
   "example": {
    "book_title": "تفکر، سریع و آهسته",
    "chapter": "فصل ۱ · صفحه ۲۸",
    "excerpt": "ذهن انسان دو سیستم دارد: سیستم اول سریع، خودکار و احساسی است؛ سیستم دوم کند، تحلیلی و نیازمند توجه آگاهانه است.",
    "key_line": "وقتی سرعت اطلاعات بیش از حد زیاد شود، سیستم دوم خاموش می‌شود و قضاوت سطحی جای آن را می‌گیرد.",
    "author": "دانیل کانمن",
    "commentary": "همین قانون در ویدیو هم صادق است: سرعت آرام، فکر مخاطب را بیدار نگه می‌دارد."
   }
  }
 },
 {
  "name": "pull_quote",
  "js": "../templates/pull_quote/template.js",
  "schema": {
   "name": "pull_quote",
   "aliases": [
    "editorial-quote",
    "نقل-قول-مجله‌ای",
    "جمله-ماندگار"
   ],
   "order": 56,
   "category": "متن، مقاله و آموزش (Passages & Reading)",
   "label": "نقل‌قول مجله‌ای و سینمایی (Editorial Pull-Quote)",
   "description": "نقل‌قول بزرگ تایپوگرافی با گیومه گرافیکی، ورود آرام کلمه‌به‌کلمه، نام گوینده و زمینه",
   "fields": [
    {
     "key": "eyebrow",
     "label": "برچسب بخش (Eyebrow)",
     "type": "text",
     "editable": true
    },
    {
     "key": "quote",
     "label": "متن نقل‌قول (Quote)",
     "type": "textarea",
     "required": true,
     "editable": true
    },
    {
     "key": "speaker",
     "label": "گوینده (Speaker)",
     "type": "text",
     "editable": true
    },
    {
     "key": "role",
     "label": "سمت یا منبع (Role / Source)",
     "type": "text",
     "editable": true
    }
   ],
   "example": {
    "eyebrow": "جمله کلیدی این فصل",
    "quote": "طراحی خوب یعنی حذف کردن هر چیز اضافی تا *تنها پیام اصلی* در آرامش نفس بکشد.",
    "speaker": "دیتر رامس",
    "role": "طراح صنعتی و نظریه‌پرداز طراحی"
   }
  }
 },
 {
  "name": "image_gallery",
  "js": "../templates/image_gallery/template.js",
  "schema": {
   "name": "image_gallery",
   "aliases": [
    "gallery",
    "photo-grid",
    "گالری-تصاویر",
    "چند-تصویر"
   ],
   "order": 57,
   "category": "تصویر و داستان‌سرایی بصری (Images & Visuals)",
   "label": "گالری تصاویر گام‌به‌گام (Image Gallery)",
   "description": "نمایش ۲ تا ۴ تصویر با زیرنویس اختصاصی که به‌آرامی یکی‌یکی روی صفحه ظاهر می‌شوند",
   "fields": [
    {
     "key": "eyebrow",
     "label": "برچسب بالا (Eyebrow)",
     "type": "text",
     "editable": true
    },
    {
     "key": "title",
     "label": "عنوان گالری (Title)",
     "type": "text",
     "editable": true
    },
    {
     "key": "photo1",
     "label": "تصویر ۱",
     "type": "image",
     "editable": true
    },
    {
     "key": "caption1",
     "label": "زیرنویس ۱",
     "type": "text",
     "editable": true
    },
    {
     "key": "photo2",
     "label": "تصویر ۲",
     "type": "image",
     "editable": true
    },
    {
     "key": "caption2",
     "label": "زیرنویس ۲",
     "type": "text",
     "editable": true
    },
    {
     "key": "photo3",
     "label": "تصویر ۳ (اختیاری)",
     "type": "image",
     "editable": true
    },
    {
     "key": "caption3",
     "label": "زیرنویس ۳",
     "type": "text",
     "editable": true
    },
    {
     "key": "photo4",
     "label": "تصویر ۴ (اختیاری)",
     "type": "image",
     "editable": true
    },
    {
     "key": "caption4",
     "label": "زیرنویس ۴",
     "type": "text",
     "editable": true
    }
   ],
   "example": {
    "eyebrow": "مستندات تصویری",
    "title": "سه زاویه مختلف از یک *پدیده واحد*",
    "photo1": "/assets/images/starter_article_archive_paper_1795696524701.jpg",
    "caption1": "۱. اسناد و آرشیو مطبوعاتی",
    "photo2": "/assets/images/starter_psychology_lab_desk_1795696526162.jpg",
    "caption2": "۲. مشاهدات آزمایشگاهی",
    "photo3": "/assets/images/starter_world_map_dark_1795696523627.jpg",
    "caption3": "۳. مقایسه در مقیاس جهانی"
   }
  }
 },
 {
  "name": "annotated_image",
  "js": "../templates/annotated_image/template.js",
  "schema": {
   "name": "annotated_image",
   "aliases": [
    "image-callouts",
    "تصویر-توضیحی",
    "نقاط-روی-تصویر"
   ],
   "order": 58,
   "category": "تصویر و داستان‌سرایی بصری (Images & Visuals)",
   "label": "تصویر با نقاط توضیحی (Annotated Image)",
   "description": "تصویر اصلی با پین‌های شماره‌دار و کارت‌های توضیحی که هنگام شرح دادن یکی‌یکی ظاهر و به نقطه مربوطه وصل می‌شوند",
   "fields": [
    {
     "key": "eyebrow",
     "label": "برچسب بالا (Eyebrow)",
     "type": "text",
     "editable": true
    },
    {
     "key": "title",
     "label": "عنوان (Title)",
     "type": "text",
     "editable": true
    },
    {
     "key": "image",
     "label": "تصویر اصلی (Hero Image)",
     "type": "image",
     "editable": true
    },
    {
     "key": "callouts",
     "label": "نقاط توضیحی (هر خط: x% ; y% ; عنوان ; توضیح)",
     "type": "list",
     "editable": true
    }
   ],
   "example": {
    "eyebrow": "کالبدشکافی بصری",
    "title": "سه جزئیات کلیدی که نباید *از قلم بیفتد*",
    "image": "/assets/images/starter_regional_map_topo_1795696523977.jpg",
    "callouts": [
     "30 ; 35 ; مسیر شمالی ; محور اصلی انتقال و ارتباط",
     "62 ; 52 ; هسته مرکزی ; بیشترین تمرکز داده و فعالیت",
     "45 ; 76 ; نقطه خروجی ; نتیجه نهایی در پایین نقشه"
    ]
   }
  }
 },
 {
  "name": "corkboard",
  "js": "../templates/corkboard/template.js",
  "schema": {
   "name": "corkboard",
   "aliases": [
    "evidence-board",
    "تخته-شواهد",
    "تخته-تحقیق"
   ],
   "order": 59,
   "category": "تصویر و داستان‌سرایی بصری (Images & Visuals)",
   "label": "تخته شواهد و نخ قرمز (Detective Corkboard)",
   "description": "تخته تحقیق مستند با کارت‌های سنجاق‌شده و نخ قرمز SVG که شواهد را گام‌به‌گام به هم وصل می‌کند",
   "fields": [
    {
     "key": "eyebrow",
     "label": "برچسب پرونده (Case Tag)",
     "type": "text",
     "editable": true
    },
    {
     "key": "title",
     "label": "عنوان پرونده (Title)",
     "type": "text",
     "required": true,
     "editable": true
    },
    {
     "key": "clues",
     "label": "شواهد و سرنخ‌ها (هر خط: عنوان سرنخ | توضیح)",
     "type": "list",
     "editable": true
    }
   ],
   "example": {
    "eyebrow": "پرونده پژوهشی · شواهد",
    "title": "چطور *چهار سرنخ پراکنده* یک ماجرا را فاش کردند؟",
    "clues": [
     "سرنخ ۱: گزارش مالی | جهش غیرعادی هزینه‌ها در سه‌ماهه سوم",
     "سرنخ ۲: ایمیل داخلی | هشدار تیم فنی دو هفته پیش از بحران",
     "سرنخ ۳: آمار کاربران | افت ۴۰ درصدی نرخ بازگشت در ماه بعد",
     "سرنخ ۴: نتیجه نهایی | تغییر کامل راهبرد محصول در سال جدید"
    ]
   }
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
  "name": "phone_mockup",
  "js": "../templates/phone_mockup/template.js",
  "schema": {
   "name": "phone_mockup",
   "aliases": [
    "mobile-showcase",
    "پیش‌نمایش-گوشی",
    "موبایل"
   ],
   "order": 60,
   "category": "تصویر و داستان‌سرایی بصری (Images & Visuals)",
   "label": "پیش‌نمایش موبایل و ویژگی‌ها (Phone Mockup)",
   "description": "قاب گوشی تمیز با تصویر صفحه اپلیکیشن یا وب‌سایت در کنار فهرست ویژگی‌ها که یکی‌یکی ظاهر می‌شوند",
   "fields": [
    {
     "key": "eyebrow",
     "label": "برچسب بالا (Eyebrow)",
     "type": "text",
     "editable": true
    },
    {
     "key": "title",
     "label": "عنوان معرفی (Title)",
     "type": "text",
     "required": true,
     "editable": true
    },
    {
     "key": "image",
     "label": "اسکرین‌شات گوشی (Screen Image)",
     "type": "image",
     "editable": true
    },
    {
     "key": "screen_label",
     "label": "عنوان بالای صفحه گوشی (App Header)",
     "type": "text",
     "editable": true
    },
    {
     "key": "features",
     "label": "ویژگی‌ها (هر خط: تیتر | توضیح کوتاه)",
     "type": "list",
     "editable": true
    }
   ],
   "example": {
    "eyebrow": "بررسی محصول و رابط کاربری",
    "title": "تجربه کاربری ساده در *سه قابلیت کلیدی*",
    "image": "/assets/images/starter_podcast_studio_mic_1795696526288.jpg",
    "screen_label": "اپلیکیشن استودیو",
    "features": [
     "پخش آرام و شفاف | همگام‌سازی کامل با صدای گوینده",
     "حالت شب استاندارد | خوانایی بالا در هر صفحه نمایش",
     "خروجی سه فرمت | آماده برای یوتیوب، شورتس و اینستاگرام"
    ]
   }
  }
 },
 {
  "name": "pros_cons",
  "js": "../templates/pros_cons/template.js",
  "schema": {
   "name": "pros_cons",
   "aliases": [
    "pros-and-cons",
    "مزایا-معایب",
    "نقاط-قوت-ضعف"
   ],
   "order": 61,
   "category": "مقایسه و فهرست (Compares & Lists)",
   "label": "مزایا در برابر معایب (Pros vs Cons)",
   "description": "مقایسه دو ستونه متعادل بین مزایا (سبز) و معایب (قرمز) که به‌نوبت یکی‌یکی ظاهر می‌شوند + جمع‌بندی نهایی",
   "fields": [
    {
     "key": "eyebrow",
     "label": "برچسب بالا (Eyebrow)",
     "type": "text",
     "editable": true
    },
    {
     "key": "title",
     "label": "عنوان مقایسه (Title)",
     "type": "text",
     "required": true,
     "editable": true
    },
    {
     "key": "pros_title",
     "label": "تیتر ستون مزایا",
     "type": "text",
     "editable": true
    },
    {
     "key": "pros",
     "label": "مزایا (هر خط یک مورد)",
     "type": "list",
     "editable": true
    },
    {
     "key": "cons_title",
     "label": "تیتر ستون معایب",
     "type": "text",
     "editable": true
    },
    {
     "key": "cons",
     "label": "معایب (هر خط یک مورد)",
     "type": "list",
     "editable": true
    },
    {
     "key": "verdict",
     "label": "جمع‌بندی نهایی (Verdict)",
     "type": "text",
     "editable": true
    }
   ],
   "example": {
    "eyebrow": "ارزیابی متعادل",
    "title": "مزایا و محدودیت‌های *کار از راه دور*",
    "pros_title": "نقاط قوت و مزایا",
    "pros": [
     "صرفه‌جویی در زمان رفت‌وآمد روزانه",
     "تمرکز عمیق‌تر بدون مزاحمت محیطی",
     "انعطاف‌پذیری در برنامه‌ریزی شخصی"
    ],
    "cons_title": "چالش‌ها و معایب",
    "cons": [
     "احتمال احساس انزوا در طول زمان",
     "سخت‌تر شدن مرز بین کار و استراحت",
     "نیاز به هماهنگی دقیق‌تر در تیم‌های بزرگ"
    ],
    "verdict": "جمع‌بندی: مدل ترکیبی (هیبرید) بهترین تعادل را میان آزادی و هم‌افزایی می‌سازد."
   }
  }
 },
 {
  "name": "matrix_2x2",
  "js": "../templates/matrix_2x2/template.js",
  "schema": {
   "name": "matrix_2x2",
   "aliases": [
    "quadrant",
    "eisenhower",
    "ماتریس-دو-در-دو",
    "ماتریس-تصمیم"
   ],
   "order": 62,
   "category": "مقایسه و فهرست (Compares & Lists)",
   "label": "ماتریس ۲×۲ تصمیم‌گیری (2×2 Matrix)",
   "description": "ماتریس چهارخانه با محورهای افقی و عمودی که چهار ربع آن یکی‌یکی برای تحلیل استراتژیک نمایش داده می‌شوند",
   "fields": [
    {
     "key": "eyebrow",
     "label": "برچسب بالا (Eyebrow)",
     "type": "text",
     "editable": true
    },
    {
     "key": "title",
     "label": "عنوان ماتریس (Title)",
     "type": "text",
     "required": true,
     "editable": true
    },
    {
     "key": "x_axis",
     "label": "عنوان محور افقی (X Axis)",
     "type": "text",
     "editable": true
    },
    {
     "key": "y_axis",
     "label": "عنوان محور عمودی (Y Axis)",
     "type": "text",
     "editable": true
    },
    {
     "key": "q1",
     "label": "ربع ۱ — بالا راست (عنوان | توضیح)",
     "type": "text",
     "editable": true
    },
    {
     "key": "q2",
     "label": "ربع ۲ — بالا چپ (عنوان | توضیح)",
     "type": "text",
     "editable": true
    },
    {
     "key": "q3",
     "label": "ربع ۳ — پایین راست (عنوان | توضیح)",
     "type": "text",
     "editable": true
    },
    {
     "key": "q4",
     "label": "ربع ۴ — پایین چپ (عنوان | توضیح)",
     "type": "text",
     "editable": true
    }
   ],
   "example": {
    "eyebrow": "ماتریس اولویت‌بندی آیزنهاور",
    "title": "تصمیم‌گیری هوشمند بر اساس *اهمیت و فوریت*",
    "x_axis": "فوریت ←",
    "y_axis": "اهمیت ↑",
    "q1": "فوراً انجام بده | مهم و فوری · اولویت مطلق امروز",
    "q2": "برنامه‌ریزی کن | مهم ولی غیرفوری · سرمایه‌گذاری بلندمدت",
    "q3": "واگذار کن | فوری ولی کم‌اهمیت · تفویض یا خودکارسازی",
    "q4": "حذف کن | نه مهم و نه فوری · حواس‌پرتی‌های روزانه"
   }
  }
 },
 {
  "name": "checklist_progressive",
  "js": "../templates/checklist_progressive/template.js",
  "schema": {
   "name": "checklist_progressive",
   "aliases": [
    "checklist",
    "چک‌لیست",
    "فهرست-تیک‌دار"
   ],
   "order": 63,
   "category": "مقایسه و فهرست (Compares & Lists)",
   "label": "چک‌لیست تیک‌دار گام‌به‌گام (Progressive Checklist)",
   "description": "فهرست اجرایی که هر مورد به‌نوبت ظاهر می‌شود و بلافاصله تیک سبز آن با انیمیشن کشیده می‌شود",
   "fields": [
    {
     "key": "eyebrow",
     "label": "برچسب بالا (Eyebrow)",
     "type": "text",
     "editable": true
    },
    {
     "key": "title",
     "label": "عنوان چک‌لیست (Title)",
     "type": "text",
     "required": true,
     "editable": true
    },
    {
     "key": "items",
     "label": "موارد چک‌لیست (هر خط: عنوان | توضیح کوتاه)",
     "type": "list",
     "editable": true
    },
    {
     "key": "summary",
     "label": "پیام پایانی (Summary)",
     "type": "text",
     "editable": true
    }
   ],
   "example": {
    "eyebrow": "چک‌لیست پیش از انتشار",
    "title": "۵ کار ضروری قبل از *آپلود ویدیو*",
    "items": [
     "قلاب ۵ ثانیه اول | آیا سؤال اصلی همان ابتدا مطرح شده؟",
     "ریتم آرام اسلایدها | آیا هر نکته فرصت خواندن دارد؟",
     "شفافیت صدا | تعادل صدای گوینده با موسیقی پس‌زمینه",
     "زیرنویس دقیق | خوانایی در موبایل و حالت بی‌صدا",
     "پایان‌بندی هدفمند | هدایت بیننده به ویدیوی بعدی"
    ],
    "summary": "با تیک زدن همین ۵ مورد، کیفیت خروجی شما در سطح حرفه‌ای قرار می‌گیرد."
   }
  }
 },
 {
  "name": "ranking_podium",
  "js": "../templates/ranking_podium/template.js",
  "schema": {
   "name": "ranking_podium",
   "aliases": [
    "podium",
    "top-3",
    "سکوی-رتبه‌بندی",
    "سه-برتر"
   ],
   "order": 64,
   "category": "مقایسه و فهرست (Compares & Lists)",
   "label": "سکوی رتبه‌بندی سه برتر (Top-3 Podium)",
   "description": "معرفی سه رتبه برتر از جایگاه سوم به اول با بالا آمدن تدریجی سکوها و مدال‌ها",
   "fields": [
    {
     "key": "eyebrow",
     "label": "برچسب بالا (Eyebrow)",
     "type": "text",
     "editable": true
    },
    {
     "key": "title",
     "label": "عنوان رتبه‌بندی (Title)",
     "type": "text",
     "required": true,
     "editable": true
    },
    {
     "key": "first",
     "label": "رتبه ۱ — طلایی (نام | عدد/امتیاز | توضیح)",
     "type": "text",
     "editable": true
    },
    {
     "key": "second",
     "label": "رتبه ۲ — نقره‌ای (نام | عدد/امتیاز | توضیح)",
     "type": "text",
     "editable": true
    },
    {
     "key": "third",
     "label": "رتبه ۳ — برنزی (نام | عدد/امتیاز | توضیح)",
     "type": "text",
     "editable": true
    }
   ],
   "example": {
    "eyebrow": "رتبه‌بندی نهایی",
    "title": "سه عامل برتر در *نگه‌داشتن مخاطب*",
    "first": "روایت شفاف و آرام | ۹۴ امتیاز | مهم‌ترین عامل تماشای تا پایان",
    "second": "قلاب قوی ۵ ثانیه اول | ۸۶ امتیاز | تعیین‌کننده نرخ ماندن بیننده",
    "third": "صدا و موسیقی متعادل | ۷۹ امتیاز | ایجاد حس حرفه‌ای و اعتماد"
   }
  }
 },
 {
  "name": "stat_hero",
  "js": "../templates/stat_hero/template.js",
  "schema": {
   "name": "stat_hero",
   "aliases": [
    "hero-stat",
    "kpi-hero",
    "آمار-کلیدی",
    "عدد-روند"
   ],
   "order": 65,
   "category": "داده و آمار (Data & Metrics)",
   "label": "کارت آمار کلیدی و روند (Stat Hero + Sparkline)",
   "description": "نمایش عدد اصلی با شمارش متحرک، برچسب تغییر، خط روند SVG و نکات توضیحی گام‌به‌گام",
   "fields": [
    {
     "key": "eyebrow",
     "label": "برچسب بالا (Eyebrow)",
     "type": "text",
     "editable": true
    },
    {
     "key": "value",
     "label": "عدد اصلی (Main Metric)",
     "type": "text",
     "required": true,
     "editable": true
    },
    {
     "key": "suffix",
     "label": "واحد / پسوند (Suffix)",
     "type": "text",
     "editable": true
    },
    {
     "key": "delta",
     "label": "برچسب تغییر (Delta Badge)",
     "type": "text",
     "editable": true
    },
    {
     "key": "headline",
     "label": "توضیح اصلی عدد (Headline)",
     "type": "text",
     "editable": true
    },
    {
     "key": "spark",
     "label": "اعداد خط روند با کاما (Sparkline Values)",
     "type": "text",
     "editable": true
    },
    {
     "key": "points",
     "label": "نکات تکمیلی زیر آمار (هر خط یک مورد)",
     "type": "list",
     "editable": true
    }
   ],
   "example": {
    "eyebrow": "شاخص کلیدی گزارش",
    "value": "74",
    "suffix": "٪",
    "delta": "+۱۸٪ رشد نسبت به سال گذشته",
    "headline": "افزایش تماشای کامل ویدیوهای آموزشی با *گرافیک گام‌به‌گام*",
    "spark": "22, 31, 38, 46, 52, 65, 74",
    "points": [
     "کاهش چشمگیر خروج بینندگان در ۶۰ ثانیه اول",
     "افزایش ۲.۳ برابری ذخیره و اشتراک‌گذاری توسط مخاطبان"
    ]
   }
  }
 },
 {
  "name": "subscribe_cta",
  "js": "../templates/subscribe_cta/template.js",
  "schema": {
   "name": "subscribe_cta",
   "aliases": [
    "end-card",
    "youtube-cta",
    "دعوت-عضویت",
    "پایان-ویدیو"
   ],
   "order": 66,
   "category": "یوتیوب و پایان‌بندی (YouTube & Social)",
   "label": "دعوت به عضویت و پایان ویدیو (Subscribe CTA)",
   "description": "کارت پایانی یوتیوب با نام کانال، دکمه سابسکرایب و زنگوله متحرک و پیشنهاد ویدیوی بعدی",
   "fields": [
    {
     "key": "eyebrow",
     "label": "برچسب بالا (Eyebrow)",
     "type": "text",
     "editable": true
    },
    {
     "key": "channel",
     "label": "نام کانال (Channel Name)",
     "type": "text",
     "required": true,
     "editable": true
    },
    {
     "key": "handle",
     "label": "آیدی کانال (Handle)",
     "type": "text",
     "editable": true
    },
    {
     "key": "cta_text",
     "label": "پیام دعوت (CTA Message)",
     "type": "textarea",
     "editable": true
    },
    {
     "key": "button_label",
     "label": "متن دکمه (Button Label)",
     "type": "text",
     "editable": true
    },
    {
     "key": "next_video",
     "label": "پیشنهاد ویدیوی بعدی (Next Video Teaser)",
     "type": "text",
     "editable": true
    }
   ],
   "example": {
    "eyebrow": "ممنون که تا پایان همراه بودید",
    "channel": "استودیو خرده‌گیر",
    "handle": "@KhordegirStudio",
    "cta_text": "اگر این تحلیل برایتان مفید بود، *عضو کانال شوید* و زنگوله را روشن کنید تا قسمت بعدی را از دست ندهید.",
    "button_label": "عضویت در کانال · Subscribe",
    "next_video": "ویدیوی پیشنهادی بعدی: چگونه روایت‌های پیچیده را ساده و ماندگار کنیم؟"
   }
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
 },
 {
  "name": "breaking_news",
  "js": "../templates/breaking_news/template.js",
  "schema": {
   "name": "breaking_news",
   "label": "خبر فوری (Breaking News)",
   "description": "کارت خبری تلویزیونی با تیتر فوری، زیرتیتر تحلیلی، عکس اختیاری و نوار زیرنویس متحرک پایین صفحه (سازگار با ۱۶:۹، ۹:۱۶ و ۱:۱).",
   "aliases": [
    "breaking-news",
    "خبر-فوری",
    "فوری"
   ],
   "category": "خبر",
   "fields": [
    {
     "key": "badge",
     "label": "برچسب فوری (Badge)",
     "type": "text",
     "default": "خبر فوری",
     "editable": true
    },
    {
     "key": "timestamp",
     "label": "ساعت / تاریخ خبر (Timestamp)",
     "type": "text",
     "default": "تهران · ۱۴:۳۰",
     "editable": true
    },
    {
     "key": "title",
     "label": "تیتر اصلی خبر (*زرد* ، ~قرمز~)",
     "type": "text",
     "required": true,
     "editable": true
    },
    {
     "key": "summary",
     "label": "چکیده خبر (Summary)",
     "type": "textarea",
     "editable": true
    },
    {
     "key": "image",
     "label": "عکس خبر (اختیاری)",
     "type": "image",
     "editable": true
    },
    {
     "key": "ticker",
     "label": "نوار زیرنویس پایین (Ticker)",
     "type": "text",
     "editable": true
    },
    {
     "key": "source",
     "label": "منبع خبر (Source)",
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
       "urgent-flash",
       "تیتر فوری خبری"
      ],
      [
       "ticker-crawl",
       "نوار زیرنویس زنده"
      ],
      [
       "desk-split",
       "میز خبر دو ستونه"
      ],
      [
       "minimal-news",
       "خبر مینیمال"
      ]
     ],
     "default": "urgent-flash",
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
       "whip-pan-rtl",
       "چرخش سریع به چپ"
      ],
      [
       "accent-slash",
       "نوار تأکید مورب"
      ],
      [
       "curtain-rtl",
       "پرده از راست به چپ"
      ],
      [
       "soft-fade",
       "محو نرم"
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
    "badge": "خبر فوری",
    "timestamp": "تهران · ۱۴:۳۰",
    "title": "بانک مرکزی نرخ بهره بین‌بانکی را ~۲ درصد~ افزایش داد",
    "summary": "تصمیم جدید از ابتدای هفته آینده اجرایی می‌شود و بازارهای ارزی در اولین ساعت واکنش نشان دادند.",
    "ticker": "گزارش زنده تحریریه · واکنش بازار سرمایه · تحلیل کارشناسان اقتصادی در ادامه برنامه",
    "source": "خبرگزاری رسمی · بخش اقتصاد",
    "layout": "SLIDE"
   },
   "order": 220,
   "version": 1
  }
 },
 {
  "name": "fact_check",
  "js": "../templates/fact_check/template.js",
  "schema": {
   "name": "fact_check",
   "label": "راستی‌آزمایی (Fact Check)",
   "description": "نمایش ادعا در برابر سند و شواهد به همراه مهر حکم متحرک (درست، نادرست، گمراه‌کننده، نیمه‌درست یا اثبات‌نشده).",
   "aliases": [
    "fact-check",
    "راستی-آزمایی",
    "سنجش-ادعا"
   ],
   "category": "خبر",
   "fields": [
    {
     "key": "eyebrow",
     "label": "برچسب بالا (Eyebrow)",
     "type": "text",
     "default": "راستی‌آزمایی",
     "editable": true
    },
    {
     "key": "claim",
     "label": "ادعای مطرح‌شده (Claim)",
     "type": "textarea",
     "required": true,
     "editable": true
    },
    {
     "key": "verdict",
     "label": "حکم نهایی (Verdict)",
     "type": "select",
     "options": [
      [
       "false",
       "نادرست (False)"
      ],
      [
       "true",
       "درست (True)"
      ],
      [
       "misleading",
       "گمراه‌کننده (Misleading)"
      ],
      [
       "mixed",
       "نیمه‌درست (Mixed)"
      ],
      [
       "unverified",
       "اثبات‌نشده (Unverified)"
      ]
     ],
     "default": "false",
     "editable": true
    },
    {
     "key": "verdict_label",
     "label": "متن دلخواه مهر حکم (اختیاری)",
     "type": "text",
     "editable": true
    },
    {
     "key": "evidence",
     "label": "شواهد و توضیح سند (Evidence)",
     "type": "textarea",
     "editable": true
    },
    {
     "key": "source",
     "label": "منبع سند (Source)",
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
       "verdict-stamp",
       "مهر حکم راستی‌آزمایی"
      ],
      [
       "evidence-split",
       "ادعا در برابر سند"
      ],
      [
       "editorial-audit",
       "بررسی تحریریه"
      ],
      [
       "minimal-check",
       "راستی‌آزمایی تمیز"
      ]
     ],
     "default": "verdict-stamp",
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
       "curtain-rtl",
       "پرده از راست به چپ"
      ],
      [
       "paper-tear",
       "پاره‌شدن کاغذ تحریریه"
      ],
      [
       "soft-fade",
       "محو نرم"
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
    "eyebrow": "بررسی ادعای پرانتشار",
    "claim": "«مصرف قهوه در شب باعث توقف کامل رشد مغز بزرگسالان می‌شود.»",
    "verdict": "false",
    "evidence": "پژوهش‌های عصب‌شناسی نشان می‌دهد کافئین فقط کیفیت خواب عمیق را کاهش می‌دهد و هیچ مدرکی مبنی بر توقف رشد مغز وجود ندارد.",
    "source": "Journal of Sleep Research · 2024",
    "layout": "SLIDE"
   },
   "order": 230,
   "version": 1
  }
 },
 {
  "name": "two_source_compare",
  "js": "../templates/two_source_compare/template.js",
  "schema": {
   "name": "two_source_compare",
   "label": "مقایسه دو رسانه (Two-Source Compare)",
   "description": "مقایسه رویکرد و تیتر دو رسانه یا منبع مختلف درباره یک رویداد واحد، همراه با جمع‌بندی تحریریه.",
   "aliases": [
    "two-source-compare",
    "مقایسه-منابع",
    "دو-رسانه"
   ],
   "category": "خبر",
   "fields": [
    {
     "key": "eyebrow",
     "label": "برچسب بالا",
     "type": "text",
     "default": "یک خبر، دو روایت",
     "editable": true
    },
    {
     "key": "title",
     "label": "عنوان رویداد",
     "type": "text",
     "required": true,
     "editable": true
    },
    {
     "key": "left_source",
     "label": "نام رسانه اول (راست در RTL)",
     "type": "text",
     "required": true,
     "editable": true
    },
    {
     "key": "left_headline",
     "label": "تیتر رسانه اول",
     "type": "textarea",
     "required": true,
     "editable": true
    },
    {
     "key": "left_angle",
     "label": "زاویه دید رسانه اول",
     "type": "text",
     "editable": true
    },
    {
     "key": "right_source",
     "label": "نام رسانه دوم (چپ در RTL)",
     "type": "text",
     "required": true,
     "editable": true
    },
    {
     "key": "right_headline",
     "label": "تیتر رسانه دوم",
     "type": "textarea",
     "required": true,
     "editable": true
    },
    {
     "key": "right_angle",
     "label": "زاویه دید رسانه دوم",
     "type": "text",
     "editable": true
    },
    {
     "key": "takeaway",
     "label": "جمع‌بندی تحریریه (پایین)",
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
       "headline-clash",
       "تقابل دو تیتر"
      ],
      [
       "editorial-mirror",
       "آینه دو رسانه"
      ],
      [
       "bias-delta",
       "تحلیل زاویه دید"
      ],
      [
       "minimal-sources",
       "مقایسه ساده منابع"
      ]
     ],
     "default": "headline-clash",
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
       "split-curtain",
       "پرده دوقسمتی"
      ],
      [
       "editorial-push",
       "پوش تحریریه"
      ],
      [
       "soft-fade",
       "محو نرم"
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
    "eyebrow": "یک رویداد، دو قاب خبری",
    "title": "گزارش تورم فصل بهار چگونه تیتر شد؟",
    "left_source": "رسانه اقتصادی الف",
    "left_headline": "«کاهش شتاب تورم ماهانه برای سومین ماه پیاپی»",
    "left_angle": "تمرکز بر تغییر نرخ ماهانه",
    "right_source": "روزنامه تحلیلی ب",
    "right_headline": "«تورم نقطه‌به‌نقطه همچنان بالای میانگین ده سال اخیر است»",
    "right_angle": "تمرکز بر فشار معیشتی سالانه",
    "takeaway": "هر دو آمار از یک گزارش رسمی استخراج شده‌اند، اما شاخص انتخابی روایت را تغییر می‌دهد.",
    "layout": "SLIDE"
   },
   "order": 240,
   "version": 1
  }
 },
 {
  "name": "definition_card",
  "js": "../templates/definition_card/template.js",
  "schema": {
   "name": "definition_card",
   "label": "کارت تعریف و مفهوم (Definition Card)",
   "description": "معرفی دقیق یک اصطلاح یا مفهوم علمی با تلفظ/معادل انگلیسی، تعریف روشن، مثال کاربردی و ریشه‌شناسی.",
   "aliases": [
    "definition-card",
    "تعریف",
    "واژه‌نامه"
   ],
   "category": "آموزش",
   "fields": [
    {
     "key": "eyebrow",
     "label": "دسته‌بندی / حوزه",
     "type": "text",
     "default": "واژه‌نامه مفهومی",
     "editable": true
    },
    {
     "key": "term",
     "label": "واژه یا اصطلاح اصلی",
     "type": "text",
     "required": true,
     "editable": true
    },
    {
     "key": "phonetic",
     "label": "معادل انگلیسی / تلفظ",
     "type": "text",
     "editable": true
    },
    {
     "key": "part_of_speech",
     "label": "نوع واژه (مثلاً: اصطلاح اقتصادی)",
     "type": "text",
     "editable": true
    },
    {
     "key": "definition",
     "label": "تعریف روشن و دقیق",
     "type": "textarea",
     "required": true,
     "editable": true
    },
    {
     "key": "example",
     "label": "مثال کاربردی در جمله",
     "type": "textarea",
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
       "lexicon-reveal",
       "واژه‌نامه تحریریه"
      ],
      [
       "editorial-entry",
       "مدخل خوانا"
      ],
      [
       "etymology-focus",
       "ریشه و کاربرد"
      ],
      [
       "minimal-term",
       "تعریف مینیمال"
      ]
     ],
     "default": "lexicon-reveal",
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
       "page-turn",
       "ورق زدن صفحه"
      ],
      [
       "curtain-rtl",
       "پرده از راست به چپ"
      ],
      [
       "soft-fade",
       "محو نرم"
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
    "eyebrow": "مفهوم کلیدی اقتصاد رفتاری",
    "term": "اثر لنگراندازی",
    "phonetic": "Anchoring Bias",
    "part_of_speech": "سوگیری شناختی",
    "definition": "تمایل ذهن انسان به اتکای بیش از حد بر اولین عدد یا اطلاعاتی که هنگام تصمیم‌گیری دریافت می‌کند.",
    "example": "وقتی قیمت اولیه‌ای خط خورده و تخفیف کنار آن نوشته می‌شود، قیمت اول به عنوان «لنگر» قضاوت ما را هدایت می‌کند.",
    "layout": "SLIDE"
   },
   "order": 250,
   "version": 1
  }
 },
 {
  "name": "quiz_poll",
  "js": "../templates/quiz_poll/template.js",
  "schema": {
   "name": "quiz_poll",
   "label": "کوییز و نظرسنجی (Quiz / Poll)",
   "description": "سؤال چندگزینه‌ای با نوار شمارش‌معکوس و نمایش پاسخ درست یا درصد آرای هر گزینه در لحظه مشخص.",
   "aliases": [
    "quiz-poll",
    "کوییز",
    "نظرسنجی",
    "آزمون"
   ],
   "category": "آموزش",
   "fields": [
    {
     "key": "eyebrow",
     "label": "برچسب بالا",
     "type": "text",
     "default": "آزمون کوتاه",
     "editable": true
    },
    {
     "key": "question",
     "label": "متن سؤال اصلی",
     "type": "text",
     "required": true,
     "editable": true
    },
    {
     "key": "options",
     "label": "گزینه‌ها (هر خط یک گزینه یا جدول label/percent)",
     "type": "textarea",
     "required": true,
     "editable": true
    },
    {
     "key": "correct_index",
     "label": "شماره گزینه درست (از ۱ شروع می‌شود؛ ۰ برای نظرسنجی بدون پاسخ درست)",
     "type": "number",
     "default": 2,
     "editable": false
    },
    {
     "key": "reveal_at",
     "label": "زمان نمایش پاسخ درست (ثانیه)",
     "type": "number",
     "default": 2.4,
     "editable": false
    },
    {
     "key": "explanation",
     "label": "توضیح کوتاه پاسخ (اختیاری)",
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
       "option-cascade",
       "ورود پلکانی گزینه‌ها"
      ],
      [
       "countdown-reveal",
       "تایمر و پاسخ درست"
      ],
      [
       "studio-quiz",
       "کوییز استودیویی"
      ],
      [
       "minimal-poll",
       "نظرسنجی ساده"
      ]
     ],
     "default": "countdown-reveal",
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
       "push-up",
       "هل دادن به بالا"
      ],
      [
       "curtain-rtl",
       "پرده از راست به چپ"
      ],
      [
       "soft-fade",
       "محو نرم"
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
    "eyebrow": "حدس بزنید",
    "question": "کدام عامل بیشترین سهم را در حفظ توجه مخاطب در ۱۰ ثانیه اول دارد؟",
    "options": "۱. کیفیت میکروفون\n۲. شفافیت مسئله و کنجکاوی فوری\n۳. تعداد افکت‌های تصویری\n۴. طول ویدیو",
    "correct_index": 2,
    "reveal_at": 2.4,
    "explanation": "مخاطب در ۳ تا ۱۰ ثانیه اول تصمیم می‌گیرد آیا موضوع به مسئله او پاسخ می‌دهد یا نه.",
    "layout": "SLIDE"
   },
   "order": 260,
   "version": 1
  }
 },
 {
  "name": "mistake_vs_correct",
  "js": "../templates/mistake_vs_correct/template.js",
  "schema": {
   "name": "mistake_vs_correct",
   "label": "اشتباه رایج در برابر روش درست (Mistake vs Correct)",
   "description": "مقایسه آموزشی یک اشتباه پرتکرار (با خط‌زدن متحرک) در کنار روش صحیح و نکته اجرایی.",
   "aliases": [
    "mistake-vs-correct",
    "غلط-درست",
    "اشتباه-رایج"
   ],
   "category": "آموزش",
   "fields": [
    {
     "key": "eyebrow",
     "label": "برچسب بالا",
     "type": "text",
     "default": "نکته آموزشی",
     "editable": true
    },
    {
     "key": "title",
     "label": "عنوان درس",
     "type": "text",
     "required": true,
     "editable": true
    },
    {
     "key": "wrong_label",
     "label": "تیتر ستون اشتباه",
     "type": "text",
     "default": "اشتباه رایج",
     "editable": true
    },
    {
     "key": "wrong_text",
     "label": "توضیح اشتباه رایج",
     "type": "textarea",
     "required": true,
     "editable": true
    },
    {
     "key": "right_label",
     "label": "تیتر ستون درست",
     "type": "text",
     "default": "روش درست",
     "editable": true
    },
    {
     "key": "right_text",
     "label": "توضیح روش درست",
     "type": "textarea",
     "required": true,
     "editable": true
    },
    {
     "key": "tip",
     "label": "نکته کلیدی مربی (پایین)",
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
       "cross-to-check",
       "خط زدن غلط و تأکید درست"
      ],
      [
       "split-fix",
       "اصلاح دو ستونه"
      ],
      [
       "coach-callout",
       "نکته مربی"
      ],
      [
       "minimal-fix",
       "اصلاح مینیمال"
      ]
     ],
     "default": "cross-to-check",
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
       "push-left",
       "هل دادن به چپ"
      ],
      [
       "split-curtain",
       "پرده دوقسمتی"
      ],
      [
       "soft-fade",
       "محو نرم"
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
    "eyebrow": "اصول ارائه مؤثر",
    "title": "چطور نمودار را روی صفحه توضیح دهیم؟",
    "wrong_label": "اشتباه رایج",
    "wrong_text": "پر کردن اسلاید با ۶ نمودار هم‌زمان و خواندن تک‌تک عددهای جدول با سرعت بالا.",
    "right_label": "روش درست",
    "right_text": "نمایش یک پیام اصلی، برجسته‌کردن یک عدد کلیدی و دادن ۲ ثانیه مکث برای درک مخاطب.",
    "tip": "قاعده طلایی: هر اسلاید فقط یک ایده اصلی دارد، نه یک گزارش کامل.",
    "layout": "SLIDE"
   },
   "order": 270,
   "version": 1
  }
 },
 {
  "name": "step_by_step",
  "js": "../templates/step_by_step/template.js",
  "schema": {
   "name": "step_by_step",
   "label": "مراحل گام‌به‌گام (Step-by-Step)",
   "description": "نمایش فرآیند یا آموزش ۳ تا ۵ مرحله‌ای با خط پیشرفت متحرک؛ در حالت ۱۶:۹ افقی و در ۹:۱۶ و ۱:۱ عمودی چیده می‌شود.",
   "aliases": [
    "step-by-step",
    "گام-به-گام",
    "مراحل"
   ],
   "category": "آموزش",
   "fields": [
    {
     "key": "eyebrow",
     "label": "برچسب بالا",
     "type": "text",
     "default": "راهنمای اجرایی",
     "editable": true
    },
    {
     "key": "title",
     "label": "عنوان فرآیند",
     "type": "text",
     "required": true,
     "editable": true
    },
    {
     "key": "steps",
     "label": "مراحل (هر خط «عنوان: توضیح» یا جدول title/detail)",
     "type": "textarea",
     "required": true,
     "editable": true
    },
    {
     "key": "active_step",
     "label": "شماره مرحله برجسته (اختیاری، ۰ = همه یکسان)",
     "type": "number",
     "default": 0,
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
       "rail-progress",
       "خط پیشرفت مرحله‌ای"
      ],
      [
       "card-ladder",
       "نردبان کارت‌ها"
      ],
      [
       "editorial-steps",
       "مراحل تحریریه"
      ],
      [
       "minimal-steps",
       "گام‌های تمیز"
      ]
     ],
     "default": "rail-progress",
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
       "curtain-rtl",
       "پرده از راست به چپ"
      ],
      [
       "push-left",
       "هل دادن به چپ"
      ],
      [
       "soft-fade",
       "محو نرم"
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
    "eyebrow": "روش ۴ مرحله‌ای",
    "title": "چطور یک ویدیوی تحلیلی در ۶۰ دقیقه بسازیم؟",
    "steps": "تعیین زاویه دید: فقط یک پرسش مشخص را انتخاب کنید\nجمع‌آوری ۲ سند: آمار معتبر و منبع دست‌اول بیاورید\nتدوین اسلایدها: هر ایده را در یک قاب ساده بچینید\nضبط و انتشار: با ریتم آرام و مکث‌های حساب‌شده بخوانید",
    "active_step": 0,
    "layout": "SLIDE"
   },
   "order": 280,
   "version": 1
  }
 },
 {
  "name": "hook_title",
  "js": "../templates/hook_title/template.js",
  "schema": {
   "name": "hook_title",
   "label": "قلاب ۳ ثانیه (Hook Title)",
   "description": "تیتر آغازین پرانرژی برای شورتس، ریلز و شروع یوتیوب با تأکید دو رنگ، عدد قلاب اختیاری و حرکت کینتیک سریع.",
   "aliases": [
    "hook-title",
    "قلاب",
    "تیتر-شورتس"
   ],
   "category": "شبکه‌های اجتماعی",
   "fields": [
    {
     "key": "kicker",
     "label": "برچسب قلاب بالا (Kicker)",
     "type": "text",
     "default": "نکته‌ای که کمتر گفته می‌شود",
     "editable": true
    },
    {
     "key": "title",
     "label": "خط اول تیتر اصلی",
     "type": "text",
     "required": true,
     "editable": true
    },
    {
     "key": "accent_line",
     "label": "خط دوم برجسته (رنگ تأکید)",
     "type": "text",
     "editable": true
    },
    {
     "key": "subtext",
     "label": "زیرمتن کوتاه / دعوت به ادامه",
     "type": "text",
     "editable": true
    },
    {
     "key": "stat",
     "label": "عدد قلاب اختیاری (مثلاً ۹۲٪)",
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
       "punch-hook",
       "قلاب ۳ ثانیه پرضربه"
      ],
      [
       "split-slam",
       "تیتر دو تکه کوبنده"
      ],
      [
       "vertical-viral",
       "ریتم شورتس و ریلز"
      ],
      [
       "minimal-hook",
       "قلاب مینیمال"
      ]
     ],
     "default": "punch-hook",
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
       "whip-pan-up",
       "چرخش سریع عمودی"
      ],
      [
       "zoom-through-in",
       "عبور زوم به داخل"
      ],
      [
       "film-flash",
       "فلش نگاتیو فیلم"
      ],
      [
       "soft-fade",
       "محو نرم"
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
    "kicker": "در ۳ ثانیه ببینید",
    "title": "چرا ۹۰٪ ویدیوها قبل از ثانیه پنجم",
    "accent_line": "رد می‌شوند؟",
    "subtext": "سه خطای ساده که با یک تغییر کوچک حل می‌شود",
    "stat": "۹۰٪",
    "layout": "SLIDE"
   },
   "order": 290,
   "version": 1
  }
 },
 {
  "name": "before_after",
  "js": "../templates/before_after/template.js",
  "schema": {
   "name": "before_after",
   "label": "قبل و بعد پرده‌ای (Before / After Wipe)",
   "description": "مقایسه تصویری یا متنی قبل و بعد با پرده متحرک و خط جداکننده زنده؛ سازگار با عکس یا کارت متنی در هر ۳ فرمت.",
   "aliases": [
    "before_after_wipe",
    "قبل-بعد-تصویری",
    "پرده-مقایسه"
   ],
   "category": "شبکه‌های اجتماعی",
   "fields": [
    {
     "key": "eyebrow",
     "label": "برچسب بالا",
     "type": "text",
     "default": "مقایسه تغییر",
     "editable": true
    },
    {
     "key": "title",
     "label": "عنوان مقایسه",
     "type": "text",
     "required": true,
     "editable": true
    },
    {
     "key": "before_label",
     "label": "برچسب قبل (Before)",
     "type": "text",
     "default": "قبل",
     "editable": true
    },
    {
     "key": "before_text",
     "label": "متن یا توضیح قبل",
     "type": "textarea",
     "editable": true
    },
    {
     "key": "before_image",
     "label": "عکس قبل (اختیاری)",
     "type": "image",
     "editable": true
    },
    {
     "key": "after_label",
     "label": "برچسب بعد (After)",
     "type": "text",
     "default": "بعد",
     "editable": true
    },
    {
     "key": "after_text",
     "label": "متن یا توضیح بعد",
     "type": "textarea",
     "editable": true
    },
    {
     "key": "after_image",
     "label": "عکس بعد (اختیاری)",
     "type": "image",
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
       "curtain-wipe",
       "پرده مقایسه قبل و بعد"
      ],
      [
       "split-delta",
       "تغییر دو نیمه"
      ],
      [
       "slider-sweep",
       "اسلایدر زنده"
      ],
      [
       "minimal-compare",
       "مقایسه تمیز"
      ]
     ],
     "default": "slider-sweep",
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
       "split-curtain",
       "پرده دوقسمتی"
      ],
      [
       "curtain-rtl",
       "پرده از راست به چپ"
      ],
      [
       "soft-fade",
       "محو نرم"
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
    "eyebrow": "بازطراحی صفحه",
    "title": "تأثیر حذف شلوغی بصری بر نرخ خوانایی",
    "before_label": "قبل از بازطراحی",
    "before_text": "۱۲ ویجت هم‌زمان، ۳ رنگ هشدار متضاد و زمان پیدا کردن دکمه اصلی: ۹ ثانیه.",
    "after_label": "بعد از بازطراحی",
    "after_text": "سلسله‌مراتب تایپوگرافی شفاف، یک کنش اصلی و زمان انجام کار: ۲.۱ ثانیه.",
    "layout": "SLIDE"
   },
   "order": 300,
   "version": 1
  }
 },
 {
  "name": "audiogram",
  "js": "../templates/audiogram/template.js",
  "schema": {
   "name": "audiogram",
   "label": "آدیوگرام پادکست (Audiogram)",
   "description": "کارت صوتی پادکست و گفتگو با موج صوتی زنده و قطعی، عکس یا کاور اپیزود، نام گوینده و نقل‌قول کینتیک.",
   "aliases": [
    "podcast-audiogram",
    "آدیوگرام",
    "موج-صوت"
   ],
   "category": "پادکست",
   "fields": [
    {
     "key": "show",
     "label": "نام پادکست یا برنامه (Show)",
     "type": "text",
     "default": "پادکست خرده‌گیر",
     "editable": true
    },
    {
     "key": "speaker",
     "label": "نام گوینده / مهمان (Speaker)",
     "type": "text",
     "required": true,
     "editable": true
    },
    {
     "key": "role",
     "label": "سمت یا عنوان اپیزود",
     "type": "text",
     "editable": true
    },
    {
     "key": "quote",
     "label": "جمله شاخص گفتار (Quote / Caption)",
     "type": "textarea",
     "required": true,
     "editable": true
    },
    {
     "key": "avatar",
     "label": "تصویر گوینده یا کاور اپیزود (اختیاری)",
     "type": "image",
     "editable": true
    },
    {
     "key": "episode",
     "label": "شماره اپیزود / زمان (مثلاً EP 42 · 18:24)",
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
       "studio-wave",
       "موج صوتی استودیو"
      ],
      [
       "podcast-quote",
       "نقل‌قول پادکست"
      ],
      [
       "caption-pulse",
       "نبض زیرنویس"
      ],
      [
       "minimal-audio",
       "آدیوگرام مینیمال"
      ]
     ],
     "default": "studio-wave",
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
       "soft-fade",
       "محو نرم"
      ],
      [
       "zoom-iris",
       "گشایش زوم نرم"
      ],
      [
       "curtain-rtl",
       "پرده از راست به چپ"
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
    "show": "پادکست خرده‌گیر",
    "speaker": "دکتر مریم رضایی",
    "role": "پژوهشگر اقتصاد رفتاری",
    "quote": "بخش بزرگی از تصمیم‌های مالی ما نه روی *ماشین‌حساب*، بلکه بر اساس داستانی که به خودمان می‌گوییم گرفته می‌شود.",
    "episode": "اپیزود ۴۲ · ۱۸:۲۴",
    "layout": "SLIDE"
   },
   "order": 310,
   "version": 1
  }
 },
 {
  "name": "comparison_table",
  "js": "../templates/comparison_table/template.js",
  "schema": {
   "name": "comparison_table",
   "label": "جدول مقایسه‌ای (Comparison Table)",
   "description": "جدول مقایسه‌ای تمیز و تحریریه با ستون برنده برجسته، ورود پلکانی ردیف‌ها و سازگاری کامل با ۱۶:۹، ۹:۱۶ و ۱:۱.",
   "aliases": [
    "comparison-table",
    "جدول-مقایسه",
    "ماتریس"
   ],
   "category": "داده",
   "fields": [
    {
     "key": "eyebrow",
     "label": "برچسب بالا",
     "type": "text",
     "default": "مقایسه جامع",
     "editable": true
    },
    {
     "key": "title",
     "label": "عنوان جدول",
     "type": "text",
     "required": true,
     "editable": true
    },
    {
     "key": "columns",
     "label": "ستون‌ها (با ویرگول جدا کنید؛ ستون اول نام معیار است)",
     "type": "text",
     "required": true,
     "editable": true
    },
    {
     "key": "rows",
     "label": "ردیف‌ها (هر خط یک ردیف؛ مقادیر با | جدا شوند)",
     "type": "textarea",
     "required": true,
     "editable": true
    },
    {
     "key": "highlight_col",
     "label": "شماره ستون برنده برای برجسته‌سازی (مثلاً ۲ یا ۳؛ ۰ = بدون برجسته)",
     "type": "number",
     "default": 3,
     "editable": false
    },
    {
     "key": "source",
     "label": "منبع داده‌ها",
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
       "matrix-sweep",
       "جدول مقایسه‌ای زنده"
      ],
      [
       "winner-glow",
       "تأکید برنده"
      ],
      [
       "editorial-grid",
       "شبکه تحریریه"
      ],
      [
       "minimal-table",
       "جدول ساده"
      ]
     ],
     "default": "matrix-sweep",
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
       "shutter-bars",
       "کرکره ستونی"
      ],
      [
       "curtain-rtl",
       "پرده از راست به چپ"
      ],
      [
       "soft-fade",
       "محو نرم"
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
    "eyebrow": "مقایسه فنی",
    "title": "روش سنتی در برابر خط تولید خودکار استودیو",
    "columns": "معیار, تدوین دستی, استودیوی خرده‌گیر",
    "rows": "زمان تولید هر اسلاید | ۴۵ دقیقه | ۳ دقیقه\nدقت تایپوگرافی فارسی | متغیر | ۱۰۰٪ استاندارد\nخروجی سه فرمت هم‌زمان | ✕ | ✓\nبازتولید قطعی (Deterministic) | ✕ | ✓",
    "highlight_col": 3,
    "source": "آزمون داخلی خط تولید · ۱۴۰۴",
    "layout": "SLIDE"
   },
   "order": 320,
   "version": 1
  }
 },
 {
  "name": "newspaper_clip",
  "js": "../templates/newspaper_clip/template.js",
  "schema": {
   "name": "newspaper_clip",
   "label": "بریده روزنامه آرشیوی (Newspaper Clip)",
   "description": "بریده روزنامه یا مجله تحریریه با بافت کاغذ، نام نشریه، تاریخ، تیتر، متن گزارش و هایلایت ماژیک متحرک روی جمله کلیدی.",
   "aliases": [
    "newspaper-clip",
    "بریده-روزنامه",
    "روزنامه"
   ],
   "category": "داستان",
   "fields": [
    {
     "key": "publication",
     "label": "نام روزنامه یا نشریه (Publication)",
     "type": "text",
     "required": true,
     "default": "روزنامه تحلیلی اقتصاد",
     "editable": true
    },
    {
     "key": "date",
     "label": "تاریخ و شماره نسخه (Date)",
     "type": "text",
     "default": "۱۴ آبان ۱۴۰۳ · شماره ۴۸۱۲",
     "editable": true
    },
    {
     "key": "headline",
     "label": "تیتر خبر در روزنامه",
     "type": "text",
     "required": true,
     "editable": true
    },
    {
     "key": "excerpt",
     "label": "پاراگراف خبر (برای هایلایت ماژیک از ==متن== استفاده کنید)",
     "type": "textarea",
     "required": true,
     "editable": true
    },
    {
     "key": "caption",
     "label": "توضیح تحریریه پایین بریده (اختیاری)",
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
       "press-zoom",
       "زوم روزنامه آرشیوی"
      ],
      [
       "marker-clip",
       "بریده با هایلایت ماژیک"
      ],
      [
       "archival-paper",
       "بافت کاغذ تاریخی"
      ],
      [
       "minimal-clip",
       "بریده روزنامه تمیز"
      ]
     ],
     "default": "marker-clip",
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
       "paper-tear",
       "پاره‌شدن کاغذ تحریریه"
      ],
      [
       "page-turn",
       "ورق زدن صفحه"
      ],
      [
       "soft-fade",
       "محو نرم"
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
    "publication": "آرشیو روزنامه اطلاعات اقتصادی",
    "date": "۲۳ مهر ۱۳۸۷ · صفحه ۴",
    "headline": "افزایش بی‌سابقه تقاضا برای انرژی‌های تجدیدپذیر در شهرهای بزرگ",
    "excerpt": "بر اساس گزارش منتشرشده، ==هزینه تولید برق خورشیدی در کمتر از یک دهه بیش از ۸۰ درصد کاهش یافته== و این روند نقشه سرمایه‌گذاری دهه آینده را تغییر خواهد داد.",
    "caption": "سندی که پیش‌بینی آن امروز به واقعیت تبدیل شده است.",
    "layout": "SLIDE"
   },
   "order": 330,
   "version": 1
  }
 }
];
