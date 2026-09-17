import assert from "node:assert/strict";
import test from "node:test";

import { createRetryingFetch } from "./run-ai-search-sync.mjs";

function retryable7017Response() {
  return new Response(JSON.stringify({
    success: false,
    errors: [{ code: 7017, message: "unable_to_connect_to_ai_search" }],
  }), {
    status: 503,
    headers: { "content-type": "application/json" },
  });
}

test("retries Cloudflare AI Search 7017 for mutating requests", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    if (calls === 1) return retryable7017Response();
    return new Response(JSON.stringify({ success: true, result: {} }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  const fetchWithRetry = createRetryingFetch(fetchImpl, {
    maxRetries: 2,
    retryBaseMs: 0,
    retryMaxMs: 0,
    requestTimeoutMs: 1000,
    logRetry: () => {},
  });

  const response = await fetchWithRetry("https://example.invalid/items", { method: "POST", body: "x" });
  assert.equal(response.status, 200);
  assert.equal(calls, 2);
});

test("does not retry an unrelated mutating 503", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return new Response(JSON.stringify({
      success: false,
      errors: [{ code: 9999, message: "different failure" }],
    }), { status: 503 });
  };

  const fetchWithRetry = createRetryingFetch(fetchImpl, {
    maxRetries: 3,
    retryBaseMs: 0,
    retryMaxMs: 0,
    requestTimeoutMs: 1000,
    logRetry: () => {},
  });

  const response = await fetchWithRetry("https://example.invalid/items", { method: "POST", body: "x" });
  assert.equal(response.status, 503);
  assert.equal(calls, 1);
});

test("retries transient GET network failures", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    if (calls === 1) throw new TypeError("temporary network error");
    return new Response("ok", { status: 200 });
  };

  const fetchWithRetry = createRetryingFetch(fetchImpl, {
    maxRetries: 2,
    retryBaseMs: 0,
    retryMaxMs: 0,
    requestTimeoutMs: 1000,
    logRetry: () => {},
  });

  const response = await fetchWithRetry("https://example.invalid/stats");
  assert.equal(response.status, 200);
  assert.equal(calls, 2);
});

test("logs endpoint and timeout context for a failed mutating request", async () => {
  const failures = [];
  const fetchImpl = async () => {
    throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
  };

  const fetchWithRetry = createRetryingFetch(fetchImpl, {
    maxRetries: 2,
    retryBaseMs: 0,
    retryMaxMs: 0,
    requestTimeoutMs: 1234,
    logRetry: () => {},
    logFailure: (details) => failures.push(details),
  });

  await assert.rejects(
    fetchWithRetry(
      "https://api.cloudflare.com/client/v4/accounts/secret-account/ai-search/instances/blog/items",
      { method: "POST", body: "x" },
    ),
    /timeout/,
  );

  assert.equal(failures.length, 1);
  assert.equal(failures[0].method, "POST");
  assert.equal(failures[0].endpoint, "/client/v4/accounts/:account/ai-search/instances/blog/items");
  assert.equal(failures[0].timeoutMs, 1234);
  assert.equal(failures[0].attempt, 1);
});
