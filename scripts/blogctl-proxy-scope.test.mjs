import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const manifestPath = new URL("../tools/blogctl/extension/manifest.json", import.meta.url);
const backgroundPath = new URL("../tools/blogctl/extension/background.js", import.meta.url);

test("BlogCTL proxy stays scoped to BlogCTL components", async () => {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const background = await readFile(backgroundPath, "utf8");

  const migrationVersion = background.match(/LEGACY_BROWSER_PROXY_MIGRATION_VERSION = "([^"]+)"/u)?.[1];
  assert.equal(migrationVersion, "0.1.95");
  assert.notEqual(migrationVersion, manifest.version);
  assert.equal((manifest.permissions || []).includes("proxy"), true);
  assert.doesNotMatch(background, /chrome\.proxy\.settings\.set/u);
  assert.match(background, /chrome\.proxy\.settings\.clear/u);
  assert.doesNotMatch(background, /pac_script|fixed_servers/u);
});

test("extension only edits Bridge proxy configuration", async () => {
  const background = await readFile(backgroundPath, "utf8");
  assert.match(background, /fetchJSON\("\/v1\/config", jsonOptions\("PUT", payload\)\)/u);
  assert.match(background, /proxyEnabled/u);
  assert.match(background, /proxyHost/u);
  assert.match(background, /proxyPort/u);
});
