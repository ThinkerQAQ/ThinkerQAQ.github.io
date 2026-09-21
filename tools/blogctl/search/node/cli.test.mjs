import assert from "node:assert/strict";
import test from "node:test";

import { runSubmit } from "./cli.mjs";

test("Google submit can be optional when CI credentials are absent", async () => {
  const result = await runSubmit([
    "--providers", "google",
    "--optional-google",
    "--site-url", "https://thinkerqaq.github.io/",
  ], {
    env: {},
    fetchImpl: async () => {
      throw new Error("network should not be called");
    },
  });
  assert.deepEqual(result.google, { skipped: true });
});

test("IndexNow submit requires explicit all or URL-file scope", async () => {
  await assert.rejects(
    runSubmit([
      "--providers", "indexnow",
      "--site-url", "https://thinkerqaq.github.io/",
    ], { env: {} }),
    /exactly one of --all or --urls-file/u,
  );
});
