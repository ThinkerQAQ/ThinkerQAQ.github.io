import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const DEFAULT_SITE_ORIGIN = "https://thinkerqaq.github.io";
export const DEFAULT_SITEMAP_INDEX = "sitemap-index.xml";
export const DEFAULT_TEXT_SITEMAP = "sitemap-all.txt";
export const MAX_TEXT_SITEMAP_URLS = 50_000;

export function decodeXml(value) {
  return String(value)
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

export function extractLocations(xml) {
  return [...String(xml).matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gu)]
    .map((match) => decodeXml(match[1].trim()));
}

export function normalizeSiteOrigin(value = DEFAULT_SITE_ORIGIN) {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`Unsupported site protocol: ${url.protocol}`);
  }
  return url.origin;
}

export function assertSiteUrl(rawUrl, origin, label = "URL") {
  const url = new URL(rawUrl);
  if (url.origin !== origin) {
    throw new Error(`${label} must use ${origin}: ${rawUrl}`);
  }
  return url;
}

export function sitemapFileForUrl(distRoot, rawUrl, origin) {
  const url = assertSiteUrl(rawUrl, origin, "Sitemap URL");
  const decodedPath = decodeURIComponent(url.pathname);
  const relative = decodedPath.replace(/^\/+/, "");
  if (!relative) throw new Error(`Sitemap URL does not identify a file: ${rawUrl}`);

  const root = path.resolve(distRoot);
  const candidate = path.resolve(root, relative);
  const prefix = `${root}${path.sep}`;
  if (candidate !== root && !candidate.startsWith(prefix)) {
    throw new Error(`Sitemap path escapes dist root: ${rawUrl}`);
  }
  return candidate;
}

export async function loadSearchInventory({
  distRoot = "dist",
  sitemapIndex = DEFAULT_SITEMAP_INDEX,
  expectedOrigin,
} = {}) {
  const root = path.resolve(distRoot);
  const indexPath = path.join(root, sitemapIndex);
  const indexXml = await readFile(indexPath, "utf8");
  const sitemapUrls = extractLocations(indexXml);
  if (sitemapUrls.length === 0) {
    throw new Error(`No child sitemaps were found in ${sitemapIndex}`);
  }

  const origin = normalizeSiteOrigin(expectedOrigin || new URL(sitemapUrls[0]).origin);
  const urlList = new Set();

  for (const sitemapUrl of sitemapUrls) {
    assertSiteUrl(sitemapUrl, origin, "Sitemap URL");
    const sitemap = await readFile(sitemapFileForUrl(root, sitemapUrl, origin), "utf8");
    for (const pageUrl of extractLocations(sitemap)) {
      const parsed = assertSiteUrl(pageUrl, origin, "Page URL");
      parsed.hash = "";
      urlList.add(parsed.toString());
    }
  }

  if (urlList.size === 0) {
    throw new Error("No page URLs were found in the generated sitemaps");
  }

  return {
    origin,
    sitemapIndexUrl: new URL(`/${sitemapIndex}`, `${origin}/`).toString(),
    sitemapUrls: [...new Set(sitemapUrls)].sort(),
    urlList: [...urlList].sort(),
  };
}

export async function writeTextSitemap({
  distRoot = "dist",
  output = DEFAULT_TEXT_SITEMAP,
  inventory,
} = {}) {
  const resolvedInventory = inventory ?? await loadSearchInventory({ distRoot });
  if (resolvedInventory.urlList.length > MAX_TEXT_SITEMAP_URLS) {
    throw new Error(
      `Text sitemap has ${resolvedInventory.urlList.length} URLs; split it before exceeding ${MAX_TEXT_SITEMAP_URLS}`,
    );
  }
  const outputPath = path.resolve(distRoot, output);
  const root = path.resolve(distRoot);
  if (outputPath !== root && !outputPath.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Text sitemap output escapes dist root: ${output}`);
  }
  await writeFile(outputPath, `${resolvedInventory.urlList.join("\n")}\n`, "utf8");
  return {
    output: outputPath,
    urlCount: resolvedInventory.urlList.length,
    origin: resolvedInventory.origin,
  };
}

export async function readUrlFile(file, { expectedOrigin } = {}) {
  const content = await readFile(path.resolve(file), "utf8");
  const origin = expectedOrigin ? normalizeSiteOrigin(expectedOrigin) : "";
  const urls = new Set();
  for (const line of content.split(/\r?\n/u)) {
    const value = line.trim();
    if (!value || value.startsWith("#")) continue;
    const url = new URL(value);
    if (origin) assertSiteUrl(url.toString(), origin, "Submitted URL");
    url.hash = "";
    urls.add(url.toString());
  }
  return [...urls].sort();
}
