import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { mermaidAssetForSource } from "./compiler.mjs";
import { renderMermaidAsset } from "./mermaid-assets.mjs";

test("real Mermaid CLI renders a PNG", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "mermaid-real-smoke-"));
  try {
    const asset = mermaidAssetForSource("flowchart LR\n  A[Publishing compiler] --> B[Portable PNG]");
    const puppeteerConfig = path.join(root, "puppeteer.json");
    await writeFile(puppeteerConfig, JSON.stringify({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    }));
    const result = await renderMermaidAsset(asset, {
      cacheRoot: root,
      force: true,
      env: { ...process.env, MERMAID_PUPPETEER_CONFIG_FILE: puppeteerConfig },
    });
    const payload = await readFile(result.outputFile);
    assert.equal(result.rendered, true);
    assert.deepEqual([...payload.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
