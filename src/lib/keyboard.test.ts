import test from "node:test";
import assert from "node:assert/strict";
import { ANCHOR_GAP_PX, getAnchorScrollOffset, getAnchorTargetY, getNextRovingIndex } from "./keyboard";

test("getNextRovingIndex wraps cleanly for vertical and horizontal orientations", () => {
  assert.equal(getNextRovingIndex(0, 5, "ArrowDown", "vertical"), 1);
  assert.equal(getNextRovingIndex(4, 5, "ArrowDown", "vertical"), 0);
  assert.equal(getNextRovingIndex(0, 5, "ArrowUp", "vertical"), 4);
  assert.equal(getNextRovingIndex(2, 5, "Home", "vertical"), 0);
  assert.equal(getNextRovingIndex(2, 5, "End", "vertical"), 4);

  assert.equal(getNextRovingIndex(1, 4, "ArrowRight", "horizontal"), 2);
  assert.equal(getNextRovingIndex(0, 4, "ArrowLeft", "horizontal"), 3);
  assert.equal(getNextRovingIndex(1, 4, "ArrowDown", "horizontal"), null);
  assert.equal(getNextRovingIndex(0, 0, "ArrowDown", "vertical"), null);
});

test("getAnchorScrollOffset returns 0 for top anchor and negative nav height for sections", () => {
  assert.equal(getAnchorScrollOffset("#top", 64), 0);
  assert.equal(getAnchorScrollOffset("#", 64), 0);
  assert.equal(getAnchorScrollOffset("#projects", 64), -64);
  assert.equal(getAnchorScrollOffset("#contact", 72), -72);
});

test("getAnchorTargetY lands sections header height + 16px below the viewport top", () => {
  assert.equal(ANCHOR_GAP_PX, 16);
  // section 1000px below the viewport top, page already scrolled 500px, 64px header
  assert.equal(getAnchorTargetY("#projects", 1000, 500, 64), 1000 + 500 - 64 - 16);
  // section above the viewport (negative rect top) scrolls back up to the same landing spot
  assert.equal(getAnchorTargetY("#about", -300, 2000, 64), 2000 - 300 - 80);
  // top anchor always goes to 0; never negative; clamped to the max scroll
  assert.equal(getAnchorTargetY("#top", 900, 900, 64), 0);
  assert.equal(getAnchorTargetY("#projects", 20, 0, 64), 0);
  assert.equal(getAnchorTargetY("#contact", 5000, 0, 64, 3000), 3000);
});
