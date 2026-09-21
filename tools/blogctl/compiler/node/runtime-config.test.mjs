import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { loadBlogctlPublishingRuntimeConfig } from "./runtime-config.mjs";

test("reads compiler and asset policy from BlogCTL config", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "blogctl-runtime-config-"));
  try {
    const file = path.join(dir, "config.json");
    await writeFile(file, JSON.stringify({
      publishing: {
        compiler: { mermaid: { format: "png", width: 1600, scale: 3 } },
        assets: { store: "r2", r2: { bucket: "configured-bucket", publicBaseUrl: "https://assets.example.com/" } },
      },
    }));
    const config = loadBlogctlPublishingRuntimeConfig({ BLOGCTL_CONFIG_FILE: file });
    assert.deepEqual(config, {
      mermaid: { format: "png", width: 1600, scale: 3 },
      assets: { store: "r2", r2: { bucket: "configured-bucket", publicBaseUrl: "https://assets.example.com/" } },
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("environment overrides R2 deployment coordinates but not compiler policy", () => {
  const config = loadBlogctlPublishingRuntimeConfig({
    R2_BUCKET: "env-bucket",
    R2_PUBLIC_BASE_URL: "https://env.example.com/",
  });
  assert.equal(config.assets.r2.bucket, "env-bucket");
  assert.equal(config.assets.r2.publicBaseUrl, "https://env.example.com/");
  assert.equal(config.mermaid.width, 1200);
});
