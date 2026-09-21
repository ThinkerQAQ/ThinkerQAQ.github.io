import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  exportArticles,
  parseArguments,
} from "./distribute.mjs";
import { loadPublishingConfig } from "./publishing-config.mjs";
import { preparePublishingAssetList } from "../tools/blogctl/assets/node/assets.mjs";

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

export function resolveDistributionArticleRoot(contentRoot, language = "zh-CN") {
  const root = path.join(contentRoot, "src", "content", "articles");
  return language === "en" ? path.join(root, "en") : root;
}

export async function runBlogctlDistribution(argv, env = process.env) {
  const startedAt = Date.now();
  const options = parseArguments(argv);
  if (options.help) {
    return { help: true };
  }

  const contentRoot = resolveBlogContentRoot(env);
  const publishingConfig = await loadPublishingConfig(env);
  const outputRoot = resolveDistributionOutputRoot(contentRoot, options.outputRoot);
  const result = { exported: [] };

  for (const platform of options.platforms) {
    const profile = publishingConfig[platform];
    const language = profile?.language || "zh-CN";
    const platformResult = await exportArticles({
      articleRoot: resolveDistributionArticleRoot(contentRoot, language),
      outputRoot,
      platforms: [platform],
      requestedSlugs: options.requestedSlugs,
      publishingConfig,
      language,
    });
    result.exported.push(...platformResult.exported);
  }

  const publishingAssets = result.exported.flatMap((item) => item.publishingAssets || []);
  const assetSummary = await preparePublishingAssetList(publishingAssets, {
    dryRun: options.dryRun,
    cacheRoot: path.join(contentRoot, ".distribution", "assets"),
    env,
  });
  if (assetSummary.assets > 0) {
    log("info", "publishing-assets", "completed", assetSummary);
  }

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

  const summary = {
    outputs: result.exported.length,
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
