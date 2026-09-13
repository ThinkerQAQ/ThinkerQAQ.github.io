import assert from "node:assert/strict";
import test from "node:test";
import { NOTE_TOPIC_OVERRIDES, REVIEWED_NOTE_PATHS } from "./content-policy.mjs";
import { sourceExclusionReason } from "./import-vnotes.mjs";
test("publishes exactly the reviewed Software Engineering notes", () => {
  assert.equal(REVIEWED_NOTE_PATHS.Software_Engineering.size, 55);
  assert.equal(NOTE_TOPIC_OVERRIDES.Software_Engineering.size, 55);
  for (const path of [
    "Software_Engineering/Architecture/架构.md",
    "Software_Engineering/Architecture/架构模式/微服务/如何设计配置中心.md",
    "Software_Engineering/建模/UML.md",
    "Software_Engineering/编程范式/OOP/OOP设计模式/行为型模式/策略模式.md",
  ]) assert.equal(REVIEWED_NOTE_PATHS.Software_Engineering.has(path), true, path);
  assert.equal(sourceExclusionReason({ sourcePath: "Software_Engineering" }, "Architecture/架构模式/可插拔架构.md"), "not-reviewed");
  assert.equal(sourceExclusionReason({ sourcePath: "Software_Engineering" }, "编程范式/Concurrent/Pipeline.md"), "not-reviewed");
});
