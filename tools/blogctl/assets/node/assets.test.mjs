import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import sharp from "sharp";

import { mermaidAssetForSource } from "../../compiler/node/compiler.mjs";
import {
  DEFAULT_PUBLISHING_IMAGE_MAX_DIMENSION,
  constrainPublishingImage,
  dedupePublishingAssets,
  preparePublishingAssetList,
} from "./assets.mjs";

test("dry-run plans assets without rendering or constraining", async () => {
  const asset = mermaidAssetForSource("flowchart LR\nA --> B");
  const result = await preparePublishingAssetList([asset, asset], {
    dryRun: true,
    render: async () => assert.fail("dry-run must not render"),
    constrain: async () => assert.fail("dry-run must not constrain"),
  });
  assert.deepEqual(result, { assets: 1, rendered: 0, cached: 0, dryRun: true });
});

test("renders and constrains each unique asset", async () => {
  const asset = mermaidAssetForSource("flowchart LR\nA --> B");
  const calls = [];
  const result = await preparePublishingAssetList([asset, asset], {
    render: async (value) => {
      calls.push(["render", value.id]);
      return { asset: value, outputFile: "/tmp/example.png", rendered: true };
    },
    constrain: async (outputFile, { maxDimension }) => {
      calls.push(["constrain", outputFile, maxDimension]);
      return { resized: false };
    },
  });
  assert.equal(result.assets, 1);
  assert.equal(result.rendered, 1);
  assert.deepEqual(calls.map((item) => item[0]), ["render", "constrain"]);
  assert.equal(calls[1][2], DEFAULT_PUBLISHING_IMAGE_MAX_DIMENSION);
});

test("constrains oversized publishing PNGs to fit within 4096x4096", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "blogctl-image-limit-"));
  const file = path.join(root, "oversized.png");
  try {
    await sharp({
      create: {
        width: 5000,
        height: 200,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    }).png().toFile(file);

    const result = await constrainPublishingImage(file);
    const metadata = await sharp(file).metadata();

    assert.equal(result.resized, true);
    assert.equal(result.width, 5000);
    assert.equal(result.height, 200);
    assert.equal(metadata.width, 4096);
    assert.ok(Number(metadata.height) > 0 && Number(metadata.height) <= 4096);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("keeps publishing PNGs unchanged when both dimensions are within the limit", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "blogctl-image-limit-"));
  const file = path.join(root, "normal.png");
  try {
    await sharp({
      create: {
        width: 1200,
        height: 800,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    }).png().toFile(file);

    const result = await constrainPublishingImage(file);
    assert.deepEqual(result, {
      resized: false,
      width: 1200,
      height: 800,
      outputWidth: 1200,
      outputHeight: 800,
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
