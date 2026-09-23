import { HalfDay, LeaveEntry, SHORT_MONTH_LABELS } from "../types/yearPlan";
import { getLuxembourgPublicHolidays } from "./luxembourgHolidays";

export function toISODate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function parseISODate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateFr(iso: string): string {
  const date = parseISODate(iso);
  if (!date) return iso;
  return `${date.getDate()} ${SHORT_MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`;
}

// Leave is counted in working days: Saturdays, Sundays, and public holidays never count.
export function workingDaysCount(
  startIso: string,
  endIso: string,
  startHalf: HalfDay = "morning",
  endHalf: HalfDay = "afternoon"
): number {
  const start = parseISODate(startIso);
  const end = parseISODate(endIso);
  if (!start || !end || end < start) return 0;

  const holidaysCache = new Map<number, Set<string>>();
  const isHoliday = (d: Date) => {
    const y = d.getFullYear();
    if (!holidaysCache.has(y)) {
      holidaysCache.set(y, new Set(getLuxembourgPublicHolidays(y).map(h => toISODate(h.date))));
    }
    return holidaysCache.get(y)!.has(toISODate(d));
  };

  // Single-day case
  if (startIso === endIso) {
    const weekday = start.getDay();
    if (weekday === 0 || weekday === 6 || isHoliday(start)) return 0;
    if (startHalf === "afternoon" && endHalf === "morning") return 0;
    if (startHalf === "afternoon" || endHalf === "morning") return 0.5;
    return 1;
  }

  // Multi-day case
  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const weekday = cursor.getDay();
    const isWeekend = weekday === 0 || weekday === 6;
    if (!isWeekend && !isHoliday(cursor)) {
      const isStartDay = cursor.getTime() === start.getTime();
      const isEndDay = cursor.getTime() === end.getTime();

      if (isStartDay && startHalf === "afternoon") {
        count += 0.5;
      } else if (isEndDay && endHalf === "morning") {
        count += 0.5;
      } else {
        count += 1;
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return Math.round(count * 100) / 100;
}

export function entryTotalDays(entry: LeaveEntry): number {
  return entry.kind === "dates"
    ? workingDaysCount(
        entry.startDate,
        entry.endDate,
        entry.startHalf ?? "morning",
        entry.endHalf ?? "afternoon"
      )
    : entry.days;
}

// Chronological order within the year: month first, then day for dated entries.
export function entryOrderKey(entry: LeaveEntry): number {
  if (entry.kind === "month") return entry.month * 100;
  const date = parseISODate(entry.startDate);
  return date ? date.getMonth() * 100 + date.getDate() : 0;
}
