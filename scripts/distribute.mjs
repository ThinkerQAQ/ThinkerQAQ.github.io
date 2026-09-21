import { createHash } from "node:crypto";
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { micromark } from "micromark";
import {
  collectPublishingAssets,
  compilePublishingMarkdown,
} from "../tools/blogctl/compiler/node/compiler.mjs";
import {
  defaultPlatformPublishingConfig,
  defaultPublishingConfig,
  renderPublishingFooter,
  trackedPublishingUrl,
} from "./publishing-config.mjs";

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

export function resolveArticleAssetUrl(value) {
  const raw = String(value || "").trim();
  return raw ? new URL(raw, SITE_ORIGIN).toString() : "";
}

export function buildArticleCanonicalUrl(slug, language = "zh-CN") {
  const encodedSlug = String(slug).split("/").map(encodeURIComponent).join("/");
  const prefix = language === "en" ? "/en/articles/" : "/articles/";
  return new URL(`${prefix}${encodedSlug}/`, SITE_ORIGIN).toString();
}

export function buildTrackedUrl(canonicalUrl, platform, publishingConfig = null) {
	if (!SUPPORTED_PLATFORMS.includes(platform)) {
		throw new Error(`Unsupported platform: ${platform}`);
	}
	const profile = publishingConfig ?? defaultPlatformPublishingConfig(platform);
	return trackedPublishingUrl(canonicalUrl, profile);
}

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
  const coverImage = readScalar(frontmatter, "coverImage");
  const coverImageAlt = readScalar(frontmatter, "coverImageAlt");
  const body = normalized.slice(match[0].length).trim();

  if (typeof title !== "string" || !title.trim()) throw new Error(`Invalid title: ${source}`);
  if (typeof description !== "string" || !description.trim()) {
    throw new Error(`Invalid description: ${source}`);
  }
  if (!body) throw new Error(`Article body is empty: ${source}`);
  if (String(status) === "published" && (!coverImage || !coverImageAlt)) {
    throw new Error(`Published article cover metadata is incomplete: ${source}`);
  }

  return {
    title,
    description,
    status: String(status),
    tags,
    coverImage: coverImage ? String(coverImage) : "",
    coverImageAlt: coverImageAlt ? String(coverImageAlt) : "",
    body,
  };
}

function truncate(value, maxLength) {
  const characters = [...value];
  return characters.length <= maxLength ? value : `${characters.slice(0, maxLength - 1).join("")}…`;
}

function yamlList(name, values) {
  return [name + ":", ...values.map((value) => `  - ${JSON.stringify(value)}`)];
}

export function buildPlatformMarkdown(article, {
	platform,
	slug,
	publishingConfig = null,
	language = null,
}) {
	if (!SUPPORTED_PLATFORMS.includes(platform)) {
		throw new Error(`Unsupported platform: ${platform}`);
	}
	const profile = publishingConfig ?? defaultPlatformPublishingConfig(platform);
	const contentLanguage = language || profile.language || defaultPlatformPublishingConfig(platform).language;
	const canonicalUrl = buildArticleCanonicalUrl(slug, contentLanguage);
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
		...(profile.canonical?.mode === "none" ? [] : [`canonicalUrl: ${JSON.stringify(canonicalUrl)}`]),
		`sourcePlatform: ${JSON.stringify(contentLanguage === "en" ? "ThinkerQAQ personal blog" : "ThinkerQAQ 个人博客")}`,
		"---",
	].join("\n");
	const body = compilePublishingMarkdown(article.body, {
		platform,
		siteOrigin: SITE_ORIGIN,
	}).markdown;
	const footer = renderPublishingFooter(profile, {
		canonicalUrl,
		title: article.title,
		site: contentLanguage === "en" ? "ThinkerQAQ's personal blog" : "ThinkerQAQ 的个人博客",
	});
	const footerSection = footer ? `\n\n---\n\n${footer}` : "";
	return `${frontmatter}\n\n${body}${footerSection}\n`;
}

function splitTableRow(line) {
  let text = String(line).trim();
  if (text.startsWith("|")) text = text.slice(1);
  if (text.endsWith("|")) text = text.slice(0, -1);
  const cells = [];
  let current = "";
  let escaped = false;
  let codeTicks = 0;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === "\\") {
      current += char;
      escaped = true;
      continue;
    }
    if (char === "`") {
      let run = 1;
      while (text[index + run] === "`") run += 1;
      const token = "`".repeat(run);
      current += token;
      index += run - 1;
      codeTicks = codeTicks === run ? 0 : (codeTicks === 0 ? run : codeTicks);
      continue;
    }
    if (char === "|" && codeTicks === 0) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function isTableDelimiter(line) {
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/u.test(cell.trim()));
}

function inlineMarkdownToHtml(value) {
  const rendered = micromark(String(value), { allowDangerousHtml: true }).trim();
  const match = rendered.match(/^<p>([\s\S]*)<\/p>$/u);
  return match ? match[1] : rendered;
}

export function renderPlatformHtml(markdown) {
  const lines = String(markdown).replaceAll("\r\n", "\n").split("\n");
  const output = [];
  let index = 0;
  let fence = "";

  while (index < lines.length) {
    const line = lines[index];
    const fenceMatch = line.match(/^\s*([`~]{3,})/u);
    if (fenceMatch) {
      const token = fenceMatch[1][0];
      if (!fence) fence = token;
      else if (fence === token) fence = "";
      output.push(line);
      index += 1;
      continue;
    }

    if (!fence && index + 1 < lines.length && line.includes("|") && isTableDelimiter(lines[index + 1])) {
      const headers = splitTableRow(line);
      const delimiter = splitTableRow(lines[index + 1]);
      if (headers.length === delimiter.length && headers.length > 0) {
        const rows = [];
        index += 2;
        while (index < lines.length && lines[index].trim() && lines[index].includes("|")) {
          const row = splitTableRow(lines[index]);
          if (row.length !== headers.length) break;
          rows.push(row);
          index += 1;
        }
        const head = headers.map((cell) => `<th>${inlineMarkdownToHtml(cell)}</th>`).join("");
        const body = rows.map((row) => `<tr>${row.map((cell) => `<td>${inlineMarkdownToHtml(cell)}</td>`).join("")}</tr>`).join("");
        output.push(`<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`);
        continue;
      }
    }

    output.push(line);
    index += 1;
  }

  return micromark(output.join("\n"), { allowDangerousHtml: true });
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

async function walkMarkdown(directory, { excludedDirectories = new Set() } = {}) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (excludedDirectories.has(entry.name)) continue;
      files.push(...(await walkMarkdown(absolute, { excludedDirectories })));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      files.push(absolute);
    }
  }
  return files.sort();
}

export async function exportArticles({
  articleRoot,
  outputRoot,
  platforms = SUPPORTED_PLATFORMS,
  requestedSlugs = [],
  publishingConfig = defaultPublishingConfig(),
  language = "zh-CN",
} = {}) {
  const startedAt = Date.now();
  const resolvedArticleRoot = path.resolve(articleRoot);
  const resolvedOutputRoot = path.resolve(outputRoot);
  const requested = new Set(requestedSlugs);
  const seenRequested = new Set();
  const exported = [];
  let skippedDrafts = 0;

  const excludedDirectories = language === "zh-CN" ? new Set(["en"]) : new Set();
  for (const sourceFile of await walkMarkdown(resolvedArticleRoot, { excludedDirectories })) {
    const slug = path.relative(resolvedArticleRoot, sourceFile)
      .replace(/\.md$/iu, "")
      .split(path.sep)
      .join("/");
    if (requested.size > 0 && !requested.has(slug)) continue;

    const article = parseArticle(await readFile(sourceFile, "utf8"), sourceFile);
    if (article.status !== "published") {
      skippedDrafts += 1;
      continue;
    }
    seenRequested.add(slug);

    const canonicalUrl = buildArticleCanonicalUrl(slug, language);
    const publishingAssets = collectPublishingAssets(article.body);

    for (const platform of platforms) {
      const generated = buildPlatformMarkdown(article, {
		platform,
		slug,
		publishingConfig: publishingConfig?.[platform] ?? defaultPlatformPublishingConfig(platform),
		language,
	});
      const generatedArticle = parseArticle(generated, `${platform}:${slug}`);
      const renderedHtml = renderPlatformHtml(generatedArticle.body);
      const contentHash = sha256(`${generated}\n<!-- blogctl-html -->\n${renderedHtml}`);
      const outputFile = path.join(resolvedOutputRoot, platform, `${slug}.md`);
      const htmlOutputFile = path.join(resolvedOutputRoot, platform, `${slug}.html`);
      await mkdir(path.dirname(outputFile), { recursive: true });
      const outputChanged = !(await exists(outputFile))
        || await readFile(outputFile, "utf8") !== generated;
      if (outputChanged) await writeFile(outputFile, generated, "utf8");
      const htmlOutputChanged = !(await exists(htmlOutputFile))
        || await readFile(htmlOutputFile, "utf8") !== renderedHtml;
      if (htmlOutputChanged) await writeFile(htmlOutputFile, renderedHtml, "utf8");

      exported.push({
        slug,
        platform,
        title: article.title,
        language,
        canonicalUrl,
        outputFile,
        contentHash,
        tagCount: article.tags.length,
        exportedTagCount: platform === "cnblogs" ? article.tags.length : Math.min(5, article.tags.length),
        publishingAssets,
      });
    }
  }

  const missing = [...requested].filter((slug) => !seenRequested.has(slug));
  if (missing.length > 0) throw new Error(`Unknown article slug: ${missing.join(", ")}`);

  log("info", "distribution-export", "completed", {
    articles: new Set(exported.map((item) => item.slug)).size,
    outputs: exported.length,
    skippedDrafts,
    outputRoot: resolvedOutputRoot,
    durationMs: Date.now() - startedAt,
  });
  return { exported };
}

export function parseArguments(argv) {
  const options = {
    platforms: [...SUPPORTED_PLATFORMS],
    requestedSlugs: [],
    outputRoot: DEFAULT_OUTPUT_ROOT,
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
    } else if (argument === "--dry-run") {
      options.dryRun = true;
    } else if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown option: ${argument}`);
    }
  }

  if (!options.outputRoot) throw new Error("--output requires a directory");
  if (options.platforms.length === 0) throw new Error("--platforms requires at least one platform");
  const unsupported = options.platforms.filter((item) => !SUPPORTED_PLATFORMS.includes(item));
  if (unsupported.length > 0) throw new Error(`Unsupported platform: ${unsupported.join(", ")}`);
  return options;
}

function printHelp() {
  console.log(`Usage: npm run distribute -- [options]

Generate platform-ready Markdown and HTML artifacts for BlogCTL native publishers.

Options:
  --article <slug>       Export one article; may be repeated
  --platforms <list>     Comma- or space-separated: cnblogs,juejin,csdn,segmentfault,zhihu,51cto,oschina,toutiao
  --output <directory>   Output directory (default: .distribution)
  --dry-run              Compile without publishing generated assets
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

  log("info", "distribution", "completed", {
    outputs: result.exported.length,
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
