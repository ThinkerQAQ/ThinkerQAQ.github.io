import assert from "node:assert/strict";
import test from "node:test";

import { renderArticle } from "./renderer.mjs";

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

function policy({
  canonicalUrl = "https://thinkerqaq.github.io/articles/example/",
  nativeCanonicalUrl = "",
  description = "Compiler protocol fixture.",
  tags = ["Go", "Concurrency"],
  coverImageUrl = "https://thinkerqaq.github.io/media/articles/test/cover.png",
} = {}) {
  return {
    canonicalUrl,
    nativeCanonicalUrl,
    description,
    tags,
    coverImageUrl,
    nativeImageUpload: false,
  };
}

test("renderer returns presentation output from Go-owned metadata", () => {
  const article = renderArticle({
    article: ARTICLE,
    slug: "example",
    platform: "juejin",
    profile: profile("zh-CN", "juejin"),
    language: "zh-CN",
    sourceDir: "/content/articles",
    assets: [ASSET],
    policy: policy({ description: "Go-owned description" }),
  });

  assert.equal(article.version, 1);
  assert.equal(article.slug, "example");
  assert.equal(article.platform, "juejin");
  assert.equal(article.description, "Go-owned description");
  assert.equal(article.canonicalUrl, "https://thinkerqaq.github.io/articles/example/");
  assert.equal(article.markdown.includes("flowchart LR"), false);
  assert.match(article.markdown, /generated\/mermaid\/[a-f0-9]{24}\.png/u);
  assert.match(article.html, /generated\/mermaid\/[a-f0-9]{24}\.png/u);
  assert.equal(article.contentHash, undefined);
  assert.equal(article.assets.length, 1);
  assert.equal(article.assets[0].definition, ASSET.definition);
  assert.equal(article.assets[0].source, undefined);
});

test("DEV.to renderer consumes canonical, tags and cover URL from Go policy", () => {
  const article = renderArticle({
    article: ARTICLE,
    slug: "example",
    platform: "devto",
    profile: profile("en", "devto", "native"),
    language: "en",
    sourceDir: "/content/articles/en",
    assets: [ASSET],
    policy: policy({
      canonicalUrl: "https://thinkerqaq.github.io/en/articles/example/",
      nativeCanonicalUrl: "https://thinkerqaq.github.io/en/articles/example/",
      description: "Go description",
      tags: ["go", "concurrency"],
      coverImageUrl: "https://thinkerqaq.github.io/media/articles/test/cover.png",
    }),
  });

  assert.equal(article.published, false);
  assert.equal(article.description, "Go description");
  assert.deepEqual(article.tags, ["go", "concurrency"]);
  assert.equal(article.nativeCanonicalUrl, "https://thinkerqaq.github.io/en/articles/example/");
  assert.equal(article.coverImageUrl, "https://thinkerqaq.github.io/media/articles/test/cover.png");
});

test("renderer does not manufacture Go-owned content identity", () => {
  const article = renderArticle({
    article: ARTICLE,
    slug: "example",
    platform: "devto",
    profile: profile("en", "devto", "native"),
    language: "en",
    sourceDir: "/content/articles/en",
    assets: [ASSET],
    policy: policy({
      canonicalUrl: "https://thinkerqaq.github.io/en/articles/example/",
      nativeCanonicalUrl: "https://thinkerqaq.github.io/en/articles/example/",
      tags: ["go", "concurrency"],
    }),
  });
  assert.equal(article.contentHash, undefined);
});
