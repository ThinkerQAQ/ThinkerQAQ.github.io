import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  defaultPlatformPublishingConfig,
  loadPublishingConfig,
  mergePublishingConfig,
  nativeCanonicalUrl,
  renderPublishingFooter,
  trackedPublishingUrl,
} from "./publishing-config.mjs";

test("publishing defaults separate languages and canonical strategies", () => {
  assert.equal(defaultPlatformPublishingConfig("cnblogs").language, "zh-CN");
  assert.equal(defaultPlatformPublishingConfig("juejin").language, "zh-CN");
  assert.equal(defaultPlatformPublishingConfig("devto").language, "en");
  assert.equal(defaultPlatformPublishingConfig("medium").language, "en");
  assert.equal(defaultPlatformPublishingConfig("cnblogs").canonical.mode, "footer");
  assert.equal(defaultPlatformPublishingConfig("juejin").canonical.mode, "footer");
  assert.equal(defaultPlatformPublishingConfig("devto").canonical.mode, "native");
  assert.equal(defaultPlatformPublishingConfig("medium").canonical.mode, "native");
});

test("publishing language can be overridden per platform", () => {
  const medium = mergePublishingConfig({ medium: { language: "zh-CN" } }).medium;
  const cnblogs = mergePublishingConfig({ cnblogs: { language: "en" } }).cnblogs;
  assert.equal(medium.language, "zh-CN");
  assert.equal(cnblogs.language, "en");
  assert.match(medium.footer.template, /本文首发于/u);
  assert.match(cnblogs.footer.template, /This article was first published/u);
});

test("tracking can be disabled without changing footer policy", () => {
  const profile = mergePublishingConfig({
    cnblogs: {
      footer: { enabled: true, template: "[{site}]({url})" },
      canonical: { mode: "footer" },
      tracking: { enabled: false },
    },
  }).cnblogs;
  const canonicalUrl = "https://thinkerqaq.github.io/articles/example/";
  assert.equal(trackedPublishingUrl(canonicalUrl, profile), canonicalUrl);
  assert.equal(
    renderPublishingFooter(profile, { canonicalUrl, site: "ThinkerQAQ" }),
    `[ThinkerQAQ](${canonicalUrl})`,
  );
});

test("structured tracking builds platform-specific UTM parameters", () => {
  const profile = mergePublishingConfig({
    cnblogs: {
      tracking: {
        enabled: true,
        source: "cnblogs-custom",
        medium: "referral",
        campaign: "article_syndication",
      },
    },
  }).cnblogs;
  const url = new URL(trackedPublishingUrl("https://thinkerqaq.github.io/articles/example/", profile));
  assert.equal(url.searchParams.get("utm_source"), "cnblogs-custom");
  assert.equal(url.searchParams.get("utm_medium"), "referral");
  assert.equal(url.searchParams.get("utm_campaign"), "article_syndication");
});

test("native canonical is emitted only for native strategy", () => {
  const canonicalUrl = "https://thinkerqaq.github.io/en/articles/example/";
  assert.equal(nativeCanonicalUrl(canonicalUrl, defaultPlatformPublishingConfig("devto")), canonicalUrl);
  assert.equal(nativeCanonicalUrl(canonicalUrl, defaultPlatformPublishingConfig("cnblogs")), "");
});

test("legacy flat publishing config remains readable", () => {
  const profile = mergePublishingConfig({
    cnblogs: {
      footerEnabled: true,
      footerTemplate: "legacy {url}",
      trackingQuery: "utm_source=legacy&utm_medium=referral&utm_campaign=old",
    },
  }).cnblogs;
  assert.equal(profile.footer.enabled, true);
  assert.equal(profile.footer.template, "legacy {url}");
  assert.equal(profile.canonical.mode, "footer");
  assert.equal(profile.tracking.source, "legacy");
  assert.equal(profile.tracking.campaign, "old");
});

test("loader reads new publishing.platforms schema", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "blogctl-publishing-"));
  const configFile = path.join(directory, "config.json");
  await writeFile(configFile, JSON.stringify({
    publishing: {
      platforms: {
        medium: {
          language: "zh-CN",
          footer: { enabled: false, template: "unused" },
          canonical: { mode: "native" },
          tracking: { enabled: false, source: "medium", medium: "referral", campaign: "article_syndication" },
        },
      },
    },
  }));
  const config = await loadPublishingConfig({ BLOGCTL_CONFIG_FILE: configFile });
  assert.equal(config.medium.language, "zh-CN");
  assert.equal(config.medium.footer.enabled, false);
  assert.equal(config.medium.canonical.mode, "native");
  assert.equal(config.medium.tracking.enabled, false);
});
