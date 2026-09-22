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

test("flattens markdown tables to compact Medium-safe row summaries", () => {
  const result = flattenMarkdownTables("| Question | Meaning |\n| --- | --- |\n| Atomicity | `read` |\n");
  assert.match(result, /\*\*Atomicity\*\* — `read`/u);
  assert.doesNotMatch(result, /\| --- \|/u);
});

test("Medium table conversion does not split pipes inside code spans", () => {
  const result = flattenMarkdownTables("| Expression | Meaning |\n| --- | --- |\n| `a | b` | bitwise OR |\n");
  assert.match(result, /\*\*`a \| b`\*\* — bitwise OR/u);
});

test("removes localized contents sections without requiring a separator", () => {
  const result = stripMediumToc("## 目录\n\n- [第一节](#first)\n  - [子节](#child)\n\n## 第一节\n\n正文");
  assert.doesNotMatch(result, /目录|\[第一节\]\(#first\)/u);
  assert.match(result, /^## 第一节/u);
});

test("maps body H1/H2 to Medium section headings and deeper headings to subheadings", () => {
  const { blocks } = parseMediumBlocks("# Duplicate title\n\n## Section\n\n### Detail");
  const headings = blocks.filter((block) => block.kind === "heading");
  assert.deepEqual(headings.map((block) => block.paragraphType), [3, 3, 8]);
});

test("preserves separators without guessing an undocumented Medium delta type", () => {
  const { blocks } = parseMediumBlocks("First\n\n---\n\nSecond");
  assert.equal(blocks[1].kind, "separator");
  assert.equal(blocks[1].paragraphType, 1);
  assert.equal(blocks[1].text, "• • •");
});

test("makes nested and task lists stable in Medium's flat list transport", () => {
  const { blocks } = parseMediumBlocks("- parent\n  - child\n    - [x] done\n- [ ] todo");
  const items = blocks.filter((block) => block.kind === "uli");
  assert.deepEqual(items.map((block) => block.text), [
    "parent",
    "↳ child",
    "↳ ↳ ☑ done",
    "☐ todo",
  ]);
});

test("converts GitHub admonitions into readable Medium quote blocks", () => {
  const { blocks } = parseMediumBlocks("> [!NOTE]\n> Locks establish ordering.");
  const quote = blocks.find((block) => block.kind === "blockquote");
  assert.ok(quote);
  assert.equal(quote.text, "Note.\nLocks establish ordering.");
  const bold = quote.markups.find((markup) => markup.type === 1);
  assert.deepEqual({ start: bold.start, end: bold.end }, { start: 0, end: 5 });
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
  assert.match(output, /<pre><code class="language-text">Thread A                    Thread B/u);
  assert.match(output, /<img src="https:\/\/thinkerqaq\.github\.io\/media\/articles\/concurrency-series-00\/cover\.png" alt="Concurrency series cover">/u);
  assert.match(output, /ThinkerQAQ's personal blog/u);
});


test("Medium compiles Mermaid to an image fallback", () => {
  const fence = String.fromCharCode(96).repeat(3);
  const withMermaid = {
    ...article,
    body: "## Start\n\n" + fence + "mermaid\nflowchart LR\n  accTitle: Mutex path\n  A --> B\n" + fence,
  };
  const draft = buildMediumDraft(withMermaid, { slug: "concurrency-series-00" });
  assert.equal(draft.publishingAssets.length, 1);
  assert.equal(draft.requiresHtmlFallback, true);
  assert.equal(draft.deltas.some((delta) => /flowchart LR/u.test(delta.paragraph.text)), false);

  const output = buildMediumCopyHtml(withMermaid, { slug: "concurrency-series-00" });
  assert.doesNotMatch(output, /flowchart LR/u);
  assert.match(output, /<figure class="body-image"><img src="https:\/\/pub-366a15b6733345039775c083a1fffb3e\.r2\.dev\/generated\/mermaid\/[a-f0-9]{24}\.png" alt="Mutex path"><figcaption>Mutex path<\/figcaption><\/figure>/u);
});


test("Medium copy fallback renders separators and image captions", () => {
  const withImage = {
    ...article,
    body: "## Start\n\n---\n\n![Mutex path](https://example.com/mutex.png)",
  };
  const output = buildMediumCopyHtml(withImage, { slug: "medium-formatting" });
  assert.match(output, /<hr>/u);
  assert.match(output, /<figcaption>Mutex path<\/figcaption>/u);
});
