import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const zhRoot = path.join(root, "src", "content", "notes", "observability");
const enRoot = path.join(root, "src", "content", "note-translations", "en", "observability");

const expected = [
  "overview",
  "tsdb",
  "prometheus",
  "prometheus-setup",
  "grafana",
  "zipkin",
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

test("observability notes have complete English translation coverage", async () => {
  assert.deepEqual(await markdownNames(zhRoot), [...expected].sort());
  assert.deepEqual(await markdownNames(enRoot), [...expected].sort());

  for (const slug of expected) {
    const [zh, en] = await Promise.all([
      readFile(path.join(zhRoot, `${slug}.md`), "utf8"),
      readFile(path.join(enRoot, `${slug}.md`), "utf8"),
    ]);
    assert.equal(frontmatterValue(zh, "category"), "observability");
    assert.equal(frontmatterValue(zh, "language"), "zh");
    assert.equal(frontmatterValue(en, "translationOf"), `observability/${slug}`);
    assert.equal(frontmatterValue(en, "language"), "en");
  }
});

test("reviewed observability notes do not publish rejected legacy claims", async () => {
  const markdown = (await Promise.all(
    expected.map((slug) => readFile(path.join(zhRoot, `${slug}.md`), "utf8")),
  )).join("\n");

  for (const rejected of [
    "传统数据库仅仅记录了数据的当前值",
    "如果目标服务无法直接和Prometheus Server通信",
    "localhost:9090/classic/graph",
    "node exporer",
  ]) {
    assert.ok(!markdown.includes(rejected), `legacy observability pattern leaked: ${rejected}`);
  }
});

test("observability is appended after security in the Notes category order", async () => {
  const source = await readFile(path.join(root, "src", "lib", "note-category-order.ts"), "utf8");
  assert.ok(source.indexOf('"security"') >= 0);
  assert.ok(source.indexOf('"observability"') > source.indexOf('"security"'));
});
