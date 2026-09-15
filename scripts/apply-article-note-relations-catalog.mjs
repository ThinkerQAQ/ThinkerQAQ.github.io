import { readFile, writeFile } from "node:fs/promises";

const mappings = new Map([
  ["src/content/articles/concurrency-series-00.md", [
    "go/channel",
    "operating-system/进程管理/同步",
  ]],
  ["src/content/articles/concurrency-series-01-hardware.md", [
    "java/JUC/1.JMM模型/先谈硬件",
    "computer-architecture-assembly/缓存",
  ]],
  ["src/content/articles/concurrency-series-02-language-memory-model.md", [
    "java/JUC/1.JMM模型/再谈JMM",
    "go/concurrent",
  ]],
  ["src/content/articles/concurrency-series-03-mutex.md", [
    "java/JUC/2.Synchronized/2.Synchronized",
    "go/sync.Mutex",
  ]],
  ["src/content/articles/concurrency-series-04-mutex-implementation.md", [
    "java/JUC/2.Synchronized/2.Synchronized",
    "java/JUC/2.Synchronized/锁的优化",
    "java/JUC/4.CAS/4.CAS",
    "go/sync.Mutex",
  ]],
  ["src/content/articles/concurrency-series-05-atomic-cas.md", [
    "java/JUC/4.CAS/4.CAS",
    "java/JUC/4.CAS/Atomic/Atomic",
    "go/atomic",
  ]],
  ["src/content/articles/concurrency-series-06-atomic-implementation.md", [
    "java/JUC/4.CAS/4.CAS",
    "java/JUC/4.CAS/Atomic/Atomic",
    "java/JUC/Unsafe/Unsafe",
    "go/atomic",
  ]],
  ["src/content/articles/concurrency-series-07-volatile.md", [
    "java/JUC/3.volatile/3.volatile",
    "java/JUC/1.JMM模型/再谈JMM",
  ]],
  ["src/content/articles/concurrency-series-08-read-write-lock.md", [
    "java/JUC/ReadWriteLock/ReentrantReadWriteLock",
    "go/sync.RWMutex",
  ]],
  ["src/content/articles/software-system-technical-planning-methodology.md", [
    "system-design/软件系统技术规划方法论",
  ]],
]);

function applyRelatedNotes(content, noteIds) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) throw new Error("Article is missing YAML frontmatter");

  let frontmatter = match[1];
  frontmatter = frontmatter.replace(/\nrelatedNotes:\r?\n(?:  - .*\r?\n?)*/g, "");
  const relationBlock = `\nrelatedNotes:\n${noteIds.map((id) => `  - ${id}`).join("\n")}`;
  frontmatter = `${frontmatter.trimEnd()}${relationBlock}`;

  return `---\n${frontmatter}\n---\n${content.slice(match[0].length)}`;
}

for (const [file, noteIds] of mappings) {
  const before = await readFile(file, "utf8");
  const after = applyRelatedNotes(before, noteIds);
  if (after !== before) await writeFile(file, after, "utf8");
}

console.log(`Applied relatedNotes to ${mappings.size} root articles.`);
