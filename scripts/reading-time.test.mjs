import assert from "node:assert/strict";
import test from "node:test";

import readingTimeMarkdown, { estimateReadingMinutes } from "./reading-time.mjs";

test("estimates CJK reading time at 500 characters per minute", () => {
  assert.equal(estimateReadingMinutes("中".repeat(500)), 1);
  assert.equal(estimateReadingMinutes("中".repeat(501)), 2);
});

test("estimates Latin reading time at 265 words per minute", () => {
  assert.equal(estimateReadingMinutes(Array(265).fill("word").join(" ")), 1);
  assert.equal(estimateReadingMinutes(Array(266).fill("word").join(" ")), 2);
});

test("combines CJK characters and Latin words", () => {
  const text = `${"中".repeat(250)} ${Array(133).fill("word").join(" ")}`;
  assert.equal(estimateReadingMinutes(text), 2);
});

test("keeps a one-minute minimum", () => {
  assert.equal(estimateReadingMinutes(""), 1);
});

test("writes readingMinutes into Astro plugin frontmatter", () => {
  const plugin = readingTimeMarkdown();
  const context = {
    textContent: () => "中".repeat(501),
    data: { astro: { frontmatter: {} } },
  };

  plugin.after({}, context);
  assert.equal(context.data.astro.frontmatter.readingMinutes, 2);
});
