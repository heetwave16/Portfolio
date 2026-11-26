import test from "node:test";
import assert from "node:assert/strict";
import { splitTextWithWhitespace } from "./typography";

test("splitTextWithWhitespace keeps real spaces between heading words", () => {
  const heading = "1st-year CS (AI/ML), shipping in public.";
  const parts = splitTextWithWhitespace(heading);

  assert.deepEqual(parts, [
    "1st-year",
    " ",
    "CS",
    " ",
    "(AI/ML),",
    " ",
    "shipping",
    " ",
    "in",
    " ",
    "public.",
  ]);
  assert.equal(parts.join(""), heading);
});
