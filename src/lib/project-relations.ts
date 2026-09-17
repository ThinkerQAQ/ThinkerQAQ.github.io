import { DEFAULT_LOCALE, type Locale } from "../config/i18n";
import {
  articleIsIncluded,
  sortArticles,
  sortSeries,
  type ArticleEntry,
  type ProjectEntry,
  type SeriesEntry,
} from "./content";

export type ProjectComponent = ProjectEntry["data"]["components"][number];

export interface ProjectRelation {
  project: ProjectEntry;
  components: ProjectComponent[];
}

export interface ProjectComponentKnowledge {
  component: ProjectComponent;
  articles: ArticleEntry[];
  series: SeriesEntry[];
}

export interface ProjectKnowledge {
  articles: ArticleEntry[];
  series: SeriesEntry[];
  components: ProjectComponentKnowledge[];
}

function articleRoot(article: ArticleEntry, articles: ArticleEntry[]): ArticleEntry {
  if (!article.data.translationOf) return article;

  if (article.data.project || article.data.components.length > 0) {
    throw new Error(
      `Article ${article.id}: translated articles must inherit project/components from ${article.data.translationOf}`,
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

function componentMap(project: ProjectEntry): Map<string, ProjectComponent> {
  const result = new Map<string, ProjectComponent>();
  for (const component of project.data.components) {
    if (result.has(component.id)) {
      throw new Error(`Project ${project.id}: duplicate component id ${component.id}`);
    }
    result.set(component.id, component);
  }
  return result;
}

function resolveComponents(
  ownerLabel: string,
  componentIds: string[],
  project: ProjectEntry,
): ProjectComponent[] {
  const available = componentMap(project);
  const seen = new Set<string>();

  return componentIds.map((id) => {
    if (seen.has(id)) throw new Error(`${ownerLabel}: duplicate component ${id}`);
    seen.add(id);

    const component = available.get(id);
    if (!component) {
      throw new Error(`${ownerLabel}: component ${id} is not declared by project ${project.id}`);
    }
    return component;
  });
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

  if (!projectId) {
    if (root.data.components.length > 0) {
      throw new Error(`Article ${root.id}: components require a project or a project-owned series`);
    }
    return undefined;
  }

  const project = resolveProject(projectId, projects, `Article ${root.id}`);
  return {
    project,
    components: resolveComponents(`Article ${root.id}`, root.data.components, project),
  };
}

export function getSeriesProjectRelation(
  series: SeriesEntry,
  projects: ProjectEntry[],
): ProjectRelation | undefined {
  if (!series.data.project) {
    if (series.data.components.length > 0) {
      throw new Error(`Series ${series.id}: components require a project`);
    }
    return undefined;
  }

  const project = resolveProject(series.data.project, projects, `Series ${series.id}`);
  return {
    project,
    components: resolveComponents(`Series ${series.id}`, series.data.components, project),
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

  for (const series of projectSeries) {
    resolveComponents(`Series ${series.id}`, series.data.components, project);
  }

  const standaloneRoots = roots.filter(
    (article) => article.data.project === project.id && !article.data.series,
  );
  const standaloneArticles = sortArticles(
    standaloneRoots.flatMap((root) => {
      resolveComponents(`Article ${root.id}`, root.data.components, project);
      const localized = localizedArticleForRoot(root, locale, articles);
      return localized ? [localized] : [];
    }),
  );

  const components = project.data.components.map((component) => {
    const componentArticles = sortArticles(
      roots.flatMap((root) => {
        if (articleProjectId(root, seriesEntries) !== project.id) return [];
        if (!root.data.components.includes(component.id)) return [];
        resolveComponents(`Article ${root.id}`, root.data.components, project);
        const localized = localizedArticleForRoot(root, locale, articles);
        return localized ? [localized] : [];
      }),
    );
    const componentSeries = projectSeries.filter((series) =>
      series.data.components.includes(component.id),
    );

    return { component, articles: componentArticles, series: componentSeries };
  });

  return {
    articles: standaloneArticles,
    series: projectSeries,
    components,
  };
}
