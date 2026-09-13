import assert from "node:assert/strict";
import test from "node:test";

import {
  NOTE_TOPIC_OVERRIDES,
  REVIEWED_NOTE_PATHS,
} from "./content-policy.mjs";
import { sourceExclusionReason } from "./import-vnotes.mjs";

test("publishes exactly the reviewed Algorithm core notes", () => {
  const reviewed = REVIEWED_NOTE_PATHS.Algorithm;
  assert.equal(reviewed.size, 37);
  assert.ok(reviewed.has("Algorithm/数据结构与算法.md"));
  assert.ok(reviewed.has("Algorithm/数据结构/array.md"));
  assert.ok(reviewed.has("Algorithm/数据结构/BloomFilter.md"));
  assert.ok(reviewed.has("Algorithm/算法/DFS.md"));
  assert.ok(reviewed.has("Algorithm/算法/排序/快速排序.md"));
  assert.ok(reviewed.has("Algorithm/算法/查找/二分查找.md"));

  const config = { sourcePath: "Algorithm" };
  assert.equal(sourceExclusionReason(config, "数据结构与算法.md"), undefined);
  assert.equal(sourceExclusionReason(config, "leetcode/lru/设计LRU缓存结构.md"), "not-reviewed");
  assert.equal(sourceExclusionReason(config, "剑指offer/数组/连续子数组的最大和.md"), "not-reviewed");
});

test("keeps the Algorithm blog taxonomy explicit", () => {
  const overrides = NOTE_TOPIC_OVERRIDES.Algorithm;
  assert.equal(overrides.size, 37);
  assert.deepEqual(overrides.get("数据结构与算法.md"), {
    id: "overview",
    label: "Overview",
    number: 1,
  });
  assert.deepEqual(overrides.get("数据结构/array.md"), {
    id: "data-structures",
    label: "Data Structures",
    number: 2,
  });
  assert.deepEqual(overrides.get("算法/DFS.md"), {
    id: "algorithms",
    label: "Algorithms",
    number: 3,
  });
});