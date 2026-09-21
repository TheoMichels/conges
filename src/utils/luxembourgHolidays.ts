import { toISODate } from "./leaveDays";
import { parseYearNumber } from "./yearPlanUtils";

export type CompensatoryHolidayDetail = {
  name: string;
  date: string; // YYYY-MM-DD
  dayName: string; // e.g. "Samedi", "Dimanche"
  reason: "weekend" | "coincidence";
  description: string;
};

const DAY_NAMES = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

/**
 * Meeus/Jones/Butcher algorithm for Easter Sunday (Gregorian calendar).
 */
function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed: 2 = March, 3 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

type HolidayDef = {
  name: string;
  date: Date;
};

/**
 * Returns all official legal public holidays for a given year in Luxembourg.
 * (Article L. 232-2 du Code du travail luxembourgeois)
 */
export function getLuxembourgPublicHolidays(yearNum: number): HolidayDef[] {
  const easter = getEasterSunday(yearNum);

  const holidays: HolidayDef[] = [
    { name: "Nouvel An", date: new Date(yearNum, 0, 1) },
    { name: "Lundi de Pâques", date: addDays(easter, 1) },
    { name: "Premier Mai", date: new Date(yearNum, 4, 1) },
  ];

  // Journée de l'Europe was made a legal public holiday in Luxembourg in 2019
  if (yearNum >= 2019) {
    holidays.push({
      name: "Journée de l'Europe",
      date: new Date(yearNum, 4, 9),
    });
  }

  holidays.push(
    { name: "Ascension", date: addDays(easter, 39) },
    { name: "Lundi de Pentecôte", date: addDays(easter, 50) },
    { name: "Fête nationale", date: new Date(yearNum, 5, 23) },
    { name: "Assomption", date: new Date(yearNum, 7, 15) },
    { name: "Toussaint", date: new Date(yearNum, 10, 1) },
    { name: "Premier jour de Noël", date: new Date(yearNum, 11, 25) },
    { name: "Deuxième jour de Noël (Saint-Étienne)", date: new Date(yearNum, 11, 26) }
  );

  return holidays;
}

/**
 * Returns all compensatory days granted in Luxembourg for:
 * 1. Legal holidays falling on a weekend (Saturday or Sunday).
 * 2. Two legal holidays coinciding on the same date (e.g. May 9, 2024).
 */
export function getLuxembourgCompensatoryHolidays(
  year: number | string
): CompensatoryHolidayDetail[] {
  const yearNum = typeof year === "number" ? year : parseYearNumber(year);
  if (yearNum === null) return [];

  const holidays = getLuxembourgPublicHolidays(yearNum);
  const results: CompensatoryHolidayDetail[] = [];

  // Group holidays by ISO date to detect coincidences
  const dateMap = new Map<string, HolidayDef[]>();
  for (const h of holidays) {
    const iso = toISODate(h.date);
    const existing = dateMap.get(iso) ?? [];
    existing.push(h);
    dateMap.set(iso, existing);
  }

  for (const [iso, group] of dateMap.entries()) {
    const firstDate = group[0].date;
    const weekday = firstDate.getDay();
    const dayName = DAY_NAMES[weekday];
    const isWeekend = weekday === 0 || weekday === 6;

    // Case 1: Multiple holidays on the same day
    if (group.length > 1) {
      // 1 day is granted for the coincidence
      const names = group.map((h) => h.name).join(" & ");
      results.push({
        name: names,
        date: iso,
        dayName,
        reason: "coincidence",
        description: `Coïncidence de 2 jours fériés le même jour (${names})`,
      });
    }

    // Case 2: Holiday(s) falling on a weekend
    if (isWeekend) {
      for (const h of group) {
        results.push({
          name: h.name,
          date: iso,
          dayName,
          reason: "weekend",
          description: `${h.name} tombait un ${dayName.toLowerCase()} (${iso})`,
        });
      }
    }
  }

  return results;
}

/**
 * Total count of compensatory holidays for the year in Luxembourg.
 */
export function countLuxembourgCompensatoryHolidays(
  year: number | string
): number {
  return getLuxembourgCompensatoryHolidays(year).length;
}
