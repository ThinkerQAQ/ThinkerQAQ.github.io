import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  findInlineMarkdownLinks,
  isLocalFileTarget,
  legacyImportedLocalLink,
  repairGeneratedMarkdown,
} from "./fix-windows-vnote-links.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));

test("balanced Markdown link parsing keeps parentheses inside Windows local targets", () => {
  const line = "- [本地资料](file:///E:/Data/books/[(Demo)]%20Book%20(636)/Demo.pdf)";
  const [link] = findInlineMarkdownLinks(line);
  assert.equal(link.label, "本地资料");
  assert.equal(link.target, "file:///E:/Data/books/[(Demo)]%20Book%20(636)/Demo.pdf");
  assert.equal(link.raw, "[本地资料](file:///E:/Data/books/[(Demo)]%20Book%20(636)/Demo.pdf)");
  assert.equal(isLocalFileTarget(link.target), true);
  assert.equal(isLocalFileTarget("e:/Data/books/Book%20(1566)/Book.pdf"), true);
});

test("repairs the two legacy corruption shapes produced by the old importer regex", () => {
  const fileUri = "[【黑马】分布式事务专题](file:///E:/Data/calibre/Wei%20Zhi/[(Hei%20Ma%20)]%20Fen%20Bu%20Shi%20Shi%20Wu%20Zhuan%20(636)/Book.pdf)";
  const drivePath = "[互联网时代的软件革命-SaaS架构设计.pdf](e:/Data/calibre/Wei%20Zhi/Book%20(1566)/Book.pdf)";

  const brokenFileUri = legacyImportedLocalLink(fileUri, "【黑马】分布式事务专题", false);
  const brokenDrivePath = legacyImportedLocalLink(drivePath, "互联网时代的软件革命-SaaS架构设计.pdf", false);
  assert.notEqual(brokenFileUri, "【黑马】分布式事务专题");
  assert.notEqual(brokenDrivePath, "互联网时代的软件革命-SaaS架构设计.pdf");

  const generated = `${brokenFileUri}\n${brokenDrivePath}第3.1.2章节`;
  const source = `${fileUri}\n${drivePath}第3.1.2章节`;
  const repaired = repairGeneratedMarkdown(generated, source);
  assert.equal(repaired.markdown, "【黑马】分布式事务专题\n互联网时代的软件革命-SaaS架构设计.pdf第3.1.2章节");
  assert.equal(repaired.repairs, 2);
  assert.deepEqual(repaired.remainingLegacyFragments, []);
});

test("published notes do not expose malformed Windows local-file path remnants", async () => {
  const distributed = await readFile(
    path.join(root, "src", "content", "notes", "distributed-systems", "分布式事务", "分布式事务.md"),
    "utf8",
  );
  const architecture = await readFile(
    path.join(root, "src", "content", "notes", "software-engineering", "建模", "架构图.md"),
    "utf8",
  );

  for (const markdown of [distributed, architecture]) {
    assert.doesNotMatch(markdown, /file:\/\/\//i);
    assert.doesNotMatch(markdown, /\]\([^\n)]*[A-Za-z]:[\\/]/);
  }
  assert.ok(distributed.includes("- 【黑马】分布式事务专题"));
  assert.ok(!distributed.includes("]%20Fen%20Bu%20Shi%20Shi%20Wu"));
  assert.ok(architecture.includes("互联网时代的软件革命-SaaS架构设计.pdf第3.1.2章节"));
  assert.ok(!architecture.includes("/Hu%20Lian%20Wang%20Shi%20Dai%20De%20Ruan%20Ji"));
});
