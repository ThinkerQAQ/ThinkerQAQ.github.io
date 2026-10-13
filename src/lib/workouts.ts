import { getCollection, type CollectionEntry } from "astro:content";
import { localizePath, type Locale } from "../config/i18n";

export type WorkoutSummary = CollectionEntry<"workoutSummaries">;

export interface WorkoutOverview {
  month: string;
  summary?: WorkoutSummary;
  summaries: WorkoutSummary[];
}

export function workoutMonthHref(locale: Locale, month?: string): string {
  return localizePath(locale, month
    ? `/life/fitness/${month.replace("-", "/")}/`
    : "/life/fitness/");
}

export function workoutMonthName(month: string, locale: Locale): string {
  const [year, value] = month.split("-");
  return locale === "zh" ? `${year} 年 ${Number(value)} 月` :
    new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
      .format(new Date(`${month}-01T12:00:00Z`));
}

export async function getWorkoutSummaries(): Promise<WorkoutSummary[]> {
  return (await getCollection("workoutSummaries")).sort(
    (a, b) => b.data.month.localeCompare(a.data.month),
  );
}

export async function getWorkoutPaths(locale: Locale) {
  const summaries = await getWorkoutSummaries();
  const latestMonth = summaries[0]?.data.month;
  const defaultMonth = latestMonth ?? new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit",
  }).format(new Date());

  const overview = (month: string): WorkoutOverview => ({
    month, summaries, summary: summaries.find((entry) => entry.data.month === month),
  });
  return [
    { params: { path: undefined }, props: { locale, data: overview(defaultMonth) } },
    ...summaries.map((entry) => ({
      params: { path: entry.data.month.replace("-", "/") },
      props: { locale, data: overview(entry.data.month) },
    })),
  ];
}
