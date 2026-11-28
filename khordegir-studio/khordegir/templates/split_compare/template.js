Stage.template({
  name: "split_compare",
  build(s, A) {
    function alphaCol(col, a) {
      const m = /^#([0-9a-f]{6})$/i.exec(String(col || "").trim());
      if (m) {
        const n = parseInt(m[1], 16);
        return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
      }
      return `color-mix(in srgb, ${col} ${Math.round(a * 100)}%, transparent)`;
    }

    function resolveTone(t, fallback) {
      const v = String(t || fallback || "accent").toLowerCase();
      if (v === "good" || v === "info" || v === "muted") return v;
      return Stage.T.tone(v) || "accent";
    }

    const h = Stage.T.header(A, s, { titleRole: "h1", maxH: 200 });
    const top = h.el ? h.bottom + 26 : A.area.y + 10;
    const bottom = A.scam ? 104 : 96;

    const outer = A.el("div", "col", A.root, {
      left: A.area.left,
      right: A.L.margin,
      top,
      bottom,
      justifyContent: "center",
      gap: "20px"
    });

    const row = A.el("div", "", outer, {
      width: "100%",
      flex: 1,
      minHeight: "0px",
      display: "flex",
      flexDirection: "row",
      alignItems: "stretch"
    });

    const maxBodyH = Math.max(180, (A.H - top - bottom) - (s.verdict ? 260 : 175));

    function makePanel(title, icon, body, toneRole, idx) {
      const col = A.color(toneRole);
      const cls = "card" + (toneRole === "danger" ? " dng-b" : toneRole === "accent" ? " acc-b" : "");
      const panel = A.el("div", cls, row, {
        flex: 1,
        minWidth: "0px",
        padding: A.scam ? "30px 32px" : "38px 42px",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        gap: "26px",
        position: "relative",
        overflow: "hidden",
        borderColor: (toneRole === "good" || toneRole === "info") ? alphaCol(col, 0.45) : undefined
      });

      const stripe = A.el("div", "", panel, {
        position: "absolute",
        top: "0px",
        left: "0px",
        right: "0px",
        height: "6px",
        background: col,
        transformOrigin: A.originStart
      });

      const head = A.el("div", "", panel, {
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: "16px"
      });

      if (icon) {
        const iconPill = A.el("div", "", head, {
          width: "62px",
          height: "62px",
          borderRadius: "16px",
          background: alphaCol(col, 0.16),
          border: "1px solid " + alphaCol(col, 0.38),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "32px",
          flexShrink: 0
        });
        iconPill.textContent = icon;
      }

      const titleBox = A.el("div", "", head, {
        flex: 1,
        minWidth: "0px",
        height: "76px",
        display: "flex",
        alignItems: "center"
      });
      A.text(titleBox, title || "", "h1", "", {
        fontSize: A.scam ? "44px" : "50px",
        color: toneRole === "muted" ? A.color("text") : col,
        textAlign: "start"
      });
      A.fit(titleBox, 0.55);
      titleBox.style.height = "auto";

      const bodyStr = String(body || "").trim();
      if (bodyStr) {
        const bodyBox = A.el("div", "", panel, {
          width: "100%",
          height: maxBodyH + "px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "14px"
        });
        const lines = bodyStr.split("\n").map((x) => x.trim()).filter(Boolean);
        if (lines.length > 1) {
          for (const line of lines) {
            const item = A.el("div", "", bodyBox, {
              width: "100%",
              display: "flex",
              alignItems: "flex-start",
              gap: "14px"
            });
            A.el("div", "", item, {
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: col,
              marginTop: "14px",
              flexShrink: 0
            });
            A.text(item, line, "body", "", {
              flex: 1,
              fontSize: A.scam ? "36px" : "40px",
              lineHeight: 1.38,
              textAlign: "start"
            });
          }
        } else {
          A.text(bodyBox, bodyStr, "body", "", {
            width: "100%",
            fontSize: A.scam ? "40px" : "44px",
            lineHeight: 1.4,
            textAlign: "start"
          });
        }
        A.fit(bodyBox, 0.52);
        bodyBox.style.height = "auto";
      }

      const cardAt = A.at("card", idx);
      A.enter(panel, "card", idx);
      Stage.tl.fromTo(
        stripe,
        { scaleX: 0 },
        { scaleX: 1, duration: 0.48, ease: Stage.ease("power3"), immediateRender: true },
        cardAt + 0.08
      );
      return panel;
    }

    const aTone = resolveTone(s.a_tone, "danger");
    const bTone = resolveTone(s.b_tone, "accent");

    makePanel(
      s.a_title ?? s.left_title ?? s.start_title,
      s.a_icon ?? s.left_icon ?? s.start_icon,
      s.a_body ?? s.left_body ?? s.start_body,
      aTone,
      0
    );

    // Center divider column with drawing SVG line + popping VS badge
    const divCol = A.el("div", "", row, {
      width: A.scam ? "72px" : "88px",
      flexShrink: 0,
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    });
    const divHost = A.el("div", "", divCol, {
      position: "absolute",
      top: "18px",
      bottom: "18px",
      left: "50%",
      width: "4px",
      marginLeft: "-2px"
    });
    const divSvg = A.svg(divHost, 0, 0, 4, 500, "0 0 4 500");
    divSvg.style.width = "100%";
    divSvg.style.height = "100%";
    divSvg.setAttribute("preserveAspectRatio", "none");
    const divPath = A.svgEl(divSvg, "path", {
      d: "M 2 0 L 2 500",
      stroke: "var(--c-cardBorder)",
      "stroke-width": 3,
      "stroke-linecap": "round",
      fill: "none"
    });
    A.draw(divPath, A.at("card", 0) + 0.14, 0.52);

    const vsLabel = String(s.vs_label || "VS").trim();
    const vsBadge = A.el("div", "", divCol, {
      minWidth: "66px",
      maxWidth: "108px",
      height: "66px",
      padding: "0 14px",
      borderRadius: "999px",
      background: "var(--c-bg2)",
      border: "2px solid var(--c-cardBorder)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      zIndex: 2,
      boxShadow: "0 10px 26px rgba(0,0,0,0.45)"
    });
    A.text(vsBadge, vsLabel, "eyebrow", "", {
      fontSize: vsLabel.length > 3 ? "20px" : "24px",
      color: A.color("text"),
      whiteSpace: "nowrap",
      letterSpacing: A.ltr ? "0.06em" : "0"
    });
    A.fit(vsBadge, 0.6);
    A.pop(vsBadge, A.at("badge", 0), 0);

    makePanel(
      s.b_title ?? s.right_title ?? s.end_title,
      s.b_icon ?? s.right_icon ?? s.end_icon,
      s.b_body ?? s.right_body ?? s.end_body,
      bTone,
      1
    );

    if (s.verdict) {
      const vTone = resolveTone(s.verdict_tone, "accent");
      const vCol = A.color(vTone);
      const vCls = "card" + (vTone === "danger" ? " dng-b" : vTone === "accent" ? " acc-b" : "");
      const verdictCard = A.el("div", vCls, outer, {
        position: "relative",
        width: "100%",
        padding: "16px 28px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "14px",
        borderColor: (vTone === "good" || vTone === "info") ? alphaCol(vCol, 0.45) : undefined
      });
      A.el("div", "", verdictCard, {
        width: "10px",
        height: "10px",
        borderRadius: "50%",
        background: vCol,
        flexShrink: 0
      });
      const vTextWrap = A.el("div", "", verdictCard, {
        height: "48px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      });
      A.text(vTextWrap, s.verdict, "label", "", {
        fontSize: "28px",
        textAlign: "center",
        color: A.color("text")
      });
      A.fit(vTextWrap, 0.55);
      vTextWrap.style.height = "auto";
      A.enter(verdictCard, "note", 0);
    }

    A.fit(outer, 0.55);
  }
});
