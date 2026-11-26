"""Tests for the khordegir map_talk template, motion tokens, and format/layout rules.

Compatible with both `pytest` and direct execution (`python3 test_map_talk.py`).
Uses Python stdlib + local 127.0.0.1 HTTP server + offline Playwright Chromium when present.
"""

from __future__ import annotations

import functools
import http.server
import json
import os
import pathlib
import re
import socketserver
import subprocess
import threading

ROOT = pathlib.Path(__file__).resolve().parents[1] / "khordegir"
TPL_DIR = ROOT / "templates" / "map_talk"
STAGE_DIR = ROOT / "stage"
EDITOR_DIR = ROOT / "editor"


def _extract_index_entries() -> list[dict]:
    txt = (ROOT / "templates" / "_index.js").read_text(encoding="utf-8")
    m = re.search(r"window\.TEMPLATE_INDEX\s*=\s*(\[.*\]);\s*$", txt, re.S)
    assert m, "TEMPLATE_INDEX array not found in templates/_index.js"
    return json.loads(m.group(1))


def test_schema_and_registration():
    schema_path = TPL_DIR / "schema.json"
    tpl_path = TPL_DIR / "template.js"
    css_path = TPL_DIR / "template.css"
    assert schema_path.is_file(), "map_talk/schema.json missing"
    assert tpl_path.is_file(), "map_talk/template.js missing"
    assert css_path.is_file(), "map_talk/template.css missing"

    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    assert schema["name"] == "map_talk"
    fields = {f["key"]: f for f in schema["fields"]}

    # Beginner one-click fields stay top-level (not marked advanced)
    for k in ("title", "subtitle", "items"):
        assert k in fields, f"Missing beginner field {k}"
        assert not fields[k].get("advanced"), f"{k} should remain a beginner field"

    items_field = fields["items"]
    assert items_field["type"] == "table"
    col_keys = [c[0] for c in items_field["columns"]]
    assert col_keys == ["label", "lat", "lng", "zoom"]

    # Complex / cartographic options live under Advanced with safe defaults
    for k in ("projection", "route_style", "show_grid", "show_coords", "flight_dur", "pin_delay", "preset", "transition", "seed"):
        assert k in fields, f"Missing advanced field {k}"
        assert fields[k].get("advanced") is True, f"{k} must have advanced: true"
        assert "default" in fields[k], f"{k} must provide a default"

    # Example items satisfy video.yaml structure with camera zoom > 1.06
    ex_items = schema["example"]["items"]
    assert len(ex_items) >= 3
    for pt in ex_items:
        assert {"label", "lat", "lng", "zoom"}.issubset(pt.keys())
        assert pt["zoom"] > 1.06

    # Registered in templates/_index.js and stage/fx.js
    entries = _extract_index_entries()
    mt = [e for e in entries if e["name"] == "map_talk"]
    assert len(mt) == 1, "map_talk must be registered once in templates/_index.js"
    assert mt[0]["js"] == "../templates/map_talk/template.js"
    assert mt[0]["css"] == "../templates/map_talk/template.css"
    assert mt[0]["schema"] == schema

    fx_txt = (STAGE_DIR / "fx.js").read_text(encoding="utf-8")
    assert "map_talk:" in fx_txt or '"map_talk"' in fx_txt, "map_talk presets missing in stage/fx.js"


def test_red_lines_offline_determinism_and_load_order():
    tpl_js = (TPL_DIR / "template.js").read_text(encoding="utf-8")
    tpl_css = (TPL_DIR / "template.css").read_text(encoding="utf-8")
    mt_js = (STAGE_DIR / "motion-tokens.js").read_text(encoding="utf-8")
    stage_html = (STAGE_DIR / "stage.html").read_text(encoding="utf-8")

    # Deterministic & offline red lines
    assert "Math.random" not in tpl_js
    assert "Math.random" not in mt_js
    assert "requestAnimationFrame" not in tpl_js
    assert "requestAnimationFrame" not in mt_js
    assert "@keyframes" not in tpl_css
    assert "transition:" not in tpl_css

    for label, text in (("template.js", tpl_js), ("template.css", tpl_css), ("motion-tokens.js", mt_js)):
        assert "@google/genai" not in text, f"Forbidden @google/genai in {label}"
        assert not re.search(r"https?://", text), f"Forbidden external URL in {label}"

    # License notes & Natural Earth / GSAP attribution present
    assert "Natural Earth" in tpl_js and "Public Domain" in tpl_js
    assert "GSAP" in tpl_js

    # motion-tokens.js must load strictly before core.js
    pos_mt = stage_html.index("motion-tokens.js")
    pos_core = stage_html.index("core.js")
    assert pos_mt < pos_core, "motion-tokens.js must load before core.js in stage.html"

    # Motion tokens preserve 1.06 stage zoom cap and define map tokens with expOut / expInOut
    assert "ZOOM_CAP = 1.06" in mt_js
    assert "map:" in mt_js and "pinDropEase: expOut(5)" in mt_js and "flightEase: expInOut(4)" in mt_js


def test_js_syntax_with_node():
    for js_file in (
        STAGE_DIR / "motion-tokens.js",
        STAGE_DIR / "core.js",
        STAGE_DIR / "fx.js",
        TPL_DIR / "template.js",
        ROOT / "templates" / "_index.js",
        EDITOR_DIR / "editor.js",
    ):
        res = subprocess.run(["node", "--check", str(js_file)], capture_output=True, text=True)
        assert res.returncode == 0, f"Syntax error in {js_file}: {res.stderr}"


def test_browser_render_determinism_formats_and_scam_overlap():
    node_path = os.environ.get("NODE_PATH") or "/usr/local/share/bun-global/node_modules"
    pw_check = subprocess.run(
        ["node", "-e", "require('playwright')"],
        env={**os.environ, "NODE_PATH": node_path},
        capture_output=True,
        text=True,
    )
    if pw_check.returncode != 0:
        # Gracefully skip browser integration check if playwright is absent
        return

    class QuietHandler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, format, *args):
            pass

    handler = functools.partial(QuietHandler, directory=str(ROOT))

    class ReuseTCPServer(socketserver.ThreadingTCPServer):
        allow_reuse_address = True

    srv = ReuseTCPServer(("127.0.0.1", 0), handler)
    port = srv.server_address[1]
    thread = threading.Thread(target=srv.serve_forever, daemon=True)
    thread.start()

    node_script = rf"""
const {{ chromium }} = require('playwright');
(async () => {{
  const browser = await chromium.launch({{ headless: true }});
  const errors = [];
  try {{
    const page = await browser.newPage({{ viewport: {{ width: 1920, height: 1080 }} }});
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => {{ if (m.type() === 'error') errors.push('console: ' + m.text()); }});

    await page.goto('http://127.0.0.1:{port}/stage/stage.html', {{ waitUntil: 'load' }});

    const baseSlide = {{
      template: 'map_talk',
      title: 'مسیر تاریخی *جادهٔ ابریشم*',
      subtitle: 'چهار ایستگاه کلیدی',
      items: [
        {{ label: 'شی‌آن', lat: 34.26, lng: 108.94, zoom: 2.4 }},
        {{ label: 'سمرقند', lat: 39.65, lng: 66.96, zoom: 3.1 }},
        {{ label: 'تهران', lat: 35.69, lng: 51.39, zoom: 3.6 }},
        {{ label: 'استانبول', lat: 41.01, lng: 28.98, zoom: 3.4 }},
      ],
      show_coords: 'true',
      layout: 'SLIDE'
    }};

    const results = {{}};

    // 1. Check all 3 formats x both layouts x dark & light themes
    for (const fmt of ['landscape', 'portrait', 'square']) {{
      const dims = fmt === 'landscape' ? {{ width: 1920, height: 1080 }} : fmt === 'portrait' ? {{ width: 1080, height: 1920 }} : {{ width: 1080, height: 1080 }};
      await page.setViewportSize(dims);
      for (const layout of ['SLIDE', 'SCAM']) {{
        const theme = fmt === 'square' ? 'warm-paper' : 'khordegir-dark';
        const info = await page.evaluate(async ({{ slide, fmt, layout, theme }}) => {{
          const s = Object.assign({{}}, slide, {{ format: fmt, layout }});
          const res = await Stage.load(s, {{ theme, format: fmt }});
          const overlaps = [];
          for (const t of [0, res.entrances * 0.45, res.entrances * 0.95]) {{
            Stage.seek(t);
            const o = Stage.camOverlap();
            if (o.length) overlaps.push({{ t, o }});
          }}
          const stageEl = document.getElementById('stage');
          const worldEl = document.querySelector('.map-world');
          const maxPinAnchor = document.querySelectorAll('.map-pin-anchor').length;
          const routeCount = document.querySelectorAll('.map-route-path').length;
          const path0 = document.querySelector('.map-route-path');
          Stage.seek(0);
          const dash0 = path0 ? parseFloat(path0.style.strokeDashoffset || '0') : 0;
          Stage.seek(res.entrances);
          const dashEnd = path0 ? parseFloat(path0.style.strokeDashoffset || '0') : 0;
          const worldTransformEnd = worldEl ? worldEl.style.transform : '';
          return {{
            w: stageEl.offsetWidth,
            h: stageEl.offsetHeight,
            dataFormat: stageEl.getAttribute('data-format'),
            overlaps,
            maxPinAnchor,
            routeCount,
            dash0,
            dashEnd,
            worldTransformEnd,
            duration: res.duration,
            entrances: res.entrances
          }};
        }}, {{ slide: baseSlide, fmt, layout, theme }});
        results[`${{fmt}}_${{layout}}`] = info;
      }}
    }}

    // 2. Check strict seek determinism (forward & backward) + expOut pin drop + map camera > 1.06 + UI <= 1.06
    await page.setViewportSize({{ width: 1920, height: 1080 }});
    const det = await page.evaluate(async (slide) => {{
      const res = await Stage.load(Object.assign({{}}, slide, {{ format: 'landscape', layout: 'SLIDE' }}), {{ theme: 'khordegir-dark' }});
      const snap = (t) => {{
        Stage.seek(t);
        const world = document.querySelector('.map-world').style.transform;
        const pins = [...document.querySelectorAll('.map-pin-anchor')].map((el) => el.style.transform);
        const drop0Y = parseFloat(getComputedStyle(document.querySelectorAll('.map-pin-drop')[0]).transform.split(',')[5] || 0);
        const calloutScales = [...document.querySelectorAll('.map-callout')].map((el) => {{
          const m = getComputedStyle(el).transform;
          if (!m || m === 'none') return 1;
          const parts = m.replace('matrix(', '').replace(')', '').split(',').map(Number);
          return Math.hypot(parts[0], parts[1]);
        }});
        return {{ world, pins, drop0Y, calloutScales }};
      }};
      const s0 = snap(0);
      const sEnd = snap(res.entrances);
      const a1 = snap(1.65);
      const sMid = snap(3.4);
      const a2 = snap(1.65);

      // Extract map camera scale at end (final stop zoom = 3.4)
      const scaleMatch = sEnd.world.match(/scale\(([^)]+)\)/);
      const mapCamScale = scaleMatch ? parseFloat(scaleMatch[1]) : 0;

      // Check pin 0 e^(-x) drop progression: absArrive = 0.32 + 0.20 + 0.8925 - 0.14 = 1.2725s, dur = 0.48s
      const getDrop0 = (t) => {{
        Stage.seek(t);
        const el = document.querySelectorAll('.map-pin-drop')[0];
        const tr = getComputedStyle(el).transform;
        const y = tr && tr !== 'none' ? parseFloat(tr.split(',')[5] || 0) : 0;
        return {{ y, opacity: parseFloat(getComputedStyle(el).opacity) }};
      }};
      const dropBefore = getDrop0(1.20);
      const dropQuarter = getDrop0(1.2725 + 0.12); // 25% into 0.48s drop; expOut(5)(0.25) ~= 0.718 -> y ~= -10.7
      const dropSettled = getDrop0(1.85);

      // Verify equirectangular + dashed + all presets build cleanly
      const presetErrors = [];
      for (const p of ['vox-atlas', 'air-corridor', 'editorial-focus', 'radar-pulse', 'route-tracer', 'minimal-map']) {{
        try {{
          await Stage.load(Object.assign({{}}, slide, {{ preset: p, projection: 'equirectangular', route_style: 'dashed' }}), {{ theme: 'khordegir-dark' }});
          Stage.seek(1.5);
        }} catch (err) {{
          presetErrors.push(p + ': ' + err.message);
        }}
      }}

      return {{ a1, a2, s0, sMid, sEnd, mapCamScale, dropBefore, dropQuarter, dropSettled, presetErrors, stageZoomCap: Stage.MOTION.ZOOM_CAP }};
    }}, baseSlide);

    // 3. Check editor/index.html loads map_talk cleanly with Beginner vs Advanced split
    const editorPage = await browser.newPage({{ viewport: {{ width: 1440, height: 900 }} }});
    const editorErrors = [];
    editorPage.on('pageerror', (e) => editorErrors.push('pageerror: ' + e.message));
    await editorPage.route(/\/api\/projects/, async (route) => {{
      const url = route.request().url();
      if (url.endsWith('/api/projects')) {{
        await route.fulfill({{
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({{ projects: [{{ name: 'demo-map', title: 'دموی نقشه', slideCount: 1, theme: 'khordegir-dark', hasVideo: true }}] }}),
        }});
      }} else {{
        await route.fulfill({{
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({{
            name: 'demo-map',
            images: [],
            data: {{
              title: 'دموی نقشه',
              theme: 'khordegir-dark',
              slides: [{{
                template: 'map_talk',
                title: baseSlide.title,
                subtitle: baseSlide.subtitle,
                items: baseSlide.items,
              }}],
            }},
          }}),
        }});
      }}
    }});
    await editorPage.goto('http://127.0.0.1:{port}/editor/index.html', {{ waitUntil: 'networkidle' }});
    await editorPage.waitForSelector('#inspectorBody .advanced-details');
    await editorPage.waitForFunction(() => {{
      const f = document.getElementById('stageFrame');
      return f && f.contentWindow && f.contentWindow.Stage && f.contentWindow.Stage.ready;
    }});
    const editorCheck = await editorPage.evaluate(() => {{
      const sec = document.querySelector('#inspectorBody .inspector-section:nth-of-type(2)');
      const topLabels = [...sec.querySelectorAll(':scope > .field-group > .field-label-row strong')].map((x) => x.textContent);
      const tplAdv = sec.querySelector(':scope > details.advanced-details');
      const advLabels = tplAdv ? [...tplAdv.querySelectorAll('.field-group > .field-label-row strong')].map((x) => x.textContent) : [];
      const hasMapOption = !![...document.querySelectorAll('#addTemplateSelect option')].find((o) => o.value === 'map_talk');
      const f = document.getElementById('stageFrame');
      const framePins = f.contentDocument ? f.contentDocument.querySelectorAll('.map-pin-anchor').length : 0;
      return {{
        topCount: topLabels.length,
        advOpenByDefault: tplAdv ? tplAdv.open : null,
        advCount: advLabels.length,
        hasMapOption,
        framePins,
      }};
    }});
    await editorPage.close();
    det.editorErrors = editorErrors;
    det.editorCheck = editorCheck;

    console.log(JSON.stringify({{ errors, results, det }}));
  }} finally {{
    await browser.close();
  }}
}})().catch((e) => {{ console.error(e); process.exit(1); }});
"""

    try:
        proc = subprocess.run(
            ["node", "-e", node_script],
            env={**os.environ, "NODE_PATH": node_path},
            capture_output=True,
            text=True,
            timeout=60,
        )
    finally:
        srv.shutdown()
        srv.server_close()

    assert proc.returncode == 0, f"Playwright script failed:\nSTDOUT:{proc.stdout}\nSTDERR:{proc.stderr}"
    payload = json.loads(proc.stdout.strip())
    assert payload["errors"] == [], f"Browser console/page errors: {payload['errors']}"

    results = payload["results"]
    expected_dims = {"landscape": (1920, 1080), "portrait": (1080, 1920), "square": (1080, 1080)}
    for fmt, (ew, eh) in expected_dims.items():
        for layout in ("SLIDE", "SCAM"):
            r = results[f"{fmt}_{layout}"]
            assert (r["w"], r["h"]) == (ew, eh), f"{fmt}_{layout} bad dims {(r['w'], r['h'])}"
            assert r["dataFormat"] == fmt
            assert r["maxPinAnchor"] == 4
            assert r["routeCount"] == 3
            assert r["dash0"] > 10.0, f"Route line should be un-drawn at t=0 (dash0={r['dash0']})"
            assert abs(r["dashEnd"]) < 1e-2, f"Route line should draw to 0 at end (dashEnd={r['dashEnd']})"
            if layout == "SCAM":
                assert r["overlaps"] == [], f"SCAM cam overlap detected in {fmt}: {r['overlaps']}"

    det = payload["det"]
    assert det["a1"] == det["a2"], "Backward Stage.seek(t) must be bit-identical to forward seek"
    assert det["mapCamScale"] > 2.5, f"Map camera scale should exceed 1.06 (got {det['mapCamScale']})"
    assert det["stageZoomCap"] == 1.06
    for sc in det["sEnd"]["calloutScales"]:
        assert sc <= 1.0601, f"UI callout scale exceeded 1.06 cap: {sc}"
    assert det["dropBefore"]["opacity"] < 0.05
    assert det["dropQuarter"]["y"] > -14.0 and det["dropQuarter"]["y"] < -3.0, f"Expected e^(-x) rapid initial drop, got {det['dropQuarter']}"
    assert det["dropSettled"]["opacity"] > 0.99 and abs(det["dropSettled"]["y"]) < 0.5
    assert det["presetErrors"] == [], f"Preset/projection errors: {det['presetErrors']}"
    assert det["editorErrors"] == [], f"Editor errors: {det['editorErrors']}"
    ed = det["editorCheck"]
    assert ed["hasMapOption"] is True
    assert ed["topCount"] == 3, f"Expected 3 beginner fields at top level, got {ed}"
    assert ed["advOpenByDefault"] is False, f"Advanced section should be collapsed by default: {ed}"
    assert ed["advCount"] == 9, f"Expected 9 advanced fields inside Advanced drawer, got {ed}"
    assert ed["framePins"] == 4, f"Expected 4 map pins rendered inside editor iframe, got {ed}"


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            print(f"PASS: {name}")
    print("ALL TESTS PASSED")
