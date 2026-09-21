import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { compileArticle } from "./index.mjs";

const ARTICLE = `---
title: "Compiled"
description: "Compiler protocol fixture."
status: published
coverImage: "/media/articles/test/cover.png"
coverImageAlt: "Cover"
tags:
  - Go
---

## Body

\`\`\`mermaid
flowchart LR
  accTitle: Compile path
  A --> B
\`\`\`
`;

test("compileArticle returns versioned in-memory publishing content without writing publication state", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "blogctl-compiler-protocol-"));
  try {
    const articleDir = path.join(root, "src", "content", "articles");
    await mkdir(articleDir, { recursive: true });
    await writeFile(path.join(articleDir, "example.md"), ARTICLE);
    const article = await compileArticle({
      contentRoot: root,
      slug: "example",
      platform: "juejin",
      publishingConfig: {
        juejin: {
          language: "zh-CN",
          footer: { enabled: false, template: "" },
          canonical: { mode: "footer" },
          tracking: { enabled: false, source: "juejin", medium: "referral", campaign: "article_syndication" },
        },
      },
      dryRun: true,
      env: {},
    });

    assert.equal(article.version, 1);
    assert.equal(article.slug, "example");
    assert.equal(article.platform, "juejin");
    assert.equal(article.markdown.includes("flowchart LR"), false);
    assert.match(article.markdown, /generated\/mermaid\/[a-f0-9]{24}\.png/u);
    assert.match(article.html, /generated\/mermaid\/[a-f0-9]{24}\.png/u);
    assert.match(article.contentHash, /^[a-f0-9]{64}$/u);
    assert.equal(article.assets.length, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
