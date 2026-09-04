import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CATEGORY_LABELS,
  IMPORT_ENABLED,
  FEATURED_PATHS,
  NEVER_PUBLISH,
  PROMOTED_ARTICLES,
  PUBLIC_NOTEBOOKS,
} from "./content-policy.mjs";

const startedAt = Date.now();
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDir, "..");
const sourceRoot = path.resolve(
  process.env.VNOTE_SOURCE ?? "C:\\software\\Others\\Sync\\Notes\\vnotes",
);
const outputRoot = path.resolve(repositoryRoot, "src", "content", "notes");
const mediaRoot = path.resolve(repositoryRoot, "public", "media");
const manifestPath = path.resolve(
  repositoryRoot,
  "src",
  "data",
  "content-manifest.json",
);

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"]);
const PUBLIC_NOTEBOOK_SET = new Set(PUBLIC_NOTEBOOKS);
const PUBLIC_SOURCE_FILES = new Set();
const PROMOTED_BY_SOURCE = new Map(
  PROMOTED_ARTICLES.map((article) => [article.sourcePath, article]),
);
let sanitizedPrivateLinks = 0;
let sanitizedBrokenLinks = 0;

function log(severity, operation, status, details = {}) {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      severity,
      operation,
      status,
      ...details,
    }),
  );
}

function assertGeneratedPath(target, expectedSuffix) {
  const relative = path.relative(repositoryRoot, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write outside repository: ${target}`);
  }
  if (!target.replaceAll("\\", "/").endsWith(expectedSuffix)) {
    throw new Error(`Unexpected generated path: ${target}`);
  }
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function isPublicRelativePath(relativePath) {
  const normalized = toPosix(relativePath);
  return !normalized.startsWith("../") && PUBLIC_NOTEBOOK_SET.has(normalized.split("/")[0]);
}

function isPublishableTarget(relativePath) {
  if (!isPublicRelativePath(relativePath)) {
    sanitizedPrivateLinks += 1;
    return false;
  }
  if (!PUBLIC_SOURCE_FILES.has(toPosix(relativePath))) {
    sanitizedBrokenLinks += 1;
    return false;
  }
  return true;
}

function yamlString(value) {
  return JSON.stringify(value);
}

function routeFor(relativePath) {
  const withoutExtension = relativePath.replace(/\.md$/i, "");
  return `/notes/${toPosix(withoutExtension)}/`;
}

function plainText(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[>*_`~|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function descriptionFor(markdown, title) {
  const text = plainText(markdown);
  const withoutRepeatedTitle = text.startsWith(title)
    ? text.slice(title.length).trim()
    : text;
  return (withoutRepeatedTitle || `${title}的技术学习笔记`).slice(0, 150);
}

function localTargetParts(rawTarget) {
  const hashIndex = rawTarget.indexOf("#");
  const target = hashIndex >= 0 ? rawTarget.slice(0, hashIndex) : rawTarget;
  const hash = hashIndex >= 0 ? rawTarget.slice(hashIndex) : "";
  return { target: decodeURIComponent(target), hash };
}

function transformInlineMarkdown(line, sourceFile) {
  let result = line.replace(
    /!\[([^\]]*)\]\(([^)\s]+)\s+=\d+(?:x\d*)?\)/g,
    "![$1]($2)",
  );

  result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, rawTarget) => {
    const trimmed = rawTarget.trim();
    if (/^(?:https?:)?\/\//i.test(trimmed) || trimmed.startsWith("data:")) {
      return match;
    }
    const { target } = localTargetParts(trimmed);
    const absoluteTarget = path.resolve(path.dirname(sourceFile), target);
    const relativeTarget = toPosix(path.relative(sourceRoot, absoluteTarget));
    if (!isPublishableTarget(relativeTarget)) return alt || "图片未公开";
    return `![${alt}](/media/${encodeURI(relativeTarget)})`;
  });

  result = result.replace(/(?<!!)\[([^\]]+)\]\(([^)]+)\)/g, (match, label, rawTarget) => {
    const trimmed = rawTarget.trim();
    if (/^(?:https?:)?\/\//i.test(trimmed) || trimmed.startsWith("mailto:")) {
      return match;
    }

    const { target, hash } = localTargetParts(trimmed.replace(/^#!/, ""));
    if (/\.md$/i.test(target)) {
      const absoluteTarget = path.resolve(path.dirname(sourceFile), target);
      const relativeTarget = toPosix(path.relative(sourceRoot, absoluteTarget));
      if (!isPublishableTarget(relativeTarget)) return label;
      return `[${label}](${encodeURI(routeFor(relativeTarget))}${hash})`;
    }

    const absoluteTarget = path.resolve(path.dirname(sourceFile), target);
    const relativeTarget = toPosix(path.relative(sourceRoot, absoluteTarget));
    if (!isPublishableTarget(relativeTarget) || !IMAGE_EXTENSIONS.has(path.extname(relativeTarget).toLowerCase())) {
      return label;
    }
    return `[${label}](/media/${encodeURI(relativeTarget)}${hash})`;
  });

  return result;
}

function transformMarkdown(markdown, sourceFile) {
  const lines = markdown.replace(/^\uFEFF/, "").replaceAll("\r\n", "\n").split("\n");
  let inFence = false;

  return lines
    .map((line) => {
      if (/^\s*```/.test(line)) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;
      if (/^\s*\[toc\]\s*$/i.test(line)) return "";
      return transformInlineMarkdown(line, sourceFile);
    })
    .join("\n")
    .trim();
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolute)));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

async function main() {
  if (!IMPORT_ENABLED) {
    log("info", "import-vnotes", "disabled", { message: "Content import is disabled after the site reset. No source files were read or copied." });
    return;
  }
  log("info", "import-vnotes", "started", {
    source: sourceRoot,
    publicNotebookCount: PUBLIC_NOTEBOOKS.length,
  });

  const sourceEntries = await readdir(sourceRoot, { withFileTypes: true });
  const sourceNames = new Set(sourceEntries.map((entry) => entry.name));

  for (const blocked of NEVER_PUBLISH) {
    if (sourceNames.has(blocked)) {
      log("info", "privacy-policy", "excluded", { notebook: blocked });
    }
  }

  const missingNotebooks = PUBLIC_NOTEBOOKS.filter((name) => !sourceNames.has(name));
  if (missingNotebooks.length > 0) {
    log("warn", "source-validation", "missing-notebooks", {
      notebooks: missingNotebooks,
    });
  }

  assertGeneratedPath(outputRoot, "/src/content/notes");
  assertGeneratedPath(mediaRoot, "/public/media");
  await rm(outputRoot, { recursive: true, force: true });
  await rm(mediaRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });
  await mkdir(mediaRoot, { recursive: true });
  await mkdir(path.dirname(manifestPath), { recursive: true });

  const manifest = [];
  const notebookFiles = new Map();
  let importedNotes = 0;
  let copiedImages = 0;
  let skippedEmpty = 0;

  for (const notebook of PUBLIC_NOTEBOOKS) {
    const notebookRoot = path.join(sourceRoot, notebook);
    if (!sourceNames.has(notebook)) continue;
    const files = await walk(notebookRoot);
    notebookFiles.set(notebook, files);
    for (const sourceFile of files) {
      const extension = path.extname(sourceFile).toLowerCase();
      if (extension === ".md" && (await stat(sourceFile)).size === 0) continue;
      if (extension === ".md" || IMAGE_EXTENSIONS.has(extension)) {
        PUBLIC_SOURCE_FILES.add(toPosix(path.relative(sourceRoot, sourceFile)));
      }
    }
  }

  for (const notebook of PUBLIC_NOTEBOOKS) {
    const files = notebookFiles.get(notebook);
    if (!files) continue;
    for (const sourceFile of files) {
      const extension = path.extname(sourceFile).toLowerCase();
      const relativePath = toPosix(path.relative(sourceRoot, sourceFile));

      if (extension === ".md") {
        const raw = await readFile(sourceFile, "utf8");
        const transformed = transformMarkdown(raw, sourceFile);
        if (!transformed.trim()) {
          skippedEmpty += 1;
          continue;
        }

        const fileInfo = await stat(sourceFile);
        const title = path.basename(sourceFile, extension);
        const category = relativePath.split("/")[0];
        const pathTags = relativePath
          .split("/")
          .slice(0, -1)
          .filter((part) => !["attachments", "_v_images"].includes(part));
        const tags = [...new Set([CATEGORY_LABELS[category] ?? category, ...pathTags.slice(1, 4)])];
        const promotedArticle = PROMOTED_BY_SOURCE.get(relativePath);
        const canonicalPath = promotedArticle
          ? `/articles/${promotedArticle.slug}/`
          : undefined;
        const indexable = plainText(transformed).length >= 300 && !promotedArticle;
        const route = routeFor(relativePath);
        const featured = FEATURED_PATHS.has(relativePath);

        const frontmatter = [
          "---",
          `title: ${yamlString(title)}`,
          `description: ${yamlString(descriptionFor(transformed, title))}`,
          `sourcePath: ${yamlString(relativePath)}`,
          `category: ${yamlString(category)}`,
          `categoryLabel: ${yamlString(CATEGORY_LABELS[category] ?? category)}`,
          `tags: ${JSON.stringify(tags)}`,
          `updatedAt: ${yamlString(fileInfo.mtime.toISOString())}`,
          `language: "zh"`,
          `featured: ${featured}`,
          `indexable: ${indexable}`,
          ...(canonicalPath ? [`canonicalPath: ${yamlString(canonicalPath)}`] : []),
          "---",
          "",
        ].join("\n");

        const outputFile = path.join(outputRoot, relativePath);
        await mkdir(path.dirname(outputFile), { recursive: true });
        await writeFile(outputFile, `${frontmatter}${transformed}\n`, "utf8");

        manifest.push({
          sourcePath: relativePath,
          route,
          title,
          category,
          featured,
          indexable,
          canonicalPath,
        });
        importedNotes += 1;
      } else if (IMAGE_EXTENSIONS.has(extension)) {
        const outputFile = path.join(mediaRoot, relativePath);
        await mkdir(path.dirname(outputFile), { recursive: true });
        await copyFile(sourceFile, outputFile);
        copiedImages += 1;
      }
    }
  }

  manifest.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath, "zh-CN"));
  await writeFile(
    manifestPath,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), entries: manifest }, null, 2)}\n`,
    "utf8",
  );

  log("info", "import-vnotes", "completed", {
    importedNotes,
    copiedImages,
    skippedEmpty,
    sanitizedPrivateLinks,
    sanitizedBrokenLinks,
    indexableNotes: manifest.filter((entry) => entry.indexable).length,
    promotedCanonicalCount: manifest.filter((entry) => entry.canonicalPath).length,
    durationMs: Date.now() - startedAt,
  });
}

main().catch((error) => {
  log("error", "import-vnotes", "failed", {
    durationMs: Date.now() - startedAt,
    error: error instanceof Error ? error.message : String(error),
  });
  process.exitCode = 1;
});
