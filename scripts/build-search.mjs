import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const startedAt = Date.now();
const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const outputPath = path.join(dist, "pagefind");
const pagefindModule = fileURLToPath(import.meta.resolve("pagefind"));
const pagefindRunner = path.join(path.dirname(pagefindModule), "runner", "bin.cjs");

function log(severity, status, details = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    severity,
    operation: "build-search",
    status,
    ...details,
  }));
}

async function hasSearchContent(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory() && await hasSearchContent(file)) return true;
    if (entry.isFile() && entry.name.endsWith(".html") && /<[^>]+\bdata-pagefind-body(?:\s|>)/.test(await readFile(file, "utf8"))) return true;
  }
  return false;
}

async function writeCacheBustedWasmEntry() {
  const entryPath = path.join(outputPath, "pagefind-entry.json");
  const entry = JSON.parse(await readFile(entryPath, "utf8"));
  const sourcePath = path.join(outputPath, "wasm.unknown.pagefind");
  const wasm = await readFile(sourcePath);
  if (wasm.length === 0) throw new Error("Pagefind generated an empty WebAssembly bundle");

  const wasmId = createHash("sha256").update(wasm).digest("hex").slice(0, 12);
  const targetPath = path.join(outputPath, `wasm.${wasmId}.pagefind`);
  await rm(targetPath, { force: true });
  await rename(sourcePath, targetPath);
  for (const language of Object.values(entry.languages ?? {})) language.wasm = wasmId;
  await writeFile(entryPath, JSON.stringify(entry));
  return { wasmFile: path.basename(targetPath), wasmBytes: wasm.length };
}

try {
  if (await hasSearchContent(dist)) {
    log("info", "started", { dist });
    await execFileAsync(
      process.execPath,
      [pagefindRunner, "--site", dist, "--output-path", outputPath, "--force-language", "zh-cn", "--silent"],
      { cwd: repositoryRoot, timeout: 120_000, windowsHide: true },
    );
    const wasm = await writeCacheBustedWasmEntry();
    log("info", "completed", { ...wasm, durationMs: Date.now() - startedAt });
  } else {
    log("info", "empty", { indexedPages: 0, durationMs: Date.now() - startedAt });
  }
} catch (error) {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    severity: "error",
    operation: "build-search",
    status: "failed",
    error: error instanceof Error ? error.message : String(error),
    durationMs: Date.now() - startedAt,
  }));
  process.exitCode = 1;
}
