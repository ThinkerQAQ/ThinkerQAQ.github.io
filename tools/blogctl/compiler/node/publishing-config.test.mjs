import assert from "node:assert/strict";
import test from "node:test";

import {
  defaultPlatformPublishingConfig,
  nativeCanonicalUrl,
  renderPublishingFooter,
  trackedPublishingUrl,
} from "./publishing-config.mjs";

test("publishing defaults keep language and canonical renderer policy", () => {
  assert.equal(defaultPlatformPublishingConfig("cnblogs").language, "zh-CN");
  assert.equal(defaultPlatformPublishingConfig("juejin").language, "zh-CN");
  assert.equal(defaultPlatformPublishingConfig("devto").language, "en");
  assert.equal(defaultPlatformPublishingConfig("medium").language, "en");
  assert.equal(defaultPlatformPublishingConfig("cnblogs").canonical.mode, "footer");
  assert.equal(defaultPlatformPublishingConfig("devto").canonical.mode, "native");
  assert.equal(defaultPlatformPublishingConfig("medium").canonical.mode, "native");
});

test("tracking is renderer-local and can be disabled", () => {
  const canonicalUrl = "https://thinkerqaq.github.io/articles/example/";
  const disabled = {
    ...defaultPlatformPublishingConfig("cnblogs"),
    tracking: { enabled: false },
  };
  assert.equal(trackedPublishingUrl(canonicalUrl, disabled), canonicalUrl);

  const configured = {
    ...defaultPlatformPublishingConfig("cnblogs"),
    tracking: {
      enabled: true,
      source: "cnblogs-custom",
      medium: "referral",
      campaign: "article_syndication",
    },
  };
  const url = new URL(trackedPublishingUrl(canonicalUrl, configured));
  assert.equal(url.searchParams.get("utm_source"), "cnblogs-custom");
  assert.equal(url.searchParams.get("utm_medium"), "referral");
  assert.equal(url.searchParams.get("utm_campaign"), "article_syndication");
});

test("native canonical is emitted only for native renderer strategy", () => {
  const canonicalUrl = "https://thinkerqaq.github.io/en/articles/example/";
  assert.equal(nativeCanonicalUrl(canonicalUrl, defaultPlatformPublishingConfig("devto")), canonicalUrl);
  assert.equal(nativeCanonicalUrl(canonicalUrl, defaultPlatformPublishingConfig("cnblogs")), "");
});

test("footer rendering uses the resolved profile passed by Go", () => {
  const canonicalUrl = "https://thinkerqaq.github.io/articles/example/";
  const profile = {
    footer: { enabled: true, template: "[{site}]({url})" },
    tracking: { enabled: false },
  };
  assert.equal(
    renderPublishingFooter(profile, { canonicalUrl, site: "ThinkerQAQ" }),
    `[ThinkerQAQ](${canonicalUrl})`,
  );
});
