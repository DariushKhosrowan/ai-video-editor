Stage.template({
  name: "kinetic_text",
  build(s, A) {
    const rawText = String(s.text || "").trim();
    if (!rawText) return;

    const centered = (s.align || "center") === "center";
    const left = A.area.left;
    const right = A.L.margin;
    const top = A.area.y;
    const bottom = A.scam ? 110 : 100;

    // Parse markup and line breaks using the engine's own A.text parser
    const probe = A.el("div", "", A.root, { display: "none" });
    const rendered = A.text(probe, rawText, "hero");
    const tokens = [];
    function walk(node, flags) {
      if (node.nodeType === 3) {
        const parts = (node.nodeValue || "").split(/(\s+)/);
        for (const p of parts) {
          if (!p) continue;
          if (p.indexOf("\n") >= 0) {
            const nl = p.split("\n").length - 1;
            for (let b = 0; b < nl; b++) tokens.push({ type: "br" });
            if (p.replace(/\n/g, "").length) tokens.push({ type: "space" });
          } else if (/^\s+$/.test(p)) {
            tokens.push({ type: "space" });
          } else {
            tokens.push({ type: "word", text: p, ...flags });
          }
        }
        return;
      }
      if (node.nodeType !== 1) return;
      if (node.tagName === "BR") {
        tokens.push({ type: "br" });
        return;
      }
      const cl = node.classList;
      const next = {
        acc: flags.acc || cl.contains("acc"),
        dng: flags.dng || cl.contains("dng"),
        mut: flags.mut || cl.contains("mut"),
        hl: flags.hl || cl.contains("hl"),
        ul: flags.ul || cl.contains("ul")
      };
      for (const ch of node.childNodes) walk(ch, next);
    }
    walk(rendered, { acc: false, dng: false, mut: false, hl: false, ul: false });
    probe.remove();

    const words = tokens.filter((t) => t.type === "word");
    const charCount = words.reduce((n, w) => n + w.text.length, 0);

    let fontSize;
    const sz = s.size || "auto";
    if (/^\d+(\.\d+)?$/.test(String(sz))) {
      fontSize = Number(sz);
    } else if (sz === "xl") {
      fontSize = A.scam ? 92 : 108;
    } else if (sz === "hero") {
      fontSize = A.scam ? 78 : 88;
    } else if (sz === "h1" || sz === "medium") {
      fontSize = A.scam ? 58 : 66;
    } else {
      if (words.length <= 6 && charCount <= 36) fontSize = A.scam ? 88 : 104;
      else if (words.length <= 12 && charCount <= 78) fontSize = A.scam ? 72 : 84;
      else if (words.length <= 22 && charCount <= 140) fontSize = A.scam ? 58 : 68;
      else fontSize = A.scam ? 48 : 56;
    }

    const wrap = A.el("div", "col", A.root, {
      left,
      right,
      top,
      bottom,
      alignItems: centered ? "center" : "flex-start",
      justifyContent: "center",
      textAlign: centered ? "center" : "start",
      gap: "24px",
      padding: "16px 14px"
    });

    if (s.eyebrow) {
      const eyRow = A.el("div", "", wrap, {
        display: "flex",
        alignItems: "center",
        justifyContent: centered ? "center" : "flex-start",
        gap: "14px"
      });
      A.el("div", "", eyRow, {
        width: "26px",
        height: "4px",
        borderRadius: "2px",
        background: A.color("accent"),
        flexShrink: 0
      });
      A.text(eyRow, s.eyebrow, "eyebrow", "", {
        letterSpacing: A.ltr ? "0.14em" : "0"
      });
      A.enter(eyRow, "eyebrow", 0);
    }

    const stageBox = A.el("div", "t-hero", wrap, {
      width: "100%",
      maxWidth: A.scam ? "1160px" : "1560px",
      fontSize: fontSize + "px",
      lineHeight: 1.38,
      textAlign: centered ? "center" : "start",
      color: A.color("text")
    });

    // Group adjacent non-space word tokens (e.g. *word* + punctuation) so punctuation never wraps orphaned
    const animatedWords = [];
    let i = 0;
    while (i < tokens.length) {
      const tok = tokens[i];
      if (tok.type === "br") {
        A.el("br", "", stageBox);
        i++;
        continue;
      }
      if (tok.type === "space") {
        stageBox.appendChild(document.createTextNode(" "));
        i++;
        continue;
      }
      const cluster = [];
      while (i < tokens.length && tokens[i].type === "word") {
        cluster.push(tokens[i]);
        i++;
      }
      const host = cluster.length > 1
        ? A.el("span", "", stageBox, { display: "inline-block", whiteSpace: "nowrap" })
        : stageBox;

      for (const w of cluster) {
        const clsList = [];
        if (w.acc) clsList.push("acc");
        if (w.dng) clsList.push("dng");
        if (w.mut) clsList.push("mut");
        if (w.hl) clsList.push("hl");
        if (w.ul) clsList.push("ul");

        const outer = A.el("span", "", host, {
          display: "inline-block",
          position: "relative"
        });
        const inner = A.el("span", clsList.join(" "), outer, {
          display: "inline-block",
          transformOrigin: "50% 60%",
          padding: w.hl ? "0.02em 0.16em" : undefined,
          borderRadius: w.hl ? "0.12em" : undefined
        });
        inner.textContent = w.text;

        let underline = null;
        if (w.acc) {
          underline = A.el("span", "", outer, {
            position: "absolute",
            left: "0px",
            right: "0px",
            bottom: "-0.10em",
            height: "0.085em",
            borderRadius: "0.05em",
            background: A.color("accent"),
            transformOrigin: A.originStart
          });
        }
        animatedWords.push({ outer, inner, underline, acc: w.acc });
      }
    }

    // Fit before attaching GSAP y-offset transforms
    A.fit(wrap, 0.5);

    const baseAt = s.eyebrow ? A.at("body", 0) : A.at("title", 0);
    const total = Math.max(1, animatedWords.length);
    const stagger = Math.min(0.085, Math.max(0.032, 1.15 / total));

    animatedWords.forEach((w, idx) => {
      const t = baseAt + idx * stagger;
      if (w.acc) {
        Stage.tl.fromTo(
          w.outer,
          { opacity: 0, y: 24, filter: "blur(4px)" },
          { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.36, ease: Stage.ease("power4"), immediateRender: true },
          t
        );
        // back.out(3.4) from scale 0.5 -> 1.0 peaks smoothly at ~1.15 then settles at 1.0
        Stage.tl.fromTo(
          w.inner,
          { scale: 0.5 },
          { scale: 1, duration: 0.52, ease: "back.out(3.4)", immediateRender: true },
          t
        );
        Stage.tl.fromTo(
          w.underline,
          { scaleX: 0, opacity: 0.35 },
          { scaleX: 1, opacity: 1, duration: 0.36, ease: Stage.ease("power4"), immediateRender: true },
          t + 0.14
        );
      } else {
        Stage.tl.fromTo(
          w.outer,
          { opacity: 0, y: 26, filter: "blur(6px)" },
          { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.42, ease: Stage.ease("expo"), immediateRender: true },
          t
        );
      }
    });
  }
});
