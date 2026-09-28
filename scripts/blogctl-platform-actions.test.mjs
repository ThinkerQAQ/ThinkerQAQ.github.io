import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlPath = new URL("../tools/blogctl/extension/popup/popup.html", import.meta.url);
const syncPath = new URL("../tools/blogctl/extension/popup/sync.js", import.meta.url);
const draftsPath = new URL("../tools/blogctl/extension/popup/drafts.js", import.meta.url);
const publicationsPath = new URL("../tools/blogctl/extension/popup/publications.js", import.meta.url);

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
