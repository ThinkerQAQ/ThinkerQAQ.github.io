import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as pagefind from "pagefind";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
async function hasSearchContent(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory() && await hasSearchContent(file)) return true;
    if (entry.isFile() && entry.name.endsWith(".html") && /<[^>]+\bdata-pagefind-body(?:\s|>)/.test(await readFile(file, "utf8"))) return true;
  }
  return false;
}
function check(result) {
  if (result.errors?.length) throw new Error(result.errors.join("; "));
  return result;
}
try {
  if (await hasSearchContent(dist)) {
    const { index } = check(await pagefind.createIndex());
    if (!index) throw new Error("Could not create search index");
    check(await index.addDirectory({ path: dist }));
    check(await index.writeFiles({ outputPath: path.join(dist, "pagefind") }));
    console.log(JSON.stringify({ operation: "build-search", status: "completed" }));
  } else {
    console.log(JSON.stringify({ operation: "build-search", status: "empty", indexedPages: 0 }));
  }
} catch (error) {
  console.error(JSON.stringify({ operation: "build-search", status: "failed", error: error.message }));
  process.exitCode = 1;
} finally {
  await pagefind.close();
}
