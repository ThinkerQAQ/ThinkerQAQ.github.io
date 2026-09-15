import assert from "node:assert/strict";
import test from "node:test";
import { extractRequestedPlatforms, normalizeExplicitSyndicationArgs } from "./syndicate-cli.mjs";

test("rejects implicit all-article syndication", () => {
  assert.throws(
    () => normalizeExplicitSyndicationArgs(["--platforms", "devto"]),
    /Explicit article selection is required/u,
  );
});

test("accepts an explicit article selection", () => {
  assert.deepEqual(
    normalizeExplicitSyndicationArgs(["--platforms", "devto", "--article", "concurrency-series-00"]),
    ["--platforms", "devto", "--article", "concurrency-series-00"],
  );
});

test("requires full syndication to be explicitly acknowledged with --all", () => {
  assert.deepEqual(
    normalizeExplicitSyndicationArgs(["--platforms", "devto", "--all", "--dry-run"]),
    ["--platforms", "devto", "--dry-run"],
  );
});

test("rejects mixing --all and --article", () => {
  assert.throws(
    () => normalizeExplicitSyndicationArgs(["--all", "--article", "concurrency-series-00"]),
    /either explicit --article selections or explicit --all/u,
  );
});

test("allows help without a publication scope", () => {
  assert.deepEqual(normalizeExplicitSyndicationArgs(["--help"]), ["--help"]);
});

test("defaults international syndication to DEV.to", () => {
  assert.deepEqual(extractRequestedPlatforms(["--article", "x"]), ["devto"]);
});

test("accepts Medium and mixed explicit platform selections", () => {
  assert.deepEqual(extractRequestedPlatforms(["--platforms", "medium", "--article", "x"]), ["medium"]);
  assert.deepEqual(extractRequestedPlatforms(["--platforms", "devto,medium", "--article", "x"]), ["devto", "medium"]);
});

test("rejects unsupported international platforms", () => {
  assert.throws(
    () => extractRequestedPlatforms(["--platforms", "hashnode", "--article", "x"]),
    /Unsupported platform/u,
  );
});
