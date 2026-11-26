import test from "node:test";
import assert from "node:assert/strict";
import {
  computeHeatmapWaveDelayMs,
  computeScrollProgress,
  computeScrollProgressPercent,
  createBezierEase,
  getMotionTokens,
  parseCssDurationMs,
  parseMotionBisectFlags,
} from "./motion";

test("parseCssDurationMs parses ms, s, and invalid fallback cleanly", () => {
  assert.equal(parseCssDurationMs("200ms", 100), 200);
  assert.equal(parseCssDurationMs("0.75s", 100), 750);
  assert.equal(parseCssDurationMs("", 400), 400);
  assert.equal(parseCssDurationMs("invalid", 400), 400);
});

test("getMotionTokens uses the E1 interaction and entrance limits", () => {
  const tokens = getMotionTokens();
  assert.equal(tokens.hoverMs, 160);
  assert.equal(tokens.pressMs, 120);
  assert.equal(tokens.enterMs, 280);
  assert.equal(tokens.scrollMs, 900);
  assert.equal(tokens.easeUi, "cubic-bezier(0.16, 1, 0.3, 1)");
});

test("computeHeatmapWaveDelayMs increases diagonally across weeks and days and stays bounded", () => {
  const topLeft = computeHeatmapWaveDelayMs(0, 0, 53, 420);
  const mid = computeHeatmapWaveDelayMs(26, 3, 53, 420);
  const bottomRight = computeHeatmapWaveDelayMs(52, 6, 53, 420);
  assert.equal(topLeft, 0);
  assert.ok(mid > topLeft);
  assert.ok(bottomRight >= mid);
  assert.ok(bottomRight <= 420);
});

test("computeScrollProgress clamps between 0 and 1 and formats integer percentages", () => {
  assert.equal(computeScrollProgress(-50, 2000, 1000), 0);
  assert.equal(computeScrollProgress(0, 2000, 1000), 0);
  assert.equal(computeScrollProgress(500, 2000, 1000), 0.5);
  assert.equal(computeScrollProgress(1500, 2000, 1000), 1);
  assert.equal(computeScrollProgress(100, 800, 1000), 0);

  assert.equal(computeScrollProgressPercent(-0.2), 0);
  assert.equal(computeScrollProgressPercent(0), 0);
  assert.equal(computeScrollProgressPercent(0.456), 46);
  assert.equal(computeScrollProgressPercent(1), 100);
  assert.equal(computeScrollProgressPercent(1.4), 100);
  assert.equal(computeScrollProgressPercent(Number.NaN), 0);
});

test("createBezierEase maps endpoints and monotonic progression for ease-out-expo", () => {
  const ease = createBezierEase("cubic-bezier(0.16, 1, 0.3, 1)");
  assert.equal(ease(0), 0);
  assert.equal(ease(1), 1);
  assert.ok(ease(0.25) > 0.5);
  assert.ok(ease(0.5) > ease(0.25));
});

test("parseMotionBisectFlags disables all groups on ?motion=off and supports per-group bisection", () => {
  const allOn = parseMotionBisectFlags("");
  assert.equal(allOn.lenis, false);
  assert.equal(allOn.hoverThumb, false);

  const allOff = parseMotionBisectFlags("?motion=off");
  assert.equal(allOff.lenis, true);
  assert.equal(allOff.scrollProgress, true);
  assert.equal(allOff.wipe, true);
  assert.equal(allOff.heatmap, true);
  assert.equal(allOff.reveals, true);
  assert.equal(allOff.cursor, true);
  assert.equal(allOff.hoverThumb, true);

  const singleOnly = parseMotionBisectFlags("?motion=off&lenis=on");
  assert.equal(singleOnly.lenis, false);
  assert.equal(singleOnly.wipe, true);

  const listOff = parseMotionBisectFlags("?motion=off:wipe,cursor");
  assert.equal(listOff.wipe, true);
  assert.equal(listOff.cursor, true);
  assert.equal(listOff.lenis, false);

  const directParam = parseMotionBisectFlags("?heatmap=off&hoverThumb=off");
  assert.equal(directParam.heatmap, true);
  assert.equal(directParam.hoverThumb, true);
  assert.equal(directParam.reveals, false);
});

