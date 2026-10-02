import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import * as vizModule from "@viz-js/viz";
import sharp from "sharp";

let vizInstancePromise = null;
let enginePromise = null;

function ensureViz() {
  if (globalThis.Viz) return;
  globalThis.Viz = {
    instance: () => (vizInstancePromise ??= vizModule.instance()),
  };
}

async function loadEngine() {
  ensureViz();
  if (!enginePromise) {
    enginePromise = import("@plantuml/mcp-js/engine.js");
  }
  return enginePromise;
}

function engineError(parsed) {
  const message = parsed?.errorMessage || "PlantUML rendering failed";
  const line = Number(parsed?.errorLineNumber || 0);
  return line > 0 ? new Error(`${message} (line ${line})`) : new Error(message);
}

export async function renderPlantUMLPNG(source) {
  source = String(source || "").trim();
  if (!source) throw new Error("PlantUML source is required");

  const engine = await loadEngine();
  const raw = await new Promise((resolve) => {
    engine.renderSvg(source, (result) => resolve(result));
  });
  const parsed = JSON.parse(String(raw));
  if (parsed.valid === false) throw engineError(parsed);
  if (typeof parsed.svg !== "string" || !parsed.svg.includes("<svg")) {
    throw new Error("PlantUML TeaVM renderer returned no SVG");
  }

  return sharp(Buffer.from(parsed.svg))
    .png()
    .toBuffer();
}

export async function main() {
  // TeaVM maps Java System.out to console.log. Keep stdout binary-only.
  console.log = (...args) => console.error(...args);
  console.info = (...args) => console.error(...args);
  console.debug = (...args) => console.error(...args);

  const source = await readFile(0, "utf8");
  const png = await renderPlantUMLPNG(source);
  process.stdout.write(png);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write((error?.stack || error?.message || String(error)) + "\n");
    process.exitCode = 1;
  });
}
