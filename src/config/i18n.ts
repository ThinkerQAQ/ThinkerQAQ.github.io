export const SUPPORTED_LOCALES = ["zh", "en"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "zh";

export interface LocaleConfig {
  label: string;
  shortLabel: string;
  htmlLang: string;
  path: string;
  homeTitle: string;
  siteDescription: string;
  rss: {
    title: string;
    description: string;
    language: string;
  };
  nav: {
    articles: string;
    projects: string;
    series: string;
    notes: string;
    about: string;
    search: string;
  };
  ui: {
    skipToContent: string;
    language: string;
    homeAriaLabel: string;
    articlesTitle: string;
    articlesDescription: string;
    articlesEmpty: string;
    projectsTitle: string;
    projectsDescription: string;
    projectsEmpty: string;
    seriesTitle: string;
    seriesDescription: string;
    seriesEmpty: string;
    seriesLabel: string;
    notesTitle: string;
    notesDescription: string;
    notesEmpty: string;
    notesChineseNotice: string;
    aboutTitle: string;
    aboutDescription: string;
    searchTitle: string;
    searchDescription: string;
    searchPlaceholder: string;
    searchEmpty: string;
    searchNoScript: string;
    draftPreview: string;
    draftDate: string;
    publishedAt: string;
    updatedAt: string;
    createdAt: string;
    tags: string;
    breadcrumb: string;
    noteCollection: string;
    noteOutline: string;
    noteTopics: string;
    hideNoteTopics: string;
    restoreNoteTopics: string;
    all: string;
    notesCount: (count: number) => string;
    recentUpdates: string;
    allNotes: string;
    previousPage: string;
    nextPage: string;
    pageLabel: (page: number) => string;
    seriesNavigation: string;
    previousArticle: string;
    nextArticle: string;
  };
}

export const LOCALES: Record<Locale, LocaleConfig> = {
  zh: {
    label: "中文",
    shortLabel: "中文",
    htmlLang: "zh-CN",
    path: "",
    homeTitle: "ThinkerQAQ | 后端工程、并发编程与分布式系统",
    siteDescription:
      "ThinkerQAQ 的个人技术博客，记录后端工程、Go、Java、并发编程、分布式系统、数据系统与软件工程实践。",
    rss: {
      title: "ThinkerQAQ",
      description: "ThinkerQAQ 的中文技术文章。",
      language: "zh-cn",
    },
    nav: {
      articles: "文章",
      projects: "项目",
      series: "系列",
      notes: "笔记",
      about: "关于",
      search: "搜索",
    },
    ui: {
      skipToContent: "跳到正文",
      language: "语言",
      homeAriaLabel: "ThinkerQAQ 首页",
      articlesTitle: "文章",
      articlesDescription: "正式发布并持续维护的内容，按最近更新时间倒序排列。",
      articlesEmpty: "暂无文章。",
      projectsTitle: "项目",
      projectsDescription: "记录正在探索、开发或维护的事情，以及最终留下的成果。",
      projectsEmpty: "暂无项目。",
      seriesTitle: "系列",
      seriesDescription: "把主题相关的文章和笔记组织在一起，提供更连贯的阅读路径。",
      seriesEmpty: "暂无系列。",
      seriesLabel: "所属系列",
      notesTitle: "笔记",
      notesDescription: "保留学习记录、资料整理、实验过程，以及暂时还不需要写成文章的想法。",
      notesEmpty: "暂无笔记。",
      notesChineseNotice: "笔记正文目前以中文维护。",
      aboutTitle: "关于本站",
      aboutDescription: "关于 ThinkerQAQ，以及本站文章、项目、系列与笔记的组织方式。",
      searchTitle: "搜索",
      searchDescription: "搜索 ThinkerQAQ 的技术文章与学习笔记。",
      searchPlaceholder: "搜索本站内容",
      searchEmpty: "暂无可搜索的内容。",
      searchNoScript: "搜索功能需要启用 JavaScript，但文章正文不需要。",
      draftPreview: "草稿预览",
      draftDate: "草稿日期",
      publishedAt: "发布于",
      updatedAt: "更新于",
      createdAt: "创建于",
      tags: "标签",
      breadcrumb: "面包屑",
      noteCollection: "笔记集",
      noteOutline: "笔记大纲",
      noteTopics: "笔记主题",
      hideNoteTopics: "隐藏笔记主题",
      restoreNoteTopics: "展开笔记主题",
      all: "全部",
      notesCount: (count) => `${count} 篇笔记`,
      recentUpdates: "最近更新",
      allNotes: "全部笔记",
      previousPage: "上一页",
      nextPage: "下一页",
      pageLabel: (page) => `第 ${page} 页`,
      seriesNavigation: "系列文章导航",
      previousArticle: "上一篇",
      nextArticle: "下一篇",
    },
  },
  en: {
    label: "English",
    shortLabel: "EN",
    htmlLang: "en",
    path: "en",
    homeTitle: "ThinkerQAQ | Backend Engineering, Concurrency, and Distributed Systems",
    siteDescription:
      "ThinkerQAQ's technical blog on backend engineering, Go, Java, concurrency, distributed systems, data systems, and software engineering.",
    rss: {
      title: "ThinkerQAQ — English",
      description: "English technical articles from ThinkerQAQ.",
      language: "en",
    },
    nav: {
      articles: "Articles",
      projects: "Projects",
      series: "Series",
      notes: "Notes",
      about: "About",
      search: "Search",
    },
    ui: {
      skipToContent: "Skip to content",
      language: "Language",
      homeAriaLabel: "ThinkerQAQ home",
      articlesTitle: "Articles",
      articlesDescription: "Published and maintained writing, ordered by the most recent update.",
      articlesEmpty: "No articles yet.",
      projectsTitle: "Projects",
      projectsDescription: "Things I am exploring, building, or maintaining, together with what they become.",
      projectsEmpty: "No projects published yet.",
      seriesTitle: "Series",
      seriesDescription: "Related articles organized into continuous reading paths.",
      seriesEmpty: "No translated series yet.",
      seriesLabel: "Series",
      notesTitle: "Notes",
      notesDescription: "Learning records, references, experiments, and ideas that do not need to become formal articles yet.",
      notesEmpty: "No notes yet.",
      notesChineseNotice: "Note content is currently maintained in Chinese. The English setting translates the site interface and navigation.",
      aboutTitle: "About",
      aboutDescription: "About ThinkerQAQ and how articles, projects, series, and notes are organized on this site.",
      searchTitle: "Search",
      searchDescription: "Search ThinkerQAQ articles and learning notes.",
      searchPlaceholder: "Search this site",
      searchEmpty: "There is no searchable content yet.",
      searchNoScript: "Search requires JavaScript, but reading the site does not.",
      draftPreview: "Draft preview",
      draftDate: "Draft date",
      publishedAt: "Published",
      updatedAt: "Updated",
      createdAt: "Created",
      tags: "Tags",
      breadcrumb: "Breadcrumb",
      noteCollection: "Note collection",
      noteOutline: "Note outline",
      noteTopics: "Note topics",
      hideNoteTopics: "Hide note topics",
      restoreNoteTopics: "Show note topics",
      all: "All",
      notesCount: (count) => `${count} ${count === 1 ? "note" : "notes"}`,
      recentUpdates: "Recently updated",
      allNotes: "All notes",
      previousPage: "Previous",
      nextPage: "Next",
      pageLabel: (page) => `Page ${page}`,
      seriesNavigation: "Series article navigation",
      previousArticle: "Previous",
      nextArticle: "Next",
    },
  },
};

export interface LocaleAlternative {
  locale: Locale;
  href: string;
}

export function isLocale(value: string): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale);
}

export function localeConfig(locale: Locale): LocaleConfig {
  return LOCALES[locale];
}

export function localizePath(locale: Locale, pathname: string): string {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const prefix = LOCALES[locale].path;
  return prefix ? `/${prefix}${normalizedPath === "/" ? "/" : normalizedPath}` : normalizedPath;
}

export function unlocalizePath(pathname: string): string {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  for (const locale of SUPPORTED_LOCALES) {
    const prefix = LOCALES[locale].path;
    if (!prefix) continue;
    const localePrefix = `/${prefix}`;
    if (normalizedPath === localePrefix || normalizedPath === `${localePrefix}/`) return "/";
    if (normalizedPath.startsWith(`${localePrefix}/`)) {
      return normalizedPath.slice(localePrefix.length) || "/";
    }
  }
  return normalizedPath;
}

export function pathForLocale(pathname: string, locale: Locale): string {
  return localizePath(locale, unlocalizePath(pathname));
}

export function languageAlternativesForPath(pathname: string): LocaleAlternative[] {
  return SUPPORTED_LOCALES.map((locale) => ({ locale, href: pathForLocale(pathname, locale) }));
}

export function localePathSegment(locale: Locale): string {
  return LOCALES[locale].path;
}

export function nonDefaultLocales(): Locale[] {
  return SUPPORTED_LOCALES.filter((locale) => locale !== DEFAULT_LOCALE);
}

export function rssPath(locale: Locale = DEFAULT_LOCALE): string {
  return localizePath(locale, "/rss.xml");
}
