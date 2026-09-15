import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const zhRoot = path.join(root, "src", "content", "notes", "photography");
const enRoot = path.join(root, "src", "content", "note-translations", "en", "photography");

const expected = [
  "overview",
  "exposure-metering",
  "focal-length-perspective",
  "focus-depth-motion",
  "light-color",
  "composition",
  "landscape-night",
  "portrait-lighting",
  "raw-hdr-stacking",
  "lightroom-workflow",
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

test("photography notes have complete English translation coverage", async () => {
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
    assert.equal(frontmatterValue(en, "translationOf"), `photography/${slug}`);
    assert.equal(frontmatterValue(en, "language"), "en");
  }
});

test("reviewed photography notes reject stale rules and product-specific myths", async () => {
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
    "曝光：+0.5 ~ +1.5",
    "高光：-30 ~ -80",
    "阴影：+30 ~ +80",
  ]) {
    assert.ok(!markdown.includes(rejected), `legacy photography pattern leaked: ${rejected}`);
  }
});

test("photography is appended after investing in Notes category order", async () => {
  const source = await readFile(path.join(root, "src", "lib", "note-category-order.ts"), "utf8");
  assert.ok(source.indexOf('"investing"') >= 0);
  assert.ok(source.indexOf('"photography"') > source.indexOf('"investing"'));
});
