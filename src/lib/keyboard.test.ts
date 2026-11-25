import test from "node:test";
import assert from "node:assert/strict";
import { getAnchorScrollOffset, getNextRovingIndex } from "./keyboard";

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
