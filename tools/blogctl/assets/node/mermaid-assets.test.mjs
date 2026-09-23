import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { mermaidAssetForSource } from "../../compiler/node/compiler.mjs";
import { mermaidCliInvocation, renderMermaidAsset } from "./mermaid-assets.mjs";

test("runs npx through node on Windows instead of spawning a cmd shim", () => {
  const execPath = "C:\\node\\node.exe";
  const npxCli = "C:\\node\\node_modules\\npm\\bin\\npx-cli.js";
  const invocation = mermaidCliInvocation({
    platform: "win32",
    execPath,
    npmExecPath: "",
    exists: (candidate) => candidate === npxCli,
  });
  assert.deepEqual(invocation, { command: execPath, prefixArgs: [npxCli] });
});

test("renders Mermaid to an absolute cached PNG path", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "blogctl-mermaid-test-"));
  const calls = [];
  try {
    const asset = mermaidAssetForSource("flowchart LR\nA --> B");
    const first = await renderMermaidAsset(asset, {
      cacheRoot: root,
      run: async (command, args) => {
        calls.push({ command, args });
        const outputFile = args[args.indexOf("--output") + 1];
        assert.equal(path.isAbsolute(outputFile), true);
        await writeFile(outputFile, Buffer.from("png"));
        return { output: "" };
      },
    });
    assert.equal(first.rendered, true);
    assert.equal((await readFile(first.outputFile)).toString(), "png");
    const second = await renderMermaidAsset(asset, {
      cacheRoot: root,
      run: async () => assert.fail("cached asset should not render again"),
    });
    assert.equal(second.rendered, false);
    assert.equal(calls.length, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
