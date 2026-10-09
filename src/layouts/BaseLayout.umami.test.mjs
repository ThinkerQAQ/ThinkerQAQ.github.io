import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const layout = await readFile(new URL("./BaseLayout.astro", import.meta.url), "utf8");
const script = layout.match(/<script\s+is:inline\s+data-umami-src=[\s\S]*?>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, "Umami should use inline post-load bootstrap");

function setup(readyState) {
  const appended = [];
  const listeners = new Map();
  const config = {
    dataset: {
      umamiSrc: "https://api.example/u.js",
      umamiWebsiteId: "website-test",
      umamiDomains: "thinkerqaq.com",
      umamiHostUrl: "https://api.example",
    },
  };
  const document = {
    readyState,
    currentScript: config,
    head: { append(el) { appended.push(el); } },
    createElement() {
      return {
        attributes: new Map(),
        setAttribute(k, v) { this.attributes.set(k, v); },
      };
    },
  };
  const window = {
    addEventListener(name, listener, options) { listeners.set(name, { listener, options }); },
  };
  vm.runInNewContext(script, {document, window});
  return {appended,listeners};
}

test("the Umami request starts strictly after load and keeps tracker settings", () => {
  const t = setup("loading");
  assert.equal(t.appended.length, 0);
  assert.equal(t.listeners.get("load").options.once, true);
  t.listeners.get("load").listener();
  assert.equal(t.appended.length, 1);
  const el=t.appended[0];
  assert.equal(el.async, true);
  assert.equal(el.src, "https://api.example/u.js");
  assert.equal(el.attributes.get("data-website-id"), "website-test");
  assert.equal(el.attributes.get("data-domains"), "thinkerqaq.com");
  assert.equal(el.attributes.get("data-host-url"), "https://api.example");
  assert.equal(el.attributes.get("data-performance"), "true");
  assert.equal(el.attributes.get("data-exclude-hash"), "true");
});

test("an already loaded document still installs the tracker", () => {
  const t=setup("complete");
  assert.equal(t.appended.length, 1);
  assert.equal(t.listeners.size, 0);
});
