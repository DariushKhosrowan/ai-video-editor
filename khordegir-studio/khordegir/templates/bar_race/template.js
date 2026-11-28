Stage.template({
  name: "bar_race",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const padX = asp.isPortrait ? 48 : A.area.x;
    const leftEdge = asp.isPortrait ? 48 : A.area.left;
    const topY = asp.isPortrait ? 90 : A.area.y;

    const ey = A.text(A.root, s.eyebrow || "مسابقهٔ داده‌ها", "eyebrow", "abs", {
      right: padX, top: topY, color: A.color("accent"), fontSize: "28px",
    });
    A.field("eyebrow", ey);
    A.enter(ey, "eyebrow");

    const title = A.text(A.root, s.title || "", "h1", "abs", {
      right: padX, left: leftEdge, top: topY + 50,
      fontSize: asp.isPortrait ? "50px" : "56px", lineHeight: 1.28,
    });
    A.field("title", title);
    A.kinetic(title, { at: A.at("title"), mode: s.textMotion || s.text_motion || "rise-mask", role: "title" });

    let frames = s.frames;
    if (typeof frames === "string") {
      try { frames = JSON.parse(frames); } catch (_) { frames = null; }
    }

    const chartTop = topY + (asp.isPortrait ? 210 : 178);
    const chartBot = A.scam ? 112 : 96;
    const boxW = Math.max(360, A.W - padX - leftEdge);
    const boxH = Math.max(320, A.H - chartTop - chartBot);
    const chartBox = A.box(A.root, leftEdge, chartTop, boxW, boxH);
    chartBox.clientWidth = boxW;
    chartBox.clientHeight = boxH;

    if (Stage.charts && Stage.charts.barRace) {
      Stage.charts.barRace(A, chartBox, {
        frames,
        suffix: s.suffix || "",
        prefix: s.prefix || "",
        topN: s.top_n || 5,
        race_duration: Number(s.race_duration) || 3.4,
      }, 0.35);
    }

    if (s.suffix) {
      const unitTag = A.text(A.root, `واحد: ${s.suffix}`, "caption", "abs", {
        left: leftEdge, top: topY + 8, color: A.th.colors.muted, fontSize: "22px",
      });
      A.field("suffix", unitTag);
      A.enter(unitTag, "note");
    }
  },
});
