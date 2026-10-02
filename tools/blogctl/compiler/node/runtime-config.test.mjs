import assert from "node:assert/strict";
import test from "node:test";

import { loadBlogctlPublishingRuntimeConfig } from "./runtime-config.mjs";

test("uses defaults when Go does not provide publishing policy", () => {
  const config = loadBlogctlPublishingRuntimeConfig({});
  assert.deepEqual(config, {
    mermaid: { format: "png", width: 1200, scale: 2 },
    assets: {
      r2: {
        publicBaseUrl: "https://pub-366a15b6733345039775c083a1fffb3e.r2.dev/",
      },
    },
  });
});

test("R2 environment variables are not configuration sources", () => {
  const config = loadBlogctlPublishingRuntimeConfig({
    R2_BUCKET: "env-bucket",
    R2_PUBLIC_BASE_URL: "https://env.example.com/",
    R2_ACCESS_KEY_ID: "access",
    R2_SECRET_ACCESS_KEY: "secret",
    R2_ACCOUNT_ID: "account",
  });
  assert.equal(config.assets.r2.publicBaseUrl, "https://pub-366a15b6733345039775c083a1fffb3e.r2.dev/");
});

test("Go-resolved publishing JSON is authoritative for compiler and asset policy", () => {
  const config = loadBlogctlPublishingRuntimeConfig({
    BLOGCTL_PUBLISHING_JSON: JSON.stringify({
      compiler: { mermaid: { format: "png", width: 1800, scale: 4 } },
      assets: { r2: { publicBaseUrl: "https://go.example.com/" } },
      platforms: {},
    }),
    BLOGCTL_CONFIG_FILE: "C:/Users/zsk/AppData/Roaming/BlogCTL/blogctl.toml",
    R2_BUCKET: "must-not-win",
  });
  assert.deepEqual(config, {
    mermaid: { format: "png", width: 1800, scale: 4 },
    assets: { r2: { publicBaseUrl: "https://go.example.com/" } },
  });
});
