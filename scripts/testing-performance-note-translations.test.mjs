import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const zhRoot = path.join(root, "src", "content", "notes", "testing-performance");
const enRoot = path.join(root, "src", "content", "note-translations", "en", "testing-performance");

const expected = [
  "overview",
  "performance-testing",
  "load-stress-testing",
  "full-link-load-testing",
  "jmeter-distributed",
];

async function markdownNames(directory) {
  return (await readdir(directory))
    .filter((name) => name.endsWith(".md"))
    .map((name) => name.replace(/\.md$/, ""))
    .sort();
}

function frontmatterValue(markdown, key) {
  return markdown.match(new RegExp(`^${key}:\\s*["']?([^"'\\n]+)["']?\\s*$`, "m"))?.[1];
}

test("testing performance notes have complete English translation coverage", async () => {
  assert.deepEqual(await markdownNames(zhRoot), [...expected].sort());
  assert.deepEqual(await markdownNames(enRoot), [...expected].sort());

  for (const slug of expected) {
    const [zh, en] = await Promise.all([
      readFile(path.join(zhRoot, `${slug}.md`), "utf8"),
      readFile(path.join(enRoot, `${slug}.md`), "utf8"),
    ]);
    assert.equal(frontmatterValue(zh, "category"), "testing-performance");
    assert.equal(frontmatterValue(zh, "language"), "zh");
    assert.equal(frontmatterValue(en, "translationOf"), `testing-performance/${slug}`);
    assert.equal(frontmatterValue(en, "language"), "en");
  }
});

test("reviewed testing notes reject misleading legacy rules", async () => {
  const markdown = (await Promise.all(
    expected.map((slug) => readFile(path.join(zhRoot, `${slug}.md`), "utf8")),
  )).join("\n");

  for (const rejected of [
    "QPS=4C/100ms",
    "压测的数据肯定介于 40-1600 之间",
    "CPU不高于80%",
    "内存不高于80%",
    "千分之五以下",
    "大部分应该是超时错误",
    "server.rmi.ssl.disable=true",
    "<USER_HOME>",
  ]) {
    assert.ok(!markdown.includes(rejected), `legacy testing pattern leaked: ${rejected}`);
  }
});

test("testing performance is appended after web server nginx in Notes category order", async () => {
  const source = await readFile(path.join(root, "src", "lib", "note-category-order.ts"), "utf8");
  assert.ok(source.indexOf('"web-server-nginx"') >= 0);
  assert.ok(source.indexOf('"testing-performance"') > source.indexOf('"web-server-nginx"'));
});
