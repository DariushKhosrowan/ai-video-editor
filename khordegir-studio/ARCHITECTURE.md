# Architecture

```mermaid
flowchart LR
  subgraph Authoring
    Y[video.yaml<br/>slides: template + fields + say/layout/steps]
    S[script.txt with markers] -->|khordegir import| Y
    J[layer / chart JSON] -->|file: / spec:| Y
    E[editor/index.html<br/>(stub)] -.save.-> Y
  end
  subgraph Library
    T[templates/&lt;name&gt;/<br/>schema.json + template.js (+css, preview.png)]
    TH[themes/*.js<br/>colors, type, motion, fx]
    IDX[templates/_index.js<br/>auto-generated manifest]
    T --> IDX
  end
  subgraph Stage["stage/ (Chromium page, file://)"]
    C[core.js<br/>Stage.load / seek, API A.*]
    CH[charts.js<br/>bar, hbar, line, counter, compare]
    FX[fx.js<br/>seeded variants, grain, dust, leak, depth, cues]
    L[template-lib.js<br/>header, data parsers]
  end
  Y -->|project.py: normalise, resolve images, number slides, seed| P[payload JSON per slide]
  P -->|render.py: Playwright| C
  IDX --> C
  TH --> C
  C -->|seek i/30 → screenshot| F[frames]
  F -->|ffmpeg libx264 yuv420p CRF18| MP4[slide-NN.mp4]
  C --> PNG[slide-NN.png final frame]
  PNG --> PDF[slides.pdf]
  Y -->|outputs.py| OBS[steps_data.lua · steps.json · prompter.html · prompter.txt]
  C --> CUE[sound_cues.json/txt]
  MP4 & PNG & OBS -->|--copy-to| HS[HarkStudio folder → OBS Lua script plays slide-NN.mp4]
```

## Rendering model
* One HTML stage (`stage/stage.html`, 1920×1080, `dir=rtl`, Vazirmatn woff2) is used by **both** the renderer and the editor preview → preview == output.
* `Stage.load(slide)` builds DOM for the slide's template and fills two **paused** GSAP timelines:
  `Stage.tl` (entrances) and `Stage.amb` (ambient: Ken Burns, glow, dust, grain, leak).
* `Stage.seek(t)` sets both timelines to `t`. The renderer never plays in real time: frame *i* = `seek(i/30)` + screenshot → deterministic.
* Clip length = `max(slide.duration || theme.clip.min (6 s), entrances_end + theme.clip.hold (2.5 s))`. The last 2.5 s have no entrance motion; only image/background ambience continues and OBS freezes on the last frame.
* Randomness is seeded only (`fx.js`, mulberry32 on `"<video-folder>:<slide-no>:<seed>"`).

## Python package (`khordegir/`)
| file | role |
|---|---|
| `cli.py` / `__main__.py` | `build`, `render`, `import`, `new`, `gallery`, `index`, `templates`, `editor` |
| `project.py` | reads `video.yaml`, aliases, slide numbering, steps for OBS, image search paths → `file://` URIs, render layout (SCAM if any step is SCAM) |
| `render.py` | Playwright Chromium, `Stage.load`, per-frame seek+screenshot (JPEG q95 or PNG) → ffmpeg pipe |
| `index.py` | scans template folders (+ `KHORDEGIR_TEMPLATES` env), writes `templates/_index.js`, `themes/_list.js`, per-template hash for incremental builds |
| `outputs.py` | `steps_data.lua`, `steps.json`, `prompter.txt`, `prompter.html` (from `obs/prompter_template.html`), `slides.pdf` |
| `importer.py` | script-with-markers → video.yaml (JS twin: `editor/importer.js`) |
| `gallery.py` | renders each template's `example` → `templates/<n>/preview.png`, `gallery/gallery.png`, `gallery/GALLERY.md` |


## Direction & locale (added 2026-11-28)
One stage serves Persian (RTL) and English (LTR) videos. Direction is a property of the **theme**, not of templates:

| theme key | effect |
|---|---|
| `dir: "rtl" \| "ltr"` | `#stage` direction, `<html dir>`, `A.ltr/A.start/A.end/A.originStart/A.sign/A.mx`, fx entrance side |
| `digits: "persian" \| "latin"` | `Stage.fa`, `Stage.fmt` (thousands/decimal separators), counters |
| `font: {family, body, faces}` | `@font-face` rules generated from `fonts/*.woff2`; headings vs body family |
| `lang` | `<html lang>` (hyphenation, quotes) |

Templates stay direction-agnostic by using `textAlign: "start"`, flex `flex-start`, `A.start` instead of `"right"`, and `A.originStart` for
grow-in animations. Template schemas carry `example` (English) and `example_fa` (Persian) so the gallery can preview both.
