import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve("src/content/notes/computer-architecture-assembly");

function listMarkdown(dir, prefix = "") {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const rel = path.posix.join(prefix, entry.name);
    const abs = path.join(dir, entry.name);
    return entry.isDirectory() ? listMarkdown(abs, rel) : entry.name.endsWith(".md") ? [rel] : [];
  });
}

test("publishes exactly the reviewed Computer Architecture & Assembly notes", () => {
  const files = listMarkdown(root).sort();
  assert.deepEqual(files, [
    "ASM/汇编语言.md",
    "CPU.md",
    "DMA.md",
    "内存.md",
    "寄存器.md",
    "磁盘.md",
    "缓存.md",
    "计算机组成.md",
  ].sort());

  const assembly = fs.readFileSync(path.join(root, "ASM/汇编语言.md"), "utf8");
  assert.match(assembly, /sourcePath: "ASM\/汇编语言\.md"/);
  assert.match(assembly, /topic: "assembly"/);

  const cache = fs.readFileSync(path.join(root, "缓存.md"), "utf8");
  assert.match(cache, /sourcePath: "Computer_Composition_Principle\/缓存\.md"/);
  assert.match(cache, /topic: "memory-hierarchy"/);
});
