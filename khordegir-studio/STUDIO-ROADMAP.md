# Khordegir Studio — huge nonstop enhancement plan (owner 2026-11-27 23:02: "develop the studio perfectly… huge deep enhance for all the animations, more templates for slides and a lot of features… don't stop")

Same red lines as PUPPET-ROADMAP.md (offline, 127.0.0.1, no cloud/API keys, video.yaml single source of truth, deterministic seek(t), no Math.random, zoom cap 1.06 except map camera, never modify vendor/gsap.min.js, keep Python, licence-compatible OSS only + LICENSES, beginner presets + Advanced, fa/en + RTL, 16:9/9:16/1:1, tests for everything).

## A. Animation engine (deep)
A1. Motion audit of every template: senior motion-designer pass — easing families, overshoot rules, stagger systems, anticipation/follow-through, consistent durations by token.
A2. Text animation suite: per-letter/word/line reveals for Persian and English (RTL-safe shaping), kinetic typography presets, highlight/underline/strike sweeps, typewriter with cursor, counting text.
A3. Shape & path: SVG path draw-on, morphs (licence-safe), mask wipes, liquid/blob transitions, line-art reveals.
A4. Transition library 2.0: 30+ transitions (push, slide, zoom-through within cap, whip-pan blur, iris, ink splash, paper tear, glitch-lite, light leak), per-transition Advanced timing.
A5. Camera system: virtual camera with gentle dolly/parallax, focus pull (depth blur), shake presets (subtle), all deterministic.
A6. Particles & ambience: deterministic seeded particles (dust, confetti, bokeh, sparks), weather overlays.
A7. Data motion: chart pack v2 (bar race, line draw, pie/donut, area, scatter, map choropleth), number tickers, timeline draws.
A8. Motion presets per brand: theme-driven motion personalities (calm, punchy, editorial, playful, news).

## B. Templates (target 60+)
B1. News/explainer: headline, breaking bar, quote card, two-source compare, fact-check stamp, timeline, "by the numbers".
B2. Education: definition card, vocabulary (word + IPA + example), quiz/poll reveal, step-by-step, mistake vs correct, flashcard flip.
B3. Social/Shorts: hook title, list countdown, before/after, reaction split, comment-reply card, subscribe CTA without "link below".
B4. Podcast/talk: speaker lower thirds, audiogram waveform, guest card, chapter cards, pull-quote.
B5. Data: stat hero, chart pack templates, map talk v2, comparison table.
B6. Story: corkboard/evidence board, polaroid wall, notebook, newspaper, chat-bubble conversation, phone-screen mock.
B7. Puppet templates: mascot_talk variants (side-by-side with slide, picture-in-picture, dialogue two-shot).
Each template: schema.json with A.field editables, 3 formats, preview thumbnail, tests.

## C. Editor & workflow
C1. Timeline editor: multi-track (slides, audio, captions, puppet), drag/trim, snapping, markers, undo/redo.
C2. Script-to-video: paste script → auto slide split → template suggestion → TTS/voice track placeholder → captions.
C3. Asset library: images, icons (OSS sets), fonts (OFL), music/SFX mood library with search.
C4. Brand kit: logos, palettes, fonts, motion personality; one-click apply.
C5. Captions: SRT import/export, styled karaoke captions, RTL, burn-in.
C6. Audio: ducking, LUFS normalize, crossfades, SFX auto-placement on transitions.
C7. Export: MP4/WebM/transparent, PNG sequence, GIF, thumbnails, batch render queue, render presets per platform (YouTube Shorts, Instagram Reels, Aparat).
C8. Teleprompter/OBS: keep and polish OBS console, scene switching, live puppet.

## D. Quality & robustness
D1. Golden-frame tests for every template/format, performance benchmarks, accessibility audit.
D2. Docs: Persian + English guide, template gallery page, tutorial project.
D3. Crash-proof project loading, schema migrations, autosave.

Cycle forever: after D, re-audit motion, add templates from current YouTube/Instagram trends, and take owner feedback.
