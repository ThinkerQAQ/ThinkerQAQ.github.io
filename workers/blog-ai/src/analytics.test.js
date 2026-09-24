import assert from "node:assert/strict";
import test from "node:test";

import {
  analyticsInternals,
  handleAnalyticsRequest,
  runAnalyticsCron,
} from "./analytics.js";
import policyWorker from "./policy-worker.js";

const SHARE = "rroJe4zvqujFgYS0";
const WEBSITE_ID = "11111111-1111-4111-8111-111111111111";

class MemoryKv {
  constructor(entries = {}) {
    this.data = new Map(Object.entries(entries));
  }

  async get(key) {
    return this.data.get(key) ?? null;
  }

  async put(key, value) {
    this.data.set(key, String(value));
  }
}

function installUmamiFetch() {
  const originalFetch = globalThis.fetch;
  let calls = 0;

  globalThis.fetch = async input => {
    calls += 1;
    const url = new URL(String(input));

    if (url.pathname === `/api/share/${SHARE}`) {
      return Response.json({
        websiteId: WEBSITE_ID,
        token: "share-token",
      });
    }

    const startAt = Number(url.searchParams.get("startAt"));
    const hour = new Date(startAt).getUTCHours();

    if (url.pathname === `/api/websites/${WEBSITE_ID}/stats`) {
      return Response.json({
        pageviews: hour + 2,
        visitors: hour + 1,
        visits: hour + 1,
        bounces: hour % 2,
        totaltime: hour * 10,
      });
    }

    if (url.pathname === `/api/websites/${WEBSITE_ID}/metrics`) {
      const type = url.searchParams.get("type");
      const rows = {
        path: [{ x: `/hour-${hour}/`, y: 1 }],
        entry: [{ x: `/hour-${hour}/`, y: 1 }],
        referrer: [],
        channel: [{ x: "direct", y: hour + 1 }],
        country: [{ x: "SG", y: hour + 1 }],
        region: [],
        city: [{ x: "Singapore", y: hour + 1, country: "SG" }],
        event: [{ x: "engaged_read", y: 1 }],
        utmSource: [],
      };
      return Response.json(rows[type] || []);
    }

    return new Response("not found", { status: 404 });
  };

  return {
    restore() {
      globalThis.fetch = originalFetch;
    },
    calls() {
      return calls;
    },
  };
}

function env(kv) {
  return {
    ANALYTICS_KV: kv,
    UMAMI_SHARE_SLUG: SHARE,
    ANALYTICS_TIMEZONE_OFFSET_MINUTES: "480",
  };
}

test("cron backfills missing complete hours and persists latest report", async () => {
  const lastFinalizedHourEnd = Date.parse("2026-09-24T01:00:00Z");
  const kv = new MemoryKv({
    [analyticsInternals.META_KEY]: JSON.stringify({
      lastFinalizedHourEnd,
      lastSuccessAt: "2026-09-24T01:07:00.000Z",
    }),
  });
  const umami = installUmamiFetch();

  try {
    const scheduledTime = Date.parse("2026-09-24T05:07:00Z");
    const { latest, meta } = await runAnalyticsCron(env(kv), scheduledTime);

    assert.equal(meta.processedHours, 4);
    assert.equal(meta.pendingHours, 0);
    assert.equal(meta.lastFinalizedHourEnd, Date.parse("2026-09-24T05:00:00Z"));

    for (const hour of ["01", "02", "03", "04"]) {
      const key = `analytics:hour:2026-09-24T${hour}`;
      assert.ok(kv.data.has(key), `expected persisted bucket ${key}`);
    }

    assert.equal(latest.current.startAt, Date.parse("2026-09-24T04:00:00Z"));
    assert.equal(latest.previous.startAt, Date.parse("2026-09-24T03:00:00Z"));
    assert.equal(latest.current.stats.visitors, 5);
    assert.equal(latest.delta.stats.visitors, 1);
    assert.deepEqual(latest.current.events, [{ name: "engaged_read", count: 1 }]);

    // One share lookup plus 10 Umami requests for each of four hourly buckets.
    assert.equal(umami.calls(), 41);
  } finally {
    umami.restore();
  }
});

test("cron bootstrap collects two buckets so current and previous are immediately available", async () => {
  const kv = new MemoryKv();
  const umami = installUmamiFetch();

  try {
    const scheduledTime = Date.parse("2026-09-24T05:07:00Z");
    const { latest, meta } = await runAnalyticsCron(env(kv), scheduledTime);

    assert.equal(meta.processedHours, 2);
    assert.equal(meta.pendingHours, 0);
    assert.equal(latest.current.startAt, Date.parse("2026-09-24T04:00:00Z"));
    assert.equal(latest.previous.startAt, Date.parse("2026-09-24T03:00:00Z"));
    assert.equal(umami.calls(), 21);
  } finally {
    umami.restore();
  }
});


test("deployed policy entrypoint forwards scheduled events to analytics cron", async () => {
  const kv = new MemoryKv();
  const umami = installUmamiFetch();

  try {
    const scheduledTime = Date.parse("2026-09-24T05:07:00Z");
    await policyWorker.scheduled({ scheduledTime }, env(kv), {});

    const meta = JSON.parse(await kv.get(analyticsInternals.META_KEY));
    assert.equal(meta.lastFinalizedHourEnd, Date.parse("2026-09-24T05:00:00Z"));
    assert.equal(meta.pendingHours, 0);
    assert.ok(kv.data.has(analyticsInternals.LATEST_KEY));
  } finally {
    umami.restore();
  }
});

test("today endpoint uses Asia/Shanghai-style offset and persists a short-lived exact report", async () => {
  const kv = new MemoryKv();
  const umami = installUmamiFetch();
  const originalNow = Date.now;
  const now = Date.parse("2026-09-24T05:10:00Z");
  Date.now = () => now;

  try {
    const request = new Request("https://example.workers.dev/analytics/today");
    const first = await handleAnalyticsRequest(request, env(kv), {});
    assert.equal(first.status, 200);
    const report = await first.json();

    assert.equal(report.date, "2026-09-24");
    assert.equal(report.timezoneOffsetMinutes, 480);
    assert.equal(report.current.startAt, Date.parse("2026-09-23T16:00:00Z"));
    assert.equal(report.current.endAt, now);
    assert.ok(kv.data.has("analytics:today:2026-09-24"));

    const callsAfterFirst = umami.calls();
    const second = await handleAnalyticsRequest(request, env(kv), {});
    assert.equal(second.status, 200);
    assert.equal(umami.calls(), callsAfterFirst);
  } finally {
    Date.now = originalNow;
    umami.restore();
  }
});

test("hourly and health endpoints read persisted KV without calling Umami", async () => {
  const latest = {
    generatedAt: "2026-09-24T05:07:00.000Z",
    current: { stats: { visitors: 2 } },
    previous: { stats: { visitors: 1 } },
    delta: { stats: { visitors: 1 } },
  };
  const lastFinalizedHourEnd = Date.parse("2026-09-24T05:00:00Z");
  const kv = new MemoryKv({
    [analyticsInternals.LATEST_KEY]: JSON.stringify(latest),
    [analyticsInternals.META_KEY]: JSON.stringify({
      lastFinalizedHourEnd,
      lastSuccessAt: "2026-09-24T05:07:00.000Z",
      lastError: null,
    }),
  });
  const originalNow = Date.now;
  Date.now = () => Date.parse("2026-09-24T05:20:00Z");

  try {
    const hourly = await handleAnalyticsRequest(
      new Request("https://example.workers.dev/analytics/hourly"),
      env(kv),
      {},
    );
    assert.deepEqual(await hourly.json(), latest);

    const health = await handleAnalyticsRequest(
      new Request("https://example.workers.dev/analytics/health"),
      env(kv),
      {},
    );
    const body = await health.json();
    assert.equal(body.healthy, true);
    assert.equal(body.pendingHours, 0);

    Date.now = () => Date.parse("2026-09-24T06:06:00Z");
    const graceHealth = await handleAnalyticsRequest(
      new Request("https://example.workers.dev/analytics/health"),
      env(kv),
      {},
    );
    const graceBody = await graceHealth.json();
    assert.equal(graceBody.healthy, true);
    assert.equal(graceBody.pendingHours, 0);

    Date.now = () => Date.parse("2026-09-24T06:30:00Z");
    const staleHealth = await handleAnalyticsRequest(
      new Request("https://example.workers.dev/analytics/health"),
      env(kv),
      {},
    );
    const staleBody = await staleHealth.json();
    assert.equal(staleBody.healthy, false);
    assert.equal(staleBody.pendingHours, 1);
  } finally {
    Date.now = originalNow;
  }
});
