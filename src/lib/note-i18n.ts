import type { CollectionEntry } from "astro:content";
import { DEFAULT_LOCALE, type Locale } from "../config/i18n";
import { getNoteTopicPath, type NoteEntry } from "./content";
import {
  localizeNoteCategoryLabel,
  localizeNoteTopicLabel,
} from "./note-taxonomy-i18n";

export type NoteTranslationEntry = CollectionEntry<"noteTranslations">;

export function noteTranslationFor(
  note: NoteEntry,
  translations: NoteTranslationEntry[],
  locale: Locale,
): NoteTranslationEntry | undefined {
  if (locale === DEFAULT_LOCALE) return undefined;
  return translations.find(
    (translation) =>
      translation.data.translationOf === note.id
      && translation.data.language === locale,
  );
}

export function localizeNoteMetadata(
  note: NoteEntry,
  translations: NoteTranslationEntry[],
  locale: Locale,
): NoteEntry {
  if (locale === DEFAULT_LOCALE) return note;

  const translation = noteTranslationFor(note, translations, locale);
  const topicPath = getNoteTopicPath(note).map((segment) => ({
    ...segment,
    label: localizeNoteTopicLabel(
      note.data.category,
      segment.id,
      segment.label,
      locale,
    ),
  }));

  return {
    ...note,
    data: {
      ...note.data,
      categoryLabel: localizeNoteCategoryLabel(
        note.data.category,
        note.data.categoryLabel,
        locale,
      ),
      ...(note.data.topic
        ? {
            topicLabel: localizeNoteTopicLabel(
              note.data.category,
              note.data.topic,
              note.data.topicLabel ?? note.data.topic,
              locale,
            ),
          }
        : {}),
      ...(topicPath.length > 0 ? { topicPath } : {}),
      ...(translation
        ? {
            title: translation.data.title,
            description: translation.data.description,
            language: translation.data.language,
            updatedAt: translation.data.updatedAt,
          }
        : {}),
    },
  } as NoteEntry;
}

export function localizeNotes(
  notes: NoteEntry[],
  translations: NoteTranslationEntry[],
  locale: Locale,
): NoteEntry[] {
  return notes.map((note) => localizeNoteMetadata(note, translations, locale));
}
