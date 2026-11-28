"""Unit tests for Phase 4 (Characters & Rigs: Items 12, 13, 14).

Covers:
  - Item 12: 5 characters sharing the 18-part rig tree, per-character default voices,
    multi-character Dialogue Mode schema & project loader resolution.
  - Item 13: Offline SVG Rig Importer (English + Persian layer aliases, anatomical
    auto-pivots normalized to 640x720, z-order, unmatched/missing reporting, CLI),
    expanded 13 accessories, accessoryTimeline & [acc:...]/[outfit:...] script tags.
  - Item 14: 6 one-click Outfits + 7 Seasonal & Studio Skins while preserving exact
    Red Eagle brand palette when character='red_eagle', skin='classic', paletteLock=True.
"""

from __future__ import annotations

import json
import math
import struct
import tempfile
import unittest
import wave
from pathlib import Path

from khordegir.cli import main as cli_main
from khordegir.project import load_project
from khordegir.puppet_schema import (
    ACCESSORY_NAMES,
    BRAND_PALETTE,
    CHARACTERS,
    LISTENER_REACTIONS,
    OUTFITS,
    PART_DEFAULTS,
    SKINS,
    normalize_dialogue_config,
    normalize_puppet_config,
    parse_script_tags,
    resolve_character_palette,
)
from khordegir.rig_importer import import_svg_rig_file, import_svg_rig_text


def _write_tone_wav(path: Path, freq_hz: float = 200.0, duration: float = 1.2, sr: int = 16000) -> None:
    n = int(duration * sr)
    frames = bytearray()
    for i in range(n):
        t = i / sr
        amp = 0.55 if (0.1 <= t <= duration - 0.1) else 0.0
        val = int(max(-1.0, min(1.0, amp * math.sin(2.0 * math.pi * freq_hz * t))) * 32767)
        frames.extend(struct.pack("<h", val))
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(bytes(frames))


class Phase4CharactersRigsTests(unittest.TestCase):
    def test_five_characters_six_outfits_seven_skins_and_brand_lock(self) -> None:
        self.assertEqual(
            set(CHARACTERS.keys()),
            {"red_eagle", "vesper_owl", "pip_pigeon", "midge_hummingbird", "barnaby_tortoise"},
        )
        self.assertEqual(len(OUTFITS), 6)
        self.assertEqual(len(SKINS), 7)
        self.assertEqual(len(ACCESSORY_NAMES), 13)
        self.assertGreaterEqual(len(LISTENER_REACTIONS), 7)

        # Red Eagle + classic + paletteLock keeps exact brand palette
        eagle_cfg = normalize_puppet_config({
            "character": "red_eagle",
            "skin": "classic",
            "paletteLock": True,
            "palette": {"redPrimary": "#00FF00"},
        })
        self.assertEqual(eagle_cfg["palette"]["redPrimary"], BRAND_PALETTE["redPrimary"])
        self.assertEqual(eagle_cfg["palette"]["beakGold"], BRAND_PALETTE["beakGold"])
        self.assertEqual(len(eagle_cfg["parts"]), len(PART_DEFAULTS))

        # Every character normalizes onto the exact same 18-part tree with distinct voice F0
        seen_primary = set()
        for cid, spec in CHARACTERS.items():
            cfg = normalize_puppet_config({"character": cid, "skin": "classic", "paletteLock": True})
            self.assertEqual(cfg["character"], cid)
            self.assertEqual(len(cfg["parts"]), 18)
            self.assertEqual(cfg["voice"]["medianF0Hz"], spec["defaultVoice"]["medianF0Hz"])
            seen_primary.add(cfg["palette"]["redPrimary"])
        self.assertEqual(len(seen_primary), 5)

        # Every outfit populates its bundled accessories cleanly
        for oid, ospec in OUTFITS.items():
            cfg = normalize_puppet_config({"outfit": oid})
            self.assertEqual(cfg["outfit"], oid)
            for acc in ospec["accessories"]:
                self.assertIn(acc, cfg["accessories"])

        # Every skin resolves cleanly and non-classic skins change at least one palette token
        for sid in SKINS:
            pal = resolve_character_palette("red_eagle", sid)
            self.assertTrue(pal["redPrimary"].startswith("#"))
            if sid != "classic":
                self.assertNotEqual(pal, BRAND_PALETTE)

    def test_accessory_timeline_and_script_tags(self) -> None:
        cfg = normalize_puppet_config({
            "outfit": "default",
            "accessories": ["glasses", "not_a_real_item"],
            "accessoryTimeline": [
                {"t": 2.5, "outfit": "formal"},
                {"t": 1.0, "add": ["top_hat", "monocle"], "remove": ["glasses"]},
            ],
        })
        self.assertEqual(cfg["accessories"], ["glasses"])
        # Sorted chronologically
        self.assertEqual([c["t"] for c in cfg["accessoryTimeline"]], [1.0, 2.5])
        self.assertEqual(cfg["accessoryTimeline"][0]["add"], ["top_hat", "monocle"])
        self.assertEqual(cfg["accessoryTimeline"][1]["outfit"], "formal")

        parsed = parse_script_tags("سلام [acc:top_hat,monocle] خوش آمدید [outfit:podcast] پایان", duration=6.0)
        self.assertNotIn("[acc:", parsed["clean_text"])
        self.assertNotIn("[outfit:", parsed["clean_text"])
        self.assertEqual(len(parsed["accessories"]), 2)
        self.assertEqual(parsed["accessories"][0]["accessories"], ["top_hat", "monocle"])
        self.assertEqual(parsed["accessories"][1]["outfit"], "podcast")

    def test_dialogue_schema_and_project_loader(self) -> None:
        dlg = normalize_dialogue_config({
            "mode": "two-shot",
            "characters": [
                {"id": "host", "character": "red_eagle", "side": "left", "outfit": "podcast"},
                {"id": "guest", "character": "vesper_owl", "side": "right", "outfit": "formal", "skin": "nowruz"},
            ],
            "turns": [
                {"speaker": "host", "start": 0.0, "end": 2.0, "text": "سلام وسپر!", "listenerReaction": "interested"},
                {"speaker": "guest", "start": 2.0, "end": 4.2, "text": "سلام عقاب!", "emotion": "smug", "listenerReaction": "skeptical"},
            ],
        })
        self.assertIsNotNone(dlg)
        assert dlg is not None
        self.assertEqual(len(dlg["characters"]), 2)
        self.assertEqual(dlg["characters"][0]["character"], "red_eagle")
        self.assertEqual(dlg["characters"][1]["character"], "vesper_owl")
        self.assertEqual(dlg["turns"][0]["listenerReaction"], "interested")
        self.assertEqual(dlg["turns"][1]["listenerReaction"], "skeptical")
        self.assertAlmostEqual(dlg["duration"], 4.2, places=2)

        # End-to-end load_project with two WAV audio tracks on a dialogue mascot_talk slide
        with tempfile.TemporaryDirectory() as tmp:
            pdir = Path(tmp)
            _write_tone_wav(pdir / "host.wav", freq_hz=165.0, duration=1.0)
            _write_tone_wav(pdir / "guest.wav", freq_hz=260.0, duration=1.0)
            yaml_text = """
title: تست دیالوگ دو شخصیت
slides:
  - template: mascot_talk
    title: گفت‌وگوی عقاب و جغد
    duration: 4.5
    dialogue:
      mode: two-shot
      characters:
        - id: host
          character: red_eagle
          side: left
          outfit: podcast
          audio: host.wav
        - id: guest
          character: vesper_owl
          side: right
          outfit: formal
          audio: guest.wav
      turns:
        - speaker: host
          start: 0.0
          end: 2.2
          text: سلام به همه
          listenerReaction: nodding
        - speaker: guest
          start: 2.2
          end: 4.5
          text: خیلی خوشحالم
          listenerReaction: surprised
"""
            (pdir / "video.yaml").write_text(yaml_text.strip() + "\n", encoding="utf-8")
            proj = load_project(pdir)
            s0 = proj["slides"][0]
            self.assertIn("dialogue", s0)
            chars = s0["dialogue"]["characters"]
            self.assertEqual(len(chars), 2)
            # Offline lipsync & prosody auto-analyzed for each dialogue character
            self.assertIsNotNone(chars[0].get("visemeTrack"))
            self.assertIsNotNone(chars[0].get("prosodyTrack"))
            self.assertIsNotNone(chars[1].get("visemeTrack"))
            self.assertIsNotNone(chars[1].get("prosodyTrack"))

    def test_offline_svg_rig_importer_bilingual_and_cli(self) -> None:
        sample_svg = """<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" viewBox="0 0 320 360">
  <g id="body"><rect x="100" y="180" width="120" height="120" fill="#181818"/></g>
  <g id="سر"><circle cx="160" cy="110" r="55" fill="#EB1818"/></g>
  <g inkscape:label="منقار_پایین"><path d="M 140 120 L 180 120 L 160 150 Z" fill="#F8AD1B"/></g>
  <g data-part="wing_l"><rect x="40" y="180" width="60" height="90" fill="#D41010"/></g>
  <g id="wing-r"><rect x="220" y="180" width="60" height="90" fill="#D41010"/></g>
  <g id="decorative_backdrop_ignore"><rect x="0" y="0" width="320" height="360" fill="#000000"/></g>
</svg>
"""
        r1 = import_svg_rig_text(sample_svg, character="red_eagle")
        r2 = import_svg_rig_text(sample_svg, character="red_eagle")
        # 100% deterministic
        self.assertEqual(r1, r2)
        self.assertEqual(r1["matchedCount"], 5)
        self.assertEqual(r1["totalCanonicalParts"], 18)
        self.assertIn("decorative_backdrop_ignore", r1["unmatchedLayers"])

        # Normalized from 320x360 -> 640x720 (2x scale)
        # Head circle cx=160, cy=110, r=55 -> x in [105,215], y in [55,165] -> norm x in [210,430], y in [110,330]
        # Head pivot anchor = (0.5, 0.88) -> pivotX = 320.0, pivotY = 110 + 220*0.88 = 303.6
        self.assertAlmostEqual(r1["parts"]["head"]["pivotX"], 320.0, places=1)
        self.assertAlmostEqual(r1["parts"]["head"]["pivotY"], 303.6, places=1)
        self.assertEqual(r1["parts"]["head"]["color"], "#EB1818")

        # Lower jaw matched via Persian inkscape:label ("منقار_پایین")
        # x in [140,180] -> [280,360], y in [120,150] -> [240,300], anchor (0.5, 0.15) -> (320.0, 249.0)
        self.assertAlmostEqual(r1["parts"]["beak_lower"]["pivotX"], 320.0, places=1)
        self.assertAlmostEqual(r1["parts"]["beak_lower"]["pivotY"], 249.0, places=1)

        # CLI `import-rig` writes identical JSON file
        with tempfile.TemporaryDirectory() as tmp:
            svg_file = Path(tmp) / "custom_bird.svg"
            out_json = Path(tmp) / "custom_bird.rig.json"
            svg_file.write_text(sample_svg, encoding="utf-8")

            rc = cli_main(["import-rig", str(svg_file), "-o", str(out_json), "--character", "vesper_owl"])
            self.assertEqual(rc, 0)
            self.assertTrue(out_json.is_file())
            payload = json.loads(out_json.read_text(encoding="utf-8"))
            self.assertEqual(payload["schema"], "khordegir-svg-rig-import")
            self.assertEqual(payload["matchedCount"], 5)
            self.assertEqual(payload["puppet"]["character"], "vesper_owl")

            # Direct helper also works
            direct = import_svg_rig_file(svg_file, character="vesper_owl")
            self.assertEqual(direct["matchedCount"], 5)


if __name__ == "__main__":
    unittest.main()
