import type { CollectionEntry } from "astro:content";

export type NoteEntry = CollectionEntry<"notes">;
export type ArticleEntry = CollectionEntry<"articles">;
export type ProjectEntry = CollectionEntry<"projects">;
export type SeriesEntry = CollectionEntry<"series">;

export interface ArticleSeriesNavigation {
  series: SeriesEntry;
  articles: ArticleEntry[];
  currentIndex: number;
  previous?: ArticleEntry;
  next?: ArticleEntry;
}

export interface NoteCollectionNavigation {
  category: string;
  categoryLabel: string;
  topics: Array<{
    id?: string;
    label: string;
    notes: NoteEntry[];
  }>;
  currentId: string;
  currentIndex: number;
  previous?: NoteEntry;
  next?: NoteEntry;
}

export interface NoteTopicGroup {
  id?: string;
  label: string;
  notes: NoteEntry[];
}

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

export function noteTopicHref(category: string, topic: string): string {
  return `${categoryHref(category)}topic/${encodeURIComponent(topic)}/`;
}

export function noteTagHref(tag: string): string {
  return `/notes/tags/${encodeURIComponent(tag)}/`;
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

export function getArticleSeriesNavigation(
  article: ArticleEntry,
  articles: ArticleEntry[],
  seriesEntries: SeriesEntry[],
): ArticleSeriesNavigation | undefined {
  if (!article.data.series) return undefined;

  const series = seriesEntries.find((entry) => entry.id === article.data.series);
  if (!series) return undefined;

  const articlesById = new Map(articles.map((entry) => [entry.id, entry]));
  const orderedArticles = series.data.relatedArticles
    .map((id) => articlesById.get(id))
    .filter((entry): entry is ArticleEntry => entry !== undefined);
  const currentIndex = orderedArticles.findIndex((entry) => entry.id === article.id);

  if (currentIndex === -1) return undefined;

  return {
    series,
    articles: orderedArticles,
    currentIndex,
    previous: orderedArticles[currentIndex - 1],
    next: orderedArticles[currentIndex + 1],
  };
}

export function groupNotesByTopic(notes: NoteEntry[]): NoteTopicGroup[] {
  const topics = new Map<string, NoteTopicGroup>();
  for (const entry of sortNotes(notes)) {
    const key = entry.data.topic ?? "__ungrouped";
    const topic = topics.get(key) ?? {
      id: entry.data.topic,
      label: entry.data.topicLabel ?? "其他",
      notes: [],
    };
    topic.notes.push(entry);
    topics.set(key, topic);
  }
  return [...topics.values()];
}

export function getNoteCollectionNavigation(
  note: NoteEntry,
  notes: NoteEntry[],
): NoteCollectionNavigation {
  const orderedNotes = sortNotes(
    notes.filter((candidate) => candidate.data.category === note.data.category),
  );
  const currentIndex = orderedNotes.findIndex((entry) => entry.id === note.id);

  return {
    category: note.data.category,
    categoryLabel: note.data.categoryLabel,
    topics: groupNotesByTopic(orderedNotes),
    currentId: note.id,
    currentIndex,
    previous: orderedNotes[currentIndex - 1],
    next: orderedNotes[currentIndex + 1],
  };
}

export function sortNotes(notes: NoteEntry[]): NoteEntry[] {
  return [...notes].sort((left, right) => left.data.order - right.data.order);
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
      entries: sortNotes(entries),
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
