import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlPath = new URL("../tools/blogctl/extension/popup/popup.html", import.meta.url);
const pickerFiles = [
  new URL("../tools/blogctl/extension/popup/sync.js", import.meta.url),
  new URL("../tools/blogctl/extension/popup/drafts.js", import.meta.url),
  new URL("../tools/blogctl/extension/popup/publications.js", import.meta.url),
];

test("article pickers start collapsed", async () => {
  const html = await readFile(htmlPath, "utf8");

  for (const [inputId, optionsId] of [
    ["articlePicker", "articleOptions"],
    ["draftArticlePicker", "draftArticleOptions"],
    ["publicationArticlePicker", "publicationArticleOptions"],
  ]) {
    assert.match(html, new RegExp(`id="${inputId}"[^>]*aria-expanded="false"`, "u"));
    assert.match(html, new RegExp(`id="${optionsId}"[^>]*hidden`, "u"));
  }
});

test("article pickers collapse after selection and reopen only on interaction", async () => {
  for (const pickerFile of pickerFiles) {
    const source = await readFile(pickerFile, "utf8");

    assert.match(source, /function setArticleOptionsOpen\(open\)/u);
    assert.match(source, /articleOptions\.hidden = !open/u);
    assert.match(source, /setAttribute\("aria-expanded", open \? "true" : "false"\)/u);
    assert.match(source, /function selectArticle\(article\)[\s\S]{0,500}setArticleOptionsOpen\(false\)/u);
    assert.match(source, /addEventListener\("focus", renderArticles\)/u);
    assert.match(source, /if \(event\.key === "Escape"\)[\s\S]{0,160}setArticleOptionsOpen\(false\)/u);
  }
});

test("binding bulk actions live inside the remote association card before the platform list", async () => {
  const html = await readFile(htmlPath, "utf8");
  const bulkActions = html.indexOf('id="bindingBulkActions"');
  const platformList = html.indexOf('id="syncPlatforms"');
  const remoteCardEnd = html.indexOf("</section>", platformList);

  assert.ok(bulkActions >= 0, "binding bulk actions should exist");
  assert.ok(platformList >= 0, "binding platform list should exist");
  assert.ok(bulkActions < platformList, "binding actions should appear before the platform list");
  assert.ok(remoteCardEnd > platformList, "remote association card should close after the platform list");
});
