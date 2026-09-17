import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { runSyndication } from "./syndicate.mjs";

test("runSyndication applies the DEV.to publishing profile during dry-run", async () => {
  const messages = [];
  const originalLog = console.log;
  console.log = (value) => messages.push(String(value));
  try {
    const summary = await runSyndication({
      articleRoot: path.resolve("fixtures/src/content/articles"),
      requestedSlugs: ["sample-article-en"],
      dryRun: true,
      publishingConfig: {
        footer: { enabled: false, template: "" },
        canonical: { mode: "none" },
        tracking: {
          enabled: false,
          source: "devto",
          medium: "referral",
          campaign: "article_syndication",
        },
      },
    });
    assert.equal(summary.total, 1);
    assert.equal(summary.dryRun, true);
  } finally {
    console.log = originalLog;
  }

  const event = messages
    .map((line) => JSON.parse(line))
    .find((item) => item.operation === "syndication-devto");
  assert.ok(event);
  assert.equal(event.status, "dry-run");
  assert.equal(event.canonicalUrl, "");
});
