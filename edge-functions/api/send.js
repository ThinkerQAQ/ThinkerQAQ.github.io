const UMAMI_ENDPOINT = "https://gateway.umami.is/api/send";
const SITE_ORIGIN = "https://thinkerqaq.com";
const SITE_HOST = "thinkerqaq.com";
const MAX_BYTES = 32768;
const REQUEST_HEADERS = [
  "content-type", "user-agent", "accept-language", "referer",
  "x-umami-website-id", "x-umami-hostname", "x-umami-cache",
];

export default async function onRequest({ request }) {
  const headers = { "cache-control": "no-store", "x-content-type-options": "nosniff" };
  if (request.headers.get("origin") !== SITE_ORIGIN) {
    return new Response("Forbidden", { status: 403, headers });
  }
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: {
      ...headers,
      "access-control-allow-origin": SITE_ORIGIN,
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type,x-umami-website-id,x-umami-hostname,x-umami-cache",
      "access-control-max-age": "86400",
    } });
  }
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: { ...headers, allow: "POST, OPTIONS" } });
  }
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") || "")) {
    return new Response("Unsupported media type", { status: 415, headers });
  }
  if (Number(request.headers.get("content-length") || 0) > MAX_BYTES) {
    return new Response("Payload too large", { status: 413, headers });
  }
  const body = await request.arrayBuffer();
  if (!body.byteLength || body.byteLength > MAX_BYTES) {
    return new Response("Invalid payload size", { status: body.byteLength > MAX_BYTES ? 413 : 400, headers });
  }
  let event;
  try { event = JSON.parse(new TextDecoder().decode(body)); }
  catch { return new Response("Invalid JSON", { status: 400, headers }); }
  const website = request.headers.get("x-umami-website-id");
  if (
    typeof event?.type !== "string" ||
    event?.payload?.hostname !== SITE_HOST ||
    typeof event?.payload?.website !== "string" ||
    !website || website !== event.payload.website ||
    request.headers.get("x-umami-hostname") !== SITE_HOST
  ) {
    return new Response("Invalid analytics event", { status: 400, headers });
  }
  const upstreamHeaders = new Headers();
  for (const name of REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) upstreamHeaders.set(name, value);
  }
  upstreamHeaders.set("origin", SITE_ORIGIN);

  // EO metadata is set by EdgeOne; untrusted browser IP/location headers are discarded.
  const eo = request.eo;
  if (eo?.clientIp) upstreamHeaders.set("x-forwarded-for", String(eo.clientIp));
  if (eo?.geo?.countryCodeAlpha2) upstreamHeaders.set("x-umami-client-country", String(eo.geo.countryCodeAlpha2));
  if (eo?.geo?.regionCode) upstreamHeaders.set("x-umami-client-region", String(eo.geo.regionCode));
  if (eo?.geo?.cityName) upstreamHeaders.set("x-umami-client-city", encodeURIComponent(String(eo.geo.cityName)));

  try {
    const upstream = await fetch(UMAMI_ENDPOINT, { method: "POST", headers: upstreamHeaders, body });
    const responseHeaders = new Headers(headers);
    const contentType = upstream.headers.get("content-type");
    if (contentType) responseHeaders.set("content-type", contentType);
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return new Response("Analytics upstream unavailable", { status: 502, headers });
  }
}
