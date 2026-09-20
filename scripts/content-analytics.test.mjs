import assert from "node:assert/strict";
import test from "node:test";

import {
  DEEP_READ_RULE,
  ENGAGED_READ_RULE,
  PROGRESS_MILESTONES_PERCENT,
  TIME_MILESTONES_SECONDS,
  computeReadingProgress,
  qualifiesForDeepRead,
  qualifiesForEngagedRead,
} from "../src/lib/content-analytics.mjs";

test("reading progress matches the reading experience boundaries", () => {
  const input = {
    startY: 1000,
    endY: 5000,
    viewportHeight: 1000,
    headerHeight: 64,
  };

  assert.equal(computeReadingProgress({ ...input, scrollY: 920 }), 0);
  assert.equal(computeReadingProgress({ ...input, scrollY: 3000 }), 53);
  assert.equal(computeReadingProgress({ ...input, scrollY: 4120 }), 100);
  assert.equal(computeReadingProgress({ ...input, scrollY: 6000 }), 100);
});

test("engaged and deep read rules require both time and progress", () => {
  assert.deepEqual(ENGAGED_READ_RULE, { activeSeconds: 30, progressPercent: 50 });
  assert.deepEqual(DEEP_READ_RULE, { activeSeconds: 60, progressPercent: 90 });

  assert.equal(qualifiesForEngagedRead(29_999, 100), false);
  assert.equal(qualifiesForEngagedRead(30_000, 49), false);
  assert.equal(qualifiesForEngagedRead(30_000, 50), true);

  assert.equal(qualifiesForDeepRead(59_999, 100), false);
  assert.equal(qualifiesForDeepRead(60_000, 89), false);
  assert.equal(qualifiesForDeepRead(60_000, 90), true);
});

test("milestone sets stay intentionally small", () => {
  assert.deepEqual([...TIME_MILESTONES_SECONDS], [30, 60, 180]);
  assert.deepEqual([...PROGRESS_MILESTONES_PERCENT], [50, 90]);
});
