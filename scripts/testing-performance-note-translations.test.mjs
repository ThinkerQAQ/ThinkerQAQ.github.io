import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const zhRoot = path.join(root, "src", "content", "notes", "testing-performance");
const enRoot = path.join(root, "src", "content", "note-translations", "en", "testing-performance");
const expected = ["overview", "performance-testing", "load-stress-testing", "full-link-load-testing", "jmeter-distributed"];
async function names(dir) { return (await readdir(dir)).filter((n) => n.endsWith(".md")).map((n) => n.replace(/\.md$/, "")).sort(); }
function value(md, key) { return md.match(new RegExp(`^${key}:\\s*["']?([^"'\\n]+)["']?\\s*$`, "m"))?.[1]; }

test("testing keeps the five original Test notes and English coverage", async () => {
  assert.deepEqual(await names(zhRoot), [...expected].sort());
  assert.deepEqual(await names(enRoot), [...expected].sort());
  for (const slug of expected) {
    const [zh, en] = await Promise.all([readFile(path.join(zhRoot, `${slug}.md`), "utf8"), readFile(path.join(enRoot, `${slug}.md`), "utf8")]);
    assert.equal(value(zh, "category"), "testing-performance");
    assert.equal(value(en, "translationOf"), `testing-performance/${slug}`);
  }
});

test("testing preserves original heading trees", async () => {
  const performance = await readFile(path.join(zhRoot, "performance-testing.md"), "utf8");
  for (const h of ["## 1. 性能测试是什么", "## 2. 性能测试指标", "### 2.1. 吞吐量", "### 2.2. 并发数", "### 2.3. 响应时间", "### 2.4. 资源利用率", "### 2.5. 错误率", "## 3. 参考"]) assert.ok(performance.includes(h), h);
  const stress = await readFile(path.join(zhRoot, "load-stress-testing.md"), "utf8");
  for (const h of ["## 1. 什么是压力测试", "## 2. 为什么需要压力测试", "## 3. 如何设计压力测试计算 QPS", "## 4. 如何准确评估实际QPS", "## 5. 如何优化 QPS", "## 6. 例子", "## 7. 参考"]) assert.ok(stress.includes(h), h);
});

test("testing fixes only misleading legacy rules and unsafe machine-specific examples", async () => {
  const md = (await Promise.all(expected.map((slug) => readFile(path.join(zhRoot, `${slug}.md`), "utf8")))).join("\n");
  for (const rejected of ["QPS=4C/100ms", "压测的数据肯定介于 40-1600 之间", "CPU不高于80%", "内存不高于80%", "千分之五以下", "大部分应该是超时错误", "server.rmi.ssl.disable=true", "<USER_HOME>"]) assert.ok(!md.includes(rejected), rejected);
});
