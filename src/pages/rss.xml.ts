import { DEFAULT_LOCALE } from "../config/i18n";
import { createArticleRss } from "../lib/rss";

export async function GET(context: { site?: URL }) {
  return createArticleRss(DEFAULT_LOCALE, context.site);
}
