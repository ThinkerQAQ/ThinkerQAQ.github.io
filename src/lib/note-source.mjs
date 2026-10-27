/** @typedef {"zh" | "en"} NoteLocale */

/**
 * Build the static Markdown source URL for a note in the requested language.
 * The note ID stays path-like (nested IDs keep their slashes), while each
 * individual segment is URL-encoded so spaces and Unicode remain safe.
 *
 * @param {string} noteId
 * @param {NoteLocale} locale
 * @returns {string}
 */
export function noteSourceHref(noteId, locale) {
  if (locale !== "zh" && locale !== "en") {
    throw new TypeError(`Unsupported note locale: ${locale}`);
  }
  if (!noteId || noteId.startsWith("/") || noteId.endsWith("/") || noteId.split("/").some((part) => !part)) {
    throw new TypeError("A note source URL requires a non-empty relative note ID");
  }
  const encodedId = noteId.split("/").map((part) => encodeURIComponent(part)).join("/");
  return `/note-source/${locale}/${encodedId}.md`;
}
