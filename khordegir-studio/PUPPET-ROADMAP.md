# Red Eagle Puppet — nonstop roadmap (owner 2026-11-27 22:00: "work hard and deep… as many features and tools as possible… completely adjustable for any customization… develop it constantly, like a revolution")

Rules for every phase: offline, 127.0.0.1 only, no cloud/API keys/@google/genai; video.yaml single source of truth; deterministic seek(t); no Math.random; stage zoom cap 1.06; never modify vendor/gsap.min.js; keep Python; licence-compatible open-source only (list in LICENSES); beginner one-click presets, everything else under Advanced; every feature has tests; Persian + English UI.

## Phase 1 — Full customization system (Puppet Inspector)
1. **DONE** — Puppet schema v2 in `video.yaml` (`puppet:`): 18-part tree (`body`, `head`, `beak_upper`, `beak_lower`, `eye_l`, `eye_r`, `pupil_l`, `pupil_r`, `lid_l`, `lid_r`, `brow_l`, `brow_r`, `crest`, `wing_l`, `wing_r`, `tail`, `legs`, `accessories`) with per-part transform, pivot, z-order, colour, outline width, visibility (`khordegir/puppet_schema.py`, `khordegir/stage/motion-tokens.js`).
2. **DONE** — Puppet Inspector panel in the editor: part tree, live sliders for every gain/limit/spring (`stiffness`, `damping`, `mass`), colour pickers with Brand Palette Lock, reset-to-preset, copy/paste settings, A/B compare (`khordegir/editor/puppet-inspector.js`).
3. **DONE** — Preset library: 10 built-in presets (`calm`, `lively`, `dramatic`, `newsreader`, `comedian`, `whisper`, `shouting`, `sleepy`, `angry`, `excited`) + save/load/export/import user presets as JSON.
4. **DONE** — Per-slide / per-sentence overrides and keyframed tone curves on the timeline.

## Phase 2 — Expressions & acting
5. **DONE** — Emotion engine: 14 emotions (`neutral`, `happy`, `sad`, `angry`, `surprised`, `shocked`, `smug`, `confused`, `scared`, `proud`, `bored`, `annoyed`, `embarrassed`, `thinking`, `sarcastic`) blending brows/eyes/beak/crest/wings; intensity slider; auto-emotion from prosody + script tags like `[smug]`.
6. **DONE** — Gesture library: 9 gestures (`point`, `shrug`, `facepalm`, `wing-cross`, `thumbs-up`, `clap`, `salute`, `chin-scratch`, `double-take`) triggered by script tags or emphasis peaks with timing offsets.
7. **DONE** — Gaze system: look-at targets (`camera`, `slide`, `other`, `left`, `right`, `up`, `down`), seeded deterministic saccades, smooth pursuit, emotion-driven blink rates.
8. **DONE** — Secondary motion: feather jiggle, crest overlap, wing follow-through, volume-preserving squash & stretch (`sx * sy = 1`).

## Phase 3 — Voice & lip-sync quality
9. **DONE** — Better visemes: offline Viterbi phoneme-level forced aligner, bilingual Persian + English phoneme maps, coarticulation smoothing (`khordegir/mascot_lipsync.py`).
10. **DONE** — Speaker calibration wizard: 10-second capture & offline `khordegir calibrate` CLI auto-setting median F0, loudness range, and noise gate.
11. **DONE** — Live OBS mode upgrades: 80 Hz HPF software noise suppression, push-to-talk (`Space` / MIDI CC 64), emotion (`1–0`) & gesture (`Q–O`) hotkeys, `< 100 ms` latency meter, Web MIDI & Stream Deck mapping export (`khordegir/obs_stage/obs-stage.js`).

## Phase 4 — Characters & rigs
12. **DONE** — Multi-character support (`red_eagle`, `vesper_owl`, `pip_pigeon`, `midge_hummingbird`, `barnaby_tortoise`) on the unified rig, per-character voice mapping, and `dialogue:` mode with turn-taking and listener reactions.
13. **DONE** — Rig importer: offline SVG layers → 18 parts (`khordegir/rig_importer.py`, `parseSvgToPuppetRig`) with Persian/English layer aliases, anatomical auto-pivot suggestion, and 13 accessory slots with timed swaps (`accessoryTimeline` & `[acc:...]`).
14. **DONE** — Outfit & palette variants (6 outfits) and 7 seasonal skins (`classic`, `winter`, `nowruz`, `autumn`, `midnight`, `neon`, `vintage`).

## Phase 5 — Camera, scene, export
15. **DONE** — Shot system: `close-up` / `medium` / `wide` / `two-shot` presets, gentle push-ins strictly capped at `STAGE_ZOOM_CAP = 1.06`, and deterministic `shotTimeline` (`motion-tokens.js`, `puppet_schema.py`, `templates/mascot_talk/template.js`, `puppet-inspector.js`).
16. **DONE** — Backgrounds and parallax layers (`studio-desk`, `news-desk`, `night-city`, `warm-library`, `gradient-cyclorama`, `chroma-green`, `transparent`) + 6 lighting presets (`studio`, `rim-light`, `warm`, `cool`, `dramatic-noir`, `sunset-gold`) preserving Brand Palette Lock.
17. **DONE** — Export: transparent WebM (`libvpx-vp9`, `yuva420p`), ProRes 4444 (`prores_ks`, `yuva444p10le`), PNG sequence (`png-seq`), multi-format `9:16`/`16:9`/`1:1`, and offline SRT captions burn-in (both deterministic Stage RTL overlay and ffmpeg subtitles filter via `khordegir/srt.py` & `khordegir/render.py`).
18. **DONE** — Performance: 60 fps preview toggle (`Stage.setFps(60)`), deterministic frame cache (`mascot-rig.js` + Python `FrameRenderCache`), and render farm-friendly CLI (`--slide`, `--start-frame`, `--end-frame`, `--shard K/N`, `--format-type`, `--transparent`, `--srt`, `--captions-mode`, `--manifest`).

## Phase 6 — Tools & quality
19. **DONE** — Debug overlay: toggleable HUD (`Stage.setPuppetDebug` / Editor checkbox / OBS hotkey `D`) showing springs (`ζ`, stiffness, damping), viseme, prosody sparkline graphs, and all 18 SVG pivot crosshairs.
20. **DONE** — Golden-frame visual regression tests (deterministic SHA-256 SVG/state snapshots), benchmark suite (`khordegir benchmark` + 60 fps `< 16.6 ms/frame` test), docs, and tutorial video project (`examples/red-eagle-tutorial/`).
21. **DONE** — Accessibility & i18n: full bilingual `fa`/`en` UI language switcher + RTL/LTR direction toggle with ARIA roles/labels in Editor (`EDITOR_I18N`, `#btnLangToggle`) and OBS Stage (`#hudLangBtn`).
22. **DONE** — Plugin API: `StageMascot.registerEmotion`, `unregisterEmotion`, `listEmotions`, `registerGesture` (spec object or deterministic function), `unregisterGesture`, `listGestures`, declarative `puppet.plugins` in `video.yaml`, and Editor Plugin Studio.

---

## Status Summary (DONE / PARTIAL / NEXT)
- **DONE**: Items **1–22** (All of Phases 1, 2, 3, 4, 5, and 6).
- **PARTIAL**: None.
- **NEXT**: Post-Phase-6 continuous polish cycle — real-narration user testing with Persian & English episodes, GPU-accelerated headless Chromium render profiling, community plugin pack recipes, and Studio Roadmap Section C/D items (multi-track timeline, offline asset vault, Brand Kit).
