import { getCollection } from "astro:content";
import { DEFAULT_LOCALE } from "../../../config/i18n";

export async function getStaticPaths() {
  const [notes, translations] = await Promise.all([
    getCollection("notes"),
    getCollection("noteTranslations"),
  ]);
  const noteIds = new Set(notes.map((note) => note.id));
  const originalPaths = notes.flatMap((note) => {
    const body = note.body;
    if (typeof body !== "string" || !body.trim()) return [];
    return [{
      params: { locale: DEFAULT_LOCALE, slug: note.id },
      props: { body },
    }];
  });
  const translatedPaths = translations.flatMap((translation) => {
    const body = translation.body;
    if (
      translation.data.language === DEFAULT_LOCALE
      || !noteIds.has(translation.data.translationOf)
      || typeof body !== "string"
      || !body.trim()
    ) return [];
    return [{
      params: { locale: translation.data.language, slug: translation.data.translationOf },
      props: { body },
    }];
  });
  return [...originalPaths, ...translatedPaths];
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
