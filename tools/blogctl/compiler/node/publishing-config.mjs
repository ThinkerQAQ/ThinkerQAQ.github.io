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
