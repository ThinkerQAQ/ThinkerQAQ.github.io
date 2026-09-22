import assert from "node:assert/strict";
import test from "node:test";
import { toError } from "../tools/blogctl/extension/errors.js";

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
      { id: "devto", label: "DEV.to", capabilities: { apiKey: true } },
      { id: "medium", label: "Medium", capabilities: { browserSession: true, draftCreate: true } },
    ],
  });

  assert.deepEqual(rows[0], {
    id: "devto",
    label: "DEV.to",
    capabilities: { apiKey: true },
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

test("gates source availability by configured content language", () => {
  const loggedIn = { id: "medium", known: true, loggedIn: true, capabilities: { browserSession: true } };
  const withoutMirror = { slug: "only-cn", englishMirror: false };
  assert.deepEqual(
    model.platformAvailability(withoutMirror, loggedIn, { language: "en" }),
    { available: false, reason: "缺少英文版本" },
  );
  assert.deepEqual(
    model.platformAvailability(withoutMirror, loggedIn, { language: "zh-CN" }),
    { available: true, reason: "" },
  );

  const chinesePlatform = { id: "cnblogs", known: true, loggedIn: true, capabilities: { browserSession: true } };
  assert.deepEqual(
    model.platformAvailability(withoutMirror, chinesePlatform, { language: "en" }),
    { available: false, reason: "缺少英文版本" },
  );

  const withMirror = { slug: "with-en", englishMirror: true };
  assert.deepEqual(
    model.platformAvailability(withMirror, loggedIn, { language: "en" }),
    { available: true, reason: "" },
  );
});


test("native platforms defer authoritative login checks to the publisher", () => {
  const article = { slug: "with-en", englishMirror: true };
  assert.deepEqual(
    model.platformAvailability(article, { id: "csdn", known: true, loggedIn: false, capabilities: { browserSession: true } }),
    { available: true, reason: "" },
  );
  assert.deepEqual(
    model.platformAvailability(article, { id: "juejin", known: false, loggedIn: false, capabilities: { browserSession: true } }),
    { available: true, reason: "" },
  );
  assert.deepEqual(
    model.platformAvailability(article, { id: "medium", known: true, loggedIn: false, capabilities: { browserSession: true } }),
    { available: true, reason: "" },
  );
});

test("native publishing is not gated by a legacy delivery tool", () => {
  for (const platform of ["cnblogs", "juejin", "csdn", "segmentfault", "zhihu", "51cto", "oschina", "toutiao"]) {
    assert.deepEqual(
      model.deliveryToolAvailability(platform, []),
      { available: true, reason: "" },
    );
  }
});

test("does not gate platforms when no article is selected", () => {
  assert.deepEqual(model.platformAvailability(undefined, "devto"), { available: true, reason: "" });
});

test("maps structured bridge error payloads to an error with code and details", () => {
  const error = toError({ error: "sync job not found", code: "sync_job_not_found", message: "sync job not found", details: { id: "abc" } }, 404);
  assert.equal(error.message, "sync job not found");
  assert.equal(error.code, "sync_job_not_found");
  assert.equal(error.status, 404);
  assert.deepEqual(error.details, { id: "abc" });
});

test("falls back to a plain HTTP error when no structured payload exists", () => {
  const error = toError({}, 500);
  assert.equal(error.message, "bridge HTTP 500");
  assert.equal(error.code, "");
});


test("uses backend capabilities for published-update actions", () => {
  const status = {
    platforms: [
      { id: "cnblogs", capabilities: { publishedUpdate: true } },
      { id: "juejin", capabilities: { publishedUpdate: false } },
    ],
  };
  assert.equal(model.canUpdatePublished("example", ["cnblogs"], true, status), true);
  assert.equal(model.canUpdatePublished("example", ["juejin"], true, status), false);
  assert.equal(model.canUpdatePublished("example", ["cnblogs", "juejin"], true, status), false);
  assert.equal(model.canUpdatePublished("example", ["cnblogs"], false, status), false);
});

test("uses backend API-key capability for delivery tool requirements", () => {
  const devto = { id: "devto", capabilities: { apiKey: true } };
  assert.deepEqual(
    model.deliveryToolAvailability(devto, [{ name: "devto-api", health: { ok: true } }]),
    { available: true, reason: "" },
  );
  assert.deepEqual(
    model.deliveryToolAvailability(devto, [{ name: "devto-api", health: { ok: false, summary: "未配置" } }]),
    { available: false, reason: "未配置" },
  );
});
