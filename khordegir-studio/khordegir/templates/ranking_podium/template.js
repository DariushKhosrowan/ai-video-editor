Stage.template({
  name: "ranking_podium",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const col = A.th.colors || {};
    const isLight = col.isDark === false;
    const padX = asp.isPortrait ? 44 : A.area.x;
    const leftEdge = asp.isPortrait ? 44 : A.area.left;
    const topY = asp.isPortrait ? 88 : A.area.y;

    const ey = A.text(A.root, s.eyebrow || "رتبه‌بندی برتر", "eyebrow", "abs", {
      right: padX, top: topY, color: A.color("accent"), fontSize: "26px",
    });
    A.field("eyebrow", ey);
    A.enter(ey, "eyebrow");

    const title = A.text(A.root, s.title || "سه رتبه برتر", "h1", "abs", {
      right: padX, left: leftEdge, top: topY + 46,
      fontSize: asp.isPortrait ? "42px" : "50px",
    });
    A.field("title", title);
    A.enter(title, "title");

    const parseRank = (raw, fallback) => {
      const p = String(raw || fallback || "").split("|");
      return { name: (p[0] || "").trim(), score: (p[1] || "").trim(), note: (p[2] || "").trim() };
    };
    const r1 = parseRank(s.first, "رتبه اول | ۹۵ امتیاز | برگزیده نخست");
    const r2 = parseRank(s.second, "رتبه دوم | ۸۴ امتیاز | جایگاه دوم");
    const r3 = parseRank(s.third, "رتبه سوم | ۷۶ امتیاز | جایگاه سوم");

    // Visual order on podium: [2nd, 1st (tallest center), 3rd]
    const slots = [
      { key: "second", rank: 2, medal: "#CBD5E1", heightPct: 74, data: r2 },
      { key: "first",  rank: 1, medal: "#F5B800", heightPct: 100, data: r1 },
      { key: "third",  rank: 3, medal: "#D97745", heightPct: 58, data: r3 },
    ];

    const stageWrap = A.el("div", "abs", A.root, {
      left: leftEdge, right: padX,
      top: topY + (asp.isPortrait ? 190 : 160),
      bottom: A.scam ? 96 : 70,
      display: "flex",
      flexDirection: asp.isPortrait ? "column" : "row",
      alignItems: asp.isPortrait ? "stretch" : "flex-end",
      justifyContent: "center",
      gap: "24px",
    });

    const colsByRank = {};
    slots.forEach((sl) => {
      const colEl = A.el("div", "card", stageWrap, {
        flex: "1",
        height: asp.isPortrait ? "auto" : `${sl.heightPct}%`,
        minHeight: asp.isPortrait ? "180px" : "280px",
        padding: "28px 26px",
        borderTop: `9px solid ${sl.medal}`,
        background: isLight ? (col.card || "#FFFFFF") : (col.card || "#1D1D1D"),
        display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center",
        textAlign: "center", gap: "14px",
      });

      const badge = A.el("div", "", colEl, {
        width: "68px", height: "68px", borderRadius: "50%",
        background: sl.medal, color: "#111111", fontWeight: 900, fontSize: "34px",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 10px 26px rgba(0,0,0,0.34)",
      });
      badge.textContent = Stage.fa(String(sl.rank));

      const nm = A.text(colEl, sl.data.name, "h2", "", {
        fontSize: sl.rank === 1 ? "34px" : "29px", fontWeight: 900, color: col.text,
      });
      A.field(sl.key, nm);

      if (sl.data.score) {
        A.text(colEl, sl.data.score, "value", "", {
          fontSize: sl.rank === 1 ? "46px" : "38px", fontWeight: 900, color: sl.medal,
        });
      }
      if (sl.data.note) {
        A.text(colEl, sl.data.note, "body", "", {
          fontSize: "22px", color: col.muted, lineHeight: 1.45,
        });
      }
      colsByRank[sl.rank] = colEl;
    });

    // Dramatic countdown reveal: 3rd -> 2nd -> 1st!
    A.stepReveal([colsByRank[3], colsByRank[2], colsByRank[1]], {
      role: "card",
      at: A.at("card", 0, 0.25),
      minGap: 0.95,
      sfx: "success",
    });
  },
});
