import test from "node:test";
import assert from "node:assert/strict";
import script from "./u.js.js";
import send from "./api/send.js";
import reactions from "./v1/reactions.js";

async function withFetch(fake, run) {
  const previous = globalThis.fetch;
  globalThis.fetch = fake;
  try { return await run(); }
  finally { globalThis.fetch = previous; }
}

test("Umami tracker only GETs a pinned Cloudflare Worker URL", async () => {
  await withFetch(async (url, options) => {
    assert.equal(url, "https://thinkerqaq-blog-ai.blog-ai.workers.dev/u.js");
    assert.equal(options.method, "GET");
    return new Response("tracker()", { headers: { "content-type": "application/javascript" } });
  }, async () => {
    const response = await script({ request: new Request("https://site.example/u.js") });
    assert.equal(response.status, 200);
    assert.match(await response.text(), /tracker/);
    assert.equal(response.headers.get("cache-control"), "public, max-age=300");
  });
  const forbidden = await script({ request: new Request("https://site.example/u.js", { method: "POST" }) });
  assert.equal(forbidden.status, 405);
});

test("Umami collection accepts only same-origin POST, forwards allowed fields", async () => {
  let calls = 0;
  await withFetch(async (url, options) => {
    calls++;
    assert.equal(url, "https://thinkerqaq-blog-ai.blog-ai.workers.dev/api/send");
    assert.equal(options.method, "POST");
    assert.equal(options.headers.get("origin"), "https://thinkerqaq.com");
    assert.equal(options.headers.get("x-umami-website-id"), "test-website");
    assert.equal(options.headers.get("authorization"), null);
    assert.equal(new TextDecoder().decode(options.body), '{"type":"event"}');
    return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
  }, async () => {
    const url = "https://preview.edgeone.cool/api/send";
    const bad = await send({ request: new Request(url, { method: "POST", headers: { origin: "https://attacker.example" }, body: "{}" }) });
    assert.equal(bad.status, 403);
    assert.equal(calls, 0);
    const okay = await send({ request: new Request(url, {
      method: "POST",
      headers: { origin: "https://preview.edgeone.cool", "x-umami-website-id": "test-website", authorization: "must-not-forward" },
      body: '{"type":"event"}',
    }) });
    assert.equal(okay.status, 200);
    assert.equal(calls, 1);
  });
});

test("reactions preserve visitor key and reject cross-origin writes", async () => {
  const id = "1234567890abcdef1234567890abcdef";
  await withFetch(async (url, options) => {
    assert.equal(new URL(url).host, "thinkerqaq-blog-reactions.blog-ai.workers.dev");
    assert.equal(new URL(url).searchParams.get("contentType"), "article");
    assert.equal(new URL(url).searchParams.get("contentId"), "article-01");
    assert.equal(options.headers["x-reaction-visitor"], id);
    assert.equal(options.headers.origin, "https://thinkerqaq.com");
    return Response.json({ reacted: false, count: 1 });
  }, async () => {
    const url = "https://preview.edgeone.cool/v1/reactions?contentType=article&contentId=article-01";
    const cross = await reactions({request: new Request(url, {
      method: "PUT", headers: { Origin: "https://evil.example", "x-reaction-visitor": id },
    })});
    assert.equal(cross.status, 403);
    const good = await reactions({request: new Request(url, {
      headers: { "x-reaction-visitor": id },
    })});
    assert.equal(good.status, 200);
    assert.deepEqual(await good.json(), { reacted: false, count: 1 });
  });
});

test("reactions reject invalid visitors and query params without upstream fetch", async () => {
  await withFetch(() => { throw new Error("Should not fetch"); }, async () => {
    const missing = await reactions({request: new Request("https://site.example/v1/reactions?contentType=note&contentId=ok")});
    assert.equal(missing.status, 400);
    const wrong = await reactions({request: new Request("https://site.example/v1/reactions?contentType=other&contentId=ok",{
      headers: { "x-reaction-visitor": "1234567890abcdef" },
    })});
    assert.equal(wrong.status, 400);
  });
});
