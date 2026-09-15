import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const zhRoot = path.join(root, "src", "content", "notes", "web-server-nginx");
const enRoot = path.join(root, "src", "content", "note-translations", "en", "web-server-nginx");

const expected = [
  "overview",
  "core-configuration",
  "static-content",
  "file-server",
  "reverse-proxy",
  "routing-tls",
  "operations",
  "openresty",
  "build-from-source",
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

test("web server nginx notes have complete English translation coverage", async () => {
  assert.deepEqual(await markdownNames(zhRoot), [...expected].sort());
  assert.deepEqual(await markdownNames(enRoot), [...expected].sort());

  for (const slug of expected) {
    const [zh, en] = await Promise.all([
      readFile(path.join(zhRoot, `${slug}.md`), "utf8"),
      readFile(path.join(enRoot, `${slug}.md`), "utf8"),
    ]);
    assert.equal(frontmatterValue(zh, "category"), "web-server-nginx");
    assert.equal(frontmatterValue(zh, "language"), "zh");
    assert.equal(frontmatterValue(en, "translationOf"), `web-server-nginx/${slug}`);
    assert.equal(frontmatterValue(en, "language"), "en");
  }
});

test("reviewed nginx notes reject stale or private legacy patterns", async () => {
  const markdown = (await Promise.all(
    expected.map((slug) => readFile(path.join(zhRoot, `${slug}.md`), "utf8")),
  )).join("\n");

  for (const rejected of [
    "ssl on;",
    "Nginx偶数版本稳定",
    "openssl-1.1.0f",
    "LuaJIT-2.0.2",
    "<USER_HOME>",
    "--user=zsk",
    "x_forwared_for",
  ]) {
    assert.ok(!markdown.includes(rejected), `legacy nginx pattern leaked: ${rejected}`);
  }
});

test("web server nginx is appended after observability in Notes category order", async () => {
  const source = await readFile(path.join(root, "src", "lib", "note-category-order.ts"), "utf8");
  assert.ok(source.indexOf('"observability"') >= 0);
  assert.ok(source.indexOf('"web-server-nginx"') > source.indexOf('"observability"'));
});
