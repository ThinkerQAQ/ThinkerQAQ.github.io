import {
  BLOG_ORIGIN, REACTIONS_WORKER, noStoreResponse,
  requireSameOriginPost, translateResponse, upstreamError, upstreamFetch,
} from "../_proxy.js";

const METHODS = new Set(["GET", "PUT", "DELETE"]);
export default async function onRequest({ request }) {
  const method = request.method;
  if (!METHODS.has(method)) return noStoreResponse("Method not allowed", 405, { allow: "GET, PUT, DELETE" });
  // For state changes disallow cross-site requests and CSRF.
  if (method !== "GET" && !requireSameOriginPost(request)) return noStoreResponse("Origin not allowed", 403);
  const visitor = request.headers.get("x-reaction-visitor") || "";
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(visitor)) return noStoreResponse("Invalid visitor", 400);
  const incoming = new URL(request.url);
  const params = new URLSearchParams();
  const type = incoming.searchParams.get("contentType") || "";
  const id = incoming.searchParams.get("contentId") || "";
  if (!["article", "note"].includes(type) || !id || id.length > 512) return noStoreResponse("Invalid content", 400);
  params.set("contentType", type);
  params.set("contentId", id);
  try {
    const response = await upstreamFetch(
      REACTIONS_WORKER + "/v1/reactions?" + params.toString(), {
        method, headers: { origin: BLOG_ORIGIN, "x-reaction-visitor": visitor },
        timeoutMs: method === "GET" ? 4000 : 5500,
      },
    );
    return translateResponse(response);
  } catch {
    return upstreamError();
  }
}
