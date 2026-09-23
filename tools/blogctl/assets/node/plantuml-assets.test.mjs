import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { plantumlAssetForSource } from "../../compiler/node/compiler.mjs";
import { renderPlantUMLAsset } from "./plantuml-assets.mjs";

test("renders PlantUML SVG output to a cached PNG publishing asset", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "blogctl-plantuml-test-"));
  try {
    const asset = plantumlAssetForSource("@startuml\nAlice -> Bob: hello\n@enduml");
    let renders = 0;
    const first = await renderPlantUMLAsset(asset, {
      cacheRoot: root,
      render: async () => {
        renders += 1;
        return '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20"/></svg>';
      },
    });
    assert.equal(first.rendered, true);
    assert.equal(path.isAbsolute(first.outputFile), true);
    const bytes = await readFile(first.outputFile);
    assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);

    const second = await renderPlantUMLAsset(asset, {
      cacheRoot: root,
      render: async () => assert.fail("cached PlantUML asset should not render twice"),
    });
    assert.equal(second.rendered, false);
    assert.equal(renders, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
