import app from "./chat.js";
import {
  handleAnalyticsRequest,
  runAnalyticsCron,
} from "./analytics.js";
import {
  handleBotObservationRequest,
  observeAnalyticsBeacon,
} from "./bot-observation.js";

const UMAMI_SCRIPT_URL = "https://cloud.umami.is/script.js";
const UMAMI_COLLECT_URL = "https://gateway.umami.is/api/send";
const UMAMI_SCRIPT_PATH = "/u.js";
const UMAMI_COLLECT_PATH = "/api/send";
const UMAMI_REQUEST_HEADERS = [
  "content-type",
  "x-umami-website-id",
  "x-umami-hostname",
  "x-umami-cache",
];

function analyticsOrigin(env) {
  try {
    return new URL(env.BLOG_ORIGIN).origin;
  } catch {
    return "";
  }
}

function analyticsCorsHeaders(origin) {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": UMAMI_REQUEST_HEADERS.join(","),
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

function setAnalyticsGeoHeaders(headers, request) {
  const country = request.cf?.country;
  const region = request.cf?.regionCode;
  const city = request.cf?.city;

  if (country) headers.set("x-umami-client-country", String(country));
  if (region) headers.set("x-umami-client-region", String(region));
  if (city) headers.set("x-umami-client-city", encodeURIComponent(String(city)));
}

async function proxyTrackerScript() {
  const upstream = await fetch(UMAMI_SCRIPT_URL, {
    headers: {
      accept: "application/javascript,text/javascript,*/*;q=0.1",
    },
  });

  const headers = new Headers({
    "cache-control": "public, max-age=300, stale-while-revalidate=3600",
    "content-type":
      upstream.headers.get("content-type") ||
      "application/javascript; charset=utf-8",
    "x-content-type-options": "nosniff",
  });

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

async function proxyAnalyticsRequest(request, origin, env) {
  const bodyBytes = await request.arrayBuffer();
  const observation = await observeAnalyticsBeacon(request, env, bodyBytes);

  if (observation.shouldBlock) {
    const blockedHeaders = new Headers(analyticsCorsHeaders(origin));
    blockedHeaders.set("cache-control", "no-store");
    blockedHeaders.set("x-analytics-filtered", "automation");
    return new Response(null, { status: 204, headers: blockedHeaders });
  }

  const headers = new Headers();
  const forwardedHeaders = [
    "content-type",
    "user-agent",
    "accept-language",
    "referer",
    "x-umami-website-id",
    "x-umami-hostname",
    "x-umami-cache",
  ];

  for (const name of forwardedHeaders) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  setAnalyticsGeoHeaders(headers, request);
  headers.set("origin", origin);

  const upstream = await fetch(UMAMI_COLLECT_URL, {
    method: "POST",
    headers,
    body: bodyBytes,
  });

  const responseHeaders = new Headers(analyticsCorsHeaders(origin));
  const upstreamContentType = upstream.headers.get("content-type");
  if (upstreamContentType) {
    responseHeaders.set("content-type", upstreamContentType);
  }
  responseHeaders.set("cache-control", "no-store");
  responseHeaders.set("x-content-type-options", "nosniff");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === UMAMI_SCRIPT_PATH) {
      if (request.method !== "GET") {
        return new Response("Method not allowed", { status: 405 });
      }
      return proxyTrackerScript();
    }

    if (url.pathname === UMAMI_COLLECT_PATH) {
      const origin = request.headers.get("origin") || "";
      const allowedOrigin = analyticsOrigin(env);
      if (!allowedOrigin || origin !== allowedOrigin) {
        return new Response("Origin not allowed", { status: 403 });
      }

      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: analyticsCorsHeaders(origin),
        });
      }

      if (request.method !== "POST") {
        return new Response("Method not allowed", {
          status: 405,
          headers: analyticsCorsHeaders(origin),
        });
      }

      return proxyAnalyticsRequest(request, origin, env);
    }

    const botObservationResponse = await handleBotObservationRequest(request, env);
    if (botObservationResponse) return botObservationResponse;

    const analyticsResponse = await handleAnalyticsRequest(request, env, ctx);
    if (analyticsResponse) return analyticsResponse;

    return app.fetch(request, env, ctx);
  },

  scheduled(controller, env) {
    return runAnalyticsCron(env, controller.scheduledTime);
  },
};
