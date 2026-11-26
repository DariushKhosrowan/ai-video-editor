/**
 * Pure curve math & chart-series utilities shared between:
 *  - Node unit tests
 *  - Editor Visual Curve Studio (Chart curves + Cubic-Bezier Motion curves)
 *  - Stage runtime (GSAP easing + SVG line/spline rendering)
 */

export const EASING_PRESETS = {
  "vox-editorial": {
    label: "تحریریه حرفه‌ای (Vox Editorial)",
    points: [0.19, 1.0, 0.22, 1.0],
    durationScale: 1.0,
    staggerScale: 0.9,
  },
  "apple-fluid": {
    label: "روان استودیویی (Apple Fluid)",
    points: [0.25, 1.0, 0.35, 1.0],
    durationScale: 1.05,
    staggerScale: 0.92,
  },
  "silk-float": {
    label: "لغزش ابریشمی (Silk Glide)",
    points: [0.33, 1.0, 0.68, 1.0],
    durationScale: 1.15,
    staggerScale: 1.0,
  },
  "youtube-snappy": {
    label: "پرش وایرال یوتیوب (YouTube Snappy)",
    points: [0.16, 1.0, 0.3, 1.0],
    durationScale: 0.9,
    staggerScale: 0.85,
  },
  "editorial-glide": {
    label: "سرخوردن سردبیری (Editorial Glide)",
    points: [0.22, 1.0, 0.36, 1.0],
    durationScale: 1.0,
    staggerScale: 1.0,
  },
  "spring-pop": {
    label: "فنری پرانرژی (Spring Pop)",
    points: [0.34, 1.56, 0.64, 1.0],
    durationScale: 1.05,
    staggerScale: 0.9,
  },
  "punchy-overshoot": {
    label: "کوبش با برگشت (Punchy Overshoot)",
    points: [0.18, 1.38, 0.32, 1.0],
    durationScale: 0.85,
    staggerScale: 0.8,
  },
  "cinema-slow": {
    label: "سینمایی آرام (Cinema Slow)",
    points: [0.4, 0.0, 0.2, 1.0],
    durationScale: 1.25,
    staggerScale: 1.15,
  },
  linear: {
    label: "خطی یکنواخت (Linear)",
    points: [0.0, 0.0, 1.0, 1.0],
    durationScale: 1.0,
    staggerScale: 1.0,
  },
};

export function clampBezierPoints(pts) {
  const arr = Array.isArray(pts) && pts.length === 4 ? pts : [0.16, 1, 0.3, 1];
  const clamp = (v, lo, hi) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return lo;
    return Math.max(lo, Math.min(hi, n));
  };
  return [
    +clamp(arr[0], 0, 1).toFixed(3),
    +clamp(arr[1], -0.6, 1.8).toFixed(3),
    +clamp(arr[2], 0, 1).toFixed(3),
    +clamp(arr[3], -0.6, 1.8).toFixed(3),
  ];
}

export function solveCubicBezier(x1, y1, x2, y2) {
  const [cx1, cy1, cx2, cy2] = clampBezierPoints([x1, y1, x2, y2]);
  const bx = (t) => 3 * cx1 * t * (1 - t) ** 2 + 3 * cx2 * t * t * (1 - t) + t ** 3;
  const by = (t) => 3 * cy1 * t * (1 - t) ** 2 + 3 * cy2 * t * t * (1 - t) + t ** 3;

  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0;
    let hi = 1;
    let t = x;
    for (let i = 0; i < 30; i += 1) {
      const v = bx(t);
      if (Math.abs(v - x) < 1e-5) break;
      if (v < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return by(t);
  };
}

export function sampleBezierCurve(points, samples = 48) {
  const fn = solveCubicBezier(...clampBezierPoints(points));
  const out = [];
  const count = Math.max(4, samples);
  for (let i = 0; i <= count; i += 1) {
    const x = i / count;
    out.push([x, fn(x)]);
  }
  return out;
}

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function toNumericValue(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  let s = String(v ?? "")
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)));
  s = s.replace(/٫/g, ".").replace(/[٬,]/g, "").replace(/[^0-9.\-]/g, "");
  const n = parseFloat(s);
  return Number.isNaN(n) ? 0 : n;
}

const DEFAULT_SERIES_COLORS = ["accent", "danger", "muted", "#4FC3F7", "#81C784"];

export function parseSeriesInput(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((s, i) => {
      const copy = { ...s };
      if (!copy.color) copy.color = DEFAULT_SERIES_COLORS[i % DEFAULT_SERIES_COLORS.length];
      if (Array.isArray(copy.points) && copy.points.length) {
        copy.points = copy.points
          .map((p) => [toNumericValue(p[0]), toNumericValue(p[1])])
          .sort((a, b) => a[0] - b[0]);
      } else if (Array.isArray(copy.values)) {
        copy.points = copy.values.map((v, j) => [j + 1, toNumericValue(v)]);
      } else {
        copy.points = [];
      }
      return copy;
    });
  }
  return String(raw)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => {
      const colonIdx = line.lastIndexOf(":");
      const name = colonIdx > 0 ? line.slice(0, colonIdx).trim() : `سری ${i + 1}`;
      const body = colonIdx > 0 ? line.slice(colonIdx + 1) : line;
      const tokens = body.split(/[,،\s]+/).filter(Boolean);
      const pts = [];
      tokens.forEach((tok, idx) => {
        if (tok.includes(";")) {
          const [px, py] = tok.split(";");
          pts.push([toNumericValue(px), toNumericValue(py)]);
        } else {
          pts.push([idx + 1, toNumericValue(tok)]);
        }
      });
      return {
        name,
        values: pts.map((p) => p[1]),
        points: pts,
        color: DEFAULT_SERIES_COLORS[i % DEFAULT_SERIES_COLORS.length],
      };
    });
}

export function monotoneInterpolate(xs, ys, samples = 20) {
  const n = xs.length;
  if (n === 0) return [];
  if (n < 3) return xs.map((x, i) => [x, ys[i]]);
  const d = [];
  for (let i = 0; i < n - 1; i += 1) {
    d.push((ys[i + 1] - ys[i]) / ((xs[i + 1] - xs[i]) || 1e-9));
  }
  const m = [d[0]];
  for (let i = 1; i < n - 1; i += 1) {
    m.push(d[i - 1] * d[i] > 0 ? (d[i - 1] + d[i]) / 2 : 0);
  }
  m.push(d[n - 2]);
  for (let i = 0; i < n - 1; i += 1) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const sq = a * a + b * b;
    if (sq > 9) {
      const tau = 3 / Math.sqrt(sq);
      m[i] = tau * a * d[i];
      m[i + 1] = tau * b * d[i];
    }
  }
  const out = [];
  for (let i = 0; i < n - 1; i += 1) {
    const h = xs[i + 1] - xs[i];
    for (let k = 0; k < samples; k += 1) {
      const t = k / samples;
      const h00 = 2 * t ** 3 - 3 * t ** 2 + 1;
      const h10 = t ** 3 - 2 * t ** 2 + t;
      const h01 = -2 * t ** 3 + 3 * t ** 2;
      const h11 = t ** 3 - t ** 2;
      out.push([xs[i] + t * h, h00 * ys[i] + h10 * h * m[i] + h01 * ys[i + 1] + h11 * h * m[i + 1]]);
    }
  }
  out.push([xs[n - 1], ys[n - 1]]);
  return out;
}

export function catmullRomInterpolate(pts, tension = 0.5, samples = 18) {
  const n = pts.length;
  if (n < 2) return pts.slice();
  if (n === 2) return pts.slice();
  const tClamp = Math.max(0, Math.min(1, Number(tension) || 0.5));
  const out = [];
  for (let i = 0; i < n - 1; i += 1) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(n - 1, i + 2)];
    for (let k = 0; k < samples; k += 1) {
      const s = k / samples;
      const s2 = s * s;
      const s3 = s2 * s;
      const m1x = tClamp * (p2[0] - p0[0]);
      const m1y = tClamp * (p2[1] - p0[1]);
      const m2x = tClamp * (p3[0] - p1[0]);
      const m2y = tClamp * (p3[1] - p1[1]);
      const x = (2 * s3 - 3 * s2 + 1) * p1[0] + (s3 - 2 * s2 + s) * m1x + (-2 * s3 + 3 * s2) * p2[0] + (s3 - s2) * m2x;
      const y = (2 * s3 - 3 * s2 + 1) * p1[1] + (s3 - 2 * s2 + s) * m1y + (-2 * s3 + 3 * s2) * p2[1] + (s3 - s2) * m2y;
      out.push([x, y]);
    }
  }
  out.push([...pts[n - 1]]);
  return out;
}

export function stepInterpolate(pts) {
  if (pts.length < 2) return pts.slice();
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i += 1) {
    out.push([pts[i][0], pts[i - 1][1]]);
    out.push(pts[i]);
  }
  return out;
}

export function buildChartCurveSamples(pxPts, mode = "monotone", tension = 0.5) {
  if (!Array.isArray(pxPts) || pxPts.length === 0) return [];
  if (pxPts.length === 1) return pxPts.slice();
  if (mode === "linear") return pxPts.slice();
  if (mode === "step") return stepInterpolate(pxPts);
  if (mode === "smooth") return catmullRomInterpolate(pxPts, tension, 20);
  return monotoneInterpolate(
    pxPts.map((p) => p[0]),
    pxPts.map((p) => p[1]),
    20
  );
}

export function samplesToSvgPath(samples) {
  if (!samples || !samples.length) return "";
  return samples
    .map((p, idx) => `${idx === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
    .join(" ");
}
