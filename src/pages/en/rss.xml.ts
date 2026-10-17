import rss from "@astrojs/rss";
import { SITE } from "../../config/site";
import { getFeedItems } from "../../lib/rss";

export async function GET(context: { site?: URL }) {
  return rss({
    title: SITE.title,
    description: "New articles, photography, and monthly fitness summaries.",
    site: context.site ?? new URL(SITE.url),
    items: await getFeedItems("en"),
    customData: "<language>en</language>",
  });
}
