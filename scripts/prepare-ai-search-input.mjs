import { copyFile, mkdir, readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const sourceRoot = path.join(repositoryRoot, "src", "content");
const outputRoot = path.resolve(process.argv[2] || "");

if (!process.argv[2]) {
  console.error("Usage: node scripts/prepare-ai-search-input.mjs <output-directory>");
  process.exit(1);
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
  if (!match) return {};

  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
    if (field) data[field[1]] = parseScalar(field[2]);
  }
  return data;
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

async function copyMarkdown(sourceBase, absolute) {
  const relative = path.relative(sourceBase, absolute);
  const destination = path.join(outputRoot, path.basename(sourceBase), relative);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(absolute, destination);
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

const publicNoteIds = new Set();
const counts = { articles: 0, notes: 0, noteTranslations: 0 };

const articlesBase = path.join(sourceRoot, "articles");
for (const absolute of await walk(articlesBase)) {
  const markdown = await readFile(absolute, "utf8");
  const data = parseFrontmatter(markdown);
  if (data.status !== "published") continue;
  await copyMarkdown(articlesBase, absolute);
  counts.articles += 1;
}

const notesBase = path.join(sourceRoot, "notes");
for (const absolute of await walk(notesBase)) {
  const relative = path.relative(notesBase, absolute).replaceAll("\\", "/");
  const id = relative.replace(/\.md$/i, "");
  const markdown = await readFile(absolute, "utf8");
  const data = parseFrontmatter(markdown);
  if (String(data.indexable || "true").toLowerCase() === "false") continue;
  publicNoteIds.add(id);
  await copyMarkdown(notesBase, absolute);
  counts.notes += 1;
}

const translationsBase = path.join(sourceRoot, "note-translations");
for (const absolute of await walk(translationsBase)) {
  const markdown = await readFile(absolute, "utf8");
  const data = parseFrontmatter(markdown);
  const id = String(data.translationOf || "").trim();
  const language = String(data.language || "").trim().toLowerCase();
  if (!id || !language || language === "zh" || !publicNoteIds.has(id)) continue;
  await copyMarkdown(translationsBase, absolute);
  counts.noteTranslations += 1;
}

console.log(JSON.stringify({
  operation: "prepare-ai-search-input",
  status: "completed",
  output: outputRoot,
  ...counts,
}));
