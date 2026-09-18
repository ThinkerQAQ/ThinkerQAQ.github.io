import { buildMediumDraft, writeMediumCopyHtml } from "./medium.mjs";

function configuredBridge() {
  const origin = process.env.THINKERQAQ_SYNDICATION_BRIDGE_ORIGIN;
  const token = process.env.THINKERQAQ_SYNDICATION_BRIDGE_TOKEN;
  if (!origin || !token) {
    throw new Error("Medium live sync must run through blogctl sync so the local browser bridge is available.");
  }
  return { origin, token };
}

async function bridgeRequest(bridge, pathname, options = {}) {
  const response = await fetch(new URL(pathname, bridge.origin), {
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
    const error = new Error(`Syndication bridge ${response.status}: ${typeof payload === "string" ? payload : JSON.stringify(payload)}`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function waitForMediumSession(bridge, onEvent, timeoutMs = 5 * 60_000) {
  const startedAt = Date.now();
  let announced = false;
  while (Date.now() - startedAt < timeoutMs) {
    const status = await bridgeRequest(bridge, "/v1/sessions/medium/status", { method: "GET" });
    if (status?.authenticated) return;
    if (!announced) {
      announced = true;
      onEvent({
        status: "waiting-for-session",
        message: "Waiting for Medium browser session. Open BlogCTL Extension, verify Bridge and Medium login status, then click Sync Medium Session.",
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("Timed out waiting for Medium browser session.");
}

export async function runMediumSyndication(loadedArticles, {
  dryRun = false,
  outputRoot = ".distribution/medium",
  publishingConfig,
  onEvent = () => {},
} = {}) {
  const prepared = [];
  for (const item of loadedArticles) {
    const draft = buildMediumDraft(item.article, { slug: item.slug, publishingConfig });
    const fallbackPath = await writeMediumCopyHtml(item.article, {
      slug: item.slug,
      outputRoot,
      publishingConfig,
    });
    prepared.push({ ...item, draft, fallbackPath });
  }

  if (dryRun) {
    for (const item of prepared) {
      onEvent({
        status: "dry-run",
        slug: item.slug,
        canonicalUrl: item.draft.canonicalUrl,
        blocks: item.draft.deltas.length,
        warnings: item.draft.warnings,
        fallbackPath: item.fallbackPath,
      });
    }
    return {
      total: prepared.length,
      created: 0,
      updated: 0,
      skipped: 0,
      drafts: 0,
      dryRun: true,
      fallbackPaths: prepared.map((item) => item.fallbackPath),
    };
  }

  if (prepared.length !== 1) {
    throw new Error("Medium draft sync currently requires exactly one explicit --article selection. Use --dry-run for batch preparation.");
  }

  const bridge = configuredBridge();
  await waitForMediumSession(bridge, onEvent);
  const item = prepared[0];
  const result = await bridgeRequest(bridge, "/v1/platforms/medium/drafts", {
    method: "POST",
    body: JSON.stringify(item.draft),
  });
  onEvent({
    status: "draft-created",
    slug: item.slug,
    draftUrl: result.draftUrl,
    canonicalUrl: item.draft.canonicalUrl,
    canonicalPending: result.canonicalPending,
    tagsPending: result.tagsPending,
    coverImagePending: Boolean(result.coverImagePending),
    coverImageUrl: result.coverImageUrl || undefined,
    warnings: item.draft.warnings,
    fallbackPath: item.fallbackPath,
    message: result.coverImagePending
      ? "Medium draft created; the cover is present in the generated copy/paste fallback but still needs insertion in the live Medium editor."
      : undefined,
  });
  return {
    total: 1,
    created: 0,
    updated: 0,
    skipped: 0,
    drafts: 1,
    dryRun: false,
    draftUrl: result.draftUrl,
    canonicalPending: result.canonicalPending,
    tagsPending: result.tagsPending,
    coverImagePending: Boolean(result.coverImagePending),
    coverImageUrl: result.coverImageUrl || undefined,
    fallbackPaths: [item.fallbackPath],
  };
}
