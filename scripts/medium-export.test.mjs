import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCanonicalUrl,
  buildMediumImportHtml,
  buildMediumImportUrl,
  parseArguments,
} from "./medium-export.mjs";

const article = {
  title: "Concurrency Programming (0): The Problem Space and Scope",
  description: "Concurrency article",
  status: "published",
  tags: ["Concurrency"],
  body: `## Table of Contents

- [Section](#section)

---

## Section

See [notes](/notes/foo/) and \`count\`.

\`\`\`text
Goroutine A ── +1 ──┐
                     ├──> Channel ──> Counter Owner Goroutine ──> count++
Goroutine B ── +1 ──┘
\`\`\`

\`\`\`go
for delta := range increments {
    count += delta
}
\`\`\`
`,
};

test("builds canonical and Medium import URLs", () => {
  assert.equal(
    buildCanonicalUrl("concurrency-series-00"),
    "https://thinkerqaq.github.io/en/articles/concurrency-series-00/",
  );
  assert.equal(
    buildMediumImportUrl("concurrency-series-00"),
    "https://thinkerqaq.github.io/medium-import/en/concurrency-series-00/",
  );
});

test("builds noindex Medium page with original article canonical", () => {
  const html = buildMediumImportHtml(article, { slug: "concurrency-series-00" });
  assert.match(html, /<meta name="robots" content="noindex,nofollow">/u);
  assert.match(html, /<link rel="canonical" href="https:\/\/thinkerqaq\.github\.io\/en\/articles\/concurrency-series-00\/">/u);
  assert.doesNotMatch(html, /Table of Contents/u);
});

test("renders fenced code blocks as minimal pre/code markup", () => {
  const html = buildMediumImportHtml(article, { slug: "concurrency-series-00" });
  const blocks = html.match(/<pre><code>[\s\S]*?<\/code><\/pre>/gu) ?? [];
  assert.equal(blocks.length, 2);
  assert.match(blocks[0], /Goroutine A ── \+1 ──┐/u);
  assert.match(blocks[0], /Counter Owner Goroutine/u);
  assert.match(blocks[1], /for delta := range increments/u);
  assert.doesNotMatch(blocks.join("\n"), /<span|class=|data-language|shiki/u);
});

test("makes root-relative links absolute and appends syndication notice", () => {
  const html = buildMediumImportHtml(article, { slug: "concurrency-series-00" });
  assert.match(html, /href="https:\/\/thinkerqaq\.github\.io\/notes\/foo\/"/u);
  assert.match(html, /syndicated here by the author/u);
  assert.match(html, /may be revised over time/u);
});

test("parses repeated article arguments", () => {
  assert.deepEqual(
    parseArguments(["--article", "a", "--article", "b"]),
    { requestedSlugs: ["a", "b"], help: false },
  );
});
