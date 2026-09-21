import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runMediumSyndication } from "./syndicate-medium.mjs";

test("Medium live sync refuses body images before opening a browser bridge", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "medium-body-image-test-"));
  try {
    const article = {
      title: "Test",
      description: "Description",
      tags: ["Go"],
      coverImage: "",
      coverImageAlt: "",
      body: "## Body\n\n![diagram](https://example.com/diagram.png)",
    };
    await assert.rejects(
      () => runMediumSyndication([{ slug: "test", article }], {
        outputRoot: root,
        publishingConfig: {
          language: "en",
          footer: { enabled: false, template: "" },
          canonical: { mode: "native" },
          tracking: { enabled: false, source: "medium", medium: "referral", campaign: "article_syndication" },
        },
      }),
      /cannot safely insert body images yet/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
