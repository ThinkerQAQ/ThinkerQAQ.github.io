import test from "node:test";
import assert from "node:assert/strict";
import { executeBrowserRequest } from "../tools/blogctl/extension/browser-runtime.js";

const saveTask = {
  id: "request-1", operation: "save-post", method: "POST",
  url: "https://i.cnblogs.com/api/posts", contentType: "application/json",
  body: Buffer.from('{"isPublished":false,"isDraft":true,"displayOnHomePage":false}').toString("base64"),
};

test("CNBlogs draft uses browser credentials and injects XSRF only in browser", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return url.endsWith("/posts/edit")
      ? new Response("", { status: 200, headers: { "content-type": "text/html" } })
      : new Response('{"id":123}', { status: 200, headers: { "content-type": "application/json" } });
  };
  const wrappedFetch = async (url, options) => {
    const response = await fetchImpl(url, options);
    Object.defineProperty(response, "url", { value: url });
    return response;
  };
  const result = await executeBrowserRequest(saveTask, {
    fetch: wrappedFetch,
    cookies: { getAll: async () => [{ name: "XSRF-TOKEN", value: "encoded%2Btoken" }] },
  });
  assert.equal(result.status, 200);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].options.credentials, "include");
  assert.equal(calls[1].options.headers.get("x-xsrf-token"), "encoded+token");
  assert.equal(JSON.stringify(result).includes("encoded+token"), false);
  assert.equal(Buffer.from(result.body, "base64").toString(), '{"id":123}');
});

test("browser runtime rejects arbitrary targets before fetching", async () => {
  let called = false;
  const result = await executeBrowserRequest({ ...saveTask, url: "https://evil.example/api/posts" }, {
    fetch: async () => { called = true; throw new Error("unexpected fetch"); },
  }).catch((error) => ({ error: error.message }));
  assert.equal(called, false);
  assert.match(result.error, /not allowed/);
});

test("missing XSRF fails before the draft POST", async () => {
  const calls = [];
  const result = await executeBrowserRequest(saveTask, {
    fetch: async (url) => { calls.push(url); const response = new Response(""); Object.defineProperty(response, "url", { value: url }); return response; },
    cookies: { getAll: async () => [] },
  });
  assert.equal(calls.length, 1);
  assert.match(result.error, /XSRF cookie is missing/);
});
