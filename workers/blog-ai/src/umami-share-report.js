const UMAMI_CLOUD_ORIGIN = "https://cloud.umami.is";
const SHARE_SLUG_PATTERN = /^[a-zA-Z0-9]{8,50}$/;
const DEFAULT_HOURS = 1;
const MAX_HOURS = 24;
const METRIC_LIMIT = 50;

function jsonResponse(body, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  headers.set("x-content-type-options", "nosniff");
  return new Response(JSON.stringify(body), { ...init, headers });
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Umami request failed: ${response.status}${detail ? ` ${detail.slice(0, 160)}` : ""}`);
  }
  return response.json();
}

function parseHours(value) {
  if (value == null || value === "") return DEFAULT_HOURS;
  const hours = Number(value);
  if (!Number.isInteger(hours) || hours < 1 || hours > MAX_HOURS) return null;
  return hours;
}

async function resolveShare(slug) {
  const data = await fetchJson(
    `${UMAMI_CLOUD_ORIGIN}/api/share/${encodeURIComponent(slug)}`,
    { headers: { accept: "application/json" } },
  );

  if (!data?.websiteId || !data?.token) {
    throw new Error("Share URL does not expose a website analytics token.");
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

function metricUrl(websiteId, type, startAt, endAt) {
  const url = new URL(
    `${UMAMI_CLOUD_ORIGIN}/api/websites/${encodeURIComponent(websiteId)}/metrics`,
  );
  url.searchParams.set("startAt", String(startAt));
  url.searchParams.set("endAt", String(endAt));
  url.searchParams.set("type", type);
  url.searchParams.set("limit", String(METRIC_LIMIT));
  return url;
}

function statsUrl(websiteId, startAt, endAt) {
  const url = new URL(
    `${UMAMI_CLOUD_ORIGIN}/api/websites/${encodeURIComponent(websiteId)}/stats`,
  );
  url.searchParams.set("startAt", String(startAt));
  url.searchParams.set("endAt", String(endAt));
  return url;
}

function normalizeMetricRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map(row => ({
      name: String(row?.x ?? ""),
      count: Number(row?.y ?? 0),
      ...(row?.country ? { country: String(row.country) } : {}),
    }))
    .filter(row => row.name && Number.isFinite(row.count))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function normalizeStats(data) {
  const keys = ["pageviews", "visitors", "visits", "bounces", "totaltime"];
  return Object.fromEntries(
    keys.map(key => [key, Number(data?.[key] ?? 0)]),
  );
}

async function fetchMetric(websiteId, token, type, startAt, endAt) {
  const rows = await fetchJson(metricUrl(websiteId, type, startAt, endAt), {
    headers: shareHeaders(token),
  });
  return normalizeMetricRows(rows);
}

async function fetchStats(websiteId, token, startAt, endAt) {
  const data = await fetchJson(statsUrl(websiteId, startAt, endAt), {
    headers: shareHeaders(token),
  });
  return normalizeStats(data);
}

async function collectWindow(share, startAt, endAt) {
  const { websiteId, token } = share;
  const [
    stats,
    paths,
    entryPages,
    referrers,
    channels,
    countries,
    events,
    utmSources,
  ] = await Promise.all([
    fetchStats(websiteId, token, startAt, endAt),
    fetchMetric(websiteId, token, "path", startAt, endAt),
    fetchMetric(websiteId, token, "entry", startAt, endAt),
    fetchMetric(websiteId, token, "referrer", startAt, endAt),
    fetchMetric(websiteId, token, "channel", startAt, endAt),
    fetchMetric(websiteId, token, "country", startAt, endAt),
    fetchMetric(websiteId, token, "event", startAt, endAt),
    fetchMetric(websiteId, token, "utmSource", startAt, endAt),
  ]);

  return {
    startAt,
    endAt,
    stats,
    paths,
    entryPages,
    referrers,
    channels,
    countries,
    events,
    utmSources,
  };
}

function names(rows) {
  return new Set(rows.map(row => row.name));
}

function newRows(current, previous) {
  const seen = names(previous);
  return current.filter(row => !seen.has(row.name));
}

function statsDelta(current, previous) {
  return Object.fromEntries(
    Object.keys(current).map(key => [key, current[key] - (previous[key] || 0)]),
  );
}

function buildDelta(current, previous) {
  return {
    stats: statsDelta(current.stats, previous.stats),
    newReferrers: newRows(current.referrers, previous.referrers),
    newChannels: newRows(current.channels, previous.channels),
    newCountries: newRows(current.countries, previous.countries),
    newEntryPages: newRows(current.entryPages, previous.entryPages),
    newEvents: newRows(current.events, previous.events),
    newUtmSources: newRows(current.utmSources, previous.utmSources),
  };
}

export async function handleUmamiShareReport(request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("share") || "";
  const hours = parseHours(url.searchParams.get("hours"));

  if (!SHARE_SLUG_PATTERN.test(slug)) {
    return jsonResponse(
      { error: "A valid Umami share slug is required in ?share=..." },
      { status: 400 },
    );
  }

  if (hours == null) {
    return jsonResponse(
      { error: `hours must be an integer between 1 and ${MAX_HOURS}` },
      { status: 400 },
    );
  }

  try {
    const share = await resolveShare(slug);
    const endAt = Date.now();
    const windowMs = hours * 60 * 60 * 1000;
    const startAt = endAt - windowMs;
    const previousEndAt = startAt - 1;
    const previousStartAt = previousEndAt - windowMs;

    const [current, previous] = await Promise.all([
      collectWindow(share, startAt, endAt),
      collectWindow(share, previousStartAt, previousEndAt),
    ]);

    return jsonResponse({
      generatedAt: new Date(endAt).toISOString(),
      windowHours: hours,
      current,
      previous,
      delta: buildDelta(current, previous),
    });
  } catch (error) {
    return jsonResponse(
      {
        error: "Unable to read the Umami shared analytics.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }
}
