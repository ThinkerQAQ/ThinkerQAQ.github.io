import { getCollection } from "astro:content";
import type { Locale } from "../config/i18n";
import { articleHref } from "./content";
import { getLifeEntries, lifeHref, lifeTitle } from "./life";
import { getWorkoutSummaries, workoutMonthHref, workoutMonthName } from "./workouts";

interface FeedEntry {
  title: string;
  description: string;
  pubDate: Date;
  link: string;
  categories: string[];
  content?: string;
}

// A fixed start prevents old workout exports from entering the feed as new posts.
const FIRST_WORKOUT_MONTH = "2026-09";
// There are only two published photo records from 2026 at launch. Preserve both
// at their original dates instead of making the photography feed initially empty.
const FIRST_PHOTO_DATE = new Date("2026-01-01T00:00:00+08:00");
const MAX_FEED_ITEMS = 100;

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function workoutPublishedAt(month: string): Date {
  const [year, value] = month.split("-").map(Number);
  // 00:00 Asia/Shanghai on the first day of the following month (16:00 UTC
  // on the last day of the recorded month); independent of the CI timezone.
  return new Date(Date.UTC(year, value, 0, 16));
}

function workoutDescription(
  data: { month: string; trainingDays: number; durationMinutes?: number; volumeKg?: number },
  locale: Locale,
): string {
  const zh = locale === "zh";
  const number = new Intl.NumberFormat(zh ? "zh-CN" : "en-US", { maximumFractionDigits: 1 });
  const parts = [zh ? data.trainingDays + " 天训练" : data.trainingDays + " training days"];
  if (data.durationMinutes !== undefined) {
    parts.push(number.format(data.durationMinutes / 60) + (zh ? " 小时" : " hours"));
  }
  if (data.volumeKg !== undefined) {
    parts.push(number.format(data.volumeKg / 1000) + (zh ? " 吨训练容量" : " t training volume"));
  }
  return workoutMonthName(data.month, locale) + (zh ? "：" : ": ") +
    parts.join(zh ? "，" : ", ") + (zh ? "。" : ".");
}

export async function getFeedItems(locale: Locale, now = new Date()): Promise<FeedEntry[]> {
  const [articles, photos, workouts] = await Promise.all([
    getCollection("articles", ({ data }) => data.status === "published" && data.language === locale),
    getLifeEntries(locale),
    getWorkoutSummaries(),
  ]);

  const currentMonth = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit",
  }).format(now);

  const articleItems: FeedEntry[] = articles.map((entry) => ({
    title: entry.data.title,
    description: entry.data.description,
    pubDate: entry.data.publishedAt,
    link: articleHref(entry),
    categories: entry.data.tags,
  }));

  const photoItems: FeedEntry[] = photos
    .filter((entry) => entry.data.publishedAt >= FIRST_PHOTO_DATE)
    .map((entry) => {
      const description = entry.data.description ?? lifeTitle(entry);
      const cover = entry.data.images[0];
      return {
        title: lifeTitle(entry),
        description,
        pubDate: entry.data.publishedAt,
        link: lifeHref(entry),
        categories: entry.data.tags,
        content: "<p>" + escapeHtml(description) + "</p>" +
          (cover ? '<p><img src="' + escapeHtml(cover.thumbnail ?? cover.src) +
            '" alt="' + escapeHtml(cover.alt) + '" /></p>' : ""),
      };
    });

  const workoutItems: FeedEntry[] = workouts
    .filter((entry) => entry.data.month >= FIRST_WORKOUT_MONTH &&
      entry.data.month < currentMonth &&
      entry.data.trainingDays > 0 && !entry.data.demo)
    .map((entry) => ({
      title: workoutMonthName(entry.data.month, locale) +
        (locale === "zh" ? " · 健身记录" : " · Fitness log"),
      description: workoutDescription(entry.data, locale),
      pubDate: workoutPublishedAt(entry.data.month),
      link: workoutMonthHref(locale, entry.data.month),
      categories: [locale === "zh" ? "健身" : "Fitness"],
    }));

  // Every item has a stable canonical URL. Rebuilding or re-syncing a month
  // cannot create a different RSS identity or move older records to the top.
  const unique = new Map<string, FeedEntry>();
  for (const item of [...articleItems, ...photoItems, ...workoutItems]) {
    if (!unique.has(item.link)) unique.set(item.link, item);
  }
  return [...unique.values()]
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime() ||
      a.link.localeCompare(b.link))
    .slice(0, MAX_FEED_ITEMS);
}
