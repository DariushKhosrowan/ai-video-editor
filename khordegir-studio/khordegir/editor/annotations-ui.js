/**
 * Viral YouTuber Annotations, Arrows & Callout Boxes UI (/editor/annotations-ui.js)
 * Lets creators add curved/straight SVG arrows, floating callout boxes, highlight rings,
 * and spotlights with direct click-to-place on the preview stage canvas.
 */
const FA = "۰۱۲۳۴۵۶۷۸۹";
const fa = (v) => String(v ?? "").replace(/[0-9]/g, (d) => FA[+d]);

const ANN_TYPES = [
  { id: "arrow-curved", label: "فلش خمیده وایرال (Curved Arrow)" },
  { id: "arrow-straight", label: "فلش مستقیم (Straight Arrow)" },
  { id: "callout-box", label: "باکس توضیح و نکته (Callout Box)" },
  { id: "highlight-ring", label: "حلقهٔ تأکید (Highlight Ring)" },
  { id: "spotlight", label: "نور متمرکز (Spotlight)" },
];

const COLOR_OPTS = [
  { id: "accent", label: "رنگ تاکیدی تم (طلایی)" },
  { id: "danger", label: "قرمز هشدار" },
  { id: "#38bdf8", label: "آبی فیروزه‌ای" },
  { id: "#10b981", label: "سبز زمردی" },
  { id: "#ffffff", label: "سفید خالص" },
];

export function renderAnnotationsTab({ container, slide, onChange, startPickTarget }) {
  container.innerHTML = "";
  if (!slide) {
    container.innerHTML = '<div class="empty-state">اسلایدی انتخاب نشده است.</div>';
    return;
  }

  if (!Array.isArray(slide.annotations)) slide.annotations = [];
  const list = slide.annotations;

  const headSec = document.createElement("div");
  headSec.className = "inspector-section";
  headSec.innerHTML = `
    <div class="section-title">
      <span>فلش‌ها، باکس توضیح و تأکید بصری</span>
      <span class="bilingual-sub">Viral Callouts</span>
    </div>
    <p class="panel-hint">
      با ابزارهای زیر مثل کانال‌های تحلیلی یوتیوب روی هر بخش از صحنه فلش، حلقه یا توضیح اضافه کنید. می‌توانید از دکمهٔ «تعیین روی بوم» برای کلیک مستقیم روی تصویر استفاده کنید.
    </p>
  `;

  const quickRow = document.createElement("div");
  quickRow.className = "btn-row-wrap";
  [
    { type: "arrow-curved", label: "+ فلش خمیده" },
    { type: "callout-box", label: "+ باکس توضیح" },
    { type: "highlight-ring", label: "+ حلقه تأکید" },
    { type: "spotlight", label: "+ نور متمرکز" },
  ].forEach((q) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-sm btn-amber";
    btn.textContent = q.label;
    btn.addEventListener("click", () => {
      const item = {
        type: q.type,
        color: "accent",
        at: 0.75,
        x1: 1260,
        y1: 480,
        x2: 860,
        y2: 340,
        label: q.type === "callout-box" ? "نکتهٔ کلیدی!" : q.type === "arrow-curved" ? "اینجا را ببینید" : "",
        rx: 150,
        ry: 78,
        radius: 260,
        strokeWidth: 6,
      };
      list.push(item);
      onChange({ reload: true, autoPlay: true });
      renderAnnotationsTab({ container, slide, onChange, startPickTarget });
    });
    quickRow.appendChild(btn);
  });
  headSec.appendChild(quickRow);
  container.appendChild(headSec);

  if (!list.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "هنوز فلش یا باکس توضیحی برای این اسلاید ثبت نشده است.";
    container.appendChild(empty);
    return;
  }

  list.forEach((ann, idx) => {
    const card = document.createElement("div");
    card.className = "inspector-section";

    const titleBar = document.createElement("div");
    titleBar.className = "section-title";
    titleBar.innerHTML = `<span>اشاره‌گر ${fa(idx + 1)}</span>`;
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "icon-btn danger";
    delBtn.textContent = "حذف";
    delBtn.addEventListener("click", () => {
      list.splice(idx, 1);
      onChange({ reload: true, autoPlay: false });
      renderAnnotationsTab({ container, slide, onChange, startPickTarget });
    });
    titleBar.appendChild(delBtn);
    card.appendChild(titleBar);

    // Type + color
    const row2 = document.createElement("div");
    row2.className = "style-grid";

    const typeGrp = document.createElement("label");
    typeGrp.className = "field-group";
    typeGrp.innerHTML = `<span>نوع ابزار</span>`;
    const typeSel = document.createElement("select");
    typeSel.className = "select-ctrl compact";
    ANN_TYPES.forEach((t) => {
      const o = document.createElement("option");
      o.value = t.id;
      o.textContent = t.label;
      typeSel.appendChild(o);
    });
    typeSel.value = ann.type || "arrow-curved";
    typeSel.addEventListener("change", () => {
      ann.type = typeSel.value;
      onChange({ reload: true, autoPlay: true });
      renderAnnotationsTab({ container, slide, onChange, startPickTarget });
    });
    typeGrp.appendChild(typeSel);

    const colGrp = document.createElement("label");
    colGrp.className = "field-group";
    colGrp.innerHTML = `<span>رنگ</span>`;
    const colSel = document.createElement("select");
    colSel.className = "select-ctrl compact";
    COLOR_OPTS.forEach((c) => {
      const o = document.createElement("option");
      o.value = c.id;
      o.textContent = c.label;
      colSel.appendChild(o);
    });
    colSel.value = ann.color || "accent";
    colSel.addEventListener("change", () => {
      ann.color = colSel.value;
      onChange({ reload: true, autoPlay: false });
    });
    colGrp.appendChild(colSel);

    row2.append(typeGrp, colGrp);
    card.appendChild(row2);

    // Label input
    if (ann.type !== "spotlight") {
      const lblGrp = document.createElement("label");
      lblGrp.className = "field-group";
      lblGrp.innerHTML = `<span>متن توضیح روی بوم (اختیاری)</span>`;
      const lblInp = document.createElement("input");
      lblInp.type = "text";
      lblInp.className = "text-input";
      lblInp.value = ann.label || "";
      lblInp.placeholder = "مثال: نقطهٔ عطف ماجرا";
      lblInp.addEventListener("input", () => {
        ann.label = lblInp.value;
        onChange({ reload: false, autoPlay: false, debouncedReload: true });
      });
      lblGrp.appendChild(lblInp);
      card.appendChild(lblGrp);
    }

    // Coordinates + Canvas Picker
    const coordGrid = document.createElement("div");
    coordGrid.className = "override-grid";
    const mkCoord = (lbl, key, max) => {
      const w = document.createElement("label");
      w.textContent = lbl;
      const inp = document.createElement("input");
      inp.type = "number";
      inp.dir = "ltr";
      inp.step = "20";
      inp.min = key === "strokeWidth" ? "2" : "0";
      inp.max = String(max);
      inp.value = String(Math.round(Number(ann[key] ?? (key === "strokeWidth" ? 6 : 0))));
      inp.addEventListener("input", () => {
        ann[key] = Number(inp.value) || 0;
        onChange({ reload: false, autoPlay: false, debouncedReload: true });
      });
      w.appendChild(inp);
      return w;
    };

    const isArrow = !ann.type || ann.type.startsWith("arrow");
    coordGrid.appendChild(mkCoord(isArrow ? "شروع X" : "مرکز X", "x1", 1920));
    coordGrid.appendChild(mkCoord(isArrow ? "شروع Y" : "مرکز Y", "y1", 1080));
    coordGrid.appendChild(mkCoord("زمان ورود (s)", "at", 20));
    if (isArrow) {
      coordGrid.appendChild(mkCoord("نوک X", "x2", 1920));
      coordGrid.appendChild(mkCoord("نوک Y", "y2", 1080));
      coordGrid.appendChild(mkCoord("ضخامت", "strokeWidth", 24));
    } else if (ann.type === "highlight-ring") {
      coordGrid.appendChild(mkCoord("شعاع افقی", "rx", 600));
      coordGrid.appendChild(mkCoord("شعاع عمودی", "ry", 400));
    } else if (ann.type === "spotlight") {
      coordGrid.appendChild(mkCoord("شعاع نور", "radius", 800));
    }
    card.appendChild(coordGrid);

    const pickRow = document.createElement("div");
    pickRow.className = "btn-row-wrap";
    if (startPickTarget) {
      const pickStart = document.createElement("button");
      pickStart.type = "button";
      pickStart.className = "btn btn-sm btn-ghost";
      pickStart.textContent = isArrow ? "🎯 کلیک نقطهٔ شروع روی بوم" : "🎯 کلیک مرکز روی بوم";
      pickStart.addEventListener("click", () => {
        startPickTarget((x, y) => {
          ann.x1 = x;
          ann.y1 = y;
          onChange({ reload: true, autoPlay: false });
          renderAnnotationsTab({ container, slide, onChange, startPickTarget });
        });
      });
      pickRow.appendChild(pickStart);

      if (isArrow) {
        const pickEnd = document.createElement("button");
        pickEnd.type = "button";
        pickEnd.className = "btn btn-sm btn-ghost";
        pickEnd.textContent = "🎯 کلیک نوک فلش روی بوم";
        pickEnd.addEventListener("click", () => {
          startPickTarget((x, y) => {
            ann.x2 = x;
            ann.y2 = y;
            onChange({ reload: true, autoPlay: false });
            renderAnnotationsTab({ container, slide, onChange, startPickTarget });
          });
        });
        pickRow.appendChild(pickEnd);
      }
    }
    card.appendChild(pickRow);
    container.appendChild(card);
  });
}
