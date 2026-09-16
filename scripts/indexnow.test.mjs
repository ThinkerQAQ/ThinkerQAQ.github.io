import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  INDEXNOW_KEY,
  INDEXNOW_KEY_LOCATION,
  extractLocations,
  preparePayload,
  submitPayload,
} from "./indexnow.mjs";

test("extractLocations reads and decodes sitemap locations", () => {
  assert.deepEqual(
    extractLocations("<urlset><url><loc>https://example.com/a?x=1&amp;y=2</loc></url></urlset>"),
    ["https://example.com/a?x=1&y=2"],
  );
});

test("preparePayload builds a validated payload from generated sitemaps", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "indexnow-test-"));
  const distRoot = path.join(root, "dist");
  const publicRoot = path.join(root, "public");
  try {
    await mkdir(distRoot);
    await mkdir(publicRoot);
    await writeFile(
      path.join(distRoot, "sitemap-index.xml"),
      "<sitemapindex><sitemap><loc>https://thinkerqaq.github.io/sitemap-0.xml</loc></sitemap></sitemapindex>",
    );
    await writeFile(
      path.join(distRoot, "sitemap-0.xml"),
      "<urlset><url><loc>https://thinkerqaq.github.io/</loc></url><url><loc>https://thinkerqaq.github.io/articles/example/</loc></url></urlset>",
    );
    await writeFile(path.join(publicRoot, `${INDEXNOW_KEY}.txt`), `${INDEXNOW_KEY}\n`);

    const payload = await preparePayload({ distRoot, publicRoot });
    assert.equal(payload.host, "thinkerqaq.github.io");
    assert.equal(payload.key, INDEXNOW_KEY);
    assert.equal(payload.keyLocation, INDEXNOW_KEY_LOCATION);
    assert.deepEqual(payload.urlList, [
      "https://thinkerqaq.github.io/",
      "https://thinkerqaq.github.io/articles/example/",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("submitPayload accepts an IndexNow 202 response", async () => {
  const calls = [];
  await submitPayload(
    {
      host: "thinkerqaq.github.io",
      key: INDEXNOW_KEY,
      keyLocation: INDEXNOW_KEY_LOCATION,
      urlList: ["https://thinkerqaq.github.io/"],
    },
    {
      maxAttempts: 1,
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        return new Response("", { status: 202 });
      },
    },
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.method, "POST");
  assert.match(calls[0].options.headers["content-type"], /application\/json/u);
});
