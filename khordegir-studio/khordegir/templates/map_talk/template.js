/* Khordegir Studio — map_talk template (offline vector map camera flight).
   Licenses & Attribution:
   - World coastline & inland sea simplified polygons: derived from Natural Earth 110m vectors
     (Public Domain / CC0 1.0 Universal, embedded locally offline — zero network requests).
   - Map projections: Spherical Web Mercator & Plate Carree (public-domain mathematical formulas).
   - Timeline & exponential easing: GSAP 3 (vendor/gsap.min.js, GSAP Standard No-Charge License)
     + Khordegir Studio motion-tokens.js (expOut/expInOut, stage zoom cap <= 1.06; map camera exempt). */

Stage.template({
  name: "map_talk",
  build(s, A) {
    const MT = Stage.MOTION || window.MOTION_TOKENS;
    const tok = (MT && MT.chart && MT.chart.map) || {
      frameDur: 0.45,
      overviewHold: 0.20,
      flightDur: 1.05,
      flightEase: Stage.ease("power2.inOut"),
      routeEase: Stage.ease("chartReveal"),
      pinDropDur: 0.48,
      pinDropEase: Stage.ease("textIn"),
      pinDropY: -38,
      rippleDur: 0.65,
      rippleEase: Stage.ease("power2.out"),
      calloutDelay: 0.14,
      calloutDur: 0.40,
      calloutEase: Stage.ease("textIn"),
      stopHold: 0.48,
    };

    const preset = (Stage.fx && Stage.fx.cur && Stage.fx.cur.preset) || s.preset || "classic";
    const C = A.th.colors || {};
    const isLight = C.isDark === false;

    // ------------------------------------------------------------------ 1. Embedded offline world polygons ([lng, lat], CC0 / Natural Earth style)
    const LANDMASSES = [
      // North & Central America
      [
        [-168.0, 65.5], [-164.0, 67.5], [-156.5, 71.3], [-141.0, 69.6], [-130.0, 70.0],
        [-115.0, 69.0], [-95.0, 70.5], [-82.0, 69.5], [-79.0, 63.0], [-78.5, 53.0],
        [-64.0, 59.5], [-55.6, 52.0], [-60.0, 46.0], [-67.0, 45.0], [-70.0, 41.8],
        [-74.0, 40.5], [-76.0, 35.2], [-80.5, 31.5], [-80.2, 25.2], [-82.5, 28.0],
        [-89.0, 29.5], [-97.2, 26.0], [-96.0, 19.2], [-90.5, 21.3], [-87.0, 21.2],
        [-88.2, 16.0], [-83.5, 14.5], [-83.0, 9.8], [-77.5, 8.2], [-79.5, 9.0],
        [-85.5, 10.5], [-92.2, 14.5], [-105.5, 20.5], [-110.0, 23.0], [-114.5, 31.5],
        [-117.1, 32.5], [-122.5, 37.8], [-124.5, 42.8], [-124.7, 48.4], [-131.0, 54.5],
        [-138.0, 59.2], [-150.0, 60.5], [-161.5, 55.5], [-166.0, 60.0]
      ],
      // Greenland
      [
        [-52.0, 60.0], [-43.0, 60.0], [-36.0, 65.5], [-21.0, 70.5], [-18.0, 77.0],
        [-32.0, 81.5], [-52.0, 81.5], [-68.0, 77.0], [-56.0, 72.0], [-53.0, 66.0]
      ],
      // South America
      [
        [-77.5, 8.2], [-74.0, 11.2], [-70.0, 12.2], [-62.0, 10.6], [-52.0, 4.5],
        [-49.5, 0.5], [-38.5, -3.8], [-34.8, -7.2], [-38.5, -13.0], [-41.0, -22.0],
        [-48.5, -27.5], [-53.5, -34.0], [-58.0, -38.5], [-65.0, -43.0], [-67.5, -50.0],
        [-68.0, -54.8], [-73.5, -53.0], [-75.5, -46.5], [-72.0, -36.0], [-70.5, -20.0],
        [-77.2, -12.0], [-81.3, -4.7], [-79.8, 1.5], [-77.5, 5.5]
      ],
      // Eurasia (Europe + Middle East + Asia)
      [
        [-9.3, 37.0], [-9.2, 43.0], [-1.8, 43.4], [-4.5, 48.4], [2.0, 51.0],
        [8.5, 54.0], [8.2, 57.1], [12.5, 55.7], [10.8, 59.5], [5.0, 60.5],
        [10.0, 64.5], [18.5, 69.5], [28.0, 71.0], [30.5, 69.8], [24.0, 65.5],
        [21.5, 60.5], [19.0, 59.5], [14.5, 55.4], [20.5, 54.8], [24.0, 57.5],
        [28.0, 60.0], [32.0, 65.0], [40.0, 66.5], [52.0, 68.5], [64.0, 70.0],
        [75.0, 72.5], [90.0, 75.5], [105.0, 77.0], [125.0, 73.5], [142.0, 72.5],
        [165.0, 69.5], [178.0, 66.5], [163.0, 60.0], [156.5, 51.0], [142.0, 53.5],
        [135.5, 44.0], [129.0, 40.0], [129.0, 35.2], [126.5, 37.5], [124.0, 39.8],
        [121.5, 38.8], [118.0, 38.5], [122.0, 31.2], [118.0, 24.5], [114.0, 22.3],
        [108.5, 21.5], [109.2, 13.0], [105.0, 8.6], [100.5, 13.5], [103.8, 1.3],
        [100.0, 5.5], [98.3, 9.5], [96.5, 16.5], [91.5, 22.3], [86.0, 20.0],
        [80.3, 13.0], [77.5, 8.1], [72.8, 19.0], [68.5, 23.8], [62.0, 25.2],
        [57.0, 26.5], [56.2, 27.1], [51.5, 28.8], [48.6, 30.0], [48.0, 29.2],
        [51.5, 25.3], [56.4, 25.3], [59.8, 22.5], [54.0, 17.0], [45.0, 12.8],
        [43.4, 12.6], [41.0, 17.0], [35.0, 29.5], [32.5, 30.0], [32.3, 31.2],
        [35.5, 33.8], [36.0, 36.8], [27.5, 36.7], [26.2, 39.8], [29.0, 41.2],
        [28.0, 42.5], [30.5, 46.5], [36.5, 45.2], [41.6, 41.6], [36.0, 41.9],
        [29.2, 41.1], [26.1, 40.3], [23.8, 38.0], [22.5, 36.5], [20.0, 40.0],
        [13.8, 45.6], [16.0, 40.5], [15.6, 38.0], [12.5, 41.8], [9.0, 44.4],
        [3.0, 42.5], [-5.5, 36.0]
      ],
      // Great Britain & Ireland
      [[-5.8, 50.1], [-3.0, 51.4], [-4.8, 55.0], [-5.2, 58.5], [-1.8, 57.6], [-1.5, 55.0], [1.7, 52.5], [1.3, 51.1]],
      [[-10.2, 51.8], [-9.8, 54.2], [-6.2, 55.2], [-6.0, 52.2]],
      // Africa
      [
        [-5.6, 35.8], [10.5, 37.2], [11.5, 33.0], [20.0, 32.5], [32.3, 31.2],
        [34.5, 27.5], [40.0, 18.0], [43.3, 12.4], [51.3, 11.9], [48.0, 4.0],
        [40.5, -3.5], [40.5, -14.5], [35.0, -20.5], [32.5, -26.5], [28.0, -33.0],
        [18.4, -34.4], [14.5, -22.5], [12.0, -12.0], [9.2, 3.8], [3.0, 6.4],
        [-8.0, 4.5], [-13.5, 9.5], [-17.4, 14.7], [-16.0, 21.0], [-13.2, 27.8],
        [-9.5, 32.0]
      ],
      // Madagascar
      [[49.3, -12.0], [50.4, -15.5], [47.2, -25.1], [43.6, -24.5], [44.3, -17.0]],
      // Japan (Honshu / Kyushu / Hokkaido simplified)
      [[130.5, 31.5], [133.5, 34.0], [136.5, 34.6], [139.8, 35.4], [141.0, 38.2], [141.5, 41.3], [145.5, 43.3], [141.8, 45.4], [139.8, 41.0], [136.8, 37.0], [132.0, 34.6]],
      // Maritime SE Asia (Sumatra, Java, Borneo, Philippines, New Guinea)
      [[95.3, 5.5], [100.0, 1.5], [105.8, -5.8], [104.2, -5.9], [97.5, 1.5]],
      [[105.5, -6.2], [114.4, -7.8], [114.2, -8.7], [106.0, -7.2]],
      [[109.0, 1.5], [117.5, 6.8], [118.8, 1.2], [114.5, -3.5], [109.5, -2.5]],
      [[120.0, 18.4], [122.4, 15.0], [126.2, 7.2], [122.0, 6.8], [119.8, 14.5]],
      [[131.0, -1.5], [141.0, -2.5], [150.5, -10.2], [143.0, -9.2], [134.0, -4.5]],
      // Australia & Tasmania
      [
        [113.5, -22.0], [122.2, -18.0], [130.8, -12.4], [136.8, -12.2], [136.0, -15.5],
        [141.0, -16.5], [142.5, -10.8], [145.5, -15.5], [150.5, -22.5], [153.6, -28.2],
        [150.0, -37.5], [144.8, -38.4], [138.5, -35.5], [135.5, -34.8], [129.0, -31.8],
        [121.9, -33.9], [115.1, -34.3], [115.8, -31.9]
      ],
      [[144.8, -40.8], [148.2, -41.0], [147.2, -43.4], [145.2, -42.3]],
      // New Zealand
      [[172.6, -34.4], [178.4, -37.7], [175.2, -41.4], [172.5, -40.8]],
      [[174.0, -41.5], [171.2, -44.8], [166.5, -46.2], [168.0, -43.5]]
    ];

    // Inland seas rendered on top of Eurasia landmass so coastlines around Iran/Caucasus/Turkey stay sharp
    const INLAND_SEAS = [
      // Caspian Sea
      [[47.4, 45.6], [52.6, 46.8], [54.1, 42.6], [53.8, 37.1], [50.1, 36.9], [48.8, 39.4], [47.4, 43.2]]
    ];

    // ------------------------------------------------------------------ 2. Projection & Geometry
    const projMode = String(s.projection || "mercator").toLowerCase() === "equirectangular" ? "equirectangular" : "mercator";
    const MW = 1600;
    const LAT_MAX = 80;
    const LAT_MIN = -62;
    const mercRaw = (lat) => {
      const clamped = Math.max(-84, Math.min(84, lat));
      const rad = (clamped * Math.PI) / 180;
      return 0.5 - Math.log(Math.tan(Math.PI / 4 + rad / 2)) / (2 * Math.PI);
    };
    const MY_TOP = mercRaw(LAT_MAX);
    const MY_BOT = mercRaw(LAT_MIN);
    const MH = Math.round(MW * (MY_BOT - MY_TOP)); // ~974 — conformal 1:1 locally

    function project(lat, lng) {
      const nLng = Math.max(-180, Math.min(180, Number(lng) || 0));
      const nLat = Math.max(LAT_MIN, Math.min(LAT_MAX, Number(lat) || 0));
      const x = ((nLng + 180) / 360) * MW;
      const y = projMode === "equirectangular"
        ? ((LAT_MAX - nLat) / (LAT_MAX - LAT_MIN)) * MH
        : ((mercRaw(nLat) - MY_TOP) / (MY_BOT - MY_TOP)) * MH;
      return { x, y };
    }

    function unproject(px, py) {
      const lng = (px / MW) * 360 - 180;
      let lat;
      if (projMode === "equirectangular") {
        lat = LAT_MAX - (py / MH) * (LAT_MAX - LAT_MIN);
      } else {
        const my = MY_TOP + (py / MH) * (MY_BOT - MY_TOP);
        const expVal = Math.exp((0.5 - my) * 2 * Math.PI);
        lat = ((2 * Math.atan(expVal) - Math.PI / 2) * 180) / Math.PI;
      }
      return {
        lat: Math.max(-85, Math.min(85, lat)),
        lng: Math.max(-180, Math.min(180, lng)),
      };
    }

    // ------------------------------------------------------------------ 3. Parse ordered items from video.yaml
    const rawItems = Array.isArray(s.items) ? s.items : [];
    const fallbackItems = [
      { label: "شی‌آن", lat: 34.26, lng: 108.94, zoom: 2.4 },
      { label: "سمرقند", lat: 39.65, lng: 66.96, zoom: 3.1 },
      { label: "تهران", lat: 35.69, lng: 51.39, zoom: 3.6 },
      { label: "استانبول", lat: 41.01, lng: 28.98, zoom: 3.4 },
    ];
    const sourceItems = rawItems.length ? rawItems : fallbackItems;
    const stops = sourceItems.map((raw, idx) => {
      const obj = (raw && typeof raw === "object") ? raw : { label: String(raw || "") };
      const label = String(obj.label ?? obj.name ?? obj.title ?? `Stop ${idx + 1}`).trim() || `Stop ${idx + 1}`;
      const lat = Stage.toNum(obj.lat ?? obj.latitude ?? 35.69);
      const lng = Stage.toNum(obj.lng ?? obj.lon ?? obj.long ?? obj.longitude ?? 51.39);
      const rawZ = obj.zoom != null && obj.zoom !== "" ? Stage.toNum(obj.zoom) : 2.8;
      const zoom = Math.max(0.75, Math.min(12.0, rawZ > 0 ? rawZ : 2.8));
      const p = project(lat, lng);
      return { idx, label, lat, lng, zoom, x: p.x, y: p.y };
    });

    // ------------------------------------------------------------------ 4. Header & Responsive Stage Geometry (landscape/portrait/square + SLIDE/SCAM)
    const h = Stage.T.header(A, s, {
      fieldTitle: true,
      fieldSubtitle: true,
      maxH: A.portrait ? 260 : 200,
    });
    const hasBottomMeta = !!(s.note || s.source);
    const left = A.area.left;
    const right = A.area.x;
    const top = Math.max(A.area.y, h.bottom + A.pick(26, 26, 20));
    const bottom = A.gapB(hasBottomMeta ? 88 : 66, A.portrait && hasBottomMeta ? 18 : 0);
    const VW = Math.max(240, A.W - left - right);
    const VH = Math.max(240, A.H - top - bottom);

    const stageBox = A.box(A.root, left, top, VW, VH, "map-talk-stage");
    A.field("items", stageBox);

    const world = A.el("div", "map-world", stageBox, { width: MW, height: MH });
    A.el("div", "map-ocean-tint", stageBox);
    const hud = A.el("div", "map-hud", stageBox);

    // ------------------------------------------------------------------ 5. Build Offline SVG Basemap + Routes
    const oceanColor = isLight ? "#D8D1C2" : (C.bg2 || "#1C1C1C");
    const landFill = isLight ? "#EFE9DC" : (C.surface || "#242426");
    const landStroke = isLight ? "#9C9281" : (C.axis || "#5E5E63");
    const gridStroke = isLight ? "rgba(82, 93, 112, 0.22)" : "rgba(255, 255, 255, 0.08)";
    const routeColor = C.accent || "#FFD600";

    const svg = A.svg(world, 0, 0, MW, MH, `0 0 ${MW} ${MH}`);
    A.svgEl(svg, "rect", {
      x: -MW, y: -MH, width: MW * 3, height: MH * 3,
      fill: oceanColor,
    });

    // Graticule grid
    const showGrid = preset === "minimal-map"
      ? String(s.show_grid) === "true" && s.show_grid != null && s.show_grid !== ""
      : String(s.show_grid) !== "false";
    if (showGrid) {
      const gridGroup = A.svgEl(svg, "g", { class: "map-graticule" });
      for (let lng = -150; lng <= 150; lng += 30) {
        const p0 = project(LAT_MAX, lng), p1 = project(LAT_MIN, lng);
        A.svgEl(gridGroup, "line", {
          x1: p0.x.toFixed(1), y1: (-MH).toFixed(1),
          x2: p1.x.toFixed(1), y2: (MH * 2).toFixed(1),
          stroke: gridStroke, "stroke-width": lng === 0 ? "1.3" : "0.9",
          "vector-effect": "non-scaling-stroke",
          "stroke-dasharray": lng === 0 ? "none" : "4 5",
        });
      }
      for (let lat = -60; lat <= 75; lat += 15) {
        const p0 = project(lat, -180), p1 = project(lat, 180);
        A.svgEl(gridGroup, "line", {
          x1: (-MW).toFixed(1), y1: p0.y.toFixed(1),
          x2: (MW * 2).toFixed(1), y2: p1.y.toFixed(1),
          stroke: gridStroke, "stroke-width": lat === 0 ? "1.4" : "0.9",
          "vector-effect": "non-scaling-stroke",
          "stroke-dasharray": lat === 0 ? "none" : "4 5",
        });
      }
    }

    const polyToD = (rings) => rings.map((ring) =>
      ring.map(([lng, lat], idx) => {
        const pt = project(lat, lng);
        return `${idx === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
      }).join(" ") + " Z"
    ).join(" ");

    const landGroup = A.svgEl(svg, "g", { class: "map-landmasses" });
    LANDMASSES.forEach((poly) => {
      A.svgEl(landGroup, "path", {
        d: polyToD([poly]),
        fill: landFill,
        stroke: landStroke,
        "stroke-width": "1.25",
        "stroke-linejoin": "round",
        "vector-effect": "non-scaling-stroke",
      });
    });
    INLAND_SEAS.forEach((poly) => {
      A.svgEl(landGroup, "path", {
        d: polyToD([poly]),
        fill: oceanColor,
        stroke: landStroke,
        "stroke-width": "1.05",
        "stroke-linejoin": "round",
        "vector-effect": "non-scaling-stroke",
      });
    });

    // Route paths between consecutive ordered points
    const routeStyle = String(s.route_style || (preset === "route-tracer" ? "arc" : "arc")).toLowerCase();
    const routeGroup = A.svgEl(svg, "g", { class: "map-routes" });
    const routeEls = [];

    for (let i = 1; i < stops.length; i++) {
      if (routeStyle === "none") break;
      const p0 = stops[i - 1], p1 = stops[i];
      const dx = p1.x - p0.x, dy = p1.y - p0.y;
      const dist = Math.hypot(dx, dy) || 1;
      let d;
      if (routeStyle === "straight") {
        d = `M${p0.x.toFixed(2)},${p0.y.toFixed(2)} L${p1.x.toFixed(2)},${p1.y.toFixed(2)}`;
      } else {
        // Arc lifted perpendicularly upward/poleward proportional to segment distance
        const mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2;
        let nx = -dy / dist, ny = dx / dist;
        if (ny > 0) { nx = -nx; ny = -ny; } // prefer northward curve
        const lift = Math.min(180, dist * (preset === "air-corridor" ? 0.30 : 0.22));
        const cx = mx + nx * lift, cy = my + ny * lift;
        d = `M${p0.x.toFixed(2)},${p0.y.toFixed(2)} Q${cx.toFixed(2)},${cy.toFixed(2)} ${p1.x.toFixed(2)},${p1.y.toFixed(2)}`;
      }

      // Soft corridor shadow halo for air-corridor & route-tracer presets
      let glowEl = null;
      if (preset === "air-corridor" || preset === "route-tracer" || preset === "vox-atlas") {
        glowEl = A.svgEl(routeGroup, "path", {
          d,
          fill: "none",
          stroke: routeColor,
          "stroke-opacity": preset === "route-tracer" ? "0.26" : "0.18",
          "stroke-width": preset === "route-tracer" ? "7" : "5.5",
          "stroke-linecap": "round",
          "vector-effect": "non-scaling-stroke",
          class: "map-route-glow",
        });
      }

      const mainEl = A.svgEl(routeGroup, "path", {
        d,
        fill: "none",
        stroke: routeColor,
        "stroke-width": preset === "route-tracer" ? "3.4" : "2.6",
        "stroke-linecap": "round",
        "vector-effect": "non-scaling-stroke",
        "data-seg": String(i),
        class: "map-route-path",
      });
      if (routeStyle === "dashed" || preset === "air-corridor") {
        mainEl.setAttribute("stroke-dasharray", "9 7");
      }

      const len = mainEl.getTotalLength ? Math.max(1, mainEl.getTotalLength()) : dist;
      routeEls.push({ i, mainEl, glowEl, len, isDashed: routeStyle === "dashed" || preset === "air-corridor" });
    }

    // ------------------------------------------------------------------ 6. Pins & Callout Overlays (unscaled HUD so typography & pins stay sharp)
    const pinItems = stops.map((st, i) => {
      const anchor = A.el("div", "map-pin-anchor", hud);
      anchor.dataset.stop = String(i);

      // SVG ripple & reticle inside anchor (animates radius r rather than CSS scale > 1.06)
      const fxSvg = A.svg(anchor, -46, -46, 92, 92, "0 0 92 92");
      fxSvg.style.pointerEvents = "none";
      const ripple1 = A.svgEl(fxSvg, "circle", {
        cx: "46", cy: "46", r: "4",
        fill: "none", stroke: routeColor, "stroke-width": "2.4", opacity: "0",
        class: "map-pin-ripple-svg",
      });
      const ripple2 = preset === "radar-pulse"
        ? A.svgEl(fxSvg, "circle", {
            cx: "46", cy: "46", r: "4",
            fill: "none", stroke: routeColor, "stroke-width": "1.6", opacity: "0",
            class: "map-pin-ripple2-svg",
          })
        : null;

      let reticle = null;
      if (preset === "radar-pulse" || preset === "editorial-focus") {
        reticle = A.svg(anchor, -34, -34, 68, 68, "0 0 68 68");
        reticle.classList.add("map-reticle");
        ["M6,18 L6,6 L18,6", "M50,6 L62,6 L62,18", "M62,50 L62,62 L50,62", "M18,62 L6,62 L6,50"].forEach((d) => {
          A.svgEl(reticle, "path", { d, fill: "none", stroke: routeColor, "stroke-width": "2.2", "stroke-linecap": "round" });
        });
      }

      const shadow = A.el("div", "map-pin-shadow", anchor);
      const drop = A.el("div", "map-pin-drop", anchor);
      if (preset === "minimal-map") {
        A.el("div", "map-pin-dot", drop);
      } else {
        A.el("div", "map-pin-stem", drop);
        A.el("div", "map-pin-head", drop);
      }

      const callout = A.el("div", "map-callout", anchor);
      if (preset !== "route-tracer") {
        A.el("span", "map-callout-num", callout).textContent = stageNum(i + 1);
      }
      const lblEl = A.el("span", "map-callout-text", callout);
      lblEl.innerHTML = Stage.rich(st.label, { count: false, micro: false });
      lblEl.style.fontSize = Math.round(A.pick(24, 26, 22)) + "px";

      // Compute smart default callout anchor offset relative to pin head
      const prev = i > 0 ? stops[i - 1] : null;
      const dxPrev = prev ? (st.x - prev.x) : 0;
      const nearRight = st.x > MW * 0.78;
      const nearTop = st.y < MH * 0.20;
      const preferLeft = nearRight || (dxPrev > 0 && st.x > MW * 0.25);
      callout.style.left = preferLeft ? "auto" : "22px";
      callout.style.right = preferLeft ? "22px" : "auto";
      callout.style.top = (nearTop ? 18 : -54) + "px";

      return { st, i, anchor, drop, shadow, ripple1, ripple2, reticle, callout, preferLeft, nearTop };
    });

    function stageNum(n) {
      return Stage._lang === "en" ? String(n) : Stage.fa(n);
    }

    // Optional HUD badges (advanced show_coords + active step pill)
    const showCoords = String(s.show_coords) === "true";
    const coordHud = showCoords ? A.el("div", "map-hud-badge", stageBox) : null;
    const stepPill = stops.length > 0 ? A.el("div", "map-step-pill", stageBox) : null;

    // ------------------------------------------------------------------ 7. Deterministic Flight Choreography
    const overviewBounds = (() => {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      stops.forEach((p) => {
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
      });
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const spanW = Math.max(180, (maxX - minX) * 1.45);
      const spanH = Math.max(140, (maxY - minY) * 1.55);
      const z = Math.max(Math.max(VW / MW, VH / MH) * 0.9, Math.min(2.6, Math.min(VW / spanW, VH / spanH)));
      return { cx, cy, z };
    })();

    const rawFlightDur = s.flight_dur != null && s.flight_dur !== "" ? Stage.toNum(s.flight_dur) : tok.flightDur;
    const flightDur = Math.max(0.35, Math.min(4.0, rawFlightDur || tok.flightDur)) * (preset === "route-tracer" ? 0.85 : 1);
    const rawPinDelay = s.pin_delay != null && s.pin_delay !== "" ? Stage.toNum(s.pin_delay) : tok.calloutDelay;
    const pinDelay = Math.max(0.0, Math.min(1.0, Number.isFinite(rawPinDelay) ? rawPinDelay : tok.calloutDelay));
    const overviewHold = stops.length > 1 ? tok.overviewHold : 0.12;
    const stopHold = tok.stopHold;

    const mapT0 = Math.max(A.at("body"), 0.25);
    const segments = [];
    let cursor = overviewHold;

    stops.forEach((st, i) => {
      const from = i === 0 ? overviewBounds : { cx: stops[i - 1].x, cy: stops[i - 1].y, z: stops[i - 1].zoom };
      const to = { cx: st.x, cy: st.y, z: st.zoom };
      const segDur = i === 0 ? Math.max(0.45, flightDur * 0.85) : flightDur;
      const segStart = cursor;
      const segEnd = segStart + segDur;
      const arriveT = segEnd - Math.min(0.14, segDur * 0.16);
      const dist = Math.hypot(to.cx - from.cx, to.cy - from.cy);
      segments.push({ i, from, to, segStart, segEnd, segDur, arriveT, dist });
      cursor = segEnd + stopHold;
    });

    const totalMapDur = Math.max(0.8, cursor);

    // Pure camera evaluation f(t) -> deterministic for ANY forward/backward Stage.seek(t)
    const flightEase = typeof tok.flightEase === "function" ? tok.flightEase : Stage.ease("power2.inOut");
    const routeEase = typeof tok.routeEase === "function" ? tok.routeEase : Stage.ease("chartReveal");
    const lerp = (a, b, u) => a + (b - a) * u;

    function evalCamera(tLocal) {
      if (tLocal <= overviewHold || !segments.length) {
        return { cx: overviewBounds.cx, cy: overviewBounds.cy, z: overviewBounds.z, activeIdx: -1 };
      }
      for (let k = 0; k < segments.length; k++) {
        const seg = segments[k];
        if (tLocal <= seg.segEnd) {
          const u = Math.max(0, Math.min(1, (tLocal - seg.segStart) / seg.segDur));
          const e = flightEase(u);
          const cx = lerp(seg.from.cx, seg.to.cx, e);
          const cy = lerp(seg.from.cy, seg.to.cy, e);
          let z = Math.exp(lerp(Math.log(seg.from.z), Math.log(seg.to.z), e));
          if (k > 0 && seg.dist > 80) {
            const arcDip = preset === "air-corridor" ? 0.38 : preset === "minimal-map" ? 0.14 : 0.24;
            z = Math.max(Math.min(overviewBounds.z, seg.from.z, seg.to.z) * 0.85, z * (1 - arcDip * Math.sin(Math.PI * u)));
          }
          return { cx, cy, z, activeIdx: u > 0.65 ? seg.i : Math.max(0, seg.i - 1) };
        }
        const nextStart = k + 1 < segments.length ? segments[k + 1].segStart : Infinity;
        if (tLocal <= nextStart) {
          return { cx: seg.to.cx, cy: seg.to.cy, z: seg.to.z, activeIdx: seg.i };
        }
      }
      const last = segments[segments.length - 1];
      return { cx: last.to.cx, cy: last.to.cy, z: last.to.z, activeIdx: last.i };
    }

    function applyCamera(tLocal) {
      const cam = evalCamera(tLocal);
      const wx = VW / 2 - cam.cx * cam.z;
      const wy = VH / 2 - cam.cy * cam.z;
      world.style.transform = `translate3d(${wx.toFixed(2)}px, ${wy.toFixed(2)}px, 0) scale(${cam.z.toFixed(4)})`;

      pinItems.forEach((item) => {
        const sx = VW / 2 + (item.st.x - cam.cx) * cam.z;
        const sy = VH / 2 + (item.st.y - cam.cy) * cam.z;
        const inView = sx >= 8 && sx <= VW - 8 && sy >= 8 && sy <= VH - 8;
        item.anchor.style.display = inView ? "block" : "none";
        item.anchor.style.transform = `translate3d(${sx.toFixed(2)}px, ${sy.toFixed(2)}px, 0)`;

        // Keep callout tucked safely inside map viewport edges (and away from SCAM cam zone)
        let goLeft = item.preferLeft;
        if (goLeft && sx < 240) goLeft = false;
        else if (!goLeft && sx > VW - 240) goLeft = true;
        item.callout.style.left = goLeft ? "auto" : "22px";
        item.callout.style.right = goLeft ? "22px" : "auto";
        const putBelow = sy < 95 || (item.nearTop && sy < VH - 110);
        item.callout.style.top = (putBelow ? 18 : -54) + "px";

        const isActive = item.i === cam.activeIdx;
        item.callout.classList.toggle("is-active", isActive);
      });

      // Deterministic dashed & solid route strokeDashoffset progression
      routeEls.forEach((rt) => {
        const seg = segments[rt.i];
        if (!seg) return;
        const drawStart = seg.segStart + seg.segDur * 0.06;
        const drawDur = Math.max(0.15, seg.segDur * 0.84);
        const u = Math.max(0, Math.min(1, (tLocal - drawStart) / drawDur));
        const p = routeEase(u);
        if (rt.isDashed) {
          // Reveal dashed line smoothly using clip-style dasharray trick or opacity + dashoffset on glow
          rt.mainEl.style.opacity = p <= 0.001 ? "0" : String(Math.min(1, p * 1.4));
          if (rt.glowEl) {
            rt.glowEl.style.strokeDasharray = `${rt.len}`;
            rt.glowEl.style.strokeDashoffset = `${(rt.len * (1 - p)).toFixed(2)}`;
          }
        } else {
          rt.mainEl.style.strokeDasharray = `${rt.len}`;
          rt.mainEl.style.strokeDashoffset = `${(rt.len * (1 - p)).toFixed(2)}`;
          if (rt.glowEl) {
            rt.glowEl.style.strokeDasharray = `${rt.len}`;
            rt.glowEl.style.strokeDashoffset = `${(rt.len * (1 - p)).toFixed(2)}`;
          }
        }
      });

      if (coordHud) {
        const ll = unproject(cam.cx, cam.cy);
        const latHem = ll.lat >= 0 ? "N" : "S";
        const lngHem = ll.lng >= 0 ? "E" : "W";
        coordHud.innerHTML = `<span class="hud-accent">${Math.abs(ll.lat).toFixed(2)}°${latHem}</span> · ${Math.abs(ll.lng).toFixed(2)}°${lngHem} · <span class="hud-accent">${cam.z.toFixed(2)}×</span>`;
      }

      if (stepPill) {
        const activeSeg = cam.activeIdx >= 0 ? stops[cam.activeIdx] : stops[0];
        const stepIdx = cam.activeIdx >= 0 ? cam.activeIdx + 1 : 1;
        stepPill.innerHTML = `<strong>${stageNum(stepIdx)} / ${stageNum(stops.length)}</strong><span>${Stage.plain(activeSeg.label)}</span>`;
      }
    }

    // ------------------------------------------------------------------ 8. Bind everything to Stage.tl
    // Stage frame enters within <= 1.06 scale cap
    A.enter(stageBox, "card", 0, 0, { at: Math.max(0.05, mapT0 - 0.16), scale: 0.985, dur: tok.frameDur });
    if (coordHud) A.enter(coordHud, "badge", 0, 0, { at: mapT0 });
    if (stepPill) A.enter(stepPill, "badge", 0, 0, { at: mapT0 + 0.05 });

    // Single linear deterministic camera & route clock tween
    const camClock = { t: 0 };
    Stage.tl.fromTo(
      camClock,
      { t: 0 },
      {
        t: totalMapDur,
        duration: totalMapDur,
        ease: "none",
        immediateRender: true,
        onUpdate: () => applyCamera(camClock.t),
      },
      mapT0
    );

    // Individual pin drops (e^(-x) expOut), SVG ripples, reticles, and label callouts
    const pinDropEase = typeof tok.pinDropEase === "function" ? tok.pinDropEase : Stage.ease("textIn");
    const rippleEase = typeof tok.rippleEase === "function" ? tok.rippleEase : Stage.ease("power2.out");
    const calloutEase = typeof tok.calloutEase === "function" ? tok.calloutEase : Stage.ease("textIn");

    segments.forEach((seg, idx) => {
      const item = pinItems[idx];
      const absArrive = mapT0 + seg.arriveT;

      // Ground shadow fade
      Stage.tl.fromTo(
        item.shadow,
        { opacity: 0, scale: 0.4 },
        { opacity: 0.55, scale: 1, duration: tok.pinDropDur, ease: pinDropEase, immediateRender: true },
        absArrive
      );

      // Pin drop with pure e^(-x) exponential deceleration (zero overshoot, scale capped <= 1.0)
      Stage.tl.fromTo(
        item.drop,
        { opacity: 0, y: tok.pinDropY },
        { opacity: 1, y: 0, duration: tok.pinDropDur, ease: pinDropEase, immediateRender: true },
        absArrive
      );

      // SVG radar ripple ring (animates circle radius r attribute)
      Stage.tl.fromTo(
        item.ripple1,
        { attr: { r: 4 }, opacity: 0.9 },
        { attr: { r: 36 }, opacity: 0, duration: tok.rippleDur, ease: rippleEase, immediateRender: true },
        absArrive + 0.05
      );
      if (item.ripple2) {
        Stage.tl.fromTo(
          item.ripple2,
          { attr: { r: 4 }, opacity: 0.75 },
          { attr: { r: 44 }, opacity: 0, duration: tok.rippleDur * 1.15, ease: rippleEase, immediateRender: true },
          absArrive + 0.16
        );
      }

      if (item.reticle) {
        Stage.tl.fromTo(
          item.reticle,
          { opacity: 0, scale: 1.06 },
          { opacity: 0.9, scale: 1, duration: 0.32, ease: pinDropEase, immediateRender: true },
          absArrive
        );
        Stage.tl.to(
          item.reticle,
          { opacity: 0, duration: 0.28, ease: Stage.ease("textOut") },
          absArrive + tok.pinDropDur + stopHold * 0.7
        );
      }

      // Label callout entrance
      const callAt = absArrive + pinDelay;
      Stage.tl.fromTo(
        item.callout,
        { opacity: 0, y: 12, scale: MT ? MT.clampScale(0.95) : 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: tok.calloutDur, ease: calloutEase, immediateRender: true },
        callAt
      );

      if (Stage.fx) {
        Stage.fx.cue(absArrive, "pop", item.st.label.slice(0, 30));
      }
    });

    // Initialize at t=0 deterministically
    applyCamera(0);
  },
});
