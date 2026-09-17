import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCanonicalUrl,
  buildDevtoArticle,
  canonicalUrlsEqual,
  devtoArticleMatches,
  normalizeDevtoTags,
  upsertDevtoArticle,
} from "./syndicate.mjs";

test("builds English canonical URL", () => {
  assert.equal(
    buildCanonicalUrl("concurrency-series-00"),
    "https://thinkerqaq.github.io/en/articles/concurrency-series-00/",
  );
});

test("normalizes DEV.to tags and keeps at most four", () => {
  assert.deepEqual(
    normalizeDevtoTags(["Concurrency", "Java", "Go", "Python", "Distributed Systems", "Java"]),
    ["concurrency", "java", "go", "python"],
  );
});

test("builds DEV.to payload with canonical and absolute root links", () => {
  const payload = buildDevtoArticle({
    title: "Test",
    description: "Description",
    status: "published",
    tags: ["Concurrency", "Java"],
    body: "See [notes](/notes/foo/) and <img src=\"/images/a.png\">.",
  }, { slug: "test" });
  assert.equal(payload.canonical_url, "https://thinkerqaq.github.io/en/articles/test/");
  assert.match(payload.body_markdown, /https:\/\/thinkerqaq\.github\.io\/notes\/foo\//u);
  assert.match(payload.body_markdown, /src="https:\/\/thinkerqaq\.github\.io\/images\/a\.png"/u);
  assert.equal(payload.tags, "concurrency,java");
  assert.equal(payload.published, true);
});


test("DEV.to publishing profile controls footer tracking and native canonical", () => {
  const article = {
    title: "Test",
    description: "Description",
    status: "published",
    tags: ["Go"],
    body: "Body",
  };
  const payload = buildDevtoArticle(article, {
    slug: "test",
    publishingConfig: {
      footer: { enabled: true, template: "> Source: {url}" },
      canonical: { mode: "none" },
      tracking: { enabled: true, source: "custom-devto", medium: "social", campaign: "campaign-x" },
    },
  });
  assert.equal(payload.canonical_url, "");
  assert.match(payload.body_markdown, /Source: https:\/\/thinkerqaq\.github\.io\/en\/articles\/test\/\?utm_source=custom-devto&utm_medium=social&utm_campaign=campaign-x/u);

  const noFooter = buildDevtoArticle(article, {
    slug: "test",
    publishingConfig: {
      footer: { enabled: false, template: "> ignored {url}" },
      canonical: { mode: "native" },
      tracking: { enabled: true, source: "devto", medium: "referral", campaign: "article_syndication" },
    },
  });
  assert.equal(noFooter.canonical_url, "https://thinkerqaq.github.io/en/articles/test/");
  assert.doesNotMatch(noFooter.body_markdown, /ignored/u);
});

test("DEV.to matching supports profiles without native canonical", async () => {
  const desired = buildDevtoArticle({
    title: "Test", description: "Description", tags: ["Go"], body: "Body", status: "published",
  }, {
    slug: "test",
    publishingConfig: {
      footer: { enabled: false, template: "" },
      canonical: { mode: "none" },
      tracking: { enabled: false, source: "devto", medium: "referral", campaign: "article_syndication" },
    },
  });
  assert.equal(devtoArticleMatches({ ...desired, id: 1, tag_list: ["go"] }, desired), true);
  const result = await upsertDevtoArticle(desired, {
    apiKey: "key",
    remoteArticles: [{ id: 1, title: "Test", canonical_url: "", body_markdown: desired.body_markdown, description: desired.description, tag_list: ["go"], published: true }],
    fetchImpl: async () => new Response(JSON.stringify({ id: 1, title: "Test", tag_list: ["go"], ...desired }), { status: 200 }),
  });
  assert.equal(result.action, "skipped");
});

test("canonical comparison ignores query, hash and trailing slash", () => {
  assert.equal(canonicalUrlsEqual(
    "https://thinkerqaq.github.io/en/articles/test/?utm_source=x#foo",
    "https://thinkerqaq.github.io/en/articles/test",
  ), true);
});

test("matches equivalent remote DEV.to article", () => {
  const desired = buildDevtoArticle({
    title: "Test", description: "Description", tags: ["Go"], body: "Body", status: "published",
  }, { slug: "test" });
  assert.equal(devtoArticleMatches({
    ...desired,
    id: 123,
    tag_list: ["go"],
    tags: undefined,
  }, desired), true);
});

test("creates when canonical URL does not exist", async () => {
  const desired = buildDevtoArticle({
    title: "Test", description: "Description", tags: ["Go"], body: "Body", status: "published",
  }, { slug: "test" });
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ id: 10, url: "https://dev.to/user/test", ...desired }), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  };
  const remoteArticles = [];
  const result = await upsertDevtoArticle(desired, { apiKey: "key", remoteArticles, fetchImpl });
  assert.equal(result.action, "created");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.method, "POST");
  assert.equal(remoteArticles.length, 1);
});

test("skips an unchanged remote article after fetching its full body", async () => {
  const desired = buildDevtoArticle({
    title: "Test", description: "Description", tags: ["Go"], body: "Body", status: "published",
  }, { slug: "test" });
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ id: 10, url: "https://dev.to/user/test", tag_list: ["go"], ...desired }), {
      status: 200,
    });
  };
  const remoteArticles = [{ id: 10, canonical_url: desired.canonical_url }];
  const result = await upsertDevtoArticle(desired, { apiKey: "key", remoteArticles, fetchImpl });
  assert.equal(result.action, "skipped");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.method, "GET");
});

test("updates a changed remote article", async () => {
  const desired = buildDevtoArticle({
    title: "Test", description: "Description", tags: ["Go"], body: "New body", status: "published",
  }, { slug: "test" });
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    if (init.method === "GET") {
      return new Response(JSON.stringify({
        id: 10,
        url: "https://dev.to/user/test",
        ...desired,
        body_markdown: "Old body",
        tag_list: ["go"],
      }), { status: 200 });
    }
    return new Response(JSON.stringify({ id: 10, url: "https://dev.to/user/test", ...desired }), { status: 200 });
  };
  const remoteArticles = [{ id: 10, canonical_url: desired.canonical_url }];
  const result = await upsertDevtoArticle(desired, { apiKey: "key", remoteArticles, fetchImpl });
  assert.equal(result.action, "updated");
  assert.deepEqual(calls.map((call) => call.init.method), ["GET", "PUT"]);
});
