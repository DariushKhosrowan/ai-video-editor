"""OBS Studio package exporter: Lua v8 script, steps_data.lua, prompter.html, installer scripts, and RTL PNG prompter cards."""
from __future__ import annotations

import html as html_lib
import json
import os
from pathlib import Path
from typing import Any

PKG = Path(__file__).resolve().parent
LAY_FA = {
    "SLIDE": "اسلاید تمام‌صفحه",
    "SCAM": "اسلاید + من",
    "CAM": "فقط من",
}
VALID_OS = ("linux", "windows", "macos")
PERSIAN_TRANS = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")


def fa_digits(value: Any) -> str:
    return str(value).translate(PERSIAN_TRANS)


def escape_lua_string(value: Any) -> str:
    """Escape a Python string for safe embedding inside a double-quoted Lua string literal."""
    s = "" if value is None else str(value)
    s = s.replace("\\", "\\\\")
    s = s.replace('"', '\\"')
    s = s.replace("\r\n", "\\n").replace("\r", "\\n").replace("\n", "\\n")
    s = s.replace("\t", "\\t").replace("\x00", "\\000")
    return s


def steps_for_obs(project: Any) -> list[dict[str, Any]]:
    """Return enriched step records computed from video.yaml via project.steps()."""
    raw_steps = project.steps()
    motion_by_slide: dict[int, str] = {}
    for s in getattr(project, "slides", []) or []:
        s_num = int(s.get("_num") or 0)
        fx = s.get("fx") if isinstance(s.get("fx"), dict) else {}
        motion = s.get("motion") or fx.get("motion")
        if s_num and isinstance(motion, str) and motion.strip():
            motion_by_slide[s_num] = motion.strip()

    out: list[dict[str, Any]] = []
    for st in raw_steps:
        layout_key = str(st.get("layout") or "SCAM").upper()
        slide_num = int(st.get("slide") or 0)
        zoom = st.get("zoom")
        clean_zoom = None
        if isinstance(zoom, dict) and zoom:
            clean_zoom = {
                k: float(v)
                for k, v in zoom.items()
                if k in ("s", "x", "y") and v is not None
            }
            if not clean_zoom:
                clean_zoom = None
        motion = st.get("motion") or (motion_by_slide.get(slide_num) if slide_num else None)
        out.append({
            "n": int(st["n"]),
            "act": int(st["act"]),
            "layout": layout_key,
            "layoutKey": layout_key,
            "lay": LAY_FA.get(layout_key, layout_key),
            "slide": slide_num,
            "time": str(st.get("time") or ""),
            "text": str(st.get("text") or "").strip(),
            "motion": str(motion).strip() if isinstance(motion, str) and motion.strip() else None,
            "zoom": clean_zoom,
        })
    return out


def generate_steps_data_lua(steps: list[dict[str, Any]]) -> str:
    """Generate steps_data.lua table from normalized steps."""
    lines: list[str] = [
        "-- Step list. layout = SLIDE | SCAM | CAM ; slide = slide number (0 = none)",
        "-- ساخته‌شده خودکار از video.yaml با Khordegir Studio — دستی ویرایش نکن.",
        "return {",
    ]
    for st in steps:
        layout_key = str(st.get("layoutKey") or st.get("layout") or "SCAM").upper()
        fields = [
            f"act={int(st['act'])}",
            f'layout="{escape_lua_string(layout_key)}"',
            f"slide={int(st.get('slide') or 0)}",
            f'text="{escape_lua_string(st.get("text") or "")}"',
        ]
        motion = st.get("motion")
        if motion and motion != "auto":
            fields.append(f'motion="{escape_lua_string(motion)}"')
        zoom = st.get("zoom")
        if isinstance(zoom, dict) and zoom:
            z_parts = [f"{k}={float(zoom[k])}" for k in ("s", "x", "y") if k in zoom]
            if z_parts:
                fields.append("zoom={" + ", ".join(z_parts) + "}")
        time_comment = f" {st['time']}" if st.get("time") else ""
        lines.append(f"  {{{', '.join(fields)}}},  -- step {int(st['n'])}{time_comment}")
    lines.append("}")
    return "\n".join(lines) + "\n"


def generate_prompter_txt(steps: list[dict[str, Any]]) -> str:
    """Generate plain UTF-8 teleprompter script."""
    chunks: list[str] = []
    for st in steps:
        lay = st.get("lay") or LAY_FA.get(str(st.get("layout", "")), str(st.get("layout", "")))
        slide_num = int(st.get("slide") or 0)
        head = f"── مرحله {st['n']} · پرده {st['act']} · {lay}" + (f" · اسلاید {slide_num}" if slide_num else "")
        chunks.extend([head, str(st.get("text") or ""), ""])
    return "\n".join(chunks)


def generate_lua_v8(
    steps: list[dict[str, Any]],
    *,
    os_target: str = "linux",
    auto_studio_preview_sync: bool = True,
    slide_motion: bool = True,
) -> str:
    """Port of Hark Studio v8 OBS Lua script (incl. obs-tp 8c7518c gentle-zoom fix)."""
    if os_target not in VALID_OS:
        raise ValueError(f"Unsupported OS target: {os_target}")
    text_source_id = "text_gdiplus_v2" if os_target == "windows" else "text_ft2_source_v2"
    studio_preview_flag = "true" if auto_studio_preview_sync else "false"
    slide_motion_flag = "true" if slide_motion else "false"
    step_count = len(steps)
    padded_last = f"{max(1, step_count):02d}"

    return f"""--[[
Hark Studio v8 — One-Click Teleprompter + Slide Sync for OBS (Lua script)
========================================================================
  * Builds scenes once:
      00 استودیو (روی این بمان)   -> Program scene (holds 01/02/03 as layers)
      01 اسلاید  |  02 اسلاید + من  |  03 فقط من
      99 تلهپرامپتر (ضبط نمیشود) -> Browser source OR Native OBS Text fallback
  * Works inside OBS in 3 ways:
      1) OBS Custom Browser Dock (prompter.html) + obs-websocket v5 (1-click advances BOTH)
      2) OBS Studio Mode: Program = "00 استودیو" (recorded), Preview = "99 تلهپرامپتر" (only you see it!)
      3) Native OBS Text Source ("{text_source_id}") auto-created even if Browser Source is missing
  * Hotkeys (Settings > Hotkeys -> "HS ..."):
      Arrow Left  (←) = next step (slide + scene + teleprompter)
      Arrow Right (→) = previous step
      F9              = jump to first step of current act
      F1/F2/F3        = force layout (slide / slide+me / me only)
      F5/F6/F7        = zoom in/out / zoom out / motion toggle

Expected files next to this script ({step_count} steps):
  steps_data.lua, prompter.html, fonts/, slides/slide-01.png ..., slides/bg.png
  Optional (for pixel-perfect RTL PNG teleprompter): prompter/p-01.png ... p-{padded_last}.png
--]]

obs = obslua

local DIR = script_path()
local STEPS = {{}}
local idx = 1
local cam_name = ""
local hk = {{}}
local override = nil
local my_settings = nil
local AUTO_STUDIO_PREVIEW = {studio_preview_flag}

local SCN = {{
  SLIDE = "01 اسلاید",
  SCAM  = "02 اسلاید + من",
  CAM   = "03 فقط من",
  PROMPTER = "99 تلهپرامپتر (ضبط نمیشود)",
  PROGRAM = "00 استودیو (روی این بمان)",
}}
local SRC_SLIDE = "HS اسلاید"
local SRC_BG    = "HS پسزمینه"
local SRC_WEB   = "HS پرامپتر"
local SRC_TEXT  = "HS متن پرامپتر"
local SRC_PROMPTER_IMG = "HS تصویر پرامپتر"
local W, H = 1920, 1080
local TEXT_KIND_USED = "text_ft2_source_v2"

local DEFAULT_KEYS = {{
  hs_next = "OBS_KEY_LEFT",
  hs_prev = "OBS_KEY_RIGHT",
  hs_rec  = "OBS_KEY_F9",
  hs_slide = "OBS_KEY_F1",
  hs_scam  = "OBS_KEY_F2",
  hs_cam   = "OBS_KEY_F3",
  hs_zoom  = "OBS_KEY_F5",
  hs_zout  = "OBS_KEY_F6",
  hs_motion = "OBS_KEY_F7",
}}

---------------------------------------------------------------- helpers
local function log(msg) obs.script_log(obs.LOG_INFO, "[HarkStudio v8] " .. msg) end

local function file_exists(p)
  local f = io.open(p, "rb"); if f then f:close(); return true end; return false
end

local function load_steps()
  local ok, data = pcall(dofile, DIR .. "steps_data.lua")
  if ok and type(data) == "table" then STEPS = data
  else log("ERROR could not read steps_data.lua: " .. tostring(data)) end
  if idx > #STEPS then idx = 1 end
  log("steps loaded: " .. #STEPS .. "  (folder: " .. DIR .. ")")
end

local function slide_path(n) return string.format("%sslides/slide-%02d.png", DIR, n) end
local function prompter_img_path(n) return string.format("%sprompter/p-%02d.png", DIR, n) end

local function get_or_make_source(name, kind, settings_fn)
  local src = obs.obs_get_source_by_name(name)
  if src ~= nil then return src end
  local s = obs.obs_data_create()
  if settings_fn then settings_fn(s) end
  src = obs.obs_source_create(kind, name, s, nil)
  obs.obs_data_release(s)
  return src
end

local function set_slide_file(n)
  local p = slide_path(n)
  if not file_exists(p) then log("ERROR slide file missing: " .. p); return end
  local src = obs.obs_get_source_by_name(SRC_SLIDE)
  if src == nil then log("slide source missing (press Build scenes)"); return end
  local s = obs.obs_source_get_settings(src)
  obs.obs_data_set_string(s, "file", p)
  obs.obs_source_update(src, s)
  obs.obs_data_release(s)
  obs.obs_source_release(src)
end

---------------------------------------------------------------- Persian Shaping + BiDi (Lua 5.1)
local PERSIAN_FORMS = {{
  [0x0622]={{0xFE81,0xFE82,0xFE81,0xFE82,false}}, [0x0623]={{0xFE83,0xFE84,0xFE83,0xFE84,false}},
  [0x0624]={{0xFE85,0xFE86,0xFE85,0xFE86,false}}, [0x0625]={{0xFE87,0xFE88,0xFE87,0xFE88,false}},
  [0x0626]={{0xFE89,0xFE8A,0xFE8B,0xFE8C,true}},  [0x0627]={{0xFE8D,0xFE8E,0xFE8D,0xFE8E,false}},
  [0x0628]={{0xFE8F,0xFE90,0xFE91,0xFE92,true}},  [0x0629]={{0xFE93,0xFE94,0xFE93,0xFE94,false}},
  [0x062A]={{0xFE95,0xFE96,0xFE97,0xFE98,true}},  [0x062B]={{0xFE99,0xFE9A,0xFE9B,0xFE9C,true}},
  [0x062C]={{0xFE9D,0xFE9E,0xFE9F,0xFEA0,true}},  [0x062D]={{0xFEA1,0xFEA2,0xFEA3,0xFEA4,true}},
  [0x062E]={{0xFEA5,0xFEA6,0xFEA7,0xFEA8,true}},  [0x062F]={{0xFEA9,0xFEAA,0xFEA9,0xFEAA,false}},
  [0x0630]={{0xFEAB,0xFEAC,0xFEAB,0xFEAC,false}}, [0x0631]={{0xFEAD,0xFEAE,0xFEAD,0xFEAE,false}},
  [0x0632]={{0xFEAF,0xFEB0,0xFEAF,0xFEB0,false}}, [0x0633]={{0xFEB1,0xFEB2,0xFEB3,0xFEB4,true}},
  [0x0634]={{0xFEB5,0xFEB6,0xFEB7,0xFEB8,true}},  [0x0635]={{0xFEB9,0xFEBA,0xFEBB,0xFEBC,true}},
  [0x0636]={{0xFEBD,0xFEBE,0xFEBF,0xFEC0,true}},  [0x0637]={{0xFEC1,0xFEC2,0xFEC3,0xFEC4,true}},
  [0x0638]={{0xFEC5,0xFEC6,0xFEC7,0xFEC8,true}},  [0x0639]={{0xFEC9,0xFECA,0xFECB,0xFECC,true}},
  [0x063A]={{0xFECD,0xFECE,0xFECF,0xFED0,true}},  [0x0640]={{0x0640,0x0640,0x0640,0x0640,true}},
  [0x0641]={{0xFED1,0xFED2,0xFED3,0xFED4,true}},  [0x0642]={{0xFED5,0xFED6,0xFED7,0xFED8,true}},
  [0x0643]={{0xFED9,0xFEDA,0xFEDB,0xFEDC,true}},  [0x0644]={{0xFEDD,0xFEDE,0xFEDF,0xFEE0,true}},
  [0x0645]={{0xFEE1,0xFEE2,0xFEE3,0xFEE4,true}},  [0x0646]={{0xFEE5,0xFEE6,0xFEE7,0xFEE8,true}},
  [0x0647]={{0xFEE9,0xFEEA,0xFEEB,0xFEEC,true}},  [0x0648]={{0xFEED,0xFEEE,0xFEED,0xFEEE,false}},
  [0x0649]={{0xFEEF,0xFEF0,0xFEEF,0xFEF0,false}}, [0x064A]={{0xFEF1,0xFEF2,0xFEF3,0xFEF4,true}},
  [0x067E]={{0xFB56,0xFB57,0xFB58,0xFB59,true}},  [0x0686]={{0xFB7A,0xFB7B,0xFB7C,0xFB7D,true}},
  [0x0698]={{0xFB8A,0xFB8B,0xFB8A,0xFB8B,false}}, [0x06A9]={{0xFB8E,0xFB8F,0xFB90,0xFB91,true}},
  [0x06AF]={{0xFB92,0xFB93,0xFB94,0xFB95,true}},  [0x06C0]={{0xFBA4,0xFBA5,0xFBA4,0xFBA5,false}},
  [0x06CC]={{0xFBFC,0xFBFD,0xFBFE,0xFBFF,true}},
}}
local LA_LIG = {{
  [0x0622]={{0xFEF5,0xFEF6}}, [0x0623]={{0xFEF7,0xFEF8}},
  [0x0625]={{0xFEF9,0xFEFA}}, [0x0627]={{0xFEFB,0xFEFC}},
}}
local MIRROR_CP = {{
  [40]=41, [41]=40, [91]=93, [93]=91, [123]=125, [125]=123, [0x00AB]=0x00BB, [0x00BB]=0x00AB,
}}

local function utf8_to_cps(s)
  local cps, i, len = {{}}, 1, #s
  while i <= len do
    local b1 = string.byte(s, i)
    if b1 < 128 then
      table.insert(cps, b1); i = i + 1
    elseif b1 >= 192 and b1 < 224 and i + 1 <= len then
      local b2 = string.byte(s, i + 1)
      table.insert(cps, (b1 - 192) * 64 + (b2 - 128)); i = i + 2
    elseif b1 >= 224 and b1 < 240 and i + 2 <= len then
      local b2, b3 = string.byte(s, i + 1, i + 2)
      table.insert(cps, (b1 - 224) * 4096 + (b2 - 128) * 64 + (b3 - 128)); i = i + 3
    elseif b1 >= 240 and i + 3 <= len then
      local b2, b3, b4 = string.byte(s, i + 1, i + 3)
      table.insert(cps, (b1 - 240) * 262144 + (b2 - 128) * 4096 + (b3 - 128) * 64 + (b4 - 128)); i = i + 4
    else
      i = i + 1
    end
  end
  return cps
end

local function cp_to_utf8(cp)
  if cp < 128 then return string.char(cp)
  elseif cp < 2048 then
    return string.char(192 + math.floor(cp / 64), 128 + (cp % 64))
  elseif cp < 65536 then
    return string.char(224 + math.floor(cp / 4096), 128 + (math.floor(cp / 64) % 64), 128 + (cp % 64))
  else
    return string.char(240 + math.floor(cp / 262144), 128 + (math.floor(cp / 4096) % 64), 128 + (math.floor(cp / 64) % 64), 128 + (cp % 64))
  end
end

local function is_tashkeel(cp)
  return (cp >= 0x064B and cp <= 0x065F) or cp == 0x0670
end

local function is_ltr_cp(cp)
  return (cp >= 65 and cp <= 90) or (cp >= 97 and cp <= 122)
    or (cp >= 48 and cp <= 57) or (cp >= 0x06F0 and cp <= 0x06F9)
    or (cp >= 0x0660 and cp <= 0x0669)
end

local function shape_persian_word_cps(cps)
  local out = {{}}
  local i, n = 1, #cps
  local function prev_join_idx(pos)
    local p = pos - 1
    while p >= 1 and is_tashkeel(cps[p]) do p = p - 1 end
    if p < 1 then return false end
    local f = PERSIAN_FORMS[cps[p]]
    return f ~= nil and f[5] == true
  end
  local function next_letter_exists(pos)
    local q = pos + 1
    while q <= n and is_tashkeel(cps[q]) do q = q + 1 end
    if q > n then return false end
    return PERSIAN_FORMS[cps[q]] ~= nil
  end

  while i <= n do
    local cp = cps[i]
    if cp == 0x200C then
      i = i + 1
    elseif is_tashkeel(cp) then
      i = i + 1
    elseif cp == 0x0644 and i + 1 <= n and LA_LIG[cps[i + 1]] then
      local pj = prev_join_idx(i)
      local lig = LA_LIG[cps[i + 1]]
      table.insert(out, pj and lig[2] or lig[1])
      i = i + 2
    else
      local f = PERSIAN_FORMS[cp]
      if f then
        local pj = prev_join_idx(i)
        local nj = next_letter_exists(i)
        if pj and nj then table.insert(out, f[4])
        elseif pj then table.insert(out, f[2])
        elseif nj then table.insert(out, f[3])
        else table.insert(out, f[1]) end
      else
        table.insert(out, cp)
      end
      i = i + 1
    end
  end
  return out
end

local function bidi_visual_line(line)
  local cps = utf8_to_cps(line)
  local shaped = shape_persian_word_cps(cps)
  local runs, cur_ltr, cur = {{}}, nil, {{}}
  local function flush()
    if #cur > 0 then table.insert(runs, {{ltr = cur_ltr, cps = cur}}); cur = {{}} end
  end
  for k, cp in ipairs(shaped) do
    local ltr = is_ltr_cp(cp)
    if not ltr and cur_ltr == true and (cp == 44 or cp == 45 or cp == 46 or cp == 47 or cp == 58 or cp == 37 or cp == 32 or cp == 0x066B or cp == 0x066C) then
      local nxt = shaped[k + 1]
      if nxt and is_ltr_cp(nxt) then ltr = true end
    end
    if cur_ltr == nil then cur_ltr = ltr end
    if ltr ~= cur_ltr then flush(); cur_ltr = ltr end
    table.insert(cur, cp)
  end
  flush()

  local pieces = {{}}
  for r = #runs, 1, -1 do
    local run = runs[r]
    if run.ltr then
      for k = 1, #run.cps do table.insert(pieces, cp_to_utf8(run.cps[k])) end
    else
      for k = #run.cps, 1, -1 do
        local c = MIRROR_CP[run.cps[k]] or run.cps[k]
        table.insert(pieces, cp_to_utf8(c))
      end
    end
  end
  return table.concat(pieces)
end

local function wrap_utf8(str, max_chars)
  if not str or str == "" then return {{}} end
  local lines, cur, count = {{}}, "", 0
  for word in str:gmatch("%S+") do
    local wlen = #utf8_to_cps(word)
    if count > 0 and count + 1 + wlen > max_chars then
      table.insert(lines, cur)
      cur = word
      count = wlen
    else
      cur = (count == 0) and word or (cur .. " " .. word)
      count = (count == 0) and wlen or (count + 1 + wlen)
    end
  end
  if cur ~= "" then table.insert(lines, cur) end
  return lines
end

local function shape_multiline_for_ft2(logical_lines)
  local out = {{}}
  for _, ln in ipairs(logical_lines) do
    table.insert(out, bidi_visual_line(ln))
  end
  return table.concat(out, "\\n")
end

local function update_native_prompter_text()
  local st = STEPS[idx]
  if st == nil then return end

  local img_src = obs.obs_get_source_by_name(SRC_PROMPTER_IMG)
  if img_src ~= nil then
    local p = prompter_img_path(idx)
    if file_exists(p) then
      local s = obs.obs_source_get_settings(img_src)
      obs.obs_data_set_string(s, "file", p)
      obs.obs_source_update(img_src, s)
      obs.obs_data_release(s)
    end
    obs.obs_source_release(img_src)
    return
  end

  local src = obs.obs_get_source_by_name(SRC_TEXT)
  if src == nil then return end
  local nx = STEPS[idx + 1]
  local header = string.format("پرده %d · مرحله %d از %d · %s · اسلاید %d",
    st.act or 1, idx, #STEPS, st.layout or "SCAM", st.slide or 0)
  local body_lines = wrap_utf8(st.text or "", 44)
  local footer = nx and string.format("بعدی: %s (اسلاید %d)", nx.layout or "", nx.slide or 0) or "پایان اسکریپت"

  local all_lines = {{header, "────────────────────────"}}
  for _, l in ipairs(body_lines) do table.insert(all_lines, l) end
  table.insert(all_lines, "────────────────────────")
  table.insert(all_lines, footer)

  local full = (TEXT_KIND_USED == "text_gdiplus_v2")
    and table.concat(all_lines, "\\n")
    or shape_multiline_for_ft2(all_lines)

  local s = obs.obs_source_get_settings(src)
  obs.obs_data_set_string(s, "text", full)
  obs.obs_source_update(src, s)
  obs.obs_data_release(s)
  obs.obs_source_release(src)
end

local function place(scene, src, x, y, w, h, outer)
  if src == nil then return nil end
  local item = obs.obs_scene_add(scene, src)
  if item == nil then return nil end
  local pos = obs.vec2(); pos.x = x; pos.y = y
  obs.obs_sceneitem_set_pos(item, pos)
  obs.obs_sceneitem_set_bounds_type(item, outer and obs.OBS_BOUNDS_SCALE_OUTER or obs.OBS_BOUNDS_SCALE_INNER)
  local b = obs.vec2(); b.x = w; b.y = h
  obs.obs_sceneitem_set_bounds(item, b)
  return item
end

---------------------------------------------------------------- motion
local MOTION_ON = {slide_motion_flag}
local INTRO_T, KB_T, PUNCH_T = 0.7, 30.0, 0.8
local KF = nil
local CUR = {{s = 1.0, x = 0.0, y = 0.0}}
local ZOOMED = false
local LAST_SLIDE = -1
local MCOUNT = 0

local function now() return obs.os_gettime_ns() / 1e9 end
local function ease_out(t) return 1 - (1 - t) ^ 3 end
local function ease_io(t) return 0.5 - 0.5 * math.cos(math.pi * t) end

local function clampst(st)
  local mx = (st.s - 1) * W / 2
  local my = (st.s - 1) * H / 2
  st.x = math.max(-mx, math.min(mx, st.x))
  st.y = math.max(-my, math.min(my, st.y))
  return st
end

local function slide_items()
  local items = {{}}
  for _, sn in ipairs({{SCN.SLIDE, SCN.SCAM}}) do
    local src = obs.obs_get_source_by_name(sn)
    if src ~= nil then
      local sc = obs.obs_scene_from_source(src)
      if sc ~= nil then
        local it = obs.obs_scene_find_source(sc, SRC_SLIDE)
        if it ~= nil then table.insert(items, it) end
      end
      obs.obs_source_release(src)
    end
  end
  return items
end

local function put(st)
  CUR = {{s = st.s, x = st.x, y = st.y}}
  local pos = obs.vec2(); pos.x = W / 2 + st.x; pos.y = H / 2 + st.y
  local b = obs.vec2(); b.x = W * st.s; b.y = H * st.s
  for _, it in ipairs(slide_items()) do
    obs.obs_sceneitem_set_alignment(it, 0)
    obs.obs_sceneitem_set_bounds_alignment(it, 0)
    obs.obs_sceneitem_set_bounds_type(it, obs.OBS_BOUNDS_SCALE_INNER)
    obs.obs_sceneitem_set_pos(it, pos)
    obs.obs_sceneitem_set_bounds(it, b)
  end
end

local function go(a, b, dur, ease, nxt)
  KF = {{a = a, b = clampst(b), t0 = now(), dur = dur, ease = ease, next = nxt}}
end

local function kb_target(from, kind)
  if kind == "out" then return {{s = 1.0, x = 0, y = 0}} end
  if kind == "left" then return {{s = 1.04, x = -(1.04 - 1) * W / 2, y = 0}} end
  if kind == "right" then return {{s = 1.04, x = (1.04 - 1) * W / 2, y = 0}} end
  if kind == "none" then return {{s = 1.0, x = 0, y = 0}} end
  return {{s = 1.05, x = 0, y = 0}}
end

local function motion_new_slide(st)
  if not MOTION_ON then put({{s = 1, x = 0, y = 0}}); KF = nil; return end
  MCOUNT = MCOUNT + 1
  local kinds = {{"in", "out", "left", "in", "right", "out"}}
  local kind = st.motion or kinds[(MCOUNT - 1) % #kinds + 1]
  ZOOMED = false
  local start, land
  if kind == "out" then
    start = {{s = 1.06, x = 0, y = 0}}; land = {{s = 1.02, x = 0, y = 0}}
  elseif kind == "left" then
    start = {{s = 1.05, x = W * 0.02, y = 0}}; land = {{s = 1.03, x = W * 0.01, y = 0}}
  elseif kind == "right" then
    start = {{s = 1.05, x = -W * 0.02, y = 0}}; land = {{s = 1.03, x = -W * 0.01, y = 0}}
  elseif kind == "none" then
    start = {{s = 1.0, x = 0, y = 0}}; land = start
  else
    start = {{s = 1.05, x = 0, y = 0}}; land = {{s = 1.0, x = 0, y = 0}}
  end
  start = clampst(start); land = clampst(land)
  put(start)
  go(start, land, INTRO_T, ease_out, function()
    go(CUR, kb_target(CUR, kind), KB_T, ease_io, nil)
  end)
end

local function motion_tick()
  if KF == nil then return end
  local t = (now() - KF.t0) / KF.dur
  if t >= 1 then
    put(KF.b)
    local nxt = KF.next; KF = nil
    if nxt then nxt() end
    return
  end
  local e = KF.ease(t)
  put({{s = KF.a.s + (KF.b.s - KF.a.s) * e,
       x = KF.a.x + (KF.b.x - KF.a.x) * e,
       y = KF.a.y + (KF.b.y - KF.a.y) * e}})
end

local function zoom_in()
  local st = STEPS[idx] or {{}}
  local z = st.zoom or {{}}
  local s = z.s or 1.6
  local fx, fy = z.x or 0.5, z.y or 0.5
  local tgt = clampst({{s = s, x = (0.5 - fx) * W * s, y = (0.5 - fy) * H * s}})
  ZOOMED = true
  go({{s = CUR.s, x = CUR.x, y = CUR.y}}, tgt, PUNCH_T, ease_io, nil)
end

local function zoom_out()
  ZOOMED = false
  go({{s = CUR.s, x = CUR.x, y = CUR.y}}, {{s = 1.0, x = 0, y = 0}}, PUNCH_T, ease_io, function()
    if MOTION_ON then go(CUR, {{s = 1.06, x = 0, y = 0}}, KB_T, ease_io, nil) end
  end)
end

local function zoom_toggle() if ZOOMED then zoom_out() else zoom_in() end end

local function motion_toggle()
  MOTION_ON = not MOTION_ON
  log("motion " .. (MOTION_ON and "ON" or "OFF"))
  if not MOTION_ON then go({{s = CUR.s, x = CUR.x, y = CUR.y}}, {{s = 1, x = 0, y = 0}}, 0.5, ease_io, nil) end
end

local function set_fade_transition()
  local list = obs.obs_frontend_get_transitions()
  if list == nil then return end
  for _, tr in ipairs(list) do
    if obs.obs_source_get_id(tr) == "fade_transition" then
      obs.obs_frontend_set_current_transition(tr)
      obs.obs_frontend_set_transition_duration(350)
    end
  end
  obs.source_list_release(list)
end

---------------------------------------------------------------- layers (program scene)
local HIDE_AT = nil
local FADE_MS = 350

local function program_items()
  local out = {{}}
  local src = obs.obs_get_source_by_name(SCN.PROGRAM)
  if src == nil then return out end
  local sc = obs.obs_scene_from_source(src)
  for _, k in ipairs({{"SLIDE", "SCAM", "CAM"}}) do
    local it = obs.obs_scene_find_source(sc, SCN[k])
    if it ~= nil then out[SCN[k]] = it end
  end
  obs.obs_source_release(src)
  return out
end

local function show_layer(name)
  local items = program_items()
  local it = items[name]
  if it == nil then log("layer missing: " .. tostring(name) .. " (press 'Build scenes')"); return end
  if obs.obs_sceneitem_visible(it) then
    for n, o in pairs(items) do if n ~= name then obs.obs_sceneitem_set_visible(o, false) end end
    return
  end
  obs.obs_sceneitem_set_order(it, obs.OBS_ORDER_MOVE_TOP)
  obs.obs_sceneitem_set_visible(it, true)
  HIDE_AT = {{t = obs.os_gettime_ns() / 1e9 + FADE_MS / 1000 + 0.05, keep = name}}
end

local function layer_tick()
  if HIDE_AT == nil then return end
  if obs.os_gettime_ns() / 1e9 < HIDE_AT.t then return end
  local keep = HIDE_AT.keep; HIDE_AT = nil
  for n, o in pairs(program_items()) do
    if n ~= keep then obs.obs_sceneitem_set_visible(o, false) end
  end
end

local function sync_studio_preview()
  if not AUTO_STUDIO_PREVIEW then return end
  if obs.obs_frontend_preview_program_mode_active and obs.obs_frontend_preview_program_mode_active() then
    local psc = obs.obs_get_source_by_name(SCN.PROMPTER)
    if psc ~= nil then
      obs.obs_frontend_set_current_preview_scene(psc)
      obs.obs_source_release(psc)
    end
  end
end

---------------------------------------------------------------- build
local function build_scenes()
  if cam_name == "" then
    log("Pick your camera in the script settings first."); return
  end
  local cam = obs.obs_get_source_by_name(cam_name)
  if cam == nil then log("camera source not found: " .. cam_name); return end
  if not file_exists(slide_path(1)) then
    log("ERROR slides not found at " .. slide_path(1))
  end

  local slide = get_or_make_source(SRC_SLIDE, "image_source", function(s)
    obs.obs_data_set_string(s, "file", slide_path(1)) end)
  local bg = get_or_make_source(SRC_BG, "image_source", function(s)
    obs.obs_data_set_string(s, "file", DIR .. "slides/bg.png") end)

  local function remove_scene(name)
    local old = obs.obs_get_source_by_name(name)
    if old ~= nil then obs.obs_source_remove(old); obs.obs_source_release(old) end
  end
  local function make(name, fill)
    remove_scene(name)
    local sc = obs.obs_scene_create(name)
    fill(sc)
    obs.obs_scene_release(sc)
    log("created: " .. name)
  end

  make(SCN.SLIDE, function(sc) place(sc, slide, 0, 0, W, H, false) end)
  make(SCN.SCAM, function(sc)
    place(sc, slide, 0, 0, W, H, false)
    place(sc, cam, 24, 740, 560, 315, false)
  end)
  make(SCN.CAM, function(sc)
    place(sc, bg, 0, 0, W, H, true)
    place(sc, cam, 0, 0, W, H, true)
  end)
  make(SCN.PROGRAM, function(sc)
    for _, k in ipairs({{"CAM", "SCAM", "SLIDE"}}) do
      local ssrc = obs.obs_get_source_by_name(SCN[k])
      if ssrc ~= nil then
        local it = place(sc, ssrc, 0, 0, W, H, false)
        if it ~= nil then
          pcall(function()
            local fade = obs.obs_source_create_private("fade_transition", "HS fade " .. k, nil)
            obs.obs_sceneitem_set_transition(it, true, fade)
            obs.obs_sceneitem_set_transition_duration(it, true, FADE_MS)
            obs.obs_source_release(fade)
          end)
          obs.obs_sceneitem_set_visible(it, k == "SLIDE")
        end
        obs.obs_source_release(ssrc)
      end
    end
  end)

  local prog = obs.obs_get_source_by_name(SCN.PROGRAM)
  if prog ~= nil then obs.obs_frontend_set_current_scene(prog); obs.obs_source_release(prog) end

  local has_prompter_imgs = file_exists(prompter_img_path(1))
  local has_browser = obs.obs_source_get_display_name("browser_source") ~= nil
  if has_prompter_imgs then
    local pimg = get_or_make_source(SRC_PROMPTER_IMG, "image_source", function(s)
      obs.obs_data_set_string(s, "file", prompter_img_path(1))
    end)
    if pimg ~= nil then
      make(SCN.PROMPTER, function(sc) place(sc, pimg, 0, 0, W, H, false) end)
      obs.obs_source_release(pimg)
      update_native_prompter_text()
      log("Created PNG image prompter scene: " .. SCN.PROMPTER)
    end
  elseif has_browser then
    local web = get_or_make_source(SRC_WEB, "browser_source", function(s)
      obs.obs_data_set_bool(s, "is_local_file", true)
      obs.obs_data_set_string(s, "local_file", DIR .. "prompter.html")
      obs.obs_data_set_int(s, "width", 1280)
      obs.obs_data_set_int(s, "height", 720)
    end)
    if web ~= nil then
      make(SCN.PROMPTER, function(sc) place(sc, web, 0, 0, W, H, false) end)
      obs.obs_source_release(web)
    end
  else
    local text_kind = obs.obs_source_get_display_name("{text_source_id}") ~= nil and "{text_source_id}"
      or (obs.obs_source_get_display_name("text_gdiplus_v2") ~= nil and "text_gdiplus_v2" or "text_ft2_source_v2")
    TEXT_KIND_USED = text_kind
    local txt_src = get_or_make_source(SRC_TEXT, text_kind, function(s)
      obs.obs_data_set_string(s, "text", "تله‌پرامپتر آماده است")
      if text_kind == "text_gdiplus_v2" then
        obs.obs_data_set_string(s, "align", "right")
      end
      local font = obs.obs_data_create()
      obs.obs_data_set_string(font, "face", "Vazirmatn")
      obs.obs_data_set_int(font, "size", 52)
      obs.obs_data_set_obj(s, "font", font)
      obs.obs_data_release(font)
    end)
    if txt_src ~= nil then
      make(SCN.PROMPTER, function(sc)
        local item = obs.obs_scene_add(sc, txt_src)
        if item ~= nil then
          obs.obs_sceneitem_set_alignment(item, 6)
          obs.obs_sceneitem_set_bounds_alignment(item, 6)
          local pos = obs.vec2(); pos.x = W - 80; pos.y = 60
          obs.obs_sceneitem_set_pos(item, pos)
          obs.obs_sceneitem_set_bounds_type(item, obs.OBS_BOUNDS_SCALE_INNER)
          local b = obs.vec2(); b.x = W - 160; b.y = H - 120
          obs.obs_sceneitem_set_bounds(item, b)
        end
      end)
      obs.obs_source_release(txt_src)
      update_native_prompter_text()
      log("Created native OBS text prompter scene (" .. text_kind .. "): " .. SCN.PROMPTER)
    end
  end

  if bg then obs.obs_source_release(bg) end
  if slide then obs.obs_source_release(slide) end
  obs.obs_source_release(cam)
  set_fade_transition()
  put({{s = 1, x = 0, y = 0}})
  LAST_SLIDE = -1
  sync_studio_preview()
  log("Build scenes complete.")
end

---------------------------------------------------------------- takes / live state
local TAKES = {{}}
LAST_JS = nil
local rec_started = nil
local rec_act = nil
local SEQ = 0

local function esc(x) return (tostring(x or ""):gsub('\\\\','\\\\\\\\'):gsub('"','\\\\"')) end

local function write_state()
  local parts = {{}}
  for _, t in ipairs(TAKES) do
    table.insert(parts, string.format('{{"act":%d,"take":%d,"start":%d,"stop":%d,"file":"%s"}}',
      t.act, t.take, t.start, t.stop, esc(t.file)))
  end
  local cur = STEPS[idx] or {{act = 1}}
  local js = string.format('window.HS_STATE={{"seq":%d,"now":%d,"step":%d,"total":%d,"act":%d,"recording":%s,"rec_start":%d,"rec_act":%d,"takes":[%s]}};',
    SEQ, os.time(), idx, #STEPS, cur.act, rec_started and "true" or "false", rec_started or 0, rec_act or 0, table.concat(parts, ","))
  if js == LAST_JS then return end
  LAST_JS = js
  local tmp = DIR .. "state.js.tmp"
  local f = io.open(tmp, "w")
  if f then f:write(js); f:close(); os.rename(tmp, DIR .. "state.js")
  else log("cannot write state.js in " .. DIR) end
  local g = io.open(DIR .. "takes_data.lua", "w")
  if g then
    g:write("return {{\\n")
    for _, t in ipairs(TAKES) do
      g:write(string.format('  {{act=%d, take=%d, start=%d, stop=%d, file="%s"}},\\n', t.act, t.take, t.start, t.stop, esc(t.file)))
    end
    g:write("}}\\n"); g:close()
  end
end

local function load_takes()
  local ok, data = pcall(dofile, DIR .. "takes_data.lua")
  if ok and type(data) == "table" then TAKES = data end
end

local function on_event(ev)
  if ev == obs.OBS_FRONTEND_EVENT_RECORDING_STARTED then
    rec_started = os.time(); rec_act = (STEPS[idx] or {{act = 1}}).act
    SEQ = SEQ + 1
    write_state()
  elseif ev == obs.OBS_FRONTEND_EVENT_RECORDING_STOPPED then
    local n = 0
    for _, t in ipairs(TAKES) do if t.act == rec_act then n = n + 1 end end
    local file = ""
    if obs.obs_frontend_get_last_recording then
      local ok, r = pcall(obs.obs_frontend_get_last_recording); if ok and r then file = r end
    end
    if rec_started then
      table.insert(TAKES, {{act = rec_act or 1, take = n + 1, start = rec_started, stop = os.time(), file = file}})
    end
    rec_started = nil; rec_act = nil
    SEQ = SEQ + 1
    write_state()
  end
end

local function state_tick() write_state() end

---------------------------------------------------------------- stepping
local function switch_to(scene_name)
  show_layer(scene_name)
end

local function apply()
  local st = STEPS[idx]; if st == nil then return end
  override = nil
  SEQ = SEQ + 1
  if st.slide and st.slide > 0 then set_slide_file(st.slide) end
  if st.slide and st.slide ~= LAST_SLIDE then LAST_SLIDE = st.slide; motion_new_slide(st) end
  switch_to(SCN[st.layout] or SCN.SCAM)
  update_native_prompter_text()
  sync_studio_preview()
  log(string.format("step %d/%d  act %d  %s  slide %d", idx, #STEPS, st.act, st.layout, st.slide or 0))
  write_state()
end

local function act_first(a)
  for i, s in ipairs(STEPS) do if s.act == a then return i end end
  return 1
end

local function do_next()
  if #STEPS == 0 then return end
  if idx >= #STEPS then return end
  idx = idx + 1
  apply()
end

local function do_prev()
  if idx > 1 then idx = idx - 1 end
  apply()
end

local function record_act(from_button)
  local a = STEPS[idx] and STEPS[idx].act or 1
  idx = act_first(a)
  apply()
  if from_button then
    if obs.obs_frontend_recording_active() then obs.obs_frontend_recording_stop()
    else obs.obs_frontend_recording_start() end
  end
end

local function toggle(layout)
  if override == layout then
    override = nil
    local st = STEPS[idx]; switch_to(SCN[st and st.layout or "SCAM"] or SCN.SCAM)
  else
    override = layout
    switch_to(SCN[layout])
  end
end

---------------------------------------------------------------- OBS API
local function reset_arrow_hotkeys()
  for name, key_name in pairs({{hs_next = "OBS_KEY_LEFT", hs_prev = "OBS_KEY_RIGHT"}}) do
    local id = hk[name]
    if id ~= nil then
      local arr = obs.obs_data_array_create()
      local k = obs.obs_data_create()
      obs.obs_data_set_string(k, "key", key_name)
      obs.obs_data_array_push_back(arr, k)
      obs.obs_data_release(k)
      obs.obs_hotkey_load(id, arr)
      obs.obs_data_array_release(arr)
    end
  end
  log("Hotkeys updated: Arrow Left = next, Arrow Right = prev")
end

function script_description()
  return [[<b>Hark Studio v8 (پرامپتر درون OBS + راست‌چین فارسی/انگلیسی + کلیدهای جهت)</b><br>
۱) دوربین را انتخاب کن ۲) Build scenes ۳) در Studio Mode صحنه «99 تلهپرامپتر» در Preview می‌ماند و «00 استودیو» ضبط می‌شود.<br>
<b>جهت چپ (←)</b> مرحله بعد · <b>جهت راست (→)</b> مرحله قبلی · <b>F9</b> اول پرده · <b>F5/F6</b> زوم]]
end

function script_properties()
  local p = obs.obs_properties_create()
  local list = obs.obs_properties_add_list(p, "cam", "دوربین", obs.OBS_COMBO_TYPE_LIST, obs.OBS_COMBO_FORMAT_STRING)
  local sources = obs.obs_enum_sources()
  if sources ~= nil then
    for _, src in ipairs(sources) do
      local n = obs.obs_source_get_name(src)
      if string.sub(n, 1, 3) ~= "HS " then obs.obs_property_list_add_string(list, n, n) end
    end
  end
  obs.source_list_release(sources)
  obs.obs_properties_add_bool(p, "studio_preview", "نگه‌داشتن پرامپتر در Preview هنگام Studio Mode")
  obs.obs_properties_add_bool(p, "slide_motion", "حرکت/زوم خودکار اسلایدها (F7) — خاموش = بدون بیرون‌زدگی لبه‌ها")
  obs.obs_properties_add_button(p, "build", "Build scenes (یکبار)", function() build_scenes(); apply(); return true end)
  obs.obs_properties_add_button(p, "fit_slide", "تنظیم دقیق کادر اسلاید (۱۰۰٪ بدون برش)", function() KF = nil; ZOOMED = false; put({{s = 1, x = 0, y = 0}}); return true end)
  obs.obs_properties_add_button(p, "arrowkeys", "تنظیم کلیدهای جهت (← جلو / → عقب)", function() reset_arrow_hotkeys(); return true end)
  obs.obs_properties_add_int(p, "goto", "برو به مرحله", 1, 300, 1)
  obs.obs_properties_add_button(p, "go", "Go", function() apply(); return true end)
  obs.obs_properties_add_button(p, "prev", "▶ قبلی (Arrow Right)", function() do_prev(); return true end)
  obs.obs_properties_add_button(p, "next", "بعدی ◀ (Arrow Left)", function() do_next(); return true end)
  obs.obs_properties_add_button(p, "zin", "زوم این (F5)", function() zoom_toggle(); return true end)
  obs.obs_properties_add_button(p, "zout", "زوم اوت (F6)", function() zoom_out(); return true end)
  obs.obs_properties_add_button(p, "rec", "● شروع/توقف ضبط (از اول این پرده)", function() record_act(true); return true end)
  obs.obs_properties_add_button(p, "clear", "پاک کردن تایملاین برداشتها", function() TAKES = {{}}; SEQ = SEQ + 1; write_state(); return true end)
  obs.obs_properties_add_button(p, "reload", "Reload steps", function() load_steps(); apply(); return true end)
  return p
end

function script_defaults(settings)
  obs.obs_data_set_default_bool(settings, "studio_preview", AUTO_STUDIO_PREVIEW)
  obs.obs_data_set_default_bool(settings, "slide_motion", MOTION_ON)
end

function script_update(settings)
  my_settings = settings
  cam_name = obs.obs_data_get_string(settings, "cam")
  AUTO_STUDIO_PREVIEW = obs.obs_data_get_bool(settings, "studio_preview")
  MOTION_ON = obs.obs_data_get_bool(settings, "slide_motion")
  if not MOTION_ON and not ZOOMED then KF = nil; put({{s = 1, x = 0, y = 0}}) end
  local g = obs.obs_data_get_int(settings, "goto")
  if g >= 1 and g <= #STEPS then idx = g end
end

local PENDING = {{}}
local function pump()
  if #PENDING == 0 then return end
  local list = PENDING; PENDING = {{}}
  for _, f in ipairs(list) do local ok, e = pcall(f); if not ok then log("error: " .. tostring(e)) end end
end

local function reg(settings, name, desc, fn)
  local id = obs.obs_hotkey_register_frontend(name, desc, function(pressed)
    if pressed and #PENDING < 3 then table.insert(PENDING, fn) end
  end)
  local arr = obs.obs_data_get_array(settings, name)
  if arr == nil or obs.obs_data_array_count(arr) == 0 then
    if arr ~= nil then obs.obs_data_array_release(arr) end
    arr = obs.obs_data_array_create()
    if DEFAULT_KEYS[name] then
      local k = obs.obs_data_create()
      obs.obs_data_set_string(k, "key", DEFAULT_KEYS[name])
      obs.obs_data_array_push_back(arr, k)
      obs.obs_data_release(k)
    end
  end
  obs.obs_hotkey_load(id, arr)
  obs.obs_data_array_release(arr)
  hk[name] = id
end

function script_load(settings)
  my_settings = settings
  load_steps()
  load_takes()
  obs.obs_frontend_add_event_callback(on_event)
  obs.timer_add(state_tick, 1000)
  obs.timer_add(pump, 40)
  write_state()
  reg(settings, "hs_next",  "HS ▶ مرحلهی بعد", do_next)
  reg(settings, "hs_prev",  "HS ◀ مرحلهی قبل", do_prev)
  reg(settings, "hs_rec",   "HS ⏮ برگشت به اول این پرده", function() record_act(false) end)
  reg(settings, "hs_slide", "HS صحنه: فقط اسلاید", function() toggle("SLIDE") end)
  reg(settings, "hs_scam",  "HS صحنه: اسلاید + من", function() toggle("SCAM") end)
  reg(settings, "hs_cam",   "HS صحنه: فقط من", function() toggle("CAM") end)
  reg(settings, "hs_zoom",  "HS زوم این (دوباره = زوم اوت)", zoom_toggle)
  reg(settings, "hs_zout",  "HS زوم اوت", zoom_out)
  reg(settings, "hs_motion","HS حرکت اسلاید روشن/خاموش", motion_toggle)
  obs.timer_add(motion_tick, 16)
  obs.timer_add(layer_tick, 16)
end

function script_save(settings)
  for name, id in pairs(hk) do
    local arr = obs.obs_hotkey_save(id)
    obs.obs_data_set_array(settings, name, arr)
    obs.obs_data_array_release(arr)
  end
end

function script_unload()
  obs.timer_remove(state_tick)
  obs.timer_remove(pump)
  obs.timer_remove(motion_tick)
  obs.timer_remove(layer_tick)
end
"""


def _estimate_total_hint(steps: list[dict[str, Any]]) -> str:
    words = sum(len(str(s.get("text") or "").split()) for s in steps)
    mins = words / 140.0
    return fa_digits(f"{int(mins):02d}:{int((mins % 1) * 60):02d}")


def _serialize_prompter_steps(steps: list[dict[str, Any]]) -> str:
    return json.dumps(
        [
            {
                "n": int(s["n"]),
                "act": int(s["act"]),
                "lay": s.get("lay") or LAY_FA.get(str(s.get("layout", "")), str(s.get("layout", ""))),
                "slide": int(s.get("slide") or 0),
                "time": str(s.get("time") or ""),
                "text": str(s.get("text") or ""),
            }
            for s in steps
        ],
        ensure_ascii=False,
    ).replace("</", "<\\/")


def generate_prompter_html(
    steps: list[dict[str, Any]],
    *,
    total_hint: str | None = None,
    **_ignored: Any,
) -> str:
    """Render the plain standalone RTL overview teleprompter (prompter_template.html -> prompter.html).

    Works offline with zero OBS WebSocket dependency (as an OBS Browser Source reading state.js
    or standalone on a second screen with keyboard navigation).
    """
    tpl = (PKG / "obs" / "prompter_template.html").read_text(encoding="utf-8")
    hint = total_hint if total_hint is not None else _estimate_total_hint(steps)
    serialized = _serialize_prompter_steps(steps)
    return (
        tpl.replace("__STEPS__", serialized)
        .replace("<script>", f"<script>window.TOTAL_HINT={json.dumps(hint, ensure_ascii=False)};", 1)
    )


def generate_prompter_dock_html(
    steps: list[dict[str, Any]],
    *,
    ws_url: str = "ws://127.0.0.1:4455",
    ws_password: str = "",
    poll_interval_ms: int = 150,
    click_text_to_advance: bool = True,
    font_size_px: int = 46,
    mirror: bool = False,
    scroll_speed: float = 1.2,
) -> str:
    """Generate optional offline RTL OBS Custom Browser Dock HTML with graceful standalone fallback."""
    serialized = _serialize_prompter_steps(steps)

    safe_ws_url = json.dumps(ws_url, ensure_ascii=False)
    safe_ws_pass = json.dumps(ws_password, ensure_ascii=False)
    poll_ms = max(100, min(2000, int(poll_interval_ms or 150)))
    click_flag = "true" if click_text_to_advance else "false"
    cursor_css = "pointer" if click_text_to_advance else "default"
    body_cls = "mirror" if mirror else ""
    wrap_title = "برای رفتن به مرحله بعد کلیک کنید" if click_text_to_advance else ""

    return f"""<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Khordegir Studio — OBS Teleprompter Dock</title>
<style>
@font-face{{font-family:V;src:url("fonts/Vazirmatn-Bold.ttf")}}
:root{{--bg:#0b0d11;--panel:#13161d;--line:rgba(255,255,255,.1);--gold:#f59e0b;--txt:#f8fafc;--muted:#94a3b8;--fs:{int(font_size_px)}px}}
*{{box-sizing:border-box}}
html,body{{margin:0;height:100%;background:var(--bg);color:var(--txt);font-family:V,Vazirmatn,Tahoma,sans-serif;overflow:hidden}}
body{{display:flex;flex-direction:column}}
#top{{background:var(--panel);border-bottom:1px solid var(--line);padding:8px 12px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;font-size:14px}}
#where{{color:var(--gold);font-weight:700}}
#next{{color:var(--muted);font-size:13px}}
#wsbar{{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted)}}
.dot{{width:8px;height:8px;border-radius:999px;background:#64748b;display:inline-block}}
.dot.ok{{background:#16a34a}}
.dot.warn{{background:#f59e0b}}
#wsbtn{{background:#1e293b;color:#e2e8f0;border:1px solid var(--line);border-radius:6px;padding:4px 8px;cursor:pointer;font-family:inherit;font-size:12px}}
#wrap{{position:relative;flex:1;overflow-y:auto;padding:24px 6% 48px;cursor:{cursor_css}}}
#guide{{position:sticky;top:24%;height:2px;background:rgba(245,158,11,.35);pointer-events:none;margin-bottom:12px}}
#txt{{font-size:var(--fs);line-height:1.72;text-align:right;transition:transform .08s linear}}
body.mirror #wrap{{transform:scaleX(-1)}}
#controls{{background:var(--panel);border-top:1px solid var(--line);padding:10px 12px;display:flex;gap:8px;align-items:center}}
#btnNext{{flex:2;min-height:48px;background:var(--gold);color:#0b0d11;border:none;border-radius:8px;font-family:inherit;font-size:17px;font-weight:700;cursor:pointer;padding:10px 14px}}
#btnNext:active{{transform:scale(.99)}}
.btn{{min-height:48px;background:#1e293b;color:#f1f5f9;border:1px solid var(--line);border-radius:8px;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;padding:8px 12px;white-space:nowrap}}
.btn:disabled{{opacity:.45;cursor:not-allowed}}
.btn.rec-on{{background:#b91c1c;border-color:#ef4444;color:#fff}}
#tlWrap{{background:#0e1117;border-top:1px solid var(--line);padding:6px 10px 8px}}
#totRow{{display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-bottom:5px}}
#recdot{{color:#ef4444;font-weight:700;display:none}}
#tl{{display:flex;gap:4px;height:44px}}
.act{{flex:1;background:#1a1e28;border-radius:6px;padding:4px 6px;font-size:11px;color:#94a3b8;overflow:hidden;border:1px solid transparent;cursor:pointer}}
.act.done{{background:#14532d;color:#f0fdf4}}
.act.rec{{background:#7f1d1d;color:#fef2f2}}
.act.here{{border-color:var(--gold)}}
.act b{{display:block;font-size:12px;color:#fff}}
</style>
</head>
<body class="{body_cls}">
<div id="top">
  <div>
    <div id="where"></div>
    <div id="next"></div>
  </div>
  <div id="wsbar">
    <span class="dot warn" id="wsDot"></span>
    <span id="wsStatus">حالت مستقل (بدون OBS)</span>
    <button id="wsbtn" type="button">اتصال اختیاری OBS</button>
  </div>
</div>

<div id="wrap" title="{wrap_title}">
  <div id="guide"></div>
  <div id="txt"></div>
</div>

<div id="controls">
  <button id="btnNext" type="button">مرحله بعد (پرامپتر + اسلاید) ◀</button>
  <button id="btnPrev" class="btn" type="button">▶ قبلی</button>
  <button id="btnZoom" class="btn" type="button" disabled title="نیازمند اتصال اختیاری OBS">زوم</button>
  <button id="btnRec" class="btn" type="button" disabled title="نیازمند اتصال اختیاری OBS">● ضبط</button>
</div>

<div id="tlWrap">
  <div id="totRow">
    <span id="tot">مجموع ضبط‌شده: ۰۰:۰۰</span>
    <span id="recdot">● REC <span id="rt">۰۰:۰۰</span></span>
  </div>
  <div id="tl"></div>
</div>

<script>
const S={serialized};
const WS_URL={safe_ws_url};
const WS_PASS={safe_ws_pass};
const POLL_MS={poll_ms};
const CLICK_TEXT={click_flag};
let i=0,auto=false,speed={float(scroll_speed)},fs={int(font_size_px)},y=0,lastSeq=-1,localLockUntil=0;
const q=new URLSearchParams(location.search);
if(q.get('s'))i=Math.max(0,Math.min(Math.max(0,S.length-1),parseInt(q.get('s'),10)-1));
if(q.get('fs'))fs=parseInt(q.get('fs'),10);
if(q.get('mirror'))document.body.classList.add('mirror');
const fa=n=>String(n).replace(/\\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
const mmss=s=>{{s=Math.max(0,Math.round(s));return fa(String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0'))}};

function show(){{
  if(!S.length){{
    document.getElementById('where').textContent='مرحله‌ای وجود ندارد';
    document.getElementById('next').textContent='';
    document.getElementById('txt').textContent='';
    return;
  }}
  const s=S[i],nx=S[i+1];
  document.getElementById('where').textContent='پرده '+fa(s.act)+' · مرحله '+fa(s.n)+' از '+fa(S.length)+' · '+s.lay+(s.slide?' · اسلاید '+fa(s.slide):'')+(s.time?' · '+s.time:'');
  document.getElementById('next').textContent=nx?('بعدی: '+nx.lay+(nx.slide?' '+fa(nx.slide):'')+(nx.act!==s.act?' — پایان پرده':'')):'پایان اسکریپت';
  const t=document.getElementById('txt');
  t.textContent=s.text;
  y=0;t.style.transform='translateY(0)';
  t.style.setProperty('--fs',fs+'px');
  const w=document.getElementById('wrap');
  w.scrollTop=0;
  let f=fs;
  while(f>24&&t.scrollHeight>w.clientHeight-36){{f-=2;t.style.setProperty('--fs',f+'px')}}
  renderTimeline();
}}

let ws=null,wsReady=false,reqId=1;
async function sha256b64(str){{
  const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(str));
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}}
function setWsUi(ok,msg){{
  wsReady=ok;
  document.getElementById('wsDot').className='dot '+(ok?'ok':'warn');
  document.getElementById('wsStatus').textContent=msg;
  document.getElementById('btnZoom').disabled=!ok;
  document.getElementById('btnRec').disabled=!ok;
}}
function connectWs(){{
  if(ws){{try{{ws.close()}}catch(e){{}}}}
  if(typeof WebSocket==='undefined'){{setWsUi(false,'حالت مستقل (WebSocket ناموجود)');return}}
  setWsUi(false,'در حال اتصال به OBS...');
  try{{ws=new WebSocket(WS_URL)}}catch(e){{setWsUi(false,'حالت مستقل (بدون OBS)');return}}
  ws.onmessage=async ev=>{{
    try{{
      const m=JSON.parse(ev.data);
      if(m.op===0){{
        let auth;
        if(m.d&&m.d.authentication){{
          if(!window.crypto||!crypto.subtle){{setWsUi(false,'حالت مستقل (رمزگذاری غیرفعال)');ws.close();return}}
          const sec=await sha256b64(WS_PASS+m.d.authentication.salt);
          auth=await sha256b64(sec+m.d.authentication.challenge);
        }}
        ws.send(JSON.stringify({{op:1,d:{{rpcVersion:1,...(auth?{{authentication:auth}}:{{}})}}}}));
      }}else if(m.op===2){{
        setWsUi(true,'متصل به OBS');
      }}
    }}catch(e){{}}
  }};
  ws.onerror=()=>setWsUi(false,'حالت مستقل (OBS در دسترس نیست)');
  ws.onclose=()=>setWsUi(false,wsReady?'حالت مستقل (OBS قطع شد)':'حالت مستقل (بدون OBS)');
}}
function triggerObsHotkey(name){{
  if(!ws||ws.readyState!==1)return false;
  ws.send(JSON.stringify({{op:6,d:{{requestType:'TriggerHotkeyByName',requestId:'r'+(reqId++),requestData:{{hotkeyName:name}}}}}}));
  return true;
}}
function toggleObsRecord(){{
  if(!ws||ws.readyState!==1)return false;
  ws.send(JSON.stringify({{op:6,d:{{requestType:'ToggleRecord',requestId:'r'+(reqId++)}}}}));
  return true;
}}

function stepNext(){{
  localLockUntil=Date.now()+900;
  if(i<S.length-1){{i++;show()}}
  triggerObsHotkey('hs_next');
}}
function stepPrev(){{
  localLockUntil=Date.now()+900;
  if(i>0){{i--;show()}}
  triggerObsHotkey('hs_prev');
}}

document.getElementById('btnNext').onclick=stepNext;
document.getElementById('btnPrev').onclick=stepPrev;
document.getElementById('btnZoom').onclick=()=>triggerObsHotkey('hs_zoom');
document.getElementById('btnRec').onclick=toggleObsRecord;
document.getElementById('wsbtn').onclick=connectWs;
if(CLICK_TEXT){{document.getElementById('wrap').onclick=stepNext}}

document.addEventListener('keydown',e=>{{
  if(e.key==='ArrowLeft'||e.key==='PageDown'){{e.preventDefault();stepNext()}}
  else if(e.key==='ArrowRight'||e.key==='PageUp'){{e.preventDefault();stepPrev()}}
  else if(e.key===' '){{auto=!auto;e.preventDefault()}}
  else if(e.key==='ArrowUp'){{speed=Math.max(.2,speed-.2)}}
  else if(e.key==='ArrowDown'){{speed+=.2}}
  else if(e.key==='+'||e.key==='='){{fs+=4;show()}}
  else if(e.key==='-'){{fs=Math.max(20,fs-4);show()}}
  else if(e.key==='m'||e.key==='M'){{document.body.classList.toggle('mirror')}}
}});

const ACTS={{}};S.forEach(x=>{{ACTS[x.act]=(ACTS[x.act]||0)+1}});
function renderTimeline(){{
  const st=window.HS_STATE;
  if(st&&Date.now()>localLockUntil){{
    const incomingSeq=st.seq??st.step;
    if(incomingSeq!==lastSeq){{
      lastSeq=incomingSeq;
      const target=Math.max(0,Math.min(Math.max(0,S.length-1),(st.step||1)-1));
      if(target!==i){{i=target;show();return}}
    }}
  }}
  const tl=document.getElementById('tl');tl.innerHTML='';let tot=0;
  Object.keys(ACTS).forEach(a=>{{
    a=+a;const d=document.createElement('div');d.className='act';d.style.flex=ACTS[a];
    const tk=st&&st.takes?st.takes.filter(t=>t.act===a):[];const last=tk[tk.length-1];
    let info='ضبط نشده';
    if(last){{d.classList.add('done');const dur=last.stop-last.start;tot+=dur;info='برداشت '+fa(tk.length)+' · '+mmss(dur)}}
    if(st&&st.recording&&st.rec_act===a){{d.classList.remove('done');d.classList.add('rec');info='در حال ضبط · '+mmss(Date.now()/1000-st.rec_start)}}
    if(S[i]&&S[i].act===a)d.classList.add('here');
    d.innerHTML='<b>پرده '+fa(a)+'</b>'+info;
    tl.appendChild(d);
  }});
  document.getElementById('tot').textContent='مجموع ضبط‌شده: '+mmss(tot);
  const rd=document.getElementById('recdot');
  const btnRec=document.getElementById('btnRec');
  if(st&&st.recording){{
    rd.style.display='inline';
    document.getElementById('rt').textContent=mmss(Date.now()/1000-st.rec_start);
    btnRec.classList.add('rec-on');
  }}else{{
    rd.style.display='none';
    btnRec.classList.remove('rec-on');
  }}
}}
function tick(){{if(auto){{y-=speed;document.getElementById('txt').style.transform='translateY('+y+'px)'}}requestAnimationFrame(tick)}}
function poll(){{
  const sc=document.createElement('script');
  sc.src='state.js?t='+Date.now();
  sc.onload=sc.onerror=()=>{{sc.remove();renderTimeline()}};
  document.body.appendChild(sc);
}}
show();tick();connectWs();setInterval(poll,POLL_MS);poll();
</script>
</body>
</html>
"""


def generate_installer_script(
    steps: list[dict[str, Any]],
    *,
    os_target: str = "linux",
    ws_url: str = "ws://127.0.0.1:4455",
    ws_password: str = "",
    auto_studio_preview_sync: bool = True,
) -> tuple[str, str]:
    """Generate OS-specific installer script (filename, content)."""
    if os_target not in VALID_OS:
        raise ValueError(f"Unsupported OS target: {os_target}")

    if os_target == "windows":
        bat = """@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
REM Hark Studio v8 — اسکریپت بکاپ و نصب در ویندوز

set "SRC_DIR=%~dp0"
set "DST_DIR=%CD%"
set "BACKUP_DIR=%DST_DIR%\\backup_v7_%DATE:~-4%%DATE:~4,2%%DATE:~7,2%"

if not exist "%DST_DIR%\\slides" (
  echo هشدار: پوشه slides در مسیر فعلی پیدا نشد: %DST_DIR%
)

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
for %%F in ("%DST_DIR%\\*.lua" "%DST_DIR%\\prompter.html" "%DST_DIR%\\prompter_dock.html") do (
  if exist "%%~F" (
    copy /Y "%%~F" "%BACKUP_DIR%\\" >nul
    echo بکاپ گرفته شد: %%~nxF
  )
)

if /I not "%SRC_DIR%" == "%DST_DIR%\\" (
  copy /Y "%SRC_DIR%hark_studio_v8.lua" "%DST_DIR%\\hark_studio_v8.lua" >nul
  copy /Y "%SRC_DIR%steps_data.lua" "%DST_DIR%\\steps_data.lua" >nul
  copy /Y "%SRC_DIR%prompter.html" "%DST_DIR%\\prompter.html" >nul
  if exist "%SRC_DIR%prompter_dock.html" (
    copy /Y "%SRC_DIR%prompter_dock.html" "%DST_DIR%\\prompter_dock.html" >nul
  )
  if exist "%SRC_DIR%prompter" (
    xcopy /E /I /Y "%SRC_DIR%prompter" "%DST_DIR%\\prompter" >nul
  )
)

echo.
echo نصب با موفقیت انجام شد:
echo   - %DST_DIR%\\hark_studio_v8.lua
echo   - %DST_DIR%\\steps_data.lua
echo   - %DST_DIR%\\prompter.html
echo.
echo مراحل بعدی در OBS:
echo   1) Tools ^> Scripts: فایل hark_studio_v8.lua را اضافه کنید.
echo   2) دوربین را انتخاب کرده و روی Build scenes بزنید.
echo   3) کلیدهای جهت و Studio Mode را بررسی کنید.
pause
"""
        return "replace_hark_v8.bat", bat

    lua_v8 = generate_lua_v8(
        steps,
        os_target=os_target,
        auto_studio_preview_sync=auto_studio_preview_sync,
    )
    steps_lua = generate_steps_data_lua(steps)
    prompter_html = generate_prompter_html(steps)
    prompter_dock_html = generate_prompter_dock_html(
        steps,
        ws_url=ws_url,
        ws_password=ws_password,
    )
    platform_note = "macOS (FreeType 2)" if os_target == "macos" else "Linux (FreeType 2)"

    sh = f"""#!/usr/bin/env bash
# Hark Studio v8 — اسکریپت بکاپ و جایگزینی خودکار فایل‌ها ({platform_note})
# این اسکریپت را داخل پوشه اصلی پروژه (کنار پوشه slides و fonts) اجرا کنید:
#   chmod +x replace_hark_v8.sh && ./replace_hark_v8.sh

set -euo pipefail

DIR="$(pwd)"
BACKUP_DIR="$DIR/backup_v7_$(date +%Y%m%d_%H%M%S)"

if [ ! -d "$DIR/slides" ]; then
  echo "هشدار: پوشه slides در مسیر فعلی ($DIR) پیدا نشد."
  echo "مطمئن شوید این اسکریپت را دقیقاً داخل پوشه پروژه اجرا می‌کنید."
fi

mkdir -p "$BACKUP_DIR"
for f in *.lua prompter.html prompter_dock.html; do
  if [ -f "$f" ]; then
    cp "$f" "$BACKUP_DIR/"
    echo "بکاپ گرفته شد: $f -> $BACKUP_DIR/$f"
  fi
done

cat <<'__HARK_LUA_V8_EOF__' > "$DIR/hark_studio_v8.lua"
{lua_v8.rstrip()}
__HARK_LUA_V8_EOF__

cat <<'__HARK_STEPS_DATA_EOF__' > "$DIR/steps_data.lua"
{steps_lua.rstrip()}
__HARK_STEPS_DATA_EOF__

cat <<'__HARK_PROMPTER_HTML_EOF__' > "$DIR/prompter.html"
{prompter_html.rstrip()}
__HARK_PROMPTER_HTML_EOF__

cat <<'__HARK_PROMPTER_DOCK_EOF__' > "$DIR/prompter_dock.html"
{prompter_dock_html.rstrip()}
__HARK_PROMPTER_DOCK_EOF__

echo ""
echo "جایگزینی با موفقیت انجام شد ({platform_note}):"
echo "  - $DIR/hark_studio_v8.lua"
echo "  - $DIR/steps_data.lua"
echo "  - $DIR/prompter.html (تله‌پرامپتر مستقل بدون نیاز به WebSocket)"
echo "  - $DIR/prompter_dock.html (داک اختیاری با WebSocket)"
echo ""
echo "مراحل بعدی در OBS:"
echo "  1) Tools > Scripts: اسکریپت قبلی را حذف (-) و hark_studio_v8.lua را اضافه (+) کنید."
echo "  2) دوربین را انتخاب کرده و روی Build scenes بزنید."
echo "  3) برای جابجایی با جهت چپ (← جلو) و راست (→ عقب)، روی دکمه «تنظیم کلیدهای جهت» کلیک کنید."
echo "  4) Studio Mode را روشن کنید تا 99 تله‌پرامپتر در Preview بماند و 00 استودیو ضبط شود."
"""
    return "replace_hark_v8.sh", sh


def render_prompter_card_html(
    steps: list[dict[str, Any]],
    index: int,
    *,
    font_uri: str | None = None,
) -> str:
    """Build a 1920x1080 RTL HTML card for crisp DOM/HarfBuzz PNG rendering."""
    step = steps[index]
    next_step = steps[index + 1] if index + 1 < len(steps) else None
    acts = sorted({int(s["act"]) for s in steps})

    slide_num = int(step.get("slide") or 0)
    slide_label = f" · اسلاید {fa_digits(slide_num)}" if slide_num > 0 else ""
    time_label = f" · {fa_digits(step['time'])}" if step.get("time") else ""
    lay = step.get("lay") or LAY_FA.get(str(step.get("layout", "")), str(step.get("layout", "")))
    header_text = (
        f"پرده {fa_digits(step['act'])} · مرحله {fa_digits(step['n'])} از {fa_digits(len(steps))}"
        f" · {lay}{slide_label}{time_label}"
    )

    if next_step is not None:
        nx_slide = int(next_step.get("slide") or 0)
        nx_lay = next_step.get("lay") or LAY_FA.get(str(next_step.get("layout", "")), "")
        nx_slide_lbl = f" · اسلاید {fa_digits(nx_slide)}" if nx_slide > 0 else ""
        act_end = " — پایان پرده (ضبط را قطع کن)" if next_step["act"] != step["act"] else ""
        next_label = f"بعدی: {nx_lay}{nx_slide_lbl}{act_end}"
    else:
        next_label = "پایان اسکریپت"

    act_blocks = []
    for act_num in acts:
        cls = "act-box"
        if act_num == step["act"]:
            cls += " here"
        elif act_num < step["act"]:
            cls += " past"
        act_blocks.append(f'<div class="{cls}">پرده {fa_digits(act_num)}</div>')

    font_face = (
        f'@font-face{{font-family:"Vazirmatn";src:url("{font_uri}");font-weight:400 800;}}'
        if font_uri
        else ""
    )
    body_text = html_lib.escape(str(step.get("text") or ""))

    return f"""<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<style>
{font_face}
*{{box-sizing:border-box;margin:0;padding:0}}
html,body{{width:1920px;height:1080px;overflow:hidden;background:#0B0D11;color:#F8FAFC;font-family:"Vazirmatn","Vazir","Tahoma",sans-serif}}
.stage{{width:1920px;height:1080px;display:flex;flex-direction:column;background:#0B0D11}}
.header{{height:108px;background:#13161D;border-bottom:2px solid rgba(255,255,255,.12);padding:0 72px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}}
.header-main{{font-size:36px;font-weight:700;color:#F59E0B}}
.header-sub{{font-size:28px;font-weight:500;color:#94A3B8}}
.guide{{margin:42px 88px 0;height:3px;background:rgba(245,158,11,.45);flex-shrink:0}}
.body-wrap{{flex:1;padding:34px 90px 28px;display:flex;align-items:flex-start;overflow:hidden}}
.body-text{{font-size:58px;font-weight:700;line-height:1.68;color:#F8FAFC;text-align:right;width:100%;word-break:break-word}}
.footer{{height:156px;background:#13161D;border-top:2px solid rgba(255,255,255,.1);padding:18px 72px 22px;display:flex;flex-direction:column;justify-content:space-between;flex-shrink:0}}
.next-cue{{font-size:30px;font-weight:600;color:#CBD5E1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
.acts-row{{display:flex;gap:12px;height:46px}}
.act-box{{flex:1;border-radius:8px;background:#1E2430;color:#E2E8F0;font-size:24px;font-weight:700;display:flex;align-items:center;justify-content:center}}
.act-box.past{{background:#14532D;color:#ECFDF5}}
.act-box.here{{background:#F59E0B;color:#0B0D11}}
</style>
</head>
<body>
<div class="stage">
  <header class="header">
    <div class="header-main">{html_lib.escape(header_text)}</div>
    <div class="header-sub">تله‌پرامپتر (ضبط نمی‌شود)</div>
  </header>
  <div class="guide"></div>
  <main class="body-wrap">
    <div class="body-text" id="txt">{body_text}</div>
  </main>
  <footer class="footer">
    <div class="next-cue">{html_lib.escape(next_label)}</div>
    <div class="acts-row">{"".join(act_blocks)}</div>
  </footer>
</div>
<script>
const wrap=document.querySelector('.body-wrap');
const txt=document.getElementById('txt');
let fs=58;
while(fs>28&&txt.scrollHeight>wrap.clientHeight-24){{fs-=3;txt.style.fontSize=fs+'px';}}
</script>
</body>
</html>
"""


def _find_local_font_uri() -> str | None:
    fonts_dir = PKG / "fonts"
    for cand in ("Vazirmatn-Bold.ttf", "Vazirmatn-Bold.woff2", "Vazirmatn.woff2", "Vazirmatn.ttf"):
        p = fonts_dir / cand
        if p.is_file():
            return p.as_uri()
    return None


def _playwright_available() -> bool:
    try:
        import playwright.sync_api  # noqa: F401
        return True
    except ImportError:
        return False


def export_prompter_pngs(
    steps: list[dict[str, Any]],
    out_dir: str | Path,
) -> list[Path]:
    """Render 1920x1080 RTL PNG prompter cards into out_dir/prompter/p-NN.png via Playwright."""
    if not steps:
        return []
    try:
        from playwright.sync_api import sync_playwright
    except ImportError as exc:
        raise RuntimeError(
            "برای ساخت تصاویر PNG پرامپتر، پکیج playwright لازم است (pip install playwright && playwright install chromium)."
        ) from exc

    prompter_dir = Path(out_dir) / "prompter"
    prompter_dir.mkdir(parents=True, exist_ok=True)
    font_uri = _find_local_font_uri()
    written: list[Path] = []

    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        try:
            page = browser.new_page(viewport={"width": 1920, "height": 1080})
            for idx in range(len(steps)):
                html_doc = render_prompter_card_html(steps, idx, font_uri=font_uri)
                page.set_content(html_doc, wait_until="load")
                target = prompter_dir / f"p-{idx + 1:02d}.png"
                page.screenshot(path=str(target), type="png")
                written.append(target)
        finally:
            browser.close()
    return written


def export_obs_package(
    project: Any,
    out_dir: str | Path | None = None,
    *,
    os_target: str = "linux",
    ws_url: str = "ws://127.0.0.1:4455",
    ws_password: str = "",
    auto_studio_preview_sync: bool = True,
    render_png: str | bool = "auto",
) -> dict[str, Any]:
    """Write a complete offline OBS package folder for the given Project."""
    if os_target not in VALID_OS:
        raise ValueError(f"Unsupported OS target '{os_target}'. Choose from: {', '.join(VALID_OS)}")

    dest = Path(out_dir).expanduser().resolve() if out_dir else (Path(project.out) / "obs").resolve()
    dest.mkdir(parents=True, exist_ok=True)

    steps = steps_for_obs(project)
    warnings = list(getattr(project, "warnings", []) or [])

    steps_lua = generate_steps_data_lua(steps)
    (dest / "steps_data.lua").write_text(steps_lua, encoding="utf-8")

    steps_json = [
        {
            "n": s["n"],
            "act": s["act"],
            "layout": s["layout"],
            "lay": s["lay"],
            "slide": s["slide"],
            "time": s["time"],
            "text": s["text"],
            **({"motion": s["motion"]} if s.get("motion") else {}),
            **({"zoom": s["zoom"]} if s.get("zoom") else {}),
        }
        for s in steps
    ]
    (dest / "steps.json").write_text(json.dumps(steps_json, ensure_ascii=False, indent=1), encoding="utf-8")
    (dest / "prompter.txt").write_text(generate_prompter_txt(steps), encoding="utf-8")

    lua_v8 = generate_lua_v8(
        steps,
        os_target=os_target,
        auto_studio_preview_sync=auto_studio_preview_sync,
    )
    (dest / "hark_studio_v8.lua").write_text(lua_v8, encoding="utf-8")

    # Plain standalone RTL overview teleprompter (prompter_template.html -> prompter.html, no WebSocket)
    prompter_html = generate_prompter_html(steps)
    (dest / "prompter.html").write_text(prompter_html, encoding="utf-8")

    # Optional WebSocket-enabled OBS Custom Browser Dock (degrades gracefully if WS unavailable)
    prompter_dock_html = generate_prompter_dock_html(
        steps,
        ws_url=ws_url,
        ws_password=ws_password,
    )
    (dest / "prompter_dock.html").write_text(prompter_dock_html, encoding="utf-8")

    installer_name, installer_body = generate_installer_script(
        steps,
        os_target=os_target,
        ws_url=ws_url,
        ws_password=ws_password,
        auto_studio_preview_sync=auto_studio_preview_sync,
    )
    installer_path = dest / installer_name
    installer_path.write_text(installer_body, encoding="utf-8")
    if installer_name.endswith(".sh"):
        try:
            os.chmod(installer_path, 0o755)
        except OSError:
            pass

    files = [
        "steps_data.lua",
        "steps.json",
        "prompter.txt",
        "hark_studio_v8.lua",
        "prompter.html",
        "prompter_dock.html",
        installer_name,
    ]

    prompter_pngs: list[str] = []
    should_render_png = bool(render_png) if isinstance(render_png, bool) else _playwright_available()
    if should_render_png and steps:
        try:
            rendered = export_prompter_pngs(steps, dest)
            prompter_pngs = [str(p.relative_to(dest)) for p in rendered]
        except RuntimeError as exc:
            if render_png is True:
                raise
            warnings.append(str(exc))
    elif render_png == "auto" and steps and not _playwright_available():
        warnings.append("Playwright نصب نیست؛ تصاویر PNG پرامپتر (prompter/p-NN.png) ساخته نشد.")

    return {
        "ok": True,
        "out_dir": str(dest),
        "os": os_target,
        "steps_count": len(steps),
        "files": files,
        "prompter_pngs": prompter_pngs,
        "warnings": warnings,
    }
