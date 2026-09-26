import assert from "node:assert/strict";
import test from "node:test";

import {
  assertProxyRuntimeSupport,
  diffRemoteInventories,
  fetchRemoteInventory,
  normalizeFingerprintManifest,
  normalizeRemoteInventory,
  nodeSupportsEnvironmentProxy,
  runBridgeCommand,
} from "./bridge-cli.mjs";

test("proxy runtime support requires Node 22.21+ or 24+", () => {
  assert.equal(nodeSupportsEnvironmentProxy("22.20.0"), false);
  assert.equal(nodeSupportsEnvironmentProxy("22.21.0"), true);
  assert.equal(nodeSupportsEnvironmentProxy("23.9.0"), false);
  assert.equal(nodeSupportsEnvironmentProxy("24.0.0"), true);
  assert.doesNotThrow(() => assertProxyRuntimeSupport({ BLOGCTL_PROXY_REQUIRED: "1" }, "22.21.0"));
  assert.throws(
    () => assertProxyRuntimeSupport({ BLOGCTL_PROXY_REQUIRED: "1" }, "22.20.0"),
    /requires Node\.js 22\.21\+/u,
  );
  assert.doesNotThrow(() => assertProxyRuntimeSupport({}, "22.20.0"));
});

test("normalizeRemoteInventory deduplicates, sorts, strips hashes, and keeps site URLs", () => {
  const urls = normalizeRemoteInventory(
    [
      "https://thinkerqaq.github.io/b/#fragment",
      "https://thinkerqaq.github.io/a/",
      "",
      "https://thinkerqaq.github.io/b/",
    ].join("\n"),
    "https://thinkerqaq.github.io",
  );
  assert.deepEqual(urls, [
    "https://thinkerqaq.github.io/a/",
    "https://thinkerqaq.github.io/b/",
  ]);
});

test("normalizeRemoteInventory rejects cross-origin URLs", () => {
  assert.throws(
    () => normalizeRemoteInventory(
      "https://example.com/a/",
      "https://thinkerqaq.github.io",
    ),
    new RegExp("must use https://thinkerqaq\\.github\\.io", "u"),
  );
});

test("fetchRemoteInventory reads text sitemap plus optional fingerprints", async () => {
  const hashes = {
    "https://thinkerqaq.github.io/a/": "a".repeat(64),
    "https://thinkerqaq.github.io/b/": "b".repeat(64),
  };
  const inventory = await fetchRemoteInventory({
    origin: "https://thinkerqaq.github.io",
    fetchImpl: async (url) => {
      if (url === "https://thinkerqaq.github.io/sitemap-all.txt") {
        return new Response(
          "https://thinkerqaq.github.io/a/\nhttps://thinkerqaq.github.io/b/\n",
          { status: 200 },
        );
      }
      assert.equal(url, "https://thinkerqaq.github.io/sitemap-inventory.json");
      return new Response(JSON.stringify({
        origin: "https://thinkerqaq.github.io",
        fingerprints: hashes,
      }), { status: 200 });
    },
  });
  assert.equal(inventory.total, 2);
  assert.equal(inventory.fingerprintCoverage, 2);
  assert.deepEqual(inventory.fingerprints, hashes);
  assert.deepEqual(inventory.urls, [
    "https://thinkerqaq.github.io/a/",
    "https://thinkerqaq.github.io/b/",
  ]);
});

test("normalizeFingerprintManifest rejects invalid hashes and ignores stale URLs", () => {
  const urls = ["https://thinkerqaq.github.io/a/"];
  assert.throws(
    () => normalizeFingerprintManifest({
      origin: "https://thinkerqaq.github.io",
      fingerprints: { "https://thinkerqaq.github.io/a/": "bad" },
    }, urls, "https://thinkerqaq.github.io"),
    /Invalid SHA-256 fingerprint/u,
  );
  assert.deepEqual(
    normalizeFingerprintManifest({
      origin: "https://thinkerqaq.github.io",
      fingerprints: {
        "https://thinkerqaq.github.io/a/": "a".repeat(64),
        "https://thinkerqaq.github.io/removed/": "b".repeat(64),
      },
    }, urls, "https://thinkerqaq.github.io"),
    { "https://thinkerqaq.github.io/a/": "a".repeat(64) },
  );
});

test("diffRemoteInventories submits only added changed and deleted URLs in incremental mode", () => {
  const previous = {
    urls: [
      "https://thinkerqaq.github.io/a/",
      "https://thinkerqaq.github.io/b/",
      "https://thinkerqaq.github.io/deleted/",
    ],
    fingerprints: {
      "https://thinkerqaq.github.io/a/": "a".repeat(64),
      "https://thinkerqaq.github.io/b/": "b".repeat(64),
      "https://thinkerqaq.github.io/deleted/": "d".repeat(64),
    },
  };
  const current = {
    urls: [
      "https://thinkerqaq.github.io/a/",
      "https://thinkerqaq.github.io/b/",
      "https://thinkerqaq.github.io/new/",
    ],
    fingerprints: {
      "https://thinkerqaq.github.io/a/": "a".repeat(64),
      "https://thinkerqaq.github.io/b/": "c".repeat(64),
      "https://thinkerqaq.github.io/new/": "n".repeat(64),
    },
  };
  const diff = diffRemoteInventories(previous, current, { mode: "incremental" });
  assert.deepEqual(diff.selected, [
    "https://thinkerqaq.github.io/b/",
    "https://thinkerqaq.github.io/deleted/",
    "https://thinkerqaq.github.io/new/",
  ]);
  assert.equal(diff.addedCount, 1);
  assert.equal(diff.changedCount, 1);
  assert.equal(diff.deletedCount, 1);
  assert.equal(diff.unchangedCount, 1);
});

test("diffRemoteInventories treats missing hashes conservatively and full mode resubmits current URLs", () => {
  const previous = {
    urls: ["https://thinkerqaq.github.io/a/"],
    fingerprints: {},
  };
  const current = {
    urls: ["https://thinkerqaq.github.io/a/", "https://thinkerqaq.github.io/b/"],
    fingerprints: {},
  };
  const incremental = diffRemoteInventories(previous, current, { mode: "incremental" });
  assert.equal(incremental.changedCount, 1);
  assert.equal(incremental.addedCount, 1);
  assert.equal(incremental.selectedCount, 2);

  const full = diffRemoteInventories(previous, current, { mode: "full" });
  assert.deepEqual(full.selected, [
    "https://thinkerqaq.github.io/a/",
    "https://thinkerqaq.github.io/b/",
  ]);
});

test("bridge inventory command does not require Google credentials", async () => {
  const result = await runBridgeCommand("inventory", {}, {
    env: {},
    fetchImpl: async (url) => {
      if (url.endsWith("/sitemap-all.txt")) {
        return new Response("https://thinkerqaq.github.io/a/\n", { status: 200 });
      }
      return new Response("not deployed yet", { status: 404 });
    },
  });
  assert.equal(result.total, 1);
  assert.equal(result.fingerprintCoverage, 0);
  assert.equal(result.urls[0], "https://thinkerqaq.github.io/a/");
});

test("Bing integration check validates the key file without fetching sitemap inventory", async () => {
  const seen = [];
  const result = await runBridgeCommand("bing-check", {}, {
    env: {
      INDEXNOW_ENDPOINT: "https://www.bing.com/indexnow",
      INDEXNOW_KEY: "abcdefgh12345678",
      INDEXNOW_KEY_LOCATION: "https://thinkerqaq.github.io/abcdefgh12345678.txt",
    },
    fetchImpl: async (url) => {
      seen.push(url);
      assert.equal(url, "https://thinkerqaq.github.io/abcdefgh12345678.txt");
      return new Response("abcdefgh12345678\n", { status: 200 });
    },
  });
  assert.deepEqual(seen, ["https://thinkerqaq.github.io/abcdefgh12345678.txt"]);
  assert.equal(result.keyFileStatus, 200);
  assert.equal(result.endpoint, "https://www.bing.com/indexnow");
});

test("bridge status reports Google credential availability without exposing credentials", async () => {
  const result = await runBridgeCommand("status", {}, {
    env: {
      GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON: "{secret}",
    },
  });
  assert.equal(result.googleCredentialsConfigured, true);
  assert.equal(JSON.stringify(result).includes("{secret}"), false);
});
