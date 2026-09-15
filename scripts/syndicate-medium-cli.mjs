import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnglishArticles } from "./syndicate.mjs";
import { runMediumSyndication } from "./syndicate-medium.mjs";

function log(severity, operation, status, details = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    severity,
    operation,
    status,
    ...details,
  }));
}

export function parseMediumArguments(argv) {
  const options = { requestedSlugs: [], dryRun: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--article") {
      const value = argv[++index];
      if (!value || value.startsWith("--")) throw new Error("--article requires a value");
      options.requestedSlugs.push(value);
    } else if (argument === "--dry-run") options.dryRun = true;
    else if (argument === "--draft") {
      // Medium M0 is always draft-only. Keep this accepted for CLI symmetry.
    } else if (argument === "--help" || argument === "-h") options.help = true;
    else throw new Error(`Unsupported Medium option: ${argument}`);
  }
  return options;
}

function printHelp() {
  console.log(`Medium draft syndication\n\nUsage:\n  npm run syndicate -- --article <slug> --platforms medium [--dry-run]\n\nLive mode starts a loopback-only bridge, waits for the ThinkerQAQ Medium Bridge extension to send the current browser session, then creates a Medium draft. It never publishes.\n\n--dry-run does not contact Medium and writes a copy/paste HTML fallback under .distribution/medium/.`);
}

async function main() {
  const options = parseMediumArguments(process.argv.slice(2));
  if (options.help) return printHelp();
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const repositoryRoot = path.resolve(scriptDir, "..");
  const loaded = await loadEnglishArticles({
    articleRoot: path.join(repositoryRoot, "src/content/articles/en"),
    requestedSlugs: options.requestedSlugs,
  });
  const summary = await runMediumSyndication(loaded, {
    dryRun: options.dryRun,
    outputRoot: path.join(repositoryRoot, ".distribution/medium"),
    onEvent: (event) => log("info", "syndication-medium", event.status, event),
  });
  log("info", "syndication-medium", "completed", summary);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  main().catch((error) => {
    log("error", "syndication-medium", "failed", {
      exception: { name: error.name, message: error.message, stack: error.stack },
    });
    process.exitCode = 1;
  });
}
