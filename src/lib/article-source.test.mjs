import assert from "node:assert/strict";
import test from "node:test";
import { articleSourceHref } from "./article-source.mjs";

test("keeps original and translated article sources distinct", () => {
  assert.equal(articleSourceHref("intro"), "/article-source/intro.md");
  assert.equal(articleSourceHref("en/intro"), "/article-source/en/intro.md");
});
test("encodes nested Unicode and spaces", () => {
  assert.equal(articleSourceHref("系列/第一 篇"), "/article-source/%E7%B3%BB%E5%88%97/%E7%AC%AC%E4%B8%80%20%E7%AF%87.md");
});
test("rejects empty and malformed IDs", () => {
  for (const id of ["", "/intro", "intro/", "en//intro", "../intro"]) {
    assert.throws(() => articleSourceHref(id), TypeError);
  }
});
