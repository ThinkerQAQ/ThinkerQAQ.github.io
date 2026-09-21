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

test("submitIndexNowU\›È™]šY\ÈH[™[ˆİXØÙYYÈ‹\Ş[˜È

HOˆÂˆ]Ø[ÈHÂˆÛÛœİ™\İ[H]ØZ]İX›Z][™^›İÕ\›ÊÂˆšÎ‹Ëİ[šÙ\œX\K™Ú]X‹š[ËØKÈ‹ˆKÂˆÛÛ™šYËˆX^][\Îˆ‹ˆÛY\ˆ\Ş[˜È

HOˆßKˆ™]Ú[\ˆ\Ş[˜È

HOˆÂˆØ[È
ÏHNÂˆ™]\›ˆØ[ÈOOHBˆÈ™]È™\ÜÛœÙJœÛİÈİÛˆ‹Èİ]\ÎˆHJBˆˆ™]È™\ÜÛœÙJˆ‹Èİ]\ÎˆŒJNÂˆKˆJNÂˆ\ÜÙ\™\]X[
™\İ[\›Ûİ[JNÂˆ\ÜÙ\™\]X[
Ø[ËŠNÂŸJNÂ‚\İ
œİX›Z][™^›İÕ\›ÈÙ\È›İ™]H\›X[™[‹\Ş[˜È

HOˆÂˆ]Ø[ÈHÂˆ]ØZ]\ÜÙ\œ™Z™XİÊˆİX›Z][™^›İÕW&Ç2…²&‡GG3¢ò÷F†–æ¶W'æv—F‡V"æ–òöò%ÒÂ°¢6öæf–rÀ¢Ö„GFV×G3¢2À¢6ÆVW¢7–æ2‚’Óâ·ÒÀ¢fWF6„–×Ã¢7–æ2‚’Óâ°¢6ÆÇ2³Ò°¢&WGW&âæWr&W7öç6R‚&&B&WVW7B"Â²7FGW3¢CÒ“°¢ÒÀ¢Ò’À¢ô…EEC÷RÀ¢“°¢76W'BæWVÂ†6ÆÇ2Â“°§Ò“° 