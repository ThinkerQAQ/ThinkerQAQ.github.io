import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

async function source(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

test("Chinese and English homepages use the shared locale-aware knowledge hub", async () => {
  const [zh, en] = await Promise.all([
    source("src/pages/index.astro"),
    source("src/pages/en/index.astro"),
  ]);

  assert.match(zh, /HomeKnowledgeHub locale="zh"/u);
  assert.match(en, /HomeKnowledgeHub locale=\{locale\}/u);
  assert.ok(!zh.includes("englishArticles"), "Chinese homepage must not append English articles");
  assert.ok(!zh.includes("Pagination"), "homepage is a hub, not the article archive");
  assert.ok(!en.includes("Pagination"), "English homepage is a hub, not the article archive");
  assert.ok(
    !zh.includes("Legacy build-verifier compatibility marker"),
    "homepage must not carry verifier-only compatibility markup",
  );
});

test("homepage keeps locale-specific latest articles and curated knowledge areas", async () => {
  const hub = await source("src/components/HomeKnowledgeHub.astro");

  assert.match(hub, /\.filter\(\(article\) => article\.data\.language === locale\)\s*\.slice\(0, 5\)/u);
  assert.match(hub, /category: "distributed-systems"/u);
  assert.match(hub, /category: "computer-architecture-assembly"/u);
  assert.match(hub, /category: "database"/u);
  assert.match(hub, /category: "message-queue"/u);
  assert.match(hub, /category: "operating-system"/u);

  for (const category of ["photography", "investing", "economics", "fitness"]) {
    assert.ok(hub.includes(`category: "${category}"`), `missing broader knowledge category: ${category}`);
  }
  assert.match(hub, /resolveKnowledge\(beyondDefinitions, 5\)/u);
});

test("homepage sections degrade cleanly when content is absent", async () => {
  const hub = await source("src/components/HomeKnowledgeHub.astro");

  assert.match(hub, /seriesItems\.length > 0/u);
  assert.match(hub, /latestArticles\.length > 0/u);
  assert.match(hub, /engineeringAreas\.length > 0/u);
  assert.match(hub, /projectItems\.length > 0/u);
  assert.match(hub, /beyondEngineeringAreas\.length > 0/u);
});

test("production build verification targets the knowledge hub instead of the legacy article-feed header", async () => {
  const verifier = await source("scripts/verify-build.mjs");

  assert.match(verifier, /home\.includes\('class="home-hero"'\)/u);
  assert.match(verifier, /home\.includes\('id="home-latest-title"'\)/u);
  assert.match(verifier, /home\.includes\('id="home-engineering-title"'\)/u);
  assert.ok(
    !verifier.includes("Home article collection header missing"),
    "production verifier must not require the removed homepage collection header",
  );
});
