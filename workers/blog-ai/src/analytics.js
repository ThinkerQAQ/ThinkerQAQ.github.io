const UMAMI_API_ORIGIN = "https://gateway-us.umami.is/api";
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;
const METRIC_LIMIT = 100;
const MAX_BACKFILL_HOURS = 4;
const RANGE_TTL = 7 * 24 * 60 * 60;
const SETTLE_MS = 2 * HOUR_MS;
const HEALTH_GRACE_MS = 15 * 60 * 1000;
const PUBLIC_CACHE_VERSION = "3";

const META_KEY = "analytics:meta";
const HOUR_PREFIX = "analytics:hour:";
const WEEK_PREFIX = "analytics:week:";

const METRIC_TYPES = Object.freeze({
  paths: "path",
  entryPages: "entry",
  referrers: "referrer",
  channels: "channel",
  countries: "country",
  regions: "region",
  cities: "city",
  events: "event",
  utmSources: "utmSource",
});

function toNumber(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function normalizeMetricRows(rows) {
  if (!Array.isArray(rows)) return [];

  return rows
    .map(row => ({
      name: String(row?.x ?? ""),
      count: toNumber(row?.y),
      ...(row?.country ? { country: String(row.country) } : {}),
    }))
    .filter(row => row.name)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function normalizeStats(data) {
  return {
    pageviews: toNumber(data?.pageviews),
    visitors: toNumber(data?.visitors),
    visits: toNumber(data?.visits),
    bounces: toNumber(data?.bounces),
    totaltime: toNumber(data?.totaltime),
  };
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Umami request failed: ${response.status}${detail ? ` ${detail.slice(0, 200)}` : ""}`,
    );
  }
  return response.json();
}

async function resolveShare(slug) {
  if (!/^[a-zA-Z0-9]{8,50}$/.test(slug || "")) {
    throw new Error("Invalid Umami share slug.");
  }

  const data = await fetchJson(
    `${UMAMI_API_ORIGIN}/share/${encodeURIComponent(slug)}`,
    { headers: { accept: "application/json" } },
  );

  if (!data?.websiteId || !data?.token) {
    throw new Error("The Umami share does not expose a website token.");
  }

  return {
    websiteId: String(data.websiteId),
    token: String(data.token),
  };
}

function shareHeaders(token) {
  return {
    accept: "application/json",
    "x-umami-share-token": token,
    "x-umami-share-context": "1",
  };
}

function analyticsUrl(websiteId, resource, startAt, endAt, extra = {}) {
  const url = new URL(
    `${UMAMI_API_ORIGIN}/websites/${encodeURIComponent(websiteId)}/${resource}`,
  );
  url.searchParams.set("startAt", String(startAt));
  url.searchParams.set("endAt", String(endAt));

  for (const [key, value] of Object.entries(extra)) {
    if (value != null) url.searchParams.set(key, String(value));
  }

  return url;
}

async function fetchStats(share, startAt, endAt) {
  const data = await fetchJson(
    analyticsUrl(share.websiteId, "stats", startAt, endAt),
    { headers: shareHeaders(share.token) },
  );
  return normalizeStats(data);
}

async function fetchMetric(share, type, startAt, endAt) {
  const data = await fetchJson(
    analyticsUrl(share.websiteId, "metrics", startAt, endAt, {
      type,
      limit: METRIC_LIMIT,
    }),
    { headers: shareHeaders(share.token) },
  );
  return normalizeMetricRows(data);
}

async function fetchMetricOptional(share, label, type, startAt, endAt) {
  try {
    return {
      label,
      rows: await fetchMetric(share, type, startAt, endAt),
      warning: null,
    };
  } catch (error) {
    return {
      label,
      rows: [],
      warning: `${label}: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function collectWindow(share, startAt, endAt) {
  const statsPromise = fetchStats(share, startAt, endAt);
  const metricPromises = Object.entries(METRIC_TYPES).map(([label, type]) =>
    fetchMetricOptional(share, label, type, startAt, endAt),
  );

  const [stats, metricResults] = await Promise.all([
    statsPromise,
    Promise.all(metricPromises),
  ]);

  const window = {
    startAt,
    endAt,
    stats,
    warnings: [],
  };

  for (const result of metricResults) {
    window[result.label] = result.rows;
    if (result.warning) window.warnings.push(result.warning);
  }

  return window;
}

function publicWindow(window) {
  if (!window) return window;
  const { regions: _regions, cities: _cities, ...rest } = window;
  return rest;
}

function requireKv(env) {
  if (!env?.ANALYTICS_KV) {
    throw new Error("ANALYTICS_KV binding is required.");
  }
  return env.ANALYTICS_KV;
}

async function readJson(kv, key) {
  const value = await kv.get(key);
  return value ? JSON.parse(value) : null;
}

function writeJson(kv, key, value, ttl = 0) {
  return kv.put(key, JSON.stringify(value), ttl ? { expirationTtl: ttl } : undefined);
}

function floorHour(timestamp) {
  return Math.floor(timestamp / HOUR_MS) * HOUR_MS;
}

function hourKey(startAt) {
  return `${HOUR_PREFIX}${new Date(startAt).toISOString().slice(0, 13)}`;
}

function timezoneOffsetMinutes(env) {
  const offset = Number(env?.ANALYTICS_TIMEZONE_OFFSET_MINUTES ?? 480);
  return Number.isFinite(offset) ? offset : 480;
}

function localDateParts(timestamp, offsetMinutes) {
  const shifted = new Date(timestamp + offsetMinutes * 60 * 1000);
  return {
    date: shifted.toISOString().slice(0, 10),
    startAt:
      Date.UTC(
        shifted.getUTCFullYear(),
        shifted.getUTCMonth(),
        shifted.getUTCDate(),
      ) -
      offsetMinutes * 60 * 1000,
  };
}

function localWeekWindow(timestamp, offsetMinutes, weeksAgo = 1) {
  const offsetMs = offsetMinutes * 60 * 1000;
  const shifted = new Date(timestamp + offsetMs);
  const daysSinceMonday = (shifted.getUTCDay() + 6) % 7;
  const thisWeekStartShifted = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate() - daysSinceMonday,
  );
  const startShifted = thisWeekStartShifted - weeksAgo * WEEK_MS;
  const startAt = startShifted - offsetMs;

  return {
    weekStartDate: new Date(startShifted).toISOString().slice(0, 10),
    startAt,
    endAt: startAt + WEEK_MS - 1,
  };
}

function weekKey(weekStartDate) {
  return `${WEEK_PREFIX}${weekStartDate}`;
}

function pendingHours(lastFinalizedHourEnd, now, graceMs = 0) {
  if (!Number.isFinite(lastFinalizedHourEnd)) return null;
  const expectedHourEnd = floorHour(now - graceMs);
  return Math.max(
    0,
    Math.floor((expectedHourEnd - lastFinalizedHourEnd) / HOUR_MS),
  );
}

async function refreshWeekly(kv, share, scheduledTime, env) {
  const offsetMinutes = timezoneOffsetMinutes(env);
  const periods = [
    localWeekWindow(scheduledTime, offsetMinutes, 1),
    localWeekWindow(scheduledTime, offsetMinutes, 2),
  ];
  const windows = [];

  for (const period of periods) {
    const key = weekKey(period.weekStartDate);
    let window = await readJson(kv, key);

    if (!window) {
      window = {
        ...(await collectWindow(share, period.startAt, period.endAt)),
        weekStartDate: period.weekStartDate,
        timezoneOffsetMinutes: offsetMinutes,
      };
      await writeJson(kv, key, window, RANGE_TTL);
    }

    windows.push(window);
  }

  return windows;
}

export async function runAnalyticsCron(env, scheduledTime = Date.now()) {
  const kv = requireKv(env);
  const scheduledAt = new Date(scheduledTime).toISOString();
  let meta = (await readJson(kv, META_KEY)) || {};

  try {
    const share = await resolveShare(env.UMAMI_SHARE_SLUG || "");
    const finalHourEnd = floorHour(scheduledTime);
    let nextHourEnd = Number(meta.lastFinalizedHourEnd);

    if (Number.isFinite(nextHourEnd)) {
      nextHourEnd += HOUR_MS;
    } else {
      // Bootstrap two complete hourly buckets.
      nextHourEnd = finalHourEnd - HOUR_MS;
    }

    let processedHours = 0;
    while (
      nextHourEnd <= finalHourEnd &&
      processedHours < MAX_BACKFILL_HOURS
    ) {
      const startAt = nextHourEnd - HOUR_MS;
      const window = await collectWindow(share, startAt, nextHourEnd - 1);
      await writeJson(kv, hourKey(startAt), window, RANGE_TTL);

      meta = {
        ...meta,
        websiteId: share.websiteId,
        lastScheduledAt: scheduledAt,
        lastFinalizedHourEnd: nextHourEnd,
        lastError: null,
      };
      await writeJson(kv, META_KEY, meta);

      processedHours += 1;
      nextHourEnd += HOUR_MS;
    }

    await refreshWeekly(kv, share, scheduledTime, env);

    meta = {
      ...meta,
      websiteId: share.websiteId,
      lastScheduledAt: scheduledAt,
      lastSuccessAt: scheduledAt,
      processedHours,
      pendingHours: pendingHours(meta.lastFinalizedHourEnd, scheduledTime),
      lastError: null,
    };
    await writeJson(kv, META_KEY, meta);

    return { meta };
  } catch (error) {
    meta = {
      ...meta,
      lastScheduledAt: scheduledAt,
      lastError: error instanceof Error ? error.message : String(error),
    };
    await writeJson(kv, META_KEY, meta);
    throw error;
  }
}


const RANGE_ROUTES = Object.freeze({
  "/analytics/hour-range": "hour",
  "/analytics/day-range": "day",
  "/analytics/weekly-range": "week",
});

const RANGE_UNITS = {
  hour: { duration: HOUR_MS, max: 48 },
  day: { duration: DAY_MS, max: 31 },
  week: { duration: WEEK_MS, max: 12 },
};

function strictDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Date must use YYYY-MM-DD.");
  }
  const date = new Date(value + "T00:00:00Z");
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error("Invalid calendar date.");
  }
  return date.getTime();
}

function parseBucket(value, type, offsetMinutes) {
  if (type === "hour") {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:00(?::00(?:\.000)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
      throw new Error("Hourly boundary must be an ISO-8601 hour with timezone.");
    }
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp) || timestamp !== floorHour(timestamp)) {
      throw new Error("Invalid hourly boundary.");
    }
    return timestamp;
  }
  const utcMidnight = strictDate(value);
  if (type === "week" && new Date(utcMidnight).getUTCDay() !== 1) {
    throw new Error("Weekly dates must be Mondays.");
  }
  return utcMidnight - offsetMinutes * 60000;
}

function rangeLabel(timestamp, type, offsetMinutes) {
  if (type === "hour") return new Date(timestamp).toISOString();
  return new Date(timestamp + offsetMinutes * 60000).toISOString().slice(0, 10);
}

function parseRange(params, type, now, offsetMinutes) {
  const { duration, max } = RANGE_UNITS[type];
  const from = params.get("start");
  const to = params.get("end");
  if ((from === null) !== (to === null)) {
    throw new Error("Provide both start and end, or neither.");
  }

  let startAt, lastStart;
  if (from === null) {
    startAt = type === "hour"
      ? floorHour(now) - HOUR_MS
      : type === "day"
        ? localDateParts(now, offsetMinutes).startAt
        : localWeekWindow(now, offsetMinutes, 1).startAt;
    lastStart = startAt;
  } else {
    startAt = parseBucket(from, type, offsetMinutes);
    lastStart = parseBucket(to, type, offsetMinutes);
  }

  if (startAt > lastStart || (lastStart - startAt) / duration + 1 > max) {
    throw new Error("Range must contain 1 to " + max + " " + type + " buckets.");
  }
  if (lastStart > now) throw new Error("Range is in the future.");

  const nominalEnd = lastStart + duration - 1;
  return {
    type,
    offsetMinutes,
    start: rangeLabel(startAt, type, offsetMinutes),
    end: rangeLabel(lastStart, type, offsetMinutes),
    startAt,
    endAt: Math.min(now, nominalEnd),
    complete: nominalEnd <= now - SETTLE_MS,
    singleBucket: startAt === lastStart,
  };
}

async function collectRange(kv, env, range) {
  const { type, startAt, endAt, complete, singleBucket } = range;
  const key = ["analytics", "range", type, startAt, endAt].join(":");
  let window = complete ? await readJson(kv, key) : null;

  if (!window && complete && singleBucket) {
    if (type === "hour") window = await readJson(kv, hourKey(startAt));
    if (type === "week") window = await readJson(kv, weekKey(range.start));
  }
  if (window?.stats) {
    return { source: "kv", window };
  }

  const share = await resolveShare(env.UMAMI_SHARE_SLUG || "");
  window = await collectWindow(share, startAt, endAt);
  if (complete) {
    try {
      await writeJson(kv, key, window, RANGE_TTL);
    } catch (error) {
      console.warn("Analytics range cache write failed:", String(error));
    }
  }
  return { source: "umami", window };
}

function jsonResponse(data, { maxAge = 0, source, status = 200 } = {}) {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
  });
  if (maxAge > 0) headers.set("cache-control", `public, max-age=${maxAge}`);
  else headers.set("cache-control", "no-store");
  if (source) headers.set("x-analytics-source", source);

  return new Response(JSON.stringify(data, null, 2), { headers, status });
}

async function cachedJson(request, ctx, load, maxAge) {
  const cache = globalThis.caches?.default;
  const cacheUrl = new URL(request.url);
  cacheUrl.searchParams.set("__analytics_public", PUBLIC_CACHE_VERSION);
  const cacheRequest = new Request(cacheUrl, request);

  if (cache) {
    const hit = await cache.match(cacheRequest);
    if (hit) return hit;
  }

  const data = await load();
  const response = jsonResponse(data, { maxAge, source: data?.source });

  if (cache && ctx?.waitUntil) {
    ctx.waitUntil(cache.put(cacheRequest, response.clone()));
  }

  return response;
}

export async function handleAnalyticsRequest(request, env, ctx) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/analytics/")) return null;

  if (request.method !== "GET") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { allow: "GET" },
    });
  }

  const kv = requireKv(env);

  const type = RANGE_ROUTES[url.pathname];
  if (type) {
    let range;
    try {
      range = parseRange(url.searchParams, type, Date.now(), timezoneOffsetMinutes(env));
    } catch (error) {
      return jsonResponse(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 400 },
      );
    }
    return cachedJson(
      request,
      ctx,
      async () => {
        const report = await collectRange(kv, env, range);
        return {
          granularity: type,
          timezoneOffsetMinutes: range.offsetMinutes,
          range: {
            start: range.start,
            end: range.end,
            startAt: range.startAt,
            endAt: range.endAt,
            complete: range.complete,
          },
          generatedAt: new Date().toISOString(),
          source: report.source,
          window: publicWindow(report.window),
        };
      },
      range.complete ? 300 : 60,
    );
  }

  if (url.pathname === "/analytics/health") {
    const meta = (await readJson(kv, META_KEY)) || {};
    const now = Date.now();
    const pending = pendingHours(
      meta.lastFinalizedHourEnd,
      now,
      HEALTH_GRACE_MS,
    );
    const lastSuccessMs = Date.parse(meta.lastSuccessAt || "");
    const healthy =
      !meta.lastError &&
      pending === 0 &&
      Number.isFinite(lastSuccessMs) &&
      now - lastSuccessMs < 2 * HOUR_MS;

    return jsonResponse({
      healthy,
      now: new Date(now).toISOString(),
      lastSuccessAt: meta.lastSuccessAt || null,
      pendingHours: pending,
      hasError: Boolean(meta.lastError),
    });
  }

  return new Response("Not found", { status: 404 });
}

export const analyticsInternals = { HOUR_MS, META_KEY, hourKey, weekKey, localDateParts, localWeekWindow, parseRange, RANGE_TTL
};
