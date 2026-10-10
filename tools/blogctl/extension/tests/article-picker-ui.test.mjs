import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("article search uses a native datalist rather than a custom ARIA dropdown", async () => {
  const html = await readFile(new URL("../popup/popup.html", import.meta.url), "utf8");
  const code = await readFile(new URL("../popup/drafts.js", import.meta.url), "utf8");
  assert.match(html, /id="draftArticlePicker"[^>]*list="draftArticleOptions"/u);
  assert.match(html, /<datalist id="draftArticleOptions"><\/datalist>/u);
  assert.match(code, /function populateArticleOptions\(\)/u);
  assert.match(code, /articlePicker\.addEventListener\("input"/u);
  assert.doesNotMatch(code, /function articlePickerOpen\(/u);
});
