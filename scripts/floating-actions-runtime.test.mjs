import assert from "node:assert/strict";
import test from "node:test";

import { footerBottomOverlap } from "../src/lib/floating-actions-runtime.js";

test("footer overlap is zero before the footer reaches the viewport bottom", () => {
  assert.equal(
    footerBottomOverlap({ top: 900, bottom: 980, height: 80 }, 900),
    0,
  );
});

test("footer overlap grows as the footer enters from the bottom", () => {
  assert.equal(
    footerBottomOverlap({ top: 860, bottom: 940, height: 80 }, 900),
    40,
  );
});

test("footer overlap equals footer height when footer is fully visible at the bottom", () => {
  assert.equal(
    footerBottomOverlap({ top: 820, bottom: 900, height: 80 }, 900),
    80,
  );
});

test("footer elsewhere in the viewport does not move bottom floating controls", () => {
  assert.equal(
    footerBottomOverlap({ top: 600, bottom: 680, height: 80 }, 900),
    0,
  );
});
