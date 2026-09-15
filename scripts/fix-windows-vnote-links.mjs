import { existsSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDir, "..");
const notesRoot = path.join(repositoryRoot, "src", "content", "notes");
const sourceRoot = path.resolve(
  process.env.VNOTE_SOURCE ?? "C:\\software\\Others\\Sync\\Notes\\vnotes",
);

export function isLocalFileTarget(target) {
  const trimmed = target.trim();
  return /^file:\/\//i.test(trimmed) || /^[A-Za-z]:[\\/]/.test(trimmed);
}

export function findInlineMarkdownLinks(line) {
  const links = [];
  let cursor = 0;

  while (cursor < line.length) {
    const openBracket = line.indexOf("[", cursor);
    if (openBracket < 0) break;
    const isImage = openBracket > 0 && line[openBracket - 1] === "!";
    const start = isImage ? openBracket - 1 : openBracket;
    const closeBracket = line.indexOf("](", openBracket + 1);
    if (closeBracket < 0) break;

    let index = closeBracket + 2;
    let depth = 1;
    let escaped = false;
    while (index < line.length && depth > 0) {
      const char = line[index];
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "(") {
        depth += 1;
      } else if (char === ")") {
        depth -= 1;
      }
      index += 1;
    }

    if (depth !== 0) {
      cursor = closeBracket + 2;
      continue;
    }

    const end = index;
    links.push({
      start,
      end,
      isImage,
      label: line.slice(openBracket + 1, closeBracket),
      target: line.slice(closeBracket + 2, end - 1),
      raw: line.slice(start, end),
    });
    cursor = end;
  }

  return links;
}

export function legacyImportedLocalLink(raw, label, isImage) {
  return raw.replace(/(!?\[[^\]]*\]\()([^)]+)(\))/g, (match, prefix, rawTarget) => {
    const trimmed = rawTarget.trim();
    if (/^(?:https?:)?\/\//i.test(trimmed) || /^(?:mailto:|data:|#)/i.test(trimmed)) {
      return match;
    }
    return isImage ? label || "图片未迁移" : label;
  });
}

export function repairGeneratedMarkdown(generatedMarkdown, sourceMarkdown) {
  let repaired = generatedMarkdown;
  let repairs = 0;
  const remainingLegacyFragments = [];
  let inFence = false;

  for (const line of sourceMarkdown.split(/\r?\n/)) {
    if (/^\s*(?:```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    for (const link of findInlineMarkdownLinks(line)) {
      if (!isLocalFileTarget(link.target)) continue;
      const desired = link.isImage ? link.label || "图片未迁移" : link.label;
      const legacy = legacyImportedLocalLink(link.raw, link.label, link.isImage);

      if (legacy !== desired && repaired.includes(legacy)) {
        repaired = repaired.replaceAll(legacy, desired);
        repairs += 1;
      }
      if (repaired.includes(link.raw)) {
        repaired = repaired.replaceAll(link.raw, desired);
        repairs += 1;
      }
      if (legacy !== desired && repaired.includes(legacy)) {
        remainingLegacyFragments.push(legacy);
      }
    }
  }

  return { markdown: repaired, repairs, remainingLegacyFragments };
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

function frontmatterValue(markdown, key) {
  return markdown.match(new RegExp(`^${key}:\\s*["']?([^"'\\n]+)["']?\\s*$`, "m"))?.[1];
}

export async function repairPublishedWindowsLinks({ source = sourceRoot, notes = notesRoot } = {}) {
  if (!existsSync(source)) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      severity: "info",
      operation: "fix-windows-vnote-links",
      status: "skipped",
      reason: "vnote-source-not-found",
      source,
    }));
    return { filesChanged: 0, repairs: 0 };
  }

  let filesChanged = 0;
  let repairs = 0;
  const unresolved = [];

  for (const noteFile of (await walk(notes)).filter((file) => file.endsWith(".md"))) {
    const generated = await readFile(noteFile, "utf8");
    const sourcePath = frontmatterValue(generated, "sourcePath");
    if (!sourcePath) continue;
    const sourceFile = path.resolve(source, sourcePath);
    if (!existsSync(sourceFile)) continue;

    const original = await readFile(sourceFile, "utf8");
    const result = repairGeneratedMarkdown(generated, original);
    if (result.remainingLegacyFragments.length > 0) {
      unresolved.push({ sourcePath, fragments: result.remainingLegacyFragments });
      continue;
    }
    if (result.markdown !== generated) {
      await writeFile(noteFile, result.markdown, "utf8");
      filesChanged += 1;
      repairs += result.repairs;
    }
  }

  if (unresolved.length > 0) {
    throw new Error(`Unresolved Windows/VNote local-link fragments: ${JSON.stringify(unresolved)}`);
  }

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    severity: "info",
    operation: "fix-windows-vnote-links",
    status: "completed",
    filesChanged,
    repairs,
  }));
  return { filesChanged, repairs };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await repairPublishedWindowsLinks();
}
