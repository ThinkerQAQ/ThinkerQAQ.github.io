import assert from "node:assert/strict";
import test from "node:test";

import {
  collectPublishingAssets,
  compilePublishingMarkdown,
  makeExternalLinksAbsolute,
  mermaidAssetForSource,
} from "./compiler.mjs";

test("Mermaid asset IDs are stable across newline styles", () => {
  const left = mermaidAssetForSource("flowchart LR\r\nA --> B\r\n");
  const right = mermaidAssetForSource("flowchart LR\nA --> B\n");
  assert.equal(left.id, right.id);
  assert.equal(left.publicPath, right.publicPath);
});

test("publishing compiler replaces Mermaid with a public PNG", () => {
  const source = [
    "Before",
    "",
    "```mermaid",
    "flowchart LR",
    "  A --> B",
    "```",
    "",
    "After",
  ].join("\n");
  const result = compilePublishingMarkdown(source, { platform: "medium" });
  assert.equal(result.assets.length, 1);
  assert.doesNotMatch(result.markdown, /```mermaid/u);
  assert.match(
    result.markdown,
    /!\[Mermaid diagram\]\(https:\/\/thinkerqaq\.github\.io\/media\/generated\/mermaid\/[a-f0-9]{24}\.png\)/u,
  );
});

test("site compilation preserves Mermaid source", () => {
  const source = "```mermaid\nflowchart LR\nA --> B\n```";
  const result = compilePublishingMarkdown(source, { platform: "site" });
  assert.equal(result.markdown, source);
  assert.equal(result.assets.length, 0);
});

test("compiler preserves non-Mermaid fences and does not rewrite links inside them", () => {
  const source = [
    "[outside](/articles/a/)",
    "",
    "```markdown",
    "[example](/articles/inside/)",
    "<img src=\"/inside.png\">",
    "```",
  ].join("\n");
  const result = compilePublishingMarkdown(source, { platform: "devto" });
  assert.match(result.markdown, /\[outside\]\(https:\/\/thinkerqaq\.github\.io\/articles\/a\/\)/u);
  assert.match(result.markdown, /\[example\]\(\/articles\/inside\/\)/u);
  assert.match(result.markdown, /src=\"\/inside\.png\"/u);
});

test("root-relative Markdown and HTML links become absolute outside fences", () => {
  const result = makeExternalLinksAbsolute(
    "[notes](/notes/foo/)\n<img src=\"/media/a.png\">",
  );
  assert.equal(
    result,
    "[notes](https://thinkerqaq.github.io/notes/foo/)\n<img src=\"https://thinkerqaq.github.io/media/a.png\">",
  );
});

test("asset collection deduplicates repeated Mermaid source", () => {
  const source = [
    "```mermaid",
    "flowchart LR",
    "A --> B",
    "```",
    "",
    "```mermaid",
    "flowchart LR",
    "A --> B",
    "```",
  ].join("\n");
  assert.equal(collectPublishingAssets(source).length, 1);
});

test("Mermaid accessibility metadata becomes image alt text", () => {
  const source = [
    "flowchart LR",
    "accTitle: Lock acquisition",
    "accDescr: Mutex fast and slow paths",
    "A --> B",
  ].join("\n");
  const result = compilePublishingMarkdown(
    ["```mermaid", source, "```"].join("\n"),
    { platform: "csdn" },
  );
  assert.match(result.markdown, /!\[Mutex fast and slow paths\]/u);
});
