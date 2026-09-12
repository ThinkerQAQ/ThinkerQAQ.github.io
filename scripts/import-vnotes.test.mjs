import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { NOTE_TOPIC_OVERRIDES } from "./content-policy.mjs";

import {
  classifyUnresolvedMarkdownTarget,
  createPublicNoteIndex,
  resolvePublishedNoteTarget,
  sanitizeReviewedExampleCredentials,
  sensitiveReason,
  sourceExclusionReason,
} from "./import-vnotes.mjs";

test("resolves exact and unique-basename note targets across notebooks", () => {
  const redisLock = path.resolve("fixtures", "Redis", "使用", "Redis分布式锁.md");
  const partition = path.resolve("fixtures", "System_Design", "分布式系统", "分布式系统分区", "分布式系统分区.md");
  const index = createPublicNoteIndex([
    { sourceFile: redisLock, importId: "redis-cache", route: "/notes/redis-cache/使用/Redis分布式锁/" },
    { sourceFile: partition, importId: "distributed-systems", route: "/notes/distributed-systems/分布式系统分区/分布式系统分区/" },
  ]);

  assert.deepEqual(resolvePublishedNoteTarget(redisLock, index), {
    sourceFile: redisLock,
    importId: "redis-cache",
    route: "/notes/redis-cache/使用/Redis分布式锁/",
    strategy: "exact",
  });
  assert.deepEqual(
    resolvePublishedNoteTarget(path.resolve("fixtures", "old", "分布式系统分区.md"), index),
    {
      sourceFile: partition,
      importId: "distributed-systems",
      route: "/notes/distributed-systems/分布式系统分区/分布式系统分区/",
      strategy: "unique-basename",
    },
  );
});

test("does not recover a missing cross-folder target as a self link", () => {
  const current = path.resolve("fixtures", "Golang", "GC.md");
  const missingCrossFolder = path.resolve("fixtures", "Virtual_Machine", "GC.md");
  const index = createPublicNoteIndex([
    { sourceFile: current, importId: "go", route: "/notes/go/GC/" },
  ]);

  assert.equal(
    resolvePublishedNoteTarget(missingCrossFolder, index, () => false, current),
    undefined,
  );
});

test("does not recover by basename when the original unpublished target still exists", () => {
  const published = path.resolve("fixtures", "Golang", "GC.md");
  const unpublished = path.resolve("fixtures", "Virtual_Machine", "GC.md");
  const index = createPublicNoteIndex([
    { sourceFile: published, importId: "go", route: "/notes/go/GC/" },
  ]);

  assert.equal(resolvePublishedNoteTarget(unpublished, index, () => true), undefined);
  assert.equal(resolvePublishedNoteTarget(unpublished, index, () => false)?.strategy, "unique-basename");
});

test("distinguishes moved unpublished notes from truly missing targets", () => {
  const knownNames = new Set(["moved.md"]);
  assert.equal(
    classifyUnresolvedMarkdownTarget(path.resolve("old", "moved.md"), knownNames, () => false),
    "target-not-published",
  );
  assert.equal(
    classifyUnresolvedMarkdownTarget(path.resolve("old", "missing.md"), knownNames, () => false),
    "target-not-found",
  );
  assert.equal(
    classifyUnresolvedMarkdownTarget(path.resolve("existing.md"), knownNames, () => true),
    "target-not-published",
  );
});

test("publishes only reviewed System Design notes", () => {
  const config = { sourcePath: "System_Design" };
  assert.equal(
    sourceExclusionReason(config, "技术组件/如何设计一个RPC框架.md"),
    undefined,
  );
  assert.equal(
    sourceExclusionReason(config, "业务系统/如何设计打车软件.md"),
    "not-reviewed",
  );
  assert.equal(
    sourceExclusionReason(config, "业务系统/如何设计频控系统.md"),
    "not-reviewed",
  );
});

test("publishes valuable Go notes and keeps rejected notes private", () => {
  const config = { sourcePath: "Golang" };
  assert.equal(sourceExclusionReason(config, "channel.md"), undefined);
  assert.equal(sourceExclusionReason(config, "GC.md"), undefined);
  assert.equal(sourceExclusionReason(config, "pprof.md"), undefined);
  assert.equal(sourceExclusionReason(config, "json.md"), "not-reviewed");
  assert.equal(sourceExclusionReason(config, "Go环境搭建.md"), "not-reviewed");
  assert.equal(sourceExclusionReason(config, "Golang微服务/consul.md"), "not-reviewed");
  assert.equal(sourceExclusionReason(config, "sync.singleflight.md"), "not-reviewed");
});

test("Go Markdown links resolve only to published notes", () => {
  const root = path.resolve("fixtures", "Golang");
  const channel = path.join(root, "channel.md");
  const makeNew = path.join(root, "make vs new.md");
  const filtered = path.join(root, "Go语言学习.md");
  const index = createPublicNoteIndex([
    { sourceFile: channel, importId: "go", route: "/notes/go/channel/" },
    { sourceFile: makeNew, importId: "go", route: "/notes/go/make vs new/" },
  ]);

  assert.equal(resolvePublishedNoteTarget(channel, index)?.route, "/notes/go/channel/");
  assert.equal(resolvePublishedNoteTarget(makeNew, index)?.route, "/notes/go/make vs new/");
  assert.equal(resolvePublishedNoteTarget(filtered, index), undefined);
  assert.equal(
    classifyUnresolvedMarkdownTarget(filtered, new Set(["go语言学习.md"]), () => true),
    "target-not-published",
  );
});

test("publishes only reviewed Computer Network notes with complete topics", () => {
  const config = { sourcePath: "Computer_Network" };
  assert.equal(sourceExclusionReason(config, "传输层/TCP/TCP.md"), undefined);
  assert.equal(sourceExclusionReason(config, "应用层/DNS/DNS.md"), undefined);
  assert.equal(
    sourceExclusionReason(config, "应用层/HTTP/URL编码.md"),
    "not-reviewed",
  );
  assert.equal(sourceExclusionReason(config, "网络层/IP/IP协议.md"), "not-reviewed");
  assert.equal(sourceExclusionReason(config, "应用层/HTTP/Fiddler/Fiddler.md"), "not-reviewed");

  const topics = NOTE_TOPIC_OVERRIDES.Computer_Network;
  assert.equal(topics.size, 12);
  assert.deepEqual(topics.get("传输层/TCP/TCP.md"), {
    id: "transport",
    label: "传输层",
    number: 1,
  });
  assert.deepEqual(topics.get("应用层/DNS/DNS.md"), {
    id: "network-services",
    label: "网络服务",
    number: 3,
  });
});

test("replaces reviewed Canal example credentials without changing other notes", () => {
  const source = [
    "CREATE USER canal IDENTIFIED BY 'canal';",
    "canal.instance.dbPassword=canal",
    "canal.admin.passwd = 4ACFE3202A5FF5CF467898FC58AAB1D615029441",
    "canal.instance.pwdPublicKey=MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJB",
    "用户名密码为`admin/123456`",
  ].join("\n");
  const reviewed = sanitizeReviewedExampleCredentials(
    source,
    "Database/MySQL/canal/canal.md",
  );
  assert.equal(reviewed.reasons.includes("reviewed-example-credentials"), true);
  assert.equal(reviewed.markdown.includes("<example-password>"), true);
  assert.equal(reviewed.markdown.includes("<example-public-key>"), true);
  assert.equal(reviewed.markdown.includes("4ACFE3202A5FF5CF467898FC58AAB1D615029441"), false);
  assert.deepEqual(
    sanitizeReviewedExampleCredentials(source, "Database/MySQL/MySQL.md"),
    { markdown: source, reasons: [] },
  );
  assert.equal(sensitiveReason(reviewed.markdown), undefined);
  assert.equal(sensitiveReason("accessKey =\nsecretKey ="), undefined);
  assert.equal(sensitiveReason("password = actual-example-secret"), "credential-assignment");
});

test("does not guess when a basename is ambiguous or unpublished", () => {
  const first = path.resolve("fixtures", "one", "overview.md");
  const second = path.resolve("fixtures", "two", "overview.md");
  const index = createPublicNoteIndex([
    { sourceFile: first, importId: "one", route: "/notes/one/overview/" },
    { sourceFile: second, importId: "two", route: "/notes/two/overview/" },
  ]);

  assert.equal(resolvePublishedNoteTarget(path.resolve("fixtures", "old", "overview.md"), index), undefined);
  assert.equal(resolvePublishedNoteTarget(path.resolve("fixtures", "old", "private.md"), index), undefined);
});
