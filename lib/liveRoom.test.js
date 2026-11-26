import test from "node:test";
import assert from "node:assert/strict";
import { createLiveRoom, applyLiveCommand, getPublicRoomState } from "./liveRoom.js";

test("createLiveRoom initializes podcast-ready living defaults", () => {
  const room = createLiveRoom("ensaf-mehrabani");
  assert.equal(room.projectName, "ensaf-mehrabani");
  assert.equal(room.layout, "SCAM");
  assert.equal(room.livingStage.bgStyle, "dreamy-bokeh");
  assert.equal(room.livingStage.intensity, "podcast");
  assert.equal(room.livingStage.floatMode, "images-only");
  assert.equal(room.livingStage.floatStyle, "silk-glide");
  assert.equal(room.livingStage.floatAmplitude, 2);
  assert.equal(room.livingStage.floatSpeed, 0.45);
  assert.equal(room.livingStage.floatRatio, 0.65);
  assert.equal(room.livingStage.floatSeed, 0);
  assert.equal(room.lowerThird.visible, false);
});

test("applyLiveCommand updates slide sync, lower third, chapter, overlay, and SFX cleanly", () => {
  const room = createLiveRoom("podcast-ep1");
  const r1 = applyLiveCommand(room, {
    type: "stage:sync",
    payload: {
      currentStepIndex: 4,
      currentSlideIndex: 2,
      layout: "SLIDE",
      theme: "midnight-cyan",
      activeSlide: { template: "quote", text: "تست زنده" },
      livingStage: {
        bgStyle: "studio-mix",
        floatMode: "images-only",
        floatAmplitude: 7,
        floatSpeed: 0.9,
      },
    },
  });
  assert.equal(r1.ok, true);
  assert.equal(room.currentStepIndex, 4);
  assert.equal(room.layout, "SLIDE");
  assert.equal(room.activeSlide.text, "تست زنده");
  assert.equal(room.livingStage.floatMode, "images-only");
  assert.equal(room.livingStage.floatAmplitude, 7);

  const rOv = applyLiveCommand(room, {
    type: "overlay:set",
    payload: {
      transparentBg: true,
      livingStage: { bgStyle: "wave" },
    },
  });
  assert.equal(rOv.ok, true);
  assert.equal(room.livingStage.bgStyle, "wave");
  assert.equal(room.livingStage.floatMode, "images-only");
  assert.equal(room.livingStage.floatAmplitude, 7);

  const r2 = applyLiveCommand(room, {
    type: "lower_third:set",
    payload: {
      visible: true,
      title: "دکتر مریم احمدی",
      subtitle: "پژوهشگر اقتصاد رفتاری",
      role: "مهمان",
      style: "glass-amber",
    },
  });
  assert.equal(r2.ok, true);
  assert.equal(room.lowerThird.visible, true);
  assert.equal(room.lowerThird.title, "دکتر مریم احمدی");

  const r3 = applyLiveCommand(room, {
    type: "chapter:set",
    payload: { visible: true, index: 2, total: 5, title: "پاداش تصادفی و اعتیاد" },
  });
  assert.equal(r3.ok, true);
  assert.equal(room.chapter.index, 2);

  const r4 = applyLiveCommand(room, {
    type: "sfx:trigger",
    payload: { sound: "whoosh", volume: 0.8 },
  });
  assert.equal(r4.ok, true);
  assert.equal(room.sfxSeq, 1);
  assert.equal(room.lastSfx.sound, "whoosh");

  const pub = getPublicRoomState(room, 2, 1);
  assert.equal(pub.viewerCount, 2);
  assert.equal(pub.controllerCount, 1);
  assert.equal(pub.lowerThird.title, "دکتر مریم احمدی");
});

test("applyLiveCommand rejects invalid layout and unknown commands", () => {
  const room = createLiveRoom("test");
  const badLayout = applyLiveCommand(room, { type: "layout:set", payload: { layout: "INVALID" } });
  assert.equal(badLayout.ok, false);
  const badCmd = applyLiveCommand(room, { type: "bogus:cmd" });
  assert.equal(badCmd.ok, false);
});
