Stage.template({
  name: "polaroid_wall",
  build(s, A) {
    const asp = Stage.T.aspect(A);
    const padX = asp.isPortrait ? 48 : A.area.x;
    const leftEdge = asp.isPortrait ? 48 : A.area.left;
    const topY = asp.isPortrait ? 88 : A.area.y;

    const ey = A.text(A.root, s.eyebrow || "آرشیو تصویری", "eyebrow", "abs", {
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

    const photos = [
      { src: s._photo1_path || s.photo1 || "", cap: s.caption1 || "قاب اول", key: "caption1", tilt: -3.2, depth: -0.7 },
      { src: s._photo2_path || s.photo2 || "", cap: s.caption2 || "قاب دوم", key: "caption2", tilt: 2.1, depth: 0.9 },
      { src: s._photo3_path || s.photo3 || "", cap: s.caption3 || "قاب سوم", key: "caption3", tilt: -2.4, depth: -0.4 },
    ];

    const gridTop = topY + (asp.isPortrait ? 210 : 185);
    const gridBot = A.scam ? 115 : 90;
    const board = A.el("div", "abs", A.root, {
      left: leftEdge, right: padX, top: gridTop, bottom: gridBot,
      display: "grid",
      gridTemplateColumns: asp.isPortrait ? "1fr" : "repeat(3, minmax(0, 1fr))",
      gap: asp.isPortrait ? "24px" : "34px",
      alignItems: "center",
    });

    const cards = [];
    photos.forEach((ph, idx) => {
      const frame = A.el("div", "paper-grain", board, {
        position: "relative",
        background: "#F5F2EA",
        color: "#1B1B1D",
        padding: asp.isPortrait ? "16px 16px 26px" : "18px 18px 34px",
        borderRadius: "6px",
        boxShadow: "0 20px 44px rgba(0,0,0,0.42)",
        transform: `rotate(${ph.tilt}deg)`,
        display: "flex", flexDirection: "column", gap: "16px",
      });
      frame.dataset.depth = String(ph.depth);

      // Decorative translucent masking tape at top center
      A.el("div", "abs", frame, {
        left: "50%", top: "-12px", width: "92px", height: "26px",
        transform: `translateX(-50%) rotate(${(-ph.tilt * 1.3).toFixed(1)}deg)`,
        background: "rgba(255, 224, 130, 0.72)", borderRadius: "2px",
      });

      const imgH = asp.isPortrait ? 240 : 340;
      const imgWrap = A.el("div", "", frame, {
        position: "relative", width: "100%", height: imgH + "px",
        borderRadius: "3px", overflow: "hidden", background: "#24262E",
      });
      if (ph.src) {
        A.image(imgWrap, ph.src, 0, 0, 480, imgH, { radius: 2, shadow: false, enter: false });
      } else {
        A.placeholder(imgWrap, ph.cap);
      }

      const capEl = A.text(frame, ph.cap, "body", "", {
        fontSize: asp.isPortrait ? "26px" : "26px", fontWeight: 700, color: "#1C1C20", textAlign: "center",
      });
      A.field(ph.key, capEl);

      Stage.tl.fromTo(
        frame,
        { opacity: 0, y: 42, scale: 0.94, rotation: ph.tilt * 2.2 },
        { opacity: 1, y: 0, scale: 1, rotation: ph.tilt, duration: A.dur("expressive"), ease: Stage.ease("vox"), immediateRender: true },
        A.at("card") + idx * A.staggerStep("editorial")
      );
      cards.push(frame);
    });
  },
});
