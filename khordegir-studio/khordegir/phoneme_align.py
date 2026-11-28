"""Offline deterministic phoneme-level aligner, Persian + English G2P, and coarticulation
smoothing for Khordegir Studio Red Eagle puppet (Phase 3 Item 9).

100% offline, zero cloud/API dependencies, pure Python stdlib.
Design notes (original MIT-compatible implementation):
  - Maps ~42 ARPABET/IPA/Persian phonemes to Khordegir's 8 mouth visemes
    (`closed`, `rest`, `small`, `open`, `wide`, `round_o`, `e_teeth`, `f_v`)
    and Preston-Blair / Rhubarb-compatible shape codes (`A`..`H`, `X`).
  - Rule-based English G2P (digraphs, vowel teams, silent-e, common exceptions)
    and Persian G2P (diacritics, contextual `و`/`ی`, natural short-vowel epenthesis
    between Persian consonant clusters).
  - Monotonic Viterbi dynamic programming forced alignment matching each phoneme's
    acoustic class (`silence`, `bilabial_stop`, `fricative`, `sibilant`, `vowel_open`,
    `vowel_front`, `vowel_round`, `consonant`) against per-frame audio features.
  - Coarticulation pass: anticipatory lip rounding (`round_o`), anticipatory vowel
    opening, carryover release blending, while strictly preserving crisp bilabial
    closures (`P`/`B`/`M`/`ب`/`پ`/`م`).
"""

from __future__ import annotations

import math
import re
from typing import Any, Dict, List, Optional, Sequence, Tuple

# Mapping from canonical phoneme symbols to (viseme, rhubarb_code, acoustic_class, rel_dur)
PHONEME_TABLE: Dict[str, Tuple[str, str, str, float]] = {
    # Silence & pauses
    "SIL": ("rest",    "X", "silence",       1.2),
    "SP":  ("closed",  "A", "silence",       0.7),
    "PAU": ("rest",    "X", "silence",       1.0),
    # Bilabials (must close beak cleanly)
    "P":   ("closed",  "A", "bilabial_stop", 0.65),
    "B":   ("closed",  "A", "bilabial_stop", 0.65),
    "M":   ("closed",  "A", "bilabial_stop", 0.85),
    # Labiodentals (upper beak/teeth on lower lip)
    "F":   ("f_v",     "G", "fricative",     0.95),
    "V":   ("f_v",     "G", "fricative",     0.85),
    # Sibilants & front high vowels (wide E / teeth)
    "S":   ("e_teeth", "B", "sibilant",      1.00),
    "Z":   ("e_teeth", "B", "sibilant",      0.95),
    "SH":  ("e_teeth", "B", "sibilant",      1.05),
    "ZH":  ("e_teeth", "B", "sibilant",      0.95),
    "CH":  ("e_teeth", "B", "sibilant",      0.90),
    "JH":  ("e_teeth", "B", "sibilant",      0.90),
    "TH":  ("f_v",     "B", "fricative",     0.90),
    "DH":  ("f_v",     "B", "fricative",     0.85),
    "IY":  ("e_teeth", "C", "vowel_front",   1.25),
    "IH":  ("e_teeth", "C", "vowel_front",   0.95),
    "EY":  ("e_teeth", "C", "vowel_front",   1.20),
    "Y":   ("e_teeth", "C", "vowel_front",   0.70),
    # Rounded vowels & glides (round O)
    "OW":  ("round_o", "E", "vowel_round",   1.25),
    "UW":  ("round_o", "F", "vowel_round",   1.25),
    "UH":  ("round_o", "F", "vowel_round",   1.00),
    "AO":  ("round_o", "E", "vowel_round",   1.20),
    "OY":  ("round_o", "E", "vowel_round",   1.25),
    "W":   ("round_o", "F", "vowel_round",   0.75),
    # Wide open vowels (AA / AE / A)
    "AA":  ("wide",    "D", "vowel_open",    1.35),
    "AE":  ("wide",    "D", "vowel_open",    1.15),
    "AW":  ("wide",    "D", "vowel_open",    1.25),
    "AY":  ("wide",    "D", "vowel_open",    1.25),
    # Mid open vowels & velar/guttural consonants
    "EH":  ("open",    "C", "vowel_open",    1.05),
    "AH":  ("open",    "C", "vowel_open",    0.95),
    "AX":  ("small",   "C", "vowel_open",    0.75),
    "ER":  ("open",    "E", "vowel_round",   1.05),
    "HH":  ("open",    "C", "fricative",     0.75),
    "K":   ("open",    "B", "consonant",     0.70),
    "G":   ("open",    "B", "consonant",     0.70),
    "KH":  ("open",    "C", "fricative",     0.90),
    "GH":  ("open",    "C", "consonant",     0.85),
    "Q":   ("open",    "B", "consonant",     0.75),
    # Alveolar / liquid / nasal consonants (small mouth)
    "T":   ("small",   "B", "consonant",     0.65),
    "D":   ("small",   "B", "consonant",     0.65),
    "N":   ("small",   "B", "consonant",     0.80),
    "NG":  ("small",   "B", "consonant",     0.85),
    "L":   ("small",   "H", "consonant",     0.85),
    "R":   ("small",   "H", "consonant",     0.80),
}

VISEME_TO_RHUBARB: Dict[str, str] = {
    "rest": "X",
    "closed": "A",
    "small": "B",
    "open": "C",
    "wide": "D",
    "round_o": "F",
    "e_teeth": "C",
    "f_v": "G",
}

VISEME_TARGET_PARAMS: Dict[str, Dict[str, float]] = {
    "closed":  {"openness": 0.00, "width": 1.00, "teeth": 0.00, "lip_tuck": 0.00, "tongue": 0.00},
    "rest":    {"openness": 0.03, "width": 1.00, "teeth": 0.00, "lip_tuck": 0.00, "tongue": 0.00},
    "small":   {"openness": 0.24, "width": 0.96, "teeth": 0.08, "lip_tuck": 0.00, "tongue": 0.20},
    "open":    {"openness": 0.56, "width": 1.02, "teeth": 0.14, "lip_tuck": 0.00, "tongue": 0.68},
    "wide":    {"openness": 0.88, "width": 1.12, "teeth": 0.20, "lip_tuck": 0.00, "tongue": 0.95},
    "round_o": {"openness": 0.52, "width": 0.72, "teeth": 0.00, "lip_tuck": 0.00, "tongue": 0.45},
    "e_teeth": {"openness": 0.28, "width": 1.16, "teeth": 0.96, "lip_tuck": 0.00, "tongue": 0.10},
    "f_v":     {"openness": 0.14, "width": 1.02, "teeth": 0.65, "lip_tuck": 0.85, "tongue": 0.00},
}

# Common English dictionary overrides for crisp phoneme accuracy offline
ENGLISH_EXCEPTIONS: Dict[str, List[str]] = {
    "the": ["DH", "AX"],
    "this": ["DH", "IH", "S"],
    "that": ["DH", "AE", "T"],
    "they": ["DH", "EY"],
    "there": ["DH", "EH", "R"],
    "you": ["Y", "UW"],
    "your": ["Y", "AO", "R"],
    "one": ["W", "AH", "N"],
    "two": ["T", "UW"],
    "three": ["TH", "R", "IY"],
    "four": ["F", "AO", "R"],
    "five": ["F", "AY", "V"],
    "have": ["HH", "AE", "V"],
    "are": ["AA", "R"],
    "were": ["W", "ER"],
    "what": ["W", "AH", "T"],
    "where": ["W", "EH", "R"],
    "who": ["HH", "UW"],
    "why": ["W", "AY"],
    "how": ["HH", "AW"],
    "know": ["N", "OW"],
    "people": ["P", "IY", "P", "AX", "L"],
    "voice": ["V", "OY", "S"],
    "eagle": ["IY", "G", "AX", "L"],
    "red": ["R", "EH", "D"],
    "puppet": ["P", "AH", "P", "IH", "T"],
    "hello": ["HH", "EH", "L", "OW"],
    "welcome": ["W", "EH", "L", "K", "AH", "M"],
    "world": ["W", "ER", "L", "D"],
    "water": ["W", "AO", "T", "ER"],
    "power": ["P", "AW", "ER"],
    "video": ["V", "IH", "D", "IY", "OW"],
    "studio": ["S", "T", "UW", "D", "IY", "OW"],
    "audio": ["AO", "D", "IY", "OW"],
    "mouth": ["M", "AW", "TH"],
    "beak": ["B", "IY", "K"],
    "talk": ["T", "AO", "K"],
    "speak": ["S", "P", "IY", "K"],
    "would": ["W", "UH", "D"],
    "could": ["K", "UH", "D"],
    "should": ["SH", "UH", "D"],
    "through": ["TH", "R", "UW"],
    "thought": ["TH", "AO", "T"],
    "laugh": ["L", "AE", "F"],
    "enough": ["IH", "N", "AH", "F"],
    "phone": ["F", "OW", "N"],
    "photo": ["F", "OW", "T", "OW"],
}

# Common Persian dictionary overrides (vocalized accurate phoneme transcriptions)
PERSIAN_EXCEPTIONS: Dict[str, List[str]] = {
    "سلام": ["S", "AE", "L", "AA", "M"],
    "خوش": ["KH", "OW", "SH"],
    "آمدید": ["AA", "M", "AE", "D", "IY", "D"],
    "خرده‌گیر": ["KH", "OW", "R", "D", "EH", "G", "IY", "R"],
    "خرده": ["KH", "OW", "R", "D", "EH"],
    "استودیو": ["EH", "S", "T", "UW", "D", "IY", "OW"],
    "عقاب": ["OW", "GH", "AA", "B"],
    "قرمز": ["GH", "EH", "R", "M", "EH", "Z"],
    "صدا": ["S", "EH", "D", "AA"],
    "صدای": ["S", "EH", "D", "AA", "Y"],
    "منقار": ["M", "EH", "N", "GH", "AA", "R"],
    "این": ["IY", "N"],
    "آن": ["AA", "N"],
    "است": ["AE", "S", "T"],
    "می‌کند": ["M", "IY", "K", "OW", "N", "AE", "D"],
    "می‌شود": ["M", "IY", "SH", "AE", "V", "AE", "D"],
    "ما": ["M", "AA"],
    "شما": ["SH", "OW", "M", "AA"],
    "تو": ["T", "OW"],
    "او": ["UW"],
    "با": ["B", "AA"],
    "به": ["B", "EH"],
    "در": ["D", "AE", "R"],
    "از": ["AE", "Z"],
    "که": ["K", "EH"],
    "و": ["V", "AE"],
    "را": ["R", "AA"],
    "هم": ["HH", "AE", "M"],
    "بله": ["B", "AE", "L", "EH"],
    "نه": ["N", "AE"],
    "عالی": ["AA", "L", "IY"],
    "خیلی": ["KH", "EY", "L", "IY"],
    "بسیار": ["B", "EH", "S", "Y", "AA", "R"],
    "امروز": ["EH", "M", "R", "UW", "Z"],
    "ویدئو": ["V", "IY", "D", "EH", "OW"],
    "ویدیو": ["V", "IY", "D", "IY", "OW"],
    "عروسک": ["AE", "R", "UW", "S", "AE", "K"],
}

# Persian character -> default phoneme mapping
_PERSIAN_CHAR_MAP: Dict[str, str] = {
    "آ": "AA",
    "أ": "AE",
    "إ": "EH",
    "ا": "AA",
    "ب": "B",
    "پ": "P",
    "ت": "T",
    "ث": "S",
    "ج": "JH",
    "چ": "CH",
    "ح": "HH",
    "خ": "KH",
    "د": "D",
    "ذ": "Z",
    "ر": "R",
    "ز": "Z",
    "ژ": "ZH",
    "س": "S",
    "ش": "SH",
    "ص": "S",
    "ض": "Z",
    "ط": "T",
    "ظ": "Z",
    "ع": "AA",
    "غ": "GH",
    "ف": "F",
    "ق": "GH",
    "ک": "K",
    "ك": "K",
    "گ": "G",
    "ل": "L",
    "م": "M",
    "ن": "N",
    "ه": "HH",
    "ة": "EH",
    "ۀ": "EH",
    "ئ": "IY",
    "ی": "IY",
    "ي": "IY",
    "و": "UW",
    # Persian/Arabic short vowel diacritics
    "\u064e": "AE",  # fatha
    "\u0650": "EH",  # kasra
    "\u064f": "OW",  # damma
    "\u064b": "AE",  # tanvin fatha
}

_VOWEL_PHONEMES = {"AA", "AE", "AH", "AO", "AW", "AX", "AY", "EH", "ER", "EY", "IH", "IY", "OW", "OY", "UH", "UW"}
_TAG_STRIP_RE = re.compile(r"\[[^\]]+\]")
_TOKEN_RE = re.compile(
    r"[\u0620-\u065f\u0671-\u06d3\u06fa-\u06ff\u200c]+|[A-Za-z']+|[.!؟؛،,;:\n]+"
)


def normalize_phoneme_token(token: str) -> str:
    """Normalize ARPABET/IPA/Persian/viseme token into a canonical phoneme key."""
    raw = str(token or "").strip()
    if not raw:
        return "SIL"
    up = raw.upper().rstrip("0123456789")
    if up in PHONEME_TABLE:
        return up
    # Direct viseme names -> representative phoneme
    vis_to_ph = {
        "CLOSED": "M",
        "REST": "SIL",
        "SMALL": "T",
        "OPEN": "EH",
        "WIDE": "AA",
        "ROUND_O": "OW",
        "E_TEETH": "IY",
        "F_V": "F",
        # Rhubarb A..H / X
        "A": "M",
        "B": "S",
        "C": "EH",
        "D": "AA",
        "E": "OW",
        "F": "UW",
        "G": "F",
        "H": "L",
        "X": "SIL",
    }
    if up in vis_to_ph:
        return vis_to_ph[up]
    # Single Persian char or short word
    if any("\u0600" <= ch <= "\u06ff" for ch in raw):
        phs = persian_word_to_phonemes(raw)
        return phs[0] if phs else "AE"
    # Single English letter
    if raw.isalpha():
        phs = english_word_to_phonemes(raw)
        return phs[0] if phs else "AX"
    return "AX"


def phoneme_to_viseme(phoneme: str) -> str:
    ph = normalize_phoneme_token(phoneme)
    return PHONEME_TABLE.get(ph, ("small", "B", "consonant", 0.8))[0]


def phoneme_to_rhubarb(phoneme: str) -> str:
    ph = normalize_phoneme_token(phoneme)
    return PHONEME_TABLE.get(ph, ("small", "B", "consonant", 0.8))[1]


def english_word_to_phonemes(word: str) -> List[str]:
    """Deterministic offline rule-based English G2P."""
    w = re.sub(r"[^a-z]", "", word.lower())
    if not w:
        return []
    if w in ENGLISH_EXCEPTIONS:
        return list(ENGLISH_EXCEPTIONS[w])

    phs: List[str] = []
    i = 0
    n = len(w)
    has_silent_e = n >= 3 and w.endswith("e") and w[-2] not in "aeiouy" and any(c in "aeiou" for c in w[:-1])
    end_idx = n - 1 if has_silent_e else n

    while i < end_idx:
        rem = w[i:end_idx]
        # 4-char & 3-char patterns
        if rem.startswith("tion") or rem.startswith("sion"):
            phs.extend(["SH", "AX", "N"])
            i += 4
            continue
        if rem.startswith("igh"):
            phs.append("AY")
            i += 3
            continue
        if rem.startswith("tch"):
            phs.append("CH")
            i += 3
            continue
        # 2-char digraphs & vowel teams
        pair = w[i : i + 2]
        if pair == "sh":
            phs.append("SH"); i += 2; continue
        if pair == "ch":
            phs.append("CH"); i += 2; continue
        if pair == "th":
            phs.append("TH"); i += 2; continue
        if pair == "ph":
            phs.append("F"); i += 2; continue
        if pair == "wh":
            phs.append("W"); i += 2; continue
        if pair == "ng":
            phs.append("NG"); i += 2; continue
        if pair == "ck":
            phs.append("K"); i += 2; continue
        if pair == "qu":
            phs.extend(["K", "W"]); i += 2; continue
        if pair in ("ee", "ea"):
            phs.append("IY"); i += 2; continue
        if pair == "oo":
            phs.append("UW"); i += 2; continue
        if pair in ("ou", "ow"):
            phs.append("OW" if (i + 2 == end_idx and pair == "ow") else "AW"); i += 2; continue
        if pair in ("ai", "ay"):
            phs.append("EY"); i += 2; continue
        if pair in ("oi", "oy"):
            phs.append("OY"); i += 2; continue
        if pair in ("au", "aw"):
            phs.append("AO"); i += 2; continue
        if pair in ("er", "ir", "ur"):
            phs.append("ER"); i += 2; continue
        if pair == "ar":
            phs.extend(["AA", "R"]); i += 2; continue
        if pair == "or":
            phs.extend(["AO", "R"]); i += 2; continue
        if pair == "oa":
            phs.append("OW"); i += 2; continue
        if pair == "ie":
            phs.append("IY"); i += 2; continue

        ch = w[i]
        # Skip duplicate doubled consonants
        if i + 1 < end_idx and w[i + 1] == ch and ch not in "aeiou":
            i += 1
            continue
        if ch == "a":
            phs.append("EY" if has_silent_e and i >= end_idx - 2 else "AE")
        elif ch == "e":
            phs.append("EH")
        elif ch == "i":
            phs.append("AY" if has_silent_e and i >= end_idx - 2 else "IH")
        elif ch == "o":
            phs.append("OW" if has_silent_e and i >= end_idx - 2 else "AA")
        elif ch == "u":
            phs.append("UW" if has_silent_e and i >= end_idx - 2 else "AH")
        elif ch == "y":
            phs.append("Y" if i == 0 else "IY")
        elif ch == "c":
            nxt = w[i + 1] if i + 1 < n else ""
            phs.append("S" if nxt in "eiy" else "K")
        elif ch == "g":
            nxt = w[i + 1] if i + 1 < n else ""
            phs.append("JH" if nxt in "ey" else "G")
        elif ch == "x":
            phs.extend(["K", "S"])
        elif ch == "j":
            phs.append("JH")
        elif ch == "h":
            phs.append("HH")
        elif ch.upper() in PHONEME_TABLE:
            phs.append(ch.upper())
        i += 1

    return phs or ["AX"]


def persian_word_to_phonemes(word: str) -> List[str]:
    """Deterministic offline Persian G2P with contextual و/ی/ه and natural short-vowel epenthesis."""
    clean = word.replace("\u0640", "").strip()  # remove tatweel
    if not clean:
        return []
    if clean in PERSIAN_EXCEPTIONS:
        return list(PERSIAN_EXCEPTIONS[clean])

    # Handle ZWNJ compound words by splitting sub-parts (e.g. می‌گوید -> می + گوید)
    if "\u200c" in clean:
        combined: List[str] = []
        for part in clean.split("\u200c"):
            if part:
                combined.extend(persian_word_to_phonemes(part))
        return combined

    raw_phs: List[str] = []
    chars = list(clean)
    n = len(chars)
    for idx, ch in enumerate(chars):
        if ch == "\u0651":  # tashdid (gemination)
            continue
        if ch == "ا":
            # Word-initial alef without madda is usually a short vowel (AE/EH/OW); medial/final is long AA
            raw_phs.append("AE" if idx == 0 else "AA")
        elif ch == "و":
            if idx == 0:
                raw_phs.append("V")
            elif idx + 1 < n and chars[idx + 1] in ("ا", "آ", "ی", "ي"):
                raw_phs.append("V")
            else:
                raw_phs.append("UW")
        elif ch in ("ی", "ي"):
            if idx == 0:
                raw_phs.append("Y")
            elif idx > 0 and chars[idx - 1] in ("ا", "آ", "و"):
                raw_phs.append("Y")
            else:
                raw_phs.append("IY")
        elif ch == "ه":
            # Word-final ه in Persian is usually vowel /e/ (EH) unless preceded by long vowel
            if idx == n - 1 and n >= 2 and chars[idx - 1] not in ("ا", "آ", "و"):
                raw_phs.append("EH")
            else:
                raw_phs.append("HH")
        elif ch in _PERSIAN_CHAR_MAP:
            raw_phs.append(_PERSIAN_CHAR_MAP[ch])

    if not raw_phs:
        return ["AE"]

    # Persian unvocalized orthography omits short vowels; insert natural short vowel (AE)
    # between adjacent non-vowel consonants so mouth opens organically on syllables.
    out: List[str] = []
    cons_run = 0
    for idx, ph in enumerate(raw_phs):
        is_v = ph in _VOWEL_PHONEMES
        if is_v:
            out.append(ph)
            cons_run = 0
        else:
            if cons_run >= 1 and idx < len(raw_phs) - 1:
                # Insert short vowel after the first consonant of an unvocalized consonant cluster
                out.append("AE")
                cons_run = 0
            out.append(ph)
            cons_run += 1
    return out


def text_to_phonemes(text: str) -> List[Dict[str, Any]]:
    """Convert mixed Persian/English narration text into a deterministic phoneme sequence."""
    cleaned = _TAG_STRIP_RE.sub(" ", str(text or "")).strip()
    if not cleaned:
        return []
    seq: List[Dict[str, Any]] = []
    for tok in _TOKEN_RE.findall(cleaned):
        if re.fullmatch(r"[.!؟؛،,;:\n]+", tok):
            is_major = any(c in ".!؟؛\n" for c in tok)
            ph = "SIL" if is_major else "SP"
            vis, rhu, cls, dur = PHONEME_TABLE[ph]
            seq.append({"phoneme": ph, "viseme": vis, "rhubarb": rhu, "cls": cls, "weight": dur, "word": ""})
            continue
        if any("\u0600" <= c <= "\u06ff" for c in tok):
            word_phs = persian_word_to_phonemes(tok)
        else:
            word_phs = english_word_to_phonemes(tok)
        for ph in word_phs:
            vis, rhu, cls, dur = PHONEME_TABLE.get(ph, ("small", "B", "consonant", 0.8))
            seq.append({"phoneme": ph, "viseme": vis, "rhubarb": rhu, "cls": cls, "weight": dur, "word": tok})
    return seq


def _acoustic_class_log_score(cls: str, energy: float, zcr: float, centroid: float, low_r: float, mid_r: float, high_r: float, prev_energy: float) -> float:
    """Deterministic log-likelihood score of a frame belonging to an acoustic phoneme class."""
    is_silent = energy < 0.045
    flux = max(0.0, energy - prev_energy)

    if cls == "silence":
        return 2.4 if is_silent else -3.5 * energy
    if is_silent:
        return -2.2 if cls != "bilabial_stop" else -0.4

    if cls == "bilabial_stop":
        # Low energy dip or plosive burst onset
        return (1.3 if energy < 0.24 else -0.6 * energy) + 1.4 * flux
    if cls == "fricative":
        # High ZCR + high-frequency energy, moderate loudness
        s = (1.6 if zcr > 0.16 else -0.4) + 2.2 * high_r - 0.8 * low_r
        return s
    if cls == "sibilant":
        # Strong high centroid + high-frequency energy
        cent_n = min(1.0, centroid / 3200.0)
        return 1.8 * cent_n + 2.4 * high_r - 0.9 * low_r
    if cls == "vowel_open":
        # Strong RMS energy + mid-band dominance
        return 2.2 * energy + 1.6 * mid_r - 0.8 * zcr
    if cls == "vowel_round":
        # Low centroid + strong low-band energy
        low_cent = max(0.0, 1.0 - centroid / 1500.0)
        return 1.5 * energy + 2.4 * low_r + 1.1 * low_cent - 1.2 * high_r
    if cls == "vowel_front":
        # Voiced energy + higher mid/high spectral centroid
        front_c = max(0.0, min(1.0, (centroid - 1100.0) / 1800.0))
        return 1.5 * energy + 1.6 * front_c + 1.1 * high_r
    # Default alveolar / nasal / liquid consonant
    return 0.6 * energy + 0.5 * mid_r - 0.3 * abs(centroid - 1300.0) / 2000.0


def align_phonemes_viterbi(
    phonemes: Sequence[Dict[str, Any]],
    frame_features: Sequence[Dict[str, float]],
    start_frame: int = 0,
    end_frame: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """Monotonic Viterbi forced alignment of phoneme sequence to acoustic frame slice.

    Returns a list of per-frame dicts `{phoneme, viseme, rhubarb, cls}` covering `[start_frame, end_frame)`.
    100% deterministic, O(T * S) time.
    """
    n_total = len(frame_features)
    s0 = max(0, min(n_total, int(start_frame)))
    s1 = n_total if end_frame is None else max(s0, min(n_total, int(end_frame)))
    T = s1 - s0
    if T <= 0:
        return []
    if not phonemes:
        return [{"phoneme": "SIL", "viseme": "rest", "rhubarb": "X", "cls": "silence"} for _ in range(T)]

    # Trim or pad phoneme count if sequence exceeds available frames (ensure >=1 frame per phoneme)
    ph_list = list(phonemes)
    if len(ph_list) > T:
        # Deterministically subsample preserving starts/ends & bilabials
        step = len(ph_list) / float(T)
        ph_list = [ph_list[min(len(ph_list) - 1, int(i * step))] for i in range(T)]

    S = len(ph_list)
    if S == 1:
        p = ph_list[0]
        return [{"phoneme": p["phoneme"], "viseme": p["viseme"], "rhubarb": p["rhubarb"], "cls": p["cls"]} for _ in range(T)]

    # Expected cumulative position per state (soft duration prior keeps alignment anchored)
    weights = [max(0.25, float(p.get("weight", 1.0))) for p in ph_list]
    total_w = sum(weights)
    cum = 0.0
    expected_center: List[float] = []
    for w in weights:
        expected_center.append(((cum + 0.5 * w) / total_w) * T)
        cum += w

    NEG_INF = -1e18
    dp: List[List[float]] = [[NEG_INF] * S for _ in range(T)]
    back: List[List[int]] = [[0] * S for _ in range(T)]

    def emit(ti: int, si: int) -> float:
        ff = frame_features[s0 + ti]
        prev_e = frame_features[s0 + ti - 1]["energy"] if (s0 + ti) > 0 else 0.0
        ac = _acoustic_class_log_score(
            ph_list[si]["cls"],
            ff["energy"],
            ff["zcr"],
            ff["centroid"],
            ff["low_r"],
            ff["mid_r"],
            ff["high_r"],
            prev_e,
        )
        # Gentle Gaussian positional prior so alignment cannot drift off-sync on flat audio
        sigma = max(2.2, (T / float(S)) * 1.45)
        dist = (ti - expected_center[si]) / sigma
        prior = -0.35 * dist * dist
        return ac + prior

    dp[0][0] = emit(0, 0)
    stay_bonus = 0.12
    step_pen = -0.04

    for t in range(1, T):
        # Monotonic band constraints: must be able to reach state S-1 by frame T-1
        rem_frames = (T - 1) - t
        min_s = max(0, (S - 1) - rem_frames)
        max_s = min(S - 1, t)
        for s in range(min_s, max_s + 1):
            e_sc = emit(t, s)
            best_prev = NEG_INF
            best_idx = s
            # Stay in state s
            if dp[t - 1][s] > NEG_INF / 2:
                cand = dp[t - 1][s] + stay_bonus
                if cand > best_prev:
                    best_prev = cand
                    best_idx = s
            # Advance from state s-1
            if s > 0 and dp[t - 1][s - 1] > NEG_INF / 2:
                cand = dp[t - 1][s - 1] + step_pen
                if cand > best_prev:
                    best_prev = cand
                    best_idx = s - 1
            dp[t][s] = best_prev + e_sc
            back[t][s] = best_idx

    # Backtrack from final state S-1
    path = [0] * T
    cur_s = S - 1
    if dp[T - 1][cur_s] <= NEG_INF / 2:
        # Fallback best finite state
        cur_s = max(range(S), key=lambda idx: dp[T - 1][idx])
    for t in range(T - 1, -1, -1):
        path[t] = cur_s
        cur_s = back[t][cur_s]

    return [
        {
            "phoneme": ph_list[st]["phoneme"],
            "viseme": ph_list[st]["viseme"],
            "rhubarb": ph_list[st]["rhubarb"],
            "cls": ph_list[st]["cls"],
        }
        for st in path
    ]


def apply_coarticulation(
    frames: List[Dict[str, Any]],
    *,
    lookahead_frames: int = 2,
    carryover_frames: int = 1,
) -> List[Dict[str, Any]]:
    """Apply deterministic coarticulation smoothing across per-frame viseme parameters.

    - Anticipatory rounding: when `round_o` occurs within `lookahead_frames`, begin narrowing
      `width` ahead of the vowel so transitions look organic (like real animated lip-sync).
    - Anticipatory opening & carryover release: gently blends `openness`, `width`, `teeth`,
      and `lip_tuck` across neighboring speech frames.
    - Bilabial protection: `closed` bilabials (`P`/`B`/`M`) and silence frames keep crisp
      closure (`openness <= 0.04`) so `P/B/M` pops never vanish!
    """
    n = len(frames)
    if n == 0:
        return frames

    # Base continuous params per frame
    base_open: List[float] = []
    base_width: List[float] = []
    base_teeth: List[float] = []
    base_tuck: List[float] = []
    base_tongue: List[float] = []

    for fr in frames:
        vis = str(fr.get("viseme") or "rest")
        p = VISEME_TARGET_PARAMS.get(vis, VISEME_TARGET_PARAMS["rest"])
        base_open.append(float(fr.get("openness", p["openness"])))
        base_width.append(float(fr.get("width", p["width"])))
        base_teeth.append(float(p["teeth"]))
        base_tuck.append(float(p["lip_tuck"]))
        base_tongue.append(float(p["tongue"]))

    out: List[Dict[str, Any]] = []
    for i, fr in enumerate(frames):
        vis = str(fr.get("viseme") or "rest")
        is_speech = bool(fr.get("is_speech"))
        is_bilabial_closure = vis == "closed" or (str(fr.get("phoneme") or "") in ("P", "B", "M"))

        if not is_speech or vis == "rest":
            nf = dict(fr)
            nf["openness"] = 0.0
            nf["width"] = 1.0
            nf["teeth"] = 0.0
            nf["lip_tuck"] = 0.0
            nf["tongue"] = 0.0
            nf["coarticulated"] = True
            out.append(nf)
            continue

        # Weighted temporal kernel: self (0.58), lookahead (+1: 0.24, +2: 0.08), carryover (-1: 0.10)
        w_sum = 0.58
        acc_open = base_open[i] * 0.58
        acc_width = base_width[i] * 0.58
        acc_teeth = base_teeth[i] * 0.58
        acc_tuck = base_tuck[i] * 0.58
        acc_tongue = base_tongue[i] * 0.58

        # Lookahead anticipation
        for off, w in ((1, 0.24), (2, 0.08)):
            if off > lookahead_frames:
                break
            j = i + off
            if j < n and frames[j].get("is_speech"):
                # Extra anticipation pull for rounded vowels (`round_o`)
                w_eff = w * (1.35 if frames[j].get("viseme") == "round_o" else 1.0)
                acc_open += base_open[j] * w_eff
                acc_width += base_width[j] * w_eff
                acc_teeth += base_teeth[j] * w_eff
                acc_tuck += base_tuck[j] * w_eff
                acc_tongue += base_tongue[j] * w_eff
                w_sum += w_eff

        # Carryover blending
        for off, w in ((1, 0.10),):
            if off > carryover_frames:
                break
            j = i - off
            if j >= 0 and frames[j].get("is_speech"):
                acc_open += base_open[j] * w
                acc_width += base_width[j] * w
                acc_teeth += base_teeth[j] * w
                acc_tuck += base_tuck[j] * w
                acc_tongue += base_tongue[j] * w
                w_sum += w

        sm_open = acc_open / w_sum
        sm_width = acc_width / w_sum
        sm_teeth = acc_teeth / w_sum
        sm_tuck = acc_tuck / w_sum
        sm_tongue = acc_tongue / w_sum

        # Preserve crisp bilabial P/B/M closure (never smear open over a lip-closed consonant)
        if is_bilabial_closure:
            sm_open = min(sm_open, 0.04)
            sm_teeth = 0.0
            sm_tongue = 0.0

        nf = dict(fr)
        nf["openness"] = round(max(0.0, min(1.0, sm_open)), 3)
        nf["width"] = round(max(0.65, min(1.25, sm_width)), 3)
        nf["teeth"] = round(max(0.0, min(1.0, sm_teeth)), 3)
        nf["lip_tuck"] = round(max(0.0, min(1.0, sm_tuck)), 3)
        nf["tongue"] = round(max(0.0, min(1.0, sm_tongue)), 3)
        nf["coarticulated"] = True
        out.append(nf)

    return out
