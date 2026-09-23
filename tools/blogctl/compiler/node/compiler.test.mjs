import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_R2_PUBLIC_BASE_URL,
  assertNoUncompiledDiagrams,
  collectPublishingAssets,
  compilePublishingMarkdown,
  makeExternalLinksAbsolute,
  mermaidAssetForSource,
} from "./compiler.mjs";

const fence = String.fromCharCode(96).repeat(3);

test("compiles Mermaid fences to content-addressed R2 PNG URLs", () => {
  const markdown = ["Before", fence + "mermaid", "flowchart LR", "  accTitle: Lock path", "  A --> B", fence, "After"].join("\n");
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

test("preserves ordinary code fences while normalizing external links", () => {
  const markdown = ["[outside](/notes/a/)", fence + "text", "[inside](/notes/b/)", fence].join("\n");
  const output = makeExternalLinksAbsolute(markdown);
  assert.match(output, /https:\/\/thinkerqaq\.github\.io\/notes\/a\//u);
  assert.match(output, /\[inside\]\(\/notes\/b\/\)/u);
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
    /Unclosed diagram fenced block/u,
  );
});


test("compiles Mermaid sequence diagrams for every publishing platform", () => {
  const platforms = [
    "cnblogs", "juejin", "csdn", "segmentfault", "zhihu",
    "51cto", "oschina", "toutiao", "devto", "medium",
  ];
  const markdown = [
    "Before",
    fence + "mermaid",
    "sequenceDiagram",
    "  participant J as Java Code",
    "  participant R as Runtime",
    "  J->>R: synchronized",
    "  R-->>J: acquired",
    fence,
    "After",
  ].join("\n");

  for (const platform of platforms) {
    const result = compilePublishingMarkdown(markdown, { platform });
    assert.equal(result.assets.length, 1, platform);
    assert.doesNotMatch(result.markdown, /sequenceDiagram/u, platform);
    assert.match(result.markdown, /generated\/mermaid\/[a-f0-9]{24}\.png/u, platform);
  }
});

test("accepts diagram and uml fence aliases when the payload is Mermaid", () => {
  for (const language of ["diagram", "uml"]) {
    const markdown = [
      fence + language,
      "sequenceDiagram",
      "  A->>B: call",
      fence,
    ].join("\n");
    const result = compilePublishingMarkdown(markdown, { platform: "csdn" });
    assert.equal(result.assets.length, 1, language);
    assert.doesNotMatch(result.markdown, /sequenceDiagram/u, language);
    assert.match(result.markdown, /generated\/mermaid\/[a-f0-9]{24}\.png/u, language);
  }
});

test("compiles PlantUML fences to content-addressed PNG assets for every publishing platform", () => {
  const platforms = [
    "cnblogs", "juejin", "csdn", "segmentfault", "zhihu",
    "51cto", "oschina", "toutiao", "devto", "medium",
  ];
  const markdown = [
    fence + "plantuml",
    "@startuml",
    "Alice -> Bob: hello",
    "@enduml",
    fence,
  ].join("\n");

  for (const platform of platforms) {
    const result = compilePublishingMarkdown(markdown, { platform });
    assert.equal(result.assets.length, 1, platform);
    assert.equal(result.assets[0].kind, "plantuml", platform);
    assert.doesNotMatch(result.markdown, /@startuml/u, platform);
    assert.match(result.markdown, /generated\/plantuml\/[a-f0-9]{64}\.png/u, platform);
  }
});

test("accepts uml and diagram aliases when the payload is PlantUML", () => {
  for (const language of ["uml", "diagram"]) {
    const markdown = [
      fence + language,
      "@startuml",
      "Alice -> Bob: hello",
      "@enduml",
      fence,
    ].join("\n");
    const result = compilePublishingMarkdown(markdown, { platform: "csdn" });
    assert.equal(result.assets.length, 1, language);
    assert.equal(result.assets[0].kind, "plantuml", language);
    assert.doesNotMatch(result.markdown, /@startuml/u, language);
  }
});


test("rejects platform output that still contains a diagram fence", () => {
  const raw = [fence + "mermaid", "sequenceDiagram", "  A->>B: call", fence].join("\n");
  assert.throws(
    () => assertNoUncompiledDiagrams(raw, { platform: "csdn" }),
    /Uncompiled diagram reached csdn output/u,
  );
  assert.doesNotThrow(() => assertNoUncompiledDiagrams("plain text", { platform: "csdn" }));
});
