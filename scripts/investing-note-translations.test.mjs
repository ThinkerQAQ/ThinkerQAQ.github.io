import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const zhRoot = path.join(root, "src", "content", "notes", "investing");
const enRoot = path.join(root, "src", "content", "note-translations", "en", "investing");

const expected = [
  "investing.md",
  "investment-strategy.md",
  "personal-finance.md",
  "real-investment/real-estate/cities.md",
  "real-investment/real-estate/home-renovation.md",
  "real-investment/real-estate/real-estate.md",
  "real-investment/real-investment.md",
  "securities/bonds/bonds.md",
  "securities/bonds/convertible-bonds.md",
  "securities/funds/active-fund-managers.md",
  "securities/funds/fund-classification.md",
  "securities/funds/fund-reports.md",
  "securities/funds/fund-screening.md",
  "securities/funds/funds.md",
  "securities/funds/how-to-invest-in-funds.md",
  "securities/securities-investing.md",
  "securities/stocks/absolute-valuation.md",
  "securities/stocks/how-to-invest-in-stocks.md",
  "securities/stocks/indexes.md",
  "securities/stocks/ipo-subscription.md",
  "securities/stocks/prospectus.md",
  "securities/stocks/relative-valuation.md",
  "securities/stocks/stocks.md",
  "securities/stocks/valuation.md"
];

async function collectMarkdown(rootDir, current = rootDir) {
  const entries = await readdir(current, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) out.push(...await collectMarkdown(rootDir, absolute));
    else if (entry.isFile() && entry.name.endsWith(".md")) {
      out.push(path.relative(rootDir, absolute).split(path.sep).join("/"));
    }
  }
  return out.sort();
}

function frontmatterValue(markdown, key) {
  return markdown.match(new RegExp(`^${key}:\\s*["']?([^"'\\n]+)["']?\\s*$`, "m"))?.[1];
}

test("investing preserves the original VNote file structure and has complete English coverage", async () => {
  assert.deepEqual(await collectMarkdown(zhRoot), [...expected].sort());
  assert.deepEqual(await collectMarkdown(enRoot), [...expected].sort());

  for (const rel of expected) {
    const [zh, en] = await Promise.all([
      readFile(path.join(zhRoot, rel), "utf8"),
      readFile(path.join(enRoot, rel), "utf8"),
    ]);
    assert.equal(frontmatterValue(zh, "category"), "investing");
    assert.equal(frontmatterValue(zh, "language"), "zh");
    assert.equal(frontmatterValue(zh, "status"), "historical");
    assert.ok(frontmatterValue(zh, "sourcePath")?.startsWith("Others/经济/投资学/"));
    assert.equal(frontmatterValue(en, "translationOf"), `investing/${rel.slice(0, -3)}`);
    assert.equal(frontmatterValue(en, "language"), "en");
  }
});

test("investing keeps historical material while correcting only clear errors", async () => {
  const markdown = (await Promise.all(
    expected.map((rel) => readFile(path.join(zhRoot, rel), "utf8")),
  )).join("\n");

  for (const rejected of [
    "A股打新 必赚",
    "流动性风险不是风险",
    "100/10=100股",
    "- 短债比长债风险大",
  ]) {
    assert.ok(!markdown.includes(rejected), `corrected investing claim reappeared: ${rejected}`);
  }

  assert.ok(markdown.includes("标准普尔家庭资产象限图"));
  assert.ok(markdown.includes("主动基金经理"));
  assert.ok(markdown.includes("北向资金策略"));
});

test("investing is appended after economics in Notes category order", async () => {
  const source = await readFile(path.join(root, "src", "lib", "note-category-order.ts"), "utf8");
  assert.ok(source.indexOf('"economics"') >= 0);
  assert.ok(source.indexOf('"investing"') > source.indexOf('"economics"'));
});
