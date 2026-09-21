import assert from "node:assert/strict";
import test from "node:test";

import {
  chunkUrls,
  prepareIndexNowPayload,
  submitIndexNowUrls,
} from "./indexnow.mjs";

const config = {
  origin: "https://thinkerqaq.github.io",
  host: "thinkerqaq.github.io",
  key: "abcdefgh12345678",
  keyLocation: "https://thinkerqaq.github.io/abcdefgh12345678.txt",
  endpoint: "https://api.indexnow.org/indexnow",
};

test("prepareIndexNowPayload validates, deduplicates and sorts URLs", () => {
  assert.deepEqual(
    prepareIndexNowPayload([
      "https://thinkerqaq.github.io/b/",
      "https://thinkerqaq.github.io/a/",
      "https://thinkerqaq.github.io/b/",
    ], config).urlList,
    [
      "https://thinkerqaq.github.io/a/",
      "https://thinkerqaq.github.io/b/",
    ],
  );
  assert.throws(
    () => prepareIndexNowPayload(["https://example.com/"], config),
    /must use https:\/\/thinkerqaq\.github\.io/u,
  );
});

test("chunkUrls splits large batches deterministically", () => {
  assert.deepEqual(chunkUrls(["a", "b", "c", "d", "e"], 2), [
    ["a", "b"],
    ["c", "d"],
    ["e"],
  ]);
});

test("submitIndexNowUrls accepts 202 and batches requests", async () => {
  const calls = [];
  const result = await submitIndexNowUrls([
    "https://thinkerqaq.github.io/a/",
    "https://thinkerqaq.github.io/b/",
    "https://thinkerqaq.github.io/c/",
  ], {
    config,
    batchSize: 2,
    maxAttempts: 1,
    fetchImpl: async (url, options) => {
      calls.push({ url, body: JSON.parse(options.body) });
      return new Response("", { status: 202 });
    },
  });
  assert.equal(result.urlCount, 3);
  assert.equal(result.batchCount, 2);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].body.urlList.length, 2);
  assert.equal(calls[1].body.urlList.length, 1);
});

test("submitIndexNowUrls retries 429 and then succeeds", async () => {
  let calls = 0;
  const result = await submitIndexNowUrls([
    "https://thinkerqaq.github.io/a/",
  ], {
    config,
    maxAttempts: 2,
    sleep: async () => {},
    fetchImpl: async () => {
      calls += 1;
      return calls === 1
        ? new Response("slow down", { status: 429 })
        : new Response("", { status: 200 });
    },
  });
  assert.equal(result.urlCount, 1);
  assert.equal(calls, 2);
});

test("submitIndexNowUrls does not retry permanent 4xx", async () => {
  let calls = 0;
  await assert.rejects(
    submitIndexNowUrls(["https://thinkerqaq.github.io/a/"], {
      config,
      maxAttempts: 3,
      sleep: async () => {},
      fetchImpl: async () => {
        calls += 1;
        return new Response("bad request", { status: 400 });
      },
    }),
    /HTTP 400/u,
  );
  assert.equal(calls, 1);
});
