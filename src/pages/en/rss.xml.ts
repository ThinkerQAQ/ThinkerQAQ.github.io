import { createArticleRss } from "../../lib/rss";

export async function GET(context: { site?: URL }) {
  return createArticleRss("en", context.site);
}
