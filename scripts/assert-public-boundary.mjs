import { execFileSync } from "node:child_process";

const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean)
  .map((path) => path.replaceAll("\\", "/"));

const forbiddenPrefixes = [
  "src/content/",
  "public/media/",
  "scripts/data/",
];

const forbiddenExact = new Set([
  "src/data/content-manifest.json",
  "scripts/import-vnotes.mjs",
  "scripts/import-vnotes.test.mjs",
  "scripts/backfill-vnote-metadata.mjs",
  "scripts/backfill-vnote-metadata.test.mjs",
  "scripts/apply-note-topics.mjs",
  "scripts/apply-note-topics.test.mjs",
  "scripts/assert-note-privacy.mjs",
  "scripts/seed-articles.mjs",
  "scripts/verify-article-note-relations.mjs",
  "scripts/verify-build-with-curated-notes.mjs",
  "scripts/verify-computer-network-hierarchy.mjs",
  "docs/vnote-source-timestamps.md",
  ".github/workflows/full-site-i18n-validate.yml",
  ".github/workflows/system-design-restore.yml",
  ".github/workflows/syndicate.yml",
]);

const violations = tracked.filter((path) =>
  forbiddenExact.has(path) || forbiddenPrefixes.some((prefix) => path.startsWith(prefix)),
);

if (violations.length) {
  console.error("Public repository boundary violation(s):");
  for (const path of violations) console.error(`- ${path}`);
  process.exit(1);
}

console.log(JSON.stringify({
  operation: "assert-public-boundary",
  status: "passed",
  trackedFiles: tracked.length,
}));
