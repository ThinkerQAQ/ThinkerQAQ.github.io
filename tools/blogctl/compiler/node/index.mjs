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
  buildMediumCopyHtml,
  buildMediumDraft,
} from "../../../../scripts/medium.mjs";
import {
  assertNoUncompiledDiagrams,
  collectPublishingAssets,
  compilePublishingMarkdown,
} from "./compiler.mjs";

const NATIVE_IMAGE_UPLOAD_PLATFORMS = new Set([
  "cnblogs", "juejin", "csdn", "segmentfault", "51cto", "oschina", "toutiao", "devto", "medium",
]);

function internalAssetRef(asset) {
  return `blogctl-asset://${asset.kind}/${asset.id}`;
}

function useNativeImageUpload(platform) {
  return NATIVE_IMAGE_UPLOAD_PLATFORMS.has(platform);
}

function replaceAssetUrls(value, assets) {
  let result = String(value ?? "");
  for (const asset of assets) {
    result = result.replaceAll(asset.publicUrl, internalAssetRef(asset));
  }
  return result;
}

function replaceAssetUrlsDeep(value, assets) {
  if (typeof value === "string") return replaceAssetUrls(value, assets);
  if (Array.isArray(value)) return value.map((item) => replaceAssetUrlsDeep(item, assets));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceAssetUrlsDeep(item, assets)]));
  }
  return value;
}
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

function compileDevto(article, { slug, profile, language }) {
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
    // BlogCTL separates Save from Publish. Keep compilation state-neutral so
    // the saved draft hash is still valid when the explicit Publish job runs.
    published: false,
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
    compiled = compileDevto(article, { slug, profile, language });
    hashSource = JSON.stringify({
      title: compiled.title,
      description: compiled.description,
      markdown: compiled.markdown,
      nativeCanonicalUrl: compiled.nativeCanonicalUrl,
      tags: compiled.tags,
      coverImageUrl: compiled.coverImageUrl,
      published: compiled.published,
    });
  } else if (platform === "medium") {
    const mediumDraft = buildMediumDraft(article, { slug, publishingConfig: profile });
    const portable = compilePublishingMarkdown(article.body, {
      platform: "medium",
      siteOrigin: "https://thinkerqaq.github.io",
    }).markdown.trim();
    const fallbackHTML = buildMediumCopyHtml(article, { slug, publishingConfig: profile });
    compiled = {
      title: article.title,
      description: article.description,
      markdown: portable,
      html: fallbackHTML,
      canonicalUrl: buildArticleCanonicalUrl(slug, language),
      nativeCanonicalUrl: mediumDraft.canonicalUrl,
      tags: mediumDraft.tags,
      coverImageUrl: mediumDraft.coverImage?.url || "",
      published: false,
      payload: {
        title: mediumDraft.title,
        deltas: mediumDraft.deltas,
        canonicalUrl: mediumDraft.canonicalUrl,
        tags: mediumDraft.tags,
        coverImage: mediumDraft.coverImage,
      },
      fallbackHTML,
      requiresFallback: mediumDraft.requiresHtmlFallback,
      warnings: mediumDraft.warnings,
    };
    hashSource = JSON.stringify({
      payload: compiled.payload,
      fallbackHTML,
      requiresFallback: compiled.requiresFallback,
    });
  } else {
    const generated = buildPlatformMarkdown(article, {
      platform,
      slug,
      publishingConfig: profile,
      language,
    });
    const generatedArticle = parseArticle(generated, platform + ":" + slug);
    const portable = compilePublishingMarkdown(generatedArticle.body, {
      platform,
      siteOrigin: "https://thinkerqaq.github.io",
    }).markdown.trim();
    compiled = {
      title: generatedArticle.title,
      description: generatedArticle.description,
      markdown: portable,
      html: renderPlatformHtml(portable),
      canonicalUrl: buildArticleCanonicalUrl(slug, language),
      nativeCanonicalUrl: "",
      tags: article.tags,
      coverImageUrl: resolveArticleAssetUrl(article.coverImage),
      published: false,
    };
    hashSource = generatedArticle.title + "\n" + portable + "\n<!-- blogctl-html -->\n" + compiled.html;
  }

  assertNoUncompiledDiagrams(compiled.markdown, { platform });
  assertNoUncompiledDiagrams(compiled.html, { platform });

  const assets = collectPublishingAssets(article.body);
  const nativeImageUpload = useNativeImageUpload(platform) && !dryRun;
  await preparePublishingAssetList(assets, {
    dryRun,
    cacheRoot: path.join(contentRoot, ".distribution", "assets"),
    env,
    uploadFallback: !nativeImageUpload,
  });

  if (nativeImageUpload && assets.length) {
    compiled.markdown = replaceAssetUrls(compiled.markdown, assets);
    compiled.html = replaceAssetUrls(compiled.html, assets);
    if (compiled.payload) compiled.payload = replaceAssetUrlsDeep(compiled.payload, assets);
  }

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
    payload: compiled.payload,
    fallbackHtml: compiled.fallbackHTML,
    requiresFallback: compiled.requiresFallback,
    warnings: compiled.warnings,
    contentHash: sha256(hashSource),
    sourceDir: path.dirname(sourceFile),
    assets: assets.map(({ kind, id, objectKey, publicUrl, alt }) => ({
      kind, id, objectKey, publicUrl, alt,
      source: nativeImageUpload ? internalAssetRef({ kind, id }) : publicUrl,
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
