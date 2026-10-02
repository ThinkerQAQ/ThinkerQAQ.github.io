import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import {
  buildArticleCanonicalUrl,
  renderPlatformHtml,
  resolveArticleAssetUrl,
} from "../../../../scripts/distribute.mjs";
import {
  nativeCanonicalUrl,
  renderPublishingFooter,
} from "../../../../scripts/publishing-config.mjs";
import {
  buildMediumCopyHtml,
  buildMediumDraft,
} from "../../../../scripts/medium.mjs";
import {
  assertNoUncompiledDiagrams,
  compilePublishingMarkdown,
} from "./compiler.mjs";

const NATIVE_IMAGE_UPLOAD_PLATFORMS = new Set([
  "cnblogs", "juejin", "csdn", "segmentfault", "zhihu", "51cto", "oschina", "toutiao", "devto", "medium",
]);

function internalAssetRef(asset) {
  return `blogctl-asset://${asset.kind}/${asset.id}`;
}

export function useNativeImageUpload(platform) {
  return NATIVE_IMAGE_UPLOAD_PLATFORMS.has(platform);
}

function replaceAssetUrls(value, assets) {
  let result = String(value ?? "");
  for (const asset of assets) result = result.replaceAll(asset.publicUrl, internalAssetRef(asset));
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

function compileDevto(article, { slug, profile, language, assetBaseUrl }) {
  const canonicalUrl = buildArticleCanonicalUrl(slug, language);
  const body = compilePublishingMarkdown(article.body, {
    platform: "devto",
    siteOrigin: "https://thinkerqaq.github.io",
    assetBaseUrl,
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
    published: false,
  };
}

export function renderArticle(request) {
  const {
    article,
    slug,
    platform,
    profile,
    language,
    assetBaseUrl,
    dryRun = false,
    sourceDir = "",
    assets = [],
  } = request || {};
  if (!article || !slug || !platform || !profile || !language || !assetBaseUrl) {
    throw new Error("invalid compiler renderer request");
  }

  let compiled;
  let hashSource;
  if (platform === "devto") {
    compiled = compileDevto(article, { slug, profile, language, assetBaseUrl });
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
      assetBaseUrl,
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
    const canonicalUrl = buildArticleCanonicalUrl(slug, language);
    const descriptionLimit = platform === "juejin" ? 100 : 256;
    const body = compilePublishingMarkdown(article.body, {
      platform,
      siteOrigin: "https://thinkerqaq.github.io",
      assetBaseUrl,
    }).markdown;
    const footer = renderPublishingFooter(profile, {
      canonicalUrl,
      title: article.title,
      site: language === "en" ? "ThinkerQAQ's personal blog" : "ThinkerQAQ 的个人博客",
    });
    const renderedBody = body + (footer ? "\n\n---\n\n" + footer : "");
    const portable = compilePublishingMarkdown(renderedBody, {
      platform,
      siteOrigin: "https://thinkerqaq.github.io",
      assetBaseUrl,
    }).markdown.trim();
    compiled = {
      title: article.title,
      description: truncate(article.description, descriptionLimit),
      markdown: portable,
      html: renderPlatformHtml(portable),
      canonicalUrl,
      nativeCanonicalUrl: "",
      tags: article.tags,
      coverImageUrl: resolveArticleAssetUrl(article.coverImage),
      published: false,
    };
    hashSource = article.title + "\n" + portable + "\n<!-- blogctl-html -->\n" + compiled.html;
  }

  assertNoUncompiledDiagrams(compiled.markdown, { platform });
  assertNoUncompiledDiagrams(compiled.html, { platform });

  const nativeImageUpload = useNativeImageUpload(platform) && !dryRun;
  if (nativeImageUpload && assets.length) {
    compiled.markdown = replaceAssetUrls(compiled.markdown, assets);
    compiled.html = replaceAssetUrls(compiled.html, assets);
    if (compiled.payload) compiled.payload = replaceAssetUrlsDeep(compiled.payload, assets);
  }

  return {
    version: 1,
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
    sourceDir,
    assets: assets.map(({ kind, id, renderer, source: definition, objectKey, publicUrl, alt }) => ({
      kind, id, renderer, definition, objectKey, publicUrl, alt,
      source: nativeImageUpload ? internalAssetRef({ kind, id }) : publicUrl,
    })),
  };
}

export async function main() {
  const raw = await readFile(0, "utf8");
  const request = JSON.parse(raw);
  process.stdout.write(JSON.stringify(renderArticle(request)) + "\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write((error?.stack || error?.message || String(error)) + "\n");
    process.exitCode = 1;
  });
}
