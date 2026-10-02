const ZH_FOOTER = "> 本文首发于 [{site}]({url})，由作者本人同步发布。原文可能持续修订，最新版本请以个人博客为准。";
const EN_FOOTER = "> This article was first published on [{site}]({url}) and syndicated here by the author. The original article may be revised over time; please refer to the personal blog for the latest version.";

function defaultPublishingLanguage(platform) {
  return platform === "devto" || platform === "medium" ? "en" : "zh-CN";
}

function defaultCanonicalMode(platform) {
  return platform === "devto" || platform === "medium" ? "native" : "footer";
}

function defaultFooterTemplate(language) {
  return language === "en" ? EN_FOOTER : ZH_FOOTER;
}

export function defaultPlatformPublishingConfig(platform) {
  const language = defaultPublishingLanguage(platform);
  return {
    language,
    changedOnly: false,
    footer: {
      enabled: true,
      template: defaultFooterTemplate(language),
    },
    canonical: {
      mode: defaultCanonicalMode(platform),
    },
    tracking: {
      enabled: true,
      source: platform,
      medium: "referral",
      campaign: "article_syndication",
    },
  };
}

export function trackedPublishingUrl(canonicalUrl, config = {}) {
  const url = new URL(canonicalUrl);
  const tracking = config.tracking ?? {};
  if (tracking.enabled === false) return url.toString();

  const parameters = {
    utm_source: String(tracking.source || "").trim(),
    utm_medium: String(tracking.medium || "").trim(),
    utm_campaign: String(tracking.campaign || "").trim(),
  };
  for (const [key, value] of Object.entries(parameters)) {
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}

export function nativeCanonicalUrl(canonicalUrl, config = {}) {
  return config?.canonical?.mode === "native" ? new URL(canonicalUrl).toString() : "";
}

export function renderPublishingFooter(config, {
  canonicalUrl,
  title = "",
  site = "ThinkerQAQ 的个人博客",
} = {}) {
  if (!config?.footer?.enabled) return "";
  const trackedUrl = trackedPublishingUrl(canonicalUrl, config);
  return String(config.footer.template || "")
    .replaceAll("{url}", trackedUrl)
    .replaceAll("{title}", String(title))
    .replaceAll("{site}", String(site))
    .trim();
}
