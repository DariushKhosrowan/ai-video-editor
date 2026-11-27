import test from "node:test";
import assert from "node:assert/strict";
import {
  EASING_PRESETS,
  clampBezierPoints,
  solveCubicBezier,
  sampleBezierCurve,
  parseSeriesInput,
  buildChartCurveSamples,
  samplesToSvgPath,
} from "./curveMath.js";

test("clampBezierPoints keeps x in [0,1] and allows elastic overshoot y in [-0.6,1.8]", () => {
  assert.deepEqual(clampBezierPoints([-0.4, 2.5, 1.5, -1.2]), [0, 1.8, 1, -0.6]);
  assert.deepEqual(clampBezierPoints(EASING_PRESETS["spring-pop"].points), [0.34, 1.56, 0.64, 1]);
  assert.deepEqual(clampBezierPoints(EASING_PRESETS["vox-editorial"].points), [0.19, 1, 0.22, 1]);
  assert.deepEqual(clampBezierPoints(EASING_PRESETS["apple-fluid"].points), [0.25, 1, 0.35, 1]);
  assert.deepEqual(clampBezierPoints(EASING_PRESETS["silk-float"].points), [0.33, 1, 0.68, 1]);
});

test("solveCubicBezier evaluates endpoints and spring overshoot accurately", () => {
  const linear = solveCubicBezier(0, 0, 1, 1);
  assert.equal(linear(0), 0);
  assert.equal(linear(1), 1);
  assert.ok(Math.abs(linear(0.5) - 0.5) < 0.01);

  const spring = solveCubicBezier(0.34, 1.56, 0.64, 1);
  const samples = sampleBezierCurve([0.34, 1.56, 0.64, 1], 24);
  assert.equal(samples.length, 25);
  assert.ok(samples.some(([, y]) => y > 1.01), "Spring curve should overshoot 1.0");
  assert.ok(spring(0.2) > 0);
});

test("parseSeriesInput handles Persian text lines, x;y pairs, and object arrays", () => {
  const parsed = parseSeriesInput("با تنبیه: ۱۳٫۵, ۱۵٫۵, ۱۷٫۲\nبدون تنبیه: 10, 8.5, 3.2");
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].name, "با تنبیه");
  assert.deepEqual(parsed[0].points, [
    [1, 13.5],
    [2, 15.5],
    [3, 17.2],
  ]);
  assert.equal(parsed[1].name, "بدون تنبیه");
  assert.deepEqual(parsed[1].points, [
    [1, 10],
    [2, 8.5],
    [3, 3.2],
  ]);

  const xyParsed = parseSeriesInput("رشد: 2;10, 5;40, 9;95");
  assert.deepEqual(xyParsed[0].points, [
    [2, 10],
    [5, 40],
    [9, 95],
  ]);
});

test("buildChartCurveSamples generates SVG paths across monotone, linear, smooth, and step modes", () => {
  const pts = [
    [0, 100],
    [100, 40],
    [200, 80],
    [300, 10],
  ];
  const mono = buildChartCurveSamples(pts, "monotone");
  const lin = buildChartCurveSamples(pts, "linear");
  const step = buildChartCurveSamples(pts, "step");
  const smooth = buildChartCurveSamples(pts, "smooth", 0.6);

  assert.equal(lin.length, 4);
  assert.equal(step.length, 7);
  assert.ok(mono.length > 20);
  assert.ok(smooth.length > 20);
  const d = samplesToSvgPath(mono);
  assert.ok(d.startsWith("M0.0,100.0"));
  assert.ok(d.endsWith("L300.0,10.0"));
});
