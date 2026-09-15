import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildVersionedImportUrl,
  generateVersionedMediumImports,
  versionAssetUrls,
} from "./medium-version-import.mjs";

test("builds a versioned Medium import URL", () => {
  assert.equal(
    buildVersionedImportUrl("concurrency-series-00", "abc123"),
    "https://thinkerqaq.github.io/medium-import/en/concurrency-series-00/v-abc123/",
  );
});

test("rewrites generated diagram URLs into the versioned directory", () => {
  const html = '<img src="https://thinkerqaq.github.io/medium-import/en/concurrency-series-00/assets/text-diagram-01.png">';
  assert.equal(
    versionAssetUrls(html, "concurrency-series-00", "abc123"),
    '<img src="https://thinkerqaq.github.io/medium-import/en/concurrency-series-00/v-abc123/assets/text-diagram-01.png">',
  );
});

test("generates immutable versioned page, copied assets, and latest manifest", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "medium-version-"));
  const articleDir = path.join(root, "concurrency-series-00");
  const assets = path.join(articleDir, "assets");
  await mkdir(assets, { recursive: true });
  await writeFile(
    path.join(articleDir, "index.html"),
    '<html><img src="https://thinkerqaq.github.io/medium-import/en/concurrency-series-00/assets/text-diagram-01.png"></html>',
    "utf8",
  );
  await writeFile(path.join(assets, "text-diagram-01.png"), Buffer.from([1, 2, 3, 4]));

  const generated = await generateVersionedMediumImports({ outputRoot: root });
  assert.equal(generated.length, 1);
  const [{ version, importUrl }] = generated;
  assert.match(version, /^[a-f0-9]{12}$/u);
  assert.equal(
    importUrl,
    `https://thinkerqaq.github.io/medium-import/en/concurrency-series-00/v-${version}/`,
  );

  const versionedHtml = await readFile(
    path.join(articleDir, `v-${version}`, "index.html"),
    "utf8",
  );
  assert.match(versionedHtml, new RegExp(`/v-${version}/assets/text-diagram-01\\.png`, "u"));
  assert.deepEqual(
    await readFile(path.join(articleDir, `v-${version}`, "assets", "text-diagram-01.png")),
    Buffer.from([1, 2, 3, 4]),
  );

  const latest = JSON.parse(await readFile(path.join(articleDir, "latest.json"), "utf8"));
  assert.equal(latest.importUrl, importUrl);
});
