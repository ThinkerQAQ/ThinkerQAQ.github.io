import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MAX_URLS = 50_000;

export function parseURLList(source, origin) {
  const urls = new Set();
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    assert.ok(/^https:\/\//i.test(line), "URL list must contain HTTPS URLs");
    const url = new URL(line);
    assert.equal(url.origin, origin, "URL list includes an unexpected origin");
    assert.ok(!url.username && !url.password && !url.hash && !url.search, "URL list contains credentials, query or fragment");
    urls.add(url.href);
    assert.ok(urls.size <= MAX_URLS, "URL list exceeds the supported size");
  }
  return urls;
}

export function calculateRemovedURLs(previousList, nextList, origin) {
  const previous = parseURLList(previousList, origin);
  const next = parseURLList(nextList, origin);
  assert.ok(next.size > 0, "Refusing to notify deletions from an empty current sitemap");
  return {
    oldCount: previous.size,
    newCount: next.size,
    removed: [...previous].filter((url) => !next.has(url)).sort(),
  };
}

export async function prepareRemovedURLNotifications({ siteRoot, newListPath, outputPath, fetchImpl = fetch }) {
  const config = JSON.parse(await readFile(path.join(siteRoot, "site.config.json"), "utf8"));
  const origin = new URL(config.url);
  assert.equal(origin.protocol, "https:", "Site must use HTTPS");
  assert.equal(origin.pathname, "/", "Site URL must be an origin");
  const output = path.resolve(outputPath);
  const newList = path.resolve(newListPath);
  const buildRoot = path.dirname(newList);
  const relativeOutput = path.relative(buildRoot, output);
  assert.ok(relativeOutput === ".." || relativeOutput.startsWith(".." + path.sep), "Deleted URL inventory must not be published in the static site");
  const response = await fetchImpl(new URL("/sitemap-all.txt", origin), {
    headers: { "cache-control": "no-cache" },
    signal: AbortSignal.timeout(20_000),
  });
  assert.ok(response.ok, "Could not fetch last published sitemap-all.txt: HTTP " + response.status);
  const previous = await response.text();
  assert.ok(previous.length < 12_000_000, "Previous URL list is unexpectedly large");
  const next = await readFile(newList, "utf8");
  const diff = calculateRemovedURLs(previous, next, origin.origin);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, diff.removed.join("\n") + (diff.removed.length ? "\n" : ""));
  return { ...diff, previousSource: new URL("/sitemap-all.txt", origin).href, removed: diff.removed.length };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const value = (flag) => args[args.indexOf(flag) + 1];
  if (args.length !== 6 || !["--site", "--new-list", "--output"].every((flag) => args.includes(flag) && value(flag))) {
    throw new Error("Usage: node scripts/prepare-removed-url-notifications.mjs --site <site> --new-list <new-sitemap-all.txt> --output <private-path>");
  }
  prepareRemovedURLNotifications({
    siteRoot: value("--site"),
    newListPath: value("--new-list"),
    outputPath: value("--output"),
  }).then(
    (result) => console.log(JSON.stringify({ operation: "prepare-removed-url-notifications", status: "passed", ...result })),
    (error) => { console.error(error.message); process.exitCode = 1; },
  );
}
