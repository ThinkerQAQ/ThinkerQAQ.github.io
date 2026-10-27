/**
 * Choose recent, publishable notes for the home page without flooding the list
 * when an entire category is imported at once. Historical notes remain in the
 * knowledge-category archive and never enter the recent feed.
 *
 * @template {{ id: string, data: { category: string, updatedAt: Date, status: string, indexable: boolean, featured?: boolean, order: number } }} T
 * @param {T[]} notes
 * @param {{ limit?: number, maxPerCategory?: number }} [options]
 * @returns {T[]}
 */
export function selectRecentNotes(notes, { limit = 3, maxPerCategory = 2 } = {}) {
  if (limit < 1 || maxPerCategory < 1) return [];

  const eligible = notes
    .filter((note) => note.data.indexable && note.data.status === "active")
    .sort((a, b) =>
      b.data.updatedAt.getTime() - a.data.updatedAt.getTime()
      || Number(Boolean(b.data.featured)) - Number(Boolean(a.data.featured))
      || a.data.order - b.data.order
      || a.id.localeCompare(b.id),
    );

  const chosen = [];
  const counts = new Map();
  for (const note of eligible) {
    const category = note.data.category;
    const count = counts.get(category) ?? 0;
    if (count >= maxPerCategory) continue;
    chosen.push(note);
    counts.set(category, count + 1);
    if (chosen.length === limit) break;
  }
  return chosen;
}
