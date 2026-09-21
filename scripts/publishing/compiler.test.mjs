import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_R2_PUBLIC_BASE_URL,
  collectPublishingAssets,
  compilePublishingMarkdown,
  makeExternalLinksAbsolute,
  mermaidAssetForSource,
} from "./compiler.mjs";

const fence = String.fromCharCode(96).repeat(3);

test("compiles Mermaid fences to content-addressed R2 PNG URLs", () => {
  const markdown = [
    "Before",
    fence + "mermaid",
    "flowchart LR",
    "  accTitle: Lock path",
    "  A --> B",
    fence,
    "After",
  ].join("\n");
  const result = compilePublishingMarkdown(markdown, { platform: "devto" });
  assert.equal(result.assets.length, 1);
  assert.equal(result.assets[0].objectKey.startsWith("generated/mermaid/"), true);
  assert.equal(result.assets[0].publicUrl.startsWith(DEFAULT_R2_PUBLIC_BASE_URL), true);
  assert.match(result.markdown, /!\[Lock path\]\(https:\/\/pub-366a15b6733345039775c083a1fffb3e\.r2\.dev\/generated\/mermaid\/[a-f0-9]{24}\.png\)/u);
  assert.doesNotMatch(result.markdown, /flowchart LR/u);
});

test("site compilation preserves Mermaid source", () => {
  const markdown = fence + "mermaid\nflowchart LR\nA --> B\n" + fence;
  const result = compilePublishingMarkdown(markdown, { platform: "site" });
  assert.equal(result.markdown, markdown);
  assert.equal(result.assets.length, 0);
});

test("preserves ordinary code fences and does not rewrite links inside them", () => {
  const markdown = [
    "[outside](/notes/a/)",
    fence + "text",
    "[inside](/notes/b/)",
    '<img src="/inside.png">',
    fence,
  ].join("\n");
  const output = makeExternalLinksAbsolute(markdown);
  assert.match(output, /https:\/\/thinkerqaq\.github\.io\/notes\/a\//u);
  assert.match(output, /\[inside\]\(\/notes\/b\/\)/u);
  assert.equal(output.includes('src="/inside.png"'), true);
});

test("deduplicates identical Mermaid diagrams", () => {
  const block = fence + "mermaid\nflowchart LR\nA --> B\n" + fence;
  assert.equal(collectPublishingAssets(block + "\n\n" + block).length, 1);
});

test("renderer identity participates in the asset hash", () => {
  const first = mermaidAssetForSource("flowchart LR\nA --> B", { renderer: "renderer-a" });
  const second = mermaidAssetForSource("flowchart LR\nA --> B", { renderer: "renderer-b" });
  assert.notEqual(first.id, second.id);
});

test("rejects an unclosed Mermaid fence", () => {
  assert.throws(
    () => compilePublishingMarkdown(fence + "mermaid\nflowchart LR\nA --> B", { platform: "devto" }),
    /Unclosed Mermaid fenced block/u,
  );
});
