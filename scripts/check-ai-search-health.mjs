import { appendFile } from "node:fs/promises";

const accountId = String(process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
const apiToken = String(process.env.CLOUDFLARE_AI_SEARCH_TOKEN || "").trim();
const instanceName = String(process.env.CLOUDFLARE_AI_SEARCH_INSTANCE || "thinkerqaq-blog").trim();
const githubOutput = String(process.env.GITHUB_OUTPUT || "").trim();

function log(status, details = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    operation: "check-ai-search-health",
    status,
    ...details,
  }));
}

async function setOutput(name, value) {
  if (!githubOutput) return;
  await appendFile(githubOutput, `${name}=${value}\n`, "utf8");
}

if (!accountId || !apiToken) {
  const missing = [
    !accountId ? "CLOUDFLARE_ACCOUNT_ID" : null,
    !apiToken ? "CLOUDFLARE_AI_SEARCH_TOKEN" : null,
  ].filter(Boolean);
  throw new Error(`Missing required configuration: ${missing.join(", ")}`);
}

const response = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai-search/instances/${encodeURIComponent(instanceName)}/stats`,
  { headers: { authorization: `Bearer ${apiToken}` } },
);

if (!response.ok) {
  throw new Error(`Cloudflare AI Search stats returned ${response.status}: ${(await response.text()).slice(0, 1000)}`);
}

const payload = await response.json();
if (payload?.success === false) {
  const details = Array.isArray(payload.errors)
    ? payload.errors.map((entry) => entry?.message || entry?.code).filter(Boolean).join("; ")
    : "unknown Cloudflare API error";
  throw new Error(`Cloudflare AI Search stats returned success=false: ${details}`);
}

const stats = payload?.result || payload || {};
const summary = {
  queued: Number(stats?.queued || 0),
  running: Number(stats?.running || 0),
  outdated: Number(stats?.outdated || 0),
  completed: Number(stats?.completed || 0),
  errors: Number(stats?.error || 0),
  objectCount: Number(stats?.engine?.r2?.objectCount || 0),
  vectorsCount: Number(stats?.engine?.vectorize?.vectorsCount || 0),
};

if (summary.errors > 0) {
  await setOutput("ready", "false");
  log("failed", summary);
  process.exitCode = 1;
} else {
  const indexing = summary.queued + summary.running + summary.outdated > 0;
  const ready = !indexing && (summary.completed > 0 || summary.objectCount > 0 || summary.vectorsCount > 0);
  await setOutput("ready", String(ready));
  log(indexing ? "indexing" : ready ? "ready" : "empty", summary);
}
