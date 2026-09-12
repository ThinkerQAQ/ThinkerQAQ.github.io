import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CATEGORY_SLUGS,
  NOTE_TOPIC_OVERRIDES,
} from "./content-policy.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDir, "..");
const notesRoot = path.join(repositoryRoot, "src", "content", "notes");
const manifestPath = path.join(repositoryRoot, "src", "data", "content-manifest.json");

function yamlString(value) {
  return JSON.stringify(value);
}

function frontmatterValue(markdown, key) {
  const match = markdown.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  if (!match) return undefined;
  try {
    return JSON.parse(match[1]);
  } catch {
    return match[1].trim();
  }
}

function replaceFrontmatterValue(markdown, key, value) {
  const line = `${key}: ${typeof value === "string" ? yamlString(value) : value}`;
  const pattern = new RegExp(`^${key}:.*$`, "m");
  if (!pattern.test(markdown)) throw new Error(`Missing frontmatter field ${key}`);
  return markdown.replace(pattern, line);
}

export function applyTopicFrontmatter(markdown, originalTitle, override, childIndex, order) {
  const topicLabel = `${override.number}.${override.label}`;
  const title = `${override.number}.${childIndex} ${originalTitle}`;
  let next = markdown;
  next = replaceFrontmatterValue(next, "title", title);
  next = replaceFrontmatterValue(next, "topic", override.id);
  next = replaceFrontmatterValue(next, "topicLabel", topicLabel);
  next = replaceFrontmatterValue(next, "order", order);
  return { markdown: next, title, topic: override.id, topicLabel, order };
}

async function walkMarkdown(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walkMarkdown(absolute)));
    else if (entry.isFile() && path.extname(entry.name).toLowerCase() === ".md") files.push(absolute);
  }
  return files;
}

async function applyNotebookOverrides(sourcePath, overrides) {
  const category = CATEGORY_SLUGS[sourcePath] ?? sourcePath.toLowerCase().replaceAll("/", "-");
  const outputDirectory = path.join(notesRoot, category);
  let files;
  try {
    files = await walkMarkdown(outputDirectory);
  } catch (error) {
    if (error?.code === "ENOENT") return new Map();
    throw error;
  }

  const candidates = [];
  for (const file of files) {
    const relativePath = path.relative(outputDirectory, file).split(path.sep).join("/");
    const override = overrides.get(relativePath);
    if (!override) {
      throw new Error(`Missing topic override for published note ${sourcePath}/${relativePath}`);
    }
    const markdown = await readFile(file, "utf8");
    const sourceOrder = Number(frontmatterValue(markdown, "order") ?? Number.MAX_SAFE_INTEGER);
    candidates.push({ file, relativePath, override, markdown, sourceOrder });
  }

  candidates.sort((left, right) =>
    left.override.number - right.override.number
      || left.sourceOrder - right.sourceOrder
      || left.relativePath.localeCompare(right.relativePath, "zh-CN", { numeric: true }),
  );

  const childIndexes = new Map();
  const manifestUpdates = new Map();
  for (const [index, candidate] of candidates.entries()) {
    const childIndex = (childIndexes.get(candidate.override.id) ?? 0) + 1;
    childIndexes.set(candidate.override.id, childIndex);
    const originalTitle = path.basename(candidate.file, path.extname(candidate.file));
    const applied = applyTopicFrontmatter(
      candidate.markdown,
      originalTitle,
      candidate.override,
      childIndex,
      index + 1,
    );
    await writeFile(candidate.file, applied.markdown, "utf8");
    manifestUpdates.set(`${sourcePath}/${candidate.relativePath}`, applied);
  }

  return manifestUpdates;
}

async function updateManifest(updates) {
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }

  for (const entry of manifest.entries ?? []) {
    const update = updates.get(entry.sourcePath);
    if (!update) continue;
    entry.title = update.title;
    entry.topic = update.topic;
    entry.order = update.order;
  }
  manifest.generatedAt = new Date().toISOString();
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

async function main() {
  const updates = new Map();
  for (const [sourcePath, overrides] of Object.entries(NOTE_TOPIC_OVERRIDES)) {
    const notebookUpdates = await applyNotebookOverrides(sourcePath, overrides);
    for (const [source, update] of notebookUpdates) updates.set(source, update);
  }
  await updateManifest(updates);
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    severity: "info",
    operation: "apply-note-topics",
    status: "completed",
    updatedNotes: updates.size,
  }));
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();

if (isMain) {
  main().catch((error) => {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      severity: "error",
      operation: "apply-note-topics",
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    }));
    process.exitCode = 1;
  });
}
