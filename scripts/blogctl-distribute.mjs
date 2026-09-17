import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  exportArticles,
  parseArguments,
  syncExports,
} from "./distribute.mjs";

function log(severity, operation, status, details = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    severity,
    operation,
    status,
    ...details,
  }));
}

export function resolveBlogContentRoot(env = process.env) {
  const configured = env.BLOG_CONTENT_ROOT?.trim();
  if (!configured) {
    throw new Error("BLOG_CONTENT_ROOT is required. Run this through blogctl sync from the blog-content repository.");
  }
  return path.resolve(configured);
}

export function resolveDistributionOutputRoot(contentRoot, outputRoot) {
  return path.resolve(contentRoot, outputRoot);
}

export async function runBlogctlDistribution(argv, env = process.env) {
  const startedAt = Date.now();
  const options = parseArguments(argv);
  if (options.help) {
    return { help: true };
  }

  const contentRoot = resolveBlogContentRoot(env);
  const result = await exportArticles({
    articleRoot: path.join(contentRoot, "src", "content", "articles"),
    outputRoot: resolveDistributionOutputRoot(contentRoot, options.outputRoot),
    platforms: options.platforms,
    requestedSlugs: options.requestedSlugs,
  });

  for (const item of result.exported) {
    if (item.tagCount > item.exportedTagCount) {
      log("warn", "distribution-export", "tags-truncated", {
        slug: item.slug,
        platform: item.platform,
        sourceTagCount: item.tagCount,
        exportedTagCount: item.exportedTagCount,
      });
    }
  }

  let synced = 0;
  if (options.sync) {
    synced = await syncExports({
      ...result,
      changedOnly: options.changedOnly,
      dryRun: options.dryRun,
    });
  }

  const summary = {
    outputs: result.exported.length,
    synced,
    dryRun: options.dryRun,
    durationMs: Date.now() - startedAt,
  };
  log("info", "distribution", "completed", summary);
  return summary;
}

async function main() {
  const result = await runBlogctlDistribution(process.argv.slice(2));
  if (result.help) {
    console.log("Use blogctl sync --article <slug> --platforms <list> for content syndication.");
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  main().catch((error) => {
    log("error", "distribution", "failed", {
      exception: { name: error.name, message: error.message, stack: error.stack },
    });
    process.exitCode = 1;
  });
}
