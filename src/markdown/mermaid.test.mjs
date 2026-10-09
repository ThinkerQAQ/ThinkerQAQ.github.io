import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { createSatteriMarkdownProcessor } from "@astrojs/markdown-satteri";
import { CACHE, diagramKey, diagramUrl } from "../../scripts/mermaid/core.mjs";
import mermaidMarkdown, { isMermaid, mermaidBlock } from "./mermaid.mjs";

test("recognizes Mermaid fences only", () => {
  assert.equal(isMermaid({ type: "code", lang: "mermaid" }), true);
  assert.equal(isMermaid({ type: "code", lang: "MERMAID" }), true);
  assert.equal(isMermaid({ type: "code", lang: "mmd" }), false);
});

test("site Markdown emits prebuilt SVG and preserves other code", async (t) => {
  const source = "flowchart LR\n  A[Write Markdown] --> B[Static SVG]";
  const key = diagramKey(source);
  await mkdir(CACHE, { recursive: true });
  const fixture = path.join(CACHE, key + ".svg");
  await writeFile(fixture, '<svg xmlns="http://www.w3.org/2000/svg"><text>Test</text></svg>');
  t.after(() => unlink(fixture));
  const processor = await createSatteriMarkdownProcessor({ mdastPlugins: [mermaidMarkdown], syntaxHighlight: false });
  const result = await processor.render("```mermaid\n" + source + "\n```\n\n```js\nconst n = 1;\n```");
  assert.ok(result.code.includes('src="' + diagramUrl(key) + '"'));
  assert.ok(result.code.includes('class="mermaid-diagram"'));
  assert.ok(result.code.includes("const n = 1;"));
  assert.ok(!result.code.includes("flowchart LR"));
});

test("malicious markup in Mermaid source is never injected into HTML", async (t) => {
  const source = 'flowchart LR\nA[<script>alert(1)</script>] --> B[Safe]';
  const key = diagramKey(source);
  await mkdir(CACHE, { recursive: true });
  const fixture = path.join(CACHE, key + ".svg");
  await writeFile(fixture, '<svg xmlns="http://www.w3.org/2000/svg"><text>Safe</text></svg>');
  t.after(() => unlink(fixture));
  const processor = await createSatteriMarkdownProcessor({ mdastPlugins: [mermaidMarkdown], syntaxHighlight: false });
  const result = await processor.render("```mermaid\n" + source + "\n```");
  assert.ok(!result.code.includes("<script>alert(1)</script>"));
  assert.ok(result.code.includes(diagramUrl(key)));
});

test("missing and empty Mermaid SVG fail with file context", () => {
  assert.throws(() => mermaidBlock({ value: " " }, "fixture.md"), /Empty Mermaid diagram/);
  assert.throws(() => mermaidBlock({
    value: "flowchart LR\nA[unique-missing-svg-2026] --> B[Missing]",
    position: { start: {line: 7} },
  }, "fixture.md"), /fixture\.md:7: Mermaid cache missing/);
});
