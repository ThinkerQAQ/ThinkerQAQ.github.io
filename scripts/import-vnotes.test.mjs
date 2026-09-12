import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
  classifyUnresolvedMarkdownTarget,
  createPublicNoteIndex,
  resolvePublishedNoteTarget,
  sourceExclusionReason,
} from "./import-vnotes.mjs";

test("resolves exact and unique-basename note targets across notebooks", () => {
  const redisLock = path.resolve("fixtures", "Redis", "使用", "Redis分布式锁.md");
  const partition = path.resolve("fixtures", "System_Design", "分布式系统", "分布式系统分区", "分布式系统分区.md");
  const index = createPublicNoteIndex([
    { sourceFile: redisLock, importId: "redis-cache", route: "/notes/redis-cache/使用/Redis分布式锁/" },
    { sourceFile: partition, importId: "distributed-systems", route: "/notes/distributed-systems/分布式系统分区/分布式系统分区/" },
  ]);

  assert.deepEqual(resolvePublishedNoteTarget(redisLock, index), {
    sourceFile: redisLock,
    importId: "redis-cache",
    route: "/notes/redis-cache/使用/Redis分布式锁/",
    strategy: "exact",
  });
  assert.deepEqual(
    resolvePublishedNoteTarget(path.resolve("fixtures", "old", "分布式系统分区.md"), index),
    {
      sourceFile: partition,
      importId: "distributed-systems",
      route: "/notes/distributed-systems/分布式系统分区/分布式系统分区/",
      strategy: "unique-basename",
    },
  );
});

test("distinguishes moved unpublished notes from truly missing targets", () => {
  const knownNames = new Set(["moved.md"]);
  assert.equal(
    classifyUnresolvedMarkdownTarget(path.resolve("old", "moved.md"), knownNames, () => false),
    "target-not-published",
  );
  assert.equal(
    classifyUnresolvedMarkdownTarget(path.resolve("old", "missing.md"), knownNames, () => false),
    "target-not-found",
  );
  assert.equal(
    classifyUnresolvedMarkdownTarget(path.resolve("existing.md"), knownNames, () => true),
    "target-not-published",
  );
});

test("publishes only reviewed System Design notes", () => {
  const config = { sourcePath: "System_Design" };
  assert.equal(
    sourceExclusionReason(config, "技术组件/如何设计一个RPC框架.md"),
    undefined,
  );
  assert.equal(
    sourceExclusionReason(config, "业务系统/如何设计打车软件.md"),
    "not-reviewed",
  );
  assert.equal(
    sourceExclusionReason(config, "业务系统/如何设计频控系统.md"),
    "not-reviewed",
  );
});

test("does not guess when a basename is ambiguous or unpublished", () => {
  const first = path.resolve("fixtures", "one", "overview.md");
  const second = path.resolve("fixtures", "two", "overview.md");
  const index = createPublicNoteIndex([
    { sourceFile: first, importId: "one", route: "/notes/one/overview/" },
    { sourceFile: second, importId: "two", route: "/notes/two/overview/" },
  ]);

  assert.equal(resolvePublishedNoteTarget(path.resolve("fixtures", "old", "overview.md"), index), undefined);
  assert.equal(resolvePublishedNoteTarget(path.resolve("fixtures", "old", "private.md"), index), undefined);
});
