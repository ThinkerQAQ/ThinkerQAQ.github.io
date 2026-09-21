import assert from "node:assert/strict";
import test from "node:test";

import { changedContentUrls, contentUrl, parseChangedPaths } from "./content-changes.mjs";

const origin = "https://thinkerqaq.github.io";

test("contentUrl maps published articles, notes and translations", () => {
  assert.equal(contentUrl("src/content/articles/example.md", "---\nlanguage: zh\nstatus: published\n---\n"), `${origin}/articles/example/`);
  assert.equal(contentUrl("src/content/articles/en/example.md", "---\nlanguage: en\nstatus: published\n---\n"), `${origin}/en/articles/example/`);
  assert.equal(contentUrl("src/content/articles/draft.md", "---\nstatus: draft\n---\n"), "");
  assert.equal(contentUrl("src/content/notes/go/channel.md", "---\ntitle: Channel\n---\n"), `${origin}/notes/go/channel/`);
  assert.equal(contentUrl("src/content/note-translations/en/go/channel.md", "---\ntranslationOf: 'go/channel'\nlanguage: en\n---\n"), `${origin}/en/notes/go/channel/`);
});

test("parseChangedPaths reads zero-delimited name-status output", () => {
  assert.deepEqual(parseChangedPaths("M\0src/content/articles/a.md\0D\0src/content/notes/b.md\0"), [
    "src/content/articles/a.md",
    "src/content/notes/b.md",
  ]);
});

test("changedContentUrls includes old and new routes for deletions and route changes", async () => {
  const files = {
    "old:src/content/articles/a.md": "---\nlanguage: zh\nstatus: published\n---\n",
    "new:src/content/articles/a.md": "---\nlanguage: en\nstatus: published\n---\n",
    "old:src/content/notes/removed.md": "---\ntitle: Removed\n---\n",
  };
  const runGit = async (_repository, args) => {
    if (args[0] === "diff") return "M\0src/content/articles/a.md\0D\0src/content/notes/removed.md\0";
    return files[args[1]] ?? "";
  };
  assert.deepEqual(await changedContentUrls({ repository: ".", before: "old", after: "new", runGit }), [
    `${origin}/articles/a/`,
    `${origin}/en/articles/a/`,
    `${origin}/notes/removed/`,
  ]);
});
