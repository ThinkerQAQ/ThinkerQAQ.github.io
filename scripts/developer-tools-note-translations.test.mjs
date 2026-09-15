import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const zhRoot = path.join(root, "src", "content", "notes", "developer-tools");
const enRoot = path.join(root, "src", "content", "note-translations", "en", "developer-tools");

const expected = [
  "overview",
  "msys2",
  "gcc",
  "gdb",
  "ssh",
  "goland",
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

test("Developer Tools notes have complete English translation coverage", async () => {
  assert.deepEqual(await markdownNames(zhRoot), [...expected].sort());
  assert.deepEqual(await markdownNames(enRoot), [...expected].sort());

  for (const slug of expected) {
    const [zh, en] = await Promise.all([
      readFile(path.join(zhRoot, `${slug}.md`), "utf8"),
      readFile(path.join(enRoot, `${slug}.md`), "utf8"),
    ]);

    assert.equal(frontmatterValue(zh, "category"), "developer-tools");
    assert.equal(frontmatterValue(zh, "language"), "zh");
    assert.equal(frontmatterValue(zh, "status"), "historical");
    assert.equal(frontmatterValue(en, "translationOf"), `developer-tools/${slug}`);
    assert.equal(frontmatterValue(en, "language"), "en");
  }
});

test("reviewed Developer Tools notes do not leak old machine-specific configuration", async () => {
  const markdown = (await Promise.all(
    expected.map((slug) => readFile(path.join(zhRoot, `${slug}.md`), "utf8")),
  )).join("\n");

  for (const rejected of [
    "C:<USER_HOME>/AppData/Local/JetBrains/Toolbox/apps/Goland/ch-0/222.4167.25",
    "C:\\software\\msys64\\usr\\bin;C:\\software\\msys64\\mingw64\\bin",
    "mingw-w64-i686-connect",
    "ssh-keygen -t rsa -c",
    "User ThinkerQAQ",
    "ProxyCommand connect -S 127.0.0.1:7990",
    "cdn-layout-tool.bat --indexes-dir=C:<USER_HOME>",
  ]) {
    assert.ok(!markdown.includes(rejected), `legacy Developer Tools pattern leaked: ${rejected}`);
  }
});

test("Developer Tools closes the curated technology block before Economics", async () => {
  const source = await readFile(path.join(root, "src", "lib", "note-category-order.ts"), "utf8");
  const testing = source.indexOf('"testing-performance"');
  const developerTools = source.indexOf('"developer-tools"');
  const economics = source.indexOf('"economics"');

  assert.ok(testing >= 0);
  assert.ok(developerTools > testing);
  assert.ok(economics > developerTools);
});
