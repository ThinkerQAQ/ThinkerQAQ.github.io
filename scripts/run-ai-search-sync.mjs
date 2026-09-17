import path from "node:path";
import { pathToFileURL } from "node:url";

const transientStatuses = new Set([408, 425, 429, 500, 502, 503, 504]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function methodOf(input, init) {
  if (init?.method) return String(init.method).toUpperCase();
  if (input instanceof Request) return String(input.method || "GET").toUpperCase();
  return "GET";
}

function endpointOf(input) {
  try {
    const raw = input instanceof Request ? input.url : String(input);
    const url = new URL(raw);
    return url.pathname.replace(/\/client\/v4\/accounts\/[^/]+/, "/client/v4/accounts/:account");
  } catch {
    return "unknown";
  }
}

function retryAfterMs(response) {
  const value = response.headers.get("retry-after");
  if (!value) return null;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return Math.max(0, timestamp - Date.now());
}

async function responseIsRetryable(response, method) {
  if (!transientStatuses.has(response.status)) return false;

  // GET/HEAD are safe to retry for ordinary transient failures. For mutating
  // requests, retry only Cloudflare AI Search error 7017, which Cloudflare
  // explicitly documents as a temporary internal-service connectivity failure.
  if (method === "GET" || method === "HEAD") return true;
  if (response.status !== 503) return false;

  const text = await response.clone().text();
  return text.includes("unable_to_connect_to_ai_search")
    || /[\"']?code[\"']?\s*:\s*7017/.test(text);
}

function retryDelayMs(response, attempt, baseMs, maxMs) {
  const fromHeader = retryAfterMs(response);
  if (fromHeader !== null) return Math.min(fromHeader, maxMs);
  return Math.min(baseMs * (2 ** Math.max(0, attempt - 1)), maxMs);
}

export function createRetryingFetch(fetchImpl, {
  requestTimeoutMs = Number(process.env.AI_SEARCH_REQUEST_TIMEOUT_MS || 30_000),
  maxRetries = Number(process.env.AI_SEARCH_REQUEST_RETRIES || 8),
  retryBaseMs = Number(process.env.AI_SEARCH_RETRY_BASE_MS || 2_000),
  retryMaxMs = Number(process.env.AI_SEARCH_RETRY_MAX_MS || 15_000),
  logRetry = (details) => console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    operation: "sync-ai-search",
    status: "cloudflare-request-retry",
    ...details,
  })),
  logFailure = (details) => console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    operation: "sync-ai-search",
    status: "cloudflare-request-failed",
    ...details,
  })),
} = {}) {
  return async function retryingFetch(input, init = {}) {
    const method = methodOf(input, init);
    const endpoint = endpointOf(input);
    let lastError;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
      const startedAt = Date.now();
      const timeoutSignal = AbortSignal.timeout(requestTimeoutMs);
      const signal = init.signal
        ? AbortSignal.any([init.signal, timeoutSignal])
        : timeoutSignal;

      try {
        const response = await fetchImpl(input, { ...init, signal });
        const canRetry = attempt <= maxRetries && await responseIsRetryable(response, method);
        if (!canRetry) return response;

        const delayMs = retryDelayMs(response, attempt, retryBaseMs, retryMaxMs);
        logRetry({
          method,
          endpoint,
          statusCode: response.status,
          attempt,
          maxAttempts: maxRetries + 1,
          elapsedMs: Date.now() - startedAt,
          delayMs,
        });
        try {
          await response.body?.cancel();
        } catch {
          // Best effort only; the next attempt must not depend on response cleanup.
        }
        await sleep(delayMs);
      } catch (error) {
        lastError = error;
        const canRetryNetworkFailure = attempt <= maxRetries && (method === "GET" || method === "HEAD");
        if (!canRetryNetworkFailure) {
          logFailure({
            method,
            endpoint,
            attempt,
            maxAttempts: maxRetries + 1,
            elapsedMs: Date.now() - startedAt,
            timeoutMs: requestTimeoutMs,
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }

        const delayMs = Math.min(retryBaseMs * (2 ** Math.max(0, attempt - 1)), retryMaxMs);
        logRetry({
          method,
          endpoint,
          error: error instanceof Error ? error.message : String(error),
          attempt,
          maxAttempts: maxRetries + 1,
          elapsedMs: Date.now() - startedAt,
          delayMs,
        });
        await sleep(delayMs);
      }
    }

    throw lastError || new Error("Cloudflare request failed after retries");
  };
}

export async function main() {
  globalThis.fetch = createRetryingFetch(globalThis.fetch);
  await import("./sync-ai-search.mjs");

  // sync-ai-search.mjs records failures via process.exitCode. Force termination
  // once its top-level work has returned so already-started pool requests cannot
  // keep a failed GitHub Actions job alive for many minutes.
  if (process.exitCode && process.exitCode !== 0) process.exit(process.exitCode);
}

const directPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === directPath) {
  await main();
}
