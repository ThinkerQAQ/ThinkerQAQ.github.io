import assert from "node:assert/strict";
import { cp, lstat, mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The site integration repository owns its public identity and assets.
// Run after checking out a pinned engine and before assembling real content.
// Never copy private content or credentials into the public engine source.
async function assertRegularTree(root) {
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const file = path.join(root, entry.name);
    if (entry.isDirectory()) await assertRegularTree(file);
    else if (!entry.isFile()) throw new Error("Refusing symlink/non-regular public asset: " + file);
  }
}

export async function prepareDeployment({ engineRoot, siteRoot }) {
  const engine = path.resolve(engineRoot);
  const site = path.resolve(siteRoot);
  if (engine === site) throw new Error("Engine and site roots must be separate");
  const configSource = path.join(site, "site.config.json");
  const config = JSON.parse(await readFile(configSource, "utf8"));
  for (const field of ["title", "homeTitle", "homeTitleEn", "author", "description", "url", "commentsRepository"]) {
    assert.equal(typeof config[field], "string", "Missing site config field: " + field);
  }
  if (!config.url.startsWith("https://")) throw new Error("Site origin must be HTTPS");
  const origin = new URL(config.url);
  if (origin.pathname !== "/" || origin.search || origin.hash || origin.username || origin.password) {
    throw new Error("Site config URL must be an HTTPS origin, not a page or credential URL");
  }

  const publicRoot = path.join(site, "public");
  const targetPublic = path.join(engine, "public");
  await assertRegularTree(publicRoot);
  await mkdir(targetPublic, { recursive: true });
  const assets = await readdir(publicRoot, { withFileTypes: true });
  for (const entry of assets) {
    await cp(path.join(publicRoot, entry.name), path.join(targetPublic, entry.name), {
      recursive: entry.isDirectory(),
      force: true,
    });
  }
  await cp(configSource, path.join(engine, "site.config.json"), { force: true });
  return { origin: origin.origin, assets: assets.length };
}

const main = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (main) {
  const args = process.argv.slice(2);
  if (args.length !== 4 || args[0] !== "--engine" || args[2] !== "--site") {
    throw new Error("Usage: node scripts/prepare-inkerio-deployment.mjs --engine <path> --site <path>");
  }
  prepareDeployment({ engineRoot: args[1], siteRoot: args[3] }).then(
    (result) => console.log(JSON.stringify({ operation: "prepare-inkerio-deployment", status: "passed", ...result })),
    (error) => { console.error(error.message); process.exitCode = 1; },
  );
}
