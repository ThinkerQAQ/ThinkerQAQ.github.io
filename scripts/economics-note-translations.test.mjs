import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const zhRoot = path.join(root, "src", "content", "notes", "economics");
const enRoot = path.join(root, "src", "content", "note-translations", "en", "economics");

const expected = [
  "overview",
  "supply-demand",
  "elasticity",
  "consumer-theory",
  "producer-theory",
  "costs-revenue",
  "market-structures",
  "welfare-efficiency",
  "macroeconomics",
  "economic-growth-gdp",
  "business-cycles",
  "inflation-unemployment",
  "fiscal-policy",
  "monetary-policy",
  "behavioral-economics",
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

test("economics notes have complete English translation coverage", async () => {
  assert.deepEqual(await markdownNames(zhRoot), [...expected].sort());
  assert.deepEqual(await markdownNames(enRoot), [...expected].sort());

  for (const slug of expected) {
    const [zh, en] = await Promise.all([
      readFile(path.join(zhRoot, `${slug}.md`), "utf8"),
      readFile(path.join(enRoot, `${slug}.md`), "utf8"),
    ]);

    assert.equal(frontmatterValue(zh, "category"), "economics");
    assert.equal(frontmatterValue(zh, "language"), "zh");
    assert.equal(frontmatterValue(en, "translationOf"), `economics/${slug}`);
    assert.equal(frontmatterValue(en, "language"), "en");
  }
});

test("reviewed economics notes reject corrected legacy claims", async () => {
  const markdown = (await Promise.all(
    expected.map((slug) => readFile(path.join(zhRoot, `${slug}.md`), "utf8")),
  )).join("\n");

  for (const rejected of [
    "供给提高，需求下降->均衡价格上升",
    "供给减少，需求上升->均衡价格降低",
    "由政府发布，用来调节货币供应量或信用量的措施",
    "M1是**M0+活期存款**",
    "A股打新 必赚",
    "流动性风险不是风险",
  ]) {
    assert.ok(!markdown.includes(rejected), `legacy economics pattern leaked: ${rejected}`);
  }
});

test("economics is appended after testing performance in Notes category order", async () => {
  const source = await readFile(path.join(root, "src", "lib", "note-category-order.ts"), "utf8");
  assert.ok(source.indexOf('"testing-performance"') >= 0);
  assert.ok(source.indexOf('"economics"') > source.indexOf('"testing-performance"'));
});
