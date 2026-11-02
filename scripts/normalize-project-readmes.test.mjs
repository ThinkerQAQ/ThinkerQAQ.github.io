import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { normalizeProjectReadmes } from "./normalize-project-readmes.mjs";

async function fixture(slug = "sample-project") {
  const root = await mkdtemp(path.join(os.tmpdir(), "project-readme-normalizer-"));
  const projects = path.join(root, "src/content/projects");
  const project = path.join(projects, slug);
  await mkdir(project, { recursive: true });
  return { root, projects, project };
}

test("injects project/language only for missing frontmatter in assembled copy", async () => {
  const { root, project } = await fixture("reverfolio");
  await writeFile(path.join(project, "README.md"), "# Reverfolio\n\nEnglish text\n");
  await writeFile(path.join(project, "README_ZH.md"), "# Reverfolio\n\n中文内容\n");
  assert.deepEqual(await normalizeProjectReadmes(root), { normalized: 2, unchanged: 0 });
  assert.equal(await readFile(path.join(project, "README.md"), "utf8"),
    "---\nproject: reverfolio\nlanguage: en\n---\n\n# Reverfolio\n\nEnglish text\n");
  assert.match(await readFile(path.join(project, "README_ZH.md"), "utf8"), /^---\nproject: reverfolio\nlanguage: zh\n---\n/);
});

test("preserves existing metadata and is idempotent", async () => {
  const { root, project } = await fixture();
  const original = "---\nproject: sample-project\nlanguage: en\n---\n\n# Original README\n";
  await writeFile(path.join(project, "README.md"), original);
  assert.deepEqual(await normalizeProjectReadmes(root), { normalized: 0, unchanged: 1 });
  assert.equal(await readFile(path.join(project, "README.md"), "utf8"), original);
  assert.deepEqual(await normalizeProjectReadmes(root), { normalized: 0, unchanged: 1 });
});

test("ignores other documents", async () => {
  const { root, project } = await fixture();
  await writeFile(path.join(project, "notes.md"), "Ordinary note");
  assert.deepEqual(await normalizeProjectReadmes(root), { normalized: 0, unchanged: 0 });
  assert.equal(await readFile(path.join(project, "notes.md"), "utf8"), "Ordinary note");
});

test("rejects symlinked README files", async () => {
  const { root, project } = await fixture();
  await symlink("/etc/passwd", path.join(project, "README.md"));
  await assert.rejects(normalizeProjectReadmes(root), /regular file/);
});

test("rejects unsafe project slugs", async () => {
  const { root } = await fixture("Bad Name");
  await assert.rejects(normalizeProjectReadmes(root), /Invalid project directory/);
});
