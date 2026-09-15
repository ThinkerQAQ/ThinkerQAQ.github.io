import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const zhRoot = path.join(root, "src", "content", "notes", "photography");
const enRoot = path.join(root, "src", "content", "note-translations", "en", "photography");

const expected = [
  "photography",
  "photography-pre-production",
  "photography-post-production",
  "mobile-photography",
  "nikon-z5",
];

const sourcePaths = new Map([
  ["photography", "Others/摄影/摄影.md"],
  ["photography-pre-production", "Others/摄影/摄影前期.md"],
  ["photography-post-production", "Others/摄影/摄影后期.md"],
  ["mobile-photography", "Others/摄影/手机摄影.md"],
  ["nikon-z5", "Others/摄影/尼康Z5.md"],
]);

async function markdownNames(directory) {
  return (await readdir(directory))
    .filter((name) => name.endsWith(".md"))
    .map((name) => name.replace(/\.md$/, ""))
    .sort();
}

function frontmatterValue(markdown, key) {
  return markdown.match(new RegExp(`^${key}:\\s*["']?([^"'\\n]+)["']?\\s*$`, "m"))?.[1];
}

test("Photography preserves the five selected original VNote files instead of a synthetic taxonomy", async () => {
  assert.deepEqual(await markdownNames(zhRoot), [...expected].sort());
  assert.deepEqual(await markdownNames(enRoot), [...expected].sort());

  for (const slug of expected) {
    const [zh, en] = await Promise.all([
      readFile(path.join(zhRoot, `${slug}.md`), "utf8"),
      readFile(path.join(enRoot, `${slug}.md`), "utf8"),
    ]);

    assert.equal(frontmatterValue(zh, "category"), "photography");
    assert.equal(frontmatterValue(zh, "language"), "zh");
    assert.equal(frontmatterValue(zh, "status"), "historical");
    assert.equal(frontmatterValue(zh, "sourcePath"), sourcePaths.get(slug));
    assert.equal(frontmatterValue(en, "translationOf"), `photography/${slug}`);
    assert.equal(frontmatterValue(en, "language"), "en");
  }
});

test("Photography keeps the original learning hierarchy", async () => {
  const basics = await readFile(path.join(zhRoot, "photography.md"), "utf8");
  const pre = await readFile(path.join(zhRoot, "photography-pre-production.md"), "utf8");
  const post = await readFile(path.join(zhRoot, "photography-post-production.md"), "utf8");

  assert.match(basics, /topicLabel:\s*"1\.摄影入门"/);
  assert.match(basics, /## 1\. 什么是摄影/);
  assert.match(basics, /### 2\.1\. 取景/);
  assert.match(basics, /### 2\.2\. 曝光/);
  assert.match(basics, /### 2\.3\. 虚实/);
  assert.match(basics, /### 2\.4\. 构图/);

  assert.match(pre, /topicLabel:\s*"2\.前期与后期"/);
  assert.match(pre, /## 1\. 小清新人像/);
  assert.match(pre, /## 2\. 摄影方法论/);
  assert.match(pre, /## 3\. 实战/);

  assert.match(post, /topicLabel:\s*"2\.前期与后期"/);
  assert.match(post, /## 1\.1\. 后期LightRoom/);
  assert.match(post, /# 2\. HDR合并/);
});

test("Photography corrections stay minimal but do not reintroduce known factual errors", async () => {
  const markdown = (await Promise.all(
    expected.map((slug) => readFile(path.join(zhRoot, `${slug}.md`), "utf8")),
  )).join("\n");

  for (const rejected of [
    "曝光就是影调",
    "现实生活中所有物品的反射率大概是18%",
    "手机都是固定光圈的",
    "感光度就是指感光元件对光线的敏感程度",
    "单点对焦。AF-S下才有",
    "扩展对焦。AF-C下才有",
    "逆光——光源在被摄主体背面。尽量少用",
    "50适合圆形脸，85适合锥型脸",
    "只输出 JPG",
    "HDR = 自动包围 + 自动后期",
  ]) {
    assert.ok(!markdown.includes(rejected), `legacy photography error leaked: ${rejected}`);
  }
});

test("photography remains after investing in Notes category order", async () => {
  const source = await readFile(path.join(root, "src", "lib", "note-category-order.ts"), "utf8");
  assert.ok(source.indexOf('"investing"') >= 0);
  assert.ok(source.indexOf('"photography"') > source.indexOf('"investing"'));
});
