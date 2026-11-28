"""Script-with-markers -> video.yaml.

Plain script text. Paragraphs (separated by a blank line or a line '---') become teleprompter steps.
A marker line in [ ] starts a new slide; the paragraphs after it are spoken over that slide.

  [عنوان | پول می‌دی یا به *پلیس* زنگ می‌زنی؟ | زیرعنوان]
  [عدد ۸۰٪ | شرکت‌هایی که باج دادند دوباره هدف حمله شدند]
  [تصویر italy.jpg | ایتالیا، ۱۹۶۹ تا ۱۹۹۱ | متن کوچک]
  [عکس کامل map.png | عنوان]
  [نمودار میله‌ای | عنوان | با تنبیه ۱۳، بدون تنبیه ۴]
  [نمودار خطی | عنوان | با تنبیه: 13,15,17 ; بدون تنبیه: 10,8,3]
  [مقایسه | عنوان | ۸ قبل ; ۱۶ با جریمه ; ۱۹ بعد]
  [جمله | هر رفتاری که پاداشش بدی، | بیشتر می‌شه]
  [فهرست | عنوان | مورد اول ; مورد دوم ; مورد سوم]
  [گفتگو | او: کار پنج دقیقه‌ست! ; من: نه ; من: باشه...]
  [کارت‌ها | مشتری ; همکار ; کارفرما]
  [بخش | عنوان بخش]
  [دوربین]
Any part can also be key=value, e.g.  [عدد ۷۹٪ | layout=SLIDE | color=danger | source=Fehr 2000]
A line starting with  >>>  is teleprompter text only (used as-is).
A line starting with  #  is a comment.
"""
import re
from pathlib import Path

FA2EN = str.maketrans("۰۱۲۳۴۵۶۷۸۹٫٬", "0123456789.,")
KIND = [
    (r"^(عنوان|title)$", "title_card"), (r"^(عدد|number|big_number)\b", "big_number"),
    (r"^(تصویر|عکس|image)(?!\s*کامل)\b", "image_text"), (r"^(عکس کامل|تصویر کامل|image_full)\b", "image_full"),
    (r"^(نمودار میله‌ای|نمودار میله ای|میله‌ای|bar)\b", "bar_chart"), (r"^(نمودار خطی|خطی|line)\b", "line_chart"),
    (r"^(مقایسه|compare)\b", "compare"), (r"^(جمله|نقل‌قول|quote)\b", "quote"), (r"^(فهرست|لیست|list)\b", "bullet_list"),
    (r"^(گفتگو|پیام|chat)\b", "chat"), (r"^(کارت‌ها|کارتها|cards)\b", "three_cards"), (r"^(اعداد|counter_grid)\b", "counter_grid"),
    (r"^(بخش|section)\b", "section_break"), (r"^(دوربین|cam)\b", "cam"), (r"^(خط زمان|timeline)\b", "timeline"),
]


def _num(s):
    m = re.search(r"([-+]?[\d۰-۹]+(?:[.٫][\d۰-۹]+)?)", s)
    return m.group(1).translate(FA2EN) if m else None


def _items(s):
    return [x.strip() for x in re.split(r"\s*[;؛]\s*", s) if x.strip()]


def parse_marker(body):
    parts = [p.strip() for p in body.split("|")]
    head = parts[0]
    kv = {}
    free = []
    for p in parts[1:]:
        m = re.match(r"^([A-Za-z_]+)\s*=\s*(.*)$", p)
        if m:
            kv[m.group(1)] = m.group(2)
        else:
            free.append(p)
    tpl = None
    for rx, name in KIND:
        if re.search(rx, head):
            tpl = name; head_rest = re.sub(rx, "", head).strip(); break
    if not tpl:
        tpl, head_rest = head.strip().replace("-", "_"), ""
    s = {"template": tpl}
    if tpl == "big_number":
        n = _num(head_rest) or (_num(free[0]) if free else "0")
        s["number"] = n
        suf = re.sub(r"[-+]?[\d۰-۹.,٫٬]+", "", head_rest).strip()
        if head_rest.strip().startswith("+"):
            s["prefix"] = "+"
        if suf.replace("+", ""):
            s["suffix"] = suf.replace("+", "").strip()
        if free: s["caption"] = free[0]
        if len(free) > 1: s["detail"] = free[1]
    elif tpl in ("image_text", "image_full"):
        s["image"] = head_rest or (free.pop(0) if free else "")
        if free: s["title"] = free[0]
        if len(free) > 1: s["text"] = free[1]
    elif tpl == "title_card":
        if free: s["title"] = free[0]
        if len(free) > 1: s["subtitle"] = free[1]
    elif tpl == "bar_chart":
        data_part = free[-1] if free else ""
        if len(free) > 1: s["title"] = free[0]
        data = []
        for it in re.split(r"\s*[,،;؛]\s*", data_part):
            if not it.strip():
                continue
            n = _num(it)
            label = re.sub(r"[-+]?[\d۰-۹]+(?:[.٫][\d۰-۹]+)?\s*[٪%]?", "", it).strip()
            if "٪" in it or "%" in it:
                s["suffix"] = "٪"
            data.append({"label": label or it, "value": float(n) if n and "." in n else int(n or 0)})
        s["data"] = data
    elif tpl == "line_chart":
        if len(free) > 1: s["title"] = free[0]
        ser = free[-1] if free else ""
        s["series"] = "\n".join(_items(ser))
    elif tpl == "compare":
        if len(free) > 1: s["title"] = free[0]
        steps = []
        for it in _items(free[-1] if free else ""):
            n = _num(it)
            steps.append({"value": n, "label": re.sub(r"[-+]?[\d۰-۹]+(?:[.٫][\d۰-۹]+)?", "", it).strip()})
        s["steps"] = steps
    elif tpl == "quote":
        if free: s["text"] = free[0]
        if len(free) > 1: s["highlight"] = free[1]
        if len(free) > 2: s["caption"] = free[2]
    elif tpl == "bullet_list":
        if len(free) > 1: s["title"] = free[0]
        s["items"] = _items(free[-1] if free else "")
    elif tpl == "chat":
        msgs = []
        for it in _items(free[-1] if free else ""):
            m = re.match(r"^(او|من)\s*[:：]\s*(.*)$", it)
            msgs.append({"from": m.group(1), "text": m.group(2)} if m else {"from": "او", "text": it})
        if len(free) > 1: s["title"] = free[0]
        s["messages"] = msgs
    elif tpl == "three_cards":
        s["cards"] = [{"label": x} for x in _items(free[-1] if free else head_rest)]
        if len(free) > 1: s["title"] = free[0]
    elif tpl == "section_break":
        if free: s["title"] = free[0]
        if len(free) > 1: s["subtitle"] = free[1]
    elif tpl == "timeline":
        if len(free) > 1: s["title"] = free[0]
        evs = []
        for it in _items(free[-1] if free else ""):
            d, _, t = it.partition(":")
            evs.append({"date": d.strip(), "text": t.strip()})
        s["events"] = evs
    else:
        if free: s["title"] = free[0]
    for k, v in kv.items():
        s[k] = v
    if "layout" in s:
        s["layout"] = s["layout"].upper()
    return s


def import_script(text, title="ویدیوی جدید"):
    slides, cur = [], None
    paras, buf = [], []

    def flush_para():
        nonlocal buf
        t = " ".join(x.strip() for x in buf if x.strip()).strip()
        buf = []
        if not t:
            return
        if cur is None:
            slides.append({"template": "cam", "layout": "CAM", "say": t, "_said": True})
            return
        if not cur.get("_said"):
            cur["say"] = t; cur["_said"] = True
        else:
            cur.setdefault("steps", []).append({"say": t})

    for raw in text.splitlines():
        line = raw.strip()
        if line.startswith("#"):
            continue
        if not line or line == "---":
            flush_para(); continue
        m = re.match(r"^\[(.+)\]$", line)
        if m:
            flush_para()
            cur = parse_marker(m.group(1))
            slides.append(cur)
            continue
        if line.startswith(">>>"):
            buf.append(line[3:].strip()); continue
        buf.append(line)
    flush_para()
    for s in slides:
        s.pop("_said", None)
    return {"title": title, "theme": "khordegir-dark", "images": ["img"], "slides": slides}


def to_yaml(data):
    import yaml
    head = ("# ساخته‌شده از روی متن اسکریپت با Khordegir Studio.\n"
            "# هر اسلاید با «- template:» شروع می‌شود. say = متن تله‌پرامپتر. layout: SLIDE | SCAM | CAM\n")
    return head + yaml.safe_dump(data, allow_unicode=True, sort_keys=False, width=120)
