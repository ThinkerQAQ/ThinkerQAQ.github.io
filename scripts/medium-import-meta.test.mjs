import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeMediumImportHtml } from "./medium-import-meta.mjs";

test("keeps Medium helper pages noindex without canonical or nofollow", () => {
  const input = `<!doctype html>
<html>
<head>
<meta name="robots" content="noindex,nofollow">
<link rel="canonical" href="https://thinkerqaq.github.io/en/articles/concurrency-series-00/">
<title>Test</title>
</head>
<body><a href="https://thinkerqaq.github.io/en/articles/concurrency-series-00/">Original</a></body>
</html>`;

  const output = sanitizeMediumImportHtml(input);

  assert.match(output, /<meta name="robots" content="noindex">/u);
  assert.doesNotMatch(output, /nofollow/u);
  assert.doesNotMatch(output, /<link rel="canonical"/u);
  assert.match(output, /https:\/\/thinkerqaq\.github\.io\/en\/articles\/concurrency-series-00\//u);
});
