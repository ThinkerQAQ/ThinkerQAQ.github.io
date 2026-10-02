import { pathToFileURL } from "node:url";

import { renderPlatformHtml } from "./html.mjs";
import { renderPublishingFooter } from "./publishing-config.mjs";
import {
  buildMediumCopyHtml,
  buildMediumDraft,
} from "./medium.mjs";
import {
  assertNoUncompiledDiagrams,
  compilePublishingMarkdown,
} from "./compiler.mjs";

function compileDevto(article, { profile, policy, assetBaseUrl }) {
  const body = compilePublishingMarkdown(article.body, {
    platform: "devto",
    siteOrigin: "https://thinkerqaq.github.io",
    assetBaseUrl,
  }).markdown.trim();
  const footer = renderPublishingFooter(profile, {
    canonicalUrl: policy.canonicalUrl,
    title: article.title,
    site: "ThinkerQAQ's personal blog",
  });
  const markdown = body + (footer ? "\n\n---\n\n" + footer : "") + "\n";
  return {
    title: article.title,
    description: policy.description,
    markdown,
    html: renderPlatformHtml(markdown),
    canonicalUrl: policy.canonicalUrl,
    nativeCanonicalUrl: policy.nativeCanonicalUrl,
    tags: policy.tags,
    coverImageUrl: policy.coverImageUrl,
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
    sourceDir = "",
    assets = [],
    policy,
  } = request || {};
  if (!article || !slug || !platform || !profile || !language || !assetBaseUrl || !policy) {
    throw new Error("invalid compiler renderer request");
  }

  let compiled;
  if (platform === "devto") {
    compiled = compileDevto(article, { profile, policy, assetBaseUrl });
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
      canonicalUrl: policy.canonicalUrl,
      nativeCanonicalUrl: policy.nativeCanonicalUrl,
      tags: policy.tags,
      coverImageUrl: policy.coverImageUrl,
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
  } else {
    const body = compilePublishingMarkdown(article.body, {
      platform,
      siteOrigin: "https://thinkerqaq.github.io",
      assetBaseUrl,
    }).markdown;
    const footer = renderPublishingFooter(profile, {
      canonicalUrl: policy.canonicalUrl,
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
      description: policy.description,
      markdown: portable,
      html: renderPlatformHtml(portable),
      canonicalUrl: policy.canonicalUrl,
      nativeCanonicalUrl: policy.nativeCanonicalUrl,
      tags: policy.tags,
      coverImageUrl: policy.coverImageUrl,
      published: false,
    };
  }

  assertNoUncompiledDiagrams(compiled.markdown, { platform });
  assertNoUncompiledDiagrams(compiled.html, { platform });

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
    sourceDir,
    assets,
  };
}

export async function main() {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  const request = JSON.parse(raw);
  process.stdout.write(JSON.stringify(renderArticle(request)) + "\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write((error?.stack || error?.message || String(error)) + "\n");
    process.exitCode = 1;
  });
}
