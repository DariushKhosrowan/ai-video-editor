Stage.template({
  name: "donut_chart",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const padX = asp.isPortrait ? 48 : A.area.x;
    const leftEdge = asp.isPortrait ? 48 : A.area.left;
    const topY = asp.isPortrait ? 90 : A.area.y;

    const ey = A.text(A.root, s.eyebrow || "سهم‌بندی داده‌ها", "eyebrow", "abs", {
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

    const chartTop = topY + (asp.isPortrait ? 205 : 172);
    const chartBot = A.scam ? 105 : 86;
    const boxW = Math.max(360, A.W - padX - leftEdge);
    const boxH = Math.max(320, A.H - chartTop - chartBot);
    const chartBox = A.box(A.root, leftEdge, chartTop, boxW, boxH);
    chartBox.clientWidth = boxW;
    chartBox.clientHeight = boxH;

    if (Stage.charts && Stage.charts.donut) {
      Stage.charts.donut(A, chartBox, {
        data: A.data(s.data),
        pie: s.pie === true,
        center_label: s.center_label || "",
        center_value: s.center_value,
        prefix: s.prefix || "",
        suffix: s.suffix || "",
      }, 0.28);
    }

    if (s.center_label) {
      const meta = A.text(A.root, `${s.center_label}${s.suffix ? " (" + s.suffix.trim() + ")" : ""}`, "caption", "abs", {
        left: leftEdge, top: topY + 8, color: A.th.colors.muted, fontSize: "22px",
      });
      A.field("center_label", meta);
      A.field("suffix", meta);
      A.enter(meta, "note");
    }
  },
});
