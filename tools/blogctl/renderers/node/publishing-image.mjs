import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import sharp from "sharp";

import { ensureJar, renderSvg } from "../../../../scripts/plantuml/runtime.mjs";
import { loadBlogctlPublishingRuntimeConfig } from "../../compiler/node/runtime-config.mjs";

const MAX_DIMENSION = 4096;

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const name = argv[index];
    if (!name.startsWith("--")) throw new Error("Unexpected renderer argument: " + name);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(name + " requires a value");
    values[name.slice(2)] = value;
    index += 1;
  }
  for (const required of ["kind", "input", "output"]) {
    if (!values[required]) throw new Error("--" + required + " is required");
  }
  return values;
}

function run(command, args, { cwd = process.cwd() } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
      windowsHide: true,
    });
    const output = [];
    child.stdout.on("data", (chunk) => output.push(chunk));
    child.stderr.on("data", (chunk) => output.push(chunk));
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      const combined = Buffer.concat(output).toString("utf8").trim();
      if (signal) reject(new Error(command + " terminated by signal " + signal + ": " + combined));
      else if (code !== 0) reject(new Error(command + " exited with code " + code + ": " + combined));
      else resolve(combined);
    });
  });
}

function mermaidInvocation() {
  if (process.platform !== "win32") return { command: "npx", prefix: [] };
  const candidates = [
    process.env.npm_execpath ? path.win32.join(path.win32.dirname(process.env.npm_execpath), "npx-cli.js") : "",
    path.win32.join(path.win32.dirname(process.execPath), "node_modules", "npm", "bin", "npx-cli.js"),
  ].filter(Boolean);
  const cli = candidates.find((candidate) => existsSync(candidate));
  if (!cli) throw new Error("npm npx-cli.js was not found beside the active Windows Node.js runtime");
  return { command: process.execPath, prefix: [cli] };
}

async function renderMermaid(sourceFile, outputFile, renderer) {
  const policy = loadBlogctlPublishingRuntimeConfig(process.env).mermaid;
  if (policy.format !== "png") throw new Error("Publishing Mermaid renderer supports only PNG");
  const temporary = await mkdtemp(path.join(os.tmpdir(), "blogctl-mermaid-renderer-"));
  try {
    const configFile = path.join(temporary, "mermaid-config.json");
    await writeFile(configFile, JSON.stringify({ securityLevel: "strict", theme: "default" }), "utf8");
    const invocation = mermaidInvocation();
    const args = [
      ...invocation.prefix,
      "--yes", "-p", renderer || "@mermaid-js/mermaid-cli@11.17.0", "mmdc",
      "--input", sourceFile,
      "--output", outputFile,
      "--backgroundColor", "white",
      "--width", String(policy.width),
      "--scale", String(policy.scale),
      "--configFile", configFile,
    ];
    const puppeteer = String(process.env.MERMAID_PUPPETEER_CONFIG_FILE || "").trim();
    if (puppeteer) args.push("--puppeteerConfigFile", path.resolve(puppeteer));
    await run(invocation.command, args, { cwd: temporary });
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

async function renderPlantUML(source, outputFile) {
  await ensureJar();
  const svg = await renderSvg(source);
  await sharp(Buffer.from(svg)).png().toFile(outputFile);
}

async function constrain(outputFile) {
  const input = await readFile(outputFile);
  const metadata = await sharp(input).metadata();
  const width = Number(metadata.width || 0);
  const height = Number(metadata.height || 0);
  if (!width || !height || (width <= MAX_DIMENSION && height <= MAX_DIMENSION)) return;
  const payload = await sharp(input)
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();
  await writeFile(outputFile, payload);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const input = path.resolve(args.input);
  const output = path.resolve(args.output);
  await mkdir(path.dirname(output), { recursive: true });
  const source = await readFile(input, "utf8");

  if (args.kind === "mermaid") {
    await renderMermaid(input, output, args.renderer);
  } else if (args.kind === "plantuml") {
    await renderPlantUML(source, output);
  } else {
    throw new Error("Unsupported publishing asset kind: " + args.kind);
  }
  await constrain(output);
  console.log(JSON.stringify({ operation: "publishing-renderer", kind: args.kind, output }));
}

main().catch((error) => {
  console.error(JSON.stringify({
    operation: "publishing-renderer",
    status: "failed",
    error: error instanceof Error ? error.message : String(error),
  }));
  process.exitCode = 1;
});
