import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  NOTE_TOPIC_OVERRIDES,
  REVIEWED_NOTE_PATHS,
} from "./content-policy.mjs";
import { sourceExclusionReason } from "./import-vnotes.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const concurrentRoot = path.join(root, "src", "content", "notes", "algorithm-concurrent");
const concurrentEnRoot = path.join(root, "src", "content", "note-translations", "en", "algorithm-concurrent");

function frontmatterValue(markdown, key) {
  return markdown.match(new RegExp(`^${key}:\\s*["']?([^"'\\n]+)["']?\\s*$`, "m"))?.[1];
}

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

test("merges the historical Concurrent notes into Algorithms as topic 4", async () => {
  const expected = ["cas.md", "lock-free-queue.md"];
  assert.deepEqual((await readdir(concurrentRoot)).filter((name) => name.endsWith(".md")).sort(), expected);

  const notes = await Promise.all(expected.map((name) => readFile(path.join(concurrentRoot, name), "utf8")));
  assert.deepEqual(notes.map((note) => frontmatterValue(note, "sourcePath")), [
    "Concurrent/CAS.md",
    "Concurrent/LockFreeQueue.md",
  ]);
  assert.ok(notes.every((note) => frontmatterValue(note, "category") === "algorithm"));
  assert.ok(notes.every((note) => frontmatterValue(note, "topic") === "concurrent-algorithms"));
  assert.ok(notes.every((note) => frontmatterValue(note, "topicLabel") === "4.Concurrent Algorithms"));
  assert.deepEqual(notes.map((note) => Number(frontmatterValue(note, "order"))), [38, 39]);
});

test("concurrent algorithm notes have complete English translation coverage", async () => {
  const expected = ["cas.md", "lock-free-queue.md"];
  assert.deepEqual((await readdir(concurrentEnRoot)).filter((name) => name.endsWith(".md")).sort(), expected);

  const translations = await Promise.all(expected.map((name) => readFile(path.join(concurrentEnRoot, name), "utf8")));
  assert.deepEqual(translations.map((note) => frontmatterValue(note, "translationOf")), [
    "algorithm-concurrent/cas",
    "algorithm-concurrent/lock-free-queue",
  ]);
  assert.ok(translations.every((note) => frontmatterValue(note, "language") === "en"));
});

test("reviewed concurrent notes reject unsafe legacy explanations", async () => {
  const markdown = (await Promise.all([
    readFile(path.join(concurrentRoot, "cas.md"), "utf8"),
    readFile(path.join(concurrentRoot, "lock-free-queue.md"), "utf8"),
  ])).join("\n");

  for (const rejected of [
    "双向链表",
    "delete cur_node;",
    "__sync_bool_compare_and_swap",
    "悲观锁 vs  乐观锁",
  ]) {
    assert.ok(!markdown.includes(rejected), `legacy Concurrent pattern leaked: ${rejected}`);
  }

  assert.ok(markdown.includes("wait-free"));
  assert.ok(markdown.includes("hazard pointers"));
  assert.ok(markdown.includes("内存序"));
});
