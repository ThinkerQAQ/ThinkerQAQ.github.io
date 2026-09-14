import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildPlatformMarkdown,
  buildTrackedUrl,
  extractDraftUrl,
  exportArticles,
  normalizeDraftUrl,
  parseArguments,
  parseArticle,
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
      run: async (command, args) => calls.push({ command, args }),
    });
    assert.equal(count, 1);
    assert.deepEqual(calls, [{ command: "wechatsync", args: ["sync", exported[0].outputFile, "-p", "juejin"] }]);
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
      run: async () => ({
        output: ++attempts === 1
          ? "文章频繁发布，请稍后再试\n同步完成: 0 成功, 1 失败"
          : "同步完成: 1 成功, 0 失败",
      }),
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
        run: async () => ({ output: "同步完成: 0 成功, 1 失败" }),
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
        run: async () => ({ output: "无头条广告权限\n同步完成: 0 成功, 1 失败" }),
      }),
      /advertising mode unavailable/u,
    );
    assert.equal(toutiaoManifest.articles.example.platforms.toutiao.lastSyncedHash, undefined);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
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
