import assert from "node:assert/strict";
import test from "node:test";

import {
  fetchRemoteInventory,
  normalizeRemoteInventory,
  runBridgeCommand,
} from "./bridge-cli.mjs";

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
    /must use origin/u,
  );
});

test("fetchRemoteInventory reads live text sitemap semantics", async () => {
  const inventory = await fetchRemoteInventory({
    origin: "https://thinkerqaq.github.io",
    fetchImpl: async (url) => {
      assert.equal(url, "https://thinkerqaq.github.io/sitemap-all.txt");
      return new Response(
        "https://thinkerqaq.github.io/a/\nhttps://thinkerqaq.github.io/b/\n",
        { status: 200 },
      );
    },
  });
  assert.equal(inventory.total, 2);
  assert.deepEqual(inventory.urls, [
    "https://thinkerqaq.github.io/a/",
    "https://thinkerqaq.github.io/b/",
  ]);
});

test("bridge inventory command does not require Google credentials", async () => {
  const result = await runBridgeCommand("inventory", {}, {
    env: {},
    fetchImpl: async () => new Response(
      "https://thinkerqaq.github.io/a/\n",
      { status: 200 },
    ),
  });
  assert.equal(result.total, 1);
  assert.equal(result.urls[0], "https://thinkerqaq.github.io/a/");
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
