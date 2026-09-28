import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlPath = new URL("../tools/blogctl/extension/popup/popup.html", import.meta.url);
const logsPath = new URL("../tools/blogctl/extension/popup/logs.js", import.meta.url);

test("logs UI exposes search, selection, and copy controls", async () => {
  const [html, logs] = await Promise.all([
    readFile(htmlPath, "utf8"),
    readFile(logsPath, "utf8"),
  ]);

  assert.match(html, /id="logQuery"/u);
  assert.match(html, /id="selectAllLogs"/u);
  assert.match(html, /id="copyLogs"/u);
  assert.match(logs, /queryInput\.addEventListener\("input", \(\) => render\(\)\)/u);
  assert.match(logs, /selectAllButton\.addEventListener\("click", selectAllLogs\)/u);
  assert.match(logs, /copyButton\.addEventListener\("click", copyLogs\)/u);
  assert.match(logs, /range\.selectNodeContents\(output\)/u);
  assert.match(logs, /render\(\{ preserveSelection: quiet \}\)/u);
  assert.match(logs, /selectionLocksViewer\(\)/u);
  assert.match(logs, /log-line-\$\{level\.toLowerCase\(\)\}/u);
});
