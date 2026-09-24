const BOT_SALT_KEY = "analytics:bot:salt:v1";
const BOT_CLIENT_PREFIX = "analytics:bot:client:v1:";
const OBSERVATION_TTL_SECONDS = 24 * 60 * 60;
const MAX_TRACKED_PATHS = 64;
const ENGAGEMENT_EVENTS = new Set([
  "read_milestone",
  "engaged_read",
  "deep_read",
  "content_nav",
]);

function requireKv(env) {
  if (!env?.ANALYTICS_KV) {
    throw new Error("ANALYTICS_KV binding is required.");
  }
  return env.ANALYTICS_KV;
}

function nowIso(now) {
  return new Date(now).toISOString();
}

function classifyUserAgent(userAgent = "") {
  const ua = String(userAgent).toLowerCase();
  if (!ua) return "unknown";
  if (/headlesschrome|phantomjs|selenium|playwright|puppeteer/.test(ua)) {
    return "headless";
  }
  if (/bot|crawler|spider|scrapy|httpclient|wget|curl|python-requests/.test(ua)) {
    return "bot";
  }
  if (/mobile|android|iphone|ipad/.test(ua)) return "mobile";
  return "browser";
}

function obviousAutomation(userAgent = "") {
  const category = classifyUserAgent(userAgent);
  return category === "headless" || category === "bot";
}

function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

async function getOrCreateSalt(kv) {
  const existing = await kv.get(BOT_SALT_KEY);
  if (existing) return existing;

  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const salt = base64url(bytes);
  await kv.put(BOT_SALT_KEY, salt);
  return salt;
}

async function hmacTag(secret, value) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return [...new Uint8Array(signature)]
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 24);
}

function parseUmamiPayload(bodyBytes) {
  try {
    const text = new TextDecoder().decode(bodyBytes);
    const data = JSON.parse(text);
    const payload = data?.payload && typeof data.payload === "object" ? data.payload : {};
    return {
      path: typeof payload.url === "string" ? payload.url : "",
      eventName: typeof payload.name === "string" ? payload.name : "",
    };
  } catch {
    return { path: "", eventName: "" };
  }
}

function buildReasons(state) {
  const reasons = [];
  const elapsedMs = Math.max(0, Date.parse(state.lastSeenAt) - Date.parse(state.firstSeenAt));

  if (state.obviousAutomation) reasons.push("automation_user_agent");

  if (
    state.pageviews >= 15 &&
    state.distinctPaths >= 15 &&
    state.engagementEvents === 0 &&
    elapsedMs <= 10 * 60 * 1000
  ) {
    reasons.push("rapid_distinct_path_scan");
  }

  if (
    state.pageviews >= 30 &&
    state.distinctPaths >= 25 &&
    state.engagementEvents === 0 &&
    elapsedMs <= 60 * 60 * 1000
  ) {
    reasons.push("bulk_distinct_path_scan");
  }

  return reasons;
}

export async function observeAnalyticsBeacon(request, env, bodyBytes, now = Date.now()) {
  const kv = requireKv(env);
  const ip = request.headers.get("cf-connecting-ip") || "";
  const userAgent = request.headers.get("user-agent") || "";
  const verifiedBot = request.cf?.botManagement?.verifiedBot === true;

  if (!ip) {
    return {
      shouldBlock: false,
      observed: false,
      reason: "missing_client_ip",
    };
  }

  const salt = await getOrCreateSalt(kv);
  const clientTag = await hmacTag(salt, `${ip}\n${userAgent}`);
  const key = `${BOT_CLIENT_PREFIX}${clientTag}`;
  const existingRaw = await kv.get(key);
  const existing = existingRaw ? JSON.parse(existingRaw) : null;
  const parsed = parseUmamiPayload(bodyBytes);
  const eventName = parsed.eventName;
  const isEngagementEvent = ENGAGEMENT_EVENTS.has(eventName);
  const isCustomEvent = Boolean(eventName);

  const trackedPaths = new Set(Array.isArray(existing?.paths) ? existing.paths : []);
  if (parsed.path && trackedPaths.size < MAX_TRACKED_PATHS) {
    trackedPaths.add(parsed.path);
  }

  const state = {
    firstSeenAt: existing?.firstSeenAt || nowIso(now),
    lastSeenAt: nowIso(now),
    hits: Number(existing?.hits || 0) + 1,
    pageviews: Number(existing?.pageviews || 0) + (isCustomEvent ? 0 : 1),
    customEvents: Number(existing?.customEvents || 0) + (isCustomEvent ? 1 : 0),
    engagementEvents:
      Number(existing?.engagementEvents || 0) + (isEngagementEvent ? 1 : 0),
    paths: [...trackedPaths],
    distinctPaths: trackedPaths.size,
    country: request.cf?.country ? String(request.cf.country) : existing?.country || "",
    uaCategory: classifyUserAgent(userAgent),
    obviousAutomation: Boolean(existing?.obviousAutomation) || obviousAutomation(userAgent),
    verifiedBot,
    blockedHits: Number(existing?.blockedHits || 0),
    reasons: [],
  };

  state.reasons = buildReasons(state);
  const shouldBlock = !verifiedBot && state.reasons.length > 0;
  if (shouldBlock) state.blockedHits += 1;

  await kv.put(key, JSON.stringify(state), {
    expirationTtl: OBSERVATION_TTL_SECONDS,
  });

  return {
    shouldBlock,
    observed: true,
    state,
  };
}

async function readClientStates(kv) {
  const states = [];
  let cursor;

  do {
    const page = await kv.list({
      prefix: BOT_CLIENT_PREFIX,
      limit: 1000,
      ...(cursor ? { cursor } : {}),
    });

    const values = await Promise.all(
      (page.keys || []).map(async item => {
        const raw = await kv.get(item.name);
        return raw ? JSON.parse(raw) : null;
      }),
    );
    states.push(...values.filter(Boolean));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  return states;
}

function publicClientSummary(state) {
  return {
    country: state.country || null,
    uaCategory: state.uaCategory || "unknown",
    firstSeenAt: state.firstSeenAt,
    lastSeenAt: state.lastSeenAt,
    hits: Number(state.hits || 0),
    pageviews: Number(state.pageviews || 0),
    distinctPaths: Number(state.distinctPaths || 0),
    customEvents: Number(state.customEvents || 0),
    engagementEvents: Number(state.engagementEvents || 0),
    blockedHits: Number(state.blockedHits || 0),
    reasons: Array.isArray(state.reasons) ? state.reasons : [],
  };
}

export async function buildBotObservationReport(env, now = Date.now()) {
  const kv = requireKv(env);
  const states = await readClientStates(kv);
  const active = states.filter(state => {
    const lastSeenMs = Date.parse(state.lastSeenAt || "");
    return Number.isFinite(lastSeenMs) && now - lastSeenMs <= OBSERVATION_TTL_SECONDS * 1000;
  });

  const suspected = active
    .filter(state => Array.isArray(state.reasons) && state.reasons.length > 0)
    .sort((a, b) => Number(b.pageviews || 0) - Number(a.pageviews || 0));

  const totalPageviews = active.reduce((sum, state) => sum + Number(state.pageviews || 0), 0);
  const topPageviews = active.reduce(
    (max, state) => Math.max(max, Number(state.pageviews || 0)),
    0,
  );
  const largestClientShare =
    totalPageviews > 0 ? Number((topPageviews / totalPageviews).toFixed(3)) : 0;

  return {
    generatedAt: nowIso(now),
    windowHours: 24,
    clientsObserved: active.length,
    suspectedClients: suspected.length,
    totalObservedPageviews: totalPageviews,
    blockedHits: active.reduce((sum, state) => sum + Number(state.blockedHits || 0), 0),
    largestClientPageviewShare: largestClientShare,
    dominantSingleClient:
      topPageviews >= 10 && largestClientShare >= 0.5,
    topSuspected: suspected.slice(0, 10).map(publicClientSummary),
  };
}

export async function handleBotObservationRequest(request, env) {
  const url = new URL(request.url);
  if (url.pathname !== "/analytics/bot-observation") return null;

  if (request.method !== "GET") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { allow: "GET" },
    });
  }

  const report = await buildBotObservationReport(env);
  return new Response(JSON.stringify(report, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

export const botObservationInternals = {
  BOT_CLIENT_PREFIX,
  BOT_SALT_KEY,
  classifyUserAgent,
  buildReasons,
};
