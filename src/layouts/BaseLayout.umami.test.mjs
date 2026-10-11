import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const layout = await readFile(new URL("./BaseLayout.astro", import.meta.url), "utf8");
const tracker = await readFile(new URL("../../public/u.js", import.meta.url), "utf8");

test("Umami tracker is served as a local, deferred static asset", () => {
  const tag = layout.match(/<script\s+is:inline\s+defer\s+src="\/u\.js"[\s\S]*?<\/script>/)?.[0];
  assert.ok(tag, "BaseLayout must load the static /u.js asset");
  assert.match(layout, /analytics && umamiWebsiteId && umamiProxyOrigin/);
  assert.match(tag, /data-website-id=\{umamiWebsiteId\}/);
  assert.match(tag, /data-domains=\{umamiDomain\}/);
  assert.match(tag, /data-host-url=\{umamiProxyOrigin\}/);
  assert.match(tag, /data-exclude-hash="true"/);
  assert.match(tag, /data-performance="true"/);
  assert.doesNotMatch(layout, /data-umami-src|loadTracker\(/);
});

test("vendored Umami browser bundle is parseable and can send to the configured host", () => {
  assert.ok(tracker.length > 1000, "tracker bundle is missing or incomplete");
  assert.match(tracker, /data-/);
  assert.match(tracker, /api\/send/);
  new vm.Script(tracker, { filename: "public/u.js" });
});
