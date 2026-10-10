import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "tools/blogctl/extension");
const directories = [root, path.join(root, "popup")];
let count = 0;
for (const directory of directories) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".js") || entry.name.endsWith("-vendor.js")) continue;
    const filename = path.join(directory, entry.name);
    const result = spawnSync(process.execPath, ["--check", filename], { stdio: "inherit" });
    if (result.status !== 0) process.exit(result.status ?? 1);
    count++;
  }
}
console.log(`BlogCTL extension syntax: ${count} source files passed.`);
