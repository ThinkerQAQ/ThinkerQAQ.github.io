import { buildMediumDraft, writeMediumCopyHtml } from "./medium.mjs";
import {
  createMediumDraftViaBridge,
  startMediumBridge,
  waitForMediumSession,
} from "./medium-bridge-client.mjs";

export async function runMediumSyndication(loadedArticles, {
  dryRun = false,
  outputRoot = ".distribution/medium",
  onEvent = () => {},
} = {}) {
  const prepared = [];
  for (const item of loadedArticles) {
    const draft = buildMediumDraft(item.article, { slug: item.slug });
    const fallbackPath = await writeMediumCopyHtml(item.article, { slug: item.slug, outputRoot });
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

  const bridge = await startMediumBridge();
  try {
    await waitForMediumSession(bridge, {
      onWaiting: ({ message }) => onEvent({ status: "waiting-for-session", message }),
    });
    const item = prepared[0];
    const result = await createMediumDraftViaBridge(bridge, item.draft);
    onEvent({
      status: "draft-created",
      slug: item.slug,
      draftUrl: result.draftUrl,
      canonicalUrl: item.draft.canonicalUrl,
      canonicalPending: result.canonicalPending,
      tagsPending: result.tagsPending,
      warnings: item.draft.warnings,
      fallbackPath: item.fallbackPath,
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
      fallbackPaths: [item.fallbackPath],
    };
  } finally {
    await bridge.close();
  }
}
