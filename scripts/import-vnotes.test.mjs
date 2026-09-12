import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
  createPublicNoteIndex,
  resolvePublishedNoteTarget,
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
