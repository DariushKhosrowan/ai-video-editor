# Red Eagle Puppet — Tutorial Project (آموزش جامع عروسک عقاب قرمز)

This standalone offline tutorial project demonstrates all **Phases 1–6 (Items 1–22)** of the Red Eagle Puppet system inside Khordegir Studio:

- **Slide 1 (`intro-shot-system`)**: Shot timeline (`wide` → `medium` → `close-up` strictly capped at `1.06×`), multi-layer parallax `studio-desk` background, `rim-light` lighting preset (preserving Brand Palette Lock), bilingual Persian RTL + English LTR `captions.srt`, 60 fps deterministic frame cache, and declarative custom plugin emotion (`eureka`) + gesture (`victory-flap`).
- **Slide 2 (`two-shot-dialogue`)**: Two-shot dialogue framing between **Red Eagle** and **Vesper Owl** with automatic turn-taking, listener reactions (`nod`, `lean_in`), `night-city` parallax backdrop, and `cool` editorial lighting.
- **Slide 3 (`alpha-debug-showcase`)**: Transparent alpha background (`background: transparent`) for NLE/OBS compositing plus the deterministic **Debug Overlay** showing springs, viseme, prosody graphs, and all 18 canonical SVG pivot points.

## Quick Commands (100% Offline, `127.0.0.1` only)

### 1. Preview in the Bilingual Editor (`fa`/`en` + RTL/LTR)
```bash
PYTHONPATH=khordegir-studio python3 -m khordegir serve --port 8765
# Open http://127.0.0.1:8765/editor/?project=red-eagle-tutorial
```

### 2. Render Standard MP4 with SRT Captions Burn-In (16:9, 9:16, 1:1)
```bash
PYTHONPATH=khordegir-studio python3 -m khordegir build \
  khordegir-studio/examples/red-eagle-tutorial/video.yaml \
  --formats 16:9,9:16,1:1 --fps 60 \
  --srt khordegir-studio/examples/red-eagle-tutorial/captions.srt \
  --captions-mode stage
```

### 3. Export Transparent WebM (VP9 Alpha) or ProRes 4444 or PNG Sequence
```bash
# Transparent WebM (yuva420p) for OBS / Web / Premiere
PYTHONPATH=khordegir-studio python3 -m khordegir render \
  khordegir-studio/examples/red-eagle-tutorial/video.yaml \
  --format-type webm --transparent --slide 3

# PNG Sequence with Alpha
PYTHONPATH=khordegir-studio python3 -m khordegir render \
  khordegir-studio/examples/red-eagle-tutorial/video.yaml \
  --format-type png-seq --transparent --slide 3
```

### 4. Render Farm Sharding + JSON Manifest
```bash
PYTHONPATH=khordegir-studio python3 -m khordegir render \
  khordegir-studio/examples/red-eagle-tutorial/video.yaml \
  --slide 1 --shard 1/2 --manifest shard1.manifest.json
```

### 5. Run the Deterministic Benchmark Suite
```bash
PYTHONPATH=khordegir-studio python3 -m khordegir benchmark --duration 3.0 --fps 60
```

## Plugin API (Item 22)
Register custom emotions or gestures either declaratively in `video.yaml` (`puppet.plugins`) or programmatically on the stage:

```js
window.StageMascot.registerEmotion("eureka", {
  label: "ایده ناگهانی",
  labelEn: "Eureka",
  browL: -12, browR: 12, browY: -13,
  pupilScale: 1.14, headTilt: 6, accent: "sparkle",
});

window.StageMascot.registerGesture("victory-flap", (ctx) => ({
  wingLRot: -28 * Math.sin(ctx.p * Math.PI * 2) * ctx.env * ctx.intensity,
  wingRRot:  28 * Math.sin(ctx.p * Math.PI * 2) * ctx.env * ctx.intensity,
  bodyY:    -12 * ctx.env * ctx.intensity,
  accent:   "sparkle",
}));
```
