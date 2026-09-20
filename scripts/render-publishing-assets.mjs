import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { collectPublishingAssets } from "./publishing/compiler.mjs";
import { renderMermaidAsset } from "./publishing/mermaid-assets.mjs";

async function exists(directory) {
  try {
    await access(directory);
    return true;
  } catch {
    return false;
  }
}

async function walkMarkdown(directory) {
  if (!(await exists(directory))) return [];
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walkMarkdown(absolute));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) files.push(absolute);
  }
  return files.sort();
}

function log(status, details = {}, severity = "info") {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    severity,
    operation: "publishing-assets",
    status,
    ...details,
  }));
}

export async function renderPublishingAssets({
  articleRoot = "src/content/articles",
  publicRoot = "public",
  render = renderMermaidAsset,
} = {}) {
  const startedAt = Date.now();
  const files = await walkMarkdown(articleRoot);
  const assets = new Map();

  for (const file of files) {
    const markdown = await readFile(file, "utf8");
    for (const asset of collectPublishingAssets(markdown)) {
      assets.set(asset.id, asset);
    }
  }

  let rendered = 0;
  let cached = 0;
  for (const asset of assets.values()) {
    const result = await render(asset, { publicRoot });
    if (result.rendered) rendered += 1;
    else cached += 1;
  }

  const summary = {
    files: files.length,
    assets: assets.size,
    rendered,
    cached,
    durationMs: Date.now() - startedAt,
  };
  log("completed", summary);
  return summary;
}


const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  renderPublishingAssets().catch((error) => {
    log("failed", {
      error: error instanceof Error ? error.message : String(error),
    }, "error");
    process.exitCode = 1;
  });
}
