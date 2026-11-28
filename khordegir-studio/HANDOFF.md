# HANDOFF — Khordegir Studio

Self-contained folder meant to be merged into the `ai-video-editor` repo (e.g. as `ai_video_editor/studio/` + a `slides`
subcommand calling `khordegir.cli.main`). All static assets (stage, templates, themes, fonts, GSAP, js-yaml, editor,
OBS prompter template) live **inside** the `khordegir/` package so they ship with `pip install -e`. When merging, add
package-data for `khordegir/**/*.{js,css,html,json,woff2,png,jpg,yaml}`. Python Playwright (sync API) is the renderer.
See also: [ARCHITECTURE.md](ARCHITECTURE.md) · [ROADMAP.md](ROADMAP.md) · [README-fa.md](README-fa.md).

## Status (2026-11-25)
* Working: stage + Python Playwright frame-seek renderer + ffmpeg (verified: `videos/ensaf-mehrabani/out/slides/slide-15.mp4`,
  1920×1080, 30 fps, 180 frames, H.264 yuv420p, 6.0 s; frames at 0.1/0.5/1.0/5.9 s checked: fade-in, count-up 0→80٪ in Persian
  tabular digits, mask entrance, clean final frame). Also `examples/out/public-goods.mp4` (Fehr & Gächter 2000 line chart).
* `python3 -m khordegir build videos/ensaf-mehrabani` builds all 33 slides + PDF + `steps_data.lua` (38 steps, identical
  layout/slide sequence to `slides/studio/steps.json`) + prompter from the **corrected** `script-v3-natural.md`.
  The 33 MP4s currently in `videos/ensaf-mehrabani/out/slides/` were rendered before `fx.js` existed (no variants/grain);
  only slide-15 is from the current engine. Re-run the build to refresh (~30 s per slide per core; incremental cache).
  Nothing was copied into `slides/studio/` (yaml has `copy: [mp4]`; run with `--copy-to` when wanted).
* Render speed: ~0.15–0.3 s per frame (screenshot-bound). 2 parallel workers (`--jobs`).

## Update 2026-11-28 — bilingual engine (RTL + LTR) + 9 new templates (product development, not video-specific)
* **Themes are now direction-aware.** A theme may set `dir: "ltr"`, `lang`, `digits: "latin"|"persian"` and `font: {family, body, faces:[{family,file,weight}]}`.
  `Stage.useTheme` switches `#stage` direction, `<html dir/lang>`, fonts and number formatting (`Stage.fmt` → `1,234.5` in LTR, `۱٬۲۳۴٫۵` in RTL).
  `S.rich` has an LTR path (markup only; Persian runs inside English are isolated). Default theme is still `khordegir-dark`
  regardless of file order (`window.DEFAULT_THEME` overrides).
* **New theme `english-convey`** (themes/english-convey.js): brand red `#F2333B` on near-black `#0B0E14` (from the English Convey eagle logo),
  Montserrat (headings/numbers) + Inter (body) bundled as woff2 in `fonts/` (SIL OFL 1.1, see fonts/OFL.txt), `motion.word` role for kinetic text.
* **Direction helpers in the build API:** `A.ltr`, `A.dir`, `A.start`/`A.end` (CSS side where reading starts/ends), `A.originStart`
  (transform-origin "grow from reading start"), `A.sign` (×x-offset), `A.mx(x,w)` (mirror an RTL-designed x). fx.js "slide"/"mask"
  entrances now come from the reading start in both directions. Existing templates title_card, big_number, quote, section_break, timeline
  were patched to use them (no visual change in RTL).
* **Bug fixed in `A.fit`:** it measured children with `offsetTop`, which is relative to the nearest *positioned* ancestor, so text inside a
  non-positioned box was always shrunk to the minimum scale. Now measured relative to the box with `getBoundingClientRect`.
  (`stage.css` also makes `.card` inside `.col`/cards flow with `position:relative`.)
* **9 new templates** (designed with Gemini 4 Hydrogen in AI Studio, integrated/fixed/tested here): `kinetic_text`, `quote_card`, `study_card`,
  `split_compare`, `stat_bars`, `lower_third`, `punch_in`, `chapter_card`, `doc_highlight`. Each has `schema.json` with an English `example`
  and a Persian `example_fa`, `template.js`, `preview.png` (Persian theme) and `preview-en.png` (english-convey theme).
  All were test-rendered in both themes × both layouts (SCAM/SLIDE): no console errors, nothing in the camera box, no off-stage text.
* **Gallery is bilingual:** `python3 -m khordegir gallery` now renders `example_fa` (or `example`) with the default theme → `gallery/gallery.png`,
  and every template whose `example` is English with `english-convey` → `gallery/gallery-en.png` + `templates/<name>/preview-en.png`.
* Use an LTR theme per video with `theme: english-convey` in `video.yaml` (example: `videos/english-convey-video1/`).

## File layout
```
khordegir-studio/
  build.sh, khordegir-studio.desktop     double-click build (Persian prompts/errors)
  requirements.txt, .gitignore           (out/, node_modules/, caches)
  videos/<name>/video.yaml (+ img/, out/) one folder per video; ensaf-mehrabani = real worked example, _new-video = starter
  examples/public-goods.json             standalone chart spec example (render command)
  khordegir/
    cli.py project.py render.py index.py outputs.py importer.py gallery.py
    stage/   stage.html core.js charts.js fx.js template-lib.js stage.css
    templates/<name>/{schema.json, template.js, [template.css], preview.png}  + _index.js (generated)
    themes/  khordegir-dark.js + _list.js (generated)
    fonts/   Vazirmatn Regular/Bold/Black .woff2      vendor/ gsap.min.js (3.15.1, GSAP standard no-charge license), js-yaml.min.js (MIT)
    editor/  index.html editor.css importer.js editor.js(stub)
    obs/prompter_template.html   starter/video.yaml   gallery/{GALLERY.md, gallery.png, samples/}
```

## Template contract (drop-in folder)
`templates/<name>/schema.json`
```json
{ "name": "big_number", "label": "عدد بزرگ", "description": "…", "category": "عدد", "order": 20, "version": 1,
  "aliases": ["big-number", "عدد"],
  "fields": [ {"key": "number", "label": "عدد", "type": "text", "required": true},
              {"key": "color", "label": "رنگ", "type": "select", "options": [["accent","زرد"],["danger","قرمز"]], "default": "accent"} ],
  "example": { "number": "80", "suffix": "٪", "layout": "SCAM" } }
```
Field types used: `text, textarea, number, select(options), image, list (one per line), table(columns), series`.
`templates/<name>/template.js`
```js
Stage.template({ name: "big_number", build(s, A) { /* s = slide fields; A = API */ } });
```
After adding a folder run any command (or `python3 -m khordegir index`) to regenerate `_index.js`; `gallery` makes `preview.png`.
External folders: `KHORDEGIR_TEMPLATES=/a:/b`.

### Build API `A` (core.js)
* geometry: `A.W/H`, `A.L` (theme layout), `A.scam`, `A.area {x,y,w,h,left,right,bottom,camTop}` — in SCAM `area.left`=650 keeps the camera box `[24,740,584,1055]` empty.
* DOM: `A.el(tag, cls, parent, style)`, `A.box(...)`, `A.text(parent, str, role, cls, style)` (markup `*accent* ~danger~ _muted_ ==highlight== __underline__`, Persian digits, Latin runs isolated LTR), `A.fit(box, minScale)` auto-shrinks text.
* motion: `A.enter(el, role, i, extra, over)` roles: `eyebrow title body card bubble badge image note` (timings from theme.motion; variant from fx.js); `A.at(role,i)`; `A.count(el,{to,from,prefix,suffix,decimals,at,dur})`; `A.image(parent, src, x,y,w,h, {motion,fit,border,dim,radius})` (frame reveal + Ken Burns on `Stage.amb`); `A.draw(svgPath, at, dur)`, `A.pop(el)`, `A.svg/A.svgEl`.
* charts: `Stage.chart(A, box, spec, t0)` → `Stage.charts.{bar,hbar,line,counter,compare}`; add a type by assigning `Stage.charts.<type> = (A, box, spec, t0) => {...}` (e.g. inside a template.js).
* shared helpers: `Stage.T.header/data/list/pairs/series/lineSpec/tone` (template-lib.js).
* Stage-level extras applied to every slide: `source`, `note`, `background {image, dim, color}`, `duration`, `glow:false`.

## Motion grammar (enforced by API usage)
* Entrances only: text/cards/bars/lines tween in once (≤ ~1.2 s, counters 1.15 s, bars 0.65 s, lines 1.2 s) and then **never move/scale**.
* Only images inside frames (Ken Burns linear 1→1.055, x 0→−14 px over 20 s, or zoom-out/pan) and background layers (glow sine 12 s, dust, grain, leak, depth backdrop) keep moving.
* Easing: power4.out (0.16,1,0.3,1) entrances; power3.out (0.22,1,0.36,1) counters/charts; back.out(1.2) bubbles/badges.
* Accent #FFD600 = key/positive only; #E53935 = negative only (red text bold ≥28 px, `.dng` uses #FF5252).

## Seeded variant / atmosphere hooks (fx.js) — implemented minimally
* `Stage.fx.setup(slide)` picks per slide from seed `"<video-folder>:<slide-no>"` + `slide.seed`: `variant` (rise|slide|mask|blur|scale), image `motion` (breathe|zoom-out|pan-left|pan-right|depth), glow position, `leak`, `dust`, `accentFx`. Slide overrides: `variant`, `motion`, `seed`, `fx:{leak,dust,grain,accent}`. Theme defaults: `theme.fx`.
* `FX.from(role, m)` returns entrance from-vars per variant; `FX.atmosphere`, `FX.grain`, `FX.depth`, `FX.post` (highlighter/underline sweeps), `FX.cue` (sound cues → `out/sound_cues.json|txt`).
* Live-background library, "alive" image mode and OBS loop export are **not** implemented (see TODO).

## TODO (everything requested, not done)
1. **Template catalog** (waiting for Gemini catalog): maps (world/Iran/Europe choropleth, pins, routes, city dots), all chart types (stacked/grouped bar, area, pie/donut, scatter, histogram, waterfall, slope, dumbbell, funnel, gauge, sparkline, heatmap, sankey, waffle/pictogram, tree-map), curves & math (functions, distributions, before/after curves), diagrams (flowchart, cycle, venn, pyramid, matrix 2×2, mind-map, timeline vertical, process steps, decision tree), shapes/annotations (arrows, callouts, circles on images, zoom-in loupe), documents (paper/headline/tweet/news/article/receipt/contract mockups with highlight), people (quote card with portrait, lower-third, versus card), checklists/scorecards. Each = one folder.
2. **Variants**: per-template variant sets beyond the global 5 entrance styles; idle variants; verify every variant × template visually (gallery matrix).
3. **Alive images**: seeded in-place drift/rotation ±0.5°, float, parallax layers (`A.image(..., {alive:true})`).
4. **Live backgrounds**: `background: bokeh|dust|aurora|mesh|rays|grid|flowfield|shapes|orbs|random`, dark, dimmed under text areas, seeded/time-based; `khordegir bg <name> --loop 10` → seamless loop MP4 for OBS (make all ambient tweens periodic over the loop length).
5. **Editor** (`editor/index.html`): gallery modal, schema-driven Persian forms (table/list/image pickers), drag reorder, theme dropdown, live iframe preview (bridge already in core.js: `postMessage({cmd:'load', slide, theme, camGuide})`), YAML load/save via js-yaml, script importer UI (importer.js done), blob-URL image mapping. Currently a stub that previews template examples.
6. **Importer**: `---` separators and `>>>` lines done; add `[قالب | key=value]` for every new template; round-trip tests.
7. **OBS integration**: copy rules in yaml (`studio`, `copy`), MP4 + PNG fallback already supported by hark_studio.lua; add audio cue track export (WAV with ticks/whooshes from `sound_cues.json`).
8. Performance: screenshot-bound (~0.2 s/frame). Options: CDP `Page.captureScreenshot` with `optimizeForSpeed`, hold-frame reuse when nothing ambient moves, lower-res ambient layers.
9. Tests: pytest for project/importer/index; golden-frame tests for templates.
10. Retired: the earlier Pillow prototype in `../chart-animator/` (kept only because `slides/studio/layers/slide-12.json` references its `specs/slide-12.json`).
