import assert from "node:assert/strict";
import { copyFile, lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The site owns its public search identity. Keep SyndiRelay's CI configuration
// transient, even though its source is checked out from a private repository.
export async function prepareSearchNotify({ siteRoot, relayRoot, dataRoot, googleProperty }) {
  const site = path.resolve(siteRoot);
  const relay = path.resolve(relayRoot);
  const data = path.resolve(dataRoot);
  assert.notEqual(site, relay, "Site and SyndiRelay checkouts must be separate");
  assert.ok(!data.startsWith(site + path.sep), "Search data must not be written inside the public site checkout");
  const config = JSON.parse(await readFile(path.join(site, "site.config.json"), "utf8"));
  const origin = new URL(config.url);
  assert.ok(origin.protocol === "https:" && origin.pathname === "/" && !origin.search && !origin.hash && !origin.username && !origin.password, "Site origin must be HTTPS without path or credentials");
  assert.ok(/^[A-Za-z0-9_-]{8,128}$/.test(config.indexNowKey || ""), "Missing or invalid site indexNowKey");

  const key = config.indexNowKey;
  const keyFile = path.join(site, "public", `${key}.txt`);
  assert.ok((await lstat(keyFile)).isFile(), "IndexNow verification key must be a regular file");
  assert.equal((await readFile(keyFile, "utf8")).trim(), key, "IndexNow verification file must match configured key");

  const property = googleProperty || `sc-domain:${origin.hostname}`;
  if (property.startsWith("sc-domain:")) {
    const domain = property.slice("sc-domain:".length);
    assert.ok(domain && (origin.hostname === domain || origin.hostname.endsWith(`.${domain}`)), "Search Console property must cover the site origin");
  } else {
    assert.equal(property, `${origin.origin}/`, "Search Console URL-prefix property must match the site origin");
  }
  // All interpolated values are validated above and contain no quotes/newlines.
  const toml = [
    `indexnow_key = "${key}"`,
    "",
    "[search]",
    `site_origin = "${origin.origin}"`,
    `url_list_url = "${origin.origin}/sitemap-all.txt"`,
    `sitemap_url = "${origin.origin}/sitemap-index.xml"`,
    `fingerprint_url = "${origin.origin}/sitemap-inventory.json"`,
    `google_property = "${property}"`,
    "",
  ].join("\n");
  await mkdir(data, { recursive: true, mode: 0o700 });
  await writeFile(path.join(data, "blogctl.toml"), toml, { mode: 0o600 });
  await mkdir(path.join(relay, "public"), { recursive: true });
  await copyFile(keyFile, path.join(relay, "public", `${key}.txt`));
  return { origin: origin.origin, keyFile: `${key}.txt`, googleProperty: property };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  if (args.length !== 6 || args[0] !== "--site" || args[2] !== "--relay" || args[4] !== "--data") {
    throw new Error("Usage: node scripts/prepare-search-notify.mjs --site <site> --relay <relay> --data <private-data-dir>");
  }
  prepareSearchNotify({
    siteRoot: args[1], relayRoot: args[3], dataRoot: args[5],
    googleProperty: process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL,
  }).then(
    (result) => console.log(JSON.stringify({ operation: "prepare-search-notify", status: "passed", ...result })),
    (error) => { console.error(error.message); process.exitCode = 1; },
  );
}
