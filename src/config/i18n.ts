export const SUPPORTED_LOCALES = ["zh", "en"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "zh";

export interface LocaleConfig {
  label: string;
  shortLabel: string;
  htmlLang: string;
  path: string;
  ui: {
    skipToContent: string;
    language: string;
    articlesTitle: string;
    articlesDescription: string;
    articlesEmpty: string;
    seriesLabel: string;
    draftPreview: string;
    draftDate: string;
    publishedAt: string;
    updatedAt: string;
    tags: string;
  };
}

export const LOCALES: Record<Locale, LocaleConfig> = {
  zh: {
    label: "中文",
    shortLabel: "中文",
    htmlLang: "zh-CN",
    path: "",
    ui: {
      skipToContent: "跳到正文",
      language: "语言",
      articlesTitle: "文章",
      articlesDescription: "正式发布并持续维护的内容，按最近更新时间倒序排列。",
      articlesEmpty: "暂无文章。",
      seriesLabel: "所属系列",
      draftPreview: "草稿预览",
      draftDate: "草稿日期",
      publishedAt: "发布于",
      updatedAt: "更新于",
      tags: "标签",
    },
  },
  en: {
    label: "English",
    shortLabel: "EN",
    htmlLang: "en",
    path: "en",
    ui: {
      skipToContent: "Skip to content",
      language: "Language",
      articlesTitle: "Articles",
      articlesDescription: "Published and maintained writing, ordered by the most recent update.",
      articlesEmpty: "No articles yet.",
      seriesLabel: "Series",
      draftPreview: "Draft preview",
      draftDate: "Draft date",
      publishedAt: "Published",
      updatedAt: "Updated",
      tags: "Tags",
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
  return prefix ? `/${prefix}${normalizedPath}` : normalizedPath;
}

export function localePathSegment(locale: Locale): string {
  return LOCALES[locale].path;
}

export function nonDefaultLocales(): Locale[] {
  return SUPPORTED_LOCALES.filter((locale) => locale !== DEFAULT_LOCALE);
}
