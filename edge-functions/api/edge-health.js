// Read-only probe: verify that a Tencent Edge Function can reach the existing
// Cloudflare Worker. Never forward arbitrary user-supplied URLs.
const UPSTREAM = "https://thinkerqaq-blog-ai.blog-ai.workers.dev/analytics/health";

export default async function onRequest(context) {
  const request = context.request;
  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405, headers: { allow: "GET" } });
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  const started = Date.now();
  try {
    const response = await fetch(UPSTREAM, {
      method: "GET",
      signal: controller.signal,
      headers: { accept: "application/json" },
      redirect: "error",
    });
    return new Response(JSON.stringify({
      edge: "ok",
      upstreamStatus: response.status,
      upstreamReachable: response.ok,
      durationMs: Date.now() - started,
    }), {
      status: response.ok ? 200 : 502,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" },
    });
  } catch {
    return new Response(JSON.stringify({
      edge: "ok", upstreamReachable: false, durationMs: Date.now() - started,
    }), {
      status: 502,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" },
    });
  } finally {
    clearTimeout(timeout);
  }
}
