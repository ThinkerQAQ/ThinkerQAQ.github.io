const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { runInNewContext } = require("node:vm");

const source = readFileSync(__dirname + "/sync-state.js", "utf8");
const context = {};
runInNewContext(source, context);
const state = context.BlogCTLSyncState;

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test("平台选择跨页面生命周期保留且去重", () => {
  const saved = storage();
  state.savePlatforms(saved, ["cnblogs", "devto", "cnblogs"]);
  assert.deepEqual(Array.from(state.loadPlatforms(saved)), ["cnblogs", "devto"]);
});

test("只还原当前文章的新近关联元数据，不保存错误和额外字段", () => {
  const saved = storage();
  state.saveMatches(saved, "example", {
    cnblogs: { text: "远端找到 1 篇候选。", bindings: [{ account: "private" }], items: [{ id: "42", title: "Example", published: true, bound: true, token: "never-store" }] },
    devto: { text: "检测失败：请求错误", items: [] },
  }, 1000);
  assert.equal(state.loadMatches(saved, "other", 2000), null);
  const current = state.loadMatches(saved, "example", 2000);
  assert.equal(current.matches.cnblogs.items[0].id, "42");
  assert.equal(current.matches.devto, undefined);
  assert.equal(JSON.stringify(current).includes("private"), false);
  assert.equal(JSON.stringify(current).includes("never-store"), false);
  assert.equal(state.loadMatches(saved, "example", 1000 + 25 * 60 * 60 * 1000), null);
  state.clearMatches(saved);
  assert.equal(state.loadMatches(saved, "example", 2000), null);
});
