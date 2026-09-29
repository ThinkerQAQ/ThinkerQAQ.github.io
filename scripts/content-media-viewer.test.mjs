import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  MERMAID_RENDERED_EVENT,
  MEDIA_VIEWER_SCALE_STEPS,
  formatMediaScale,
  nextMediaScale,
} from "../src/lib/content-media-viewer.js";

test("content media viewer exposes the intended zoom ladder", () => {
  assert.deepEqual(
    [...MEDIA_VIEWER_SCALE_STEPS],
    [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4],
  );
});

test("content media viewer moves one zoom step at a time", () => {
  assert.equal(nextMediaScale(1, 1), 1.25);
  assert.equal(nextMediaScale(1.25, 1), 1.5);
  assert.equal(nextMediaScale(1, -1), 0.75);
  assert.equal(nextMediaScale(0.75, -1), 0.5);
});

test("content media viewer clamps zoom at both ends", () => {
  assert.equal(nextMediaScale(4, 1), 4);
  assert.equal(nextMediaScale(0.5, -1), 0.5);
});

test("content media viewer formats zoom percentages for the toolbar", () => {
  assert.equal(formatMediaScale(0.75), "75%");
  assert.equal(formatMediaScale(1), "100%");
  assert.equal(formatMediaScale(1.25), "125%");
  assert.equal(formatMediaScale(4), "400%");
});


test("Mermaid runtime signals the viewer only after mermaid.run finishes", async () => {
  assert.equal(MERMAID_RENDERED_EVENT, "blog:mermaid-rendered");

  const source = await readFile(
    new URL("../src/components/MermaidRuntime.astro", import.meta.url),
    "utf8",
  );
  const renderIndex = source.indexOf("await mermaid.run");
  const readyIndex = source.indexOf("diagram.dataset.mermaidReady");
  const eventIndex = source.indexOf('new CustomEvent("blog:mermaid-rendered"');

  assert.ok(renderIndex >= 0);
  assert.ok(readyIndex > renderIndex);
  assert.ok(eventIndex > readyIndex);
});
