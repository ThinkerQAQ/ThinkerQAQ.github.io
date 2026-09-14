import assert from "node:assert/strict";
import test from "node:test";

import { contentLanguage, contentSourceUrl } from "./ai-search-content.mjs";

const ORIGIN = "https://thinkerqaq.github.io";

test("keeps default-language articles on the Chinese route", () => {
  const language = contentLanguage("articles", "concurrency-series-05-atomic-cas", {});
  assert.equal(language, "zh");
  assert.equal(
    contentSourceUrl(ORIGIN, "articles", "concurrency-series-05-atomic-cas", language),
    `${ORIGIN}/articles/concurrency-series-05-atomic-cas/`,
  );
});

test("moves translated article locale directories before the collection route", () => {
  const language = contentLanguage("articles", "en/concurrency-series-05-atomic-cas", { language: "en" });
  assert.equal(language, "en");
  assert.equal(
    contentSourceUrl(ORIGIN, "articles", "en/concurrency-series-05-atomic-cas", language),
    `${ORIGIN}/en/articles/concurrency-series-05-atomic-cas/`,
  );
});

test("infers English for legacy translated article files without language metadata", () => {
  const language = contentLanguage("articles", "en/example", {});
  assert.equal(language, "en");
  assert.equal(contentSourceUrl(ORIGIN, "articles", "en/example", language), `${ORIGIN}/en/articles/example/`);
});

test("keeps note IDs intact while applying an explicit locale prefix", () => {
  assert.equal(
    contentSourceUrl(ORIGIN, "notes", "java/JUC/example", "zh"),
    `${ORIGIN}/notes/java/JUC/example/`,
  );
  assert.equal(
    contentSourceUrl(ORIGIN, "notes", "example", "en"),
    `${ORIGIN}/en/notes/example/`,
  );
});

test("rejects unsupported language metadata", () => {
  assert.throws(
    () => contentLanguage("articles", "example", { language: "fr" }),
    /Unsupported content language/,
  );
});
