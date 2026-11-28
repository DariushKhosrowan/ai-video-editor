/* Variants + atmosphere for every template (zero-config).
   - Seeded randomness: seed = video + slide number (+ slide.seed to reroll) -> reproducible rebuilds.
   - Entrance variants (rise | slide | mask | blur | scale): change only HOW things enter.
     Motion grammar is fixed: text, lines, bars never move after their entrance.
   - Idle variants for images (breathe | zoom-out | pan-left | pan-right | depth).
   - Atmosphere: film grain, dust particles, light leak, background glow — all on the ambient timeline.
   - Key-word effects: ==highlight== marker sweep, __underline__ draw, optional underline on *accent* words.
   - Sound cues: every count/pop/whoosh/bar is logged with its time for post-production SFX.            */
(function () {
  const S = window.Stage;
  const FX = S.fx = {};

  /* ---------------------------------------------------------- seeded RNG */
  function hash(str) { let h = 1779033703 ^ str.length; for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } return (h >>> 0); }
  function mulberry(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  FX.rngFor = (key) => mulberry(hash(String(key)));
  const pick = (r, list) => list[Math.floor(r() * list.length) % list.length];
  const wpick = (r, obj) => { const tot = Object.values(obj).reduce((a, b) => a + b, 0); let x = r() * tot; for (const k in obj) { x -= obj[k]; if (x <= 0) return k; } return Object.keys(obj)[0]; };

  FX.VARIANTS = ["rise", "slide", "mask", "blur", "scale"];
  FX.MOTIONS = { "breathe": 3, "zoom-out": 2, "pan-left": 1, "pan-right": 1, "depth": 2 };

  /* choose everything for this slide once, from the seed */
  FX.setup = function (slide) {
    const key = slide._seed || `${slide.template}:${slide.title || slide.text || ""}`;
    const r = FX.rngFor(key + ":" + (slide.seed ?? ""));
    const want = (v) => v == null || v === "" || v === "random" || v === "تصادفی";
    const fxIn = slide.fx || {};
    const th = S.theme, dflt = th.fx || {};
    const c = FX.cur = {
      variant: want(slide.variant) ? pick(r, dflt.variants || FX.VARIANTS) : slide.variant,
      motion: want(slide.motion) ? wpick(r, dflt.motions || FX.MOTIONS) : slide.motion,
      glowPos: pick(r, [[0.86, 0.06], [0.14, 0.08], [0.78, 0.92], [0.5, -0.05]]),
      leak: fxIn.leak ?? (dflt.leak === "random" ? r() < 0.45 : !!dflt.leak),
      dust: fxIn.dust ?? (dflt.dust === "random" ? r() < 0.6 : !!dflt.dust),
      grain: fxIn.grain ?? (dflt.grain !== false),
      accentFx: fxIn.accent ?? (dflt.accent === "random" ? pick(r, ["none", "underline", "none"]) : (dflt.accent || "none")),
      r,
    };
    S.cues = [];
    return c;
  };

  /* entrance from-vars for a role under the current variant (theme motion is the base) */
  FX.from = function (role, m) {
    const v = (FX.cur && FX.cur.variant) || "rise";
    const from = { opacity: 0 };
    const textish = ["title", "eyebrow", "body", "note"].includes(role);
    const cardish = ["card"].includes(role);
    if (["bubble", "badge", "number"].includes(role) || v === "rise") {
      if (m.x) from.x = m.x; if (m.y) from.y = m.y; if (m.scale) from.scale = m.scale;
      return from;
    }
    if (v === "slide") {
      const sg = S.isLTR && S.isLTR() ? -1 : 1;                    // enter from the reading start (right in RTL, left in LTR)
      if (textish) from.x = sg * (role === "title" ? 44 : 26);
      else if (cardish) { from.x = sg * 34; from.scale = 0.985; }
      else if (role === "image") from.x = -sg * 36;
    } else if (v === "mask") {
      if (textish) { from.clipPath = "inset(-25% -6% 100% -6%)"; from.y = 14; }
      else if (cardish) { from.clipPath = S.isLTR && S.isLTR() ? "inset(0% 100% 0% 0%)" : "inset(0% 0% 0% 100%)"; }
      else if (role === "image") { from.clipPath = S.isLTR && S.isLTR() ? "inset(0% 100% 0% 0% round 16px)" : "inset(0% 0% 0% 100% round 16px)"; }
    } else if (v === "blur") {
      from.filter = "blur(14px)";
      if (textish) from.y = 8; if (cardish) from.scale = 0.98; if (role === "image") from.scale = 1.03;
    } else if (v === "scale") {
      from.scale = textish ? 0.96 : role === "image" ? 1.04 : 0.95;
    }
    return from;
  };
  /* end values that must be explicit for tweened CSS strings */
  FX.to = function (from) {
    const to = {};
    if (from.clipPath) to.clipPath = from.clipPath.includes("round") ? "inset(0% 0% 0% 0% round 16px)" : "inset(-25% -6% -25% -6%)";
    if (from.filter) to.filter = "blur(0px)";
    return to;
  };

  FX.imageMotion = function (requested, index = 0) {
    if (requested && requested !== "random" && requested !== "تصادفی") return requested;
    if (index <= 1 && FX.cur) return FX.cur.motion;
    return wpick(FX.cur ? FX.cur.r : Math.random, FX.MOTIONS);
  };

  FX.cue = function (t, type, label) { if (S.cues) S.cues.push({ t: +t.toFixed(3), type, label: label || "" }); };

  /* ---------------------------------------------------------- atmosphere (ambient, behind content) */
  let grainURL = null;
  function grainTile() {
    if (grainURL) return grainURL;
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const g = c.getContext("2d"), img = g.createImageData(256, 256), r = mulberry(1234);
    for (let i = 0; i < img.data.length; i += 4) { const v = 110 + r() * 145; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    g.putImageData(img, 0, 0); grainURL = c.toDataURL("image/png"); return grainURL;
  }

  FX.atmosphere = function (stage, slide) {
    const th = S.theme, c = FX.cur, W = S.W, H = S.H, r = FX.rngFor((slide._seed || "") + ":atm");
    // light leak: a warm soft blob sweeping slowly across one edge
    if (c.leak) {
      const lk = document.createElement("div"); lk.className = "leak"; stage.appendChild(lk);
      const fromLeft = r() < 0.5;
      Object.assign(lk.style, { width: "1300px", height: "900px", top: (-300 + r() * 500) + "px", left: fromLeft ? "-700px" : "1300px",
        background: `radial-gradient(ellipse at center, rgba(255,170,60,.55) 0%, rgba(255,120,40,.18) 35%, transparent 70%)` });
      S.amb.fromTo(lk, { opacity: 0.0, x: 0 }, { opacity: 0.11, x: fromLeft ? 260 : -260, duration: 9, ease: "sine.inOut", yoyo: true, repeat: 9 }, 0);
    }
    // dust: slow drifting specks (seeded), very low opacity
    if (c.dust) {
      const box = document.createElement("div"); box.className = "dust"; stage.appendChild(box);
      const n = 38;
      for (let i = 0; i < n; i++) {
        const d = document.createElement("i"); const s = 1.5 + r() * 3.5;
        Object.assign(d.style, { left: (r() * W) + "px", top: (r() * H) + "px", width: s + "px", height: s + "px", opacity: (0.08 + r() * 0.22).toFixed(2), filter: s > 4 ? "blur(1.5px)" : "none" });
        box.appendChild(d);
        S.amb.to(d, { x: (r() - 0.5) * 160, y: -40 - r() * 140, duration: 18 + r() * 10, ease: "none" }, 0);
      }
    }
  };

  FX.grain = function (stage) {
    if (!FX.cur.grain) return;
    const gr = document.createElement("div"); gr.className = "grain"; stage.appendChild(gr);
    gr.style.backgroundImage = `url(${grainTile()})`;
    const proxy = { t: 0 }, r = mulberry(99);
    const offs = Array.from({ length: 24 }, () => [Math.floor(r() * 256), Math.floor(r() * 256)]);
    S.amb.to(proxy, { t: 60, duration: 60, ease: "none", onUpdate: () => { const k = Math.floor(proxy.t * 24) % 24; gr.style.backgroundPosition = `${offs[k][0]}px ${offs[k][1]}px`; } }, 0);
  };

  /* "depth" idle variant: a big blurred copy of the image behind everything drifts the other way */
  FX.depth = function (src) {
    const stage = document.getElementById("stage");
    if (stage.querySelector(".depth")) return;
    const d = document.createElement("div"); d.className = "depth";
    const im = document.createElement("img"); im.src = src; d.appendChild(im);
    stage.insertBefore(d, stage.querySelector(".content"));
    S._imgs.push(im);
    S.amb.fromTo(im, { scale: 1.12, x: -10 }, { scale: 1.16, x: 26, duration: 20, ease: "none" }, 0);
  };

  /* ---------------------------------------------------------- key-word effects after build */
  FX.post = function (content) {
    const c = FX.cur;
    const timeOf = (el) => { let p = el; while (p && p !== content) { if (p.dataset && p.dataset.end) return +p.dataset.end; p = p.parentElement; } return 0.9; };
    content.querySelectorAll(".hl").forEach((el) => {
      const t = timeOf(el) + 0.05;
      S.tl.fromTo(el, { backgroundSize: "0% 42%" }, { backgroundSize: "100% 42%", duration: 0.55, ease: S.ease("power3"), immediateRender: true }, t);
      FX.cue(t, "swish", el.textContent);
    });
    const uls = [...content.querySelectorAll(".ul")];
    if (c.accentFx === "underline") uls.push(...content.querySelectorAll(".t-hero .acc, .t-h1 .acc, .t-quote .acc"));
    uls.forEach((el) => {
      el.classList.add("ul-on");
      const t = timeOf(el) + 0.08;
      S.tl.fromTo(el, { backgroundSize: "0% 6px" }, { backgroundSize: "100% 6px", duration: 0.5, ease: S.ease("power3"), immediateRender: true }, t);
    });
  };
})();
