import { collectPublishingAssets } from "../../compiler/node/compiler.mjs";
import { loadBlogctlPublishingRuntimeConfig } from "../../compiler/node/runtime-config.mjs";
import { readRenderedAsset, renderMermaidAsset } from "./mermaid-assets.mjs";
import { loadR2Config, uploadR2Object } from "./r2.mjs";

export function dedupePublishingAssets(groups) {
  const assets = new Map();
  for (const group of groups || []) {
    for (const asset of group || []) assets.set(asset.id, asset);
  }
  return [...assets.values()];
}

export async function preparePublishingAssetList(assets, {
  dryRun = false,
  cacheRoot = ".distribution/assets",
  env = process.env,
  render = renderMermaidAsset,
  read = readRenderedAsset,
  upload = uploadR2Object,
} = {}) {
  const unique = dedupePublishingAssets([assets]);
  if (dryRun || unique.length === 0) {
    return { assets: unique.length, rendered: 0, cached: 0, uploaded: 0, dryRun };
  }

  const runtime = loadBlogctlPublishingRuntimeConfig(env);
  if (runtime.assets.store !== "r2") throw new Error("Unsupported BlogCTL publishing asset store: " + runtime.assets.store);
  const config = loadR2Config(env);
  let rendered = 0;
  let cached = 0;
  let uploaded = 0;

  for (const asset of unique) {
    const result = await render(asset, { cacheRoot, env });
    if (result.rendered) rendered += 1;
    else cached += 1;
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

  return { assets: unique.length, rendered, cached, uploaded, dryRun: false };
}

export async function preparePublishingAssets(markdown, options = {}) {
  return preparePublishingAssetList(collectPublishingAssets(markdown, options), options);
}
