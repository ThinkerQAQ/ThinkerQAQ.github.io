import { DEFAULT_SITE_ORIGIN, assertSiteUrl, normalizeSiteOrigin } from "./inventory.mjs";

export const GOOGLE_SEARCH_CONSOLE_API = "https://www.googleapis.com/webmasters/v3";
export const GOOGLE_URL_INSPECTION_API = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";
export const GOOGLE_DEFAULT_SITEMAPS = ["sitemap-index.xml", "sitemap-all.txt"];
export const GOOGLE_URL_INSPECTION_DAILY_SITE_LIMIT = 2000;

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

export async function auditGoogleUrls(urls, {
  siteUrl,
  origin = DEFAULT_SITE_ORIGIN,
  accessToken,
  limit = GOOGLE_URL_INSPECTION_DAILY_SITE_LIMIT,
  languageCode = "en-US",
  fetchImpl = fetch,
  endpoint = GOOGLE_URL_INSPECTION_API,
} = {}) {
  if (!Number.isInteger(limit) || limit <= 0 || limit > GOOGLE_URL_INSPECTION_DAILY_SITE_LIMIT) {
    throw new Error(`Google audit limit must be between 1 and ${GOOGLE_URL_INSPECTION_DAILY_SITE_LIMIT}`);
  }
  const siteOrigin = normalizeSiteOrigin(origin);
  const selected = [];
  for (const rawUrl of urls) {
    const url = assertSiteUrl(rawUrl, siteOrigin, "Inspection URL");
    selected.push(url.toString());
    if (selected.length >= limit) break;
  }

  const results = [];
  for (const inspectionUrl of selected) {
    const response = await inspectGoogleUrl({
      siteUrl,
      inspectionUrl,
      accessToken,
      languageCode,
      fetchImpl,
      endpoint,
    });
    results.push(normalizeInspectionResult(inspectionUrl, response));
  }
  return {
    siteUrl: normalizeSearchConsoleSiteUrl(siteUrl),
    inspected: results.length,
    totalAvailable: urls.length,
    results,
  };
}
