import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The site wrapper owns redirect mappings. EdgeOne receives an optional HTTP
// 301 layer; Inkerio still builds portable HTML fallbacks for GitHub Pages.
function exactSitePath(value) {
  return typeof value === "string"
    && value.startsWith("/")
    && value.endsWith("/")
    && !value.includes("//")
    && !/[\\?#%:*]/.test(value)
    && !value.split("/").some(part => part === "." || part === "..");
}

export function edgeOneRedirectConfig(siteConfig) {
  const entries = siteConfig?.legacyRedirects?.exact ?? [];
  assert.ok(Array.isArray(entries), "legacyRedirects.exact must be an array");
  assert.ok(entries.length <= 100, "EdgeOne supports at most 100 redirects");

  const sources = new Set();
  const redirects = entries.map(({ from, to }) => {
    assert.ok(exactSitePath(from) && exactSitePath(to), "Invalid exact redirect path");
    assert.notEqual(from, to, "A redirect cannot target itself");
    assert.ok(!sources.has(from), "Duplicate redirect source: " + from);
    sources.add(from);
    return { source: from, destination: to, statusCode: 301 };
  });
  for (const { destination } of redirects) {
    assert.ok(!sources.has(destination), "Redirect chains are not allowed: " + destination);
  }
  return { redirects };
}

export async function prepareEdgeOneRedirects({ siteRoot, distRoot }) {
  const siteConfig = JSON.parse(await readFile(path.join(siteRoot, "site.config.json"), "utf8"));
  const edgeConfig = edgeOneRedirectConfig(siteConfig);
  await readFile(path.join(distRoot, "index.html"));

  // Permanent redirects must never send users to missing targets.
  for (const entry of edgeConfig.redirects) {
    await readFile(path.join(distRoot, entry.destination.slice(1), "index.html"));
  }
  await writeFile(path.join(distRoot, "edgeone.json"), JSON.stringify(edgeConfig, null, 2) + "\n", { flag: "wx" });
  return { redirects: edgeConfig.redirects.length };
}

const main = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (main) {
  const args = process.argv.slice(2);
  if (args.length !== 4 || args[0] !== "--site" || args[2] !== "--dist") {
    throw new Error("Usage: node scripts/prepare-edgeone-redirects.mjs --site <site> --dist <dist>");
  }
  prepareEdgeOneRedirects({ siteRoot: path.resolve(args[1]), distRoot: path.resolve(args[3]) }).then(
    result => console.log(JSON.stringify({ operation: "prepare-edgeone-redirects", status: "passed", ...result })),
    error => { console.error(error.message); process.exitCode = 1; },
  );
}
