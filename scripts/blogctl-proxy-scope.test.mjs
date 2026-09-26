import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const manifestPath = new URL("../tools/blogctl/extension/manifest.json", import.meta.url);
const backgroundPath = new URL("../tools/blogctl/extension/background.js", import.meta.url);

test("BlogCTL proxy stays scoped to BlogCTL components", async () => {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const background = await readFile(backgroundPath, "utf8");

  assert.equal((manifest.permissions || []).includes("proxy"), false);
  assert.doesNotMatch(background, /chrome\.proxy/u);
  assert.doesNotMatch(background, /proxy\.settings/u);
  assert.doesNotMatch(background, /pac_script|fixed_servers/u);
});

test("extension only edits Bridge proxy configuration", async () => {
  const background = await readFile(backgroundPath, "utf8");
  assert.match(background, /fetchJSON\("\/v1\/config", jsonOptions\("PUT", payload\)\)/u);
  assert.match(background, /proxyEnabled/u);
  assert.match(background, /proxyHost/u);
  assert.match(background, /proxyPort/u);
});
