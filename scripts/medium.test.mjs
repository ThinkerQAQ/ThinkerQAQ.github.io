import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMediumCopyHtml,
  buildMediumDraft,
  flattenMarkdownTables,
  parseMediumBlocks,
  stripMediumToc,
} from "./medium.mjs";

const article = {
  title: "Concurrency Programming (0): The Problem Space and Scope",
  description: "desc",
  tags: ["Concurrency", "Java", "Go", "Python", "Extra"],
  body: `## Table of Contents

- [Start](#start)

---

## Start

\`count++\` can be split into three steps.

\`\`\`text
Thread A                    Thread B

count++                     count++
\`\`\`

| Question | Meaning |
| --- | --- |
| Atomicity | \`read → increment → write\` |

> **Why does this work?**`,
};

test("removes the article table of contents", () => {
  const result = stripMediumToc(article.body);
  assert.doesNotMatch(result, /Table of Contents/u);
  assert.match(result, /## Start/u);
});

test("flattens markdown tables to Medium-safe paragraphs", () => {
  const result = flattenMarkdownTables("| Question | Meaning |\n| --- | --- |\n| Atomicity | `read` |\n");
  assert.match(result, /\*\*Atomicity\*\*/u);
  assert.match(result, /`read`/u);
  assert.doesNotMatch(result, /\| --- \|/u);
});

test("preserves whitespace-sensitive text fences as PRE deltas", () => {
  const { blocks } = parseMediumBlocks(article.body);
  const pre = blocks.find((block) => block.kind === "pre");
  assert.ok(pre);
  assert.equal(pre.paragraphType, 10);
  assert.equal(pre.text, "Thread A                    Thread B\n\ncount++                     count++");
});

test("builds a Medium draft with canonical footer matching DEV.to wording", () => {
  const draft = buildMediumDraft(article, { slug: "concurrency-series-00" });
  assert.equal(draft.canonicalUrl, "https://thinkerqaq.github.io/en/articles/concurrency-series-00/");
  assert.equal(draft.tags.length, 5);
  const footer = draft.deltas.at(-1).paragraph;
  assert.equal(footer.type, 9);
  assert.match(footer.text, /This article was first published on ThinkerQAQ's personal blog and syndicated here by the author/u);
  const link = footer.markups.find((markup) => markup.type === 3);
  assert.equal(link.href, draft.canonicalUrl);
});

test("builds a copy/paste HTML fallback without TOC and with copy button", () => {
  const output = buildMediumCopyHtml(article, { slug: "concurrency-series-00" });
  assert.match(output, /Copy for Medium/u);
  assert.doesNotMatch(output, /Table of Contents/u);
  assert.match(output, /<pre><code>Thread A                    Thread B/u);
  assert.match(output, /ThinkerQAQ's personal blog/u);
});
