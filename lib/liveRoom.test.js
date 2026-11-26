import test from "node:test";
import assert from "node:assert/strict";
import { createLiveRoom, applyLiveCommand, getPublicRoomState } from "./liveRoom.js";

test("createLiveRoom initializes podcast-ready living defaults", () => {
  const room = createLiveRoom("ensaf-mehrabani");
  assert.equal(room.projectName, "ensaf-mehrabani");
  assert.equal(room.layout, "SCAM");
  assert.equal(room.livingStage.bgStyle, "aurora");
  assert.equal(room.livingStage.intensity, "podcast");
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
    },
  });
  assert.equal(r1.ok, true);
  assert.equal(room.currentStepIndex, 4);
  assert.equal(room.layout, "SLIDE");
  assert.equal(room.activeSlide.text, "تست زنده");

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
