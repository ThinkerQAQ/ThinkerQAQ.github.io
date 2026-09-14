import assert from "node:assert/strict";
import test from "node:test";

import { authorizeAskRequest } from "./security.js";
import { issueAskSession } from "./session.js";

const origin = "https://thinkerqaq.github.io";
const turnstileSecret = "local-turnstile-signing-value-0123456789";

function request() {
  return new Request("https://example.workers.dev/chat", {
    method: "POST",
    headers: {
      origin,
      "cf-connecting-ip": "203.0.113.10",
    },
  });
}

test("a valid Ask session skips Turnstile Siteverify", async () => {
  const token = (await issueAskSession(turnstileSecret, origin)).token;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("Turnstile should not be called for a valid Ask session");
  };

  try {
    const result = await authorizeAskRequest(
      { sessionToken: token },
      request(),
      { TURNSTILE_SECRET_KEY: turnstileSecret },
      origin,
      "test-trace",
    );
    assert.deepEqual(result, { ok: true, method: "session" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("the first Turnstile verification mints a reusable Ask session", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({
    success: true,
    hostname: "thinkerqaq.github.io",
    action: "ask_blog",
  });

  try {
    const result = await authorizeAskRequest(
      { turnstileToken: "valid-token", requestSession: true },
      request(),
      { TURNSTILE_SECRET_KEY: turnstileSecret },
      origin,
      "test-trace",
    );
    assert.equal(result.ok, true);
    assert.equal(result.method, "turnstile");
    assert.equal(typeof result.session?.token, "string");
    assert.ok(result.session?.expiresAt > Date.now() + 19 * 60 * 1000);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("an invalid session without Turnstile asks the browser to reverify", async () => {
  const result = await authorizeAskRequest(
    { sessionToken: "invalid.session" },
    request(),
    { TURNSTILE_SECRET_KEY: turnstileSecret },
    origin,
    "test-trace",
  );

  assert.deepEqual(result, {
    ok: false,
    status: 401,
    error: "需要重新进行安全验证。",
    requiresTurnstile: true,
  });
});
