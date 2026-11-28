Stage.template({
  name: "study_card",
  build(s, A) {
    function toLatinDigits(str) {
      return String(str)
        .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
        .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
        .replace(/٫/g, ".")
        .replace(/٬/g, ",");
    }

    function parseNum(v) {
      if (typeof v === "number") return v;
      if (Stage.toNum) return Stage.toNum(v);
      return parseFloat(toLatinDigits(String(v)).replace(/,/g, "")) || 0;
    }

    function countDecimals(numStr) {
      const clean = toLatinDigits(numStr);
      const m = clean.match(/\.(\d+)/);
      return m ? m[1].length : 0;
    }

    function fmtSample(str) {
      return String(str).replace(/\d[\d.,۰-۹٬٫]*/g, (m) => {
        const dec = countDecimals(m);
        return Stage.fmt(parseNum(m), dec);
      });
    }

    function parseStats(raw) {
      if (!raw) return [];
      const arr = Array.isArray(raw) ? raw : String(raw).split("\n").map((x) => x.trim()).filter(Boolean);
      return arr.slice(0, 3).map((item, idx) => {
        if (item && typeof item === "object" && !Array.isArray(item)) {
          const val = parseNum(item.value ?? item.number ?? 0);
          return {
            label: String(item.label || ""),
            value: val,
            prefix: item.prefix || "",
            suffix: item.suffix || "",
            decimals: item.decimals != null ? +item.decimals : countDecimals(String(item.value ?? "")),
            tone: Stage.T.tone(item.tone) || (item.tone === "muted" || item.tone === "info" || item.tone === "good" ? item.tone : (idx === 0 ? "accent" : "text"))
          };
        }
        let line = String(item);
        let tone = null;
        const pipeParts = line.split("|").map((x) => x.trim());
        if (pipeParts.length >= 2) {
          const last = pipeParts[pipeParts.length - 1].toLowerCase();
          if (/^(accent|danger|bad|red|good|yellow|muted|info)$/.test(last)) {
            tone = Stage.T.tone(last) || last;
            pipeParts.pop();
          }
        }

        let label = "";
        let valPart = "";
        let extraSuffix = "";

        if (pipeParts.length >= 2) {
          label = pipeParts[0];
          valPart = pipeParts[1];
          if (pipeParts[2]) extraSuffix = pipeParts[2];
        } else {
          const colonIdx = pipeParts[0].lastIndexOf(":");
          if (colonIdx > 0) {
            label = pipeParts[0].slice(0, colonIdx).trim();
            valPart = pipeParts[0].slice(colonIdx + 1).trim();
          } else {
            valPart = pipeParts[0];
          }
        }

        const toneMatch = valPart.match(/\((accent|danger|bad|good|muted|info)\)\s*$/i);
        if (toneMatch) {
          tone = Stage.T.tone(toneMatch[1].toLowerCase()) || toneMatch[1].toLowerCase();
          valPart = valPart.slice(0, toneMatch.index).trim();
        }

        const lat = toLatinDigits(valPart);
        const numMatch = lat.match(/^([^\d\-+]*)([-+]?[\d,]+(?:\.\d+)?)(.*)$/);
        let value = 0;
        let prefix = "";
        let suffix = extraSuffix;
        let decimals = 0;
        if (numMatch) {
          prefix = numMatch[1].trim();
          value = parseNum(numMatch[2]);
          decimals = countDecimals(numMatch[2]);
          if (!suffix && numMatch[3]) suffix = numMatch[3].trim();
        } else {
          value = parseNum(valPart);
        }

        return {
          label,
          value,
          prefix,
          suffix,
          decimals,
          tone: tone || (idx === 0 ? "accent" : "text")
        };
      });
    }

    const stats = parseStats(s.stats);
    const left = A.area.left;
    const right = A.L.margin;
    const top = A.area.y;
    const bottom = A.scam ? 104 : 96;

    const outer = A.el("div", "col", A.root, {
      left,
      right,
      top,
      bottom,
      justifyContent: "center",
      gap: "20px"
    });

    // Main Citation Card
    const citeCard = A.el("div", "card", outer, {
      width: "100%",
      padding: A.scam ? "30px 38px" : "36px 46px",
      display: "flex",
      flexDirection: "column",
      gap: "16px",
      position: "relative"
    });

    // Top metadata row: Eyebrow + Sample Badge
    if (s.eyebrow || s.sample) {
      const topBar = A.el("div", "", citeCard, {
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        flexWrap: "wrap"
      });

      if (s.eyebrow) {
        const ey = A.el("div", "badge acc", topBar, {
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 16px",
          borderRadius: (A.L.badgeRadius || 8) + "px"
        });
        A.text(ey, s.eyebrow, "eyebrow", "", {
          fontSize: "22px",
          color: A.color("accent"),
          letterSpacing: A.ltr ? "0.12em" : "0"
        });
        A.enter(ey, "eyebrow", 0);
      } else {
        A.el("div", "", topBar);
      }

      if (s.sample) {
        const samp = A.el("div", "", topBar, {
          display: "inline-flex",
          alignItems: "center",
          padding: "8px 18px",
          borderRadius: (A.L.badgeRadius || 8) + "px",
          background: "var(--c-bg2)",
          border: "1px solid var(--c-cardBorder)",
          fontVariantNumeric: "tabular-nums"
        });
        A.text(samp, fmtSample(s.sample), "caption", "", {
          fontSize: "24px",
          fontWeight: 700,
          color: A.color("text")
        });
        A.enter(samp, "badge", 0);
      }
    }

    // Authors + Journal row
    if (s.authors || s.journal) {
      const metaRow = A.el("div", "", citeCard, {
        width: "100%",
        height: "52px",
        display: "flex",
        alignItems: "baseline",
        flexWrap: "wrap",
        gap: "12px"
      });
      if (s.authors) {
        A.text(metaRow, s.authors, "label", "", {
          fontSize: "28px",
          color: A.color("text")
        });
      }
      if (s.authors && s.journal) {
        A.text(metaRow, "·", "body", "", {
          fontSize: "28px",
          color: A.color("muted")
        });
      }
      if (s.journal) {
        A.text(metaRow, s.journal, "body", "", {
          fontSize: "24px",
          color: A.color("muted")
        });
      }
      A.fit(metaRow, 0.6);
      metaRow.style.height = "auto";
      A.enter(metaRow, "body", 0);
    }

    // Subtle divider rule
    const rule = A.el("div", "rule", citeCard, {
      width: "100%",
      height: "1px",
      background: "var(--c-cardBorder)",
      transformOrigin: A.originStart
    });

    // Finding sentence
    const findingBox = A.el("div", "", citeCard, {
      width: "100%",
      height: stats.length ? (A.scam ? "170px" : "190px") : "300px",
      display: "flex",
      alignItems: "center"
    });
    A.text(findingBox, s.finding || "", "h1", "", {
      width: "100%",
      fontSize: A.scam ? "38px" : "44px",
      lineHeight: 1.32,
      textAlign: "start"
    });
    A.fit(findingBox, 0.55);
    findingBox.style.height = "auto";
    A.enter(findingBox, "title", 0, 0.06);

    A.enter(citeCard, "card", 0);
    Stage.tl.fromTo(
      rule,
      { scaleX: 0 },
      { scaleX: 1, duration: 0.45, ease: Stage.ease("power3"), immediateRender: true },
      A.at("card", 0) + 0.14
    );

    // 1–3 Big Count-Up Stat Cards
    if (stats.length) {
      const grid = A.el("div", "", outer, {
        width: "100%",
        display: "grid",
        gridTemplateColumns: `repeat(${stats.length}, 1fr)`,
        gap: "20px"
      });

      const numSize = stats.length === 3 ? (A.scam ? 78 : 96) : stats.length === 2 ? (A.scam ? 96 : 114) : (A.scam ? 116 : 134);

      stats.forEach((st, i) => {
        const cls = "card" + (st.tone === "danger" ? " dng-b" : st.tone === "accent" ? " acc-b" : "");
        const card = A.el("div", cls, grid, {
          padding: A.scam ? "26px 30px" : "30px 36px",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "12px",
          position: "relative",
          overflow: "hidden"
        });

        const barColor = A.color(st.tone || "accent");
        const topBar = A.el("div", "", card, {
          position: "absolute",
          top: "0px",
          left: "0px",
          right: "0px",
          height: "5px",
          background: barColor,
          transformOrigin: A.originStart
        });

        if (st.label) {
          const lblBox = A.el("div", "", card, {
            width: "100%",
            height: "44px",
            display: "flex",
            alignItems: "center"
          });
          A.text(lblBox, st.label, "label", "", {
            fontSize: stats.length === 3 ? "24px" : "28px",
            color: A.color("muted"),
            textAlign: "start"
          });
          A.fit(lblBox, 0.55);
          lblBox.style.height = "auto";
        }

        const numWrap = A.el("div", "", card, {
          width: "100%",
          height: (numSize + 14) + "px",
          display: "flex",
          alignItems: "center"
        });
        const numEl = A.el("div", "t-number", numWrap, {
          fontSize: numSize + "px",
          lineHeight: 1.05,
          color: st.tone === "text" ? A.color("text") : barColor,
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap"
        });

        const cardAt = A.at("card", i + 1);
        A.count(numEl, {
          to: st.value,
          from: 0,
          prefix: st.prefix,
          suffix: st.suffix,
          decimals: st.decimals,
          at: cardAt + 0.08,
          dur: 1.15
        });

        A.fit(numWrap, 0.5);
        numWrap.style.height = "auto";

        A.enter(card, "card", i + 1);
        Stage.tl.fromTo(
          topBar,
          { scaleX: 0 },
          { scaleX: 1, duration: 0.45, ease: Stage.ease("power3"), immediateRender: true },
          cardAt + 0.08
        );
      });
    }

    // Optional Caveat Line
    if (s.caveat) {
      const cavRow = A.el("div", "", outer, {
        width: "100%",
        height: "44px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        paddingInlineStart: "6px"
      });
      A.el("div", "", cavRow, {
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        background: A.color("muted"),
        flexShrink: 0
      });
      A.text(cavRow, s.caveat, "caption", "", {
        fontSize: "24px",
        color: A.color("muted"),
        textAlign: "start"
      });
      A.fit(cavRow, 0.6);
      cavRow.style.height = "auto";
      A.enter(cavRow, "note", 0);
    }

    A.fit(outer, 0.55);
  }
});
