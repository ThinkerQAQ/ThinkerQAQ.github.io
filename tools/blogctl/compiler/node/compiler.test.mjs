import assert from "node:assert/strict";
import test from "node:test";

import {
  assertNoUncompiledDiagrams,
  compilePublishingMarkdown,
  makeExternalLinksAbsolute,
} from "./compiler.mjs";

test("makes root-relative Markdown and HTML links absolute outside code fences", () => {
  const markdown = [
    "[article](/articles/example/)",
    "<img src=\"/media/example.png\">",
    "```html",
    "<img src=\"/must-stay-relative.png\">",
    "```",
  ].join("\n");
  const output = makeExternalLinksAbsolute(markdown);
  assert.match(output, /https:\/\/thinkerqaq\.github\.io\/articles\/example\//u);
  assert.match(output, /https:\/\/thinkerqaq\.github\.io\/media\/example\.png/u);
  assert.match(output, /src="\/must-stay-relative\.png"/u);
});

test("renderer preprocessing keeps ordinary fenced code intact", () => {
  const markdown = "```go\nfmt.Println(\"hello\")\n```";
  const result = compilePublishingMarkdown(markdown, { platform: "juejin" });
  assert.equal(result.markdown, markdown);
  assert.deepEqual(result.assets, []);
});

test("renderer preprocessing rejects Mermaid because Go must compile it first", () => {
  const markdown = "```mermaid\nflowchart LR\nA --> B\n```";
  assert.throws(
    () => compilePublishingMarkdown(markdown, { platform: "devto" }),
    /Uncompiled diagram reached devto output/u,
  );
});

test("renderer preprocessing rejects PlantUML because Go must compile it first", () => {
  const markdown = "```plantuml\n@startuml\nAlice -> Bob\n@enduml\n```";
  assert.throws(
    () => assertNoUncompiledDiagrams(markdown, { platform: "medium" }),
    /Uncompiled diagram reached medium output/u,
  );
});

test("site renderer may keep diagram fences", () => {
  const markdown = "```mermaid\nflowchart LR\nA --> B\n```";
  const result = compilePublishingMarkdown(markdown, { platform: "site" });
  assert.equal(result.markdown, markdown);
});
