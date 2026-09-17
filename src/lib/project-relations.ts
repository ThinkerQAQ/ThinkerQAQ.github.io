import { DEFAULT_LOCALE, type Locale } from "../config/i18n";
import {
  articleIsIncluded,
  sortArticles,
  sortSeries,
  type ArticleEntry,
  type ProjectEntry,
  type SeriesEntry,
} from "./content";

export interface ProjectRelation {
  project: ProjectEntry;
}

export interface ProjectKnowledge {
  articles: ArticleEntry[];
  series: SeriesEntry[];
}

function articleRoot(article: ArticleEntry, articles: ArticleEntry[]): ArticleEntry {
  if (!article.data.translationOf) return article;

  if (article.data.project) {
    throw new Error(
      `Article ${article.id}: translated articles must inherit project from ${article.data.translationOf}`,
    );
  }

  const root = articles.find((candidate) => candidate.id === article.data.translationOf);
  if (!root) {
    throw new Error(`Article ${article.id}: translation root ${article.data.translationOf} not found`);
  }
  if (root.data.translationOf) {
    throw new Error(`Article ${article.id}: translation root cannot itself be a translation`);
  }
  if (root.data.language !== DEFAULT_LOCALE) {
    throw new Error(`Article ${article.id}: translation root must use the default locale`);
  }
  return root;
}

function resolveProject(projectId: string, projects: ProjectEntry[], ownerLabel: string): ProjectEntry {
  const project = projects.find((candidate) => candidate.id === projectId);
  if (!project) throw new Error(`${ownerLabel}: project ${projectId} not found`);
  return project;
}

function articleProjectId(
  root: ArticleEntry,
  seriesEntries: SeriesEntry[],
): string | undefined {
  const directProjectId = root.data.project;
  if (!root.data.series) return directProjectId;

  const series = seriesEntries.find((candidate) => candidate.id === root.data.series);
  if (!series) return directProjectId;

  const seriesProjectId = series.data.project;
  if (directProjectId && seriesProjectId && directProjectId !== seriesProjectId) {
    throw new Error(
      `Article ${root.id}: project ${directProjectId} conflicts with series ${series.id} project ${seriesProjectId}`,
    );
  }
  return directProjectId ?? seriesProjectId;
}

function localizedArticleForRoot(
  root: ArticleEntry,
  locale: Locale,
  articles: ArticleEntry[],
): ArticleEntry | undefined {
  if (!articleIsIncluded(root)) return undefined;
  if (locale === DEFAULT_LOCALE) return root;

  return articles.find(
    (candidate) =>
      candidate.data.translationOf === root.id
      && candidate.data.language === locale
      && articleIsIncluded(candidate),
  ) ?? root;
}

export function getArticleProjectRelation(
  article: ArticleEntry,
  articles: ArticleEntry[],
  seriesEntries: SeriesEntry[],
  projects: ProjectEntry[],
): ProjectRelation | undefined {
  const root = articleRoot(article, articles);
  const projectId = articleProjectId(root, seriesEntries);
  if (!projectId) return undefined;

  return {
    project: resolveProject(projectId, projects, `Article ${root.id}`),
  };
}

export function getSeriesProjectRelation(
  series: SeriesEntry,
  projects: ProjectEntry[],
): ProjectRelation | undefined {
  if (!series.data.project) return undefined;
  return {
    project: resolveProject(series.data.project, projects, `Series ${series.id}`),
  };
}

export function buildProjectKnowledge(
  project: ProjectEntry,
  locale: Locale,
  articles: ArticleEntry[],
  seriesEntries: SeriesEntry[],
): ProjectKnowledge {
  const roots = articles.filter((article) => !article.data.translationOf);
  const projectSeries = sortSeries(
    seriesEntries.filter((series) => series.data.project === project.id),
  );
  const projectArticles = sortArticles(
    roots.flatMap((root) => {
      if (articleProjectId(root, seriesEntries) !== project.id) return [];
      const localized = localizedArticleForRoot(root, locale, articles);
      return localized ? [localized] : [];
    }),
  );

  return {
    articles: projectArticles,
    series: projectSeries,
  };
}
