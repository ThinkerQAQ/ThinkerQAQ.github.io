import { createHash } from "node:crypto";
import { access, lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const SOURCE_ROOT = path.join(ROOT, "src", "diagrams", "drawio");
export const OUTPUT_ROOT = path.join(ROOT, "public", "diagrams", "drawio");
export const MANIFEST = path.join(ROOT, "src", "data", "drawio-manifest.json");
export const VERSION = 1;

export function log(operation, status, details = {}, severity = "info") {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    severity,
    operation,
    status,
    ...details,
  }));
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function toPosix(value) {
  return value.split(path.sep).join("/");
}

export function outputRelativePath(sourceRelativePath) {
  const normalized = sourceRelativePath.replaceAll("\\", "/");
  if (
    normalized.startsWith("/")
    || normalized.split("/").includes("..")
    || !normalized.toLowerCase().endsWith(".drawio")
  ) {
    throw new Error(`Unsafe draw.io source path: ${sourceRelativePath}`);
  }
  return normalized.replace(/\.drawio$/i, ".svg");
}

export function diagramUrl(outputRelative) {
  return `/diagrams/drawio/${outputRelative.split("/").map(encodeURIComponent).join("/")}`;
}

export function resolveInside(root, relative) {
  const resolvedRoot = path.resolve(root);
  const target = path.resolve(resolvedRoot, relative);
  if (target !== resolvedRoot && !target.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`Path escapes draw.io directory: ${relative}`);
  }
  return target;
}

export function validateSvg(source) {
  const svg = source.toString("utf8").trim();
  if (!/<svg(?:\s|>)/i.test(svg) || !/<\/svg>\s*$/i.test(svg)) {
    throw new Error("draw.io did not produce a complete SVG document");
  }
  const forbidden = [
    [/<script(?:\s|>)/i, "script element"],
    [/\son[a-z]+\s*=/i, "event handler"],
    [/javascript\s*:/i, "javascript URL"],
    [/<(?:image|use)\b[^>]*(?:href|xlink:href)\s*=\s*["'](?:https?:)?\/\//i, "external image"],
    [/url\(\s*["']?(?:https?:)?\/\//i, "external stylesheet asset"],
  ];
  for (const [pattern, label] of forbidden) {
    if (pattern.test(svg)) throw new Error(`Unsafe draw.io SVG contains ${label}`);
  }
  return `${svg}\n`;
}

export async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function walk(directory, relativeDirectory = "") {
  if (!(await exists(directory))) return [];
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = relativeDirectory ? path.join(relativeDirectory, entry.name) : entry.name;
    const absolute = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlinks are not allowed in draw.io sources: ${toPosix(relative)}`);
    if (entry.isDirectory()) files.push(...await walk(absolute, relative));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".drawio")) {
      files.push({ absolute, relative: toPosix(relative) });
    }
  }
  return files;
}

export async function collectSources() {
  return walk(SOURCE_ROOT);
}

export async function readManifest() {
  try {
    const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
    if (manifest.version !== VERSION || !Array.isArray(manifest.diagrams)) {
      throw new Error("Unsupported draw.io manifest format");
    }
    return manifest;
  } catch (error) {
    if (error.code === "ENOENT") return { version: VERSION, diagrams: [] };
    throw error;
  }
}

export async function assertRegularDirectory(directory) {
  if (!(await exists(directory))) return;
  const stats = await lstat(directory);
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw new Error(`Unsafe draw.io directory: ${directory}`);
  }
}
