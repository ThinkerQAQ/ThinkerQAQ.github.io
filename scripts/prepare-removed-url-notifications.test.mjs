import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { calculateRemovedURLs, prepareRemovedURLNotifications } from "./prepare-removed-url-notifications.mjs";

test("calculates removed pages, including category pages and localized note URLs", () => {
  const origin = "https://example.com";
  const previous = ["/", "/notes/category/investing/", "/notes/investing/investing/", "/en/notes/investing/investing/"].map(p => origin + p).join("\n");
  const next = ["/", "/articles/keep/"].map(p => origin + p).join("\n");
  const result = calculateRemovedURLs(previous, next, origin);
  assert.deepEqual(result.removed, [
    origin + "/en/notes/investing/investing/",
    origin + "/notes/category/investing/",
    origin + "/notes/investing/investing/",
  ]);
});

test("rejects foreign origins and prevents accidental full-site deletion notifications", () => {
  assert.throws(() => calculateRemovedURLs("https://other.example/notes/a/", "https://example.com/", "https://example.com"), /unexpected origin/);
  assert.throws(() => calculateRemovedURLs("https://example.com/", "", "https://example.com"), /empty current sitemap/);
});

test("writes a private removal inventory for deployment notifications", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "blog-search-removed-"));
  const siteRoot = path.join(root, "site");
  const dist = path.join(root, "publish-dist");
  const output = path.join(root, "private", "removed-urls.txt");
  await mkdir(siteRoot);
  await mkdir(dist);
  await writeFile(path.join(siteRoot, "site.config.json"), JSON.stringify({ url: "https://example.com" }));
  await writeFile(path.join(dist, "sitemap-all.txt"), "https://example.com/\n");
  const result = await prepareRemovedURLNotifications({
    siteRoot, newListPath: path.join(dist, "sitemap-all.txt"), outputPath: output,
    fetchImpl: async () => ({ ok: true, text: async () => "https://example.com/\nhttps://example.com/notes/economics/economics/\n" }),
  });
  assert.equal(result.removed, 1);
  assert.equal(await readFile(output, "utf8"), "https://example.com/notes/economics/economics/\n");
  await assert.rejects(
    prepareRemovedURLNotifications({
      siteRoot, newListPath: path.join(dist, "sitemap-all.txt"), outputPath: path.join(dist, "removed-urls.txt"),
      fetchImpl: async () => ({ ok: true, text: async () => "https://example.com/\n" }),
    }),
    /must not be published/,
  );
});
