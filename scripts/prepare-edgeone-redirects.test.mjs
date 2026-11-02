import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { edgeOneRedirectConfig, prepareEdgeOneRedirects } from "./prepare-edgeone-redirects.mjs";

const currentConfig = JSON.parse(await readFile(new URL("../site.config.json", import.meta.url), "utf8"));

test("existing project slugs have bilingual, permanent, one-hop aliases", () => {
  const { redirects } = edgeOneRedirectConfig(currentConfig);
  for (const [oldSlug, newSlug] of [
    ["personal-blog-system", "inkerio"],
    ["blogctl", "syndirelay"],
    ["downkit", "vidotter"],
  ]) {
    for (const prefix of ["/projects/", "/en/projects/"]) {
      assert.deepEqual(redirects.find(item => item.source === prefix + oldSlug + "/"), {
        source: prefix + oldSlug + "/",
        destination: prefix + newSlug + "/",
        statusCode: 301,
      });
    }
  }
  assert.equal(redirects.length, currentConfig.legacyRedirects.exact.length);
});

test("rejects redirect loops, chains, duplicates and unsafe paths", () => {
  const entries = (exact) => ({ legacyRedirects: { exact } });
  assert.throws(() => edgeOneRedirectConfig(entries([{ from: "/a/", to: "/a/" }])), /itself/);
  assert.throws(() => edgeOneRedirectConfig(entries([{ from: "/a/", to: "/b/" }, { from: "/a/", to: "/c/" }])), /Duplicate/);
  assert.throws(() => edgeOneRedirectConfig(entries([{ from: "/a/", to: "/b/" }, { from: "/b/", to: "/c/" }])), /chains/);
  assert.throws(() => edgeOneRedirectConfig(entries([{ from: "/a/*/", to: "/b/" }])), /Invalid/);
});

test("generates EdgeOne rules only for a ready deployment with valid targets", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "edgeone-site-redirects-"));
  const siteRoot = path.join(root, "site");
  const distRoot = path.join(root, "dist");
  const config = { legacyRedirects: { exact: [{ from: "/en/projects/downkit/", to: "/en/projects/vidotter/" }] } };
  await mkdir(siteRoot, { recursive: true });
  await mkdir(distRoot, { recursive: true });
  await writeFile(path.join(siteRoot, "site.config.json"), JSON.stringify(config));
  await writeFile(path.join(distRoot, "index.html"), "home");
  await assert.rejects(prepareEdgeOneRedirects({ siteRoot, distRoot }), /ENOENT/);
  await mkdir(path.join(distRoot, "en/projects/vidotter"), { recursive: true });
  await writeFile(path.join(distRoot, "en/projects/vidotter/index.html"), "target");
  assert.deepEqual(await prepareEdgeOneRedirects({ siteRoot, distRoot }), { redirects: 1 });
  assert.deepEqual(JSON.parse(await readFile(path.join(distRoot, "edgeone.json"), "utf8")), {
    redirects: [{ source: "/en/projects/downkit/", destination: "/en/projects/vidotter/", statusCode: 301 }],
  });
  await assert.rejects(prepareEdgeOneRedirects({ siteRoot, distRoot }), /EEXIST/);
});
