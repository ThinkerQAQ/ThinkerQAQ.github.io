import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { prepareSearchNotify } from "./prepare-search-notify.mjs";

const KEY = "fb26fca3ba9449c6816b6d79b0a41cec";
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "site-search-config-"));
  const siteRoot = path.join(root, "site");
  const relayRoot = path.join(root, "relay");
  const dataRoot = path.join(root, "data");
  await mkdir(path.join(siteRoot, "public"), { recursive: true });
  await mkdir(relayRoot);
  await writeFile(path.join(siteRoot, "site.config.json"), JSON.stringify({ url: "https://example.com", indexNowKey: KEY }));
  await writeFile(path.join(siteRoot, "public", `${KEY}.txt`), `${KEY}\n`);
  return { siteRoot, relayRoot, dataRoot };
}

test("generates an isolated, domain-scoped search config and copies the verification file", async () => {
  const args = await fixture();
  const result = await prepareSearchNotify({ ...args, googleProperty: "sc-domain:example.com" });
  assert.equal(result.origin, "https://example.com");
  assert.match(await readFile(path.join(args.dataRoot, "blogctl.toml"), "utf8"), /site_origin = "https:\/\/example.com"/);
  assert.match(await readFile(path.join(args.dataRoot, "blogctl.toml"), "utf8"), /google_property = "sc-domain:example.com"/);
  assert.equal((await readFile(path.join(args.relayRoot, "public", `${KEY}.txt`), "utf8")).trim(), KEY);
});

test("rejects a mismatched search property before emitting a config", async () => {
  const args = await fixture();
  await assert.rejects(prepareSearchNotify({ ...args, googleProperty: "sc-domain:another-site.com" }), /must cover/);
});

test("rejects an invalid or symlinked indexnow key file", async () => {
  const args = await fixture();
  await writeFile(path.join(args.siteRoot, "public", `${KEY}.txt`), "wrong");
  await assert.rejects(prepareSearchNotify(args), /must match/);
});

test("rejects writing transient credentials into the site checkout", async () => {
  const args = await fixture();
  await assert.rejects(prepareSearchNotify({ ...args, dataRoot: path.join(args.siteRoot, "data") }), /must not be written/);
});
