import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { SITE } from "../config/site";
import { articleHref, sortArticles } from "../lib/content";

export async function GET(context: { site?: URL }) {
  const entries = sortArticles(await getCollection("articles", ({ data }) => data.status === "published"));

  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site ?? new URL(SITE.url),
    items: entries.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.publishedAt,
      link: articleHref(entry),
      categories: entry.data.tags,
    })),
    customData: `<language>zh-cn</language>`,
  });
}
