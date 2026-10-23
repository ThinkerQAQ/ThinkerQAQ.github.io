import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function websiteSchemaFor(homePath) {
  const html = readFileSync(new URL(`../dist/${homePath}index.html`, import.meta.url), "utf8");
  const websiteSchemas = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter((match) => /\btype=["']application\/ld\+json["']/i.test(match[1]))
    .map((match) => JSON.parse(match[2]))
    .filter((schema) => schema["@type"] === "WebSite");
  assert.equal(websiteSchemas.length, 1, `${homePath || "/"} must declare exactly one WebSite`);
  return websiteSchemas[0];
}

const zh = websiteSchemaFor("");
const en = websiteSchemaFor("en/");
assert.deepEqual(en, zh, "Localized home pages should describe the same WebSite entity");
assert.equal(zh["@id"], "https://thinkerqaq.com/#website");
assert.equal(zh.url, "https://thinkerqaq.com/");
console.log("Website JSON-LD valid and identical on / and /en/");
