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
    this.ttls = new Map();
  }
  async get(key) {
    return this.data.get(key) ?? null;
  }
  async put(key, value, options = {}) {
    this.data.set(key, String(value));
    if (options?.expirationTtl) this.ttls.set(key, options.expirationTtl);
  }
  async list({ prefix = "", limit = 1000 } = {}) {
    return {
      keys: [...this.data.keys()]
        .filter(key => key.startsWith(prefix))
        .slice(0, limit)
        .map(name => ({ name })),
      list_complete: true,
    };
  }
}

function installUmamiFetch() {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async input => {
    calls += 1;
    const url = new URL(String(input));

    if (url.pathname === "/api/share/" + SHARE) {
      return Response.json({ websiteId: WEBSITE_ID, token: "share-token" });
    }
    const hour = new Date(Number(url.searchParams.get("startAt"))).getUTCHours();
    if (url.pathname === "/api/websites/" + WEBSITE_ID + "/stats") {
      return Response.json({
        pageviews: hour + 2,
        visitors: hour + 1,
        visits: hour + 1,
        bounces: hour % 2,
        totaltime: hour * 10,
      });
    }
    if (url.pathname === "/api/websites/" + WEBSITE_ID + "/metrics") {
      const type = url.searchParams.get("type");
      const rows = {
        path: [{ x: "/hour-" + hour + "/", y: 1 }],
        entry: [{ x: "/hour-" + hour + "/", y: 1 }],
        referrer: [],
        channel: [{ x: "direct", y: hour + 1 }],
        country: [{ x: "SG", y: hour + 1 }],
        region: [{ x: "SG-01", y: hour + 1 }],
        city: [{ x: "Singapore", y: hour + 1, country: "SG" }],
        event: [{ x: "engaged_read", y: 1 }],
        utmSource: [],
      };
      return Response.json(rows[type] || []);
    }
    return new Response("not found", { status: 404 });
  };
  return {
    calls: () => calls,
    restore: () => { globalThis.fetch = originalFetch; },
  };
}

function env(kv) {
  return {
    ANALYTICS_KV: kv,
    UMAMI_SHARE_SLUG: SHARE,
    ANALYTICS_TIMEZONE_OFFSET_MINUTES: "480",
  };
}

function rangeRequest(endpoint, start, end) {
  const url = new URL("https://example.workers.dev/analytics/" + endpoint);
  if (start !== undefined) url.searchParams.set("start", start);
  if (end !== undefined) url.searchParams.set("end", end);
  return new Request(url);
}

test("Cron persists hourly and weekly snapshots with 7-day expiration", async () => {
  const kv = new MemoryKv({
    [analyticsInternals.META_KEY]: JSON.stringify({
      lastFinalizedHourEnd: Date.parse("2026-09-24T01:00:00Z"),
    }),
  });
  const umami = installUmamiFetch();
  try {
    const { meta } = await runAnalyticsCron(env(kv), Date.parse("2026-09-24T05:07:00Z"));
    assert.equal(meta.processedHours, 4);
    assert.equal(meta.pendingHours, 0);
    for (const hour of ["01", "02", "03", "04"]) {
      assert.equal(
        kv.ttls.get("analytics:hour:2026-09-24T" + hour),
        analyticsInternals.RANGE_TTL,
      );
    }
    for (const week of ["2026-09-14", "2026-09-07"]) {
      assert.equal(kv.ttls.get("analytics:week:" + week), 604800);
    }
    assert.equal(kv.data.has("analytics:weekly:latest"), false);
    assert.equal(kv.data.has("analytics:latest"), false);
    assert.equal(umami.calls(), 61);
  } finally {
    umami.restore();
  }
});

test("Scheduled entrypoint still persists bot observations", async () => {
  const kv = new MemoryKv();
  const umami = installUmamiFetch();
  try {
    await policyWorker.scheduled(
      { scheduledTime: Date.parse("2026-09-24T05:07:00Z") },
      env(kv),
      {},
    );
    assert.ok(kv.data.has("analytics:meta"));
    assert.ok(kv.data.has("analytics:bot:latest"));
    assert.ok(kv.data.has("analytics:hour:2026-09-24T04"));
  } finally {
    umami.restore();
  }
});

test("Hour range is exact, caches for 7 days, and does not sum unique visitors", async () => {
  const kv = new MemoryKv();
  const umami = installUmamiFetch();
  const now = Date.now;
  Date.now = () => Date.parse("2026-09-25T08:00:00Z");
  try {
    const req = rangeRequest("hour-range", "2026-09-24T01:00:00Z", "2026-09-24T03:00:00Z");
    const response = await handleAnalyticsRequest(req, env(kv), {});
    assert.equal(response.status, 200);
    const report = await response.json();
    assert.equal(report.granularity, "hour");
    assert.equal(report.range.startAt, Date.parse("2026-09-24T01:00:00Z"));
    assert.equal(report.range.endAt, Date.parse("2026-09-24T04:00:00Z") - 1);
    assert.equal(report.window.stats.visitors, 2);
    assert.equal(report.window.stats.pageviews, 3);
    assert.equal(report.source, "umami");
    assert.equal(report.window.regions, undefined);
    assert.equal(report.window.cities, undefined);
    assert.equal(report.window.paths[0].name, "/hour-1/");
    assert.equal(umami.calls(), 11);
    assert.equal(
      [...kv.ttls.values()].at(-1),
      analyticsInternals.RANGE_TTL,
    );
    const second = await handleAnalyticsRequest(req, env(kv), {});
    const secondReport = await second.json();
    assert.equal(secondReport.source, "kv");
    assert.equal(umami.calls(), 11);
  } finally {
    Date.now = now;
    umami.restore();
  }
});

test("Day range uses UTC+8 calendar boundaries, not UTC midnight", async () => {
  const kv = new MemoryKv();
  const umami = installUmamiFetch();
  const now = Date.now;
  Date.now = () => Date.parse("2026-09-28T08:00:00Z");
  try {
    const req = rangeRequest("day-range", "2026-09-24", "2026-09-25");
    const report = await (await handleAnalyticsRequest(req, env(kv), {})).json();
    assert.equal(report.range.startAt, Date.parse("2026-09-23T16:00:00Z"));
    assert.equal(report.range.endAt, Date.parse("2026-09-25T16:00:00Z") - 1);
    assert.equal(report.timezoneOffsetMinutes, 480);
    assert.equal(report.window.stats.visitors, 17);
    assert.equal(report.window.regions, undefined);
    assert.equal(umami.calls(), 11);
  } finally {
    Date.now = now;
    umami.restore();
  }
});

test("Day range defaults to current partial day without writing unstable cache", async () => {
  const kv = new MemoryKv();
  const umami = installUmamiFetch();
  const now = Date.now;
  Date.now = () => Date.parse("2026-09-24T05:10:00Z");
  try {
    const report = await (await handleAnalyticsRequest(
      rangeRequest("day-range"), env(kv), {},
    )).json();
    assert.equal(report.range.startAt, Date.parse("2026-09-23T16:00:00Z"));
    assert.equal(report.range.endAt, Date.parse("2026-09-24T05:10:00Z"));
    assert.equal(report.range.complete, false);
    assert.equal(kv.ttls.size, 0);
  } finally {
    Date.now = now;
    umami.restore();
  }
});

test("Weekly range uses Monday in UTC+8 and reuses Cron week key", async () => {
  const now = Date.now;
  Date.now = () => Date.parse("2026-10-05T08:00:00Z");
  const cached = {
    startAt: Date.parse("2026-09-20T16:00:00Z"),
    endAt: Date.parse("2026-09-27T16:00:00Z") - 1,
    stats: { visitors: 9, pageviews: 13 },
    regions: [{ name: "SG-01", count: 9 }],
  };
  const kv = new MemoryKv({
    [analyticsInternals.weekKey("2026-09-21")]: JSON.stringify(cached),
  });
  try {
    const report = await (await handleAnalyticsRequest(
      rangeRequest("weekly-range", "2026-09-21", "2026-09-21"),
      env(kv), {},
    )).json();
    assert.equal(report.source, "kv");
    assert.equal(report.range.startAt, cached.startAt);
    assert.equal(report.window.stats.visitors, 9);
    assert.equal(report.window.regions, undefined);
    const defaultWeek = await (await handleAnalyticsRequest(
      rangeRequest("weekly-range"), env(kv), {},
    )).json();
    assert.equal(defaultWeek.range.start, "2026-09-28");
  } finally {
    Date.now = now;
  }
});

test("Invalid and excessive ranges return 400; retired paths return 404", async () => {
  const kv = new MemoryKv();
  const requests = [
    ["day-range", "2026-02-30", "2026-03-01"],
    ["day-range", "2026-09-24", undefined],
    ["day-range", "2026-09-27", "2026-09-24"],
    ["day-range", "2026-09-01", "2026-10-10"],
    ["weekly-range", "2026-09-22", "2026-09-22"],
    ["hour-range", "2026-09-24T01:30:00Z", "2026-09-24T02:00:00Z"],
  ];
  for (const [endpoint, start, end] of requests) {
    const response = await handleAnalyticsRequest(
      rangeRequest(endpoint, start, end), env(kv), {},
    );
    assert.equal(response.status, 400, endpoint + " " + start);
  }
  for (const endpoint of ["hourly", "today", "weekly"]) {
    assert.equal(
      (await handleAnalyticsRequest(rangeRequest(endpoint), env(kv), {})).status,
      404,
    );
  }
});

test("Health preserves its existing contract", async () => {
  const kv = new MemoryKv({
    [analyticsInternals.META_KEY]: JSON.stringify({
      lastFinalizedHourEnd: Date.parse("2026-09-24T05:00:00Z"),
      lastSuccessAt: "2026-09-24T05:07:00.000Z",
      lastError: null,
    }),
  });
  const originalNow = Date.now;
  Date.now = () => Date.parse("2026-09-24T05:20:00Z");
  try {
    const result = await (await handleAnalyticsRequest(
      new Request("https://example.workers.dev/analytics/health"),
      env(kv), {},
    )).json();
    assert.equal(result.healthy, true);
    assert.equal(result.pendingHours, 0);
    assert.equal(result.lastFinalizedHourEnd, undefined);
    assert.equal(result.lastError, undefined);
  } finally {
    Date.now = originalNow;
  }
});
