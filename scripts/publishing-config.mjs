import { readFile } from "node:fs/promises";

export const PUBLISHING_PLATFORMS = [
  "cnblogs",
  "juejin",
  "csdn",
  "segmentfault",
  "zhihu",
  "51cto",
  "oschina",
  "toutiao",
  "devto",
  "medium",
];

const ZH_FOOTER = "> 本文首发于 [{site}]({url})，由作者本人同步发布。原文可能持续修订，最新版本请以个人博客为准。";
const EN_FOOTER = "> This article was first published on [{site}]({url}) and syndicated here by the author. The original article may be revised over time; please refer to the personal blog for the latest version.";

function defaultCanonicalMode(platform) {
  return platform === "devto" || platform === "medium" ? "native" : "footer";
}

export function defaultPlatformPublishingConfig(platform) {
  const english = platform === "devto" || platform === "medium";
  return {
    footer: {
      enabled: true,
      template: english ? EN_FOOTER : ZH_FOOTER,
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

export function defaultPublishingConfig() {
  return Object.fromEntries(PUBLISHING_PLATFORMS.map((platform) => [
    platform,
    defaultPlatformPublishingConfig(platform),
  ]));
}

function legacyTracking(trackingQuery, fallback) {
  const value = String(trackingQuery || "").trim().replace(/^\?/u, "");
  if (!value) return fallback;
  const parameters = new URLSearchParams(value);
  return {
    enabled: true,
    source: parameters.get("utm_source") || fallback.source,
    medium: parameters.get("utm_medium") || fallback.medium,
    campaign: parameters.get("utm_campaign") || fallback.campaign,
  };
}

function mergePlatformPublishingConfig(platform, current = {}) {
  const defaults = defaultPlatformPublishingConfig(platform);
  const footer = current.footer ?? {};
  const canonical = current.canonical ?? {};
  const tracking = current.tracking ?? null;
  return {
    footer: {
      enabled: footer.enabled ?? current.footerEnabled ?? defaults.footer.enabled,
      template: String(footer.template || current.footerTemplate || defaults.footer.template),
    },
    canonical: {
      mode: String(canonical.mode || defaults.canonical.mode),
    },
    tracking: tracking
      ? {
          enabled: tracking.enabled ?? defaults.tracking.enabled,
          source: String(tracking.source || defaults.tracking.source),
          medium: String(tracking.medium || defaults.tracking.medium),
          campaign: String(tracking.campaign || defaults.tracking.campaign),
        }
      : legacyTracking(current.trackingQuery, defaults.tracking),
  };
}

export function mergePublishingConfig(config = {}) {
  const output = {};
  for (const platform of PUBLISHING_PLATFORMS) {
    output[platform] = mergePlatformPublishingConfig(platform, config?.[platform] ?? {});
  }
  return output;
}

export async function loadPublishingConfig(env = process.env) {
  const configFile = String(env.BLOGCTL_CONFIG_FILE || "").trim();
  if (!configFile) return defaultPublishingConfig();
  try {
    const parsed = JSON.parse(await readFile(configFile, "utf8"));
    const stored = parsed?.publishing?.platforms ?? parsed?.publishing ?? {};
    return mergePublishingConfig(stored);
  } catch {
    return defaultPublishingConfig();
  }
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
