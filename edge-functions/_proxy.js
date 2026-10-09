// Fixed-host proxy, not a general URL fetcher. Keep browser-visible responses
// same-origin and never accept caller-provided upstream URLs or origins.
export const BLOG_ORIGIN = "https://thinkerqaq.com";
export const AI_WORKER = "https://thinkerqaq-blog-ai.blog-ai.workers.dev";
export const REACTIONS_WORKER = "https://thinkerqaq-blog-reactions.blog-ai.workers.dev";

export function noStoreResponse(message, status, headers = {}) {
  return new Response(message, {
    status,
    headers: { "cache-control": "no-store", "x-content-type-options": "nosniff", ...headers },
  });
}

export function requireSameOriginPost(request) {
  const browserOrigin = request.headers.get("origin") || "";
  const requestOrigin = new URL(request.url).origin;
  // Browsers provide Origin on POST and on other state-changing methods.
  // Preview origins differ from the production origin, so compare to the
  // actual request host; never accept arbitrary third-party Origins.
  return browserOrigin === requestOrigin;
}

export async function upstreamFetch(url, { method = "GET", headers = {}, body, timeoutMs = 4500 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method, headers, body, signal: controller.signal, redirect: "error",
    });
  } finally {
    clearTimeout(timer);
  }
}

export function translateResponse(response, { script = false } = {}) {
  const headers = new Headers({
    "cache-control": script && response.ok ? "public, max-age=300" : "no-store",
    "x-content-type-options": "nosniff",
    "content-type": response.headers.get("content-type") ||
      (script ? "application/javascript; charset=utf-8" : "application/json; charset=utf-8"),
  });
  return new Response(response.body, { status: response.status, headers });
}

export function upstreamError() {
  return noStoreResponse(JSON.stringify({ error: "Upstream unavailable" }), 502, {
    "content-type": "application/json; charset=utf-8",
  });
}
