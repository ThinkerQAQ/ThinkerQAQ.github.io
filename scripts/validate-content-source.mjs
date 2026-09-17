import { access, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.argv[2] || process.env.BLOG_CONTENT_ROOT || "../content-source");
const contentRoot = path.join(root, "src", "content");
const requiredCollections = ["articles", "notes", "note-translations", "projects", "series"];

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function countMarkdownFiles(dir) {
  let count = 0;
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      count += await countMarkdownFiles(target);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      count += 1;
    }
  }
  return count;
}

if (!(await exists(contentRoot))) {
  throw new Error(`Missing content root: ${contentRoot}`);
}

const collectionCounts = {};
for (const collection of requiredCollections) {
  const collectionRoot = path.join(contentRoot, collection);
  if (!(await exists(collectionRoot))) {
    throw new Error(`Missing required content collection: src/content/${collection}`);
  }
  const info = await stat(collectionRoot);
  if (!info.isDirectory()) {
    throw new Error(`Content collection is not a directory: src/content/${collection}`);
  }
  collectionCounts[collection] = await countMarkdownFiles(collectionRoot);
}

for (const requiredNonEmpty of ["articles", "notes", "projects", "series"]) {
  if (collectionCounts[requiredNonEmpty] === 0) {
    throw new Error(`Content collection is unexpectedly empty: src/content/${requiredNonEmpty}`);
  }
}

const manifestPath = path.join(root, "src", "data", "content-manifest.json");
let manifestEntries = null;
if (await exists(manifestPath)) {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (!Array.isArray(manifest.entries)) {
    throw new Error("src/data/content-manifest.json must contain an entries array");
  }
  manifestEntries = manifest.entries.length;
}

const mediaRoot = path.join(root, "public", "media");
const mediaPresent = await exists(mediaRoot);

console.log(JSON.stringify({
  operation: "validate-content-source",
  root,
  collectionCounts,
  manifestEntries,
  mediaPresent,
}));
