const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { runInNewContext } = require("node:vm");

const context = {};
runInNewContext(readFileSync(__dirname + "/sync-model.js", "utf8"), context);
const { canUpdateCNBlogsPublished } = context.BlogCTLSyncModel;

test("已选文章和博客园时允许请求更新已发布文章，绑定由 Bridge 校验", () => {
  assert.equal(canUpdateCNBlogsPublished("example", ["cnblogs"], true), true);
  assert.equal(canUpdateCNBlogsPublished("", ["cnblogs"], true), false);
  assert.equal(canUpdateCNBlogsPublished("example", [], true), false);
  assert.equal(canUpdateCNBlogsPublished("example", ["cnblogs", "juejin"], true), false);
  assert.equal(canUpdateCNBlogsPublished("example", ["cnblogs"], false), false);
});
