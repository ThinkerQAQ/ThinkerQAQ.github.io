import path from "node:path";
import { fileURLToPath } from "node:url";

import { accessTokenFromEnvironment } from "./google-auth.mjs";
import {
  GOOGLE_URL_INSPECTION_DAILY_SITE_LIMIT,
  auditGoogleUrls,
  checkGoogleSearchConsoleSite,
  normalizeSearchConsoleSiteUrl,
  submitGoogleSitemaps,
} from "./google.mjs";
import { DEFAULT_SITE_ORIGIN, assertSiteUrl, normalizeSiteOrigin } from "./inventory.mjs";
import { resolveIndexNowConfig, submitIndexNowUrls } from "./indexnow.mjs";

export const RESULT_PREFIX = "__BLOGCTL_SEARCH_RESULT__";

async function readInput(stream = process.stdin) {
  let raw = "";
  for await (const chunk of stream) raw += chunk;
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

export function normalizeRemoteInventory(text, origin = DEFAULT_SITE_ORIGIN) {
  const siteOrigin = normalizeSiteOrigin(origin);
  const unique = new Set();
  for (const line of String(text || "").split(/\r?\n/u)) {
    const raw = line.trim();
    if (!raw) continue;
    const url = assertSiteUrl(raw, siteOrigin, "Sitemap URL");
    url.hash = "";
    unique.add(url.toString());
  }
  return [...unique].sort();
}

export function normalizeFingerprintManifest(payload, urls, origin = DEFAULT_SITE_ORIGIN) {
  const siteOrigin = normalizeSiteOrigin(origin);
  const parsed = typeof payload === "string" ? JSON.parse(payload) : payload;
  if (!parsed || typeof parsed !== "object") throw new Error("sitemap-inventory.json must be an object");
  if (normalizeSiteOrigin(parsed.origin || siteOrigin) !== siteOrigin) {
    throw new Error(`sitemap-inventory.json origin must use ${siteOrigin}`);
  }
  const allowed = new Set(urls);
  const fingerprints = {};
  for (const [rawUrl, rawHash] of Object.entries(parsed.fingerprints || {})) {
    const url = assertSiteUrl(rawUrl, siteOrigin, "Fingerprint URL");
    url.hash = "";
    const normalized = url.toString();
    if (!allowed.has(normalized)) continue;
    const hash = String(rawHash || "").trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/u.test(hash)) {
      throw new Error(`Invalid SHA-256 fingerprint for ${normalized}`);
    }
    fingerprints[normalized] = hash;
  }
  return fingerprints;
}

export function diffRemoteInventories(previous = {}, current = {}, { mode = "incremental" } = {}) {
  if (!["incremental", "full"].includes(mode)) {
    throw new Error(`Unsupported Bing submission mode: ${mode}`);
  }
  const previousUrls = new Set(Array.isArray(previous.urls) ? previous.urls : []);
  const currentUrls = new Set(Array.isArray(current.urls) ? current.urls : []);
  const previousFingerprints = previous.fingerprints || {};
  const currentFingerprints = current.fingerprints || {};
  const added = [];
  const changed = [];
  const unchanged = [];
  const deleted = [];

  for (const url of [...currentUrls].sort()) {
    if (!previousUrls.has(url)) {
      added.push(url);
      continue;
    }
    const before = String(previousFingerprints[url] || "");
    const after = String(currentFingerprints[url] || "");
    // Missing fingerprints are treated conservatively as changed so incremental
    // submission never silently misses an updated page.
    if (!before || !after || before !== after) changed.push(url);
    else unchanged.push(url);
  }
  for (const url of [...previousUrls].sort()) {
    if (!currentUrls.has(url)) deleted.push(url);
  }

  const selected = mode === "full"
    ? [...new Set([...currentUrls, ...deleted])].sort()
    : [...new Set([...added, ...changed, ...deleted])].sort();

  return {
    mode,
    selected,
    added,
    changed,
    deleted,
    unchanged,
    selectedCount: selected.length,
    addedCount: added.length,
    changedCount: changed.length,
    deletedCount: deleted.length,
    unchangedCount: unchanged.length,
  };
}

function inventorySummary(inventory) {
  return {
    source: inventory.source,
    fingerprintSource: inventory.fingerprintSource,
    fingerprintCoverage: inventory.fingerprintCoverage,
    origin: inventory.origin,
    fetchedAt: inventory.fetchedAt,
    total: inventory.total,
  };
}

export async function fetchRemoteInventory({
  origin = DEFAULT_SITE_ORIGIN,
  source = "",
  fingerprintSource = "",
  fetchImpl = fetch,
} = {}) {
  const siteOrigin = normalizeSiteOrigin(origin);
  const sourceURL = source || new URL("/sitemap-all.txt", `${siteOrigin}/`).toString();
  const fingerprintURL = fingerprintSource || new URL("/sitemap-inventory.json", `${siteOrigin}/`).toString();
  assertSiteUrl(sourceURL, siteOrigin, "Sitemap source");
  assertSiteUrl(fingerprintURL, siteOrigin, "Fingerprint source");

  const response = await fetchImpl(sourceURL, { headers: { accept: "text/plain,*/*;q=0.8" } });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`sitemap-all.txt fetch failed with HTTP ${response.status}: ${text.slice(0, 300)}`);
  }
  const urls = normalizeRemoteInventory(text, siteOrigin);
  if (urls.length === 0) throw new Error("sitemap-all.txt did not contain any valid URLs");

  let fingerprints = {};
  let resolvedFingerprintSource = "";
  let fingerprintResponse = null;
  try {
    fingerprintResponse = await fetchImpl(fingerprintURL, {
      headers: { accept: "application/json,*/*;q=0.8" },
    });
  } catch {
    // Network failure is tolerated because the fingerprint manifest is additive.
  }
  if (fingerprintResponse?.ok) {
    fingerprints = normalizeFingerprintManifest(await fingerprintResponse.text(), urls, siteOrigin);
    resolvedFingerprintSource = fingerprintURL;
  }

  return {
    source: sourceURL,
    fingerprintSource: resolvedFingerprintSource,
    fingerprintCoverage: Object.keys(fingerprints).length,
    origin: siteOrigin,
    fetchedAt: new Date().toISOString(),
    total: urls.length,
    urls,
    fingerprints,
  };
}

async function checkBingIndexNow({
  origin,
  publicRoot = "public",
  env = process.env,
  fetchImpl = fetch,
} = {}) {
  const config = await resolveIndexNowConfig({
    origin,
    publicRoot,
    env,
    verifyKeyFile: false,
  });
  const response = await fetchImpl(config.keyLocation, {
    headers: { accept: "text/plain,*/*;q=0.8" },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`IndexNow key location check failed with HTTP ${response.status}`);
  }
  if (text.trim() !== config.key) {
    throw new Error("IndexNow key location content does not match configured key");
  }
  return {
    endpoint: config.endpoint,
    keyLocation: config.keyLocation,
    keyFileStatus: response.status,
  };
}

async function googleAccessToken(env = process.env) {
  const token = await accessTokenFromEnvironment(env);
  if (!token?.accessToken) {
    throw new Error("GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON is required");
  }
  return token.accessToken;
}

export async function runBridgeCommand(command, input = {}, {
  env = process.env,
  fetchImpl = fetch,
} = {}) {
  const siteUrl = normalizeSearchConsoleSiteUrl(
    input.siteUrl || env.GOOGLE_SEARCH_CONSOLE_SITE_URL || `${DEFAULT_SITE_ORIGIN}/`,
  );
  const origin = siteUrl.startsWith("sc-domain:")
    ? `https://${siteUrl.slice("sc-domain:".length)}`
    : new URL(siteUrl).origin;
  const needsInventory = !["status", "bing-check", "google-check"].includes(command);
  const inventory = needsInventory
    ? await fetchRemoteInventory({
      origin,
      source: input.source,
      fingerprintSource: input.fingerprintSource,
      fetchImpl,
    })
    : null;

  if (command === "status") {
    return {
      siteUrl,
      origin,
      googleCredentialsConfigured: Boolean(String(env.GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON || "").trim()),
      indexNowConfigured: true,
    };
  }

  if (command === "bing-check") {
    return checkBingIndexNow({
      origin,
      publicRoot: input.publicRoot || "public",
      env,
      fetchImpl,
    });
  }

  if (command === "google-check") {
    const accessToken = await googleAccessToken(env);
    return checkGoogleSearchConsoleSite({
      siteUrl,
      accessToken,
      fetchImpl,
    });
  }

  if (command === "inventory") return inventory;

  if (command === "bing-submit") {
    const mode = String(input.mode || "incremental").trim();
    const diff = diffRemoteInventories(input.previous || {}, inventory, { mode });
    let result = {
      urlCount: 0,
      batchCount: 0,
      results: [],
      skipped: diff.selectedCount === 0,
    };
    if (diff.selectedCount > 0) {
      const config = await resolveIndexNowConfig({
        origin,
        publicRoot: input.publicRoot || "public",
        env: { ...env, INDEXNOW_ENDPOINT: input.endpoint || "https://www.bing.com/indexnow" },
        verifyKeyFile: input.verifyKeyFile !== false,
      });
      result = await submitIndexNowUrls(diff.selected, { config, fetchImpl });
    }
    return { inventory, diff: { ...diff, selected: undefined }, result };
  }

  if (command === "google-sitemaps") {
    const accessToken = await googleAccessToken(env);
    const result = await submitGoogleSitemaps({
      siteUrl,
      origin,
      accessToken,
      fetchImpl,
    });
    return { inventory: inventorySummary(inventory), result };
  }

  if (command === "google-inspect") {
    const offset = Number(input.offset ?? 0);
    const limit = Number(input.limit ?? GOOGLE_URL_INSPECTION_DAILY_SITE_LIMIT);
    const requestDelayMs = Number(input.requestDelayMs ?? 110);
    const accessToken = await googleAccessToken(env);
    return auditGoogleUrls(inventory.urls, {
      siteUrl,
      origin,
      accessToken,
      offset,
      limit,
      requestDelayMs,
      fetchImpl,
    });
  }

  throw new Error(`unsupported BlogCTL search bridge command: ${command}`);
}

async function main(argv = process.argv.slice(2)) {
  const command = String(argv[0] || "").trim();
  if (!command) throw new Error("search bridge command is required");
  const input = await readInput();
  const result = await runBridgeCommand(command, input);
  process.stdout.write(`${RESULT_PREFIX}${JSON.stringify(result)}\n`);
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invoked && fileURLToPath(import.meta.url) === invoked) {
  main().catch((error) => {
    process.stderr.write(`${error?.stack || error?.message || String(error)}\n`);
    process.exitCode = 1;
  });
}
