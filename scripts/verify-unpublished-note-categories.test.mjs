import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { unpublishedNoteRoutePrefixes, verifyUnpublishedNoteCategories } from "./verify-unpublished-note-categories.mjs";

test("checks all direct and translated routes for an unpublished note category", () => {
  assert.deepEqual(unpublishedNoteRoutePrefixes("economics"), [
    "/notes/economics/",
    "/en/notes/economics/",
    "/notes/category/economics/",
    "/en/notes/category/economics/",
    "/note-source/zh/economics/",
    "/note-source/en/economics/",
  ]);
  assert.throws(() => unpublishedNoteRoutePrefixes("../bad"), /Invalid unpublished/);
});

test("rejects a removed category leaked into sitemap", async () => {
  const distRoot = await mkdtemp(path.join(os.tmpdir(), "verify-note-hidden-"));
  await assert.rejects(
    verifyUnpublishedNoteCategories({
      distRoot, urls: ["https://example.com/notes/category/photography/"],
      categories: ["photography"],
    }),
    /leaked into sitemap/,
  );
});

test("rejects a removed note page that is generated but omitted from sitemap", async () => {
  const distRoot = await mkdtemp(path.join(os.tmpdir(), "verify-note-hidden-"));
  await mkdir(path.join(distRoot, "notes", "developer-tools", "git"), { recursive: true });
  await assert.rejects(
    verifyUnpublishedNoteCategories({
      distRoot, urls: ["https://example.com/"], categories: ["developer-tools"],
    }),
    /remains in generated output/,
  );
});

test("accepts a clean site even when unrelated photo galleries remain published", async () => {
  const distRoot = await mkdtemp(path.join(os.tmpdir(), "verify-note-hidden-"));
  await mkdir(path.join(distRoot, "life", "photo"), { recursive: true });
  const result = await verifyUnpublishedNoteCategories({
    distRoot, urls: ["https://example.com/", "https://example.com/life/photo/"],
    categories: ["photography", "fitness", "investing", "economics", "developer-tools"],
  });
  assert.equal(result.verifiedUnpublishedCategories, 5);
});
