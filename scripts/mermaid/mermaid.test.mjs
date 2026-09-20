import test from "node:test";
import assert from "node:assert/strict";
import { createSatteriMarkdownProcessor } from "@astrojs/markdown-satteri";
import mermaidMarkdown, { isMermaid, mermaidBlock } from "./markdown.mjs";

test("recognizes Mermaid fences only", () => {
  assert.equal(isMermaid({ type: "code", lang: "mermaid" }), true);
  assert.equal(isMermaid({ type: "code", lang: "MERMAID" }), true);
  assert.equal(isMermaid({ type: "code", lang: "mmd" }), false);
  assert.equal(isMermaid({ type: "code", lang: "js" }), false);
});

test("site Markdown processor turns Mermaid fences into render targets", async () => {
  const processor = await createSatteriMarkdownProcessor({
    mdastPlugins: [mermaidMarkdown],
    syntaxHighlight: false,
  });
  const result = await processor.render(
    [
      "```mermaid",
      "flowchart LR",
      "  A[Write Markdown] --> B[Render Mermaid]",
      "```",
      "",
      "```js",
      "const n = 1;",
      "```",
    ].join("\\n"),
  );

  assert.match(result.code, /<pre class="mermaid mermaid-diagram">/);
  assert.ok(result.code.includes("flowchart LR"));
  assert.ok(result.code.includes("A[Write Markdown] --&gt; B[Render Mermaid]"));
  assert.ok(result.code.includes("const n = 1;"));
  assert.ok(!result.code.includes('data-language="mermaid"'));
});

test("Mermaid source is escaped as text instead of injected as HTML", async () => {
  const processor = await createSatteriMarkdownProcessor({
    mdastPlugins: [mermaidMarkdown],
    syntaxHighlight: false,
  });
  const result = await processor.render(
    "```mermaid\\nflowchart LR\\nA[<script>alert(1)</script>] --> B\\n```",
  );

  assert.ok(!result.code.includes("<script>alert(1)</script>"));
  assert.ok(result.code.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
});

test("empty Mermaid diagrams fail with file and line context", () => {
  assert.throws(
    () => mermaidBlock({ value: "   ", position: { start: { line: 7 } } }, "fixture.md"),
    /fixture\\.md:7: Empty Mermaid diagram/,
  );
});
