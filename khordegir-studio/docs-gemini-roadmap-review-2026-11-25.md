# Google AI Studio — chat «نقشه راه khordegir-studio»

Chat URL: https://aistudio.google.com/prompts/1j_47val1IyPjcGk4piZPkClSv6CzlPHK
Signed in as: amirheslamy@gmail.com
Model: Gemini 4 Hydrogen (gemini-4-hydrogen) — strongest model offered without a "Paid" badge (free tier)
Settings: Thinking level = High; Grounding with Google Search = ON; URL context = ON
Attachment: review_bundle.md (12,867 tokens) uploaded via Insert files → Upload files
Run length: 29,011 tokens total

## VERBATIM MODEL ANSWER

This review is based strictly on the files printed in review_bundle.md (ROADMAP.md, ARCHITECTURE.md, HANDOFF.md, README-fa.md, the file list, and the first 150 lines of docs-gemini-template-catalog.md). Where internal source files (core.js, fx.js, render.py, project.py, importer.py, editor/*, templates/*/template.js, themes/khordegir-dark.js, build.sh) were not included verbatim, I have explicitly marked assumptions as unverified from bundle.

### 1. Hard Critique: What Is Wrong, Risky, or Missing

#### A. The Roadmap Is Backwards Relative to the Core Product Principle

Your core principle (2026-11-25) defines the product as "PowerPoint for animated YouTube explainers" for absolute beginners: open the app, type a title, pick a theme, paste a script, drag/resize text boxes, click Export—zero terminal.

Yet ROADMAP.md puts:
- Phase 1: Full template catalog (97 templates in docs-gemini-template-catalog.md)
- Phase 2: 3–5 variants per template + gallery matrix
- Phase 3: Alive images
- Phase 4: 8 live background engines
- Phase 5: No-code editor (editor/index.html)
- Phase 6: Script importer

Right now, khordegir/editor/editor.js is a stub, khordegir/themes/ has 1 theme (khordegir-dark.js), and khordegir-studio.desktop / build.sh appear to only run CLI builds. Building 97 templates and hundreds of variant combinations before building the editor guarantees you will design 97 templates without a WYSIWYG editing contract and have to rewrite all of them in Phase 5.

#### B. Zero Architectural Support for WYSIWYG Drag & Resize (x, y, scale)

The core principle requires dragging and resizing text boxes directly on the canvas and saving (x, y, scale) overrides in video.yaml. Look at ARCHITECTURE.md and HANDOFF.md:

1. No field-addressable DOM contract: Stage.template({ build(s, A) }) builds imperative DOM with A.box / A.text / A.fit. There is no registry mapping a YAML field key (e.g. title, caption) to a movable/resizable wrapper element, nor does schema.json declare which fields are canvas-editable (text/textarea) vs data-only (table, series, select).
2. GSAP transform collision: fx.js animates entrances (FX.from(role, m) for rise|slide|mask|blur|scale) using GSAP transforms (x, y, scale). If user (x, y, scale) overrides live on the same DOM element that GSAP tweens, GSAP's from()/inline transform will clobber or drift from the user's dragged position. You must separate an outer positioned/scaled wrapper (data-field-wrap="title") from an inner GSAP-animated element. (Unverified from bundle whether core.js already wraps nodes, but HANDOFF.md describes A.enter(el, ...) acting directly on created elements.)
3. SLIDE vs SCAM collision: In SCAM, A.area.left = 650 keeps [24, 740, 584, 1055] empty for the presenter's webcam. If a beginner drags a text box in SLIDE mode and later flips layout: SCAM (or drags into the webcam box), naive absolute (x, y, scale) overrides will collide with the webcam bubble unless overrides are either scoped per-layout or clamped/warned against A.area.

#### C. A Static file:// Editor Cannot Deliver "Zero Terminal, One-Click Export"

ARCHITECTURE.md runs stage/stage.html over file:// and draws editor/index.html -.save.-> video.yaml. HANDOFF.md TODO #5 plans "YAML load/save via js-yaml" and "blob-URL image mapping".

This architecture hits a brick wall for beginners:
- A file:// HTML page cannot reliably write videos/<name>/video.yaml on disk, copy dropped images into videos/<name>/img/, execute Python + Playwright + ffmpeg (render.py, outputs.py), stream render progress, or open out/.
- showDirectoryPicker() (File System Access API) is blocked or flaky on file:// origins, unsupported on Firefox/Linux consistently, and still cannot spawn ffmpeg/Playwright.
- Making beginners download a video.yaml file, move images manually, and double-click build.sh violates the core product principle. You are missing a local loopback backend (khordegir/server.py, launched by khordegir editor / khordegir-studio.desktop) serving editor/ and stage/ over http://127.0.0.1:<port> with read/write/upload/render APIs.

#### D. The 97-Template Catalog Is a Maintenance Trap and Hurts Beginner UX

docs-gemini-template-catalog.md specs 97 separate templates, and ROADMAP.md Phase 1 proposes a dedicated folder per chart family, map, diagram, and mockup.
- Even the Gemini spec contradicts your engine: in the first 150 lines alone, Gemini invented window.__SEEK__ (yours is Stage.seek), used GSAP SplitText (not in vendor/gsap.min.js), used CSS vars (--bg-base) instead of themes/*.js, and referenced Vazirmatn weights 300, 400, 500, 700, 900 (while khordegir/fonts/ only bundles Regular, Bold, Black — unverified if Regular is a variable font).
- Maintenance explosion: 97 template.js files × 2 layouts (SLIDE + SCAM) × 5+ entrance variants × N themes × WYSIWYG (x, y, scale) overrides × importer rules = thousands of broken edge cases.
- Beginner choice paralysis: A YouTuber does not want to browse 97 templates. 16 chart types should be 1 chart template with a type selector (which Stage.charts in charts.js already points toward!), not 16 folders.

#### E. Duplicate Importer Logic & Wrong Importer UX

ARCHITECTURE.md admits importer.py has a JS twin (editor/importer.js). Maintaining two parsers in two languages for marker grammars ([قالب | key=value], ---, >>>) guarantees drift. Worse, beginners will never learn a custom bracket DSL. The core principle asks to paste a raw script and auto-split into slides with suggested templates—which needs a zero-marker heuristic classifier in one canonical place (Python, exposed over local HTTP to the editor), keeping markers strictly optional.

#### F. Single Dark Theme Assumption (themes/khordegir-dark.js)

Core principle #2 promises picking from a "large theme library, or Random". Today there is 1 theme. HANDOFF.md cites hardcoded rules (#FFD600, #E53935, .dng #FF5252, glow, grain, dark dimmed backgrounds). Without auditing stage.css, charts.js, fx.js, and all 17 templates to use semantic theme tokens (bg, surface, text, muted, accent, danger, isDark), adding light or colorful themes will immediately produce unreadable text and broken contrast. (Unverified from bundle how much stage.css vs khordegir-dark.js currently hardcodes hex colors.)

#### G. Render Speed & Hold-Frame Waste

HANDOFF.md measures 0.15–0.3 s per frame (~30 s per 6 s slide per core; ~10+ min for the 33-slide ensaf-mehrabani video on 2 workers).

Meanwhile, ARCHITECTURE.md notes that the last 2.5 s have no entrance motion and OBS freezes on the last frame—yet render.py still screenshots all 180 frames because Stage.amb runs continuous Ken Burns / glow / grain. Adding Phase 4 procedural live backgrounds (bokeh, flowfield, aurora) will make every frame unique, killing any frame-deduplication optimization and pushing exports toward 20–30 minutes on a laptop.

#### H. Inline Markup Hostility & Zero Test Suite

- A.text() uses custom syntax (*accent* ~danger~ _muted_ ==highlight== __underline__). Forcing non-coders to type tilde/asterisk/double-equals syntax in form boxes is error-prone; a tiny formatting toolbar or clean JSON/HTML-lite editor widget is missing.
- The file list contains zero tests (confirmed by HANDOFF.md TODO #9). There is no schema validation test, no video.yaml round-trip test, and no SCAM safe-zone collision check.

#### I. GSAP License Trap for a No-Code Visual Tool

HANDOFF.md notes gsap.min.js (3.15.1, GSAP standard no-charge license). While Webflow made GSAP (including SplitText and former Club plugins) free for commercial use in April 2025[1][2], the GSAP Standard License still explicitly lists as a Prohibited Use: "any implementation and/or use of GSAP Products in tools that allow users to build visual animations without code that encourages, induces, or materially assists in creating a solution that competes with Webflow's visual animation building capabilities"[3]. Even though Khordegir avoids timeline/keyframe authoring, packaging GSAP inside a visual no-code video builder is a real legal grey area (unlike MIT-licensed alternatives).
### 2. Revised, Prioritized Roadmap

Re-ordered to ship the beginner end-to-end loop first on top of the existing 17 templates, before scaling templates or FX.

| Phase | Goal | Key Deliverables | Testable Exit Criteria |
|---|---|---|---|
| 0 ✅ | Core engine (done + baseline test) | Existing stage/, render.py, outputs.py, 17 templates | Automated smoke test builds slide-15 (and 1 chart slide) to 1920×1080 30fps MP4 + PNG + steps_data.lua with 0 errors. |
| 1 | No-Terminal Local App + Editor MVP | khordegir/server.py (localhost HTTP + SSE progress), desktop launcher opening browser/app window, new-project flow (slide 1 defaults to title_card), curated ~15-template picker, Persian schema forms, drag-reorder, image upload to img/, live stage.html preview, 1-click Build/Export. | Playwright E2E test with zero CLI usage creates a project, edits slide 1 title, uploads a JPG, adds a big_number slide, clicks Export, and asserts valid video.yaml, slide-01.mp4, slides.pdf, prompter.html, and steps_data.lua on disk. |
| 2 | WYSIWYG Drag/Resize + Reroll + Theme Library | A.field(key, el) wrapper separation in core.js/fx.js, (x, y, scale) overrides in video.yaml & project.py, canvas drag/scale handles + SCAM safe-zone guard in editor/, 1-click "Reroll animation" (seed), semantic theme tokens + 8–12 light/dark/editorial themes. | Playwright test drags & resizes title on title_card, saves/reloads video.yaml (rect persists within ±1px), renders MP4, and final PNG matches preview (<1% pixel diff). Gallery script renders all 17 templates × all themes with zero contrast failures or SCAM overlap. |
| 3 | Zero-Marker Smart Script-to-Slides | Canonical Python heuristic splitter + template suggester in importer.py (retire editor/importer.js), exposed via /api/import-script. Paste raw Persian script → auto-split + suggest big_number / bullet_list / quote / compare / image_text, populating say. | Golden test on 5 unannotated Persian scripts (including ensaf-mehrabani) outputs valid video.yaml without errors, ≥80% sensible template suggestions, and valid prompter.html. |
| 4 | Render Speed + OBS / Audio Polish | CDP Page.captureScreenshot optimization, --fast / static-hold frame reuse in ffmpeg, reliable incremental caching in index.py, one-click HarkStudio sync, optional SFX WAV track from sound_cues.json. | 33-slide ensaf-mehrabani full build time drops by ≥40% on 2 workers; 1-slide edit rebuilds in <15 s; generated SFX WAV markers align within ±1 frame (33 ms) of cue timestamps. |
| 5 | Curated Template Expansion (Families, Not 97 Folders) | Parameterized chart (donut, stacked/grouped bar, area, waterfall, waffle), diagram (myth_vs_fact, 2×2 matrix, process, venn), map (Iran/world/pins), mockup (news/tweet/paper highlight), people (quote portrait, lower-third). Max ~25–30 total folders. | Every new template passes schema check, A.field() drag/resize test, all-themes gallery render, and automated bounding-box check ensuring zero overlap with SCAM [24, 740, 584, 1055]. |
| 6 | Alive Images, Loopable Backgrounds & Critique | alive: true parallax/drift, periodic loopable backgrounds (khordegir bg --loop 10), optional contact-sheet critique export. | Loop check confirms frame 0 and frame N of 10 s background MP4 match seamlessly; text contrast ratio ≥ 4.5:1 over dimmed live backgrounds. |

### 3. Top 10 Next Engineering Tasks (1–4 Hours Each)

1. **Add Local HTTP Server (khordegir/server.py) & editor Subcommand**
   Files: khordegir/server.py (new, stdlib ThreadingHTTPServer), khordegir/cli.py, khordegir-studio.desktop.
   Acceptance test: Running `python3 -m khordegir editor --no-browser --port 8765` serves /editor/ (200 OK), /stage/stage.html (200 OK), and /api/health ({"ok": true}), with zero file:// CORS errors in browser console.
2. **Project CRUD, YAML Validation & Image Upload Endpoints**
   Files: khordegir/server.py, khordegir/project.py.
   Acceptance test: pytest calls POST /api/projects (creates from starter/video.yaml), PUT /api/projects/<name> (validates & writes video.yaml), POST /api/projects/<name>/images (writes image into img/), and verifies invalid YAML returns 400 without corrupting the existing file on disk.
3. **Separate Wrapper vs Animated Node (A.field) + (x, y, scale) Overrides in Stage**
   Files: khordegir/stage/core.js, khordegir/stage/fx.js, khordegir/project.py.
   Acceptance test: Playwright loads stage.html with `overrides: { title: { x: 120, y: -40, scale: 1.25 } }`; asserts [data-field-wrap="title"] retains exact override transform at t=0.0, t=0.5, and t=5.9 while inner node executes fx.js entrance animation cleanly.
4. **Wire A.field() and schema.json editable Flags on the First 6 Core Templates**
   Files: khordegir/templates/{title_card,big_number,image_text,bullet_list,quote,section_break}/{template.js,schema.json}.
   Acceptance test: Automated test renders all 6 templates with empty overrides (pixel-identical to baseline PNGs) and confirms every field marked `editable: true` in schema.json exposes a [data-field-wrap] box inside A.area.
5. **Build Functional Editor Shell: Project Picker, Slide List, Persian Form & Live Preview**
   Files: khordegir/editor/index.html, khordegir/editor/editor.js, khordegir/editor/editor.css.
   Acceptance test: Playwright E2E test opens editor, creates a new video (slide 1 defaults to title_card), types Persian title, adds a big_number slide, drags to reorder slides, clicks Save, and verifies video.yaml on disk matches UI state and iframe preview updates live.
6. **Implement Canvas Drag/Resize Handles, SCAM Safe-Zone Overlay & "Reroll Animation" Button**
   Files: khordegir/editor/editor.js, khordegir/editor/editor.css, khordegir/stage/core.js (postMessage bounding-box query + webcam guide toggle).
   Acceptance test: Playwright drags title (dx=100, dy=50), resizes scale handle, clicks "انیمیشن دیگر" (increments seed), saves, reloads page, and asserts persisted coordinates and rendered slide-01.png match preview.
7. **Add Async Build/Export Endpoint & Progress Bar in Editor**
   Files: khordegir/server.py, khordegir/render.py (progress callback), khordegir/editor/editor.js.
   Acceptance test: Clicking "ساخت ویدیو" in editor triggers /api/projects/<name>/build, polls /api/jobs/<id> showing 0% -> 100%, and returns working links to slide-01.mp4, slides.pdf, and prompter.html.
8. **Implement Zero-Marker Script-to-Slides Heuristic in importer.py & Retire editor/importer.js**
   Files: khordegir/importer.py, khordegir/server.py (POST /api/import-script), khordegir/editor/editor.js, remove khordegir/editor/importer.js.
   Acceptance test: pytest feeds an unannotated Persian script containing a headline, a ٪ number stat, a `-` bullet list, and a "..." quote to importer.py and asserts output slides map to title_card, big_number, bullet_list, quote with all paragraphs preserved in say.
9. **Introduce Semantic Theme Tokens + 5 Audited Themes (Including Light & Editorial)**
   Files: khordegir/stage/stage.css, khordegir/stage/core.js, khordegir/themes/*.js, khordegir/index.py.
   Acceptance test: `khordegir gallery` renders sample slides across all 6 themes; automated DOM check verifies light themes render dark text (luminance < 0.25) on light surfaces (luminance > 0.70) with no invisible white-on-white defaults.
10. **Add Static-Hold Frame Deduplication + CDP Screenshot Fast Path in render.py**
    Files: khordegir/render.py, khordegir/cli.py (--fast / hold optimization).
    Acceptance test: Render videos/ensaf-mehrabani slide 15 with --fast; verify valid 30fps yuv420p H.264 MP4 of identical duration (6.0 s), identical final slide-15.png, and ≥40% wall-clock speedup.

### 4. Comparable Tools: What to Copy and What to Avoid

| Tool | Copy | Avoid |
|---|---|---|
| Remotion | Frame-pure mental model (useCurrentFrame() / DOM+CSS rendered headlessly via Chromium + FFmpeg)[4][5]; parameterized data-driven templates; composable UI primitives (e.g. Remocn's component model) instead of dozens of siloed folders[6]. | Requiring React/TypeScript/npm toolchains for authors or template builders; letting end users write arbitrary code when you want PowerPoint UX. |
| Motion Canvas / Revideo | Explainer-first motion grammar; smooth sequential reveals; built-in live preview scrubber synced directly to the source file[5][7][8]. | Imperative `yield*` generator timelines[5][8] (hostile to WYSIWYG overrides); HTML5 <canvas> text rendering—keep Chromium DOM/SVG because HarfBuzz/CSS handles Persian ligatures, RTL bidi, and tabular-nums vastly better than Canvas 2D. |
| Keynote / Pitch | Global theme switching that cleanly re-skins every slide; constrained inspector (layout, accent, media—not 50 CSS knobs); Keynote-style preset animations ("Build Order") with zero keyframe curves. | Unbounded freeform canvases where beginners ruin alignment/typography; Keynote's Apple lock-in and lack of teleprompter/OBS integration. |
| Canva | Intent-grouped visual thumbnail picker, drag-and-drop image replacement, "Apply style to all pages", and a single "Shuffle style" button. | Massive template bloat (100s of near-identical cards), cloud lock-in, fragile timeline bars where beginners break timing, and weak RTL defaults. |

### 5. The 3 Biggest Risks to the Project Succeeding

1. **Template/FX Scope Explosion Before the Editor Exists** — Implementing 97 templates (docs-gemini-template-catalog.md), variant matrices, and 8 procedural live backgrounds before Phases 1–3 means months of work with zero usable beginner product—and every new template added before the WYSIWYG/theme contract is locked becomes rewrite debt.
2. **WYSIWYG Overrides Breaking Deterministic Templates (SCAM, RTL, fx.js)** — Allowing free drag-and-resize (x, y, scale) on top of imperative GSAP JS templates without strict wrapper separation, A.fit() reflow rules, and SCAM safe-zone clamping will cause editor previews to diverge from rendered MP4s and push text behind the presenter webcam box.
3. **Render Latency & Desktop Packaging Friction** — At 0.15–0.3 s per frame (~10+ minutes for a 33-slide video on 2 cores) plus heavy dependencies (Python + Playwright + Chromium + ffmpeg), an absolute beginner on a normal laptop will hit installation failures or 15-minute export waits—broken promises against "script to slides in a few minutes, zero terminal"—unless you add a one-click launcher/installer and optimize hold-frame rendering early.

Sources: webflow.com, css-tricks.com, gsap.com, rendercomp.com, snapcn.dev, remocn.dev, pkgpulse.com, rendercomp.com

Google Search Suggestions (required with Grounding with Google Search): "GSAP license free Webflow SplitText 2025 2026", "Revideo programmatic video editing Remotion Motion Canvas"

Citations: 1. https://gsap.com/community/standard-license/
