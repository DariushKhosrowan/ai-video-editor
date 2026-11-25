# ROADMAP-LOOP — continuous improvement queue

Source: Gemini review 2026-11-25 (docs-gemini-roadmap-review-2026-11-25.md), cross-checked by Hark.
Rule: one task per cycle, on branch `studio-roadmap-loop`, small commits, pushed immediately. Mark `[x]` when the acceptance test passes.

Revised order (beginner loop first, templates later): editor + local server → WYSIWYG overrides → themes → smart importer → render speed → template families.

- [ ] 1. Local HTTP server `khordegir/server.py` (stdlib) + `khordegir editor` subcommand; serves /editor/, /stage/, /api/health. Test: GET returns 200 + {"ok": true}.
- [ ] 2. Project CRUD + YAML validation + image upload endpoints. Test: pytest; invalid YAML → 400 and file untouched.
- [ ] 3. `A.field(key, el)`: outer wrapper holds user (x, y, scale) overrides, inner node gets GSAP entrance (no transform collision). Test: override transform constant at t=0, 0.5, 5.9.
- [ ] 4. Wire `A.field` + `editable` flags in title_card, big_number, image_text, bullet_list, quote, section_break. Test: empty overrides pixel-identical to baseline.
- [ ] 5. Real editor shell: project picker, slide list, Persian schema forms, drag reorder, live preview, save. Test: Playwright E2E.
- [ ] 6. Canvas drag/resize handles, SCAM safe-zone overlay, «انیمیشن دیگر» reroll button. Test: persisted coords match render.
- [ ] 7. Async build/export endpoint + progress bar. Test: job 0→100%, links to mp4/pdf/prompter.
- [ ] 8. Zero-marker script→slides heuristic in importer.py; retire editor/importer.js. Test: golden Persian scripts.
- [ ] 9. Semantic theme tokens + 5 audited themes (light, editorial). Test: contrast check across gallery.
- [ ] 10. Static-hold frame dedup + CDP screenshot fast path in render.py. Test: ≥40% faster, identical final frame.

Open review points to verify: GSAP standard-license clause on no-code visual builders (Gemini flagged; confirm before any public/commercial release); catalog spec drift (window.__SEEK__, SplitText, CSS vars).
