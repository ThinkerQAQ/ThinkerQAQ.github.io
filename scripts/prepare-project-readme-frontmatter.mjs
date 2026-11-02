import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Content snapshots can contain upstream README files without Astro metadata.
// Add it only in the assembled tree; upstream project README files remain intact.
export async function prepareProjectReadmes(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const touched = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !/^[a-z0-9][a-z0-9-]*$/.test(entry.name)) continue;
    for (const [filename, language] of [["README.md", "en"], ["README_ZH.md", "zh"]]) {
      const target = path.join(root, entry.name, filename);
      let content;
      try {
        content = await readFile(target, "utf8");
      } catch (err) {
        if (err?.code === "ENOENT") continue;
        throw err;
      }
      if (/^(?:\uFEFF)?---\r?\n/.test(content)) continue;
      const frontmatter = "---\nproject: " + entry.name + "\nlanguage: " + language + "\n---\n\n";
      await writeFile(target, frontmatter + content, "utf8");
      touched.push(entry.name + "/" + filename);
    }
  }
  return touched;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (!process.argv[2]) throw new Error("Pass the assembled project content directory");
  const touched = await prepareProjectReadmes(process.argv[2]);
  console.log(JSON.stringify({ operation: "prepare-project-readmes", touched }));
}
