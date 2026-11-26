Stage.template({
  name: "guest_intro",
  build(s, A) {
    const th = A.th, colColors = th.colors || {};
    const preset = (Stage.fx && Stage.fx.cur && Stage.fx.cur.preset) || "classic";
    const lively = preset !== "classic";
    const left = A.area.left;
    const right = A.area.x;
    const hasImg = Boolean(s.image);
    const imgSize = A.scam ? 380 : 440;

    if (hasImg) {
      const imgX = left;
      const imgY = A.area.y + 40;
      const frame = A.image(A.root, s.image, imgX, imgY, imgSize, imgSize + 60, {
        radius: 26,
        border: "accent",
        motion: s.motion || "gentle-drift",
        reveal: (lively && preset === "editorial-split") ? "wipe" : undefined,
      });
      A.field("image", frame);
    }

    const col = A.el("div", "col card podcast-card-surface", A.root, {
      right,
      left: hasImg ? left + imgSize + 44 : left,
      top: A.area.y + 30,
      padding: "46px 52px",
      gap: "18px",
      alignItems: "flex-start",
      backdropFilter: "blur(16px)",
      boxShadow: (lively && preset === "spotlight") ? `0 18px 46px ${colColors.accent || "#F5B700"}22` : undefined,
    });
    if (lively && preset === "card-float") col.dataset.float = "true";

    if (s.badge) {
      const bd = A.text(col, s.badge, "caption", "badge acc");
      A.enter(bd, "badge", 0, 0, lively ? { ease: "vox" } : {});
    }

    const titleEl = A.text(col, s.title || "مهمان ویژه", "hero", "", {
      fontSize: (s.size || 74) + "px",
    });
    A.field("title", titleEl);
    if (lively && preset === "minimal-clean") {
      A.kinetic(titleEl, { at: A.at("title"), mode: "editorial-blur", role: "title", stagger: 0.038, ease: "fluid" });
    } else if (lively) {
      A.kinetic(titleEl, { at: A.at("title"), mode: "rise-mask", role: "title", stagger: 0.045, ease: "vox" });
    } else {
      A.enter(titleEl, "title");
    }

    if (s.subtitle) {
      const subEl = A.text(col, s.subtitle, "h1", "", {
        fontSize: "38px",
        color: colColors.accent || "#F5B700",
      });
      A.field("subtitle", subEl);
      A.enter(subEl, "body", 0, 0.15, lively ? { ease: "vox" } : {});
    }

    if (s.text) {
      const bodyEl = A.text(col, s.text, "body", "", {
        fontSize: "33px",
        color: colColors.body || colColors.muted,
        maxWidth: "960px",
      });
      A.field("text", bodyEl);
      A.enter(bodyEl, "body", 1, 0.15, lively ? { ease: "fluid" } : {});
    }

    if (s.handle) {
      const hEl = A.text(col, s.handle, "caption", "badge", {
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.16)",
        padding: "8px 18px",
        fontSize: "24px",
        direction: "ltr",
      });
      A.enter(hEl, "badge", 1, 0.25, lively ? { ease: "vox" } : {});
    }

    A.enter(col, "card", 0, 0, lively ? { ease: "vox" } : {});
    A.fit(col, 0.55);
  },
});
