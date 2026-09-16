const RESOURCE_PATH = "/v1/reactions";
const REACTION_TYPE = "helpful";
const MAX_CONTENT_ID_LENGTH = 512;
const VISITOR_ID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
const CONTENT_TYPES = new Set(["article", "note"]);

function json(body, status = 200, origin = "") {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  if (origin) {
    headers.set("access-control-allow-origin", origin);
    headers.set("vary", "Origin");
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function allowedOrigins(env) {
  return new Set(
    String(env.ALLOWED_ORIGINS || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function corsHeaders(origin) {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, PUT, DELETE, OPTIONS",
    "access-control-allow-headers": "x-reaction-visitor",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

function readResource(url) {
  if (url.pathname !== RESOURCE_PATH) return { error: "Not found", status: 404 };

  const contentType = String(url.searchParams.get("contentType") || "").trim();
  const contentId = String(url.searchParams.get("contentId") || "").trim();

  if (!CONTENT_TYPES.has(contentType)) {
    return { error: "Invalid content type", status: 400 };
  }
  if (!contentId || contentId.length > MAX_CONTENT_ID_LENGTH || /[\u0000-\u001F\u007F]/.test(contentId)) {
    return { error: "Invalid content id", status: 400 };
  }

  return { contentType, contentId };
}

function readVisitorId(request) {
  const visitorId = String(request.headers.get("x-reaction-visitor") || "").trim();
  return VISITOR_ID_PATTERN.test(visitorId) ? visitorId : "";
}

async function hashVisitor(visitorId, secret) {
  if (!secret) throw new Error("REACTION_HMAC_SECRET is not configured");

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(visitorId));
  return Array.from(new Uint8Array(signature), (value) => value.toString(16).padStart(2, "0")).join("");
}

async function getState(db, contentType, contentId, visitorHash) {
  const countRow = await db
    .prepare(
      "SELECT COUNT(*) AS count FROM reactions WHERE content_type = ?1 AND content_id = ?2 AND reaction_type = ?3",
    )
    .bind(contentType, contentId, REACTION_TYPE)
    .first();

  const reactedRow = await db
    .prepare(
      "SELECT 1 AS reacted FROM reactions WHERE content_type = ?1 AND content_id = ?2 AND reaction_type = ?3 AND visitor_hash = ?4 LIMIT 1",
    )
    .bind(contentType, contentId, REACTION_TYPE, visitorHash)
    .first();

  return {
    count: Math.max(0, Number(countRow?.count) || 0),
    reacted: Boolean(reactedRow?.reacted),
  };
}

async function mutate(db, method, contentType, contentId, visitorHash) {
  if (method === "PUT") {
    await db
      .prepare(
        "INSERT OR IGNORE INTO reactions (content_type, content_id, reaction_type, visitor_hash) VALUES (?1, ?2, ?3, ?4)",
      )
      .bind(contentType, contentId, REACTION_TYPE, visitorHash)
      .run();
  } else {
    await db
      .prepare(
        "DELETE FROM reactions WHERE content_type = ?1 AND content_id = ?2 AND reaction_type = ?3 AND visitor_hash = ?4",
      )
      .bind(contentType, contentId, REACTION_TYPE, visitorHash)
      .run();
  }

  return getState(db, contentType, contentId, visitorHash);
}

export async function handleRequest(request, env) {
  const url = new URL(request.url);
  const origin = request.headers.get("origin") || "";
  const originAllowed = Boolean(origin && allowedOrigins(env).has(origin));

  if (request.method === "OPTIONS") {
    if (!originAllowed) return new Response(null, { status: 403 });
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (!originAllowed) return json({ error: "Origin not allowed" }, 403);

  const resource = readResource(url);
  if (resource.error) return json({ error: resource.error }, resource.status, origin);

  if (!["GET", "PUT", "DELETE"].includes(request.method)) {
    return json({ error: "Method not allowed" }, 405, origin);
  }

  const visitorId = readVisitorId(request);
  if (!visitorId) return json({ error: "Invalid visitor id" }, 400, origin);

  if (!env.REACTIONS_DB) {
    return json({ error: "Reaction database is not configured" }, 503, origin);
  }

  let visitorHash;
  try {
    visitorHash = await hashVisitor(visitorId, env.REACTION_HMAC_SECRET);
  } catch {
    return json({ error: "Reaction service is not configured" }, 503, origin);
  }

  try {
    if (request.method === "GET") {
      return json(await getState(env.REACTIONS_DB, resource.contentType, resource.contentId, visitorHash), 200, origin);
    }

    const limiterKey = request.headers.get("cf-connecting-ip") || visitorHash;
    if (env.REACTION_RATE_LIMITER) {
      const { success } = await env.REACTION_RATE_LIMITER.limit({ key: limiterKey });
      if (!success) return json({ error: "Too many reactions. Please try again later." }, 429, origin);
    }

    const state = await mutate(
      env.REACTIONS_DB,
      request.method,
      resource.contentType,
      resource.contentId,
      visitorHash,
    );
    return json(state, 200, origin);
  } catch (error) {
    console.error("Reaction request failed", {
      method: request.method,
      path: url.pathname,
      contentType: resource.contentType,
      error: error instanceof Error ? error.message : String(error),
    });
    return json({ error: "Reaction service is temporarily unavailable" }, 503, origin);
  }
}

export default {
  fetch: handleRequest,
};
