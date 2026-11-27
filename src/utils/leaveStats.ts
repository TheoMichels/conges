import { LeaveEntry } from "../types/yearPlan";
import { entryTotalDays, toISODate, workingDaysCount } from "./leaveDays";
import { getLuxembourgPublicHolidays } from "./luxembourgHolidays";

// Un congé est « à venir » s'il commence après aujourd'hui ; un congé à dater compte
// comme à venir tant que son mois n'est pas commencé.
export function isUpcomingEntry(entry: LeaveEntry, year: string, today: Date = new Date()): boolean {
  const todayIso = toISODate(today);
  if (entry.kind === "dates") return entry.startDate > todayIso;
  const planYear = parseInt(year, 10);
  if (!Number.isFinite(planYear)) return false;
  if (planYear !== today.getFullYear()) return planYear > today.getFullYear();
  return entry.month > today.getMonth();
}

// Part des congés posés qui reste à venir (affichée « dont à venir » sur la jauge).
export function plannedDays(entries: LeaveEntry[], year: string, today: Date = new Date()): number {
  const total = entries.filter((entry) => isUpcomingEntry(entry, year, today)).reduce((sum, entry) => sum + entryTotalDays(entry), 0);
  return Math.round(total * 100) / 100;
}

// Jours ouvrés posés par mois (12 valeurs) pour l'aperçu annuel.
export function monthlyDays(entries: LeaveEntry[], year: string): number[] {
  const months = Array.from({ length: 12 }, () => 0);
  const planYear = parseInt(year, 10);
  for (const entry of entries) {
    if (entry.kind === "month") { months[entry.month] += entry.days; continue; }
    const startHalf = entry.startHalf ?? "morning";
    const endHalf = entry.endHalf ?? "afternoon";
    for (let month = 0; month < 12; month += 1) {
      const monthStart = toISODate(new Date(planYear, month, 1));
      const monthEnd = toISODate(new Date(planYear, month + 1, 0));
      const from = entry.startDate > monthStart ? entry.startDate : monthStart;
      const to = entry.endDate < monthEnd ? entry.endDate : monthEnd;
      if (from > to) continue;
      months[month] += workingDaysCount(from, to, from === entry.startDate ? startHalf : "morning", to === entry.endDate ? endHalf : "afternoon");
    }
  }
  return months.map((value) => Math.round(value * 100) / 100);
}

// Jours fériés légaux luxembourgeois d'une année, indexés par date ISO.
export function publicHolidayMap(yearNum: number): Map<string, string> {
  return new Map(getLuxembourgPublicHolidays(yearNum).map((holiday) => [toISODate(holiday.date), holiday.name]));
}

// Cumul des jours posés en fin de chaque mois (13 points : 1er janvier puis fin de chaque mois).
export function cumulativeDays(months: number[]): number[] {
  const points = [0];
  for (const days of months) points.push(Math.round((points[points.length - 1] + days) * 100) / 100);
  return points;
}
