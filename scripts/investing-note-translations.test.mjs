import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const zhRoot = path.join(root, "src", "content", "notes", "investing");
const enRoot = path.join(root, "src", "content", "note-translations", "en", "investing");

const expected = [
  "overview",
  "asset-allocation",
  "bonds",
  "funds",
  "index-investing",
  "fund-reports",
  "valuation",
  "relative-valuation",
  "discounted-cash-flow",
  "prospectus",
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

test("investing notes have complete English translation coverage", async () => {
  assert.deepEqual(await markdownNames(zhRoot), [...expected].sort());
  assert.deepEqual(await markdownNames(enRoot), [...expected].sort());

  for (const slug of expected) {
    const [zh, en] = await Promise.all([
      readFile(path.join(zhRoot, `${slug}.md`), "utf8"),
      readFile(path.join(enRoot, `${slug}.md`), "utf8"),
    ]);

    assert.equal(frontmatterValue(zh, "category"), "investing");
    assert.equal(frontmatterValue(zh, "language"), "zh");
    assert.equal(frontmatterValue(zh, "status"), "historical");
    assert.equal(frontmatterValue(en, "translationOf"), `investing/${slug}`);
    assert.equal(frontmatterValue(en, "language"), "en");
  }
});

test("reviewed investing notes reject brittle legacy rules and stale product claims", async () => {
  const markdown = (await Promise.all(
    expected.map((slug) => readFile(path.join(zhRoot, `${slug}.md`), "utf8")),
  )).join("\n");

  for (const rejected of [
    "风险系数=（100-当前年龄）%",
    "年化收益率>10% 赎回本金",
    "年化收益率>20% 赎回全部",
    "流动性风险不是风险",
    "A股打新 必赚",
    "风险：无",
    "PE越低，估值越低，越具有投资价值",
    "PB越低意味着风险越低",
    "市销率越低，说明该公司股票的投资价值越大",
    "一般高于70%表示高估，低于30%表示低估",
    "都是被动性指数基金",
    "短债比长债风险大",
  ]) {
    assert.ok(!markdown.includes(rejected), `legacy investing pattern leaked: ${rejected}`);
  }
});

test("investing is appended after economics in Notes category order", async () => {
  const source = await readFile(path.join(root, "src", "lib", "note-category-order.ts"), "utf8");
  assert.ok(source.indexOf('"economics"') >= 0);
  assert.ok(source.indexOf('"investing"') > source.indexOf('"economics"'));
});
