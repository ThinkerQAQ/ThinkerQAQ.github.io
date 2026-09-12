import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const importerPath = path.join(scriptDir, "import-vnotes.mjs");
const testPath = path.join(scriptDir, "import-vnotes.test.mjs");

const currentResolver = `export function resolvePublishedNoteTarget(
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

const fixedResolver = `export function resolvePublishedNoteTarget(
  absoluteTarget,
  publicNoteIndex,
  fileExists = existsSync,
  sourceFile,
) {
  const resolvedTarget = path.resolve(absoluteTarget);
  const exact = publicNoteIndex.exact.get(resolvedTarget.toLowerCase());
  if (exact) return { ...exact, strategy: "exact" };

  // If the original target still exists, it is a real unpublished note. Do not
  // redirect it to an unrelated public note that merely shares the same basename.
  if (fileExists(resolvedTarget)) return undefined;

  // A missing cross-folder link can share a basename with the current note. Never
  // "recover" that stale link as a self-link; only a different unique public note
  // is a valid basename recovery candidate.
  const sourceKey = sourceFile ? path.resolve(sourceFile).toLowerCase() : undefined;
  const matches = (publicNoteIndex.byBasename.get(path.basename(resolvedTarget).toLowerCase()) ?? [])
    .filter((candidate) => !sourceKey || candidate.sourceFile.toLowerCase() !== sourceKey);
  if (matches.length === 1) return { ...matches[0], strategy: "unique-basename" };
  return undefined;
}`;

const currentCall = `? resolvePublishedNoteTarget(absoluteTarget, publicNoteIndex)\n        : undefined;`;
const fixedCall = `? resolvePublishedNoteTarget(absoluteTarget, publicNoteIndex, existsSync, sourceFile)\n        : undefined;`;

const testAnchor = `test("does not recover by basename when the original unpublished target still exists", () => {`;
const selfLinkRegression = `test("does not recover a missing cross-folder target as a self link", () => {
  const current = path.resolve("fixtures", "Golang", "GC.md");
  const missingCrossFolder = path.resolve("fixtures", "Virtual_Machine", "GC.md");
  const index = createPublicNoteIndex([
    { sourceFile: current, importId: "go", route: "/notes/go/GC/" },
  ]);

  assert.equal(
    resolvePublishedNoteTarget(missingCrossFolder, index, () => false, current),
    undefined,
  );
});

`;

let importer = await readFile(importerPath, "utf8");
if (!importer.includes(currentResolver)) {
  throw new Error("Expected current resolvePublishedNoteTarget implementation was not found");
}
if (!importer.includes(currentCall)) {
  throw new Error("Expected current resolvePublishedNoteTarget call was not found");
}
importer = importer.replace(currentResolver, fixedResolver).replace(currentCall, fixedCall);
await writeFile(importerPath, importer, "utf8");

const tests = await readFile(testPath, "utf8");
if (!tests.includes(testAnchor)) throw new Error("Expected VNote link regression anchor was not found");
if (!tests.includes("does not recover a missing cross-folder target as a self link")) {
  await writeFile(testPath, tests.replace(testAnchor, `${selfLinkRegression}${testAnchor}`), "utf8");
}

console.log(JSON.stringify({
  operation: "patch-note-link-resolution",
  status: "completed",
}));
