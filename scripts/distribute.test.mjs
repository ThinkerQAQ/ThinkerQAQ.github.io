import assert from "node:assert/strict";
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildPlatformMarkdown,
  buildTrackedUrl,
  exportArticles,
  parseArguments,
  parseArticle,
  renderPlatformHtml,
  SUPPORTED_PLATFORMS,
} from "./distribute.mjs";

const ARTICLE = `---
title: "并发文章"
description: "这是一篇用于测试多平台分发的文章。"
publishedAt: "2026-09-09T12:00:00+08:00"
tags:
  - Java
  - Go
  - Python
  - 并发
  - JVM
  - Memory Model
status: published
coverImage: "/media/articles/test/cover.png"
coverImageAlt: "Synthetic test cover"
---

## 正文

[站内链接](/articles/another/)
`;

test("parseArticle reads the supported Astro article frontmatter", () => {
  const article = parseArticle(ARTICLE);
  assert.equal(article.title, "并发文章");
  assert.equal(article.status, "published");
  assert.deepEqual(article.tags, ["Java", "Go", "Python", "并发", "JVM", "Memory Model"]);
  assert.match(article.body, /## 正文/u);
});

test("buildTrackedUrl adds stable platform attribution", () => {
  assert.equal(
    buildTrackedUrl("https://thinkerqaq.github.io/articles/concurrency/test/", "csdn"),
    "https://thinkerqaq.github.io/articles/concurrency/test/?utm_source=csdn&utm_medium=referral&utm_campaign=article_syndication",
  );
  assert.throws(
    () => buildTrackedUrl("https://thinkerqaq.github.io/articles/concurrency/test/", "unknown"),
    /Unsupported platform/u,
  );
});

test("buildPlatformMarkdown keeps canonical clean and tracks the attribution footer", () => {
  const article = parseArticle(ARTICLE);
  const juejin = buildPlatformMarkdown(article, { platform: "juejin", slug: "concurrency/test" });
  const cnblogs = buildPlatformMarkdown(article, { platform: "cnblogs", slug: "concurrency/test" });

  assert.match(
    juejin,
    /canonicalUrl: "https:\/\/thinkerqaq\.github\.io\/articles\/concurrency\/test\/"/u,
  );
  assert.doesNotMatch(
    juejin,
    /canonicalUrl: .*utm_source/u,
  );
  assert.match(
    juejin,
    /https:\/\/thinkerqaq\.github\.io\/articles\/concurrency\/test\/\?utm_source=juejin&utm_medium=referral&utm_campaign=article_syndication/u,
  );
  assert.match(juejin, /由作者本人同步发布/u);
  assert.match(juejin, /\[站内链接\]\(https:\/\/thinkerqaq\.github\.io\/articles\/another\/\)/u);
  assert.equal((juejin.match(/^  - /gmu) ?? []).length, 5);
  assert.match(cnblogs, /categories:\n  - "\[Markdown\]"/u);
  assert.match(cnblogs, /utm_source=cnblogs/u);
  assert.equal((cnblogs.match(/^  - /gmu) ?? []).length, 7);
});


test("buildPlatformMarkdown canonical follows configured content language", () => {
  const article = parseArticle(ARTICLE);
  const english = buildPlatformMarkdown(article, {
    platform: "juejin",
    slug: "concurrency/test",
    language: "en",
  });
  assert.match(
    english,
    /canonicalUrl: "https:\/\/thinkerqaq\.github\.io\/en\/articles\/concurrency\/test\/"/u,
  );
  assert.match(english, /ThinkerQAQ's personal blog/u);
});

test("buildPlatformMarkdown applies publishing footer tracking and canonical policies", () => {
  const article = parseArticle(ARTICLE);
  const custom = buildPlatformMarkdown(article, {
    platform: "juejin",
    slug: "concurrency/test",
    publishingConfig: {
      footer: { enabled: true, template: "> 自定义来源：{url}" },
      canonical: { mode: "none" },
      tracking: {
        enabled: true,
        source: "custom-juejin",
        medium: "social",
        campaign: "custom-campaign",
      },
    },
  });
  assert.doesNotMatch(custom, /canonicalUrl:/u);
  assert.match(custom, /> 自定义来源：https:\/\/thinkerqaq\.github\.io\/articles\/concurrency\/test\/\?utm_source=custom-juejin&utm_medium=social&utm_campaign=custom-campaign/u);
  assert.doesNotMatch(custom, /由作者本人同步发布/u);

  const clean = buildPlatformMarkdown(article, {
    platform: "csdn",
    slug: "concurrency/test",
    publishingConfig: {
      footer: { enabled: true, template: "> {url}" },
      canonical: { mode: "footer" },
      tracking: { enabled: false, source: "csdn", medium: "referral", campaign: "article_syndication" },
    },
  });
  assert.match(clean, /canonicalUrl: "https:\/\/thinkerqaq\.github\.io\/articles\/concurrency\/test\/"/u);
  assert.match(clean, /> https:\/\/thinkerqaq\.github\.io\/articles\/concurrency\/test\//u);
  assert.doesNotMatch(clean, /utm_source/u);

  const noFooter = buildPlatformMarkdown(article, {
    platform: "zhihu",
    slug: "concurrency/test",
    publishingConfig: {
      footer: { enabled: false, template: "> ignored {url}" },
      canonical: { mode: "footer" },
      tracking: { enabled: true, source: "zhihu", medium: "referral", campaign: "article_syndication" },
    },
  });
  assert.doesNotMatch(noFooter, /ignored/u);
  assert.doesNotMatch(noFooter, /本文首发于/u);
});

test("exportArticles exports published articles and leaves drafts out", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "distribution-test-"));
  const articleRoot = path.join(root, "articles");
  const outputRoot = path.join(root, "output");
  try {
    await mkdir(articleRoot);
    await writeFile(path.join(articleRoot, "published.md"), ARTICLE);
    await writeFile(path.join(articleRoot, "draft.md"), ARTICLE.replace("status: published", "status: draft"));

    const result = await exportArticles({
      articleRoot,
      outputRoot,
      platforms: ["juejin", "csdn"],
    });

    assert.equal(result.exported.length, 2);
    assert.equal(result.exported.every((item) => item.slug === "published"), true);
    const juejinOutput = await readFile(path.join(outputRoot, "juejin", "published.md"), "utf8");
    assert.match(juejinOutput, /本文首发于/u);
    assert.match(juejinOutput, /utm_source=juejin/u);
    await assert.rejects(
      () => access(path.join(outputRoot, "manifest.json")),
      /ENOENT/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("exportArticles records language-specific canonical metadata", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "distribution-language-test-"));
  const articleRoot = path.join(root, "articles", "en");
  const outputRoot = path.join(root, "output");
  try {
    await mkdir(articleRoot, { recursive: true });
    await writeFile(path.join(articleRoot, "example.md"), ARTICLE.replace("并发文章", "Concurrency Article").replace("这是一篇用于测试多平台分发的文章。", "Distribution test article."));
    const result = await exportArticles({
      articleRoot,
      outputRoot,
      platforms: ["juejin"],
      requestedSlugs: ["example"],
      language: "en",
    });
    assert.equal(result.exported[0].language, "en");
    assert.equal(result.exported[0].canonicalUrl, "https://thinkerqaq.github.io/en/articles/example/");
    assert.equal(result.exported[0].language, "en");
    assert.equal(result.exported[0].canonicalUrl, "https://thinkerqaq.github.io/en/articles/example/");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("exportArticles never mutates publication state", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "distribution-state-test-"));
  const articleRoot = path.join(root, "articles");
  const outputRoot = path.join(root, "output");
  try {
    await mkdir(articleRoot);
    await mkdir(outputRoot);
    await writeFile(path.join(articleRoot, "example.md"), ARTICLE);
    const manifestPath = path.join(outputRoot, "manifest.json");
    const existing = JSON.stringify({
      version: 2,
      articles: {
        example: {
          platforms: {
            juejin: {
              remoteDraftId: "remote-1",
              draftHash: "published-state-owned-by-go",
            },
          },
        },
      },
    }, null, 2) + "\n";
    await writeFile(manifestPath, existing);

    await exportArticles({
      articleRoot,
      outputRoot,
      platforms: ["juejin"],
      requestedSlugs: ["example"],
    });

    assert.equal(await readFile(manifestPath, "utf8"), existing);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("renderPlatformHtml renders fenced code and GFM-style tables deterministically", () => {
  const html = renderPlatformHtml([
    "| Name | Value |",
    "| --- | --- |",
    "| `count++` | **three steps** |",
    "",
    "```go",
    "count++",
    "```",
  ].join("\n"));

  assert.match(html, /<table>/u);
  assert.match(html, /<thead><tr><th>Name<\/th><th>Value<\/th><\/tr><\/thead>/u);
  assert.match(html, /<td><code>count\+\+<\/code><\/td>/u);
  assert.match(html, /<td><strong>three steps<\/strong><\/td>/u);
  assert.match(html, /<pre><code class="language-go">count\+\+/u);
});

test("parseArguments validates native renderer scope", () => {
  assert.deepEqual(SUPPORTED_PLATFORMS, [
    "cnblogs", "juejin", "csdn", "segmentfault", "zhihu", "51cto", "oschina", "toutiao",
  ]);
  assert.deepEqual(
    parseArguments(["--article", "a", "--platforms", "juejin,cnblogs"]),
    {
      platforms: ["juejin", "cnblogs"],
      requestedSlugs: ["a"],
      outputRoot: ".distribution",
      dryRun: false,
      help: false,
    },
  );
  assert.deepEqual(
    parseArguments(["--platforms", "juejin", "csdn", "cnblogs"]),
    {
      platforms: ["juejin", "csdn", "cnblogs"],
      requestedSlugs: [],
      outputRoot: ".distribution",
      dryRun: false,
      help: false,
    },
  );
  assert.throws(() => parseArguments(["--platforms", "unknown"]), /Unsupported platform/u);
  assert.throws(() => parseArguments(["--article"]), /requires a value/u);
  assert.throws(() => parseArguments(["--platforms"]), /at least one platform/u);
  assert.throws(() => parseArguments(["--sync"]), /Unknown option/u);
  assert.throws(() => parseArguments(["--changed"]), /Unknown option/u);
  assert.equal(parseArguments(["--dry-run"]).dryRun, true);
});

test("buildPlatformMarkdown compiles Mermaid to BlogCTL R2 image Markdown", () => {
  const fence = String.fromCharCode(96).repeat(3);
  const article = parseArticle(ARTICLE + "\n" + fence + "mermaid\nflowchart LR\n  accTitle: Mutex path\n  A --> B\n" + fence + "\n");
  const output = buildPlatformMarkdown(article, { platform: "juejin", slug: "concurrency/test" });
  assert.doesNotMatch(output, /flowchart LR/u);
  assert.match(output, /!\[Mutex path\]\(https:\/\/pub-366a15b6733345039775c083a1fffb3e\.r2\.dev\/generated\/mermaid\/[a-f0-9]{24}\.png\)/u);
});


test("parseArticle reads required cover metadata for published articles", () => {
  const parsed = parseArticle(`---
title: "Cover"
description: "Cover test"
status: published
coverImage: "/media/articles/cover/cover.png"
coverImageAlt: "Cover alt"
tags: []
---

Body`);
  assert.equal(parsed.coverImage, "/media/articles/cover/cover.png");
  assert.equal(parsed.coverImageAlt, "Cover alt");
});

test("parseArticle rejects published articles without cover metadata", () => {
  assert.throws(() => parseArticle(`---
title: "Missing cover"
description: "Cover test"
status: published
tags: []
---

Body`), /cover metadata is incomplete/u);
});
