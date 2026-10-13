import { getCollection, type CollectionEntry } from "astro:content";
import { localizePath, type Locale } from "../config/i18n";

export type WorkoutSummary = CollectionEntry<"workoutSummaries">;

export interface WorkoutOverview {
  month: string;
  summary?: WorkoutSummary;
  summaries: WorkoutSummary[];
  annualYear?: string;
}

export function workoutMonthHref(locale: Locale, month?: string): string {
  return localizePath(locale, month
    ? `/life/fitness/${month.replace("-", "/")}/`
    : "/life/fitness/");
}

export function workoutYearHref(locale: Locale, year: string): string {
  return localizePath(locale, `/life/fitness/year/${year}/`);
}

export interface WorkoutAnnualTotals {
  trainingDays: number;
  durationMinutes?: number;
  volumeKg?: number;
  incompleteDuration: boolean;
  incompleteVolume: boolean;
}

export function workoutYearTotals(year: string, summaries: WorkoutSummary[]): WorkoutAnnualTotals {
  const entries = summaries.filter((entry) => entry.data.month.startsWith(`${year}-`));
  const recorded = entries.filter((entry) => entry.data.trainingDays > 0);
  const knownDuration = recorded.filter((entry) => entry.data.durationMinutes !== undefined);
  const knownVolume = recorded.filter((entry) => entry.data.volumeKg !== undefined);
  return {
    trainingDays: entries.reduce((sum, entry) => sum + entry.data.trainingDays, 0),
    durationMinutes: knownDuration.length
      ? knownDuration.reduce((sum, entry) => sum + (entry.data.durationMinutes ?? 0), 0)
      : undefined,
    volumeKg: knownVolume.length
      ? knownVolume.reduce((sum, entry) => sum + (entry.data.volumeKg ?? 0), 0)
      : undefined,
    incompleteDuration: knownDuration.length < recorded.length,
    incompleteVolume: knownVolume.length < recorded.length,
  };
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
  const years = [...new Set(summaries.map((entry) => entry.data.month.slice(0, 4)))];
  return [
    { params: { path: undefined }, props: { locale, data: overview(defaultMonth) } },
    ...years.map((year) => ({
      params: { path: `year/${year}` },
      props: { locale, data: { ...overview(summaries.find((entry) => entry.data.month.startsWith(year))!.data.month), annualYear: year } },
    })),
    ...summaries.map((entry) => ({
      params: { path: entry.data.month.replace("-", "/") },
      props: { locale, data: overview(entry.data.month) },
    })),
  ];
}
