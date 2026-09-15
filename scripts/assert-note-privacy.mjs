import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { PUBLIC_NOTEBOOKS } from "./content-policy.mjs";
import {
  autoImportPrivacyReason,
  neverPublishSourceReason,
  reviewRequiredSourceReason,
  semanticPrivacyReason,
} from "./note-privacy-policy.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRepositoryRoot = path.resolve(scriptDir, "..");

async function walkMarkdown(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }

  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walkMarkdown(absolute)));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) files.push(absolute);
  }
  return files;
}

function frontmatterScalar(markdown, key) {
  const frontmatter = markdown.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
  if (!frontmatter) return undefined;
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = frontmatter.match(new RegExp(`^${escapedKey}:\\s*(.+?)\\s*$`, "m"));
  if (!match) return undefined;
  const raw = match[1].trim();
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }
  return raw;
}

export async function auditPublicNotePrivacy(repositoryRoot = defaultRepositoryRoot) {
  const violations = [];

  for (const sourceRoot of PUBLIC_NOTEBOOKS) {
    const reason = autoImportPrivacyReason(sourceRoot);
    if (reason) {
      violations.push({
        kind: "auto-import",
        path: sourceRoot,
        reason,
      });
    }
  }

  const contentRoots = [
    path.join(repositoryRoot, "src", "content", "notes"),
    path.join(repositoryRoot, "src", "content", "note-translations"),
  ];

  for (const contentRoot of contentRoots) {
    for (const file of await walkMarkdown(contentRoot)) {
      const markdown = await readFile(file, "utf8");
      const relativeFile = path.relative(repositoryRoot, file).split(path.sep).join("/");
      const sourcePath = frontmatterScalar(markdown, "sourcePath");

      if (sourcePath) {
        const neverPublish = neverPublishSourceReason(sourcePath);
        if (neverPublish) {
          violations.push({
            kind: "source-path",
            path: relativeFile,
            sourcePath,
            reason: neverPublish,
          });
        }

        const reviewRequired = reviewRequiredSourceReason(sourcePath);
        if (reviewRequired) {
          violations.push({
            kind: "privacy-review",
            path: relativeFile,
            sourcePath,
            reason: reviewRequired,
          });
        }
      }

      const semanticReason = semanticPrivacyReason(markdown);
      if (semanticReason) {
        violations.push({
          kind: "semantic-content",
          path: relativeFile,
          sourcePath,
          reason: semanticReason,
        });
      }
    }
  }

  return violations;
}

function formatViolation(violation) {
  const source = violation.sourcePath ? ` sourcePath=${JSON.stringify(violation.sourcePath)}` : "";
  return `- [${violation.kind}] ${violation.path}: ${violation.reason}${source}`;
}

async function main() {
  const violations = await auditPublicNotePrivacy();
  if (violations.length > 0) {
    console.error("Note privacy policy violations:\n" + violations.map(formatViolation).join("\n"));
    process.exitCode = 1;
    return;
  }
  console.log("Note privacy policy: OK");
}

const invokedAsScript = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedAsScript) await main();
