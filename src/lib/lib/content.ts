import type { CollectionEntry } from "astro:content";
import {
  DEFAULT_LOCALE,
  LOCALES,
  localizePath,
  type Locale,
} from "../config/i18n";

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

const projectStatusEn = { exploring: "Exploring", building: "Building", maintained: "Maintained", completed: "Completed" };
const seriesStatusEn = { planned: "Planned", active: "Active", complete: "Complete" };

export function projectStatusLabel(status: keyof typeof projectStatus, locale: Locale = DEFAULT_LOCALE): string {
  return locale === "en" ? projectStatusEn[status] : projectStatus[status];
}

export function seriesStatusLabel(status: keyof typeof seriesStatus, locale: Locale = DEFAULT_LOCALE): string {
  return locale === "en" ? seriesStatusEn[status] : seriesStatus[status];
}

export function localizedProjectSummary(project: ProjectEntry, locale: Locale) {
  return locale === DEFAULT_LOCALE
    ? { title: project.data.title, description: project.data.description }
    : project.data.translations?.[locale] ?? { title: project.data.title, description: project.data.description };
}

export function localizedSeriesSummary(series: SeriesEntry, locale: Locale) {
  return locale === DEFAULT_LOCALE
    ? { title: series.data.title, description: series.data.description }
    : series.data.translations?.[locale] ?? { title: series.data.title, description: series.data.description };
}

export function articleIsIncluded(article: ArticleEntry): boolean {
  return article.data.status === "published" || includeDraftArticles;
}

export function noteHref(note: NoteEntry, locale: Locale = DEFAULT_LOCALE): string {
  return localizePath(locale, `/notes/${note.id}/`);
}

export function categoryHref(category: string, locale: Locale = DEFAULT_LOCALE): string {
  return localizePath(locale, `/notes/category/${encodeURIComponent(category)}/`);
}

export function noteTopicHref(
  category: string,
  topic: string | string[] | NoteTopicSegment[],
  locale: Locale = DEFAULT_LOCALE,
): string {
  const topicIds = typeof topic === "string"
    ? [topic]
    : topic.map((segment) => typeof segment === "string" ? segment : segment.id);
  const routeIds = topicIds.length === 1 && topicIds[0] === ROOT_NOTE_TOPIC
    ? [ROOT_NOTE_TOPIC_ROUTE]
    : topicIds;
  return `${categoryHref(category, locale)}topic/${routeIds.map(encodeURIComponent).join("/")}/`;
}

export function noteTagHref(tag: string, locale: Locale = DEFAULT_LOCALE): string {
  return localizePath(locale, `/notes/tags/${encodeURIComponent(tag)}/`);
}

export function articleSlug(article: ArticleEntry): string {
  const localeDirectory = `${article.data.language}/`;
  return article.id.startsWith(localeDirectory)
    ? article.id.slice(localeDirectory.length)
    : article.id;
}

export function articleHref(article: ArticleEntry): string {
  return localizePath(article.data.language, `/articles/${articleSlug(article)}/`);
}

export function articleIndexHref(locale: Locale = DEFAULT_LOCALE): string {
  return localizePath(locale, "/articles/");
}

export function articlePageHref(page: number, locale: Locale = DEFAULT_LOCALE): string {
  return page <= 1
    ? articleIndexHref(locale)
    : localizePath(locale, `/articles/page/${page}/`);
}

export function articleTagHref(tag: string): string {
  return `/articles/tags/${encodeURIComponent(tag)}/`;
}

export function articleTranslationRootId(article: ArticleEntry): string {
  return article.data.translationOf ?? article.id;
}

export function getArticleTranslations(
  article: ArticleEntry,
  articles: ArticleEntry[],
): ArticleEntry[] {
  const rootId = articleTranslationRootId(article);
  const root = articles.find((candidate) => candidate.id === rootId);

  if (!root) {
    throw new Error(`Article ${article.id}: translation root ${rootId} not found`);
  }
  if (root.data.translationOf) {
    throw new Error(`Article ${article.id}: translation root cannot itself be a translation`);
  }
  if (root.data.language !== DEFAULT_LOCALE) {
    throw new Error(`Article ${article.id}: translation root must use the default locale`);
  }

  const translations = articles.filter(
    (candidate) => candidate.id === rootId || candidate.data.translationOf === rootId,
  );
  const seenLocales = new Set<Locale>();

  for (const candidate of translations) {
    if (candidate.id === rootId && candidate.data.language !== DEFAULT_LOCALE) {
      throw new Error(`Article ${candidate.id}: translation root must use the default locale`);
    }
    if (candidate.id !== rootId && candidate.data.language === DEFAULT_LOCALE) {
      throw new Error(`Article ${candidate.id}: translated article cannot use the default locale`);
    }
    if (candidate.id !== rootId && candidate.data.translationOf !== rootId) {
      throw new Error(`Article ${candidate.id}: invalid translation root`);
    }
    if (seenLocales.has(candidate.data.language)) {
      throw new Error(`Article ${rootId}: multiple translations for locale ${candidate.data.language}`);
    }
    seenLocales.add(candidate.data.language);
  }

  return translations.sort(
    (left, right) =>
      Object.keys(LOCALES).indexOf(left.data.language) -
      Object.keys(LOCALES).indexOf(right.data.language),
  );
}

export function projectHref(project: ProjectEntry | string, locale: Locale = DEFAULT_LOCALE): string {
  const id = typeof project === "string" ? project : project.id;
  return localizePath(locale, `/projects/${id}/`);
}

export function seriesHref(series: SeriesEntry | string, locale: Locale = DEFAULT_LOCALE): string {
  const id = typeof series === "string" ? series : series.id;
  return localizePath(locale, `/series/${id}/`);
}

export function getArticleSeriesNavigation(
  article: ArticleEntry,
  articles: ArticleEntry[],
  seriesEntries: SeriesEntry[],
): ArticleSeriesNavigation | undefined {
  if (!article.data.series) return undefined;

  const series = seriesEntries.find((entry) => entry.id === article.data.series);
  if (!series) return undefined;

  const language = article.data.language;
  const orderedArticles = series.data.relatedArticles
    .map((rootId) => {
      if (language === DEFAULT_LOCALE) {
        return articles.find(
          (entry) => entry.id === rootId && entry.data.language === DEFAULT_LOCALE,
        );
      }
      return articles.find(
        (entry) => entry.data.translationOf === rootId && entry.data.language === language,
      );
    })
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

function computerNetworkSourceTopicPath(note: NoteEntry): NoteTopicSegment[] | undefined {
  if (note.data.category !== "computer-network") return undefined;

  const sourceSegments = note.data.sourcePath
    .replaceAll("\\", "/")
    .split("/")
    .filter(Boolean);
  if (sourceSegments[0] !== "Computer_Network") return undefined;

  return sourceSegments.slice(1, -1).map((id) => ({ id, label: id }));
}

export function getNoteTopicPath(note: NoteEntry): NoteTopicSegment[] {
  // Computer_Network keeps the original Windows/VNote directory tree as the
  // public taxonomy. The source path is authoritative for IDs and depth. A
  // localized in-memory topicPath may only replace labels for those same IDs.
  const sourceTopicPath = computerNetworkSourceTopicPath(note);
  if (sourceTopicPath) {
    const localizedTopicPath = note.data.topicPath;
    const sameSourcePath = localizedTopicPath?.length === sourceTopicPath.length
      && localizedTopicPath.every((segment, index) =>
        sameTopicId(segment.id, sourceTopicPath[index]!.id),
      );
    if (sameSourcePath) {
      return sourceTopicPath.map((segment, index) => ({
        ...segment,
        label: localizedTopicPath[index]?.label ?? segment.label,
      }));
    }
    return sourceTopicPath;
  }

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
        // A root-level Computer_Network note is a file at the category root,
        // not an artificial "Other" folder in the original VNote tree.
        label: entry.data.category === "computer-network" ? "" : "其他",
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

export function formatDate(date: Date, locale: Locale = DEFAULT_LOCALE): string {
  return new Intl.DateTimeFormat(LOCALES[locale].htmlLang, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Shanghai",
  }).format(date);
}
