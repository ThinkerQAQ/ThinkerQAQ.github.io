import assert from "node:assert/strict";
import test from "node:test";
import { filterMediumCookies, stripMediumXssi } from "./bridge.mjs";

test("keeps only Medium session cookies required by the bridge", () => {
  assert.deepEqual(filterMediumCookies([
    { name: "sid", value: "secret-sid" },
    { name: "uid", value: "123" },
    { name: "xsrf", value: "token" },
    { name: "cf_clearance", value: "cf" },
    { name: "unrelated", value: "drop-me" },
  ]), {
    sid: "secret-sid",
    uid: "123",
    xsrf: "token",
    cf_clearance: "cf",
  });
});

test("strips Medium XSSI response prefix", () => {
  assert.equal(stripMediumXssi("])}while(1);</x>\n{\"success\":true}"), "{\"success\":true}");
  assert.equal(stripMediumXssi("{\"success\":true}"), "{\"success\":true}");
});
