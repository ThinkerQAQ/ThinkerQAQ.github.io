import { readFile, writeFile } from "node:fs/promises";

import sharp from "sharp";

import { collectPublishingAssets } from "../../compiler/node/compiler.mjs";
import { loadBlogctlPublishingRuntimeConfig } from "../../compiler/node/runtime-config.mjs";
import { readRenderedAsset, renderMermaidAsset } from "./mermaid-assets.mjs";
import { renderPlantUMLAsset } from "./plantuml-assets.mjs";
import { loadR2Config, uploadR2Object } from "./r2.mjs";

export const DEFAULT_PUBLISHING_IMAGE_MAX_DIMENSION = 4096;

export function dedupePublishingAssets(groups) {
  const assets = new Map();
  for (const group of groups || []) {
    for (const asset of group || []) assets.set(asset.kind + ":" + asset.id, asset);
  }
  return [...assets.values()];
}

export async function constrainPublishingImage(outputFile, {
  maxDimension = DEFAULT_PUBLISHING_IMAGE_MAX_DIMENSION,
} = {}) {
  const limit = Math.max(1, Math.floor(Number(maxDimension) || DEFAULT_PUBLISHING_IMAGE_MAX_DIMENSION));
  const input = await readFile(outputFile);
  const metadata = await sharp(input).metadata();
  const width = Number(metadata.width || 0);
  const height = Number(metadata.height || 0);

  if (!width || !height || (width <= limit && height <= limit)) {
    return { resized: false, width, height, outputWidth: width, outputHeight: height };
  }

  const payload = await sharp(input)
    .resize({
      width: limit,
      height: limit,
      fit: "inside",
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();
  await writeFile(outputFile, payload);

  const resized = await sharp(payload).metadata();
  return {
    resized: true,
    width,
    height,
    outputWidth: Number(resized.width || 0),
    outputHeight: Number(resized.height || 0),
  };
}

export async function preparePublishingAssetList(assets, {
  dryRun = false,
  cacheRoot = ".distribution/assets",
  env = process.env,
  render = null,
  renderers = {},
  read = readRenderedAsset,
  upload = uploadR2Object,
  uploadFallback = true,
  constrain = constrainPublishingImage,
  maxDimension = DEFAULT_PUBLISHING_IMAGE_MAX_DIMENSION,
} = {}) {
  const unique = dedupePublishingAssets([assets]);
  if (dryRun || unique.length === 0) {
    return { assets: unique.length, rendered: 0, cached: 0, uploaded: 0, dryRun };
  }

  const runtime = loadBlogctlPublishingRuntimeConfig(env);
  if (runtime.assets.store !== "r2") throw new Error("Unsupported BlogCTL publishing asset store: " + runtime.assets.store);
  const config = uploadFallback ? loadR2Config(env) : null;
  let rendered = 0;
  let cached = 0;
  let uploaded = 0;

  const defaultRenderers = {
    mermaid: renderMermaidAsset,
    plantuml: renderPlantUMLAsset,
  };

  for (const asset of unique) {
    const renderer = render || renderers[asset.kind] || defaultRenderers[asset.kind];
    if (!renderer) throw new Error("Unsupported publishing asset kind: " + asset.kind);
    const result = await renderer(asset, { cacheRoot, env });
    if (result.rendered) rendered += 1;
    else cached += 1;

    // Distribution images can be uploaded directly to third-party platforms.
    // Keep both dimensions within 4096px so DEV.to accepts generated diagrams.
    // This also normalizes previously cached oversized images before reuse.
    await constrain(result.outputFile, { maxDimension });

    if (uploadFallback) {
      const payload = await read(result.outputFile);
      const uploadedAsset = await upload({
        objectKey: asset.objectKey,
        body: payload,
        contentType: "image/png",
        config,
      });
      if (uploadedAsset.publicUrl !== asset.publicUrl) {
        throw new Error("R2 public URL mismatch for " + asset.objectKey);
      }
      uploaded += 1;
    }
  }

  return { assets: unique.length, rendered, cached, uploaded, dryRun: false };
}

export async function preparePublishingAssets(markdown, options = {}) {
  return preparePublishingAssetList(collectPublishingAssets(markdown, options), options);
}
