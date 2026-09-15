import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { unified } from "unified";
import remarkParse from "remark-parse";
import { parseArticle } from "./distribute.mjs";

export const SITE_ORIGIN = "https://thinkerqaq.github.io";
export const DEFAULT_ARTICLE_ROOT = "src/content/articles/en";
export const DEFAULT_OUTPUT_ROOT = "public/medium-import/en";

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function absoluteUrl(value, canonicalUrl) {
  if (!value) return "";
  if (value.startsWith("#")) return value;
  try {
    return new URL(value, canonicalUrl ?? SITE_ORIGIN).toString();
  } catch {
    return value;
  }
}

function plainText(node) {
  if (!node) return "";
  if (typeof node.value === "string") return node.value;
  return (node.children ?? []).map(plainText).join("");
}

function stripTableOfContents(root) {
  const children = [];
  let skipping = false;
  let skippedDepth = null;

  for (const node of root.children ?? []) {
    if (!skipping && node.type === "heading" && plainText(node).trim().toLowerCase() === "table of contents") {
      skipping = true;
      skippedDepth = node.depth;
      continue;
    }

    if (skipping) {
      if (node.type === "thematicBreak") {
        skipping = false;
        skippedDepth = null;
        continue;
      }
      if (node.type === "heading" && Number(node.depth) <= Number(skippedDepth ?? 6)) {
        skipping = false;
        skippedDepth = null;
      } else {
        continue;
      }
    }

    children.push(node);
  }

  return { ...root, children };
}

function collectDefinitions(root) {
  const definitions = new Map();
  for (const node of root.children ?? []) {
    if (node.type === "definition") {
      definitions.set(String(node.identifier ?? "").toLowerCase(), node);
    }
  }
  return definitions;
}

function renderChildren(node, context) {
  return (node.children ?? []).map((child) => renderNode(child, context)).join("");
}

function renderNode(node, context) {
  switch (node.type) {
    case "root":
      return renderChildren(node, context);
    case "text":
      return escapeHtml(node.value);
    case "paragraph":
      return `<p>${renderChildren(node, context)}</p>\n`;
    case "heading": {
      const depth = Math.min(6, Math.max(1, Number(node.depth) || 2));
      return `<h${depth}>${renderChildren(node, context)}</h${depth}>\n`;
    }
    case "strong":
      return `<strong>${renderChildren(node, context)}</strong>`;
    case "emphasis":
      return `<em>${renderChildren(node, context)}</em>`;
    case "inlineCode":
      return `<code>${escapeHtml(node.value)}</code>`;
    case "code":
      return `<pre><code>${escapeHtml(node.value)}</code></pre>\n`;
    case "blockquote":
      return `<blockquote>\n${renderChildren(node, context)}</blockquote>\n`;
    case "list": {
      const tag = node.ordered ? "ol" : "ul";
      const start = node.ordered && Number.isInteger(node.start) && node.start !== 1
        ? ` start="${node.start}"`
        : "";
      return `<${tag}${start}>\n${renderChildren(node, context)}</${tag}>\n`;
    }
    case "listItem":
      return `<li>${renderChildren(node, context)}</li>\n`;
    case "link": {
      const href = absoluteUrl(node.url, context.canonicalUrl);
      const title = node.title ? ` title="${escapeHtml(node.title)}"` : "";
      return `<a href="${escapeHtml(href)}"${title}>${renderChildren(node, context)}</a>`;
    }
    case "image": {
      const src = absoluteUrl(node.url, context.canonicalUrl);
      const title = node.title ? ` title="${escapeHtml(node.title)}"` : "";
      return `<img src="${escapeHtml(src)}" alt="${escapeHtml(node.alt ?? "")}"${title}>`;
    }
    case "linkReference": {
      const definition = context.definitions.get(String(node.identifier ?? "").toLowerCase());
      if (!definition) return renderChildren(node, context);
      const href = absoluteUrl(definition.url, context.canonicalUrl);
      return `<a href="${escapeHtml(href)}">${renderChildren(node, context)}</a>`;
    }
    case "imageReference": {
      const definition = context.definitions.get(String(node.identifier ?? "").toLowerCase());
      if (!definition) return escapeHtml(node.alt ?? "");
      const src = absoluteUrl(definition.url, context.canonicalUrl);
      return `<img src="${escapeHtml(src)}" alt="${escapeHtml(node.alt ?? "")}">`;
    }
    case "thematicBreak":
      return "<hr>\n";
    case "break":
      return "<br>\n";
    case "html":
      return `<p>${escapeHtml(node.value)}</p>\n`;
    case "definition":
      return "";
    default:
      if (node.children) return renderChildren(node, context);
      return typeof node.value === "string" ? escapeHtml(node.value) : "";
  }
}

export function buildCanonicalUrl(slug) {
  const encodedSlug = slug.split("/").map(encodeURIComponent).join("/");
  return new URL(`/en/articles/${encodedSlug}/`, SITE_ORIGIN).toString();
}

export function buildMediumImportUrl(slug) {
  const encodedSlug = slug.split("/").map(encodeURIComponent).join("/");
  return new URL(`/medium-import/en/${encodedSlug}/`, SITE_ORIGIN).toString();
}

export function buildMediumImportHtml(article, { slug } = {}) {
  if (!slug) throw new Error("slug is required");
  const canonicalUrl = buildCanonicalUrl(slug);
  const parsed = unified().use(remarkParse).parse(article.body);
  const root = stripTableOfContents(parsed);
  const context = { canonicalUrl, definitions: collectDefinitions(root) };
  const renderedBody = renderNode(root, context);
  const footer = `This article was first published on <a href="${escapeHtml(canonicalUrl)}">ThinkerQAQ&#39;s personal blog</a> and syndicated here by the author. The original article may be revised over time; please refer to the personal blog for the latest version.`;

  return `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<meta name="robots" content="noindex,nofollow">\n<link rel="canonical" href="${escapeHtml(canonicalUrl)}">\n<title>${escapeHtml(article.title)}</title>\n<meta name="description" content="${escapeHtml(article.description)}">\n<style>\nbody{font-family:Georgia,serif;max-width:760px;margin:40px auto;padding:0 24px;line-height:1.65;color:#222}pre{overflow-x:auto;padding:16px;background:#f6f6f6;border-radius:6px}code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}pre code{white-space:pre}img{max-width:100%;height:auto}blockquote{margin-left:0;padding-left:16px;border-left:3px solid #ddd;color:#555}\n</style>\n</head>\n<body>\n<article>\n<h1>${escapeHtml(article.title)}</h1>\n${renderedBody}\n<hr>\n<blockquote><p>${footer}</p></blockquote>\n</article>\n</body>\n</html>\n`;
}

async function walkMarkdown(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walkMarkdown(absolute));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) files.push(absolute);
  }
  return files.sort();
}

export async function exportMediumImportPages({ articleRoot, outputRoot, requestedSlugs = [] } = {}) {
  const root = path.resolve(articleRoot);
  const output = path.resolve(outputRoot);
  const requested = new Set(requestedSlugs);
  const seen = new Set();
  const exported = [];

  await rm(output, { recursive: true, force: true });

  for (const sourceFile of await walkMarkdown(root)) {
    const slug = path.relative(root, sourceFile)
      .replace(/\.md$/iu, "")
      .split(path.sep)
      .join("/");
    if (requested.size > 0 && !requested.has(slug)) continue;
    seen.add(slug);

    const article = parseArticle(await readFile(sourceFile, "utf8"), sourceFile);
    if (article.status !== "published") continue;

    const targetDir = path.join(output, ...slug.split("/"));
    const targetFile = path.join(targetDir, "index.html");
    await mkdir(targetDir, { recursive: true });
    await writeFile(targetFile, buildMediumImportHtml(article, { slug }), "utf8");
    exported.push({
      slug,
      source: path.relative(process.cwd(), sourceFile).split(path.sep).join("/"),
      output: path.relative(process.cwd(), targetFile).split(path.sep).join("/"),
      canonicalUrl: buildCanonicalUrl(slug),
      importUrl: buildMediumImportUrl(slug),
    });
  }

  const missing = [...requested].filter((slug) => !seen.has(slug));
  if (missing.length > 0) throw new Error(`Unknown English article slug: ${missing.join(", ")}`);
  return exported;
}

export function parseArguments(argv) {
  const requestedSlugs = [];
  let help = false;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--article") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--article requires a value");
      requestedSlugs.push(value);
      index += 1;
    } else if (argument === "--help" || argument === "-h") {
      help = true;
    } else {
      throw new Error(`Unknown option: ${argument}`);
    }
  }
  return { requestedSlugs, help };
}

function printHelp() {
  console.log("Usage: npm run medium:export -- [--article <slug>]\n\nGenerate minimal, noindex HTML pages for Medium's URL importer.");
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const repositoryRoot = path.resolve(scriptDir, "..");
  const exported = await exportMediumImportPages({
    articleRoot: path.join(repositoryRoot, DEFAULT_ARTICLE_ROOT),
    outputRoot: path.join(repositoryRoot, DEFAULT_OUTPUT_ROOT),
    requestedSlugs: options.requestedSlugs,
  });

  for (const item of exported) {
    console.log(JSON.stringify({
      operation: "medium-export",
      status: "generated",
      slug: item.slug,
      importUrl: item.importUrl,
      canonicalUrl: item.canonicalUrl,
    }));
  }
  console.log(JSON.stringify({ operation: "medium-export", status: "completed", total: exported.length }));
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  main().catch((error) => {
    console.error(JSON.stringify({
      operation: "medium-export",
      status: "failed",
      exception: { name: error.name, message: error.message, stack: error.stack },
    }));
    process.exitCode = 1;
  });
}
