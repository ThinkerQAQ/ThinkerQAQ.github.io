import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import {
  resolveBlogContentRoot as resolveDistributionRoot,
  resolveDistributionArticleRoot,
  resolveDistributionOutputRoot,
} from "./blogctl-distribute.mjs";
import {
  resolveBlogContentRoot as resolveSyndicationRoot,
  resolveMediumOutputRoot,
  resolveSyndicationArticleRoot,
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


test("publishing source roots follow the configured language", () => {
  const contentRoot = path.resolve("fixtures");
  const articles = path.join(contentRoot, "src", "content", "articles");
  assert.equal(resolveDistributionArticleRoot(contentRoot, "zh-CN"), articles);
  assert.equal(resolveDistributionArticleRoot(contentRoot, "en"), path.join(articles, "en"));
  assert.equal(resolveSyndicationArticleRoot(contentRoot, "zh-CN"), articles);
  assert.equal(resolveSyndicationArticleRoot(contentRoot, "en"), path.join(articles, "en"));
});

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
