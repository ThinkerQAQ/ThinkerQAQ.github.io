import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const zhRoot = path.join(root, "src", "content", "notes", "security");
const enRoot = path.join(root, "src", "content", "note-translations", "en", "security");

const expected = [
  "overview", "base64", "hash", "encryption", "mac", "digital-signature",
  "sql-injection", "csrf", "xss", "syn-flood", "mitm",
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

test("security notes have complete English translation coverage", async () => {
  assert.deepEqual(await markdownNames(zhRoot), [...expected].sort());
  assert.deepEqual(await markdownNames(enRoot), [...expected].sort());

  for (const slug of expected) {
    const [zh, en] = await Promise.all([
      readFile(path.join(zhRoot, `${slug}.md`), "utf8"),
      readFile(path.join(enRoot, `${slug}.md`), "utf8"),
    ]);
    assert.equal(frontmatterValue(zh, "category"), "security");
    assert.equal(frontmatterValue(zh, "language"), "zh");
    assert.equal(frontmatterValue(en, "translationOf"), `security/${slug}`);
    assert.equal(frontmatterValue(en, "language"), "en");
  }
});

test("reviewed security notes do not publish rejected legacy patterns", async () => {
  const markdown = (await Promise.all(
    expected.map((slug) => readFile(path.join(zhRoot, `${slug}.md`), "utf8")),
  )).join("\n");

  for (const rejected of [
    "<INTERNAL_URL>",
    "trpc-filter-bkn",
    'aesKey = "12345678abcdefgh"',
    'aesIv = "abcdabcd12345678"',
    "比如淘宝付款是get请求",
  ]) {
    assert.ok(!markdown.includes(rejected), `legacy pattern leaked: ${rejected}`);
  }
});
