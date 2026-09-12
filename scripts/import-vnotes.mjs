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
  CATEGORY_SLUGS,
  EXCLUDED_NOTE_PATHS,
  IMPORT_ENABLED,
  NEVER_PUBLISH,
  PUBLIC_NOTEBOOKS,
  ROOT_TOPIC_LABELS,
} from "./content-policy.mjs";

const startedAt = Date.now();
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDir, "..");
const sourceRoot = path.resolve(
  process.env.VNOTE_SOURCE ?? "C:\\software\\Others\\Sync\\Notes\\vnotes",
);
const notesRoot = path.join(repositoryRoot, "src", "content", "notes");
const mediaRoot = path.join(repositoryRoot, "public", "media", "vnote");
const manifestPath = path.join(repositoryRoot, "src", "data", "content-manifest.json");

const IMPORTS = PUBLIC_NOTEBOOKS.map((sourcePath) => {
  const category = CATEGORY_SLUGS[sourcePath] ?? sourcePath.toLowerCase().replaceAll("/", "-");
  return {
    sourcePath,
    importId: category,
    outputPath: category,
    category,
    categoryLabel: CATEGORY_LABELS[sourcePath] ?? sourcePath,
    rootTopicLabel: ROOT_TOPIC_LABELS[sourcePath] ?? "概览",
    tags: sourcePath.split("/"),
  };
});
const ASSET_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".txt", ".pdf", ".zip", ".7z",
]);
const BLOCKED_PATH_SEGMENTS = new Set([
  ...NEVER_PUBLISH,
  "internal",
  "private",
  "privacy",
  "secret",
  "secrets",
  "credential",
  "credentials",
]);
const SENSITIVE_CONTENT_PATTERNS = [
  { reason: "private-key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i },
  { reason: "aws-access-key", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  {
    reason: "credential-assignment",
    pattern: /\b(?:password|passwd|pwd|secret|token|access[_-]?key)\s*[:=]\s*["']?[A-Za-z0-9_./+=-]{12,}/i,
  },
];
const REDACTED_CONTENT_PATTERNS = [
  {
    reason: "private-network-address",
    pattern: /\b(?:10\.(?:\d{1,3}\.){2}\d{1,3}|192\.168\.(?:\d{1,3}\.)\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.(?:\d{1,3}\.)\d{1,3})\b/g,
    replacement: "[已脱敏内网地址]",
  },
  {
    reason: "email-address",
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    replacement: "[已脱敏邮箱]",
  },
  {
    reason: "mainland-phone-number",
    pattern: /(?<!\d)1[3-9]\d{9}(?!\d)/g,
    replacement: "[已脱敏手机号]",
  },
  {
    reason: "mainland-id-number",
    pattern: /(?<!\d)\d{17}[\dXx](?!\d)/g,
    replacement: "[已脱敏证件号]",
  },
];

let rewrittenLinks = 0;
let sanitizedLinks = 0;
let removedTocMarkers = 0;

function log(severity, operation, status, details = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    severity,
    operation,
    status,
    durationMs: Date.now() - startedAt,
    ...details,
  }));
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function yamlString(value) {
  return JSON.stringify(value);
}

function isInside(root, target) {
  const relative = path.relative(root, target);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function assertManagedPath(root, target) {
  if (!isInside(root, target)) throw new Error(`Refusing to manage path outside ${root}: ${target}`);
}

function blockedPath(relativePath) {
  return toPosix(relativePath)
    .split("/")
    .some((segment) => BLOCKED_PATH_SEGMENTS.has(segment.toLowerCase()) || BLOCKED_PATH_SEGMENTS.has(segment));
}

function sensitiveReason(markdown) {
  return SENSITIVE_CONTENT_PATTERNS.find(({ pattern }) => pattern.test(markdown))?.reason;
}

function redactSensitiveContent(markdown) {
  const reasons = [];
  let redacted = markdown;
  for (const { reason, pattern, replacement } of REDACTED_CONTENT_PATTERNS) {
    const next = redacted.replace(pattern, replacement);
    if (next !== redacted) reasons.push(reason);
    redacted = next;
  }
  return { markdown: redacted, reasons };
}

function plainText(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^\s*\[toc\]\s*$/gim, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[>*_`~|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function descriptionFor(markdown, title) {
  const text = plainText(markdown);
  const withoutRepeatedTitle = text.startsWith(title) ? text.slice(title.length).trim() : text;
  return (withoutRepeatedTitle || `${title}的历史学习笔记`).slice(0, 150);
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

async function readVNoteMetadata(sourceDirectory, files) {
  const metadataByFile = new Map();
  for (const metadataFile of files.filter((file) => path.basename(file) === "_vnote.json")) {
    const parsed = JSON.parse(await readFile(metadataFile, "utf8"));
    for (const [order, entry] of (parsed.files ?? []).entries()) {
      const sourceFile = path.resolve(path.dirname(metadataFile), entry.name);
      if (!isInside(sourceDirectory, sourceFile)) continue;
      metadataByFile.set(sourceFile.toLowerCase(), {
        createdAt: entry.created_time,
        updatedAt: entry.modified_time,
        order,
      });
    }
  }
  return metadataByFile;
}

async function readTopicNumbers(sourceDirectory, hasRootNotes) {
  const metadata = JSON.parse(await readFile(path.join(sourceDirectory, "_vnote.json"), "utf8"));
  const topics = (metadata.sub_directories ?? []).map(({ name }) => name);
  const numbers = new Map();
  let nextNumber = topics.reduce((maximum, topic) => {
    const match = topic.match(/^(\d+)\./);
    return match ? Math.max(maximum, Number(match[1])) : maximum;
  }, 0);

  if (hasRootNotes) numbers.set("__root", ++nextNumber);

  for (const topic of topics) {
    const match = topic.match(/^(\d+)\./);
    numbers.set(topic, match ? Number(match[1]) : ++nextNumber);
  }
  return numbers;
}

function splitTarget(rawTarget) {
  const trimmed = rawTarget.trim();
  const hashIndex = trimmed.indexOf("#");
  const target = hashIndex >= 0 ? trimmed.slice(0, hashIndex) : trimmed;
  const hash = hashIndex >= 0 ? trimmed.slice(hashIndex) : "";
  try {
    return { target: decodeURIComponent(target), hash };
  } catch {
    return { target, hash };
  }
}

function transformMarkdown(markdown, sourceFile, importedFiles, copiedAssets, importedNoteRoot, publicNoteRoot, publicMediaRoot) {
  let inFence = false;
  const parts = markdown.split(/(\r\n|\n)/);
  return parts.map((part, index) => {
    if (index % 2 === 1) return part;
    if (/^\s*(?:```|~~~)/.test(part)) {
      inFence = !inFence;
      return part;
    }
    if (inFence) return part;
    if (/^\s*\[toc\]\s*$/i.test(part)) {
      removedTocMarkers += 1;
      return "";
    }

    return part.replace(/(!?\[[^\]]*\]\()([^)]+)(\))/g, (match, prefix, rawTarget, suffix) => {
      const trimmed = rawTarget.trim();
      if (/^(?:https?:)?\/\//i.test(trimmed) || /^(?:mailto:|data:|#)/i.test(trimmed)) return match;

      const { target, hash } = splitTarget(trimmed.replace(/^#!/, ""));
      const absoluteTarget = path.resolve(path.dirname(sourceFile), target);
      const targetKey = absoluteTarget.toLowerCase();
      if (importedFiles.has(targetKey)) {
        const relativeTarget = toPosix(path.relative(importedNoteRoot, absoluteTarget)).replace(/\.md$/i, "");
        rewrittenLinks += 1;
        return `${prefix}${publicNoteRoot}/${encodeURI(relativeTarget)}/${hash}${suffix}`;
      }
      if (copiedAssets.has(targetKey)) {
        const relativeTarget = toPosix(path.relative(importedNoteRoot, absoluteTarget));
        rewrittenLinks += 1;
        return `${prefix}${publicMediaRoot}/${encodeURI(relativeTarget)}${hash}${suffix}`;
      }

      sanitizedLinks += 1;
      const label = prefix.slice(prefix.indexOf("[") + 1, -2);
      return prefix.startsWith("!") ? label || "图片未迁移" : label;
    });
  }).join("");
}

function linkedAssets(markdown, sourceFile, candidateAssets) {
  const assets = new Set();
  for (const match of markdown.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    const trimmed = match[1].trim();
    if (/^(?:https?:)?\/\//i.test(trimmed) || /^(?:mailto:|data:|#)/i.test(trimmed)) continue;
    const { target } = splitTarget(trimmed.replace(/^#!/, ""));
    const absoluteTarget = path.resolve(path.dirname(sourceFile), target).toLowerCase();
    if (candidateAssets.has(absoluteTarget)) assets.add(absoluteTarget);
  }
  return assets;
}

async function readExistingManifest() {
  try {
    return JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return { entries: [] };
    throw error;
  }
}

async function importNotebook(config) {
  const sourceDirectory = path.resolve(sourceRoot, config.sourcePath);
  const outputDirectory = path.resolve(notesRoot, config.outputPath);
  const outputMediaDirectory = path.resolve(mediaRoot, config.outputPath);
  const publicMediaRoot = `/media/vnote/${config.outputPath}`;
  assertManagedPath(notesRoot, outputDirectory);
  assertManagedPath(mediaRoot, outputMediaDirectory);

  const files = (await walk(sourceDirectory)).sort((left, right) => left.localeCompare(right, "zh-CN"));
  const metadataByFile = await readVNoteMetadata(sourceDirectory, files);
  const includedMarkdown = new Map();
  const candidateAssets = new Set();
  const exclusions = [];
  const metadataFallbacks = [];
  const redactions = [];

  for (const sourceFile of files) {
    const relativePath = toPosix(path.relative(sourceDirectory, sourceFile));
    const completeSourcePath = `${config.sourcePath}/${relativePath}`;
    if (EXCLUDED_NOTE_PATHS.has(completeSourcePath)) {
      exclusions.push({ sourcePath: relativePath, reason: "content-review" });
      continue;
    }
    if (blockedPath(relativePath)) {
      exclusions.push({ sourcePath: relativePath, reason: "blocked-path" });
      continue;
    }
    const extension = path.extname(sourceFile).toLowerCase();
    if (extension === ".md") {
      if ((await stat(sourceFile)).size === 0) {
        exclusions.push({ sourcePath: relativePath, reason: "empty-note" });
        continue;
      }
      const raw = await readFile(sourceFile, "utf8");
      const reason = sensitiveReason(raw);
      if (reason) {
        exclusions.push({ sourcePath: relativePath, reason });
        continue;
      }
      const sanitized = redactSensitiveContent(raw);
      includedMarkdown.set(sourceFile.toLowerCase(), sanitized.markdown);
      if (sanitized.reasons.length > 0) {
        redactions.push({ sourcePath: relativePath, reasons: sanitized.reasons });
      }
    } else if (ASSET_EXTENSIONS.has(extension)) {
      candidateAssets.add(sourceFile.toLowerCase());
    }
  }

  const hasRootNotes = [...includedMarkdown.keys()].some(
    (sourceKey) => path.dirname(files.find((file) => file.toLowerCase() === sourceKey)) === sourceDirectory,
  );
  const topicNumbers = await readTopicNumbers(sourceDirectory, hasRootNotes);

  const copiedAssets = new Set();
  for (const [sourceKey, raw] of includedMarkdown) {
    const sourceFile = files.find((file) => file.toLowerCase() === sourceKey);
    for (const asset of linkedAssets(raw, sourceFile, candidateAssets)) copiedAssets.add(asset);
  }

  await rm(outputDirectory, { recursive: true, force: true });
  await rm(outputMediaDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });
  await mkdir(outputMediaDirectory, { recursive: true });

  const orderedMarkdown = [...includedMarkdown.entries()].sort(([leftKey], [rightKey]) => {
    const leftFile = files.find((file) => file.toLowerCase() === leftKey);
    const rightFile = files.find((file) => file.toLowerCase() === rightKey);
    const leftPath = toPosix(path.relative(sourceDirectory, leftFile));
    const rightPath = toPosix(path.relative(sourceDirectory, rightFile));
    const leftTopic = leftPath.includes("/") ? leftPath.split("/")[0] : "__root";
    const rightTopic = rightPath.includes("/") ? rightPath.split("/")[0] : "__root";
    const topicDifference = (topicNumbers.get(leftTopic) ?? Infinity) - (topicNumbers.get(rightTopic) ?? Infinity);
    if (topicDifference !== 0) return topicDifference;

    const topicName = leftTopic === "__root" ? config.rootTopicLabel : leftTopic.replace(/^\d+\./, "");
    const leftTitle = path.basename(leftFile, path.extname(leftFile));
    const rightTitle = path.basename(rightFile, path.extname(rightFile));
    const leftIsOverview = leftTitle.replace(/^\d+\./, "").toLowerCase() === topicName.toLowerCase();
    const rightIsOverview = rightTitle.replace(/^\d+\./, "").toLowerCase() === topicName.toLowerCase();
    if (leftIsOverview !== rightIsOverview) return leftIsOverview ? -1 : 1;

    const depthDifference = leftPath.split("/").length - rightPath.split("/").length;
    if (depthDifference !== 0) return depthDifference;
    const orderDifference = (metadataByFile.get(leftKey)?.order ?? Infinity) - (metadataByFile.get(rightKey)?.order ?? Infinity);
    return orderDifference || leftPath.localeCompare(rightPath, "zh-CN", { numeric: true });
  });

  const entries = [];
  const childIndexes = new Map();
  let order = 0;
  for (const [sourceKey, raw] of orderedMarkdown) {
    const sourceFile = files.find((file) => file.toLowerCase() === sourceKey);
    const relativePath = toPosix(path.relative(sourceDirectory, sourceFile));
    const metadata = metadataByFile.get(sourceKey);
    const sourceStat = metadata?.updatedAt ? undefined : await stat(sourceFile);
    const createdAt = metadata?.createdAt;
    const updatedAt = metadata?.updatedAt ?? sourceStat.mtime.toISOString();
    if (!metadata?.updatedAt) metadataFallbacks.push(relativePath);

    const transformed = transformMarkdown(
      raw,
      sourceFile,
      includedMarkdown,
      copiedAssets,
      sourceDirectory,
      `/notes/${config.outputPath}`,
      publicMediaRoot,
    );
    const originalTitle = path.basename(sourceFile, path.extname(sourceFile));
    const topic = relativePath.includes("/") ? relativePath.split("/")[0] : "__root";
    const topicName = topic === "__root" ? config.rootTopicLabel : topic.replace(/^\d+\./, "");
    const topicNumber = topicNumbers.get(topic);
    if (!topicNumber) throw new Error(`Missing topic number for ${config.sourcePath}/${relativePath}`);
    const topicLabel = `${topicNumber}.${topicName}`;
    const isOverview = topic !== "__root"
      && originalTitle.replace(/^\d+\./, "").toLowerCase() === topicName.toLowerCase();
    const childIndex = isOverview ? undefined : (childIndexes.get(topic) ?? 0) + 1;
    if (childIndex) childIndexes.set(topic, childIndex);
    const title = isOverview ? topicLabel : `${topicNumber}.${childIndex} ${originalTitle}`;
    const outputFile = path.join(outputDirectory, relativePath);
    const route = `/notes/${config.outputPath}/${toPosix(relativePath).replace(/\.md$/i, "")}/`;
    const frontmatter = [
      "---",
      `title: ${yamlString(title)}`,
      `description: ${yamlString(descriptionFor(raw, originalTitle))}`,
      `sourcePath: ${yamlString(`${config.sourcePath}/${relativePath}`)}`,
      `category: ${yamlString(config.category)}`,
      `categoryLabel: ${yamlString(config.categoryLabel)}`,
      `topic: ${yamlString(topic)}`,
      `topicLabel: ${yamlString(topicLabel)}`,
      `order: ${++order}`,
      `tags: ${JSON.stringify(config.tags)}`,
      ...(createdAt ? [`createdAt: ${yamlString(createdAt)}`] : []),
      `updatedAt: ${yamlString(updatedAt)}`,
      `status: "historical"`,
      `language: "zh"`,
      `featured: false`,
      `indexable: true`,
      "---",
      "",
    ].join("\n");

    await mkdir(path.dirname(outputFile), { recursive: true });
    await writeFile(outputFile, `${frontmatter}${transformed}`, "utf8");
    entries.push({
      importId: config.importId,
      sourcePath: `${config.sourcePath}/${relativePath}`,
      route,
      title,
      category: config.category,
      topic,
      order,
      status: "historical",
      createdAt,
      updatedAt,
      featured: false,
      indexable: true,
    });
  }

  for (const sourceKey of copiedAssets) {
    const sourceFile = files.find((file) => file.toLowerCase() === sourceKey);
    const relativePath = path.relative(sourceDirectory, sourceFile);
    const outputFile = path.join(outputMediaDirectory, relativePath);
    await mkdir(path.dirname(outputFile), { recursive: true });
    await copyFile(sourceFile, outputFile);
  }

  log("info", "import-vnotes", "notebook-completed", {
    importId: config.importId,
    importedNotes: entries.length,
    copiedAssets: copiedAssets.size,
    exclusions,
    metadataFallbacks,
    redactions,
  });
  return entries;
}

async function main() {
  if (!IMPORT_ENABLED) {
    log("info", "import-vnotes", "disabled");
    return;
  }

  log("info", "import-vnotes", "started", {
    sourceRoot,
    imports: IMPORTS.map(({ sourcePath, importId }) => ({ sourcePath, importId })),
  });

  const existingManifest = await readExistingManifest();
  const managedImportIds = new Set(IMPORTS.map(({ importId }) => importId));
  const entries = (existingManifest.entries ?? []).filter((entry) => !managedImportIds.has(entry.importId));
  for (const config of IMPORTS) entries.push(...(await importNotebook(config)));
  entries.sort((left, right) => left.sourcePath.localeCompare(right.sourcePath, "zh-CN"));

  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(
    manifestPath,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), entries }, null, 2)}\n`,
    "utf8",
  );

  log("info", "import-vnotes", "completed", {
    importedNotes: entries.filter((entry) => managedImportIds.has(entry.importId)).length,
    rewrittenLinks,
    sanitizedLinks,
    removedTocMarkers,
  });
}

main().catch((error) => {
  log("error", "import-vnotes", "failed", {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exitCode = 1;
});
