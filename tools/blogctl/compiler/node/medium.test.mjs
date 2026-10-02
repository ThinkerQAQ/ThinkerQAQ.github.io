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

const EN_PROFILE = {
  language: "en",
  footer: {
    enabled: true,
    template: "> This article was first published on [{site}]({url}) and syndicated here by the author. The original article may be revised over time; please refer to the personal blog for the latest version.",
  },
  tracking: {
    enabled: true,
    source: "medium",
    medium: "referral",
    campaign: "article_syndication",
  },
};

function mediumOptions(slug, {
  language = "en",
  footer = EN_PROFILE.footer,
  tracking = EN_PROFILE.tracking,
} = {}) {
  const prefix = language === "en" ? "/en/articles/" : "/articles/";
  return {
    canonicalUrl: `https://thinkerqaq.github.io${prefix}${slug}/`,
    publishingConfig: { language, footer, tracking },
  };
}

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

test("maps body H1/H2/H3 to the Medium section-heading style used by published posts", () => {
  const { blocks } = parseMediumBlocks("# Duplicate title\n\n## Section\n\n### Detail\n\n#### Deep");
  const headings = blocks.filter((block) => block.kind === "heading");
  assert.deepEqual(headings.map((block) => block.paragraphType), [3, 3, 3, 8]);
});

test("drops markdown separators because published Medium posts do not retain them as paragraphs", () => {
  const { blocks } = parseMediumBlocks("First\n\n---\n\nSecond");
  assert.deepEqual(blocks.map((block) => block.text), ["First", "Second"]);
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

test("splits quoted blank lines into separate Medium blockquote paragraphs", () => {
  const { blocks } = parseMediumBlocks("> **Note.** First paragraph.\n>\n> Second paragraph.");
  const quotes = blocks.filter((block) => block.kind === "blockquote");
  assert.deepEqual(quotes.map((block) => block.text), ["Note. First paragraph.", "Second paragraph."]);
});

test("preserves whitespace-sensitive text fences as PRE deltas", () => {
  const { blocks } = parseMediumBlocks(article.body);
  const pre = blocks.find((block) => block.kind === "pre");
  assert.ok(pre);
  assert.equal(pre.paragraphType, 10);
  assert.equal(pre.text, "Thread A                    Thread B\n\ncount++                     count++");
});

test("builds a Medium draft with canonical footer matching DEV.to wording", () => {
  const draft = buildMediumDraft(article, mediumOptions("concurrency-series-00"));
  assert.deepEqual(draft.coverImage, {
    url: "https://thinkerqaq.github.io/media/articles/concurrency-series-00/cover.png",
    alt: "Concurrency series cover",
  });
  assert.deepEqual(draft.deltas[0].image, {
    url: "https://thinkerqaq.github.io/media/articles/concurrency-series-00/cover.png",
    alt: "Concurrency series cover",
  });
  assert.equal(draft.deltas[0].paragraph.type, 4);
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
  }, mediumOptions("concurrency-series-00", {
    language: "zh-CN",
    footer: { enabled: true, template: "> 来源：[{site}]({url})" },
    tracking: { enabled: false, source: "medium", medium: "referral", campaign: "article_syndication" },
  }));
  const footer = draft.deltas.at(-1).paragraph;
  assert.match(footer.text, /ThinkerQAQ 的个人博客/u);
  const link = footer.markups.find((markup) => markup.type === 3);
  assert.equal(link.href, "https://thinkerqaq.github.io/articles/concurrency-series-00/");
});

test("Medium renderer follows the Go-resolved footer profile", () => {
  const options = mediumOptions("concurrency-series-00", {
    footer: { enabled: true, template: "> Source: [{site}]({url})" },
    tracking: { enabled: false, source: "medium", medium: "referral", campaign: "article_syndication" },
  });
  const draft = buildMediumDraft(article, options);
  const footer = draft.deltas.at(-1).paragraph;
  assert.equal(footer.type, 9);
  assert.equal(footer.text, "Source: ThinkerQAQ's personal blog");
  const link = footer.markups.find((markup) => markup.type === 3);
  assert.equal(link.href, options.canonicalUrl);

  const output = buildMediumCopyHtml(article, mediumOptions("concurrency-series-00", {
    footer: { enabled: false, template: "> ignored {url}" },
    tracking: EN_PROFILE.tracking,
  }));
  assert.doesNotMatch(output, /ignored/u);
  assert.doesNotMatch(output, /<hr>/u);
});

test("builds a copy/paste HTML fallback without TOC and with copy button", () => {
  const output = buildMediumCopyHtml(article, mediumOptions("concurrency-series-00"));
  assert.match(output, /Copy for Medium/u);
  assert.doesNotMatch(output, /Table of Contents/u);
  assert.match(output, /<pre><code class="language-text">Thread A                    Thread B/u);
  assert.match(output, /<img src="https:\/\/thinkerqaq\.github\.io\/media\/articles\/concurrency-series-00\/cover\.png" alt="Concurrency series cover">/u);
  assert.match(output, /ThinkerQAQ's personal blog/u);
});


test("Medium renderer consumes a Go-compiled diagram image", () => {
  const imageUrl = "https://cdn.example.com/generated/mermaid/0123456789abcdef01234567.png";
  const compiled = {
    ...article,
    body: "## Start\n\n![Mutex path](" + imageUrl + ")",
  };
  const draft = buildMediumDraft(compiled, mediumOptions("concurrency-series-00"));
  assert.deepEqual(draft.publishingAssets, []);
  assert.equal(draft.requiresHtmlFallback, false);
  assert.ok(draft.deltas.some((delta) => delta.image?.url === imageUrl && delta.image?.alt === "Mutex path"));

  const output = buildMediumCopyHtml(compiled, mediumOptions("concurrency-series-00"));
  assert.match(output, /generated\/mermaid\/0123456789abcdef01234567\.png/u);
  assert.match(output, /<figcaption>Mutex path<\/figcaption>/u);
});

test("Medium copy fallback drops source separators and keeps image captions", () => {
  const withImage = {
    ...article,
    body: "## Start\n\n---\n\n![Mutex path](https://example.com/mutex.png)",
  };
  const output = buildMediumCopyHtml(withImage, mediumOptions("medium-formatting"));
  assert.equal((output.match(/<hr>/gu) ?? []).length, 1);
  assert.match(output, /<figcaption>Mutex path<\/figcaption>/u);
});


test("published-post regression: cover, headings, quote paragraphs, tables, and footer stay readable", () => {
  const fixture = {
    ...article,
    title: "Concurrency Programming (1): Start with the Hardware",
    body: `## Table of Contents

- [Start](#start)

---

## Start

Intro.

> **Question one?**

### Store Buffer

> **Note.** First paragraph.
>
> Second paragraph.

| Concept | What question does it answer? |
| --- | --- |
| Store Buffer | Why may another core not see it? |
| Out-of-Order Execution | Why may a later instruction execute first? |

---

End.`,
  };
  const draft = buildMediumDraft(fixture, mediumOptions("concurrency-series-01-hardware"));
  assert.equal(draft.deltas[0].paragraph.type, 4);
  assert.equal(draft.deltas.filter((delta) => delta.paragraph.type === 3).length, 2);
  assert.deepEqual(
    draft.deltas.filter((delta) => delta.paragraph.type === 9).map((delta) => delta.paragraph.text),
    [
      "Question one?",
      "Note. First paragraph.",
      "Second paragraph.",
      "This article was first published on ThinkerQAQ's personal blog and syndicated here by the author. The original article may be revised over time; please refer to the personal blog for the latest version.",
    ],
  );
  const text = draft.deltas.map((delta) => delta.paragraph.text).join("\n");
  assert.doesNotMatch(text, /Table of Contents|• • •|\| --- \|/u);
  assert.match(text, /Store Buffer — Why may another core not see it\?/u);
  assert.match(text, /Out-of-Order Execution — Why may a later instruction execute first\?/u);
});
