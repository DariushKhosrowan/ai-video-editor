Stage.template({
  name: "podcast_end",
  build(s, A) {
    const th = A.th, colColors = th.colors || {};
    const right = A.area.x;
    const left = A.area.left;

    const header = A.el("div", "col", A.root, {
      right,
      left,
      top: A.area.y + 10,
      height: 290,
      alignItems: "center",
      textAlign: "center",
      gap: "14px",
    });

    if (s.eyebrow) {
      const ey = A.text(header, s.eyebrow, "eyebrow");
      A.field("eyebrow", ey);
      A.enter(ey, "eyebrow");
    }
    const tEl = A.text(header, s.title || "ممنون از همراهی شما", "hero", "", { fontSize: "74px" });
    A.field("title", tEl);
    A.kinetic(tEl, { at: A.at("title"), role: "title", stagger: 0.05 });

    if (s.subtitle) {
      const subEl = A.text(header, s.subtitle, "body", "", { color: colColors.muted, fontSize: "34px" });
      A.field("subtitle", subEl);
      A.enter(subEl, "body", 0, 0.15);
    }

    const slotY = A.area.y + 330;
    const slotW = A.scam ? 540 : 720;
    const slotH = 380;
    const gap = 56;
    const startX = A.scam ? left + 20 : (A.W - (slotW * 2 + gap)) / 2;

    ["ویدیوی پیشنهادی ۱", "اپیزود قبلی / بعدی"].forEach((lbl, idx) => {
      const bx = startX + idx * (slotW + gap);
      const card = A.el("div", "card podcast-card-surface", A.root, {
        left: bx,
        top: slotY,
        width: slotW,
        height: slotH,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        borderStyle: "dashed",
      });
      A.text(card, "▶", "h1", "acc", { fontSize: "52px" });
      A.text(card, lbl, "label", "mut");
      A.enter(card, "card", idx, 0.2);
    });

    const ctaText = s.cta || "عضویت در کانال + زنگوله 🔔";
    const cta = A.el("div", "badge acc podcast-cta-pill", A.root, {
      bottom: A.scam ? 130 : 110,
      left: A.scam ? left + 180 : A.W / 2 - 260,
      width: 520,
      textAlign: "center",
      padding: "20px 36px",
      fontSize: "34px",
      borderRadius: "999px",
      boxShadow: "0 18px 46px rgba(245, 183, 0, 0.25)",
    });
    cta.innerHTML = Stage.rich(ctaText);
    A.enter(cta, "badge", 1, 0.45);
    if (Stage.amb) {
      Stage.amb.fromTo(cta, { scale: 1 }, { scale: 1.045, duration: 1.8, ease: "sine.inOut", yoyo: true, repeat: 9 }, 0.8);
    }
    A.fit(header, 0.6);
  },
});
