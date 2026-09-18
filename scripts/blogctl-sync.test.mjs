import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import {
  resolveBlogContentRoot as resolveDistributionRoot,
  resolveDistributionOutputRoot,
} from "./blogctl-distribute.mjs";
import {
  resolveBlogContentRoot as resolveSyndicationRoot,
  resolveMediumOutputRoot,
} from "./blogctl-syndicate.mjs";

for (const [name, resolveRoot] of [
  ["distribution", resolveDistributionRoot],
  ["syndication", resolveSyndicationRoot],
]) {
  test(`${name} wrapper resolves BLOG_CONTENT_ROOT`, () => {
    const expected = path.resolve("fixtures");
    assert.equal(resolveRoot({ BLOG_CONTENT_ROOT: "fixtures" }), expected);
  });

  test(`${name} wrapper requires BLOG_CONTENT_ROOT`, () => {
    assert.throws(
      () => resolveRoot({}),
      /BLOG_CONTENT_ROOT is required/u,
    );
  });
}

test("distribution output stays in the content workspace", () => {
  const contentRoot = path.resolve("fixtures");
  assert.equal(
    resolveDistributionOutputRoot(contentRoot, ".distribution"),
    path.join(contentRoot, ".distribution"),
  );
});

test("Medium fallback output stays in the content workspace", () => {
  const contentRoot = path.resolve("fixtures");
  assert.equal(
    resolveMediumOutputRoot(contentRoot),
    path.join(contentRoot, ".distribution", "medium"),
  );
});
