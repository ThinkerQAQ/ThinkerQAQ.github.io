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
  coverImage: "/media/articles/concurrency-series-00/cover.png",
  coverImageAlt: "Concurrency series cover",
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
  assert.deepEqual(draft.coverImage, {
    url: "https://thinkerqaq.github.io/media/articles/concurrency-series-00/cover.png",
    alt: "Concurrency series cover",
  });
  const footer = draft.deltas.at(-1).paragraph;
  assert.equal(footer.type, 9);
  assert.match(footer.text, /This article was first published on ThinkerQAQ's personal blog and syndicated here by the author/u);
  const link = footer.markups.find((markup) => markup.type === 3);
  assert.equal(link.href, "https://thinkerqaq.github.io/en/articles/concurrency-series-00/?utm_source=medium&utm_medium=referral&utm_campaign=article_syndication");
});


test("Medium canonical and footer follow configured content language", () => {
  const draft = buildMediumDraft({
    ...article,
    title: "并发编程",
    body: "## 正文\n\n内容。",
  }, {
    slug: "concurrency-series-00",
    publishingConfig: {
      language: "zh-CN",
      footer: { enabled: true, template: "> 来源：[{site}]({url})" },
      canonical: { mode: "native" },
      tracking: { enabled: false, source: "medium", medium: "referral", campaign: "article_syndication" },
    },
  });
  assert.equal(draft.canonicalUrl, "https://thinkerqaq.github.io/articles/concurrency-series-00/");
  const footer = draft.deltas.at(-1).paragraph;
  assert.match(footer.text, /ThinkerQAQ 的个人博客/u);
  const link = footer.markups.find((markup) => markup.type === 3);
  assert.equal(link.href, "https://thinkerqaq.github.io/articles/concurrency-series-00/");
});

test("Medium publishing profile controls footer tracking and native canonical", () => {
  const draft = buildMediumDraft(article, {
    slug: "concurrency-series-00",
    publishingConfig: {
      footer: { enabled: true, template: "> Source: [{site}]({url})" },
      canonical: { mode: "none" },
      tracking: { enabled: false, source: "medium", medium: "referral", campaign: "article_syndication" },
    },
  });
  assert.equal(draft.canonicalUrl, "");
  const footer = draft.deltas.at(-1).paragraph;
  assert.equal(footer.type, 9);
  assert.equal(footer.text, "Source: ThinkerQAQ's personal blog");
  const link = footer.markups.find((markup) => markup.type === 3);
  assert.equal(link.href, "https://thinkerqaq.github.io/en/articles/concurrency-series-00/");

  const output = buildMediumCopyHtml(article, {
    slug: "concurrency-series-00",
    publishingConfig: {
      footer: { enabled: false, template: "> ignored {url}" },
      canonical: { mode: "native" },
      tracking: { enabled: true, source: "medium", medium: "referral", campaign: "article_syndication" },
    },
  });
  assert.doesNotMatch(output, /ignored/u);
  assert.doesNotMatch(output, /<hr>/u);
});

test("builds a copy/paste HTML fallback without TOC and with copy button", () => {
  const output = buildMediumCopyHtml(article, { slug: "concurrency-series-00" });
  assert.match(output, /Copy for Medium/u);
  assert.doesNotMatch(output, /Table of Contents/u);
  assert.match(output, /<pre><code>Thread A                    Thread B/u);
  assert.match(output, /<img src="https:\/\/thinkerqaq\.github\.io\/media\/articles\/concurrency-series-00\/cover\.png" alt="Concurrency series cover">/u);
  assert.match(output, /ThinkerQAQ's personal blog/u);
});
