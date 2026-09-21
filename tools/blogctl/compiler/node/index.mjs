import { createHash } from "node:crypto";
import path from "node:path";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  buildArticleCanonicalUrl,
  buildPlatformMarkdown,
  parseArticle,
  renderPlatformHtml,
  resolveArticleAssetUrl,
} from "../../../../scripts/distribute.mjs";
import {
  loadPublishingConfig,
  nativeCanonicalUrl,
  renderPublishingFooter,
} from "../../../../scripts/publishing-config.mjs";
import {
  collectPublishingAssets,
  compilePublishingMarkdown,
} from "./compiler.mjs";
import { preparePublishingAssetList } from "../../assets/node/assets.mjs";

export const COMPILED_ARTICLE_PROTOCOL_VERSION = 1;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function truncate(value, maxLength) {
  const characters = [...String(value)];
  return characters.length <= maxLength ? String(value) : characters.slice(0, maxLength - 1).join("") + "…";
}

function normalizeDevtoTags(tags = []) {
  const normalized = [];
  const seen = new Set();
  for (const tag of tags) {
    const candidate = String(tag).trim().toLowerCase().replace(/\s+/gu, "");
    if (!/^[a-z0-9][a-z0-9-]{0,29}$/u.test(candidate) || seen.has(candidate)) continue;
    seen.add(candidate);
    normalized.push(candidate);
    if (normalized.length === 4) break;
  }
  return normalized;
}

function parseArgs(argv) {
  const options = { articles: [], platforms: [], dryRun: false, draft: false, all: false };
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
    else if (arg === "--draft") options.draft = true;
    else if (arg === "--all") options.all = true;
    else throw new Error("Unknown compiler option: " + arg);
  }
  if (options.all && options.articles.length > 0) throw new Error("choose either --all or --article");
  if (!options.all && options.articles.length === 0) throw new Error("at least one --article is required");
  if (options.platforms.length === 0) throw new Error("--platforms is required");
  options.articles = [...new Set(options.articles)];
  options.platforms = [...new Set(options.platforms)];
  return options;
}

function articleRootFor(contentRoot, language) {
  const root = path.join(contentRoot, "src", "content", "articles");
  return language === "en" ? path.join(root, "en") : root;
}

function sourceFileFor(contentRoot, slug, language) {
  return path.join(articleRootFor(contentRoot, language), ...slug.split("/")) + ".md";
}

async function walkMarkdown(directory, { excludeEnglish = false } = {}) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (excludeEnglish && entry.isDirectory() && entry.name === "en") continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walkMarkdown(absolute));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) files.push(absolute);
  }
  return files.sort();
}

async function publishedSlugs(contentRoot, language) {
  const root = articleRootFor(contentRoot, language);
  const result = [];
  for (const sourceFile of await walkMarkdown(root, { excludeEnglish: language === "zh-CN" })) {
    const article = parseArticle(await readFile(sourceFile, "utf8"), sourceFile);
    if (article.status !== "published") continue;
    result.push(path.relative(root, sourceFile).replace(/\.md$/iu, "").split(path.sep).join("/"));
  }
  return result;
}

function compileDevto(article, { slug, profile, language, draft }) {
  const canonicalUrl = buildArticleCanonicalUrl(slug, language);
  const body = compilePublishingMarkdown(article.body, {
    platform: "devto",
    siteOrigin: "https://thinkerqaq.github.io",
  }).markdown.trim();
  const footer = renderPublishingFooter(profile, {
    canonicalUrl,
    title: article.title,
    site: language === "en" ? "ThinkerQAQ's personal blog" : "ThinkerQAQ 的个人博客",
  });
  const markdown = body + (footer ? "\n\n---\n\n" + footer : "") + "\n";
  return {
    title: article.title,
    description: truncate(article.description, 256),
    markdown,
    html: renderPlatformHtml(markdown),
    canonicalUrl,
    nativeCanonicalUrl: nativeCanonicalUrl(canonicalUrl, profile),
    tags: normalizeDevtoTags(article.tags),
    coverImageUrl: resolveArticleAssetUrl(article.coverImage),
    published: !draft,
  };
}

export async function compileArticle({
  contentRoot,
  slug,
  platform,
  publishingConfig,
  dryRun = false,
  draft = false,
  env = process.env,
} = {}) {
  const profile = publishingConfig?.[platform];
  if (!profile) throw new Error("missing publishing profile for " + platform);
  const language = profile.language || "zh-CN";
  const sourceFile = sourceFileFor(contentRoot, slug, language);
  const source = await readFile(sourceFile, "utf8");
  const article = parseArticle(source, sourceFile);
  if (article.status !== "published") throw new Error("article is not published: " + slug);

  let compiled;
  let hashSource;
  if (platform === "devto") {
    compiled = compileDevto(article, { slug, profile, language, draft });
    hashSource = JSON.stringify({
      title: compiled.title,
      description: compiled.description,
      markdown: compiled.markdown,
      nativeCanonicalUrl: compiled.nativeCanonicalUrl,
      tags: compiled.tags,
      coverImageUrl: compiled.coverImageUrl,
      published: compiled.published,
    });
  } else {
    const generated = buildPlatformMarkdown(article, {
      platform,
      slug,
      publishingConfig: profile,
      language,
    });
    const generatedArticle = parseArticle(generated, platform + ":" + slug);
    compiled = {
      title: generatedArticle.title,
      description: generatedArticle.description,
      markdown: generatedArticle.body,
      html: renderPlatformHtml(generatedArticle.body),
      canonicalUrl: buildArticleCanonicalUrl(slug, language),
      nativeCanonicalUrl: "",
      tags: article.tags,
      coverImageUrl: resolveArticleAssetUrl(article.coverImage),
      published: false,
    };
    hashSource = generated + "\n<!-- blogctl-html -->\n" + compiled.html;
  }

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
    title: compiled.title,
    description: compiled.description,
    markdown: compiled.markdown,
    html: compiled.html,
    language,
    canonicalUrl: compiled.canonicalUrl,
    nativeCanonicalUrl: compiled.nativeCanonicalUrl,
    tags: compiled.tags,
    coverImageUrl: compiled.coverImageUrl,
    published: compiled.published,
    contentHash: sha256(hashSource),
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
  const resolvedRoot = path.resolve(contentRoot);
  const publishingConfig = await loadPublishingConfig(env);
  const articles = [];

  for (const platform of options.platforms) {
    const profile = publishingConfig?.[platform];
    if (!profile) throw new Error("missing publishing profile for " + platform);
    const slugs = options.all
      ? await publishedSlugs(resolvedRoot, profile.language || "zh-CN")
      : options.articles;
    for (const slug of slugs) {
      articles.push(await compileArticle({
        contentRoot: resolvedRoot,
        slug,
        platform,
        publishingConfig,
        dryRun: options.dryRun,
        draft: options.draft,
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
