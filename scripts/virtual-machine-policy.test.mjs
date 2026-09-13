import assert from "node:assert/strict";
import test from "node:test";
import { NOTE_TOPIC_OVERRIDES, REVIEWED_NOTE_PATHS } from "./content-policy.mjs";
import { sourceExclusionReason } from "./import-vnotes.mjs";
test("publishes exactly the reviewed Virtual Machine notes", () => {
  assert.equal(REVIEWED_NOTE_PATHS.Virtual_Machine.size, 4);
  assert.equal(NOTE_TOPIC_OVERRIDES.Virtual_Machine.size, 4);
  for (const path of ["Virtual_Machine/GC.md", "Virtual_Machine/GC调优.md", "Virtual_Machine/STW.md", "Virtual_Machine/内存泄露.md"]) assert.equal(REVIEWED_NOTE_PATHS.Virtual_Machine.has(path), true, path);
  assert.equal(sourceExclusionReason({ sourcePath: "Virtual_Machine" }, "other.md"), "not-reviewed");
});
