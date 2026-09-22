const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { runInNewContext } = require("node:vm");

const context = {};
runInNewContext(readFileSync(__dirname + "/sync-model.js", "utf8"), context);
const { canUpdatePublished, canUpdateCNBlogsPublished } = context.BlogCTLSyncModel;

test("published update follows platform capabilities", () => {
  const status = {
    platforms: [
      { id: "cnblogs", capabilities: { publishedUpdate: true } },
      { id: "juejin", capabilities: { publishedUpdate: false } },
    ],
  };
  assert.equal(canUpdatePublished("example", ["cnblogs"], true, status), true);
  assert.equal(canUpdatePublished("", ["cnblogs"], true, status), false);
  assert.equal(canUpdatePublished("example", [], true, status), false);
  assert.equal(canUpdatePublished("example", ["cnblogs", "juejin"], true, status), false);
  assert.equal(canUpdatePublished("example", ["juejin"], true, status), false);
  assert.equal(canUpdatePublished("example", ["cnblogs"], false, status), false);
});

test("legacy CNBlogs helper remains compatible during extension transition", () => {
  assert.equal(canUpdateCNBlogsPublished("example", ["cnblogs"], true), true);
  assert.equal(canUpdateCNBlogsPublished("example", ["juejin"], true), false);
});
