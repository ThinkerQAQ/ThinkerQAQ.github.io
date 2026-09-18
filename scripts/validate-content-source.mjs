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

async function countMarkdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  let count = 0;
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) count += await countMarkdownFiles(target);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) count += 1;
  }
  return count;
}

async function walkMarkdown(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walkMarkdown(target));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) files.push(target);
  }
  return files;
}

function frontmatterScalar(markdown, name) {
  const normalized = String(markdown).replaceAll("\r\n", "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---(?:\n|$)/u);
  if (!match) return "";
  const field = match[1].match(new RegExp(`^${name}:\\s*(.*?)\\s*$`, "mu"));
  if (!field) return "";
  const value = field[1].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

async function validatePublishedArticleCovers(articleRoot) {
  const failures = [];
  let published = 0;
  for (const file of await walkMarkdown(articleRoot)) {
    const markdown = await readFile(file, "utf8");
    if ((frontmatterScalar(markdown, "status") || "draft") !== "published") continue;
    published += 1;
    const coverImage = frontmatterScalar(markdown, "coverImage");
    const coverImageAlt = frontmatterScalar(markdown, "coverImageAlt");
    const relative = path.relative(root, file).split(path.sep).join("/");
    if (!coverImage) failures.push(`${relative}: published article is missing coverImage`);
    if (!coverImageAlt) failures.push(`${relative}: published article is missing coverImageAlt`);
    if (coverImage) {
      if (!coverImage.startsWith("/media/")) {
        failures.push(`${relative}: coverImage must be rooted under /media/`);
      } else {
        const asset = path.join(root, "public", ...coverImage.replace(/^\/+/, "").split("/"));
        if (!(await exists(asset))) failures.push(`${relative}: coverImage does not exist: ${coverImage}`);
      }
    }
  }
  if (failures.length > 0) {
    throw new Error(`Article cover validation failed:\n- ${failures.join("\n- ")}`);
  }
  return published;
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

const publishedArticleCovers = await validatePublishedArticleCovers(path.join(contentRoot, "articles"));

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
  publishedArticleCovers,
  manifestEntries,
  mediaPresent,
}));
