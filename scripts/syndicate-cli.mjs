import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function normalizeExplicitSyndicationArgs(argv) {
  if (argv.includes("--help") || argv.includes("-h")) return [...argv];

  const articleSelections = argv.filter((argument) => argument === "--article").length;
  const allSelections = argv.filter((argument) => argument === "--all").length;

  if (allSelections > 1) throw new Error("--all may only be specified once");
  if (allSelections > 0 && articleSelections > 0) {
    throw new Error("Choose either explicit --article selections or explicit --all, not both");
  }
  if (allSelections === 0 && articleSelections === 0) {
    throw new Error("Explicit article selection is required: use --article <slug>, or --all only when full syndication is intentional");
  }

  return argv.filter((argument) => argument !== "--all");
}

function main() {
  let args;
  try {
    args = normalizeExplicitSyndicationArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
    return;
  }

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const result = spawnSync(process.execPath, [path.join(scriptDir, "syndicate.mjs"), ...args], {
    stdio: "inherit",
    env: process.env,
  });

  if (result.error) {
    console.error(result.error);
    process.exitCode = 1;
    return;
  }
  process.exitCode = result.status ?? 1;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) main();
