import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { LOCALES, type Locale } from "../config/i18n";
import { SITE } from "../config/site";
import { articleHref, sortArticles } from "./content";

export async function createArticleRss(locale: Locale, site?: URL) {
  const localeInfo = LOCALES[locale];
  const entries = sortArticles(
    await getCollection(
      "articles",
      ({ data }) => data.status === "published" && data.language === locale,
    ),
  );

  return rss({
    title: localeInfo.rss.title,
    description: localeInfo.rss.description,
    site: site ?? new URL(SITE.url),
    items: entries.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.publishedAt,
      link: articleHref(entry),
      categories: entry.data.tags,
    })),
    customData: `<language>${localeInfo.rss.language}</language>`,
  });
}
