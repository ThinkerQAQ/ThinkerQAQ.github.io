import type { CollectionEntry } from "astro:content";
import { DEFAULT_LOCALE, type Locale } from "../config/i18n";

export type NoteEntry = CollectionEntry<"notes">;
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
  const translation = noteTranslationFor(note, translations, locale);
  if (!translation) return note;

  return {
    ...note,
    data: {
      ...note.data,
      title: translation.data.title,
      description: translation.data.description,
      language: translation.data.language,
      updatedAt: translation.data.updatedAt,
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
