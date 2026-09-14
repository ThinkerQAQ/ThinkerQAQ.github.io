import assert from "node:assert/strict";
import test from "node:test";

import worker from "./worker.js";

const BLOG_ORIGIN = "https://thinkerqaq.github.io";
const WORKER_ORIGIN = "https://example.workers.dev";

function env() {
  return {
    BLOG_ORIGIN,
    ALLOWED_ORIGINS: BLOG_ORIGIN,
  };
}

test("allows the current Umami tracker headers in CORS preflight", async () => {
  const response = await worker.fetch(
    new Request(`${WORKER_ORIGIN}/api/send`, {
      method: "OPTIONS",
      headers: {
        origin: BLOG_ORIGIN,
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type,x-umami-website-id,x-umami-hostname,x-umami-cache",
      },
    }),
    env(),
  );

  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), BLOG_ORIGIN);
  const allowed = response.headers.get("access-control-allow-headers") || "";
  for (const header of [
    "content-type",
    "x-umami-website-id",
    "x-umami-hostname",
    "x-umami-cache",
  ]) {
    assert.match(allowed, new RegExp(`(?:^|,)${header}(?:,|$)`));
  }
});

test("forwards Umami tracker identity and session headers to Cloud", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), "https://gateway.umami.is/api/send");
    assert.equal(options.headers.get("x-umami-website-id"), "website-id");
    assert.equal(options.headers.get("x-umami-hostname"), "thinkerqaq.github.io");
    assert.equal(options.headers.get("x-umami-cache"), "session-cache");
    return Response.json({ cache: "next-cache" });
  };

  try {
    const response = await worker.fetch(
      new Request(`${WORKER_ORIGIN}/api/send`, {
        method: "POST",
        headers: {
          origin: BLOG_ORIGIN,
          "content-type": "application/json",
          "x-umami-website-id": "website-id",
          "x-umami-hostname": "thinkerqaq.github.io",
          "x-umami-cache": "session-cache",
        },
        body: JSON.stringify({
          type: "event",
          payload: {
            website: "website-id",
            hostname: "thinkerqaq.github.io",
            url: `${BLOG_ORIGIN}/`,
          },
        }),
      }),
      env(),
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { cache: "next-cache" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
