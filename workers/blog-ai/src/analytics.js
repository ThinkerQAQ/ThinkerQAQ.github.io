const UMAMI_API_ORIGIN = "https://gateway-us.umami.is/api";
const HOUR_MS = 60 * 60 * 1000;
const METRIC_LIMIT = 100;
const MAX_BACKFILL_HOURS = 4;
const TODAY_CACHE_MS = 5 * 60 * 1000;
const HEALTH_GRACE_MS = 15 * 60 * 1000;

const META_KEY = "analytics:meta";
const LATEST_KEY = "analytics:latest";
const TODAY_PREFIX = "analytics:today:";
const HOUR_PREFIX = "analytics:hour:";

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

function keyed(rows) {
  return new Map(rows.map(row => [`${row.name}\u0000${row.country || ""}`, row]));
}

function newRows(current, previous) {
  const previousRows = keyed(previous);
  return current.filter(
    row => !previousRows.has(`${row.name}\u0000${row.country || ""}`),
  );
}

function changedRows(current, previous) {
  const previousRows = keyed(previous);
  return current
    .map(row => {
      const old = previousRows.get(`${row.name}\u0000${row.country || ""}`);
      const previousCount = old?.count || 0;
      return {
        ...row,
        previousCount,
        delta: row.count - previousCount,
      };
    })
    .filter(row => row.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

function statsDelta(current, previous) {
  return Object.fromEntries(
    Object.keys(current).map(key => [
      key,
      toNumber(current[key]) - toNumber(previous[key]),
    ]),
  );
}

export function buildDelta(current, previous) {
  const delta = {
    stats: statsDelta(current.stats, previous.stats),
  };

  for (const label of Object.keys(METRIC_TYPES)) {
    const suffix = `${label[0].toUpperCase()}${label.slice(1)}`;
    delta[`new${suffix}`] = newRows(current[label] || [], previous[label] || []);
    delta[`changed${suffix}`] = changedRows(
      current[label] || [],
      previous[label] || [],
    );
  }

  return delta;
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

function writeJson(kv, key, value) {
  return kv.put(key, JSON.stringify(value));
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

function emptyWindow(startAt, endAt) {
  return {
    startAt,
    endAt,
    stats: {
      pageviews: 0,
      visitors: 0,
      visits: 0,
      bounces: 0,
      totaltime: 0,
    },
    warnings: [],
    ...Object.fromEntries(Object.keys(METRIC_TYPES).map(label => [label, []])),
  };
}

function pendingHours(lastFinalizedHourEnd, now, graceMs = 0) {
  if (!Number.isFinite(lastFinalizedHourEnd)) return null;
  const expectedHourEnd = floorHour(now - graceMs);
  return Math.max(
    0,
    Math.floor((expectedHourEnd - lastFinalizedHourEnd) / HOUR_MS),
  );
}

async function refreshLatest(
  kv,
  websiteId,
  generatedAt,
  lastFinalizedHourEnd,
  freshWindows = new Map(),
) {
  if (!Number.isFinite(lastFinalizedHourEnd)) return null;

  const currentStart = lastFinalizedHourEnd - HOUR_MS;
  const previousStart = currentStart - HOUR_MS;
  const current =
    freshWindows.get(currentStart) ||
    (await readJson(kv, hourKey(currentStart)));
  if (!current) return null;

  const previous =
    freshWindows.get(previousStart) ||
    (await readJson(kv, hourKey(previousStart))) ||
    emptyWindow(previousStart, currentStart - 1);

  const latest = {
    generatedAt,
    websiteId,
    windowHours: 1,
    current,
    previous,
    delta: buildDelta(current, previous),
  };

  await writeJson(kv, LATEST_KEY, latest);
  return latest;
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
      // Bootstrap two complete buckets so /analytics/hourly has current + previous.
      nextHourEnd = finalHourEnd - HOUR_MS;
    }

    const freshWindows = new Map();
    let processedHours = 0;
    while (
      nextHourEnd <= finalHourEnd &&
      processedHours < MAX_BACKFILL_HOURS
    ) {
      const startAt = nextHourEnd - HOUR_MS;
      const window = await collectWindow(share, startAt, nextHourEnd - 1);
      freshWindows.set(startAt, window);
      await writeJson(kv, hourKey(startAt), window);

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

    const latest = await refreshLatest(
      kv,
      share.websiteId,
      scheduledAt,
      meta.lastFinalizedHourEnd,
      freshWindows,
    );

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

    return { latest, meta };
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

async function loadToday(env, now) {
  const kv = requireKv(env);
  const offsetMinutes = timezoneOffsetMinutes(env);
  const { date, startAt } = localDateParts(now, offsetMinutes);
  const key = `${TODAY_PREFIX}${date}`;
  const stored = await readJson(kv, key);

  if (
    stored &&
    Number.isFinite(stored.generatedAtMs) &&
    now - stored.generatedAtMs < TODAY_CACHE_MS
  ) {
    return stored;
  }

  const share = await resolveShare(env.UMAMI_SHARE_SLUG || "");
  const current = await collectWindow(share, startAt, now);
  const report = {
    generatedAt: new Date(now).toISOString(),
    generatedAtMs: now,
    websiteId: share.websiteId,
    date,
    timezoneOffsetMinutes: offsetMinutes,
    current,
  };
  await writeJson(kv, key, report);
  return report;
}

function jsonResponse(data, { maxAge = 0, source } = {}) {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
  });
  if (maxAge > 0) headers.set("cache-control", `public, max-age=${maxAge}`);
  else headers.set("cache-control", "no-store");
  if (source) headers.set("x-analytics-source", source);

  return new Response(JSON.stringify(data, null, 2), { headers });
}

async function cachedJson(request, ctx, load, maxAge) {
  const cache = globalThis.caches?.default;
  if (cache) {
    const hit = await cache.match(request);
    if (hit) return hit;
  }

  const data = await load();
  const response = jsonResponse(data, { maxAge, source: "kv" });

  if (cache && ctx?.waitUntil) {
    ctx.waitUntil(cache.put(request, response.clone()));
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

  if (url.pathname === "/analytics/hourly") {
    return cachedJson(
      request,
      ctx,
      async () => {
        const latest = await readJson(kv, LATEST_KEY);
        if (!latest) {
          return {
            available: false,
            message: "Hourly analytics have not been collected yet.",
          };
        }
        return latest;
      },
      60,
    );
  }

  if (url.pathname === "/analytics/today") {
    return cachedJson(request, ctx, () => loadToday(env, Date.now()), 300);
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
      ...meta,
      pendingHours: pending,
    });
  }

  return new Response("Not found", { status: 404 });
}

export const analyticsInternals = {
  HOUR_MS,
  META_KEY,
  LATEST_KEY,
  hourKey,
  localDateParts,
};
