import { spawn } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { MERMAID_CLI_PACKAGE } from "../../compiler/node/compiler.mjs";
import { loadBlogctlPublishingRuntimeConfig } from "../../compiler/node/runtime-config.mjs";

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}

export function defaultRun(command, args, { cwd = process.cwd() } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd, env: process.env, stdio: ["ignore", "pipe", "pipe"], shell: false, windowsHide: true,
    });
    const output = [];
    child.stdout.on("data", (chunk) => output.push(chunk));
    child.stderr.on("data", (chunk) => output.push(chunk));
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      const combined = Buffer.concat(output).toString("utf8");
      if (signal) reject(new Error(command + " terminated by signal " + signal + ": " + combined.trim()));
      else if (code !== 0) reject(new Error(command + " exited with code " + code + ": " + combined.trim()));
      else resolve({ output: combined });
    });
  });
}

export function assetCacheFile(cacheRoot, asset) {
  return path.resolve(cacheRoot, "mermaid", asset.id + ".png");
}

export async function renderMermaidAsset(asset, {
  cacheRoot = ".distribution/assets",
  run = defaultRun,
  force = false,
  env = process.env,
} = {}) {
  const outputFile = assetCacheFile(cacheRoot, asset);
  if (!force && await exists(outputFile)) return { asset, outputFile, rendered: false };

  const policy = loadBlogctlPublishingRuntimeConfig(env).mermaid;
  if (policy.format !== "png") throw new Error("BlogCTL Mermaid publishing currently supports only PNG");

  await mkdir(path.dirname(outputFile), { recursive: true });
  const temporary = await mkdtemp(path.join(os.tmpdir(), "blogctl-mermaid-"));
  try {
    const inputFile = path.join(temporary, asset.id + ".mmd");
    const configFile = path.join(temporary, "mermaid-config.json");
    await writeFile(inputFile, asset.source + "\n", "utf8");
    await writeFile(configFile, JSON.stringify({ securityLevel: "strict", theme: "default" }), "utf8");

    const command = process.platform === "win32" ? "npx.cmd" : "npx";
    const args = [
      "--yes", "-p", MERMAID_CLI_PACKAGE, "mmdc",
      "--input", inputFile,
      "--output", outputFile,
      "--backgroundColor", "white",
      "--width", String(policy.width),
      "--scale", String(policy.scale),
      "--configFile", configFile,
    ];
    const puppeteerConfig = String(env.MERMAID_PUPPETEER_CONFIG_FILE || "").trim();
    if (puppeteerConfig) args.push("--puppeteerConfigFile", path.resolve(puppeteerConfig));
    await run(command, args, { cwd: temporary });
    if (!(await exists(outputFile))) throw new Error("Mermaid renderer completed without creating " + outputFile);
    return { asset, outputFile, rendered: true };
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

export async function readRenderedAsset(file) {
  return readFile(file);
}
