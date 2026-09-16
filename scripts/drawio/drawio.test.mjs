import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  OUTPUT_ROOT,
  diagramUrl,
  outputRelativePath,
  resolveInside,
  sha256,
  validateSvg,
} from "./core.mjs";
import { exportSvg, findDrawIoExecutable } from "./runtime.mjs";

test("draw.io sources map to stable SVG paths and URLs", () => {
  assert.equal(outputRelativePath("agent/runtime.drawio"), "agent/runtime.svg");
  assert.equal(outputRelativePath("系统设计.drawio"), "系统设计.svg");
  assert.equal(diagramUrl("系统设计/执行 流程.svg"), "/diagrams/drawio/%E7%B3%BB%E7%BB%9F%E8%AE%BE%E8%AE%A1/%E6%89%A7%E8%A1%8C%20%E6%B5%81%E7%A8%8B.svg");
  assert.throws(() => outputRelativePath("../private.drawio"));
  assert.throws(() => outputRelativePath("diagram.svg"));
  assert.throws(() => resolveInside(OUTPUT_ROOT, "../../private.svg"));
});

test("draw.io hashes are deterministic", () => {
  assert.equal(sha256("same"), sha256(Buffer.from("same")));
  assert.notEqual(sha256("same"), sha256("different"));
});

test("draw.io SVG validation accepts static diagrams and rejects active or remote content", () => {
  const safe = '<svg xmlns="http://www.w3.org/2000/svg"><text>Agent Runtime</text></svg>';
  assert.equal(validateSvg(safe), `${safe}\n`);
  for (const unsafe of [
    "<html>not svg</html>",
    '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)">x</a></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.com/x.png"/></svg>',
  ]) assert.throws(() => validateSvg(unsafe));
});

test("resolved output remains under the generated directory", () => {
  assert.equal(resolveInside(OUTPUT_ROOT, "agent/runtime.svg"), path.join(OUTPUT_ROOT, "agent", "runtime.svg"));
});

test("installed draw.io Desktop exports a real editable source", async (t) => {
  const executable = await findDrawIoExecutable();
  if (!executable) return t.skip("draw.io Desktop is not installed");
  const temporary = await mkdtemp(path.join(os.tmpdir(), "thinkerqaq-drawio-test-"));
  const source = fileURLToPath(new URL("./fixtures/basic.drawio", import.meta.url));
  const output = path.join(temporary, "basic.svg");
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const svg = await exportSvg(executable, source, output);
  assert.match(svg, /Agent Runtime/);
  assert.equal(validateSvg(await readFile(output)), svg);
});
