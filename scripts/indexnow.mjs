import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  extractLocations,
  loadSearchInventory,
  readUrlFile,
} from "../tools/blogctl/search/node/inventory.mjs";
import {
  DEFAULT_INDEXNOW_KEY,
  INDEXNOW_ENDPOINT,
  prepareIndexNowPayload,
  resolveIndexNowConfig,
  submitPreparedPayload,
} from "../tools/blogctl/search/node/indexnow.mjs";

export const INDEXNOW_KEY = DEFAULT_INDEXNOW_KEY;
export { INDEXNOW_ENDPOINT };
export const SITE_ORIGIN = "https://thinkerqaq.github.io";
export const INDEXNOW_KEY_LOCATION = `${SITE_ORIGIN}/${INDEXNOW_KEY}.txt`;
export { extractLocations };

function log(severity, operation, status, details = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    severity,
    operation,
    status,
    ...details,
  }));
}

export async function preparePayload({
  distRoot = "dist",
  publicRoot = "public",
  urlsFile = "",
  env = process.env,
} = {}) {
  const startedAt = Date.now();
  const inventory = urlsFile ? null : await loadSearchInventory({ distRoot, expectedOrigin: SITE_ORIGIN });
  const urls = urlsFile ? await readUrlFile(urlsFile, { expectedOrigin: SITE_ORIGIN }) : inventory.urlList;
  const config = await resolveIndexNowConfig({
    origin: inventory?.origin ?? SITE_ORIGIN,
    publicRoot,
    env,
    verifyKeyFile: true,
  });
  const payload = urls.length > 0
    ? prepareIndexNowPayload(urls, config)
    : { host: config.host, key: config.key, keyLocation: config.keyLocation, urlList: [] };
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
  batchSize,
  sleep,
} = {}) {
  if (!Array.isArray(payload?.urlList) || payload.urlList.length === 0) {
    log("info", "indexnow-submit", "skipped", { reason: "no changed URLs" });
    return { skipped: true, urlCount: 0, batchCount: 0, results: [] };
  }
  return submitPreparedPayload(payload, {
    endpoint,
    fetchImpl,
    maxAttempts,
    batchSize,
    sleep,
  });
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
      urlsFile: optionValue("--urls-file", ""),
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

  throw new Error(
    "Usage: node scripts/indexnow.mjs <prepare|submit> [--dist path] [--public path] [--urls-file path] [--output path] [--input path]",
  );
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
