import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { prepareProjectReadmes } from "./prepare-project-readme-frontmatter.mjs";

test("normalizes only missing frontmatter in assembled project README files", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "site-project-"));
  try {
    await mkdir(path.join(root, "reverfolio"));
    await mkdir(path.join(root, "vidotter"));
    await writeFile(path.join(root, "reverfolio", "README.md"), "# Reverfolio\n");
    await writeFile(path.join(root, "reverfolio", "README_ZH.md"), "# 中文\n");
    const existing = "---\nproject: vidotter\nlanguage: en\n---\n\n# VidOtter\n";
    await writeFile(path.join(root, "vidotter", "README.md"), existing);
    assert.deepEqual(await prepareProjectReadmes(root), ["reverfolio/README.md", "reverfolio/README_ZH.md"]);
    assert.match(await readFile(path.join(root, "reverfolio", "README.md"), "utf8"), /^---\nproject: reverfolio\nlanguage: en\n---\n\n# Reverfolio/);
    assert.match(await readFile(path.join(root, "reverfolio", "README_ZH.md"), "utf8"), /^---\nproject: reverfolio\nlanguage: zh\n---\n\n# 中文/);
    assert.equal(await readFile(path.join(root, "vidotter", "README.md"), "utf8"), existing);
    assert.deepEqual(await prepareProjectReadmes(root), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
