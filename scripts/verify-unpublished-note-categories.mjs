import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import path from "node:path";

export function unpublishedNoteRoutePrefixes(category) {
  assert.match(category, /^[a-z0-9-]+$/, "Invalid unpublished category ID");
  return [
    `/notes/${category}/`,
    `/en/notes/${category}/`,
    `/notes/category/${category}/`,
    `/en/notes/category/${category}/`,
    `/note-source/zh/${category}/`,
    `/note-source/en/${category}/`,
  ];
}

export async function verifyUnpublishedNoteCategories({ distRoot, urls, categories }) {
  for (const category of categories) {
    const prefixes = unpublishedNoteRoutePrefixes(category);
    for (const url of urls) {
      const pathname = decodeURI(new URL(url).pathname);
      assert.ok(
        !prefixes.some((prefix) => pathname === prefix.slice(0, -1) || pathname.startsWith(prefix)),
        `Unpublished note URL leaked into sitemap: ${pathname}`,
      );
    }
    for (const prefix of prefixes) {
      const generatedPath = path.join(distRoot, prefix.slice(1));
      try {
        await stat(generatedPath);
        assert.fail(`Unpublished note page remains in generated output: ${prefix}`);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
  }
  return { verifiedUnpublishedCategories: categories.length };
}
