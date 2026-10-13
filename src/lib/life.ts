import { getCollection, type CollectionEntry } from "astro:content";
import { localizePath, type Locale } from "../config/i18n";

export type LifeEntry = CollectionEntry<"life">;
export const LIFE_PAGE_SIZE = 10;
const dateOptions: Intl.DateTimeFormatOptions = {
  timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
};

export function lifeDate(date: Date, locale: Locale = "zh"): string {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-GB", dateOptions).format(date);
}

export function lifeYear(entry: LifeEntry): string {
  return new Intl.DateTimeFormat("en", { timeZone: "Asia/Shanghai", year: "numeric" }).format(entry.data.publishedAt);
}

export function lifeHref(entry: LifeEntry): string {
  return localizePath(entry.data.language, `/life/record/${entry.id.split("/").map(encodeURIComponent).join("/")}/`);
}

export function lifeTitle(entry: LifeEntry): string {
  return entry.data.title || [lifeDate(entry.data.publishedAt, entry.data.language), entry.data.location].filter(Boolean).join(" · ");
}

export async function getLifeEntries(locale: Locale): Promise<LifeEntry[]> {
  return (await getCollection("life", ({ data }) => data.status === "published" && data.language === locale))
    .sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime() || a.id.localeCompare(b.id));
}

export interface LifeIndexData {
  kind: "index";
  entries: LifeEntry[];
  tags: string[];
  years: string[];
  tag?: string;
  year?: string;
  page: number;
  pageCount: number;
  basePath: string;
}
export type LifePageData = LifeIndexData | { kind: "record"; entry: LifeEntry };

export async function getLifePaths(locale: Locale) {
  const entries = await getLifeEntries(locale);
  const tags = [...new Set(entries.flatMap((entry) => entry.data.tags))].sort();
  const years = [...new Set(entries.map(lifeYear))].sort().reverse();
  const paths: { params: { path: string | undefined }; props: { locale: Locale; data: LifePageData } }[] = [];
  const addIndex = (selected: LifeEntry[], path: string, filter: { tag?: string; year?: string } = {}) => {
    const pageCount = Math.max(1, Math.ceil(selected.length / LIFE_PAGE_SIZE));
    for (let page = 1; page <= pageCount; page++) {
      const route = [path, page > 1 ? `page/${page}` : ""].filter(Boolean).join("/");
      paths.push({
        params: { path: route || undefined },
        props: { locale, data: {
          kind: "index", entries: selected.slice((page - 1) * LIFE_PAGE_SIZE, page * LIFE_PAGE_SIZE),
          tags, years, ...filter, page, pageCount, basePath: localizePath(locale, `/life/${path ? path + "/" : ""}`),
        } },
      });
    }
  };
  addIndex(entries, "");
  for (const tag of tags) addIndex(entries.filter((entry) => entry.data.tags.includes(tag)), `tag/${tag}`, { tag });
  for (const year of years) addIndex(entries.filter((entry) => lifeYear(entry) === year), `year/${year}`, { year });
  for (const entry of entries) {
    paths.push({ params: { path: `record/${entry.id}` }, props: { locale, data: { kind: "record", entry } } });
  }
  return paths;
}
