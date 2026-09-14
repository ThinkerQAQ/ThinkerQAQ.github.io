import assert from "node:assert/strict";
import test from "node:test";

import {
  retrieveAiSearchSources,
  sourceFromAiSearchKey,
} from "./retrieval.js";

const BLOG_ORIGIN = "https://thinkerqaq.github.io";

function chunk({ key, url, title, language, text = "content" }) {
  return {
    text,
    item: {
      key,
      metadata: {
        source_url: url,
        title,
        language,
        priority: 2,
        schema_version: 3,
      },
    },
  };
}

function createEnv(search) {
  return {
    AI_SEARCH_INSTANCE: "thinkerqaq-blog",
    AI_SEARCH: { get: () => ({ search }) },
  };
}

test("reconstructs legacy English article keys with the public locale prefix", () => {
  assert.equal(
    sourceFromAiSearchKey("blog--articles--en%2Fatomic.md", BLOG_ORIGIN),
    `${BLOG_ORIGIN}/en/articles/atomic/`,
  );
});

test("prefers the requested locale and fills remaining source capacity from the fallback locale", async () => {
  const languages = [];
  const env = createEnv(async (options) => {
    const language = options.ai_search_options.retrieval.filters.language;
    languages.push(language);
    if (language === "en") {
      return {
        chunks: [chunk({
          key: "blog--articles--en%2Fatomic.md",
          url: `${BLOG_ORIGIN}/en/articles/atomic/`,
          title: "Atomic",
          language: "en",
          text: "English source",
        })],
      };
    }
    return {
      chunks: [chunk({
        key: "blog--articles--atomic.md",
        url: `${BLOG_ORIGIN}/articles/atomic/`,
        title: "原子操作",
        language: "zh",
        text: "中文来源",
      })],
    };
  });

  const result = await retrieveAiSearchSources("How does CAS work?", [], env, BLOG_ORIGIN, "en");

  assert.deepEqual(languages, ["en", "zh"]);
  assert.equal(result.preferredLanguage, "en");
  assert.equal(result.fallbackLanguage, "zh");
  assert.equal(result.fallbackUsed, true);
  assert.deepEqual(result.sources.map((source) => source.language), ["en", "zh"]);
  assert.deepEqual(result.sources.map((source) => source.url), [
    `${BLOG_ORIGIN}/en/articles/atomic/`,
    `${BLOG_ORIGIN}/articles/atomic/`,
  ]);
  assert.deepEqual(result.sources.map((source) => source.collection), ["articles", "articles"]);
});

test("does not query the fallback locale when five preferred-language sources are available", async () => {
  const languages = [];
  const env = createEnv(async (options) => {
    const language = options.ai_search_options.retrieval.filters.language;
    languages.push(language);
    return {
      chunks: Array.from({ length: 5 }, (_, index) => chunk({
        key: `blog--articles--en%2Farticle-${index}.md`,
        url: `${BLOG_ORIGIN}/en/articles/article-${index}/`,
        title: `Article ${index}`,
        language: "en",
      })),
    };
  });

  const result = await retrieveAiSearchSources("question", [], env, BLOG_ORIGIN, "en");

  assert.deepEqual(languages, ["en"]);
  assert.equal(result.sources.length, 5);
  assert.equal(result.fallbackUsed, false);
});
