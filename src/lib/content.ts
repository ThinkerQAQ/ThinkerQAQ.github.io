import type { CollectionEntry } from "astro:content";

export type NoteEntry = CollectionEntry<"notes">;
export type ArticleEntry = CollectionEntry<"articles">;
export type ProjectEntry = CollectionEntry<"projects">;
export type SeriesEntry = CollectionEntry<"series">;

export const includeDraftArticles = import.meta.env.INCLUDE_DRAFTS === "true";

export const projectStatus = { exploring: "探索中", building: "开发中", maintained: "维护中", completed: "已完成" };
export const seriesStatus = { planned: "规划中", active: "持续更新", complete: "已完结" };

export function articleIsIncluded(article: ArticleEntry): boolean {
  return article.data.status === "published" || includeDraftArticles;
}

export function noteHref(note: NoteEntry): string {
  return `/notes/${note.id}/`;
}

export function categoryHref(category: string): string {
  return `/notes/category/${encodeURIComponent(category)}/`;
}

export function articleHref(article: ArticleEntry): string {
  return `/articles/${article.id}/`;
}

export function articleTagHref(tag: string): string {
  return `/articles/tags/${encodeURIComponent(tag)}/`;
}

export function projectHref(project: ProjectEntry): string {
  return `/projects/${project.id}/`;
}

export function seriesHref(series: SeriesEntry | string): string {
  const id = typeof series === "string" ? series : series.id;
  return `/series/${id}/`;
}

export function sortByUpdated(notes: NoteEntry[]): NoteEntry[] {
  return [...notes].sort(
    (left, right) => right.data.updatedAt.getTime() - left.data.updatedAt.getTime(),
  );
}

export function sortArticles(articles: ArticleEntry[]): ArticleEntry[] {
  return [...articles].sort(
    (left, right) =>
      (right.data.updatedAt ?? right.data.publishedAt).getTime() -
      (left.data.updatedAt ?? left.data.publishedAt).getTime(),
  );
}

export function sortProjects(projects: ProjectEntry[]): ProjectEntry[] {
  return [...projects].sort(
    (left, right) => right.data.updatedAt.getTime() - left.data.updatedAt.getTime(),
  );
}

export function sortSeries(series: SeriesEntry[]): SeriesEntry[] {
  return [...series].sort(
    (left, right) => right.data.updatedAt.getTime() - left.data.updatedAt.getTime(),
  );
}

export function groupByCategory(notes: NoteEntry[]) {
  const groups = new Map<string, NoteEntry[]>();
  for (const note of notes) {
    const entries = groups.get(note.data.category) ?? [];
    entries.push(note);
    groups.set(note.data.category, entries);
  }
  return [...groups.entries()]
    .map(([category, entries]) => ({
      category,
      label: entries[0]?.data.categoryLabel ?? category,
      entries: sortByUpdated(entries),
    }))
    .sort((left, right) => left.label.localeCompare(right.label, "zh-CN"));
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Shanghai",
  }).format(date);
}
