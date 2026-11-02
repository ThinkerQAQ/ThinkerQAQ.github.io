import assert from "node:assert/strict";
import { lstat, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Normalize only disposable assembled build inputs. Never edit the original
// blog-content README, which is valid standalone Markdown without metadata.
export async function normalizeProjectReadmes(engineRoot) {
  const root = path.resolve(engineRoot, "src/content/projects");
  const folders = await readdir(root, { withFileTypes: true });
  let normalized = 0;
  let unchanged = 0;
  for (const folder of folders) {
    if (!folder.isDirectory()) continue;
    const slug = folder.name;
    assert.match(slug, /^[a-z0-9][a-z0-9-]*$/, "Invalid project directory");
    const contents = await readdir(path.join(root, slug), { withFileTypes: true });
    for (const entry of contents) {
      if (entry.name !== "README.md" && entry.name !== "README_ZH.md") continue;
      const filepath = path.join(root, slug, entry.name);
      const info = await lstat(filepath);
      if (!info.isFile()) throw new Error("Project README must be a regular file: " + filepath);
      const original = await readFile(filepath, "utf8");
      if (/^---\r?\n/.test(original)) {
        unchanged += 1;
        continue;
      }
      const language = entry.name === "README_ZH.md" ? "zh" : "en";
      const header = "---\nproject: " + slug + "\nlanguage: " + language + "\n---\n\n";
      await writeFile(filepath, header + original, "utf8");
      normalized += 1;
    }
  }
  return { normalized, unchanged };
}
const direct = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (direct) {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== "--engine") {
    throw new Error("Usage: node scripts/normalize-project-readmes.mjs --engine <engine-root>");
  }
  normalizeProjectReadmes(args[1]).then(
    counts => console.log(JSON.stringify({ status: "passed", operation: "normalize-project-readmes", ...counts })),
    error => { console.error(error.message); process.exitCode = 1; },
  );
}
