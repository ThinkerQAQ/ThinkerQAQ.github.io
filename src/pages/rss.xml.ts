import rss from "@astrojs/rss";
import { SITE } from "../config/site";
import { DEFAULT_LOCALE } from "../config/i18n";
import { getFeedItems } from "../lib/rss";

export async function GET(context: { site?: URL }) {
  return rss({
    title: SITE.title,
    description: "技术文章、摄影记录与健身月报的更新。",
    site: context.site ?? new URL(SITE.url),
    items: await getFeedItems(DEFAULT_LOCALE),
    customData: "<language>zh-CN</language>",
  });
}
