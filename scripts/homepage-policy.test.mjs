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

test("homepage hero stays compact and avoids duplicate navigation", async () => {
  const hub = await source("src/components/HomeKnowledgeHub.astro");

  assert.match(hub, /<h1>\{copy\.topics\}<\/h1>/u);
  assert.ok(!hub.includes("<h1>ThinkerQAQ</h1>"), "site name must not be repeated as a giant homepage heading");
  assert.ok(!hub.includes("class=\"home-actions\""), "hero must not duplicate the global article and note navigation");
  assert.ok(!hub.includes("articlesAction:"), "removed hero navigation copy must stay removed");
  assert.ok(!hub.includes("notesAction:"), "removed hero navigation copy must stay removed");
  assert.match(hub, /记录后端工程、并发编程、分布式系统与数据系统中的实践与思考。/u);
});

test("start-here section stays visually aligned with the latest-articles section", async () => {
  const [hub, showcase] = await Promise.all([
    source("src/components/HomeKnowledgeHub.astro"),
    source("src/components/ShowcaseList.astro"),
  ]);

  assert.ok(!hub.includes("showAllSeries"), "All Series must not disappear just because only one series is published");
  assert.match(
    hub,
    /<a href=\{localizePath\(locale, "\/series\/"\)\}>\{copy\.allSeries\} →<\/a>/u,
  );
  assert.match(showcase, /border-top:\s*1px solid var\(--border\);/u);
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
