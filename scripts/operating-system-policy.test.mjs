import assert from "node:assert/strict";
import test from "node:test";

import { NOTE_TOPIC_OVERRIDES, REVIEWED_NOTE_PATHS } from "./content-policy.mjs";
import { sourceExclusionReason } from "./import-vnotes.mjs";

test("publishes exactly the reviewed Operating System notes", () => {
  const reviewed = REVIEWED_NOTE_PATHS.Operating_System;
  const topics = NOTE_TOPIC_OVERRIDES.Operating_System;
  assert.equal(reviewed.size, 39);
  assert.equal(topics.size, 39);

  for (const path of [
    "Operating_System/操作系统.md",
    "Operating_System/进程管理/IPC.md",
    "Operating_System/存储管理/虚拟内存.md",
    "Operating_System/Linux/IO/select、poll、epoll.md",
    "Operating_System/Linux/IO/零拷贝机制.md",
    "Operating_System/Linux/性能调优/Linux性能调优.md",
    "Operating_System/Linux/虚拟化/Linux cgroup.md",
  ]) assert.equal(reviewed.has(path), true, path);

  const config = { sourcePath: "Operating_System" };
  assert.equal(sourceExclusionReason(config, "Linux/manjaro/manjaro.md"), "not-reviewed");
  assert.equal(sourceExclusionReason(config, "Linux/命令/perf.md"), "not-reviewed");
  assert.equal(sourceExclusionReason(config, "Linux/虚拟化/Linux AUFS.md"), "not-reviewed");
  assert.equal(sourceExclusionReason(config, "Linux/命令/lsof.md"), "not-reviewed");
});
