import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDir, "..");
const notesRoot = path.join(repositoryRoot, "src", "content", "notes");
const mediaRoot = path.join(repositoryRoot, "public", "media", "vnote");
const manifestPath = path.join(repositoryRoot, "src", "data", "content-manifest.json");
const legacySource = process.env.LEGACY_VNOTE_SOURCE;
const expectedGoNotes = 42;

const INTERNAL_HOST_PATTERNS = [
  /(^|\.)woa\.com$/i,
  /(^|\.)oa\.com$/i,
  /^bytedance\.feishu\.cn$/i,
  /^bytedance\.larkoffice\.com$/i,
];

function run(command, args, extraEnv = {}) {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    env: { ...process.env, ...extraEnv },
    encoding: "utf8",
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
  }
}

async function walkMarkdown(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walkMarkdown(absolute)));
    else if (entry.isFile() && path.extname(entry.name).toLowerCase() === ".md") files.push(absolute);
  }
  return files;
}

function isInternalUrl(rawUrl) {
  try {
    const hostname = new URL(rawUrl).hostname;
    return INTERNAL_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
  } catch {
    return false;
  }
}

function sanitizeInternalLinks(markdown) {
  let sanitized = markdown.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/gi,
    (match, label, url) => isInternalUrl(url) ? `${label}（内部链接已移除）` : match,
  );
  sanitized = sanitized.replace(
    /https?:\/\/[^\s)<>"']+/gi,
    (url) => isInternalUrl(url) ? "[内部链接已移除]" : url,
  );
  return sanitized.replaceAll("<INTERNAL_URL>", "[内部链接已移除]");
}

async function sanitizeAndValidateGoNotes(goDirectory) {
  const files = await walkMarkdown(goDirectory);
  if (files.length !== expectedGoNotes) {
    throw new Error(`Expected ${expectedGoNotes} reviewed Go notes, generated ${files.length}`);
  }

  for (const file of files) {
    const original = await readFile(file, "utf8");
    const sanitized = sanitizeInternalLinks(original);
    if (sanitized !== original) await writeFile(file, sanitized, "utf8");

    for (const pattern of [
      /https?:\/\/[^\s)<>"']*woa\.com/i,
      /https?:\/\/[^\s)<>"']*\.oa\.com/i,
      /https?:\/\/bytedance\.feishu\.cn/i,
      /https?:\/\/bytedance\.larkoffice\.com/i,
      /<INTERNAL_URL>/i,
    ]) {
      if (pattern.test(sanitized)) {
        throw new Error(`Internal URL remained after sanitization: ${path.relative(goDirectory, file)}`);
      }
    }
  }
  return files.length;
}

async function main() {
  if (!legacySource) throw new Error("LEGACY_VNOTE_SOURCE is required");

  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "go-note-import-"));
  const stagedGoNotes = path.join(temporaryRoot, "go-notes");
  const stagedGoMedia = path.join(temporaryRoot, "go-media");
  let goEntries = [];

  try {
    run(process.execPath, [path.join(scriptDir, "import-vnotes.mjs")], { VNOTE_SOURCE: legacySource });
    run(process.execPath, [path.join(scriptDir, "apply-note-topics.mjs")]);

    const generatedGoRoot = path.join(notesRoot, "go");
    const noteCount = await sanitizeAndValidateGoNotes(generatedGoRoot);
    await cp(generatedGoRoot, stagedGoNotes, { recursive: true });

    const generatedGoMedia = path.join(mediaRoot, "go");
    try {
      await cp(generatedGoMedia, stagedGoMedia, { recursive: true });
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }

    const generatedManifest = JSON.parse(await readFile(manifestPath, "utf8"));
    goEntries = (generatedManifest.entries ?? []).filter((entry) => entry.importId === "go");
    if (goEntries.length !== expectedGoNotes) {
      throw new Error(`Expected ${expectedGoNotes} Go manifest entries, generated ${goEntries.length}`);
    }

    await rm(notesRoot, { recursive: true, force: true });
    await rm(mediaRoot, { recursive: true, force: true });
    run("git", ["restore", "--source=HEAD", "--", "src/content/notes", "public/media/vnote", "src/data/content-manifest.json"]);

    await mkdir(notesRoot, { recursive: true });
    await cp(stagedGoNotes, path.join(notesRoot, "go"), { recursive: true });
    try {
      await mkdir(mediaRoot, { recursive: true });
      await cp(stagedGoMedia, path.join(mediaRoot, "go"), { recursive: true });
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }

    const currentManifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const entries = (currentManifest.entries ?? [])
      .filter((entry) => entry.importId !== "go")
      .concat(goEntries)
      .sort((left, right) => left.sourcePath.localeCompare(right.sourcePath, "zh-CN"));
    await writeFile(
      manifestPath,
      `${JSON.stringify({ generatedAt: new Date().toISOString(), entries }, null, 2)}\n`,
      "utf8",
    );

    console.log(JSON.stringify({
      operation: "import-go-from-legacy",
      status: "completed",
      importedNotes: noteCount,
      manifestEntries: goEntries.length,
    }));
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
