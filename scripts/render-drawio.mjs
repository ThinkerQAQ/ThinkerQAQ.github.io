import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  MANIFEST,
  OUTPUT_ROOT,
  SOURCE_ROOT,
  VERSION,
  assertRegularDirectory,
  collectSources,
  diagramUrl,
  exists,
  log,
  outputRelativePath,
  readManifest,
  resolveInside,
  sha256,
  validateSvg,
} from "./drawio/core.mjs";
import { exportSvg, findDrawIoExecutable } from "./drawio/runtime.mjs";

async function outputState(output) {
  let bytes;
  try {
    bytes = await readFile(output);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
  try {
    const svg = validateSvg(bytes);
    return { svg, outputHash: sha256(svg) };
  } catch {
    return null;
  }
}

export async function renderAll({ check = process.env.CI === "true" } = {}) {
  const startedAt = Date.now();
  const sources = await collectSources();
  const previous = await readManifest();
  const previousBySource = new Map(previous.diagrams.map((item) => [item.source, item]));
  if (!check) {
    await mkdir(SOURCE_ROOT, { recursive: true });
    await mkdir(OUTPUT_ROOT, { recursive: true });
  }
  await assertRegularDirectory(SOURCE_ROOT);
  await assertRegularDirectory(OUTPUT_ROOT);
  log("drawio-build", "started", { mode: check ? "check" : "render", sources: sources.length });

  const diagrams = [];
  const pending = [];
  for (const source of sources) {
    const sourceBytes = await readFile(source.absolute);
    const sourceHash = sha256(sourceBytes);
    const outputRelative = outputRelativePath(source.relative);
    const output = resolveInside(OUTPUT_ROOT, outputRelative);
    const currentOutput = await outputState(output);
    const prior = previousBySource.get(source.relative);
    const current = prior
      && prior.sourceHash === sourceHash
      && prior.output === outputRelative
      && currentOutput
      && prior.outputHash === currentOutput.outputHash;
    const item = {
      source: source.relative,
      sourceHash,
      output: outputRelative,
      url: diagramUrl(outputRelative),
      outputHash: currentOutput?.outputHash,
      absoluteSource: source.absolute,
      absoluteOutput: output,
    };
    if (!current) pending.push(item);
    diagrams.push(item);
  }

  const currentSources = new Set(diagrams.map((item) => item.source));
  const stale = previous.diagrams.filter((item) => !currentSources.has(item.source));
  if (check) {
    if (pending.length || stale.length) {
      throw new Error(`${pending.length} draw.io diagram(s) are missing or stale and ${stale.length} generated diagram(s) no longer have a source. Run npm run diagrams:drawio locally and commit the source, SVG and manifest changes.`);
    }
    log("drawio-build", "completed", {
      mode: "check",
      checked: diagrams.length,
      durationMs: Date.now() - startedAt,
    });
    return previous;
  }

  let executable = null;
  if (pending.length) {
    executable = await findDrawIoExecutable();
    if (!executable) {
      throw new Error("draw.io Desktop is required to export changed diagrams. Install it or set DRAWIO_EXECUTABLE to the draw.io executable, then run npm run diagrams:drawio.");
    }
  }

  for (const item of pending) {
    const renderStartedAt = Date.now();
    const requestId = item.sourceHash.slice(0, 12);
    log("drawio-render", "started", { requestId, file: `src/diagrams/drawio/${item.source}` });
    try {
      const svg = await exportSvg(executable, item.absoluteSource, item.absoluteOutput);
      item.outputHash = sha256(svg);
      log("drawio-render", "completed", {
        requestId,
        file: `src/diagrams/drawio/${item.source}`,
        output: item.url,
        durationMs: Date.now() - renderStartedAt,
      });
    } catch (error) {
      log("drawio-render", "failed", {
        requestId,
        file: `src/diagrams/drawio/${item.source}`,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - renderStartedAt,
      }, "error");
      throw error;
    }
  }

  for (const removed of stale) {
    const target = resolveInside(OUTPUT_ROOT, removed.output);
    if (path.extname(target).toLowerCase() !== ".svg") throw new Error(`Refusing to remove non-SVG draw.io output: ${removed.output}`);
    if (await exists(target)) await unlink(target);
    log("drawio-clean", "removed", { output: removed.output });
  }

  const publicManifest = {
    version: VERSION,
    diagrams: diagrams.map(({ source, sourceHash, output, outputHash, url }) => ({
      source,
      sourceHash,
      output,
      outputHash,
      url,
    })),
  };
  await writeFile(MANIFEST, `${JSON.stringify(publicManifest, null, 2)}\n`, "utf8");
  log("drawio-build", "completed", {
    rendered: pending.length,
    cached: diagrams.length - pending.length,
    published: diagrams.length,
    durationMs: Date.now() - startedAt,
  });
  return publicManifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  renderAll({ check: process.argv.includes("--check") || process.env.CI === "true" }).catch((error) => {
    log("drawio-build", "failed", {
      error: error instanceof Error ? error.message : String(error),
    }, "error");
    process.exitCode = 1;
  });
}
