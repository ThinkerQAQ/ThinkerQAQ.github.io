import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const startedAt = Date.now();
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const distRoot = path.resolve(repositoryRoot, "dist");

if (path.dirname(distRoot) !== repositoryRoot || path.basename(distRoot) !== "dist") {
  throw new Error(`Refusing to remove unexpected build directory: ${distRoot}`);
}

console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  severity: "info",
  operation: "clean-dist",
  status: "started",
  target: distRoot,
}));

await rm(distRoot, { recursive: true, force: true });

console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  severity: "info",
  operation: "clean-dist",
  status: "completed",
  target: distRoot,
  durationMs: Date.now() - startedAt,
}));
