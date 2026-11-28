# Adding a template
Create `templates/<name>/` with `schema.json` (label, description, category, aliases, fields, example) and
`template.js` (`Stage.template({ name: "<name>", build(s, A) {...} })`), optional `template.css`.
Then run `python3 -m khordegir index` (any build does it too) and `python3 -m khordegir gallery` for `preview.png`.
Rules: use `A.enter/A.count/A.image/Stage.chart` so the motion grammar holds (entrances only; images/background breathe).
In SCAM layout keep everything right of `A.area.left` below y≈700 (camera box bottom-left). See ../../HANDOFF.md.

Bilingual (2026-11-28): add `"example"` (English) and `"example_fa"` (Persian) to schema.json; never hard-code `"right"` as the
start side — use `A.start`, `A.originStart`, `A.sign`, `textAlign:"start"`. Test with both themes:
`python3 -m khordegir render ... --theme english-convey` and the default `khordegir-dark`.
New in this release: kinetic_text, quote_card, study_card, split_compare, stat_bars, lower_third, punch_in, chapter_card, doc_highlight.
