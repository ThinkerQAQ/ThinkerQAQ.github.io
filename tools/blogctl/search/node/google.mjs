import { DEFAULT_SITE_ORIGIN, assertSiteUrl, normalizeSiteOrigin } from "./inventory.mjs";

export const GOOGLE_SEARCH_CONSOLE_API = "https://www.googleapis.com/webmasters/v3";
export const GOOGLE_URL_INSPECTION_API = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";
export const GOOGLE_DEFAULT_SITEMAPS = ["sitemap-index.xml", "sitemap-all.txt"];
export const GOOGLE_URL_INSPECTION_DAILY_SITE_LIMIT = 2000;
export const GOOGLE_URL_INSPECTION_PER_MINUTE_SITE_LIMIT = 600;
export const GOOGLE_URL_INSPECTION_DEFAULT_DELAY_MS = 110;

function googleApiError(prefix, response, text) {
  return new Error(`${prefix} failed with HTTP ${response.status}: ${String(text).slice(0, 500)}`);
}

export function normalizeSearchConsoleSiteUrl(value = `${DEFAULT_SITE_ORIGIN}/`) {
  const trimmed = String(value || "").trim();
  if (trimmed.startsWith("sc-domain:")) return trimmed;
  const url = new URL(trimmed);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`Unsupported Search Console property protocol: ${url.protocol}`);
  }
  url.hash = "";
  url.search = "";
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  return url.toString();
}

export async function submitGoogleSitemap({
  siteUrl,
  feedPath,
  accessToken,
  fetchImpl = fetch,
  apiBase = GOOGLE_SEARCH_CONSOLE_API,
}) {
  if (!accessToken) throw new Error("Google Search Console access token is required");
  const normalizedSiteUrl = normalizeSearchConsoleSiteUrl(siteUrl);
  const endpoint = `${apiBase}/sites/${encodeURIComponent(normalizedSiteUrl)}/sitemaps/${encodeURIComponent(feedPath)}`;
  const response = await fetchImpl(endpoint, {
    method: "PUT",
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const text = await response.text();
  if (!response.ok) throw googleApiError("Google sitemap submission", response, text);
  return { siteUrl: normalizedSiteUrl, feedPath, httpStatus: response.status };
}

export async function submitGoogleSitemaps({
  siteUrl,
  origin = DEFAULT_SITE_ORIGIN,
  accessToken,
  sitemapNames = GOOGLE_DEFAULT_SITEMAPS,
  fetchImpl = fetch,
  apiBase = GOOGLE_SEARCH_CONSOLE_API,
}) {
  const siteOrigin = normalizeSiteOrigin(origin);
  const results = [];
  for (const name of sitemapNames) {
    const feedPath = new URL(`/${String(name).replace(/^\/+/u, "")}`, `${siteOrigin}/`).toString();
    results.push(await submitGoogleSitemap({
      siteUrl,
      feedPath,
      accessToken,
      fetchImpl,
      apiBase,
    }));
  }
  return results;
}

export async function inspectGoogleUrl({
  siteUrl,
  inspectionUrl,
  accessToken,
  languageCode = "en-US",
  fetchImpl = fetch,
  endpoint = GOOGLE_URL_INSPECTION_API,
}) {
  if (!accessToken) throw new Error("Google Search Console access token is required");
  const normalizedSiteUrl = normalizeSearchConsoleSiteUrl(siteUrl);
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      inspectionUrl,
      siteUrl: normalizedSiteUrl,
      languageCode,
    }),
  });
  const text = await response.text();
  if (!response.ok) throw googleApiError("Google URL inspection", response, text);
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Google URL inspection returned invalid JSON: ${error.message}`);
  }
}

export function normalizeInspectionResult(inspectionUrl, response) {
  const result = response?.inspectionResult ?? {};
  const index = result.indexStatusResult ?? {};
  return {
    url: inspectionUrl,
    verdict: index.verdict ?? "",
    coverageState: index.coverageState ?? "",
    robotsTxtState: index.robotsTxtState ?? "",
    indexingState: index.indexingState ?? "",
    lastCrawlTime: index.lastCrawlTime ?? "",
    pageFetchState: index.pageFetchState ?? "",
    userCanonical: index.userCanonical ?? "",
    googleCanonical: index.googleCanonical ?? "",
    crawledAs: index.crawledAs ?? "",
    referringUrls: Array.isArray(index.referringUrls) ? index.referringUrls : [],
    sitemap: Array.isArray(index.sitemap) ? index.sitemap : [],
  };
}

export function summarizeGoogleInspection(results) {
  const summary = {
    total: results.length,
    verdicts: {},
    coverageStates: {},
    withSitemap: 0,
    withoutSitemap: 0,
    neverCrawled: 0,
  };
  for (const result of results) {
    const verdict = result.verdict || "UNKNOWN";
    const coverageState = result.coverageState || "UNKNOWN";
    summary.verdicts[verdict] = (summary.verdicts[verdict] || 0) + 1;
    summary.coverageStates[coverageState] = (summary.coverageStates[coverageState] || 0) + 1;
    if (result.sitemap.length > 0) summary.withSitemap += 1;
    else summary.withoutSitemap += 1;
    if (!result.lastCrawlTime) summary.neverCrawled += 1;
  }
  return summary;
}

export async function auditGoogleUrls(urls, {
  siteUrl,
  origin = DEFAULT_SITE_ORIGIN,
  accessToken,
  offset = 0,
  limit = GOOGLE_URL_INSPECTION_DAILY_SITE_LIMIT,
  languageCode = "en-US",
  fetchImpl = fetch,
  endpoint = GOOGLE_URL_INSPECTION_API,
  requestDelayMs = GOOGLE_URL_INSPECTION_DEFAULT_DELAY_MS,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  if (!Number.isInteger(offset) || offset < 0) {
    throw new Error("Google audit offset must be a non-negative integer");
  }
  if (!Number.isInteger(limit) || limit <= 0 || limit > GOOGLE_URL_INSPECTION_DAILY_SITE_LIMIT) {
    throw new Error(`Google audit limit must be between 1 and ${GOOGLE_URL_INSPECTION_DAILY_SITE_LIMIT}`);
  }
  if (!Number.isInteger(requestDelayMs) || requestDelayMs < 0) {
    throw new Error("Google audit request delay must be a non-negative integer");
  }

  const siteOrigin = normalizeSiteOrigin(origin);
  const selected = [];
  const end = Math.min(urls.length, offset + limit);
  for (let index = offset; index < end; index += 1) {
    const url = assertSiteUrl(urls[index], siteOrigin, "Inspection URL");
    selected.push(url.toString());
  }

  const results = [];
  for (let index = 0; index < selected.length; index += 1) {
    const inspectionUrl = selected[index];
    const response = await inspectGoogleUrl({
      siteUrl,
      inspectionUrl,
      accessToken,
      languageCode,
      fetchImpl,
      endpoint,
    });
    results.push(normalizeInspectionResult(inspectionUrl, response));
    if (requestDelayMs > 0 && index + 1 < selected.length) {
      await sleep(requestDelayMs);
    }
  }

  const inspected = results.length;
  const nextOffset = offset + inspected;
  return {
    siteUrl: normalizeSearchConsoleSiteUrl(siteUrl),
    offset,
    limit,
    inspected,
    totalAvailable: urls.length,
    remaining: Math.max(0, urls.length - nextOffset),
    nextOffset: nextOffset < urls.length ? nextOffset : null,
    summary: summarizeGoogleInspection(results),
    results,
  };
}
