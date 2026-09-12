import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const importerPath = path.join(scriptDir, "import-vnotes.mjs");
const testPath = path.join(scriptDir, "import-vnotes.test.mjs");

const oldResolver = `export function resolvePublishedNoteTarget(absoluteTarget, publicNoteIndex) {
  const resolvedTarget = path.resolve(absoluteTarget);
  const exact = publicNoteIndex.exact.get(resolvedTarget.toLowerCase());
  if (exact) return { ...exact, strategy: "exact" };

  const matches = publicNoteIndex.byBasename.get(path.basename(resolvedTarget).toLowerCase()) ?? [];
  if (matches.length === 1) return { ...matches[0], strategy: "unique-basename" };
  return undefined;
}`;

const newResolver = `export function resolvePublishedNoteTarget(
  absoluteTarget,
  publicNoteIndex,
  fileExists = existsSync,
) {
  const resolvedTarget = path.resolve(absoluteTarget);
  const exact = publicNoteIndex.exact.get(resolvedTarget.toLowerCase());
  if (exact) return { ...exact, strategy: "exact" };

  // If the original target still exists, it is a real unpublished note. Do not
  // redirect it to an unrelated public note that merely shares the same basename.
  if (fileExists(resolvedTarget)) return undefined;

  const matches = publicNoteIndex.byBasename.get(path.basename(resolvedTarget).toLowerCase()) ?? [];
  if (matches.length === 1) return { ...matches[0], strategy: "unique-basename" };
  return undefined;
}`;

const testAnchor = `test("distinguishes moved unpublished notes from truly missing targets", () => {`;
const regressionTest = `test("does not recover by basename when the original unpublished target still exists", () => {
  const published = path.resolve("fixtures", "Golang", "GC.md");
  const unpublished = path.resolve("fixtures", "Virtual_Machine", "GC.md");
  const index = createPublicNoteIndex([
    { sourceFile: published, importId: "go", route: "/notes/go/GC/" },
  ]);

  assert.equal(resolvePublishedNoteTarget(unpublished, index, () => true), undefined);
  assert.equal(resolvePublishedNoteTarget(unpublished, index, () => false)?.strategy, "unique-basename");
});

`;

const importer = await readFile(importerPath, "utf8");
if (!importer.includes(oldResolver)) {
  throw new Error("Expected old resolvePublishedNoteTarget implementation was not found");
}
await writeFile(importerPath, importer.replace(oldResolver, newResolver), "utf8");

const tests = await readFile(testPath, "utf8");
if (!tests.includes(testAnchor)) throw new Error("Expected VNote link test anchor was not found");
if (!tests.includes("does not recover by basename when the original unpublished target still exists")) {
  await writeFile(testPath, tests.replace(testAnchor, `${regressionTest}${testAnchor}`), "utf8");
}

console.log(JSON.stringify({
  operation: "patch-note-link-resolution",
  status: "completed",
}));
