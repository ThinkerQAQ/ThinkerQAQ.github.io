import { getCollection, type CollectionEntry } from "astro:content";
import { localizePath, type Locale } from "../config/i18n";

export type WorkoutSession = CollectionEntry<"workouts">;
export type WorkoutPageData =
  | { kind: "month"; month: string; months: string[]; sessions: WorkoutSession[] }
  | { kind: "day"; date: string; sessions: WorkoutSession[] };

export async function getWorkouts(): Promise<WorkoutSession[]> {
  return (await getCollection("workouts")).sort((a, b) =>
    b.data.date.localeCompare(a.data.date) || a.id.localeCompare(b.id));
}

export function workoutMonth(date: string): string {
  return date.slice(0, 7);
}

export function workoutMonthHref(locale: Locale, month?: string): string {
  return localizePath(locale, month
    ? `/life/fitness/${month.replace("-", "/")}/`
    : "/life/fitness/");
}

export function workoutDayHref(locale: Locale, date: string): string {
  return localizePath(locale, `/life/fitness/${date.replaceAll("-", "/")}/`);
}

export function workoutMonthName(month: string, locale: Locale): string {
  const [year, value] = month.split("-");
  return locale === "zh" ? `${year} 年 ${Number(value)} 月` :
    new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
      .format(new Date(`${month}-01T12:00:00Z`));
}

export function workoutCalendarCells(month: string): (string | null)[] {
  const [year, value] = month.split("-").map(Number);
  const days = new Date(Date.UTC(year, value, 0)).getUTCDate();
  const offset = (new Date(Date.UTC(year, value - 1, 1)).getUTCDay() + 6) % 7;
  return [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];
}

export function workoutDayCount(sessions: WorkoutSession[]): number {
  return new Set(sessions.map((session) => session.data.date)).size;
}

export async function getWorkoutPaths(locale: Locale) {
  const all = await getWorkouts();
  const months = [...new Set(all.map((session) => workoutMonth(session.data.date)))].sort().reverse();
  const now = new Date();
  const currentMonth = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit",
  }).format(now);
  const defaultMonth = months[0] ?? currentMonth;
  const byMonth = (month: string): WorkoutPageData => ({
    kind: "month", month, months,
    sessions: all.filter((session) => workoutMonth(session.data.date) === month),
  });
  const paths: { params: { path: string | undefined }; props: { locale: Locale; data: WorkoutPageData } }[] = [
    { params: { path: undefined }, props: { locale, data: byMonth(defaultMonth) } },
  ];
  for (const month of months) {
    paths.push({
      params: { path: month.replace("-", "/") },
      props: { locale, data: byMonth(month) },
    });
  }
  for (const date of new Set(all.map((session) => session.data.date))) {
    paths.push({
      params: { path: date.replaceAll("-", "/") },
      props: { locale, data: { kind: "day", date, sessions: all.filter((session) => session.data.date === date) } },
    });
  }
  return paths;
}
