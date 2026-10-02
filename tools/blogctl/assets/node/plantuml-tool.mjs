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
  if (!enginePromise) enginePromise = import("@plantuml/mcp-js/engine.js");
  return enginePromise;
}

function engineError(parsed) {
  const message = parsed?.errorMessage || "PlantUML rendering failed";
  const line = Number(parsed?.errorLineNumber || 0);
  return line > 0 ? new Error(`${message} (line ${line})`) : new Error(message);
}

export async function renderPlantUMLSVG(source) {
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
  return parsed.svg;
}

export async function renderPlantUMLPNG(source) {
  const svg = await renderPlantUMLSVG(source);
  return sharp(Buffer.from(svg)).png().toBuffer();
}

function parseArgs(argv) {
  let format = "png";
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--format") {
      format = String(argv[++index] || "").trim().toLowerCase();
    } else {
      throw new Error("Unknown PlantUML tool option: " + arg);
    }
  }
  if (!["png", "svg"].includes(format)) {
    throw new Error("--format must be png or svg");
  }
  return { format };
}

export async function main(argv = process.argv.slice(2)) {
  // TeaVM maps Java System.out to console.log. Keep stdout transport-only.
  console.log = (...args) => console.error(...args);
  console.info = (...args) => console.error(...args);
  console.debug = (...args) => console.error(...args);

  const { format } = parseArgs(argv);
  const source = await readFile(0, "utf8");
  if (format === "svg") {
    process.stdout.write(await renderPlantUMLSVG(source));
    return;
  }
  process.stdout.write(await renderPlantUMLPNG(source));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write((error?.stack || error?.message || String(error)) + "\n");
    process.exitCode = 1;
  });
}
