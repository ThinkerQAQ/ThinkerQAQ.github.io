import assert from "node:assert/strict";
import test from "node:test";

import { renderArticle, useNativeImageUpload } from "./renderer.mjs";

const ASSET_BASE = "https://cdn.example.com/";
const ASSET = {
  kind: "mermaid",
  id: "0123456789abcdef01234567",
  renderer: "@mermaid-js/mermaid-cli@11.17.0",
  definition: "flowchart LR\n  accTitle: Compile path\n  A --> B",
  objectKey: "generated/mermaid/0123456789abcdef01234567.png",
  publicUrl: ASSET_BASE + "generated/mermaid/0123456789abcdef01234567.png",
  alt: "Compile path",
};

const ARTICLE = {
  title: "Compiled",
  description: "Compiler protocol fixture.",
  status: "published",
  coverImage: "/media/articles/test/cover.png",
  coverImageAlt: "Cover",
  tags: ["Go", "Concurrency"],
  body: `## Body

![Compile path](${ASSET.publicUrl})
`,
};

function profile(language, platform, canonical = "footer") {
  return {
    language,
    changedOnly: false,
    footer: { enabled: false, template: "" },
    canonical: { mode: canonical },
    tracking: { enabled: false, source: platform, medium: "referral", campaign: "article_syndication" },
  };
}

test("native image upload platforms are explicit renderer capabilities", () => {
  for (const platform of ["cnblogs", "juejin", "csdn", "segmentfault", "zhihu", "51cto", "oschina", "toutiao", "devto", "medium"]) {
    assert.equal(useNativeImageUpload(platform), true, platform);
  }
});

test("renderer returns versioned content from an already parsed article", () => {
  const article = renderArticle({
    article: ARTICLE,
    slug: "example",
    platform: "juejin",
    profile: profile("zh-CN", "juejin"),
    language: "zh-CN",
    assetBaseUrl: ASSET_BASE,
    dryRun: true,
    sourceDir: "/content/articles",
    assets: [ASSET],
  });

  assert.equal(article.version, 1);
  assert.equal(article.slug, "example");
  assert.equal(article.platform, "juejin");
  assert.equal(article.markdown.includes("flowchart LR"), false);
  assert.match(article.markdown, /generated\/mermaid\/[a-f0-9]{24}\.png/u);
  assert.match(article.html, /generated\/mermaid\/[a-f0-9]{24}\.png/u);
  assert.match(article.contentHash, /^[a-f0-9]{64}$/u);
  assert.equal(article.assets.length, 1);
  assert.equal(article.assets[0].renderer, "@mermaid-js/mermaid-cli@11.17.0");
  assert.equal(article.assets[0].definition, ASSET.definition);
});

test("DEV.to renderer preserves normalized tags and canonical URL", () => {
  const article = renderArticle({
    article: ARTICLE,
    slug: "example",
    platform: "devto",
    profile: profile("en", "devto", "native"),
    language: "en",
    assetBaseUrl: ASSET_BASE,
    dryRun: true,
    sourceDir: "/content/articles/en",
    assets: [ASSET],
  });

  assert.equal(article.published, false);
  assert.deepEqual(article.tags, ["go", "concurrency"]);
  assert.equal(article.nativeCanonicalUrl, "https://thinkerqaq.github.io/en/articles/example/");
  assert.equal(article.coverImageUrl, "https://thinkerqaq.github.io/media/articles/test/cover.png");
  assert.equal(article.markdown.includes("flowchart LR"), false);
});

test("DEV.to renderer hash is independent from save versus publish orchestration", () => {
  const request = {
    article: ARTICLE,
    slug: "example",
    platform: "devto",
    profile: profile("en", "devto", "native"),
    language: "en",
    assetBaseUrl: ASSET_BASE,
    dryRun: true,
    sourceDir: "/content/articles/en",
    assets: [ASSET],
  };
  assert.equal(renderArticle(request).contentHash, renderArticle(request).contentHash);
});
