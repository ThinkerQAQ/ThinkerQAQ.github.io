import http from "node:http";
import process from "node:process";

const DEFAULT_PORT = 32145;
const SESSION_TTL_MS = 10 * 60 * 1000;
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const MEDIUM_ORIGIN = "https://medium.com";
const GRAPHQL_URL = "https://medium.com/_/graphql";
const ALLOWED_COOKIE_NAMES = new Set(["sid", "uid", "xsrf", "cf_clearance"]);

function parseArgs(argv) {
  const options = { port: DEFAULT_PORT, parentPid: null };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--port") options.port = Number(argv[++index]);
    else if (argv[index] === "--parent-pid") options.parentPid = Number(argv[++index]);
  }
  return options;
}

function json(response, status, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    ...extraHeaders,
  });
  response.end(body);
}

async function readJson(request, maxBytes = MAX_BODY_BYTES) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw Object.assign(new Error("request body too large"), { status: 413 });
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw Object.assign(new Error("invalid JSON"), { status: 400 });
  }
}

export function filterMediumCookies(cookies = []) {
  const output = {};
  for (const cookie of cookies) {
    if (!cookie || !ALLOWED_COOKIE_NAMES.has(cookie.name) || typeof cookie.value !== "string") continue;
    output[cookie.name] = cookie.value;
  }
  return output;
}

function cookieHeader(cookies) {
  return Object.entries(cookies).map(([name, value]) => `${name}=${value}`).join("; ");
}

export function stripMediumXssi(text) {
  if (!text.startsWith("])}")) return text;
  return text.includes("\n") ? text.slice(text.indexOf("\n") + 1) : text.slice(16);
}

async function mediumGraphql(session, operationName, query, variables = {}) {
  const headers = {
    accept: "application/json",
    "content-type": "application/json",
    "graphql-operation": operationName,
    origin: MEDIUM_ORIGIN,
    referer: `${MEDIUM_ORIGIN}/`,
    cookie: cookieHeader(session.cookies),
    "user-agent": session.userAgent || "Mozilla/5.0",
  };
  if (session.cookies.xsrf) headers["x-xsrf-token"] = session.cookies.xsrf;
  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ operationName, query, variables }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Medium GraphQL ${response.status}: ${text.slice(0, 500)}`);
  const payload = JSON.parse(text);
  if (payload.errors?.length) throw new Error(`Medium GraphQL error: ${JSON.stringify(payload.errors)}`);
  return payload.data ?? {};
}

async function createBlankDraft(session) {
  const data = await mediumGraphql(
    session,
    "CreatePostMutation",
    `mutation CreatePostMutation($input: CreatePostInput!) {
      createPost(input: $input) {
        id
        mediumUrl
        title
        creator { id username name }
      }
    }`,
    { input: {} },
  );
  const post = data.createPost ?? {};
  if (!post.id) throw new Error("Medium createPost did not return a post id");
  return post;
}

async function writeDraftDeltas(session, postId, title, bodyDeltas) {
  const deltas = [{
    type: 1,
    index: 0,
    paragraph: { type: 3, text: title, markups: [] },
  }];
  for (const delta of bodyDeltas ?? []) {
    deltas.push({ ...delta, index: deltas.length });
  }

  const headers = {
    accept: "application/json",
    "content-type": "application/json",
    origin: MEDIUM_ORIGIN,
    referer: `${MEDIUM_ORIGIN}/p/${postId}/edit`,
    cookie: cookieHeader(session.cookies),
    "user-agent": session.userAgent || "Mozilla/5.0",
  };
  if (session.cookies.xsrf) headers["x-xsrf-token"] = session.cookies.xsrf;

  const response = await fetch(`${MEDIUM_ORIGIN}/p/${postId}/deltas`, {
    method: "POST",
    headers,
    body: JSON.stringify({ baseRev: -1, rev: 0, deltas }),
  });
  const raw = stripMediumXssi(await response.text());
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new Error(`Medium delta endpoint returned invalid JSON (${response.status})`);
  }
  if (!response.ok || payload.success === false) {
    throw new Error(`Medium delta write failed (${response.status}): ${JSON.stringify(payload).slice(0, 500)}`);
  }
  return payload;
}

export async function createMediumDraft(session, draft) {
  if (!draft?.title || !Array.isArray(draft?.deltas)) throw new Error("title and deltas are required");
  const post = await createBlankDraft(session);
  await writeDraftDeltas(session, post.id, draft.title, draft.deltas);
  return {
    postId: post.id,
    draftUrl: `${MEDIUM_ORIGIN}/p/${post.id}/edit`,
    mediumUrl: post.mediumUrl || null,
    canonicalUrl: draft.canonicalUrl || null,
    canonicalPending: true,
    tagsPending: Array.isArray(draft.tags) && draft.tags.length > 0,
  };
}

function validExtensionOrigin(origin) {
  return !origin || origin.startsWith("chrome-extension://") || origin.startsWith("edge-extension://");
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const token = process.env.THINKERQAQ_MEDIUM_BRIDGE_TOKEN;
  if (!token) throw new Error("THINKERQAQ_MEDIUM_BRIDGE_TOKEN is required");
  if (!Number.isInteger(options.port) || options.port <= 0 || options.port > 65535) throw new Error("invalid port");

  let session = null;

  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", `http://${request.headers.host || "127.0.0.1"}`);
      const origin = request.headers.origin || "";

      if (request.method === "OPTIONS") {
        if (!validExtensionOrigin(origin)) return json(response, 403, { error: "forbidden origin" });
        response.writeHead(204, {
          "access-control-allow-origin": origin || "null",
          "access-control-allow-methods": "POST, OPTIONS",
          "access-control-allow-headers": "content-type",
        });
        response.end();
        return;
      }

      if (url.pathname === "/v1/session" && request.method === "POST") {
        if (!validExtensionOrigin(origin)) return json(response, 403, { error: "forbidden origin" });
        const body = await readJson(request, 64 * 1024);
        const cookies = filterMediumCookies(body.cookies);
        if (!cookies.sid) return json(response, 400, { error: "Medium sid cookie not found. Sign in to medium.com first." });
        session = {
          cookies,
          userAgent: typeof body.userAgent === "string" ? body.userAgent.slice(0, 512) : "Mozilla/5.0",
          expiresAt: Date.now() + SESSION_TTL_MS,
        };
        return json(response, 200, { ok: true, expiresInSeconds: SESSION_TTL_MS / 1000 }, origin ? { "access-control-allow-origin": origin } : {});
      }

      if (request.headers["x-thinkerqaq-token"] !== token) {
        return json(response, 401, { error: "invalid bridge token" });
      }

      if (url.pathname === "/v1/session/status" && request.method === "GET") {
        const authenticated = Boolean(session && session.expiresAt > Date.now());
        if (!authenticated) session = null;
        return json(response, 200, {
          authenticated,
          expiresInSeconds: authenticated ? Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000)) : 0,
        });
      }

      if (url.pathname === "/v1/medium/drafts" && request.method === "POST") {
        if (!session || session.expiresAt <= Date.now()) {
          session = null;
          return json(response, 428, { error: "medium_session_required" });
        }
        const body = await readJson(request);
        const result = await createMediumDraft(session, body);
        return json(response, 201, result);
      }

      return json(response, 404, { error: "not found" });
    } catch (error) {
      const status = Number(error.status) || 500;
      return json(response, status, { error: error.message || String(error) });
    }
  });

  server.listen(options.port, "127.0.0.1", () => {
    console.log(JSON.stringify({ event: "ready", port: options.port }));
  });

  if (options.parentPid) {
    const timer = setInterval(() => {
      try {
        process.kill(options.parentPid, 0);
      } catch {
        clearInterval(timer);
        server.close(() => process.exit(0));
      }
    }, 2000);
    timer.unref();
  }

  const shutdown = () => server.close(() => process.exit(0));
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

const invoked = process.argv[1] && new URL(import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/u, (value) => value.slice(1));
if (invoked && decodeURIComponent(invoked).replaceAll("/", process.platform === "win32" ? "\\" : "/") === process.argv[1]) {
  main();
} else if (process.argv[1]?.endsWith("bridge.mjs")) {
  main();
}
