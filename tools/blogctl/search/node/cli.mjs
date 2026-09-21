import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_SITE_ORIGIN,
  loadSearchInventory,
  readUrlFile,
  writeTextSitemap,
} from "./inventory.mjs";
import {
  resolveIndexNowConfig,
  submitIndexNowUrls,
} from "./indexnow.mjs";
import {
  GOOGLE_URL_INSPECTION_DAILY_SITE_LIMIT,
  auditGoogleUrls,
  normalizeSearchConsoleSiteUrl,
  submitGoogleSitemaps,
} from "./google.mjs";
import { accessTokenFromEnvironment } from "./google-auth.mjs";

function log(severity, operation, status, details = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    severity,
    operation,
    status,
    ...details,
  }));
}

function optionValue(argv, name, fallback = "") {
  const index = argv.indexOf(name);
  if (index === -1) return fallback;
  if (index + 1 >= argv.length || argv[index + 1].startsWith("--")) {
    throw new Error(`${name} requires a value`);
  }
  return argv[index + 1];
}

function hasFlag(argv, name) {
  return argv.includes(name);
}

function providersFromArgs(argv) {
  const raw = optionValue(argv, "--providers", "");
  if (!raw) throw new Error("--providers is required");
  const providers = [...new Set(raw.split(",").map((value) => value.trim()).filter(Boolean))];
  const allowed = new Set(["google", "indexnow"]);
  for (const provider of providers) {
    if (!allowed.has(provider)) throw new Error(`Unsupported search provider: ${provider}`);
  }
  return providers;
}

function siteUrlFromArgs(argv, env = process.env) {
  return optionValue(
    argv,
    "--site-url",
    String(env.GOOGLE_SEARCH_CONSOLE_SITE_URL || `${DEFAULT_SITE_ORIGIN}/`).trim(),
  );
}

export async function runBuild(argv = []) {
  const distRoot = optionValue(argv, "--dist", "dist");
  const output = optionValue(argv, "--output", "sitemap-all.txt");
  const result = await writeTextSitemap({ distRoot, output });
  log("info", "search-build", "completed", result);
  return result;
}

export async function runInventory(argv = []) {
  const distRoot = optionValue(argv, "--dist", "dist");
  const inventory = await loadSearchInventory({ distRoot });
  const summary = {
    origin: inventory.origin,
    sitemapIndexUrl: inventory.sitemapIndexUrl,
    childSitemaps: inventory.sitemapUrls.length,
    urlCount: inventory.urlList.length,
  };
  if (hasFlag(argv, "--json")) {
    console.log(JSON.stringify({ ...summary, urlList: inventory.urlList }, null, 2));
  } else {
    log("info", "search-inventory", "completed", summary);
  }
  return inventory;
}

async function googleAccessTokenOrSkip({
  env,
  optional,
  fetchImpl,
} = {}) {
  const token = await accessTokenFromEnvironment(env, { fetchImpl });
  if (token) return token.accessToken;
  if (optional) {
    log("info", "google-search-console", "skipped", {
      reason: "GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON is not configured",
    });
    return "";
  }
  throw new Error(
    "GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON is required for Google Search Console operations",
  );
}

export async function runSubmit(argv = [], {
  env = process.env,
  fetchImpl = fetch,
} = {}) {
  const providers = providersFromArgs(argv);
  const distRoot = optionValue(argv, "--dist", "dist");
  const publicRoot = optionValue(argv, "--public", "public");
  const siteUrl = normalizeSearchConsoleSiteUrl(siteUrlFromArgs(argv, env));
  const origin = siteUrl.startsWith("sc-domain:")
    ? `https://${siteUrl.slice("sc-domain:".length)}`
    : new URL(siteUrl).origin;
  const results = {};
  let indexNowScope = null;
  if (providers.includes("indexnow")) {
    const full = hasFlag(argv, "--all");
    const urlsFile = optionValue(argv, "--urls-file", "");
    if (full === Boolean(urlsFile)) {
      throw new Error("IndexNow submit requires exactly one of --all or --urls-file <file>");
    }
    indexNowScope = { full, urlsFile };
  }

  if (providers.includes("google") {
    const accessToken = await googleAccessTokenOrSkip({
      env,
      optional: hasFlag(argv, "--optional-google"),
      fetchImpl,
    });
    if (accessToken) {
      results.google = await submitGoogleSitemaps({
        siteUrl,
        origin,
        accessToken,
        fetchImpl,
      });
      log("info", "google-search-console-sitemaps", "completed", {
        siteUrl,
        sitemapCount: results.google.length,
      });
    } else {
      results.google = { skipped: true };
    }
  }

  if (providers.includes("indexnow")) {
    const { full, urlsFile } = indexNowScope;
    const config = await resolveIndexNowConfig({
      origin,
      publicRoot,
      env,
      verifyKeyFile: true,
    });
    const urls = full
      ? (await loadSearchInventory({ distRoot, expectedOrigin: origin })).urlList
      : await readUrlFile(urlsFile, { expectedOrigin: origin });
    results.indexnow = await submitIndexNowUrls(urls, {
      config,
      fetchImpl,
    });
    log("info", "indexnow-submit", "all-completed", results.indexnow);
  }

  return results;
}

export async function runAudit(argv = [], {
  env = process.env,
  fetchImpl = fetch,
} = {}) {
  const provider = optionValue(argv, "--provider", "");
  if (provider !== "google") {
    throw new Error("Only --provider google is currently supported for search audit");
  }
  const distRoot = optionValue(argv, "--dist", "dist");
  const output = optionValue(argv, "--output", "");
  const limitValue = optionValue(argv, "--limit", String(GOOGLE_URL_INSPECTION_DAILY_SITE_LIMIT));
  const limit = Number(limitValue);
  if (!Number.isInteger(limit)) throw new Error("--limit must be an integer");

  const siteUrl = normalizeSearchConsoleSiteUrl(siteUrlFromArgs(argv, env));
  const origin = siteUrl.startsWith("sc-domain:")
    ? `https://${siteUrl.slice("sc-domain:".length)}`
    : new URL(siteUrl).origin;
  const inventory = await loadSearchInventory({ distRoot, expectedOrigin: origin });
  const accessToken = await googleAccessTokenOrSkip({ env, optional: false, fetchImpl });
  const report = await auditGoogleUrls(inventory.urlList, {
    siteUrl,
    origin,
    accessToken,
    limit,
    fetchImpl,
  });

  if (output) {
    const outputPath = path.resolve(output);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    log("info", "google-search-console-audit", "written", {
      output: outputPath,
      inspected: report.inspected,
      totalAvailable: report.totalAvailable,
    });
  } else {
    console.log(JSON.stringify(report, null, 2));
  }
  return report;
}

export async function main(argv = process.argv.slice(2), options = {}) {
  const [command, ...rest] = argv;
  switch (command) {
    case "build":
      return runBuild(rest);
    case "inventory":
      return runInventory(rest);
    case "submit":
      return runSubmit(rest, options);
    case "audit":
      return runAudit(rest, options);
    default:
      throw new Error(
        "Usage: search <build|inventory|submit|audit> [options]",
      );
  }
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invoked && fileURLToPath(import.meta.url) === invoked) {
  main().catch((error) => {
    log("error", "search", "failed", {
      exception: { name: error.name, message: error.message, stack: error.stack },
    });
    process.exitCode = 1;
  });
}
