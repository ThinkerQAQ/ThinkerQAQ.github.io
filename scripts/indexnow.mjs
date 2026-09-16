import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SITE_ORIGIN = "https://thinkerqaq.github.io";
export const INDEXNOW_KEY = "fb26fca3ba9449c6816b6d79b0a41cec";
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
export const INDEXNOW_KEY_LOCATION = `${SITE_ORIGIN}/${INDEXNOW_KEY}.txt`;

function log(severity, operation, status, details = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    severity,
    operation,
    status,
    ...details,
  }));
}

function decodeXml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

export function extractLocations(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gu)]
    .map((match) => decodeXml(match[1].trim()));
}

function assertSiteUrl(rawUrl, label) {
  const url = new URL(rawUrl);
  if (url.origin !== SITE_ORIGIN) {
    throw new Error(`${label} must use ${SITE_ORIGIN}: ${rawUrl}`);
  }
  return url;
}

export async function preparePayload({
  distRoot = "dist",
  publicRoot = "public",
} = {}) {
  const startedAt = Date.now();
  const resolvedDistRoot = path.resolve(distRoot);
  const resolvedPublicRoot = path.resolve(publicRoot);
  log("info", "indexnow-prepare", "started", { distRoot: resolvedDistRoot });

  const keyFile = path.join(resolvedPublicRoot, `${INDEXNOW_KEY}.txt`);
  const hostedKey = (await readFile(keyFile, "utf8")).trim();
  if (hostedKey !== INDEXNOW_KEY) {
    throw new Error(`IndexNow key file does not match configured key: ${keyFile}`);
  }

  const sitemapIndex = await readFile(path.join(resolvedDistRoot, "sitemap-index.xml"), "utf8");
  const sitemapUrls = extractLocations(sitemapIndex);
  if (sitemapUrls.length === 0) {
    throw new Error("No child sitemaps were found in sitemap-index.xml");
  }

  const urlList = new Set();
  for (const sitemapUrl of sitemapUrls) {
    const parsedSitemapUrl = assertSiteUrl(sitemapUrl, "Sitemap URL");
    const sitemapFile = path.join(
      resolvedDistRoot,
      decodeURIComponent(parsedSitemapUrl.pathname).replace(/^\/+/, ""),
    );
    const sitemap = await readFile(sitemapFile, "utf8");
    for (const pageUrl of extractLocations(sitemap)) {
      assertSiteUrl(pageUrl, "Page URL");
      urlList.add(pageUrl);
    }
  }

  if (urlList.size === 0) {
    throw new Error("No page URLs were found in the generated sitemaps");
  }

  const payload = {
    host: new URL(SITE_ORIGIN).host,
    key: INDEXNOW_KEY,
    keyLocation: INDEXNOW_KEY_LOCATION,
    urlList: [...urlList].sort(),
  };
  log("info", "indexnow-prepare", "completed", {
    urlCount: payload.urlList.length,
    durationMs: Date.now() - startedAt,
  });
  return payload;
}

export async function submitPayload(payload, {
  endpoint = INDEXNOW_ENDPOINT,
  fetchImpl = fetch,
  maxAttempts = 3,
} = {}) {
  const startedAt = Date.now();
  for (const pageUrl of payload.urlList ?? []) {
    assertSiteUrl(pageUrl, "Submitted page URL");
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    log("info", "indexnow-submit", "started", {
      attempt,
      endpoint,
      urlCount: payload.urlList.length,
    });
    try {
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify(payload),
      });
      const responseText = await response.text();
      if (response.status === 200 || response.status === 202) {
        log("info", "indexnow-submit", "completed", {
          attempt,
          httpStatus: response.status,
          urlCount: payload.urlList.length,
          durationMs: Date.now() - startedAt,
        });
        return;
      }

      const retryable = response.status === 429 || response.status >= 500;
      log("error", "indexnow-submit", retryable ? "retryable-failure" : "failed", {
        attempt,
        httpStatus: response.status,
        response: responseText.slice(0, 500),
        durationMs: Date.now() - startedAt,
      });
      if (!retryable || attempt === maxAttempts) {
        throw new Error(`IndexNow rejected the payload with HTTP ${response.status}`);
      }
    } catch (error) {
      if (attempt === maxAttempts || error.message.startsWith("IndexNow rejected")) {
        throw error;
      }
      log("error", "indexnow-submit", "retryable-exception", {
        attempt,
        exception: { name: error.name, message: error.message },
        durationMs: Date.now() - startedAt,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 1000));
  }
}

function optionValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

async function main() {
  const command = process.argv[2];
  if (command === "prepare") {
    const output = path.resolve(optionValue("--output", ".indexnow/indexnow-payload.json"));
    const payload = await preparePayload({
      distRoot: optionValue("--dist", "dist"),
      publicRoot: optionValue("--public", "public"),
    });
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    log("info", "indexnow-payload", "written", { output, urlCount: payload.urlList.length });
    return;
  }

  if (command === "submit") {
    const input = path.resolve(optionValue("--input", ".indexnow/indexnow-payload.json"));
    const payload = JSON.parse(await readFile(input, "utf8"));
    await submitPayload(payload);
    return;
  }

  throw new Error("Usage: node scripts/indexnow.mjs <prepare|submit> [--dist path] [--public path] [--output path] [--input path]");
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  main().catch((error) => {
    log("error", "indexnow", "failed", {
      exception: { name: error.name, message: error.message, stack: error.stack },
    });
    process.exitCode = 1;
  });
}
