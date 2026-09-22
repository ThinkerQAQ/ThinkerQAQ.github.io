import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const UMAMI_CLOUD_ORIGIN = "https://cloud.umami.is";
const DEFAULT_HOURS = 1;
const MAX_HOURS = 24;
const METRIC_LIMIT = 100;

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

export async function resolveShare(slug) {
  if (!/^[a-zA-Z0-9]{8,50}$/.test(slug || "")) {
    throw new Error("Invalid Umami share slug.");
  }

  const data = await fetchJson(
    `${UMAMI_CLOUD_ORIGIN}/api/share/${encodeURIComponent(slug)}`,
    { headers: { accept: "application/json" } },
  );

  if (!data?.websiteId || !data?.token) {
    throw new Error("The Umami share does not expose a website token.");
  }

  return {
    websiteId: String(data.websiteId),
    token: String(data.token),
    parameters: data.parameters || {},
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
    `${UMAMI_CLOUD_ORIGIN}/api/websites/${encodeURIComponent(websiteId)}/${resource}`,
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

export async function collectWindow(share, startAt, endAt) {
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
    delta[`new${label[0].toUpperCase()}${label.slice(1)}`] = newRows(
      current[label] || [],
      previous[label] || [],
    );
    delta[`changed${label[0].toUpperCase()}${label.slice(1)}`] = changedRows(
      current[label] || [],
      previous[label] || [],
    );
  }

  return delta;
}

export async function buildHourlyReport({
  shareSlug,
  hours = DEFAULT_HOURS,
  now = Date.now(),
} = {}) {
  const parsedHours = Number(hours);
  if (
    !Number.isInteger(parsedHours) ||
    parsedHours < 1 ||
    parsedHours > MAX_HOURS
  ) {
    throw new Error(`hours must be an integer between 1 and ${MAX_HOURS}.`);
  }

  const share = await resolveShare(shareSlug);
  const windowMs = parsedHours * 60 * 60 * 1000;
  const currentEndAt = now;
  const currentStartAt = currentEndAt - windowMs;
  const previousEndAt = currentStartAt - 1;
  const previousStartAt = previousEndAt - windowMs;

  const [current, previous] = await Promise.all([
    collectWindow(share, currentStartAt, currentEndAt),
    collectWindow(share, previousStartAt, previousEndAt),
  ]);

  return {
    generatedAt: new Date(now).toISOString(),
    websiteId: share.websiteId,
    windowHours: parsedHours,
    current,
    previous,
    delta: buildDelta(current, previous),
  };
}

async function main() {
  const shareSlug = process.env.UMAMI_SHARE_SLUG || "";
  const hours = Number(process.env.UMAMI_REPORT_HOURS || DEFAULT_HOURS);
  const output = process.env.UMAMI_REPORT_OUTPUT || "umami-latest.json";

  const report = await buildHourlyReport({ shareSlug, hours });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(
    `Umami hourly report written to ${output}: ${report.current.stats.visitors} visitors, ${report.current.stats.pageviews} pageviews.\n`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}
