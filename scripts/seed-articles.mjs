import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PROMOTED_ARTICLES } from "./content-policy.mjs";

const startedAt = Date.now();
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDir, "..");
const noteRoot = path.join(repositoryRoot, "src", "content", "notes");
const articleRoot = path.join(repositoryRoot, "src", "content", "articles");

function log(severity, status, details = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    severity,
    operation: "seed-articles",
    status,
    ...details,
  }));
}

function yamlString(value) {
  return JSON.stringify(value);
}

function readJsonField(frontmatter, name) {
  const match = frontmatter.match(new RegExp(`^${name}: (.+)$`, "m"));
  if (!match) throw new Error(`Missing ${name} in imported note`);
  return JSON.parse(match[1]);
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

function noteRoute(sourcePath) {
  return `/notes/${sourcePath.replace(/\.md$/i, "").replaceAll("\\", "/")}/`;
}

async function main() {
  await mkdir(articleRoot, { recursive: true });
  let created = 0;
  let preserved = 0;

  for (const article of PROMOTED_ARTICLES) {
    const sourceFile = path.resolve(noteRoot, article.sourcePath);
    const outputFile = path.resolve(articleRoot, `${article.slug}.md`);
    if (!sourceFile.startsWith(noteRoot + path.sep) || !outputFile.startsWith(articleRoot + path.sep)) {
      throw new Error(`Unsafe article path: ${article.slug}`);
    }
    if (await exists(outputFile)) {
      preserved += 1;
      continue;
    }

    const imported = await readFile(sourceFile, "utf8");
    const parsed = imported.match(/^---\n([\s\S]*?)\n---\n/);
    if (!parsed) throw new Error(`Invalid imported note frontmatter: ${article.sourcePath}`);
    const metadata = parsed[1];
    const body = imported.slice(parsed[0].length).trim();
    const title = readJsonField(metadata, "title");
    const description = readJsonField(metadata, "description");
    const tags = readJsonField(metadata, "tags");

    const frontmatter = [
      "---",
      `title: ${yamlString(title)}`,
      `description: ${yamlString(description)}`,
      `publishedAt: ${yamlString(article.publishedAt)}`,
      'language: "zh"',
      `tags: ${JSON.stringify(tags)}`,
      'status: "published"',
      `featured: ${article.featured}`,
      ...(article.series ? [`series: ${yamlString(article.series)}`] : []),
      `sourceNote: ${yamlString(noteRoute(article.sourcePath))}`,
      "---",
      "",
    ].join("\n");

    await writeFile(outputFile, `${frontmatter}${body}\n`, "utf8");
    created += 1;
  }

  log("info", "completed", {
    created,
    preserved,
    durationMs: Date.now() - startedAt,
  });
}

main().catch((error) => {
  log("error", "failed", {
    error: error instanceof Error ? error.message : String(error),
    durationMs: Date.now() - startedAt,
  });
  process.exitCode = 1;
});
