import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { LOCALES } from "../../config/i18n";
import { SITE } from "../../config/site";
import { articleHref, sortArticles } from "../../lib/content";

export async function GET(context: { site?: URL }) {
  const entries = sortArticles(await getCollection("articles", ({ data }) =>
    data.status === "published" && data.language === "en",
  ));
  return rss({
    title: SITE.title,
    description: LOCALES.en.ui.articlesDescription,
    site: context.site ?? new URL(SITE.url),
    items: entries.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.publishedAt,
      link: articleHref(entry),
      categories: entry.data.tags,
    })),
    customData: "<language>en</language>",
  });
}
