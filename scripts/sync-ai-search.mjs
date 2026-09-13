import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const accountId = String(process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
const apiToken = String(process.env.CLOUDFLARE_AI_SEARCH_TOKEN || "").trim();
const instanceName = String(process.env.CLOUDFLARE_AI_SEARCH_INSTANCE || "thinkerqaq-blog").trim();
const blogOrigin = String(process.env.BLOG_ORIGIN || "https://thinkerqaq.github.io").replace(/\/$/, "");
const beforeSha = String(process.env.GITHUB_EVENT_BEFORE || "").trim();
const currentSha = String(process.env.GITHUB_SHA || "HEAD").trim();
const apiBase = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai-search/instances`;
const collections = ["articles", "notes", "projects", "series"];
const readyTimeoutMs = Number(process.env.AI_SEARCH_READY_TIMEOUT_MS || 180_000);
const readyPollMs = Number(process.env.AI_SEARCH_READY_POLL_MS || 2_000);
const maxItemKeyLength = 128;

function log(status, details = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    operation: "sync-ai-search",
    status,
    ...details,
  }));
}

function parseScalar(value) {
  const trimmed = String(value || "").trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { data: {}, body: markdown };
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
    if (field) data[field[1]] = parseScalar(field[2]);
  }
  return { data, body: markdown.slice(match[0].length) };
}

function isPublic(collection, data) {
  if (collection === "articles") return data.status === "published";
  if (collection === "notes") return String(data.indexable || "true").toLowerCase() !== "false";
  return true;
}

function itemKey(collection, id) {
  const reversible = `blog--${collection}--${encodeURIComponent(id)}.md`;
  if (reversible.length <= maxItemKeyLength) return reversible;

  const digest = createHash("sha256")
    .update(`${collection}\0${id}`)
    .digest("hex")
    .slice(0, 32);
  return `blog--${collection}--h-${digest}.md`;
}

function sourceUrl(collection, id) {
  const encoded = id.split("/").map(encodeURIComponent).join("/");
  return `${blogOrigin}/${collection}/${encoded}/`;
}

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else if (entry.isFile() && /\.md$/i.test(entry.name)) files.push(absolute);
  }
  return files;
}

async function loadDocuments() {
  const documents = new Map();
  for (const collection of collections) {
    const base = path.join(repositoryRoot, "src", "content", collection);
    for (const absolute of await walk(base)) {
      const relative = path.relative(base, absolute).replaceAll("\\", "/");
      const id = relative.replace(/\.md$/i, "");
      const markdown = await readFile(absolute, "utf8");
      const { data, body } = parseFrontmatter(markdown);
      if (!isPublic(collection, data)) continue;

      const title = data.title || id.split("/").pop();
      const url = sourceUrl(collection, id);
      const description = data.description ? `\n${data.description}\n` : "";
      const content = [
        `# ${title}`,
        `Source URL: ${url}`,
        `Collection: ${collection}`,
        description,
        body.trim(),
      ].filter(Boolean).join("\n\n").trim() + "\n";
      const key = itemKey(collection, id);

      documents.set(key, {
        key,
        collection,
        id,
        title,
        url,
        sourcePath: `src/content/${collection}/${relative}`,
        content,
      });
    }
  }
  return documents;
}

async function cloudflareRequest(url, options = {}, accepted = [200]) {
  const response = await fetch(url, {
    ...options,
    headers: {
      authorization: `Bearer ${apiToken}`,
      ...(options.body instanceof FormData ? {} : { "content-type": "application/json" }),
      ...(options.headers || {}),
    },
  });

  if (!accepted.includes(response.status)) {
    const text = await response.text();
    const error = new Error(`Cloudflare API ${response.status}: ${text.slice(0, 1000)}`);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) return null;
  const payload = await response.json();
  if (payload?.success === false) {
    const details = Array.isArray(payload.errors)
      ? payload.errors.map((entry) => entry?.message || entry?.code).filter(Boolean).join("; ")
      : "unknown Cloudflare API error";
    throw new Error(`Cloudflare API returned success=false: ${details}`);
  }
  return payload;
}

async function ensureInstance() {
  const instanceUrl = `${apiBase}/${encodeURIComponent(instanceName)}`;
  let existing;
  try {
    existing = await cloudflareRequest(instanceUrl, {}, [200]);
  } catch (error) {
    if (error.status !== 404) throw error;
  }

  const desired = {
    index_method: { vector: true, keyword: true },
    fusion_method: "rrf",
    indexing_options: { keyword_tokenizer: "trigram" },
    retrieval_options: { keyword_match_mode: "or" },
    custom_metadata: [
      { field_name: "source_url", data_type: "text" },
      { field_name: "title", data_type: "text" },
      { field_name: "collection", data_type: "text" },
    ],
    reranking: true,
    reranking_model: "@cf/baai/bge-reranker-base",
    rewrite_query: true,
    chunk_size: 512,
    chunk_overlap: 15,
    max_num_results: 10,
  };

  if (!existing) {
    await cloudflareRequest(apiBase, {
      method: "POST",
      body: JSON.stringify({ id: instanceName, ...desired }),
    }, [200, 201]);
    log("instance-created", { instance: instanceName });
    return true;
  }

  const info = existing.result || existing;
  const metadataSchema = new Map(
    (Array.isArray(info?.custom_metadata) ? info.custom_metadata : [])
      .map((field) => [field?.field_name, field?.data_type]),
  );
  const needsUpdate = info?.index_method?.keyword !== true
    || info?.index_method?.vector !== true
    || info?.fusion_method !== "rrf"
    || info?.indexing_options?.keyword_tokenizer !== "trigram"
    || info?.retrieval_options?.keyword_match_mode !== "or"
    || metadataSchema.get("source_url") !== "text"
    || metadataSchema.get("title") !== "text"
    || metadataSchema.get("collection") !== "text"
    || info?.reranking !== true
    || info?.rewrite_query !== true;

  if (needsUpdate) {
    await cloudflareRequest(instanceUrl, {
      method: "PUT",
      body: JSON.stringify(desired),
    }, [200]);
    log("instance-updated", { instance: instanceName });
  }
  return false;
}

async function listItems() {
  const all = [];
  for (let page = 1; ; page += 1) {
    const payload = await cloudflareRequest(
      `${apiBase}/${encodeURIComponent(instanceName)}/items?page=${page}&per_page=50&source=builtin`,
      {},
      [200],
    );
    const result = Array.isArray(payload?.result) ? payload.result : [];
    all.push(...result);
    if (result.length < 50) break;
  }
  return all;
}

async function changedContentPaths() {
  if (!beforeSha || /^0+$/.test(beforeSha)) return null;
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["diff", "--name-only", beforeSha, currentSha, "--", "src/content"],
      { cwd: repositoryRoot, timeout: 30_000 },
    );
    return new Set(stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
  } catch (error) {
    log("diff-unavailable", { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

async function deleteItem(item) {
  await cloudflareRequest(
    `${apiBase}/${encodeURIComponent(instanceName)}/items/${encodeURIComponent(item.id)}`,
    { method: "DELETE", body: undefined },
    [200, 204],
  );
}

async function uploadDocument(document) {
  const form = new FormData();
  form.append("file", new Blob([document.content], { type: "text/markdown; charset=utf-8" }), document.key);
  form.append("metadata", JSON.stringify({
    source_url: document.url,
    title: document.title,
    collection: document.collection,
  }));
  await cloudflareRequest(
    `${apiBase}/${encodeURIComponent(instanceName)}/items`,
    { method: "POST", body: form },
    [200, 201, 202],
  );
}

async function runPool(items, concurrency, handler) {
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const current = items[index++];
      await handler(current);
    }
  });
  await Promise.all(workers);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getStats() {
  const payload = await cloudflareRequest(
    `${apiBase}/${encodeURIComponent(instanceName)}/stats`,
    {},
    [200],
  );
  return payload?.result || payload || {};
}

function summarizeIndexStats(stats) {
  return {
    queued: Number(stats?.queued || 0),
    running: Number(stats?.running || 0),
    outdated: Number(stats?.outdated || 0),
    completed: Number(stats?.completed || 0),
    errors: Number(stats?.error || 0),
    objectCount: Number(stats?.engine?.r2?.objectCount || 0),
    vectorsCount: Number(stats?.engine?.vectorize?.vectorsCount || 0),
  };
}

async function waitForIndexSearchable(expectedDocuments) {
  const deadline = Date.now() + readyTimeoutMs;
  let lastStats = {};

  while (Date.now() < deadline) {
    lastStats = await getStats();
    const stats = summarizeIndexStats(lastStats);

    if (stats.errors > 0) {
      throw new Error(`AI Search indexing reported ${stats.errors} error(s)`);
    }

    const hasIndexedData = expectedDocuments === 0
      || stats.completed > 0
      || stats.objectCount > 0
      || stats.vectorsCount > 0;

    if (hasIndexedData) {
      log("index-searchable", {
        ...stats,
        backgroundIndexing: stats.queued + stats.running + stats.outdated > 0,
      });
      return lastStats;
    }

    log("index-waiting", stats);
    await sleep(readyPollMs);
  }

  throw new Error(`Timed out after ${readyTimeoutMs}ms waiting for AI Search to become searchable: ${JSON.stringify(lastStats)}`);
}

async function verifySearch(documents) {
  if (!documents.size) return;

  const refreshedItems = await listItems();
  const completedItem = refreshedItems.find((item) =>
    item?.status === "completed"
    && Number(item?.chunks_count || 0) > 0
    && String(item?.metadata?.title || "").trim(),
  );
  if (!completedItem) {
    throw new Error("AI Search reports indexed data but no completed blog item with searchable chunks is available yet");
  }

  const probe = String(completedItem.metadata.title).trim();
  const payload = await cloudflareRequest(
    `${apiBase}/${encodeURIComponent(instanceName)}/search`,
    {
      method: "POST",
      body: JSON.stringify({
        query: probe,
        ai_search_options: {
          retrieval: {
            retrieval_type: "hybrid",
            fusion_method: "rrf",
            keyword_match_mode: "or",
            max_num_results: 5,
            return_on_failure: false,
          },
        },
      }),
    },
    [200],
  );

  const result = payload?.result || payload || {};
  const chunks = Array.isArray(result.chunks) ? result.chunks : [];
  const blogChunks = chunks.filter((chunk) => String(chunk?.item?.key || "").startsWith("blog--"));
  if (!blogChunks.length) {
    throw new Error(`AI Search returned no blog chunks for completed item title: ${probe}`);
  }

  log("search-verified", {
    query: probe,
    completedItem: completedItem.key,
    chunks: blogChunks.length,
  });
}

if (!accountId || !apiToken) {
  const missing = [
    !accountId ? "CLOUDFLARE_ACCOUNT_ID" : null,
    !apiToken ? "CLOUDFLARE_AI_SEARCH_TOKEN" : null,
  ].filter(Boolean);
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    operation: "sync-ai-search",
    status: "failed",
    error: `Missing required configuration: ${missing.join(", ")}`,
  }));
  process.exit(1);
}

try {
  const documents = await loadDocuments();
  const instanceCreated = await ensureInstance();
  const existingItems = await listItems();
  const existingByKey = new Map(existingItems.map((item) => [item.key, item]));
  const changedPaths = instanceCreated || existingItems.length === 0 ? null : await changedContentPaths();

  const staleItems = existingItems.filter((item) => item.key?.startsWith("blog--") && !documents.has(item.key));
  await runPool(staleItems, 4, deleteItem);

  const uploads = [];
  for (const document of documents.values()) {
    const existing = existingByKey.get(document.key);
    const changed = !changedPaths || changedPaths.has(document.sourcePath);
    if (!existing || changed) uploads.push({ document, existing });
  }

  await runPool(uploads, 4, async ({ document, existing }) => {
    if (existing) await deleteItem(existing);
    try {
      await uploadDocument(document);
    } catch (error) {
      throw new Error(`Failed to upload ${document.sourcePath} as ${document.key}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  const indexStats = await waitForIndexSearchable(documents.size);
  await verifySearch(documents);
  const stats = summarizeIndexStats(indexStats);

  log("completed", {
    instance: instanceName,
    publicDocuments: documents.size,
    uploaded: uploads.length,
    deleted: staleItems.length,
    incremental: Boolean(changedPaths),
    backgroundIndexing: stats.queued + stats.running + stats.outdated > 0,
    queued: stats.queued,
    running: stats.running,
    completedIndexing: stats.completed,
    vectorsCount: stats.vectorsCount,
  });
} catch (error) {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    operation: "sync-ai-search",
    status: "failed",
    error: error instanceof Error ? error.message : String(error),
  }));
  process.exitCode = 1;
}
