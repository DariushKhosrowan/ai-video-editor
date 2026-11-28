Stage.template({
  name: "convey_english",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const col = A.th.colors || {};
    const isLight = col.isDark === false;
    const padX = asp.isPortrait ? 44 : A.area.x;
    const leftEdge = asp.isPortrait ? 44 : A.area.left;
    const topY = asp.isPortrait ? 88 : A.area.y;

    const ey = A.text(A.root, s.eyebrow || "English in Context · آموزش مفهومی", "eyebrow", "abs", {
      right: padX, top: topY, color: A.color("accent"), fontSize: "26px",
    });
    A.field("eyebrow", ey);
    A.enter(ey, "eyebrow");

    const stack = A.el("div", "abs", A.root, {
      left: leftEdge, right: padX, top: topY + 52, bottom: A.scam ? 96 : 68,
      display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "18px",
    });

    // Step 1: Hero English phrase card (strictly LTR)
    const heroCard = A.el("div", "card", stack, {
      padding: asp.isPortrait ? "28px 26px" : "30px 40px",
      borderLeft: `8px solid ${A.color("accent")}`,
      direction: "ltr", textAlign: "left",
      display: "flex", flexDirection: "column", gap: "10px",
    });
    const enEl = A.text(heroCard, s.english || "Read between the lines", "hero", "", {
      fontSize: asp.isPortrait ? "54px" : "64px", fontWeight: 900, lineHeight: 1.18,
      color: A.color("accent"), direction: "ltr",
    });
    A.field("english", enEl);

    if (s.ipa) {
      const ipaEl = A.text(heroCard, s.ipa, "caption", "", {
        fontSize: "24px", fontFamily: "monospace", color: col.muted, direction: "ltr",
      });
      A.field("ipa", ipaEl);
    }

    // Step 2: Natural Persian meaning + Literal breakdown
    const meanCard = A.el("div", "card", stack, {
      padding: asp.isPortrait ? "24px 26px" : "24px 36px",
      borderRight: `8px solid ${A.color("good")}`,
      display: "flex", flexDirection: "column", gap: "10px",
    });
    A.text(meanCard, "معنای طبیعی در فارسی:", "caption", "", { color: A.color("good"), fontWeight: 800, fontSize: "23px" });
    const natEl = A.text(meanCard, s.natural_fa || "", "h2", "", {
      fontSize: asp.isPortrait ? "34px" : "38px", lineHeight: 1.48, color: col.text,
    });
    A.field("natural_fa", natEl);
    if (s.literal_fa) {
      const litEl = A.text(meanCard, s.literal_fa, "caption", "", { fontSize: "23px", color: col.muted });
      A.field("literal_fa", litEl);
    }

    // Step 3: Nuance bullets + Example dialogue
    const bottomRow = A.el("div", "", stack, {
      display: "flex", flexDirection: asp.isPortrait || A.scam ? "column" : "row",
      gap: "18px", flex: "1",
    });

    const rawNuances = Array.isArray(s.nuances) ? s.nuances : String(s.nuances || "").split("\n").filter(Boolean);
    const nuanceItems = [];
    if (rawNuances.length) {
      const nBox = A.el("div", "card", bottomRow, {
        flex: "1", padding: "22px 26px",
        display: "flex", flexDirection: "column", gap: "10px",
      });
      A.text(nBox, "نکات کاربردی:", "caption", "", { color: A.color("accent"), fontWeight: 800, fontSize: "22px" });
      A.field("nuances", nBox);
      rawNuances.slice(0, 4).forEach((line) => {
        const row = A.el("div", "", nBox, { display: "flex", alignItems: "flex-start", gap: "10px" });
        A.el("span", "", row, {
          width: "10px", height: "10px", borderRadius: "50%", background: A.color("accent"), marginTop: "13px", flexShrink: "0",
        });
        A.text(row, String(line), "body", "", { fontSize: asp.isPortrait ? "24px" : "25px", lineHeight: 1.5, color: col.text });
        nuanceItems.push(row);
      });
    }

    let exCard = null;
    if (s.example_en || s.example_fa) {
      exCard = A.el("div", "card", bottomRow, {
        flex: "1", padding: "22px 26px",
        background: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.05)",
        display: "flex", flexDirection: "column", justifyContent: "center", gap: "12px",
      });
      A.text(exCard, "مثال واقعی · Example:", "caption", "", { color: A.color("good"), fontWeight: 800, fontSize: "22px" });
      if (s.example_en) {
        const eEn = A.text(exCard, s.example_en, "body", "", {
          fontSize: asp.isPortrait ? "26px" : "27px", lineHeight: 1.48, color: col.text,
          direction: "ltr", textAlign: "left", fontWeight: 700,
        });
        A.field("example_en", eEn);
      }
      if (s.example_fa) {
        const eFa = A.text(exCard, s.example_fa, "body", "", {
          fontSize: asp.isPortrait ? "24px" : "25px", lineHeight: 1.5, color: col.muted,
        });
        A.field("example_fa", eFa);
      }
    }

    // Progressive step-by-step pedagogical reveal: English -> Natural Meaning -> Nuances one by one -> Real Example
    const seq = [heroCard, meanCard, ...nuanceItems];
    if (exCard) seq.push(exCard);
    A.stepReveal(seq, { role: "card", at: A.at("title", 0, 0.12), minGap: 0.85, sfx: "tick" });
  },
});
