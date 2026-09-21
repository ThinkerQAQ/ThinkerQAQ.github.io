import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  DEFAULT_SITE_ORIGIN,
  assertSiteUrl,
  normalizeSiteOrigin,
} from "./inventory.mjs";

export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
export const DEFAULT_INDEXNOW_KEY = "fb26fca3ba9449c6816b6d79b0a41cec";
export const MAX_INDEXNOW_URLS_PER_REQUEST = 10_000;

function log(severity, operation, status, details = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    severity,
    operation,
    status,
    ...details,
  }));
}

export function chunkUrls(urls, size = MAX_INDEXNOW_URLS_PER_REQUEST) {
  if (!Number.isInteger(size) || size <= 0) throw new Error("IndexNow chunk size must be a positive integer");
  const chunks = [];
  for (let index = 0; index < urls.length; index += size) {
    chunks.push(urls.slice(index, index + size));
  }
  return chunks;
}

export async function resolveIndexNowConfig({
  origin = DEFAULT_SITE_ORIGIN,
  publicRoot = "public",
  env = process.env,
  verifyKeyFile = true,
} = {}) {
  const siteOrigin = normalizeSiteOrigin(origin);
  const key = String(env.INDEXNOW_KEY || DEFAULT_INDEXNOW_KEY).trim();
  if (!/^[A-Za-z0-9-]{8,128}$/u.test(key)) {
    throw new Error("IndexNow key must be 8-128 URL-safe characters");
  }

  const keyLocation = String(
    env.INDEXNOW_KEY_LOCATION || new URL(`/${key}.txt`, `${siteOrigin}/`).toString(),
  ).trim();
  assertSiteUrl(keyLocation, siteOrigin, "IndexNow key location");

  if (verifyKeyFile) {
    const keyUrl = new URL(keyLocation);
    const keyFile = path.resolve(publicRoot, decodeURIComponent(keyUrl.pathname).replace(/^\/+/, ""));
    const hostedKey = (await readFile(keyFile, "utf8")).trim();
    if (hostedKey !== key) {
      throw new Error(`IndexNow key file does not match configured key: ${keyFile}`);
    }
  }

  return {
    origin: siteOrigin,
    host: new URL(siteOrigin).host,
    key,
    keyLocation,
    endpoint: String(env.INDEXNOW_ENDPOINT || INDEXNOW_ENDPOINT).trim(),
  };
}

export function prepareIndexNowPayload(urls, config) {
  const unique = new Set();
  for (const rawUrl of urls) {
    const url = assertSiteUrl(rawUrl, config.origin, "Submitted page URL");
    url.hash = "";
    unique.add(url.toString());
  }
  const urlList = [...unique].sort();
  if (urlList.length === 0) throw new Error("IndexNow requires at least one URL");
  return {
    host: config.host,
    key: config.key,
    keyLocation: config.keyLocation,
    urlList,
  };
}

async function submitBatch(payload, {
  endpoint = INDEXNOW_ENDPOINT,
  fetchImpl = fetch,
  maxAttempts = 3,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  const startedAt = Date.now();
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
        return { httpStatus: response.status, attempts: attempt };
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
      if (attempt === maxAttempts || String(error.message).startsWith("IndexNow rejected")) {
        throw error;
      }
      log("error", "indexnow-submit", "retryable-exception", {
        attempt,
        exception: { name: error.name, message: error.message },
        durationMs: Date.now() - startedAt,
      });
    }
    await sleep(2 ** attempt * 1000);
  }
  throw new Error("IndexNow submission exhausted retries");
}

export async function submitIndexNowUrls(urls, {
  config,
  fetchImpl = fetch,
  maxAttempts = 3,
  batchSize = MAX_INDEXNOW_URLS_PER_REQUEST,
  sleep,
} = {}) {
  if (!config) throw new Error("IndexNow config is required");
  const payload = prepareIndexNowPayload(urls, config);
  const batches = chunkUrls(payload.urlList, batchSize);
  const results = [];
  for (const urlList of batches) {
    results.push(await submitBatch({ ...payload, urlList }, {
      endpoint: config.endpoint,
      fetchImpl,
      maxAttempts,
      sleep,
    }));
  }
  return {
    urlCount: payload.urlList.length,
    batchCount: batches.length,
    results,
  };
}

export async function submitPreparedPayload(payload, options = {}) {
  const origin = normalizeSiteOrigin(`https://${payload.host}`);
  const config = {
    origin,
    host: payload.host,
    key: payload.key,
    keyLocation: payload.keyLocation,
    endpoint: options.endpoint || INDEXNOW_ENDPOINT,
  };
  return submitIndexNowUrls(payload.urlList || [], { ...options, config });
}
