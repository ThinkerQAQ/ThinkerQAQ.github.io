import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const zhRoot = path.join(root, "src", "content", "notes", "observability");
const enRoot = path.join(root, "src", "content", "note-translations", "en", "observability");
const expected = ["tsdb", "prometheus", "prometheus-setup", "grafana", "zipkin"];
async function names(dir) { return (await readdir(dir)).filter((n) => n.endsWith(".md")).map((n) => n.replace(/\.md$/, "")).sort(); }
function value(md, key) { return md.match(new RegExp(`^${key}:\\s*["']?([^"'\\n]+)["']?\\s*$`, "m"))?.[1]; }

test("observability preserves the five original Monitor notes and English coverage", async () => {
  assert.deepEqual(await names(zhRoot), [...expected].sort());
  assert.deepEqual(await names(enRoot), [...expected].sort());
  for (const slug of expected) {
    const [zh, en] = await Promise.all([readFile(path.join(zhRoot, `${slug}.md`), "utf8"), readFile(path.join(enRoot, `${slug}.md`), "utf8")]);
    assert.equal(value(zh, "category"), "observability");
    assert.equal(value(en, "translationOf"), `observability/${slug}`);
  }
});

test("observability preserves original per-file heading structure", async () => {
  const tsdb = await readFile(path.join(zhRoot, "tsdb.md"), "utf8");
  for (const h of ["## 1. 什么是时序数据库", "## 2. 什么是时序数据", "## 3. 为什么需要时序数据库", "## 4. 时序数据库实现", "## 5. 参考"]) assert.ok(tsdb.includes(h), h);
  const prometheus = await readFile(path.join(zhRoot, "prometheus.md"), "utf8");
  for (const h of ["## 1. prometheus是什么", "## 2. prometheus架构", "## 3. Prometheus安装", "## 4. 参考"]) assert.ok(prometheus.includes(h), h);
});

test("observability only patches rejected legacy claims", async () => {
  const md = (await Promise.all(expected.map((slug) => readFile(path.join(zhRoot, `${slug}.md`), "utf8")))).join("\n");
  for (const rejected of ["传统数据库仅仅记录了数据的当前值", "如果目标服务无法直接和Prometheus Server通信", "localhost:9090/classic/graph", "node exporer"]) assert.ok(!md.includes(rejected), rejected);
});
