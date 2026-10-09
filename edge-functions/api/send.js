import {
  AI_WORKER, BLOG_ORIGIN, noStoreResponse, requireSameOriginPost,
  translateResponse, upstreamError, upstreamFetch,
} from "../_proxy.js";

const HEADER_ALLOWLIST = ["content-type", "x-umami-website-id", "x-umami-hostname", "x-umami-cache"];

export default async function onRequest({ request }) {
  if (request.method !== "POST") return noStoreResponse("Method not allowed", 405, { allow: "POST" });
  if (!requireSameOriginPost(request)) return noStoreResponse("Origin not allowed", 403);
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 65536) return noStoreResponse("Request too large", 413);
  const body = await request.arrayBuffer();
  if (body.byteLength > 65536) return noStoreResponse("Request too large", 413);

  const headers = new Headers({ origin: BLOG_ORIGIN });
  for (const name of HEADER_ALLOWLIST) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  try {
    const response = await upstreamFetch(AI_WORKER + "/api/send", {
      method: "POST", headers, body, timeoutMs: 5500,
    });
    return translateResponse(response);
  } catch {
    return upstreamError();
  }
}
