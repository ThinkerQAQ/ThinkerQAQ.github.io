import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCanonicalUrl,
  buildMediumDiagramUrl,
  buildMediumImportHtml,
  buildMediumImportUrl,
  buildTextDiagramDot,
  isDiagrammaticTextBlock,
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

Suppose a process contains this variable:

\`\`\`text
count = 0
\`\`\`

Now there are two execution units:

\`\`\`text
Thread A                    Thread B

count++                     count++
\`\`\`

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

test("builds canonical, importer, and text-diagram URLs", () => {
  assert.equal(
    buildCanonicalUrl("concurrency-series-00"),
    "https://thinkerqaq.github.io/en/articles/concurrency-series-00/",
  );
  assert.equal(
    buildMediumImportUrl("concurrency-series-00"),
    "https://thinkerqaq.github.io/medium-import/en/concurrency-series-00/",
  );
  assert.equal(
    buildMediumDiagramUrl("concurrency-series-00", 2),
    "https://thinkerqaq.github.io/medium-import/en/concurrency-series-00/assets/text-diagram-02.png",
  );
});

test("detects alignment-heavy text fences as diagrams but leaves simple text alone", () => {
  assert.equal(isDiagrammaticTextBlock("count = 0"), false);
  assert.equal(
    isDiagrammaticTextBlock("Thread A                    Thread B\n\ncount++                     count++"),
    true,
  );
  assert.equal(
    isDiagrammaticTextBlock(
      "Goroutine A ── +1 ──┐\n                     ├──> Channel\nGoroutine B ── +1 ──┘",
    ),
    true,
  );
});

test("builds Graphviz source that preserves spaces and line breaks", () => {
  const dot = buildTextDiagramDot("Thread A    Thread B\n\ncount++     count++");
  assert.match(dot, /DejaVu Sans Mono/u);
  assert.match(dot, /Thread&#160;A&#160;&#160;&#160;&#160;Thread&#160;B/u);
  assert.match(dot, /<BR ALIGN="LEFT"\/>?&#160;<BR ALIGN="LEFT"\/>/u);
});

test("builds noindex Medium page with original article canonical", () => {
  const html = buildMediumImportHtml(article, { slug: "concurrency-series-00" });
  assert.match(html, /<meta name="robots" content="noindex,nofollow">/u);
  assert.match(html, /<link rel="canonical" href="https:\/\/thinkerqaq\.github\.io\/en\/articles\/concurrency-series-00\/">/u);
  assert.doesNotMatch(html, /Table of Contents/u);
});

test("renders text diagrams as PNG images and simple text without pre blocks", () => {
  const threadBlock = "Thread A                    Thread B\n\ncount++                     count++";
  const channelBlock =
    "Goroutine A ── +1 ──┐\n                     ├──> Channel ──> Counter Owner Goroutine ──> count++\nGoroutine B ── +1 ──┘";
  const diagramUrls = new Map([
    [threadBlock, buildMediumDiagramUrl("concurrency-series-00", 1)],
    [channelBlock, buildMediumDiagramUrl("concurrency-series-00", 2)],
  ]);
  const html = buildMediumImportHtml(article, {
    slug: "concurrency-series-00",
    diagramUrls,
  });

  assert.match(
    html,
    /<img src="https:\/\/thinkerqaq\.github\.io\/medium-import\/en\/concurrency-series-00\/assets\/text-diagram-01\.png"/u,
  );
  assert.match(
    html,
    /<img src="https:\/\/thinkerqaq\.github\.io\/medium-import\/en\/concurrency-series-00\/assets\/text-diagram-02\.png"/u,
  );
  assert.match(html, /<p><code>count = 0<\/code><\/p>/u);
  assert.doesNotMatch(html, /<pre><code>Thread A/u);
  assert.doesNotMatch(html, /<pre><code>Goroutine A/u);
});

test("keeps real programming-language fences as code blocks", () => {
  const html = buildMediumImportHtml(article, { slug: "concurrency-series-00" });
  const blocks = html.match(/<pre><code>[\s\S]*?<\/code><\/pre>/gu) ?? [];
  assert.equal(blocks.length, 1);
  assert.match(blocks[0], /for delta := range increments/u);
  assert.doesNotMatch(blocks[0], /<span|class=|data-language|shiki/u);
});

test("parses repeated article arguments", () => {
  assert.deepEqual(
    parseArguments(["--article", "a", "--article", "b"]),
    { requestedSlugs: ["a", "b"], help: false },
  );
});
