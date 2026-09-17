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

export function defaultPlatformPublishingConfig(platform) {
  const english = platform === "devto" || platform === "medium";
  return {
    footerEnabled: true,
    footerTemplate: english ? EN_FOOTER : ZH_FOOTER,
    trackingQuery: `utm_source=${platform}&utm_medium=referral&utm_campaign=article_syndication`,
  };
}

export function defaultPublishingConfig() {
  return Object.fromEntries(PUBLISHING_PLATFORMS.map((platform) => [
    platform,
    defaultPlatformPublishingConfig(platform),
  ]));
}

export function mergePublishingConfig(config = {}) {
  const defaults = defaultPublishingConfig();
  const output = {};
  for (const platform of PUBLISHING_PLATFORMS) {
    const current = config?.[platform] ?? {};
    output[platform] = {
      footerEnabled: current.footerEnabled ?? defaults[platform].footerEnabled,
      footerTemplate: String(current.footerTemplate || defaults[platform].footerTemplate),
      trackingQuery: String(current.trackingQuery || defaults[platform].trackingQuery),
    };
  }
  return output;
}

export async function loadPublishingConfig(env = process.env) {
  const configFile = String(env.BLOGCTL_CONFIG_FILE || "").trim();
  if (!configFile) return defaultPublishingConfig();
  try {
    const parsed = JSON.parse(await readFile(configFile, "utf8"));
    return mergePublishingConfig(parsed?.publishing ?? {});
  } catch {
    return defaultPublishingConfig();
  }
}

export function trackedPublishingUrl(canonicalUrl, config = {}) {
  const url = new URL(canonicalUrl);
  const query = String(config.trackingQuery || "").trim().replace(/^\?/u, "");
  if (!query) return url.toString();
  const parameters = new URLSearchParams(query);
  for (const [key, value] of parameters) {
    if (key) url.searchParams.set(key, value);
  }
  return url.toString();
}

export function renderPublishingFooter(config, {
  canonicalUrl,
  title = "",
  site = "ThinkerQAQ 的个人博客",
} = {}) {
  if (!config?.footerEnabled) return "";
  const trackedUrl = trackedPublishingUrl(canonicalUrl, config);
  return String(config.footerTemplate || "")
    .replaceAll("{url}", trackedUrl)
    .replaceAll("{title}", String(title))
    .replaceAll("{site}", String(site))
    .trim();
}
