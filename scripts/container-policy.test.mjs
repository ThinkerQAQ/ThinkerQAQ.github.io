import assert from "node:assert/strict";
import test from "node:test";

import { sourceExclusionReason } from "./import-vnotes.mjs";

test("publishes only reviewed Container notes", () => {
  const config = { sourcePath: "Container" };
  assert.equal(sourceExclusionReason(config, "Docker/Docker.md"), undefined);
  assert.equal(sourceExclusionReason(config, "Kubernetes/Kubernetes.md"), undefined);
  assert.equal(sourceExclusionReason(config, "Docker/temporary.md"), "not-reviewed");
  assert.equal(sourceExclusionReason(config, "Kubernetes/private.md"), "not-reviewed");
});
