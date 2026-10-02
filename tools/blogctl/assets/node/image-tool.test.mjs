import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import sharp from "sharp";

import { constrainPNG } from "./image-tool.mjs";

test("constrains oversized publishing PNGs to 4096px", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "blogctl-image-tool-"));
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

    const result = await constrainPNG(file, 4096);
    const metadata = await sharp(file).metadata();
    assert.equal(result.resized, true);
    assert.equal(metadata.width, 4096);
    assert.ok(Number(metadata.height) > 0 && Number(metadata.height) <= 4096);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
