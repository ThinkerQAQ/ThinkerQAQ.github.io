import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_OUTPUT_ROOT = "public/medium-import/en";

export function sanitizeMediumImportHtml(html) {
  return String(html)
    .replace(
      /<meta name="robots" content="[^"]*">/u,
      '<meta name="robots" content="noindex">',
    )
    .replace(/\n?<link rel="canonical" href="[^"]+">\n?/u, "\n");
}

async function findImportPages(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const pages = [];

  for (const entry of entries) {
    if (entry.name.startsWith("v-")) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      pages.push(...await findImportPages(absolute));
    } else if (entry.isFile() && entry.name === "index.html") {
      pages.push(absolute);
    }
  }

  return pages;
}

export async function sanitizeMediumImportPages({ outputRoot } = {}) {
  const root = path.resolve(outputRoot ?? DEFAULT_OUTPUT_ROOT);
  const pages = await findImportPages(root);

  for (const page of pages) {
    const before = await readFile(page, "utf8");
    const after = sanitizeMediumImportHtml(before);
    await writeFile(page, after, "utf8");
  }

  return pages;
}

async function main() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const repositoryRoot = path.resolve(scriptDir, "..");
  const pages = await sanitizeMediumImportPages({
    outputRoot: path.join(repositoryRoot, DEFAULT_OUTPUT_ROOT),
  });
  console.log(JSON.stringify({
    operation: "medium-import-meta",
    status: "completed",
    total: pages.length,
  }));
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  main().catch((error) => {
    console.error(JSON.stringify({
      operation: "medium-import-meta",
      status: "failed",
      exception: { name: error.name, message: error.message, stack: error.stack },
    }));
    process.exitCode = 1;
  });
}
