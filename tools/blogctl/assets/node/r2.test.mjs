import assert from "node:assert/strict";
import test from "node:test";

import { publicR2Url, signR2Put, uploadR2Object } from "./r2.mjs";

const config = {
  accountId: "account",
  accessKeyId: "access",
  secretAccessKey: "secret",
  bucket: "blog-assets",
  endpoint: "https://account.r2.cloudflarestorage.com",
  publicBaseUrl: "https://pub-366a15b6733345039775c083a1fffb3e.r2.dev/",
};

test("signs a path-style Cloudflare R2 PUT request", () => {
  const signed = signR2Put({
    objectKey: "generated/mermaid/example.png",
    body: Buffer.from("png"),
    config,
    now: new Date("2026-09-21T00:00:00Z"),
  });
  assert.equal(signed.url, "https://account.r2.cloudflarestorage.com/blog-assets/generated/mermaid/example.png");
  assert.match(signed.headers.authorization, /^AWS4-HMAC-SHA256 Credential=access\/20260921\/auto\/s3\/aws4_request/u);
});

test("uploads bytes and returns the stable public R2 URL", async () => {
  const result = await uploadR2Object({
    objectKey: "generated/mermaid/example.png",
    body: Buffer.from("png"),
    config,
    now: () => new Date("2026-09-21T00:00:00Z"),
    fetchImpl: async () => new Response("", { status: 200 }),
  });
  assert.equal(result.publicUrl, publicR2Url("generated/mermaid/example.png", config));
});
