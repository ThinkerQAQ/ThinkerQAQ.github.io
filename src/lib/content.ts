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

export interface NoteTopicSegment {
  id: string;
  label: string;
}

export interface NoteCollectionNavigation {
  category: string;
  categoryLabel: string;
  topics: NoteTopicGroup[];
  currentId: string;
  currentIndex: number;
  previous?: NoteEntry;
  next?: NoteEntry;
}

export interface NoteTopicGroup {
  id?: string;
  label: string;
  path: NoteTopicSegment[];
  depth: number;
  notes: NoteEntry[];
  allNotes: NoteEntry[];
}

export interface NoteTopicTreeNode extends NoteTopicGroup {
  children: NoteTopicTreeNode[];
}

export const includeDraftArticles = import.meta.env.INCLUDE_DRAFTS === "true";
export const ROOT_NOTE_TOPIC = "__root";
export const ROOT_NOTE_TOPIC_ROUTE = "overview";

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

export function noteTopicHref(
  category: string,
  topic: string | string[] | NoteTopicSegment[],
): string {
  const topicIds = typeof topic === "string"
    ? [topic]
    : topic.map((segment) => typeof segment === "string" ? segment : segment.id);
  const routeIds = topicIds.length === 1 && topicIds[0] === ROOT_NOTE_TOPIC
    ? [ROOT_NOTE_TOPIC_ROUTE]
    : topicIds;
  return `${categoryHref(category)}topic/${routeIds.map(encodeURIComponent).join("/")}/`;
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

function fallbackTopicLabel(id: string): string {
  return id.replaceAll("_", " ");
}

function sameTopicId(left: string, right: string): boolean {
  return left.localeCompare(right, undefined, { sensitivity: "accent" }) === 0;
}

export function getNoteTopicPath(note: NoteEntry): NoteTopicSegment[] {
  if (note.data.topicPath?.length) {
    return note.data.topicPath.map((segment) => ({
      id: segment.id,
      label: segment.label ?? fallbackTopicLabel(segment.id),
    }));
  }

  if (!note.data.topic) return [];

  const firstSegment: NoteTopicSegment = {
    id: note.data.topic,
    label: note.data.topicLabel ?? fallbackTopicLabel(note.data.topic),
  };
  const sourceDirectories = note.data.sourcePath
    .replaceAll("\\", "/")
    .split("/")
    .filter(Boolean)
    .slice(0, -1);
  const topicIndex = sourceDirectories.findIndex((segment) => sameTopicId(segment, note.data.topic!));

  if (topicIndex === -1) return [firstSegment];

  return [
    firstSegment,
    ...sourceDirectories.slice(topicIndex + 1).map((id) => ({
      id,
      label: fallbackTopicLabel(id),
    })),
  ];
}

function topicPathKey(path: NoteTopicSegment[]): string {
  return path.map((segment) => segment.id).join("\u001f");
}

export function groupNotesByTopic(notes: NoteEntry[]): NoteTopicGroup[] {
  const topics = new Map<string, NoteTopicGroup>();

  for (const entry of sortNotes(notes)) {
    const path = getNoteTopicPath(entry);
    if (path.length === 0) {
      const key = "__ungrouped";
      const topic = topics.get(key) ?? {
        label: "其他",
        path: [],
        depth: 0,
        notes: [],
        allNotes: [],
      };
      topic.notes.push(entry);
      topic.allNotes.push(entry);
      topics.set(key, topic);
      continue;
    }

    for (let index = 0; index < path.length; index += 1) {
      const currentPath = path.slice(0, index + 1);
      const segment = currentPath[currentPath.length - 1]!;
      const key = topicPathKey(currentPath);
      const topic = topics.get(key) ?? {
        id: segment.id,
        label: segment.label,
        path: currentPath,
        depth: index,
        notes: [],
        allNotes: [],
      };
      topic.allNotes.push(entry);
      if (index === path.length - 1) topic.notes.push(entry);
      topics.set(key, topic);
    }
  }

  return [...topics.values()];
}

export function buildNoteTopicTree(topics: NoteTopicGroup[]): NoteTopicTreeNode[] {
  const nodes = new Map<string, NoteTopicTreeNode>();

  for (const topic of topics) {
    if (topic.path.length === 0) continue;
    nodes.set(topicPathKey(topic.path), { ...topic, children: [] });
  }

  const roots: NoteTopicTreeNode[] = [];
  for (const topic of topics) {
    if (topic.path.length === 0) {
      roots.push({ ...topic, children: [] });
      continue;
    }
    const node = nodes.get(topicPathKey(topic.path));
    if (!node) continue;

    const parent = nodes.get(topicPathKey(topic.path.slice(0, -1)));
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  return roots;
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
