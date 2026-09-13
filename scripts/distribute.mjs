import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SITE_ORIGIN = "https://thinkerqaq.github.io";
export const SUPPORTED_PLATFORMS = [
  "cnblogs",
  "juejin",
  "csdn",
  "segmentfault",
  "zhihu",
  "51cto",
  "oschina",
  "toutiao",
];
export const DEFAULT_OUTPUT_ROOT = ".distribution";
export const MANIFEST_FILE = "manifest.json";

const FOOTER_TEMPLATE = (canonicalUrl) => [
  "---",
  "",
  `> 本文首发于 [ThinkerQAQ 的个人博客](${canonicalUrl})，由作者本人同步发布。原文可能持续修订，最新版本请以个人博客为准。`,
].join("\n");

function log(severity, operation, status, details = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    severity,
    operation,
    status,
    ...details,
  }));
}

function parseScalar(rawValue) {
  const value = rawValue.trim();
  if (!value) return "";
  if (value.startsWith('"')) return JSON.parse(value);
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replaceAll("''", "'");
  }
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}

function readScalar(frontmatter, name, { required = false } = {}) {
  const match = frontmatter.match(new RegExp(`^${name}:\\s*(.*?)\\s*$`, "mu"));
  if (!match) {
    if (required) throw new Error(`Missing ${name} in article frontmatter`);
    return undefined;
  }
  return parseScalar(match[1]);
}

function readList(frontmatter, name) {
  const lines = frontmatter.split("\n");
  const fieldIndex = lines.findIndex((line) => new RegExp(`^${name}:\\s*`, "u").test(line));
  if (fieldIndex === -1) return [];

  const inline = lines[fieldIndex].replace(new RegExp(`^${name}:\\s*`, "u"), "").trim();
  if (inline) {
    if (inline.startsWith("[")) {
      try {
        const parsed = JSON.parse(inline);
        if (!Array.isArray(parsed)) throw new Error(`${name} must be an array`);
        return parsed.map(String);
      } catch (error) {
        throw new Error(`Invalid inline ${name}: ${error.message}`);
      }
    }
    return inline.split(",").map((value) => String(parseScalar(value))).filter(Boolean);
  }

  const values = [];
  for (let index = fieldIndex + 1; index < lines.length; index += 1) {
    const match = lines[index].match(/^\s+-\s+(.+?)\s*$/u);
    if (!match) break;
    values.push(String(parseScalar(match[1])));
  }
  return values;
}

export function parseArticle(markdown, source = "article.md") {
  const normalized = markdown.replace(/^\uFEFF/u, "").replaceAll("\r\n", "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---(?:\n|$)/u);
  if (!match) throw new Error(`Invalid article frontmatter: ${source}`);

  const frontmatter = match[1];
  const title = readScalar(frontmatter, "title", { required: true });
  const description = readScalar(frontmatter, "description", { required: true });
  const status = readScalar(frontmatter, "status") ?? "draft";
  const tags = readList(frontmatter, "tags");
  const body = normalized.slice(match[0].length).trim();

  if (typeof title !== "string" || !title.trim()) throw new Error(`Invalid title: ${source}`);
  if (typeof description !== "string" || !description.trim()) {
    throw new Error(`Invalid description: ${source}`);
  }
  if (!body) throw new Error(`Article body is empty: ${source}`);

  return { title, description, status: String(status), tags, body };
}

function truncate(value, maxLength) {
  const characters = [...value];
  return characters.length <= maxLength ? value : `${characters.slice(0, maxLength - 1).join("")}…`;
}

function yamlList(name, values) {
  return [name + ":", ...values.map((value) => `  - ${JSON.stringify(value)}`)];
}

function makeExternalLinksAbsolute(body) {
  return body
    .replace(/(\]\()\/(?!\/)/gu, `$1${SITE_ORIGIN}/`)
    .replace(/((?:href|src)=["'])\/(?!\/)/giu, `$1${SITE_ORIGIN}/`);
}

export function buildPlatformMarkdown(article, { platform, slug }) {
  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    throw new Error(`Unsupported platform: ${platform}`);
  }
  const canonicalUrl = new URL(`/articles/${slug}/`, SITE_ORIGIN).toString();
  const tagLimit = platform === "cnblogs" ? article.tags.length : 5;
  const tags = article.tags.slice(0, tagLimit);
  const descriptionLimit = platform === "juejin" ? 100 : 256;
  const frontmatter = [
    "---",
    `title: ${JSON.stringify(article.title)}`,
    `description: ${JSON.stringify(truncate(article.description, descriptionLimit))}`,
    `summary: ${JSON.stringify(truncate(article.description, descriptionLimit))}`,
    ...yamlList("tags", tags),
    ...(platform === "cnblogs" ? yamlList("categories", ["[Markdown]"]) : []),
    `canonicalUrl: ${JSON.stringify(canonicalUrl)}`,
    `sourcePlatform: ${JSON.stringify("ThinkerQAQ personal blog")}`,
    "---",
  ].join("\n");
  const body = makeExternalLinksAbsolute(article.body);
  return `${frontmatter}\n\n${body}\n\n${FOOTER_TEMPLATE(canonicalUrl)}\n`;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function walkMarkdown(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walkMarkdown(absolute)));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) files.push(absolute);
  }
  return files.sort();
}

async function readManifest(manifestPath) {
  if (!(await exists(manifestPath))) return { version: 1, articles: {} };
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.version !== 1 || typeof manifest.articles !== "object") {
    throw new Error(`Unsupported distribution manifest: ${manifestPath}`);
  }
  return manifest;
}

async function writeManifest(manifestPath, manifest) {
  await mkdir(path.dirname(manifestPath), { recursive: true });
  const output = {
    ...manifest,
    version: 1,
    generatedAt: new Date().toISOString(),
  };
  await writeFile(manifestPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
}

export async function exportArticles({
  articleRoot,
  outputRoot,
  platforms = SUPPORTED_PLATFORMS,
  requestedSlugs = [],
} = {}) {
  const startedAt = Date.now();
  const resolvedArticleRoot = path.resolve(articleRoot);
  const resolvedOutputRoot = path.resolve(outputRoot);
  const manifestPath = path.join(resolvedOutputRoot, MANIFEST_FILE);
  const manifest = await readManifest(manifestPath);
  const requested = new Set(requestedSlugs);
  const seenRequested = new Set();
  const exported = [];
  let skippedDrafts = 0;

  for (const sourceFile of await walkMarkdown(resolvedArticleRoot)) {
    const slug = path.relative(resolvedArticleRoot, sourceFile)
      .replace(/\.md$/iu, "")
      .split(path.sep)
      .join("/");
    if (requested.size > 0 && !requested.has(slug)) continue;
    seenRequested.add(slug);

    const article = parseArticle(await readFile(sourceFile, "utf8"), sourceFile);
    if (article.status !== "published") {
      skippedDrafts += 1;
      continue;
    }

    const canonicalUrl = new URL(`/articles/${slug}/`, SITE_ORIGIN).toString();
    const articleState = manifest.articles[slug] ?? {
      source: path.relative(process.cwd(), sourceFile).split(path.sep).join("/"),
      canonicalUrl,
      platforms: {},
    };
    articleState.title = article.title;
    articleState.source = path.relative(process.cwd(), sourceFile).split(path.sep).join("/");
    articleState.canonicalUrl = canonicalUrl;
    articleState.platforms ??= {};

    for (const platform of platforms) {
      const generated = buildPlatformMarkdown(article, { platform, slug });
      const contentHash = sha256(generated);
      const outputFile = path.join(resolvedOutputRoot, platform, `${slug}.md`);
      await mkdir(path.dirname(outputFile), { recursive: true });
      const outputChanged = !(await exists(outputFile))
        || await readFile(outputFile, "utf8") !== generated;
      if (outputChanged) await writeFile(outputFile, generated, "utf8");

      const previous = articleState.platforms[platform] ?? {};
      articleState.platforms[platform] = {
        ...previous,
        output: path.relative(process.cwd(), outputFile).split(path.sep).join("/"),
        contentHash,
      };
      exported.push({
        slug,
        platform,
        title: article.title,
        outputFile,
        contentHash,
        pending: previous.lastSyncedHash !== contentHash,
        tagCount: article.tags.length,
        exportedTagCount: platform === "cnblogs" ? article.tags.length : Math.min(5, article.tags.length),
      });
    }
    manifest.articles[slug] = articleState;
  }

  const missing = [...requested].filter((slug) => !seenRequested.has(slug));
  if (missing.length > 0) throw new Error(`Unknown article slug: ${missing.join(", ")}`);

  await writeManifest(manifestPath, manifest);
  log("info", "distribution-export", "completed", {
    articles: new Set(exported.map((item) => item.slug)).size,
    outputs: exported.length,
    pending: exported.filter((item) => item.pending).length,
    skippedDrafts,
    outputRoot: resolvedOutputRoot,
    durationMs: Date.now() - startedAt,
  });
  return { exported, manifest, manifestPath };
}

function runProcess(command, args, { cwd = process.cwd() } = {}) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const output = [];
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: ["inherit", "pipe", "pipe"],
      shell: process.platform === "win32",
      windowsHide: true,
    });
    child.stdout.on("data", (chunk) => {
      output.push(chunk);
      process.stdout.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      output.push(chunk);
      process.stderr.write(chunk);
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${command} terminated by signal ${signal}`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`${command} exited with code ${code}`));
        return;
      }
      resolve({
        durationMs: Date.now() - startedAt,
        output: Buffer.concat(output).toString("utf8"),
      });
    });
  });
}

function wechatsyncFailure(output = "") {
  const normalized = output.replace(/\x1B\[[0-?]*[ -/]*[@-~]/gu, "");
  if (/文章频繁发布，请稍后再试/u.test(normalized)) return "rate-limited";
  if (/Invalid or missing token/u.test(normalized)) return "invalid-token";
  if (/同步完成:\s*0\s*成功,\s*[1-9]\d*\s*失败/u.test(normalized)) return "platform-failed";
  return null;
}

export async function syncExports({
  exported,
  manifest,
  manifestPath,
  changedOnly = false,
  dryRun = false,
  run = runProcess,
  wait = (durationMs) => new Promise((resolve) => setTimeout(resolve, durationMs)),
  rateLimitRetryMs = 60_000,
} = {}) {
  const selected = changedOnly ? exported.filter((item) => item.pending) : exported;
  for (const item of selected) {
    const startedAt = Date.now();
    const args = ["sync", item.outputFile, "-p", item.platform];
    if (dryRun) args.push("--dry-run");
    log("info", "distribution-sync", "started", {
      slug: item.slug,
      platform: item.platform,
      dryRun,
    });
    try {
      let result = await run("wechatsync", args);
      let failure = wechatsyncFailure(result?.output);
      if (!dryRun && item.platform === "csdn" && failure === "rate-limited") {
        log("warn", "distribution-sync", "rate-limit-retry-wait", {
          slug: item.slug,
          platform: item.platform,
          retryDelayMs: rateLimitRetryMs,
        });
        await wait(rateLimitRetryMs);
        result = await run("wechatsync", args);
        failure = wechatsyncFailure(result?.output);
      }
      if (failure) throw new Error(`Wechatsync reported ${failure}`);
      if (!dryRun) {
        const state = manifest.articles[item.slug].platforms[item.platform];
        state.lastSyncedHash = item.contentHash;
        state.lastSyncedAt = new Date().toISOString();
        await writeManifest(manifestPath, manifest);
      }
      log("info", "distribution-sync", dryRun ? "dry-run-completed" : "completed", {
        slug: item.slug,
        platform: item.platform,
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      log("error", "distribution-sync", "failed", {
        slug: item.slug,
        platform: item.platform,
        durationMs: Date.now() - startedAt,
        exception: { name: error.name, message: error.message },
      });
      throw new Error(
        `Failed to sync ${item.slug} to ${item.platform}. `
        + "Install @wechatsync/cli, enable its Chrome bridge, and log in to the platform.",
        { cause: error },
      );
    }
  }
  return selected.length;
}

export function parseArguments(argv) {
  const options = {
    platforms: [...SUPPORTED_PLATFORMS],
    requestedSlugs: [],
    outputRoot: DEFAULT_OUTPUT_ROOT,
    sync: false,
    changedOnly: false,
    dryRun: false,
    help: false,
  };

  function requireValue(option, index) {
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${option} requires a value`);
    return value;
  }

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--article") {
      options.requestedSlugs.push(requireValue(argument, index));
      index += 1;
    } else if (argument === "--platforms") {
      const values = [];
      while (index + 1 < argv.length && !argv[index + 1].startsWith("--")) {
        values.push(...argv[++index].split(",").filter(Boolean));
      }
      options.platforms = [...new Set(values)];
    } else if (argument === "--output") {
      options.outputRoot = requireValue(argument, index);
      index += 1;
    }
    else if (argument === "--sync") options.sync = true;
    else if (argument === "--changed") options.changedOnly = true;
    else if (argument === "--dry-run") options.dryRun = true;
    else if (argument === "--help" || argument === "-h") options.help = true;
    else throw new Error(`Unknown option: ${argument}`);
  }

  if (!options.outputRoot) throw new Error("--output requires a directory");
  if (options.platforms.length === 0) throw new Error("--platforms requires at least one platform");
  const unsupported = options.platforms.filter((item) => !SUPPORTED_PLATFORMS.includes(item));
  if (unsupported.length > 0) throw new Error(`Unsupported platform: ${unsupported.join(", ")}`);
  if (options.changedOnly && !options.sync) {
    throw new Error("--changed is only meaningful together with --sync");
  }
  if (options.dryRun && !options.sync) throw new Error("--dry-run requires --sync");
  return options;
}

function printHelp() {
  console.log(`Usage: npm run distribute -- [options]

Generate platform-ready Markdown from published articles. Add --sync to send drafts through Wechatsync.

Options:
  --article <slug>       Export one article; may be repeated
  --platforms <list>     Comma- or space-separated: cnblogs,juejin,csdn,segmentfault,zhihu,51cto,oschina,toutiao
  --output <directory>   Output directory (default: .distribution)
  --sync                 Send generated Markdown to platform drafts
  --changed              With --sync, send only content not synced before
  --dry-run              Ask Wechatsync to validate without creating drafts
  -h, --help             Show this help`);
}

async function main() {
  const startedAt = Date.now();
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const repositoryRoot = path.resolve(scriptDir, "..");
  const result = await exportArticles({
    articleRoot: path.join(repositoryRoot, "src", "content", "articles"),
    outputRoot: path.resolve(repositoryRoot, options.outputRoot),
    platforms: options.platforms,
    requestedSlugs: options.requestedSlugs,
  });

  for (const item of result.exported) {
    if (item.tagCount > item.exportedTagCount) {
      log("warn", "distribution-export", "tags-truncated", {
        slug: item.slug,
        platform: item.platform,
        sourceTagCount: item.tagCount,
        exportedTagCount: item.exportedTagCount,
      });
    }
  }

  let synced = 0;
  if (options.sync) {
    synced = await syncExports({
      ...result,
      changedOnly: options.changedOnly,
      dryRun: options.dryRun,
    });
  }
  log("info", "distribution", "completed", {
    outputs: result.exported.length,
    synced,
    dryRun: options.dryRun,
    durationMs: Date.now() - startedAt,
  });
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  main().catch((error) => {
    log("error", "distribution", "failed", {
      exception: { name: error.name, message: error.message, stack: error.stack },
    });
    process.exitCode = 1;
  });
}
