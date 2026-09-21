import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_R2_PUBLIC_BASE_URL,
  loadR2Config,
  publicR2Url,
  signR2Put,
  uploadR2Object,
} from "./r2.mjs";

const config = {
  accountId: "account",
  accessKeyId: "access",
  secretAccessKey: "secret",
  bucket: "blog-assets",
  endpoint: "https://account.r2.cloudflarestorage.com",
  publicBaseUrl: DEFAULT_R2_PUBLIC_BASE_URL,
};

test("loads R2 publishing configuration from environment", () => {
  assert.deepEqual(loadR2Config({
    R2_ACCOUNT_ID: "a",
    R2_ACCESS_KEY_ID: "b",
    R2_SECRET_ACCESS_KEY: "c",
    R2_BUCKET: "d",
  }), {
    accountId: "a",
    accessKeyId: "b",
    secretAccessKey: "c",
    bucket: "d",
    endpoint: "https://a.r2.cloudflarestorage.com",
    publicBaseUrl: DEFAULT_R2_PUBLIC_BASE_URL,
  });
});

test("signs a path-style Cloudflare R2 PUT request", () => {
  const signed = signR2Put({
    objectKey: "generated/mermaid/example.png",
    body: Buffer.from("png"),
    config,
    now: new Date("2026-09-21T00:00:00Z"),
  });
  assert.equal(
    signed.url,
    "https://account.r2.cloudflarestorage.com/blog-assets/generated/mermaid/example.png",
  );
  assert.match(signed.headers.authorization, /^AWS4-HMAC-SHA256 Credential=access\/20260921\/auto\/s3\/aws4_request/u);
  assert.equal(signed.headers["x-amz-date"], "20260921T000000Z");
  assert.equal(signed.headers["content-type"], "image/png");
});

test("uploads bytes and returns the stable public R2 URL", async () => {
  const calls = [];
  const result = await uploadR2Object({
    objectKey: "generated/mermaid/example.png",
    body: Buffer.from("png"),
    config,
    now: () => new Date("2026-09-21T00:00:00Z"),
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return new Response("", { status: 200 });
    },
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.method, "PUT");
  assert.equal(
    result.publicUrl,
    "https://pub-366a15b6733345039775c083a1fffb3e.r2.dev/generated/mermaid/example.png",
  );
  assert.equal(result.publicUrl, publicR2Url("generated/mermaid/example.png", config));
});
