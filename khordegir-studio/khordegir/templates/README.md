# Adding a template
Create `templates/<name>/` with `schema.json` (label, description, category, aliases, fields, example) and
`template.js` (`Stage.template({ name: "<name>", build(s, A) {...} })`), optional `template.css`.
Then run `python3 -m khordegir index` (any build does it too) and `python3 -m khordegir gallery` for `preview.png`.
Rules: use `A.enter/A.count/A.image/Stage.chart` so the motion grammar holds (entrances only; images/background breathe).
In SCAM layout keep everything right of `A.area.left` below y≈700 (camera box bottom-left). See ../../HANDOFF.md.
