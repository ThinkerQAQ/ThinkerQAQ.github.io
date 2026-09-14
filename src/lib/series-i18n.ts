import type { CollectionEntry } from "astro:content";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type Locale,
  type LocaleAlternative,
} from "../config/i18n";
import { seriesHref, type ArticleEntry, type SeriesEntry } from "./content";

export function seriesHasLocaleSummary(series: SeriesEntry, locale: Locale): boolean {
  return locale === DEFAULT_LOCALE || Boolean(series.data.translations?.[locale]);
}

export function seriesLanguageAlternatives(series: SeriesEntry): LocaleAlternative[] {
  return SUPPORTED_LOCALES
    .filter((locale) => seriesHasLocaleSummary(series, locale))
    .map((locale) => ({ locale, href: seriesHref(series, locale) }));
}

export function seriesArticlesForLocale(
  series: SeriesEntry,
  articles: ArticleEntry[],
  locale: Locale,
): ArticleEntry[] {
  return series.data.relatedArticles.map((rootId) => {
    const root = articles.find(
      (article) => article.id === rootId && article.data.language === DEFAULT_LOCALE,
    );
    if (!root) throw new Error(`Series ${series.id}: referenced article not found: ${rootId}`);
    if (locale === DEFAULT_LOCALE) return root;

    return articles.find(
      (article) => article.data.translationOf === rootId && article.data.language === locale,
    ) ?? root;
  });
}

export function translatedSeriesArticleCount(
  series: CollectionEntry<"series">,
  articles: ArticleEntry[],
  locale: Locale,
): number {
  if (locale === DEFAULT_LOCALE) return series.data.relatedArticles.length;
  return series.data.relatedArticles.filter((rootId) =>
    articles.some(
      (article) => article.data.translationOf === rootId && article.data.language === locale,
    ),
  ).length;
}
