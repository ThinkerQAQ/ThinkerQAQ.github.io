import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SUPPORTED_PLATFORMS = new Set(["devto", "medium"]);

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

export function extractRequestedPlatforms(argv) {
  const index = argv.indexOf("--platforms");
  if (index === -1) return ["devto"];
  const raw = argv[index + 1];
  if (!raw || raw.startsWith("--")) throw new Error("--platforms requires a value");
  const platforms = raw.split(",").map((value) => value.trim()).filter(Boolean);
  if (platforms.length === 0) throw new Error("--platforms requires at least one platform");
  const unsupported = platforms.filter((platform) => !SUPPORTED_PLATFORMS.has(platform));
  if (unsupported.length > 0) throw new Error(`Unsupported platform: ${unsupported.join(", ")}`);
  return [...new Set(platforms)];
}

function removePlatformsArg(argv) {
  const output = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--platforms") {
      index += 1;
      continue;
    }
    output.push(argv[index]);
  }
  return output;
}

function runChild(script, args) {
  const result = spawnSync(process.execPath, [script, ...args], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

function main() {
  let args;
  let platforms;
  try {
    args = normalizeExplicitSyndicationArgs(process.argv.slice(2));
    platforms = extractRequestedPlatforms(args);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
    return;
  }

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const baseArgs = removePlatformsArg(args);

  for (const platform of platforms) {
    const script = platform === "medium"
      ? path.join(scriptDir, "syndicate-medium-cli.mjs")
      : path.join(scriptDir, "syndicate.mjs");
    const platformArgs = platform === "devto"
      ? [...baseArgs, "--platforms", "devto"]
      : baseArgs;
    try {
      const status = runChild(script, platformArgs);
      if (status !== 0) {
        process.exitCode = status;
        return;
      }
    } catch (error) {
      console.error(error);
      process.exitCode = 1;
      return;
    }
  }

  process.exitCode = 0;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) main();
