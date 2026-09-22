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


test("forwards Cloudflare visitor geography to Umami Cloud without trusting client geo headers", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), "https://gateway.umami.is/api/send");
    assert.equal(options.headers.get("x-umami-client-country"), "CN");
    assert.equal(options.headers.get("x-umami-client-region"), "GD");
    assert.equal(options.headers.get("x-umami-client-city"), encodeURIComponent("深圳"));
    assert.equal(options.headers.get("cf-connecting-ip"), null);
    assert.equal(options.headers.get("x-forwarded-for"), null);
    return Response.json({ ok: true });
  };

  try {
    const request = new Request(`${WORKER_ORIGIN}/api/send`, {
      method: "POST",
      headers: {
        origin: BLOG_ORIGIN,
        "content-type": "application/json",
        "x-umami-website-id": "website-id",
        "x-umami-client-country": "US",
        "x-umami-client-region": "CA",
        "x-umami-client-city": "Spoofed",
      },
      body: JSON.stringify({
        type: "event",
        payload: {
          website: "website-id",
          hostname: "thinkerqaq.github.io",
          url: `${BLOG_ORIGIN}/articles/example/`,
        },
      }),
    });
    Object.defineProperty(request, "cf", {
      value: {
        country: "CN",
        regionCode: "GD",
        city: "深圳",
      },
    });

    const response = await worker.fetch(request, env());

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("omits Umami client geo headers when Cloudflare geo metadata is unavailable", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.headers.get("x-umami-client-country"), null);
    assert.equal(options.headers.get("x-umami-client-region"), null);
    assert.equal(options.headers.get("x-umami-client-city"), null);
    return Response.json({ ok: true });
  };

  try {
    const response = await worker.fetch(
      new Request(`${WORKER_ORIGIN}/api/send`, {
        method: "POST",
        headers: {
          origin: BLOG_ORIGIN,
          "content-type": "application/json",
          "x-umami-website-id": "website-id",
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
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("returns Cloudflare request geography without exposing the client IP", async () => {
  const request = new Request(`${WORKER_ORIGIN}/debug/geo`, {
    headers: {
      "user-agent": "Mozilla/5.0 TestBrowser",
      "cf-connecting-ip": "203.0.113.10",
    },
  });

  Object.defineProperty(request, "cf", {
    value: {
      country: "CN",
      regionCode: "GD",
      city: "Meizhou",
      colo: "SJC",
      asn: 4134,
      asOrganization: "CHINANET",
      timezone: "Asia/Shanghai",
      httpProtocol: "HTTP/2",
      tlsVersion: "TLSv1.3",
    },
  });

  const response = await worker.fetch(request, env());

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");

  const body = await response.json();
  assert.deepEqual(body, {
    country: "CN",
    region: "GD",
    city: "Meizhou",
    colo: "SJC",
    asn: 4134,
    asOrganization: "CHINANET",
    timezone: "Asia/Shanghai",
    httpProtocol: "HTTP/2",
    tlsVersion: "TLSv1.3",
    userAgent: "Mozilla/5.0 TestBrowser",
  });
  assert.equal("ip" in body, false);
});
