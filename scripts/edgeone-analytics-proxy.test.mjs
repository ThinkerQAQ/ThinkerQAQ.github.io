import assert from "node:assert/strict";
import test from "node:test";
import handler from "../edge-functions/api/send.js";

const origin = "https://thinkerqaq.com";
const api = origin + "/api/send";
function beacon(overrides = {}) {
  return new Request(api, {
    method: "POST",
    headers: {
      origin, "content-type": "application/json",
      "x-umami-website-id": "website-id",
      "x-umami-hostname": "thinkerqaq.com",
      ...overrides.headers,
    },
    body: overrides.body ?? JSON.stringify({
      type: "event",
      payload: {
        website: "website-id",
        hostname: "thinkerqaq.com",
        url: origin + "/articles/example/",
      },
    }),
  });
}

test("forwards Umami beacon, real EdgeOne geo, and session cache", async () => {
  const prev = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.equal(url, "https://gateway.umami.is/api/send");
    assert.equal(options.method, "POST");
    assert.equal(options.headers.get("x-umami-website-id"), "website-id");
    assert.equal(options.headers.get("x-umami-hostname"), "thinkerqaq.com");
    assert.equal(options.headers.get("x-umami-cache"), "prior-cache");
    assert.equal(options.headers.get("x-forwarded-for"), "198.51.100.8");
    assert.equal(options.headers.get("x-umami-client-country"), "CN");
    assert.equal(options.headers.get("x-umami-client-region"), "CN-GD");
    assert.equal(options.headers.get("x-umami-client-city"), encodeURIComponent("深圳"));
    assert.equal(options.headers.get("cf-connecting-ip"), null);
    return Response.json({ cache: "next-cache" });
  };
  try {
    const req = beacon({ headers: {
      "x-umami-cache": "prior-cache",
      "x-forwarded-for": "203.0.113.99",
      "x-umami-client-country": "US",
    } });
    Object.defineProperty(req, "eo", { value: {
      clientIp: "198.51.100.8",
      geo: { countryCodeAlpha2: "CN", regionCode: "CN-GD", cityName: "深圳" },
    } });
    const response = await handler({ request: req });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), { cache: "next-cache" });
    assert.equal(calls, 1);
  } finally { globalThis.fetch = prev; }
});

test("rejects untrusted origins", async () => {
  const response = await handler({ request: beacon({ headers: { origin: "https://evil.test" } }) });
  assert.equal(response.status, 403);
});
test("rejects inconsistent website IDs", async () => {
  const response = await handler({ request: beacon({ headers: { "x-umami-website-id": "other-id" } }) });
  assert.equal(response.status, 400);
});
test("rejects oversized input", async () => {
  const response = await handler({ request: beacon({ body: "x".repeat(32769) }) });
  assert.equal(response.status, 413);
});
test("accepts CORS preflight for canonical origin", async () => {
  const response = await handler({ request: new Request(api, { method: "OPTIONS", headers: { origin } }) });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), origin);
});
test("rejects other methods", async () => {
  const response = await handler({ request: new Request(api, { method: "GET", headers: { origin } }) });
  assert.equal(response.status, 405);
});
test("reports upstream failure without leaking details", async () => {
  const prev = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("network"); };
  try {
    const response = await handler({ request: beacon() });
    assert.equal(response.status, 502);
    assert.equal(await response.text(), "Analytics upstream unavailable");
  } finally { globalThis.fetch = prev; }
});
