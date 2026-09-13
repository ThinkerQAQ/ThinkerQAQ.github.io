import assert from "node:assert/strict";
import test from "node:test";

import worker from "./index.js";

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

test("answers a compact request using only server-side AI Search context", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.equal(String(url), "https://challenges.cloudflare.com/turnstile/v0/siteverify");
    return Response.json({
      success: true,
      hostname: "thinkerqaq.github.io",
      action: "ask_blog",
    });
  };

  try {
    const response = await worker.fetch(
      createRequest({ question: "Go CAS 为什么无锁", turnstileToken: "valid-token" }),
      createEnv({
        TURNSTILE_SECRET_KEY: "test-secret",
        AI_SEARCH: {
          get: () => ({
            search: async () => ({
              chunks: [{
                text: "# Go CAS\nCAS 通过原子比较并交换更新共享状态。",
                item: { key: "blog--articles--concurrency-series-05-atomic-cas.md" },
              }],
            }),
          }),
        },
        AI: {
          run: async (_model, options) => {
            assert.match(options.messages[1].content, /CAS 通过原子比较并交换/);
            return { response: "CAS 通过原子比较并交换更新共享状态。[1]" };
          },
        },
      }),
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      answer: "CAS 通过原子比较并交换更新共享状态。[1]",
      retrieval: "ai-search-hybrid",
      sources: [{
        title: "Go CAS",
        url: `${BLOG_ORIGIN}/articles/concurrency-series-05-atomic-cas/`,
      }],
    });
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
