/* Khordegir Studio — Complete Interactive Studio & OBS Guide Modal
   Bilingual Persian (RTL) + English (LTR), 100% offline.
   Covers: 1-Click Launch, Quick Start, Sending Slides to OBS (Browser Source + Live Console + Lua Export),
   Live Puppet & Microphone Troubleshooting, Slow Step-by-Step Pacing & 66 Templates, and Keyboard Shortcuts. */

function getOrigin() {
  try {
    return window.location.origin || "http://127.0.0.1:3000";
  } catch (_) {
    return "http://127.0.0.1:3000";
  }
}

export function buildObsUrls(projectName = "default") {
  const origin = getOrigin();
  const proj = encodeURIComponent(String(projectName || "default").trim() || "default");
  return {
    full: `${origin}/obs-stage/?project=${proj}`,
    transparent: `${origin}/obs-stage/?project=${proj}&transparent=1`,
    puppetMic: `${origin}/obs-stage/?project=${proj}&mic=1&hud=1`,
    obsConsole: `${origin}/obs/?project=${proj}`,
    editor: `${origin}/editor/`,
  };
}

const GUIDE_TABS = [
  { id: "quickstart", fa: "🚀 شروع سریع", en: "🚀 Quick Start" },
  { id: "obs",        fa: "📡 ارسال به OBS", en: "📡 Send to OBS" },
  { id: "mic",        fa: "🎙️ میکروفن و عروسک", en: "🎙️ Live Mic & Puppet" },
  { id: "templates",  fa: "🎬 انیمیشن آرام و قالب‌ها", en: "🎬 Slow Pace & Templates" },
  { id: "shortcuts",  fa: "⌨️ کلیدهای میانبر", en: "⌨️ Shortcuts" },
];

function renderTabBody(tabId, lang, projectName) {
  const isEn = lang === "en";
  const urls = buildObsUrls(projectName);

  if (tabId === "quickstart") {
    if (isEn) {
      return `
        <div class="guide-hero">
          <h4>Welcome to Khordegir Studio — Offline Motion Graphics & Live Puppet Studio</h4>
          <p>Create broadcast-grade Persian & English slides, slow step-by-step explainers, and a live voice-driven Red Eagle puppet — 100% offline on your own computer.</p>
        </div>

        <div class="guide-section">
          <h5>1. One-Click Easy Launch (After Installing)</h5>
          <div class="guide-cards-3">
            <div class="guide-card">
              <strong>Windows</strong>
              <p>Double-click <code>Open-Khordegir-Studio.bat</code> inside <code>khordegir-studio/</code>. It starts the server and opens the Editor in your browser automatically.</p>
            </div>
            <div class="guide-card">
              <strong>macOS</strong>
              <p>Double-click <code>Open-Khordegir-Studio.command</code> inside <code>khordegir-studio/</code> (or run <code>bash khordegir-studio/open-studio.sh</code>).</p>
            </div>
            <div class="guide-card">
              <strong>Linux / Terminal</strong>
              <p>Run <code>bash khordegir-studio/open-studio.sh</code> or <code>npm start</code>, then open <code dir="ltr">${urls.editor}</code>.</p>
            </div>
          </div>
        </div>

        <div class="guide-section">
          <h5>2. Your 3-Step Workflow</h5>
          <ol class="guide-steps">
            <li><strong>Create or Pick a Project:</strong> Choose a project at the top bar or click <em>+ New Project</em>. Click <em>+ Template Gallery</em> (66 templates) or <em>Script to Slides</em> to auto-generate slides.</li>
            <li><strong>Style & Pace:</strong> Pick one of 14 visual themes (Vox, Kurzgesagt, Magnates, Persian Turquoise…), choose <strong>Slow Step-by-Step</strong> pace in <em>Curves & Motion</em> so points appear one by one as you talk, and enable the Red Eagle puppet in the <em>Puppet</em> tab.</li>
            <li><strong>Go Live in OBS or Export Video:</strong> Click <strong>📡 Send Live to OBS</strong> or open <strong>OBS Console & Teleprompter</strong> to present live, OR export deterministic MP4/PNG/WebM with <code>python3 -m khordegir render videos/YOUR_PROJECT --formats 16:9,9:16,1:1</code>.</li>
          </ol>
        </div>
      `;
    }
    return `
      <div class="guide-hero">
        <h4>به خرده‌گیر استودیو خوش آمدید — استودیوی آفلاین موشن‌گرافیک، تله‌پرامپتر و عروسک سخنگو</h4>
        <p>بدون نیاز به اینترنت یا هوش مصنوعی ابری، اسلایدهای یوتیوبری حرفه‌ای بسازید، آیتم‌ها را آرام و گام‌به‌گام هنگام توضیح دادن نمایش دهید و با یک کلیک روی OBS پخش یا به MP4 تبدیل کنید.</p>
      </div>

      <div class="guide-section">
        <h5>۱. باز کردن خیلی آسان استودیو (پس از نصب)</h5>
        <div class="guide-cards-3">
          <div class="guide-card">
            <strong>ویندوز (Windows)</strong>
            <p>در پوشهٔ <code>khordegir-studio</code> روی فایل <code>Open-Khordegir-Studio.bat</code> دوبار کلیک کنید؛ سرور خودکار بالا می‌آید و مرورگر روی ویرایشگر باز می‌شود.</p>
          </div>
          <div class="guide-card">
            <strong>مک (macOS)</strong>
            <p>روی فایل <code>Open-Khordegir-Studio.command</code> در پوشهٔ <code>khordegir-studio</code> دوبار کلیک کنید.</p>
          </div>
          <div class="guide-card">
            <strong>لینوکس / ترمینال</strong>
            <p>دستور <code>bash khordegir-studio/open-studio.sh</code> یا <code>npm start</code> را بزنید و آدرس <code dir="ltr">${urls.editor}</code> را باز کنید.</p>
          </div>
        </div>
      </div>

      <div class="guide-section">
        <h5>۲. روش کار در ۳ قدم ساده</h5>
        <ol class="guide-steps">
          <li><strong>ساخت یا انتخاب پروژه:</strong> از نوار بالا پروژه را انتخاب کنید یا <em>+ پروژه جدید</em> بزنید. سپس با <em>+ گالری قالب‌ها</em> (۶۶ قالب آماده) یا <em>📄 متن به اسلاید</em> اسلایدها را بسازید.</li>
          <li><strong>تنظیم سبک، سرعت آرام و عروسک:</strong> از منوی بالا یکی از ۱۴ تم (Vox، Kurzgesagt، Magnates، فیروزه‌ای ایرانی و...) را انتخاب کنید. در تب <strong>منحنی و حرکت</strong> سرعت را روی <em>آرامِ گام‌به‌گام</em> بگذارید تا آیتم‌ها یکی‌یکی ظاهر شوند. در تب <strong>عروسک</strong>، میکروفن زنده را روشن کنید.</li>
          <li><strong>ارسال به OBS یا خروجی ویدیو:</strong> روی دکمهٔ <strong>📡 ارسال زنده OBS</strong> کلیک کنید (یا <strong>کنسول OBS و پرامپتر</strong> را باز کنید). برای رندر فایل ویدیویی MP4 هم در ترمینال بزنید: <code dir="ltr">python3 -m khordegir render videos/my-video --formats 16:9,9:16,1:1</code></li>
        </ol>
      </div>
    `;
  }

  if (tabId === "obs") {
    if (isEn) {
      return `
        <div class="guide-hero">
          <h4>Sending Your Slides & Puppet to OBS Studio (30-Second Setup)</h4>
          <p>Khordegir Studio connects directly to OBS as a crisp 1920×1080 Browser Source — zero screen capture needed!</p>
        </div>

        <div class="guide-section">
          <h5>Step 1 — Copy Your Live OBS Browser Source URL</h5>
          <div class="guide-url-list">
            <div class="guide-url-row">
              <div>
                <strong>Full Slide / SCAM Stage (Recommended)</strong>
                <input type="text" readonly dir="ltr" class="text-input compact" value="${urls.full}">
              </div>
              <button type="button" class="btn btn-sm btn-amber" data-copy-url="${urls.full}">Copy URL</button>
            </div>
            <div class="guide-url-row">
              <div>
                <strong>Transparent Overlay on Top of Your Webcam</strong>
                <input type="text" readonly dir="ltr" class="text-input compact" value="${urls.transparent}">
              </div>
              <button type="button" class="btn btn-sm btn-ghost" data-copy-url="${urls.transparent}">Copy URL</button>
            </div>
            <div class="guide-url-row">
              <div>
                <strong>Live Red Eagle Puppet + Mic + Operator HUD</strong>
                <input type="text" readonly dir="ltr" class="text-input compact" value="${urls.puppetMic}">
              </div>
              <button type="button" class="btn btn-sm btn-ghost" data-copy-url="${urls.puppetMic}">Copy URL</button>
            </div>
          </div>
        </div>

        <div class="guide-section">
          <h5>Step 2 — Add to OBS Studio</h5>
          <ol class="guide-steps">
            <li>Open <strong>OBS Studio</strong>, go to the <strong>Sources</strong> panel, and click <strong>+ → Browser</strong>.</li>
            <li>Name it <code>Khordegir Slides</code> and paste the copied URL into the <strong>URL</strong> box.</li>
            <li>Set <strong>Width = 1920</strong> and <strong>Height = 1080</strong>. Check <em>"Control audio via OBS"</em> if you want slide SFX inside OBS mixer.</li>
            <li>Place your Webcam source <em>below</em> the Browser Source (for SCAM or Transparent Overlay mode) and click <strong>OK</strong>.</li>
          </ol>
        </div>

        <div class="guide-section">
          <h5>Step 3 — Control Slides Live While Recording</h5>
          <ul class="guide-bullets">
            <li><strong>From the Editor:</strong> Select any slide and press <strong>📡 Send Live to OBS</strong> — it immediately animates into OBS!</li>
            <li><strong>From OBS Console & Teleprompter (<code dir="ltr">/obs/</code>):</strong> Click <strong>Next Step (PageDown)</strong> to advance slides + teleprompter + lower-thirds + chapter bars + SFX soundboard in sync.</li>
            <li><strong>Offline MP4 / Lua Package:</strong> Inside the OBS Console click <em>Export Offline OBS Package</em> to generate standalone <code>steps_data.lua</code> + <code>slide-NN.mp4</code> files if you prefer pre-rendered clips.</li>
          </ul>
        </div>
      `;
    }
    return `
      <div class="guide-hero">
        <h4>راهنمای گام‌به‌گام ارسال اسلایدها و عروسک به OBS Studio (در ۳۰ ثانیه)</h4>
        <p>خرده‌گیر استودیو مستقیماً به‌عنوان یک <strong>Browser Source</strong> با کیفیت کامل ۱۹۲۰×۱۰۸۰ به OBS وصل می‌شود — بدون نیاز به Screen Capture یا پرده سبز!</p>
      </div>

      <div class="guide-section">
        <h5>قدم ۱ — کپی لینک زندهٔ پروژهٔ فعلی برای OBS</h5>
        <div class="guide-url-list">
          <div class="guide-url-row">
            <div>
              <strong>حالت کامل اسلاید و SCAM (پیشنهادی)</strong>
              <input type="text" readonly dir="ltr" class="text-input compact" value="${urls.full}">
            </div>
            <button type="button" class="btn btn-sm btn-amber" data-copy-url="${urls.full}">کپی لینک</button>
          </div>
          <div class="guide-url-row">
            <div>
              <strong>حالت لایهٔ شفاف روی وب‌کم (Transparent Overlay)</strong>
              <input type="text" readonly dir="ltr" class="text-input compact" value="${urls.transparent}">
            </div>
            <button type="button" class="btn btn-sm btn-ghost" data-copy-url="${urls.transparent}">کپی لینک</button>
          </div>
          <div class="guide-url-row">
            <div>
              <strong>حالت عروسک زنده با میکروفن و HUD کنترل</strong>
              <input type="text" readonly dir="ltr" class="text-input compact" value="${urls.puppetMic}">
            </div>
            <button type="button" class="btn btn-sm btn-ghost" data-copy-url="${urls.puppetMic}">کپی لینک</button>
          </div>
        </div>
      </div>

      <div class="guide-section">
        <h5>قدم ۲ — افزودن لینک در برنامهٔ OBS Studio</h5>
        <ol class="guide-steps">
          <li>برنامهٔ <strong>OBS Studio</strong> را باز کنید و در کادر <strong>Sources</strong> روی علامت <strong>+</strong> بزنید و گزینهٔ <strong>Browser</strong> را انتخاب کنید.</li>
          <li>اسم سورس را مثلاً <code>Khordegir Slides</code> بگذارید و لینک کپی‌شده در بالا را در فیلد <strong>URL</strong> قرار دهید.</li>
          <li>عرض (<strong>Width</strong>) را <code dir="ltr">1920</code> و ارتفاع (<strong>Height</strong>) را <code dir="ltr">1080</code> تنظیم کنید. اگر می‌خواهید صدای افکت‌ها (SFX) در OBS ضبط شود، تیک <em>Control audio via OBS</em> را بزنید.</li>
          <li>لایهٔ وب‌کم خود را در فهرست Sources <strong>زیر</strong> این لایه قرار دهید تا در حالت «اسلاید + من (SCAM)» یا «لایهٔ شفاف» تصویر شما دقیقاً در کادر دوربین بنشیند.</li>
        </ol>
      </div>

      <div class="guide-section">
        <h5>قدم ۳ — عوض کردن اسلایدها هنگام ضبط در OBS</h5>
        <ul class="guide-bullets">
          <li><strong>مستقیم از ویرایشگر:</strong> روی هر اسلاید کلیک کنید و دکمهٔ <strong>📡 ارسال زنده OBS</strong> را بزنید؛ اسلاید با انیمیشن کامل روی OBS ظاهر می‌شود.</li>
          <li><strong>از کنسول OBS و تله‌پرامپتر (<code dir="ltr">/obs/</code>):</strong> متن گفتار جلوی چشمتان اسکرول می‌شود و با هر بار زدن <strong>مرحله بعد (PageDown)</strong>، اسلاید، چپتر، زیرنویس معرفی (Lower-Third) و افکت صوتی هم‌زمان روی OBS اجرا می‌شوند.</li>
          <li><strong>خروجی آفلاین Lua و MP4:</strong> اگر می‌خواهید بدون مرورگر از فایل‌های رندرشده استفاده کنید، در کنسول OBS روی <em>خروجی بستهٔ آفلاین OBS</em> کلیک کنید.</li>
        </ul>
      </div>
    `;
  }

  if (tabId === "mic") {
    if (isEn) {
      return `
        <div class="guide-hero">
          <h4>Live Microphone & Talking Red Eagle Puppet Guide</h4>
          <p>Your voice loudness, pitch, and emphasis drive the puppet's beak, eyebrows, head tilt, chest bounce, and wings in real time (&lt;100ms latency).</p>
        </div>

        <div class="guide-section">
          <h5>How to Test Your Microphone Right Now</h5>
          <ol class="guide-steps">
            <li>Open the <strong>Puppet</strong> tab in the right inspector (or add a <code>mascot_talk</code> slide / turn on the <em>Mascot Layer</em> toggle).</li>
            <li>Click <strong>🎙️ Start Live Mic</strong> directly above the <strong>Loudness</strong> bar and allow browser microphone access.</li>
            <li>Speak normally — you will immediately see the green/gold <strong>Loudness</strong> bar, <strong>dB</strong> readout, <strong>Pitch (Hz)</strong> marker, and the Red Eagle's beak move live!</li>
          </ol>
        </div>

        <div class="guide-section">
          <h5>Troubleshooting If Loudness Stays at 0%</h5>
          <ul class="guide-bullets">
            <li><strong>Use <code>http://127.0.0.1:3000</code> or <code>http://localhost:3000</code>:</strong> Browsers block microphones on non-localhost HTTP IP addresses.</li>
            <li><strong>Select the Right Mic Device:</strong> Use the Microphone dropdown next to the Live Mic button to switch between laptop mic, USB mic, or headset.</li>
            <li><strong>Quiet Microphone?</strong> Raise the <strong>Gain Boost</strong> slider (up to <code>6.0×</code>), keep <strong>Auto Gain (AGC)</strong> checked, and lower <strong>Noise Gate</strong> to <code>-62 dB</code>.</li>
            <li><strong>Inside OBS Studio Browser Source:</strong> OBS disables mic inside Browser Sources by default. Either launch OBS with <code>--enable-media-stream</code>, OR simply keep Live Mic ON inside Chrome's Editor/OBS Console and it streams live voice directly to OBS Stage!</li>
          </ul>
        </div>
      `;
    }
    return `
      <div class="guide-hero">
        <h4>راهنمای میکروفن زنده و عروسک سخنگو (عقاب قرمز و ۴ شخصیت دیگر)</h4>
        <p>بلندی صدا (Loudness)، زیر و بمی (Pitch) و تاکیدهای صدای شما به‌صورت زنده و با تاخیر زیر ۱۰۰ میلی‌ثانیه منقار، ابرو، تکان سر، بدن و بال‌های عروسک را حرکت می‌دهند.</p>
      </div>

      <div class="guide-section">
        <h5>چطور همین الان میکروفن را تست کنم؟</h5>
        <ol class="guide-steps">
          <li>در ستون تنظیمات، تب <strong>عروسک (Puppet)</strong> را باز کنید (اگر اسلاید فعلی عروسک ندارد، تیک <em>نمایش عروسک روی این اسلاید</em> را بزنید یا اسلاید <code>mascot_talk</code> اضافه کنید).</li>
          <li>در بالای نوار <strong>بلندی صدا (Loudness)</strong> روی دکمهٔ <strong>🎙️ روشن کردن میکروفن زنده</strong> کلیک کنید و در پنجرهٔ مرورگر گزینهٔ <strong>Allow</strong> را بزنید.</li>
          <li>عادی صحبت کنید — بلافاصله نوار بلندی صدا، عدد dB، نشانگر زیر و بمی (Hz) و منقار عروسک روی صحنه با صدای شما حرکت می‌کنند!</li>
        </ol>
      </div>

      <div class="guide-section">
        <h5>اگر بلندی صدا تغییر نمی‌کند این ۴ مورد را چک کنید:</h5>
        <ul class="guide-bullets">
          <li><strong>آدرس مرورگر:</strong> حتماً استودیو را با <code dir="ltr">http://127.0.0.1:3000</code> یا <code dir="ltr">http://localhost:3000</code> باز کنید (مرورگر روی آی‌پی شبکه HTTP اجازه میکروفن نمی‌دهد).</li>
          <li><strong>انتخاب میکروفن درست:</strong> از منوی انتخاب دستگاه میکروفن در پنل میکروفن زنده، میکروفن واقعی (USB / هدست / لپ‌تاپ) را انتخاب کنید.</li>
          <li><strong>صدای میکروفن کم است؟</strong> اسلایدر <strong>تقویت صدا (Gain)</strong> را روی <code>2.5×</code> تا <code>5.0×</code> ببرید، تیک <strong>AGC</strong> را روشن نگه دارید و <strong>نویز گیت</strong> را روی <code>-62 dB</code> پایین بیاورید.</li>
          <li><strong>میکروفن داخل OBS Studio:</strong> مرورگر داخلی OBS به‌صورت پیش‌فرض میکروفن را می‌بندد. برای رفع آن یا OBS را با پارامتر <code dir="ltr">--enable-media-stream</code> اجرا کنید، یا از پنل میکروفن زنده در مرورگر استفاده کنید.</li>
        </ul>
      </div>
    `;
  }

  if (tabId === "templates") {
    if (isEn) {
      return `
        <div class="guide-hero">
          <h4>Slow Real-Edit Pacing, Step-by-Step Reveals & 66 Templates</h4>
          <p>Make your slides feel like a real human video edit — items appear one by one while you explain instead of dumping everything on screen at once.</p>
        </div>

        <div class="guide-section">
          <h5>Slow & Step-by-Step Animation Controls</h5>
          <ul class="guide-bullets">
            <li>Open the <strong>Curves & Motion</strong> tab in the inspector.</li>
            <li>Pick <strong>Animation Pace</strong>: <em>Fast</em>, <em>Normal</em>, <em>Relaxed</em>, <strong>Slow Step-by-Step (Explainer)</strong>, or <strong>Ultra-Slow (Documentary)</strong>.</li>
            <li>Pick <strong>Item Reveal Mode</strong>: choose <strong>Step-by-Step (One-by-One)</strong> or <strong>Focus Spotlight (Dim Previous)</strong> so each point lights up while earlier items gently dim!</li>
            <li>Click <strong>Apply Pace to Project</strong> to give your entire video the same calm, human-edited rhythm.</li>
          </ul>
        </div>

        <div class="guide-section">
          <h5>66 Templates · 14 Themes · 40 Transitions · Rich Text Markup</h5>
          <ul class="guide-bullets">
            <li><strong>Diagrams & Visuals:</strong> Flowchart, Funnel, Mind Map, Venn Diagram, Pyramid, Cycle, Image Gallery, Annotated Image, Corkboard, Phone Mockup.</li>
            <li><strong>Passages, English & Compares:</strong> Passage Highlight, <code>convey_english</code> (English→Persian lessons), Book Excerpt, Pull Quote, Pros & Cons, 2×2 Matrix, Progressive Checklist, Podium.</li>
            <li><strong>Rich Text Highlights:</strong> Wrap words in <code>*gold*</code>, <code>~red~</code>, <code>==marker highlight==</code>, <code>__underline__</code>, or <code>~~strikethrough~~</code> inside any slide text.</li>
          </ul>
        </div>
      `;
    }
    return `
      <div class="guide-hero">
        <h4>انیمیشن‌های آرام و گام‌به‌گام (شبیه تدوین واقعی) + ۶۶ قالب، ۱۴ تم و ۴۰ ترنزیشن</h4>
        <p>به جای اینکه تمام آیتم‌ها یک‌باره روی صفحه بریزند، می‌توانید کاری کنید هنگام توضیح دادن، هر نکته، مرحله، تصویر یا جمله یکی‌یکی و با ریتم آرام ظاهر شود.</p>
      </div>

      <div class="guide-section">
        <h5>چطور انیمیشن را آرام و گام‌به‌گام (یکی‌یکی) کنم؟</h5>
        <ol class="guide-steps">
          <li>در ستون سمت چپ ویرایشگر، تب <strong>منحنی و حرکت (Curves &amp; Motion)</strong> را باز کنید.</li>
          <li>در بخش <strong>سرعت و ریتم انیمیشن (Animation Pace)</strong> گزینهٔ <strong>آرامِ گام‌به‌گام (توضیحی)</strong> یا <strong>خیلی آرام (مستند)</strong> را انتخاب کنید.</li>
          <li>در بخش <strong>حالت نمایش آیتم‌ها (Reveal Mode)</strong> گزینهٔ <strong>گام‌به‌گام (یکی‌یکی)</strong> یا <strong>تمرکز روی آیتم فعلی (کم‌رنگ شدن قبلی‌ها)</strong> را بزنید.</li>
          <li>اگر می‌خواهید کل ویدیو همین ریتم را داشته باشد، دکمهٔ <strong>اعمال ریتم آرام به کل پروژه</strong> را بزنید. (برای کنترل دقیق‌تر، بخش <em>تنظیمات پیشرفته سرعت و مکث</em> را باز کنید.)</li>
        </ol>
      </div>

      <div class="guide-section">
        <h5>نشانه‌گذاری رنگی متن‌ها و خروجی سه‌فرمته</h5>
        <ul class="guide-bullets">
          <li>در هر فیلد متنی می‌توانید از نشانه‌های <code dir="ltr">*طلایی*</code>، <code dir="ltr">~قرمز~</code>، <code dir="ltr">==هایلایت ماژیکی==</code>، <code dir="ltr">__زیرخط__</code> و <code dir="ltr">~~خط‌خورده~~</code> استفاده کنید.</li>
          <li>نسبت تصویر را از نوار بالای پیش‌نمایش بین <strong>16:9</strong> (یوتیوب)، <strong>9:16</strong> (شورتس/ریلز) و <strong>1:1</strong> (مربع) جابه‌جا کنید — همهٔ ۶۶ قالب به‌صورت خودکار چیدمان را تطبیق می‌دهند.</li>
          <li>برای خروجی ویدیوی MP4 / PNG / WebM شفاف در ترمینال: <code dir="ltr">python3 -m khordegir render videos/YOUR_PROJECT --formats 16:9,9:16,1:1</code></li>
        </ul>
      </div>
    `;
  }

  // shortcuts tab
  if (isEn) {
    return `
      <div class="guide-section">
        <h5>Editor Shortcuts</h5>
        <div class="guide-shortcuts-grid">
          <div><kbd>Ctrl + S</kbd><span>Save video.yaml</span></div>
          <div><kbd>Ctrl + Z</kbd><span>Undo last edit</span></div>
          <div><kbd>Ctrl + Shift + Z</kbd><span>Redo</span></div>
          <div><kbd>Space</kbd><span>Play / Pause preview</span></div>
          <div><kbd>Esc</kbd><span>Close modal / cancel picker</span></div>
        </div>
      </div>
      <div class="guide-section">
        <h5>OBS Console & Teleprompter (<code dir="ltr">/obs/</code>)</h5>
        <div class="guide-shortcuts-grid">
          <div><kbd>PageDown</kbd> / <kbd>←</kbd><span>Next step (Prompter + Live OBS)</span></div>
          <div><kbd>PageUp</kbd> / <kbd>→</kbd><span>Previous step</span></div>
          <div><kbd>Space</kbd><span>Toggle auto-scroll</span></div>
          <div><kbd>↑</kbd> / <kbd>↓</kbd><span>Scroll speed down / up</span></div>
          <div><kbd>F</kbd><span>Focus mode (full-width prompter)</span></div>
          <div><kbd>M</kbd><span>Mirror text (glass teleprompter)</span></div>
          <div><kbd>F9</kbd><span>Jump to start of current Act</span></div>
        </div>
      </div>
      <div class="guide-section">
        <h5>Live OBS Puppet Stage (<code dir="ltr">/obs-stage/</code>)</h5>
        <div class="guide-shortcuts-grid">
          <div><kbd>1</kbd> – <kbd>0</kbd><span>Switch live emotion (Neutral, Happy, Angry, Smug, Shocked…)</span></div>
          <div><kbd>Q</kbd> – <kbd>O</kbd><span>Trigger live gesture (Point, Shrug, Facepalm, Clap, Salute…)</span></div>
          <div><kbd>Space</kbd><span>Push-to-Talk hold (when PTT is ON)</span></div>
          <div><kbd>H</kbd><span>Show / Hide Operator HUD & Loudness meter</span></div>
          <div><kbd>D</kbd><span>Show / Hide Puppet Debug Overlay (springs & pivots)</span></div>
        </div>
      </div>
    `;
  }
  return `
    <div class="guide-section">
      <h5>کلیدهای میانبر ویرایشگر (<code dir="ltr">/editor/</code>)</h5>
      <div class="guide-shortcuts-grid">
        <div><kbd>Ctrl + S</kbd><span>ذخیره فایل video.yaml</span></div>
        <div><kbd>Ctrl + Z</kbd><span>برگشت به مرحله قبل (Undo)</span></div>
        <div><kbd>Ctrl + Shift + Z</kbd><span>بازگشت به جلو (Redo)</span></div>
        <div><kbd>Space</kbd><span>پخش / توقف پیش‌نمایش</span></div>
        <div><kbd>Esc</kbd><span>بستن پنجره‌ها / لغو انتخاب مختصات</span></div>
      </div>
    </div>
    <div class="guide-section">
      <h5>کلیدهای کنسول OBS و تله‌پرامپتر (<code dir="ltr">/obs/</code>)</h5>
      <div class="guide-shortcuts-grid">
        <div><kbd>PageDown</kbd> / <kbd>←</kbd><span>مرحله بعد (پرامپتر + ارسال زنده به OBS)</span></div>
        <div><kbd>PageUp</kbd> / <kbd>→</kbd><span>مرحله قبل</span></div>
        <div><kbd>Space</kbd><span>شروع / توقف اسکرول خودکار متن</span></div>
        <div><kbd>↑</kbd> / <kbd>↓</kbd><span>کم و زیاد کردن سرعت اسکرول</span></div>
        <div><kbd>F</kbd><span>حالت تمرکز (پرامپتر تمام‌عرض)</span></div>
        <div><kbd>M</kbd><span>آینه افقی برای شیشه تله‌پرامپتر</span></div>
        <div><kbd>F9</kbd><span>پرش به ابتدای پرده فعلی</span></div>
      </div>
    </div>
    <div class="guide-section">
      <h5>کلیدهای زندهٔ عروسک در OBS Stage (<code dir="ltr">/obs-stage/</code>)</h5>
      <div class="guide-shortcuts-grid">
        <div><kbd>1</kbd> تا <kbd>0</kbd><span>تغییر لحظه‌ای احساس عروسک (خوشحال، عصبانی، مغرور، شوکه...)</span></div>
        <div><kbd>Q</kbd> تا <kbd>O</kbd><span>اجرای ژست زنده (اشاره، شانه بالا انداختن، تشویق، احترام...)</span></div>
        <div><kbd>Space</kbd><span>نگه داشتن برای صحبت (وقتی PTT روشن باشد)</span></div>
        <div><kbd>H</kbd><span>نمایش / مخفی کردن HUD کنترل زنده و نوار بلندی صدا</span></div>
        <div><kbd>D</kbd><span>نمایش / مخفی کردن لایه دیباگ فنرها و پیوت‌ها</span></div>
      </div>
    </div>
  `;
}

export function createStudioGuideModal(options = {}) {
  let activeTab = options.defaultTab || "quickstart";
  let backdrop = document.getElementById("studioGuideModal");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.id = "studioGuideModal";
    backdrop.className = "modal-backdrop hidden";
    backdrop.setAttribute("role", "dialog");
    backdrop.setAttribute("aria-modal", "true");
    backdrop.setAttribute("aria-labelledby", "studioGuideTitle");
    backdrop.innerHTML = `
      <div class="modal-card modal-xl guide-modal-card">
        <div class="modal-head">
          <h3 id="studioGuideTitle">📖 راهنمای کامل خرده‌گیر استودیو و OBS</h3>
          <button id="btnCloseStudioGuide" type="button" class="btn btn-sm btn-ghost">بستن</button>
        </div>
        <div id="studioGuideTabs" class="guide-tabs" role="tablist"></div>
        <div id="studioGuideBody" class="guide-body"></div>
        <div class="modal-actions between guide-footer">
          <span id="studioGuideTip" class="muted-hint">همهٔ بخش‌های این استودیو ۱۰۰٪ آفلاین و روی سیستم خودتان اجرا می‌شوند.</span>
          <button id="btnDoneStudioGuide" type="button" class="btn btn-primary">متوجه شدم ✓</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
  }

  const titleEl = backdrop.querySelector("#studioGuideTitle");
  const tabsEl = backdrop.querySelector("#studioGuideTabs");
  const bodyEl = backdrop.querySelector("#studioGuideBody");
  const tipEl = backdrop.querySelector("#studioGuideTip");
  const closeBtn = backdrop.querySelector("#btnCloseStudioGuide");
  const doneBtn = backdrop.querySelector("#btnDoneStudioGuide");

  function currentLang() {
    return typeof options.getLang === "function" ? options.getLang() : (document.documentElement.lang === "en" ? "en" : "fa");
  }

  function currentProject() {
    return typeof options.getProjectName === "function" ? options.getProjectName() : "default";
  }

  function render() {
    const lang = currentLang();
    const isEn = lang === "en";
    const proj = currentProject();

    if (titleEl) titleEl.textContent = isEn ? "📖 Khordegir Studio & OBS Complete Guide" : "📖 راهنمای کامل خرده‌گیر استودیو و OBS";
    if (closeBtn) closeBtn.textContent = isEn ? "Close" : "بستن";
    if (doneBtn) doneBtn.textContent = isEn ? "Got it ✓" : "متوجه شدم ✓";
    if (tipEl) {
      tipEl.textContent = isEn
        ? "Everything runs 100% offline on 127.0.0.1 — your projects stay in video.yaml."
        : "تمام امکانات استودیو ۱۰۰٪ آفلاین روی سیستم شما اجرا می‌شوند و پروژه در video.yaml ذخیره می‌شود.";
    }

    tabsEl.innerHTML = "";
    GUIDE_TABS.forEach((t) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.role = "tab";
      btn.className = "guide-tab-btn" + (t.id === activeTab ? " active" : "");
      btn.setAttribute("aria-selected", t.id === activeTab ? "true" : "false");
      btn.dataset.guideTab = t.id;
      btn.textContent = isEn ? t.en : t.fa;
      btn.addEventListener("click", () => {
        activeTab = t.id;
        render();
      });
      tabsEl.appendChild(btn);
    });

    bodyEl.innerHTML = renderTabBody(activeTab, lang, proj);

    bodyEl.querySelectorAll("[data-copy-url]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const url = btn.getAttribute("data-copy-url") || "";
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(url);
          } else {
            const inp = btn.parentElement && btn.parentElement.querySelector("input");
            if (inp) { inp.select(); document.execCommand("copy"); }
          }
          const orig = btn.textContent;
          btn.textContent = isEn ? "Copied ✓" : "کپی شد ✓";
          setTimeout(() => { btn.textContent = orig; }, 1600);
        } catch (_) {
          const inp = btn.parentElement && btn.parentElement.querySelector("input");
          if (inp) inp.select();
        }
      });
    });
  }

  function open(tabId = null) {
    if (tabId && GUIDE_TABS.some((t) => t.id === tabId)) activeTab = tabId;
    render();
    backdrop.classList.remove("hidden");
  }

  function close() {
    backdrop.classList.add("hidden");
  }

  closeBtn.addEventListener("click", close);
  doneBtn.addEventListener("click", close);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !backdrop.classList.contains("hidden")) close();
  });

  return { open, close, render };
}
