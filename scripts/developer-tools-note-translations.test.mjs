import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const zhRoot = path.join(root, "src", "content", "notes", "developer-tools");
const enRoot = path.join(root, "src", "content", "note-translations", "en", "developer-tools");
const expected = ["jetbrains", "gcc", "git", "msys2", "ssh"];

async function markdownNames(directory) {
  return (await readdir(directory)).filter((name) => name.endsWith(".md")).map((name) => name.replace(/\.md$/, "")).sort();
}
function frontmatterValue(markdown, key) {
  return markdown.match(new RegExp(`^${key}:\\s*["']?([^"'\\n]+)["']?\\s*$`, "m"))?.[1];
}

test("Developer Tools preserves selected original VNote file boundaries and English coverage", async () => {
  assert.deepEqual(await markdownNames(zhRoot), [...expected].sort());
  assert.deepEqual(await markdownNames(enRoot), [...expected].sort());
  const sourcePaths = new Map([
    ["jetbrains", "Others/软件/JetBrains.md"], ["gcc", "Others/软件/gcc.md"], ["git", "Others/软件/git.md"],
    ["msys2", "Others/软件/msys2.md"], ["ssh", "Others/软件/ssh.md"],
  ]);
  for (const slug of expected) {
    const [zh, en] = await Promise.all([readFile(path.join(zhRoot, `${slug}.md`), "utf8"), readFile(path.join(enRoot, `${slug}.md`), "utf8")]);
    assert.equal(frontmatterValue(zh, "sourcePath"), sourcePaths.get(slug));
    assert.equal(frontmatterValue(zh, "category"), "developer-tools");
    assert.equal(frontmatterValue(en, "translationOf"), `developer-tools/${slug}`);
  }
});

test("Developer Tools preserves the original per-file heading trees", async () => {
  const files = Object.fromEntries(await Promise.all(expected.map(async (slug) => [slug, await readFile(path.join(zhRoot, `${slug}.md`), "utf8")])));
  for (const h of ["## 1. Goland", "### 1.1. 快捷键", "### 1.2. 共享索引", "## 2. 参考"]) assert.ok(files.jetbrains.includes(h), h);
  for (const h of ["## 1. 安装", "### 1.1. 安装Msys2", "### 1.2. 安装gcc", "## 2. gdb", "## 3. 参考"]) assert.ok(files.gcc.includes(h), h);
  for (const h of ["## 1. 安装Git", "## 2. 配置ssh", "## 3. 配置Git", "## 4. 查看Git配置", "## 5. Github", "## 6. 参考"]) assert.ok(files.git.includes(h), h);
  for (const h of ["## 1. 安装", "## 2. 配置", "## 3. 常用软件", "## 4. IDE集成"]) assert.ok(files.msys2.includes(h), h);
  for (const h of ["## 1. 安装网络代理工具", "## 2. 配置ssh", "### 2.1. 生成密钥", "### 2.2. 配置ssh代理"]) assert.ok(files.ssh.includes(h), h);
});

test("Developer Tools only applies necessary stale-config and privacy fixes", async () => {
  const markdown = (await Promise.all(expected.map((slug) => readFile(path.join(zhRoot, `${slug}.md`), "utf8")))).join("\n");
  for (const rejected of ['sourcePath: "Others/软件/"', "User ThinkerQAQ", "C:\\software\\msys64\\home\\zsk", "<PRIVATE_IP>", "ssh-keygen -t rsa -c", 'url."<EMAIL>:", "ssh -T <EMAIL>", "mingw-w64-i686-connect"]) assert.ok(!markdown.includes(rejected), rejected);
  assert.ok(markdown.includes("User git"));
  assert.ok(markdown.includes("UCRT64"));
});

test("Developer Tools closes the technology block before Economics", async () => {
  const source = await readFile(path.join(root, "src", "lib", "note-category-order.ts"), "utf8");
  const testing = source.indexOf('"testing-performance"');
  const developerTools = source.indexOf('"developer-tools"');
  const economics = source.indexOf('"economics"');
  assert.ok(developerTools > testing && economics > developerTools);
});
