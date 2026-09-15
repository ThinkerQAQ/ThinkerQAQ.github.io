// Note categories are alphabetically grouped by groupByCategory() first.
// Categories published after the original Notes taxonomy belong at the end of
// the Notes index. Append each newly published category slug here so the
// existing layout stays stable instead of letting a new category jump upward
// because of its label.
const APPENDED_NOTE_CATEGORY_ORDER = [
  "security",
  "observability",
  "web-server-nginx",
  "testing-performance",
  "economics",
  "investing",
  "photography",
] as const;

export function orderNoteCategoriesAtEnd<T extends { category: string }>(groups: T[]): T[] {
  const appendedOrder = new Map<string, number>(
    APPENDED_NOTE_CATEGORY_ORDER.map((category, index) => [category, index] as const),
  );

  return [...groups].sort((left, right) => {
    const leftOrder = appendedOrder.get(left.category);
    const rightOrder = appendedOrder.get(right.category);

    if (leftOrder === undefined && rightOrder === undefined) return 0;
    if (leftOrder === undefined) return -1;
    if (rightOrder === undefined) return 1;
    return leftOrder - rightOrder;
  });
}
