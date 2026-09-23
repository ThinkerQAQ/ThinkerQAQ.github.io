import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runMediumSyndication } from "./syndicate-medium.mjs";

test("Medium live sync must run through the BlogCTL browser bridge", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "medium-live-sync-test-"));
  try {
    const article = {
      title: "Test",
      description: "Description",
      tags: ["Go"],
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
      /must run through blogctl sync/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
