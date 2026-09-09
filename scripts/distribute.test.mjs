import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildPlatformMarkdown,
  exportArticles,
  parseArguments,
  parseArticle,
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

test("buildPlatformMarkdown adds canonical attribution and platform metadata", () => {
  const article = parseArticle(ARTICLE);
  const juejin = buildPlatformMarkdown(article, { platform: "juejin", slug: "concurrency/test" });
  const cnblogs = buildPlatformMarkdown(article, { platform: "cnblogs", slug: "concurrency/test" });

  assert.match(juejin, /https:\/\/thinkerqaq\.github\.io\/articles\/concurrency\/test\//u);
  assert.match(juejin, /由作者本人同步发布/u);
  assert.match(juejin, /\[站内链接\]\(https:\/\/thinkerqaq\.github\.io\/articles\/another\/\)/u);
  assert.equal((juejin.match(/^  - /gmu) ?? []).length, 5);
  assert.match(cnblogs, /categories:\n  - "\[Markdown\]"/u);
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
    assert.match(await readFile(path.join(outputRoot, "juejin", "published.md"), "utf8"), /本文首发于/u);
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

test("parseArguments validates platform and changed options", () => {
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
