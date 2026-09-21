import assert from "node:assert/strict";
import test from "node:test";

import { mermaidAssetForSource } from "./compiler.mjs";
import { dedupePublishingAssets, preparePublishingAssetList } from "./assets.mjs";

test("deduplicates publishing assets by content id", () => {
  const asset = mermaidAssetForSource("flowchart LR\nA --> B");
  assert.deepEqual(dedupePublishingAssets([[asset], [asset]]).map((item) => item.id), [asset.id]);
});

test("dry-run plans assets without rendering or uploading", async () => {
  const asset = mermaidAssetForSource("flowchart LR\nA --> B");
  const result = await preparePublishingAssetList([asset], {
    dryRun: true,
    render: async () => assert.fail("dry-run must not render"),
    upload: async () => assert.fail("dry-run must not upload"),
  });
  assert.deepEqual(result, { assets: 1, rendered: 0, cached: 0, uploaded: 0, dryRun: true });
});

test("renders and uploads each unique asset", async () => {
  const asset = mermaidAssetForSource("flowchart LR\nA --> B");
  const calls = [];
  const result = await preparePublishingAssetList([asset, asset], {
    env: {},
    render: async (value) => {
      calls.push(["render", value.id]);
      return { asset: value, outputFile: "/tmp/example.png", rendered: true };
    },
    read: async () => Buffer.from("png"),
    upload: async ({ objectKey }) => {
      calls.push(["upload", objectKey]);
      return { objectKey, publicUrl: asset.publicUrl };
    },
  });
  assert.equal(result.assets, 1);
  assert.equal(result.rendered, 1);
  assert.equal(result.uploaded, 1);
  assert.deepEqual(calls.map((item) => item[0]), ["render", "upload"]);
});
