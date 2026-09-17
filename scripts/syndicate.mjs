import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArticle } from "./distribute.mjs";
import {
  defaultPlatformPublishingConfig,
  nativeCanonicalUrl,
  renderPublishingFooter,
} from "./publishing-config.mjs";

export const SITE_ORIGIN = "https://thinkerqaq.github.io";
export const DEVTO_API_ORIGIN = "https://dev.to";
export const DEVTO_ACCEPT = "application/vnd.forem.api-v1+json";
export const SUPPORTED_PLATFORMS = ["devto"];
const DEFAULT_ARTICLE_ROOT = "src/content/articles/en";
const MAX_DEVTO_TAGS = 4;
const MAX_DEVTO_DESCRIPTION = 256;

function log(severity, operation, status, details = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    severity,
    operation,
    status,
    ...details,
  }));
}

function stripTrailingSlash(value) {
  return value.length > 1 ? value.replace(/\/+$/u, "") : value;
}

export function canonicalUrlsEqual(left, right) {
  if (!left || !right) return false;
  try {
    const a = new URL(left);
    const b = new URL(right);
    a.hash = "";
    b.hash = "";
    a.search = "";
    b.search = "";
    return a.origin.toLowerCase() === b.origin.toLowerCase()
      && stripTrailingSlash(a.pathname) === stripTrailingSlash(b.pathname);
  } catch {
    return false;
  }
}

export function normalizeDevtoTags(tags = []) {
  const normalized = [];
  const seen = new Set();
  for (const tag of tags) {
    const candidate = String(tag).trim().toLowerCase().replace(/\s+/gu, "");
    if (!/^[a-z0-9][a-z0-9-]{0,29}$/u.test(candidate)) continue;
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    normalized.push(candidate);
    if (normalized.length === MAX_DEVTO_TAGS) break;
  }
  return normalized;
}

export function makeExternalLinksAbsolute(body) {
  return body
    .replace(/(\]\()\/(?!\/)/gu, `$1${SITE_ORIGIN}/`)
    .replace(/((?:href|src)=["'])\/(?!\/)/giu, `$1${SITE_ORIGIN}/`);
}

export function buildCanonicalUrl(slug) {
  const encodedSlug = slug.split("/").map(encodeURIComponent).join("/");
  return new URL(`/en/articles/${encodedSlug}/`, SITE_ORIGIN).toString();
}

function truncate(value, maxLength) {
  const characters = [...String(value)];
  return characters.length <= maxLength ? String(value) : `${characters.slice(0, maxLength - 1).join("")}…`;
}

export function buildDevtoArticle(article, {
  slug,
  published = true,
  publishingConfig = defaultPlatformPublishingConfig("devto"),
} = {}) {
  const canonicalUrl = buildCanonicalUrl(slug);
  const body = makeExternalLinksAbsolute(article.body).trim();
  const footer = renderPublishingFooter(publishingConfig, {
    canonicalUrl,
    title: article.title,
    site: "ThinkerQAQ's personal blog",
  });
  const footerSection = footer ? `\n\n---\n\n${footer}` : "";
  return {
    title: article.title,
    body_markdown: `${body}${footerSection}\n`,
    published,
    canonical_url: nativeCanonicalUrl(canonicalUrl, publishingConfig),
    description: truncate(article.description, MAX_DEVTO_DESCRIPTION),
    tags: normalizeDevtoTags(article.tags).join(","),
  };
}

function normalizeBody(value = "") {
  return String(value).replaceAll("\r\n", "\n").trim();
}

function remoteTags(article) {
  if (Array.isArray(article.tag_list)) return normalizeDevtoTags(article.tag_list);
  if (typeof article.tags === "string") return normalizeDevtoTags(article.tags.split(","));
  return [];
}

export function devtoArticleMatches(remote, desired) {
  if (!remote) return false;
  const remotePublished = typeof remote.published === "boolean"
    ? remote.published
    : Boolean(remote.published_at || remote.published_timestamp);
  const canonicalMatches = desired.canonical_url
    ? canonicalUrlsEqual(remote.canonical_url, desired.canonical_url)
    : !String(remote.canonical_url || "").trim();
  return remote.title === desired.title
    && remote.description === desired.description
    && canonicalMatches
    && normalizeBody(remote.body_markdown) === normalizeBody(desired.body_markdown)
    && remoteTags(remote).join(",") === normalizeDevtoTags(desired.tags.split(",")).join(",")
    && remotePublished === Boolean(desired.published);
}

function articleEndpoint(apiOrigin, suffix) {
  return new URL(`/api/${suffix.replace(/^\/+/, "")}`, apiOrigin).toString();
}

async function devtoRequest(apiKey, url, options = {}, fetchImpl = fetch) {
  const response = await fetchImpl(url, {
    ...options,
    headers: {
      accept: DEVTO_ACCEPT,
      "api-key": apiKey,
      "content-type": "application/json",
      "user-agent": "ThinkerQAQ-Blog-Syndicator/1.0",
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  if (!response.ok) {
    const detail = typeof payload === "string" ? payload : JSON.stringify(payload);
    throw new Error(`DEV.to API ${response.status} ${response.statusText}: ${detail}`);
  }
  return payload;
}

export async function listDevtoArticles({
  apiKey,
  apiOrigin = DEVTO_API_ORIGIN,
  fetchImpl = fetch,
} = {}) {
  const articles = [];
  for (let page = 1; ; page += 1) {
    const url = new URL(articleEndpoint(apiOrigin, "articles/me/all"));
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", "100");
    const batch = await devtoRequest(apiKey, url.toString(), { method: "GET" }, fetchImpl);
    if (!Array.isArray(batch)) throw new Error("Unexpected DEV.to article list response");
    articles.push(...batch);
    if (batch.length < 100) break;
  }
  return articles;
}

export async function upsertDevtoArticle(desired, {
  apiKey,
  remoteArticles,
  apiOrigin = DEVTO_API_ORIGIN,
  fetchImpl = fetch,
} = {}) {
  const existing = remoteArticles.find((article) => (
  desired.canonical_url && canonicalUrlsEqual(article.canonical_url, desired.canonical_url)
)) ?? (!desired.canonical_url
  ? remoteArticles.find((article) => (
      !String(article.canonical_url || "").trim()
      && article.title === desired.title
    ))
  : undefined);
  if (!existing) {
    const created = await devtoRequest(
      apiKey,
      articleEndpoint(apiOrigin, "articles"),
      { method: "POST", body: JSON.stringify({ article: desired }) },
      fetchImpl,
    );
    remoteArticles.push(created);
    return { action: "created", article: created };
  }

  let fullExisting = existing;
  if (typeof fullExisting.body_markdown !== "string") {
    fullExisting = await devtoRequest(
      apiKey,
      articleEndpoint(apiOrigin, `articles/${existing.id}`),
      { method: "GET" },
      fetchImpl,
    );
  }
  if (devtoArticleMatches(fullExisting, desired)) {
    return { action: "skipped", article: fullExisting };
  }

  const updated = await devtoRequest(
    apiKey,
    articleEndpoint(apiOrigin, `articles/${existing.id}`),
    { method: "PUT", body: JSON.stringify({ article: desired }) },
    fetchImpl,
  );
  Object.assign(existing, updated);
  return { action: "updated", article: updated };
}

async function walkMarkdown(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walkMarkdown(absolute));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) files.push(absolute);
  }
  return files.sort();
}

export async function loadEnglishArticles({ articleRoot, requestedSlugs = [] } = {}) {
  const root = path.resolve(articleRoot);
  const requested = new Set(requestedSlugs);
  const seen = new Set();
  const articles = [];
  for (const sourceFile of await walkMarkdown(root)) {
    const slug = path.relative(root, sourceFile)
      .replace(/\.md$/iu, "")
      .split(path.sep)
      .join("/");
    if (requested.size > 0 && !requested.has(slug)) continue;
    seen.add(slug);
    const article = parseArticle(await readFile(sourceFile, "utf8"), sourceFile);
    if (article.status !== "published") continue;
    articles.push({ slug, sourceFile, article });
  }
  const missing = [...requested].filter((slug) => !seen.has(slug));
  if (missing.length > 0) throw new Error(`Unknown English article slug: ${missing.join(", ")}`);
  return articles;
}

export function parseArguments(argv) {
  const options = {
    platforms: ["devto"],
    requestedSlugs: [],
    dryRun: false,
    draft: false,
    help: false,
  };
  function requireValue(option, index) {
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${option} requires a value`);
    return value;
  }
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--article") {
      options.requestedSlugs.push(requireValue(argument, index));
      index += 1;
    } else if (argument === "--platforms") {
      options.platforms = requireValue(argument, index).split(",").filter(Boolean);
      index += 1;
    } else if (argument === "--dry-run") options.dryRun = true;
    else if (argument === "--draft") options.draft = true;
    else if (argument === "--help" || argument === "-h") options.help = true;
    else throw new Error(`Unknown option: ${argument}`);
  }
  const unsupported = options.platforms.filter((item) => !SUPPORTED_PLATFORMS.includes(item));
  if (unsupported.length > 0) throw new Error(`Unsupported platform: ${unsupported.join(", ")}`);
  if (options.platforms.length === 0) throw new Error("--platforms requires at least one platform");
  return options;
}

function printHelp() {
  console.log(`Usage: npm run syndicate -- [options]\n\nSyndicate published English articles to international platforms.\n\nOptions:\n  --article <slug>       Sync one English article; may be repeated\n  --platforms <list>     Comma-separated platforms (currently: devto)\n  --dry-run              Validate and print planned payloads without network calls\n  --draft                Create or update DEV.to articles as drafts\n  -h, --help             Show this help`);
}

export async function runSyndication({
  articleRoot,
  requestedSlugs = [],
  dryRun = false,
  draft = false,
  apiKey = process.env.DEVTO_API_KEY,
  apiOrigin = process.env.DEVTO_API_ORIGIN || DEVTO_API_ORIGIN,
  fetchImpl = fetch,
} = {}) {
  const loaded = await loadEnglishArticles({ articleRoot, requestedSlugs });
  const desiredArticles = loaded.map(({ slug, article }) => ({
    slug,
    payload: buildDevtoArticle(article, { slug, published: !draft, publishingConfig }),
  }));

  if (dryRun) {
    for (const item of desiredArticles) {
      log("info", "syndication-devto", "dry-run", {
        slug: item.slug,
        canonicalUrl: item.payload.canonical_url,
        title: item.payload.title,
        tags: item.payload.tags,
        published: item.payload.published,
      });
    }
    return { total: desiredArticles.length, created: 0, updated: 0, skipped: 0, dryRun: true };
  }
  if (!apiKey) throw new Error("DEVTO_API_KEY is required unless --dry-run is used");

  const remoteArticles = await listDevtoArticles({ apiKey, apiOrigin, fetchImpl });
  const summary = { total: desiredArticles.length, created: 0, updated: 0, skipped: 0, dryRun: false };
  for (const item of desiredArticles) {
    const startedAt = Date.now();
    const result = await upsertDevtoArticle(item.payload, {
      apiKey,
      remoteArticles,
      apiOrigin,
      fetchImpl,
    });
    summary[result.action] += 1;
    log("info", "syndication-devto", result.action, {
      slug: item.slug,
      canonicalUrl: item.payload.canonical_url,
      remoteUrl: result.article?.url,
      durationMs: Date.now() - startedAt,
    });
  }
  return summary;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const repositoryRoot = path.resolve(scriptDir, "..");
  const summary = await runSyndication({
    articleRoot: path.join(repositoryRoot, DEFAULT_ARTICLE_ROOT),
    requestedSlugs: options.requestedSlugs,
    dryRun: options.dryRun,
    draft: options.draft,
  });
  log("info", "syndication", "completed", summary);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  main().catch((error) => {
    log("error", "syndication", "failed", {
      exception: { name: error.name, message: error.message, stack: error.stack },
    });
    process.exitCode = 1;
  });
}
