import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const zhRoot = path.join(root, "src", "content", "notes", "web-server-nginx");
const enRoot = path.join(root, "src", "content", "note-translations", "en", "web-server-nginx");
const expected = ["overview", "openresty", "file-server", "build-from-source"];
async function names(dir) { return (await readdir(dir)).filter((n) => n.endsWith(".md")).map((n) => n.replace(/\.md$/, "")).sort(); }
function value(md, key) { return md.match(new RegExp(`^${key}:\\s*["']?([^"'\\n]+)["']?\\s*$`, "m"))?.[1]; }

test("nginx maps back to the four original VNote files and English coverage", async () => {
  assert.deepEqual(await names(zhRoot), [...expected].sort());
  assert.deepEqual(await names(enRoot), [...expected].sort());
  for (const slug of expected) {
    const [zh, en] = await Promise.all([readFile(path.join(zhRoot, `${slug}.md`), "utf8"), readFile(path.join(enRoot, `${slug}.md`), "utf8")]);
    assert.equal(value(zh, "category"), "web-server-nginx");
    assert.equal(value(en, "translationOf"), `web-server-nginx/${slug}`);
  }
});

test("the large Nginx note keeps its original chapter tree", async () => {
  const md = await readFile(path.join(zhRoot, "overview.md"), "utf8");
  for (const heading of [
    "## 1. Nginx是什么", "## 2. 特点", "### 2.1. IO多路复用epoll", "## 3. 编译安装", "## 4. 配置",
    "### 4.1. 日志配置", "### 4.2. 状态", "### 4.3. HTTP内容替换", "### 4.4. Nginx请求限制", "### 4.5. Nginx访问控制",
    "### 4.6. Nginx作为静态资源WEB服务", "### 4.7. Nginx作为代理服务", "### 4.8. rewrite规则", "### 4.9. 配置HTTPS",
    "## 5. LUA", "## 6. 优化", "## 7. 通用配置", "## 8. FAQ", "### 8.5. try_files", "### 8.6. 常见错误码", "## 9. 参考",
  ]) assert.ok(md.includes(heading), heading);
});

test("nginx applies only required modernization/privacy fixes", async () => {
  const md = (await Promise.all(expected.map((slug) => readFile(path.join(zhRoot, `${slug}.md`), "utf8")))).join("\n");
  for (const rejected of ["ssl on;", "Nginx偶数版本稳定", "openssl-1.1.0f", "LuaJIT-2.0.2", "<USER_HOME>", "--user=zsk", "x_forwared_for"]) assert.ok(!md.includes(rejected), rejected);
});
