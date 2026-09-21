import { createHash } from "node:crypto";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  buildArticleCanonicalUrl,
  buildPlatformMarkdown,
  parseArticle,
  renderPlatformHtml,
} from "../../../../scripts/distribute.mjs";
import { loadPublishingConfig } from "../../../../scripts/publishing-config.mjs";
import { collectPublishingAssets } from "./compiler.mjs";
import { preparePublishingAssetList } from "../../assets/node/assets.mjs";

export const COMPILED_ARTICLE_PROTOCOL_VERSION = 1;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseArgs(argv) {
  const options = { articles: [], platforms: [], dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => {
      const next = argv[index + 1];
      if (!next || next.startsWith("--")) throw new Error(arg + " requires a value");
      index += 1;
      return next;
    };
    if (arg === "--article") options.articles.push(value());
    else if (arg === "--platforms") options.platforms.push(...value().split(",").map((item) => item.trim()).filter(Boolean));
    else if (arg === "--dry-run") options.dryRun = true;
    else throw new Error("Unknown compiler option: " + arg);
  }
  if (options.articles.length === 0) throw new Error("at least one --article is required");
  if (options.platforms.length === 0) throw new Error("--platforms is required");
  options.articles = [...new Set(options.articles)];
  options.platforms = [...new Set(options.platforms)];
  return options;
}

function sourceFileFor(contentRoot, slug, language) {
  const root = path.join(contentRoot, "src", "content", "articles");
  const articleRoot = language === "en" ? path.join(root, "en") : root;
  return path.join(articleRoot, ...slug.split("/")) + ".md";
}

export async function compileArticle({
  contentRoot,
  slug,
  platform,
  publishingConfig,
  dryRun = false,
  env = process.env,
} = {}) {
  const profile = publishingConfig?.[platform];
  if (!profile) throw new Error("missing publishing profile for " + platform);
  const language = profile.language || "zh-CN";
  const sourceFile = sourceFileFor(contentRoot, slug, language);
  const source = await readFile(sourceFile, "utf8");
  const article = parseArticle(source, sourceFile);
  if (article.status !== "published") throw new Error("article is not published: " + slug);

  const generated = buildPlatformMarkdown(article, {
    platform,
    slug,
    publishingConfig: profile,
    language,
  });
  const generatedArticle = parseArticle(generated, platform + ":" + slug);
  const html = renderPlatformHtml(generatedArticle.body);
  const assets = collectPublishingAssets(article.body);
  await preparePublishingAssetList(assets, {
    dryRun,
    cacheRoot: path.join(contentRoot, ".distribution", "assets"),
    env,
  });

  return {
    version: COMPILED_ARTICLE_PROTOCOL_VERSION,
    slug,
    platform,
    title: generatedArticle.title,
    description: generatedArticle.description,
    markdown: generatedArticle.body,
    html,
    language,
    canonicalUrl: buildArticleCanonicalUrl(slug, language),
    contentHash: sha256(generated + "\n<!-- blogctl-html -->\n" + html),
    sourceDir: path.dirname(sourceFile),
    assets: assets.map(({ kind, id, objectKey, publicUrl, alt }) => ({
      kind, id, objectKey, publicUrl, alt,
    })),
  };
}

export async function runCompiler(argv, env = process.env) {
  const options = parseArgs(argv);
  const contentRoot = String(env.BLOG_CONTENT_ROOT || "").trim();
  if (!contentRoot) throw new Error("BLOG_CONTENT_ROOT is required");
  const publishingConfig = await loadPublishingConfig(env);
  const articles = [];
  for (const slug of options.articles) {
    for (const platform of options.platforms) {
      articles.push(await compileArticle({
        contentRoot: path.resolve(contentRoot),
        slug,
        platform,
        publishingConfig,
        dryRun: options.dryRun,
        env,
      }));
    }
  }
  return articles;
}

async function main() {
  for (const article of await runCompiler(process.argv.slice(2))) {
    console.log(JSON.stringify({
      operation: "blogctl-compile",
      status: "completed",
      article,
    }));
  }
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invoked && fileURLToPath(import.meta.url) === invoked) {
  main().catch((error) => {
    console.log(JSON.stringify({
      operation: "blogctl-compile",
      status: "failed",
      message: error.message,
    }));
    process.exitCode = 1;
  });
}
