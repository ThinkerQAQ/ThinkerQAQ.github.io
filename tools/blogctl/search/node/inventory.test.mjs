import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  extractLocations,
  loadSearchInventory,
  readUrlFile,
  sitemapFileForUrl,
  writeTextSitemap,
} from "./inventory.mjs";

test("extractLocations decodes XML entities", () => {
  assert.deepEqual(
    extractLocations("<urlset><url><loc>https://example.com/a?x=1&amp;y=2</loc></url></urlset>"),
    ["https://example.com/a?x=1&y=2"],
  );
});

test("loadSearchInventory reads child sitemaps, validates origin, deduplicates and sorts", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "search-inventory-"));
  try {
    await writeFile(
      path.join(root, "sitemap-index.xml"),
      `<sitemapindex>
        <sitemap><loc>https://thinkerqaq.github.io/sitemap-0.xml</loc></sitemap>
        <sitemap><loc>https://thinkerqaq.github.io/sitemap-1.xml</loc></sitemap>
      </sitemapindex>`,
    );
    await writeFile(
      path.join(root, "sitemap-0.xml"),
      `<urlset>
        <url><loc>https://thinkerqaq.github.io/articles/b/</loc></url>
        <url><loc>https://thinkerqaq.github.io/</loc></url>
      </urlset>`,
    );
    await writeFile(
      path.join(root, "sitemap-1.xml"),
      `<urlset>
        <url><loc>https://thinkerqaq.github.io/</loc></url>
        <url><loc>https://thinkerqaq.github.io/en/</loc></url>
      </urlset>`,
    );

    const inventory = await loadSearchInventory({ distRoot: root });
    assert.equal(inventory.origin, "https://thinkerqaq.github.io");
    assert.deepEqual(inventory.urlList, [
      "https://thinkerqaq.github.io/",
      "https://thinkerqaq.github.io/articles/b/",
      "https://thinkerqaq.github.io/en/",
    ]);

    const result = await writeTextSitemap({ distRoot: root, inventory });
    assert.equal(result.urlCount, 3);
    assert.equal(
      await readFile(path.join(root, "sitemap-all.txt"), "utf8"),
      `${inventory.urlList.join("\n")}\n`,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("loadSearchInventory rejects a page from another origin", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "search-origin-"));
  try {
    await writeFile(
      path.join(root, "sitemap-index.xml"),
      "<sitemapindex><sitemap><loc>https://thinkerqaq.github.io/sitemap-0.xml</loc></sitemap></sitemapindex>",
    );
    await writeFile(
      path.join(root, "sitemap-0.xml"),
      "<urlset><url><loc>https://example.com/wrong/</loc></url></urlset>",
    );
    await assert.rejects(
      loadSearchInventory({ distRoot: root }),
      /must use https:\/\/thinkerqaq\.github\.io/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("sitemapFileForUrl rejects path traversal after decoding", () => {
  assert.throws(
    () => sitemapFileForUrl(
      "/tmp/dist",
      "https://thinkerqaq.github.io/%2e%2e%2fsecret.xml",
      "https://thinkerqaq.github.io",
    ),
    /escapes dist root/u,
  );
});

test("readUrlFile ignores blanks/comments and validates origin", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "search-url-file-"));
  const file = path.join(root, "urls.txt");
  try {
    await writeFile(
      file,
      "# changed URLs\n\nhttps://thinkerqaq.github.io/b/\nhttps://thinkerqaq.github.io/a/\n",
    );
    assert.deepEqual(
      await readUrlFile(file, { expectedOrigin: "https://thinkerqaq.github.io" }),
      [
        "https://thinkerqaq.github.io/a/",
        "https://thinkerqaq.github.io/b/",
      ],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
