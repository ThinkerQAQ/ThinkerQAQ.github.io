import { access, mkdir } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { renderSvg } from "../../../../scripts/plantuml/runtime.mjs";

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}

export function plantumlAssetCacheFile(cacheRoot, asset) {
  return path.resolve(cacheRoot, "plantuml", asset.id + ".png");
}

export async function renderPlantUMLAsset(asset, {
  cacheRoot = ".distribution/assets",
  force = false,
  render = renderSvg,
} = {}) {
  const outputFile = plantumlAssetCacheFile(cacheRoot, asset);
  if (!force && await exists(outputFile)) return { asset, outputFile, rendered: false };

  await mkdir(path.dirname(outputFile), { recursive: true });
  const svg = await render(asset.source);
  await sharp(Buffer.from(svg)).png().toFile(outputFile);
  if (!(await exists(outputFile))) throw new Error("PlantUML renderer completed without creating " + outputFile);
  return { asset, outputFile, rendered: true };
}
