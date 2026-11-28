# Red Eagle Puppet — nonstop roadmap (owner 2026-11-27 22:00: "work hard and deep… as many features and tools as possible… completely adjustable for any customization… develop it constantly, like a revolution")

Rules for every phase: offline, 127.0.0.1 only, no cloud/API keys/@google/genai; video.yaml single source of truth; deterministic seek(t); no Math.random; stage zoom cap 1.06; never modify vendor/gsap.min.js; keep Python; licence-compatible open-source only (list in LICENSES); beginner one-click presets, everything else under Advanced; every feature has tests; Persian + English UI.

## Phase 1 — Full customization system (Puppet Inspector)
1. Puppet schema v2 in video.yaml (`puppet:`): parts tree (body, head, beak upper/lower, eyes L/R, pupils, lids, brows, crest, wings L/R, tail, legs, accessories) with per-part transform, pivot, z-order, colour, outline width, visibility.
2. Puppet Inspector panel in the editor: part tree, live sliders for every gain/limit/spring (stiffness, damping, mass), colour pickers (palette lock for brand colours), reset-to-preset, copy/paste settings, A/B compare.
3. Preset library: calm, lively, dramatic, newsreader, comedian, whisper, shouting, sleepy, angry, excited; save/load/export/import user presets as JSON.
4. Per-slide / per-sentence overrides and keyframed tone curves on the timeline.

## Phase 2 — Expressions & acting
5. Emotion engine: 12+ emotions (happy, sad, angry, surprised, smug, confused, scared, proud, bored, embarrassed, thinking, sarcastic) blending brows/eyes/beak/crest/wings; intensity slider; auto-emotion from prosody + script tags like [smug].
6. Gesture library: point, shrug, facepalm, wing-cross, thumbs-up (feather), clap, salute, chin-scratch, double-take; triggered by script tags or emphasis; timing offsets.
7. Gaze system: look-at targets (camera, slide element, other character), saccades, smooth pursuit, blink rate by emotion.
8. Secondary motion: feather jiggle, crest overlap, wing follow-through, squash & stretch with volume preservation.

## Phase 3 — Voice & lip-sync quality
9. Better visemes: phoneme-level alignment (offline, e.g. Rhubarb-style or Allosaurus-style algorithms, licence-checked), Persian + English phoneme maps, coarticulation smoothing.
10. Speaker calibration wizard: record 10 s, auto-set median pitch, loudness range, noise gate.
11. Live OBS mode upgrades: noise suppression, push-to-talk, hotkeys for emotions/gestures, latency meter, MIDI/stream-deck mapping.

## Phase 4 — Characters & rigs
12. Multi-character support (Vesper owl, Pip pigeon, Midge hummingbird, Barnaby tortoise) on the same rig system; per-character voice mapping; dialogue mode with turn-taking and reactions from the listener.
13. Rig importer: SVG layers → parts (named groups), auto-pivot suggestion; costume/accessory slots (hats, glasses, ties, props) with swap at time t.
14. Outfit & palette variants, seasonal skins.

## Phase 5 — Camera, scene, export
15. Shot system: close-up / medium / wide presets, gentle push-ins within cap, two-shot framing for dialogue.
16. Backgrounds and parallax layers; lighting presets (rim light, warm/cool).
17. Export: transparent WebM/ProRes 4444 for compositing, PNG sequence, 9:16/16:9/1:1, captions burn-in from an SRT file.
18. Performance: 60 fps preview, frame cache, render farm-friendly CLI.

## Phase 6 — Tools & quality
19. Debug overlay: show springs, viseme, prosody graphs, pivot points.
20. Golden-frame visual regression tests; benchmark suite; docs + tutorial video project.
21. Accessibility & i18n: full fa/en UI, RTL.
22. Plugin API for new gestures/emotions.

After Phase 6: keep cycling — profile, polish, user-test with real narration, add features suggested by the owner and by Gemini review rounds.
