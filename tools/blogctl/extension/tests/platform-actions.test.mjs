import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlPath = new URL("../popup/popup.html", import.meta.url);
const syncPath = new URL("../popup/sync.js", import.meta.url);
const draftsPath = new URL("../popup/drafts.js", import.meta.url);
const publicationsPath = new URL("../popup/publications.js", import.meta.url);
const backgroundPath = new URL("../background.js", import.meta.url);

test("detection and update keep searchable article inventories collapsible", async () => {
  const [html, sync, drafts] = await Promise.all([
    readFile(htmlPath, "utf8"),
    readFile(syncPath, "utf8"),
    readFile(draftsPath, "utf8"),
  ]);

  assert.match(html, /id="articleOptions" class="article-options" role="listbox" hidden><\/div>/u);
  assert.match(html, /id="draftArticleOptions" class="article-options" role="listbox" hidden><\/div>/u);
  assert.match(sync, /setArticleOptionsOpen\(true\)/u);
  assert.match(drafts, /setArticleOptionsOpen\(true\)/u);
});

test("publish keeps a searchable article list and filters records by the selected article", async () => {
  const [html, publications] = await Promise.all([
    readFile(htmlPath, "utf8"),
    readFile(publicationsPath, "utf8"),
  ]);

  assert.match(html, /id="publicationArticleOptions" class="article-options" role="listbox" hidden><\/div>/u);
  assert.match(publications, /setArticleOptionsOpen\(true\)/u);
  assert.match(publications, /record\.article !== article/u);
});

test("each platform exposes an isolated detection or update action", async () => {
  const [sync, drafts] = await Promise.all([
    readFile(syncPath, "utf8"),
    readFile(draftsPath, "utf8"),
  ]);

  assert.equal(sync.includes('detectPlatformButton.textContent = state.matchingPlatforms.has(platform.id) ? "检测中…" : "检测此平台"'), true);
  assert.match(sync, /refreshArticleMatches\(\[platform\.id\]\)/u);
  assert.equal(drafts.includes(': "更新此平台";'), true);
  assert.match(drafts, /startSavePlatforms\(\[platform\.id\]\)/u);
});

test("publishing platforms never drive hidden browser tabs or platform DOM", async () => {
  const background = await readFile(backgroundPath, "utf8");

  assert.doesNotMatch(background, /cto51PublishInBrowser|waitForPublishedURL/u);
  assert.doesNotMatch(background, /blog\.51cto\.com\/blogger\/draft/u);
  assert.doesNotMatch(background, /document\.querySelector/u);
  assert.doesNotMatch(background, /\/v1\/browser-ops/u);

  const executeScriptCalls = background.match(/chrome\.scripting\.executeScript/g) || [];
  assert.equal(executeScriptCalls.length, 1);
  assert.match(background, /files: \["google-indexing-content\.js"\]/u);
});

test("Toutiao article detection and binding use the creator inventory, not search feed", async () => {
  const background = await readFile(backgroundPath, "utf8");
  assert.match(background, /platform === "toutiao"/u);
  assert.match(background, /\/v1\/toutiao\/articles\/list\?article=/u);
  assert.match(background, /case "blogctl\.toutiao\.bind":/u);
  assert.match(background, /case "blogctl\.toutiao\.unbind":/u);
  assert.doesNotMatch(background, /mp_search\/v1/u);
});


test("Toutiao uses only ephemeral browser-observed creator editor request headers", async () => {
  const background = await readFile(backgroundPath, "utf8");
  assert.match(background, /toutiaoEditorHeadersCapturedAt/u);
  assert.match(background, /x-secsdk-csrf-token/u);
  assert.match(background, /tt-anti-token/u);
  assert.match(background, /Date\.now\(\) - toutiaoEditorHeadersCapturedAt < 10 \* 60 \* 1000/u);
  assert.match(background, /platform === "toutiao".*toutiaoEditorHeadersCapturedAt/su);
});


test("Toutiao published edits are explicit, confirmed, and separate from draft saves", async () => {
  const [drafts, sync] = await Promise.all([
    readFile(draftsPath, "utf8"), readFile(syncPath, "utf8"),
  ]);
  assert.match(drafts, /function startPublishedUpdate\(platformID\)/u);
  assert.match(drafts, /window\.confirm\(/u);
  assert.match(drafts, /operation: "update-published"/u);
  assert.match(drafts, /"更新已发布"/u);
  assert.match(drafts, /operation: "draft"/u);
  assert.match(sync, /from=edit&pgc_id=/u);
});
