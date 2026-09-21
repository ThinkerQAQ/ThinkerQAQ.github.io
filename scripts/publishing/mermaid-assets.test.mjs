import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { mermaidAssetForSource } from "./compiler.mjs";
import { renderMermaidAsset } from "./mermaid-assets.mjs";

test("renders Mermaid to an absolute cached PNG path", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "mermaid-asset-test-"));
  const calls = [];
  try {
    const asset = mermaidAssetForSource("flowchart LR\nA --> B");
    const first = await renderMermaidAsset(asset, {
      cacheRoot: root,
      run: async (command, args, options) => {
        calls.push({ command, args, options });
        const outputIndex = args.indexOf("--output");
        assert.notEqual(outputIndex, -1);
        const outputFile = args[outputIndex + 1];
        assert.equal(path.isAbsolute(outputFile), true);
        await writeFile(outputFile, Buffer.from("png"));
        return { output: "" };
      },
    });
    assert.equal(first.rendered, true);
    assert.equal((await readFile(first.outputFile)).toString(), "png");
    assert.equal(calls.length, 1);

    const second = await renderMermaidAsset(asset, {
      cacheRoot: root,
      run: async () => assert.fail("cached asset should not render again"),
    });
    assert.equal(second.rendered, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
