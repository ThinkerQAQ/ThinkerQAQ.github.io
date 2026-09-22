import assert from "node:assert/strict";
import test from "node:test";

import { handleUmamiShareReport } from "./umami-share-report.js";

const SHARE = "rroJe4zvqujFgYS0";
const WEBSITE_ID = "11111111-1111-4111-8111-111111111111";

function responseForMetric(type, startAt) {
  const recent = startAt > 1_000_000;
  const values = {
    path: recent
      ? [{ x: "/articles/example/", y: 2 }]
      : [{ x: "/", y: 1 }],
    entry: recent
      ? [{ x: "/articles/example/", y: 2 }]
      : [{ x: "/", y: 1 }],
    referrer: recent
      ? [{ x: "google.com", y: 1 }]
      : [],
    channel: recent
      ? [{ x: "Organic Search", y: 1 }, { x: "Direct", y: 1 }]
      : [{ x: "Direct", y: 1 }],
    country: recent
      ? [{ x: "CN", y: 1 }, { x: "US", y: 1 }]
      : [{ x: "US", y: 1 }],
    event: recent
      ? [{ x: "engaged_read", y: 1 }]
      : [],
    utmSource: recent
      ? [{ x: "csdn", y: 1 }]
      : [],
  };
  return values[type] || [];
}

test("builds an hourly report from an Umami public share token", async () => {
  const originalFetch = globalThis.fetch;
  const originalNow = Date.now;
  Date.now = () => 7_200_000;

  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(String(input));

    if (url.pathname === `/api/share/${SHARE}`) {
      return Response.json({
        websiteId: WEBSITE_ID,
        token: "share-token",
        parameters: {
          overview: true,
          events: true,
          breakdown: true,
          utm: true,
        },
      });
    }

    assert.equal(options.headers["x-umami-share-token"], "share-token");
    assert.equal(options.headers["x-umami-share-context"], "1");

    if (url.pathname === `/api/websites/${WEBSITE_ID}/stats`) {
      const recent = Number(url.searchParams.get("startAt")) > 1_000_000;
      return Response.json(
        recent
          ? { pageviews: 3, visitors: 2, visits: 2, bounces: 1, totaltime: 42 }
          : { pageviews: 1, visitors: 1, visits: 1, bounces: 1, totaltime: 0 },
      );
    }

    if (url.pathname === `/api/websites/${WEBSITE_ID}/metrics`) {
      const type = url.searchParams.get("type");
      const startAt = Number(url.searchParams.get("startAt"));
      return Response.json(responseForMetric(type, startAt));
    }

    return new Response("not found", { status: 404 });
  };

  try {
    const response = await handleUmamiShareReport(
      new Request(`https://worker.example/analytics/hourly?share=${SHARE}&hours=1`),
    );

    assert.equal(response.status, 200);
    const body = await response.json();

    assert.equal(body.windowHours, 1);
    assert.equal(body.current.stats.visitors, 2);
    assert.equal(body.previous.stats.visitors, 1);
    assert.equal(body.delta.stats.visitors, 1);
    assert.deepEqual(body.delta.newReferrers, [{ name: "google.com", count: 1 }]);
    assert.deepEqual(body.delta.newCountries, [{ name: "CN", count: 1 }]);
    assert.deepEqual(body.delta.newEvents, [{ name: "engaged_read", count: 1 }]);
    assert.deepEqual(body.delta.newUtmSources, [{ name: "csdn", count: 1 }]);
  } finally {
    Date.now = originalNow;
    globalThis.fetch = originalFetch;
  }
});

test("rejects an invalid share slug without making upstream requests", async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return new Response("unexpected", { status: 500 });
  };

  try {
    const response = await handleUmamiShareReport(
      new Request("https://worker.example/analytics/hourly?share=bad"),
    );
    assert.equal(response.status, 400);
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects report windows larger than 24 hours", async () => {
  const response = await handleUmamiShareReport(
    new Request(`https://worker.example/analytics/hourly?share=${SHARE}&hours=25`),
  );
  assert.equal(response.status, 400);
});
