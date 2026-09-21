import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runCompiler } from "../../compiler/node/index.mjs";

function log(status, details = {}) {
  console.log(JSON.stringify({
    operation: "syndication-medium",
    status,
    ...details,
  }));
}

function configuredBridge(env = process.env) {
  const origin = String(env.THINKERQAQ_SYNDICATION_BRIDGE_ORIGIN || "").trim();
  const token = String(env.THINKERQAQ_SYNDICATION_BRIDGE_TOKEN || "").trim();
  if (!origin || !token) {
    throw new Error("Medium live sync must run through BlogCTL so the browser bridge is available.");
  }
  return { origin, token };
}

async function bridgeRequest(bridge, pathname, options = {}, fetchImpl = fetch) {
  const response = await fetchImpl(new URL(pathname, bridge.origin), {
    ...options,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-thinkerqaq-token": bridge.token,
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; }
  catch { payload = text; }
  if (!response.ok) {
    throw new Error("Medium bridge " + response.status + ": " + (typeof payload === "string" ? payload : JSON.stringify(payload)));
  }
  return payload;
}

async function waitForMediumSession(bridge, onEvent, {
  fetchImpl = fetch,
  timeoutMs = 5 * 60_000,
  pollMs = 1000,
} = {}) {
  const startedAt = Date.now();
  let announced = false;
  while (Date.now() - startedAt < timeoutMs) {
    const status = await bridgeRequest(bridge, "/v1/sessions/medium/status", { method: "GET" }, fetchImpl);
    if (status?.authenticated) return;
    if (!announced) {
      announced = true;
      onEvent({
        status: "waiting-for-session",
        message: "Waiting for Medium browser session. Open BlogCTL Extension and sync the Medium session.",
      });
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
  throw new Error("Timed out waiting for Medium browser session.");
}

async function writeFallback(article, contentRoot) {
  const outputFile = path.join(contentRoot, ".distribution", "medium", ...article.slug.split("/")) + ".html";
  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, article.fallbackHtml || article.html, "utf8");
  return outputFile;
}

export async function runCompiledMediumTransport(compiledArticles, {
  contentRoot,
  dryRun = false,
  env = process.env,
  fetchImpl = fetch,
  onEvent = log,
} = {}) {
  const medium = compiledArticles.filter((article) => article.platform === "medium");
  const prepared = [];
  for (const article of medium) {
    const fallbackPath = await writeFallback(article, contentRoot);
    prepared.push({ article, fallbackPath });
  }

  if (dryRun) {
    for (const item of prepared) {
      onEvent("dry-run", {
        slug: item.article.slug,
        canonicalUrl: item.article.nativeCanonicalUrl,
        warnings: item.article.warnings || [],
        requiresHtmlFallback: Boolean(item.article.requiresFallback),
        fallbackPath: item.fallbackPath,
      });
    }
    return {
      total: prepared.length,
      drafts: 0,
      dryRun: true,
      fallbackPaths: prepared.map((item) => item.fallbackPath),
    };
  }

  if (prepared.length !== 1) {
    throw new Error("Medium live draft sync requires exactly one explicit article.");
  }
  const item = prepared[0];
  if (item.article.requiresFallback) {
    throw new Error("Medium live draft adapter cannot safely insert body images yet. Use the generated copy/paste fallback: " + item.fallbackPath);
  }
  if (!item.article.payload || typeof item.article.payload !== "object") {
    throw new Error("Compiled Medium article is missing transport payload");
  }

  const bridge = configuredBridge(env);
  await waitForMediumSession(bridge, (event) => onEvent(event.status, event), { fetchImpl });
  const result = await bridgeRequest(bridge, "/v1/platforms/medium/drafts", {
    method: "POST",
    body: JSON.stringify(item.article.payload),
  }, fetchImpl);

  onEvent("draft-created", {
    slug: item.article.slug,
    draftUrl: result.draftUrl,
    canonicalUrl: item.article.nativeCanonicalUrl,
    canonicalPending: result.canonicalPending,
    tagsPending: result.tagsPending,
    coverImagePending: Boolean(result.coverImagePending),
    coverImageUrl: result.coverImageUrl || undefined,
    warnings: item.article.warnings || [],
    fallbackPath: item.fallbackPath,
    message: result.coverImagePending
      ? "Medium draft created; the cover remains pending in the live editor."
      : undefined,
  });

  return {
    total: 1,
    drafts: 1,
    dryRun: false,
    draftUrl: result.draftUrl,
    fallbackPaths: [item.fallbackPath],
  };
}

export async function runMediumTransport(argv, env = process.env) {
  const contentRoot = path.resolve(String(env.BLOG_CONTENT_ROOT || "").trim());
  if (!String(env.BLOG_CONTENT_ROOT || "").trim()) throw new Error("BLOG_CONTENT_ROOT is required");
  const dryRun = argv.includes("--dry-run");
  const compiled = await runCompiler(argv, env);
  return runCompiledMediumTransport(compiled, { contentRoot, dryRun, env });
}

async function main() {
  const result = await runMediumTransport(process.argv.slice(2));
  log("completed", result);
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invoked && fileURLToPath(import.meta.url) === invoked) {
  main().catch((error) => {
    log("failed", { exception: { name: error.name, message: error.message, stack: error.stack } });
    process.exitCode = 1;
  });
}
