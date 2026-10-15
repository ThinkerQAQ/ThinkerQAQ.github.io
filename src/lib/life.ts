import { getCollection, type CollectionEntry } from "astro:content";
import { localizePath, type Locale, type LocaleAlternative } from "../config/i18n";

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

export function lifeSlug(entry: LifeEntry): string {
  return entry.data.language === "en" ? entry.id.replace(/-en$/, "") : entry.id;
}

export function lifeHref(entry: LifeEntry): string {
  return localizePath(entry.data.language, `/life/record/${lifeSlug(entry).split("/").map(encodeURIComponent).join("/")}/`);
}

export function lifeTitle(entry: LifeEntry): string {
  return entry.data.title || [lifeDate(entry.data.publishedAt, entry.data.language), entry.data.location].filter(Boolean).join(" · ");
}

export async function getLifeEntries(locale: Locale): Promise<LifeEntry[]> {
  const photographyTag = locale === "zh" ? "摄影" : "Photography";
  return (await getCollection("life", ({ data }) => data.status === "published" && data.language === locale && data.tags.includes(photographyTag)))
    .sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime() || a.id.localeCompare(b.id));
}

export interface LifeIndexData {
  kind: "index";
  entries: LifeEntry[];
  years: string[];
  year?: string;
  page: number;
  pageCount: number;
  basePath: string;
}
export type LifePageData = LifeIndexData | { kind: "record"; entry: LifeEntry; alternatives: LocaleAlternative[] };

export async function getLifePaths(locale: Locale) {
  const entries = await getLifeEntries(locale);
  const counterparts = new Map((await getLifeEntries(locale === "zh" ? "en" : "zh")).map((entry) => [lifeSlug(entry), entry]));
  const years = [...new Set(entries.map(lifeYear))].sort().reverse();
  const paths: { params: { path: string | undefined }; props: { locale: Locale; data: LifePageData } }[] = [];
  const addIndex = (selected: LifeEntry[], path: string, filter: { year?: string } = {}) => {
    const pageCount = Math.max(1, Math.ceil(selected.length / LIFE_PAGE_SIZE));
    for (let page = 1; page <= pageCount; page++) {
      const route = [path, page > 1 ? `page/${page}` : ""].filter(Boolean).join("/");
      paths.push({
        params: { path: route || undefined },
        props: { locale, data: {
          kind: "index", entries: selected.slice((page - 1) * LIFE_PAGE_SIZE, page * LIFE_PAGE_SIZE),
          years, ...filter, page, pageCount, basePath: localizePath(locale, `/life/${path ? path + "/" : ""}`),
        } },
      });
    }
  };
  addIndex(entries, "");
  for (const year of years) addIndex(entries.filter((entry) => lifeYear(entry) === year), `year/${year}`, { year });
  for (const entry of entries) {
    const counterpart = counterparts.get(lifeSlug(entry));
    const alternatives = [entry, ...(counterpart ? [counterpart] : [])].map((record) => ({
      locale: record.data.language,
      href: lifeHref(record),
    }));
    paths.push({ params: { path: `record/${lifeSlug(entry)}` }, props: { locale, data: { kind: "record", entry, alternatives } } });
  }
  return paths;
}
