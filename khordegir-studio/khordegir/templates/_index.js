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
   "version": 1,
   "example_fa": {
    "eyebrow": "یک سؤال ساده",
    "title": "پول می‌دی یا به *پلیس* زنگ می‌زنی؟",
    "subtitle": "قانونی که پشت همه‌ی باج‌گیری‌ها هست",
    "image": "",
    "layout": "SLIDE"
   },
   "example_en": {
    "eyebrow": "A SIMPLE QUESTION",
    "title": "Why does a quiet *no* feel so loud?",
    "subtitle": "Three forces behind a five-second silence",
    "layout": "SCAM"
   }
  },
  "css": "../templates/title_card/template.css",
  "preview": "../templates/title_card/preview.png"
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
   "version": 1,
   "example_fa": {
    "number": "80",
    "suffix": "٪",
    "color": "danger",
    "caption": "شرکت‌هایی که باج دادند، دوباره هدف حمله قرار گرفتند",
    "detail": "نظرسنجی از نزدیک به ۱٬۵۰۰ مدیر امنیت",
    "source": "Cybereason, 2022",
    "layout": "SCAM"
   },
   "example_en": {
    "number": "7.2",
    "color": "accent",
    "caption": "Sample caption for a big number",
    "detail": "One short supporting line under it",
    "layout": "SCAM"
   }
  },
  "css": "../templates/big_number/template.css",
  "preview": "../templates/big_number/preview.png"
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
   "version": 1,
   "example_fa": {
    "badge": "مهمان ویژهٔ قسمت ۱۲",
    "title": "دکتر سارا *رادمنش*",
    "subtitle": "پژوهشگر علوم اعصاب و تصمیم‌گیری",
    "text": "بررسی علمی این‌که چرا پاداش‌های نامطمئن مغز ما را درگیرتر نگه می‌دارند.",
    "handle": "@sarah.radmanesh",
    "layout": "SCAM"
   },
   "example_en": {
    "badge": "GUEST · EPISODE 12",
    "title": "Dr. Sample *Name*",
    "subtitle": "Researcher, decision science",
    "text": "Why uncertain rewards keep us hooked.",
    "handle": "@sample",
    "layout": "SCAM"
   }
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
   "version": 1,
   "example_fa": {
    "badge": "پرسش کلیدی اپیزود",
    "author": "ارسالی از شنوندگان پادکست",
    "title": "چرا با وجود ==هوشمندتر شدن==، هنوز در دام باج‌گیری عاطفی می‌افتیم؟",
    "items": [
     "واکنش فوری مغز به تهدید کوتاه‌مدت",
     "خطای هزینهٔ غرق‌شده در روابط کاری"
    ],
    "layout": "SCAM"
   },
   "example_en": {
    "badge": "KEY QUESTION",
    "author": "From a viewer",
    "title": "Why do we still ==give in== even when we know better?",
    "items": [
     "Short-term threat response",
     "Fear of being judged"
    ],
    "layout": "SCAM"
   }
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
   "version": 1,
   "example_fa": {
    "eyebrow": "ممنون که تا اینجا همراه بودید",
    "title": "اگر این بحث برایتان مفید بود، *سابسکرایب* یادتان نرود",
    "subtitle": "اپیزود بعدی هر پنج‌شنبه ساعت ۲۰ منتشر می‌شود",
    "cta": "عضویت در کانال + زنگوله 🔔",
    "layout": "SLIDE"
   },
   "example_en": {
    "eyebrow": "THANKS FOR WATCHING",
    "title": "If this helped, *subscribe*",
    "subtitle": "New video every Thursday",
    "cta": "Subscribe + 🔔",
    "layout": "SLIDE"
   }
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
   "version": 1,
   "example_fa": {
    "image": "",
    "eyebrow": "بی. اف. اسکینر، ۱۹۵۷",
    "title": "پاداشِ گاه‌به‌گاه",
    "text": "سرسخت‌ترین رفتار وقتی ساخته می‌شه که *فقط گاهی* جواب بگیره",
    "source": "Ferster & Skinner, 1957",
    "layout": "SCAM"
   },
   "example_en": {
    "image": "/assets/psychology-lab.jpg",
    "eyebrow": "B. F. SKINNER, 1957",
    "title": "Intermittent reward",
    "text": "Behaviour rewarded *only sometimes* is the hardest to stop.",
    "layout": "SCAM"
   }
  },
  "css": "../templates/image_text/template.css",
  "preview": "../templates/image_text/preview.png"
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
   },
   "example_fa": {
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
   },
   "example_en": {
    "eyebrow": "READING THE PAPER",
    "publication": "Sample Journal · 2024",
    "article_title": "Why small refusals feel bigger than they are",
    "author": "Sample author · page 14",
    "article_body": "Across several studies, people who said no expected others to judge them harshly.\nThe people who heard the no were usually far less bothered than predicted.",
    "focus_text": "Refusers overestimated how negatively a polite no would land.",
    "image": "/assets/archive-newspaper.jpg",
    "paper_theme": "warm-paper",
    "zoom_scale": 1.36,
    "layout": "SCAM"
   }
  }
 },
 {
  "name": "kinetic_text",
  "js": "../templates/kinetic_text/template.js",
  "schema": {
   "name": "kinetic_text",
   "label": "Kinetic Text",
   "label_fa": "تایپوگرافی متحرک",
   "description": "Word-by-word kinetic typography with rise and blur-in; *emphasis* words punch in accent colour with an underline sweep.",
   "category": "text",
   "order": 25,
   "version": 1,
   "aliases": [
    "kinetic-text",
    "kinetic",
    "word-reveal",
    "تایپوگرافی"
   ],
   "fields": [
    {
     "key": "eyebrow",
     "label": "Eyebrow (optional)",
     "type": "text"
    },
    {
     "key": "text",
     "label": "Sentence (*accent* ~danger~ _muted_ ==highlight==)",
     "type": "textarea",
     "required": true
    },
    {
     "key": "align",
     "label": "Alignment",
     "type": "select",
     "options": [
      [
       "center",
       "Center"
      ],
      [
       "start",
       "Start (Left in LTR / Right in RTL)"
      ]
     ],
     "default": "center"
    },
    {
     "key": "size",
     "label": "Text Size",
     "type": "select",
     "options": [
      [
       "auto",
       "Auto"
      ],
      [
       "xl",
       "Extra Large"
      ],
      [
       "hero",
       "Hero"
      ],
      [
       "h1",
       "Medium (H1)"
      ]
     ],
     "default": "auto"
    }
   ],
   "example": {
    "eyebrow": "THE CORE IDEA",
    "text": "A boundary says what *you* won't do.\nA principle makes others ~question~ what they're doing.",
    "align": "center",
    "size": "auto",
    "layout": "SCAM"
   },
   "example_fa": {
    "eyebrow": "ایده‌ی اصلی",
    "text": "مرزِ شخصی می‌گوید *تو* چه کاری نمی‌کنی.\nاصلِ اخلاقی دیگران را به ~تردید~ می‌اندازد.",
    "align": "center",
    "size": "auto",
    "layout": "SCAM"
   }
  },
  "preview": "../templates/kinetic_text/preview.png"
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
   "version": 1,
   "example_fa": {
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
   "example_en": {
    "title": "Sample bar chart",
    "data": [
     {
      "label": "Group A",
      "value": 12
     },
     {
      "label": "Group B",
      "value": 28,
      "color": "accent"
     },
     {
      "label": "Group C",
      "value": 19
     }
    ],
    "layout": "SCAM"
   }
  },
  "preview": "../templates/bar_chart/preview.png"
 },
 {
  "name": "quote_card",
  "js": "../templates/quote_card/template.js",
  "schema": {
   "name": "quote_card",
   "label": "Quote Card",
   "label_fa": "کارت نقل‌قول",
   "description": "Editorial pull-quote card with oversized animated quotation mark, drawing accent rule, author attribution, and optional portrait on the end side.",
   "category": "text",
   "order": 35,
   "version": 1,
   "aliases": [
    "quote-card",
    "pull-quote",
    "نقل‌قول"
   ],
   "fields": [
    {
     "key": "eyebrow",
     "label": "Eyebrow (optional)",
     "type": "text"
    },
    {
     "key": "quote",
     "label": "Quote",
     "type": "textarea",
     "required": true
    },
    {
     "key": "author",
     "label": "Author",
     "type": "text",
     "required": true
    },
    {
     "key": "role",
     "label": "Role / Publication / Year",
     "type": "text"
    },
    {
     "key": "image",
     "label": "Portrait Image (optional)",
     "type": "image"
    },
    {
     "key": "tone",
     "label": "Accent Colour",
     "type": "select",
     "options": [
      [
       "accent",
       "Accent"
      ],
      [
       "danger",
       "Danger"
      ],
      [
       "info",
       "Info"
      ]
     ],
     "default": "accent"
    },
    {
     "key": "motion",
     "label": "Portrait Motion",
     "type": "select",
     "options": [
      [
       "breathe",
       "Breathe"
      ],
      [
       "zoom-out",
       "Zoom Out"
      ],
      [
       "pan-left",
       "Pan Left"
      ],
      [
       "pan-right",
       "Pan Right"
      ],
      [
       "none",
       "Static"
      ]
     ],
     "default": "breathe"
    }
   ],
   "example": {
    "eyebrow": "MORAL REBELS",
    "quote": "Rebels are resented when their *implicit reproach* threatens the positive self-image of individuals who did not rebel.",
    "author": "Monin, Sawyer & Marquez",
    "role": "Journal of Personality and Social Psychology, 2008",
    "tone": "accent",
    "layout": "SCAM"
   },
   "example_fa": {
    "eyebrow": "یاغی‌های اخلاقی",
    "quote": "از یاغی‌ها وقتی دلخور می‌شویم که *سرزنشِ ناگفته‌شان* تصویرِ خوبِ ما از خودمان را تهدید کند.",
    "author": "مونین، سایر و مارکز",
    "role": "مجله‌ی شخصیت و روان‌شناسی اجتماعی، ۲۰۰۸",
    "tone": "accent",
    "layout": "SCAM"
   }
  },
  "preview": "../templates/quote_card/preview.png"
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
   "version": 1,
   "example_fa": {
    "title": "سه سؤالِ قبل از کوتاه اومدن",
    "items": [
     "کی زیر فشاره و کی داره از بقیه خرج می‌کنه؟",
     "اولین بارشه یا تبدیل به عادت شده؟",
     "پناه و اهرم داری یا واقعاً ~گروگانِ بقایی؟~"
    ],
    "layout": "SLIDE"
   },
   "example_en": {
    "title": "Three questions before you give in",
    "items": [
     "Who is under pressure here?",
     "Is this the first time, or a habit?",
     "What do you actually want to say?"
    ],
    "layout": "SCAM"
   }
  },
  "css": "../templates/bullet_list/template.css",
  "preview": "../templates/bullet_list/preview.png"
 },
 {
  "name": "study_card",
  "js": "../templates/study_card/template.js",
  "schema": {
   "name": "study_card",
   "label": "Study Card",
   "label_fa": "کارت پژوهش علمی",
   "description": "Research citation card with study eyebrow, authors, journal, sample-size badge, one-sentence finding, 1–3 count-up numbers, and optional caveat.",
   "category": "data",
   "order": 45,
   "version": 1,
   "aliases": [
    "study-card",
    "research-card",
    "citation",
    "پژوهش"
   ],
   "fields": [
    {
     "key": "eyebrow",
     "label": "Eyebrow (e.g. STUDY · 2008)",
     "type": "text"
    },
    {
     "key": "sample",
     "label": "Sample Size Badge (e.g. n = 51)",
     "type": "text"
    },
    {
     "key": "authors",
     "label": "Authors & Year",
     "type": "text",
     "required": true
    },
    {
     "key": "journal",
     "label": "Journal / Institution",
     "type": "text"
    },
    {
     "key": "finding",
     "label": "Key Finding (1 sentence)",
     "type": "textarea",
     "required": true
    },
    {
     "key": "stats",
     "label": "1–3 Numbers (Label: Value | tone per line)",
     "type": "textarea",
     "required": true
    },
    {
     "key": "caveat",
     "label": "Caveat / Limitation (optional)",
     "type": "text"
    }
   ],
   "example": {
    "eyebrow": "STUDY · 2008",
    "sample": "Columbia students",
    "authors": "Flynn & Lake (2008)",
    "journal": "Journal of Personality and Social Psychology",
    "finding": "Asked to find one stranger who would walk them to the gym, people *overestimated* how many they'd need to ask.",
    "stats": "Predicted asks: 7.2 | danger\nActual asks: 2.3 | accent",
    "caveat": "Study 2 · most students already knew where the gym was.",
    "layout": "SCAM"
   },
   "example_fa": {
    "eyebrow": "پژوهش · ۲۰۰۸",
    "sample": "دانشجویان کلمبیا",
    "authors": "فلین و لیک (۲۰۰۸)",
    "journal": "مجله‌ی شخصیت و روان‌شناسی اجتماعی",
    "finding": "برای پیدا کردن یک غریبه که تا باشگاه همراهشان بیاید، تعداد درخواست‌های لازم را *بیش از حد* تخمین زدند.",
    "stats": "پیش‌بینی: 7.2 | danger\nواقعی: 2.3 | accent",
    "caveat": "آزمایش ۲ · بیشترِ دانشجوها جای باشگاه را می‌دانستند.",
    "layout": "SCAM"
   }
  },
  "preview": "../templates/study_card/preview.png"
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
   "version": 1,
   "example_fa": {
    "title": "سهم همکاری در هر دور بازی",
    "series": "با تنبیه: 13.5, 15.5, 16.5, 17.2, 17.6, 17.9, 18.2, 18.4, 18.5, 18.2\nبدون تنبیه: 10, 9.4, 8.9, 8.5, 8.1, 7.7, 7.2, 6.5, 5.5, 3.2",
    "ymax": 20,
    "source": "Fehr & Gächter, 2000 (AER)",
    "layout": "SLIDE"
   },
   "example_en": {
    "title": "Sample line chart",
    "series": "With feedback: 10, 12, 14, 15, 16, 17\nWithout: 10, 9.5, 9, 8.6, 8.2, 8",
    "layout": "SLIDE"
   }
  },
  "preview": "../templates/line_chart/preview.png"
 },
 {
  "name": "split_compare",
  "js": "../templates/split_compare/template.js",
  "schema": {
   "name": "split_compare",
   "label": "Split Compare",
   "label_fa": "مقایسه دوتایی",
   "description": "Two side-by-side panels following reading direction with tone, optional icon/emoji, headline, body, drawing center divider, popping VS badge, and optional verdict.",
   "category": "compare",
   "order": 55,
   "version": 1,
   "aliases": [
    "split-compare",
    "versus",
    "vs",
    "مقایسه-دوتایی"
   ],
   "fields": [
    {
     "key": "eyebrow",
     "label": "Eyebrow (optional)",
     "type": "text"
    },
    {
     "key": "title",
     "label": "Header Title (optional)",
     "type": "text"
    },
    {
     "key": "a_icon",
     "label": "Side A — Icon / Emoji (optional)",
     "type": "text"
    },
    {
     "key": "a_title",
     "label": "Side A — Headline",
     "type": "text",
     "required": true
    },
    {
     "key": "a_body",
     "label": "Side A — Body (lines or paragraph)",
     "type": "textarea"
    },
    {
     "key": "a_tone",
     "label": "Side A — Tone",
     "type": "select",
     "options": [
      [
       "danger",
       "Danger"
      ],
      [
       "accent",
       "Accent"
      ],
      [
       "good",
       "Good"
      ],
      [
       "muted",
       "Muted"
      ]
     ],
     "default": "danger"
    },
    {
     "key": "b_icon",
     "label": "Side B — Icon / Emoji (optional)",
     "type": "text"
    },
    {
     "key": "b_title",
     "label": "Side B — Headline",
     "type": "text",
     "required": true
    },
    {
     "key": "b_body",
     "label": "Side B — Body (lines or paragraph)",
     "type": "textarea"
    },
    {
     "key": "b_tone",
     "label": "Side B — Tone",
     "type": "select",
     "options": [
      [
       "accent",
       "Accent"
      ],
      [
       "good",
       "Good"
      ],
      [
       "danger",
       "Danger"
      ],
      [
       "muted",
       "Muted"
      ]
     ],
     "default": "accent"
    },
    {
     "key": "vs_label",
     "label": "Center Badge Label",
     "type": "text",
     "default": "VS"
    },
    {
     "key": "verdict",
     "label": "Verdict Line (optional)",
     "type": "text"
    },
    {
     "key": "verdict_tone",
     "label": "Verdict Tone",
     "type": "select",
     "options": [
      [
       "accent",
       "Accent"
      ],
      [
       "good",
       "Good"
      ],
      [
       "danger",
       "Danger"
      ],
      [
       "muted",
       "Muted"
      ]
     ],
     "default": "accent"
    }
   ],
   "example": {
    "eyebrow": "TWO KINDS OF NO",
    "title": "Same word, *different* weight",
    "a_icon": "🍦",
    "a_title": "Personal boundary",
    "a_body": "\"I'm skipping coffee tonight.\"\nSays what you won't do\nNo verdict on anyone else",
    "a_tone": "accent",
    "b_icon": "⚖️",
    "b_title": "Principled refusal",
    "b_body": "\"I won't join this.\"\nCan feel like a verdict\nMay make others question themselves",
    "b_tone": "danger",
    "vs_label": "VS",
    "verdict": "Most everyday refusals land *softer* than we fear.",
    "verdict_tone": "accent",
    "layout": "SCAM"
   },
   "example_fa": {
    "eyebrow": "دو نوع «نه»",
    "title": "یک کلمه، *دو* وزن",
    "a_icon": "🍦",
    "a_title": "مرز شخصی",
    "a_body": "«امشب قهوه نمی‌خورم.»\nفقط حدِ خودت را می‌گوید\nدرباره‌ی کسی قضاوت نمی‌کند",
    "a_tone": "accent",
    "b_icon": "⚖️",
    "b_title": "امتناعِ اصولی",
    "b_body": "«من در این کار شریک نمی‌شوم.»\nمثل حکم به نظر می‌رسد\nدیگران را به فکر وامی‌دارد",
    "b_tone": "danger",
    "vs_label": "در برابر",
    "verdict": "بیشترِ «نه»‌های روزمره *نرم‌تر* از ترسِ ما فرود می‌آیند.",
    "verdict_tone": "accent",
    "layout": "SCAM"
   }
  },
  "preview": "../templates/split_compare/preview.png"
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
   "version": 1,
   "example_fa": {
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
   "example_en": {
    "title": "Before and after (sample)",
    "steps": [
     {
      "value": 8,
      "label": "Before",
      "color": "muted"
     },
     {
      "value": 16,
      "prefix": "+",
      "label": "After",
      "color": "danger"
     }
    ],
    "layout": "SCAM"
   }
  },
  "preview": "../templates/compare/preview.png"
 },
 {
  "name": "stat_bars",
  "js": "../templates/stat_bars/template.js",
  "schema": {
   "name": "stat_bars",
   "label": "Stat Bars",
   "label_fa": "نمودار میله‌ای افقی",
   "description": "Horizontal comparison bars (2–7 rows) with start-aligned labels, bars growing from start, count-up values at bar ends, one highlighted bar, optional suffix and max.",
   "category": "data",
   "order": 65,
   "version": 1,
   "aliases": [
    "stat-bars",
    "horizontal-bars",
    "progress-bars",
    "میله-افقی"
   ],
   "fields": [
    {
     "key": "eyebrow",
     "label": "Eyebrow (optional)",
     "type": "text"
    },
    {
     "key": "title",
     "label": "Title",
     "type": "text"
    },
    {
     "key": "subtitle",
     "label": "Subtitle (optional)",
     "type": "text"
    },
    {
     "key": "items",
     "label": "Rows (Label: Value per line; wrap *Label* to highlight)",
     "type": "textarea",
     "required": true
    },
    {
     "key": "highlight",
     "label": "Highlighted Row (label or 1-based #; blank = *marked* or max)",
     "type": "text"
    },
    {
     "key": "max",
     "label": "Max Scale Value (optional)",
     "type": "number"
    },
    {
     "key": "prefix",
     "label": "Value Prefix (optional)",
     "type": "text"
    },
    {
     "key": "suffix",
     "label": "Value Suffix (e.g. %)",
     "type": "text"
    },
    {
     "key": "decimals",
     "label": "Decimal Places",
     "type": "number",
     "default": 0
    },
    {
     "key": "unit",
     "label": "Unit / Footnote Caption (optional)",
     "type": "text"
    }
   ],
   "example": {
    "eyebrow": "ASCH (1955)",
    "title": "Wrong answers grow with the *size* of the majority",
    "items": "1 opponent: 3.6\n2 opponents: 13.6\n*3 opponents*: 31.8",
    "highlight": "3 opponents",
    "max": 40,
    "suffix": "%",
    "decimals": 1,
    "unit": "Share of critical answers that followed the wrong majority. Larger majorities added little.",
    "layout": "SCAM"
   },
   "example_fa": {
    "eyebrow": "اش (۱۹۵۵)",
    "title": "خطا با *بزرگ‌تر شدن* اکثریت بیشتر می‌شود",
    "items": "۱ مخالف: 3.6\n۲ مخالف: 13.6\n*۳ مخالف*: 31.8",
    "highlight": "۳ مخالف",
    "max": 40,
    "suffix": "٪",
    "decimals": 1,
    "unit": "سهمِ پاسخ‌های بحرانی که از اکثریتِ اشتباه پیروی کردند.",
    "layout": "SCAM"
   }
  },
  "preview": "../templates/stat_bars/preview.png"
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
   "version": 1,
   "example_fa": {
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
   "example_en": {
    "title": "Sample counters",
    "cards": [
     {
      "value": 50,
      "suffix": "%",
      "label": "First sample metric"
     },
     {
      "value": 3,
      "label": "Second sample metric",
      "tone": "accent"
     },
     {
      "value": 1200,
      "label": "Third sample metric"
     }
    ],
    "layout": "SLIDE"
   }
  },
  "preview": "../templates/counter_grid/preview.png"
 },
 {
  "name": "lower_third",
  "js": "../templates/lower_third/template.js",
  "schema": {
   "name": "lower_third",
   "label": "Lower Third",
   "label_fa": "زیرنویس معرفی",
   "description": "Broadcast-style name and role strip with an animated accent bar wipe; safely avoids the bottom-left camera box in SCAM layout.",
   "category": "people",
   "order": 75,
   "version": 1,
   "aliases": [
    "lower-third",
    "chyron",
    "name-tag",
    "معرفی"
   ],
   "fields": [
    {
     "key": "name",
     "label": "Name",
     "type": "text",
     "required": true
    },
    {
     "key": "role",
     "label": "Role / Title",
     "type": "text"
    },
    {
     "key": "tag",
     "label": "Small Uppercase Tag (optional)",
     "type": "text"
    },
    {
     "key": "position",
     "label": "Position",
     "type": "select",
     "options": [
      [
       "auto",
       "Auto"
      ],
      [
       "top",
       "Top / Above Camera"
      ],
      [
       "bottom",
       "Bottom / Beside Camera"
      ]
     ],
     "default": "auto"
    }
   ],
   "example": {
    "name": "Solomon Asch",
    "role": "Social psychologist · \"Opinions and Social Pressure\", 1955",
    "tag": "RESEARCHER",
    "position": "auto",
    "layout": "SCAM"
   },
   "example_fa": {
    "name": "سولومون اش",
    "role": "روان‌شناس اجتماعی · «عقاید و فشار اجتماعی»، ۱۹۵۵",
    "tag": "پژوهشگر",
    "position": "auto",
    "layout": "SCAM"
   }
  },
  "preview": "../templates/lower_third/preview.png"
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
   "version": 1,
   "example_fa": {
    "text": "هر رفتاری که پاداشش بدی،",
    "highlight": "بیشتر می‌شه",
    "caption": "",
    "layout": "SCAM"
   },
   "example_en": {
    "text": "Whatever you reward,",
    "highlight": "grows",
    "author": "Sample author",
    "layout": "SCAM"
   }
  },
  "css": "../templates/quote/template.css",
  "preview": "../templates/quote/preview.png"
 },
 {
  "name": "punch_in",
  "js": "../templates/punch_in/template.js",
  "schema": {
   "name": "punch_in",
   "label": "Punch In",
   "label_fa": "کوبش کلمه",
   "description": "One giant word or short phrase slamming in from 1.25× to 1× with slight blur-in, an accent impact flash behind it, and an optional caption.",
   "category": "text",
   "order": 85,
   "version": 1,
   "aliases": [
    "punch-in",
    "slam",
    "big-word",
    "کوبش"
   ],
   "fields": [
    {
     "key": "eyebrow",
     "label": "Small Eyebrow (optional)",
     "type": "text"
    },
    {
     "key": "text",
     "label": "Giant Word / Short Phrase",
     "type": "text",
     "required": true
    },
    {
     "key": "caption",
     "label": "Caption Below (optional)",
     "type": "text"
    },
    {
     "key": "tone",
     "label": "Accent Flash Colour",
     "type": "select",
     "options": [
      [
       "accent",
       "Accent"
      ],
      [
       "danger",
       "Danger"
      ],
      [
       "good",
       "Good"
      ],
      [
       "text",
       "White / Neutral"
      ]
     ],
     "default": "accent"
    }
   ],
   "example": {
    "eyebrow": "THE ALLY EFFECT",
    "text": "*ONE* VOICE",
    "caption": "One truthful partner: wrong answers only one fourth as often.",
    "tone": "accent",
    "layout": "SCAM"
   },
   "example_fa": {
    "eyebrow": "اثرِ هم‌پیمان",
    "text": "*یک* صدا",
    "caption": "با یک هم‌پیمانِ صادق، خطا یک‌چهارم شد.",
    "tone": "accent",
    "layout": "SCAM"
   }
  },
  "preview": "../templates/punch_in/preview.png"
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
   "version": 1,
   "example_fa": {
    "eyebrow": "بخش سوم",
    "title": "«خودش طلبکار می‌شه!»",
    "layout": "SCAM"
   },
   "example_en": {
    "eyebrow": "PART THREE",
    "title": "\"Now *they're* upset?\"",
    "layout": "SCAM"
   }
  },
  "css": "../templates/section_break/template.css",
  "preview": "../templates/section_break/preview.png"
 },
 {
  "name": "chapter_card",
  "js": "../templates/chapter_card/template.js",
  "schema": {
   "name": "chapter_card",
   "label": "Chapter Card",
   "label_fa": "کارت فصل",
   "description": "Section transition card with a full-width wiping accent band, big part number, title, and subtitle; stays clear of the camera box in SCAM.",
   "category": "transition",
   "order": 95,
   "version": 1,
   "aliases": [
    "chapter-card",
    "chapter",
    "part-card",
    "فصل"
   ],
   "fields": [
    {
     "key": "prefix",
     "label": "Number Prefix (e.g. PART )",
     "type": "text"
    },
    {
     "key": "number",
     "label": "Part Number (e.g. 2 or PART 2)",
     "type": "text",
     "required": true
    },
    {
     "key": "title",
     "label": "Chapter Title",
     "type": "text",
     "required": true
    },
    {
     "key": "subtitle",
     "label": "Subtitle (optional)",
     "type": "text"
    },
    {
     "key": "tone",
     "label": "Band Accent Tone",
     "type": "select",
     "options": [
      [
       "accent",
       "Accent"
      ],
      [
       "danger",
       "Danger"
      ],
      [
       "good",
       "Good"
      ],
      [
       "info",
       "Info"
      ]
     ],
     "default": "accent"
    }
   ],
   "example": {
    "prefix": "PART ",
    "number": "2",
    "title": "The Discomfort *Inside* Your Own Head",
    "subtitle": "Why saying no feels heavier than it is.",
    "tone": "accent",
    "layout": "SCAM"
   },
   "example_fa": {
    "prefix": "بخش ",
    "number": "۲",
    "title": "ناراحتیِ *درونِ* ذهنِ خودت",
    "subtitle": "چرا «نه» گفتن سنگین‌تر از واقعیت به نظر می‌رسد.",
    "tone": "accent",
    "layout": "SCAM"
   }
  },
  "preview": "../templates/chapter_card/preview.png"
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
   "version": 1,
   "example_fa": {
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
   "example_en": {
    "image": "/assets/world-map-dark.jpg",
    "title": "A *full-bleed* image with a title",
    "text": "Short caption line in plain English",
    "layout": "SLIDE"
   }
  },
  "preview": "../templates/image_full/preview.png"
 },
 {
  "name": "doc_highlight",
  "js": "../templates/doc_highlight/template.js",
  "schema": {
   "name": "doc_highlight",
   "label": "Doc Highlight",
   "label_fa": "برجسته‌سازی سند",
   "description": "Paper or abstract excerpt on a document card where ==marked phrases== sweep in with a marker highlight one after another; optional link line.",
   "category": "text",
   "order": 105,
   "version": 1,
   "aliases": [
    "doc-highlight",
    "paper-highlight",
    "abstract",
    "سند"
   ],
   "fields": [
    {
     "key": "journal",
     "label": "Journal / Publication",
     "type": "text"
    },
    {
     "key": "year",
     "label": "Year",
     "type": "text"
    },
    {
     "key": "title",
     "label": "Paper / Article Title",
     "type": "text",
     "required": true
    },
    {
     "key": "excerpt",
     "label": "Excerpt (wrap key phrases in ==like this==)",
     "type": "textarea",
     "required": true
    },
    {
     "key": "link",
     "label": "Source Link / DOI (optional)",
     "type": "text"
    },
    {
     "key": "tone",
     "label": "Marker Highlight Colour",
     "type": "select",
     "options": [
      [
       "accent",
       "Accent"
      ],
      [
       "good",
       "Good"
      ],
      [
       "danger",
       "Danger"
      ],
      [
       "info",
       "Info"
      ]
     ],
     "default": "accent"
    }
   ],
   "example": {
    "journal": "JOURNAL OF PERSONALITY AND SOCIAL PSYCHOLOGY",
    "year": "2024",
    "title": "Saying no: The negative ramifications from invitation declines are less severe than we think",
    "excerpt": "We demonstrate that ==invitees overestimate the negative ramifications== that arise in the eyes of inviters following an invitation decline.",
    "link": "doi.org/10.1037/pspi0000443",
    "tone": "accent",
    "layout": "SCAM"
   },
   "example_fa": {
    "journal": "مجله‌ی شخصیت و روان‌شناسی اجتماعی",
    "year": "۲۰۲۴",
    "title": "«نه» گفتن: پیامدهای ردِ دعوت از آن‌چه فکر می‌کنیم کمتر است",
    "excerpt": "نشان می‌دهیم که ==دعوت‌شدگان پیامدهای منفیِ ردِ دعوت را بیش از حد تخمین می‌زنند== — در نگاهِ دعوت‌کننده این پیامدها کم‌رنگ‌ترند.",
    "link": "doi.org/10.1037/pspi0000443",
    "tone": "accent",
    "layout": "SCAM"
   }
  },
  "preview": "../templates/doc_highlight/preview.png"
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
   "version": 1,
   "example_fa": {
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
   "example_en": {
    "title": "Who asks you?",
    "cards": [
     {
      "label": "Customer",
      "icon": "🧾"
     },
     {
      "label": "Colleague",
      "icon": "💼"
     },
     {
      "label": "Boss",
      "icon": "🏢"
     }
    ],
    "layout": "SCAM"
   }
  },
  "preview": "../templates/three_cards/preview.png"
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
   "version": 1,
   "example_fa": {
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
   "example_en": {
    "title": "",
    "messages": [
     {
      "from": "Alex",
      "text": "Coming to the party tonight? *Everyone's going!*"
     },
     {
      "from": "Me",
      "text": "I'm good, thanks."
     },
     {
      "from": "Alex",
      "text": "Oh… okay."
     }
    ],
    "layout": "SCAM"
   }
  },
  "preview": "../templates/chat/preview.png"
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
   "version": 1,
   "example_fa": {
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
   "example_en": {
    "title": "Sample timeline",
    "events": [
     {
      "date": "1951",
      "text": "First study"
     },
     {
      "date": "1955",
      "text": "Published"
     },
     {
      "date": "2024",
      "text": "New replication"
     }
    ],
    "layout": "SCAM"
   }
  },
  "preview": "../templates/timeline/preview.png"
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
   "version": 1,
   "example_fa": {
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
   "example_en": {
    "chart": {
     "type": "bar",
     "orientation": "h",
     "data": [
      {
       "label": "Alone",
       "value": 3.6
      },
      {
       "label": "With one ally",
       "value": 5.5,
       "color": "accent"
      },
      {
       "label": "Group of 3",
       "value": 32,
       "color": "danger"
      }
     ],
     "suffix": "%"
    },
    "title": "Horizontal bars (sample)",
    "layout": "SLIDE"
   }
  },
  "preview": "../templates/chart/preview.png"
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
   "version": 1,
   "example_fa": {
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
   "example_en": {
    "elements": [
     {
      "type": "text",
      "text": "Layered sample",
      "font": "Black",
      "size": 90,
      "color": "#FFFFFF",
      "x": 700,
      "y": 300,
      "anchor": "ls"
     },
     {
      "type": "counter",
      "from": 0,
      "to": 79,
      "suffix": "%",
      "font": "Black",
      "size": 220,
      "color": "#F2333B",
      "x": 700,
      "y": 640,
      "anchor": "ls",
      "delay": 0.2
     }
    ],
    "layout": "SLIDE"
   }
  },
  "preview": "../templates/layers/preview.png"
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
   "version": 1,
   "example_fa": {
    "layout": "CAM"
   },
   "example_en": {
    "layout": "CAM"
   }
  },
  "preview": "../templates/cam/preview.png"
 }
];
