import assert from "node:assert/strict";
import test from "node:test";
import { noteSourceHref } from "./note-source.mjs";

test("keeps nested note IDs as separate path segments", () => {
  assert.equal(noteSourceHref("go/memory", "en"), "/note-source/en/go/memory.md");
});

test("encodes Unicode and spaces within each path segment", () => {
  assert.equal(
    noteSourceHref("database/中文 章节", "zh"),
    "/note-source/zh/database/%E4%B8%AD%E6%96%87%20%E7%AB%A0%E8%8A%82.md",
  );
});

test("rejects invalid locales and malformed note IDs", () => {
  assert.throws(() => noteSourceHref("go/memory", "fr"), TypeError);
  assert.throws(() => noteSourceHref("", "zh"), TypeError);
  assert.throws(() => noteSourceHref("/go/memory", "zh"), TypeError);
  assert.throws(() => noteSourceHref("go//memory", "zh"), TypeError);
});
