Stage.template({
  name: "map_choropleth",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const col = A.th.colors || {};
    const padX = asp.isPortrait ? 48 : A.area.x;
    const leftEdge = asp.isPortrait ? 48 : A.area.left;
    const topY = asp.isPortrait ? 90 : A.area.y;

    const ey = A.text(A.root, s.eyebrow || "نقشهٔ آماری", "eyebrow", "abs", {
      right: padX, top: topY, color: A.color(s.color || "accent"), fontSize: "28px",
    });
    A.field("eyebrow", ey);
    A.enter(ey, "eyebrow");

    const title = A.text(A.root, s.title || "", "h1", "abs", {
      right: padX, left: leftEdge, top: topY + 50,
      fontSize: asp.isPortrait ? "50px" : "56px", lineHeight: 1.28,
    });
    A.field("title", title);
    A.kinetic(title, { at: A.at("title"), mode: s.textMotion || s.text_motion || "rise-mask", role: "title" });

    let regions = s.regions;
    if (typeof regions === "string") {
      try { regions = JSON.parse(regions); } catch (_) { regions = null; }
    }

    const mapTop = topY + (asp.isPortrait ? 210 : 172);
    const mapBot = s.caption ? (asp.isPortrait ? 190 : 140) : (A.scam ? 105 : 82);
    const boxW = Math.max(360, A.W - padX - leftEdge);
    const boxH = Math.max(280, A.H - mapTop - mapBot);
    const mapCard = A.box(A.root, leftEdge, mapTop, boxW, boxH, "card");
    mapCard.style.overflow = "hidden";
    mapCard.dataset.depth = "0.5";
    mapCard.clientWidth = boxW;
    mapCard.clientHeight = boxH;

    if (Stage.charts && Stage.charts.choropleth) {
      Stage.charts.choropleth(A, mapCard, {
        regions,
        color: s.color || "accent",
        suffix: s.suffix || "",
      }, 0.25);
    }

    if (s.caption) {
      const cap = A.text(A.root, s.caption, "body", "abs", {
        left: leftEdge, right: padX, bottom: A.scam ? 96 : 64,
        fontSize: "28px", color: col.muted, textAlign: "center",
      });
      A.field("caption", cap);
      A.enter(cap, "note", 0, 0.35);
    }
    if (s.suffix) {
      const sf = A.text(A.root, `مقیاس: ${s.suffix}`, "caption", "abs", {
        left: leftEdge, top: topY + 8, color: col.muted, fontSize: "22px",
      });
      A.field("suffix", sf);
    }
  },
});
