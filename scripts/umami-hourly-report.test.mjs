import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDelta,
  buildHourlyReport,
} from "./umami-hourly-report.mjs";

const SHARE = "rroJe4zvqujFgYS0";
const WEBSITE_ID = "11111111-1111-4111-8111-111111111111";

function metricRows(type, recent) {
  const current = {
    path: [{ x: "/articles/example/", y: 3 }],
    entry: [{ x: "/articles/example/", y: 2 }],
    referrer: [{ x: "google.com", y: 1 }],
    channel: [{ x: "Organic Search", y: 1 }, { x: "Direct", y: 1 }],
    country: [{ x: "CN", y: 1 }, { x: "US", y: 1 }],
    region: [{ x: "GD", y: 1, country: "CN" }],
    city: [{ x: "Shenzhen", y: 1, country: "CN" }],
    event: [{ x: "engaged_read", y: 1 }, { x: "read_milestone", y: 2 }],
    utmSource: [{ x: "csdn", y: 1 }],
  };
  const previous = {
    path: [{ x: "/", y: 1 }],
    entry: [{ x: "/", y: 1 }],
    referrer: [],
    channel: [{ x: "Direct", y: 1 }],
    country: [{ x: "US", y: 1 }],
    region: [],
    city: [],
    event: [],
    utmSource: [],
  };
  return (recent ? current : previous)[type] || [];
}

test("builds two adjacent hourly windows from the Umami share APIs", async () => {
  const originalFetch = globalThis.fetch;
  const now = 7_200_000;

  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(String(input));

    if (url.pathname === `/v1/share/${SHARE}`) {
      return Response.json({
        websiteId: WEBSITE_ID,
        token: "share-token",
        parameters: { overview: true, events: true, breakdown: true, utm: true },
      });
    }

    assert.equal(options.headers["x-umami-share-token"], "share-token");
    assert.equal(options.headers["x-umami-share-context"], "1");

    const startAt = Number(url.searchParams.get("startAt"));
    const recent = startAt >= 3_600_000;

    if (url.pathname === `/v1/websites/${WEBSITE_ID}/stats`) {
      return Response.json(
        recent
          ? { pageviews: 3, visitors: 2, visits: 2, bounces: 1, totaltime: 40 }
          : { pageviews: 1, visitors: 1, visits: 1, bounces: 1, totaltime: 0 },
      );
    }

    if (url.pathname === `/v1/websites/${WEBSITE_ID}/metrics`) {
      return Response.json(metricRows(url.searchParams.get("type"), recent));
    }

    return new Response("not found", { status: 404 });
  };

  try {
    const report = await buildHourlyReport({
      shareSlug: SHARE,
      hours: 1,
      now,
    });

    assert.equal(report.current.stats.visitors, 2);
    assert.equal(report.previous.stats.visitors, 1);
    assert.equal(report.delta.stats.visitors, 1);
    assert.deepEqual(report.delta.newReferrers, [
      { name: "google.com", count: 1 },
    ]);
    assert.deepEqual(report.delta.newCountries, [
      { name: "CN", count: 1 },
    ]);
    assert.deepEqual(report.delta.newRegions, [
      { name: "GD", count: 1, country: "CN" },
    ]);
    assert.deepEqual(report.delta.newEvents, [
      { name: "read_milestone", count: 2 },
      { name: "engaged_read", count: 1 },
    ]);
    assert.deepEqual(report.delta.newUtmSources, [
      { name: "csdn", count: 1 },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("delta identifies count changes and genuinely new dimensions", () => {
  const current = {
    stats: { pageviews: 3, visitors: 2, visits: 2, bounces: 1, totaltime: 30 },
    referrers: [{ name: "google.com", count: 2 }],
    paths: [],
    entryPages: [],
    channels: [],
    countries: [{ name: "CN", count: 1 }],
    regions: [],
    cities: [],
    events: [{ name: "engaged_read", count: 2 }],
    utmSources: [],
  };
  const previous = {
    stats: { pageviews: 1, visitors: 1, visits: 1, bounces: 1, totaltime: 0 },
    referrers: [{ name: "google.com", count: 1 }],
    paths: [],
    entryPages: [],
    channels: [],
    countries: [],
    regions: [],
    cities: [],
    events: [],
    utmSources: [],
  };

  const delta = buildDelta(current, previous);

  assert.deepEqual(delta.newReferrers, []);
  assert.equal(delta.changedReferrers[0].delta, 1);
  assert.deepEqual(delta.newCountries, [{ name: "CN", count: 1 }]);
  assert.deepEqual(delta.newEvents, [{ name: "engaged_read", count: 2 }]);
});
