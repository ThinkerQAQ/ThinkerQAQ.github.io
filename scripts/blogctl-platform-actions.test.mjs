import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlPath = new URL("../tools/blogctl/extension/popup/popup.html", import.meta.url);
const syncPath = new URL("../tools/blogctl/extension/popup/sync.js", import.meta.url);
const draftsPath = new URL("../tools/blogctl/extension/popup/drafts.js", import.meta.url);

test("detection and update keep searchable article inventories visible", async () => {
  const [html, sync, drafts] = await Promise.all([
    readFile(htmlPath, "utf8"),
    readFile(syncPath, "utf8"),
    readFile(draftsPath, "utf8"),
  ]);

  assert.match(html, /id="articleOptions" class="article-options" role="listbox"><\/div>/u);
  assert.match(html, /id="draftArticleOptions" class="article-options" role="listbox"><\/div>/u);
  assert.match(sync, /articleOptions\.hidden = false/u);
  assert.match(drafts, /articleOptions\.hidden = false/u);
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
