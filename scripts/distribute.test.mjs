import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildPlatformMarkdown,
  buildTrackedUrl,
  explainWechatsyncBridgeFailure,
  extractDraftUrl,
  exportArticles,
  normalizeDraftUrl,
  parseArguments,
  parseArticle,
  preflightWechatsync,
  SUPPORTED_PLATFORMS,
  syncExports,
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

test("normalizes the legacy OSChina draft URL returned by Wechatsync", () => {
  const legacy = "https://my.oschina.net/u/2360403/blog/write/draft/3317703";
  const current = "https://my.oschina.net/u/2360403/blog/ai-write/draft/3317703";
  assert.equal(normalizeDraftUrl("oschina", legacy), current);
  assert.equal(
    extractDraftUrl(`同步结果:\n  ✓ oschina (草稿)\n    ${legacy}\n`, "oschina"),
    current,
  );
  assert.equal(
    normalizeDraftUrl("juejin", "https://juejin.cn/editor/drafts/123"),
    "https://juejin.cn/editor/drafts/123",
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
    const manifest = JSON.parse(await readFile(path.join(outputRoot, "manifest.json"), "utf8"));
    assert.equal(typeof manifest.articles.published.platforms.juejin.contentHash, "string");
    assert.equal(manifest.articles.draft, undefined);
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
    const state = result.manifest.articles.example.platforms.juejin;
    assert.equal(state.language, "en");
    assert.equal(state.canonicalUrl, "https://thinkerqaq.github.io/en/articles/example/");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("syncExports records successful draft delivery and changed-only skips it next time", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "distribution-sync-test-"));
  const manifestPath = path.join(root, "manifest.json");
  const manifest = {
    version: 1,
    articles: {
      example: {
        platforms: {
          juejin: { contentHash: "abc" },
        },
      },
    },
  };
  const exported = [{
    slug: "example",
    platform: "juejin",
    outputFile: path.join(root, "example.md"),
    contentHash: "abc",
    pending: true,
  }];
  const calls = [];
  try {
    await writeFile(exported[0].outputFile, "example");
    const count = await syncExports({
      exported,
      manifest,
      manifestPath,
      changedOnly: true,
      run: async (command, args) => {
        calls.push({ command, args });
        return { output: "" };
      },
    });
    assert.equal(count, 1);
    assert.deepEqual(calls, [
      { command: "wechatsync", args: ["--timeout", "5000", "platforms", "--auth"] },
      { command: "wechatsync", args: ["sync", exported[0].outputFile, "-p", "juejin"] },
    ]);
    assert.equal(manifest.articles.example.platforms.juejin.lastSyncedHash, "abc");

    const secondCount = await syncExports({
      exported: [{ ...exported[0], pending: false }],
      manifest,
      manifestPath,
      changedOnly: true,
      run: async () => assert.fail("already-synced output should not run"),
    });
    assert.equal(secondCount, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("syncExports retries CSDN rate limits and does not record platform failures", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "distribution-sync-failure-test-"));
  const manifestPath = path.join(root, "manifest.json");
  const makeState = () => ({
    version: 1,
    articles: { example: { platforms: { csdn: { contentHash: "abc" } } } },
  });
  const exported = [{
    slug: "example",
    platform: "csdn",
    outputFile: path.join(root, "example.md"),
    contentHash: "abc",
    pending: true,
  }];
  try {
    await writeFile(exported[0].outputFile, "example");
    const retryManifest = makeState();
    let attempts = 0;
    const count = await syncExports({
      exported,
      manifest: retryManifest,
      manifestPath,
      run: async (_command, args) => {
        if (args[0] === "--timeout") return { output: "bridge ready" };
        attempts++;
        return {
          output: attempts === 1
            ? "文章频繁发布，请稍后再试\n同步完成: 0 成功, 1 失败"
            : "同步完成: 1 成功, 0 失败",
        };
      },
      wait: async () => {},
      rateLimitRetryMs: 0,
    });
    assert.equal(count, 1);
    assert.equal(attempts, 2);
    assert.equal(retryManifest.articles.example.platforms.csdn.lastSyncedHash, "abc");

    const failedManifest = makeState();
    await assert.rejects(
      syncExports({
        exported,
        manifest: failedManifest,
        manifestPath,
        run: async (_command, args) => args[0] === "--timeout"
          ? { output: "bridge ready" }
          : { output: "同步完成: 0 成功, 1 失败" },
      }),
      /Failed to sync example to csdn/u,
    );
    assert.equal(failedManifest.articles.example.platforms.csdn.lastSyncedHash, undefined);

    const toutiaoManifest = {
      version: 1,
      articles: { example: { platforms: { toutiao: { contentHash: "abc" } } } },
    };
    await assert.rejects(
      syncExports({
        exported: [{ ...exported[0], platform: "toutiao" }],
        manifest: toutiaoManifest,
        manifestPath,
        run: async (_command, args) => args[0] === "--timeout"
          ? { output: "bridge ready" }
          : { output: "无头条广告权限\n同步完成: 0 成功, 1 失败" },
      }),
      /advertising mode unavailable/u,
    );
    assert.equal(toutiaoManifest.articles.example.platforms.toutiao.lastSyncedHash, undefined);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Wechatsync preflight fails fast with bridge-specific diagnosis", async () => {
  const calls = [];
  await assert.rejects(
    preflightWechatsync(async (command, args) => {
      calls.push({ command, args });
      throw new Error("wechatsync exited with code 1\n连接超时: 已有实例正在运行但 Chrome Extension 未连接\n请确保 Chrome 扩展已启用「同步桥接」并且 Token 正确");
    }),
    /Chrome Bridge 未连接/u,
  );
  assert.deepEqual(calls, [{
    command: "wechatsync",
    args: ["--timeout", "5000", "platforms", "--auth"],
  }]);
  assert.match(
    explainWechatsyncBridgeFailure(new Error("Invalid or missing token")),
    /Token 不匹配或缺失/u,
  );
});

test("syncExports never starts article sync when Wechatsync preflight fails", async () => {
  const exported = [{
    slug: "example",
    platform: "juejin",
    outputFile: "example.md",
    contentHash: "abc",
    pending: true,
  }];
  const manifest = { version: 1, articles: { example: { platforms: { juejin: { contentHash: "abc" } } } } };
  const calls = [];
  await assert.rejects(
    syncExports({
      exported,
      manifest,
      manifestPath: "manifest.json",
      run: async (command, args) => {
        calls.push({ command, args });
        throw new Error("连接超时: 已有实例正在运行但 Chrome Extension 未连接");
      },
    }),
    /Chrome Bridge 未连接/u,
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].args[0], "--timeout");
});

test("parseArguments validates platform and changed options", () => {
  assert.deepEqual(SUPPORTED_PLATFORMS, [
    "cnblogs", "juejin", "csdn", "segmentfault", "zhihu", "51cto", "oschina", "toutiao",
  ]);
  assert.deepEqual(
    parseArguments(["--article", "a", "--platforms", "juejin,cnblogs", "--sync", "--changed"]),
    {
      platforms: ["juejin", "cnblogs"],
      requestedSlugs: ["a"],
      outputRoot: ".distribution",
      sync: true,
      changedOnly: true,
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
      sync: false,
      changedOnly: false,
      dryRun: false,
      help: false,
    },
  );
  assert.throws(() => parseArguments(["--platforms", "unknown"]), /Unsupported platform/u);
  assert.throws(() => parseArguments(["--article"]), /requires a value/u);
  assert.throws(() => parseArguments(["--platforms"]), /at least one platform/u);
  assert.throws(() => parseArguments(["--changed"]), /together with --sync/u);
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

test("Chinese platform export compiles Mermaid to a portable PNG", () => {
  const article = parseArticle(ARTICLE);
  article.body = [
    "## 正文",
    "",
    "```mermaid",
    "flowchart LR",
    "A --> B",
    "```",
  ].join("\n");
  const output = buildPlatformMarkdown(article, {
    platform: "csdn",
    slug: "concurrency/test",
  });
  assert.doesNotMatch(output, /```mermaid/u);
  assert.match(
    output,
    /https:\/\/thinkerqaq\.github\.io\/media\/generated\/mermaid\/[a-f0-9]{24}\.png/u,
  );
});
