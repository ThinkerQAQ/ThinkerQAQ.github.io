import path from "node:path";
import { fileURLToPath } from "node:url";

import { accessTokenFromEnvironment } from "./google-auth.mjs";
import {
  GOOGLE_URL_INSPECTION_DAILY_SITE_LIMIT,
  auditGoogleUrls,
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

export async function fetchRemoteInventory({
  origin = DEFAULT_SITE_ORIGIN,
  source = "",
  fetchImpl = fetch,
} = {}) {
  const siteOrigin = normalizeSiteOrigin(origin);
  const sourceURL = source || new URL("/sitemap-all.txt", `${siteOrigin}/`).toString();
  assertSiteUrl(sourceURL, siteOrigin, "Sitemap source");
  const response = await fetchImpl(sourceURL, { headers: { accept: "text/plain,*/*;q=0.8" } });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`sitemap-all.txt fetch failed with HTTP ${response.status}: ${text.slice(0, 300)}`);
  }
  const urls = normalizeRemoteInventory(text, siteOrigin);
  if (urls.length === 0) throw new Error("sitemap-all.txt did not contain any valid URLs");
  return {
    source: sourceURL,
    origin: siteOrigin,
    fetchedAt: new Date().toISOString(),
    total: urls.length,
    urls,
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
  const inventory = command === "status"
    ? null
    : await fetchRemoteInventory({ origin, source: input.source, fetchImpl });

  if (command === "status") {
    return {
      siteUrl,
      origin,
      googleCredentialsConfigured: Boolean(String(env.GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON || "").trim()),
      indexNowConfigured: true,
    };
  }

  if (command === "inventory") return inventory;

  if (command === "bing-submit") {
    const config = await resolveIndexNowConfig({
      origin,
      publicRoot: input.publicRoot || "public",
      env: { ...env, INDEXNOW_ENDPOINT: input.endpoint || "https://www.bing.com/indexnow" },
      verifyKeyFile: input.verifyKeyFile !== false,
    });
    const result = await submitIndexNowUrls(inventory.urls, { config, fetchImpl });
    return { inventory: { ...inventory, urls: undefined }, result };
  }

  if (command === "google-sitemaps") {
    const accessToken = await googleAccessToken(env);
    const result = await submitGoogleSitemaps({
      siteUrl,
      origin,
      accessToken,
      fetchImpl,
    });
    return { inventory: { ...inventory, urls: undefined }, result };
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
