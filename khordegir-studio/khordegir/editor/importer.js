/* Script-with-markers -> slides (same rules as khordegir/importer.py). */
(function () {
  const FA2EN = (s) => String(s).replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/٫/g, ".");
  const num = (s) => { const m = String(s).match(/([-+]?[\d۰-۹]+(?:[.٫][\d۰-۹]+)?)/); return m ? FA2EN(m[1]) : null; };
  const items = (s) => String(s || "").split(/\s*[;؛]\s*/).map((x) => x.trim()).filter(Boolean);
  const KIND = [
    [/^(عنوان|title)$/, "title_card"], [/^(عدد|number|big_number)(?=\s|$)/, "big_number"],
    [/^(عکس کامل|تصویر کامل|image_full)(?=\s|$)/, "image_full"], [/^(تصویر|عکس|image)(?=\s|$)/, "image_text"],
    [/^(نمودار میله‌ای|نمودار میله ای|میله‌ای|bar)(?=\s|$)/, "bar_chart"], [/^(نمودار خطی|خطی|line)(?=\s|$)/, "line_chart"],
    [/^(مقایسه|compare)(?=\s|$)/, "compare"], [/^(جمله|نقل‌قول|quote)(?=\s|$)/, "quote"], [/^(فهرست|لیست|list)(?=\s|$)/, "bullet_list"],
    [/^(گفتگو|پیام|chat)(?=\s|$)/, "chat"], [/^(کارت‌ها|کارتها|cards)(?=\s|$)/, "three_cards"], [/^(اعداد|counter_grid)(?=\s|$)/, "counter_grid"],
    [/^(بخش|section)(?=\s|$)/, "section_break"], [/^(دوربین|cam)(?=\s|$)/, "cam"], [/^(خط زمان|timeline)(?=\s|$)/, "timeline"],
  ];
  function marker(body) {
    const parts = body.split("|").map((p) => p.trim());
    const head = parts[0]; const kv = {}; const free = [];
    parts.slice(1).forEach((p) => { const m = p.match(/^([A-Za-z_]+)\s*=\s*(.*)$/); if (m) kv[m[1]] = m[2]; else free.push(p); });
    let tpl = null, rest = "";
    for (const [rx, name] of KIND) if (rx.test(head)) { tpl = name; rest = head.replace(rx, "").trim(); break; }
    if (!tpl) { tpl = head.trim().replace(/-/g, "_"); }
    const s = { template: tpl };
    const last = free.length ? free[free.length - 1] : "";
    if (tpl === "big_number") {
      s.number = num(rest) || (free[0] ? num(free[0]) : "0");
      if (rest.trim().startsWith("+")) s.prefix = "+";
      const suf = rest.replace(/[-+]?[\d۰-۹.,٫٬]+/g, "").replace("+", "").trim(); if (suf) s.suffix = suf;
      if (free[0]) s.caption = free[0]; if (free[1]) s.detail = free[1];
    } else if (tpl === "image_text" || tpl === "image_full") {
      s.image = rest || free.shift() || ""; if (free[0]) s.title = free[0]; if (free[1]) s.text = free[1];
    } else if (tpl === "title_card") { if (free[0]) s.title = free[0]; if (free[1]) s.subtitle = free[1]; }
    else if (tpl === "bar_chart") {
      if (free.length > 1) s.title = free[0];
      s.data = last.split(/\s*[,،;؛]\s*/).filter((x) => x.trim()).map((it) => {
        if (/[٪%]/.test(it)) s.suffix = "٪";
        const n = num(it); return { label: it.replace(/[-+]?[\d۰-۹]+(?:[.٫][\d۰-۹]+)?\s*[٪%]?/, "").trim() || it, value: n ? +n : 0 };
      });
    } else if (tpl === "line_chart") { if (free.length > 1) s.title = free[0]; s.series = items(last).join("\n"); }
    else if (tpl === "compare") { if (free.length > 1) s.title = free[0]; s.steps = items(last).map((it) => ({ value: num(it), label: it.replace(/[-+]?[\d۰-۹]+(?:[.٫][\d۰-۹]+)?/, "").trim() })); }
    else if (tpl === "quote") { if (free[0]) s.text = free[0]; if (free[1]) s.highlight = free[1]; if (free[2]) s.caption = free[2]; }
    else if (tpl === "bullet_list") { if (free.length > 1) s.title = free[0]; s.items = items(last); }
    else if (tpl === "chat") { if (free.length > 1) s.title = free[0]; s.messages = items(last).map((it) => { const m = it.match(/^(او|من)\s*[:：]\s*(.*)$/); return m ? { from: m[1], text: m[2] } : { from: "او", text: it }; }); }
    else if (tpl === "three_cards") { if (free.length > 1) s.title = free[0]; s.cards = items(last || rest).map((x) => ({ label: x })); }
    else if (tpl === "section_break") { if (free[0]) s.title = free[0]; if (free[1]) s.subtitle = free[1]; }
    else if (tpl === "timeline") { if (free.length > 1) s.title = free[0]; s.events = items(last).map((it) => { const [d, ...t] = it.split(":"); return { date: d.trim(), text: t.join(":").trim() }; }); }
    else if (free[0]) s.title = free[0];
    Object.assign(s, kv);
    if (s.layout) s.layout = s.layout.toUpperCase();
    if (tpl === "cam") s.layout = "CAM";
    return s;
  }
  window.importScript = function (text) {
    const slides = []; let cur = null, buf = [];
    const flush = () => {
      const t = buf.map((x) => x.trim()).filter(Boolean).join(" ").trim(); buf = [];
      if (!t) return;
      if (!cur) { slides.push({ template: "cam", layout: "CAM", say: t }); return; }
      if (!cur._said) { cur.say = t; cur._said = true; } else (cur.steps = cur.steps || []).push({ say: t });
    };
    text.split(/\r?\n/).forEach((raw) => {
      const line = raw.trim();
      if (line.startsWith("#")) return;
      if (!line || line === "---") { flush(); return; }
      const m = line.match(/^\[(.+)\]$/);
      if (m) { flush(); cur = marker(m[1]); slides.push(cur); return; }
      buf.push(line.startsWith(">>>") ? line.slice(3) : line);
    });
    flush();
    slides.forEach((s) => delete s._said);
    return slides;
  };
})();
