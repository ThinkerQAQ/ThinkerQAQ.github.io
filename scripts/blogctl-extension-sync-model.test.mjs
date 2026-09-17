import assert from "node:assert/strict";
import test from "node:test";

await import("../tools/blogctl/extension/popup/sync-model.js");
const model = globalThis.BlogCTLSyncModel;

test("maps structured sync results to platform rows", () => {
  const rows = model.platformRows({
    state: "running",
    platforms: ["devto", "medium"],
    results: {
      devto: { state: "completed", result: "updated", url: "https://dev.to/example" },
      medium: { state: "waiting", result: "waiting-for-session", message: "Waiting for Medium browser session." },
    },
  }, {
    platforms: [
      { id: "devto", label: "DEV.to" },
      { id: "medium", label: "Medium" },
    ],
  });

  assert.deepEqual(rows[0], {
    id: "devto",
    label: "DEV.to",
    state: "completed",
    result: "updated",
    url: "https://dev.to/example",
    error: "",
    message: "",
    kind: "ok",
    statusLabel: "已更新",
  });
  assert.equal(rows[1].label, "Medium");
  assert.equal(rows[1].kind, "checking");
  assert.equal(rows[1].statusLabel, "等待 Session");
  assert.match(rows[1].message, /Waiting for Medium/u);
});

test("falls back to the overall failed job state for legacy jobs", () => {
  const [row] = model.platformRows({
    state: "failed",
    error: "network failed",
    platforms: ["cnblogs"],
  }, { platforms: [{ id: "cnblogs", label: "博客园" }] });

  assert.equal(row.label, "博客园");
  assert.equal(row.state, "failed");
  assert.equal(row.kind, "error");
  assert.equal(row.statusLabel, "失败");
  assert.equal(row.error, "network failed");
});
