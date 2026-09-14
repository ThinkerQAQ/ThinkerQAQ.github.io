import assert from "node:assert/strict";
import test from "node:test";

import worker from "./worker.js";

const WORKER_URL = "https://example.workers.dev/chat";
const BLOG_ORIGIN = "https://thinkerqaq.github.io";

function createEnv(overrides = {}) {
  return {
    ALLOWED_ORIGINS: BLOG_ORIGIN,
    BLOG_ORIGIN,
    AI_RATE_LIMITER: { limit: async () => ({ success: true }) },
    ...overrides,
  };
}

function createRequest(body) {
  return new Request(WORKER_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: BLOG_ORIGIN,
    },
    body: JSON.stringify(body),
  });
}

function mockTurnstile() {
  return async (url) => {
    assert.equal(String(url), "https://challenges.cloudflare.com/turnstile/v0/siteverify");
    return Response.json({
      success: true,
      hostname: "thinkerqaq.github.io",
      action: "ask_blog",
    });
  };
}

test("accepts the compact question and token request", async () => {
  const request = createRequest({
    question: `Go CAS 为什么无锁？${"中".repeat(900)}`,
    turnstileToken: "diagnostic-token",
  });

  assert.ok(Number(request.headers.get("content-length") || 0) === 0);
  const response = await worker.fetch(request, createEnv());

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: "Security verification is temporarily unavailable.",
  });
});

test("reports a missing AI Search binding as a service failure", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockTurnstile();

  try {
    const response = await worker.fetch(
      createRequest({ question: "Go CAS 为什么无锁", turnstileToken: "valid-token" }),
      createEnv({ TURNSTILE_SECRET_KEY: "test-secret" }),
    );

    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), {
      error: "本站检索服务暂时不可用。",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("uses article authority metadata, hybrid boosting, and canonical titles", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockTurnstile();
  let searchOptions;

  try {
    const response = await worker.fetch(
      createRequest({ question: "Go CAS 为什么无锁", turnstileToken: "valid-token" }),
      createEnv({
        TURNSTILE_SECRET_KEY: "test-secret",
        AI_SEARCH: {
          get: () => ({
            search: async (options) => {
              searchOptions = options;
              return {
                chunks: [{
                  text: "CAS 是一种原子条件更新原语，本身不是锁。",
                  item: {
                    key: "blog--articles--h-0123456789abcdef0123456789abcdef.md",
                    metadata: {
                      source_url: `${BLOG_ORIGIN}/articles/concurrency-series-06-atomic-implementation/`,
                      title: "并发编程（六）：Atomic 的实现——从 Runtime 到 CPU",
                      collection: "articles",
                      priority: 2,
                      schema_version: 2,
                    },
                  },
                }],
              };
            },
          }),
        },
        AI: {
          run: async (_model, options) => {
            assert.match(options.messages[0].content, /Articles are curated explanatory content/);
            assert.match(options.messages[0].content, /Keep abstraction levels distinct/);
            assert.match(options.messages[1].content, /TYPE: article/);
            assert.match(options.messages[1].content, /CAS 是一种原子条件更新原语/);
            return { response: "CAS 本身不是锁；它提供原子的条件更新能力。[1]" };
          },
        },
      }),
    );

    assert.equal(searchOptions.query, "Go CAS 为什么无锁");
    assert.equal(searchOptions.ai_search_options.retrieval.retrieval_type, "hybrid");
    assert.equal(searchOptions.ai_search_options.retrieval.fusion_method, "rrf");
    assert.equal(searchOptions.ai_search_options.retrieval.max_num_results, 20);
    assert.deepEqual(searchOptions.ai_search_options.retrieval.boost_by, [
      { field: "priority", direction: "desc" },
    ]);
    assert.equal(searchOptions.ai_search_options.query_rewrite.enabled, false);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      answer: "CAS 本身不是锁；它提供原子的条件更新能力。[1]",
      retrieval: "ai-search-hybrid",
      sources: [{
        title: "并发编程（六）：Atomic 的实现——从 Runtime 到 CPU",
        url: `${BLOG_ORIGIN}/articles/concurrency-series-06-atomic-implementation/`,
        collection: "articles",
      }],
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("does not use a chunk heading as a source title when canonical metadata is missing", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockTurnstile();
  let aiCalled = false;

  try {
    const response = await worker.fetch(
      createRequest({ question: "CAS", turnstileToken: "valid-token" }),
      createEnv({
        TURNSTILE_SECRET_KEY: "test-secret",
        AI_SEARCH: {
          get: () => ({
            search: async () => ({
              chunks: [{
                text: "## 0. 这一篇继续回答什么？\nCAS 内容",
                item: {
                  key: "blog--articles--concurrency-series-06-atomic-implementation.md",
                  metadata: {
                    source_url: `${BLOG_ORIGIN}/articles/concurrency-series-06-atomic-implementation/`,
                    collection: "articles",
                  },
                },
              }],
            }),
          }),
        },
        AI: {
          run: async () => {
            aiCalled = true;
            return { response: "should not happen" };
          },
        },
      }),
    );

    assert.equal(response.status, 404);
    assert.equal(aiCalled, false);
    assert.deepEqual(await response.json(), { error: "本站暂未检索到相关内容。" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects a streamed request body above the 16 KiB hard limit", async () => {
  let limiterCalled = false;
  const request = createRequest({
    question: "test",
    sources: [],
    turnstileToken: "x".repeat(20 * 1024),
  });
  const response = await worker.fetch(request, createEnv({
    AI_RATE_LIMITER: {
      limit: async () => {
        limiterCalled = true;
        return { success: true };
      },
    },
  }));

  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), { error: "Request too large" });
  assert.equal(limiterCalled, false);
});

test("proxies the Umami tracker script through the Worker", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), "https://cloud.umami.is/script.js");
    assert.match(options.headers.accept, /javascript/);
    return new Response("window.umami = { track() {} };", {
      status: 200,
      headers: { "content-type": "application/javascript" },
    });
  };

  try {
    const response = await worker.fetch(
      new Request("https://example.workers.dev/u.js"),
      createEnv(),
    );

    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /javascript/);
    assert.match(response.headers.get("cache-control"), /max-age=300/);
    assert.match(await response.text(), /window\.umami/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("proxies Umami collection only for the production blog origin", async () => {
  const originalFetch = globalThis.fetch;
  let forwardedBody = "";
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), "https://gateway.umami.is/api/send");
    assert.equal(options.method, "POST");
    assert.equal(options.headers.get("origin"), BLOG_ORIGIN);
    forwardedBody = new TextDecoder().decode(options.body);
    return Response.json({ ok: true });
  };

  try {
    const payload = JSON.stringify({ type: "event", payload: { website: "test" } });
    const response = await worker.fetch(
      new Request("https://example.workers.dev/api/send", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: BLOG_ORIGIN,
        },
        body: payload,
      }),
      createEnv(),
    );

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("access-control-allow-origin"), BLOG_ORIGIN);
    assert.equal(forwardedBody, payload);

    const rejected = await worker.fetch(
      new Request("https://example.workers.dev/api/send", {
        method: "POST",
        headers: { origin: "https://example.com" },
        body: payload,
      }),
      createEnv(),
    );
    assert.equal(rejected.status, 403);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
