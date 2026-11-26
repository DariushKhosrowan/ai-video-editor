import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

export const YAML_CANDIDATES = ["video.yaml", "video.yml", "project.yaml", "project.json"];
export const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif"]);
const IMAGE_KEYS = new Set(["image", "src", "bg_image", "icon_image", "logo"]);
const CHART_SLIDE = new Set(["bar_chart", "line_chart", "compare", "counter_grid", "chart", "timeline"]);

const ALIASES = {
  "title-card": "title_card", "عنوان": "title_card",
  "big-number": "big_number", "counter": "big_number", "عدد": "big_number",
  "image-text": "image_text", "تصویر": "image_text", "عکس": "image_text",
  "bar-chart": "bar_chart", "bar": "bar_chart", "نمودار میله‌ای": "bar_chart", "میله‌ای": "bar_chart",
  "list": "bullet_list", "bullets": "bullet_list", "فهرست": "bullet_list",
  "line-chart": "line_chart", "line": "line_chart", "نمودار خطی": "line_chart", "خطی": "line_chart",
  "before-after": "compare", "مقایسه": "compare",
  "counter-grid": "counter_grid", "اعداد": "counter_grid",
  "statement": "quote", "جمله": "quote", "نقل‌قول": "quote",
  "section-break": "section_break", "section": "section_break", "بخش": "section_break",
  "image-full": "image_full", "full-image": "image_full", "عکس کامل": "image_full",
  "three-cards": "three_cards", "cards": "three_cards", "کارت‌ها": "three_cards",
  "messages": "chat", "گفتگو": "chat", "پیام": "chat",
  "خط زمان": "timeline",
  "camera": "cam", "دوربین": "cam",
  "layer": "layers", "لایه": "layers",
  "guest-intro": "guest_intro", "معرفی مهمان": "guest_intro", "مهمان": "guest_intro",
  "podcast-question": "podcast_question", "سؤال مخاطب": "podcast_question", "پرسش": "podcast_question",
  "podcast-end": "podcast_end", "پایان پادکست": "podcast_end", "پایان": "podcast_end",
};

export function findProjectYaml(projDir) {
  for (const fname of YAML_CANDIDATES) {
    const cand = path.join(projDir, fname);
    if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
      return cand;
    }
  }
  return null;
}

export function loadTemplateRegistry(pkgRoot) {
  const tplRoot = path.join(pkgRoot, "templates");
  const names = new Set();
  const aliasMap = { ...ALIASES };

  if (fs.existsSync(tplRoot) && fs.statSync(tplRoot).isDirectory()) {
    for (const entry of fs.readdirSync(tplRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
      const schemaPath = path.join(tplRoot, entry.name, "schema.json");
      if (!fs.existsSync(schemaPath)) continue;
      names.add(entry.name);
      try {
        const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
        const tName = schema.name || entry.name;
        for (const al of schema.aliases || []) {
          aliasMap[al] = tName;
        }
      } catch {
        // Ignore malformed schema
      }
    }
  }
  return { names: [...names].sort(), aliasMap };
}

export function listThemeNames(pkgRoot) {
  const themesDir = path.join(pkgRoot, "themes");
  if (!fs.existsSync(themesDir) || !fs.statSync(themesDir).isDirectory()) return [];
  return fs
    .readdirSync(themesDir)
    .filter((f) => f.endsWith(".js") && !f.startsWith("_"))
    .map((f) => path.basename(f, ".js"))
    .sort();
}

function fnv1aUtf16Le(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export class Project {
  constructor(folder, pkgRoot) {
    const resolvedFolder = path.resolve(folder);
    if (!fs.existsSync(resolvedFolder)) {
      throw new Error(`Project folder not found: ${resolvedFolder}`);
    }
    if (fs.statSync(resolvedFolder).isFile()) {
      this.yamlPath = resolvedFolder;
      this.dir = path.dirname(resolvedFolder);
    } else {
      this.dir = resolvedFolder;
      this.yamlPath = findProjectYaml(resolvedFolder);
    }

    this.pkgRoot = path.resolve(pkgRoot);
    this.warnings = [];

    if (!this.yamlPath) {
      throw new Error(`خطا: در پوشه‌ی ${this.dir} فایل video.yaml پیدا نشد.`);
    }

    const raw = fs.readFileSync(this.yamlPath, "utf-8");
    try {
      this.data = (this.yamlPath.endsWith(".json") ? JSON.parse(raw) : yaml.load(raw)) || {};
    } catch (err) {
      throw new Error(`خطا در فایل ${path.basename(this.yamlPath)}: ساختار YAML درست نیست.\n${err.message}`);
    }

    const d = this.data;
    this.title = d.title || path.basename(this.dir);
    this.seed = Number.parseInt(d.seed ?? 0, 10) || 0;

    let rawTheme = d.theme;
    const normTheme = String(rawTheme || "").trim().toLowerCase();
    if (normTheme === "random" || normTheme === "تصادفی") {
      const avail = listThemeNames(this.pkgRoot);
      if (avail.length > 0) {
        const key = `${path.basename(this.dir)}:${this.seed}:${this.title}`;
        rawTheme = avail[fnv1aUtf16Le(key) % avail.length];
      } else {
        rawTheme = null;
      }
    }
    this.theme = rawTheme;
    this.preset = d.preset;
    this.transition = d.transition;
    this.logo = d.logo;
    this.logo_motion = d.logo_motion;
    this.logo_position = d.logo_position;
    this.logo_text = d.logo_text;
    this.livingStage = d.livingStage;
    this.motionCurve = d.motionCurve;
    this.podcast = d.podcast;
    this.out = path.resolve(this.dir, d.out || "out");
    this.defaultDuration = d.duration;

    const dirs = [this.dir, ...(Array.isArray(d.images) ? d.images.map((p) => path.resolve(this.dir, String(p))) : [])];
    const searchSet = new Set();
    for (const p of dirs) searchSet.add(p);
    searchSet.add(path.join(this.dir, "img"));
    this.search = [...searchSet];

    this.slides = this._normalise(Array.isArray(d.slides) ? d.slides : []);
  }

  find(p) {
    if (!p) return null;
    const str = String(p);
    if (/^(https?:|file:|data:|blob:)/.test(str)) return str;
    if (path.isAbsolute(str) && fs.existsSync(str)) return str;
    for (const base of this.search) {
      const c1 = path.join(base, str);
      if (fs.existsSync(c1)) return path.resolve(c1);
      const c2 = path.join(base, path.basename(str));
      if (fs.existsSync(c2)) return path.resolve(c2);
    }
    return null;
  }

  _resolveImages(obj, where) {
    if (!obj || typeof obj !== "object") return;
    if (Array.isArray(obj)) {
      for (const item of obj) this._resolveImages(item, where);
      return;
    }
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "string") {
        const lower = v.toLowerCase();
        const hasImgExt = [...IMAGE_EXTS].some((ext) => lower.endsWith(ext));
        if (IMAGE_KEYS.has(k) || (hasImgExt && !["text", "title", "say"].includes(k))) {
          if (!v.trim()) continue;
          const found = this.find(v);
          if (!found) {
            this.warnings.push(`${where}: تصویر «${v}» پیدا نشد؛ به‌جایش قاب جایگزین تیره گذاشته شد.`);
          }
        }
      } else {
        this._resolveImages(v, where);
      }
    }
  }

  _normalise(rawSlides) {
    const { names: tplNames, aliasMap } = loadTemplateRegistry(this.pkgRoot);
    const tplSet = new Set(tplNames);
    const slides = [];
    let act = 1;
    let n = 0;

    for (let i = 0; i < rawSlides.length; i += 1) {
      let s = rawSlides[i];
      if (typeof s === "string") {
        s = { template: "quote", text: s };
      } else {
        s = JSON.parse(JSON.stringify(s || {}));
      }

      const rawTpl = String(s.template || s.type || ("elements" in s ? "layers" : "quote")).trim();
      const mapped = aliasMap[rawTpl] || rawTpl;
      const t = mapped.replace(/-/g, "_");
      s.template = t;

      if (tplSet.size > 0 && !tplSet.has(t)) {
        this.warnings.push(`اسلاید ${i + 1}: قالب «${t}» وجود ندارد.`);
      }

      if (s.act !== undefined && s.act !== null && s.act !== "") {
        const parsedAct = Number.parseInt(s.act, 10);
        if (!Number.isNaN(parsedAct)) act = parsedAct;
      }
      s.act = act;

      const firstLayout = String(
        s.layout || (t === "cam" ? "CAM" : CHART_SLIDE.has(t) ? "SLIDE" : "SCAM")
      ).toUpperCase();

      const steps = [
        {
          layout: firstLayout,
          say: s.say || "",
          zoom: s.zoom ?? null,
          time: s.time || "",
        },
      ];

      if (Array.isArray(s.steps)) {
        for (let st of s.steps) {
          if (typeof st === "string") st = { say: st };
          if (!st || typeof st !== "object") continue;
          steps.push({
            layout: String(st.layout || firstLayout).toUpperCase(),
            say: st.say || "",
            zoom: st.zoom ?? null,
            time: st.time || "",
          });
        }
      }
      s._steps = steps;

      if (t === "cam" || steps.every((x) => x.layout === "CAM")) {
        s._num = 0;
      } else {
        n += 1;
        s._num = Number.parseInt(s.slide_no ?? n, 10) || n;
        n = s._num;
        s.layout = String(
          s.render_layout || (steps.some((x) => x.layout === "SCAM") ? "SCAM" : "SLIDE")
        ).toUpperCase();
      }

      s._seed = `${path.basename(this.dir)}:${this.seed}:${s._num || i + 1}`;
      for (const attr of ["preset", "transition", "logo", "logo_motion", "logo_position", "logo_text", "livingStage", "motionCurve"]) {
        if (this[attr] !== undefined && s[attr] === undefined) {
          s[attr] = JSON.parse(JSON.stringify(this[attr]));
        }
      }
      if (this.defaultDuration && !s.duration) {
        s.duration = this.defaultDuration;
      }
      this._resolveImages(s, `اسلاید ${s._num || i + 1}`);
      slides.push(s);
    }

    return slides;
  }

  steps() {
    const out = [];
    let k = 0;
    for (let sIdx = 0; sIdx < this.slides.length; sIdx += 1) {
      const s = this.slides[sIdx];
      for (const st of s._steps) {
        k += 1;
        out.push({
          n: k,
          act: s.act,
          layout: st.layout,
          slide: st.layout !== "CAM" ? s._num : 0,
          slideIndex: sIdx,
          time: st.time || "",
          text: String(st.say || "").trim(),
          zoom: st.zoom,
        });
      }
    }
    return out;
  }
}
