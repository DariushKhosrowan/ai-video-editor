Stage.template({
  name: "layers",   // label, fields, example: see schema.json
  build(s, A) {
    const W = { Black: 900, Bold: 700, Regular: 400 };
    const asc = 1.1;
    const place = (e, x, y, anchor) => {
      const r = e.getBoundingClientRect(), w = r.width, h = r.height;
      const a = (anchor || "ra") + "a", hx = a[0], vy = a[1];
      const fs = parseFloat(e.style.fontSize) || 40;
      let left = hx === "m" ? x - w / 2 : hx === "r" ? x - w : x;
      let top = vy === "m" ? y - h / 2 : (vy === "d" || vy === "b") ? y - h : vy === "s" ? y - (h - fs * 1.25) / 2 - fs * asc : y;
      A.css(e, { left, top });
    };
    const roleAt = (el, role) => (el.delay != null ? { at: 0.1 + +el.delay } : null);
    const rootLayer = A.el("div", "", A.root, { position: "absolute", inset: "0" });
    A.field("elements", rootLayer);
    (s.elements || []).forEach((el, i) => {
      const t = el.type;
      if (t === "image") {
        const b = el.box; A.image(rootLayer, el.src, b[0], b[1], b[2], b[3], { radius: el.radius, border: el.border, shadow: el.shadow !== false, motion: el.motion || "breathe", dim: el.dim, fit: el.fit, delay: el.delay || 0 });
      } else if (t === "text" || t === "counter") {
        const e = A.el("div", "abs " + (t === "counter" ? "" : ""), rootLayer, { fontSize: (el.size || 40) + "px", fontWeight: W[el.font] || 700, color: A.color(el.color), lineHeight: 1.25, whiteSpace: el.max_width ? "normal" : "nowrap" });
        if (el.max_width) e.style.maxWidth = el.max_width + "px";
        if (el.direction === "ltr") e.setAttribute("dir", "ltr");
        if (t === "text") e.innerHTML = Stage.rich(el.text);
        else A.count(e, { from: el.from, to: el.to, decimals: el.decimals, prefix: el.prefix, suffix: el.suffix, thousands: el.thousands, at: 0.1 + (+el.delay || 0), dur: el.duration || undefined, enter: false });
        place(e, el.x, el.y, el.anchor);
        A.enter(e, (el.size || 40) >= 60 ? "title" : "body", 0, 0, roleAt(el));
      } else if (t === "shape") {
        const [x, y, w, h] = el.box, kind = el.kind || "rect", c = A.color(el.color || "accent");
        if (kind === "line" || kind === "arrow") {
          const len = Math.hypot(w, h), ang = Math.atan2(h, w) * 180 / Math.PI;
          const ln = A.el("div", "abs", rootLayer, { left: x, top: y - (el.width || 4) / 2, width: len, height: el.width || 4, background: c, transformOrigin: "0% 50%", transform: `rotate(${ang}deg)` });
          if (kind === "arrow") { A.el("div", "abs", ln, { right: -4, top: -(el.width || 4) * 2, width: 0, height: 0, borderTop: `${(el.width || 4) * 2.5}px solid transparent`, borderBottom: `${(el.width || 4) * 2.5}px solid transparent`, borderLeft: `${(el.width || 4) * 4}px solid ${c}` }); }
          Stage.tl.from(ln, { scaleX: 0, duration: 0.62, ease: Stage.ease("vox"), immediateRender: true }, 0.1 + (+el.delay || 0.25));
        } else {
          const r = A.el("div", "abs", rootLayer, { left: x, top: y, width: w, height: h, borderRadius: kind === "circle" ? "50%" : (el.radius ?? 16) + "px", background: el.fill ? A.color(el.fill) : (kind === "rect" && !el.fill ? c : "transparent"), border: el.fill ? `${el.width || 3}px solid ${c}` : "none" });
          A.enter(r, "card", 0, 0, roleAt(el));
        }
      } else if (t === "chart") {
        const b = el.box || [A.area.left, 250, A.W - A.L.margin - A.area.left, 700];
        Stage.chart(A, A.box(rootLayer, b[0], b[1], b[2], b[3]), el.chart || {}, 0.1 + (+el.delay || 0));
      } else if (t === "dots") {
        const [x, y, w, h] = el.box;
        (el.points || []).forEach((p, j) => { const d = A.el("div", "abs", rootLayer, { left: x + w * p[0] / 100 - 9, top: y + h * p[1] / 100 - 9, width: 18, height: 18, borderRadius: "50%", background: A.color(p[2] || "accent") }); A.enter(d, "badge", 0, 0, { at: 0.4 + j * 0.05 }); });
      }
    });
  }
});
