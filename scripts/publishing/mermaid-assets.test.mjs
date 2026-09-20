import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { mermaidAssetForSource } from "./compiler.mjs";
import { publicAssetFile, renderMermaidAsset } from "./mermaid-assets.mjs";

test("Mermaid renderer writes a content-addressed PNG and reuses the cache", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "publishing-mermaid-test-"));
  const asset = mermaidAssetForSource("flowchart LR\nA --> B");
  const calls = [];
  try {
    const run = async (command, args) => {
      calls.push({ command, args });
      const outputIndex = args.indexOf("--output");
      assert.notEqual(outputIndex, -1);
      await writeFile(args[outputIndex + 1], "synthetic-png", "utf8");
      return { output: "" };
    };

    const first = await renderMermaidAsset(asset, { publicRoot: root, run });
    assert.equal(first.rendered, true);
    assert.equal(calls.length, 1);
    assert.equal(await readFile(publicAssetFile(root, asset), "utf8"), "synthetic-png");

    const second = await renderMermaidAsset(asset, { publicRoot: root, run });
    assert.equal(second.rendered, false);
    assert.equal(calls.length, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
