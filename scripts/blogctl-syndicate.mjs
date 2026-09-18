import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  extractRequestedPlatforms,
  normalizeExplicitSyndicationArgs,
} from "./syndicate-cli.mjs";
import {
  loadArticles,
  parseArguments as parseDevtoArguments,
  runSyndication,
} from "./syndicate.mjs";
import { runMediumSyndication } from "./syndicate-medium.mjs";
import { loadPublishingConfig } from "./publishing-config.mjs";

function removePlatformsArg(argv) {
  const output = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--platforms") {
      index += 1;
      continue;
    }
    output.push(argv[index]);
  }
  return output;
}

export function resolveBlogContentRoot(env = process.env) {
  const configured = env.BLOG_CONTENT_ROOT?.trim();
  if (!configured) {
    throw new Error("BLOG_CONTENT_ROOT is required. Run this through blogctl sync from the blog-content repository.");
  }
  return path.resolve(configured);
}

export function resolveMediumOutputRoot(contentRoot) {
  return path.join(contentRoot, ".distribution", "medium");
}

export function resolveSyndicationArticleRoot(contentRoot, language = "en") {
  const root = path.join(contentRoot, "src", "content", "articles");
  return language === "en" ? path.join(root, "en") : root;
}

function logMediumEvent(event) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    severity: "info",
    operation: "syndication-medium",
    ...event,
  }));
}

export async function runBlogctlSyndication(argv, env = process.env) {
  const normalized = normalizeExplicitSyndicationArgs(argv);
  const platforms = extractRequestedPlatforms(normalized);
  const baseArgs = removePlatformsArg(normalized);
  const options = parseDevtoArguments([...baseArgs, "--platforms", "devto"]);

  const contentRoot = resolveBlogContentRoot(env);
  const publishingConfig = await loadPublishingConfig(env);
  const summaries = {};

  for (const platform of platforms) {
    const profile = publishingConfig[platform];
    const language = profile?.language || "en";
    const articleRoot = resolveSyndicationArticleRoot(contentRoot, language);

    if (platform === "devto") {
      summaries.devto = await runSyndication({
        articleRoot,
        requestedSlugs: options.requestedSlugs,
        dryRun: options.dryRun,
        draft: options.draft,
        publishingConfig: profile,
        language,
      });
      continue;
    }

    const loaded = await loadArticles({
      articleRoot,
      requestedSlugs: options.requestedSlugs,
      language,
    });
    summaries.medium = await runMediumSyndication(loaded, {
      dryRun: options.dryRun,
      outputRoot: resolveMediumOutputRoot(contentRoot),
      publishingConfig: profile,
      onEvent: logMediumEvent,
    });
  }

  return summaries;
}

async function main() {
  const summaries = await runBlogctlSyndication(process.argv.slice(2));
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    severity: "info",
    operation: "syndication",
    status: "completed",
    summaries,
  }));
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  main().catch((error) => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      severity: "error",
      operation: "syndication",
      status: "failed",
      exception: { name: error.name, message: error.message, stack: error.stack },
    }));
    process.exitCode = 1;
  });
}
