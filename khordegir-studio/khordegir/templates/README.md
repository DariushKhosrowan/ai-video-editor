# Adding a template
Create `templates/<name>/` with `schema.json` (label, description, category, aliases, fields, example) and
`template.js` (`Stage.template({ name: "<name>", build(s, A) {...} })`), optional `template.css`.
Then run `python3 -m khordegir index` (any build does it too) and `python3 -m khordegir gallery` for `preview.png`.
Rules: use `A.enter/A.count/A.image/Stage.chart` so the motion grammar holds (entrances only; images/background breathe).
In SCAM layout keep everything right of `A.area.left` below y≈700 (camera box bottom-left). See ../../HANDOFF.md.
Formats (video.yaml `format: landscape | portrait | square`, per slide `format:` and `format_overrides: {portrait: {...}}`):
`A.W/A.H` follow the format; `A.landscape/A.portrait/A.square/A.stack` tell you which; `A.pick(land, portrait, square)`,
`A.columns(n)` (portrait/square stack columns), `A.gapB(landscapeBottom)` (safe area + SCAM camera band) and `A.region()` keep
layouts inside the per-format safe area. Inline `fontSize` is scaled by `A.typeScale` (portrait 1.12). Keep landscape values as-is.
