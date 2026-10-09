import test from "node:test";
import assert from "node:assert/strict";
import { diagramKey, diagramUrl, normalize, validateSvg } from "./core.mjs";

test("Mermaid hashes normalize line endings and change with content", () => {
  assert.equal(normalize("flowchart LR\r\n A-->B "), "flowchart LR\n A-->B\n");
  assert.equal(diagramKey("flowchart LR\r\n A-->B"), diagramKey("flowchart LR\n A-->B"));
  assert.notEqual(diagramKey("flowchart LR\n A-->B"), diagramKey("flowchart LR\n A-->C"));
  assert.throws(() => diagramKey("  "), /Empty Mermaid/);
  assert.throws(() => diagramUrl("../../etc/passwd"), /Invalid diagram key/);
});

test("only validated static SVG enters the cache", () => {
  assert.match(validateSvg('<svg xmlns="http://www.w3.org/2000/svg"><text>A</text></svg>'), /<svg/);
  for (const input of [
    "", "<html>not SVG</html>", "<svg><script>danger()</script></svg>",
    '<svg onload="danger()"></svg>', '<svg><image href="https://other.example/x"/></svg>',
    '<svg><a href="javascript:alert(1)"></a></svg>',
  ]) assert.throws(() => validateSvg(input));
});
