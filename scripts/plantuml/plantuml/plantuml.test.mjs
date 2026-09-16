import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { unified } from "unified";
import remarkParse from "remark-parse";
import { CACHE, normalize, diagramKey, diagramUrl, validateSvg, visitCode } from "./core.mjs";
import plantumlMarkdown, { diagramImage } from "./markdown.mjs";
import { createSatteriMarkdownProcessor } from "@astrojs/markdown-satteri";
import { ensureJar, renderSvg } from "./runtime.mjs";

test("legacy snippets and Windows newlines normalize to the same diagram", () => {
  const full = "@startuml\nAlice -> Bob: hello\n@enduml\n";
  assert.equal(normalize("Alice -> Bob: hello"), full);
  assert.equal(diagramKey(full), diagramKey(full.replaceAll("\n", "\r\n")));
  assert.notEqual(diagramKey(full), diagramKey(full.replace("hello", "goodbye")));
});

test("reject empty, mismatched, multiple, external and environment-reading sources", () => {
  for (const source of ["", "@startuml\na -> b", "@startuml\na -> b\n@endjson", "@startuml\n@enduml\n@startuml\n@enduml", "!include https://example.com/a.puml", "!include ../private.txt", "!theme remote", "title %getenv(\"TOKEN\")"]) {
    assert.throws(() => normalize(source));
  }
  assert.doesNotThrow(() => normalize("'!include https://example.com/comment-only\na -> b"));
});

test("parse nested puml and plantuml fences, without matching ordinary code examples", () => {
  const markdown = '> ```puml\n> a -> b\n> ```\n\n- ```plantuml\n  b -> c\n  ```\n\n````text\n```puml\nx -> y\n```\n````';
  const sources = [];
  visitCode(unified().use(remarkParse).parse(markdown), (node) => sources.push(node.value));
  assert.deepEqual(sources, ["a -> b", "b -> c"]);
});

test("SVG validation rejects failures, active content and external assets", () => {
  assert.equal(validateSvg('<svg xmlns="http://www.w3.org/2000/svg"><text>hello</text></svg>').startsWith("<svg"), true);
  for (const svg of ["", "<html>error</html>", "<svg>Syntax Error</svg>", "<svg><script>alert(1)</script></svg>", '<svg><image href="https://example.com/x.png"/></svg>', '<svg onload="alert(1)"></svg>']) {
    assert.throws(() => validateSvg(svg));
  }
  assert.throws(() => diagramUrl("../../private"));
});

test("site Markdown processor rewrites cached diagrams and leaves normal code alone", async (t) => {
  const source = "Alice -> Bob: isolated-markdown-test-fixture";
  const diagram = { source, key: diagramKey(source) };
  await mkdir(CACHE, { recursive: true });
  const fixture = path.join(CACHE, `${diagram.key}.svg`);
  try {
    await writeFile(fixture, '<svg xmlns="http://www.w3.org/2000/svg"><text>Test</text></svg>', { flag: "wx" });
    t.after(() => unlink(fixture));
  } catch (error) { if (error.code !== "EEXIST") throw error; }
  const processor = await createSatteriMarkdownProcessor({ mdastPlugins: [plantumlMarkdown], syntaxHighlight: false });
  const result = await processor.render('```puml\n' + diagram.source + '\n```\n\n```js\nconst n = 1;\n```');
  assert.ok(result.code.includes(`src="${diagramUrl(diagram.key)}"`));
  assert.ok(result.code.includes('class="plantuml-diagram"'));
  assert.ok(result.code.includes("const n = 1;"));
  assert.ok(!result.code.includes("@startuml"));
});

test("missing cache fails with actionable file context", () => {
  const tree = unified().use(remarkParse).parse('```puml\na -> b: uncached-test-fixture-09\n```');
  assert.throws(() => diagramImage(tree.children[0], "fixture.md"), /fixture.md:1.*npm run diagrams/);
});

test("local renderer supports Chinese and rejects syntax errors", async () => {
  await ensureJar();
  const svg = await renderSvg("Alice -> Bob: 中文图表");
  assert.match(svg, /<svg/);
  assert.ok(svg.includes("中文图表") || svg.includes("&#"));
  await assert.rejects(renderSvg("@startuml\nthis is definitely not valid syntax !!!\n@enduml"));
});
