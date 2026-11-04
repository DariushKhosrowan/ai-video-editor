"""Non-destructive project export.

Given a model.Project, produce industry-standard interchange files that open
in professional NLEs (DaVinci Resolve, Adobe Premiere) without ever mutating
the original media:

  - OTIO file (.otio) -> the canonical OpenTimelineIO representation
    (when the OTIO JSON adapter is available).
  - FCPXML (XML) -> Final Cut Pro / Resolve import (generated directly).
  - CMX3600 EDL (ascii) -> classic Avid / Resolve / Premiere edit decision
    list (generated directly, no plugin dependency).

Because we only write *references* to the source media (in/out points + track
placement), the export is fully non-destructive.
"""
from __future__ import annotations

import os
import xml.sax.saxutils as sax
from typing import Optional

from .model import Project, Clip, Track


def _clip_media(clip: Clip) -> tuple:
    """Return (absolute file:// URL, basename) for a clip source."""
    apath = os.path.abspath(clip.src)
    return "file://" + apath, os.path.basename(apath)


# --------------------------------------------------------------------------
# OTIO (via the JSON adapter if present)
# --------------------------------------------------------------------------
def export_otio(project: Project, path: Optional[str] = None) -> str:
    """Write the project to an OTIO file. Returns the output path."""
    import opentimelineio as otio
    from opentimelineio import opentime

    fps = project.fps
    tl = otio.schema.Timeline(name=project.name)
    stack = tl.tracks
    for tr in project.tracks:
        tr_obj = otio.schema.Track(
            kind=(otio.schema.TrackKind.Audio if tr.kind == "audio"
                  else otio.schema.TrackKind.Video))
        for clip in tr.clips:
            mr = otio.schema.ExternalReference(
                target_url="file://" + os.path.abspath(clip.src),
                available_range=otio.opentime.TimeRange(
                    otio.opentime.RationalTime(clip.in_, fps),
                    otio.opentime.RationalTime(clip.duration, fps),
                ),
            )
            c = otio.schema.Clip(
                name=clip.name or os.path.basename(clip.src),
                media_reference=mr,
            )
            c.source_range = otio.opentime.TimeRange(
                otio.opentime.RationalTime(0.0, fps),
                otio.opentime.RationalTime(clip.duration, fps),
            )
            if clip.speed != 1.0:
                c.effects.append(otio.schema.TimeEffect(
                    name="speed", effect_name="TIMEWARP"))
            if clip.transition_from in ("crossfade", "fade") \
               and clip.transition_dur > 0:
                trans = otio.schema.Transition(
                    name=clip.transition_from,
                    transition_type=otio.schema.TransitionTypes.SMPTE_Dissolve,
                    in_offset=otio.opentime.RationalTime(
                        clip.transition_dur, fps),
                    out_offset=otio.opentime.RationalTime(
                        clip.transition_dur, fps),
                )
                tr_obj.append(trans)
            tr_obj.append(c)
        stack.append(tr_obj)

    out = path or (project.name + ".otio")
    try:
        otio.adapters.write_to_file(tl, out)
    except Exception:
        # Fallback: serialise to JSON ourselves via the dict form.
        import json
        with open(out, "w") as f:
            json.dump(tl.to_json(), f, indent=2)
    return out


# --------------------------------------------------------------------------
# FCPXML (direct generation)
# --------------------------------------------------------------------------
def _fcp_timecode(seconds: float, fps: float) -> str:
    """Format seconds as HH:MM:SS:FF at `fps`."""
    frames = int(round(seconds * fps))
    h = frames // (3600 * int(fps))
    rem = frames % (3600 * int(fps))
    m = rem // (60 * int(fps))
    rem = rem % (60 * int(fps))
    s = rem // int(fps)
    ff = rem % int(fps)
    return f"{h:02d}:{m:02d}:{s:02d}:{ff:02d}"


def _fcp_duration(seconds: float, fps: float) -> str:
    frames = int(round(seconds * fps))
    return f"{frames}/{int(fps)}s"


def export_fcpxml(project: Project, path: Optional[str] = None) -> str:
    """Write an FCPXML document (imports into Resolve / Final Cut)."""
    fps = project.fps
    out = path or (project.name + ".fcpxml")

    # Build the <resources> block: one asset per unique source media.
    seen = []
    asset_ids = {}
    for tr in project.tracks:
        for c in tr.clips:
            key = os.path.abspath(c.src)
            if key not in asset_ids:
                asset_id = f"r{len(seen)+1}"
                asset_ids[key] = asset_id
                seen.append((asset_id, c))

    res = []
    for asset_id, c in seen:
        url, base = _clip_media(c)
        res.append(
            f'<asset id="{asset_id}" name="{sax.escape(base)}" '
            f'start="{_fcp_timecode(0, fps)}" duration="{_fcp_duration(c.duration, fps)}" '
            f'format="r1">\n'
            f'  <media-rep kind="original-media" src="{sax.escape(url)}"/>\n'
            f'</asset>')

    # format resource (we assume generic 1080x1920@30 or project dims).
    fmt = (f'<format id="r1" name="FFVideoFormat{project.width}x{project.height}'
           f'{int(fps)}p" frameDuration="{_fcp_duration(1, fps)}" '
           f'width="{project.width}" height="{project.height}"/>')

    # Build a spine: one <spine> per video/audio track.
    spine = []
    for tr in project.tracks:
        clips_xml = []
        for c in tr.clips:
            asset_id = asset_ids[os.path.abspath(c.src)]
            start_ts = _fcp_timecode(c.start, fps)
            dur = _fcp_duration(c.duration, fps)
            # <clip> referencing the asset with a <time> for its position
            clips_xml.append(
                f'<clip name="{sax.escape(c.name or os.path.basename(c.src))}" '
                f'start="{start_ts}" duration="{dur}" '
                f'format="r1">\n'
                f'  <asset-clip ref="{asset_id}" offset="0s" '
                f'duration="{dur}" format="r1"/>\n'
                f'</clip>')
        kind = "video" if tr.kind == "video" else "audio"
        spine.append(
            f'<track title="Track {kind}" kind="{kind}">\n'
            + "\n".join(clips_xml) + "\n</track>")

    doc = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.9">
  <resources>
    {fmt}
    {chr(10).join(res)}
  </resources>
  <library>
    <event name="ai-video-editor">
      <project name="{sax.escape(project.name)}">
        <sequence duration="{_fcp_duration(project.duration(), fps)}"
                  format="r1" tcStart="0s">
          <spine>
            {chr(10).join(spine)}
          </spine>
        </sequence>
      </project>
    </event>
  </library>
</fcpxml>
"""
    with open(out, "w") as f:
        f.write(doc)
    return out


# --------------------------------------------------------------------------
# CMX3600 EDL (direct generation)
# --------------------------------------------------------------------------
def _edl_timecode(seconds: float, fps: float = 30.0) -> str:
    frames = int(round(seconds * fps))
    h = frames // (3600 * int(fps))
    rem = frames % (3600 * int(fps))
    m = rem // (60 * int(fps))
    rem = rem % (60 * int(fps))
    s = rem // int(fps)
    ff = rem % int(fps)
    return f"{h:02d}:{m:02d}:{s:02d}:{ff:02d}"


def export_edl(project: Project, path: Optional[str] = None,
               cmx_rate: float = 30.0) -> str:
    """Write a CMX3600 EDL (the classic list for Premiere/Resolve/Avid)."""
    out = path or (project.name + ".edl")
    lines = ["TITLE: " + project.name, "FCM: NON-DROP FRAME", ""]
    ev = 1
    # Use the first video track (EDL is essentially single-video-track oriented).
    for tr in project.tracks:
        if tr.kind != "video":
            continue
        for c in tr.clips:
            url, base = _clip_media(c)
            src_in = _edl_timecode(c.in_, cmx_rate)
            src_out = _edl_timecode(c.out, cmx_rate)
            rec_in = _edl_timecode(c.start, cmx_rate)
            rec_out = _edl_timecode(c.end, cmx_rate)
            lines.append(f"{ev:03d}  000   V     C        {src_in} {src_out} "
                         f"{rec_in} {rec_out}")
            lines.append(f"* FROM CLIP NAME: {base}")
            lines.append("")
            ev += 1
    with open(out, "w") as f:
        f.write("\n".join(lines))
    return out


def export_all(project: Project, out_dir: str) -> dict:
    """Export OTIO, FCPXML and EDL into `out_dir`. Returns paths by format."""
    os.makedirs(out_dir, exist_ok=True)
    base = os.path.join(out_dir, project.name)
    paths = {
        "otio": export_otio(project, base + ".otio"),
        "fcpxml": export_fcpxml(project, base + ".fcpxml"),
        "edl": export_edl(project, base + ".edl"),
    }
    return paths
