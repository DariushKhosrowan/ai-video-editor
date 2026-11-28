Stage.template({
  name: "stat_bars",
  build(s, A) {
    const lat = (v) => String(v).replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/٫/g, ".").replace(/٬/g, ",");
    const num = (v) => (typeof v === "number" ? v : Stage.toNum ? Stage.toNum(v) : parseFloat(lat(v).replace(/,/g, "")) || 0);
    const dec = (str) => { const m = lat(str).match(/\.(\d+)/); return m ? m[1].length : 0; };
    const alpha = (c, a) => {
      const m = /^#([0-9a-f]{6})$/i.exec(String(c || "").trim());
      if (!m) return `color-mix(in srgb, ${c} ${Math.round(a * 100)}%, transparent)`;
      const n = parseInt(m[1], 16);
      return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
    };

    const raw = Array.isArray(s.items) ? s.items : String(s.items || "").split("\n").map((x) => x.trim()).filter(Boolean);
    const rows = raw.slice(0, 7).map((entry) => {
      if (entry && typeof entry === "object" && !Array.isArray(entry)) {
        let lbl = String(entry.label || ""), hi = !!entry.highlight;
        const st = /^\*(.+)\*$/.exec(lbl.trim());
        if (st) { lbl = st[1].trim(); hi = true; }
        return { label: lbl, value: num(entry.value ?? 0), prefix: entry.prefix, suffix: entry.suffix, decimals: entry.decimals, highlight: hi, tone: Stage.T.tone(entry.tone) };
      }
      const parts = String(entry).split("|").map((x) => x.trim());
      let tone = null, hi = false;
      if (parts.length >= 2 && /^(accent|danger|bad|red|good|yellow|muted|info|highlight|\*)$/i.test(parts[parts.length - 1])) {
        const tag = parts.pop().toLowerCase();
        hi = tag === "highlight" || tag === "*";
        tone = Stage.T.tone(tag);
        if (tone === "accent") hi = true;
      }
      let lbl = parts[0], valStr = parts[1] || "";
      if (parts.length < 2) {
        const ci = lbl.lastIndexOf(":");
        if (ci > 0) { valStr = lbl.slice(ci + 1).trim(); lbl = lbl.slice(0, ci).trim(); }
      }
      const st = /^\*(.+)\*$/.exec(lbl.trim());
      if (st) { lbl = st[1].trim(); hi = true; }
      const nm = lat(valStr).match(/^([^\d\-+]*)([-+]?[\d,]+(?:\.\d+)?)(.*)$/);
      return {
        label: lbl,
        value: nm ? num(nm[2]) : num(valStr),
        prefix: nm && nm[1].trim() ? nm[1].trim() : undefined,
        suffix: nm && nm[3].trim() ? nm[3].trim() : undefined,
        decimals: nm ? dec(nm[2]) : undefined,
        highlight: hi,
        tone
      };
    });
    if (!rows.length) return;

    const hiKey = s.highlight != null ? String(s.highlight).trim() : "";
    if (hiKey) {
      rows.forEach((r) => { r.highlight = false; });
      if (/^\d+$/.test(hiKey) && rows[+hiKey - 1]) rows[+hiKey - 1].highlight = true;
      else rows.forEach((r) => { if (r.label.trim().toLowerCase() === hiKey.toLowerCase()) r.highlight = true; });
    } else if (!rows.some((r) => r.highlight)) {
      let best = 0;
      rows.forEach((r, i) => { if (Math.abs(r.value) > Math.abs(rows[best].value)) best = i; });
      rows[best].highlight = true;
    }

    const maxVal = Math.max(0.0001, s.max != null && s.max !== "" ? num(s.max) : Math.max(...rows.map((r) => Math.abs(r.value)), 1));
    const h = Stage.T.header(A, s, { titleRole: "h1", maxH: 210 });
    const left = A.area.left, right = A.L.margin;
    const top = h.el ? h.bottom + 28 : A.area.y + 12;
    const bottom = (A.scam ? 104 : 96) + (s.unit ? 48 : 0);
    const availW = A.W - left - right;
    const labelW = Math.round(availW * (A.scam ? 0.28 : 0.24));
    const n = rows.length;
    const barH = n <= 3 ? 54 : n <= 5 ? 42 : 34;
    const gap = n <= 3 ? 26 : n <= 5 ? 18 : 13;
    const lblFS = n <= 3 ? 32 : n <= 5 ? 28 : 24;
    const valFS = n <= 3 ? 42 : n <= 5 ? 36 : 30;
    const rad = Math.min(12, Math.round(barH / 2)) + "px";

    const rowsWrap = A.el("div", "col", A.root, { left, right, top, bottom, justifyContent: "center", gap: gap + "px" });

    rows.forEach((r, i) => {
      const row = A.el("div", "", rowsWrap, { width: "100%", display: "flex", alignItems: "center", gap: "22px" });
      const lblBox = A.el("div", "", row, { width: labelW + "px", height: (barH + 14) + "px", flexShrink: 0, display: "flex", alignItems: "center" });
      A.text(lblBox, r.label, "label", "", {
        fontSize: lblFS + "px", textAlign: "start",
        color: r.highlight ? A.color("text") : A.color("body"),
        fontWeight: r.highlight ? 800 : 600
      });
      A.fit(lblBox, 0.5);
      lblBox.style.height = "auto";
      A.enter(lblBox, "body", i);

      const trackArea = A.el("div", "", row, { flex: 1, minWidth: "0px", height: (barH + 14) + "px", display: "flex", alignItems: "center", position: "relative" });
      const railWrap = A.el("div", "", trackArea, { position: "relative", width: "calc(100% - 165px)", height: barH + "px" });
      const rail = A.el("div", "", railWrap, { width: "100%", height: "100%", borderRadius: rad, background: "var(--c-bg2)", border: "1px solid var(--c-cardBorder)", overflow: "hidden" });

      const pct = Math.max(0.015, Math.min(1, Math.abs(r.value) / maxVal));
      const pctStr = (pct * 100).toFixed(2) + "%";
      const col = r.highlight ? A.color(r.tone || "accent") : (r.tone ? A.color(r.tone) : alpha(A.color("muted"), 0.42));
      const fill = A.el("div", "", rail, {
        width: pctStr, height: "100%", borderRadius: rad, background: col,
        transformOrigin: A.originStart,
        boxShadow: r.highlight ? ("0 0 24px " + alpha(col, 0.35)) : "none"
      });

      const barAt = A.at("card", i) + 0.04;
      Stage.tl.fromTo(fill, { scaleX: 0 }, { scaleX: 1, duration: 0.72, ease: Stage.ease("power3"), immediateRender: true }, barAt);

      const valWrap = A.el("div", "", railWrap, {
        position: "absolute", top: "0px", bottom: "0px", [A.start]: pctStr,
        paddingInlineStart: "16px", display: "flex", alignItems: "center", whiteSpace: "nowrap"
      });
      const valEl = A.el("div", "t-value", valWrap, {
        fontSize: valFS + "px", fontWeight: r.highlight ? 900 : 700,
        color: r.highlight ? col : A.color("text"), fontVariantNumeric: "tabular-nums"
      });
      Stage.tl.fromTo(valWrap, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: Stage.ease("power3"), immediateRender: true }, barAt);
      A.count(valEl, {
        to: r.value, from: 0,
        prefix: r.prefix ?? s.prefix ?? "",
        suffix: r.suffix ?? s.suffix ?? "",
        decimals: r.decimals ?? (s.decimals != null ? +s.decimals : dec(r.value)),
        at: barAt + 0.05, dur: 1.15
      });
    });

    if (s.unit) {
      const unitBox = A.el("div", "abs", A.root, { left, right, bottom: A.scam ? 78 : 70, height: "42px", display: "flex", alignItems: "center" });
      A.text(unitBox, s.unit, "caption", "", { fontSize: "24px", color: A.color("muted"), textAlign: "start" });
      A.fit(unitBox, 0.6);
      A.enter(unitBox, "note", 0);
    }
    A.fit(rowsWrap, 0.55);
  }
});
