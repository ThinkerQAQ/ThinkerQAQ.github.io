import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const zhRoot = path.join(root, "src", "content", "notes", "economics");
const enRoot = path.join(root, "src", "content", "note-translations", "en", "economics");

const expected = [
  "behavioral-economics/behavioral-economics.md",
  "economics.md",
  "everybody-loves-economics.md",
  "macroeconomics/macroeconomics.md",
  "macroeconomics/models/as-ad-model.md",
  "macroeconomics/models/is-lm-model.md",
  "macroeconomics/models/simple-income-determination-model.md",
  "macroeconomics/policy/fiscal-policy.md",
  "macroeconomics/policy/monetary-policy.md",
  "macroeconomics/research-questions/business-cycles.md",
  "macroeconomics/research-questions/economic-growth.md",
  "macroeconomics/research-questions/inflation.md",
  "macroeconomics/research-questions/unemployment.md",
  "macroeconomics/schools/classical-economics.md",
  "macroeconomics/schools/keynesianism.md",
  "macroeconomics/schools/neoclassical-economics.md",
  "microeconomics/competition-and-monopoly.md",
  "microeconomics/consumer-behavior.md",
  "microeconomics/costs-and-revenue.md",
  "microeconomics/elasticity.md",
  "microeconomics/factor-pricing.md",
  "microeconomics/fairness-and-efficiency.md",
  "microeconomics/microeconomics.md",
  "microeconomics/producer-behavior.md",
  "microeconomics/supply-and-demand.md",
  "microeconomics/what-is-microeconomics.md"
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

test("economics preserves the original VNote file structure and has complete English coverage", async () => {
  assert.deepEqual(await collectMarkdown(zhRoot), [...expected].sort());
  assert.deepEqual(await collectMarkdown(enRoot), [...expected].sort());

  for (const rel of expected) {
    const [zh, en] = await Promise.all([
      readFile(path.join(zhRoot, rel), "utf8"),
      readFile(path.join(enRoot, rel), "utf8"),
    ]);
    assert.equal(frontmatterValue(zh, "category"), "economics");
    assert.equal(frontmatterValue(zh, "language"), "zh");
    assert.ok(frontmatterValue(zh, "sourcePath")?.startsWith("Others/经济/经济学/"));
    assert.equal(frontmatterValue(en, "translationOf"), `economics/${rel.slice(0, -3)}`);
    assert.equal(frontmatterValue(en, "language"), "en");
  }
});

test("economics keeps only the intended small corrections", async () => {
  const markdown = (await Promise.all(
    expected.map((rel) => readFile(path.join(zhRoot, rel), "utf8")),
  )).join("\n");

  for (const rejected of [
    "供给提高，需求下降->均衡价格上升",
    "供给减少，需求上升->均衡价格降低",
    "由政府发布，用来调节货币供应量或信用量的措施",
    "M1是**M0+活期存款**",
  ]) {
    assert.ok(!markdown.includes(rejected), `corrected economics claim reappeared: ${rejected}`);
  }
});

test("economics remains before investing in Notes category order", async () => {
  const source = await readFile(path.join(root, "src", "lib", "note-category-order.ts"), "utf8");
  assert.ok(source.indexOf('"economics"') >= 0);
  assert.ok(source.indexOf('"investing"') > source.indexOf('"economics"'));
});
