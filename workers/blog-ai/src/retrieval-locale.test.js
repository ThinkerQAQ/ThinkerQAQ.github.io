import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeAiSearchChunks,
  retrieveAiSearchSources,
  sourceFromAiSearchKey,
  sourceFromChunk,
} from "./retrieval.js";

const BLOG_ORIGIN = "https://thinkerqaq.github.io";

function chunk({ key, url, title, language, text = "content", schemaVersion = 3 }) {
  return {
    text,
    item: {
      key,
      metadata: {
        source_url: url,
        title,
        ...(language ? { language } : {}),
        priority: 2,
        schema_version: schemaVersion,
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

test("normalizes legacy collection-first English metadata URLs at the Worker boundary", () => {
  const legacy = chunk({
    key: "blog--articles--en%2Fatomic.md",
    url: `${BLOG_ORIGIN}/articles/en/atomic/`,
    title: "Atomic",
    text: "legacy",
    schemaVersion: 2,
  });
  assert.equal(sourceFromChunk(legacy, BLOG_ORIGIN), `${BLOG_ORIGIN}/en/articles/atomic/`);
});

test("infers English from legacy metadata even when the item key was hashed", () => {
  const legacy = chunk({
    key: "blog--articles--h-0123456789abcdef0123456789abcdef.md",
    url: `${BLOG_ORIGIN}/articles/en/a-very-long-translated-article/`,
    title: "Long translated article",
    text: "legacy",
    schemaVersion: 2,
  });
  const sources = normalizeAiSearchChunks([legacy], BLOG_ORIGIN);
  assert.equal(sources.length, 1);
  assert.equal(sources[0].language, "en");
  assert.equal(sources[0].url, `${BLOG_ORIGIN}/en/articles/a-very-long-translated-article/`);
});

test("prefers the requested locale and fills remaining source capacity from the fallback locale", async () => {
  const languages = [];
  const env = createEnv(async (options) => {
    const language = options.ai_search_options.retrieval.filters?.language;
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
  assert.equal(result.legacyFallbackUsed, false);
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
    const language = options.ai_search_options.retrieval.filters?.language;
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
  assert.equal(result.legacyFallbackUsed, false);
});

test("falls back to the legacy unfiltered index while language metadata is still migrating", async () => {
  const languages = [];
  const env = createEnv(async (options) => {
    const language = options.ai_search_options.retrieval.filters?.language;
    languages.push(language);
    if (language) return { chunks: [] };

    return {
      chunks: [chunk({
        key: "blog--articles--en%2Fatomic.md",
        url: `${BLOG_ORIGIN}/articles/en/atomic/`,
        title: "Atomic",
        text: "Legacy English source",
        schemaVersion: 2,
      })],
    };
  });

  const result = await retrieveAiSearchSources("How does CAS work?", [], env, BLOG_ORIGIN, "en");

  assert.deepEqual(languages, ["en", "zh", undefined]);
  assert.equal(result.legacyFallbackUsed, true);
  assert.equal(result.sources[0].language, "en");
  assert.equal(result.sources[0].url, `${BLOG_ORIGIN}/en/articles/atomic/`);
});

test("uses the legacy unfiltered query if the new language filter is not accepted yet", async () => {
  const languages = [];
  const env = createEnv(async (options) => {
    const language = options.ai_search_options.retrieval.filters?.language;
    languages.push(language);
    if (language) throw new Error("unknown metadata field: language");

    return {
      chunks: [chunk({
        key: "blog--articles--atomic.md",
        url: `${BLOG_ORIGIN}/articles/atomic/`,
        title: "原子操作",
        text: "Legacy source",
        schemaVersion: 2,
      })],
    };
  });

  const result = await retrieveAiSearchSources("CAS", [], env, BLOG_ORIGIN, "zh");

  assert.deepEqual(languages, ["zh", "en", undefined]);
  assert.equal(result.legacyFallbackUsed, true);
  assert.equal(result.sources[0].url, `${BLOG_ORIGIN}/articles/atomic/`);
});
