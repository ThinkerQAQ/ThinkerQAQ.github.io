import { getCollection } from "astro:content";
import { articleIsIncluded } from "../../lib/content";

// Match article page visibility: production must not expose draft bodies.
export async function getStaticPaths() {
  const articles = await getCollection("articles");
  return articles.filter(articleIsIncluded).map((article) => ({
    params: { slug: article.id },
    props: { body: article.body ?? "" },
  }));
}

export function GET({ props }: { props: { body: string } }) {
  return new Response(props.body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
    },
  });
}
