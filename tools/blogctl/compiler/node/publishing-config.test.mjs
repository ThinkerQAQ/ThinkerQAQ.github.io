import assert from "node:assert/strict";
import test from "node:test";

import {
  renderPublishingFooter,
  trackedPublishingUrl,
} from "./publishing-config.mjs";

test("tracking can be disabled by the Go-resolved renderer profile", () => {
  const canonicalUrl = "https://thinkerqaq.github.io/articles/example/";
  assert.equal(
    trackedPublishingUrl(canonicalUrl, { tracking: { enabled: false } }),
    canonicalUrl,
  );
});

test("tracking uses the resolved UTM fields", () => {
  const canonicalUrl = "https://thinkerqaq.github.io/articles/example/";
  const url = new URL(trackedPublishingUrl(canonicalUrl, {
    tracking: {
      enabled: true,
      source: "cnblogs-custom",
      medium: "referral",
      campaign: "article_syndication",
    },
  }));
  assert.equal(url.searchParams.get("utm_source"), "cnblogs-custom");
  assert.equal(url.searchParams.get("utm_medium"), "referral");
  assert.equal(url.searchParams.get("utm_campaign"), "article_syndication");
});

test("footer rendering consumes the profile passed by Go", () => {
  const canonicalUrl = "https://thinkerqaq.github.io/articles/example/";
  const profile = {
    footer: { enabled: true, template: "[{site}]({url}) — {title}" },
    tracking: { enabled: false },
  };
  assert.equal(
    renderPublishingFooter(profile, {
      canonicalUrl,
      site: "ThinkerQAQ",
      title: "Example",
    }),
    `[ThinkerQAQ](${canonicalUrl}) — Example`,
  );
});

test("disabled footer renders nothing", () => {
  assert.equal(
    renderPublishingFooter(
      { footer: { enabled: false, template: "ignored" }, tracking: { enabled: true } },
      { canonicalUrl: "https://thinkerqaq.github.io/articles/example/" },
    ),
    "",
  );
});
