import { execFile } from "node:child_process";
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
  return `blog--${collection}--${encodeURIComponent(id)}.md`;
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
      const description = data.description ? `\n${data.description}\n` : "";
      const content = [
        `# ${title}`,
        `Source URL: ${sourceUrl(collection, id)}`,
        `Collection: ${collection}`,
        description,
        body.trim(),
      ].filter(Boolean).join("\n\n").trim() + "\n";

      documents.set(itemKey(collection, id), {
        key: itemKey(collection, id),
        collection,
        id,
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
  return response.json();
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
  const needsUpdate = info?.index_method?.keyword !== true
    || info?.index_method?.vector !== true
    || info?.fusion_method !== "rrf"
    || info?.indexing_options?.keyword_tokenizer !== "trigram"
    || info?.reranking !== true;

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

if (!accountId || !apiToken) {
  log("skipped", { reason: "CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_AI_SEARCH_TOKEN is not configured" });
  process.exit(0);
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
    await uploadDocument(document);
  });

  log("completed", {
    instance: instanceName,
    publicDocuments: documents.size,
    uploaded: uploads.length,
    deleted: staleItems.length,
    incremental: Boolean(changedPaths),
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
