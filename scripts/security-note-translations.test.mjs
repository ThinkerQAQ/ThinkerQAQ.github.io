import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const zhRoot = path.join(root, "src", "content", "notes", "security");
const enRoot = path.join(root, "src", "content", "note-translations", "en", "security");
const expected = ["overview", "base64", "hash", "encryption", "mac", "digital-signature", "sql-injection", "csrf", "xss", "syn-flood", "mitm"];

async function names(dir) {
  return (await readdir(dir)).filter((name) => name.endsWith(".md")).map((name) => name.replace(/\.md$/, "")).sort();
}
function value(md, key) { return md.match(new RegExp(`^${key}:\\s*["']?([^"'\\n]+)["']?\\s*$`, "m"))?.[1]; }

test("security preserves the original 11-note set and English coverage", async () => {
  assert.deepEqual(await names(zhRoot), [...expected].sort());
  assert.deepEqual(await names(enRoot), [...expected].sort());
  for (const slug of expected) {
    const [zh, en] = await Promise.all([readFile(path.join(zhRoot, `${slug}.md`), "utf8"), readFile(path.join(enRoot, `${slug}.md`), "utf8")]);
    assert.equal(value(zh, "category"), "security");
    assert.equal(value(en, "translationOf"), `security/${slug}`);
  }
});

test("security keeps original note structure instead of replacing it with a new tutorial", async () => {
  const overview = await readFile(path.join(zhRoot, "overview.md"), "utf8");
  for (const heading of ["## 1. 网络传输威胁及应对方法", "### 1.1. 加密", "## 2. Web安全", "## 3. 中间人攻击", "## 4. Syn攻击"]) assert.ok(overview.includes(heading), heading);
  const encryption = await readFile(path.join(zhRoot, "encryption.md"), "utf8");
  for (const heading of ["## 1. 加密是什么", "## 3. 加密三要素", "### 4.1. 对称加密", "### 4.2. 分组模式", "### 4.3. 非对称加密", "## 5. 实现"]) assert.ok(encryption.includes(heading), heading);
});

test("security applies only necessary safety/privacy fixes", async () => {
  const md = (await Promise.all(expected.map((slug) => readFile(path.join(zhRoot, `${slug}.md`), "utf8")))).join("\n");
  for (const rejected of ["<INTERNAL_URL>", "trpc-filter-bkn", 'aesKey = "12345678abcdefgh"', 'aesIv = "abcdabcd12345678"', "比如淘宝付款是get请求"]) assert.ok(!md.includes(rejected), rejected);
});
