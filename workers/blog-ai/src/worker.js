import app from "./index.js";

const UMAMI_SCRIPT_URL = "https://cloud.umami.is/script.js";
const UMAMI_COLLECT_URL = "https://gateway.umami.is/api/send";
const UMAMI_SCRIPT_PATH = "/u.js";
const UMAMI_COLLECT_PATH = "/api/send";

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
    "access-control-allow-headers": "content-type,x-umami-cache",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

async function proxyTrackerScript() {
  const upstream = await fetch(UMAMI_SCRIPT_URL, {
    headers: {
      accept: "application/javascript,text/javascript,*/*;q=0.1",
    },
  });

  const headers = new Headers({
    "cache-control": "public, max-age=300, stale-while-revalidate=3600",
    "content-type": upstream.headers.get("content-type") || "application/javascript; charset=utf-8",
    "x-content-type-options": "nosniff",
  });

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

async function proxyAnalyticsRequest(request, origin) {
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const userAgent = request.headers.get("user-agent");
  const acceptLanguage = request.headers.get("accept-language");
  const referer = request.headers.get("referer");
  const umamiCache = request.headers.get("x-umami-cache");

  if (contentType) headers.set("content-type", contentType);
  if (userAgent) headers.set("user-agent", userAgent);
  if (acceptLanguage) headers.set("accept-language", acceptLanguage);
  if (referer) headers.set("referer", referer);
  if (umamiCache) headers.set("x-umami-cache", umamiCache);
  headers.set("origin", origin);

  const upstream = await fetch(UMAMI_COLLECT_URL, {
    method: "POST",
    headers,
    body: await request.arrayBuffer(),
  });

  const responseHeaders = new Headers(analyticsCorsHeaders(origin));
  const upstreamContentType = upstream.headers.get("content-type");
  if (upstreamContentType) responseHeaders.set("content-type", upstreamContentType);
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

      return proxyAnalyticsRequest(request, origin);
    }

    return app.fetch(request, env, ctx);
  },
};
