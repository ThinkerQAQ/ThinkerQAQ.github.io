import { DEFAULT_LOCALE, type Locale } from "../config/i18n";
import {
  articleIsIncluded,
  articleTranslationRootId,
  sortArticles,
  type ArticleEntry,
  type NoteEntry,
} from "./content";

export interface ArticleNoteRelationIndex {
  notesByArticleRootId: Map<string, NoteEntry[]>;
  articleRootIdsByNoteId: Map<string, string[]>;
}

function relatedNoteIds(article: ArticleEntry): string[] {
  return article.data.relatedNotes.map((reference) => reference.id);
}

export function buildArticleNoteRelationIndex(
  articles: ArticleEntry[],
  notes: NoteEntry[],
): ArticleNoteRelationIndex {
  const articlesById = new Map(articles.map((article) => [article.id, article]));
  const notesById = new Map(notes.map((note) => [note.id, note]));
  const notesByArticleRootId = new Map<string, NoteEntry[]>();
  const articleRootIdsByNoteId = new Map<string, string[]>();

  for (const article of articles) {
    const noteIds = relatedNoteIds(article);

    if (article.data.translationOf) {
      if (noteIds.length > 0) {
        throw new Error(
          `Article ${article.id}: translated articles must inherit relatedNotes from ${article.data.translationOf}`,
        );
      }

      const root = articlesById.get(article.data.translationOf);
      if (!root) {
        throw new Error(
          `Article ${article.id}: translation root ${article.data.translationOf} not found`,
        );
      }
      if (root.data.translationOf) {
        throw new Error(`Article ${article.id}: translation root cannot itself be a translation`);
      }
      if (root.data.language !== DEFAULT_LOCALE) {
        throw new Error(`Article ${article.id}: translation root must use the default locale`);
      }
      continue;
    }

    if (noteIds.length === 0) continue;
    if (article.data.language !== DEFAULT_LOCALE) {
      throw new Error(
        `Article ${article.id}: relatedNotes must be owned by a default-locale article root`,
      );
    }

    const seen = new Set<string>();
    const relatedNotes = noteIds.map((noteId) => {
      if (seen.has(noteId)) {
        throw new Error(`Article ${article.id}: duplicate related note ${noteId}`);
      }
      seen.add(noteId);

      const note = notesById.get(noteId);
      if (!note) {
        throw new Error(`Article ${article.id}: referenced note not found: ${noteId}`);
      }
      return note;
    });

    notesByArticleRootId.set(article.id, relatedNotes);
    for (const note of relatedNotes) {
      const rootIds = articleRootIdsByNoteId.get(note.id) ?? [];
      rootIds.push(article.id);
      articleRootIdsByNoteId.set(note.id, rootIds);
    }
  }

  return { notesByArticleRootId, articleRootIdsByNoteId };
}

export function getRelatedNotesForArticle(
  article: ArticleEntry,
  index: ArticleNoteRelationIndex,
): NoteEntry[] {
  return index.notesByArticleRootId.get(articleTranslationRootId(article)) ?? [];
}

export function getRelatedArticlesForNote(
  note: NoteEntry,
  locale: Locale,
  articles: ArticleEntry[],
  index: ArticleNoteRelationIndex,
): ArticleEntry[] {
  const rootIds = index.articleRootIdsByNoteId.get(note.id) ?? [];
  const resolved = rootIds.flatMap((rootId) => {
    const root = articles.find((article) => article.id === rootId);
    if (!root) {
      throw new Error(`Related article root not found: ${rootId}`);
    }

    if (locale !== DEFAULT_LOCALE) {
      const translation = articles.find(
        (article) =>
          article.data.translationOf === rootId
          && article.data.language === locale
          && articleIsIncluded(article),
      );
      if (translation) return [translation];
    }

    return articleIsIncluded(root) ? [root] : [];
  });

  return sortArticles(resolved);
}
