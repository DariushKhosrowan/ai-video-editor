Stage.template({
  name: "article_zoom",
  build(s, A) {
    const th = A.th, colColors = th.colors || {};
    const preset = (Stage.fx && Stage.fx.cur && Stage.fx.cur.preset) || "cinematic-push";
    const paperTheme = s.paper_theme || "warm-paper";
    const isLightStage = colColors.isDark === false;
    const accent = colColors.accent || "#F5B700";

    // Soft dreamy blurred editorial backdrop (only if slide explicitly specifies bg_image)
    const lsBg = s.livingStage && s.livingStage.bgStyle;
    const hasLivingBlur = (lsBg === "editorial-blur" || lsBg === "dreamy-bokeh") && (s.livingStage.intensity !== "off");
    const backdropSrc = s.bg_image;
    if (backdropSrc && !hasLivingBlur) {
      const bgBlurWrap = A.el("div", "abs fullbleed az-backdrop-blur", A.root, { inset: "-32px", pointerEvents: "none", zIndex: 0 });
      const bgIm = A.el("img", "", bgBlurWrap, {
        width: "100%",
        height: "100%",
        objectFit: "cover",
        filter: "blur(22px) saturate(1.1) brightness(0.42)",
        opacity: isLightStage ? "0.18" : "0.48",
        transform: "scale(1.12) translateZ(0)",
      });
      bgIm.src = backdropSrc;
      bgIm.alt = "";
      bgIm.onerror = () => bgBlurWrap.remove();
      Stage._imgs.push(bgIm);
      A.el("div", "abs", bgBlurWrap, {
        inset: 0,
        background: isLightStage
          ? "radial-gradient(ellipse 85% 80% at 50% 45%, rgba(247,244,238,0.45), rgba(240,236,227,0.88))"
          : "radial-gradient(ellipse 85% 80% at 50% 45%, rgba(10,14,22,0.32), rgba(7,10,16,0.86))",
      });
    }

    const header = Stage.T.header(A, {
      eyebrow: s.eyebrow,
      title: preset === "split-paper" ? "" : s.title,
      subtitle: preset === "split-paper" ? "" : s.subtitle,
    }, { left: A.area.left, maxH: 170, fieldEyebrow: true, fieldTitle: preset !== "split-paper" });

    const topY = Math.max(A.area.y, (header.bottom || A.area.y) + (header.el ? 18 : 6));
    const bottomPad = A.scam ? 96 : 86;
    const areaLeft = A.area.left;
    const areaRight = A.area.x;
    const areaW = A.W - areaLeft - areaRight;
    const areaH = A.H - topY - bottomPad;

    const hasArticleText = Boolean(s.article_title || s.article_body || s.focus_text);
    const useImageZoom = s.zoom_mode === "image" || (!hasArticleText && Boolean(s.image));

    if (useImageZoom && s.image) {
      // Document / Screenshot Direct Image Pan & Zoom
      const stageBox = A.el("div", "frame shadow az-img-stage", A.root, {
        left: areaLeft,
        top: topY,
        width: areaW,
        height: areaH,
        borderRadius: "24px",
        overflow: "hidden",
      });
      A.field("paper", stageBox);
      const rig = A.el("div", "az-camera-rig", stageBox, {
        position: "relative",
        width: "100%",
        height: "100%",
        transformOrigin: "50% 50%",
      });
      const im = A.el("img", "", rig, {
        width: "100%",
        height: "100%",
        objectFit: s.fit || "cover",
        display: "block",
      });
      im.src = s.image;
      im.alt = s.article_title || s.title || "";
      im.onerror = () => { im.remove(); A.placeholder(rig, s.image); };
      Stage._imgs.push(im);

      const zx = Math.max(8, Math.min(92, Number(s.zoom_x ?? 50)));
      const zy = Math.max(8, Math.min(92, Number(s.zoom_y ?? 48)));
      const zScale = Math.max(1.08, Math.min(2.6, Number(s.zoom_scale ?? 1.55)));

      // Soft highlight lens band at focal coordinates
      const hlBand = A.el("div", "az-img-focus-band", rig, {
        position: "absolute",
        left: `${zx}%`,
        top: `${zy}%`,
        width: "44%",
        height: "13%",
        transform: "translate(-50%, -50%)",
        borderRadius: "12px",
        background: "linear-gradient(90deg, rgba(245,183,0,0.14), rgba(245,183,0,0.34), rgba(245,183,0,0.14))",
        border: `2.5px solid ${accent}`,
        boxShadow: "0 0 0 9999px rgba(8, 12, 20, 0.42)",
        pointerEvents: "none",
      });

      A.enter(stageBox, "image", 0, 0);
      rig.style.transformOrigin = `${zx}% ${zy}%`;
      Stage.tl.fromTo(rig, { scale: 1 }, { scale: zScale, duration: 1.35, ease: Stage.ease("power3"), immediateRender: true }, 0.85);
      Stage.tl.fromTo(hlBand, { opacity: 0, scaleX: 0.35 }, { opacity: 1, scaleX: 1, duration: 0.65, ease: Stage.ease("power3"), immediateRender: true }, 1.15);
      if (Stage.fx) Stage.fx.cue(1.15, "swish", "article-zoom");
      return;
    }

    // Editorial Paper / Research Article Zoom Sheet
    let paperLeft = areaLeft;
    let paperW = areaW;
    if (preset === "split-paper" && s.title && areaW > 980) {
      const sideW = Math.min(430, Math.round(areaW * 0.33));
      const sideCol = A.el("div", "col card podcast-card-surface", A.root, {
        right: areaRight,
        width: sideW,
        top: topY,
        padding: "36px 38px",
        gap: "16px",
        backdropFilter: "blur(20px)",
      });
      A.enter(A.text(sideCol, s.title, "h1", "", { fontSize: "48px" }), "title");
      if (s.subtitle) A.enter(A.text(sideCol, s.subtitle, "body", "", { fontSize: "30px" }), "body");
      A.enter(sideCol, "card");
      A.fit(sideCol, 0.6);
      paperW = areaW - sideW - 36;
    } else if (areaW > 1280) {
      const targetW = Math.min(1240, areaW);
      paperLeft = areaLeft + Math.round((areaW - targetW) / 2);
      paperW = targetW;
    }

    const viewport = A.el("div", "az-viewport frame shadow", A.root, {
      left: paperLeft,
      top: topY,
      width: paperW,
      height: areaH,
      borderRadius: "24px",
      overflow: "hidden",
      perspective: "1400px",
    });
    A.field("paper", viewport);

    const isDarkPaper = paperTheme === "editorial-dark";
    const isNewsprint = paperTheme === "newsprint";
    const paperBg = isDarkPaper
      ? "linear-gradient(155deg, rgba(22,28,42,0.94), rgba(14,18,28,0.97))"
      : isNewsprint
        ? "linear-gradient(160deg, #ede5d4 0%, #e3d8c2 100%)"
        : "linear-gradient(160deg, #faf7f0 0%, #f1eadc 100%)";
    const inkColor = isDarkPaper ? "#f8fafc" : "#18181b";
    const mutedInk = isDarkPaper ? "#94a3b8" : "#57534e";
    const ruleColor = isDarkPaper ? "rgba(255,255,255,0.14)" : "rgba(24,24,27,0.16)";

    const targetScale = Math.max(1.08, Math.min(1.24, Number(s.zoom_scale || (preset === "marker-sweep" ? 1.22 : 1.18))));
    // Reserve enough side margin inside the paper so scaling by targetScale keeps 100% of text inside the viewport
    const innerSafeW = Math.max(420, (paperW - 90) / targetScale);
    const zoomPadX = Math.max(54, Math.round((paperW - innerSafeW) / 2));

    const rig = A.el("div", "az-paper-rig", viewport, {
      position: "relative",
      width: "100%",
      minHeight: "100%",
      padding: `${A.scam ? 24 : 30}px ${zoomPadX}px`,
      background: paperBg,
      color: inkColor,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      gap: "14px",
      transformOrigin: "50% 50%",
      border: isDarkPaper ? "1.5px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.08)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.28)",
    });

    // Masthead row
    const masthead = A.el("div", "az-masthead", rig, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "14px",
      paddingBottom: "11px",
      borderBottom: `2px solid ${ruleColor}`,
      fontSize: "19px",
      fontWeight: 700,
      color: mutedInk,
    });
    const pubSpan = A.el("span", "", masthead);
    pubSpan.textContent = s.publication || "پژوهش و گزارش مستند";
    if (!/[آ-ی]/.test(pubSpan.textContent)) pubSpan.setAttribute("dir", "ltr");
    const authorSpan = A.el("span", "", masthead, { fontSize: "18px", fontWeight: 500 });
    authorSpan.textContent = s.author || "گزیدهٔ سند اصلی";

    // Article Headline
    const artTitle = s.article_title || "یافتهٔ اصلی پژوهش و بررسی داده‌ها";
    const titleEl = A.el("div", "az-article-title", rig, {
      fontSize: A.scam ? "32px" : "38px",
      fontWeight: 900,
      lineHeight: 1.32,
      color: inkColor,
      textWrap: "balance",
    });
    titleEl.innerHTML = Stage.rich(artTitle);
    if (!/[آ-ی]/.test(artTitle) && /[A-Za-z]/.test(artTitle)) titleEl.setAttribute("dir", "ltr");

    // Split article_body into paragraphs (above and/or around focus_text)
    const paras = String(s.article_body || "")
      .split(/\n+/)
      .map((x) => x.trim())
      .filter(Boolean);
    const bodyBefore = paras.length ? paras[0] : "بررسی تطبیقی داده‌های میدانی نشان می‌دهد الگوهای تکراری رفتار در محیط‌های نامطمئن تفاوت معناداری با مدل‌های کلاسیک دارند.";
    const bodyAfter = paras.length > 1 ? paras.slice(1).join(" ") : "";

    const pBeforeEl = A.el("div", "az-dim-para", rig, {
      fontSize: A.scam ? "21px" : "24px",
      lineHeight: 1.66,
      color: mutedInk,
    });
    pBeforeEl.innerHTML = Stage.rich(bodyBefore);

    // Focus Sentence Block (target for camera zoom + marker highlight sweep)
    const focusRaw = s.focus_text || "یافتهٔ کلیدی نشان می‌دهد تغییرات کوچک در ساختار پاداش می‌تواند نتیجه را تا چند برابر دگرگون کند.";
    const focusWrap = A.el("div", "az-focus-box", rig, {
      padding: "16px 22px",
      borderRadius: "14px",
      background: isDarkPaper ? "rgba(245, 183, 0, 0.08)" : "rgba(245, 183, 0, 0.14)",
      border: `1.5px solid ${isDarkPaper ? "rgba(245,183,0,0.34)" : "rgba(180,120,0,0.28)"}`,
    });
    const focusTextEl = A.el("div", "az-focus-span", focusWrap, {
      fontSize: A.scam ? "26px" : "30px",
      fontWeight: 800,
      lineHeight: 1.55,
      color: inkColor,
    });
    const markerSpan = A.el("span", "az-marker-hl", focusTextEl, {
      backgroundImage: isDarkPaper
        ? "linear-gradient(120deg, rgba(245,183,0,0.44), rgba(245,183,0,0.34))"
        : "linear-gradient(120deg, rgba(255,214,0,0.72), rgba(255,228,77,0.58))",
      backgroundRepeat: "no-repeat",
      backgroundPosition: "100% 60%",
      backgroundSize: "0% 88%",
      padding: "2px 8px",
      borderRadius: "6px",
    });
    markerSpan.innerHTML = Stage.rich(focusRaw);

    let pAfterEl = null;
    if (bodyAfter) {
      pAfterEl = A.el("div", "az-dim-para", rig, {
        fontSize: A.scam ? "20px" : "23px",
        lineHeight: 1.65,
        color: mutedInk,
      });
      pAfterEl.innerHTML = Stage.rich(bodyAfter);
    }

    // Optional small floating paper thumbnail on side if user attached an editorial photo alongside text
    if (s.image && s.image !== "/assets/archive-newspaper.jpg" && preset !== "marker-sweep") {
      const miniThumb = A.el("img", "", masthead, {
        width: "64px",
        height: "44px",
        objectFit: "cover",
        borderRadius: "8px",
        border: `1px solid ${ruleColor}`,
      });
      miniThumb.src = s.image;
      miniThumb.alt = "";
      miniThumb.onerror = () => miniThumb.remove();
      Stage._imgs.push(miniThumb);
    }

    // Compute exact offset from viewport center to focusWrap center so zoom centers cleanly on focus_text
    const vpRect = viewport.getBoundingClientRect();
    const fwRect = focusWrap.getBoundingClientRect();
    const ox = 50;
    const oy = fwRect.height ? ((fwRect.top + fwRect.height / 2 - vpRect.top) / Math.max(1, vpRect.height)) * 100 : 55;
    rig.style.transformOrigin = `${ox.toFixed(1)}% ${Math.max(25, Math.min(78, oy)).toFixed(1)}%`;

    const startRotateX = preset === "tilt-glide" ? 6 : 2;
    const startRotateY = preset === "tilt-glide" ? -4 : 0;

    // Smooth documentary timeline
    A.enter(viewport, "card", 0, 0);
    Stage.tl.fromTo(
      rig,
      { scale: 0.94, rotateX: startRotateX, rotateY: startRotateY },
      { scale: 1, rotateX: 0, rotateY: 0, duration: 0.72, ease: Stage.ease("power3"), immediateRender: true },
      0.08
    );

    Stage.tl.to(
      rig,
      {
        scale: targetScale,
        duration: 1.15,
        ease: Stage.ease("power3"),
      },
      0.85
    );

    const dimTargets = [masthead, titleEl, pBeforeEl, pAfterEl].filter(Boolean);
    Stage.tl.to(
      dimTargets,
      { opacity: 0.68, duration: 0.85, ease: "power2.out" },
      0.92
    );

    Stage.tl.fromTo(
      markerSpan,
      { backgroundSize: "0% 88%" },
      { backgroundSize: "100% 88%", duration: 0.88, ease: Stage.ease("power3"), immediateRender: true },
      1.32
    );
    if (Stage.fx) Stage.fx.cue(1.32, "swish", focusRaw.slice(0, 30));
  },
});
