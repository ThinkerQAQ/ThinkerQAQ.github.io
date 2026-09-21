import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { DEFAULT_SITE_ORIGIN } from "./inventory.mjs";

const execFileAsync = promisify(execFile);
const CONTENT_ROOTS = [
  "src/content/articles",
  "src/content/notes",
  "src/content/note-translations",
];

function frontmatterValue(markdown, field) {
  const frontmatter = String(markdown).match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
  const match = frontmatter.match(new RegExp(`^${field}:\\s*["']?([^"'\\r\\n]+)["']?\\s*$`, "m"));
  return match?.[1]?.trim() ?? "";
}

function markdownId(file, prefix) {
  return file.slice(prefix.length).replace(/^\/+/, "").replace(/\.md$/iu, "");
}

function publicUrl(route, origin = DEFAULT_SITE_ORIGIN) {
  return new URL(route, `${origin}/`).toString();
}

export function contentUrl(file, markdown, { origin = DEFAULT_SITE_ORIGIN } = {}) {
  const normalized = String(file).replaceAll("\\", "/");
  if (!normalized.toLowerCase().endsWith(".md")) return "";

  const articleRoot = "src/content/articles/";
  if (normalized.startsWith(articleRoot)) {
    const id = markdownId(normalized, articleRoot);
    const language = frontmatterValue(markdown, "language").toLowerCase()
      || (id.startsWith("en/") ? "en" : "zh");
    const status = frontmatterValue(markdown, "status").toLowerCase() || "draft";
    if (status !== "published") return "";
    const slug = id.startsWith(`${language}/`) ? id.slice(language.length + 1) : id;
    const locale = language === "zh" ? "" : `/${language}`;
    return publicUrl(`${locale}/articles/${slug}/`, origin);
  }

  const noteRoot = "src/content/notes/";
  if (normalized.startsWith(noteRoot)) {
    return publicUrl(`/notes/${markdownId(normalized, noteRoot)}/`, origin);
  }

  const translationRoot = "src/content/note-translations/";
  if (normalized.startsWith(translationRoot)) {
    const language = frontmatterValue(markdown, "language").toLowerCase();
    const translationOf = frontmatterValue(markdown, "translationOf");
    if (!language || !translationOf) return "";
    return publicUrl(`/${language}/notes/${translationOf.replace(/^\/+|\/+$/gu, "")}/`, origin);
  }

  return "";
}

export function parseChangedPaths(output) {
  const fields = String(output).split("\0").filter(Boolean);
  const paths = [];
  for (let index = 0; index < fields.length; index += 2) {
    const status = fields[index];
    const file = fields[index + 1];
    if (!status || !file) throw new Error("Invalid git diff --name-status output");
    paths.push(file);
  }
  return paths;
}

async function defaultRunGit(repository, args, { allowMissing = false } = {}) {
  try {
    const result = await execFileAsync("git", ["-C", repository, ...args], {
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
      windowsHide: true,
    });
    return result.stdout;
  } catch (error) {
    if (allowMissing && error.code === 128) return "";
    throw error;
  }
}

export async function changedContentUrls({
  repository,
  before,
  after,
  origin = DEFAULT_SITE_ORIGIN,
  runGit = defaultRunGit,
} = {}) {
  if (!repository || !before || !after) throw new Error("repository, before and after are required");
  const diff = await runGit(repository, [
    "diff", "--name-status", "-z", "--no-renames", before, after, "--", ...CONTENT_ROOTS,
  ]);
  const urls = new Set();
  for (const file of parseChangedPaths(diff)) {
    for (const revision of [before, after]) {
      const markdown = await runGit(repository, ["show", `${revision}:${file}`], { allowMissing: true });
      if (!markdown) continue;
      const url = contentUrl(file, markdown, { origin });
      if (url) urls.add(url);
    }
  }
  return [...urls].sort();
}

function optionValue(argv, name, fallback = "") {
  const index = argv.indexOf(name);
  if (index === -1) return fallback;
  if (!argv[index + 1] || argv[index + 1].startsWith("--")) throw new Error(`${name} requires a value`);
  return argv[index + 1];
}

export async function main(argv = process.argv.slice(2)) {
  const repository = path.resolve(optionValue(argv, "--repository"));
  const before = optionValue(argv, "--before");
  const after = optionValue(argv, "--after");
  const output = path.resolve(optionValue(argv, "--output"));
  const urls = await changedContentUrls({ repository, before, after });
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, urls.length ? `${urls.join("\n")}\n` : "", "utf8");
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(), severity: "info", operation: "indexnow-changed-urls",
    status: "completed", urlCount: urls.length, output,
  }));
  return urls;
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invoked && fileURLToPath(import.meta.url) === invoked) {
  main().catch((error) => {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(), severity: "error", operation: "indexnow-changed-urls",
      status: "failed", exception: { name: error.name, message: error.message },
    }));
    process.exitCode = 1;
  });
}
