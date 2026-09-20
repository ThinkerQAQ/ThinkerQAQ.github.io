import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runMediumSyndication } from "./syndicate-medium.mjs";

test("Medium live sync refuses body images before opening a browser session", async () => {
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), "medium-fallback-test-"));
  const article = {
    title: "Mutex",
    description: "desc",
    tags: ["Concurrency"],
    coverImage: "/media/articles/mutex/cover.png",
    coverImageAlt: "cover",
    body: [
      "```mermaid",
      "flowchart LR",
      "A --> B",
      "```",
    ].join("\n"),
  };

  try {
    await assert.rejects(
      runMediumSyndication([{ slug: "mutex", article }], { outputRoot }),
      /cannot safely insert body images yet/u,
    );
    const fallback = path.join(outputRoot, "mutex.html");
    const html = await readFile(fallback, "utf8");
    assert.match(html, /media\/generated\/mermaid\/[a-f0-9]{24}\.png/u);
  } finally {
    await rm(outputRoot, { recursive: true, force: true });
  }
});
