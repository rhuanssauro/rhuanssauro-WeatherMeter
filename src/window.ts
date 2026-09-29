import type { Period } from "./types.js";

export function formatYmd(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) throw new Error(`Could not format a date in ${timeZone}`);
  return `${year}-${month}-${day}`;
}

export function addCalendarDays(ymd: string, days: number): string {
  const [year, month, day] = ymd.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function windowFor(now: Date, timeZone: string): { today: string; dates: string[] } {
  const today = formatYmd(now, timeZone);
  const dates: string[] = [];
  for (let offset = -15; offset <= 14; offset += 1) dates.push(addCalendarDays(today, offset));
  return { today, dates };
}

export function periodOf(date: string, today: string): Period {
  if (date < today) return "past";
  if (date > today) return "future";
  return "today";
}
